/**
 * Git Commands - Git integration commands for Fantasy Editor
 * Implements OAuth authentication and document synchronization with Git providers
 * Supports GitHub, GitLab, Bitbucket, and other Git providers
 */
export function registerGitCommands(registry, app) {
  const commands = [
    // Git Authentication Commands
    {
      name: 'git status',
      description: 'show Git repository connection status',
      category: 'git',
      icon: '🔧',
      aliases: [':gst'],
      handler: async () => {
        if (!app.authManager) {
          return {
            success: false,
            message: 'Git repository integration not initialized'
          }
        }

        const isAuthenticated = app.authManager.isAuthenticated()
        const user = app.authManager.getCurrentUser()

        if (isAuthenticated && user) {
          const storageConfig = app.githubStorage?.getConfig() || {}

          return {
            success: true,
            message: 'Git Repository Status:',
            data: {
              status: 'Connected ✅',
              user: `${user.name || user.username} (@${user.login || user.username})`,
              repository: storageConfig.configured
                ? `${storageConfig.owner}/${storageConfig.repo}`
                : 'Not configured',
              branch: storageConfig.branch || 'main'
            }
          }
        } else {
          return {
            success: true,
            message: 'Git Repository Status:',
            data: {
              status: 'Not connected ❌',
              info: 'Use ":glo" to log in to Git repository',
              note: 'Git integration enables document backup and sync'
            }
          }
        }
      }
    },

    {
      name: 'git login',
      description: 'log in to Git repository',
      category: 'git',
      icon: '🔑',
      aliases: [':glo'],
      handler: async () => {
        if (!app.authManager) {
          return {
            success: false,
            message: 'Git repository integration not initialized. Please configure OAuth first.'
          }
        }

        if (app.authManager.isAuthenticated()) {
          const user = app.authManager.getCurrentUser()
          const username = user.login || user.username
          return {
            success: true,
            message: `Already logged in as ${user.name || username} (@${username})`
          }
        }

        try {
          // Start OAuth Web Application Flow
          await app.authManager.login('github')

          return {
            success: true,
            message: 'Redirecting to Git provider for authorization...'
          }
        } catch (error) {
          return {
            success: false,
            message: `Git login failed: ${error.message}`
          }
        }
      }
    },

    {
      name: 'git logout',
      description: 'log out from Git repository',
      category: 'git',
      icon: '🚪',
      aliases: [':gou'],
      handler: async () => {
        if (!app.authManager) {
          return {
            success: false,
            message: 'Git repository integration not initialized'
          }
        }

        if (!app.authManager.isAuthenticated()) {
          return {
            success: true,
            message: 'Already logged out from Git repository'
          }
        }

        const user = app.authManager.getCurrentUser()
        app.authManager.logout()

        return {
          success: true,
          message: `Logged out from Git repository (was: ${user.name || user.username})`
        }
      }
    },

    // Git Repository Configuration
    {
      name: 'git config',
      description: 'configure Git repository',
      category: 'git',
      icon: '⚙️',
      aliases: [':gcf'],
      parameters: [
        { name: 'owner', required: false, type: 'string', description: 'Repository owner' },
        { name: 'repo', required: false, type: 'string', description: 'Repository name' },
        {
          name: 'branch',
          required: false,
          type: 'string',
          description: 'Branch name (default: main)'
        }
      ],
      handler: async (args) => {
        if (!app.githubStorage) {
          return {
            success: false,
            message: 'Git repository storage not initialized'
          }
        }

        const [owner, repo, branch] = args

        if (!owner || !repo) {
          const config = app.githubStorage.getConfig()
          return {
            success: true,
            message: 'Git Repository Configuration:',
            data: {
              owner: config.owner || 'Not set',
              repository: config.repo || 'Not set',
              branch: config.branch || 'main',
              documentsPath: config.documentsPath || 'documents',
              configured: config.configured ? 'Yes ✅' : 'No ❌',
              usage: 'Use: git config <owner> <repo> [branch]'
            }
          }
        }

        try {
          app.githubStorage.updateConfig({
            owner,
            repo,
            branch: branch || 'main'
          })

          // Verify repository access
          const isAccessible = await app.githubStorage.verifyRepository()

          if (isAccessible) {
            return {
              success: true,
              message: `Git repository configured: ${owner}/${repo}`
            }
          } else {
            return {
              success: false,
              message: `Repository ${owner}/${repo} not found or not accessible. Check permissions and repository name.`
            }
          }
        } catch (error) {
          return {
            success: false,
            message: `Configuration failed: ${error.message}`
          }
        }
      }
    },

    // Git Document Synchronization
    {
      name: 'git sync',
      description: 'sync documents with Git repository',
      category: 'git',
      icon: '🔄',
      aliases: [':gsy'],
      handler: async () => {
        if (!app.gitService) {
          return {
            success: false,
            message: 'Git service not available'
          }
        }

        try {
          const result = await app.gitService.syncAllDocuments()

          // Update Navigator after sync operations
          if (app.navigator) {
            app.navigator.refresh()
          }

          return result.success ? {
            success: true,
            message: result.message,
            data: result.stats
          } : result
        } catch (error) {
          return {
            success: false,
            message: `Sync failed: ${error.message}`
          }
        }
      }
    },

    {
      name: 'git push',
      description: 'push current document to Git repository',
      category: 'git',
      icon: '⬆️',
      aliases: [':gpu'],
      handler: async () => {
        if (!app.gitService) {
          return {
            success: false,
            message: 'Git service not available'
          }
        }

        const doc = app.currentDocument
        if (!doc) {
          return {
            success: false,
            message: 'No document currently open'
          }
        }

        try {
          // Ensure document is saved locally first
          const saveResult = await app.saveDocument()

          // Handle save result
          if (!saveResult.success && saveResult.reason === 'readonly') {
            return { success: false, message: 'Cannot push readonly document to Git repository' }
          }
          if (!saveResult.success && saveResult.reason === 'error') {
            return { success: false, message: 'Failed to save document before push' }
          }

          // Use the saved document ID
          const docToSync = saveResult.success && saveResult.document ? saveResult.document : app.currentDocument
          const result = await app.gitService.pushDocument(docToSync.id)

          // Update current document if it's the same one
          if (result.success && result.document && app.currentDocument && app.currentDocument.id === docToSync.id) {
            app.currentDocument = result.document
          }

          // Update Navigator to reflect new sync status
          if (app.navigator) {
            app.navigator.refresh()
          }

          return result
        } catch (error) {
          return {
            success: false,
            message: `Push failed: ${error.message}`
          }
        }
      }
    },

    {
      name: 'git pull',
      description: 'pull documents from Git repository',
      category: 'git',
      icon: '⬇️',
      aliases: [':gpl'],
      parameters: [
        {
          name: 'filename',
          required: false,
          type: 'string',
          description: 'Specific document to pull'
        }
      ],
      handler: async (args) => {
        if (!app.authManager?.isAuthenticated()) {
          return {
            success: false,
            message: 'Not logged in to Git repository. Use ":glo" to log in first.'
          }
        }

        if (!app.githubStorage?.isConfigured()) {
          return {
            success: false,
            message: 'Git repository not configured. Use ":gcf <owner> <repo>" to configure.'
          }
        }

        try {
          const filename = args[0]

          if (filename) {
            // Find local document that matches the filename
            const allDocs = await app.storageManager.getAllDocuments()
            const targetDoc = allDocs.find(doc =>
              doc.githubPath && doc.githubPath.endsWith(filename)
            )

            if (!targetDoc) {
              return {
                success: false,
                message: `No local document found matching "${filename}". Use git list to see available documents.`
              }
            }

            // Use GitService for consistent pull behavior with editor reload
            if (!app.gitService) {
              return {
                success: false,
                message: 'Git service not available'
              }
            }

            return await app.gitService.pullDocument(targetDoc.id)
          } else {
            // List available documents for pulling
            const documents = await app.githubStorage.listDocuments()

            if (documents.length === 0) {
              return {
                success: true,
                message: 'No documents found in Git repository'
              }
            }

            return {
              success: true,
              message: `Found ${documents.length} documents in Git repository:`,
              data: documents.map((doc) => `${doc.title} (${doc.githubPath})`)
            }
          }
        } catch (error) {
          return {
            success: false,
            message: `Pull failed: ${error.message}`
          }
        }
      }
    },

    {
      name: 'git import',
      description: 'import document from Git repository URL',
      category: 'git',
      icon: '📥',
      aliases: [':gim'],
      parameters: [
        { name: 'url', required: true, type: 'string', description: 'Git repository raw file URL' }
      ],
      handler: async (args) => {
        const url = args[0]

        if (!app.gitService) {
          return {
            success: false,
            message: 'Git service not available'
          }
        }

        try {
          const result = await app.gitService.importDocument(url)

          if (result.success && result.document) {
            app.loadDocument(result.document)
          }

          return result
        } catch (error) {
          return {
            success: false,
            message: `Import failed: ${error.message}`
          }
        }
      }
    },

    {
      name: 'git diff',
      description: 'view differences between local and remote document',
      category: 'git',
      icon: '🔄',
      aliases: [':gdf'],
      handler: async () => {
        if (!app.authManager?.isAuthenticated()) {
          return {
            success: false,
            message: 'Not logged in to Git repository. Use ":glo" to log in first.'
          }
        }

        if (!app.githubStorage?.isConfigured()) {
          return {
            success: false,
            message: 'Git repository not configured. Use ":gcf <owner> <repo>" to configure.'
          }
        }

        if (!app.currentDocument) {
          return {
            success: false,
            message: 'No document currently open'
          }
        }

        if (!app.gitService || !app.diffManager) {
          return {
            success: false,
            message: 'Git service or diff manager not available'
          }
        }

        try {
          // Check if already in diff mode - if so, toggle off
          if (app.editor && app.editor.isInDiffMode()) {
            const success = await app.editor.exitDiffMode(true) // Keep current changes
            if (success) {
              return {
                success: true,
                message: 'Diff mode closed - changes preserved'
              }
            } else {
              return {
                success: false,
                message: 'Failed to exit diff mode'
              }
            }
          }

          const document = app.currentDocument

          // Check if document has Git metadata
          if (!document.githubSha || !document.githubPath) {
            return {
              success: false,
              message: 'Current document not synced to Git repository'
            }
          }

          // Check if document is out-of-sync
          const syncStatus = app.syncStatusManager.getDocumentSyncStatus(document)
          if (syncStatus.class !== 'out-of-sync') {
            return {
              success: true,
              message: 'Document is already synced - no changes to diff'
            }
          }

          // Get remote document content
          const remoteResult = await app.gitService.getRemoteDocumentContent(document.id)
          if (!remoteResult.success) {
            return {
              success: false,
              message: remoteResult.message
            }
          }

          // Enter diff mode
          if (app.editor) {
            const success = await app.editor.enterDiffMode(document.content, remoteResult.content)
            if (success) {
              return {
                success: true,
                message: 'Diff mode activated - use inline accept/reject buttons or :gdf to exit'
              }
            } else {
              return {
                success: false,
                message: 'Failed to enter diff mode'
              }
            }
          } else {
            return {
              success: false,
              message: 'Editor not available for diff mode'
            }
          }
        } catch (error) {
          return {
            success: false,
            message: `Diff failed: ${error.message}`
          }
        }
      }
    },

    // Git Repository Management
    {
      name: 'git list',
      description: 'list documents in Git repository',
      category: 'git',
      icon: '📋',
      aliases: [':gls'],
      handler: async () => {
        if (!app.authManager?.isAuthenticated()) {
          return {
            success: false,
            message: 'Not logged in to Git repository. Use ":glo" to log in first.'
          }
        }

        if (!app.githubStorage?.isConfigured()) {
          return {
            success: false,
            message: 'Git repository not configured. Use ":gcf <owner> <repo>" to configure.'
          }
        }

        try {
          const documents = await app.githubStorage.listDocuments()

          if (documents.length === 0) {
            return {
              success: true,
              message: 'No documents found in Git repository',
              data: ['Use ":gpu" to push your current document to Git repository']
            }
          }

          return {
            success: true,
            message: `Found ${documents.length} documents in Git repository:`,
            data: documents.map((doc) => {
              const size = Math.round(doc.size / 1024)
              return `${doc.title} (${size}KB, updated: ${new Date(doc.updatedAt).toLocaleDateString()})`
            })
          }
        } catch (error) {
          return {
            success: false,
            message: `Failed to list Git repository documents: ${error.message}`
          }
        }
      }
    },

    {
      name: 'git init',
      description: 'initialize Git repository for documents',
      category: 'git',
      icon: '🚀',
      aliases: [':gin'],
      handler: async () => {
        if (!app.gitService) {
          return {
            success: false,
            message: 'Git service not available'
          }
        }

        try {
          return await app.gitService.initRepository()
        } catch (error) {
          return {
            success: false,
            message: `Initialization failed: ${error.message}`
          }
        }
      }
    }
  ]

  // Add required properties to all commands
  const processedCommands = commands.map((command) => ({
    condition: () => true,
    parameters: command.parameters || [],
    ...command
  }))

  // Register all Git commands
  registry.registerCommands(processedCommands)
}