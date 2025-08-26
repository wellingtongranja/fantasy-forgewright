/**
 * AboutMenu - Handles About, Help, and Legal command organization
 * Provides structured access to information, legal, and help commands
 */

export class AboutMenu {
  constructor(commandRegistry) {
    this.commandRegistry = commandRegistry
    this.initializeAboutCommands()
  }

  /**
   * Initialize and organize about/help commands
   */
  initializeAboutCommands() {
    // This method will be called to reorganize existing legal commands
    // into the about category with proper subcategories
    this.reorganizeLegalCommands()
  }

  /**
   * Reorganize legal commands into about category with subcategories
   */
  reorganizeLegalCommands() {
    // Get existing legal commands
    const legalCommands = this.commandRegistry.getCommandsByCategory('legal')
    const infoCommands = this.commandRegistry.getCommandsByCategory('info')
    
    // Update their categories to 'about'
    legalCommands.forEach(command => {
      if (command.name.includes('license') || command.name.includes('commercial') || command.name.includes('eula')) {
        this.updateCommandCategory(command.name, 'about')
      }
    })

    // Update info commands that should be in about
    infoCommands.forEach(command => {
      if (command.name.includes('edition')) {
        this.updateCommandCategory(command.name, 'about')
      }
    })
  }

  /**
   * Update command category
   * @param {string} commandName Name of command to update
   * @param {string} newCategory New category for the command
   */
  updateCommandCategory(commandName, newCategory) {
    const command = this.commandRegistry.getCommand(commandName)
    if (command) {
      // Remove from old category
      const oldCategory = command.category
      if (oldCategory && this.commandRegistry.categories.has(oldCategory)) {
        const categoryCommands = this.commandRegistry.categories.get(oldCategory)
        const index = categoryCommands.indexOf(commandName)
        if (index > -1) {
          categoryCommands.splice(index, 1)
        }
      }

      // Update command category
      command.category = newCategory

      // Add to new category
      if (!this.commandRegistry.categories.has(newCategory)) {
        this.commandRegistry.categories.set(newCategory, [])
      }
      this.commandRegistry.categories.get(newCategory).push(commandName)
    }
  }

  /**
   * Get about commands grouped by subcategory
   * @returns {Object} Grouped about commands
   */
  getAboutCommands() {
    const aboutCommands = this.commandRegistry.getCommandsByCategory('about')
    
    const grouped = {
      application: {
        title: 'Application',
        icon: 'ℹ️',
        commands: []
      },
      legal: {
        title: 'Legal & Licensing',
        icon: '⚖️', 
        commands: []
      },
      help: {
        title: 'Help & Support',
        icon: '❓',
        commands: []
      }
    }

    aboutCommands.forEach(command => {
      if (command.name.includes('edition') || command.name.includes('version') || command.name.includes('about')) {
        grouped.application.commands.push(command)
      } else if (command.name.includes('license') || command.name.includes('commercial') || command.name.includes('eula')) {
        grouped.legal.commands.push(command)
      } else if (command.name.includes('help') || command.name.includes('support') || command.name.includes('guide')) {
        grouped.help.commands.push(command)
      } else {
        // Default to application
        grouped.application.commands.push(command)
      }
    })

    return grouped
  }

  /**
   * Get about menu display structure for UI
   * @returns {Array} Menu structure for rendering
   */
  getAboutMenuStructure() {
    const grouped = this.getAboutCommands()
    
    return Object.keys(grouped).map(key => ({
      key,
      title: grouped[key].title,
      icon: grouped[key].icon,
      commands: grouped[key].commands,
      isEmpty: grouped[key].commands.length === 0
    })).filter(section => !section.isEmpty)
  }

  /**
   * Search within about commands
   * @param {string} query Search query
   * @returns {Array} Matching about commands
   */
  searchAboutCommands(query) {
    const aboutCommands = this.commandRegistry.getCommandsByCategory('about')
    
    if (!query || !query.trim()) {
      return aboutCommands
    }

    return this.commandRegistry.searchCommands(query)
      .filter(command => command.category === 'about')
  }

  /**
   * Add new about command
   * @param {Object} commandDef Command definition
   * @param {string} subcategory Subcategory (application, legal, help)
   */
  addAboutCommand(commandDef, subcategory = 'application') {
    const command = {
      ...commandDef,
      category: 'about',
      subcategory: subcategory
    }

    this.commandRegistry.registerCommand(command)
  }

  /**
   * Get command counts by subcategory
   * @returns {Object} Counts for each subcategory
   */
  getAboutCommandCounts() {
    const grouped = this.getAboutCommands()
    
    return {
      total: this.commandRegistry.getCommandsByCategory('about').length,
      application: grouped.application.commands.length,
      legal: grouped.legal.commands.length,
      help: grouped.help.commands.length
    }
  }

  /**
   * Check if a command belongs to about category
   * @param {string} commandName Command name to check
   * @returns {boolean} Whether command is an about command
   */
  isAboutCommand(commandName) {
    const command = this.commandRegistry.getCommand(commandName)
    return command && command.category === 'about'
  }

  /**
   * Get subcategory for an about command
   * @param {string} commandName Command name
   * @returns {string} Subcategory name
   */
  getCommandSubcategory(commandName) {
    const command = this.commandRegistry.getCommand(commandName)
    
    if (!command || command.category !== 'about') {
      return null
    }

    if (command.subcategory) {
      return command.subcategory
    }

    // Infer subcategory from command name
    if (command.name.includes('edition') || command.name.includes('version') || command.name.includes('about')) {
      return 'application'
    } else if (command.name.includes('license') || command.name.includes('commercial') || command.name.includes('eula')) {
      return 'legal'
    } else if (command.name.includes('help') || command.name.includes('support') || command.name.includes('guide')) {
      return 'help'
    }

    return 'application'
  }

  /**
   * Initialize default about commands if not present
   */
  initializeDefaultAboutCommands() {
    const existingCommands = this.commandRegistry.getCommandsByCategory('about')
    
    // Add basic about command if not present
    if (!existingCommands.some(cmd => cmd.name === 'about')) {
      this.addAboutCommand({
        name: 'about',
        description: 'About Fantasy Editor',
        icon: 'ℹ️',
        aliases: [':about'],
        handler: async () => {
          return {
            success: true,
            message: 'Fantasy Editor - A distraction-free markdown editor for fantasy writers',
            data: [
              'Version: Community Edition',
              'License: AGPL v3',
              'Website: https://fantasy-editor.com',
              'Use ":help" for commands or ":license" for legal information'
            ]
          }
        }
      }, 'application')
    }

    // Add help command if not present
    if (!existingCommands.some(cmd => cmd.name === 'help')) {
      this.addAboutCommand({
        name: 'help',
        description: 'Show help and available commands',
        icon: '❓',
        aliases: [':help', ':?'],
        handler: async () => {
          const allCommands = this.commandRegistry.getAllCommands()
          const categories = {}
          
          allCommands.forEach(cmd => {
            const category = cmd.category || 'general'
            if (!categories[category]) {
              categories[category] = []
            }
            categories[category].push(`${cmd.aliases?.[0] || cmd.name}: ${cmd.description}`)
          })

          return {
            success: true,
            message: 'Available Commands:',
            data: Object.keys(categories).flatMap(cat => [
              `\n${cat.toUpperCase()}:`,
              ...categories[cat]
            ])
          }
        }
      }, 'help')
    }
  }
}