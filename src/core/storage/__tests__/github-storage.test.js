/**
 * Tests for GitHubStorage class - Repository Already Exists scenario
 */
import { GitHubStorage } from '../github-storage.js'

// Mock localStorage
const mockLocalStorage = {
  data: {},
  getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.data[key] = value
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.data[key]
  }),
  clear: jest.fn(() => {
    mockLocalStorage.data = {}
  })
}

global.localStorage = mockLocalStorage
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'))
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString())

describe('GitHubStorage - Repository Already Exists', () => {
  let githubStorage
  let mockAuth

  beforeEach(() => {
    // Reset mocks
    mockLocalStorage.data = {}
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()

    // Mock GitHub auth
    mockAuth = {
      isAuthenticated: jest.fn(() => true),
      makeAuthenticatedRequest: jest.fn()
    }

    githubStorage = new GitHubStorage(mockAuth)
  })

  describe('createDefaultRepository', () => {
    it('should configure existing repository when creation returns "already exists" error', async () => {
      const username = 'testuser'
      
      // Mock initial repository check failure (404)
      mockAuth.makeAuthenticatedRequest
        .mockRejectedValueOnce(new Error('Repository not found')) // First call fails (repo check)
        .mockRejectedValueOnce(new Error('API request failed: GitHub API error: 422 - {"message":"Repository creation failed.","errors":[{"resource":"Repository","code":"custom","field":"name","message":"name already exists on this account"}]}')) // Second call fails with "already exists"

      // Mock ensureDocumentsDirectory to succeed
      githubStorage.ensureDocumentsDirectory = jest.fn().mockResolvedValue()

      const result = await githubStorage.createDefaultRepository(username)

      expect(result).toBe(true)
      expect(githubStorage.getConfig()).toEqual({
        owner: 'testuser',
        repo: 'fantasy-editor',
        branch: 'main',
        documentsPath: 'documents',
        configured: true
      })
      expect(githubStorage.ensureDocumentsDirectory).toHaveBeenCalled()
    })

    it('should handle when repository exists but ensureDocumentsDirectory fails', async () => {
      const username = 'testuser'
      
      // Mock repository creation failure with "already exists"
      mockAuth.makeAuthenticatedRequest
        .mockRejectedValueOnce(new Error('Repository not found')) // First call fails (repo check)
        .mockRejectedValueOnce(new Error('API request failed: GitHub API error: 422 - {"message":"Repository creation failed.","errors":[{"resource":"Repository","code":"custom","field":"name","message":"name already exists on this account"}]}'))

      // Mock ensureDocumentsDirectory to fail (but should be handled silently)
      githubStorage.ensureDocumentsDirectory = jest.fn().mockRejectedValue(new Error('Permission denied'))

      const result = await githubStorage.createDefaultRepository(username)

      expect(result).toBe(true)
      expect(githubStorage.getConfig().configured).toBe(true)
      expect(githubStorage.ensureDocumentsDirectory).toHaveBeenCalled()
    })

    it('should return false for non-"already exists" API errors', async () => {
      const username = 'testuser'
      const otherError = new Error('API request failed: GitHub API error: 403 - {"message":"Forbidden"}')
      
      // Spy on console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      mockAuth.makeAuthenticatedRequest
        .mockRejectedValueOnce(new Error('Repository not found')) // First call fails (repo check)
        .mockRejectedValueOnce(otherError) // Second call fails with different error

      const result = await githubStorage.createDefaultRepository(username)
      
      expect(result).toBe(false)
      // Repository should not be configured (no owner/repo set) - owner/repo remain null from constructor
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create default repository:', otherError)
      
      consoleSpy.mockRestore()
    })

    it('should create repository README when creating new repository', async () => {
      const username = 'testuser'
      
      // Mock successful repository creation
      mockAuth.makeAuthenticatedRequest
        .mockRejectedValueOnce(new Error('Repository not found')) // First call fails (repo check)
        .mockResolvedValueOnce({ name: 'fantasy-editor', default_branch: 'main' }) // Create repo succeeds
        .mockResolvedValueOnce({ ok: true }) // createRepositoryReadme succeeds
        .mockResolvedValueOnce({ ok: true }) // ensureDocumentsDirectory succeeds

      // Mock the new methods
      githubStorage.createRepositoryReadme = jest.fn().mockResolvedValue()
      githubStorage.ensureDocumentsDirectory = jest.fn().mockResolvedValue()

      const result = await githubStorage.createDefaultRepository(username)

      expect(result).toBe(true)
      expect(githubStorage.createRepositoryReadme).toHaveBeenCalled()
      expect(githubStorage.ensureDocumentsDirectory).toHaveBeenCalled()
    })
  })

  describe('getFileInfo and saveDocument SHA handling', () => {
    it('should properly handle 404 errors in getFileInfo', async () => {
      const filepath = 'documents/test-doc.md'
      
      // Configure repository first
      githubStorage.updateConfig({ owner: 'testuser', repo: 'test-repo', branch: 'main' })
      
      // Mock 404 response
      const mockResponse = { ok: false, status: 404, statusText: 'Not Found' }
      mockAuth.makeAuthenticatedRequest.mockResolvedValue(mockResponse)
      
      const result = await githubStorage.getFileInfo(filepath)
      
      expect(result).toBe(null)
      expect(mockAuth.makeAuthenticatedRequest).toHaveBeenCalledWith(
        '/repos/testuser/test-repo/contents/documents/test-doc.md',
        { headers: { Accept: 'application/vnd.github.v3.object' } }
      )
    })

    it('should throw error for non-404 HTTP errors in getFileInfo', async () => {
      const filepath = 'documents/test-doc.md'
      
      // Mock 403 response (permission denied)
      const mockResponse = { ok: false, status: 403, statusText: 'Forbidden' }
      mockAuth.makeAuthenticatedRequest.mockResolvedValue(mockResponse)
      
      await expect(githubStorage.getFileInfo(filepath)).rejects.toThrow('GitHub API error: 403 - Forbidden')
    })

    it('should handle network errors in getFileInfo', async () => {
      const filepath = 'documents/test-doc.md'
      
      // Mock network error
      mockAuth.makeAuthenticatedRequest.mockRejectedValue(new Error('Network error'))
      
      await expect(githubStorage.getFileInfo(filepath)).rejects.toThrow('Network error')
    })

    it('should handle saveDocument when getFileInfo fails', async () => {
      const testDocument = {
        id: 'test-id',
        title: 'Test Document',
        content: 'Test content'
      }
      
      githubStorage.updateConfig({ owner: 'testuser', repo: 'test-repo', branch: 'main' })
      
      // Mock getFileInfo to throw an error (simulating API failure)
      mockAuth.makeAuthenticatedRequest.mockRejectedValue(new Error('Rate limit exceeded'))
      
      await expect(githubStorage.saveDocument(testDocument)).rejects.toThrow('Failed to verify file existence: Rate limit exceeded')
    })
  })
})