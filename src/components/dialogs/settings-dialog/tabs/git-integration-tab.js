/**
 * Git Integration Settings Tab
 * Multi-provider Git configuration and authentication management
 */

import { SettingField } from '../components/setting-field.js'
import { getSetting, setSetting, getDefaultSettings } from '../utils/settings-helpers.js'

export class GitIntegrationTab {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
    this.fields = []
    this.defaults = getDefaultSettings('gitIntegration')
  }

  /**
   * Get current Git integration settings with defaults
   * @param {Object} localSettings - Current local settings
   * @returns {Object} Git integration settings
   */
  getGitIntegrationSettings(localSettings) {
    const gitSettings = getSetting(localSettings, 'gitIntegration') || {}
    return {
      ...this.defaults,
      ...gitSettings
    }
  }

  /**
   * Get available Git providers
   * @returns {Array} Provider options
   */
  getGitProviders() {
    return [
      { value: 'github', label: 'GitHub' },
      { value: 'gitlab', label: 'GitLab' },
      { value: 'bitbucket', label: 'Bitbucket' },
      { value: 'generic', label: 'Generic Git' }
    ]
  }


  /**
   * Render the Git Integration settings tab
   * @param {Object} localSettings - Current local settings
   * @param {Function} updateSetting - Update setting callback
   * @returns {string} Tab HTML
   */
  render(localSettings, updateSetting) {
    try {
      const settings = this.getGitIntegrationSettings(localSettings)
      
      // Wait for app initialization before checking auth state
      let isAuthenticated = false
      let currentUser = null
      let currentRepo = null
      
      // Check if app and authManager are properly initialized
      // Priority: fantasyEditor first (has AuthManager), then window.app as fallback
      const app = (window.fantasyEditor?.authManager ? window.fantasyEditor : window.app) || window.fantasyEditor || window.app
      const authManager = app?.authManager
      
      // Authentication check complete
      
      if (app && authManager && typeof authManager.isAuthenticated === 'function') {
        try {
          isAuthenticated = authManager.isAuthenticated() || false
          currentUser = authManager.getCurrentUser()
          
          // Get repository information from GitHubStorage instead of AuthManager
          const githubStorage = app?.githubStorage
          if (githubStorage && typeof githubStorage.getConfig === 'function') {
            const config = githubStorage.getConfig()
            if (config && config.configured && config.owner && config.repo) {
              currentRepo = {
                owner: config.owner,
                name: config.repo,
                branch: config.branch || 'main'
              }
            }
          }
          
          // Authentication status retrieved successfully
        } catch (error) {
          console.error('Error checking authentication state:', error)
        }
      } else {
        // AuthManager not available - user not authenticated
      }

      // Fallback: Check for legacy GitHub authentication
      const legacyGitHubAuth = app?.githubAuth
      if (!isAuthenticated && legacyGitHubAuth) {
        const legacyAuthenticated = legacyGitHubAuth.isAuthenticated?.() || false
        const legacyUser = legacyGitHubAuth.getCurrentUser?.()
        
        // Legacy authentication check complete
        
        if (legacyAuthenticated) {
          isAuthenticated = true
          currentUser = legacyUser
        }
      }

      // Provider selection
      const providerField = new SettingField({
        label: 'Git Provider',
        type: 'select',
        setting: 'gitIntegration.provider',
        value: settings.provider || 'github',
        options: this.getGitProviders(),
        description: 'Choose your Git hosting provider'
      })


      return `
        <div class="settings-sections">
          <div class="settings-section">
            <h4>Git Integration</h4>
            
            <div class="git-integration-main">
              <div class="git-connection-card">
                <div class="connection-header">
                  <div class="provider-selection">
                    ${providerField.render()}
                  </div>
                </div>
                
                <div class="connection-status">
                  ${this.renderConnectionStatus(isAuthenticated, currentUser, currentRepo)}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      `
    } catch (error) {
      console.error('Error rendering Git Integration tab:', error)
      return `
        <div class="settings-error">
          <h4>Error Loading Git Integration Settings</h4>
          <p>There was an error loading the Git integration settings. Please try refreshing the page.</p>
        </div>
      `
    }
  }

  /**
   * Render connection status for the card
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @param {Object} currentUser - Current user info
   * @param {Object} currentRepo - Current repository info
   * @returns {string} Connection status HTML
   */
  renderConnectionStatus(isAuthenticated, currentUser, currentRepo) {
    if (isAuthenticated && currentUser) {
      return `
        <div class="status-connected">
          <div class="status-header">
            <div class="status-indicator connected">
              <span class="indicator-dot"></span>
              <span class="indicator-text">Connected as ${currentUser.username || currentUser.login}</span>
            </div>
            <div class="status-actions">
              <button type="button" class="btn-link" data-action="git-logout">
                Sign Out
              </button>
            </div>
          </div>
          ${currentRepo ? `
            <div class="repo-info">
              <span class="repo-name">${currentRepo.owner}/${currentRepo.name}</span>
              <span class="branch-name">${currentRepo.branch || 'main'}</span>
            </div>
          ` : `
            <div class="repo-info warning">
              <span class="repo-warning">Repository not configured</span>
              <span class="repo-hint">Use :gcf command to configure</span>
            </div>
          `}
        </div>
      `
    } else {
      return `
        <div class="status-disconnected">
          <div class="status-header">
            <div class="status-indicator disconnected">
              <span class="indicator-dot"></span>
              <span class="indicator-text">Not connected</span>
            </div>
            <div class="status-actions">
              <button type="button" class="btn-primary" data-action="git-login">
                Sign In
              </button>
            </div>
          </div>
          <div class="connection-hint">Choose a provider above and sign in to enable Git synchronization</div>
        </div>
      `
    }
  }

  /**
   * Render simplified status summary for actions section
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @param {Object} currentUser - Current user info
   * @param {Object} currentRepo - Current repository info
   * @returns {string} Status summary HTML
   */
  renderStatusSummary(isAuthenticated, currentUser, currentRepo) {
    if (isAuthenticated && currentUser) {
      const repoStatus = currentRepo 
        ? `${currentRepo.owner}/${currentRepo.name}` 
        : 'No repository configured'
      
      return `
        <div class="git-status-summary-content">
          <div class="status-item">
            <span class="status-label">User:</span>
            <span class="status-value">${currentUser.username || currentUser.login || 'Unknown'}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Repository:</span>
            <span class="status-value ${currentRepo ? '' : 'status-warning'}">${repoStatus}</span>
          </div>
          ${currentRepo ? `
            <div class="status-item">
              <span class="status-label">Branch:</span>
              <span class="status-value">${currentRepo.branch || 'main'}</span>
            </div>
          ` : ''}
        </div>
      `
    } else {
      return `
        <div class="git-status-summary-content not-connected">
          <div class="status-message">
            <span class="status-icon">⚠</span>
            <span class="status-text">Not connected to Git provider</span>
          </div>
          <div class="status-hint">Click "Connect to Git" to enable synchronization</div>
        </div>
      `
    }
  }

  /**
   * Render authentication status section
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @param {Object} currentUser - Current user info
   * @param {Object} currentRepo - Current repository info
   * @returns {string} Authentication status HTML
   */
  renderAuthenticationStatus(isAuthenticated, currentUser, currentRepo) {
    if (isAuthenticated && currentUser) {
      return `
        <div class="auth-status authenticated">
          <div class="auth-status-header">
            <span class="auth-status-indicator success">✓</span>
            <strong>Connected to ${currentUser.provider || 'GitHub'}</strong>
          </div>
          <div class="auth-details">
            <p><strong>User:</strong> ${currentUser.username || currentUser.login || 'Unknown'}</p>
            ${currentRepo ? `
              <p><strong>Repository:</strong> ${currentRepo.owner}/${currentRepo.name}</p>
              <p><strong>Branch:</strong> ${currentRepo.branch || 'main'}</p>
            ` : `
              <p><strong>Repository:</strong> <span class="status-warning">Not configured</span></p>
              <p><small>Use <code>:gcf owner repo</code> command to configure</small></p>
            `}
          </div>
        </div>
      `
    } else {
      return `
        <div class="auth-status unauthenticated">
          <div class="auth-status-header">
            <span class="auth-status-indicator warning">⚠</span>
            <strong>Not Connected</strong>
          </div>
          <div class="auth-details">
            <p>Sign in to enable document synchronization with your Git provider.</p>
            <p><small>Use <code>:glo</code> command to sign in</small></p>
          </div>
        </div>
      `
    }
  }

  /**
   * Render Git action buttons
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @returns {string} Git actions HTML
   */
  renderGitActions(isAuthenticated) {
    if (isAuthenticated) {
      return `
        <div class="git-action-buttons">
          <button class="settings-button danger" data-action="git-logout">
            Sign Out
          </button>
        </div>
      `
    } else {
      return `
        <div class="git-action-buttons">
          <button class="settings-button primary" data-action="git-login">
            Connect to Git
          </button>
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
    if (!container || typeof updateSetting !== 'function') return

    try {
      // Standard form field event listeners
      const checkboxes = container.querySelectorAll('input[type="checkbox"][data-setting^="gitIntegration."]')
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const setting = e.target.dataset.setting
          updateSetting(setting, e.target.checked)
        })
      })

      const selects = container.querySelectorAll('select[data-setting^="gitIntegration."]')
      selects.forEach(select => {
        select.addEventListener('change', (e) => {
          const setting = e.target.dataset.setting
          let value = e.target.value
          
          // Parse numeric values for sync frequency
          if (setting.includes('syncFrequency') && value !== 'manual') {
            value = parseInt(value, 10)
          }
          
          updateSetting(setting, value)
        })
      })

      // Git action buttons (including status action buttons)
      this.attachGitActionListeners(container)

      // Listen for authentication state changes
      this.setupAuthStateListener(container)

    } catch (error) {
      console.error('Error attaching Git Integration tab event listeners:', error)
    }
  }

  /**
   * Attach Git action button event listeners
   * @param {HTMLElement} container - Container element
   */
  attachGitActionListeners(container) {
    if (!container) return

    const actionButtons = container.querySelectorAll('[data-action^="git-"]')
    actionButtons.forEach(button => {
      // Remove existing listeners to avoid duplicates
      const action = button.dataset.action
      if (action) {
        button.addEventListener('click', (e) => {
          e.preventDefault()
          this.handleGitAction(action)
        })
      }
    })
  }

  /**
   * Set up authentication state listener to update UI when auth status changes
   * @param {HTMLElement} container - Container element
   */
  setupAuthStateListener(container) {
    // Remove existing listener if any
    if (this.authStateListener) {
      window.removeEventListener('auth-state-changed', this.authStateListener)
    }

    this.authStateListener = (event) => {
      try {
        // Update the status summary and actions sections
        const statusSummaryContainer = container.querySelector('.git-status-summary')
        const actionsContainer = container.querySelector('.git-actions')
        
        const { isAuthenticated, user, provider } = event.detail
        const app = window.app || window.fantasyEditor
        
        // Get repository information from GitHubStorage
        let currentRepo = null
        const githubStorage = app?.githubStorage
        if (githubStorage && typeof githubStorage.getConfig === 'function') {
          const config = githubStorage.getConfig()
          if (config && config.configured && config.owner && config.repo) {
            currentRepo = {
              owner: config.owner,
              name: config.repo,
              branch: config.branch || 'main'
            }
          }
        }
        
        // Update connection status area (new design)
        const connectionStatusContainer = container.querySelector('.connection-status')
        if (connectionStatusContainer) {
          connectionStatusContainer.innerHTML = this.renderConnectionStatus(
            isAuthenticated, 
            user, 
            currentRepo
          )
          
          // Re-attach event listeners for new status action buttons
          this.attachGitActionListeners(connectionStatusContainer)
        }

        // Legacy support: Update status summary container if it exists
        if (statusSummaryContainer) {
          statusSummaryContainer.innerHTML = this.renderStatusSummary(
            isAuthenticated, 
            user, 
            currentRepo
          )
        }

        // Legacy support: Update actions container if it exists
        if (actionsContainer) {
          actionsContainer.innerHTML = this.renderGitActions(isAuthenticated)
          
          // Re-attach action button listeners
          this.attachGitActionListeners(actionsContainer)
        }
      } catch (error) {
        console.error('Error updating Git Integration auth status:', error)
      }
    }

    // Listen for auth state changes
    window.addEventListener('auth-state-changed', this.authStateListener)
    
    // Also listen for GitHub-specific auth changes (fallback)
    window.addEventListener('github-auth-state-changed', this.authStateListener)
  }

  /**
   * Handle Git-specific actions
   * @param {string} action - Action to perform
   */
  async handleGitAction(action) {
    // Try fantasyEditor first, then window.app
    const app = window.fantasyEditor || window.app
    
    try {
      switch (action) {
        case 'git-login':
          // Note: OAuth flow requires page redirect, so dialog will close regardless
          // The user will return to this page after authentication completes
          if (app && app.executeCommand) {
            await app.executeCommand(':glo')
          }
          break
        case 'git-logout':
          // Keep dialog open so user can see they're logged out
          if (app && app.executeCommand) {
            await app.executeCommand(':gou')
          }
          break
        default:
          console.warn('Unknown Git action:', action)
      }
    } catch (error) {
      console.error('Error executing Git action:', error)
    }
  }

  /**
   * Validate all Git integration settings
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validate(settings) {
    const errors = []
    const gitSettings = getSetting(settings, 'gitIntegration') || {}

    // Validate provider
    if (gitSettings.provider && !['github', 'gitlab', 'bitbucket', 'generic'].includes(gitSettings.provider)) {
      errors.push('Invalid Git provider selected')
    }

    // Validate sync frequency
    if (gitSettings.syncFrequency && gitSettings.syncFrequency !== 'manual') {
      const frequency = parseInt(gitSettings.syncFrequency, 10)
      if (isNaN(frequency) || frequency < 10000) {
        errors.push('Sync frequency must be at least 10 seconds')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Clean up event listeners when tab is destroyed
   */
  destroy() {
    if (this.authStateListener) {
      window.removeEventListener('auth-state-changed', this.authStateListener)
      window.removeEventListener('github-auth-state-changed', this.authStateListener)
      this.authStateListener = null
    }
  }

  /**
   * Get tab configuration
   * @returns {Object} Tab config
   */
  static getConfig() {
    return {
      id: 'git-integration',
      name: '🔗 Git Integration',
      label: 'Git Integration Settings', 
      keywords: ['git', 'github', 'gitlab', 'bitbucket', 'sync', 'repository', 'version', 'control', 'auth']
    }
  }
}