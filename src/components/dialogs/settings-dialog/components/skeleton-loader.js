/**
 * Skeleton Loader Component
 * Provides loading states for settings tabs during content loading
 */

export class SkeletonLoader {
  /**
   * Create a skeleton loader
   * @param {Object} config - Configuration options
   * @param {string} config.type - Type of skeleton (field, section, full)
   * @param {number} config.count - Number of skeleton items
   * @param {boolean} config.animated - Whether to animate the skeleton
   */
  constructor(config = {}) {
    this.config = {
      type: 'field',
      count: 3,
      animated: true,
      ...config
    }
  }

  /**
   * Render field skeleton
   * @returns {string} Field skeleton HTML
   */
  renderFieldSkeleton() {
    return `
      <div class="skeleton-field">
        <div class="skeleton-label"></div>
        <div class="skeleton-input"></div>
        <div class="skeleton-description"></div>
      </div>
    `
  }

  /**
   * Render section skeleton
   * @returns {string} Section skeleton HTML
   */
  renderSectionSkeleton() {
    return `
      <div class="skeleton-section">
        <div class="skeleton-section-title"></div>
        <div class="skeleton-section-content">
          ${Array(this.config.count).fill(this.renderFieldSkeleton()).join('')}
        </div>
      </div>
    `
  }

  /**
   * Render full tab skeleton
   * @returns {string} Full tab skeleton HTML
   */
  renderFullSkeleton() {
    return `
      <div class="skeleton-tab">
        ${Array(3).fill(this.renderSectionSkeleton()).join('')}
      </div>
    `
  }

  /**
   * Render theme preview skeleton
   * @returns {string} Theme preview skeleton HTML
   */
  renderThemePreviewSkeleton() {
    return `
      <div class="skeleton-theme-preview">
        <div class="skeleton-theme-header">
          <div class="skeleton-theme-title"></div>
          <div class="skeleton-theme-indicator"></div>
        </div>
        <div class="skeleton-theme-content">
          <div class="skeleton-preview-sample"></div>
        </div>
      </div>
    `
  }

  /**
   * Render auth status skeleton
   * @returns {string} Auth status skeleton HTML
   */
  renderAuthStatusSkeleton() {
    return `
      <div class="skeleton-auth-status">
        <div class="skeleton-auth-header">
          <div class="skeleton-auth-indicator"></div>
          <div class="skeleton-auth-title"></div>
        </div>
        <div class="skeleton-auth-details">
          <div class="skeleton-auth-line"></div>
          <div class="skeleton-auth-line short"></div>
        </div>
      </div>
    `
  }

  /**
   * Render version info skeleton
   * @returns {string} Version info skeleton HTML
   */
  renderVersionInfoSkeleton() {
    return `
      <div class="skeleton-version-info">
        <div class="skeleton-app-logo">
          <div class="skeleton-app-icon"></div>
          <div class="skeleton-app-details">
            <div class="skeleton-app-title"></div>
            <div class="skeleton-app-tagline"></div>
          </div>
        </div>
        <div class="skeleton-version-grid">
          ${Array(3).fill(`
            <div class="skeleton-version-item">
              <div class="skeleton-version-label"></div>
              <div class="skeleton-version-value"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  /**
   * Render skeleton based on type
   * @returns {string} Skeleton HTML
   */
  render() {
    const animationClass = this.config.animated ? 'skeleton-animated' : ''
    
    let skeletonContent = ''
    
    switch (this.config.type) {
      case 'field':
        skeletonContent = Array(this.config.count).fill(this.renderFieldSkeleton()).join('')
        break
      case 'section':
        skeletonContent = this.renderSectionSkeleton()
        break
      case 'theme-preview':
        skeletonContent = Array(this.config.count).fill(this.renderThemePreviewSkeleton()).join('')
        break
      case 'auth-status':
        skeletonContent = this.renderAuthStatusSkeleton()
        break
      case 'version-info':
        skeletonContent = this.renderVersionInfoSkeleton()
        break
      case 'full':
      default:
        skeletonContent = this.renderFullSkeleton()
    }

    return `
      <div class="skeleton-container ${animationClass}" role="status" aria-label="Loading content">
        ${skeletonContent}
        <span class="sr-only">Loading settings...</span>
      </div>
    `
  }

  /**
   * Create skeleton for specific tab types
   * @param {string} tabId - Tab identifier
   * @returns {SkeletonLoader} Configured skeleton loader
   */
  static forTab(tabId) {
    const tabConfigs = {
      editor: { type: 'full', count: 4 },
      themes: { type: 'theme-preview', count: 3 },
      codemirror: { type: 'full', count: 6 },
      'git-integration': { type: 'auth-status', count: 1 },
      privacy: { type: 'version-info', count: 1 }
    }

    const config = tabConfigs[tabId] || { type: 'full', count: 3 }
    return new SkeletonLoader(config)
  }

  /**
   * Show skeleton with fade-in effect
   * @param {HTMLElement} container - Container to show skeleton in
   */
  show(container) {
    if (!container) return

    container.innerHTML = this.render()
    container.classList.add('skeleton-loading')
    
    // Add fade-in animation
    requestAnimationFrame(() => {
      container.classList.add('skeleton-visible')
    })
  }

  /**
   * Hide skeleton with fade-out effect
   * @param {HTMLElement} container - Container to hide skeleton from
   * @param {string} content - Content to replace skeleton with
   * @returns {Promise} Promise that resolves when animation completes
   */
  hide(container, content = '') {
    return new Promise((resolve) => {
      if (!container) {
        resolve()
        return
      }

      // Start fade-out
      container.classList.add('skeleton-hiding')
      
      setTimeout(() => {
        container.innerHTML = content
        container.classList.remove('skeleton-loading', 'skeleton-visible', 'skeleton-hiding')
        resolve()
      }, 200) // Match CSS transition duration
    })
  }

  /**
   * Create skeleton for async tab loading
   * @param {HTMLElement} container - Container element
   * @param {string} tabId - Tab identifier
   * @param {Function} loadContent - Function that returns promise with content
   * @returns {Promise} Promise that resolves when content is loaded
   */
  static async loadTabContent(container, tabId, loadContent) {
    const skeleton = SkeletonLoader.forTab(tabId)
    
    // Show skeleton
    skeleton.show(container)
    
    try {
      // Load content (simulate minimum loading time for UX)
      const [content] = await Promise.all([
        loadContent(),
        new Promise(resolve => setTimeout(resolve, 300)) // Minimum 300ms loading
      ])
      
      // Hide skeleton and show content
      await skeleton.hide(container, content)
      
      return content
    } catch (error) {
      // Show error state
      await skeleton.hide(container, `
        <div class="settings-error" role="alert">
          <h4>Error Loading Content</h4>
          <p>Failed to load tab content. Please try again.</p>
          <button class="settings-button secondary" onclick="location.reload()">
            Refresh Page
          </button>
        </div>
      `)
      
      throw error
    }
  }
}