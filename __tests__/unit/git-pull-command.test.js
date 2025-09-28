/**
 * @jest-environment jsdom
 */

describe('Git Pull Command - Multi-word Filename Support', () => {
  let mockApp, mockStorageManager, mockAuthManager, mockGithubStorage, mockGitService

  beforeEach(() => {
    // Mock storage manager
    mockStorageManager = {
      getAllDocuments: jest.fn()
    }

    // Mock auth manager
    mockAuthManager = {
      isAuthenticated: jest.fn().mockReturnValue(true)
    }

    // Mock github storage
    mockGithubStorage = {
      isConfigured: jest.fn().mockReturnValue(true)
    }

    // Mock git service
    mockGitService = {
      pullDocument: jest.fn().mockResolvedValue({
        success: true,
        message: 'Document pulled successfully'
      })
    }

    // Mock app with required dependencies
    mockApp = {
      storageManager: mockStorageManager,
      authManager: mockAuthManager,
      githubStorage: mockGithubStorage,
      gitService: mockGitService
    }

    // Clear all mocks
    jest.clearAllMocks()
  })

  describe('Multi-word filename parsing', () => {
    test('should join multiple arguments into single filename', async () => {
      // Arrange - Document exists with multi-word filename
      const mockDocs = [
        {
          id: 'doc_1',
          githubPath: 'documents/The Forge Eternal.md',
          title: 'The Forge Eternal'
        }
      ]
      mockStorageManager.getAllDocuments.mockResolvedValue(mockDocs)

      // Import git commands
      const { registerGitCommands } = await import('../../src/core/commands/git-commands.js')

      // Mock command registry
      const mockRegistry = {
        registerCommands: jest.fn()
      }

      // Register commands
      registerGitCommands(mockRegistry, mockApp)

      // Get the git pull command
      const registeredCommands = mockRegistry.registerCommands.mock.calls[0][0]
      const gitPullCommand = registeredCommands.find(cmd => cmd.name === 'git pull')

      // Act - Pass multiple words as separate arguments (simulating `:gpl The Forge Eternal.md`)
      const result = await gitPullCommand.handler(['The', 'Forge', 'Eternal.md'])

      // Assert - Should successfully find document using joined filename
      expect(result.success).toBe(true)
      expect(mockGitService.pullDocument).toHaveBeenCalledWith('doc_1')
      expect(result.message).toBe('Document pulled successfully')
    })

    test('should still work with single word filenames', async () => {
      // Arrange - Document with single word filename
      const mockDocs = [
        {
          id: 'doc_2',
          githubPath: 'documents/story.md',
          title: 'Story'
        }
      ]
      mockStorageManager.getAllDocuments.mockResolvedValue(mockDocs)

      // Import git commands
      const { registerGitCommands } = await import('../../src/core/commands/git-commands.js')

      // Mock command registry
      const mockRegistry = {
        registerCommands: jest.fn()
      }

      // Register commands
      registerGitCommands(mockRegistry, mockApp)

      // Get the git pull command
      const registeredCommands = mockRegistry.registerCommands.mock.calls[0][0]
      const gitPullCommand = registeredCommands.find(cmd => cmd.name === 'git pull')

      // Act - Pass single word argument
      const result = await gitPullCommand.handler(['story.md'])

      // Assert - Should successfully find document
      expect(result.success).toBe(true)
      expect(mockGitService.pullDocument).toHaveBeenCalledWith('doc_2')
    })

    test('should fail gracefully when document not found', async () => {
      // Arrange - No matching documents locally or remotely
      mockStorageManager.getAllDocuments.mockResolvedValue([])
      mockGithubStorage.listDocuments = jest.fn().mockResolvedValue([])

      // Import git commands
      const { registerGitCommands } = await import('../../src/core/commands/git-commands.js')

      // Mock command registry
      const mockRegistry = {
        registerCommands: jest.fn()
      }

      // Register commands
      registerGitCommands(mockRegistry, mockApp)

      // Get the git pull command
      const registeredCommands = mockRegistry.registerCommands.mock.calls[0][0]
      const gitPullCommand = registeredCommands.find(cmd => cmd.name === 'git pull')

      // Act
      const result = await gitPullCommand.handler(['Nonexistent', 'Document'])

      // Assert - Should fail with appropriate message
      expect(result.success).toBe(false)
      expect(result.message).toContain('No document found matching "Nonexistent Document"')
      expect(mockGitService.pullDocument).not.toHaveBeenCalled()
    })

    test('should pull remote-only document by title (YAML frontmatter)', async () => {
      // Arrange - Document exists only remotely with GUID filename but human-readable title
      mockStorageManager.getAllDocuments.mockResolvedValue([]) // No local documents

      // Mock remote documents from GitHub with GUID filenames and parsed titles
      const mockRemoteDocs = [
        {
          id: 'remote_doc_1',
          title: 'The Forge Eternal', // Human-readable title from YAML
          githubPath: 'documents/b83a8aac-a5e9-4b25-aea1-e68c79a774f1.md', // GUID filename
          githubSha: 'abc123'
        }
      ]
      mockGithubStorage.listDocuments = jest.fn().mockResolvedValue(mockRemoteDocs)

      // Mock githubStorage loadDocument and storageManager saveDocument for remote-only documents
      mockGithubStorage.loadDocument = jest.fn().mockResolvedValue({
        id: 'loaded_doc',
        title: 'The Forge Eternal',
        content: '# The Forge Eternal\n\nContent from remote repository',
        githubPath: 'documents/b83a8aac-a5e9-4b25-aea1-e68c79a774f1.md'
        // Note: No sync structure - this simulates GitHub loaded documents that need sync structure added
      })

      mockStorageManager.saveDocument = jest.fn().mockResolvedValue({
        id: 'saved_doc',
        title: 'The Forge Eternal',
        content: '# The Forge Eternal\n\nContent from remote repository'
      })

      // Mock app.loadDocument and navigator.refresh
      mockApp.loadDocument = jest.fn()
      mockApp.navigator = {
        refresh: jest.fn()
      }

      // Import git commands
      const { registerGitCommands } = await import('../../src/core/commands/git-commands.js')

      // Mock command registry
      const mockRegistry = {
        registerCommands: jest.fn()
      }

      // Register commands
      registerGitCommands(mockRegistry, mockApp)

      // Get the git pull command
      const registeredCommands = mockRegistry.registerCommands.mock.calls[0][0]
      const gitPullCommand = registeredCommands.find(cmd => cmd.name === 'git pull')

      // Act - User types `:gpl The Forge Eternal` (human-readable title, not GUID)
      const result = await gitPullCommand.handler(['The', 'Forge', 'Eternal'])

      // Assert - Should find by title and load remote document
      expect(result.success).toBe(true)
      expect(mockGithubStorage.listDocuments).toHaveBeenCalled()
      expect(mockGithubStorage.loadDocument).toHaveBeenCalledWith('documents/b83a8aac-a5e9-4b25-aea1-e68c79a774f1.md')
      expect(mockStorageManager.saveDocument).toHaveBeenCalled()
      expect(mockApp.loadDocument).toHaveBeenCalled()
      expect(mockApp.navigator.refresh).toHaveBeenCalled()
      expect(result.message).toBe('Document "The Forge Eternal" pulled successfully')
    })
  })
})