import { getThemeExtension } from './codemirror-themes.js'

export class ThemeManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
    this.currentTheme = this.loadTheme() || 'light'
    this.editorView = null // Will be set by EditorManager
    
    // Listen for theme changes from Settings Manager
    this.settingsManager.addListener(this.handleSettingsChange.bind(this))
    
    this.applyTheme(this.currentTheme)
  }

  /**
   * Set the editor view for theme coordination
   */
  setEditorView(editorView) {
    this.editorView = editorView
  }

  loadTheme() {
    return this.settingsManager.get('editor.theme')
  }

  saveTheme(theme) {
    this.settingsManager.set('editor.theme', theme)
  }

  /**
   * Handle settings changes from Settings Manager
   */
  handleSettingsChange(event) {
    if (event.event === 'setting-changed' && event.data.path === 'editor.theme') {
      const newTheme = event.data.value
      if (newTheme !== this.currentTheme) {
        this.applyThemeOnly(newTheme) // Apply without saving (already saved by Settings Manager)
      }
    }
  }

  applyTheme(theme) {
    this.applyThemeOnly(theme)
    this.saveTheme(theme)
  }

  /**
   * Apply theme to UI without saving (for Settings Manager updates)
   */
  applyThemeOnly(theme) {
    // Clear any existing custom theme styles first
    this.clearCustomTheme()
    
    // Apply CSS theme
    document.documentElement.setAttribute('data-theme', theme)

    // Handle custom theme colors
    if (theme === 'custom') {
      this.applyCustomTheme()
    }

    // Apply CodeMirror theme if editor is available
    if (this.editorView) {
      this.applyCodeMirrorTheme(theme)
    }

    this.currentTheme = theme
    this.updateThemeToggle()

    // Emit theme change event for other components
    this.emitThemeChangeEvent(theme)
  }

  /**
   * Apply custom theme colors from settings
   */
  applyCustomTheme() {
    const customTheme = this.settingsManager.get('editor.customTheme')
    if (!customTheme?.colors) return

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

    // Apply mapped colors to document
    Object.keys(colorMapping).forEach(key => {
      if (customTheme.colors[key]) {
        const variables = colorMapping[key]
        variables.forEach(cssVar => {
          document.documentElement.style.setProperty(cssVar, customTheme.colors[key])
        })
      }
    })

    // Set RGB versions for rgba() usage
    if (customTheme.colors.accent) {
      const rgb = this.hexToRgb(customTheme.colors.accent)
      document.documentElement.style.setProperty('--color-primary-rgb', rgb)
    }
    if (customTheme.colors.border) {
      const rgb = this.hexToRgb(customTheme.colors.border)
      document.documentElement.style.setProperty('--color-border-rgb', rgb)
    }

    // Apply additional derived colors based on main colors
    if (customTheme.colors.backgroundSecondary) {
      document.documentElement.style.setProperty('--surface-hover', this.adjustColor(customTheme.colors.backgroundSecondary, -10))
    }
    if (customTheme.colors.border) {
      document.documentElement.style.setProperty('--border-light', this.adjustColor(customTheme.colors.border, 10))
      document.documentElement.style.setProperty('--border-dark', this.adjustColor(customTheme.colors.border, -10))
    }
  }

  /**
   * Convert hex color to RGB values for CSS variables
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0'
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
   * Clear custom theme colors from document element
   */
  clearCustomTheme() {
    // Get all CSS variables that might be set by custom theme
    const customThemeVariables = [
      '--background-color', '--color-bg',
      '--surface-color', '--color-bg-secondary', '--color-bg-tertiary',
      '--text-color', '--color-text',
      '--text-secondary', '--color-text-secondary',
      '--text-muted', '--color-text-muted',
      '--accent-color', '--color-primary',
      '--border-color', '--color-border',
      '--color-primary-rgb',
      '--color-border-rgb',
      '--surface-hover',
      '--border-light',
      '--border-dark'
    ]

    // Remove all custom theme variables from document element
    customThemeVariables.forEach(variable => {
      document.documentElement.style.removeProperty(variable)
    })
  }

  /**
   * Apply CodeMirror theme extension
   */
  applyCodeMirrorTheme(theme) {
    if (!this.editorView) return

    const themeExtension = getThemeExtension(theme)

    // Note: Theme reconfiguration would need proper StateEffect implementation
    // For now, themes are applied at initialization time
    console.log('Theme change requested:', theme, 'Extensions:', themeExtension)
  }

  /**
   * Get CodeMirror theme extensions for initial setup
   */
  getCodeMirrorTheme(theme = this.currentTheme, options = {}) {
    return getThemeExtension(theme, options)
  }

  toggleTheme() {
    const themes = ['light', 'dark', 'fantasy', 'custom']
    const currentIndex = themes.indexOf(this.currentTheme)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themes.length
    this.applyTheme(themes[nextIndex])
  }

  updateThemeToggle() {
    const toggle = document.getElementById('theme-toggle')
    if (!toggle) return

    const icons = {
      light: '🌙',
      dark: '☀️',
      fantasy: '⚔️',
      custom: '🎨'
    }

    toggle.textContent = icons[this.currentTheme] || '🌙'
    toggle.setAttribute('aria-label', `Switch to ${this.getNextTheme()} theme`)
  }

  getNextTheme() {
    const themes = ['light', 'dark', 'fantasy', 'custom']
    const currentIndex = themes.indexOf(this.currentTheme)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themes.length
    return themes[nextIndex]
  }

  getCurrentTheme() {
    return this.currentTheme
  }

  /**
   * Emit custom event when theme changes
   */
  emitThemeChangeEvent(theme) {
    const event = new CustomEvent('themechange', {
      detail: { theme, themeManager: this }
    })
    document.dispatchEvent(event)
  }

  /**
   * Get available themes
   */
  getAvailableThemes() {
    return ['light', 'dark', 'fantasy', 'custom']
  }

  /**
   * Check if theme is dark
   */
  isDarkTheme(theme = this.currentTheme) {
    return theme === 'dark' || theme === 'fantasy'
  }

  /**
   * Get theme-specific values for components
   */
  getThemeValue(property, theme = this.currentTheme) {
    // Helper method for components that need theme-specific values
    const themeValues = {
      light: {
        searchHighlight: 'rgba(0, 100, 200, 0.2)',
        activeLineHighlight: 'rgba(0, 0, 0, 0.05)',
        foldIcon: '▶'
      },
      dark: {
        searchHighlight: 'rgba(100, 150, 255, 0.2)',
        activeLineHighlight: 'rgba(255, 255, 255, 0.05)',
        foldIcon: '▶'
      },
      fantasy: {
        searchHighlight: 'rgba(212, 175, 55, 0.25)',
        activeLineHighlight: 'rgba(23, 48, 26, 0.05)',
        foldIcon: '▶'
      },
      custom: {
        searchHighlight: 'rgba(0, 100, 200, 0.2)',
        activeLineHighlight: 'rgba(0, 0, 0, 0.05)',
        foldIcon: '▶'
      }
    }

    return themeValues[theme]?.[property] || themeValues.light[property]
  }

  /**
   * Set header colors independently of theme
   */
  setHeaderColors(colors) {
    if (!colors || typeof colors !== 'object') return

    const headerColorMapping = {
      background: '--header-background',
      text: '--header-text-color', 
      border: '--header-border-color'
    }

    Object.keys(headerColorMapping).forEach(key => {
      if (colors[key] != null) {
        document.documentElement.style.setProperty(headerColorMapping[key], colors[key])
      }
    })

    // Save to settings
    this.settingsManager.set('editor.headerColors', colors)
  }

  /**
   * Load header colors from settings
   */
  loadHeaderColors() {
    const savedColors = this.settingsManager.get('editor.headerColors')
    if (savedColors) {
      this.setHeaderColors(savedColors)
    }
  }

  /**
   * Get default header colors for a specific theme
   */
  getDefaultHeaderColors(theme) {
    const defaults = {
      light: {
        background: '#f8f9fa',
        text: '#212529',
        border: '#dee2e6'
      },
      dark: {
        background: '#2d3748',
        text: '#f7fafc',
        border: '#4a5568'
      },
      fantasy: {
        background: '#2A4D2E', // King's Green Base
        text: '#D4AF37',       // Imperial Gold Base - Better contrast
        border: '#17301A'      // King's Green Dark
      },
      custom: {
        background: '#f8f9fa', // Defaults to light theme
        text: '#212529',
        border: '#dee2e6'
      }
    }

    return defaults[theme] || defaults.light
  }
}
