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
   * Get sync frequency options
   * @returns {Array} Sync frequency options
   */
  getSyncFrequencyOptions() {
    return [
      { value: 'manual', label: 'Manual sync only' },
      { value: 30000, label: 'Every 30 seconds' },
      { value: 60000, label: 'Every minute' },
      { value: 300000, label: 'Every 5 minutes' },
      { value: 900000, label: 'Every 15 minutes' },
      { value: 1800000, label: 'Every 30 minutes' }
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
      const authManager = window.app?.authManager
      const isAuthenticated = authManager?.isAuthenticated() || false
      const currentUser = authManager?.getCurrentUser()
      const currentRepo = authManager?.getCurrentRepository()

      // Provider selection
      const providerField = new SettingField({
        label: 'Git Provider',
        type: 'select',
        setting: 'gitIntegration.provider',
        value: settings.provider || 'github',
        options: this.getGitProviders(),
        description: 'Choose your Git hosting provider'
      })

      // Auto-sync settings
      const autoSyncField = new SettingField({
        label: 'Auto-sync documents',
        type: 'checkbox',
        setting: 'gitIntegration.autoSync',
        value: settings.autoSync,
        description: 'Automatically sync documents to remote repository'
      })

      const syncFrequencyField = new SettingField({
        label: 'Sync frequency',
        type: 'select',
        setting: 'gitIntegration.syncFrequency',
        value: settings.syncFrequency || 300000,
        options: this.getSyncFrequencyOptions(),
        description: 'How often to sync when auto-sync is enabled'
      })

      // Sync on save
      const syncOnSaveField = new SettingField({
        label: 'Sync on save',
        type: 'checkbox',
        setting: 'gitIntegration.syncOnSave',
        value: settings.syncOnSave,
        description: 'Automatically sync document when saving'
      })

      // Conflict resolution
      const conflictResolutionField = new SettingField({
        label: 'Conflict resolution',
        type: 'select',
        setting: 'gitIntegration.conflictResolution',
        value: settings.conflictResolution || 'prompt',
        options: [
          { value: 'prompt', label: 'Always ask user' },
          { value: 'local', label: 'Prefer local changes' },
          { value: 'remote', label: 'Prefer remote changes' },
          { value: 'merge', label: 'Attempt automatic merge' }
        ],
        description: 'How to handle conflicts during sync'
      })

      return `
        <div class="settings-sections">
          <div class="settings-section">
            <h4>Authentication Status</h4>
            
            <div class="git-auth-status">
              ${this.renderAuthenticationStatus(isAuthenticated, currentUser, currentRepo)}
            </div>
          </div>
          
          <div class="settings-section">
            <h4>Provider Configuration</h4>
            
            ${providerField.render()}
          </div>
          
          <div class="settings-section">
            <h4>Synchronization Settings</h4>
            
            ${autoSyncField.render()}
            ${syncFrequencyField.render()}
            ${syncOnSaveField.render()}
            ${conflictResolutionField.render()}
          </div>
          
          <div class="settings-section">
            <h4>Actions</h4>
            
            <div class="git-actions">
              ${this.renderGitActions(isAuthenticated)}
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
          <button class="settings-button secondary" data-action="git-sync">
            <span>🔄</span> Sync Now
          </button>
          <button class="settings-button secondary" data-action="git-status">
            <span>📊</span> Repository Status
          </button>
          <button class="settings-button secondary" data-action="git-history">
            <span>📜</span> View History
          </button>
          <button class="settings-button danger" data-action="git-logout">
            <span>🚪</span> Sign Out
          </button>
        </div>
      `
    } else {
      return `
        <div class="git-action-buttons">
          <button class="settings-button primary" data-action="git-login">
            <span>🔑</span> Sign In with Git Provider
          </button>
          <button class="settings-button secondary" data-action="git-help">
            <span>❓</span> Git Integration Help
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

      // Git action buttons
      const actionButtons = container.querySelectorAll('[data-action^="git-"]')
      actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault()
          this.handleGitAction(e.target.dataset.action)
        })
      })

    } catch (error) {
      console.error('Error attaching Git Integration tab event listeners:', error)
    }
  }

  /**
   * Handle Git-specific actions
   * @param {string} action - Action to perform
   */
  async handleGitAction(action) {
    const commandBar = window.app?.commandBar
    
    try {
      switch (action) {
        case 'git-login':
          if (commandBar) {
            commandBar.executeCommand(':glo')
          }
          break
        case 'git-logout':
          if (commandBar) {
            commandBar.executeCommand(':gou')
          }
          break
        case 'git-sync':
          if (commandBar) {
            commandBar.executeCommand(':gsy')
          }
          break
        case 'git-status':
          if (commandBar) {
            commandBar.executeCommand(':gst')
          }
          break
        case 'git-history':
          if (commandBar) {
            commandBar.executeCommand(':gls')
          }
          break
        case 'git-help':
          if (commandBar) {
            commandBar.executeCommand(':h git')
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