/**
 * CommandRegistry - Central registry for all editor commands
 * Handles command registration, parsing, execution, and fuzzy search
 */
export class CommandRegistry {
  constructor() {
    this.commands = new Map()
    this.aliases = new Map()
    this.categories = new Map()
    this.history = []
    this.maxHistoryLength = 50
  }

  /**
   * Register a new command
   * @param {Object} command Command definition
   */
  registerCommand(command) {
    const {
      name,
      description,
      category = 'general',
      icon = '⚡',
      shortcut = '',
      aliases = [],
      parameters = [],
      handler,
      condition = () => true
    } = command

    if (!name || !handler) {
      throw new Error('Command must have name and handler')
    }

    const commandDef = {
      name,
      description: description || `Execute ${name}`,
      category,
      icon,
      shortcut,
      aliases,
      parameters,
      handler,
      condition,
      registeredAt: new Date()
    }

    // Register main command
    this.commands.set(name, commandDef)

    // Register aliases
    aliases.forEach((alias) => {
      this.aliases.set(alias, name)
    })

    // Add to category
    if (!this.categories.has(category)) {
      this.categories.set(category, [])
    }
    this.categories.get(category).push(name)
  }

  /**
   * Register multiple commands at once
   * @param {Array} commands Array of command definitions
   */
  registerCommands(commands) {
    commands.forEach((command) => this.registerCommand(command))
  }

  /**
   * Unregister a command
   * @param {string} name Command name
   */
  unregisterCommand(name) {
    const command = this.commands.get(name)
    if (!command) return false

    // Remove from commands
    this.commands.delete(name)

    // Remove aliases
    command.aliases.forEach((alias) => {
      this.aliases.delete(alias)
    })

    // Remove from category
    const categoryCommands = this.categories.get(command.category)
    if (categoryCommands) {
      const index = categoryCommands.indexOf(name)
      if (index > -1) {
        categoryCommands.splice(index, 1)
      }
    }

    return true
  }

  /**
   * Get command by name or alias
   * @param {string} name Command name or alias
   * @returns {Object|null} Command definition
   */
  getCommand(name) {
    // Check if it's an alias first
    const actualName = this.aliases.get(name) || name
    return this.commands.get(actualName) || null
  }

  /**
   * Get all commands
   * @returns {Array} Array of all command definitions
   */
  getAllCommands() {
    return Array.from(this.commands.values())
      .filter((command) => command.condition())
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get commands by category
   * @param {string} category Category name
   * @returns {Array} Array of command definitions
   */
  getCommandsByCategory(category) {
    const commandNames = this.categories.get(category) || []
    return commandNames
      .map((name) => this.commands.get(name))
      .filter((command) => command && command.condition())
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Search commands with fuzzy matching
   * @param {string} query Search query
   * @returns {Array} Array of matching commands sorted by relevance
   */
  searchCommands(query) {
    if (!query.trim()) {
      return this.getAllCommands().slice(0, 10)
    }

    const isColonShortcut = query.startsWith(':')
    let searchQuery = query.toLowerCase()

    // If it's a colon shortcut with parameters, extract just the command part
    if (isColonShortcut) {
      // Parse the query to extract the command part (before the first space)
      const parsed = this.parseCommand(query)
      if (parsed.name) {
        // Use the parsed command name for searching
        searchQuery = parsed.name.toLowerCase()
      }
    }

    const results = []

    // For colon shortcuts, prioritize exact alias matches
    if (isColonShortcut) {
      for (const command of this.commands.values()) {
        if (!command.condition()) continue

        // Check if any alias matches exactly
        if (command.aliases && command.aliases.includes(searchQuery)) {
          results.push({ ...command, matchScore: 2000 }) // Highest priority for exact colon match
        } else {
          const score = this.calculateMatchScore(command, searchQuery, isColonShortcut)
          if (score > 0) {
            results.push({ ...command, matchScore: score })
          }
        }
      }
    } else {
      for (const command of this.commands.values()) {
        if (!command.condition()) continue

        const score = this.calculateMatchScore(command, searchQuery, isColonShortcut)
        if (score > 0) {
          results.push({ ...command, matchScore: score })
        }
      }
    }

    return results
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)
      .map(({ matchScore, ...command }) => command)
  }

  /**
   * Calculate match score for fuzzy search
   * @param {Object} command Command definition
   * @param {string} query Normalized search query
   * @returns {number} Match score (0 = no match, higher = better match)
   */
  calculateMatchScore(command, query, isColonShortcut = false) {
    let score = 0

    const name = command.name.toLowerCase()
    const description = command.description.toLowerCase()
    const category = command.category.toLowerCase()

    // For colon shortcuts, only match if it's actually a colon shortcut
    if (isColonShortcut) {
      // Check aliases for colon shortcuts
      if (command.aliases && command.aliases.some((alias) => alias.toLowerCase() === query)) {
        score += 1500
      }
      return score // For colon shortcuts, only return score if alias matches
    }

    // Exact name match
    if (name === query) {
      score += 1000
    }
    // Name starts with query
    else if (name.startsWith(query)) {
      score += 800
    }
    // Name contains query
    else if (name.includes(query)) {
      score += 600
    }

    // Check if query matches individual words in multi-word commands
    const nameWords = name.split(/\s+/)
    const queryWords = query.split(/\s+/)

    // Boost score for matching multiple words
    if (queryWords.length > 1 && nameWords.length > 1) {
      const matchingWords = queryWords.filter((qWord) =>
        nameWords.some((nWord) => nWord.startsWith(qWord))
      )
      if (matchingWords.length === queryWords.length) {
        score += 750 // High score for matching all query words
      } else if (matchingWords.length > 0) {
        score += 400 + matchingWords.length * 100
      }
    }

    // Check for partial word matches in command name
    const firstWord = nameWords[0]
    if (firstWord && firstWord.startsWith(query)) {
      score += 550
    }

    // Check aliases
    for (const alias of command.aliases) {
      const aliasLower = alias.toLowerCase()
      if (aliasLower === query) {
        score += 900
      } else if (aliasLower.startsWith(query)) {
        score += 700
      } else if (aliasLower.includes(query)) {
        score += 500
      }
    }

    // Description match
    if (description.includes(query)) {
      score += 200
    }

    // Category match
    if (category.includes(query)) {
      score += 100
    }

    // Fuzzy matching for partial queries
    if (score === 0 && query.length >= 2) {
      if (this.fuzzyMatch(name, query)) {
        score += 300
      } else if (this.fuzzyMatch(description, query)) {
        score += 100
      }
    }

    return score
  }

  /**
   * Simple fuzzy matching algorithm
   * @param {string} text Text to search in
   * @param {string} query Query to match
   * @returns {boolean} Whether query fuzzy matches text
   */
  fuzzyMatch(text, query) {
    let textIndex = 0
    let queryIndex = 0

    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex].toLowerCase() === query[queryIndex].toLowerCase()) {
        queryIndex++
      }
      textIndex++
    }

    return queryIndex === query.length
  }

  /**
   * Parse command input into command name and arguments
   * @param {string} input Raw command input
   * @returns {Object} Parsed command object
   */
  parseCommand(input) {
    const trimmed = input.trim()

    // Try to find the longest matching command name (including multi-word commands)
    const allCommandNames = [
      ...Array.from(this.commands.keys()),
      ...Array.from(this.aliases.keys())
    ].sort((a, b) => b.length - a.length) // Sort by length desc to match longest first

    let commandName = ''
    let args = []

    // Find the longest command name that matches the beginning of input
    for (const cmdName of allCommandNames) {
      if (trimmed.toLowerCase().startsWith(cmdName.toLowerCase())) {
        const remainder = trimmed.slice(cmdName.length).trim()
        if (remainder === '' || remainder.startsWith(' ')) {
          commandName = cmdName
          args = remainder ? remainder.split(/\s+/) : []
          break
        }
      }
    }

    // Fallback to original parsing if no multi-word command found
    if (!commandName) {
      const parts = trimmed.split(/\s+/)
      commandName = parts[0] || ''
      args = parts.slice(1)
    }

    return {
      name: commandName,
      args,
      rawInput: input,
      cleanInput: trimmed
    }
  }

  /**
   * Execute a command by input string
   * @param {string} input Command input string
   * @returns {Promise} Command execution result
   */
  async executeCommand(input) {
    try {
      const parsed = this.parseCommand(input)
      const command = this.getCommand(parsed.name)

      if (!command) {
        throw new Error(`Command "${parsed.name}" not found`)
      }

      if (!command.condition()) {
        throw new Error(`Command "${parsed.name}" is not available in current context`)
      }

      // Validate parameters if defined
      if (command.parameters.length > 0) {
        this.validateParameters(command, parsed.args)
      }

      // Add to history
      this.addToHistory(input)

      // Execute command
      const result = await command.handler(parsed.args, parsed)

      // Dispatch execution event
      this.dispatchEvent('execute', { command, args: parsed.args, result })

      return result
    } catch (error) {
      // Dispatch error event
      this.dispatchEvent('error', { input, error: error.message })
      throw error
    }
  }

  /**
   * Validate command parameters
   * @param {Object} command Command definition
   * @param {Array} args Provided arguments
   */
  validateParameters(command, args) {
    const required = command.parameters.filter((p) => p.required)

    if (args.length < required.length) {
      const missing = required.slice(args.length).map((p) => p.name)
      throw new Error(`Missing required parameters: ${missing.join(', ')}`)
    }

    // Validate parameter types if specified
    command.parameters.forEach((param, index) => {
      const value = args[index]
      if (value !== undefined && param.type) {
        if (!this.validateParameterType(value, param.type)) {
          throw new Error(`Parameter "${param.name}" must be of type ${param.type}`)
        }
      }
    })
  }

  /**
   * Validate parameter type
   * @param {string} value Parameter value
   * @param {string} type Expected type
   * @returns {boolean} Whether value matches type
   */
  validateParameterType(value, type) {
    switch (type) {
      case 'number':
        return !isNaN(Number(value))
      case 'boolean':
        return ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())
      case 'string':
        return typeof value === 'string'
      default:
        return true
    }
  }

  /**
   * Add command to execution history
   * @param {string} input Command input
   */
  addToHistory(input) {
    // Remove if already exists to move to front
    const existingIndex = this.history.indexOf(input)
    if (existingIndex > -1) {
      this.history.splice(existingIndex, 1)
    }

    // Add to front
    this.history.unshift(input)

    // Limit history size
    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(0, this.maxHistoryLength)
    }
  }

  /**
   * Get command execution history
   * @returns {Array} Command history
   */
  getHistory() {
    return [...this.history]
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.history = []
  }

  /**
   * Get all categories
   * @returns {Array} Array of category names
   */
  getCategories() {
    return Array.from(this.categories.keys()).sort()
  }

  /**
   * Check if command exists
   * @param {string} name Command name or alias
   * @returns {boolean} Whether command exists
   */
  hasCommand(name) {
    const actualName = this.aliases.get(name) || name
    return this.commands.has(actualName)
  }

  /**
   * Dispatch custom events
   * @param {string} type Event type
   * @param {Object} detail Event detail
   */
  dispatchEvent(type, detail = {}) {
    const event = new CustomEvent(`commandregistry:${type}`, { detail })
    document.dispatchEvent(event)
  }

  /**
   * Get command count
   * @returns {number} Total number of registered commands
   */
  getCommandCount() {
    return this.commands.size
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    return {
      totalCommands: this.commands.size,
      totalAliases: this.aliases.size,
      totalCategories: this.categories.size,
      historyLength: this.history.length,
      availableCommands: this.getAllCommands().length
    }
  }
}
