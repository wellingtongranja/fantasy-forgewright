/**
 * Privacy & About Settings Tab
 * Privacy controls and application information
 */

import { SettingField } from '../components/setting-field.js'
import { getSetting, setSetting, getDefaultSettings } from '../utils/settings-helpers.js'

export class PrivacyTab {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
    this.fields = []
    this.defaults = getDefaultSettings('privacy')
  }

  /**
   * Get current privacy settings with defaults
   * @param {Object} localSettings - Current local settings
   * @returns {Object} Privacy settings
   */
  getPrivacySettings(localSettings) {
    const privacySettings = getSetting(localSettings, 'privacy') || {}
    return {
      ...this.defaults,
      ...privacySettings
    }
  }

  /**
   * Get app version information
   * @returns {Object} Version info
   */
  getVersionInfo() {
    return {
      version: import.meta.env.VITE_APP_VERSION || '0.0.2-alpha',
      buildDate: import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0],
      environment: import.meta.env.MODE || 'development'
    }
  }

  /**
   * Render the Privacy & About settings tab
   * @param {Object} localSettings - Current local settings
   * @param {Function} updateSetting - Update setting callback
   * @returns {string} Tab HTML
   */
  render(localSettings, updateSetting) {
    try {
      const settings = this.getPrivacySettings(localSettings)
      const versionInfo = this.getVersionInfo()

      // Privacy settings
      const analyticsField = new SettingField({
        label: 'Enable analytics',
        type: 'checkbox',
        setting: 'privacy.analytics',
        value: settings.analytics,
        description: 'Help improve Fantasy Editor by sharing anonymous usage data'
      })

      const crashReportingField = new SettingField({
        label: 'Crash reporting',
        type: 'checkbox',
        setting: 'privacy.crashReporting',
        value: settings.crashReporting,
        description: 'Automatically report application crashes and errors'
      })

      const dataSavingField = new SettingField({
        label: 'Data saving mode',
        type: 'checkbox',
        setting: 'privacy.dataSaving',
        value: settings.dataSaving,
        description: 'Reduce data usage by minimizing background operations'
      })

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
        <div class="settings-sections">
          <div class="settings-section">
            <h4>Privacy Controls</h4>
            
            ${analyticsField.render()}
            ${crashReportingField.render()}
            ${dataSavingField.render()}
          </div>
          
          <div class="settings-section">
            <h4>Data Management</h4>
            
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
          </div>
          
          <div class="settings-section">
            <h4>About Fantasy Editor</h4>
            
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
              </div>
              
              <div class="legal-info">
                <div class="license-info">
                  <h5>License</h5>
                  <p>Fantasy Editor is licensed under the <strong>GNU Affero General Public License v3 (AGPL-3.0)</strong>.</p>
                  <p><small>This is free software: you are free to change and redistribute it under certain conditions.</small></p>
                </div>
                
                <div class="attribution">
                  <h5>Open Source</h5>
                  <p>Built with modern web technologies and powered by open source components.</p>
                  <p><small>Source code available for network users under AGPL-3.0 terms.</small></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    } catch (error) {
      console.error('Error rendering Privacy tab:', error)
      return `
        <div class="settings-error">
          <h4>Error Loading Privacy Settings</h4>
          <p>There was an error loading the privacy settings. Please try refreshing the page.</p>
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
      const checkboxes = container.querySelectorAll('input[type="checkbox"][data-setting^="privacy."]')
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const setting = e.target.dataset.setting
          updateSetting(setting, e.target.checked)
        })
      })

      const selects = container.querySelectorAll('select[data-setting^="privacy."]')
      selects.forEach(select => {
        select.addEventListener('change', (e) => {
          const setting = e.target.dataset.setting
          const value = e.target.value
          
          // Handle clear data action
          if (setting === 'privacy.clearData' && value !== 'none') {
            this.handleClearData(value)
            // Reset select to default
            e.target.value = 'none'
          }
        })
      })

      // Action buttons
      const actionButtons = container.querySelectorAll('[data-action]')
      actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault()
          this.handlePrivacyAction(e.target.dataset.action)
        })
      })

      // External links
      const externalLinks = container.querySelectorAll('.app-link[href]')
      externalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          // Let default behavior handle external links
          e.stopPropagation()
        })
      })

    } catch (error) {
      console.error('Error attaching Privacy tab event listeners:', error)
    }
  }

  /**
   * Handle privacy-specific actions
   * @param {string} action - Action to perform
   */
  async handlePrivacyAction(action) {
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
        case 'show-shortcuts':
          this.showKeyboardShortcuts()
          break
        case 'show-changelog':
          this.showChangelog()
          break
        default:
          console.warn('Unknown privacy action:', action)
      }
    } catch (error) {
      console.error('Error executing privacy action:', error)
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

    const confirmed = confirm(`⚠️ ${confirmMessages[dataType]} \n\nAre you sure you want to continue?`)
    
    if (confirmed) {
      try {
        // Execute clear data operation based on type
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
        version: this.getVersionInfo().version,
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
   * Show keyboard shortcuts help
   */
  showKeyboardShortcuts() {
    const commandBar = window.app?.commandBar
    if (commandBar) {
      commandBar.executeCommand(':h')
    } else {
      alert('Keyboard shortcuts: \n\n• Ctrl+Space - Open command palette\n• :h - Show help\n• :n - New document\n• :s - Save document\n• :o - Open document')
    }
  }

  /**
   * Show changelog/release notes
   */
  showChangelog() {
    // This could open a modal or navigate to changelog
    alert('Release notes are available at: https://fantasy.forgewright.io/changelog')
  }

  /**
   * Validate all privacy settings
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validate(settings) {
    const errors = []
    const privacySettings = getSetting(settings, 'privacy') || {}

    // Privacy settings are mostly boolean, minimal validation needed
    // Could add validation for specific privacy compliance requirements here

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
      id: 'privacy',
      name: '🔒 Privacy & About',
      label: 'Privacy & About',
      keywords: ['privacy', 'about', 'analytics', 'data', 'clear', 'reset', 'version', 'license']
    }
  }
}