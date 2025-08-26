/**
 * CommandCategories - Organizes and groups commands into logical categories
 * Provides category-based filtering, searching, and display organization
 */

export class CommandCategories {
  constructor(commandRegistry) {
    this.commandRegistry = commandRegistry
    this.initializeCategoryConfig()
  }

  /**
   * Initialize category configuration with metadata
   */
  initializeCategoryConfig() {
    this.categoryConfig = {
      document: {
        name: 'Documents',
        icon: '📄',
        priority: 1,
        description: 'Document management and editing commands'
      },
      git: {
        name: 'Git',
        icon: '🔧',
        priority: 2,
        description: 'Version control and Git operations'
      },
      search: {
        name: 'Search',
        icon: '🔍',
        priority: 3,
        description: 'Search and navigation commands'
      },
      export: {
        name: 'Export',
        icon: '📤',
        priority: 4,
        description: 'Export and sharing commands'
      },
      preferences: {
        name: 'Preferences',
        icon: '⚙️',
        priority: 5,
        description: 'Settings and customization'
      },
      about: {
        name: 'About & Help',
        icon: 'ℹ️',
        priority: 10,
        description: 'Information, help, and legal'
      },
      general: {
        name: 'General',
        icon: '⚡',
        priority: 999,
        description: 'General commands'
      }
    }

    // Define category order based on priority
    this.categoryOrder = Object.keys(this.categoryConfig)
      .sort((a, b) => this.categoryConfig[a].priority - this.categoryConfig[b].priority)
  }

  /**
   * Group all commands by their categories
   * @returns {Object} Grouped commands by category
   */
  groupCommandsByCategory() {
    const commands = this.commandRegistry.getAllCommands()
    const grouped = {}

    commands.forEach(command => {
      const category = command.category || 'general'
      
      if (!grouped[category]) {
        const config = this.categoryConfig[category] || this.categoryConfig.general
        grouped[category] = {
          name: config.name,
          icon: config.icon,
          priority: config.priority,
          description: config.description,
          commands: []
        }
      }
      
      grouped[category].commands.push(command)
    })

    // Sort commands within each category
    Object.keys(grouped).forEach(categoryKey => {
      grouped[categoryKey].commands.sort((a, b) => a.name.localeCompare(b.name))
    })

    return grouped
  }

  /**
   * Get ordered categories based on priority
   * @returns {Array} Array of category keys in priority order
   */
  getOrderedCategories() {
    const grouped = this.groupCommandsByCategory()
    return this.categoryOrder.filter(categoryKey => grouped[categoryKey])
  }

  /**
   * Search commands within a specific category
   * @param {string} category Category to search in
   * @param {string} query Search query
   * @returns {Array} Array of matching commands
   */
  searchInCategory(category, query) {
    if (!this.isValidCategory(category)) {
      return []
    }

    const categoryCommands = this.commandRegistry.getCommandsByCategory(category)
    
    if (!query || !query.trim()) {
      return categoryCommands
    }

    return this.commandRegistry.searchCommands(query)
      .filter(command => (command.category || 'general') === category)
  }

  /**
   * Filter commands by multiple categories
   * @param {Array} categories Array of category names
   * @returns {Array} Array of commands in specified categories
   */
  filterByCategories(categories) {
    if (!Array.isArray(categories) || categories.length === 0) {
      return []
    }

    const allCommands = this.commandRegistry.getAllCommands()
    return allCommands.filter(command => {
      const commandCategory = command.category || 'general'
      return categories.includes(commandCategory)
    })
  }

  /**
   * Get statistics about categories and commands
   * @returns {Object} Category statistics
   */
  getCategoryStats() {
    const grouped = this.groupCommandsByCategory()
    const categoryCounts = {}
    let totalCommands = 0

    Object.keys(grouped).forEach(categoryKey => {
      const commandCount = grouped[categoryKey].commands.length
      categoryCounts[categoryKey] = commandCount
      totalCommands += commandCount
    })

    return {
      totalCategories: Object.keys(grouped).length,
      totalCommands,
      categoryCounts
    }
  }

  /**
   * Check if a category is valid
   * @param {string} category Category name to validate
   * @returns {boolean} Whether category is valid
   */
  isValidCategory(category) {
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return false
    }
    return this.categoryConfig.hasOwnProperty(category)
  }

  /**
   * Get display name for a category
   * @param {string} category Category key
   * @returns {string} Human-readable category name
   */
  getCategoryDisplayName(category) {
    const config = this.categoryConfig[category]
    return config ? config.name : 'General'
  }

  /**
   * Get icon for a category
   * @param {string} category Category key
   * @returns {string} Category icon
   */
  getCategoryIcon(category) {
    const config = this.categoryConfig[category]
    return config ? config.icon : '⚡'
  }

  /**
   * Get category description
   * @param {string} category Category key
   * @returns {string} Category description
   */
  getCategoryDescription(category) {
    const config = this.categoryConfig[category]
    return config ? config.description : 'General commands'
  }

  /**
   * Get category priority
   * @param {string} category Category key
   * @returns {number} Category priority (lower = higher priority)
   */
  getCategoryPriority(category) {
    const config = this.categoryConfig[category]
    return config ? config.priority : 999
  }

  /**
   * Add or update category configuration
   * @param {string} categoryKey Category key
   * @param {Object} config Category configuration
   */
  addCategory(categoryKey, config) {
    this.categoryConfig[categoryKey] = {
      name: config.name || categoryKey,
      icon: config.icon || '⚡',
      priority: config.priority || 999,
      description: config.description || `${config.name || categoryKey} commands`
    }

    // Update category order
    this.categoryOrder = Object.keys(this.categoryConfig)
      .sort((a, b) => this.categoryConfig[a].priority - this.categoryConfig[b].priority)
  }

  /**
   * Remove a category configuration
   * @param {string} categoryKey Category key to remove
   */
  removeCategory(categoryKey) {
    if (categoryKey !== 'general' && this.categoryConfig[categoryKey]) {
      delete this.categoryConfig[categoryKey]
      
      // Update category order
      this.categoryOrder = Object.keys(this.categoryConfig)
        .sort((a, b) => this.categoryConfig[a].priority - this.categoryConfig[b].priority)
    }
  }

  /**
   * Get all category configurations
   * @returns {Object} All category configurations
   */
  getAllCategoryConfigs() {
    return { ...this.categoryConfig }
  }
}