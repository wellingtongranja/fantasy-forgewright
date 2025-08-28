/**
 * Command Interface - Defines the contract for all commands
 * Implements the Command pattern for encapsulating requests
 */

/**
 * Base Command class that all commands should extend
 * @abstract
 */
export class Command {
  /**
   * @param {Object} metadata - Command metadata
   * @param {string} metadata.id - Unique identifier
   * @param {string} metadata.name - Display name
   * @param {string} metadata.description - Description
   * @param {string} metadata.category - Category for grouping
   * @param {string[]} metadata.aliases - Alternative names/shortcuts
   * @param {string} metadata.icon - Icon representation
   * @param {Parameter[]} metadata.parameters - Expected parameters
   */
  constructor(metadata = {}) {
    if (this.constructor === Command) {
      throw new Error('Command is abstract and cannot be instantiated directly')
    }

    this.validateMetadata(metadata)
    
    this.id = metadata.id || this.generateId()
    this.name = metadata.name || ''
    this.description = metadata.description || ''
    this.category = metadata.category || 'general'
    this.aliases = Array.isArray(metadata.aliases) ? metadata.aliases : []
    this.icon = metadata.icon || '⚡'
    this.parameters = Array.isArray(metadata.parameters) ? metadata.parameters : []
    this.hidden = Boolean(metadata.hidden)
    this.enabled = metadata.enabled !== false
    this.priority = typeof metadata.priority === 'number' ? metadata.priority : 0
  }

  /**
   * Execute the command with given arguments
   * @param {string[]} args - Command arguments
   * @param {Object} context - Execution context
   * @returns {Promise<CommandResult>} Command execution result
   * @abstract
   */
  async execute(args = [], context = {}) {
    throw new Error('execute() must be implemented by subclass')
  }

  /**
   * Check if command can be executed in current context
   * @param {Object} context - Current context
   * @returns {boolean} Whether command can execute
   */
  canExecute(context = {}) {
    return this.enabled && !this.hidden
  }

  /**
   * Get command metadata
   * @returns {Object} Command metadata
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      aliases: [...this.aliases],
      icon: this.icon,
      parameters: this.parameters.map(p => ({ ...p })),
      hidden: this.hidden,
      enabled: this.enabled,
      priority: this.priority
    }
  }

  /**
   * Check if command matches query
   * @param {string} query - Search query
   * @returns {number} Match score (0 = no match, higher = better match)
   */
  matchesQuery(query) {
    if (!query || typeof query !== 'string') return 0

    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) return 0

    // Exact name match gets highest score
    if (this.name.toLowerCase() === normalizedQuery) return 100

    // Exact alias match gets high score
    for (const alias of this.aliases) {
      if (alias.toLowerCase() === normalizedQuery) return 90
    }

    // Name starts with query gets high score
    if (this.name.toLowerCase().startsWith(normalizedQuery)) return 80

    // Alias starts with query gets good score
    for (const alias of this.aliases) {
      if (alias.toLowerCase().startsWith(normalizedQuery)) return 70
    }

    // Name contains query gets medium score
    if (this.name.toLowerCase().includes(normalizedQuery)) return 60

    // Description contains query gets lower score
    if (this.description.toLowerCase().includes(normalizedQuery)) return 40

    // Alias contains query gets lower score
    for (const alias of this.aliases) {
      if (alias.toLowerCase().includes(normalizedQuery)) return 50
    }

    return 0
  }

  /**
   * Validate command metadata
   * @param {Object} metadata - Metadata to validate
   * @private
   */
  validateMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Command metadata must be an object')
    }

    if (metadata.name && typeof metadata.name !== 'string') {
      throw new Error('Command name must be a string')
    }

    if (metadata.description && typeof metadata.description !== 'string') {
      throw new Error('Command description must be a string')
    }

    if (metadata.category && typeof metadata.category !== 'string') {
      throw new Error('Command category must be a string')
    }

    if (metadata.aliases && !Array.isArray(metadata.aliases)) {
      throw new Error('Command aliases must be an array')
    }

    if (metadata.parameters && !Array.isArray(metadata.parameters)) {
      throw new Error('Command parameters must be an array')
    }
  }

  /**
   * Generate unique ID for command
   * @returns {string} Generated ID
   * @private
   */
  generateId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create a string representation
   * @returns {string} String representation
   */
  toString() {
    return `${this.constructor.name}(${this.name})`
  }
}

/**
 * Parameter definition for commands
 */
export class Parameter {
  /**
   * @param {Object} config - Parameter configuration
   * @param {string} config.name - Parameter name
   * @param {string} config.type - Parameter type (string, number, boolean, etc.)
   * @param {boolean} config.required - Whether parameter is required
   * @param {string} config.description - Parameter description
   * @param {*} config.defaultValue - Default value if not provided
   * @param {Function} config.validator - Validation function
   */
  constructor(config = {}) {
    this.name = config.name || ''
    this.type = config.type || 'string'
    this.required = Boolean(config.required)
    this.description = config.description || ''
    this.defaultValue = config.defaultValue
    this.validator = config.validator || null

    if (!this.name) {
      throw new Error('Parameter name is required')
    }
  }

  /**
   * Validate parameter value
   * @param {*} value - Value to validate
   * @returns {boolean} Whether value is valid
   */
  validate(value) {
    // Check required
    if (this.required && (value === undefined || value === null || value === '')) {
      return false
    }

    // Use custom validator if provided
    if (this.validator && typeof this.validator === 'function') {
      return this.validator(value)
    }

    // Basic type checking
    if (value !== undefined && value !== null) {
      switch (this.type) {
        case 'string':
          return typeof value === 'string'
        case 'number':
          return typeof value === 'number' && !isNaN(value)
        case 'boolean':
          return typeof value === 'boolean'
        case 'array':
          return Array.isArray(value)
        default:
          return true
      }
    }

    return true
  }

  /**
   * Get parameter metadata
   * @returns {Object} Parameter metadata
   */
  getMetadata() {
    return {
      name: this.name,
      type: this.type,
      required: this.required,
      description: this.description,
      defaultValue: this.defaultValue,
      hasValidator: typeof this.validator === 'function'
    }
  }
}

/**
 * Command execution result
 */
export class CommandResult {
  /**
   * @param {boolean} success - Whether execution was successful
   * @param {*} data - Result data
   * @param {string} message - Result message
   * @param {Error} error - Error if execution failed
   */
  constructor(success = true, data = null, message = '', error = null) {
    this.success = Boolean(success)
    this.data = data
    this.message = message || ''
    this.error = error
    this.timestamp = new Date()
  }

  /**
   * Create success result
   * @param {*} data - Result data
   * @param {string} message - Success message
   * @returns {CommandResult} Success result
   */
  static success(data = null, message = '') {
    return new CommandResult(true, data, message, null)
  }

  /**
   * Create failure result
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @returns {CommandResult} Failure result
   */
  static failure(message = '', error = null) {
    return new CommandResult(false, null, message, error)
  }
}