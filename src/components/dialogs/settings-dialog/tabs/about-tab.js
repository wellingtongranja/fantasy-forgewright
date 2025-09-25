/**
 * About Settings Tab
 * Application information, version details, and help resources
 */

export class AboutTab {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
  }

  /**
   * Get app version information
   * @returns {Object} Version info
   */
  getVersionInfo() {
    // Use dynamic access to avoid Jest syntax errors with import.meta
    let env = {}
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Safely access import.meta without eval to prevent code injection
      try {
        // Use try-catch to safely access import.meta
        env = import.meta?.env || {}
      } catch (error) {
        // import.meta not available (likely in test environment)
        env = {}
      }
    } else if (typeof global !== 'undefined' && global.import?.meta?.env) {
      // Jest environment with mocked import.meta
      env = global.import.meta.env
    }
    
    return {
      version: env.VITE_APP_VERSION || '0.0.2-alpha',
      buildDate: env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0],
      environment: env.MODE || 'development'
    }
  }

  /**
   * Render the About settings tab
   * @param {Object} localSettings - Current local settings
   * @param {Function} updateSetting - Update setting callback
   * @returns {string} Tab HTML
   */
  render(localSettings, updateSetting) {
    try {
      const versionInfo = this.getVersionInfo()

      return `
        <div class="settings-sections">
          <div class="settings-section">
            <h4>ℹ️ About Fantasy Editor</h4>
            
            <div class="about-info">
              <div class="app-info">
                <div class="app-logo">
                  <span class="app-icon">📝</span>
                  <div class="app-details">
                    <h3>Fantasy Editor</h3>
                    <p class="app-tagline">A distraction-free markdown editor for writers</p>
                  </div>
                </div>
                
                <div class="version-info">
                  <div class="version-item">
                    <span class="version-label">Version:</span>
                    <span class="version-value">${versionInfo.version}</span>
                  </div>
                  <div class="version-item">
                    <span class="version-label">Build Date:</span>
                    <span class="version-value">${versionInfo.buildDate}</span>
                  </div>
                  <div class="version-item">
                    <span class="version-label">Environment:</span>
                    <span class="version-value">${versionInfo.environment}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="settings-section">
            <h4>🚀 Quick Links</h4>
            
            <div class="app-links">
              <a href="https://fantasy.forgewright.io" target="_blank" class="app-link">
                <span>🌐</span> Visit Website
              </a>
              <button class="settings-button secondary" data-action="show-shortcuts">
                <span>⌨️</span> Keyboard Shortcuts
              </button>
              <button class="settings-button secondary" data-action="show-changelog">
                <span>📋</span> Release Notes
              </button>
              <button class="settings-button secondary" data-action="show-documentation">
                <span>📚</span> Documentation
              </button>
            </div>
          </div>
          
          <div class="settings-section">
            <h4>📜 License Information</h4>
            
            <div class="legal-info">
              <div class="license-info">
                <h5>Open Source License</h5>
                <p>Fantasy Editor is licensed under the <strong>GNU Affero General Public License v3 (AGPL-3.0)</strong>.</p>
                <p><small>This is free software: you are free to change and redistribute it under certain conditions.</small></p>
                
                <div class="license-actions">
                  <a href="https://www.gnu.org/licenses/agpl-3.0.en.html" target="_blank" class="license-link">
                    View Full License
                  </a>
                </div>
              </div>
              
              <div class="attribution">
                <h5>Built With</h5>
                <p>Fantasy Editor is built with modern web technologies and powered by open source components:</p>
                <ul class="tech-stack">
                  <li>CodeMirror 6 - Advanced text editor</li>
                  <li>IndexedDB - Local document storage</li>
                  <li>Web Workers - Background processing</li>
                  <li>Progressive Web App - Offline capability</li>
                </ul>
                <p><small>Source code available for network users under AGPL-3.0 terms.</small></p>
              </div>
              
              <div class="commercial-info">
                <h5>Commercial Licensing</h5>
                <p>For proprietary use cases, commercial licenses are available.</p>
                <a href="mailto:licensing@forgewright.io" class="license-link">
                  Contact for Commercial License
                </a>
              </div>
            </div>
          </div>
          
          <div class="settings-section">
            <h4>💬 Support & Community</h4>
            
            <div class="support-info">
              <div class="support-item">
                <h5>Get Help</h5>
                <p>Need assistance? Check our documentation or reach out:</p>
                <div class="support-actions">
                  <a href="https://fantasy.forgewright.io/docs" target="_blank" class="support-link">
                    <span>📖</span> Read Documentation
                  </a>
                  <a href="https://github.com/fantasy-editor/fantasy-editor/issues" target="_blank" class="support-link">
                    <span>🐛</span> Report Issue
                  </a>
                </div>
              </div>
              
              <div class="support-item">
                <h5>Connect</h5>
                <p>Join our community and stay updated:</p>
                <div class="support-actions">
                  <a href="https://github.com/fantasy-editor" target="_blank" class="support-link">
                    <span>🐙</span> GitHub
                  </a>
                  <a href="mailto:hello@forgewright.io" class="support-link">
                    <span>✉️</span> Email Us
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div class="settings-section">
            <div class="about-footer">
              <p class="about-copyright">
                © ${new Date().getFullYear()} Forgewright, Inc. All rights reserved.
              </p>
              <p class="about-motto">
                <em>Write freely with Fantasy Editor.</em>
              </p>
            </div>
          </div>
        </div>
      `
    } catch (error) {
      console.error('Error rendering About tab:', error)
      return `
        <div class="settings-error">
          <h4>Error Loading About Information</h4>
          <p>There was an error loading the about information. Please try refreshing the page.</p>
        </div>
      `
    }
  }

  /**
   * Attach event listeners after rendering
   * @param {HTMLElement} container - Container element
   * @param {Function} updateSetting - Update setting callback
   */
  attachEventListeners(container, updateSetting) {
    if (!container) return

    try {
      // Action buttons
      const actionButtons = container.querySelectorAll('[data-action]')
      actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault()
          this.handleAboutAction(e.target.closest('[data-action]').dataset.action)
        })
      })

      // External links - ensure they open properly
      const externalLinks = container.querySelectorAll('a[href]')
      externalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.stopPropagation()
        })
      })

    } catch (error) {
      console.error('Error attaching About tab event listeners:', error)
    }
  }

  /**
   * Handle about-specific actions
   * @param {string} action - Action to perform
   */
  async handleAboutAction(action) {
    try {
      switch (action) {
        case 'show-shortcuts':
          this.showKeyboardShortcuts()
          break
        case 'show-changelog':
          this.showChangelog()
          break
        case 'show-documentation':
          this.showDocumentation()
          break
        default:
          console.warn('Unknown about action:', action)
      }
    } catch (error) {
      console.error('Error executing about action:', error)
    }
  }

  /**
   * Show keyboard shortcuts help
   */
  showKeyboardShortcuts() {
    const commandBar = window.app?.commandBar
    if (commandBar) {
      // Use command bar to show help
      commandBar.executeCommand(':h')
    } else {
      // Fallback to alert
      alert(`Keyboard Shortcuts:

Essential Commands:
• Ctrl+Space - Open command palette
• :n - New document
• :s - Save document
• :o - Open document
• :f - Search documents
• :h - Show all shortcuts

Editor Controls:
• :65, :80, :90 - Set editor width
• :zi, :zo, :zr - Zoom in/out/reset
• :t - Change theme
• :tt - Toggle theme

Git Integration:
• :glo - Git login
• :gsy - Git sync
• :gst - Git status

View complete list with :h command`)
    }
  }

  /**
   * Show changelog/release notes
   */
  showChangelog() {
    window.open('https://fantasy.forgewright.io/changelog', '_blank')
  }

  /**
   * Show documentation
   */
  showDocumentation() {
    window.open('https://fantasy.forgewright.io/docs', '_blank')
  }

  /**
   * Validate about settings (none to validate)
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validate(settings) {
    return {
      isValid: true,
      errors: []
    }
  }

  /**
   * Get tab configuration
   * @returns {Object} Tab config
   */
  static getConfig() {
    return {
      id: 'about',
      name: 'ℹ️ About',
      label: 'About',
      keywords: ['about', 'version', 'license', 'help', 'shortcuts', 'changelog', 'support', 'documentation']
    }
  }
}