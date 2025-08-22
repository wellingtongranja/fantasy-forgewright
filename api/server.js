/**
 * Fantasy Editor API Server
 * Handles GitHub OAuth proxy to avoid CORS issues
 */
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// GitHub OAuth Web Application Flow endpoints
app.post('/api/github/oauth/token', async (req, res) => {
  try {
    const { code, state, code_verifier } = req.body

    if (!code) {
      return res.status(400).json({ error: 'authorization code is required' })
    }

    const tokenParams = {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }

    // Add code_verifier if provided (for PKCE)
    if (code_verifier) {
      tokenParams.code_verifier = code_verifier
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Fantasy-Editor/1.0'
      },
      body: new URLSearchParams(tokenParams)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub token exchange failed:', response.status, errorText)
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      console.error('GitHub OAuth error:', data)
      throw new Error(`OAuth error: ${data.error_description || data.error}`)
    }

    res.json(data)
  } catch (error) {
    console.error('Token exchange error:', error)
    res.status(500).json({ 
      error: 'Failed to exchange token',
      message: error.message 
    })
  }
})

// OAuth authorization URL generator
app.get('/api/github/oauth/authorize-url', (req, res) => {
  try {
    const state = req.query.state || 'default-state'
    const redirectUri = `${process.env.FRONTEND_URL}/auth/callback`
    
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'repo user',
      state: state
    })

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`
    
    res.json({ 
      authUrl,
      redirectUri,
      state 
    })
  } catch (error) {
    console.error('Auth URL generation error:', error)
    res.status(500).json({ 
      error: 'Failed to generate auth URL',
      message: error.message 
    })
  }
})

// GitHub API proxy for authenticated requests
app.all('/api/github/proxy/*', async (req, res) => {
  try {
    const githubPath = req.path.replace('/api/github/proxy', '')
    const githubUrl = `https://api.github.com${githubPath}`
    
    // Get authorization header from request
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' })
    }

    const headers = {
      'Authorization': authHeader,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Fantasy-Editor/1.0',
      'Content-Type': 'application/json'
    }

    const fetchOptions = {
      method: req.method,
      headers: headers
    }

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(githubUrl, fetchOptions)
    
    // Forward response headers
    res.set('X-RateLimit-Limit', response.headers.get('X-RateLimit-Limit'))
    res.set('X-RateLimit-Remaining', response.headers.get('X-RateLimit-Remaining'))
    res.set('X-RateLimit-Reset', response.headers.get('X-RateLimit-Reset'))
    
    const data = await response.text()
    
    res.status(response.status)
    
    // Try to parse as JSON, fallback to text
    try {
      res.json(JSON.parse(data))
    } catch {
      res.send(data)
    }
  } catch (error) {
    console.error('GitHub proxy error:', error)
    res.status(500).json({ 
      error: 'GitHub API proxy error',
      message: error.message 
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Fantasy Editor API',
    timestamp: new Date().toISOString(),
    github_client_configured: !!process.env.GITHUB_CLIENT_ID
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl 
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Fantasy Editor API running on port ${PORT}`)
  console.log(`📝 Frontend URL: ${process.env.FRONTEND_URL}`)
  console.log(`🔒 GitHub OAuth configured: ${!!process.env.GITHUB_CLIENT_ID}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
})