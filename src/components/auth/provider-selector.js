/**
 * ProviderSelector - Multi-provider OAuth authentication UI
 * Allows users to choose between GitHub, GitLab, Bitbucket, and custom Git providers
 */
export class ProviderSelector {
  constructor(authManager) {
    this.authManager = authManager
    this.element = null
    this.isVisible = false
    this.customProviderForm = null
  }

  /**
   * Create provider selector UI
   * @returns {HTMLElement} Provider selector element
   */
  createElement() {
    if (this.element) {
      return this.element
    }

    this.element = document.createElement('div')
    this.element.className = 'provider-selector-overlay'
    this.element.innerHTML = this.getHTML()

    // Bind event listeners
    this.bindEventListeners()

    return this.element
  }

  /**
   * Get provider selector HTML
   * @returns {string} HTML content
   */
  getHTML() {
    const availableProviders = this.authManager.getAvailableProviders()

    return `
      <div class="provider-selector-modal">
        <div class="provider-selector-header">
          <h2>Sign in to Fantasy Editor</h2>
          <button class="provider-selector-close" aria-label="Close">×</button>
        </div>
        
        <div class="provider-selector-content">
          <div class="provider-list">
            ${availableProviders.map(provider => `
              <button class="provider-button" data-provider="${provider.name}">
                <div class="provider-icon" style="background-color: ${provider.color}">
                  ${this.getProviderIcon(provider.name)}
                </div>
                <div class="provider-info">
                  <div class="provider-name">${provider.displayName}</div>
                  <div class="provider-description">Sign in with ${provider.displayName}</div>
                </div>
              </button>
            `).join('')}
            
            <button class="provider-button provider-custom" data-provider="custom">
              <div class="provider-icon" style="background-color: #6b7280">
                ${this.getProviderIcon('custom')}
              </div>
              <div class="provider-info">
                <div class="provider-name">Custom Git Provider</div>
                <div class="provider-description">Connect to self-hosted Git server</div>
              </div>
            </button>
          </div>

          <div class="custom-provider-form" style="display: none;">
            <h3>Custom Git Provider</h3>
            <form class="custom-provider-config">
              <div class="form-group">
                <label for="provider-type">Provider Type</label>
                <select id="provider-type" name="providerType" required>
                  <option value="">Choose provider type...</option>
                  <option value="gitea">Gitea</option>
                  <option value="forgejo">Forgejo</option>
                  <option value="codeberg">Codeberg</option>
                  <option value="generic">Generic Git</option>
                </select>
              </div>

              <div class="form-group">
                <label for="base-url">Server URL</label>
                <input type="url" id="base-url" name="baseUrl" placeholder="https://your-git-server.com" required>
              </div>

              <div class="form-group">
                <label for="client-id">OAuth Client ID</label>
                <input type="text" id="client-id" name="clientId" placeholder="Your OAuth app client ID" required>
              </div>

              <div class="form-group">
                <label for="display-name">Display Name (optional)</label>
                <input type="text" id="display-name" name="displayName" placeholder="My Git Server">
              </div>

              <div class="form-actions">
                <button type="button" class="btn-secondary" id="back-to-providers">
                  ← Back to Providers
                </button>
                <button type="submit" class="btn-primary">
                  Connect
                </button>
              </div>
            </form>
          </div>

          <div class="provider-selector-footer">
            <p>By signing in, you agree to Fantasy Editor's use of your Git provider account for document storage and synchronization.</p>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Get provider icon SVG
   * @param {string} providerName - Provider name
   * @returns {string} SVG icon
   */
  getProviderIcon(providerName) {
    const icons = {
      github: `<svg viewBox="0 0 24 24" fill="white" width="24" height="24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>`,
      gitlab: `<svg viewBox="0 0 24 24" fill="white" width="24" height="24">
        <path d="M12 21.42l3.684-11.333h-7.368L12 21.42z"/>
        <path d="M2.343 10.086L12 21.42 8.316 10.087l-5.973.001z"/>
        <path d="M2.343 10.086l-.53-1.632c-.248-.764-.043-1.61.533-2.2l5.973.001-.53 5.831z"/>
        <path d="M8.316 10.087L12 21.42l-9.657-11.334 5.973.001z"/>
        <path d="M21.657 10.086L12 21.42l3.684-10.333 5.973.001z"/>
        <path d="M21.657 10.086l.53-1.632c.248-.764.043-1.61-.533-2.2l-5.973.001.53 5.831z"/>
        <path d="M15.684 10.087L12 21.42l9.657-11.334-5.973.001z"/>
      </svg>`,
      bitbucket: `<svg viewBox="0 0 24 24" fill="white" width="24" height="24">
        <path d="M0.778 1.213c-0.391 0.003-0.709 0.325-0.709 0.718 0 0.045 0.004 0.089 0.012 0.133l-0.001-0.005 3.341 20.132c0.061 0.359 0.365 0.628 0.734 0.628 0.006 0 0.012-0 0.018-0l15.654 0c0.313-0.001 0.577-0.221 0.639-0.517l0.001-0.005 3.341-20.132c0.007-0.039 0.011-0.083 0.011-0.128 0-0.393-0.318-0.712-0.711-0.712-0.006 0-0.012 0-0.018 0l-21.32 0.008zM14.5 15.014h-5.016l-1.331-6.963h7.679l-1.331 6.963z"/>
      </svg>`,
      custom: `<svg viewBox="0 0 24 24" fill="white" width="24" height="24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>`
    }
    return icons[providerName] || icons.custom
  }

  /**
   * Bind event listeners
   */
  bindEventListeners() {
    // Close button
    this.element.querySelector('.provider-selector-close').addEventListener('click', () => {
      this.hide()
    })

    // Provider buttons
    this.element.querySelectorAll('.provider-button[data-provider]').forEach(button => {
      button.addEventListener('click', (e) => {
        const provider = e.currentTarget.dataset.provider
        if (provider === 'custom') {
          this.showCustomProviderForm()
        } else {
          this.selectProvider(provider)
        }
      })
    })

    // Custom provider form
    const form = this.element.querySelector('.custom-provider-config')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleCustomProviderSubmit(e)
    })

    // Back button
    this.element.querySelector('#back-to-providers').addEventListener('click', () => {
      this.hideCustomProviderForm()
    })

    // Close on overlay click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.hide()
      }
    })

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide()
      }
    })
  }

  /**
   * Show provider selector
   */
  show() {
    if (!this.element) {
      this.createElement()
    }

    document.body.appendChild(this.element)
    this.isVisible = true
    
    // Focus first provider button
    const firstButton = this.element.querySelector('.provider-button')
    if (firstButton) {
      firstButton.focus()
    }

    // Add body class to prevent scrolling
    document.body.classList.add('provider-selector-open')
  }

  /**
   * Hide provider selector
   */
  hide() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.isVisible = false
    document.body.classList.remove('provider-selector-open')
    
    // Hide custom form if open
    this.hideCustomProviderForm()
  }

  /**
   * Show custom provider form
   */
  showCustomProviderForm() {
    const providerList = this.element.querySelector('.provider-list')
    const customForm = this.element.querySelector('.custom-provider-form')
    
    providerList.style.display = 'none'
    customForm.style.display = 'block'
    
    // Focus first input
    const firstInput = customForm.querySelector('input, select')
    if (firstInput) {
      firstInput.focus()
    }
  }

  /**
   * Hide custom provider form
   */
  hideCustomProviderForm() {
    const providerList = this.element.querySelector('.provider-list')
    const customForm = this.element.querySelector('.custom-provider-form')
    
    customForm.style.display = 'none'
    providerList.style.display = 'block'
    
    // Reset form
    const form = customForm.querySelector('form')
    form.reset()
  }

  /**
   * Handle provider selection
   * @param {string} providerName - Selected provider name
   */
  async selectProvider(providerName) {
    try {
      this.setLoading(true)
      await this.authManager.login(providerName)
    } catch (error) {
      console.error('Provider login failed:', error)
      this.showError(error.message)
      this.setLoading(false)
    }
  }

  /**
   * Handle custom provider form submission
   * @param {Event} event - Form submit event
   */
  async handleCustomProviderSubmit(event) {
    const formData = new FormData(event.target)
    const config = Object.fromEntries(formData.entries())
    
    // Validate required fields
    if (!config.providerType || !config.baseUrl || !config.clientId) {
      this.showError('Please fill in all required fields')
      return
    }

    try {
      this.setLoading(true)
      
      // Build custom provider config
      const customConfig = {
        baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
        clientId: config.clientId,
        displayName: config.displayName || config.providerType.charAt(0).toUpperCase() + config.providerType.slice(1),
        authUrl: `${config.baseUrl}/login/oauth/authorize`,
        scopes: ['repo', 'user:email']
      }

      await this.authManager.login(config.providerType, customConfig)
    } catch (error) {
      console.error('Custom provider login failed:', error)
      this.showError(error.message)
      this.setLoading(false)
    }
  }

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  setLoading(loading) {
    const buttons = this.element.querySelectorAll('button')
    const inputs = this.element.querySelectorAll('input, select')
    
    buttons.forEach(button => {
      button.disabled = loading
    })
    
    inputs.forEach(input => {
      input.disabled = loading
    })

    if (loading) {
      this.element.classList.add('loading')
    } else {
      this.element.classList.remove('loading')
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // Remove any existing error
    const existingError = this.element.querySelector('.error-message')
    if (existingError) {
      existingError.remove()
    }

    // Create error element
    const errorEl = document.createElement('div')
    errorEl.className = 'error-message'
    errorEl.textContent = message

    // Insert after header
    const header = this.element.querySelector('.provider-selector-header')
    header.insertAdjacentElement('afterend', errorEl)

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.remove()
      }
    }, 5000)
  }

  /**
   * Check if selector is visible
   * @returns {boolean} Visibility state
   */
  getIsVisible() {
    return this.isVisible
  }
}