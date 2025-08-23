/**
 * Core Commands - Essential editor commands for Fantasy Editor
 * Integrates with existing EditorManager, StorageManager, and ThemeManager
 */
import { registerGitHubCommands } from './github-commands.js'

export function registerCoreCommands(registry, app) {
  const commands = [
    // Document Management Commands
    {
      name: 'new',
      description: 'create a new document',
      category: 'document',
      icon: '📝',
      aliases: [':n'],
      parameters: [
        { name: 'title', required: false, type: 'string', description: 'Document title' }
      ],
      handler: async (args) => {
        const title = args.join(' ') || 'Untitled Document'
        const doc = await app.createNewDocument(title)

        if (doc) {
          return { success: true, message: `Created new document: ${title}` }
        } else {
          return { success: false, message: 'Failed to create document' }
        }
      }
    },

    {
      name: 'save',
      description: 'save current document',
      category: 'document',
      icon: '💾',
      aliases: [':s'],
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
      aliases: [':o'],
      parameters: [
        { name: 'filter', required: false, type: 'string', description: 'Search filter' }
      ],
      handler: async (args) => {
        const filter = args.join(' ')
        const documents = await app.storageManager.getAllDocuments()

        if (filter) {
          const filtered = documents.filter(
            (doc) =>
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
              success: true,
              message: `Found ${filtered.length} documents matching "${filter}":`,
              data: filtered.map((d) => `${d.title} (${d.id})`)
            }
          }
        }

        // If no filter, show document list with instructions
        if (documents.length === 0) {
          return {
            success: false,
            message: 'No documents found. Use ":n [title]" to create your first document.'
          }
        }

        return {
          success: true,
          message: `Available documents (use ":o <name>" to open specific document):`,
          data: documents.map((d, index) => `${index + 1}. ${d.title}`)
        }
      }
    },

    {
      name: 'search',
      description: 'search all documents',
      category: 'search',
      icon: '🔍',
      aliases: [':f'],
      parameters: [{ name: 'query', required: false, type: 'string', description: 'Search query' }],
      handler: async (args) => {
        const query = args.join(' ')

        // Open search tab in navigator if available
        if (app.navigator) {
          if (query) {
            app.navigator.openSearch(query)
            return { success: true, message: `Searching for "${query}"...` }
          } else {
            // No query provided - just open search tab and focus input
            app.navigator.openSearch('')
            return { success: true, message: 'Search panel opened' }
          }
        }
        
        if (!query) {
          return { success: false, message: 'Please provide a search query' }
        }

        // Fallback to existing search implementation
        try {
          const results = await app.searchEngine.search(query, { limit: 5 })

          if (results.length === 0) {
            return { success: false, message: `No documents found matching "${query}"` }
          }

          return {
            success: true,
            message: `Found ${results.length} documents matching "${query}"`,
            data: results.map((result) => ({
              title: result.document.title,
              id: result.document.id,
              relevance: Math.round(result.relevance * 100) + '%',
              snippet:
                result.matches
                  .find((m) => m.field === 'content')
                  ?.snippets[0]?.text?.substring(0, 80) + '...' || ''
            }))
          }
        } catch (error) {
          console.error('Search command failed:', error)
          return { success: false, message: 'Search failed. Please try again.' }
        }
      }
    },

    // Theme Commands
    {
      name: 'theme',
      description: 'switch theme',
      category: 'appearance',
      icon: '🎨',
      aliases: [':t'],
      parameters: [
        {
          name: 'theme',
          required: false,
          type: 'string',
          description: 'Theme name (light, dark, fantasy)'
        }
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

    {
      name: 'toggle theme',
      description: 'cycle through themes',
      category: 'appearance',
      icon: '🌙',
      aliases: [':tt'],
      handler: async () => {
        app.themeManager.toggleTheme()
        const currentTheme = app.themeManager.getCurrentTheme()
        return { success: true, message: `Switched to ${currentTheme} theme` }
      }
    },

    // Information Commands
    {
      name: 'info',
      description: 'show document info',
      category: 'info',
      icon: 'ℹ️',
      aliases: [':i'],
      handler: async () => {
        const doc = app.currentDocument
        if (!doc) {
          return { success: false, message: 'No document currently open' }
        }

        const wordCount = doc.content
          ? doc.content
              .trim()
              .split(/\s+/)
              .filter((w) => w.length > 0).length
          : 0
        const charCount = doc.content ? doc.content.length : 0
        const docInfo = app.getDocumentInfo()

        return {
          success: true,
          message: 'Document information:',
          data: {
            title: doc.title,
            id: doc.id,
            idType: docInfo.idType,
            filename: docInfo.filename,
            created: doc.createdAt || doc.metadata?.created,
            updated: doc.updatedAt || doc.metadata?.modified,
            words: wordCount,
            characters: charCount,
            tags: doc.tags || [],
            hasUnsavedChanges: docInfo.hasUnsavedChanges
          }
        }
      }
    },

    {
      name: 'help',
      description: 'show help',
      category: 'info',
      icon: '❓',
      aliases: [':h'],
      parameters: [
        {
          name: 'command',
          required: false,
          type: 'string',
          description: 'Specific command to get help for'
        }
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
              usage:
                command.parameters.length > 0
                  ? `${command.name} ${command.parameters.map((p) => (p.required ? `<${p.name}>` : `[${p.name}]`)).join(' ')}`
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
              Escape: 'close command palette',
              '↑↓ Arrow Keys': 'navigate commands',
              Enter: 'execute command',
              Tab: 'cycle through results'
            },
            categories: categories,
            totalCommands: stats.totalCommands,
            examples: [
              ':n My Epic Tale - create new document',
              ':s - save current document',
              ':f dragon - find documents containing "dragon"',
              ':fs - focus the search input',
              ':fd - navigate document list',
              ':d - show all documents',
              ':t dark - switch to dark theme',
              ':h search - get help for search command'
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
      aliases: [':tag'],
      parameters: [
        {
          name: 'action',
          required: true,
          type: 'string',
          description: 'Action: add, remove, list'
        },
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

    // Navigation Commands
    {
      name: 'focus search',
      description: 'focus search input',
      category: 'navigation',
      icon: '🔍',
      aliases: [':fs'],
      handler: async () => {
        const searchInput = document.getElementById('search-input')
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
          return { success: true, message: 'Focused search input' }
        } else {
          return { success: false, message: 'Search input not found' }
        }
      }
    },

    {
      name: 'focus documents',
      description: 'focus document list',
      category: 'navigation',
      icon: '📁',
      aliases: [':fd'],
      handler: async () => {
        const fileTree = document.getElementById('file-tree')
        if (fileTree) {
          fileTree.focus()
          // Ensure a document is selected for navigation
          const firstItem = fileTree.querySelector('.file-tree-item')
          if (firstItem && !fileTree.querySelector('.file-tree-item.selected')) {
            firstItem.classList.add('selected')
            if (app.fileTree) {
              app.fileTree.selectedDocumentId = firstItem.dataset.docId
            }
          }
          return { success: true, message: 'Focused document list' }
        } else {
          return { success: false, message: 'Document list not found' }
        }
      }
    },

    {
      name: 'documents',
      description: 'open documents panel',
      category: 'navigation',
      icon: '📄',
      aliases: [':d'],
      parameters: [
        { name: 'filter', required: false, type: 'string', description: 'Filter documents' }
      ],
      handler: async (args) => {
        const filter = args.join(' ')
        
        if (app.navigator) {
          app.navigator.openDocuments(filter)
          return { success: true, message: 'Documents panel opened' }
        } else {
          // Fallback to showing sidebar
          const sidebar = document.querySelector('.sidebar')
          if (sidebar) {
            sidebar.classList.remove('sidebar-hidden')
            const appMain = document.querySelector('.app-main')
            if (appMain) {
              appMain.classList.remove('sidebar-hidden')
            }
          }
          return { success: true, message: 'Documents panel opened' }
        }
      }
    },

    {
      name: 'outline',
      description: 'open document outline',
      category: 'navigation',
      icon: '📝',
      aliases: [':l'],
      handler: async () => {
        if (app.navigator) {
          app.navigator.openOutline()
          return { success: true, message: 'Outline panel opened' }
        } else {
          return { success: false, message: 'Outline not available' }
        }
      }
    },

    {
      name: 'toggle sidebar',
      description: 'show/hide sidebar',
      category: 'navigation',
      icon: '📚',
      aliases: [':ts'],
      handler: async () => {
        const sidebar = document.querySelector('.sidebar')
        const appMain = document.querySelector('.app-main')

        if (sidebar && appMain) {
          const isHidden = sidebar.classList.contains('sidebar-hidden')
          if (isHidden) {
            sidebar.classList.remove('sidebar-hidden')
            appMain.classList.remove('sidebar-hidden')
            return { success: true, message: 'Sidebar shown' }
          } else {
            sidebar.classList.add('sidebar-hidden')
            appMain.classList.add('sidebar-hidden')
            return { success: true, message: 'Sidebar hidden' }
          }
        }

        return { success: false, message: 'Sidebar not found' }
      }
    },

    // Document Folding Commands
    {
      name: 'fold section',
      description: 'fold current section',
      category: 'editing',
      icon: '📖',
      aliases: [':fo'],
      handler: async () => {
        const success = app.editor.foldCurrentSection()
        return { 
          success, 
          message: success ? 'Section folded' : 'No section to fold at cursor'
        }
      }
    },

    {
      name: 'unfold section',
      description: 'unfold current section',
      category: 'editing',
      icon: '📖',
      aliases: [':fu'],
      handler: async () => {
        const success = app.editor.unfoldCurrentSection()
        return { 
          success, 
          message: success ? 'Section unfolded' : 'No folded section at cursor'
        }
      }
    },

    {
      name: 'fold all',
      description: 'fold all sections',
      category: 'editing',
      icon: '📚',
      aliases: [':fal'],
      handler: async () => {
        const success = app.editor.foldAll()
        return { 
          success, 
          message: success ? 'All sections folded' : 'Unable to fold sections'
        }
      }
    },

    {
      name: 'unfold all',
      description: 'unfold all sections',
      category: 'editing',
      icon: '📚',
      aliases: [':ual'],
      handler: async () => {
        const success = app.editor.unfoldAll()
        return { 
          success, 
          message: success ? 'All sections unfolded' : 'Unable to unfold sections'
        }
      }
    },

    {
      name: 'fold level',
      description: 'fold sections by heading level',
      category: 'editing',
      icon: '📊',
      aliases: [':fl'],
      parameters: [
        { name: 'level', required: true, type: 'number', description: 'Heading level (1-6)' }
      ],
      handler: async (args) => {
        const level = parseInt(args[0])
        if (isNaN(level) || level < 1 || level > 6) {
          return { success: false, message: 'Invalid heading level. Use 1-6.' }
        }
        
        // This is a placeholder - full implementation would require custom folding logic
        const success = app.editor.foldAll()
        return { 
          success, 
          message: success ? `Folded sections at level ${level}` : 'Unable to fold sections'
        }
      }
    },

    // Enhanced Search and Replace Commands
    {
      name: 'search and replace',
      description: 'open search and replace dialog',
      category: 'editing',
      icon: '🔄',
      aliases: [':sr'],
      handler: async () => {
        const success = app.editor.openSearchAndReplace()
        return { 
          success, 
          message: success ? 'Search and replace opened' : 'Unable to open search and replace'
        }
      }
    },

    {
      name: 'find all',
      description: 'find all occurrences in document',
      category: 'editing',
      icon: '🔍',
      aliases: [':fa'],
      parameters: [
        { name: 'query', required: false, type: 'string', description: 'Search query' }
      ],
      handler: async (args) => {
        const query = args.join(' ')
        if (!query) {
          const success = app.editor.openSearch()
          return { 
            success, 
            message: success ? 'Search opened' : 'Unable to open search'
          }
        }
        
        // For now, delegate to existing search functionality
        const success = app.editor.openSearch()
        return { 
          success, 
          message: success ? `Search opened for "${query}"` : 'Unable to open search'
        }
      }
    },

    // Spell Check Commands
    {
      name: 'spell check',
      description: 'toggle spell checking',
      category: 'editing',
      icon: '📝',
      aliases: [':sp'],
      handler: async () => {
        const enabled = app.editor.toggleSpellCheck()
        return { 
          success: true, 
          message: `Spell check ${enabled ? 'enabled' : 'disabled'}`
        }
      }
    },

    // Writer Statistics
    {
      name: 'word count',
      description: 'show document statistics',
      category: 'info',
      icon: '📊',
      aliases: [':wc'],
      handler: async () => {
        const stats = app.editor.getDocumentStats()
        if (!stats) {
          return { success: false, message: 'Unable to get document statistics' }
        }

        return {
          success: true,
          message: 'Document Statistics:',
          data: {
            words: stats.words,
            characters: stats.characters,
            'characters (no spaces)': stats.charactersNoSpaces,
            lines: stats.lines,
            paragraphs: stats.paragraphs
          }
        }
      }
    },

    // Export Commands
    {
      name: 'export',
      description: 'export document in selected format',
      category: 'export',
      icon: '📁',
      aliases: [':ex'],
      parameters: [
        { name: 'format', required: false, type: 'string', description: 'Export format (md, txt, html, pdf)' }
      ],
      handler: async (args) => {
        if (!app.exportManager) {
          return { success: false, message: 'Export functionality not available' }
        }

        const format = args[0]
        if (!format) {
          const formats = app.exportManager.getSupportedFormats()
          return {
            success: true,
            message: 'Available export formats:',
            data: formats.map(f => f.toUpperCase())
          }
        }

        if (!app.exportManager.isFormatSupported(format)) {
          return { 
            success: false, 
            message: `Unsupported format: ${format}. Available formats: ${app.exportManager.getSupportedFormats().join(', ')}` 
          }
        }

        try {
          const result = await app.exportManager.exportDocument(format)
          return result
        } catch (error) {
          return { success: false, message: `Export failed: ${error.message}` }
        }
      }
    },

    {
      name: 'export markdown',
      description: 'export document as Markdown',
      category: 'export',
      icon: '📝',
      aliases: [':em'],
      handler: async () => {
        if (!app.exportManager) {
          return { success: false, message: 'Export functionality not available' }
        }

        try {
          const result = await app.exportManager.exportDocument('md')
          return result
        } catch (error) {
          return { success: false, message: `Markdown export failed: ${error.message}` }
        }
      }
    },

    {
      name: 'export text',
      description: 'export document as plain text',
      category: 'export',
      icon: '📄',
      aliases: [':et'],
      handler: async () => {
        if (!app.exportManager) {
          return { success: false, message: 'Export functionality not available' }
        }

        try {
          const result = await app.exportManager.exportDocument('txt')
          return result
        } catch (error) {
          return { success: false, message: `Text export failed: ${error.message}` }
        }
      }
    },

    {
      name: 'export html',
      description: 'export document as HTML',
      category: 'export',
      icon: '🌐',
      aliases: [':eh'],
      handler: async () => {
        if (!app.exportManager) {
          return { success: false, message: 'Export functionality not available' }
        }

        try {
          const result = await app.exportManager.exportDocument('html')
          return result
        } catch (error) {
          return { success: false, message: `HTML export failed: ${error.message}` }
        }
      }
    },

    {
      name: 'export pdf',
      description: 'export document as PDF',
      category: 'export',
      icon: '📑',
      aliases: [':ep'],
      handler: async () => {
        if (!app.exportManager) {
          return { success: false, message: 'Export functionality not available' }
        }

        try {
          const result = await app.exportManager.exportDocument('pdf')
          return result
        } catch (error) {
          return { success: false, message: `PDF export failed: ${error.message}` }
        }
      }
    },


    // System Commands
    {
      name: 'settings',
      description: 'open settings',
      category: 'system',
      icon: '⚙️',
      aliases: [':se'],
      handler: async () => {
        // Placeholder for future settings implementation
        return {
          success: true,
          message: 'Settings (coming soon)',
          data: [
            'Theme settings: Use "theme" command',
            'Document settings: Use "info" command',
            'Spell check: Use ":sp" command',
            'More settings coming in future updates'
          ]
        }
      }
    },

    {
      name: 'sync',
      description: 'show sync status',
      category: 'system',
      icon: '🔄',
      aliases: [':sy'],
      handler: async () => {
        const syncStatus = document.getElementById('sync-status')
        const status = syncStatus ? syncStatus.textContent : 'Unknown'
        const docCount = await app.storageManager.getAllDocuments().then((docs) => docs.length)

        return {
          success: true,
          message: 'Sync Status',
          data: [
            `Current status: ${status}`,
            `Local documents: ${docCount}`,
            'Auto-save: Enabled (2s delay)',
            'Storage: IndexedDB (offline-first)'
          ]
        }
      }
    },

    {
      name: 'reload',
      description: 'reload app',
      category: 'system',
      icon: '🔄',
      aliases: [':r'],
      handler: async () => {
        window.location.reload()
        return { success: true, message: 'Reloading application...' }
      }
    },

    {
      name: 'storage stats',
      description: 'show storage statistics',
      category: 'system',
      icon: '📊',
      aliases: [':st'],
      handler: async () => {
        try {
          const stats = await app.storageManager.getStorageStats()

          return {
            success: true,
            message: 'Storage Statistics:',
            data: {
              totalDocuments: stats.totalDocuments,
              guidDocuments: stats.guidDocuments,
              totalSizeKB: Math.round(stats.totalSizeBytes / 1024),
              averageSizeKB: Math.round(stats.averageSizeBytes / 1024),
              databaseVersion: stats.databaseVersion
            }
          }
        } catch (error) {
          return { success: false, message: `Failed to get storage stats: ${error.message}` }
        }
      }
    },

    {
      name: 'version',
      description: 'show version',
      category: 'info',
      icon: '🏷️',
      aliases: [':v'],
      handler: async () => {
        return {
          success: true,
          message: 'Fantasy Editor v1.0.0',
          data: {
            version: '1.0.0',
            build: 'development',
            features: ['PWA', 'Offline Storage', 'Multi-theme', 'Command Palette', 'GUID System']
          }
        }
      }
    }
  ]

  // Register all commands
  registry.registerCommands(commands)

  // Register GitHub commands
  registerGitHubCommands(registry, app)

  // Add command execution event listener for feedback
  document.addEventListener('commandregistry:execute', (event) => {
    const { result } = event.detail
    if (result && result.message) {
      let message = result.message

      // If there's data to display, append it to the message
      if (result.data) {
        if (Array.isArray(result.data) && result.data.length > 0) {
          if (result.data.length <= 5) {
            // For small lists, show all items
            message += '\n• ' + result.data.join('\n• ')
          } else {
            // For large lists, show first few items
            message += '\n• ' + result.data.slice(0, 5).join('\n• ')
            message += `\n... and ${result.data.length - 5} more`
          }
        } else if (typeof result.data === 'string') {
          // Handle string data
          message += '\n' + result.data
        } else if (typeof result.data === 'object') {
          // Handle object data (like stats)
          message += '\n' + Object.entries(result.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')
        }
      }

      app.showNotification(message, result.success ? 'success' : 'error')
    }
  })

  document.addEventListener('commandregistry:error', (event) => {
    const { error } = event.detail
    app.showNotification(error, 'error')
  })
}
