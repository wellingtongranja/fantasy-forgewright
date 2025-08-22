/**
 * Core Commands - Essential editor commands for Fantasy Editor
 * Integrates with existing EditorManager, StorageManager, and ThemeManager
 */
export function registerCoreCommands(registry, app) {
  const commands = [
    // Document Management Commands
    {
      name: 'new',
      description: 'create a new document',
      category: 'document',
      icon: '📝',
      aliases: ['n', 'create'],
      parameters: [
        { name: 'title', required: false, type: 'string', description: 'Document title' }
      ],
      handler: async (args) => {
        const title = args.join(' ') || 'Untitled Document'
        const doc = app.createNewDocument()
        doc.title = title
        
        // Update UI
        document.getElementById('doc-title').value = title
        app.loadDocument(doc)
        app.updateUI()
        
        return { success: true, message: `Created new document: ${title}` }
      }
    },

    {
      name: 'save',
      description: 'save current document',
      category: 'document',
      icon: '💾',
      aliases: ['s', 'write'],
      handler: async () => {
        await app.saveDocument()
        return { success: true, message: 'Document saved successfully' }
      }
    },

    {
      name: 'open',
      description: 'open document',
      category: 'document',
      icon: '📂',
      aliases: ['o', 'load'],
      parameters: [
        { name: 'filter', required: false, type: 'string', description: 'Search filter' }
      ],
      handler: async (args) => {
        const filter = args.join(' ')
        const documents = await app.storageManager.getAllDocuments()
        
        if (filter) {
          const filtered = documents.filter(doc => 
            doc.title.toLowerCase().includes(filter.toLowerCase()) ||
            doc.content.toLowerCase().includes(filter.toLowerCase())
          )
          
          if (filtered.length === 1) {
            app.loadDocument(filtered[0])
            return { success: true, message: `Opened: ${filtered[0].title}` }
          } else if (filtered.length === 0) {
            return { success: false, message: `No documents found matching "${filter}"` }
          } else {
            return { 
              success: false, 
              message: `Multiple documents found (${filtered.length}). Be more specific.`,
              data: filtered.map(d => d.title)
            }
          }
        }
        
        // If no filter, show document list
        return {
          success: true,
          message: 'Available documents:',
          data: documents.map(d => d.title)
        }
      }
    },

    {
      name: 'search',
      description: 'search all documents',
      category: 'search',
      icon: '🔍',
      aliases: ['find', 'grep'],
      parameters: [
        { name: 'query', required: true, type: 'string', description: 'Search query' }
      ],
      handler: async (args) => {
        const query = args.join(' ')
        const results = await app.storageManager.searchDocuments(query)
        
        return {
          success: true,
          message: `Found ${results.length} documents matching "${query}"`,
          data: results.map(doc => ({
            title: doc.title,
            id: doc.id,
            snippet: doc.content.substring(0, 100) + '...'
          }))
        }
      }
    },

    // Theme Commands
    {
      name: 'theme',
      description: 'switch theme',
      category: 'appearance',
      icon: '🎨',
      aliases: ['t'],
      parameters: [
        { name: 'theme', required: false, type: 'string', description: 'Theme name (light, dark, fantasy)' }
      ],
      handler: async (args) => {
        const themeName = args[0]
        const availableThemes = ['light', 'dark', 'fantasy']
        
        if (!themeName) {
          return {
            success: true,
            message: `Current theme: ${app.themeManager.getCurrentTheme()}`,
            data: availableThemes
          }
        }
        
        if (!availableThemes.includes(themeName)) {
          return {
            success: false,
            message: `Unknown theme "${themeName}". Available themes: ${availableThemes.join(', ')}`
          }
        }
        
        app.themeManager.applyTheme(themeName)
        return { success: true, message: `Switched to ${themeName} theme` }
      }
    },

    // Information Commands
    {
      name: 'info',
      description: 'show document info',
      category: 'info',
      icon: 'ℹ️',
      aliases: ['status'],
      handler: async () => {
        const doc = app.currentDocument
        if (!doc) {
          return { success: false, message: 'No document currently open' }
        }
        
        const wordCount = doc.content ? doc.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0
        const charCount = doc.content ? doc.content.length : 0
        
        return {
          success: true,
          message: 'Document information:',
          data: {
            title: doc.title,
            id: doc.id,
            created: doc.createdAt,
            updated: doc.updatedAt,
            words: wordCount,
            characters: charCount,
            tags: doc.tags || []
          }
        }
      }
    },

    {
      name: 'help',
      description: 'show help',
      category: 'info',
      icon: '❓',
      aliases: ['h', '?'],
      parameters: [
        { name: 'command', required: false, type: 'string', description: 'Specific command to get help for' }
      ],
      handler: async (args, context) => {
        const commandName = args[0]
        
        if (commandName) {
          const command = registry.getCommand(commandName)
          if (!command) {
            return { success: false, message: `Command "${commandName}" not found` }
          }
          
          return {
            success: true,
            message: `help for ${command.name}`,
            data: {
              name: command.name,
              description: command.description,
              category: command.category,
              aliases: command.aliases,
              parameters: command.parameters,
              usage: command.parameters.length > 0 
                ? `${command.name} ${command.parameters.map(p => p.required ? `<${p.name}>` : `[${p.name}]`).join(' ')}`
                : `${command.name}`
            }
          }
        }
        
        // General help
        const categories = registry.getCategories()
        const stats = registry.getStats()
        
        return {
          success: true,
          message: 'fantasy editor command help',
          data: {
            shortcuts: {
              'Ctrl+Space': 'open command palette',
              'Escape': 'close command palette',
              '↑↓ Arrow Keys': 'navigate commands',
              'Enter': 'execute command',
              'Tab': 'cycle through results'
            },
            categories: categories,
            totalCommands: stats.totalCommands,
            examples: [
              'new My Epic Tale - create new document',
              'save - save current document',
              'search dragon - find documents containing "dragon"',
              'theme dark - switch to dark theme',
              'help search - get help for search command'
            ]
          }
        }
      }
    },

    // Tag Management
    {
      name: 'tag',
      description: 'manage tags',
      category: 'document',
      icon: '🏷️',
      parameters: [
        { name: 'action', required: true, type: 'string', description: 'Action: add, remove, list' },
        { name: 'tag', required: false, type: 'string', description: 'Tag name' }
      ],
      handler: async (args) => {
        const action = args[0]
        const tagName = args[1]
        const doc = app.currentDocument
        
        if (!doc) {
          return { success: false, message: 'No document currently open' }
        }
        
        if (!doc.tags) {
          doc.tags = []
        }
        
        switch (action) {
          case 'add':
            if (!tagName) {
              return { success: false, message: 'tag name required. Usage: tag add <tagname>' }
            }
            if (doc.tags.includes(tagName)) {
              return { success: false, message: `Tag "${tagName}" already exists` }
            }
            doc.tags.push(tagName)
            await app.saveDocument()
            return { success: true, message: `Added tag "${tagName}"` }
            
          case 'remove':
            if (!tagName) {
              return { success: false, message: 'tag name required. Usage: tag remove <tagname>' }
            }
            const index = doc.tags.indexOf(tagName)
            if (index === -1) {
              return { success: false, message: `Tag "${tagName}" not found` }
            }
            doc.tags.splice(index, 1)
            await app.saveDocument()
            return { success: true, message: `Removed tag "${tagName}"` }
            
          case 'list':
            return {
              success: true,
              message: 'Document tags:',
              data: doc.tags
            }
            
          default:
            return {
              success: false,
              message: 'Unknown action. Use: add, remove, or list'
            }
        }
      }
    },

    // System Commands
    {
      name: 'reload',
      description: 'reload app',
      category: 'system',
      icon: '🔄',
      aliases: ['refresh'],
      handler: async () => {
        window.location.reload()
        return { success: true, message: 'Reloading application...' }
      }
    },

    {
      name: 'version',
      description: 'show version',
      category: 'info',
      icon: '🏷️',
      aliases: ['v'],
      handler: async () => {
        return {
          success: true,
          message: 'Fantasy Editor v1.0.0',
          data: {
            version: '1.0.0',
            build: 'development',
            features: ['PWA', 'Offline Storage', 'Multi-theme', 'Command Palette']
          }
        }
      }
    }
  ]

  // Register all commands
  registry.registerCommands(commands)

  // Add command execution event listener for feedback
  document.addEventListener('commandregistry:execute', (event) => {
    const { result } = event.detail
    if (result && result.message) {
      app.showNotification(result.message, result.success ? 'success' : 'error')
    }
  })

  document.addEventListener('commandregistry:error', (event) => {
    const { error } = event.detail
    app.showNotification(error, 'error')
  })
}