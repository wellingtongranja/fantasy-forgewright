/**
 * Controller Interface - Defines contracts for input and navigation controllers
 * Handles user interactions and state management
 */

/**
 * Base Controller class for handling user interactions
 * @abstract
 */
export class Controller {
  /**
   * @param {EventBus} eventBus - Event bus for communication
   * @param {DOMAdapter} domAdapter - DOM manipulation adapter
   * @param {Object} options - Controller options
   */
  constructor(eventBus, domAdapter, options = {}) {
    if (this.constructor === Controller) {
      throw new Error('Controller is abstract and cannot be instantiated directly')
    }

    this.eventBus = eventBus
    this.domAdapter = domAdapter
    this.options = { ...options }
    this.isActive = false
    this.cleanupFunctions = []
  }

  /**
   * Initialize the controller
   * @param {HTMLElement} element - Element to control
   * @abstract
   */
  initialize(element) {
    throw new Error('initialize() must be implemented by subclass')
  }

  /**
   * Activate the controller
   * @abstract
   */
  activate() {
    throw new Error('activate() must be implemented by subclass')
  }

  /**
   * Deactivate the controller
   * @abstract
   */
  deactivate() {
    throw new Error('deactivate() must be implemented by subclass')
  }

  /**
   * Handle configuration changes
   * @param {Object} newConfig - New configuration
   */
  updateConfiguration(newConfig) {
    this.options = { ...this.options, ...newConfig }
  }

  /**
   * Check if controller is active
   * @returns {boolean} Whether controller is active
   */
  getIsActive() {
    return this.isActive
  }

  /**
   * Add cleanup function to be called on destroy
   * @param {Function} cleanup - Cleanup function
   * @protected
   */
  addCleanup(cleanup) {
    if (typeof cleanup === 'function') {
      this.cleanupFunctions.push(cleanup)
    }
  }

  /**
   * Destroy controller and clean up resources
   */
  destroy() {
    this.deactivate()
    
    // Run all cleanup functions
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup()
      } catch (error) {
        console.error('Error during controller cleanup:', error)
      }
    })
    
    this.cleanupFunctions = []
    this.eventBus = null
    this.domAdapter = null
  }
}

/**
 * Input Controller interface for text input handling
 * @abstract
 */
export class InputController extends Controller {
  constructor(eventBus, domAdapter, options = {}) {
    super(eventBus, domAdapter, {
      debounceMs: 150,
      minQueryLength: 0,
      ...options
    })

    this.inputElement = null
    this.currentValue = ''
    this.debounceTimer = null
  }

  /**
   * Handle input change
   * @param {string} value - New input value
   * @abstract
   */
  handleInput(value) {
    throw new Error('handleInput() must be implemented by subclass')
  }

  /**
   * Handle input focus
   * @abstract
   */
  handleFocus() {
    throw new Error('handleFocus() must be implemented by subclass')
  }

  /**
   * Handle input blur
   * @abstract
   */
  handleBlur() {
    throw new Error('handleBlur() must be implemented by subclass')
  }

  /**
   * Get current input value
   * @returns {string} Current value
   */
  getValue() {
    return this.currentValue
  }

  /**
   * Set input value
   * @param {string} value - New value
   */
  setValue(value) {
    if (this.inputElement) {
      this.inputElement.value = value
      this.currentValue = value
    }
  }

  /**
   * Clear input value
   */
  clear() {
    this.setValue('')
  }

  /**
   * Focus the input
   */
  focus() {
    if (this.inputElement) {
      this.domAdapter.focus(this.inputElement)
    }
  }

  /**
   * Debounced input handler
   * @param {string} value - Input value
   * @protected
   */
  debouncedInput(value) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.handleInput(value)
    }, this.options.debounceMs)
  }
}

/**
 * Navigation Controller interface for keyboard navigation
 * @abstract
 */
export class NavigationController extends Controller {
  constructor(eventBus, domAdapter, options = {}) {
    super(eventBus, domAdapter, {
      wrapNavigation: true,
      ...options
    })

    this.selectedIndex = 0
    this.itemCount = 0
    this.navigationMap = new Map()
  }

  /**
   * Handle navigation key press
   * @param {KeyboardEvent} event - Keyboard event
   * @abstract
   */
  handleNavigation(event) {
    throw new Error('handleNavigation() must be implemented by subclass')
  }

  /**
   * Select next item
   * @abstract
   */
  selectNext() {
    throw new Error('selectNext() must be implemented by subclass')
  }

  /**
   * Select previous item
   * @abstract
   */
  selectPrevious() {
    throw new Error('selectPrevious() must be implemented by subclass')
  }

  /**
   * Select first item
   * @abstract
   */
  selectFirst() {
    throw new Error('selectFirst() must be implemented by subclass')
  }

  /**
   * Select last item
   * @abstract
   */
  selectLast() {
    throw new Error('selectLast() must be implemented by subclass')
  }

  /**
   * Select item by index
   * @param {number} index - Index to select
   * @abstract
   */
  selectIndex(index) {
    throw new Error('selectIndex() must be implemented by subclass')
  }

  /**
   * Get currently selected index
   * @returns {number} Selected index
   */
  getSelectedIndex() {
    return this.selectedIndex
  }

  /**
   * Update item count for navigation bounds
   * @param {number} count - New item count
   */
  updateItemCount(count) {
    const oldCount = this.itemCount
    this.itemCount = Math.max(0, count)
    
    // Adjust selected index if needed
    if (this.selectedIndex >= this.itemCount && this.itemCount > 0) {
      this.selectedIndex = this.itemCount - 1
    } else if (this.itemCount === 0) {
      this.selectedIndex = 0
    }

    if (oldCount !== this.itemCount) {
      this.eventBus?.emit('navigation:itemCountChanged', {
        oldCount,
        newCount: this.itemCount,
        selectedIndex: this.selectedIndex
      })
    }
  }

  /**
   * Reset navigation state
   */
  reset() {
    this.selectedIndex = 0
    this.itemCount = 0
  }
}

/**
 * Action Controller interface for command execution
 * @abstract
 */
export class ActionController extends Controller {
  constructor(eventBus, domAdapter, options = {}) {
    super(eventBus, domAdapter, options)
    
    this.commandRegistry = null
    this.executionHistory = []
  }

  /**
   * Execute selected command
   * @param {Command} command - Command to execute
   * @param {string[]} args - Command arguments
   * @param {Object} context - Execution context
   * @abstract
   */
  async executeCommand(command, args = [], context = {}) {
    throw new Error('executeCommand() must be implemented by subclass')
  }

  /**
   * Handle command execution result
   * @param {CommandResult} result - Execution result
   * @abstract
   */
  handleExecutionResult(result) {
    throw new Error('handleExecutionResult() must be implemented by subclass')
  }

  /**
   * Set command registry
   * @param {CommandRegistry} registry - Command registry
   */
  setCommandRegistry(registry) {
    this.commandRegistry = registry
  }

  /**
   * Get execution history
   * @returns {CommandResult[]} Execution history
   */
  getExecutionHistory() {
    return [...this.executionHistory]
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.executionHistory = []
  }
}