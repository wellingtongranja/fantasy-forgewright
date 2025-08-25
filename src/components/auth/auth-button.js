/**
 * AuthButton - Multi-provider authentication button for application header
 * Shows provider selection when logged out, user info when logged in
 */
import { ProviderSelector } from './provider-selector.js'

export class AuthButton {
  constructor(authManager, onUserClick) {
    this.authManager = authManager
    this.onUserClick = onUserClick

    this.element = null
    this.providerSelector = null
    this.currentUser = null
    this.currentProvider = null

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
    
    // Create provider selector
    this.providerSelector = new ProviderSelector(this.authManager)
  }

  /**
   * Create DOM structure for auth button
   */
  createDOM() {
    this.element = document.createElement('div')
    this.element.className = 'auth-container'

    // Set initial content based on auth state
    this.updateDisplay()

    return this.element
  }

  /**
   * Update button display based on authentication state
   */
  updateDisplay() {
    if (!this.element) return

    const isAuthenticated = this.authManager?.isAuthenticated()

    if (isAuthenticated) {
      this.currentUser = this.authManager.getCurrentUser()
      this.currentProvider = this.authManager.getCurrentProvider()
      this.renderUserButton()
    } else {
      this.renderSignInButton()
    }
  }

  /**
   * Render sign in button for unauthenticated state
   */
  renderSignInButton() {
    const availableProviders = this.authManager.getAvailableProviders()
    
    if (availableProviders.length === 1) {
      // Single provider - show provider-specific button
      const provider = availableProviders[0]
      this.element.innerHTML = `
        <button class="auth-signin-btn single-provider" type="button" title="Sign in with ${provider.displayName}">
          ${this.getProviderIcon(provider.name)}
          <span class="auth-signin-text">Sign in with ${provider.displayName}</span>
        </button>
      `
    } else if (availableProviders.length > 1) {
      // Multiple providers - show generic sign in button
      this.element.innerHTML = `
        <button class="auth-signin-btn multi-provider" type="button" title="Choose Git provider">
          <svg class="auth-generic-icon" viewBox="0 0 16 16" width="16" height="16">
            <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span class="auth-signin-text">Sign in to Git</span>
          <svg class="auth-dropdown-icon" viewBox="0 0 16 16" width="12" height="12">
            <path fill="currentColor" d="M4.427 6.427L8 10l3.573-3.573L13 7.854 8 12.854l-5-5 1.427-1.427z"/>
          </svg>
        </button>
      `
    } else {
      // No providers configured
      this.element.innerHTML = `
        <div class="auth-no-providers" title="No Git providers configured">
          <svg class="auth-warning-icon" viewBox="0 0 16 16" width="16" height="16">
            <path fill="currentColor" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"/>
          </svg>
          <span class="auth-warning-text">No Git providers</span>
        </div>
      `
    }
  }

  /**
   * Render user button for authenticated state
   */
  renderUserButton() {
    if (!this.currentUser || !this.currentProvider) return

    // Use provider-specific avatar handling
    let avatarUrl = this.currentUser.avatar || this.currentUser.avatar_url
    const username = this.currentUser.username || this.currentUser.login
    const displayName = this.currentUser.name || username

    // Fallback avatar for providers that don't provide one
    if (!avatarUrl && this.currentProvider.name === 'github' && username) {
      avatarUrl = `https://github.com/${username}.png`
    }

    this.element.innerHTML = `
      <button class="auth-user-btn" type="button" title="${this.currentProvider.displayName}: ${username}">
        ${avatarUrl ? `
          <img 
            src="${avatarUrl}" 
            alt="${displayName}"
            class="auth-avatar"
            width="24" 
            height="24"
          />
        ` : `
          <div class="auth-avatar-placeholder" style="background-color: ${this.currentProvider.color}">
            ${this.getProviderIcon(this.currentProvider.name, 16)}
          </div>
        `}
        <span class="auth-username">${displayName}</span>
        <div class="auth-provider-badge" style="background-color: ${this.currentProvider.color}" title="${this.currentProvider.displayName}">
          ${this.getProviderIcon(this.currentProvider.name, 12)}
        </div>
        <svg class="auth-dropdown-icon" viewBox="0 0 16 16" width="12" height="12">
          <path fill="currentColor" d="M4.427 6.427L8 10l3.573-3.573L13 7.854 8 12.854l-5-5 1.427-1.427z"/>
        </svg>
      </button>
    `
  }

  /**
   * Get provider icon SVG
   * @param {string} providerName - Provider name
   * @param {number} size - Icon size
   * @returns {string} SVG icon
   */
  getProviderIcon(providerName, size = 16) {
    const icons = {
      github: `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
      </svg>`,
      gitlab: `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor">
        <path d="M8 14.2l2.4-7.4h-4.8L8 14.2z"/>
        <path d="M1.6 6.8L8 14.2 5.6 6.8H1.6z"/>
        <path d="M1.6 6.8l-.35-1.09c-.16-.51-.03-1.07.35-1.47l4.0.01L1.6 6.8z"/>
        <path d="M5.6 6.8L8 14.2l-6.4-7.4h4z"/>
        <path d="M14.4 6.8L8 14.2l2.4-6.9h4z"/>
        <path d="M14.4 6.8l.35-1.09c.16-.51.03-1.07-.35-1.47l-4.0.01L14.4 6.8z"/>
        <path d="M10.4 6.8L8 14.2l6.4-7.4h-4z"/>
      </svg>`,
      bitbucket: `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor">
        <path d="M0.5 0.8c-0.26 0.002-0.47 0.217-0.47 0.48 0 0.03 0.003 0.059 0.008 0.089l-0.001-0.003 2.23 13.44c0.041 0.24 0.244 0.419 0.49 0.419 0.004 0 0.008-0 0.012-0h10.46c0.209-0.001 0.385-0.148 0.427-0.345l0.001-0.003 2.23-13.44c0.005-0.026 0.007-0.055 0.007-0.085 0-0.263-0.212-0.475-0.475-0.475-0.004 0-0.008 0-0.012 0l-14.23 0.005zM9.67 10.01h-3.34l-0.89-4.64h5.12l-0.89 4.64z"/>
      </svg>`,
      generic: `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor">
        <path d="M8 1L1 4.5l7 3.5 7-3.5L8 1zM1 11.5l7 3.5 7-3.5M1 8l7 3.5L15 8"/>
      </svg>`
    }
    return icons[providerName] || icons.generic
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.element.addEventListener('click', (e) => {
      const isAuthenticated = this.authManager?.isAuthenticated()

      if (isAuthenticated && this.onUserClick) {
        this.onUserClick(e, this.currentUser, this.currentProvider)
      } else if (!isAuthenticated) {
        this.handleSignInClick(e)
      }
    })

    // Listen for authentication state changes
    window.addEventListener('auth-state-changed', this.handleAuthStateChange)
  }

  /**
   * Handle sign in button click
   * @param {Event} e - Click event
   */
  handleSignInClick(e) {
    const availableProviders = this.authManager.getAvailableProviders()
    
    if (availableProviders.length === 0) {
      // Show error message
      this.showError('No Git providers configured. Please check your environment variables.')
      return
    }
    
    if (availableProviders.length === 1) {
      // Single provider - login directly
      const provider = availableProviders[0]
      this.authManager.login(provider.name).catch(error => {
        console.error('Login failed:', error)
        this.showError(`Failed to sign in with ${provider.displayName}: ${error.message}`)
      })
    } else {
      // Multiple providers - show selector
      this.providerSelector.show()
    }
  }

  /**
   * Show error message (temporary toast)
   * @param {string} message - Error message
   */
  showError(message) {
    // Create toast element
    const toast = document.createElement('div')
    toast.className = 'auth-error-toast'
    toast.textContent = message
    
    // Add to body
    document.body.appendChild(toast)
    
    // Trigger animation
    setTimeout(() => toast.classList.add('visible'), 100)
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('visible')
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, 5000)
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
    const icon = this.element.querySelector('.auth-dropdown-icon')
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
    window.removeEventListener('auth-state-changed', this.handleAuthStateChange)

    // Destroy provider selector
    if (this.providerSelector) {
      this.providerSelector.hide()
      this.providerSelector = null
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.element = null
  }
}