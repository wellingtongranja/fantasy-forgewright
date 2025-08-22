/**
 * GitHub Commands - GitHub integration commands for Fantasy Editor
 * Implements OAuth authentication and document synchronization
 */
export function registerGitHubCommands(registry, app) {
  const commands = [
    // GitHub Authentication Commands
    {
      name: 'github status',
      description: 'show GitHub connection status',
      category: 'github',
      icon: '🐙',
      aliases: [':gh'],
      handler: async () => {
        if (!app.githubAuth) {
          return {
            success: false,
            message: 'GitHub integration not initialized'
          }
        }

        const status = app.githubAuth.getStatus()
        const user = app.githubAuth.getCurrentUser()
        
        if (status.authenticated && user) {
          const storageConfig = app.githubStorage?.getConfig() || {}
          
          return {
            success: true,
            message: 'GitHub Status:',
            data: {
              status: 'Connected ✅',
              user: `${user.name} (@${user.login})`,
              repository: storageConfig.configured 
                ? `${storageConfig.owner}/${storageConfig.repo}` 
                : 'Not configured',
              branch: storageConfig.branch || 'main',
              documentsPath: storageConfig.documentsPath || 'documents'
            }
          }
        } else {
          return {
            success: true,
            message: 'GitHub Status:',
            data: {
              status: 'Not connected ❌',
              info: 'Use ":ghl" to log in to GitHub',
              note: 'GitHub integration enables document backup and sync'
            }
          }
        }
      }
    },

    {
      name: 'github login',
      description: 'log in to GitHub',
      category: 'github',
      icon: '🔑',
      aliases: [':ghl'],
      handler: async () => {
        if (!app.githubAuth) {
          return {
            success: false,
            message: 'GitHub integration not initialized. Please configure GitHub OAuth first.'
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
            message: 'Redirecting to GitHub for authorization...'
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
      description: 'log out from GitHub',
      category: 'github',
      icon: '🚪',
      aliases: [':gho'],
      handler: async () => {
        if (!app.githubAuth) {
          return {
            success: false,
            message: 'GitHub integration not initialized'
          }
        }

        if (!app.githubAuth.isAuthenticated()) {
          return {
            success: true,
            message: 'Already logged out from GitHub'
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
      description: 'configure GitHub repository',
      category: 'github',
      icon: '⚙️',
      aliases: [':ghc'],
      parameters: [
        { name: 'owner', required: false, type: 'string', description: 'Repository owner' },
        { name: 'repo', required: false, type: 'string', description: 'Repository name' },
        { name: 'branch', required: false, type: 'string', description: 'Branch name (default: main)' }
      ],
      handler: async (args) => {
        if (!app.githubStorage) {
          return {
            success: false,
            message: 'GitHub storage not initialized'
          }
        }

        const [owner, repo, branch] = args
        
        if (!owner || !repo) {
          const config = app.githubStorage.getConfig()
          return {
            success: true,
            message: 'GitHub Repository Configuration:',
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
      description: 'sync documents with GitHub',
      category: 'github',
      icon: '🔄',
      aliases: [':ghs'],
      handler: async () => {
        if (!app.githubAuth?.isAuthenticated()) {
          return {
            success: false,
            message: 'Not logged in to GitHub. Use ":ghl" to log in first.'
          }
        }

        if (!app.githubStorage?.isConfigured()) {
          return {
            success: false,
            message: 'GitHub repository not configured. Use ":ghc <owner> <repo>" to configure.'
          }
        }

        try {
          // This would be implemented in the SyncManager
          if (app.syncManager) {
            const result = await app.syncManager.syncWithGitHub()
            return {
              success: true,
              message: 'GitHub sync completed',
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
      description: 'push current document to GitHub',
      category: 'github',
      icon: '⬆️',
      aliases: [':ghp'],
      handler: async () => {
        if (!app.githubAuth?.isAuthenticated()) {
          return {
            success: false,
            message: 'Not logged in to GitHub. Use ":ghl" to log in first.'
          }
        }

        if (!app.githubStorage?.isConfigured()) {
          return {
            success: false,
            message: 'GitHub repository not configured. Use ":ghc <owner> <repo>" to configure.'
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
          
          // Update local document with GitHub metadata
          const updatedDoc = {
            ...doc,
            githubSha: result.document.githubSha,
            githubPath: result.document.githubPath,
            lastSyncedAt: result.document.lastSyncedAt
          }
          
          // Save updated document locally with GitHub metadata
          await app.storageManager.saveDocument(updatedDoc)
          
          // Update current document if it's the same one
          if (app.currentDocument && app.currentDocument.id === doc.id) {
            app.currentDocument = updatedDoc
          }
          
          return {
            success: true,
            message: `Document "${doc.title}" pushed to GitHub successfully`
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
      description: 'pull documents from GitHub',
      category: 'github',
      icon: '⬇️',
      aliases: [':ghpl'],
      parameters: [
        { name: 'filename', required: false, type: 'string', description: 'Specific document to pull' }
      ],
      handler: async (args) => {
        if (!app.githubAuth?.isAuthenticated()) {
          return {
            success: false,
            message: 'Not logged in to GitHub. Use ":ghl" to log in first.'
          }
        }

        if (!app.githubStorage?.isConfigured()) {
          return {
            success: false,
            message: 'GitHub repository not configured. Use ":ghc <owner> <repo>" to configure.'
          }
        }

        try {
          const filename = args[0]
          
          if (filename) {
            // Pull specific document
            const document = await app.githubStorage.loadDocument(`${app.githubStorage.documentsPath}/${filename}`)
            await app.storageManager.saveDocument(document)
            
            return {
              success: true,
              message: `Document "${document.title}" pulled from GitHub successfully`
            }
          } else {
            // List available documents for pulling
            const documents = await app.githubStorage.listDocuments()
            
            if (documents.length === 0) {
              return {
                success: true,
                message: 'No documents found in GitHub repository'
              }
            }
            
            return {
              success: true,
              message: `Found ${documents.length} documents in GitHub:`,
              data: documents.map(doc => `${doc.title} (${doc.githubPath})`)
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
      description: 'import document from GitHub URL',
      category: 'github',
      icon: '📥',
      aliases: [':ghi'],
      parameters: [
        { name: 'url', required: true, type: 'string', description: 'GitHub raw file URL' }
      ],
      handler: async (args) => {
        const url = args[0]
        
        if (!url) {
          return {
            success: false,
            message: 'GitHub URL required. Usage: github import <url>'
          }
        }
        
        if (!url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
          return {
            success: false,
            message: 'Invalid GitHub URL. Please provide a valid GitHub file URL.'
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
      description: 'list documents in GitHub repository',
      category: 'github',
      icon: '📋',
      aliases: [':ghls'],
      handler: async () => {
        if (!app.githubAuth?.isAuthenticated()) {
          return {
            success: false,
            message: 'Not logged in to GitHub. Use ":ghl" to log in first.'
          }
        }

        if (!app.githubStorage?.isConfigured()) {
          return {
            success: false,
            message: 'GitHub repository not configured. Use ":ghc <owner> <repo>" to configure.'
          }
        }

        try {
          const documents = await app.githubStorage.listDocuments()
          
          if (documents.length === 0) {
            return {
              success: true,
              message: 'No documents found in GitHub repository',
              data: ['Use ":ghp" to push your current document to GitHub']
            }
          }
          
          return {
            success: true,
            message: `Found ${documents.length} documents in GitHub repository:`,
            data: documents.map(doc => {
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
      description: 'initialize GitHub repository for documents',
      category: 'github',
      icon: '🚀',
      aliases: [':ghini'],
      handler: async () => {
        if (!app.githubAuth?.isAuthenticated()) {
          return {
            success: false,
            message: 'Not logged in to GitHub. Use ":ghl" to log in first.'
          }
        }

        if (!app.githubStorage?.isConfigured()) {
          return {
            success: false,
            message: 'GitHub repository not configured. Use ":ghc <owner> <repo>" to configure.'
          }
        }

        try {
          await app.githubStorage.ensureDocumentsDirectory()
          
          return {
            success: true,
            message: 'GitHub repository initialized for Fantasy Editor documents'
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
  const processedCommands = commands.map(command => ({
    condition: () => true,
    parameters: command.parameters || [],
    ...command
  }))

  // Register all GitHub commands
  registry.registerCommands(processedCommands)
}