/**
 * CodeMirror Settings Tab
 * Advanced editor configuration for CodeMirror features
 */

import { SettingField } from '../components/setting-field.js'
import { validateFontSize } from '../utils/validation.js'
import { getSetting, setSetting, getDefaultSettings } from '../utils/settings-helpers.js'

export class CodeMirrorTab {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
    this.fields = []
    this.defaults = getDefaultSettings('codemirror')
  }

  /**
   * Get current CodeMirror settings with defaults
   * @param {Object} localSettings - Current local settings
   * @returns {Object} CodeMirror settings
   */
  getCodeMirrorSettings(localSettings) {
    const codeMirrorSettings = getSetting(localSettings, 'codemirror') || {}
    return {
      ...this.defaults,
      ...codeMirrorSettings
    }
  }

  /**
   * Render the CodeMirror settings tab
   * @param {Object} localSettings - Current local settings
   * @param {Function} updateSetting - Update setting callback
   * @returns {string} Tab HTML
   */
  render(localSettings, updateSetting) {
    try {
      const settings = this.getCodeMirrorSettings(localSettings)

      // Create setting fields
      const lineNumbersField = new SettingField({
        label: 'Show line numbers',
        type: 'checkbox',
        setting: 'codemirror.lineNumbers',
        value: settings.lineNumbers,
        description: 'Display line numbers in the editor gutter'
      })

      const wordWrapField = new SettingField({
        label: 'Enable word wrap',
        type: 'checkbox',
        setting: 'codemirror.wordWrap',
        value: settings.wordWrap,
        description: 'Wrap long lines instead of horizontal scrolling'
      })

      const codeFoldingField = new SettingField({
        label: 'Enable code folding',
        type: 'checkbox',
        setting: 'codemirror.codeFolding',
        value: settings.codeFolding,
        description: 'Allow collapsing code blocks and sections'
      })

      const bracketMatchingField = new SettingField({
        label: 'Bracket matching',
        type: 'checkbox',
        setting: 'codemirror.bracketMatching',
        value: settings.bracketMatching,
        description: 'Highlight matching brackets and parentheses'
      })

      const fontSizeField = new SettingField({
        label: 'Font size (px)',
        type: 'number',
        setting: 'codemirror.fontSize',
        value: settings.fontSize,
        attributes: {
          min: '10',
          max: '32',
          step: '1'
        },
        description: 'Font size for editor text (10-32 pixels)',
        validator: validateFontSize
      })

      const fontFamilyField = new SettingField({
        label: 'Font family',
        type: 'select',
        setting: 'codemirror.fontFamily',
        value: settings.fontFamily,
        options: [
          { value: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace', label: 'System Monospace' },
          { value: '"Fira Code", monospace', label: 'Fira Code' },
          { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
          { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
          { value: '"Cascadia Code", monospace', label: 'Cascadia Code' },
          { value: '"Monaco", monospace', label: 'Monaco' },
          { value: 'monospace', label: 'Generic Monospace' }
        ],
        description: 'Font family for editor text'
      })

      const tabSizeField = new SettingField({
        label: 'Tab size',
        type: 'select',
        setting: 'codemirror.tabSize',
        value: settings.tabSize || 2,
        options: [
          { value: 2, label: '2 spaces' },
          { value: 4, label: '4 spaces' },
          { value: 8, label: '8 spaces' }
        ],
        description: 'Number of spaces per tab indentation'
      })

      const indentUnitField = new SettingField({
        label: 'Indent unit',
        type: 'select', 
        setting: 'codemirror.indentUnit',
        value: settings.indentUnit || 2,
        options: [
          { value: 2, label: '2 spaces' },
          { value: 4, label: '4 spaces' }
        ],
        description: 'Number of spaces for automatic indentation'
      })

      return `
        <div class="settings-sections">
          <div class="settings-section">
            <h4>Display Options</h4>
            
            ${lineNumbersField.render()}
            ${wordWrapField.render()}
            ${codeFoldingField.render()}
            ${bracketMatchingField.render()}
          </div>
          
          <div class="settings-section">
            <h4>Typography</h4>
            
            ${fontSizeField.render()}
            ${fontFamilyField.render()}
          </div>
          
          <div class="settings-section">
            <h4>Indentation</h4>
            
            ${tabSizeField.render()}
            ${indentUnitField.render()}
          </div>
        </div>
      `
    } catch (error) {
      console.error('Error rendering CodeMirror tab:', error)
      return `
        <div class="settings-error">
          <h4>Error Loading CodeMirror Settings</h4>
          <p>There was an error loading the CodeMirror settings. Please try refreshing the page.</p>
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
      const checkboxes = container.querySelectorAll('input[type="checkbox"][data-setting^="codemirror."]')
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const setting = e.target.dataset.setting
          updateSetting(setting, e.target.checked)
        })
      })

      const selects = container.querySelectorAll('select[data-setting^="codemirror."]')
      selects.forEach(select => {
        select.addEventListener('change', (e) => {
          const setting = e.target.dataset.setting
          let value = e.target.value
          
          // Parse numeric values for tabSize and indentUnit
          if (setting.includes('tabSize') || setting.includes('indentUnit')) {
            value = parseInt(value, 10)
          }
          
          updateSetting(setting, value)
        })
      })

      const numberInputs = container.querySelectorAll('input[type="number"][data-setting^="codemirror."]')
      numberInputs.forEach(input => {
        // Debounce number input changes
        let timeout
        input.addEventListener('input', (e) => {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            const setting = e.target.dataset.setting
            const value = parseInt(e.target.value, 10)
            
            if (setting.includes('fontSize')) {
              const validation = validateFontSize(value)
              if (validation.isValid) {
                updateSetting(setting, value)
              }
            } else {
              updateSetting(setting, value)
            }
          }, 500) // 500ms debounce
        })

        // Also handle blur for immediate validation
        input.addEventListener('blur', (e) => {
          clearTimeout(timeout)
          const setting = e.target.dataset.setting
          const value = parseInt(e.target.value, 10)
          
          if (setting.includes('fontSize')) {
            const validation = validateFontSize(value)
            if (validation.isValid) {
              updateSetting(setting, value)
            }
          } else {
            updateSetting(setting, value)
          }
        })
      })

    } catch (error) {
      console.error('Error attaching CodeMirror tab event listeners:', error)
    }
  }

  /**
   * Validate all CodeMirror settings
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validate(settings) {
    const errors = []
    const codeMirrorSettings = getSetting(settings, 'codemirror') || {}

    // Validate font size
    if (codeMirrorSettings.fontSize !== undefined) {
      const fontSizeValidation = validateFontSize(codeMirrorSettings.fontSize)
      if (!fontSizeValidation.isValid) {
        errors.push(`Font size: ${fontSizeValidation.error}`)
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
      id: 'codemirror',
      name: '🖥️ CodeMirror',
      label: 'CodeMirror Settings',
      keywords: ['line numbers', 'wrap', 'fold', 'font', 'bracket', 'indentation', 'tab']
    }
  }
}