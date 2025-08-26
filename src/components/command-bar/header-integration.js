/**
 * HeaderIntegration - Integrates the command bar into the application header
 * Provides click-to-focus functionality and discrete visual integration
 */

import './header-integration.css'

export class HeaderIntegration {
  constructor(commandBar) {
    this.commandBar = commandBar
    this.isIntegrated = false
    this.headerWrapper = null
    this.headerElement = null
    this.titleElement = null
    this.resizeHandler = null

    this.findHeaderElements()
    this.init()
  }

  /**
   * Find required header elements
   */
  findHeaderElements() {
    this.headerElement = document.querySelector('.app-header')
    this.titleElement = document.querySelector('.app-title')

    if (!this.headerElement || !this.titleElement) {
      throw new Error('Required header elements not found')
    }
  }

  /**
   * Initialize header integration
   */
  init() {
    this.createHeaderWrapper()
    this.setupResizeHandler()
  }

  /**
   * Create header wrapper element
   */
  createHeaderWrapper() {
    this.headerWrapper = document.createElement('div')
    this.headerWrapper.classList.add('command-bar-header-wrapper')
    
    // Add accessibility attributes
    this.headerWrapper.setAttribute('aria-label', 'Command palette input')
    this.headerWrapper.setAttribute('role', 'button')
    this.headerWrapper.setAttribute('tabindex', '0')
    
    this.attachWrapperEventListeners()
  }

  /**
   * Attach event listeners to header wrapper
   */
  attachWrapperEventListeners() {
    // Click to focus
    this.headerWrapper.addEventListener('click', (e) => {
      e.stopPropagation()
      this.focusCommandBar()
    })

    // Keyboard activation
    this.headerWrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        this.focusCommandBar()
      }
    })
  }

  /**
   * Focus the command bar
   */
  focusCommandBar() {
    this.commandBar.show()
    if (this.commandBar.input && this.commandBar.input.focus) {
      this.commandBar.input.focus()
    }
  }

  /**
   * Integrate command bar into header
   */
  integrate() {
    if (this.isIntegrated) return

    try {
      // Move command bar element to header wrapper
      this.headerWrapper.appendChild(this.commandBar.element)
      
      // Add header wrapper to header
      this.headerElement.appendChild(this.headerWrapper)
      
      // Update command bar styling
      this.commandBar.element.classList.add('command-bar-integrated')
      this.commandBar.element.classList.remove('command-bar-floating')
      
      this.isIntegrated = true
      this.updateResponsiveClasses()
      
    } catch (error) {
      throw new Error('Failed to integrate command bar into header')
    }
  }

  /**
   * Set up resize handler for responsive behavior
   */
  setupResizeHandler() {
    this.resizeHandler = () => {
      this.updateResponsiveClasses()
    }
    
    window.addEventListener('resize', this.resizeHandler)
  }

  /**
   * Update responsive classes based on viewport
   */
  updateResponsiveClasses() {
    if (!this.headerWrapper) return

    const isMobile = window.innerWidth <= 768
    
    if (isMobile) {
      this.headerWrapper.classList.add('mobile')
    } else {
      this.headerWrapper.classList.remove('mobile')
    }
  }

  /**
   * Update theme integration
   */
  updateTheme() {
    // Theme is handled via CSS variables, no explicit class management needed
    // This method exists for future theme-specific logic if needed
  }

  /**
   * Destroy header integration and restore original state
   */
  destroy() {
    if (!this.isIntegrated) return

    try {
      // Remove command bar from header
      if (this.headerWrapper && this.headerWrapper.parentNode) {
        this.headerWrapper.remove()
      }
      
      // Restore command bar to body
      document.body.appendChild(this.commandBar.element)
      
      // Restore original styling
      this.commandBar.element.classList.remove('command-bar-integrated')
      this.commandBar.element.classList.add('command-bar-floating')
      
      // Remove resize handler
      if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler)
        this.resizeHandler = null
      }
      
      this.isIntegrated = false
      
    } catch (error) {
      console.error('Error destroying header integration:', error)
    }
  }
}