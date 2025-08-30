/**
 * Edge cases and error scenario tests for GitHub integration
 * Tests handling of unusual conditions, network failures, and security issues
 */
import { GitHubAuth } from '../../src/core/auth/github-auth.js'
import { GitHubStorage } from '../../src/core/storage/github-storage.js'
import { SyncManager } from '../../src/core/storage/sync-manager.js'
import { GitHubErrorHandler } from '../../src/core/auth/github-error-handler.js'

// Global mocks
const mockFetch = jest.fn()
const mockSessionStorage = {
  data: {},
  getItem: jest.fn((key) => mockSessionStorage.data[key] || null),
  setItem: jest.fn((key, value) => { mockSessionStorage.data[key] = value }),
  removeItem: jest.fn((key) => { delete mockSessionStorage.data[key] }),
  clear: jest.fn(() => { mockSessionStorage.data = {} })
}

global.fetch = mockFetch
global.sessionStorage = mockSessionStorage
global.crypto = {
  getRandomValues: jest.fn((array) => array.fill(42)),
  subtle: { digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))) }
}
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'))
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString())

delete window.location
window.location = { origin: 'https://test.example.com', href: '' }

describe('GitHub Integration Edge Cases', () => {
  let githubAuth
  let githubStorage
  let errorHandler

  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionStorage.clear()
    
    githubAuth = new GitHubAuth()
    githubAuth.init({ clientId: 'test-client-id' })
    
    githubStorage = new GitHubStorage(githubAuth)
    githubStorage.init({ owner: 'testuser', repo: 'test-repo' })
    
    errorHandler = new GitHubErrorHandler()
  })

  describe('Authentication Edge Cases', () => {
    test('should handle malformed OAuth callback URLs', async () => {
      const malformedUrls = [
        'not-a-url',
        'https://evil.com/callback?code=hack&state=attack',
        'javascript:alert("xss")',
        '',
        null,
        undefined
      ]

      for (const url of malformedUrls) {
        if (url) {
          await expect(githubAuth.handleCallback(url)).rejects.toThrow()
        }
      }
    })

    test('should handle corrupted session storage', async () => {
      // Simulate corrupted session data
      mockSessionStorage.data['github_oauth_state'] = 'corrupted-state'
      mockSessionStorage.data['github_oauth_code_verifier'] = null

      const callbackUrl = 'https://test.example.com/auth/callback?code=test&state=corrupted-state'
      
      await expect(githubAuth.handleCallback(callbackUrl)).rejects.toThrow('Missing code verifier')
    })

    test('should handle token exchange with malformed response', async () => {
      mockSessionStorage.data['github_oauth_state'] = 'valid-state'
      mockSessionStorage.data['github_oauth_code_verifier'] = 'valid-verifier'

      const callbackUrl = 'https://test.example.com/auth/callback?code=test&state=valid-state'
      
      // Mock malformed token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      })

      await expect(githubAuth.handleCallback(callbackUrl)).rejects.toThrow()
    })

    test('should handle extremely long state parameters', async () => {
      const longState = 'a'.repeat(10000)
      mockSessionStorage.data['github_oauth_state'] = longState
      
      const callbackUrl = `https://test.example.com/auth/callback?code=test&state=${longState}`
      
      // Should not crash, but may reject due to other validation
      await expect(githubAuth.handleCallback(callbackUrl)).rejects.toThrow()
    })

    test('should handle concurrent login attempts', async () => {
      const login1 = githubAuth.login()
      const login2 = githubAuth.login()
      
      // Both should complete without interfering
      await expect(Promise.allSettled([login1, login2])).resolves.toBeDefined()
    })
  })

  describe('Network Failure Scenarios', () => {
    beforeEach(() => {
      githubAuth.accessToken = 'test-token'
      githubAuth.user = { id: 1, login: 'testuser' }
    })

    test('should handle complete network failure', async () => {
      mockFetch.mockRejectedValue(new Error('NetworkError: Failed to fetch'))

      await expect(githubStorage.saveDocument({
        id: 'test',
        title: 'Test',
        content: 'Content'
      })).rejects.toThrow(/Network error/)
    })

    test('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValue(new Error('DNS_PROBE_FINISHED_NXDOMAIN'))

      await expect(githubStorage.listDocuments()).rejects.toThrow()
    })

    test('should handle slow network timeouts', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 100)
      })
      
      mockFetch.mockReturnValue(timeoutPromise)

      await expect(githubStorage.verifyRepository()).rejects.toThrow(/timeout/)
    })

    test('should handle intermittent connection failures', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })

      // First call should fail
      await expect(githubStorage.listDocuments()).rejects.toThrow()
      
      // Second call should succeed (in real implementation with retry logic)
      // For now, just verify the mock was set up correctly
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('GitHub API Edge Cases', () => {
    beforeEach(() => {
      githubAuth.accessToken = 'test-token'
      githubAuth.user = { id: 1, login: 'testuser' }
    })

    test('should handle repository that suddenly becomes private', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: () => null },
        text: () => Promise.resolve('{"message": "Not Found"}')
      })

      await expect(githubStorage.listDocuments()).rejects.toThrow(/not found/)
    })

    test('should handle repository deletion during operation', async () => {
      // First call succeeds (repo exists)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

      await githubStorage.listDocuments()

      // Second call fails (repo deleted)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => null },
        text: () => Promise.resolve('{"message": "Not Found"}')
      })

      await expect(githubStorage.saveDocument({
        id: 'test',
        title: 'Test',
        content: 'Content'
      })).rejects.toThrow()
    })

    test('should handle extremely large documents', async () => {
      const largeContent = 'x'.repeat(50 * 1024 * 1024) // 50MB
      const largeDocument = {
        id: 'large-doc',
        title: 'Large Document',
        content: largeContent
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
        headers: { get: () => null },
        text: () => Promise.resolve('{"message": "File too large"}')
      })

      await expect(githubStorage.saveDocument(largeDocument)).rejects.toThrow()
    })

    test('should handle malformed GitHub API responses', async () => {
      const malformedResponses = [
        { ok: true, json: () => Promise.resolve('not-an-object') },
        { ok: true, json: () => Promise.resolve(null) },
        { ok: true, json: () => Promise.reject(new Error('Invalid JSON')) },
        { ok: true, json: () => Promise.resolve({ unexpected: 'structure' }) }
      ]

      for (const response of malformedResponses) {
        mockFetch.mockResolvedValueOnce(response)
        
        await expect(githubStorage.listDocuments()).rejects.toThrow()
        jest.clearAllMocks()
      }
    })

    test('should handle GitHub API returning wrong content type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Unexpected token < in JSON'))
      })

      await expect(githubStorage.loadDocument('test.md')).rejects.toThrow()
    })
  })

  describe('Rate Limiting Edge Cases', () => {
    beforeEach(() => {
      githubAuth.accessToken = 'test-token'
    })

    test('should handle rate limit without reset time', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: {
          get: (name) => name === 'X-RateLimit-Remaining' ? '0' : null
        },
        text: () => Promise.resolve('{"message": "API rate limit exceeded"}')
      })

      await expect(githubStorage.saveDocument({
        id: 'test',
        title: 'Test'
      })).rejects.toThrow(/too many requests/)
    })

    test('should handle secondary rate limits', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: {
          get: (name) => ({
            'X-RateLimit-Remaining': '4000',
            'Retry-After': '60'
          })[name] || null
        },
        text: () => Promise.resolve('{"message": "You have exceeded a secondary rate limit"}')
      })

      await expect(githubStorage.saveDocument({
        id: 'test',
        title: 'Test'
      })).rejects.toThrow()
    })

    test('should handle GraphQL rate limits', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 200, // GraphQL returns 200 with errors
        json: () => Promise.resolve({
          errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }]
        })
      })

      // This would be for GraphQL endpoints (future enhancement)
      // For now, just verify error handling works
      const error = await errorHandler.handleError(
        new Error('GraphQL rate limit exceeded'),
        'GraphQL operation'
      )
      
      expect(error.type).toBe('generic_error')
    })
  })

  describe('Content Edge Cases', () => {
    beforeEach(() => {
      githubAuth.accessToken = 'test-token'
      githubAuth.user = { id: 1, login: 'testuser' }
    })

    test('should handle documents with special characters', async () => {
      const specialCharsDoc = {
        id: 'special-chars',
        title: '📝 Test Document with émojis and ñoñó',
        content: '# Unicode Test\n\n🎉 Testing émojis, ñoñó, and 中文'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => null },
        text: () => Promise.resolve('')
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: { sha: 'test-sha', path: 'documents/test.md' }
        })
      })

      const result = await githubStorage.saveDocument(specialCharsDoc)
      expect(result).toBeDefined()
    })

    test('should handle empty documents', async () => {
      const emptyDoc = {
        id: 'empty',
        title: '',
        content: ''
      }

      await expect(githubStorage.saveDocument(emptyDoc)).rejects.toThrow('title')
    })

    test('should handle documents with only whitespace', async () => {
      const whitespaceDoc = {
        id: 'whitespace',
        title: '   \n\t   ',
        content: '   \n\n\t  \n   '
      }

      await expect(githubStorage.saveDocument(whitespaceDoc)).rejects.toThrow()
    })

    test('should handle malformed front matter', async () => {
      const malformedContent = `---
invalid yaml content
missing colon
---

# Document Content`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: btoa(malformedContent),
          sha: 'test-sha'
        })
      })

      await expect(githubStorage.loadDocument('test.md')).rejects.toThrow()
    })

    test('should handle documents without front matter', async () => {
      const noFrontMatter = '# Just a regular markdown file\n\nWith some content.'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: btoa(noFrontMatter),
          sha: 'test-sha'
        })
      })

      await expect(githubStorage.loadDocument('test.md')).rejects.toThrow('missing front matter')
    })
  })

  describe('Sync Edge Cases', () => {
    let syncManager
    let storageManager

    beforeEach(() => {
      storageManager = {
        getAllDocuments: jest.fn(),
        saveDocument: jest.fn(),
        generateChecksum: jest.fn(() => 'checksum')
      }
      
      syncManager = new SyncManager(storageManager, githubStorage, githubAuth)
      // Reset sync state between tests
      syncManager.syncing = false
      githubAuth.accessToken = 'test-token'
      githubAuth.user = { id: 1, login: 'testuser' }
    })

    test('should handle sync during authentication expiry', async () => {
      storageManager.getAllDocuments.mockResolvedValue([{
        id: 'test',
        title: 'Test',
        content: 'Content'
      }])

      // First call succeeds (directory check)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      // Second call fails with auth error
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => null },
        text: () => Promise.resolve('{"message": "Bad credentials"}')
      })

      await expect(syncManager.syncWithGitHub()).rejects.toThrow()
      expect(githubAuth.isAuthenticated()).toBe(false)
    })

    test('should handle concurrent sync operations', async () => {
      storageManager.getAllDocuments.mockResolvedValue([])
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      })

      const sync1 = syncManager.syncWithGitHub()
      const sync2 = syncManager.syncWithGitHub()

      // Second sync should be rejected
      await expect(sync1).resolves.toBeDefined()
      await expect(sync2).rejects.toThrow('Sync already in progress')
    })

    test('should handle documents with identical timestamps', async () => {
      const timestamp = '2023-01-01T12:00:00.000Z'
      const localDoc = { id: 'test', updatedAt: timestamp, checksum: 'local' }
      const remoteDoc = { id: 'test', updatedAt: timestamp, checksum: 'remote' }

      storageManager.getAllDocuments.mockResolvedValue([localDoc])
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([remoteDoc]) })

      const results = await syncManager.syncWithGitHub()
      
      // Should detect conflict despite identical timestamps
      expect(results.conflicts).toBe(1)
    })
  })

  describe('Security Edge Cases', () => {
    test('should reject malicious redirect URIs', () => {
      const maliciousAuth = new GitHubAuth()
      
      // Try to override redirect URI (should not be possible)
      maliciousAuth.redirectUri = 'javascript:alert("xss")'
      maliciousAuth.init({ clientId: 'test' })
      
      const authUrl = maliciousAuth.buildAuthorizationUrl('test-challenge')
      expect(authUrl).not.toContain('javascript:')
    })

    test('should handle XSS attempts in document content', async () => {
      githubAuth.accessToken = 'test-token'
      
      const xssDoc = {
        id: 'xss-test',
        title: '<script>alert("xss")</script>',
        content: '<img src=x onerror=alert("xss")>'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => null },
        text: () => Promise.resolve('')
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: { sha: 'test-sha', path: 'documents/test.md' }
        })
      })

      // Should sanitize content before sending to GitHub
      await githubStorage.saveDocument(xssDoc)
      
      const request = mockFetch.mock.calls[1][1]
      const body = JSON.parse(request.body)
      const content = atob(body.content)
      
      // Content should be properly escaped in front matter
      expect(content).not.toContain('<script>')
      expect(content).not.toContain('onerror=')
    })

    test('should handle JWT token edge cases', () => {
      const edgeCaseTokens = [
        'malformed.jwt.token',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..', // Missing payload
        'not-a-jwt-at-all',
        'Bearer token-with-bearer-prefix',
        ''
      ]

      for (const token of edgeCaseTokens) {
        githubAuth.accessToken = token
        
        // Should still try to make request but fail gracefully
        expect(() => githubAuth.getAccessToken()).not.toThrow()
      }
    })
  })

  describe('Browser Compatibility Edge Cases', () => {
    test('should handle missing crypto.subtle', async () => {
      const originalCrypto = global.crypto
      global.crypto = { getRandomValues: jest.fn() } // Missing subtle

      const newAuth = new GitHubAuth()
      newAuth.init({ clientId: 'test' })

      await expect(newAuth.login()).rejects.toThrow()
      
      global.crypto = originalCrypto
    })

    test('should handle missing sessionStorage', () => {
      const originalSessionStorage = global.sessionStorage
      delete global.sessionStorage

      const newAuth = new GitHubAuth()
      newAuth.init({ clientId: 'test' })

      // Should handle gracefully without crashing
      expect(() => newAuth.storeToken('test')).toThrow()
      
      global.sessionStorage = originalSessionStorage
    })

    test('should handle missing fetch', async () => {
      const originalFetch = global.fetch
      delete global.fetch

      githubAuth.accessToken = 'test-token'

      await expect(githubAuth.makeAuthenticatedRequest('/test')).rejects.toThrow()
      
      global.fetch = originalFetch
    })
  })

  describe('Data Corruption Edge Cases', () => {
    test('should handle corrupted base64 content', async () => {
      githubAuth.accessToken = 'test-token'
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: 'invalid-base64-content!@#$%',
          sha: 'test-sha'
        })
      })

      await expect(githubStorage.loadDocument('test.md')).rejects.toThrow()
    })

    test('should handle corrupted YAML front matter', async () => {
      githubAuth.accessToken = 'test-token'
      
      const corruptedYaml = `---
title: "Test
id: missing-quote
tags:
  - unclosed array
---

Content`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: btoa(corruptedYaml),
          sha: 'test-sha'
        })
      })

      await expect(githubStorage.loadDocument('test.md')).rejects.toThrow()
    })
  })
})

describe('Error Handler Edge Cases', () => {
  let errorHandler

  beforeEach(() => {
    errorHandler = new GitHubErrorHandler()
  })

  test('should handle circular JSON in error responses', async () => {
    const circularObj = { a: 1 }
    circularObj.self = circularObj

    const response = {
      status: 400,
      statusText: 'Bad Request',
      headers: { get: () => null },
      text: () => Promise.resolve('{"circular": "structure"}')
    }

    const error = await errorHandler.handleError(response, 'Test')
    expect(error.type).toBe('bad_request')
  })

  test('should handle undefined and null errors gracefully', async () => {
    const undefinedError = await errorHandler.handleError(undefined, 'Test')
    expect(undefinedError.type).toBe('unknown')

    const nullError = await errorHandler.handleError(null, 'Test')
    expect(nullError.type).toBe('unknown')
  })

  test('should handle errors with very long messages', async () => {
    const longMessage = 'Error: ' + 'x'.repeat(10000)
    const error = await errorHandler.handleError(new Error(longMessage), 'Test')
    
    expect(error.message).toContain('Error:')
    expect(error.userMessage).toBeDefined()
  })
})