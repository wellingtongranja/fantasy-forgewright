/**
 * GitHub Commands - GitHub integration commands for Fantasy Editor
 * Implements OAuth authentication and document synchronization
 */
export function registerGitHubCommands(registry, app) {
  const commands = [
    // GitHub Authentication Commands
    {
      name: 'github status',
      description: 'show Git repository connection status',
      category: 'github',
      icon: '🐙',
      aliases: [':gst'],
      handler: async () => {
        if (!app.githubAuth) {
          return {
            success: false,
            message: 'Git repository integration not initialized'
          }
        }

        const status = app.githubAuth.getStatus()
        const user = app.githubAuth.getCurrentUser()

        if (status.authenticated && user) {
          const storageConfig = app.githubStorage?.getConfig() || {}

          return {
            success: true,
            message: 'Git Repository Status:',
            data: {
              status: 'Connected ✅',
              user: `${user.name} (@${user.login})`,
              repository: storageConfig.configured
                ? `${storageConfig.owner}/${storageConfig.repo}`
                : 'Not configured',
              branch: storageConfig.branch || 'main',
              documentsPath: storageConfig.documentsPath || 'documents',
              // Debug info for sync indicators
              debug: {
                'Auth Token': status.authenticated ? 'Present ✅' : 'Missing ❌',
                'Storage Configured': storageConfig.configured ? 'Yes ✅' : 'No ❌',
                'Owner Set': storageConfig.owner ? `${storageConfig.owner} ✅` : 'Missing ❌',
                'Repo Set': storageConfig.repo ? `${storageConfig.repo} ✅` : 'Missing ❌',
                'Sync Indicators Should Show': (status.authenticated && storageConfig.configured) ? 'YES ✅' : 'NO ❌'
              }
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
      name: 'github login',
      description: 'log in to Git repository',
      category: 'github',
      icon: '🔑',
      aliases: [':glo'],
      handler: async () => {
        if (!app.githubAuth) {
          return {
            success: false,
            message: 'Git repository integration not initialized. Please configure OAuth first.'
          }
        }

        if (app.githubAuth.isAuthenticated()) {
          const user = app.githubAuth.getCurrentUser()
          return {
            success: true,
            message: `Already logged in as ${user.name} (@${user.login})`
          }
        }

        try {
          // Start OAuth Web Application Flow
          await app.githubAuth.login()

          return {
            success: true,
            message: 'Redirecting to repository provider for authorization...'
          }
        } catch (error) {
          return {
            success: false,
            message: `GitHub login failed: ${error.message}`
          }
        }
      }
    },

    {
      name: 'github logout',
      description: 'log out from Git repository',
      category: 'github',
      icon: '🚪',
      aliases: [':gou'],
      handler: async () => {
        if (!app.githubAuth) {
          return {
            success: false,
            message: 'Git repository integration not initialized'
          }
        }

        if (!app.githubAuth.isAuthenticated()) {
          return {
            success: true,
            message: 'Already logged out from Git repository'
          }
        }

        const user = app.githubAuth.getCurrentUser()
        app.githubAuth.logout()

        return {
          success: true,
          message: `Logged out from GitHub (was: ${user.name})`
        }
      }
    },

    // GitHub Repository Configuration
    {
      name: 'github config',
      description: 'configure Git repository',
      category: 'github',
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
              usage: 'Use: github config <owner> <repo> [branch]'
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
              message: `GitHub repository configured: ${owner}/${repo}`
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

    // GitHub Document Synchronization
    {
      name: 'github sync',
      description: 'sync documents with Git repository',
      category: 'github',
      icon: '🔄',
      aliases: [':gsy'],
      handler: async () => {
        if (!app.githubAuth?.isAuthenticated()) {
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

            // Update GitHub UI to reflect sync status changes
            app.updateGitHubUI()

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
      name: 'github push',
      description: 'push current document to Git repository',
      category: 'github',
      icon: '⬆️',
      aliases: [':gpu'],
      handler: async () => {
        if (!app.githubAuth?.isAuthenticated()) {
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
          await app.saveDocument()

          const result = await app.githubStorage.saveDocument(doc)

          // Set sync timestamp to ensure it's after the local save
          const syncTimestamp = new Date().toISOString()

          // Update local document with GitHub metadata
          const updatedDoc = {
            ...doc,
            githubSha: result.document.githubSha,
            githubPath: result.document.githubPath,
            lastSyncedAt: syncTimestamp
          }

          // Save updated document locally with GitHub metadata
          await app.storageManager.saveDocument(updatedDoc)

          // Update current document if it's the same one
          if (app.currentDocument && app.currentDocument.id === doc.id) {
            app.currentDocument = updatedDoc
          }

          // Update Navigator to reflect new sync status
          if (app.navigator) {
            app.navigator.onDocumentSave(updatedDoc)
          }

          // Update GitHub UI to reflect sync status changes
          app.updateGitHubUI()

          return {
            success: true,
            message: `Document "${doc.title}" pushed to Git repository successfully`
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
      name: 'github pull',
      description: 'pull documents from Git repository',
      category: 'github',
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
        if (!app.githubAuth?.isAuthenticated()) {
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

            // Update GitHub UI
            app.updateGitHubUI()

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
      name: 'github import',
      description: 'import document from Git repository URL',
      category: 'github',
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
            message: 'Git repository URL required. Usage: github import <url>'
          }
        }

        if (!url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
          return {
            success: false,
            message: 'Invalid Git repository URL. Please provide a valid Git repository file URL.'
          }
        }

        try {
          // Convert GitHub file URL to raw URL if needed
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
            message: `Document "${document.title}" imported successfully from GitHub`
          }
        } catch (error) {
          return {
            success: false,
            message: `Import failed: ${error.message}`
          }
        }
      }
    },

    // GitHub Repository Management
    {
      name: 'github list',
      description: 'list documents in Git repository',
      category: 'github',
      icon: '📋',
      aliases: [':gls'],
      handler: async () => {
        if (!app.githubAuth?.isAuthenticated()) {
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
            message: `Found ${documents.length} documents in GitHub repository:`,
            data: documents.map((doc) => {
              const size = Math.round(doc.size / 1024)
              return `${doc.title} (${size}KB, updated: ${new Date(doc.updatedAt).toLocaleDateString()})`
            })
          }
        } catch (error) {
          return {
            success: false,
            message: `Failed to list GitHub documents: ${error.message}`
          }
        }
      }
    },

    {
      name: 'github init',
      description: 'initialize Git repository for documents',
      category: 'github',
      icon: '🚀',
      aliases: [':gin'],
      handler: async () => {
        if (!app.githubAuth?.isAuthenticated()) {
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

  // Register all GitHub commands
  registry.registerCommands(processedCommands)
}
