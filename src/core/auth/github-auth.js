/**
 * GitHubAuth - GitHub OAuth authentication manager
 * Implements OAuth Web Application Flow with PKCE for security
 */
import { GitHubErrorHandler } from './github-error-handler.js'

export class GitHubAuth {
  constructor() {
    this.clientId = null
    // Handle import.meta.env in both browser and test environments
    let env = {}
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Use eval to dynamically access import.meta to avoid syntax errors in Jest
      try {
        const importMetaAccess = eval('import.meta')
        env = importMetaAccess?.env || {}
      } catch (error) {
        env = {}
      }
    } else if (typeof global !== 'undefined' && global.import?.meta?.env) {
      // Jest environment with mocked import.meta
      env = global.import.meta.env
    } else {
      // Node.js environment
      env = process.env || {}
    }
    
    const envUri = env.VITE_GITHUB_REDIRECT_URI
    const origin = (typeof window !== 'undefined' && window.location) 
      ? window.location.origin 
      : 'http://localhost:3000'
    this.redirectUri = envUri || `${origin}/`
    this.scope = 'repo user'
    this.state = null
    this.codeVerifier = null
    this.accessToken = null
    this.user = null
    this.initialized = false
    this.errorHandler = new GitHubErrorHandler()
  }

  /**
   * Initialize GitHub OAuth with client configuration
   * @param {Object} config - OAuth configuration
   * @param {string} config.clientId - GitHub OAuth App client ID
   * @returns {Promise<void>}
   */
  async init(config) {
    if (!config.clientId) {
      throw new Error('GitHub OAuth client ID is required')
    }

    this.clientId = config.clientId
    this.initialized = true

    // Check for stored token on initialization
    await this.loadStoredToken()
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!this.accessToken && !!this.user
  }

  /**
   * Get current user information
   * @returns {Object|null} User object or null if not authenticated
   */
  getCurrentUser() {
    return this.user
  }

  /**
   * Get access token
   * @returns {string|null} Access token or null if not authenticated
   */
  getAccessToken() {
    return this.accessToken
  }

  /**
   * Start OAuth authentication flow
   * @returns {Promise<void>} Resolves when authentication flow starts
   */
  async login() {
    if (!this.initialized) {
      throw new Error('GitHubAuth not initialized. Call init() first.')
    }

    try {
      // Generate PKCE parameters
      this.codeVerifier = this.generateCodeVerifier()
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier)
      this.state = this.generateState()

      // Store PKCE parameters for callback
      sessionStorage.setItem('github_oauth_state', this.state)
      sessionStorage.setItem('github_oauth_code_verifier', this.codeVerifier)

      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl(codeChallenge)

      // Redirect to GitHub
      window.location.href = authUrl
    } catch (error) {
      throw new Error(`Failed to start OAuth flow: ${error.message}`)
    }
  }

  /**
   * Handle OAuth callback
   * @param {string} callbackUrl - Full callback URL with query parameters
   * @returns {Promise<Object>} User object
   */
  async handleCallback(callbackUrl) {
    try {
      const url = new URL(callbackUrl)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      if (error) {
        throw new Error(`OAuth error: ${error}`)
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter')
      }

      // Verify state parameter
      const storedState = sessionStorage.getItem('github_oauth_state')
      if (state !== storedState) {
        throw new Error('Invalid state parameter - possible CSRF attack')
      }

      // Retrieve code verifier
      const codeVerifier = sessionStorage.getItem('github_oauth_code_verifier')
      if (!codeVerifier) {
        throw new Error('Missing code verifier')
      }

      // Exchange code for access token
      await this.exchangeCodeForToken(code, codeVerifier)

      // Fetch user information
      await this.fetchUserInfo()

      // Emit auth state change event for UI updates
      this.emitAuthStateChange()

      // Clean up session storage
      this.cleanupOAuthSession()

      return this.user
    } catch (error) {
      this.cleanupOAuthSession()
      throw new Error(`OAuth callback failed: ${error.message}`)
    }
  }

  /**
   * Logout and clear authentication
   */
  logout() {
    this.accessToken = null
    this.user = null
    this.clearStoredToken()
    this.cleanupOAuthSession()

    // Emit auth state change event for UI updates
    this.emitAuthStateChange()
  }

  /**
   * Generate code verifier for PKCE
   * @returns {string} Code verifier
   */
  generateCodeVerifier() {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return this.base64URLEncode(array)
  }

  /**
   * Generate code challenge from verifier
   * @param {string} verifier - Code verifier
   * @returns {Promise<string>} Code challenge
   */
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return this.base64URLEncode(new Uint8Array(digest))
  }

  /**
   * Generate random state parameter
   * @returns {string} State parameter
   */
  generateState() {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return this.base64URLEncode(array)
  }

  /**
   * Base64 URL encode
   * @param {Uint8Array} buffer - Buffer to encode
   * @returns {string} Base64 URL encoded string
   */
  base64URLEncode(buffer) {
    const base64 = btoa(String.fromCharCode(...buffer))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * Build GitHub authorization URL
   * @param {string} codeChallenge - PKCE code challenge
   * @returns {string} Authorization URL
   */
  buildAuthorizationUrl(codeChallenge) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: this.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code
   * @param {string} codeVerifier - PKCE code verifier
   * @returns {Promise<void>}
   */
  async exchangeCodeForToken(code, codeVerifier) {
    // Use backend API to handle token exchange with client secret and PKCE
    const requestBody = { code: code }

    // Include code_verifier if provided (for PKCE)
    if (codeVerifier) {
      requestBody.code_verifier = codeVerifier
    }

    const response = await fetch('/api/github/oauth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`Token exchange error: ${data.error_description || data.error}`)
    }

    if (!data.access_token) {
      throw new Error('No access token received from GitHub')
    }

    this.accessToken = data.access_token
    this.storeToken(data.access_token)
  }

  /**
   * Fetch user information from GitHub API
   * @returns {Promise<void>}
   */
  async fetchUserInfo() {
    const response = await this.makeAuthenticatedRequest('/user')
    this.user = await response.json()
  }

  /**
   * Store access token securely
   * @param {string} token - Access token
   */
  storeToken(token) {
    // Use sessionStorage for security - token only persists for browser session
    sessionStorage.setItem('github_access_token', token)
  }

  /**
   * Load stored token
   * @returns {Promise<boolean>} True if token was loaded and validated
   */
  async loadStoredToken() {
    const token = sessionStorage.getItem('github_access_token')
    if (!token) {
      return false
    }

    this.accessToken = token

    try {
      // Fetch user info to validate token
      await this.fetchUserInfo()

      // Emit auth state change event for UI updates
      this.emitAuthStateChange()

      return true
    } catch (error) {
      // Token might be expired, clear it
      console.warn('Stored token validation failed:', error.message)
      this.clearStoredToken()
      this.accessToken = null
      this.user = null
      return false
    }
  }

  /**
   * Emit authentication state change event
   */
  emitAuthStateChange() {
    const event = new CustomEvent('github-auth-state-changed', {
      detail: {
        isAuthenticated: this.isAuthenticated(),
        user: this.user
      }
    })
    window.dispatchEvent(event)
  }

  /**
   * Clear stored token
   */
  clearStoredToken() {
    sessionStorage.removeItem('github_access_token')
  }

  /**
   * Clean up OAuth session data
   */
  cleanupOAuthSession() {
    sessionStorage.removeItem('github_oauth_state')
    sessionStorage.removeItem('github_oauth_code_verifier')
  }

  /**
   * Make authenticated request to GitHub API
   * @param {string} endpoint - API endpoint (relative to api.github.com)
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async makeAuthenticatedRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    const url = endpoint.startsWith('/api/') ? endpoint : `/api/github/proxy${endpoint}`

    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      // Update rate limit info
      this.errorHandler.updateRateLimitInfo(response)

      if (!response.ok) {
        // Handle authentication errors by logging out
        if (response.status === 401) {
          this.logout()
        }

        const errorResponse = await this.errorHandler.handleError(
          response,
          `GitHub API ${endpoint}`
        )
        this.errorHandler.logError(errorResponse, { endpoint, method: options.method || 'GET' })
        throw new Error(this.errorHandler.formatUserMessage(errorResponse))
      }

      return response
    } catch (error) {
      if (error.message.startsWith('{')) {
        // Already handled by error handler
        throw error
      }

      // Handle network and other errors
      const errorResponse = await this.errorHandler.handleError(error, `GitHub API ${endpoint}`)
      this.errorHandler.logError(errorResponse, { endpoint, method: options.method || 'GET' })
      throw new Error(this.errorHandler.formatUserMessage(errorResponse))
    }
  }

  /**
   * Get authentication status and user info
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      authenticated: this.isAuthenticated(),
      user: this.user,
      clientId: this.clientId,
      initialized: this.initialized,
      rateLimitStatus: this.errorHandler.getRateLimitStatus()
    }
  }

  /**
   * Get error handler instance
   * @returns {GitHubErrorHandler} Error handler
   */
  getErrorHandler() {
    return this.errorHandler
  }
}
