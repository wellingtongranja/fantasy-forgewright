import { getThemeExtension } from './codemirror-themes.js'

export class ThemeManager {
  constructor() {
    this.currentTheme = this.loadTheme() || 'light'
    this.editorView = null // Will be set by EditorManager
    this.applyTheme(this.currentTheme)
  }

  /**
   * Set the editor view for theme coordination
   */
  setEditorView(editorView) {
    this.editorView = editorView
  }

  loadTheme() {
    return localStorage.getItem('theme-preference')
  }

  saveTheme(theme) {
    localStorage.setItem('theme-preference', theme)
  }

  applyTheme(theme) {
    // Apply CSS theme
    document.documentElement.setAttribute('data-theme', theme)

    // Apply CodeMirror theme if editor is available
    if (this.editorView) {
      this.applyCodeMirrorTheme(theme)
    }

    this.currentTheme = theme
    this.saveTheme(theme)
    this.updateThemeToggle()

    // Emit theme change event for other components
    this.emitThemeChangeEvent(theme)
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
    const themes = ['light', 'dark', 'fantasy']
    const currentIndex = themes.indexOf(this.currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    this.applyTheme(themes[nextIndex])
  }

  updateThemeToggle() {
    const toggle = document.getElementById('theme-toggle')
    if (!toggle) return

    const icons = {
      light: '🌙',
      dark: '☀️',
      fantasy: '✨'
    }

    toggle.textContent = icons[this.currentTheme] || '🌙'
    toggle.setAttribute('aria-label', `Switch to ${this.getNextTheme()} theme`)
  }

  getNextTheme() {
    const themes = ['light', 'dark', 'fantasy']
    const currentIndex = themes.indexOf(this.currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
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
    return ['light', 'dark', 'fantasy']
  }

  /**
   * Check if theme is dark
   */
  isDarkTheme(theme = this.currentTheme) {
    return theme === 'dark'
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
        searchHighlight: 'rgba(184, 134, 11, 0.3)',
        activeLineHighlight: 'rgba(139, 69, 19, 0.1)',
        foldIcon: '▶'
      }
    }

    return themeValues[theme]?.[property] || themeValues.light[property]
  }
}
