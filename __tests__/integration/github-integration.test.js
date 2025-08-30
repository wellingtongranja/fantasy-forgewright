/**
 * Integration tests for GitHub OAuth and sync functionality
 * Tests the complete flow from authentication to document synchronization
 */
import { GitHubAuth } from '../../src/core/auth/github-auth.js'
import { GitHubStorage } from '../../src/core/storage/github-storage.js'
import { SyncManager } from '../../src/core/storage/sync-manager.js'
import { StorageManager } from '../../src/core/storage/storage-manager.js'

// Mock implementations for integration testing
const mockFetch = jest.fn()
const mockSessionStorage = {
  data: {},
  getItem: jest.fn((key) => mockSessionStorage.data[key] || null),
  setItem: jest.fn((key, value) => { mockSessionStorage.data[key] = value }),
  removeItem: jest.fn((key) => { delete mockSessionStorage.data[key] }),
  clear: jest.fn(() => { mockSessionStorage.data = {} })
}

const mockLocalStorage = {
  data: {},
  getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key, value) => { mockLocalStorage.data[key] = value }),
  removeItem: jest.fn((key) => { delete mockLocalStorage.data[key] })
}

const mockIndexedDB = {
  databases: {},
  open: jest.fn((name, version) => {
    return {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            put: jest.fn(() => ({ onsuccess: null, onerror: null })),
            get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
            getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
            delete: jest.fn(() => ({ onsuccess: null, onerror: null }))
          })),
          oncomplete: null,
          onerror: null
        })),
        createObjectStore: jest.fn(() => ({
          createIndex: jest.fn()
        })),
        objectStoreNames: { contains: jest.fn(() => false) }
      }
    }
  })
}

// Global mocks setup
global.fetch = mockFetch
global.sessionStorage = mockSessionStorage
global.localStorage = mockLocalStorage
global.indexedDB = mockIndexedDB
global.crypto = {
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
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'))
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString())

// Mock window.location
delete window.location
window.location = { origin: 'https://test.example.com', href: '' }

describe('GitHub Integration Tests', () => {
  let githubAuth
  let githubStorage
  let storageManager
  let syncManager

  const mockUser = {
    id: 12345,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com'
  }

  const mockDocument = {
    id: 'test-doc-id-123',
    title: 'Test Document',
    content: '# Test Document\n\nThis is a test document.',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T12:00:00.000Z',
    tags: ['test', 'integration'],
    checksum: 'abc123'
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockSessionStorage.clear()
    mockLocalStorage.data = {}

    // Initialize components
    githubAuth = new GitHubAuth()
    githubAuth.init({ clientId: 'test-client-id' })

    storageManager = new StorageManager()
    githubStorage = new GitHubStorage(githubAuth)
    githubStorage.init({
      owner: 'testuser',
      repo: 'test-repo',
      branch: 'main'
    })

    syncManager = new SyncManager(storageManager, githubStorage, githubAuth)
    syncManager.init()
  })

  describe('Complete OAuth Flow', () => {
    test('should complete full OAuth authentication flow', async () => {
      // Step 1: Start login flow
      const loginPromise = githubAuth.login()
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'github_oauth_state', 
        expect.any(String)
      )
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'github_oauth_code_verifier', 
        expect.any(String)
      )

      // Step 2: Simulate callback handling
      const callbackUrl = 'https://test.example.com/auth/callback?code=test-auth-code&state=' + 
                          mockSessionStorage.data['github_oauth_state']

      // Mock token exchange response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          access_token: 'test-access-token',
          token_type: 'bearer',
          scope: 'repo user'
        })
      })

      // Mock user info response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser)
      })

      const user = await githubAuth.handleCallback(callbackUrl)

      expect(user).toEqual(mockUser)
      expect(githubAuth.isAuthenticated()).toBe(true)
      expect(githubAuth.getCurrentUser()).toEqual(mockUser)
      expect(githubAuth.getAccessToken()).toBe('test-access-token')
    })

    test('should handle OAuth error scenarios', async () => {
      const errorCallbackUrl = 'https://test.example.com/auth/callback?error=access_denied&error_description=User+denied+access'

      await expect(githubAuth.handleCallback(errorCallbackUrl))
        .rejects.toThrow('OAuth error: access_denied')
    })

    test('should handle invalid state parameter', async () => {
      mockSessionStorage.data['github_oauth_state'] = 'valid-state'
      const callbackUrl = 'https://test.example.com/auth/callback?code=test-code&state=invalid-state'

      await expect(githubAuth.handleCallback(callbackUrl))
        .rejects.toThrow('Invalid state parameter')
    })
  })

  describe('Document Storage Integration', () => {
    beforeEach(() => {
      // Set up authenticated state
      githubAuth.accessToken = 'test-access-token'
      githubAuth.user = mockUser
    })

    test('should save document to GitHub', async () => {
      // Mock GitHub API responses
      mockFetch
        // Check if file exists (404 = doesn't exist)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: { get: () => null },
          text: () => Promise.resolve('')
        })
        // Create file
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: { 
              sha: 'new-file-sha',
              path: 'documents/test-doc-id-123-test-document.md'
            },
            commit: { sha: 'commit-sha' }
          })
        })

      const result = await githubStorage.saveDocument(mockDocument)

      expect(result.document.githubSha).toBe('new-file-sha')
      expect(result.document.githubPath).toBe('documents/test-doc-id-123-test-document.md')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('should load document from GitHub', async () => {
      const githubContent = `---
id: "test-doc-id-123"
title: "Test Document"
created: "2023-01-01T00:00:00.000Z"
updated: "2023-01-01T12:00:00.000Z"
tags:
  - test
  - integration
checksum: "abc123"
---

# Test Document

This is a test document.`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: btoa(githubContent),
          sha: 'file-sha'
        })
      })

      const document = await githubStorage.loadDocument('documents/test-document.md')

      expect(document.id).toBe('test-doc-id-123')
      expect(document.title).toBe('Test Document')
      expect(document.content).toBe('# Test Document\n\nThis is a test document.')
      expect(document.githubSha).toBe('file-sha')
    })

    test('should list documents from GitHub repository', async () => {
      mockFetch
        // List directory contents
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            {
              type: 'file',
              name: 'doc1.md',
              path: 'documents/doc1.md',
              sha: 'sha1',
              size: 100
            },
            {
              type: 'file',
              name: 'doc2.md',
              path: 'documents/doc2.md',
              sha: 'sha2',
              size: 200
            }
          ])
        })
        // Load first document
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: btoa(`---
id: "doc1"
title: "Document 1"
created: "2023-01-01T00:00:00.000Z"
updated: "2023-01-01T12:00:00.000Z"
tags: []
checksum: "hash1"
---

Content 1`),
            sha: 'sha1'
          })
        })
        // Load second document
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: btoa(`---
id: "doc2"
title: "Document 2"
created: "2023-01-02T00:00:00.000Z"
updated: "2023-01-02T12:00:00.000Z"
tags: []
checksum: "hash2"
---

Content 2`),
            sha: 'sha2'
          })
        })

      const documents = await githubStorage.listDocuments()

      expect(documents).toHaveLength(2)
      expect(documents[0].title).toBe('Document 2') // Should be sorted by updated date (newest first)
      expect(documents[1].title).toBe('Document 1')
    })
  })

  describe('Sync Manager Integration', () => {
    beforeEach(() => {
      githubAuth.accessToken = 'test-access-token'
      githubAuth.user = mockUser
    })

    test('should perform bidirectional sync', async () => {
      // Mock local storage to return documents
      const mockTransaction = {
        objectStore: jest.fn(() => ({
          getAll: jest.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: [mockDocument]
          }))
        })),
        oncomplete: null,
        onerror: null
      }

      mockIndexedDB.open.mockReturnValue({
        onsuccess: null,
        onerror: null,
        result: {
          transaction: jest.fn(() => mockTransaction)
        }
      })

      // Mock GitHub API calls
      mockFetch
        // Ensure documents directory exists
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        // List GitHub documents (empty)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        // Upload document to GitHub
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: { 
              sha: 'upload-sha',
              path: 'documents/test-doc-id-123-test-document.md'
            }
          })
        })

      const results = await syncManager.syncWithGitHub()

      expect(results.uploaded).toBe(1)
      expect(results.downloaded).toBe(0)
      expect(results.conflicts).toBe(0)
      expect(results.errors).toBe(0)
    })

    test('should handle sync conflicts', async () => {
      const localDoc = {
        ...mockDocument,
        updatedAt: '2023-01-01T14:00:00.000Z',
        checksum: 'local-checksum'
      }

      const remoteDoc = {
        ...mockDocument,
        updatedAt: '2023-01-01T13:00:00.000Z',
        checksum: 'remote-checksum',
        githubPath: 'documents/test-doc.md'
      }

      // Mock local storage
      const mockTransaction = {
        objectStore: jest.fn(() => ({
          getAll: jest.fn(() => ({
            onsuccess: null,
            result: [localDoc]
          }))
        })),
        oncomplete: null
      }

      mockIndexedDB.open.mockReturnValue({
        onsuccess: null,
        result: {
          transaction: jest.fn(() => mockTransaction)
        }
      })

      // Mock GitHub responses
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // Ensure directory
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([remoteDoc]) }) // List docs

      const results = await syncManager.syncWithGitHub()

      expect(results.conflicts).toBe(1)
      expect(syncManager.getPendingConflicts()).toHaveLength(1)
    })

    test('should resolve conflicts', async () => {
      const conflict = {
        local: mockDocument,
        remote: { ...mockDocument, content: 'Different content' },
        type: 'content'
      }

      syncManager.conflictQueue = [conflict]

      // Mock conflict resolution
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: { sha: 'resolved-sha' }
        })
      })

      const conflictId = syncManager.generateConflictId(conflict)
      await syncManager.resolveConflict(conflictId, 'local')

      expect(syncManager.getPendingConflicts()).toHaveLength(0)
    })
  })

  describe('Error Handling Integration', () => {
    beforeEach(() => {
      githubAuth.accessToken = 'test-access-token'
      githubAuth.user = mockUser
    })

    test('should handle authentication errors during sync', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: () => null },
        text: () => Promise.resolve('{"message": "Bad credentials"}')
      })

      await expect(githubStorage.saveDocument(mockDocument))
        .rejects.toThrow()

      // Should automatically log out on auth error
      expect(githubAuth.isAuthenticated()).toBe(false)
    })

    test('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (name) => ({
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 3600,
            'X-RateLimit-Limit': '5000'
          })[name] || null
        },
        text: () => Promise.resolve('{"message": "API rate limit exceeded"}')
      })

      await expect(githubStorage.saveDocument(mockDocument))
        .rejects.toThrow(/too many requests/)
    })

    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(githubStorage.saveDocument(mockDocument))
        .rejects.toThrow(/Network error/)
    })
  })

  describe('Command Integration', () => {
    test('should integrate with command system', async () => {
      // This would test the GitHub commands integration
      // For now, we'll test that the commands can access the GitHub components
      
      expect(githubAuth.isAuthenticated()).toBe(false)
      expect(githubStorage.isConfigured()).toBe(true)
      expect(syncManager.getSyncStatus().configured).toBe(true)
    })
  })

  describe('Token Persistence', () => {
    test('should persist token across sessions', () => {
      githubAuth.storeToken('persistent-token')
      
      expect(mockSessionStorage.setItem)
        .toHaveBeenCalledWith('github_access_token', 'persistent-token')

      // Simulate new instance loading stored token
      const newAuth = new GitHubAuth()
      newAuth.init({ clientId: 'test-client-id' })
      
      mockSessionStorage.data['github_access_token'] = 'persistent-token'
      mockFetch.mockRejectedValueOnce(new Error('Token validation failed'))
      
      newAuth.loadStoredToken()
      
      expect(newAuth.getAccessToken()).toBe('persistent-token')
    })

    test('should clear token on logout', () => {
      githubAuth.accessToken = 'test-token'
      githubAuth.user = mockUser
      
      githubAuth.logout()
      
      expect(githubAuth.isAuthenticated()).toBe(false)
      expect(mockSessionStorage.removeItem)
        .toHaveBeenCalledWith('github_access_token')
    })
  })
})