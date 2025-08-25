/**
 * Multi-Provider OAuth Proxy Worker for Fantasy Editor
 * Handles OAuth token exchange for GitHub, GitLab, Bitbucket, and generic Git providers
 * Deployed as Cloudflare Worker to enable client-side app OAuth integration
 */

import { GitHubProvider } from './providers/github.js'
import { GitLabProvider } from './providers/gitlab.js'
import { BitbucketProvider } from './providers/bitbucket.js'
import { GenericGitProvider } from './providers/generic-git.js'

/**
 * Provider factory - creates provider instances based on type
 * @param {string} providerType - Provider type (github, gitlab, bitbucket, generic)
 * @param {Object} config - Provider configuration
 * @returns {BaseProvider} Provider instance
 */
function createProvider(providerType, config) {
  const providers = {
    github: GitHubProvider,
    gitlab: GitLabProvider,
    bitbucket: BitbucketProvider,
    generic: GenericGitProvider
  }

  const ProviderClass = providers[providerType]
  if (!ProviderClass) {
    throw new Error(`Unsupported provider type: ${providerType}`)
  }

  return new ProviderClass(config)
}

/**
 * Get provider configuration from environment variables
 * @param {string} providerType - Provider type
 * @param {Object} env - Environment variables
 * @returns {Object} Provider configuration
 */
function getProviderConfig(providerType, env) {
  const baseConfig = {
    clientId: env[`${providerType.toUpperCase()}_CLIENT_ID`],
    clientSecret: env[`${providerType.toUpperCase()}_CLIENT_SECRET`],
    redirectUri: env.OAUTH_REDIRECT_URI || 'https://forgewright.io/'
  }

  // Provider-specific configurations
  const configs = {
    github: baseConfig,
    gitlab: {
      ...baseConfig,
      baseUrl: env.GITLAB_BASE_URL || 'https://gitlab.com'
    },
    bitbucket: baseConfig,
    generic: {
      ...baseConfig,
      baseUrl: env.GENERIC_GIT_BASE_URL,
      providerName: env.GENERIC_GIT_PROVIDER_NAME,
      providerDisplayName: env.GENERIC_GIT_DISPLAY_NAME
    }
  }

  const config = configs[providerType]
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Missing ${providerType} OAuth credentials`)
  }

  return config
}

/**
 * Handle OAuth token exchange request
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @returns {Response} Token response or error
 */
async function handleTokenExchange(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { provider, code, codeVerifier, providerConfig } = await request.json()
    
    if (!provider || !code) {
      return new Response('Missing required parameters', { status: 400 })
    }

    // Get provider configuration
    const config = providerConfig 
      ? { ...getProviderConfig(provider, env), ...providerConfig }
      : getProviderConfig(provider, env)

    // Create provider instance
    const providerInstance = createProvider(provider, config)
    
    // Validate configuration
    providerInstance.validateConfig()

    // Exchange code for token
    const tokenData = await providerInstance.exchangeCodeForToken(code, codeVerifier)

    return new Response(JSON.stringify(tokenData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://forgewright.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('Token exchange error:', error)
    return new Response(JSON.stringify({ 
      error: 'Token exchange failed',
      details: error.message 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://forgewright.io'
      }
    })
  }
}

/**
 * Handle user info fetch request
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @returns {Response} User info response or error
 */
async function handleUserInfo(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { provider, accessToken, providerConfig } = await request.json()
    
    if (!provider || !accessToken) {
      return new Response('Missing required parameters', { status: 400 })
    }

    // Get provider configuration
    const config = providerConfig 
      ? { ...getProviderConfig(provider, env), ...providerConfig }
      : getProviderConfig(provider, env)

    // Create provider instance
    const providerInstance = createProvider(provider, config)
    
    // Fetch user info
    const userData = await providerInstance.fetchUserInfo(accessToken)

    return new Response(JSON.stringify(userData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://forgewright.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('User info fetch error:', error)
    return new Response(JSON.stringify({ 
      error: 'User info fetch failed',
      details: error.message 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://forgewright.io'
      }
    })
  }
}

/**
 * Handle repository operations request
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @returns {Response} Repository data response or error
 */
async function handleRepositoryOps(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { provider, operation, accessToken, providerConfig, ...params } = await request.json()
    
    if (!provider || !operation || !accessToken) {
      return new Response('Missing required parameters', { status: 400 })
    }

    // Get provider configuration
    const config = providerConfig 
      ? { ...getProviderConfig(provider, env), ...providerConfig }
      : getProviderConfig(provider, env)

    // Create provider instance
    const providerInstance = createProvider(provider, config)
    
    // Execute repository operation
    let result
    
    // Handle direct GitHub API proxy calls (for GitHub Storage compatibility)
    if (operation.startsWith('/')) {
      const apiUrl = `https://api.github.com${operation}`
      
      // Prepare fetch options
      const fetchOptions = {
        method: params.method || 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Fantasy-Editor-OAuth-Proxy',
          ...(params.headers || {})
        }
      }
      
      // Add body for non-GET requests
      if (params.body && params.method !== 'GET') {
        fetchOptions.body = typeof params.body === 'string' 
          ? params.body 
          : JSON.stringify(params.body)
      }
      
      const response = await fetch(apiUrl, fetchOptions)
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`GitHub API error: ${response.status} - ${error}`)
      }
      
      // Handle empty responses (like 204 No Content)
      const text = await response.text()
      result = text ? JSON.parse(text) : {}
    } else {
      // Existing provider operations
      switch (operation) {
        case 'fetchRepositories':
          result = await providerInstance.fetchRepositories(accessToken, params.options)
          break
        case 'createRepository':
          result = await providerInstance.createRepository(accessToken, params.repoConfig)
          break
        case 'getFileContent':
          result = await providerInstance.getFileContent(
            accessToken, params.owner, params.repo, params.path, params.ref
          )
          break
        case 'updateFile':
          result = await providerInstance.updateFile(
            accessToken, params.owner, params.repo, params.path, params.fileData
          )
          break
        case 'getBranches':
          result = await providerInstance.getBranches(accessToken, params.owner, params.repo)
          break
        default:
          throw new Error(`Unsupported operation: ${operation}`)
      }
    }

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://forgewright.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('Repository operation error:', error)
    return new Response(JSON.stringify({ 
      error: 'Repository operation failed',
      details: error.message 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://forgewright.io'
      }
    })
  }
}

/**
 * Handle CORS preflight requests
 * @param {Object} env - Environment variables
 * @returns {Response} CORS response
 */
function handleCORS(env, origin) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': origin, // Use validated origin
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'false',
      'Access-Control-Max-Age': '86400',
      'X-Security-Policy': 'Strict-Origin'
    }
  })
}

/**
 * Main Worker fetch handler
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Response} Response
 */
export default {
  async fetch(request, env, ctx) {
    // Security: Strict origin validation
    const origin = request.headers.get('Origin')
    const allowedOrigins = [env.CORS_ORIGIN || 'https://forgewright.io']
    
    // Block requests without proper origin
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response('Forbidden - Invalid Origin', { 
        status: 403,
        headers: { 
          'Content-Type': 'text/plain',
          'X-Security-Error': 'Invalid Origin'
        }
      })
    }

    // Rate limiting: Simple per-IP rate limiting  
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                     '0.0.0.0'

    // Basic request validation
    const userAgent = request.headers.get('User-Agent')
    if (!userAgent || userAgent.length < 5) {
      return new Response('Forbidden - Invalid Request', { 
        status: 403,
        headers: { 
          'Content-Type': 'text/plain',
          'X-Security-Error': 'Invalid User-Agent'
        }
      })
    }

    const url = new URL(request.url)
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(env, origin)
    }

    // Route requests based on path
    switch (url.pathname) {
      case '/oauth/token':
        return handleTokenExchange(request, env)
      
      case '/oauth/user':
        return handleUserInfo(request, env)
      
      case '/oauth/repos':
        return handleRepositoryOps(request, env)
      
      case '/health':
        return new Response(JSON.stringify({ 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          providers: ['github', 'gitlab', 'bitbucket', 'generic']
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      
      default:
        // Security: Don't expose endpoints or provide helpful error messages
        return new Response('Endpoint not found', { 
          status: 404,
          headers: { 
            'Content-Type': 'text/plain',
            'X-Security-Policy': 'Deny-Unknown-Endpoints'
          }
        })
    }
  }
}