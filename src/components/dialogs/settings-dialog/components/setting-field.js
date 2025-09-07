/**
 * SettingField Component
 * Reusable form field component with validation and accessibility
 */

import { generateId } from '../utils/settings-helpers.js'
import { sanitizeHtml } from '../utils/validation.js'

export class SettingField {
  /**
   * Create a setting field
   * @param {Object} config - Field configuration
   * @param {string} config.label - Field label
   * @param {string} config.type - Field type (text, select, checkbox, etc.)
   * @param {string} config.setting - Setting path
   * @param {*} config.value - Current value
   * @param {Array} config.options - Options for select fields
   * @param {string} config.description - Help text
   * @param {boolean} config.required - Whether field is required
   * @param {Function} config.validator - Validation function
   * @param {Object} config.attributes - Additional HTML attributes
   */
  constructor(config) {
    this.config = {
      label: '',
      type: 'text',
      setting: '',
      value: '',
      options: [],
      description: '',
      required: false,
      validator: null,
      attributes: {},
      ...config
    }
    
    this.id = generateId('setting-field')
    this.isValid = true
    this.errorMessage = ''
  }

  /**
   * Validate field value
   * @param {*} value - Value to validate
   * @returns {boolean} Whether value is valid
   */
  validate(value) {
    // Reset validation state
    this.isValid = true
    this.errorMessage = ''
    
    // Required field validation
    if (this.config.required && (!value || value === '')) {
      this.isValid = false
      this.errorMessage = `${this.config.label} is required`
      return false
    }
    
    // Custom validator
    if (this.config.validator && typeof this.config.validator === 'function') {
      try {
        const result = this.config.validator(value)
        if (result && !result.isValid) {
          this.isValid = false
          this.errorMessage = result.error || 'Invalid value'
          return false
        }
      } catch (error) {
        console.warn('Validator error:', error)
        this.isValid = false
        this.errorMessage = 'Validation error'
        return false
      }
    }
    
    return true
  }

  /**
   * Render text input field
   * @returns {string} HTML string
   */
  renderTextInput() {
    const attributes = {
      id: this.id,
      type: this.config.type,
      'data-setting': this.config.setting,
      value: sanitizeHtml(this.config.value?.toString() || ''),
      class: `settings-input ${!this.isValid ? 'error' : ''}`,
      'aria-describedby': this.config.description ? `${this.id}-desc` : '',
      'aria-invalid': !this.isValid,
      ...this.config.attributes
    }

    const attributeString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${sanitizeHtml(value?.toString() || '')}"`)
      .join(' ')

    return `<input ${attributeString}>`
  }

  /**
   * Render select dropdown
   * @returns {string} HTML string
   */
  renderSelect() {
    const attributes = {
      id: this.id,
      'data-setting': this.config.setting,
      class: `settings-select ${!this.isValid ? 'error' : ''}`,
      'aria-describedby': this.config.description ? `${this.id}-desc` : '',
      'aria-invalid': !this.isValid,
      ...this.config.attributes
    }

    const attributeString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${sanitizeHtml(value?.toString() || '')}"`)
      .join(' ')

    const optionsHtml = this.config.options
      .map(option => {
        if (typeof option === 'string') {
          return `<option value="${sanitizeHtml(option)}" ${option === this.config.value ? 'selected' : ''}>${sanitizeHtml(option)}</option>`
        }
        return `<option value="${sanitizeHtml(option.value)}" ${option.value === this.config.value ? 'selected' : ''}>${sanitizeHtml(option.label)}</option>`
      })
      .join('')

    return `<select ${attributeString}>${optionsHtml}</select>`
  }

  /**
   * Render checkbox input
   * @returns {string} HTML string
   */
  renderCheckbox() {
    const attributes = {
      id: this.id,
      type: 'checkbox',
      'data-setting': this.config.setting,
      class: `settings-checkbox ${!this.isValid ? 'error' : ''}`,
      'aria-describedby': this.config.description ? `${this.id}-desc` : '',
      'aria-invalid': !this.isValid,
      ...this.config.attributes
    }

    if (this.config.value) {
      attributes.checked = 'checked'
    }

    const attributeString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${sanitizeHtml(value?.toString() || '')}"`)
      .join(' ')

    return `
      <label class="settings-checkbox-label">
        <input ${attributeString}>
        <span class="settings-checkbox-text">${sanitizeHtml(this.config.label)}</span>
      </label>
    `
  }

  /**
   * Render range slider
   * @returns {string} HTML string
   */
  renderRange() {
    const attributes = {
      id: this.id,
      type: 'range',
      'data-setting': this.config.setting,
      value: this.config.value || 0,
      class: `settings-range ${!this.isValid ? 'error' : ''}`,
      'aria-describedby': this.config.description ? `${this.id}-desc` : '',
      'aria-invalid': !this.isValid,
      ...this.config.attributes
    }

    const attributeString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${sanitizeHtml(value?.toString() || '')}"`)
      .join(' ')

    return `<input ${attributeString}>`
  }

  /**
   * Render complete field with label and description
   * @returns {string} Complete field HTML
   */
  render() {
    let inputHtml = ''
    
    try {
      switch (this.config.type) {
        case 'select':
          inputHtml = this.renderSelect()
          break
        case 'checkbox':
          inputHtml = this.renderCheckbox()
          break
        case 'range':
          inputHtml = this.renderRange()
          break
        default:
          inputHtml = this.renderTextInput()
      }
    } catch (error) {
      console.error('Error rendering field:', error)
      inputHtml = `<div class="settings-error">Error rendering field</div>`
    }

    // For checkbox, don't duplicate the label
    const labelHtml = this.config.type === 'checkbox' 
      ? '' 
      : `<label for="${this.id}" class="settings-label">${sanitizeHtml(this.config.label)}</label>`

    const descriptionHtml = this.config.description 
      ? `<small id="${this.id}-desc" class="settings-description">${sanitizeHtml(this.config.description)}</small>`
      : ''

    const errorHtml = !this.isValid 
      ? `<div class="settings-error-message" role="alert">${sanitizeHtml(this.errorMessage)}</div>`
      : ''

    return `
      <div class="settings-field ${!this.isValid ? 'has-error' : ''}">
        ${labelHtml}
        <div class="settings-input-container">
          ${inputHtml}
          ${errorHtml}
        </div>
        ${descriptionHtml}
      </div>
    `
  }

  /**
   * Get field value from DOM element
   * @param {HTMLElement} element - DOM element
   * @returns {*} Field value
   */
  static getValue(element) {
    if (!element) return null
    
    if (element.type === 'checkbox') {
      return element.checked
    }
    
    return element.value
  }
}