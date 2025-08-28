/**
 * EventBus - Lightweight event system for loose coupling between components
 * Implements observer pattern with memory leak prevention
 */
export class EventBus {
  constructor() {
    this.events = new Map()
    this.onceEvents = new WeakSet()
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, handler, options = {}) {
    if (typeof event !== 'string' || typeof handler !== 'function') {
      throw new Error('Invalid event subscription parameters')
    }

    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }

    const eventHandlers = this.events.get(event)
    
    // Handle once option
    if (options.once) {
      const wrappedHandler = (...args) => {
        handler(...args)
        this.unsubscribe(event, wrappedHandler)
      }
      this.onceEvents.add(wrappedHandler)
      eventHandlers.add(wrappedHandler)
      
      return () => this.unsubscribe(event, wrappedHandler)
    }

    eventHandlers.add(handler)
    
    // Return unsubscribe function
    return () => this.unsubscribe(event, handler)
  }

  /**
   * Subscribe to event only once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    return this.subscribe(event, handler, { once: true })
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler to remove
   */
  unsubscribe(event, handler) {
    const eventHandlers = this.events.get(event)
    if (eventHandlers) {
      eventHandlers.delete(handler)
      // Clean up empty event sets
      if (eventHandlers.size === 0) {
        this.events.delete(event)
      }
    }
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {number} Number of handlers called
   */
  emit(event, data = null) {
    const eventHandlers = this.events.get(event)
    if (!eventHandlers) {
      return 0
    }

    let handlerCount = 0
    
    // Create a copy to avoid issues if handlers modify the set during iteration
    const handlers = Array.from(eventHandlers)
    
    for (const handler of handlers) {
      try {
        handler(data)
        handlerCount++
      } catch (error) {
        console.error(`Error in event handler for '${event}':`, error)
      }
    }

    return handlerCount
  }

  /**
   * Get the number of handlers for an event
   * @param {string} event - Event name
   * @returns {number} Number of handlers
   */
  getHandlerCount(event) {
    return this.events.get(event)?.size || 0
  }

  /**
   * Get all registered events
   * @returns {string[]} Array of event names
   */
  getEvents() {
    return Array.from(this.events.keys())
  }

  /**
   * Clear all handlers for an event
   * @param {string} event - Event name
   */
  clear(event) {
    if (event) {
      this.events.delete(event)
    } else {
      // Clear all events
      this.events.clear()
    }
  }

  /**
   * Destroy the event bus and clean up all handlers
   */
  destroy() {
    this.events.clear()
    this.onceEvents = new WeakSet()
  }

  /**
   * Debug helper to inspect current state
   * @returns {Object} Debug information
   */
  debug() {
    const eventStats = {}
    for (const [event, handlers] of this.events) {
      eventStats[event] = handlers.size
    }
    
    return {
      totalEvents: this.events.size,
      eventStats,
      totalHandlers: Array.from(this.events.values()).reduce((sum, handlers) => sum + handlers.size, 0)
    }
  }
}

// Singleton instance for global use
export const globalEventBus = new EventBus()