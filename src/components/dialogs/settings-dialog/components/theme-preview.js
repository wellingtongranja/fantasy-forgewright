/**
 * ThemePreview Component
 * Theme preview card with accessibility and keyboard support
 */

import { sanitizeHtml } from '../utils/validation.js'
import { generateId } from '../utils/settings-helpers.js'

export class ThemePreview {
  /**
   * Create a theme preview
   * @param {Object} config - Configuration
   * @param {string} config.theme - Theme identifier
   * @param {string} config.label - Display label
   * @param {string} config.description - Theme description
   * @param {boolean} config.isActive - Whether theme is currently active
   * @param {Function} config.onSelect - Selection callback
   */
  constructor(config) {
    this.config = {
      theme: '',
      label: '',
      description: '',
      isActive: false,
      onSelect: null,
      ...config
    }
    
    this.id = generateId('theme-preview')
  }

  /**
   * Handle theme selection
   */
  handleSelect() {
    if (this.config.onSelect && typeof this.config.onSelect === 'function') {
      try {
        this.config.onSelect(this.config.theme)
      } catch (error) {
        console.error('Theme preview onSelect error:', error)
      }
    }
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.handleSelect()
    }
  }

  /**
   * Get theme-specific preview content
   * @returns {string} Preview HTML
   */
  getPreviewContent() {
    // This would ideally use actual theme variables
    // For now, we'll use static content that represents each theme
    const previews = {
      light: {
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#212529',
        secondary: '#6c757d',
        accent: '#007bff'
      },
      dark: {
        background: '#1a1a1a',
        surface: '#2d3748',
        text: '#f7fafc',
        secondary: '#a0aec0',
        accent: '#63b3ed'
      },
      fantasy: {
        background: '#F3E6D1',
        surface: '#E6D5B8',
        text: '#17301A',
        secondary: '#2A4D2E',
        accent: '#D4AF37'
      }
    }
    
    const colors = previews[this.config.theme] || previews.light
    
    return `
      <div class="preview-sample" style="
        background-color: ${colors.background};
        color: ${colors.text};
        border: 1px solid ${colors.surface};
        padding: 14px;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.5;
        min-height: 90px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      ">
        <div class="preview-title" style="
          color: ${colors.text};
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        ">Chapter One</div>
        <div class="preview-text" style="
          color: ${colors.secondary};
          font-style: italic;
        ">The ancient castle loomed against the stormy sky, its towers reaching toward the heavens like fingers grasping for forgotten dreams.</div>
        <div class="preview-dialogue" style="
          color: ${colors.accent};
          font-weight: 500;
        ">"We must find the lost manuscript," she whispered.</div>
      </div>
    `
  }

  /**
   * Render the theme preview card
   * @returns {string} HTML string
   */
  render() {
    return `
      <div 
        id="${this.id}"
        class="theme-preview-card ${this.config.isActive ? 'active' : ''}"
        data-theme-preview="${this.config.theme}"
        role="button"
        tabindex="0"
        aria-label="Select ${sanitizeHtml(this.config.label)}"
        aria-pressed="${this.config.isActive}"
      >
        <div class="theme-preview-header">
          <span class="theme-preview-label">${sanitizeHtml(this.config.label)}</span>
          ${this.config.isActive ? '<span class="theme-preview-active-indicator" aria-label="Currently active">✓</span>' : ''}
        </div>
        <div class="theme-preview-content" data-preview-theme="${this.config.theme}">
          ${this.getPreviewContent()}
        </div>
        ${this.config.description ? `
          <div class="theme-preview-description" style="
            font-size: 11px;
            color: var(--text-muted, #6b7280);
            text-align: center;
            padding: 8px 12px 4px;
            margin-top: 4px;
            border-top: 1px solid var(--border-light, #e5e7eb);
            line-height: 1.3;
          ">
            ${sanitizeHtml(this.config.description)}
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
    
    const card = container.querySelector(`#${this.id}`)
    if (!card) return
    
    // Click handler
    card.addEventListener('click', (e) => {
      e.preventDefault()
      this.handleSelect()
    })
    
    // Keyboard handler
    card.addEventListener('keydown', (e) => {
      this.handleKeydown(e)
    })
    
    // Focus handlers for better UX
    card.addEventListener('focus', () => {
      card.classList.add('focused')
    })
    
    card.addEventListener('blur', () => {
      card.classList.remove('focused')
    })
  }

  /**
   * Update active state
   * @param {boolean} isActive - Whether theme is active
   */
  updateActiveState(isActive) {
    this.config.isActive = isActive
    
    const card = document.getElementById(this.id)
    if (card) {
      card.classList.toggle('active', isActive)
      card.setAttribute('aria-pressed', isActive.toString())
      
      // Update active indicator
      const indicator = card.querySelector('.theme-preview-active-indicator')
      if (isActive && !indicator) {
        const header = card.querySelector('.theme-preview-header')
        if (header) {
          header.insertAdjacentHTML('beforeend', '<span class="theme-preview-active-indicator" aria-label="Currently active">✓</span>')
        }
      } else if (!isActive && indicator) {
        indicator.remove()
      }
    }
  }

  /**
   * Static method to create multiple theme previews
   * @param {Array} themes - Array of theme configurations
   * @param {Function} onSelect - Selection callback
   * @returns {Array} Array of ThemePreview instances
   */
  static createMultiple(themes, onSelect) {
    return themes.map(theme => new ThemePreview({
      ...theme,
      onSelect
    }))
  }

  /**
   * Static method to render theme grid
   * @param {Array} themePreviews - Array of ThemePreview instances
   * @returns {string} Grid HTML
   */
  static renderGrid(themePreviews) {
    const previewsHtml = themePreviews
      .map(preview => preview.render())
      .join('')
    
    return `
      <div class="theme-preview-grid" role="radiogroup" aria-label="Theme selection">
        ${previewsHtml}
      </div>
    `
  }

  /**
   * Static method to attach all event listeners
   * @param {Array} themePreviews - Array of ThemePreview instances
   * @param {HTMLElement} container - Container element
   */
  static attachAllEventListeners(themePreviews, container) {
    themePreviews.forEach(preview => {
      preview.attachEventListeners(container)
    })
  }
}