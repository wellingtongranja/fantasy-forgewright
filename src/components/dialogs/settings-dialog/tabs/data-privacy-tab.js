/**
 * Data Privacy Settings Tab
 * Privacy policy, terms agreement, and data management controls
 */

import { SettingField } from '../components/setting-field.js'
import { getSetting, setSetting } from '../utils/settings-helpers.js'

export class DataPrivacyTab {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
  }

  /**
   * Get privacy settings
   * @param {Object} localSettings - Current local settings
   * @returns {Object} Privacy settings
   */
  getPrivacySettings(localSettings) {
    return getSetting(localSettings, 'privacy') || {
      agreedToTerms: false,
      agreedDate: null
    }
  }

  /**
   * Format agreement date for display
   * @param {string|number} timestamp - Agreement timestamp
   * @returns {string} Formatted date
   */
  formatAgreementDate(timestamp) {
    if (!timestamp) return 'Not yet agreed'
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  /**
   * Render the Data Privacy settings tab
   * @param {Object} localSettings - Current local settings
   * @param {Function} updateSetting - Update setting callback
   * @returns {string} Tab HTML
   */
  render(localSettings, updateSetting) {
    try {
      const privacySettings = this.getPrivacySettings(localSettings)
      const hasAgreed = privacySettings.agreedToTerms
      const agreementDate = this.formatAgreementDate(privacySettings.agreedDate)

      return `
        <div class="settings-sections">
          <div class="settings-section">
            <h4>📜 Privacy Policy & Terms</h4>
            
            <div class="privacy-agreement-container">
              <div class="privacy-policy-text">
                <h5>Fantasy Editor Privacy Commitment</h5>
                
                <div class="privacy-highlights">
                  <div class="privacy-item">
                    <span class="privacy-icon">🏠</span>
                    <div class="privacy-content">
                      <strong>Your documents stay on your device</strong>
                      <p>All your writing is stored locally in your browser. Nothing is sent to our servers.</p>
                    </div>
                  </div>
                  
                  <div class="privacy-item">
                    <span class="privacy-icon">🔀</span>
                    <div class="privacy-content">
                      <strong>Optional Git provider sync</strong>
                      <p>Choose to sync with GitHub, GitLab, Bitbucket, or any Git provider. Direct connection only.</p>
                    </div>
                  </div>
                  
                  <div class="privacy-item">
                    <span class="privacy-icon">🔒</span>
                    <div class="privacy-content">
                      <strong>No tracking or analytics</strong>
                      <p>We don't track your usage, collect analytics, or monitor your writing habits.</p>
                    </div>
                  </div>
                  
                  <div class="privacy-item">
                    <span class="privacy-icon">🎯</span>
                    <div class="privacy-content">
                      <strong>You control your data</strong>
                      <p>Export, import, or delete your data anytime. No vendor lock-in.</p>
                    </div>
                  </div>
                </div>
                
                <details class="privacy-details">
                  <summary>View Full Privacy Policy</summary>
                  <div class="privacy-full-text">
                    <h6>Information We Don't Collect</h6>
                    <ul>
                      <li>Personal information or email addresses</li>
                      <li>Document contents or writing</li>
                      <li>IP addresses or location data</li>
                      <li>Usage analytics or behavior tracking</li>
                    </ul>
                    
                    <h6>Local Storage</h6>
                    <p>Fantasy Editor uses your browser's IndexedDB to store:</p>
                    <ul>
                      <li>Documents you create and edit</li>
                      <li>Editor preferences and settings</li>
                      <li>Recent document history</li>
                      <li>Tags and document metadata</li>
                    </ul>
                    
                    <h6>Git Provider Integration</h6>
                    <p>If you choose to connect a Git provider:</p>
                    <ul>
                      <li>Authentication happens directly with your provider</li>
                      <li>Documents sync between your browser and repository</li>
                      <li>OAuth tokens are stored securely in your browser</li>
                      <li>We never see or store your repository contents</li>
                    </ul>
                    
                    <h6>Your Rights</h6>
                    <ul>
                      <li>Access all data (it's in your browser)</li>
                      <li>Delete all data (clear browser storage)</li>
                      <li>Export documents at any time</li>
                      <li>Use the editor completely offline</li>
                    </ul>
                  </div>
                </details>
                
                <details class="privacy-details">
                  <summary>View Terms of Service</summary>
                  <div class="privacy-full-text">
                    <h6>License</h6>
                    <p>Fantasy Editor is licensed under the MIT License.</p>
                    
                    <h6>Permitted Use</h6>
                    <ul>
                      <li>Install and use on multiple devices</li>
                      <li>Create and edit documents for any purpose</li>
                      <li>Export and share your documents</li>
                      <li>Sync with Git repositories</li>
                    </ul>
                    
                    <h6>Restrictions</h6>
                    <ul>
                      <li>Don't reverse engineer the software</li>
                      <li>Don't remove copyright notices</li>
                      <li>Don't use for unlawful purposes</li>
                      <li>Don't transmit malicious code</li>
                    </ul>
                    
                    <h6>Your Content</h6>
                    <p>You retain all rights to documents and content you create using Fantasy Editor.</p>
                    
                    <h6>No Warranty</h6>
                    <p>The software is provided "as is" during the alpha period.</p>
                  </div>
                </details>
              </div>
              
              <div class="privacy-agreement-actions">
                <label class="privacy-agreement-checkbox">
                  <input 
                    type="checkbox" 
                    data-setting="privacy.agreedToTerms"
                    ${hasAgreed ? 'checked' : ''}
                    ${hasAgreed ? 'disabled' : ''}
                  />
                  <span>I have read and agree to the Privacy Policy and Terms of Service</span>
                </label>
                
                <div class="agreement-status">
                  <span class="status-label">Status:</span>
                  <span class="status-value ${hasAgreed ? 'agreed' : 'pending'}">
                    ${hasAgreed ? `✓ Agreed on ${agreementDate}` : '⚠️ Agreement required for full functionality'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          ${hasAgreed ? this.renderDataManagement() : this.renderAgreementPrompt()}
        </div>
      `
    } catch (error) {
      console.error('Error rendering Data Privacy tab:', error)
      return `
        <div class="settings-error">
          <h4>Error Loading Privacy Settings</h4>
          <p>There was an error loading the privacy settings. Please try refreshing the page.</p>
        </div>
      `
    }
  }

  /**
   * Render agreement prompt when not agreed
   * @returns {string} HTML for agreement prompt
   */
  renderAgreementPrompt() {
    return `
      <div class="settings-section">
        <div class="agreement-prompt">
          <h4>🔐 Data Management Locked</h4>
          <p>Please agree to the Privacy Policy and Terms of Service above to access data management features.</p>
        </div>
      </div>
    `
  }

  /**
   * Render data management section
   * @returns {string} HTML for data management
   */
  renderDataManagement() {
    const clearDataField = new SettingField({
      label: 'Clear local data',
      type: 'select',
      setting: 'privacy.clearData',
      value: 'none',
      options: [
        { value: 'none', label: 'Select data to clear...' },
        { value: 'cache', label: 'Clear cache only' },
        { value: 'settings', label: 'Reset settings only' },
        { value: 'documents', label: 'Clear all documents' },
        { value: 'all', label: 'Clear all data (complete reset)' }
      ],
      description: 'WARNING: This action cannot be undone'
    })

    return `
      <div class="settings-section">
        <h4>📊 Data Management</h4>
        
        ${clearDataField.render()}
        
        <div class="data-management-actions">
          <button class="settings-button secondary" data-action="export-settings">
            <span>📤</span> Export Settings
          </button>
          <button class="settings-button secondary" data-action="import-settings">
            <span>📥</span> Import Settings
          </button>
          <button class="settings-button secondary" data-action="storage-info">
            <span>📊</span> Storage Information
          </button>
        </div>
        
        <div class="data-info">
          <p><small>All your data is stored locally in your browser. Use these tools to manage, backup, or transfer your settings.</small></p>
        </div>
      </div>
    `
  }

  /**
   * Attach event listeners after rendering
   * @param {HTMLElement} container - Container element
   * @param {Function} updateSetting - Update setting callback
   */
  attachEventListeners(container, updateSetting) {
    if (!container || typeof updateSetting !== 'function') return

    try {
      // Agreement checkbox
      const agreementCheckbox = container.querySelector('input[data-setting="privacy.agreedToTerms"]')
      if (agreementCheckbox && !agreementCheckbox.disabled) {
        agreementCheckbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            // Save agreement with timestamp
            updateSetting('privacy.agreedToTerms', true)
            updateSetting('privacy.agreedDate', Date.now())
            
            // Re-render the tab to show data management section
            const tabContent = container.closest('.settings-tab-content')
            if (tabContent) {
              const localSettings = this.settingsManager.getSettings()
              tabContent.innerHTML = this.render(localSettings, updateSetting)
              this.attachEventListeners(tabContent, updateSetting)
            }
          }
        })
      }

      // Clear data dropdown
      const clearDataSelect = container.querySelector('select[data-setting="privacy.clearData"]')
      if (clearDataSelect) {
        clearDataSelect.addEventListener('change', (e) => {
          const value = e.target.value
          if (value !== 'none') {
            this.handleClearData(value)
            e.target.value = 'none'
          }
        })
      }

      // Action buttons
      const actionButtons = container.querySelectorAll('[data-action]')
      actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault()
          this.handleDataAction(e.target.closest('[data-action]').dataset.action)
        })
      })

    } catch (error) {
      console.error('Error attaching Data Privacy tab event listeners:', error)
    }
  }

  /**
   * Handle data management actions
   * @param {string} action - Action to perform
   */
  async handleDataAction(action) {
    try {
      switch (action) {
        case 'export-settings':
          this.exportSettings()
          break
        case 'import-settings':
          this.importSettings()
          break
        case 'storage-info':
          this.showStorageInfo()
          break
        default:
          console.warn('Unknown data action:', action)
      }
    } catch (error) {
      console.error('Error executing data action:', error)
    }
  }

  /**
   * Handle clear data action
   * @param {string} dataType - Type of data to clear
   */
  async handleClearData(dataType) {
    const confirmMessages = {
      cache: 'Clear application cache? This will not affect your documents or settings.',
      settings: 'Reset all settings to defaults? Your documents will not be affected.',
      documents: 'Delete ALL documents? This action cannot be undone!',
      all: 'COMPLETELY RESET Fantasy Editor? This will delete ALL data including documents, settings, and cache. This action cannot be undone!'
    }

    const confirmed = confirm(`⚠️ ${confirmMessages[dataType]}\n\nAre you sure you want to continue?`)
    
    if (confirmed) {
      try {
        if (window.app?.devHelpers) {
          switch (dataType) {
            case 'cache':
              await window.app.devHelpers.clearCache()
              break
            case 'settings':
              await window.app.devHelpers.resetSettings()
              break
            case 'documents':
              await window.app.devHelpers.clearDocuments()
              break
            case 'all':
              await window.app.devHelpers.cleanStorage()
              break
          }
          
          alert('✅ Data cleared successfully. Refreshing the page...')
          window.location.reload()
        } else {
          console.warn('DevHelpers not available for data clearing')
        }
      } catch (error) {
        console.error('Error clearing data:', error)
        alert('❌ Error clearing data. Please try again.')
      }
    }
  }

  /**
   * Export settings to JSON file
   */
  exportSettings() {
    try {
      const settings = this.settingsManager.getSettings()
      const exportData = {
        version: '0.0.2-alpha',
        exportDate: new Date().toISOString(),
        settings: settings
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fantasy-editor-settings-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error exporting settings:', error)
      alert('❌ Error exporting settings. Please try again.')
    }
  }

  /**
   * Import settings from JSON file
   */
  importSettings() {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        try {
          const text = await file.text()
          const importData = JSON.parse(text)
          
          if (importData.settings) {
            const confirmed = confirm('Import settings? This will overwrite your current settings.')
            if (confirmed) {
              await this.settingsManager.saveSettings(importData.settings)
              alert('✅ Settings imported successfully. Refreshing the page...')
              window.location.reload()
            }
          } else {
            alert('❌ Invalid settings file format.')
          }
        } catch (error) {
          console.error('Error importing settings:', error)
          alert('❌ Error importing settings. Please check the file format.')
        }
      })
      
      input.click()
      
    } catch (error) {
      console.error('Error creating import dialog:', error)
      alert('❌ Error importing settings. Please try again.')
    }
  }

  /**
   * Show storage information
   */
  async showStorageInfo() {
    try {
      if (window.app?.devHelpers) {
        await window.app.devHelpers.showStorageInfo()
      } else {
        alert('Storage information is not available in this build.')
      }
    } catch (error) {
      console.error('Error showing storage info:', error)
      alert('❌ Error retrieving storage information.')
    }
  }

  /**
   * Validate privacy settings
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validate(settings) {
    const errors = []
    const privacySettings = getSetting(settings, 'privacy') || {}

    // No specific validation needed for privacy settings
    // They are simple boolean and timestamp values

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
      id: 'data-privacy',
      name: '🔒 Data Privacy',
      label: 'Data Privacy',
      keywords: ['privacy', 'data', 'terms', 'agreement', 'export', 'import', 'clear', 'storage']
    }
  }
}