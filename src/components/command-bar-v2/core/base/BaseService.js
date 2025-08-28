/**
 * BaseService - Base class for all service classes
 * Provides common functionality for service lifecycle, configuration, and event handling
 */

import { EventBus } from '../EventBus.js'

/**
 * Base service class with lifecycle and configuration management
 * @abstract
 */
export class BaseService {
  /**
   * @param {Object} config - Service configuration
   * @param {EventBus} config.eventBus - Event bus instance
   * @param {Object} config.options - Service options
   * @param {string} config.name - Service name
   */
  constructor(config = {}) {
    if (this.constructor === BaseService) {
      throw new Error('BaseService is abstract and cannot be instantiated directly')
    }

    // Core dependencies
    this.eventBus = config.eventBus || new EventBus()
    
    // Service identity
    this.name = config.name || this.constructor.name.toLowerCase()
    this.id = this.generateId()
    
    // Service state
    this.options = { ...this.getDefaultOptions(), ...(config.options || {}) }
    this.state = this.getInitialState()
    this.isInitialized = false
    this.isDestroyed = false
    
    // Performance tracking
    this.metrics = {
      createdAt: new Date(),
      operationCount: 0,
      errorCount: 0,
      lastOperation: null
    }
    
    // Cleanup tracking
    this.cleanupFunctions = []
    this.eventUnsubscribers = []
    this.timers = new Set()
    this.intervals = new Set()
    
    // Bind methods
    this.bindMethods()
  }

  /**
   * Get default service options
   * @returns {Object} Default options
   * @protected
   */
  getDefaultOptions() {
    return {
      enableMetrics: true,
      enableEvents: true,
      logLevel: 'info'
    }
  }

  /**
   * Get initial service state
   * @returns {Object} Initial state
   * @protected
   */
  getInitialState() {
    return {
      status: 'created',
      lastError: null
    }
  }

  /**
   * Bind service methods to maintain proper context
   * @protected
   */
  bindMethods() {
    // Override in subclasses to bind specific methods
  }

  /**
   * Initialize the service
   * @param {Object} initConfig - Initialization configuration
   * @returns {Promise<void>}
   */
  async initialize(initConfig = {}) {
    if (this.isInitialized || this.isDestroyed) {
      return
    }

    try {
      this.setState({ status: 'initializing' })
      this.log('info', 'Initializing service')

      // Apply initialization config
      if (initConfig.options) {
        this.updateOptions(initConfig.options)
      }

      // Validate configuration
      await this.validateConfiguration()

      // Setup event listeners
      if (this.options.enableEvents) {
        this.setupEvents()
      }

      // Perform service-specific initialization
      await this.onInitialize(initConfig)

      this.isInitialized = true
      this.setState({ status: 'ready' })
      this.emit('initialized', { service: this })
      this.log('info', 'Service initialized successfully')

    } catch (error) {
      this.setState({ status: 'error', lastError: error })
      this.incrementErrorCount()
      this.log('error', 'Failed to initialize service', error)
      this.emit('error', { error, phase: 'initialization' })
      throw error
    }
  }

  /**
   * Validate service configuration
   * @protected
   * @abstract
   */
  async validateConfiguration() {
    // Override in subclasses for specific validation
  }

  /**
   * Setup event listeners
   * @protected
   */
  setupEvents() {
    // Override in subclasses to add specific event listeners
  }

  /**
   * Service-specific initialization logic
   * @param {Object} initConfig - Initialization configuration
   * @protected
   */
  async onInitialize(initConfig) {
    // Override in subclasses for custom initialization
  }

  /**
   * Update service state
   * @param {Object} newState - New state values
   * @param {boolean} merge - Whether to merge with existing state
   */
  setState(newState, merge = true) {
    if (this.isDestroyed) return

    const oldState = { ...this.state }
    this.state = merge ? { ...this.state, ...newState } : newState

    this.onStateChange(oldState, this.state)
    this.emit('stateChanged', { oldState, newState: this.state })
  }

  /**
   * Get current service state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state }
  }

  /**
   * Handle state changes
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @protected
   */
  onStateChange(oldState, newState) {
    // Override in subclasses to handle state changes
  }

  /**
   * Update service options
   * @param {Object} newOptions - New option values
   * @param {boolean} merge - Whether to merge with existing options
   */
  updateOptions(newOptions, merge = true) {
    if (this.isDestroyed) return

    const oldOptions = { ...this.options }
    this.options = merge ? { ...this.options, ...newOptions } : newOptions

    this.onOptionsChange(oldOptions, this.options)
    this.emit('optionsChanged', { oldOptions, newOptions: this.options })
  }

  /**
   * Handle options changes
   * @param {Object} oldOptions - Previous options
   * @param {Object} newOptions - New options
   * @protected
   */
  onOptionsChange(oldOptions, newOptions) {
    // Override in subclasses to handle option changes
  }

  /**
   * Execute operation with error handling and metrics
   * @param {string} operationName - Name of the operation
   * @param {Function} operation - Operation function
   * @param {Object} context - Operation context
   * @returns {Promise<*>} Operation result
   * @protected
   */
  async executeOperation(operationName, operation, context = {}) {
    if (this.isDestroyed) {
      throw new Error(`Service ${this.name} is destroyed`)
    }

    const startTime = Date.now()
    this.incrementOperationCount()
    this.updateLastOperation(operationName)

    try {
      this.log('debug', `Starting operation: ${operationName}`, context)
      
      const result = await operation()
      
      const duration = Date.now() - startTime
      this.log('debug', `Completed operation: ${operationName} in ${duration}ms`)
      
      this.emit('operationCompleted', {
        name: operationName,
        duration,
        context,
        result
      })

      return result

    } catch (error) {
      const duration = Date.now() - startTime
      this.incrementErrorCount()
      this.log('error', `Operation failed: ${operationName} after ${duration}ms`, error)
      
      this.emit('operationFailed', {
        name: operationName,
        duration,
        context,
        error
      })

      throw error
    }
  }

  /**
   * Subscribe to service events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, options = {}) {
    const unsubscribe = this.eventBus.subscribe(`service:${event}`, handler, options)
    this.eventUnsubscribers.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Subscribe to service event once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    return this.on(event, handler, { once: true })
  }

  /**
   * Emit service event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @protected
   */
  emit(event, data = null) {
    if (!this.isDestroyed && this.options.enableEvents) {
      this.eventBus.emit(`service:${event}`, {
        service: this,
        serviceName: this.name,
        data,
        timestamp: new Date()
      })
    }
  }

  /**
   * Log message with service context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Additional data
   * @protected
   */
  log(level, message, data = null) {
    if (!this.shouldLog(level)) return

    const logData = {
      service: this.name,
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    }

    // Use console for now, can be extended to use proper logging service
    console[level] || console.log(`[${this.name.toUpperCase()}] ${message}`, data || '')
  }

  /**
   * Check if log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} Whether to log
   * @private
   */
  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    const currentLevel = levels[this.options.logLevel] || 1
    const messageLevel = levels[level] || 1
    return messageLevel >= currentLevel
  }

  /**
   * Set timeout with automatic cleanup
   * @param {Function} callback - Callback function
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timer ID
   * @protected
   */
  setTimeout(callback, delay) {
    const timerId = setTimeout(() => {
      this.timers.delete(timerId)
      callback()
    }, delay)
    
    this.timers.add(timerId)
    return timerId
  }

  /**
   * Set interval with automatic cleanup
   * @param {Function} callback - Callback function
   * @param {number} interval - Interval in milliseconds
   * @returns {number} Interval ID
   * @protected
   */
  setInterval(callback, interval) {
    const intervalId = setInterval(callback, interval)
    this.intervals.add(intervalId)
    return intervalId
  }

  /**
   * Clear timeout
   * @param {number} timerId - Timer ID
   * @protected
   */
  clearTimeout(timerId) {
    clearTimeout(timerId)
    this.timers.delete(timerId)
  }

  /**
   * Clear interval
   * @param {number} intervalId - Interval ID
   * @protected
   */
  clearInterval(intervalId) {
    clearInterval(intervalId)
    this.intervals.delete(intervalId)
  }

  /**
   * Add cleanup function
   * @param {Function} cleanup - Cleanup function
   * @protected
   */
  addCleanup(cleanup) {
    if (typeof cleanup === 'function') {
      this.cleanupFunctions.push(cleanup)
    }
  }

  /**
   * Generate unique service ID
   * @returns {string} Generated ID
   * @private
   */
  generateId() {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Increment operation counter
   * @private
   */
  incrementOperationCount() {
    if (this.options.enableMetrics) {
      this.metrics.operationCount++
    }
  }

  /**
   * Increment error counter
   * @private
   */
  incrementErrorCount() {
    if (this.options.enableMetrics) {
      this.metrics.errorCount++
    }
  }

  /**
   * Update last operation timestamp
   * @param {string} operationName - Operation name
   * @private
   */
  updateLastOperation(operationName) {
    if (this.options.enableMetrics) {
      this.metrics.lastOperation = {
        name: operationName,
        timestamp: new Date()
      }
    }
  }

  /**
   * Get service metrics
   * @returns {Object} Service metrics
   */
  getMetrics() {
    if (!this.options.enableMetrics) {
      return null
    }

    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.createdAt.getTime(),
      errorRate: this.metrics.operationCount > 0 
        ? this.metrics.errorCount / this.metrics.operationCount 
        : 0
    }
  }

  /**
   * Reset service metrics
   */
  resetMetrics() {
    if (this.options.enableMetrics) {
      this.metrics = {
        createdAt: new Date(),
        operationCount: 0,
        errorCount: 0,
        lastOperation: null
      }
    }
  }

  /**
   * Get service information for debugging
   * @returns {Object} Service information
   */
  getDebugInfo() {
    return {
      name: this.name,
      id: this.id,
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed,
      state: this.getState(),
      options: { ...this.options },
      metrics: this.getMetrics(),
      cleanupCount: this.cleanupFunctions.length,
      eventSubscriberCount: this.eventUnsubscribers.length,
      activeTimers: this.timers.size,
      activeIntervals: this.intervals.size
    }
  }

  /**
   * Check if service is ready
   * @returns {boolean} Whether service is ready
   */
  isReady() {
    return this.isInitialized && !this.isDestroyed && this.state.status === 'ready'
  }

  /**
   * Destroy the service and clean up all resources
   */
  destroy() {
    if (this.isDestroyed) return

    try {
      this.setState({ status: 'destroying' })
      this.log('info', 'Destroying service')

      // Emit destroy event before cleanup
      this.emit('destroying')

      // Service-specific cleanup
      this.onDestroy()

      // Clear all timers and intervals
      this.timers.forEach(timerId => clearTimeout(timerId))
      this.intervals.forEach(intervalId => clearInterval(intervalId))

      // Unsubscribe from all events
      this.eventUnsubscribers.forEach(unsubscribe => {
        try {
          unsubscribe()
        } catch (error) {
          this.log('warn', 'Error during event unsubscribe', error)
        }
      })

      // Run all cleanup functions
      this.cleanupFunctions.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          this.log('warn', 'Error during service cleanup', error)
        }
      })

      // Clear all references
      this.cleanupFunctions = []
      this.eventUnsubscribers = []
      this.timers.clear()
      this.intervals.clear()
      this.eventBus = null

      this.isDestroyed = true
      this.log('info', 'Service destroyed successfully')

    } catch (error) {
      this.log('error', 'Error destroying service', error)
    }
  }

  /**
   * Service-specific cleanup logic
   * @protected
   */
  onDestroy() {
    // Override in subclasses for custom cleanup
  }
}