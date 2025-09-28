/**
 * @jest-environment jsdom
 */

describe('GitHub Storage - README.md Exclusion', () => {
  let mockAuthManager, mockGithubStorage

  beforeEach(() => {
    // Mock auth manager
    mockAuthManager = {
      makeAuthenticatedRequest: jest.fn()
    }

    // Mock github storage configuration
    const mockConfig = {
      owner: 'testuser',
      repo: 'testrepo',
      documentsPath: 'documents',
      configured: true
    }

    // Import and create GitHub storage instance
    const { GitHubStorage } = require('../../src/core/storage/github-storage.js')
    mockGithubStorage = new GitHubStorage(mockConfig)
    mockGithubStorage.auth = mockAuthManager

    // Mock isConfigured to return true
    mockGithubStorage.isConfigured = jest.fn().mockReturnValue(true)
  })

  test('should exclude README.md from document listing', async () => {
    // Arrange - Mock repository files including README.md
    const mockFiles = [
      {
        type: 'file',
        name: 'README.md',
        path: 'documents/README.md',
        sha: 'readme123'
      },
      {
        type: 'file',
        name: 'The-Forge-Eternal.md',
        path: 'documents/The-Forge-Eternal.md',
        sha: 'doc123'
      },
      {
        type: 'file',
        name: 'readme.md',
        path: 'documents/readme.md',
        sha: 'readme456'
      }
    ]

    // Mock the authenticated request to return these files
    mockAuthManager.makeAuthenticatedRequest.mockResolvedValue(mockFiles)

    // Mock loadDocument to only work for non-README files
    mockGithubStorage.loadDocument = jest.fn().mockImplementation((path) => {
      if (path.toLowerCase().includes('readme')) {
        throw new Error('Invalid document format: missing front matter')
      }
      return Promise.resolve({
        id: 'doc_123',
        title: 'The Forge Eternal',
        content: '# Test Content',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: []
      })
    })

    // Act - Call listDocuments
    const documents = await mockGithubStorage.listDocuments()

    // Assert - Should only include valid documents, exclude README files
    expect(documents).toHaveLength(1)
    expect(documents[0].title).toBe('The Forge Eternal')
    expect(mockGithubStorage.loadDocument).toHaveBeenCalledTimes(1)
    expect(mockGithubStorage.loadDocument).toHaveBeenCalledWith('documents/The-Forge-Eternal.md')
    expect(mockGithubStorage.loadDocument).not.toHaveBeenCalledWith('documents/README.md')
    expect(mockGithubStorage.loadDocument).not.toHaveBeenCalledWith('documents/readme.md')
  })

  test('should handle case-insensitive README exclusion', async () => {
    // Arrange - Test various README filename cases
    const mockFiles = [
      { type: 'file', name: 'README.md', path: 'documents/README.md', sha: 'readme1' },
      { type: 'file', name: 'readme.md', path: 'documents/readme.md', sha: 'readme2' },
      { type: 'file', name: 'ReadMe.md', path: 'documents/ReadMe.md', sha: 'readme3' },
      { type: 'file', name: 'README-old.md', path: 'documents/README-old.md', sha: 'readme4' },
      { type: 'file', name: 'valid-doc.md', path: 'documents/valid-doc.md', sha: 'doc1' }
    ]

    mockAuthManager.makeAuthenticatedRequest.mockResolvedValue(mockFiles)
    mockGithubStorage.loadDocument = jest.fn().mockResolvedValue({
      id: 'doc_123',
      title: 'Valid Document',
      content: '# Content',
      updatedAt: '2024-01-01T00:00:00Z',
      tags: []
    })

    // Act
    const documents = await mockGithubStorage.listDocuments()

    // Assert - Should only process the valid document
    expect(documents).toHaveLength(1)
    expect(mockGithubStorage.loadDocument).toHaveBeenCalledTimes(1)
    expect(mockGithubStorage.loadDocument).toHaveBeenCalledWith('documents/valid-doc.md')
  })
})