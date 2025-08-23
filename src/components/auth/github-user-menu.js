/**
 * GitHubUserMenu - Dropdown menu for authenticated GitHub users
 * Shows repository info, sign out option, and help link
 */
export class GitHubUserMenu {
  constructor(githubAuth, githubStorage, onSignOut, onHelp) {
    this.githubAuth = githubAuth
    this.githubStorage = githubStorage
    this.onSignOut = onSignOut
    this.onHelp = onHelp
    
    this.element = null
    this.isVisible = false
    this.overlay = null
    
    this.init()
  }

  /**
   * Initialize the menu
   */
  init() {
    this.createDOM()
    this.attachEventListeners()
  }

  /**
   * Create DOM structure for the menu
   */
  createDOM() {
    // Create overlay for click-outside-to-close
    this.overlay = document.createElement('div')
    this.overlay.className = 'github-menu-overlay'
    this.overlay.style.display = 'none'

    // Create menu element
    this.element = document.createElement('div')
    this.element.className = 'github-user-menu'
    this.element.style.display = 'none'
    
    this.updateMenuContent()
    
    // Add to document
    document.body.appendChild(this.overlay)
    document.body.appendChild(this.element)
  }

  /**
   * Update menu content based on current state
   */
  updateMenuContent() {
    if (!this.element) return

    const user = this.githubAuth?.getCurrentUser()
    const config = this.githubStorage?.getConfig() || {}
    
    const repositoryText = config.configured 
      ? `${config.owner}/${config.repo}`
      : 'Not configured'

    this.element.innerHTML = `
      <div class="github-menu-header">
        <div class="github-menu-user">
          <img 
            src="${user?.avatar_url || `https://github.com/${user?.login}.png`}" 
            alt="${user?.name || user?.login}"
            class="github-menu-avatar"
            width="32" 
            height="32"
          />
          <div class="github-menu-user-info">
            <div class="github-menu-name">${user?.name || user?.login || 'Unknown'}</div>
            <div class="github-menu-login">@${user?.login || 'unknown'}</div>
          </div>
        </div>
      </div>
      
      <div class="github-menu-divider"></div>
      
      <div class="github-menu-item github-menu-repo">
        <div class="github-menu-label">Repository</div>
        <div class="github-menu-value ${config.configured ? '' : 'github-menu-value-inactive'}">${repositoryText}</div>
        ${!config.configured ? '<div class="github-menu-hint">Use :gcf to configure</div>' : ''}
      </div>
      
      <div class="github-menu-divider"></div>
      
      <button class="github-menu-item github-menu-action" data-action="signout">
        <svg class="github-menu-icon" viewBox="0 0 16 16" width="16" height="16">
          <path fill="currentColor" d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25V2.75zm10.44 4.5-1.97-1.97a.749.749 0 0 1 1.06-1.06l3.25 3.25a.749.749 0 0 1 0 1.06l-3.25 3.25a.749.749 0 1 1-1.06-1.06l1.97-1.97H6.75a.75.75 0 0 1 0-1.5h5.69z"/>
        </svg>
        <span>Sign out</span>
      </button>
      
      <button class="github-menu-item github-menu-action" data-action="help">
        <svg class="github-menu-icon" viewBox="0 0 16 16" width="16" height="16">
          <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8ZM6.92 6.085c.081-.16.19-.299.327-.415.388-.331.93-.372 1.324-.238.394.134.671.48.671.921 0 .342-.2.63-.544.772-.193.08-.3.25-.3.456v.413a.75.75 0 0 0 1.5 0V7.88c.567-.251.875-.816.875-1.459 0-.75-.508-1.394-1.26-1.556-.753-.162-1.584.047-2.08.616a2.52 2.52 0 0 0-.415.13V6.85a.75.75 0 0 0-1.098-.235ZM8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>
        </svg>
        <span>Help</span>
      </button>
    `
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Handle menu item clicks
    this.element.addEventListener('click', (e) => {
      const actionButton = e.target.closest('[data-action]')
      if (!actionButton) return

      const action = actionButton.dataset.action
      
      switch (action) {
        case 'signout':
          if (this.onSignOut) {
            this.onSignOut()
          }
          break
        case 'help':
          if (this.onHelp) {
            this.onHelp()
          }
          break
      }
      
      this.hide()
    })

    // Handle overlay click (close menu)
    this.overlay.addEventListener('click', () => {
      this.hide()
    })

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide()
      }
    })
  }

  /**
   * Show the menu positioned relative to a button
   */
  show(buttonElement) {
    if (!buttonElement || !this.element) return

    // Update content before showing
    this.updateMenuContent()

    // Calculate position
    const buttonRect = buttonElement.getBoundingClientRect()
    const menuWidth = 280 // Approximate width
    
    // Position below button, aligned to right edge
    let left = buttonRect.right - menuWidth
    let top = buttonRect.bottom + 8

    // Ensure menu stays within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    if (left < 8) {
      left = 8
    }
    
    if (top + 200 > viewportHeight) { // Approximate menu height
      top = buttonRect.top - 8 - 200
    }

    // Apply positioning
    this.element.style.left = `${left}px`
    this.element.style.top = `${top}px`

    // Show elements
    this.overlay.style.display = 'block'
    this.element.style.display = 'block'
    
    // Animate in
    requestAnimationFrame(() => {
      this.element.style.opacity = '1'
      this.element.style.transform = 'translateY(0)'
    })

    this.isVisible = true
  }

  /**
   * Hide the menu
   */
  hide() {
    if (!this.isVisible || !this.element) return

    // Animate out
    this.element.style.opacity = '0'
    this.element.style.transform = 'translateY(-8px)'
    
    setTimeout(() => {
      this.overlay.style.display = 'none'
      this.element.style.display = 'none'
    }, 150)

    this.isVisible = false
  }

  /**
   * Update menu content (call when auth or storage state changes)
   */
  refresh() {
    this.updateMenuContent()
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.element = null
    this.overlay = null
  }
}