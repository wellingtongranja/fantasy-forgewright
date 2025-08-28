/**
 * DOMAdapter - Abstraction layer for DOM operations
 * Provides testable interface for DOM manipulation and querying
 */
export class DOMAdapter {
  constructor(document = window.document) {
    this.document = document
    this.observers = new Map()
  }

  // Element creation and manipulation
  createElement(tag, options = {}) {
    const element = this.document.createElement(tag)
    
    if (options.className) {
      element.className = options.className
    }
    
    if (options.id) {
      element.id = options.id
    }
    
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value)
      })
    }
    
    if (options.properties) {
      Object.entries(options.properties).forEach(([key, value]) => {
        element[key] = value
      })
    }
    
    if (options.styles) {
      Object.entries(options.styles).forEach(([key, value]) => {
        element.style[key] = value
      })
    }
    
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML
    }
    
    if (options.textContent) {
      element.textContent = options.textContent
    }
    
    return element
  }

  // Element selection
  querySelector(selector, parent = this.document) {
    try {
      return parent.querySelector(selector)
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error)
      return null
    }
  }

  querySelectorAll(selector, parent = this.document) {
    try {
      return Array.from(parent.querySelectorAll(selector))
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error)
      return []
    }
  }

  getElementById(id) {
    return this.document.getElementById(id)
  }

  // Element manipulation
  appendChild(parent, child) {
    if (parent && child && parent.appendChild) {
      parent.appendChild(child)
    }
  }

  removeChild(parent, child) {
    if (parent && child && parent.removeChild && parent.contains(child)) {
      parent.removeChild(child)
    }
  }

  remove(element) {
    if (element && element.remove) {
      element.remove()
    }
  }

  insertBefore(parent, newNode, referenceNode) {
    if (parent && newNode && parent.insertBefore) {
      parent.insertBefore(newNode, referenceNode)
    }
  }

  // Class manipulation
  addClass(element, className) {
    if (element && element.classList) {
      element.classList.add(className)
    }
  }

  removeClass(element, className) {
    if (element && element.classList) {
      element.classList.remove(className)
    }
  }

  toggleClass(element, className, force) {
    if (element && element.classList) {
      return element.classList.toggle(className, force)
    }
    return false
  }

  hasClass(element, className) {
    return element?.classList?.contains(className) || false
  }

  // Attribute manipulation
  setAttribute(element, name, value) {
    if (element && element.setAttribute) {
      element.setAttribute(name, value)
    }
  }

  getAttribute(element, name) {
    return element?.getAttribute?.(name) || null
  }

  removeAttribute(element, name) {
    if (element && element.removeAttribute) {
      element.removeAttribute(name)
    }
  }

  // Style manipulation
  setStyle(element, property, value) {
    if (element && element.style) {
      element.style[property] = value
    }
  }

  getStyle(element, property) {
    if (!element) return null
    
    const computedStyle = window.getComputedStyle(element)
    return computedStyle.getPropertyValue(property)
  }

  setStyles(element, styles) {
    if (element && styles && typeof styles === 'object') {
      Object.entries(styles).forEach(([property, value]) => {
        this.setStyle(element, property, value)
      })
    }
  }

  // Event handling
  addEventListener(element, event, handler, options = {}) {
    if (element && element.addEventListener && typeof handler === 'function') {
      element.addEventListener(event, handler, options)
      
      // Return cleanup function
      return () => this.removeEventListener(element, event, handler)
    }
    return () => {} // No-op cleanup
  }

  removeEventListener(element, event, handler) {
    if (element && element.removeEventListener) {
      element.removeEventListener(event, handler)
    }
  }

  // Focus management
  focus(element) {
    if (element && element.focus) {
      try {
        element.focus()
      } catch (error) {
        console.warn('Failed to focus element:', error)
      }
    }
  }

  blur(element) {
    if (element && element.blur) {
      element.blur()
    }
  }

  // Scroll operations
  scrollTo(element, options) {
    if (element && element.scrollTo) {
      element.scrollTo(options)
    }
  }

  scrollIntoView(element, options = {}) {
    if (element && element.scrollIntoView) {
      element.scrollIntoView(options)
    }
  }

  // Measurements
  getBoundingClientRect(element) {
    return element?.getBoundingClientRect?.() || null
  }

  getScrollPosition(element) {
    if (!element) return { top: 0, left: 0 }
    
    return {
      top: element.scrollTop || 0,
      left: element.scrollLeft || 0
    }
  }

  // Intersection Observer
  createIntersectionObserver(callback, options = {}) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(callback, options)
      return {
        observe: (element) => observer.observe(element),
        unobserve: (element) => observer.unobserve(element),
        disconnect: () => observer.disconnect()
      }
    }
    
    // Fallback for environments without IntersectionObserver
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {}
    }
  }

  // Mutation Observer
  createMutationObserver(callback, options = {}) {
    if ('MutationObserver' in window) {
      const observer = new MutationObserver(callback)
      return {
        observe: (element) => observer.observe(element, options),
        disconnect: () => observer.disconnect()
      }
    }
    
    return {
      observe: () => {},
      disconnect: () => {}
    }
  }

  // Content manipulation
  empty(element) {
    if (element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild)
      }
    }
  }

  // Utility methods
  isElementVisible(element) {
    if (!element) return false
    
    const rect = this.getBoundingClientRect(element)
    return rect && rect.width > 0 && rect.height > 0
  }

  isElementInViewport(element) {
    if (!element) return false
    
    const rect = this.getBoundingClientRect(element)
    if (!rect) return false
    
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || this.document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || this.document.documentElement.clientWidth)
    )
  }

  // Animation frame helper
  requestAnimationFrame(callback) {
    return window.requestAnimationFrame(callback)
  }

  cancelAnimationFrame(id) {
    window.cancelAnimationFrame(id)
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
  }
}

// Singleton instance for global use
export const domAdapter = new DOMAdapter()