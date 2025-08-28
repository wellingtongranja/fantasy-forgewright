/**
 * BaseComponent - Base class for all UI components
 * Provides common functionality for component lifecycle, events, and DOM management
 */

import { EventBus } from '../EventBus.js'
import { DOMAdapter } from '../DOMAdapter.js'

/**
 * Base component class with lifecycle management
 * @abstract
 */
export class BaseComponent {
  /**
   * @param {Object} config - Component configuration
   * @param {EventBus} config.eventBus - Event bus instance
   * @param {DOMAdapter} config.domAdapter - DOM adapter instance
   * @param {HTMLElement} config.container - Container element
   * @param {Object} config.options - Component options
   */
  constructor(config = {}) {
    if (this.constructor === BaseComponent) {
      throw new Error('BaseComponent is abstract and cannot be instantiated directly')
    }

    // Core dependencies
    this.eventBus = config.eventBus || new EventBus()
    this.domAdapter = config.domAdapter || new DOMAdapter()
    
    // DOM references
    this.container = config.container || null
    this.element = null
    
    // Component state
    this.options = { ...this.getDefaultOptions(), ...(config.options || {}) }
    this.state = this.getInitialState()
    this.isInitialized = false
    this.isDestroyed = false
    
    // Cleanup tracking
    this.cleanupFunctions = []
    this.eventUnsubscribers = []
    this.observerCleanups = []
    
    // Bind methods to maintain context
    this.bindMethods()
  }

  /**
   * Get default component options
   * @returns {Object} Default options
   * @protected
   */
  getDefaultOptions() {
    return {
      className: 'base-component',
      autoInitialize: true,
      enableEvents: true
    }
  }

  /**
   * Get initial component state
   * @returns {Object} Initial state
   * @protected
   */
  getInitialState() {
    return {
      visible: false,
      enabled: true,
      loading: false
    }
  }

  /**
   * Bind component methods to maintain proper context
   * @protected
   */
  bindMethods() {
    // Override in subclasses to bind specific methods
  }

  /**
   * Initialize the component
   * @param {HTMLElement} container - Container element
   * @returns {Promise<void>}
   */
  async initialize(container = null) {
    if (this.isInitialized || this.isDestroyed) {
      return
    }

    try {
      // Set container if provided
      if (container) {
        this.container = container
      }

      // Validate container
      this.validateContainer()

      // Create DOM structure
      await this.createDOM()

      // Setup event listeners
      if (this.options.enableEvents) {
        this.setupEvents()
      }

      // Perform component-specific initialization
      await this.onInitialize()

      this.isInitialized = true
      this.emit('initialized', { component: this })

    } catch (error) {
      console.error(`Failed to initialize ${this.constructor.name}:`, error)
      this.emit('error', { error, phase: 'initialization' })
      throw error
    }
  }

  /**
   * Create DOM structure for the component
   * @protected
   * @abstract
   */
  async createDOM() {
    throw new Error('createDOM() must be implemented by subclass')
  }

  /**
   * Setup event listeners
   * @protected
   */
  setupEvents() {
    // Override in subclasses to add specific event listeners
  }

  /**
   * Component-specific initialization logic
   * @protected
   */
  async onInitialize() {
    // Override in subclasses for custom initialization
  }

  /**
   * Update component state
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
   * Get current component state
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
   * Update component options
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
   * Show the component
   */
  show() {
    if (this.isDestroyed) return

    this.setState({ visible: true })
    
    if (this.element) {
      this.domAdapter.removeClass(this.element, 'hidden')
      this.domAdapter.addClass(this.element, 'visible')
    }

    this.onShow()
    this.emit('show')
  }

  /**
   * Hide the component
   */
  hide() {
    if (this.isDestroyed) return

    this.setState({ visible: false })
    
    if (this.element) {
      this.domAdapter.removeClass(this.element, 'visible')
      this.domAdapter.addClass(this.element, 'hidden')
    }

    this.onHide()
    this.emit('hide')
  }

  /**
   * Toggle component visibility
   */
  toggle() {
    if (this.state.visible) {
      this.hide()
    } else {
      this.show()
    }
  }

  /**
   * Handle show event
   * @protected
   */
  onShow() {
    // Override in subclasses
  }

  /**
   * Handle hide event
   * @protected
   */
  onHide() {
    // Override in subclasses
  }

  /**
   * Enable the component
   */
  enable() {
    if (this.isDestroyed) return

    this.setState({ enabled: true })
    
    if (this.element) {
      this.domAdapter.removeClass(this.element, 'disabled')
    }

    this.emit('enabled')
  }

  /**
   * Disable the component
   */
  disable() {
    if (this.isDestroyed) return

    this.setState({ enabled: false })
    
    if (this.element) {
      this.domAdapter.addClass(this.element, 'disabled')
    }

    this.emit('disabled')
  }

  /**
   * Check if component is visible
   * @returns {boolean} Whether component is visible
   */
  isVisible() {
    return this.state.visible
  }

  /**
   * Check if component is enabled
   * @returns {boolean} Whether component is enabled
   */
  isEnabled() {
    return this.state.enabled
  }

  /**
   * Subscribe to component events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, options = {}) {
    const unsubscribe = this.eventBus.subscribe(`component:${event}`, handler, options)
    this.eventUnsubscribers.push(unsubscribe)
    return unsubscribe
  }

  /**
   * Subscribe to component event once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    return this.on(event, handler, { once: true })
  }

  /**
   * Emit component event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @protected
   */
  emit(event, data = null) {
    if (!this.isDestroyed && this.options.enableEvents) {
      this.eventBus.emit(`component:${event}`, {
        component: this,
        data,
        timestamp: new Date()
      })
    }
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
   * Add event listener with automatic cleanup
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @returns {Function} Remove listener function
   * @protected
   */
  addEventListenerWithCleanup(element, event, handler, options = {}) {
    const removeListener = this.domAdapter.addEventListener(element, event, handler, options)
    this.addCleanup(removeListener)
    return removeListener
  }

  /**
   * Validate container element
   * @protected
   */
  validateContainer() {
    if (!this.container) {
      throw new Error(`${this.constructor.name} requires a container element`)
    }

    if (!(this.container instanceof HTMLElement)) {
      throw new Error(`${this.constructor.name} container must be an HTMLElement`)
    }
  }

  /**
   * Get component info for debugging
   * @returns {Object} Component information
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed,
      state: this.getState(),
      options: { ...this.options },
      hasElement: Boolean(this.element),
      hasContainer: Boolean(this.container),
      cleanupCount: this.cleanupFunctions.length,
      eventSubscriberCount: this.eventUnsubscribers.length
    }
  }

  /**
   * Destroy the component and clean up all resources
   */
  destroy() {
    if (this.isDestroyed) return

    try {
      // Emit destroy event before cleanup
      this.emit('destroying')

      // Component-specific cleanup
      this.onDestroy()

      // Unsubscribe from all events
      this.eventUnsubscribers.forEach(unsubscribe => {
        try {
          unsubscribe()
        } catch (error) {
          console.warn('Error during event unsubscribe:', error)
        }
      })

      // Run all cleanup functions
      this.cleanupFunctions.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.warn('Error during component cleanup:', error)
        }
      })

      // Clean up observers
      this.observerCleanups.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.warn('Error during observer cleanup:', error)
        }
      })

      // Remove element from DOM
      if (this.element) {
        this.domAdapter.remove(this.element)
      }

      // Clear all references
      this.cleanupFunctions = []
      this.eventUnsubscribers = []
      this.observerCleanups = []
      this.element = null
      this.container = null
      this.eventBus = null
      this.domAdapter = null

      this.isDestroyed = true

    } catch (error) {
      console.error(`Error destroying ${this.constructor.name}:`, error)
    }
  }

  /**
   * Component-specific cleanup logic
   * @protected
   */
  onDestroy() {
    // Override in subclasses for custom cleanup
  }
}