/**
 * Legal Documents Worker - Secure private worker for legal document management
 * Strict CORS enforcement, rate limiting, and GitHub integration
 * 
 * Security features:
 * - CORS restricted to fantasy.forgewright.io only
 * - Rate limiting: 10 requests/minute per IP
 * - Document hash verification
 * - No credentials in requests
 */

// Constants
const ALLOWED_ORIGINS = {
  production: 'https://fantasy.forgewright.io',
  staging: 'https://fantasy-editor.pages.dev',
  development: 'http://localhost:3001'
}

const RATE_LIMIT = {
  requests: 10,
  window: 60 // seconds
}

const GITHUB_API = 'https://api.github.com'
const LEGAL_REPO = 'fantasy-editor-legal'

// Document paths in the private repo
const DOCUMENT_PATHS = {
  'privacy-policy': 'documents/privacy-policy.md',
  'terms-of-service': 'documents/terms-of-service.md',
  'eula': 'documents/eula.md',
  'license': 'documents/LICENSE.md',
  'release-notes': 'documents/release-notes.md'
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // Get request details
      const url = new URL(request.url)
      const path = url.pathname
      const origin = request.headers.get('Origin')
      
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCORSPreflight(origin, env)
      }
      
      // Validate origin
      if (!isOriginAllowed(origin, env)) {
        return createErrorResponse('Forbidden - Invalid Origin', 403)
      }
      
      // Check rate limit
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown'
      const rateLimitResponse = await checkRateLimit(clientIP, env)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
      
      // Route request
      if (path === '/legal/check') {
        return await handleCheckEndpoint(request, env, origin)
      } else if (path === '/legal/documents') {
        return await handleDocumentsEndpoint(request, env, origin)
      } else if (path === '/health') {
        return createSuccessResponse({ status: 'healthy' }, origin)
      }
      
      return createErrorResponse('Not Found', 404)
    } catch (error) {
      console.error('Worker error:', error.message)
      return createErrorResponse('Internal Server Error', 500)
    }
  }
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin, env) {
  if (!origin) return false
  
  // If CORS_ORIGIN is explicitly set, use it
  if (env.CORS_ORIGIN) {
    return origin === env.CORS_ORIGIN
  }
  
  // Otherwise, use environment-based defaults
  const environment = env.ENVIRONMENT || 'development'
  const allowedOrigin = ALLOWED_ORIGINS[environment]
  
  return origin === allowedOrigin
}

/**
 * Handle CORS preflight requests
 */
function handleCORSPreflight(origin, env) {
  if (!isOriginAllowed(origin, env)) {
    return new Response(null, { status: 403 })
  }
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}

/**
 * Check rate limit using KV storage
 */
async function checkRateLimit(clientIP, env) {
  if (!env.RATE_LIMIT_KV) {
    // KV not configured, skip rate limiting
    return null
  }
  
  const key = `rate_limit:${clientIP}`
  const now = Date.now()
  
  try {
    // Get existing rate limit data
    const data = await env.RATE_LIMIT_KV.get(key, { type: 'json' })
    
    if (data) {
      const elapsed = (now - data.timestamp) / 1000
      
      if (elapsed < RATE_LIMIT.window) {
        if (data.count >= RATE_LIMIT.requests) {
          const resetTime = Math.ceil(RATE_LIMIT.window - elapsed)
          return createErrorResponse(
            `Rate limit exceeded. Try again in ${resetTime} seconds`,
            429,
            {
              'X-RateLimit-Limit': RATE_LIMIT.requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': (data.timestamp + RATE_LIMIT.window * 1000).toString()
            }
          )
        }
        
        // Increment counter
        await env.RATE_LIMIT_KV.put(
          key,
          JSON.stringify({ count: data.count + 1, timestamp: data.timestamp }),
          { expirationTtl: RATE_LIMIT.window }
        )
      } else {
        // Reset counter
        await env.RATE_LIMIT_KV.put(
          key,
          JSON.stringify({ count: 1, timestamp: now }),
          { expirationTtl: RATE_LIMIT.window }
        )
      }
    } else {
      // First request
      await env.RATE_LIMIT_KV.put(
        key,
        JSON.stringify({ count: 1, timestamp: now }),
        { expirationTtl: RATE_LIMIT.window }
      )
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Continue without rate limiting on error
  }
  
  return null
}

/**
 * Handle /legal/check endpoint - returns document metadata
 */
async function handleCheckEndpoint(request, env, origin) {
  try {
    const metadata = await fetchDocumentMetadata(env)
    return createSuccessResponse(metadata, origin)
  } catch (error) {
    console.error('Check endpoint error:', error)
    return createErrorResponse('Failed to fetch metadata', 500)
  }
}

/**
 * Handle /legal/documents endpoint - returns specific documents
 */
async function handleDocumentsEndpoint(request, env, origin) {
  try {
    const url = new URL(request.url)
    const docType = url.searchParams.get('type')
    
    if (!docType || !DOCUMENT_PATHS[docType]) {
      return createErrorResponse('Invalid document type', 400)
    }
    
    const document = await fetchDocument(docType, env)
    return createSuccessResponse(document, origin)
  } catch (error) {
    console.error('Documents endpoint error:', error)
    return createErrorResponse('Failed to fetch document', 500)
  }
}

/**
 * Fetch document metadata from GitHub
 */
async function fetchDocumentMetadata(env) {
  const metadata = {}
  
  // For each document type, get the file info
  for (const [type, path] of Object.entries(DOCUMENT_PATHS)) {
    try {
      const response = await fetchFromGitHub(
        `/repos/${env.GITHUB_OWNER || 'fantasy-editor'}/${LEGAL_REPO}/contents/${path}`,
        env
      )
      
      if (response.ok) {
        const data = await response.json()
        metadata[type] = {
          sha: data.sha,
          size: data.size,
          path: data.path,
          lastModified: data.commit?.date || null
        }
      }
    } catch (error) {
      console.error(`Failed to fetch metadata for ${type}:`, error)
      metadata[type] = null
    }
  }
  
  return {
    documents: metadata,
    timestamp: new Date().toISOString()
  }
}

/**
 * Fetch a specific document from GitHub
 */
async function fetchDocument(docType, env) {
  const path = DOCUMENT_PATHS[docType]
  
  const response = await fetchFromGitHub(
    `/repos/${env.GITHUB_OWNER || 'fantasy-editor'}/${LEGAL_REPO}/contents/${path}`,
    env
  )
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }
  
  const data = await response.json()
  
  // Decode base64 content
  const content = atob(data.content)
  
  // Generate hash for integrity verification
  const hash = await generateHash(content)
  
  return {
    type: docType,
    content: content,
    sha: data.sha,
    hash: hash,
    size: data.size,
    path: data.path
  }
}

/**
 * Make authenticated request to GitHub API
 */
async function fetchFromGitHub(path, env) {
  const token = env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GitHub token not configured')
  }
  
  return await fetch(`${GITHUB_API}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Fantasy-Editor-Legal-Worker'
    }
  })
}

/**
 * Generate SHA-256 hash for content
 */
async function generateHash(content) {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create success response with security headers
 */
function createSuccessResponse(data, origin) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Cache-Control': 'public, max-age=300', // 5 minute cache
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
  })
}

/**
 * Create error response
 */
function createErrorResponse(message, status = 400, headers = {}) {
  return new Response(
    JSON.stringify({ error: message, status }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        ...headers
      }
    }
  )
}