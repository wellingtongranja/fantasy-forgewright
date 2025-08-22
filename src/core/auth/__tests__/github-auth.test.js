/**
 * Tests for GitHubAuth class
 */
import { GitHubAuth } from '../github-auth.js'

// Mock sessionStorage
const mockSessionStorage = {
  data: {},
  getItem: jest.fn((key) => mockSessionStorage.data[key] || null),
  setItem: jest.fn((key, value) => {
    mockSessionStorage.data[key] = value
  }),
  removeItem: jest.fn((key) => {
    delete mockSessionStorage.data[key]
  }),
  clear: jest.fn(() => {
    mockSessionStorage.data = {}
  })
}

// Mock crypto.subtle
const mockCrypto = {
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
  subtle: {
    digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
  }
}

// Mock fetch
const mockFetch = jest.fn()

// Setup global mocks
global.sessionStorage = mockSessionStorage
global.crypto = mockCrypto
global.fetch = mockFetch
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'))
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString())

// Mock window.location
delete window.location
window.location = { origin: 'https://test.example.com', href: '' }

describe('GitHubAuth', () => {
  let githubAuth

  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionStorage.clear()
    githubAuth = new GitHubAuth()
  })

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(githubAuth.isAuthenticated()).toBe(false)
      expect(githubAuth.getCurrentUser()).toBeNull()
      expect(githubAuth.getAccessToken()).toBeNull()
      expect(githubAuth.initialized).toBe(false)
    })

    test('should initialize with client configuration', () => {
      const config = { clientId: 'test-client-id' }
      githubAuth.init(config)

      expect(githubAuth.clientId).toBe('test-client-id')
      expect(githubAuth.initialized).toBe(true)
    })

    test('should throw error if clientId is missing', () => {
      expect(() => githubAuth.init({})).toThrow('GitHub OAuth client ID is required')
    })
  })

  describe('Authentication Status', () => {
    beforeEach(() => {
      githubAuth.init({ clientId: 'test-client-id' })
    })

    test('should return false when not authenticated', () => {
      expect(githubAuth.isAuthenticated()).toBe(false)
    })

    test('should return true when authenticated', () => {
      githubAuth.accessToken = 'test-token'
      githubAuth.user = { id: 1, login: 'testuser' }

      expect(githubAuth.isAuthenticated()).toBe(true)
    })

    test('should return status object', () => {
      githubAuth.accessToken = 'test-token'
      githubAuth.user = { id: 1, login: 'testuser' }

      const status = githubAuth.getStatus()
      expect(status).toEqual({
        authenticated: true,
        user: { id: 1, login: 'testuser' },
        clientId: 'test-client-id',
        initialized: true,
        rateLimitStatus: expect.any(Object)
      })
    })
  })

  describe('PKCE Generation', () => {
    test('should generate code verifier', () => {
      const verifier = githubAuth.generateCodeVerifier()
      
      expect(typeof verifier).toBe('string')
      expect(verifier.length).toBeGreaterThan(0)
      expect(mockCrypto.getRandomValues).toHaveBeenCalled()
    })

    test('should generate code challenge', async () => {
      const verifier = 'test-verifier'
      const challenge = await githubAuth.generateCodeChallenge(verifier)
      
      expect(typeof challenge).toBe('string')
      expect(challenge.length).toBeGreaterThan(0)
      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array))
    })

    test('should generate state parameter', () => {
      const state = githubAuth.generateState()
      
      expect(typeof state).toBe('string')
      expect(state.length).toBeGreaterThan(0)
      expect(mockCrypto.getRandomValues).toHaveBeenCalled()
    })
  })

  describe('OAuth Flow', () => {
    beforeEach(() => {
      githubAuth.init({ clientId: 'test-client-id' })
    })

    test('should build authorization URL correctly', () => {
      const codeChallenge = 'test-challenge'
      githubAuth.state = 'test-state'
      
      const url = githubAuth.buildAuthorizationUrl(codeChallenge)
      
      expect(url).toContain('https://github.com/login/oauth/authorize')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('code_challenge=test-challenge')
      expect(url).toContain('state=test-state')
      expect(url).toContain('code_challenge_method=S256')
    })

    test('should start login flow', async () => {
      const originalLocation = window.location.href

      await githubAuth.login()

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('github_oauth_state', expect.any(String))
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('github_oauth_code_verifier', expect.any(String))
    })

    test('should throw error if not initialized', async () => {
      const uninitialized = new GitHubAuth()
      
      await expect(uninitialized.login()).rejects.toThrow('GitHubAuth not initialized')
    })
  })

  describe('Callback Handling', () => {
    beforeEach(() => {
      githubAuth.init({ clientId: 'test-client-id' })
      
      // Mock stored state and verifier
      mockSessionStorage.data['github_oauth_state'] = 'test-state'
      mockSessionStorage.data['github_oauth_code_verifier'] = 'test-verifier'
    })

    test('should handle successful callback', async () => {
      const callbackUrl = 'https://test.example.com/auth/callback?code=test-code&state=test-state'
      
      // Mock token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'test-token' })
      })
      
      // Mock user fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, login: 'testuser', name: 'Test User' })
      })

      const user = await githubAuth.handleCallback(callbackUrl)

      expect(user).toEqual({ id: 1, login: 'testuser', name: 'Test User' })
      expect(githubAuth.accessToken).toBe('test-token')
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('github_oauth_state')
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('github_oauth_code_verifier')
    })

    test('should handle callback with error', async () => {
      const callbackUrl = 'https://test.example.com/auth/callback?error=access_denied'

      await expect(githubAuth.handleCallback(callbackUrl)).rejects.toThrow('OAuth error: access_denied')
    })

    test('should handle callback with invalid state', async () => {
      const callbackUrl = 'https://test.example.com/auth/callback?code=test-code&state=invalid-state'

      await expect(githubAuth.handleCallback(callbackUrl)).rejects.toThrow('Invalid state parameter')
    })

    test('should handle missing parameters', async () => {
      const callbackUrl = 'https://test.example.com/auth/callback'

      await expect(githubAuth.handleCallback(callbackUrl)).rejects.toThrow('Missing authorization code or state parameter')
    })
  })

  describe('Token Management', () => {
    beforeEach(() => {
      githubAuth.init({ clientId: 'test-client-id' })
    })

    test('should store token securely', () => {
      githubAuth.storeToken('test-token')
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('github_access_token', 'test-token')
    })

    test('should load stored token', () => {
      mockSessionStorage.data['github_access_token'] = 'stored-token'
      
      // Mock user fetch to fail (simulating expired token)
      mockFetch.mockRejectedValueOnce(new Error('Unauthorized'))
      
      githubAuth.loadStoredToken()
      
      expect(githubAuth.accessToken).toBe('stored-token')
    })

    test('should clear stored token', () => {
      githubAuth.clearStoredToken()
      
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('github_access_token')
    })
  })

  describe('Logout', () => {
    beforeEach(() => {
      githubAuth.init({ clientId: 'test-client-id' })
      githubAuth.accessToken = 'test-token'
      githubAuth.user = { id: 1, login: 'testuser' }
    })

    test('should clear authentication data', () => {
      githubAuth.logout()

      expect(githubAuth.accessToken).toBeNull()
      expect(githubAuth.user).toBeNull()
      expect(githubAuth.isAuthenticated()).toBe(false)
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('github_access_token')
    })
  })

  describe('API Requests', () => {
    beforeEach(() => {
      githubAuth.init({ clientId: 'test-client-id' })
      githubAuth.accessToken = 'test-token'
    })

    test('should make authenticated request successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name) => {
            const headers = {
              'X-RateLimit-Remaining': '4999',
              'X-RateLimit-Reset': '1234567890',
              'X-RateLimit-Limit': '5000'
            }
            return headers[name] || null
          }
        }
      })

      const response = await githubAuth.makeAuthenticatedRequest('/user')

      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          'Authorization': 'Bearer test-token',
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      expect(response.ok).toBe(true)
    })

    test('should handle authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: () => null },
        text: () => Promise.resolve('{"message": "Bad credentials"}')
      })

      await expect(githubAuth.makeAuthenticatedRequest('/user')).rejects.toThrow()
      expect(githubAuth.accessToken).toBeNull() // Should log out
    })

    test('should throw error when not authenticated', async () => {
      githubAuth.accessToken = null

      await expect(githubAuth.makeAuthenticatedRequest('/user')).rejects.toThrow('Not authenticated')
    })

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(githubAuth.makeAuthenticatedRequest('/user')).rejects.toThrow()
    })
  })

  describe('Base64 URL Encoding', () => {
    test('should encode buffer correctly', () => {
      const buffer = new Uint8Array([1, 2, 3, 4])
      const encoded = githubAuth.base64URLEncode(buffer)
      
      expect(typeof encoded).toBe('string')
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
      expect(encoded).not.toContain('=')
    })
  })

  describe('Session Cleanup', () => {
    test('should clean up OAuth session data', () => {
      githubAuth.cleanupOAuthSession()

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('github_oauth_state')
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('github_oauth_code_verifier')
    })
  })
})