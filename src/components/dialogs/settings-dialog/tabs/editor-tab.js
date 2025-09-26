/**
 * Editor Settings Tab
 * Clean, focused component for editor configuration
 */

import { SettingField } from '../components/setting-field.js'
import { validateWidth, validateZoom, validateAutoSaveInterval } from '../utils/validation.js'
import { getSetting, setSetting, getDefaultSettings } from '../utils/settings-helpers.js'

export class EditorTab {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
    this.fields = []
    this.defaults = getDefaultSettings('editor')
  }

  /**
   * Get current editor settings with defaults
   * @param {Object} localSettings - Current local settings
   * @returns {Object} Editor settings
   */
  getEditorSettings(localSettings) {
    const editorSettings = getSetting(localSettings, 'editor') || {}
    return {
      ...this.defaults,
      ...editorSettings
    }
  }

  /**
   * Create width preset buttons
   * @param {number} currentWidth - Current width value
   * @returns {string} HTML for width presets
   */
  renderWidthPresets(currentWidth) {
    const presets = [
      { value: 65, label: '65ch', description: 'Optimal reading' },
      { value: 80, label: '80ch', description: 'Standard writing' },
      { value: 90, label: '90ch', description: 'Wide editing' }
    ]

    return presets.map(preset => `
      <button 
        type="button" 
        class="width-preset ${preset.value === currentWidth ? 'active' : ''}" 
        data-setting="editor.width" 
        data-value="${preset.value}"
        aria-pressed="${preset.value === currentWidth}"
      >
        <span class="width-label">${preset.label}</span>
        <span class="width-description">${preset.description}</span>
      </button>
    `).join('')
  }

  /**
   * Create zoom controls
   * @param {number} currentZoom - Current zoom value
   * @returns {string} HTML for zoom controls
   */
  renderZoomControls(currentZoom) {
    const percentage = Math.round((currentZoom || 1.0) * 100)
    
    return `
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
            value="${currentZoom || 1.0}"
            aria-label="Editor zoom level"
          >
          <div class="zoom-labels">
            <span>85%</span>
            <span>100%</span>
            <span>115%</span>
            <span>130%</span>
          </div>
        </div>
        <div class="zoom-display">
          <span class="zoom-value" aria-live="polite">${percentage}%</span>
          <button type="button" class="zoom-reset" data-action="reset-zoom">Reset</button>
        </div>
      </div>
    `
  }

  /**
   * Render the editor settings tab
   * @param {Object} localSettings - Current local settings
   * @returns {string} Tab HTML
   */
  render(localSettings) {
    try {
      const editorSettings = this.getEditorSettings(localSettings)
      
      // Create setting fields
      const spellCheckField = new SettingField({
        label: 'Enable spell checking',
        type: 'checkbox',
        setting: 'editor.spellCheck',
        value: editorSettings.spellCheck,
        description: 'Check spelling while you type'
      })

      const autoSaveField = new SettingField({
        label: 'Auto-save documents',
        type: 'checkbox', 
        setting: 'editor.autoSave',
        value: editorSettings.autoSave !== false,
        description: 'Automatically save changes every few seconds'
      })

      const autoSaveIntervalField = new SettingField({
        label: 'Auto-save interval',
        type: 'select',
        setting: 'editor.autoSaveInterval',
        value: editorSettings.autoSaveInterval || 5000,
        options: [
          { value: 3000, label: '3 seconds' },
          { value: 5000, label: '5 seconds' },
          { value: 10000, label: '10 seconds' },
          { value: 30000, label: '30 seconds' }
        ],
        description: 'How often to automatically save changes',
        validator: validateAutoSaveInterval
      })

      return `
        <div class="settings-sections">
          <div class="settings-section">
            <h4>Layout & Display</h4>
            
            <div class="settings-field">
              <label>Editor Width</label>
              <div class="settings-width-controls">
                <div class="width-presets">
                  ${this.renderWidthPresets(editorSettings.width)}
                </div>
              </div>
              <small>Select the maximum width for editor content</small>
            </div>
            
            <div class="settings-field">
              <label for="editor-zoom">Zoom Level</label>
              ${this.renderZoomControls(editorSettings.zoom)}
              <small>Adjust the font size and scaling</small>
            </div>
          </div>
          
          <div class="settings-section">
            <h4>Behavior</h4>
            
            ${spellCheckField.render()}
            
            ${autoSaveField.render()}
            
            <div class="settings-field ${editorSettings.autoSave === false ? 'disabled' : ''}">
              ${autoSaveIntervalField.render()}
            </div>
          </div>
        </div>
      `
    } catch (error) {
      console.error('Error rendering editor tab:', error)
      return `
        <div class="settings-error">
          <h4>Error Loading Editor Settings</h4>
          <p>There was an error loading the editor settings. Please try refreshing the page.</p>
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
      // Width preset buttons
      const widthPresets = container.querySelectorAll('.width-preset')
      widthPresets.forEach(preset => {
        preset.addEventListener('click', (e) => {
          e.preventDefault()
          const setting = preset.dataset.setting
          const value = parseInt(preset.dataset.value, 10)
          
          if (setting && !isNaN(value)) {
            const validation = validateWidth(value)
            if (validation.isValid) {
              updateSetting(setting, value)
              
              // Update UI
              widthPresets.forEach(p => {
                p.classList.remove('active')
                p.setAttribute('aria-pressed', 'false')
              })
              preset.classList.add('active')
              preset.setAttribute('aria-pressed', 'true')
            }
          }
        })
      })

      // Zoom slider
      const zoomSlider = container.querySelector('#editor-zoom')
      if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value)
          const validation = validateZoom(value)
          
          if (validation.isValid) {
            updateSetting('editor.zoom', value)
            
            // Update zoom display
            const zoomValue = container.querySelector('.zoom-value')
            if (zoomValue) {
              zoomValue.textContent = `${Math.round(value * 100)}%`
            }
          }
        })
      }

      // Zoom reset button
      const zoomReset = container.querySelector('.zoom-reset')
      if (zoomReset) {
        zoomReset.addEventListener('click', (e) => {
          e.preventDefault()
          updateSetting('editor.zoom', 1.0)
          
          if (zoomSlider) zoomSlider.value = 1.0
          const zoomValue = container.querySelector('.zoom-value')
          if (zoomValue) zoomValue.textContent = '100%'
        })
      }

      // Auto-save dependency handling
      const autoSaveCheckbox = container.querySelector('[data-setting="editor.autoSave"]')
      const intervalField = container.querySelector('[data-setting="editor.autoSaveInterval"]')?.closest('.settings-field')
      
      if (autoSaveCheckbox && intervalField) {
        const updateIntervalState = () => {
          const isEnabled = autoSaveCheckbox.checked
          intervalField.classList.toggle('disabled', !isEnabled)
          
          const select = intervalField.querySelector('select')
          if (select) select.disabled = !isEnabled
        }
        
        autoSaveCheckbox.addEventListener('change', updateIntervalState)
        updateIntervalState() // Initial state
      }

    } catch (error) {
      console.error('Error attaching editor tab event listeners:', error)
    }
  }

  /**
   * Validate all fields in the tab
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validate(settings) {
    const errors = []
    const editorSettings = getSetting(settings, 'editor') || {}

    // Validate width
    if (editorSettings.width !== undefined) {
      const widthValidation = validateWidth(editorSettings.width)
      if (!widthValidation.isValid) {
        errors.push(`Width: ${widthValidation.error}`)
      }
    }

    // Validate zoom
    if (editorSettings.zoom !== undefined) {
      const zoomValidation = validateZoom(editorSettings.zoom)
      if (!zoomValidation.isValid) {
        errors.push(`Zoom: ${zoomValidation.error}`)
      }
    }

    // Validate auto-save interval
    if (editorSettings.autoSaveInterval !== undefined) {
      const intervalValidation = validateAutoSaveInterval(editorSettings.autoSaveInterval)
      if (!intervalValidation.isValid) {
        errors.push(`Auto-save interval: ${intervalValidation.error}`)
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
      id: 'editor',
      name: '📝 Editor',
      label: 'Editor Settings',
      keywords: ['width', 'zoom', 'spell', 'auto save', 'layout', 'display', 'behavior']
    }
  }
}