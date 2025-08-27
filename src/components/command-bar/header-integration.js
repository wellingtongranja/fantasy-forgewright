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

    if (!this.headerElement) {
      console.warn('Header element (.app-header) not found in DOM')
      throw new Error('Header element (.app-header) not found')
    }
    
    if (!this.titleElement) {
      console.warn('Title element (.app-title) not found in DOM')
      throw new Error('Title element (.app-title) not found')
    }

    // Header elements found successfully
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
    
    // Ensure the command bar gets the show class and results are visible
    if (this.commandBar.element) {
      this.commandBar.element.classList.add('show')
      
      // Force the show class to be applied
      setTimeout(() => {
        if (!this.commandBar.element.classList.contains('show')) {
          console.warn('HeaderIntegration: Forcing show class')
          this.commandBar.element.classList.add('show')
        }
      }, 10)
    }
    
    if (this.commandBar.results) {
      this.commandBar.results.style.display = 'block'
    }
    
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

    // Remove all responsive classes first
    this.headerWrapper.classList.remove('mobile', 'tablet', 'desktop', 'wide')
    
    // Add appropriate responsive class based on viewport width
    if (window.innerWidth <= 480) {
      this.headerWrapper.classList.add('mobile')
    } else if (window.innerWidth <= 800) {
      this.headerWrapper.classList.add('tablet')
    } else if (window.innerWidth <= 1200) {
      this.headerWrapper.classList.add('desktop')
    } else {
      this.headerWrapper.classList.add('wide')
    }
    
    // Update wrapper positioning to prevent overlap
    this.updateWrapperPositioning()
  }
  
  /**
   * Update wrapper positioning to prevent overlap with header elements
   */
  updateWrapperPositioning() {
    if (!this.headerWrapper) return
    
    // Don't set inline styles that override CSS responsive breakpoints
    // CSS media queries handle responsive widths automatically
    // Only handle visibility and extreme overlap cases
    
    const headerWidth = this.headerElement.offsetWidth
    const titleWidth = this.titleElement.offsetWidth
    const authWidth = this.headerElement.querySelector('#github-auth-container')?.offsetWidth || 0
    
    // Calculate available space - minimum required for wrapper to be visible
    const minRequiredSpace = 120 // Minimum space needed for wrapper
    const leftMargin = 20
    const rightMargin = 20
    const minSpacing = 40
    
    const availableWidth = headerWidth - titleWidth - authWidth - leftMargin - rightMargin - minSpacing
    
    // Only hide wrapper if there's absolutely no space, otherwise let CSS handle sizing
    if (availableWidth < minRequiredSpace) {
      this.headerWrapper.style.display = 'none'
    } else {
      // Ensure wrapper is visible and let CSS responsive breakpoints handle width
      this.headerWrapper.style.display = ''
      // Remove any inline width/maxWidth that might override CSS media queries
      this.headerWrapper.style.width = ''
      this.headerWrapper.style.maxWidth = ''
      
      // Force repositioning to prevent overlap
      this.repositionWrapper()
    }
  }
  
  /**
   * Force repositioning of wrapper to prevent overlap
   */
  repositionWrapper() {
    if (!this.headerWrapper) return
    
    // Get current positions
    const titleRect = this.titleElement.getBoundingClientRect()
    const authRect = this.headerElement.querySelector('#github-auth-container')?.getBoundingClientRect()
    const wrapperRect = this.headerWrapper.getBoundingClientRect()
    
    if (authRect) {
      // Check if wrapper overlaps with auth button
      if (wrapperRect.right > authRect.left - 20) {
        // Move wrapper left to prevent overlap
        const overlap = wrapperRect.right - (authRect.left - 20)
        const newLeft = 50 - (overlap / this.headerElement.offsetWidth) * 100
        this.headerWrapper.style.left = `${newLeft}%`
      }
      
      // Check if wrapper overlaps with title
      if (wrapperRect.left < titleRect.right + 20) {
        // Move wrapper right to prevent overlap
        const overlap = (titleRect.right + 20) - wrapperRect.left
        const newLeft = 50 + (overlap / this.headerElement.offsetWidth) * 100
        this.headerWrapper.style.left = `${newLeft}%`
      }
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