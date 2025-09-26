// Helper function to get environment variables across different environments
function getEnvVar(key) {
  // Jest test environment with mocked import.meta
  if (typeof global !== 'undefined' && global.import?.meta?.env) {
    return global.import.meta.env[key]
  }
  
  // Node.js environment fallback
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  
  return undefined
}

/**
 * AuthManager - Multi-provider OAuth authentication manager
 * Provides unified interface for GitHub, GitLab, Bitbucket, and generic Git providers
 */
export class AuthManager {
  constructor() {
    this.currentProvider = null
    this.providerConfig = null
    this.accessToken = null
    this.user = null
    this.initialized = false

    // Runtime configuration - OAuth Client IDs fetched securely at runtime
    // SECURITY: No hardcoded OAuth credentials in client bundle
    const workerUrl = (typeof window !== 'undefined')
      ? import.meta.env.VITE_OAUTH_WORKER_URL
      : getEnvVar('VITE_OAUTH_WORKER_URL')

    // TEMPORARY OVERRIDE: Force correct port for development
    const isLocalDev = window?.location?.hostname === 'localhost'
    this.workerUrl = isLocalDev ? 'http://localhost:8787' : (workerUrl || 'https://fantasy-oauth-proxy.wellington-granja.workers.dev')

    // Runtime OAuth configuration - Client IDs loaded dynamically
    this.oauthConfig = null

    // Provider configurations - Client IDs populated at runtime
    this.providers = {
      github: {
        name: 'github',
        displayName: 'GitHub',
        authUrl: 'https://github.com/login/oauth/authorize',
        clientId: null, // Loaded at runtime
        scopes: ['repo', 'user'],
        color: '#24292e'
      },
      gitlab: {
        name: 'gitlab',
        displayName: 'GitLab',
        authUrl: 'https://gitlab.com/oauth/authorize',
        clientId: null, // Loaded at runtime
        scopes: ['api', 'read_user', 'read_repository', 'write_repository'],
        color: '#fc6d26'
      },
      bitbucket: {
        name: 'bitbucket',
        displayName: 'Bitbucket',
        authUrl: 'https://bitbucket.org/site/oauth2/authorize',
        clientId: null, // Loaded at runtime
        scopes: ['account', 'repositories:read', 'repositories:write'],
        color: '#0052cc'
      }
    }
    
    this.state = null
    this.codeVerifier = null
  }

  /**
   * Load OAuth configuration at runtime - secure alternative to hardcoded Client IDs
   * @returns {Promise<void>}
   */
  async loadOAuthConfiguration() {
    try {
      // For development, use hardcoded values (temporary)
      // In production, this would fetch from secure configuration endpoint
      const isLocalDev = window?.location?.hostname === 'localhost'

      if (isLocalDev) {
        // Development configuration - fetch from secure endpoint
        // SECURITY: NO hardcoded Client IDs, even in development
        const configResponse = await fetch(`${this.workerUrl}/config/oauth`)
        if (!configResponse.ok) {
          console.warn('Development OAuth config unavailable, disabling OAuth')
          this.oauthConfig = {
            github: { clientId: null },
            gitlab: { clientId: null },
            bitbucket: { clientId: null }
          }
        } else {
          this.oauthConfig = await configResponse.json()
        }
      } else {
        // Production: Fetch from secure configuration endpoint
        const configResponse = await fetch(`${this.workerUrl}/config/oauth`)
        if (!configResponse.ok) {
          throw new Error('Failed to load OAuth configuration')
        }
        this.oauthConfig = await configResponse.json()
      }

      // Update provider configurations with loaded Client IDs
      Object.keys(this.providers).forEach(providerName => {
        if (this.oauthConfig[providerName]?.clientId) {
          this.providers[providerName].clientId = this.oauthConfig[providerName].clientId
        }
      })

    } catch (error) {
      console.error('Failed to load OAuth configuration:', error)
      // Graceful degradation - disable OAuth functionality
      this.oauthConfig = null
      Object.keys(this.providers).forEach(providerName => {
        this.providers[providerName].clientId = null
      })
    }
  }

  /**
   * Initialize auth manager
   * @returns {Promise<void>}
   */
  async init() {
    // Load OAuth configuration at runtime first
    await this.loadOAuthConfiguration()

    this.initialized = true

    // Try to load stored authentication
    await this.loadStoredAuth()
  }

  /**
   * Get available providers
   * @returns {Array} Available providers with configuration
   */
  getAvailableProviders() {
    return Object.values(this.providers).filter(provider => provider.clientId)
  }

  /**
   * Get current provider
   * @returns {Object|null} Current provider config
   */
  getCurrentProvider() {
    return this.currentProvider
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!this.accessToken && !!this.user && !!this.currentProvider
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
   * Start OAuth authentication flow for specified provider
   * @param {string} providerName - Provider name (github, gitlab, bitbucket)
   * @param {Object} customConfig - Optional custom provider config for generic providers
   * @returns {Promise<void>}
   */
  async login(providerName, customConfig = null) {
    if (!this.initialized) {
      throw new Error('AuthManager not initialized. Call init() first.')
    }

    // Get provider config
    let providerConfig
    if (customConfig) {
      // Handle custom/generic providers
      providerConfig = {
        name: providerName,
        displayName: customConfig.displayName || providerName,
        authUrl: customConfig.authUrl,
        clientId: customConfig.clientId,
        scopes: customConfig.scopes || [],
        baseUrl: customConfig.baseUrl,
        ...customConfig
      }
    } else {
      providerConfig = this.providers[providerName]
      if (!providerConfig) {
        throw new Error(`Unknown provider: ${providerName}`)
      }
      if (!providerConfig.clientId) {
        throw new Error(`${providerConfig.displayName} client ID not configured`)
      }
    }

    try {
      // Generate PKCE parameters
      this.codeVerifier = this.generateCodeVerifier()
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier)
      this.state = this.generateState()

      // Store OAuth session data
      const oauthSession = {
        provider: providerName,
        providerConfig: providerConfig,
        state: this.state,
        codeVerifier: this.codeVerifier
      }
      localStorage.setItem('oauth_session', JSON.stringify(oauthSession))

      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl(providerConfig, codeChallenge)

      // Redirect to provider
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
      console.log('🔍 AuthManager Debug: handleCallback called with URL:', callbackUrl)

      const url = new URL(callbackUrl)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      console.log('🔍 AuthManager Debug: URL params:', { code: code?.substring(0, 10) + '...', state, error })

      if (error) {
        throw new Error(`OAuth error: ${error}`)
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter')
      }

      // Retrieve OAuth session
      const sessionData = localStorage.getItem('oauth_session')
      console.log('🔍 AuthManager Debug: OAuth session data exists:', !!sessionData)

      if (!sessionData) {
        console.error('OAuth session data missing from localStorage. Available keys:', Object.keys(localStorage))
        throw new Error('Missing OAuth session data - OAuth session may have expired or been cleared')
      }

      const oauthSession = JSON.parse(sessionData)
      console.log('🔍 AuthManager Debug: OAuth session parsed:', {
        provider: oauthSession.provider,
        hasCodeVerifier: !!oauthSession.codeVerifier,
        sessionState: oauthSession.state
      })

      // Verify state parameter
      if (state !== oauthSession.state) {
        throw new Error('Invalid state parameter - possible CSRF attack')
      }

      console.log('🔍 AuthManager Debug: State verified, calling exchangeCodeForToken')

      // Exchange code for access token
      await this.exchangeCodeForToken(
        oauthSession.provider,
        code,
        oauthSession.codeVerifier,
        oauthSession.providerConfig
      )

      console.log('🔍 AuthManager Debug: Token exchange successful')

      // Set current provider
      this.currentProvider = oauthSession.providerConfig
      this.providerConfig = oauthSession.providerConfig

      console.log('🔍 AuthManager Debug: Fetching user info')

      // Fetch user information
      await this.fetchUserInfo()

      console.log('🔍 AuthManager Debug: User info fetched:', this.user?.name || this.user?.login)

      // Store authentication securely
      await this.storeAuth()

      // Emit auth state change event
      this.emitAuthStateChange()

      // Clean up session storage
      this.cleanupOAuthSession()

      return this.user
    } catch (error) {
      console.error('🔥 AuthManager handleCallback error:', error)
      this.cleanupOAuthSession()
      throw new Error(`OAuth callback failed: ${error.message}`)
    }
  }

  /**
   * Logout and clear authentication
   */
  async logout() {
    this.currentProvider = null
    this.providerConfig = null
    this.accessToken = null
    this.user = null
    await this.clearStoredAuth()
    this.cleanupOAuthSession()

    // Emit auth state change event
    this.emitAuthStateChange()
  }

  /**
   * Exchange authorization code for access token via Worker
   * @param {string} provider - Provider name
   * @param {string} code - Authorization code
   * @param {string} codeVerifier - PKCE code verifier
   * @param {Object} providerConfig - Provider configuration
   * @returns {Promise<void>}
   */
  async exchangeCodeForToken(provider, code, codeVerifier, providerConfig) {
    const requestBody = {
      provider: provider,
      code: code,
      codeVerifier: codeVerifier
    }

    // Include custom provider config for generic providers
    if (providerConfig.baseUrl) {
      requestBody.providerConfig = {
        baseUrl: providerConfig.baseUrl,
        providerName: providerConfig.name,
        providerDisplayName: providerConfig.displayName
      }
    }

    const endpoint = `${this.workerUrl}/oauth/token`

    console.log('🔍 Token Exchange Debug: Making request')
    console.log('🔍 Token Exchange Debug: Worker URL:', this.workerUrl)
    console.log('🔍 Token Exchange Debug: Endpoint:', endpoint)
    console.log('🔍 Token Exchange Debug: Request body:', {
      provider: requestBody.provider,
      codeLength: requestBody.code?.length,
      codeVerifierLength: requestBody.codeVerifier?.length,
      hasProviderConfig: !!requestBody.providerConfig
    })

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('🔍 Token Exchange Debug: Response status:', response.status)
      console.log('🔍 Token Exchange Debug: Response ok:', response.ok)
      console.log('🔍 Token Exchange Debug: Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errorData = {}
        let errorText = ''

        try {
          const responseText = await response.text()
          console.log('🔥 Token Exchange Error: Raw response:', responseText)
          errorText = responseText

          // Try to parse as JSON
          if (responseText) {
            errorData = JSON.parse(responseText)
          }
        } catch (parseError) {
          console.log('🔥 Token Exchange Error: Failed to parse error response as JSON')
          errorData = { details: errorText || response.statusText }
        }

        const errorMessage = `Token exchange failed (${response.status}): ${errorData.details || errorData.error || errorText || response.statusText}`
        console.error('🔥 Token Exchange Error:', errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('🔍 Token Exchange Debug: Success response:', {
        hasAccessToken: !!data.access_token,
        hasError: !!data.error,
        tokenLength: data.access_token?.length
      })

      if (data.error) {
        throw new Error(`Token exchange error: ${data.details || data.error}`)
      }

      if (!data.access_token) {
        throw new Error('No access token received')
      }

      this.accessToken = data.access_token
      console.log('🔍 Token Exchange Debug: Access token stored successfully')
    } catch (fetchError) {
      console.error('🔥 Token Exchange Debug: Network/Fetch error:', fetchError)

      // Check if it's a network error (CORS, connection, etc.)
      if (fetchError.name === 'TypeError' || fetchError.message.includes('fetch')) {
        throw new Error(`Network error connecting to OAuth worker: ${fetchError.message}`)
      }

      // Re-throw other errors
      throw fetchError
    }
  }

  /**
   * Fetch user information via Worker
   * @returns {Promise<void>}
   */
  async fetchUserInfo() {
    const requestBody = {
      provider: this.currentProvider.name,
      accessToken: this.accessToken
    }

    // Include custom provider config for generic providers
    if (this.currentProvider.baseUrl) {
      requestBody.providerConfig = {
        baseUrl: this.currentProvider.baseUrl,
        providerName: this.currentProvider.name,
        providerDisplayName: this.currentProvider.displayName
      }
    }

    const response = await fetch(`${this.workerUrl}/oauth/user`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`User info fetch failed: ${errorData.details || response.statusText}`)
    }

    const userData = await response.json()
    this.user = userData
  }

  /**
   * Make authenticated API request via Worker
   * @param {string} operation - API operation (fetchRepositories, createRepository, etc.)
   * @param {Object} params - Operation parameters
   * @returns {Promise<Object>} API response
   */
  async makeAuthenticatedRequest(operation, params = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated')
    }

    const requestBody = {
      provider: this.currentProvider.name,
      operation: operation,
      accessToken: this.accessToken,
      ...params
    }

    // Include custom provider config for generic providers
    if (this.currentProvider.baseUrl) {
      requestBody.providerConfig = {
        baseUrl: this.currentProvider.baseUrl,
        providerName: this.currentProvider.name,
        providerDisplayName: this.currentProvider.displayName
      }
    }

    const response = await fetch(`${this.workerUrl}/oauth/repos`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      // Handle authentication errors by logging out
      if (response.status === 401) {
        this.logout()
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(`API request failed: ${errorData.details || response.statusText}`)
    }

    return await response.json()
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
   * Build provider authorization URL
   * @param {Object} providerConfig - Provider configuration
   * @param {string} codeChallenge - PKCE code challenge
   * @returns {string} Authorization URL
   */
  buildAuthorizationUrl(providerConfig, codeChallenge) {
    // Omit redirect_uri to use GitHub OAuth app's configured callback URL
    // This prevents redirect URI mismatch 404 errors
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      scope: providerConfig.scopes.join(' '),
      state: this.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    // Add response_type for providers that require it
    if (providerConfig.name === 'bitbucket') {
      params.set('response_type', 'code')
    }

    return `${providerConfig.authUrl}?${params.toString()}`
  }

  /**
   * Store authentication data securely with encryption
   */
  async storeAuth() {
    try {
      // Import security utilities for secure token storage
      const { storeSecureAuth } = await import('../../utils/security.js')

      const authData = {
        provider: this.currentProvider,
        accessToken: this.accessToken,
        user: this.user,
        timestamp: Date.now()
      }

      await storeSecureAuth(authData)
    } catch (error) {
      console.error('Failed to store authentication data:', error)
      throw new Error('Failed to store authentication data securely')
    }
  }

  /**
   * Load stored authentication data
   * @returns {Promise<boolean>} True if auth was loaded and validated
   */
  async loadStoredAuth() {
    try {
      // Import security utilities for secure token loading
      const { loadSecureAuth } = await import('../../utils/security.js')

      const data = await loadSecureAuth()
      if (!data) {
        return false
      }

      this.currentProvider = data.provider
      this.providerConfig = data.provider
      this.accessToken = data.accessToken
      this.user = data.user

      // Validate token by fetching user info
      await this.fetchUserInfo()

      // Emit auth state change event
      this.emitAuthStateChange()

      return true
    } catch (error) {
      console.warn('Stored auth validation failed:', error.message)
      await this.clearStoredAuth()
      this.currentProvider = null
      this.providerConfig = null
      this.accessToken = null
      this.user = null
      return false
    }
  }

  /**
   * Clear stored authentication data securely
   */
  async clearStoredAuth() {
    try {
      // Import security utilities for secure clearing
      const { clearSecureAuth } = await import('../../utils/security.js')
      clearSecureAuth()

      // Also clear any legacy localStorage data for backward compatibility
      localStorage.removeItem('auth_data')
    } catch (error) {
      console.error('Error clearing authentication data:', error)
      // Fallback to basic clearing
      localStorage.removeItem('auth_data')
      sessionStorage.removeItem('auth_data')
    }
  }

  /**
   * Clean up OAuth session data
   */
  cleanupOAuthSession() {
    localStorage.removeItem('oauth_session')
  }

  /**
   * Emit authentication state change event
   */
  emitAuthStateChange() {
    const event = new CustomEvent('auth-state-changed', {
      detail: {
        isAuthenticated: this.isAuthenticated(),
        user: this.user,
        provider: this.currentProvider
      }
    })
    window.dispatchEvent(event)
  }

  /**
   * Get authentication status and info
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      authenticated: this.isAuthenticated(),
      user: this.user,
      provider: this.currentProvider,
      availableProviders: this.getAvailableProviders(),
      initialized: this.initialized
    }
  }
}