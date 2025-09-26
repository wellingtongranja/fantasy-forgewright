/**
 * About Settings Tab
 * Simple application information
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
    let env = {}

    if (typeof window !== 'undefined') {
      try {
        env = import.meta?.env || {}
      } catch (error) {
        env = {}
      }
    }

    return {
      version: env.VITE_APP_VERSION || '0.0.2-alpha',
      buildDate: env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0]
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
            <h3>Fantasy Editor</h3>
            <p>A distraction-free markdown editor for writers</p>

            <div class="version-info">
              <div class="version-item">
                <span class="version-label">Version:</span>
                <span class="version-value">${versionInfo.version}</span>
              </div>
              <div class="version-item">
                <span class="version-label">Build Date:</span>
                <span class="version-value">${versionInfo.buildDate}</span>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="license-info">
              <p>Licensed under the <strong>MIT License</strong></p>
              <p><small>Free and open source software</small></p>
            </div>
          </div>

          <div class="settings-section">
            <div class="git-action-buttons">
              <button class="settings-button secondary" data-action="show-license">
                License
              </button>
              <button class="settings-button secondary" data-action="show-release">
                Release Notes
              </button>
              <button class="settings-button secondary" data-action="show-privacy">
                Privacy Policy
              </button>
              <button class="settings-button secondary" data-action="show-help">
                Help
              </button>
              <button class="settings-button secondary" data-action="show-guide">
                User Guide
              </button>
            </div>
          </div>
        </div>
      `
    } catch (error) {
      console.error('Error rendering About tab:', error)
      return `
        <div class="settings-error">
          <h4>Error Loading About Information</h4>
          <p>There was an error loading the about information.</p>
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
      const actionButtons = container.querySelectorAll('[data-action]')
      actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault()
          const action = e.target.dataset.action
          this.handleAboutAction(action)
        })
      })
    } catch (error) {
      console.error('Error attaching About tab event listeners:', error)
    }
  }

  /**
   * Handle About tab action buttons
   * @param {string} action - Action to perform
   */
  handleAboutAction(action) {
    const app = window.fantasyEditor || window.app

    try {
      // Close settings dialog first for all commands
      this.closeSettingsDialog()

      // Small delay to ensure dialog closes before executing command
      setTimeout(() => {
        switch (action) {
          case 'show-license':
            if (app && app.executeCommand) {
              app.executeCommand(':license')
            }
            break
          case 'show-release':
            if (app && app.executeCommand) {
              app.executeCommand(':release')
            }
            break
          case 'show-privacy':
            if (app && app.executeCommand) {
              app.executeCommand(':privacy')
            }
            break
          case 'show-help':
            if (app && app.executeCommand) {
              app.executeCommand(':help')
            }
            break
          case 'show-guide':
            if (app && app.executeCommand) {
              app.executeCommand(':guide')
            }
            break
          default:
            console.warn('Unknown About action:', action)
        }
      }, 100)
    } catch (error) {
      console.error('Error executing About action:', error)
    }
  }

  /**
   * Close the settings dialog
   */
  closeSettingsDialog() {
    try {
      // Try multiple approaches to close the settings dialog
      const settingsDialog = document.querySelector('.settings-dialog-overlay') ||
                            document.querySelector('.modal-overlay') ||
                            document.querySelector('[data-modal="settings"]')

      if (settingsDialog) {
        // Method 1: Click close button
        const closeButton = settingsDialog.querySelector('.settings-close-button') ||
                          settingsDialog.querySelector('.close-button') ||
                          settingsDialog.querySelector('[data-action="close"]') ||
                          settingsDialog.querySelector('button[aria-label="Close"]')

        if (closeButton) {
          closeButton.click()
          return
        }

        // Method 2: Trigger ESC key event
        const escEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          bubbles: true
        })
        settingsDialog.dispatchEvent(escEvent)

        // Method 3: Check if settingsManager exists and has close method
        const app = window.fantasyEditor || window.app
        if (app && app.settingsManager && typeof app.settingsManager.hide === 'function') {
          app.settingsManager.hide()
          return
        }

        // Method 4: Direct removal/hiding as last resort
        settingsDialog.remove()
      }
    } catch (error) {
      console.error('Error closing settings dialog:', error)
    }
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
      keywords: ['about', 'version', 'license', 'help', 'shortcuts']
    }
  }
}