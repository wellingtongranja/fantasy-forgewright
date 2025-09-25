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

    // Get environment variables - use import.meta.env directly in browser, fallback for tests
    const githubClientId = (typeof window !== 'undefined') 
      ? import.meta.env.VITE_GITHUB_CLIENT_ID 
      : getEnvVar('VITE_GITHUB_CLIENT_ID')
    
    const workerUrl = (typeof window !== 'undefined')
      ? import.meta.env.VITE_OAUTH_WORKER_URL
      : getEnvVar('VITE_OAUTH_WORKER_URL')

    // TEMPORARY OVERRIDE: Force correct port for development
    const isLocalDev = window?.location?.hostname === 'localhost'
    this.workerUrl = isLocalDev ? 'http://localhost:8787' : (workerUrl || 'https://oauth.forgewright.io')

    // Environment configuration validated - debug logging removed for production security
    
    
    // Provider configurations
    this.providers = {
      github: {
        name: 'github',
        displayName: 'GitHub',
        authUrl: 'https://github.com/login/oauth/authorize',
        clientId: githubClientId,
        scopes: ['repo', 'user'],
        color: '#24292e'
      },
      gitlab: {
        name: 'gitlab',
        displayName: 'GitLab',
        authUrl: 'https://gitlab.com/oauth/authorize',
        clientId: (typeof window !== 'undefined') 
          ? import.meta.env.VITE_GITLAB_CLIENT_ID 
          : getEnvVar('VITE_GITLAB_CLIENT_ID'),
        scopes: ['api', 'read_user', 'read_repository', 'write_repository'],
        color: '#fc6d26'
      },
      bitbucket: {
        name: 'bitbucket',
        displayName: 'Bitbucket',
        authUrl: 'https://bitbucket.org/site/oauth2/authorize',
        clientId: (typeof window !== 'undefined') 
          ? import.meta.env.VITE_BITBUCKET_CLIENT_ID 
          : getEnvVar('VITE_BITBUCKET_CLIENT_ID'),
        scopes: ['account', 'repositories:read', 'repositories:write'],
        color: '#0052cc'
      }
    }
    
    this.state = null
    this.codeVerifier = null
  }

  /**
   * Initialize auth manager
   * @returns {Promise<void>}
   */
  async init() {
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

      // Retrieve OAuth session
      const sessionData = localStorage.getItem('oauth_session')
      if (!sessionData) {
        console.error('OAuth session data missing from localStorage. Available keys:', Object.keys(localStorage))
        throw new Error('Missing OAuth session data - OAuth session may have expired or been cleared')
      }

      const oauthSession = JSON.parse(sessionData)

      // Verify state parameter
      if (state !== oauthSession.state) {
        throw new Error('Invalid state parameter - possible CSRF attack')
      }

      // Exchange code for access token
      await this.exchangeCodeForToken(
        oauthSession.provider,
        code,
        oauthSession.codeVerifier,
        oauthSession.providerConfig
      )

      // Set current provider
      this.currentProvider = oauthSession.providerConfig
      this.providerConfig = oauthSession.providerConfig

      // Fetch user information
      await this.fetchUserInfo()

      // Store authentication securely
      await this.storeAuth()

      // Emit auth state change event
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

    const response = await fetch(`${this.workerUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Token exchange failed: ${errorData.details || response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`Token exchange error: ${data.details || data.error}`)
    }

    if (!data.access_token) {
      throw new Error('No access token received')
    }

    this.accessToken = data.access_token
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
    const redirectUri = `${window.location.origin}/`
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri,
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