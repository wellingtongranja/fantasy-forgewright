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
          <div class="settings-tab-content">
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
        return this.renderEditorTabContent()
      case 'themes':
        return this.renderThemesTabContent()
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
          <h4>Layout & Display</h4>
          
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
   * Render Themes Settings tab with theme selection and customization
   */
  renderThemesTabContent() {
    const themeSettings = this.localSettings?.editor || {}
    const savedCustomTheme = themeSettings.customTheme || {}
    
    // Provide defaults for missing properties while preserving existing ones
    const customTheme = {
      name: savedCustomTheme.name || '',
      baseTheme: savedCustomTheme.baseTheme || 'light',
      colors: {
        backgroundPrimary: savedCustomTheme.colors?.backgroundPrimary || '#ffffff',
        backgroundSecondary: savedCustomTheme.colors?.backgroundSecondary || '#f8fafc',
        textPrimary: savedCustomTheme.colors?.textPrimary || '#1e293b',
        textSecondary: savedCustomTheme.colors?.textSecondary || '#475569',
        textMuted: savedCustomTheme.colors?.textMuted || '#94a3b8',
        accent: savedCustomTheme.colors?.accent || '#6366f1',
        border: savedCustomTheme.colors?.border || '#e2e8f0'
      }
    }
    
    return `
      <div class="settings-sections">
        <div class="settings-section">
          <h4>Theme Selection</h4>
          <p class="settings-section-description">Choose your preferred editor theme</p>
          
          <div class="theme-selection-group">
            <h5>Built-in Themes</h5>
            <div class="theme-preview-grid">
              ${this.renderThemePreviewCard('light', '☀️ Light Theme', themeSettings.theme === 'light')}
              ${this.renderThemePreviewCard('dark', '🌙 Dark Theme', themeSettings.theme === 'dark')}
              ${this.renderThemePreviewCard('fantasy', '✨ Fantasy Theme', themeSettings.theme === 'fantasy')}
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h4>Custom Theme</h4>
          
          <div class="settings-field">
            <label for="custom-theme-name">Theme Name</label>
            <input 
              type="text" 
              id="custom-theme-name"
              class="settings-text-input"
              data-setting="editor.customTheme.name"
              value="${this.escapeHtml(customTheme.name)}"
              placeholder="My Custom Theme"
              maxlength="50"
            />
            <small>Give your custom theme a unique name</small>
          </div>
          
          <div class="settings-field">
            <label for="custom-base-theme">Base Theme</label>
            <select id="custom-base-theme" data-setting="editor.customTheme.baseTheme">
              <option value="light" ${customTheme.baseTheme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${customTheme.baseTheme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="fantasy" ${customTheme.baseTheme === 'fantasy' ? 'selected' : ''}>Fantasy</option>
            </select>
            <small>Select a base theme to start from</small>
          </div>
          
          <div class="settings-subsection">
            <h5>Color Customization</h5>
            <div class="color-settings-grid">
              ${this.renderColorPicker('backgroundPrimary', 'Primary Background', customTheme.colors.backgroundPrimary)}
              ${this.renderColorPicker('backgroundSecondary', 'Secondary Background', customTheme.colors.backgroundSecondary)}
              ${this.renderColorPicker('textPrimary', 'Primary Text', customTheme.colors.textPrimary)}
              ${this.renderColorPicker('textSecondary', 'Secondary Text', customTheme.colors.textSecondary)}
              ${this.renderColorPicker('textMuted', 'Muted Text', customTheme.colors.textMuted)}
              ${this.renderColorPicker('accent', 'Accent Color', customTheme.colors.accent)}
              ${this.renderColorPicker('border', 'Border Color', customTheme.colors.border)}
            </div>
          </div>
          
          <div class="custom-theme-preview ${themeSettings.theme === 'custom' ? 'active' : ''}">
            <div class="preview-header">
              <span>Custom Theme Preview</span>
              <div class="preview-actions">
                <button 
                  type="button" 
                  class="btn-secondary btn-sm"
                  data-action="reset-custom-colors"
                >
                  Reset Colors
                </button>
                <button 
                  type="button" 
                  class="btn-primary btn-sm"
                  data-action="activate-custom-theme"
                  ${!customTheme.name ? 'disabled' : ''}
                >
                  Activate Custom Theme
                </button>
              </div>
            </div>
            <div class="theme-preview-content custom-theme-preview-content">
              ${this.renderThemePreviewContent()}
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render a theme preview card
   */
  renderThemePreviewCard(theme, label, isActive) {
    return `
      <div 
        class="theme-preview-card ${isActive ? 'active' : ''}"
        data-theme-preview="${theme}"
        role="button"
        aria-label="Select ${label}"
        tabindex="0"
      >
        <div class="theme-preview-header">${label}</div>
        <div class="theme-preview-content" data-preview-theme="${theme}">
          ${this.renderThemePreviewContent()}
        </div>
      </div>
    `
  }

  /**
   * Render theme preview content (sample text)
   */
  renderThemePreviewContent() {
    return `
      <div class="preview-sample">
        <div class="preview-title">Sample text</div>
        <div class="preview-text">The quick brown fox jumps over the lazy dog.</div>
        <div class="preview-muted">// This is a comment</div>
        <div class="preview-accent">const greeting = "Hello World";</div>
      </div>
    `
  }

  /**
   * Render a color picker field
   */
  renderColorPicker(key, label, value) {
    const inputId = `color-${key}`
    return `
      <div class="color-field">
        <label for="${inputId}">${label}</label>
        <div class="color-input-group">
          <input 
            type="color" 
            id="${inputId}"
            data-setting="editor.customTheme.colors.${key}"
            value="${value}"
          />
          <input 
            type="text" 
            class="color-hex-input"
            data-setting="editor.customTheme.colors.${key}"
            value="${value}"
            pattern="^#[0-9a-fA-F]{6}$"
            maxlength="7"
          />
        </div>
      </div>
    `
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text || ''
    return div.innerHTML
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
    
    // Click outside to close
    this.element.addEventListener('click', this.handleOverlayClick.bind(this))
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
      
      // Enable/disable activate button based on name
      if (setting === 'editor.customTheme.name') {
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
    
    // Update UI
    this.element.querySelectorAll('.theme-preview-card').forEach(card => {
      card.classList.remove('active')
    })
    
    const customPreview = this.element.querySelector('.custom-theme-preview')
    if (customPreview) {
      customPreview.classList.add('active')
    }
    
    // Apply custom theme
    this.applyCustomThemePreview()
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
   * Get default colors for a base theme
   */
  getDefaultThemeColors(baseTheme) {
    const themes = {
      light: {
        backgroundPrimary: '#ffffff',
        backgroundSecondary: '#f8fafc',
        textPrimary: '#1e293b',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        accent: '#6366f1',
        border: '#e2e8f0'
      },
      dark: {
        backgroundPrimary: '#0f172a',
        backgroundSecondary: '#1e293b',
        textPrimary: '#f1f5f9',
        textSecondary: '#cbd5e1',
        textMuted: '#64748b',
        accent: '#818cf8',
        border: '#334155'
      },
      fantasy: {
        backgroundPrimary: '#1a0f2e',
        backgroundSecondary: '#2d1b4e',
        textPrimary: '#e0d5ff',
        textSecondary: '#b4a7d6',
        textMuted: '#8b7aa8',
        accent: '#9333ea',
        border: '#4c3575'
      }
    }
    
    return themes[baseTheme] || themes.light
  }

  /**
   * Apply custom theme preview
   */
  applyCustomThemePreview() {
    const customTheme = this.localSettings?.editor?.customTheme
    if (!customTheme?.colors) return
    
    // Apply custom colors to preview
    const preview = this.element.querySelector('.custom-theme-preview-content')
    if (preview) {
      Object.keys(customTheme.colors).forEach(key => {
        const cssVar = `--preview-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        preview.style.setProperty(cssVar, customTheme.colors[key])
      })
    }
    
    // If custom theme is active, apply to document
    if (this.localSettings?.editor?.theme === 'custom') {
      document.documentElement.setAttribute('data-theme', 'custom')
      // Let ThemeManager handle custom theme application via live preview
      if (window.app?.themeManager) {
        window.app.themeManager.applyCustomTheme()
      }
    }
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
}