/**
 * SettingsDialog - Modal dialog for Fantasy Editor settings
 * Provides tabbed interface for comprehensive user configuration
 */

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
    
    // Tab configuration
    this.tabs = [
      { 
        id: 'editor', 
        name: '📝 Editor', 
        label: 'Editor Settings',
        keywords: ['theme', 'width', 'zoom', 'spell', 'auto save']
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
        id: 'sync', 
        name: '🔄 Sync', 
        label: 'Sync & Providers',
        keywords: ['github', 'gitlab', 'bitbucket', 'git', 'provider']
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
    this.onSave = onSave
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
      </div>
    `
    
    document.body.appendChild(this.element)
  }

  /**
   * Render dialog header with search and actions
   */
  renderHeader() {
    return `
      <div class="settings-header">
        <div class="settings-title">
          <h2>⚙️ Fantasy Editor Settings</h2>
        </div>
        <div class="settings-search-actions">
          <div class="settings-search-container">
            <input 
              type="text" 
              class="settings-search" 
              placeholder="🔍 Search settings..." 
              value="${this.searchQuery}"
              autocomplete="off"
            />
          </div>
          <div class="settings-actions">
            <button class="settings-btn settings-btn-secondary" data-action="reset">
              Reset
            </button>
            <button class="settings-btn settings-btn-primary" data-action="save">
              Save
            </button>
            <button class="settings-close-btn" data-action="close" aria-label="Close settings">
              ×
            </button>
          </div>
        </div>
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
          <div class="settings-tab-content">
            ${this.renderTabContent()}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render tab navigation sidebar
   */
  renderTabNavigation() {
    const visibleTabs = this.getVisibleTabs()
    
    if (visibleTabs.length === 0 && this.searchQuery) {
      return `
        <div class="settings-no-results">
          <p>No settings found for "${this.searchQuery}"</p>
          <button class="settings-clear-search" data-action="clear-search">
            Clear search
          </button>
        </div>
      `
    }
    
    return `
      <nav class="settings-tabs" role="tablist" aria-label="Settings categories">
        ${visibleTabs.map(tab => `
          <button 
            class="settings-tab ${tab.id === this.currentTab ? 'active' : ''}"
            data-tab="${tab.id}"
            role="tab"
            aria-selected="${tab.id === this.currentTab}"
            aria-controls="settings-panel-${tab.id}"
            tabindex="${tab.id === this.currentTab ? '0' : '-1'}"
          >
            ${tab.name}
          </button>
        `).join('')}
      </nav>
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
        return this.renderEditorTabContent()
      default:
        return this.renderTabContentPlaceholder(tab)
    }
  }

  /**
   * Render Editor Settings tab with functional controls
   */
  renderEditorTabContent() {
    const editorSettings = this.localSettings?.editor || {}
    
    return `
      <div class="settings-sections">
        <div class="settings-section">
          <h4>Appearance</h4>
          
          <div class="settings-field">
            <label for="editor-theme">Theme</label>
            <select id="editor-theme" data-setting="editor.theme">
              <option value="light" ${editorSettings.theme === 'light' ? 'selected' : ''}>☀️ Light Theme</option>
              <option value="dark" ${editorSettings.theme === 'dark' ? 'selected' : ''}>🌙 Dark Theme</option>
              <option value="fantasy" ${editorSettings.theme === 'fantasy' ? 'selected' : ''}>✨ Fantasy Theme</option>
            </select>
            <small>Choose your preferred editor theme</small>
          </div>
          
          <div class="settings-field">
            <label>Editor Width</label>
            <div class="settings-width-controls">
              <div class="width-presets">
                <button type="button" class="width-preset ${editorSettings.width === 65 ? 'active' : ''}" data-setting="editor.width" data-value="65">
                  <span class="width-label">65ch</span>
                  <span class="width-description">Optimal reading</span>
                </button>
                <button type="button" class="width-preset ${editorSettings.width === 80 ? 'active' : ''}" data-setting="editor.width" data-value="80">
                  <span class="width-label">80ch</span>
                  <span class="width-description">Standard coding</span>
                </button>
                <button type="button" class="width-preset ${editorSettings.width === 90 ? 'active' : ''}" data-setting="editor.width" data-value="90">
                  <span class="width-label">90ch</span>
                  <span class="width-description">Wide editing</span>
                </button>
              </div>
            </div>
            <small>Select the maximum width for editor content</small>
          </div>
          
          <div class="settings-field">
            <label for="editor-zoom">Zoom Level</label>
            <div class="settings-zoom-controls">
              <div class="zoom-slider-container">
                <input 
                  type="range" 
                  id="editor-zoom" 
                  class="zoom-slider"
                  data-setting="editor.zoom"
                  min="0.85" 
                  max="1.30" 
                  step="0.05"
                  value="${editorSettings.zoom || 1.0}"
                >
                <div class="zoom-labels">
                  <span>85%</span>
                  <span>100%</span>
                  <span>115%</span>
                  <span>130%</span>
                </div>
              </div>
              <div class="zoom-display">
                <span class="zoom-value">${Math.round((editorSettings.zoom || 1.0) * 100)}%</span>
                <button type="button" class="zoom-reset" data-action="reset-zoom">Reset</button>
              </div>
            </div>
            <small>Adjust the font size and scaling</small>
          </div>
        </div>
        
        <div class="settings-section">
          <h4>Behavior</h4>
          
          <div class="settings-field">
            <label class="settings-checkbox-label">
              <input 
                type="checkbox" 
                data-setting="editor.spellCheck" 
                ${editorSettings.spellCheck ? 'checked' : ''}
              >
              <span class="settings-checkbox-text">Enable spell checking</span>
            </label>
            <small>Check spelling while you type</small>
          </div>
          
          <div class="settings-field">
            <label class="settings-checkbox-label">
              <input 
                type="checkbox" 
                data-setting="editor.autoSave" 
                ${editorSettings.autoSave !== false ? 'checked' : ''}
              >
              <span class="settings-checkbox-text">Auto-save documents</span>
            </label>
            <small>Automatically save changes every few seconds</small>
          </div>
          
          <div class="settings-field ${editorSettings.autoSave === false ? 'disabled' : ''}">
            <label for="auto-save-interval">Auto-save interval</label>
            <select id="auto-save-interval" data-setting="editor.autoSaveInterval" ${editorSettings.autoSave === false ? 'disabled' : ''}>
              <option value="3000" ${editorSettings.autoSaveInterval === 3000 ? 'selected' : ''}>3 seconds</option>
              <option value="5000" ${editorSettings.autoSaveInterval === 5000 ? 'selected' : ''}>5 seconds</option>
              <option value="10000" ${editorSettings.autoSaveInterval === 10000 ? 'selected' : ''}>10 seconds</option>
              <option value="30000" ${editorSettings.autoSaveInterval === 30000 ? 'selected' : ''}>30 seconds</option>
            </select>
            <small>How often to automatically save changes</small>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render placeholder content for tabs (will be replaced in later steps)
   */
  renderTabContentPlaceholder(tab) {
    const examples = {
      themes: 'Custom theme creation, color picker, live preview',
      codemirror: 'Line numbers, word wrap, syntax highlighting, code folding options',
      sync: 'Provider selection (GitHub/GitLab/Bitbucket), authentication, sync preferences',
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
      sync: '7',
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
   * Refresh only the tab navigation
   */
  refreshTabNavigation() {
    const sidebar = this.element?.querySelector('.settings-sidebar')
    if (sidebar) {
      sidebar.innerHTML = this.renderTabNavigation()
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

    // Search input
    const searchInput = this.element.querySelector('.settings-search')
    if (searchInput) {
      searchInput.addEventListener('input', this.handleSearch.bind(this))
      searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this))
    }

    // Action buttons and settings controls
    this.element.addEventListener('click', this.handleClick.bind(this))
    this.element.addEventListener('change', this.handleSettingChange.bind(this))
    this.element.addEventListener('input', this.handleSettingInput.bind(this))
    
    // Keyboard navigation
    this.element.addEventListener('keydown', this.handleKeydown.bind(this))
    
    // Click outside to close
    this.element.addEventListener('click', this.handleOverlayClick.bind(this))
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
  }

  /**
   * Parse setting value based on type
   */
  parseSettingValue(setting, value, inputType = '', checked = false) {
    if (inputType === 'checkbox') {
      return checked
    }
    
    if (setting.includes('width') || setting.includes('zoom') || setting.includes('interval')) {
      return parseFloat(value) || parseInt(value)
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
      
      // Apply live preview with throttling for width changes to reduce lag
      if (path === 'editor.width') {
        this.applyLivePreviewThrottled(path, value)
      } else {
        this.applyLivePreview(path, value)
      }
      
    } catch (error) {
      console.warn('Failed to update setting:', error)
      this.showToast('Failed to update setting', 'error')
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
  switchTab(tabId) {
    if (this.currentTab === tabId) return
    
    this.currentTab = tabId
    this.refreshTabNavigation()
    this.refreshTabContent()
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
      }
      
      this.hasChanges = false
      
      if (this.onSave) {
        this.onSave()
      }
      
      // Show success feedback
      this.showToast('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      this.showToast('Failed to save settings', 'error')
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
      this.showToast('Settings reset to defaults')
      this.refreshTabContent()
    }
  }

  /**
   * Show toast notification (simple implementation)
   */
  showToast(message) {
    const toast = document.createElement('div')
    toast.className = 'settings-toast'
    toast.textContent = message
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.remove()
    }, 3000)
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
}