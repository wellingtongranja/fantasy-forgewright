/**
 * GitHubDeviceFlow - GitHub Device Authorization Flow
 * Secure authentication method for client-side applications
 * See: https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */
export class GitHubDeviceFlow {
  constructor() {
    this.clientId = null
    this.deviceCode = null
    this.userCode = null
    this.verificationUri = null
    this.interval = 5000 // Default polling interval
    this.expiresIn = 900 // Default 15 minutes
    this.accessToken = null
    this.user = null
    this.pollingTimer = null
    this.initialized = false
  }

  /**
   * Initialize GitHub Device Flow with client configuration
   * @param {Object} config - OAuth configuration
   * @param {string} config.clientId - GitHub OAuth App client ID
   */
  init(config) {
    if (!config.clientId) {
      throw new Error('GitHub OAuth client ID is required')
    }
    
    this.clientId = config.clientId
    this.initialized = true
    
    // Check for stored token on initialization
    this.loadStoredToken()
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
   * Start Device Flow authentication
   * @returns {Promise<Object>} Device flow initiation response
   */
  async startDeviceFlow() {
    if (!this.initialized) {
      throw new Error('GitHubDeviceFlow not initialized. Call init() first.')
    }

    try {
      const response = await fetch('/api/github/device-code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Device flow initiation failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(`Device flow error: ${data.error_description || data.error}`)
      }

      this.deviceCode = data.device_code
      this.userCode = data.user_code
      this.verificationUri = data.verification_uri
      this.interval = data.interval * 1000 || 5000 // Convert to milliseconds
      this.expiresIn = data.expires_in

      return {
        userCode: this.userCode,
        verificationUri: this.verificationUri,
        expiresIn: this.expiresIn
      }
    } catch (error) {
      throw new Error(`Failed to start device flow: ${error.message}`)
    }
  }

  /**
   * Start polling for access token
   * @returns {Promise<Object>} User object when authentication completes
   */
  async pollForAccessToken() {
    if (!this.deviceCode) {
      throw new Error('Device flow not started. Call startDeviceFlow() first.')
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      this.pollingTimer = setInterval(async () => {
        try {
          // Check if expired
          if (Date.now() - startTime > this.expiresIn * 1000) {
            this.stopPolling()
            reject(new Error('Device flow expired. Please try again.'))
            return
          }

          const response = await fetch('/api/github/device-token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              device_code: this.deviceCode
            })
          })

          if (!response.ok) {
            console.error('Token polling failed:', response.status)
            return // Continue polling
          }

          const data = await response.json()

          if (data.error) {
            if (data.error === 'authorization_pending') {
              // Continue polling
              return
            } else if (data.error === 'slow_down') {
              // Increase interval
              this.interval += 5000
              return
            } else if (data.error === 'expired_token') {
              this.stopPolling()
              reject(new Error('Device flow expired. Please try again.'))
              return
            } else if (data.error === 'access_denied') {
              this.stopPolling()
              reject(new Error('Access denied by user'))
              return
            } else {
              this.stopPolling()
              reject(new Error(`Token exchange error: ${data.error_description || data.error}`))
              return
            }
          }

          if (data.access_token) {
            this.stopPolling()
            this.accessToken = data.access_token
            this.storeToken(data.access_token)
            
            try {
              await this.fetchUserInfo()
              resolve(this.user)
            } catch (error) {
              reject(new Error(`Failed to fetch user info: ${error.message}`))
            }
          }
        } catch (error) {
          console.error('Polling error:', error)
          // Continue polling on network errors
        }
      }, this.interval)
    })
  }

  /**
   * Stop polling for access token
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  /**
   * Complete device flow authentication
   * @returns {Promise<Object>} User object
   */
  async login() {
    try {
      const deviceInfo = await this.startDeviceFlow()
      return {
        ...deviceInfo,
        pollForToken: () => this.pollForAccessToken()
      }
    } catch (error) {
      throw new Error(`Device flow login failed: ${error.message}`)
    }
  }

  /**
   * Logout and clear authentication
   */
  logout() {
    this.stopPolling()
    this.accessToken = null
    this.user = null
    this.deviceCode = null
    this.userCode = null
    this.verificationUri = null
    this.clearStoredToken()
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
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    // Handle authentication errors
    if (response.status === 401) {
      this.logout()
      throw new Error('Authentication expired. Please log in again.')
    }

    // Handle rate limiting
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
      const resetTime = response.headers.get('X-RateLimit-Reset')
      const resetDate = new Date(parseInt(resetTime) * 1000)
      throw new Error(`Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`)
    }

    return response
  }

  /**
   * Store access token securely
   * @param {string} token - Access token
   */
  storeToken(token) {
    // Use sessionStorage for security - token only persists for browser session
    sessionStorage.setItem('github_device_access_token', token)
  }

  /**
   * Load stored token
   */
  loadStoredToken() {
    const token = sessionStorage.getItem('github_device_access_token')
    if (token) {
      this.accessToken = token
      // Fetch user info to validate token
      this.fetchUserInfo().catch(() => {
        // Token might be expired, clear it
        this.clearStoredToken()
      })
    }
  }

  /**
   * Clear stored token
   */
  clearStoredToken() {
    sessionStorage.removeItem('github_device_access_token')
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
      polling: !!this.pollingTimer
    }
  }
}