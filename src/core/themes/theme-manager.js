export class ThemeManager {
  constructor() {
    this.currentTheme = this.loadTheme() || 'light'
    this.applyTheme(this.currentTheme)
  }

  loadTheme() {
    return localStorage.getItem('theme-preference')
  }

  saveTheme(theme) {
    localStorage.setItem('theme-preference', theme)
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    this.currentTheme = theme
    this.saveTheme(theme)
    this.updateThemeToggle()
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
}
