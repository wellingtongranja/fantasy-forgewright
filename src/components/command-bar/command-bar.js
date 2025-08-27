/**
 * CommandBar - VS Code-style command palette for Fantasy Editor
 * Triggered by Ctrl+Space, provides fuzzy search for all editor commands
 */

import './command-bar.css'
import { HeaderIntegration } from './header-integration.js'
import { CommandCategories } from './command-categories.js'
import { AboutMenu } from './about-menu.js'

export class CommandBar {
  constructor(commandRegistry) {
    this.commandRegistry = commandRegistry
    this.isVisible = false
    this.selectedIndex = 0
    this.filteredResults = []
    this.currentQuery = ''
    this.showCategories = false

    this.element = null
    this.overlay = null
    this.input = null
    this.results = null

    // Initialize new components
    this.headerIntegration = null
    this.commandCategories = new CommandCategories(commandRegistry)
    this.aboutMenu = new AboutMenu(commandRegistry)

    this.init()
  }

  /**
   * Initialize command bar DOM and event listeners
   */
  init() {
    this.createDOM()
    this.attachEventListeners()
    this.initializeHeaderIntegration()
  }

  /**
   * Initialize header integration
   */
  initializeHeaderIntegration() {
    try {
      this.headerIntegration = new HeaderIntegration(this)
      this.headerIntegration.integrate()
      console.log('Header integration successful')
    } catch (error) {
      console.warn('Header integration failed, falling back to floating mode:', error.message)
      // Ensure element is properly positioned for floating mode
      this.restoreFloatingMode()
    }
  }

  /**
   * Restore floating mode if header integration fails
   */
  restoreFloatingMode() {
    if (this.element) {
      // Remove any integrated classes
      this.element.classList.remove('command-bar-integrated')
      this.element.classList.add('command-bar-floating')
      
      // Ensure the element is properly appended to body for floating mode
      if (this.element.parentNode !== document.body) {
        document.body.appendChild(this.element)
      }
      
      // Reset styles that might have been modified
      this.element.style.position = ''
      this.element.style.top = ''
      this.element.style.left = ''
      this.element.style.transform = ''
    }
  }

  /**
   * Create DOM structure for command bar
   */
  createDOM() {
    // Create main command bar with floating mode as default
    this.element = document.createElement('div')
    this.element.className = 'command-bar command-bar-floating'
    this.element.innerHTML = `
      <div class="command-bar-input-container">
        <input 
          type="text" 
          class="command-bar-input" 
          placeholder="type command..."
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <div class="command-bar-results"></div>
    `

    // Get references
    this.input = this.element.querySelector('.command-bar-input')
    this.results = this.element.querySelector('.command-bar-results')

    // Append to body
    document.body.appendChild(this.element)
  }

  /**
   * Inject CSS styles
   */
  /**
   * Attach all event listeners
   */
  attachEventListeners() {
    // Global keyboard shortcut
    document.addEventListener('keydown', (e) => {
      // Ctrl+Space to toggle command bar
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        this.toggle()
        return
      }

      // Escape to close if visible
      if (e.key === 'Escape' && this.isVisible) {
        e.preventDefault()
        this.hide()
        this.returnFocusToEditor()
        return
      }
    })

    // Input event handling
    this.input.addEventListener('input', (e) => {
      this.currentQuery = e.target.value
      this.updateResults()
    })

    // Keyboard navigation within command bar
    this.input.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          this.selectNext()
          break
        case 'ArrowUp':
          e.preventDefault()
          this.selectPrevious()
          break
        case 'Enter':
          e.preventDefault()
          this.executeSelected()
          break
        case 'Tab':
          e.preventDefault()
          // Tab cycles through results
          if (e.shiftKey) {
            this.selectPrevious()
          } else {
            this.selectNext()
          }
          break
      }
    })

    // Click handling for results
    this.results.addEventListener('click', (e) => {
      const resultElement = e.target.closest('.command-result')
      if (resultElement) {
        const index = Array.from(this.results.children).indexOf(resultElement)
        this.selectedIndex = index
        this.executeSelected()
      }
    })

    // Mouse hover for results
    this.results.addEventListener('mouseover', (e) => {
      const resultElement = e.target.closest('.command-result')
      if (resultElement) {
        const index = Array.from(this.results.children).indexOf(resultElement)
        this.selectIndex(index)
      }
    })

    // Click outside to close command bar
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.element.contains(e.target)) {
        this.hide()
        this.returnFocusToEditor()
      }
    })
  }

  /**
   * Show command bar
   */
  show() {
    if (this.isVisible) return

    this.isVisible = true
    this.selectedIndex = 0
    this.currentQuery = ''

    this.input.value = ''

    // Show element with proper class management
    this.element.classList.add('show')
    
    // Ensure results are visible for integrated mode
    if (this.results) {
      this.results.style.display = 'block'
    }

    // Show sidebar when command bar opens
    const sidebar = document.querySelector('.sidebar')
    const appMain = document.querySelector('.app-main')
    if (sidebar) {
      sidebar.classList.remove('sidebar-hidden')
    }
    if (appMain) {
      appMain.classList.remove('sidebar-hidden')
    }

    // Focus input and update results
    setTimeout(() => {
      this.input.focus()
      this.updateResults()
      
      // Double-check that the show class is applied
      if (!this.element.classList.contains('show')) {
        console.warn('CommandBar: Show class not applied, forcing it')
        this.element.classList.add('show')
      }
    }, 50)

    // Dispatch event
    this.dispatchEvent('show')
  }

  /**
   * Hide command bar
   */
  hide() {
    if (!this.isVisible) return

    this.isVisible = false

    // Hide element
    this.element.classList.remove('show')
    
    // Ensure results are hidden for integrated mode
    if (this.results) {
      this.results.style.display = 'none'
    }

    // Hide sidebar when command bar closes
    const sidebar = document.querySelector('.sidebar')
    const appMain = document.querySelector('.app-main')
    if (sidebar) {
      sidebar.classList.add('sidebar-hidden')
    }
    if (appMain) {
      appMain.classList.add('sidebar-hidden')
    }

    // Return focus to editor quickly
    setTimeout(() => {
      const app = window.fantasyEditor
      if (app && app.editor && app.editor.focus) {
        app.editor.focus()
      } else {
        // Fallback to DOM focus
        const editor = document.querySelector('#editor')
        if (editor) {
          editor.focus()
        }
      }
    }, 0)

    // Dispatch event
    this.dispatchEvent('hide')
  }

  /**
   * Return focus to the editor
   */
  returnFocusToEditor() {
    setTimeout(() => {
      const app = window.fantasyEditor
      if (app && app.editor && app.editor.focus) {
        app.editor.focus()
      } else {
        // Fallback to DOM focus
        const editor = document.querySelector('#editor')
        if (editor) {
          editor.focus()
        }
      }
    }, 0)
  }

  /**
   * Toggle command bar visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  /**
   * Update results based on current query
   */
  updateResults() {
    const query = this.currentQuery.trim()

    if (!query) {
      this.filteredResults = this.commandRegistry.getAllCommands()
    } else {
      this.filteredResults = this.commandRegistry.searchCommands(query)
    }

    this.selectedIndex = 0
    this.renderResults()
    
    // Ensure results are visible when command bar is shown
    if (this.isVisible && this.results) {
      this.results.style.display = 'block'
      
      // Force show class if not present
      if (!this.element.classList.contains('show')) {
        console.warn('CommandBar: Show class missing in updateResults, forcing it')
        this.element.classList.add('show')
      }
    }
    
    // Debug logging for troubleshooting
    console.log('CommandBar: Results updated', {
      query,
      resultCount: this.filteredResults.length,
      isVisible: this.isVisible,
      hasShowClass: this.element?.classList.contains('show'),
      resultsDisplay: this.results?.style.display
    })
  }

  /**
   * Render filtered results
   */
  renderResults() {
    if (this.filteredResults.length === 0) {
      this.results.innerHTML = `
        <div class="command-bar-empty">
          ${this.currentQuery ? `No commands found for "${this.currentQuery}"` : 'No commands available'}
        </div>
      `
      return
    }

    // Group by category if no query or show categories is enabled
    const shouldGroupByCategory = !this.currentQuery || this.showCategories
    
    if (shouldGroupByCategory) {
      this.renderGroupedResults()
    } else {
      this.renderFlatResults()
    }

    // Ensure results are visible after rendering
    if (this.isVisible && this.results) {
      this.results.style.display = 'block'
    }

    // Add click listeners to results
    this.results.querySelectorAll('.command-result').forEach((result, index) => {
      result.addEventListener('click', () => {
        this.selectedIndex = index
        this.executeSelected()
      })
    })
  }

  /**
   * Render results grouped by category
   */
  renderGroupedResults() {
    const grouped = this.commandCategories.groupCommandsByCategory()
    const orderedCategories = this.commandCategories.getOrderedCategories()
    let resultIndex = 0

    const categoryHtml = orderedCategories
      .filter(categoryKey => grouped[categoryKey] && grouped[categoryKey].commands.length > 0)
      .map(categoryKey => {
        const category = grouped[categoryKey]
        const categoryCommands = category.commands
        
        const commandsHtml = categoryCommands
          .map((command) => {
            const parametersDisplay = this.formatParameters(command.parameters)
            const aliasDisplay = this.formatAliases(command.aliases, this.currentQuery)
            const isSelected = resultIndex === this.selectedIndex
            
            const html = `
              <div class="command-result ${isSelected ? 'selected' : ''}" data-index="${resultIndex}">
                <div class="command-result-icon">
                  ${command.icon || '⚡'}
                </div>
                <div class="command-result-content">
                  <div class="command-result-title">
                    ${this.highlightMatch(command.name, this.currentQuery)}
                    ${parametersDisplay ? `<span class="command-parameters">${parametersDisplay}</span>` : ''}
                    ${aliasDisplay ? `<span class="command-aliases">${aliasDisplay}</span>` : ''}
                  </div>
                  <div class="command-result-description">
                    ${this.highlightMatch(command.description, this.currentQuery)}
                  </div>
                </div>
                ${command.shortcut ? `<div class="command-result-shortcut">${command.shortcut}</div>` : ''}
              </div>
            `
            resultIndex++
            return html
          })
          .join('')

        return `
          <div class="command-category">
            <div class="command-category-header">
              <span class="command-category-icon">${category.icon}</span>
              <span class="command-category-name">${category.name}</span>
              <span class="command-category-count">${categoryCommands.length}</span>
            </div>
            <div class="command-category-results">
              ${commandsHtml}
            </div>
          </div>
        `
      })
      .join('')

    this.results.innerHTML = categoryHtml
    this.filteredResults = orderedCategories.flatMap(key => grouped[key]?.commands || [])
  }

  /**
   * Render results in flat list (for search)
   */
  renderFlatResults() {
    this.results.innerHTML = this.filteredResults
      .map((command, index) => {
        const parametersDisplay = this.formatParameters(command.parameters)
        const aliasDisplay = this.formatAliases(command.aliases, this.currentQuery)

        return `
        <div class="command-result ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
          <div class="command-result-icon">
            ${command.icon || '⚡'}
          </div>
          <div class="command-result-content">
            <div class="command-result-title">
              ${this.highlightMatch(command.name, this.currentQuery)}
              ${parametersDisplay ? `<span class="command-parameters">${parametersDisplay}</span>` : ''}
              ${aliasDisplay ? `<span class="command-aliases">${aliasDisplay}</span>` : ''}
            </div>
            <div class="command-result-description">
              ${this.highlightMatch(command.description, this.currentQuery)}
            </div>
          </div>
          ${command.shortcut ? `<div class="command-result-shortcut">${command.shortcut}</div>` : ''}
        </div>
      `
      })
      .join('')
  }

  /**
   * Format command parameters for display
   * @param {Array} parameters Command parameters
   * @returns {string} Formatted parameters string
   */
  formatParameters(parameters) {
    if (!parameters || parameters.length === 0) return ''

    const paramStrings = parameters.map((param) => {
      const name = param.required ? `<${param.name}>` : `[${param.name}]`
      const desc = param.description ? ` ${param.description}` : ''
      return `${name}${desc}`
    })

    return `<em>${paramStrings.join(' ')}</em>`
  }

  /**
   * Format command aliases for display
   * @param {Array} aliases Command aliases
   * @param {string} query Current query
   * @returns {string} Formatted aliases string
   */
  formatAliases(aliases, query) {
    if (!aliases || aliases.length === 0) return ''

    // Since all aliases are now colon shortcuts, show them all
    return `<small>(${aliases.join(', ')})</small>`
  }

  /**
   * Highlight matching text in search results
   */
  highlightMatch(text, query) {
    if (!query || !text) return text

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escapedQuery})`, 'gi')
    return text.replace(regex, '<span class="highlight">$1</span>')
  }

  /**
   * Select next result
   */
  selectNext() {
    if (this.filteredResults.length === 0) return

    this.selectedIndex = (this.selectedIndex + 1) % this.filteredResults.length
    this.updateSelection()
  }

  /**
   * Select previous result
   */
  selectPrevious() {
    if (this.filteredResults.length === 0) return

    this.selectedIndex =
      this.selectedIndex === 0 ? this.filteredResults.length - 1 : this.selectedIndex - 1
    this.updateSelection()
  }

  /**
   * Select specific index
   */
  selectIndex(index) {
    if (index >= 0 && index < this.filteredResults.length) {
      this.selectedIndex = index
      this.updateSelection()
    }
  }

  /**
   * Update visual selection
   */
  updateSelection() {
    const resultElements = this.results.querySelectorAll('.command-result')
    resultElements.forEach((el, index) => {
      el.classList.toggle('selected', index === this.selectedIndex)
    })

    // Scroll selected item into view
    const selectedElement = resultElements[this.selectedIndex]
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }

  /**
   * Execute selected command
   */
  executeSelected() {
    const selectedCommand = this.filteredResults[this.selectedIndex]
    if (!selectedCommand) return

    this.hide()

    // Parse command and arguments
    let commandInput
    const userInput = this.input.value.trim()

    if (!userInput) {
      // No user input, just execute the selected command
      commandInput = selectedCommand.name
    } else {
      // Check if user input exactly matches the full command name or alias
      const commandNames = [selectedCommand.name, ...selectedCommand.aliases]
      const exactMatch = commandNames.find((name) => userInput.toLowerCase() === name.toLowerCase())

      // Check if user input starts with the command name or alias (with space after)
      const prefixMatch = commandNames.find((name) =>
        userInput.toLowerCase().startsWith(name.toLowerCase() + ' ')
      )

      if (exactMatch) {
        // User typed exact command name, execute it
        commandInput = exactMatch
      } else if (prefixMatch) {
        // User typed command name + arguments, use their full input
        commandInput = userInput
      } else {
        // User typed partial/fuzzy match or just selected from dropdown
        // Check if the user input is a substring of the selected command
        if (
          selectedCommand.name.toLowerCase().includes(userInput.toLowerCase()) ||
          selectedCommand.aliases.some((alias) =>
            alias.toLowerCase().includes(userInput.toLowerCase())
          )
        ) {
          // User typed a partial match, execute the selected command without extra args
          commandInput = selectedCommand.name
        } else {
          // User typed something else, use as arguments
          commandInput = `${selectedCommand.name} ${userInput}`
        }
      }
    }

    this.commandRegistry.executeCommand(commandInput)

    // Dispatch execution event
    this.dispatchEvent('execute', { command: selectedCommand, input: commandInput })
  }

  /**
   * Set command registry
   */
  setCommandRegistry(registry) {
    this.commandRegistry = registry
    if (this.isVisible) {
      this.updateResults()
    }
  }

  /**
   * Dispatch custom events
   */
  dispatchEvent(type, detail = {}) {
    const event = new CustomEvent(`commandbar:${type}`, { detail })
    document.dispatchEvent(event)
  }

  /**
   * Destroy command bar
   */
  destroy() {
    // Destroy header integration first
    if (this.headerIntegration) {
      this.headerIntegration.destroy()
      this.headerIntegration = null
    }

    // Remove main element
    if (this.element) {
      this.element.remove()
    }

    // Remove event listeners
    document.removeEventListener('keydown', this.globalKeyHandler)

    // Clean up component references
    this.commandCategories = null
    this.aboutMenu = null
  }
}
