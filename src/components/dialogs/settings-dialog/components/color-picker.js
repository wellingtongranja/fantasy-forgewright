/**
 * ColorPicker Component
 * Accessible color picker with hex input and validation
 */

import { validateHexColor, sanitizeHtml } from '../utils/validation.js'
import { generateId } from '../utils/settings-helpers.js'

export class ColorPicker {
  /**
   * Create a color picker
   * @param {Object} config - Configuration
   * @param {string} config.label - Field label
   * @param {string} config.setting - Setting path
   * @param {string} config.value - Current color value
   * @param {string} config.placeholder - Placeholder text
   * @param {boolean} config.allowClear - Whether to show clear button
   * @param {Function} config.onChange - Change callback
   */
  constructor(config) {
    this.config = {
      label: '',
      setting: '',
      value: '',
      placeholder: '',
      allowClear: true,
      onChange: null,
      ...config
    }
    
    this.id = generateId('color-picker')
    this.isValid = true
    this.errorMessage = ''
  }

  /**
   * Validate color value
   * @param {string} value - Color value to validate
   * @returns {boolean} Whether value is valid
   */
  validate(value) {
    if (!value) {
      this.isValid = true
      this.errorMessage = ''
      return true
    }
    
    const result = validateHexColor(value)
    this.isValid = result.isValid
    this.errorMessage = result.error || ''
    
    return this.isValid
  }

  /**
   * Handle color picker change
   * @param {string} value - New color value
   */
  handleColorChange(value) {
    if (this.validate(value)) {
      if (this.config.onChange && typeof this.config.onChange === 'function') {
        try {
          this.config.onChange(this.config.setting, value)
        } catch (error) {
          console.error('Color picker onChange error:', error)
        }
      }
    }
  }

  /**
   * Handle hex input change
   * @param {string} value - New hex value
   */
  handleHexChange(value) {
    // Auto-add # if missing
    if (value && !value.startsWith('#')) {
      value = '#' + value
    }
    
    if (this.validate(value)) {
      // Update color picker if valid
      const colorInput = document.getElementById(this.id)
      if (colorInput) {
        colorInput.value = value
      }
      
      if (this.config.onChange && typeof this.config.onChange === 'function') {
        try {
          this.config.onChange(this.config.setting, value)
        } catch (error) {
          console.error('Hex input onChange error:', error)
        }
      }
    }
  }

  /**
   * Clear color value
   */
  handleClear() {
    this.isValid = true
    this.errorMessage = ''
    
    if (this.config.onChange && typeof this.config.onChange === 'function') {
      try {
        this.config.onChange(this.config.setting, '')
      } catch (error) {
        console.error('Color clear onChange error:', error)
      }
    }
  }

  /**
   * Render the color picker component
   * @returns {string} HTML string
   */
  render() {
    const hasValue = this.config.value && this.config.value !== ''
    const displayValue = hasValue ? this.config.value : (this.config.placeholder || '')
    
    return `
      <div class="color-field ${!this.isValid ? 'has-error' : ''}">
        <label for="${this.id}" class="settings-label">${sanitizeHtml(this.config.label)}</label>
        <div class="color-input-group">
          <input 
            type="color" 
            id="${this.id}"
            data-setting="${this.config.setting}"
            value="${sanitizeHtml(displayValue)}"
            class="color-picker-input ${!this.isValid ? 'error' : ''}"
            aria-describedby="${this.id}-error"
          />
          <input 
            type="text" 
            class="color-hex-input ${!this.isValid ? 'error' : ''}"
            data-setting="${this.config.setting}"
            value="${hasValue ? sanitizeHtml(this.config.value) : ''}"
            pattern="^#[0-9a-fA-F]{6}$"
            maxlength="7"
            placeholder="${sanitizeHtml(this.config.placeholder || '')}"
            aria-label="${sanitizeHtml(this.config.label)} hex value"
          />
          ${this.config.allowClear && hasValue ? `
            <button 
              type="button" 
              class="btn-icon btn-sm clear-color-btn"
              data-color-key="${this.config.setting}"
              title="Clear to use default"
              aria-label="Clear ${sanitizeHtml(this.config.label)} color"
            >
              ×
            </button>
          ` : ''}
        </div>
        ${!this.isValid ? `
          <div id="${this.id}-error" class="settings-error-message" role="alert">
            ${sanitizeHtml(this.errorMessage)}
          </div>
        ` : ''}
      </div>
    `
  }

  /**
   * Attach event listeners after rendering
   * @param {HTMLElement} container - Container element
   */
  attachEventListeners(container) {
    if (!container) return
    
    const colorInput = container.querySelector(`#${this.id}`)
    const hexInput = container.querySelector('.color-hex-input')
    const clearBtn = container.querySelector('.clear-color-btn')
    
    // Color picker events
    if (colorInput) {
      colorInput.addEventListener('change', (e) => {
        this.handleColorChange(e.target.value)
      })
      
      colorInput.addEventListener('input', (e) => {
        // Update hex input in real-time
        if (hexInput) {
          hexInput.value = e.target.value
        }
      })
    }
    
    // Hex input events
    if (hexInput) {
      let debounceTimeout
      
      hexInput.addEventListener('input', (e) => {
        // Debounce validation to avoid excessive validation
        clearTimeout(debounceTimeout)
        debounceTimeout = setTimeout(() => {
          this.handleHexChange(e.target.value)
        }, 300)
      })
      
      hexInput.addEventListener('blur', (e) => {
        // Immediate validation on blur
        this.handleHexChange(e.target.value)
      })
    }
    
    // Clear button events
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.handleClear()
        
        // Clear inputs
        if (colorInput) colorInput.value = ''
        if (hexInput) hexInput.value = ''
        
        // Hide clear button
        clearBtn.style.display = 'none'
      })
    }
  }

  /**
   * Update color picker value
   * @param {string} value - New value
   */
  updateValue(value) {
    this.config.value = value
    this.validate(value)
    
    // Update DOM if rendered
    const colorInput = document.getElementById(this.id)
    const hexInput = document.querySelector(`[data-setting="${this.config.setting}"].color-hex-input`)
    const clearBtn = document.querySelector(`[data-color-key="${this.config.setting}"]`)
    
    if (colorInput) {
      colorInput.value = value || ''
    }
    
    if (hexInput) {
      hexInput.value = value || ''
    }
    
    if (clearBtn) {
      clearBtn.style.display = value ? 'block' : 'none'
    }
  }
}