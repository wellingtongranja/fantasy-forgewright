// Mock GitHubAuth for testing
export class GitHubAuth {
  constructor() {
    this.isAuthenticated = false
    this.accessToken = null
    this.user = null
    this.redirectUri = 'https://fantasy.forgewright.io/'
  }

  async login() {
    // Mock login
    window.location.href = 'https://github.com/login/oauth/authorize'
  }

  async logout() {
    this.isAuthenticated = false
    this.accessToken = null
    this.user = null
    sessionStorage.clear()
  }

  async handleCallback(code) {
    if (code) {
      this.isAuthenticated = true
      this.accessToken = 'mock_token_' + code
      return true
    }
    return false
  }

  async fetchUser() {
    if (this.isAuthenticated) {
      this.user = {
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png'
      }
      return this.user
    }
    return null
  }

  isLoggedIn() {
    return this.isAuthenticated
  }

  getAccessToken() {
    return this.accessToken
  }

  getUser() {
    return this.user
  }
}