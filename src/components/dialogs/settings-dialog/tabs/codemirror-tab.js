/**
 * CodeMirror Settings Tab
 * Advanced editor configuration for CodeMirror features
 */

import { SettingField } from '../components/setting-field.js'
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

      const lineWrappingField = new SettingField({
        label: 'Enable word wrap',
        type: 'checkbox',
        setting: 'codemirror.lineWrapping',
        value: settings.lineWrapping,
        description: 'Wrap long lines instead of horizontal scrolling'
      })

      const codeFoldingField = new SettingField({
        label: 'Enable section folding',
        type: 'checkbox',
        setting: 'codemirror.codeFolding',
        value: settings.codeFolding,
        description: 'Allow collapsing chapters and sections'
      })

      const bracketMatchingField = new SettingField({
        label: 'Bracket matching',
        type: 'checkbox',
        setting: 'codemirror.bracketMatching',
        value: settings.bracketMatching,
        description: 'Highlight matching punctuation marks'
      })

      const highlightActiveLineField = new SettingField({
        label: 'Highlight current line',
        type: 'checkbox',
        setting: 'codemirror.highlightActiveLine',
        value: settings.highlightActiveLine,
        description: 'Highlight the line you are currently writing'
      })

      const foldGutterField = new SettingField({
        label: 'Show folding controls',
        type: 'checkbox',
        setting: 'codemirror.foldGutter',
        value: settings.foldGutter,
        description: 'Show controls for collapsing sections'
      })

      const autocompletionField = new SettingField({
        label: 'Writing suggestions',
        type: 'checkbox',
        setting: 'codemirror.autocompletion',
        value: settings.autocompletion,
        description: 'Show word and phrase completion suggestions'
      })

      const searchTopField = new SettingField({
        label: 'Search at top',
        type: 'checkbox',
        setting: 'codemirror.searchTop',
        value: settings.searchTop,
        description: 'Show find panel at top of editor instead of bottom'
      })



      return `
        <div class="settings-sections">
          <div class="settings-section">
            <h4>Editor Display</h4>
            
            ${lineNumbersField.render()}
            ${lineWrappingField.render()}
            ${highlightActiveLineField.render()}
            ${bracketMatchingField.render()}
            ${codeFoldingField.render()}
            ${foldGutterField.render()}
            ${autocompletionField.render()}
            ${searchTopField.render()}
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
    // Currently no validation needed for CodeMirror settings
    // All settings are boolean or have predefined select options

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
      name: '📝 Editor',
      label: 'Editor Settings',
      keywords: ['line numbers', 'wrap', 'fold', 'font', 'bracket', 'indentation', 'tab', 'writing', 'editor']
    }
  }
}