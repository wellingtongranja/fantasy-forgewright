/**
 * GitHubAuthButton - GitHub login/user button for application header
 * Shows "Sign in..." when logged out, username + avatar when logged in
 */
export class GitHubAuthButton {
  constructor(githubAuth, onLoginClick, onUserClick) {
    this.githubAuth = githubAuth
    this.onLoginClick = onLoginClick
    this.onUserClick = onUserClick

    this.element = null
    this.currentUser = null

    // Bind event handlers to maintain correct context
    this.handleAuthStateChange = this.refresh.bind(this)

    this.init()
  }

  /**
   * Initialize the auth button
   */
  init() {
    this.createDOM()
    this.updateDisplay()
    this.attachEventListeners()
  }

  /**
   * Create DOM structure for auth button
   */
  createDOM() {
    this.element = document.createElement('div')
    this.element.className = 'github-auth-container'

    // Set initial content based on auth state
    this.updateDisplay()

    return this.element
  }

  /**
   * Update button display based on authentication state
   */
  updateDisplay() {
    if (!this.element) return

    const isAuthenticated = this.githubAuth?.isAuthenticated()

    if (isAuthenticated) {
      this.currentUser = this.githubAuth.getCurrentUser()
      this.renderUserButton()
    } else {
      this.renderSignInButton()
    }
  }

  /**
   * Render sign in button for unauthenticated state
   */
  renderSignInButton() {
    this.element.innerHTML = `
      <button class="github-signin-btn" type="button" title="Sign in to Git Repository">
        <svg class="github-icon" viewBox="0 0 16 16" width="16" height="16">
          <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        <span class="github-signin-text">Sign in...</span>
      </button>
    `
  }

  /**
   * Render user button for authenticated state
   */
  renderUserButton() {
    if (!this.currentUser) return

    this.element.innerHTML = `
      <button class="github-user-btn" type="button" title="Git Repository: ${this.currentUser.login}">
        <img 
          src="${this.currentUser.avatar_url || (this.currentUser.login ? `https://github.com/${this.currentUser.login}.png` : '')}" 
          alt="${this.currentUser.name || this.currentUser.login}"
          class="github-avatar"
          width="24" 
          height="24"
        />
        <span class="github-username">${this.currentUser.name || this.currentUser.login}</span>
        <svg class="github-dropdown-icon" viewBox="0 0 16 16" width="12" height="12">
          <path fill="currentColor" d="M4.427 6.427L8 10l3.573-3.573L13 7.854 8 12.854l-5-5 1.427-1.427z"/>
        </svg>
      </button>
    `
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.element.addEventListener('click', (e) => {
      const isAuthenticated = this.githubAuth?.isAuthenticated()

      if (isAuthenticated && this.onUserClick) {
        this.onUserClick(e, this.currentUser)
      } else if (!isAuthenticated && this.onLoginClick) {
        this.onLoginClick(e)
      }
    })

    // Listen for authentication state changes
    window.addEventListener('github-auth-state-changed', this.handleAuthStateChange)
  }

  /**
   * Refresh the button state (call after auth state changes)
   */
  refresh() {
    this.updateDisplay()
  }

  /**
   * Set menu open state (rotates dropdown arrow)
   */
  setMenuOpen(isOpen) {
    const icon = this.element.querySelector('.github-dropdown-icon')
    if (icon) {
      icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
    }
  }

  /**
   * Get the DOM element
   */
  getElement() {
    return this.element
  }

  /**
   * Destroy the component
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('github-auth-state-changed', this.handleAuthStateChange)

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.element = null
  }
}
