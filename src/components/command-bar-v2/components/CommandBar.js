/**
 * CommandBar - Main command palette component
 * Manages the overall command bar UI and coordinates child components
 */

import { BaseComponent } from '../core/base/BaseComponent.js'

export class CommandBar extends BaseComponent {
  /**
   * @param {Object} commandRegistry - Command registry instance
   * @param {Object} config - CommandBar configuration
   */
  constructor(commandRegistry, config = {}) {
    super(config)
    
    // Store registry reference
    this.commandRegistry = commandRegistry
    
    // Child components
    this.inputComponent = null
    this.listComponent = null
    
    // Internal state
    this.commands = []
    this.filteredCommands = []
    this.selectedIndex = -1
    
    // Load commands from registry
    this.loadCommands()
  }

  /**
   * Get default options for CommandBar
   * @returns {Object} Default options
   * @protected
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      className: 'command-bar-v2',
      placeholder: 'Type a command or search...',
      maxResults: 10,
      minInputLength: 0,
      fuzzySearch: true,
      debounceDelay: 100,
      position: 'top', // top, center
      zIndex: 10000
    }
  }

  /**
   * Get initial state
   * @returns {Object} Initial state
   * @protected
   */
  getInitialState() {
    return {
      ...super.getInitialState(),
      query: '',
      isSearching: false,
      hasResults: false,
      selectedIndex: -1
    }
  }

  /**
   * Bind methods to maintain context
   * @protected
   */
  bindMethods() {
    super.bindMethods()
    this.handleInput = this.handleInput.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleCommandSelect = this.handleCommandSelect.bind(this)
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    this.handleEscape = this.handleEscape.bind(this)
  }

  /**
   * Create DOM structure
   * @protected
   */
  async createDOM() {
    // Create main container
    this.element = this.domAdapter.createElement('div', {
      className: this.options.className,
      attributes: {
        'data-component': 'command-bar-v2',
        'role': 'combobox',
        'aria-expanded': 'false',
        'aria-haspopup': 'listbox'
      }
    })

    // Create overlay backdrop
    this.overlay = this.domAdapter.createElement('div', {
      className: `${this.options.className}__overlay`
    })

    // Create modal container
    this.modal = this.domAdapter.createElement('div', {
      className: `${this.options.className}__modal`,
      attributes: {
        'role': 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Command Palette'
      }
    })

    // Create header section
    this.header = this.domAdapter.createElement('div', {
      className: `${this.options.className}__header`
    })

    // Create input container (will hold InputComponent)
    this.inputContainer = this.domAdapter.createElement('div', {
      className: `${this.options.className}__input-container`
    })

    // Create results container (will hold ListComponent)
    this.resultsContainer = this.domAdapter.createElement('div', {
      className: `${this.options.className}__results-container`
    })

    // Create footer section
    this.footer = this.domAdapter.createElement('div', {
      className: `${this.options.className}__footer`
    })

    // Build DOM hierarchy
    this.domAdapter.appendChild(this.header, this.inputContainer)
    this.domAdapter.appendChild(this.modal, this.header)
    this.domAdapter.appendChild(this.modal, this.resultsContainer)
    this.domAdapter.appendChild(this.modal, this.footer)
    this.domAdapter.appendChild(this.element, this.overlay)
    this.domAdapter.appendChild(this.element, this.modal)
    
    // Initially hidden
    this.domAdapter.addClass(this.element, 'hidden')
    
    // Append to container
    this.domAdapter.appendChild(this.container, this.element)

    // Position based on options
    this.applyPosition()
  }

  /**
   * Apply positioning based on options
   * @private
   */
  applyPosition() {
    if (this.options.position === 'top') {
      this.domAdapter.addClass(this.element, `${this.options.className}--top`)
    } else if (this.options.position === 'center') {
      this.domAdapter.addClass(this.element, `${this.options.className}--center`)
    }

    // Apply z-index
    if (this.options.zIndex) {
      this.domAdapter.setStyle(this.element, 'z-index', this.options.zIndex)
    }
  }

  /**
   * Setup event listeners
   * @protected
   */
  setupEvents() {
    super.setupEvents()

    // Overlay click to close
    this.addEventListenerWithCleanup(
      this.overlay,
      'click',
      this.handleOutsideClick
    )

    // Global escape key handler
    this.addEventListenerWithCleanup(
      document,
      'keydown',
      (e) => {
        if (e.key === 'Escape' && this.isVisible()) {
          this.handleEscape(e)
        }
      },
      true
    )

    // Subscribe to child component events
    this.on('input:change', this.handleInput)
    this.on('input:keydown', this.handleKeyDown)
    this.on('list:select', this.handleCommandSelect)
  }

  /**
   * Initialize child components
   * @protected
   */
  async onInitialize() {
    // Child components will be initialized here
    // For now, create a temporary input
    const input = this.domAdapter.createElement('input', {
      className: `${this.options.className}__input`,
      attributes: {
        type: 'text',
        placeholder: this.options.placeholder,
        'aria-label': 'Command input',
        'aria-autocomplete': 'list',
        'aria-controls': 'command-results'
      }
    })
    
    this.domAdapter.appendChild(this.inputContainer, input)
    this.inputElement = input

    // Temporary event listener
    this.addEventListenerWithCleanup(input, 'input', this.handleInput)
    this.addEventListenerWithCleanup(input, 'keydown', this.handleKeyDown)
  }

  /**
   * Handle input changes
   * @param {Event} event - Input event
   * @private
   */
  handleInput(event) {
    const query = event.target?.value || event.detail?.value || ''
    this.setState({ query })
    
    // Debounced search will be implemented
    this.search(query)
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeyDown(event) {
    const key = event.key

    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        this.selectNext()
        break
      
      case 'ArrowUp':
        event.preventDefault()
        this.selectPrevious()
        break
      
      case 'Enter':
        event.preventDefault()
        this.executeSelected()
        break
      
      case 'Escape':
        event.preventDefault()
        this.hide()
        break
    }
  }

  /**
   * Handle command selection
   * @param {Object} event - Selection event
   * @private
   */
  handleCommandSelect(event) {
    const command = event.detail?.command
    if (command) {
      this.executeCommand(command)
    }
  }

  /**
   * Handle clicks outside the modal
   * @param {MouseEvent} event - Click event
   * @private
   */
  handleOutsideClick(event) {
    this.hide()
  }

  /**
   * Handle escape key
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleEscape(event) {
    event.preventDefault()
    this.hide()
  }

  /**
   * Search commands based on query
   * @param {string} query - Search query
   * @private
   */
  search(query) {
    this.setState({ isSearching: true })

    // Filter commands with improved command + parameter parsing
    if (!query || query.length < this.options.minInputLength) {
      this.filteredCommands = [...this.commands]
    } else {
      const trimmedQuery = query.trim()
      
      this.filteredCommands = this.commands.filter(cmd => {
        const name = cmd.name?.toLowerCase() || ''
        const description = cmd.description?.toLowerCase() || ''
        const aliases = cmd.aliases || []
        const queryLower = trimmedQuery.toLowerCase()
        
        // Special handling for colon shortcuts - prioritize exact matches
        if (queryLower.startsWith(':')) {
          // First check for exact colon alias match
          const exactColonMatch = aliases.find(alias => 
            alias.startsWith(':') && 
            alias.toLowerCase() === queryLower
          )
          
          if (exactColonMatch) {
            console.log('Exact colon match found for', queryLower, ':', cmd.name)
            return true
          }
          
          // If no exact match exists, check for prefix matches (for partial typing like ":s" when typing ":sp")
          const hasExactMatch = this.commands.some(otherCmd => 
            otherCmd.aliases?.some(alias => 
              alias.startsWith(':') && alias.toLowerCase() === queryLower
            )
          )
          
          if (!hasExactMatch) {
            // Only show prefix matches if no exact match exists
            const prefixMatch = aliases.find(alias => 
              alias.startsWith(':') && 
              alias.toLowerCase().startsWith(queryLower)
            )
            
            if (prefixMatch) {
              console.log('Prefix colon match found for', queryLower, ':', cmd.name)
              return true
            }
          }
          
          // No colon matches, skip this command for colon queries
          return false
        }
        
        // Check for command name match at start of query (non-colon queries)
        if (queryLower.startsWith(name)) {
          return true
        }
        
        // For regular fuzzy search, use the first word only
        const firstWord = queryLower.split(/\s+/)[0]
        
        // Check if first word matches command name, aliases, or description
        return name.includes(firstWord) || 
               description.toLowerCase().includes(firstWord) ||
               aliases.some(alias => alias.toLowerCase().includes(firstWord))
      })
    }

    this.setState({ 
      isSearching: false, 
      hasResults: this.filteredCommands.length > 0,
      selectedIndex: this.filteredCommands.length > 0 ? 0 : -1
    })

    this.renderResults()
  }

  /**
   * Render search results
   * @private
   */
  renderResults() {
    // Clear existing results
    this.domAdapter.empty(this.resultsContainer)

    if (this.filteredCommands.length === 0) {
      const noResults = this.domAdapter.createElement('div', {
        className: `${this.options.className}__no-results`,
        textContent: 'No commands found'
      })
      this.domAdapter.appendChild(this.resultsContainer, noResults)
      return
    }

    // Create results list
    const list = this.domAdapter.createElement('ul', {
      className: `${this.options.className}__results-list`,
      attributes: {
        'role': 'listbox',
        'id': 'command-results'
      }
    })

    // Group commands by category
    const categorizedCommands = this.groupByCategory(this.filteredCommands)
    let globalIndex = 0

    // Render each category
    Object.entries(categorizedCommands).forEach(([category, commands]) => {
      // Add category header
      const categoryHeader = this.domAdapter.createElement('li', {
        className: `${this.options.className}__category-header`,
        attributes: {
          'role': 'presentation'
        }
      })
      categoryHeader.innerHTML = `<span class="${this.options.className}__category-title">${category}</span>`
      this.domAdapter.appendChild(list, categoryHeader)

      // Render commands in this category
      commands.forEach((command) => {
        const item = this.domAdapter.createElement('li', {
          className: `${this.options.className}__result-item`,
          attributes: {
            'role': 'option',
            'aria-selected': globalIndex === this.state.selectedIndex ? 'true' : 'false',
            'data-index': globalIndex
          }
        })

        if (globalIndex === this.state.selectedIndex) {
          this.domAdapter.addClass(item, 'selected')
        }

        // Get colon alias (first one that starts with :)
        const colonAlias = command.aliases?.find(alias => alias.startsWith(':')) || ''
        
        // Format parameters if they exist
        let parametersHtml = ''
        if (command.parameters && command.parameters.length > 0) {
          const params = command.parameters.map(p => {
            const bracket = p.required ? ['&lt;', '&gt;'] : ['[', ']']
            return `<span class="${this.options.className}__result-param">${bracket[0]}${p.name}${bracket[1]}</span>`
          }).join(' ')
          parametersHtml = `<span class="${this.options.className}__result-params">${params}</span>`
        }

        // Command content with structured layout
        const content = `
          <div class="${this.options.className}__result-left">
            <div class="${this.options.className}__result-main">
              <span class="${this.options.className}__result-name">${command.name}</span>
              ${colonAlias ? `<span class="${this.options.className}__result-alias">${colonAlias}</span>` : ''}
              ${parametersHtml}
            </div>
            ${command.description ? `<div class="${this.options.className}__result-description">${command.description}</div>` : ''}
          </div>
        `
        item.innerHTML = content

        // Click handler
        this.addEventListenerWithCleanup(item, 'click', () => {
          this.executeCommand(command)
        })

        this.domAdapter.appendChild(list, item)
        globalIndex++
      })
    })

    this.domAdapter.appendChild(this.resultsContainer, list)
  }

  /**
   * Group commands by category
   * @param {Array} commands - Commands to group
   * @returns {Object} Categorized commands
   * @private
   */
  groupByCategory(commands) {
    const categories = {}
    
    commands.forEach(command => {
      const category = command.category || 'General'
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(command)
    })

    // Sort categories with a preferred order
    const categoryOrder = ['Documents', 'Editor', 'Git', 'System', 'General']
    const sortedCategories = {}
    
    // Add categories in preferred order
    categoryOrder.forEach(cat => {
      if (categories[cat]) {
        sortedCategories[cat] = categories[cat]
      }
    })
    
    // Add any remaining categories
    Object.keys(categories).forEach(cat => {
      if (!sortedCategories[cat]) {
        sortedCategories[cat] = categories[cat]
      }
    })

    return sortedCategories
  }

  /**
   * Select next command in list
   * @private
   */
  selectNext() {
    if (this.filteredCommands.length === 0) return

    const newIndex = Math.min(
      this.state.selectedIndex + 1,
      this.filteredCommands.length - 1
    )

    this.setState({ selectedIndex: newIndex })
    this.updateSelection()
  }

  /**
   * Select previous command in list
   * @private
   */
  selectPrevious() {
    if (this.filteredCommands.length === 0) return

    const newIndex = Math.max(this.state.selectedIndex - 1, 0)
    this.setState({ selectedIndex: newIndex })
    this.updateSelection()
  }

  /**
   * Update visual selection
   * @private
   */
  updateSelection() {
    const items = this.resultsContainer.querySelectorAll(`.${this.options.className}__result-item`)
    
    items.forEach((item) => {
      const index = parseInt(item.getAttribute('data-index'))
      if (index === this.state.selectedIndex) {
        this.domAdapter.addClass(item, 'selected')
        item.setAttribute('aria-selected', 'true')
        item.scrollIntoView({ block: 'nearest' })
      } else {
        this.domAdapter.removeClass(item, 'selected')
        item.setAttribute('aria-selected', 'false')
      }
    })
  }

  /**
   * Execute selected command
   * @private
   */
  executeSelected() {
    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < this.filteredCommands.length) {
      const command = this.filteredCommands[this.state.selectedIndex]
      this.executeCommand(command)
    }
  }

  /**
   * Load commands from registry
   * @private
   */
  loadCommands() {
    if (!this.commandRegistry) return
    
    // Get all commands from registry
    const allCommands = this.commandRegistry.getAllCommands()
    
    // Transform to our format
    this.commands = allCommands.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      category: this.normalizeCategory(cmd.category),
      aliases: cmd.aliases || [],
      parameters: cmd.parameters || [],
      handler: cmd.handler,
      condition: cmd.condition
    }))
  }
  
  /**
   * Normalize category names
   * @param {string} category - Category from registry
   * @returns {string} Normalized category name
   * @private
   */
  normalizeCategory(category) {
    const categoryMap = {
      'document': 'Documents',
      'editor': 'Editor',
      'github': 'Git',
      'git': 'Git',
      'system': 'System',
      'general': 'General'
    }
    return categoryMap[category?.toLowerCase()] || 'General'
  }

  /**
   * Execute a command
   * @param {Object} command - Command to execute
   * @private
   */
  executeCommand(command) {
    this.emit('command:execute', { command, query: this.state.query })
    
    // Parse the query to extract command and arguments  
    const query = this.state.query.trim()
    
    // Execute through command registry
    if (this.commandRegistry && this.commandRegistry.executeCommand) {
      try {
        // CommandRegistry expects the full input string, not separate name and args
        this.commandRegistry.executeCommand(query)
      } catch (error) {
        console.error('Command execution failed:', error)
        this.emit('command:error', { command, error })
      }
    }

    // Hide after execution
    this.hide()
  }

  /**
   * Set available commands
   * @param {Array} commands - Array of command objects
   */
  setCommands(commands) {
    this.commands = commands || []
    if (this.isVisible()) {
      this.search(this.state.query)
    }
  }

  /**
   * Show the command bar
   */
  show() {
    super.show()
    
    // Reload commands from registry
    this.loadCommands()
    
    // Reset state
    this.setState({
      query: '',
      selectedIndex: -1,
      hasResults: false
    })

    // Clear input
    if (this.inputElement) {
      this.inputElement.value = ''
      this.inputElement.focus()
    }

    // Show all commands initially
    this.search('')

    // Update ARIA
    this.element.setAttribute('aria-expanded', 'true')
  }

  /**
   * Hide the command bar
   */
  hide() {
    super.hide()
    
    // Clear state
    this.setState({
      query: '',
      selectedIndex: -1,
      hasResults: false
    })

    // Clear results
    this.domAdapter.empty(this.resultsContainer)

    // Update ARIA
    this.element.setAttribute('aria-expanded', 'false')

    // Return focus to previous element if tracked
    this.emit('command:closed')
  }

  /**
   * Handle state changes
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @protected
   */
  onStateChange(oldState, newState) {
    super.onStateChange(oldState, newState)

    // Update UI based on state changes
    if (oldState.isSearching !== newState.isSearching) {
      if (newState.isSearching) {
        this.domAdapter.addClass(this.element, 'searching')
      } else {
        this.domAdapter.removeClass(this.element, 'searching')
      }
    }
  }

  /**
   * Clean up on destroy
   * @protected
   */
  onDestroy() {
    super.onDestroy()
    
    // Clean up child components
    if (this.inputComponent) {
      this.inputComponent.destroy()
    }
    if (this.listComponent) {
      this.listComponent.destroy()
    }
  }
}