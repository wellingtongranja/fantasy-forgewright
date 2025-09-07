/**
 * SettingsDialog - Modal dialog for Fantasy Editor settings
 * Provides tabbed interface for comprehensive user configuration
 */

import { THEME_COLORS, getThemeColors, getHeaderColors, getCustomThemeBaseColors } from '../../core/themes/theme-constants.js'
import { ThemesTab } from './settings-dialog/tabs/themes-tab.js'
import { EditorTab } from './settings-dialog/tabs/editor-tab.js'
import { CodeMirrorTab } from './settings-dialog/tabs/codemirror-tab.js'
import { GitIntegrationTab } from './settings-dialog/tabs/git-integration-tab.js'
import { PrivacyTab } from './settings-dialog/tabs/privacy-tab.js'
import { SkeletonLoader } from './settings-dialog/components/skeleton-loader.js'

export class SettingsDialog {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
    this.isOpen = false
    this.element = null
    this.currentTab = 'editor'
    this.searchQuery = ''
    this.filteredTabs = []
    this.hasChanges = false
    this.onClose = null
    this.onSave = null
    
    // Local state for UI (not persisted until Save)
    this.localSettings = null
    this.originalSettings = null
    
    // Throttling for live preview to reduce lag
    this.livePreviewThrottleTimer = null
    
    
    // Listen for theme changes to update dialog appearance
    this.handleThemeChange = this.handleThemeChange.bind(this)
    document.addEventListener('themechange', this.handleThemeChange)

    // Listen for settings changes from external sources
    this.handleExternalSettingsChange = this.handleExternalSettingsChange.bind(this)
    this.settingsManager.addListener(this.handleExternalSettingsChange)
    
    // Bind search handlers once to reuse them
    this.boundHandleSearch = this.handleSearch.bind(this)
    this.boundHandleSearchKeydown = this.handleSearchKeydown.bind(this)
    
    // Tab configuration
    this.tabs = [
      { 
        id: 'editor', 
        name: '📝 Editor', 
        label: 'Editor Settings',
        keywords: ['width', 'zoom', 'spell', 'auto save', 'layout', 'display', 'behavior']
      },
      { 
        id: 'themes', 
        name: '🎨 Themes', 
        label: 'Theme Customization',
        keywords: ['color', 'custom', 'background', 'text', 'accent']
      },
      { 
        id: 'codemirror', 
        name: '🖥️ CodeMirror', 
        label: 'CodeMirror Settings',
        keywords: ['line numbers', 'wrap', 'fold', 'font', 'bracket']
      },
      { 
        id: 'git-integration', 
        name: '🔀 Git Integration', 
        label: 'Git Integration & Version Control',
        keywords: ['github', 'gitlab', 'bitbucket', 'git', 'provider', 'version', 'control', 'repository', 'sync']
      },
      { 
        id: 'privacy', 
        name: '🔒 Privacy', 
        label: 'Privacy & About',
        keywords: ['analytics', 'crash', 'privacy', 'about', 'license']
      }
    ]
    
    // Callbacks
    this.onClose = null
    this.onSave = null
    
    // Settings change tracking
    this.hasChanges = false
    this.originalSettings = null
    
    // Initialize tab components
    this.editorTab = new EditorTab(settingsManager)
    this.themesTab = new ThemesTab(settingsManager)
    this.codeMirrorTab = new CodeMirrorTab(settingsManager)
    this.gitIntegrationTab = new GitIntegrationTab(settingsManager)
    this.privacyTab = new PrivacyTab(settingsManager)
  }

  /**
   * Show settings dialog
   */
  show(initialTab = 'editor', onClose = null, onSave = null) {
    if (this.isOpen) return

    this.isOpen = true
    this.currentTab = initialTab
    this.searchQuery = ''
    this.onClose = onClose
    
    // Only override onSave if a new callback is provided
    if (onSave !== null) {
      this.onSave = onSave
    }
    
    this.hasChanges = false
    
    // Initialize local settings from saved settings (deep copy)
    this.originalSettings = this.settingsManager.getAllSettings()
    this.localSettings = JSON.parse(JSON.stringify(this.originalSettings))
    
    this.render()
    this.attachEventListeners()
    this.updateFilteredTabs()
    
    // Focus management
    document.body.classList.add('dialog-open')
    this.focusSearchInput()
  }

  /**
   * Hide settings dialog
   */
  hide() {
    if (!this.isOpen) return

    // Clear any pending live preview throttle
    if (this.livePreviewThrottleTimer) {
      clearTimeout(this.livePreviewThrottleTimer)
      this.livePreviewThrottleTimer = null
    }

    // If there are unsaved changes, ask user what to do
    if (this.hasChanges) {
      const shouldSave = confirm('You have unsaved changes. Would you like to save them?')
      if (shouldSave) {
        this.saveSettings()
      } else {
        // Revert UI to original settings
        this.revertToOriginalSettings()
      }
    }

    this.isOpen = false
    this.searchQuery = ''
    this.filteredTabs = []
    this.localSettings = null
    this.originalSettings = null
    
    // Cleanup tab components
    if (this.editorTab && typeof this.editorTab.destroy === 'function') {
      this.editorTab.destroy()
    }
    if (this.themesTab) {
      this.themesTab.destroy()
    }
    if (this.codeMirrorTab && typeof this.codeMirrorTab.destroy === 'function') {
      this.codeMirrorTab.destroy()
    }
    if (this.gitIntegrationTab && typeof this.gitIntegrationTab.destroy === 'function') {
      this.gitIntegrationTab.destroy()
    }
    if (this.privacyTab && typeof this.privacyTab.destroy === 'function') {
      this.privacyTab.destroy()
    }
    
    if (this.element) {
      this.element.remove()
      this.element = null
    }
    
    document.body.classList.remove('dialog-open')
    
    // Call close callback
    if (this.onClose) {
      this.onClose(this.hasChanges)
    }
  }

  /**
   * Render the complete dialog
   */
  render() {
    this.element = document.createElement('div')
    this.element.className = 'settings-dialog-overlay'
    this.element.innerHTML = `
      <div class="settings-dialog">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `
    
    document.body.appendChild(this.element)
  }

  /**
   * Render clean header with just title and close
   */
  renderHeader() {
    return `
      <div class="settings-header">
        <div class="settings-title">
          <h2>Settings</h2>
        </div>
        <button class="settings-close-btn" data-action="close" aria-label="Close settings">
          ×
        </button>
      </div>
    `
  }

  /**
   * Render main content area with tabs and content
   */
  renderContent() {
    return `
      <div class="settings-content">
        <div class="settings-sidebar">
          ${this.renderTabNavigation()}
        </div>
        <div class="settings-main">
          <div 
            class="settings-tab-content"
            id="settings-panel-${this.currentTab}"
            role="tabpanel"
            aria-labelledby="settings-tab-${this.currentTab}"
            tabindex="0"
          >
            ${this.renderTabContent()}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render tab navigation sidebar with search
   */
  renderTabNavigation() {
    const visibleTabs = this.getVisibleTabs()
    
    return `
      <div class="settings-sidebar-content">
        <div class="settings-search-container">
          <input 
            type="text" 
            class="settings-search" 
            placeholder="Search..." 
            value="${this.searchQuery}"
            autocomplete="off"
          />
        </div>
        
        <div class="settings-tabs-container">
          ${this.renderTabsOnly(visibleTabs)}
        </div>
      </div>
    `
  }

  /**
   * Render just the tabs part (can be updated without affecting search)
   */
  renderTabsOnly(visibleTabs) {
    if (visibleTabs.length === 0 && this.searchQuery) {
      return `
        <div class="settings-no-results">
          <p>No settings found</p>
          <button class="settings-clear-search" data-action="clear-search">
            Clear
          </button>
        </div>
      `
    }

    return `
      <nav class="settings-tabs" role="tablist" aria-label="Settings categories">
        ${visibleTabs.map(tab => `
          <button 
            id="settings-tab-${tab.id}"
            class="settings-tab ${tab.id === this.currentTab ? 'active' : ''}"
            data-tab="${tab.id}"
            role="tab"
            aria-selected="${tab.id === this.currentTab}"
            aria-controls="settings-panel-${tab.id}"
            tabindex="${tab.id === this.currentTab ? '0' : '-1'}"
            aria-describedby="tab-desc-${tab.id}"
          >
            ${tab.name}
            <span id="tab-desc-${tab.id}" class="sr-only">${tab.label}</span>
          </button>
        `).join('')}
      </nav>
    `
  }

  /**
   * Render simple footer with save button
   */
  renderFooter() {
    return `
      <div class="settings-footer">
        <div class="settings-status">
          ${this.hasChanges ? `
            <span class="settings-changes-indicator">●</span>
            Unsaved changes
          ` : ''}
        </div>
        <div class="settings-actions">
          <button class="settings-btn settings-btn-primary" data-action="save" ${!this.hasChanges ? 'disabled' : ''}>
            Save
          </button>
        </div>
      </div>
    `
  }

  /**
   * Render content for current tab
   */
  renderTabContent() {
    const tab = this.tabs.find(t => t.id === this.currentTab)
    if (!tab) {
      return '<div class="settings-error">Tab not found</div>'
    }

    return `
      <div 
        class="settings-panel" 
        id="settings-panel-${tab.id}"
        role="tabpanel"
        aria-labelledby="settings-tab-${tab.id}"
      >
        <div class="settings-panel-header">
          <h3>${tab.label}</h3>
        </div>
        <div class="settings-panel-content">
          ${this.renderTabContentBody(tab)}
        </div>
      </div>
    `
  }

  /**
   * Render tab content body based on tab type
   */
  renderTabContentBody(tab) {
    switch (tab.id) {
      case 'editor':
        return this.editorTab.render(this.localSettings, this.updateSetting.bind(this))
      case 'themes':
        return this.themesTab.render(this.localSettings, this.updateSetting.bind(this))
      case 'codemirror':
        return this.codeMirrorTab.render(this.localSettings, this.updateSetting.bind(this))
      case 'git-integration':
        return this.gitIntegrationTab.render(this.localSettings, this.updateSetting.bind(this))
      case 'privacy':
        return this.privacyTab.render(this.localSettings, this.updateSetting.bind(this))
      default:
        return this.renderTabContentPlaceholder(tab)
    }
  }




  /**
   * Render placeholder content for tabs (will be replaced in later steps)
   */
  renderTabContentPlaceholder(tab) {
    const examples = {
      themes: 'Custom theme creation, color picker, live preview',
      codemirror: 'Line numbers, word wrap, syntax highlighting, code folding options',
      'git-integration': 'Git provider selection (GitHub/GitLab/Bitbucket), repository configuration, authentication, version control settings',
      privacy: 'Analytics settings, crash reporting, about information, license details'
    }

    return `
      <div class="settings-placeholder">
        <p><strong>Coming in Step ${this.getStepForTab(tab.id)}:</strong></p>
        <p>${examples[tab.id] || 'Settings for this section'}</p>
        <div class="settings-placeholder-preview">
          <div class="settings-field">
            <label>Example Setting</label>
            <select disabled>
              <option>Sample Option</option>
            </select>
          </div>
          <div class="settings-field">
            <label>
              <input type="checkbox" disabled> 
              Sample Checkbox Setting
            </label>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Get step number for tab implementation
   */
  getStepForTab(tabId) {
    const steps = {
      editor: '4',
      codemirror: '5', 
      themes: '6',
      'git-integration': '7',
      privacy: '8'
    }
    return steps[tabId] || '?'
  }

  /**
   * Get visible tabs based on search filter
   */
  getVisibleTabs() {
    if (!this.searchQuery.trim()) {
      return this.tabs
    }
    
    const query = this.searchQuery.toLowerCase()
    return this.tabs.filter(tab => {
      const nameMatch = tab.name.toLowerCase().includes(query)
      const labelMatch = tab.label.toLowerCase().includes(query)
      const keywordMatch = tab.keywords.some(keyword => 
        keyword.toLowerCase().includes(query)
      )
      return nameMatch || labelMatch || keywordMatch
    })
  }

  /**
   * Update filtered tabs and refresh UI
   */
  updateFilteredTabs() {
    const visibleTabs = this.getVisibleTabs()
    
    // If current tab is not visible, switch to first visible tab
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === this.currentTab)) {
      this.currentTab = visibleTabs[0].id
    }
    
    this.refreshTabNavigation()
    this.refreshTabContent()
  }

  /**
   * Refresh only the tab navigation (preserve search input focus)
   */
  refreshTabNavigation() {
    const tabsContainer = this.element?.querySelector('.settings-tabs-container')
    if (tabsContainer) {
      const visibleTabs = this.getVisibleTabs()
      tabsContainer.innerHTML = this.renderTabsOnly(visibleTabs)
      // No need to re-attach search listeners since search input is preserved
    }
  }

  /**
   * Refresh only the tab content
   */
  refreshTabContent() {
    const contentArea = this.element?.querySelector('.settings-tab-content')
    if (contentArea) {
      contentArea.innerHTML = this.renderTabContent()
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.element) return

    this.attachSearchListeners()

    // Action buttons and settings controls
    this.element.addEventListener('click', this.handleClick.bind(this))
    this.element.addEventListener('change', this.handleSettingChange.bind(this))
    this.element.addEventListener('input', this.handleSettingInput.bind(this))
    
    // Keyboard navigation
    this.element.addEventListener('keydown', this.handleKeydown.bind(this))
    
    // Tab navigation with arrow keys
    this.element.addEventListener('keydown', this.handleTabNavigation.bind(this))
    
    // Click outside to close
    this.element.addEventListener('click', this.handleOverlayClick.bind(this))
    
    // Attach tab-specific event listeners
    this.attachTabEventListeners()
  }

  /**
   * Attach search input event listeners (can be called separately for re-renders)
   */
  attachSearchListeners() {
    const searchInput = this.element?.querySelector('.settings-search')
    if (searchInput) {
      // Remove existing listeners to avoid duplicates
      searchInput.removeEventListener('input', this.boundHandleSearch)
      searchInput.removeEventListener('keydown', this.boundHandleSearchKeydown)
      
      // Add fresh listeners
      searchInput.addEventListener('input', this.boundHandleSearch)
      searchInput.addEventListener('keydown', this.boundHandleSearchKeydown)
    }
  }

  /**
   * Attach tab-specific event listeners
   */
  attachTabEventListeners() {
    const tabContent = this.element?.querySelector('.settings-tab-content')
    if (!tabContent) return

    // Attach listeners based on current tab
    switch (this.currentTab) {
      case 'editor':
        this.editorTab.attachEventListeners(tabContent, this.updateSetting.bind(this))
        break
      case 'themes':
        this.themesTab.attachEventListeners(tabContent, this.updateSetting.bind(this))
        break
      case 'codemirror':
        this.codeMirrorTab.attachEventListeners(tabContent, this.updateSetting.bind(this))
        break
      case 'git-integration':
        this.gitIntegrationTab.attachEventListeners(tabContent, this.updateSetting.bind(this))
        break
      case 'privacy':
        this.privacyTab.attachEventListeners(tabContent, this.updateSetting.bind(this))
        break
      // Add other tabs here as they are implemented
    }
  }

  /**
   * Handle search input changes
   */
  handleSearch(event) {
    this.searchQuery = event.target.value
    this.updateFilteredTabs()
  }

  /**
   * Handle search input keyboard navigation
   */
  handleSearchKeydown(event) {
    if (event.key === 'Escape') {
      if (this.searchQuery) {
        this.clearSearch()
      } else {
        this.hide()
      }
      event.preventDefault()
    } else if (event.key === 'ArrowDown') {
      this.focusFirstTab()
      event.preventDefault()
    }
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    const action = event.target.dataset.action
    const tab = event.target.dataset.tab
    const setting = event.target.dataset.setting
    const value = event.target.dataset.value
    
    // Check for theme preview card click
    const themeCard = event.target.closest('[data-theme-preview]')
    if (themeCard) {
      this.handleThemeSelect(themeCard.dataset.themePreview)
      return
    }
    
    if (action === 'close') {
      this.hide()
    } else if (action === 'save') {
      this.saveSettings()
    } else if (action === 'reset') {
      this.resetSettings()
    } else if (action === 'reset-zoom') {
      this.handleZoomReset()
    } else if (action === 'clear-search') {
      this.clearSearch()
    } else if (action === 'activate-custom-theme') {
      this.handleActivateCustomTheme()
    } else if (action === 'reset-custom-colors') {
      this.handleResetCustomColors()
    } else if (action === 'reset-header-colors') {
      this.handleResetHeaderColors()
    } else if (event.target.classList.contains('clear-header-color')) {
      this.handleClearHeaderColor(event.target.dataset.headerColorKey)
    } else if (tab) {
      this.switchTab(tab)
    } else if (setting && value !== undefined) {
      // Handle button-based settings (like width presets)
      this.updateSetting(setting, this.parseSettingValue(setting, value))
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(event) {
    // Handle theme card keyboard selection
    const themeCard = event.target.closest('[data-theme-preview]')
    if (themeCard && (event.key === 'Enter' || event.key === ' ')) {
      this.handleThemeSelect(themeCard.dataset.themePreview)
      event.preventDefault()
      return
    }
    
    if (event.key === 'Escape' && !this.searchQuery) {
      this.hide()
      event.preventDefault()
    } else if (event.key === 'Tab') {
      this.handleTabKeyNavigation(event)
    }
  }

  /**
   * Handle tab key navigation for accessibility
   */
  handleTabKeyNavigation(event) {
    const focusableElements = this.element.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    if (event.shiftKey && document.activeElement === firstElement) {
      lastElement.focus()
      event.preventDefault()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      firstElement.focus()
      event.preventDefault()
    }
  }

  /**
   * Handle overlay click (click outside dialog)
   */
  handleOverlayClick(event) {
    if (event.target === this.element) {
      this.hide()
    }
  }

  /**
   * Handle setting change events (select, checkbox)
   */
  handleSettingChange(event) {
    const setting = event.target.dataset.setting
    if (!setting) return
    
    const value = this.parseSettingValue(setting, event.target.value, event.target.type, event.target.checked)
    this.updateSetting(setting, value)
  }

  /**
   * Handle setting input events (range, text)
   */
  handleSettingInput(event) {
    const setting = event.target.dataset.setting
    if (!setting) return
    
    // For range inputs, update live
    if (event.target.type === 'range') {
      const value = this.parseSettingValue(setting, event.target.value)
      this.updateSetting(setting, value)
      this.updateZoomDisplay(value)
    }
    
    // For text inputs (including custom theme name and hex colors)
    if (event.target.type === 'text') {
      let value = event.target.value
      
      // Validate hex color inputs
      if (setting.includes('colors') && event.target.classList.contains('color-hex-input')) {
        if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
          // Keep previous valid value
          return
        }
        // Update corresponding color picker
        const colorPicker = event.target.previousElementSibling
        if (colorPicker && colorPicker.type === 'color') {
          colorPicker.value = value
        }
      }
      
      // Validate custom theme name length
      if (setting === 'editor.customTheme.name' && value.length > 50) {
        value = value.substring(0, 50)
        event.target.value = value
      }
      
      this.updateSetting(setting, value)
      
      // For theme name, immediately persist to localStorage for real-time feedback
      if (setting === 'editor.customTheme.name') {
        const currentCustomTheme = this.settingsManager.get('editor.customTheme') || {}
        this.settingsManager.set('editor.customTheme', { ...currentCustomTheme, name: value })
        
        // Enable/disable activate button based on name
        const activateBtn = this.element.querySelector('[data-action="activate-custom-theme"]')
        if (activateBtn) {
          activateBtn.disabled = !value.trim()
        }
      }
    }
    
    // For color inputs
    if (event.target.type === 'color') {
      const value = event.target.value
      this.updateSetting(setting, value)
      
      // For custom theme colors, immediately persist to localStorage for real-time feedback
      if (setting.includes('editor.customTheme.colors')) {
        const currentCustomTheme = this.settingsManager.get('editor.customTheme') || {}
        const colorKey = setting.split('.').pop() // Extract color key (backgroundPrimary, etc)
        const updatedCustomTheme = {
          ...currentCustomTheme,
          colors: {
            ...(currentCustomTheme.colors || {}),
            [colorKey]: value
          }
        }
        this.settingsManager.set('editor.customTheme', updatedCustomTheme)
      }
      
      // Update corresponding hex input
      const hexInput = event.target.nextElementSibling
      if (hexInput && hexInput.classList.contains('color-hex-input')) {
        hexInput.value = value
      }
      
      // Update custom theme preview if on themes tab
      if (this.currentTab === 'themes') {
        this.applyCustomThemePreview()
      }
    }
  }

  /**
   * Parse setting value based on type
   */
  parseSettingValue(setting, value, inputType = '', checked = false) {
    if (inputType === 'checkbox') {
      return checked
    }
    
    if (setting.includes('width') || setting.includes('zoom') || setting.includes('Interval')) {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? value : parsed
    }
    
    return value
  }

  /**
   * Update a setting with live preview (not persisted until Save)
   */
  updateSetting(path, value) {
    try {
      // Check if value actually changed to avoid unnecessary updates
      const currentValue = this.getLocalSetting(path)
      if (currentValue === value) {
        return // No change, skip update
      }
      
      // Update local settings (for UI state)
      this.setLocalSetting(path, value)
      this.hasChanges = true
      
      // Update UI immediately for visual feedback
      this.refreshSettingsUI(path, value)
      this.refreshFooter()
      
      // Special handling for base theme changes
      if (path === 'editor.customTheme.baseTheme') {
        this.handleBaseThemeChange(value)
      }
      
      // Apply live preview with throttling for width changes to reduce lag
      if (path === 'editor.width') {
        this.applyLivePreviewThrottled(path, value)
      } else {
        this.applyLivePreview(path, value)
      }
      
    } catch (error) {
      console.warn('Failed to update setting:', error)
    }
  }


  /**
   * Get a value from local settings (helper method)
   */
  getLocalSetting(path) {
    if (!this.localSettings) return undefined
    
    const keys = path.split('.')
    let current = this.localSettings

    for (const key of keys) {
      if (!current || typeof current !== 'object') {
        return undefined
      }
      current = current[key]
    }

    return current
  }

  /**
   * Set a value in local settings (helper method)
   */
  setLocalSetting(path, value) {
    const keys = path.split('.')
    let current = this.localSettings

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    // Set the final value
    current[keys[keys.length - 1]] = value
  }

  /**
   * Apply settings for live preview (without saving to localStorage)
   */
  applyLivePreview(path, value) {
    if (!window.app) return // No app context available
    
    switch (path) {
      case 'editor.theme':
        if (window.app.themeManager) {
          window.app.themeManager.applyThemeOnly(value)
        }
        break
        
      case 'editor.width':
        if (window.app.widthManager) {
          window.app.widthManager.applyWidthOnly(value)
        }
        break
        
      case 'editor.zoom':
        if (window.app.widthManager) {
          window.app.widthManager.applyZoomOnly(value)
        }
        break
    }
  }

  /**
   * Throttled version of applyLivePreview for width changes to reduce lag
   */
  applyLivePreviewThrottled(path, value) {
    // Clear existing timer
    if (this.livePreviewThrottleTimer) {
      clearTimeout(this.livePreviewThrottleTimer)
    }
    
    // Apply with delay to allow rapid clicking without lag
    this.livePreviewThrottleTimer = setTimeout(() => {
      this.applyLivePreview(path, value)
      this.livePreviewThrottleTimer = null
    }, 100) // 100ms throttle - fast enough for live preview, slow enough to prevent lag
  }

  /**
   * Refresh footer to show/hide save button
   */
  refreshFooter() {
    const footer = this.element?.querySelector('.settings-footer')
    if (footer) {
      footer.innerHTML = this.renderFooter().match(/<div class="settings-footer">([\s\S]*)<\/div>/)[1]
    }
  }

  /**
   * Refresh settings UI after changes
   */
  refreshSettingsUI(path, value) {
    if (this.currentTab !== 'editor') return
    
    // Update width preset buttons - avoid unnecessary DOM manipulation
    if (path === 'editor.width') {
      const presets = this.element.querySelectorAll('.width-preset')
      presets.forEach(preset => {
        const presetValue = parseInt(preset.dataset.value)
        const shouldBeActive = presetValue === value
        const isCurrentlyActive = preset.classList.contains('active')
        
        // Only update if state actually changed
        if (shouldBeActive !== isCurrentlyActive) {
          preset.classList.toggle('active', shouldBeActive)
        }
      })
    }
    
    // Update zoom display
    if (path === 'editor.zoom') {
      this.updateZoomDisplay(value)
    }
    
    // Update auto-save interval field
    if (path === 'editor.autoSave') {
      const intervalField = this.element.querySelector('#auto-save-interval')?.closest('.settings-field')
      if (intervalField) {
        intervalField.classList.toggle('disabled', !value)
        const select = intervalField.querySelector('#auto-save-interval')
        if (select) select.disabled = !value
      }
    }
  }

  /**
   * Update zoom display value
   */
  updateZoomDisplay(zoomValue) {
    const zoomDisplay = this.element.querySelector('.zoom-value')
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(zoomValue * 100)}%`
    }
  }

  /**
   * Handle zoom reset button
   */
  handleZoomReset() {
    const zoomSlider = this.element.querySelector('#editor-zoom')
    if (zoomSlider) {
      zoomSlider.value = 1.0
      this.updateSetting('editor.zoom', 1.0)
    }
  }

  /**
   * Handle theme selection from preview cards
   */
  handleThemeSelect(theme) {
    if (!theme || theme === this.localSettings?.editor?.theme) return
    
    // Update local settings
    this.updateSetting('editor.theme', theme)
    
    // Update UI to show active theme
    this.element.querySelectorAll('.theme-preview-card').forEach(card => {
      card.classList.toggle('active', card.dataset.themePreview === theme)
    })
    
    // Apply live preview
    this.applyLivePreview()
  }

  /**
   * Handle activating custom theme
   */
  handleActivateCustomTheme() {
    const customTheme = this.localSettings?.editor?.customTheme
    if (!customTheme?.name) {
      this.showNotification('Please enter a name for your custom theme', 'warning')
      return
    }
    
    // Set theme to custom
    this.updateSetting('editor.theme', 'custom')
    
    // Immediately persist theme activation and customTheme data to localStorage
    this.settingsManager.set('editor.theme', 'custom')
    this.settingsManager.set('editor.customTheme', customTheme)
    
    // Update UI
    this.element.querySelectorAll('.theme-preview-card').forEach(card => {
      card.classList.remove('active')
    })
    
    const customPreview = this.element.querySelector('.custom-theme-preview')
    if (customPreview) {
      customPreview.classList.add('active')
    }
    
    // Apply custom theme through theme manager for proper full application
    if (window.app?.themeManager) {
      window.app.themeManager.applyTheme('custom')
    } else {
      // Fallback to direct application
      this.applyCustomThemePreview()
    }
    
    this.showNotification(`Custom theme "${customTheme.name}" activated successfully`, 'success')
  }

  /**
   * Handle resetting custom theme colors to base theme defaults
   */
  handleResetCustomColors() {
    const baseTheme = this.localSettings?.editor?.customTheme?.baseTheme || 'light'
    const defaultColors = this.getDefaultThemeColors(baseTheme)
    
    // Update each color
    Object.keys(defaultColors).forEach(key => {
      this.updateSetting(`editor.customTheme.colors.${key}`, defaultColors[key])
    })
    
    // Refresh the tab to show updated colors
    this.refreshTabContent()
  }

  /**
   * Handle base theme change - automatically update colors to match new base theme
   */
  handleBaseThemeChange(newBaseTheme) {
    // Get default colors for the new base theme
    const defaultColors = this.getDefaultThemeColors(newBaseTheme)
    
    // Update each color setting directly in local settings to avoid recursion
    const currentCustomTheme = this.getLocalSetting('editor.customTheme') || {}
    const updatedCustomTheme = {
      ...currentCustomTheme,
      baseTheme: newBaseTheme,
      colors: { ...defaultColors }
    }
    
    // Update local settings directly
    this.setLocalSetting('editor.customTheme', updatedCustomTheme)
    this.hasChanges = true
    
    // Refresh the themes tab to show the updated colors
    this.refreshTabContent()
    
    // Apply live preview of the new colors
    this.applyCustomThemePreview()
    
    // Show notification to user
    this.showNotification(`Colors updated to match ${newBaseTheme} theme`, 'info')
  }

  /**
   * Handle resetting header colors to theme defaults
   */
  handleResetHeaderColors() {
    const currentTheme = this.getLocalSetting('editor.theme') || 'light'
    
    // Get theme defaults from centralized constants
    const defaults = getHeaderColors(currentTheme)
    this.updateSetting('editor.headerColors', defaults)
    
    // Refresh the tab to show updated colors
    this.refreshTabContent()
  }

  /**
   * Handle clearing individual header color (revert to theme default)
   */
  handleClearHeaderColor(colorKey) {
    const headerColors = { ...(this.getLocalSetting('editor.headerColors') || {}) }
    delete headerColors[colorKey]
    
    this.updateSetting('editor.headerColors', headerColors)
    this.refreshTabContent()
  }

  /**
   * Get default colors for a base theme
   */
  getDefaultThemeColors(baseTheme) {
    return getCustomThemeBaseColors(baseTheme)
  }
  
  /**
   * Get theme header defaults for displaying proper colors
   */
  getThemeHeaderDefaults(theme) {
    return getHeaderColors(theme)
  }

  /**
   * Apply custom theme preview
   */
  applyCustomThemePreview() {
    const customTheme = this.localSettings?.editor?.customTheme
    if (!customTheme?.colors) return
    
    // Apply custom colors to preview box
    const preview = this.element.querySelector('.custom-theme-preview-content')
    if (preview) {
      Object.keys(customTheme.colors).forEach(key => {
        const cssVar = `--preview-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        preview.style.setProperty(cssVar, customTheme.colors[key])
      })
    }
    
    // Always apply custom theme colors as live preview when user is editing them
    // This allows users to see their changes immediately even before activating
    if (this.currentTab === 'themes') {
      this.applyCustomThemeColorsToDocument(customTheme.colors)
    }
    
    // If custom theme is actually active, set the data-theme attribute
    if (this.localSettings?.editor?.theme === 'custom') {
      document.documentElement.setAttribute('data-theme', 'custom')
    }
  }

  /**
   * Apply custom theme colors directly to document (for live preview)
   */
  applyCustomThemeColorsToDocument(colors) {
    if (!colors) return
    
    // Map custom theme color keys to actual CSS variables used by the app
    const colorMapping = {
      backgroundPrimary: ['--background-color', '--color-bg'],
      backgroundSecondary: ['--surface-color', '--color-bg-secondary', '--color-bg-tertiary'], 
      textPrimary: ['--text-color', '--color-text'],
      textSecondary: ['--text-secondary', '--color-text-secondary'],
      textMuted: ['--text-muted', '--color-text-muted'],
      accent: ['--accent-color', '--color-primary'],
      border: ['--border-color', '--color-border']
    }

    // Apply mapped colors to document for live preview
    Object.keys(colorMapping).forEach(key => {
      if (colors[key]) {
        const variables = colorMapping[key]
        variables.forEach(cssVar => {
          document.documentElement.style.setProperty(cssVar, colors[key])
        })
      }
    })

    // Apply additional derived colors based on main colors
    if (colors.backgroundSecondary) {
      document.documentElement.style.setProperty('--surface-hover', this.adjustColor(colors.backgroundSecondary, -10))
    }
    if (colors.border) {
      document.documentElement.style.setProperty('--border-light', this.adjustColor(colors.border, 10))
      document.documentElement.style.setProperty('--border-dark', this.adjustColor(colors.border, -10))
    }
  }

  /**
   * Adjust color brightness (simple implementation)
   */
  adjustColor(hex, percent) {
    // Simple hex color brightness adjustment
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1)
  }


  /**
   * Show notification (helper method)
   */
  showNotification(message, type = 'info') {
    // This would integrate with your app's notification system
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  /**
   * Handle theme change events to update dialog appearance
   */
  handleThemeChange(_event) {
    if (this.isOpen && this.element) {
      // Update theme-related UI elements if needed
      // The CSS will automatically update based on data-theme attribute
      this.refreshTabContent()
    }
  }

  /**
   * Handle settings changes from external sources (commands, etc.)
   */
  handleExternalSettingsChange(event) {
    if (!this.isOpen || event.event !== 'setting-changed') return

    const { path, value } = event.data
    
    // Update local settings to reflect external change
    this.setLocalSetting(path, value)
    
    // Update the dialog UI to show the new value
    if (this.currentTab === 'editor') {
      this.refreshTabContent()
    }
  }

  /**
   * Switch to a different tab
   */
  async switchTab(tabId) {
    if (this.currentTab === tabId) return
    
    this.currentTab = tabId
    this.refreshTabNavigation()
    
    // Use progressive loading with skeleton states
    await this.loadTabContentWithSkeleton(tabId)
  }

  /**
   * Load tab content with skeleton loading states
   * @param {string} tabId - Tab identifier
   */
  async loadTabContentWithSkeleton(tabId) {
    const tabContent = this.element?.querySelector('.settings-tab-content')
    if (!tabContent) return

    try {
      // Get the tab configuration
      const tab = this.tabs.find(t => t.id === tabId)
      if (!tab) return

      // Use skeleton loader for progressive loading
      await SkeletonLoader.loadTabContent(
        tabContent,
        tabId,
        async () => {
          // Simulate async loading and return rendered content
          return this.renderTabContentBody(tab)
        }
      )

      // Attach event listeners after content is loaded
      this.attachTabEventListeners()
      
      // Focus management for accessibility
      this.manageFocusAfterTabSwitch(tabContent)
      
    } catch (error) {
      console.error('Error loading tab content:', error)
      
      // Show error state
      tabContent.innerHTML = `
        <div class="settings-error" role="alert">
          <h4>Error Loading Tab</h4>
          <p>Failed to load ${tabId} settings. Please try refreshing the page.</p>
          <button class="settings-button secondary" onclick="location.reload()">
            Refresh Page
          </button>
        </div>
      `
    }
  }

  /**
   * Manage focus after tab switch for accessibility
   * @param {HTMLElement} tabContent - Tab content element
   */
  manageFocusAfterTabSwitch(tabContent) {
    // Find the first focusable element in the new tab content
    const focusableElements = tabContent.querySelectorAll(
      'input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex="0"]'
    )
    
    if (focusableElements.length > 0) {
      // Focus the first interactive element, but with a delay to let screen readers announce the tab change
      setTimeout(() => {
        focusableElements[0].focus()
      }, 100)
    }
  }

  /**
   * Clear search and show all tabs
   */
  clearSearch() {
    this.searchQuery = ''
    const searchInput = this.element?.querySelector('.settings-search')
    if (searchInput) {
      searchInput.value = ''
      searchInput.focus()
    }
    this.updateFilteredTabs()
  }

  /**
   * Focus the search input
   */
  focusSearchInput() {
    const searchInput = this.element?.querySelector('.settings-search')
    if (searchInput) {
      searchInput.focus()
    }
  }

  /**
   * Focus the first visible tab
   */
  focusFirstTab() {
    const firstTab = this.element?.querySelector('.settings-tab')
    if (firstTab) {
      firstTab.focus()
    }
  }

  /**
   * Save local settings to Settings Manager (will persist and notify managers)
   */
  saveSettings() {
    try {
      // Save local settings to Settings Manager
      if (this.localSettings?.editor) {
        const editor = this.localSettings.editor
        if (editor.theme) this.settingsManager.set('editor.theme', editor.theme)
        if (editor.width !== undefined) this.settingsManager.set('editor.width', editor.width)  
        if (editor.zoom !== undefined) this.settingsManager.set('editor.zoom', editor.zoom)
        if (editor.spellCheck !== undefined) this.settingsManager.set('editor.spellCheck', editor.spellCheck)
        if (editor.autoSave !== undefined) this.settingsManager.set('editor.autoSave', editor.autoSave)
        if (editor.autoSaveInterval !== undefined) this.settingsManager.set('editor.autoSaveInterval', editor.autoSaveInterval)
        
        // Save custom theme data - this was missing!
        if (editor.customTheme !== undefined) {
          this.settingsManager.set('editor.customTheme', editor.customTheme)
        }
      }
      
      // Save CodeMirror settings
      if (this.localSettings?.codemirror) {
        const codemirror = this.localSettings.codemirror
        if (codemirror.lineNumbers !== undefined) this.settingsManager.set('codemirror.lineNumbers', codemirror.lineNumbers)
        if (codemirror.lineWrapping !== undefined) this.settingsManager.set('codemirror.lineWrapping', codemirror.lineWrapping)
        if (codemirror.highlightActiveLine !== undefined) this.settingsManager.set('codemirror.highlightActiveLine', codemirror.highlightActiveLine)
        if (codemirror.bracketMatching !== undefined) this.settingsManager.set('codemirror.bracketMatching', codemirror.bracketMatching)
        if (codemirror.codeFolding !== undefined) this.settingsManager.set('codemirror.codeFolding', codemirror.codeFolding)
        if (codemirror.foldGutter !== undefined) this.settingsManager.set('codemirror.foldGutter', codemirror.foldGutter)
        if (codemirror.autocompletion !== undefined) this.settingsManager.set('codemirror.autocompletion', codemirror.autocompletion)
        if (codemirror.searchTop !== undefined) this.settingsManager.set('codemirror.searchTop', codemirror.searchTop)
        if (codemirror.placeholderText !== undefined) this.settingsManager.set('codemirror.placeholderText', codemirror.placeholderText)
        if (codemirror.fontSize !== undefined) this.settingsManager.set('codemirror.fontSize', codemirror.fontSize)
        if (codemirror.fontFamily !== undefined) this.settingsManager.set('codemirror.fontFamily', codemirror.fontFamily)
      }
      
      this.hasChanges = false
      
      if (this.onSave) {
        this.onSave()
      }
      
      // Close dialog after successful save
      this.hide()
      
    } catch (error) {
      console.error('Failed to save settings:', error)
      // On error, don't close the dialog so user can try again
    }
  }

  /**
   * Revert UI to original settings
   */
  revertToOriginalSettings() {
    if (!window.app || !this.originalSettings?.editor) return

    const editor = this.originalSettings.editor

    // Revert theme
    if (window.app.themeManager && editor.theme) {
      window.app.themeManager.applyTheme(editor.theme)
    }

    // Revert width
    if (window.app.widthManager && editor.width) {
      window.app.widthManager.setWidth(editor.width)
    }

    // Revert zoom
    if (window.app.widthManager && editor.zoom !== undefined) {
      window.app.widthManager.setZoom(editor.zoom)
    }
  }

  /**
   * Reset settings (placeholder for now)
   */
  resetSettings() {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      this.settingsManager.resetToDefaults()
      this.hasChanges = true
      this.refreshTabContent()
    }
  }


  /**
   * Check if dialog is currently open
   */
  isDialogOpen() {
    return this.isOpen
  }

  /**
   * Get current tab
   */
  getCurrentTab() {
    return this.currentTab
  }

  /**
   * Get search query
   */
  getSearchQuery() {
    return this.searchQuery
  }

  /**
   * Handle keyboard navigation for general dialog
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeydown(event) {
    // Handle theme card keyboard selection
    const themeCard = event.target.closest('[data-theme-preview]')
    if (themeCard && (event.key === 'Enter' || event.key === ' ')) {
      const theme = themeCard.dataset.themePreview
      this.handleThemeSelect(theme)
      event.preventDefault()
      return
    }
    
    // Close dialog with Escape
    if (event.key === 'Escape' && !this.searchQuery) {
      this.hide()
      event.preventDefault()
      return
    }
    
    // Focus search with Ctrl/Cmd+F
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault()
      const searchInput = this.element?.querySelector('.settings-search')
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      }
      return
    }
  }

  /**
   * Handle tab navigation with arrow keys and other shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleTabNavigation(event) {
    const activeTab = event.target.closest('[role="tab"]')
    if (!activeTab) return

    const tabs = Array.from(this.element.querySelectorAll('[role="tab"]'))
    const currentIndex = tabs.indexOf(activeTab)
    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
        break
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
        break
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
      case 'End':
        event.preventDefault()
        newIndex = tabs.length - 1
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.switchTab(activeTab.dataset.tab)
        return
      default:
        return
    }

    // Focus new tab and switch to it
    if (newIndex !== currentIndex && tabs[newIndex]) {
      tabs[newIndex].focus()
      this.switchTab(tabs[newIndex].dataset.tab)
    }
  }

  /**
   * Handle settings form keyboard shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleFormKeyboardShortcuts(event) {
    // Quick save with Ctrl/Cmd+S
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      this.saveSettings()
      return
    }
    
    // Reset with Ctrl/Cmd+R
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault()
      this.resetSettings()
      return
    }
    
    // Toggle search with Ctrl/Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault()
      const searchInput = this.element?.querySelector('.settings-search')
      if (searchInput) {
        searchInput.focus()
        if (searchInput.value) {
          this.clearSearch()
        }
      }
      return
    }
  }

  /**
   * Announce changes to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - Announcement priority (polite, assertive)
   */
  announceToScreenReader(message, priority = 'polite') {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  /**
   * Update ARIA states when settings change
   * @param {string} setting - Setting key
   * @param {*} value - New value
   */
  updateAriaStates(setting, value) {
    // Update relevant ARIA attributes when settings change
    const settingElement = this.element?.querySelector(`[data-setting="${setting}"]`)
    if (settingElement) {
      // Update aria-describedby for validation states
      if (!this.validateSetting(setting, value)) {
        settingElement.setAttribute('aria-invalid', 'true')
      } else {
        settingElement.removeAttribute('aria-invalid')
      }
    }
    
    // Announce important setting changes
    if (setting === 'editor.theme') {
      this.announceToScreenReader(`Theme changed to ${value}`)
    }
  }

  /**
   * Validate setting value
   * @param {string} setting - Setting key
   * @param {*} value - Value to validate
   * @returns {boolean} Whether value is valid
   */
  validateSetting(setting, value) {
    // Use appropriate tab validator based on setting
    if (setting.startsWith('editor.')) {
      return this.editorTab.validate({ editor: { [setting.split('.')[1]]: value } }).isValid
    }
    if (setting.startsWith('codemirror.')) {
      return this.codeMirrorTab.validate({ codemirror: { [setting.split('.')[1]]: value } }).isValid
    }
    if (setting.startsWith('gitIntegration.')) {
      return this.gitIntegrationTab.validate({ gitIntegration: { [setting.split('.')[1]]: value } }).isValid
    }
    if (setting.startsWith('privacy.')) {
      return this.privacyTab.validate({ privacy: { [setting.split('.')[1]]: value } }).isValid
    }
    
    return true // Default to valid for unknown settings
  }
}