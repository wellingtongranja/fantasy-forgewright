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
          // This would be implemented in the SyncManager
          if (app.syncManager) {
            const result = await app.syncManager.syncWithGitHub()

            // Update Navigator after sync operations
            if (app.navigator) {
              app.navigator.refresh()
            }

            // Update Git UI to reflect sync status changes
            // app.updateGitUI() - Method not implemented yet

            return {
              success: true,
              message: 'Git repository sync completed',
              data: {
                uploaded: result.uploaded || 0,
                downloaded: result.downloaded || 0,
                conflicts: result.conflicts || 0,
                errors: result.errors || 0
              }
            }
          } else {
            return {
              success: false,
              message: 'Sync manager not available. Feature coming soon.'
            }
          }
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

        const doc = app.currentDocument
        if (!doc) {
          return {
            success: false,
            message: 'No document currently open'
          }
        }

        try {
          // Ensure document is saved locally first
          const savedDoc = await app.saveDocument()

          // Use the saved document (which has the updated metadata.modified)
          const docToSync = savedDoc || app.currentDocument
          const result = await app.githubStorage.saveDocument(docToSync)

          // Update document with Git metadata, preserving the existing metadata
          const updatedDoc = {
            ...docToSync,
            githubSha: result.document.githubSha,
            githubPath: result.document.githubPath,
            lastSyncedAt: docToSync.metadata?.modified || new Date().toISOString()
          }

          // Save updated document locally with Git metadata
          await app.storageManager.saveDocument(updatedDoc)

          // Update current document if it's the same one
          if (app.currentDocument && app.currentDocument.id === docToSync.id) {
            app.currentDocument = updatedDoc
          }

          // Update Navigator to reflect new sync status
          if (app.navigator) {
            app.navigator.onDocumentSave(updatedDoc)
          }

          // Update Git UI to reflect sync status changes
          // app.updateGitUI() - Method not implemented yet

          return {
            success: true,
            message: `Document "${docToSync.title}" pushed to Git repository successfully`
          }
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
            // Pull specific document
            const document = await app.githubStorage.loadDocument(
              `${app.githubStorage.documentsPath}/${filename}`
            )
            const savedDoc = await app.storageManager.saveDocument(document)

            // Update Navigator to show newly pulled document
            if (app.navigator) {
              app.navigator.onDocumentSave(savedDoc)
            }

            // Update Git UI
            // app.updateGitUI() - Method not implemented yet

            return {
              success: true,
              message: `Document "${document.title}" pulled from Git repository successfully`
            }
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

        if (!url) {
          return {
            success: false,
            message: 'Git repository URL required. Usage: git import <url>'
          }
        }

        if (!url.includes('github.com') && !url.includes('gitlab.com') && !url.includes('bitbucket.org') && !url.includes('raw.githubusercontent.com')) {
          return {
            success: false,
            message: 'Invalid Git repository URL. Please provide a valid Git repository file URL.'
          }
        }

        try {
          // Convert Git file URL to raw URL if needed
          let rawUrl = url
          if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
            rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
          }

          const response = await fetch(rawUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`)
          }

          const content = await response.text()

          // Try to parse as Fantasy Editor document
          let document
          try {
            if (content.startsWith('---')) {
              // Has front matter, try to parse
              document = app.githubStorage.parseDocumentContent(content)
            } else {
              // Plain markdown, create new document
              const title = url.split('/').pop().replace('.md', '') || 'Imported Document'
              document = {
                id: app.storageManager.generateGUID(),
                title,
                content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tags: ['imported'],
                checksum: app.storageManager.generateChecksum(content)
              }
            }
          } catch (parseError) {
            // Fallback: create simple document
            const title = url.split('/').pop().replace('.md', '') || 'Imported Document'
            document = {
              id: app.storageManager.generateGUID(),
              title,
              content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              tags: ['imported'],
              checksum: app.storageManager.generateChecksum(content)
            }
          }

          await app.storageManager.saveDocument(document)
          app.loadDocument(document)

          return {
            success: true,
            message: `Document "${document.title}" imported successfully from Git repository`
          }
        } catch (error) {
          return {
            success: false,
            message: `Import failed: ${error.message}`
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
          await app.githubStorage.ensureDocumentsDirectory()

          return {
            success: true,
            message: 'Git repository initialized for Fantasy Editor documents'
          }
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