/**
 * Renderer Interface - Defines the contract for rendering strategies
 * Implements the Strategy pattern for different rendering approaches
 */

/**
 * Base Renderer class for command list rendering
 * @abstract
 */
export class Renderer {
  /**
   * @param {DOMAdapter} domAdapter - DOM manipulation adapter
   * @param {Object} options - Renderer options
   */
  constructor(domAdapter, options = {}) {
    if (this.constructor === Renderer) {
      throw new Error('Renderer is abstract and cannot be instantiated directly')
    }

    this.domAdapter = domAdapter
    this.options = {
      itemHeight: 40,
      categoryHeaderHeight: 32,
      maxVisibleItems: 10,
      scrollBuffer: 3,
      highlightClass: 'highlight',
      selectedClass: 'selected',
      ...options
    }

    this.container = null
    this.renderedItems = []
    this.selectedIndex = 0
  }

  /**
   * Render commands in the container
   * @param {Command[]} commands - Commands to render
   * @param {string} query - Current search query
   * @param {HTMLElement} container - Container element
   * @returns {Promise<RenderResult>} Render result
   * @abstract
   */
  async render(commands, query, container) {
    throw new Error('render() must be implemented by subclass')
  }

  /**
   * Update selection highlight
   * @param {number} newIndex - New selected index
   * @param {number} oldIndex - Previous selected index
   * @abstract
   */
  updateSelection(newIndex, oldIndex) {
    throw new Error('updateSelection() must be implemented by subclass')
  }

  /**
   * Scroll to make item visible
   * @param {number} index - Item index
   * @abstract
   */
  scrollToItem(index) {
    throw new Error('scrollToItem() must be implemented by subclass')
  }

  /**
   * Clear rendered content
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = ''
    }
    this.renderedItems = []
    this.selectedIndex = 0
  }

  /**
   * Get rendered item at index
   * @param {number} index - Item index
   * @returns {HTMLElement|null} Rendered item element
   */
  getItemElement(index) {
    return this.renderedItems[index] || null
  }

  /**
   * Get total number of rendered items
   * @returns {number} Number of items
   */
  getItemCount() {
    return this.renderedItems.length
  }

  /**
   * Highlight query matches in text
   * @param {string} text - Text to highlight
   * @param {string} query - Query to highlight
   * @returns {string} HTML with highlighted text
   * @protected
   */
  highlightMatches(text, query) {
    if (!query || !text) return this.escapeHtml(text)

    const escapedText = this.escapeHtml(text)
    const escapedQuery = this.escapeRegExp(query)
    const regex = new RegExp(`(${escapedQuery})`, 'gi')
    
    return escapedText.replace(regex, `<span class="${this.options.highlightClass}">$1</span>`)
  }

  /**
   * Format command parameters for display
   * @param {Parameter[]} parameters - Command parameters
   * @returns {string} Formatted parameters HTML
   * @protected
   */
  formatParameters(parameters) {
    if (!parameters || parameters.length === 0) return ''

    const paramStrings = parameters.map(param => {
      const name = param.required ? `<${param.name}>` : `[${param.name}]`
      const desc = param.description ? ` ${param.description}` : ''
      return `${name}${desc}`
    })

    return `<em class="command-parameters">${paramStrings.join(' ')}</em>`
  }

  /**
   * Format command aliases for display
   * @param {string[]} aliases - Command aliases
   * @returns {string} Formatted aliases HTML
   * @protected
   */
  formatAliases(aliases) {
    if (!aliases || aliases.length === 0) return ''
    return `<small class="command-aliases">(${aliases.join(', ')})</small>`
  }

  /**
   * Create command item HTML
   * @param {Command} command - Command to render
   * @param {number} index - Item index
   * @param {string} query - Search query for highlighting
   * @param {boolean} selected - Whether item is selected
   * @returns {string} Command item HTML
   * @protected
   */
  createCommandItemHTML(command, index, query = '', selected = false) {
    const metadata = command.getMetadata()
    const selectedClass = selected ? ` ${this.options.selectedClass}` : ''
    
    return `
      <div class="command-palette__item${selectedClass}" 
           data-index="${index}" 
           data-command-id="${metadata.id}">
        <div class="command-palette__item-icon">
          ${metadata.icon}
        </div>
        <div class="command-palette__item-content">
          <div class="command-palette__item-title">
            ${this.highlightMatches(metadata.name, query)}
            ${this.formatParameters(metadata.parameters)}
            ${this.formatAliases(metadata.aliases)}
          </div>
          <div class="command-palette__item-description">
            ${this.highlightMatches(metadata.description, query)}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Escape HTML characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @protected
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return ''
    
    const div = this.domAdapter.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * Escape regular expression characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @protected
   */
  escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Destroy renderer and clean up resources
   */
  destroy() {
    this.clear()
    this.container = null
    this.domAdapter = null
  }
}

/**
 * Render result containing information about the rendering operation
 */
export class RenderResult {
  /**
   * @param {Object} config - Result configuration
   * @param {boolean} config.success - Whether rendering was successful
   * @param {number} config.itemCount - Number of items rendered
   * @param {number} config.visibleCount - Number of visible items
   * @param {string} config.renderMode - Rendering mode used
   * @param {Error} config.error - Error if rendering failed
   */
  constructor(config = {}) {
    this.success = Boolean(config.success)
    this.itemCount = config.itemCount || 0
    this.visibleCount = config.visibleCount || 0
    this.renderMode = config.renderMode || 'unknown'
    this.error = config.error || null
    this.timestamp = new Date()
  }

  /**
   * Create success result
   * @param {number} itemCount - Number of items rendered
   * @param {number} visibleCount - Number of visible items
   * @param {string} renderMode - Rendering mode
   * @returns {RenderResult} Success result
   */
  static success(itemCount, visibleCount, renderMode) {
    return new RenderResult({
      success: true,
      itemCount,
      visibleCount,
      renderMode
    })
  }

  /**
   * Create failure result
   * @param {Error} error - Error that occurred
   * @param {string} renderMode - Attempted rendering mode
   * @returns {RenderResult} Failure result
   */
  static failure(error, renderMode = 'unknown') {
    return new RenderResult({
      success: false,
      error,
      renderMode
    })
  }
}