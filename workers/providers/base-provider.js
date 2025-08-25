/**
 * BaseProvider - Abstract base class for Git provider OAuth implementations
 * Defines common interface and shared functionality for all Git providers
 */
export class BaseProvider {
  constructor(config = {}) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.redirectUri = config.redirectUri
    this.scopes = config.scopes || []
  }

  /**
   * Get provider name (must be implemented by subclasses)
   * @returns {string} Provider name (e.g., 'github', 'gitlab')
   */
  get name() {
    throw new Error('Provider name must be implemented by subclass')
  }

  /**
   * Get OAuth authorization URL (must be implemented by subclasses)
   * @returns {string} Authorization URL
   */
  get authorizationUrl() {
    throw new Error('Authorization URL must be implemented by subclass')
  }

  /**
   * Get OAuth token exchange URL (must be implemented by subclasses)
   * @returns {string} Token URL
   */
  get tokenUrl() {
    throw new Error('Token URL must be implemented by subclass')
  }

  /**
   * Get user info API URL (must be implemented by subclasses)
   * @returns {string} User API URL
   */
  get userApiUrl() {
    throw new Error('User API URL must be implemented by subclass')
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from OAuth callback
   * @param {string} [codeVerifier] - PKCE code verifier (optional)
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(code, codeVerifier = null) {
    if (!code) {
      throw new Error('Authorization code is required')
    }

    const tokenParams = this.buildTokenParams(code, codeVerifier)
    
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: this.getTokenHeaders(),
        body: this.formatTokenRequest(tokenParams)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(`OAuth error: ${data.error_description || data.error}`)
      }

      return this.processTokenResponse(data)
    } catch (error) {
      throw new Error(`Token exchange failed: ${error.message}`)
    }
  }

  /**
   * Fetch user information using access token
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<Object>} User information
   */
  async fetchUserInfo(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required')
    }

    try {
      const response = await fetch(this.userApiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`User info fetch failed: ${response.status} - ${errorText}`)
      }

      const userData = await response.json()
      return this.processUserData(userData)
    } catch (error) {
      throw new Error(`Failed to fetch user info: ${error.message}`)
    }
  }

  /**
   * Build token exchange parameters (can be overridden by providers)
   * @param {string} code - Authorization code
   * @param {string} [codeVerifier] - PKCE code verifier
   * @returns {Object} Token parameters
   */
  buildTokenParams(code, codeVerifier = null) {
    const params = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      redirect_uri: this.redirectUri
    }

    // Add PKCE code verifier if provided
    if (codeVerifier) {
      params.code_verifier = codeVerifier
    }

    return params
  }

  /**
   * Get headers for token exchange request (can be overridden)
   * @returns {Object} Request headers
   */
  getTokenHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Fantasy-Editor/1.0'
    }
  }

  /**
   * Format token request body (can be overridden by providers)
   * @param {Object} params - Token parameters
   * @returns {string} Formatted request body
   */
  formatTokenRequest(params) {
    return new URLSearchParams(params).toString()
  }

  /**
   * Process token response (can be overridden by providers)
   * @param {Object} data - Raw token response
   * @returns {Object} Processed token data
   */
  processTokenResponse(data) {
    return {
      access_token: data.access_token,
      token_type: data.token_type || 'Bearer',
      scope: data.scope,
      refresh_token: data.refresh_token
    }
  }

  /**
   * Process user data into standardized format (must be implemented)
   * @param {Object} userData - Raw user data from provider
   * @returns {Object} Standardized user data
   */
  processUserData(userData) {
    throw new Error('processUserData must be implemented by subclass')
  }

  /**
   * Validate provider configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    if (!this.clientId) {
      throw new Error(`${this.name} client ID is required`)
    }
    if (!this.clientSecret) {
      throw new Error(`${this.name} client secret is required`)
    }
    if (!this.redirectUri) {
      throw new Error(`${this.name} redirect URI is required`)
    }
  }
}