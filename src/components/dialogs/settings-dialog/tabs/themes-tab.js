/**
 * Themes Settings Tab
 * Clean, focused component for theme selection and customization
 */

import { ThemePreview } from '../components/theme-preview.js'
import { ColorPicker } from '../components/color-picker.js'
import { SettingField } from '../components/setting-field.js'
import { validateThemeName, sanitizeHtml } from '../utils/validation.js'
import { getSetting, setSetting, getDefaultSettings, getThemeColorsWithFallback, getHeaderColorsWithFallback, getCustomThemeBaseColorsWithFallback } from '../utils/settings-helpers.js'

export class ThemesTab {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
    this.themePreviews = []
    this.colorPickers = []
    this.headerColorPickers = []
    this.defaults = getDefaultSettings('editor')
    this.livePreviewThrottleTimer = null
  }

  /**
   * Get current theme settings with defaults
   * @param {Object} localSettings - Current local settings
   * @returns {Object} Theme settings
   */
  getThemeSettings(localSettings) {
    const editorSettings = getSetting(localSettings, 'editor') || {}
    return {
      ...this.defaults,
      ...editorSettings
    }
  }

  /**
   * Get custom theme with proper defaults
   * @param {Object} localSettings - Current local settings
   * @returns {Object} Custom theme configuration
   */
  getCustomTheme(localSettings) {
    const themeSettings = this.getThemeSettings(localSettings)
    const savedCustomTheme = themeSettings.customTheme || {}
    
    // Get base colors from selected base theme
    const baseColors = getCustomThemeBaseColorsWithFallback(savedCustomTheme.baseTheme || 'light')
    
    return {
      name: savedCustomTheme.name || '',
      baseTheme: savedCustomTheme.baseTheme || 'light',
      colors: {
        ...baseColors,
        ...savedCustomTheme.colors
      }
    }
  }

  /**
   * Create built-in theme previews
   * @param {string} currentTheme - Currently selected theme
   * @param {Function} onSelect - Theme selection callback
   * @returns {Array} Array of ThemePreview instances
   */
  createThemePreviews(currentTheme, onSelect) {
    const themes = [
      {
        theme: 'light',
        label: '☀️ Light Theme',
        description: 'Clean and bright for daytime writing',
        isActive: currentTheme === 'light'
      },
      {
        theme: 'dark',
        label: '🌙 Dark Theme', 
        description: 'Easy on the eyes for night sessions',
        isActive: currentTheme === 'dark'
      },
      {
        theme: 'fantasy',
        label: '⚔️ Fantasy Theme',
        description: 'Medieval manuscript aesthetic',
        isActive: currentTheme === 'fantasy'
      }
    ]

    return ThemePreview.createMultiple(themes, onSelect)
  }

  /**
   * Create color pickers for custom theme
   * @param {Object} colors - Current color values
   * @param {Function} onChange - Change callback
   * @returns {Array} Array of ColorPicker instances
   */
  createColorPickers(colors, onChange) {
    const colorFields = [
      { key: 'backgroundPrimary', label: 'Primary Background' },
      { key: 'backgroundSecondary', label: 'Secondary Background' },
      { key: 'textPrimary', label: 'Primary Text' },
      { key: 'textSecondary', label: 'Secondary Text' },
      { key: 'textMuted', label: 'Muted Text' },
      { key: 'accent', label: 'Accent Color' },
      { key: 'border', label: 'Border Color' },
      { key: 'highlightLine', label: 'Active Line Highlight' },
      { key: 'highlightSelection', label: 'Selection Highlight' },
      { key: 'highlightSelectionBorder', label: 'Selection Border' }
    ]

    return colorFields.map(field => new ColorPicker({
      label: field.label,
      setting: `editor.customTheme.colors.${field.key}`,
      value: colors[field.key] || '',
      placeholder: colors[field.key] || '#000000',
      allowClear: true,
      onChange
    }))
  }

  /**
   * Create header color pickers
   * @param {Object} localSettings - Current settings
   * @param {Function} onChange - Change callback
   * @returns {Array} Array of ColorPicker instances
   */
  createHeaderColorPickers(localSettings, onChange) {
    const headerColors = getSetting(localSettings, 'editor.headerColors') || {}
    const currentTheme = getSetting(localSettings, 'editor.theme') || 'light'
    const themeDefaults = getHeaderColorsWithFallback(currentTheme)

    const headerFields = [
      { key: 'background', label: 'Header Background' },
      { key: 'text', label: 'Header Text' },
      { key: 'border', label: 'Header Border' }
    ]

    return headerFields.map(field => new ColorPicker({
      label: field.label,
      setting: `editor.headerColors.${field.key}`,
      value: headerColors[field.key] || '',
      placeholder: themeDefaults[field.key] || '#000000',
      allowClear: true,
      onChange
    }))
  }

  /**
   * Render the themes settings tab
   * @param {Object} localSettings - Current local settings
   * @param {Function} updateSetting - Update setting callback
   * @returns {string} Tab HTML
   */
  render(localSettings, updateSetting) {
    try {
      const themeSettings = this.getThemeSettings(localSettings)
      const customTheme = this.getCustomTheme(localSettings)

      // Create theme selection callbacks
      const handleThemeSelect = (theme) => {
        updateSetting('editor.theme', theme)
        this.updateThemePreviewStates(theme)
      }

      const handleColorChange = (setting, value) => {
        updateSetting(setting, value)
        this.throttleLivePreview(() => this.applyCustomThemePreview(localSettings))
      }

      // Create component instances
      this.themePreviews = this.createThemePreviews(themeSettings.theme, handleThemeSelect)
      this.colorPickers = this.createColorPickers(customTheme.colors, handleColorChange)
      this.headerColorPickers = this.createHeaderColorPickers(localSettings, handleColorChange)

      // Create theme name field
      const themeNameField = new SettingField({
        label: 'Theme Name',
        type: 'text',
        setting: 'editor.customTheme.name',
        value: customTheme.name,
        attributes: {
          placeholder: 'My Custom Theme',
          maxlength: '50'
        },
        description: 'Give your custom theme a unique name',
        validator: validateThemeName
      })

      // Create base theme field  
      const baseThemeField = new SettingField({
        label: 'Base Theme',
        type: 'select',
        setting: 'editor.customTheme.baseTheme',
        value: customTheme.baseTheme,
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'fantasy', label: 'Fantasy' },
          { value: 'custom', label: 'Custom' }
        ],
        description: 'Select a base theme to start from'
      })

      return `
        <div class="settings-sections">
          <div class="settings-section">
            <h4>Theme Selection</h4>
            <p class="settings-section-description">Choose your preferred editor theme</p>
            
            <div class="theme-selection-group">
              <h5>Built-in Themes</h5>
              ${ThemePreview.renderGrid(this.themePreviews)}
            </div>
          </div>

          <div class="settings-section">
            <h4>Custom Theme</h4>
            
            ${themeNameField.render()}
            ${baseThemeField.render()}
            
            <div class="settings-subsection">
              <h5>Color Customization</h5>
              <div class="color-settings-grid">
                ${this.colorPickers.map(picker => picker.render()).join('')}
              </div>
            </div>
            
            <div class="settings-subsection">
              <h5>Header Colors (Independent)</h5>
              <p class="settings-subsection-description">Customize header colors independently of theme</p>
              <div class="color-settings-grid">
                ${this.headerColorPickers.map(picker => picker.render()).join('')}
              </div>
              <div class="header-color-actions">
                <button 
                  type="button" 
                  class="btn-secondary btn-sm"
                  data-action="reset-header-colors"
                >
                  Reset to Theme Default
                </button>
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
    } catch (error) {
      console.error('Error rendering themes tab:', error)
      return `
        <div class="settings-error">
          <h4>Error Loading Theme Settings</h4>
          <p>There was an error loading the theme settings. Please try refreshing the page.</p>
        </div>
      `
    }
  }

  /**
   * Render theme preview content
   * @returns {string} Preview HTML
   */
  renderThemePreviewContent() {
    return `
      <div class="preview-sample">
        <div class="preview-title">Chapter One</div>
        <div class="preview-text">The ancient castle loomed against the stormy sky, its towers reaching toward the heavens like fingers grasping for forgotten dreams.</div>
        <div class="preview-accent">"We must find the lost manuscript," she whispered.</div>
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
      // Attach theme preview listeners
      ThemePreview.attachAllEventListeners(this.themePreviews, container)

      // Attach color picker listeners
      this.colorPickers.forEach(picker => picker.attachEventListeners(container))
      this.headerColorPickers.forEach(picker => picker.attachEventListeners(container))

      // Theme name field
      const themeNameInput = container.querySelector('[data-setting="editor.customTheme.name"]')
      if (themeNameInput) {
        themeNameInput.addEventListener('input', (e) => {
          const validation = validateThemeName(e.target.value)
          if (validation.isValid) {
            updateSetting('editor.customTheme.name', e.target.value)
            
            // Update activate button state
            const activateBtn = container.querySelector('[data-action="activate-custom-theme"]')
            if (activateBtn) {
              activateBtn.disabled = !e.target.value.trim()
            }
          }
        })
      }

      // Base theme selection
      const baseThemeSelect = container.querySelector('[data-setting="editor.customTheme.baseTheme"]')
      if (baseThemeSelect) {
        baseThemeSelect.addEventListener('change', (e) => {
          updateSetting('editor.customTheme.baseTheme', e.target.value)
          // Reset colors to new base theme
          this.resetToBaseTheme(e.target.value, updateSetting)
        })
      }

      // Action buttons
      const resetHeaderBtn = container.querySelector('[data-action="reset-header-colors"]')
      if (resetHeaderBtn) {
        resetHeaderBtn.addEventListener('click', (e) => {
          e.preventDefault()
          this.resetHeaderColors(updateSetting)
        })
      }

      const resetCustomBtn = container.querySelector('[data-action="reset-custom-colors"]')
      if (resetCustomBtn) {
        resetCustomBtn.addEventListener('click', (e) => {
          e.preventDefault()
          this.resetCustomColors(updateSetting)
        })
      }

      const activateBtn = container.querySelector('[data-action="activate-custom-theme"]')
      if (activateBtn) {
        activateBtn.addEventListener('click', (e) => {
          e.preventDefault()
          this.activateCustomTheme(updateSetting)
        })
      }

    } catch (error) {
      console.error('Error attaching themes tab event listeners:', error)
    }
  }

  /**
   * Update theme preview active states
   * @param {string} activeTheme - Currently active theme
   */
  updateThemePreviewStates(activeTheme) {
    this.themePreviews.forEach(preview => {
      preview.updateActiveState(preview.config.theme === activeTheme)
    })
  }

  /**
   * Reset header colors to theme defaults
   * @param {Function} updateSetting - Update setting callback
   */
  resetHeaderColors(updateSetting) {
    updateSetting('editor.headerColors', {})
    // Update UI
    this.headerColorPickers.forEach(picker => picker.updateValue(''))
  }

  /**
   * Reset custom theme colors to base theme
   * @param {Function} updateSetting - Update setting callback
   */
  resetCustomColors(updateSetting) {
    const baseTheme = getSetting(this.settingsManager.getAllSettings(), 'editor.customTheme.baseTheme') || 'light'
    this.resetToBaseTheme(baseTheme, updateSetting)
  }

  /**
   * Reset colors to base theme
   * @param {string} baseTheme - Base theme to reset to
   * @param {Function} updateSetting - Update setting callback
   */
  resetToBaseTheme(baseTheme, updateSetting) {
    const baseColors = getCustomThemeBaseColorsWithFallback(baseTheme)
    Object.entries(baseColors).forEach(([key, value]) => {
      updateSetting(`editor.customTheme.colors.${key}`, value)
    })
    
    // Update UI
    this.colorPickers.forEach(picker => {
      const colorKey = picker.config.setting.split('.').pop()
      picker.updateValue(baseColors[colorKey] || '')
    })
  }

  /**
   * Activate custom theme
   * @param {Function} updateSetting - Update setting callback
   */
  activateCustomTheme(updateSetting) {
    updateSetting('editor.theme', 'custom')
    this.updateThemePreviewStates('custom')
  }

  /**
   * Apply custom theme preview with throttling
   * @param {Object} localSettings - Current settings
   */
  throttleLivePreview(callback) {
    if (this.livePreviewThrottleTimer) {
      clearTimeout(this.livePreviewThrottleTimer)
    }
    this.livePreviewThrottleTimer = setTimeout(callback, 150)
  }

  /**
   * Apply custom theme preview
   * @param {Object} localSettings - Current settings
   */
  applyCustomThemePreview(localSettings) {
    const customTheme = this.getCustomTheme(localSettings)
    if (!customTheme?.colors) return

    // Apply preview styles (implementation depends on theme manager)
    const previewContent = document.querySelector('.custom-theme-preview-content')
    if (previewContent) {
      const { colors } = customTheme
      previewContent.style.cssText = `
        --bg-primary: ${colors.backgroundPrimary};
        --bg-secondary: ${colors.backgroundSecondary};
        --text-primary: ${colors.textPrimary};
        --text-secondary: ${colors.textSecondary};
        --text-muted: ${colors.textMuted};
        --accent: ${colors.accent};
        --border: ${colors.border};
      `
    }
  }

  /**
   * Validate all theme settings
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validate(settings) {
    const errors = []
    const customTheme = getSetting(settings, 'editor.customTheme')

    // Validate custom theme name if using custom theme
    const currentTheme = getSetting(settings, 'editor.theme')
    if (currentTheme === 'custom' && customTheme?.name) {
      const nameValidation = validateThemeName(customTheme.name)
      if (!nameValidation.isValid) {
        errors.push(`Theme name: ${nameValidation.error}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.livePreviewThrottleTimer) {
      clearTimeout(this.livePreviewThrottleTimer)
      this.livePreviewThrottleTimer = null
    }
  }

  /**
   * Get tab configuration
   * @returns {Object} Tab config
   */
  static getConfig() {
    return {
      id: 'themes',
      name: '🎨 Themes',
      label: 'Theme Customization',
      keywords: ['color', 'custom', 'background', 'text', 'accent', 'theme', 'header']
    }
  }
}