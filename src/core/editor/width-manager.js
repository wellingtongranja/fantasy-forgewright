/**
 * WidthManager - Editor width and zoom control for Fantasy Editor
 * Manages editor content width and zoom levels with persistence
 */

export class WidthManager {
  constructor(settingsManager, app = null) {
    this.settingsManager = settingsManager
    this.app = app // Reference to app for theme reconfiguration
    this.widthPresets = {
      65: '65ch', // Optimal reading width
      80: '80ch', // Standard coding width
      90: '90ch' // Wide editing width
    }

    this.zoomLevels = [0.85, 1.0, 1.15, 1.3] // Available zoom levels

    // Load saved preferences or defaults
    this.currentWidth = this.loadWidth() || 65
    this.currentZoom = this.loadZoom() || 1.0

    // Callbacks for external listeners
    this.onWidthChange = null
    this.onZoomChange = null

    // Listen for settings changes
    this.settingsManager.addListener(this.handleSettingsChange.bind(this))

    this.initialize()
  }

  /**
   * Handle settings changes from Settings Manager
   */
  handleSettingsChange(event) {
    if (event.event === 'setting-changed') {
      const { path, value } = event.data
      
      if (path === 'editor.width' && value !== this.currentWidth) {
        this.applyWidthOnly(value)
      } else if (path === 'editor.zoom' && value !== this.currentZoom) {
        this.applyZoomOnly(value)
      }
    }
  }

  /**
   * Initialize width manager
   */
  initialize() {
    this.applyWidth(this.currentWidth)
    this.applyZoom(this.currentZoom)
  }

  /**
   * Set editor width
   */
  setWidth(widthColumns) {
    if (!this.widthPresets[widthColumns]) {
      throw new Error(
        `Invalid width: ${widthColumns}. Available: ${Object.keys(this.widthPresets).join(', ')}`
      )
    }

    this.applyWidthOnly(widthColumns)
    this.saveWidth(widthColumns)

    return {
      success: true,
      message: `Editor width set to ${widthColumns}ch`,
      width: this.widthPresets[widthColumns]
    }
  }

  /**
   * Apply width changes without saving (for Settings Manager updates)
   */
  applyWidthOnly(widthColumns) {
    this.currentWidth = widthColumns
    this.applyWidth(widthColumns)

    // Notify callback if set
    if (this.onWidthChange) {
      this.onWidthChange(widthColumns)
    }
  }

  /**
   * Set zoom level
   */
  setZoom(zoomLevel) {
    // Clamp zoom level to valid range
    const clampedZoom = Math.max(0.85, Math.min(1.3, zoomLevel))

    this.applyZoomOnly(clampedZoom)
    this.saveZoom(clampedZoom)

    return {
      success: true,
      message: `Zoom level set to ${Math.round(clampedZoom * 100)}%`,
      zoomLevel: clampedZoom
    }
  }

  /**
   * Apply zoom changes without saving (for Settings Manager updates)
   */
  applyZoomOnly(zoomLevel) {
    this.currentZoom = zoomLevel
    this.applyZoom(zoomLevel)

    // Notify callback if set
    if (this.onZoomChange) {
      this.onZoomChange(zoomLevel)
    }
  }

  /**
   * Zoom in (increase font size)
   */
  zoomIn() {
    const currentIndex = this.zoomLevels.findIndex((level) => level >= this.currentZoom)
    const nextIndex = Math.min(currentIndex + 1, this.zoomLevels.length - 1)
    return this.setZoom(this.zoomLevels[nextIndex])
  }

  /**
   * Zoom out (decrease font size)
   */
  zoomOut() {
    const currentIndex = this.zoomLevels.findIndex((level) => level >= this.currentZoom)
    const prevIndex = Math.max(currentIndex - 1, 0)
    return this.setZoom(this.zoomLevels[prevIndex])
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom() {
    return this.setZoom(1.0)
  }

  /**
   * Set width change callback
   */
  setWidthChangeCallback(callback) {
    this.onWidthChange = callback
  }

  /**
   * Set zoom change callback
   */
  setZoomChangeCallback(callback) {
    this.onZoomChange = callback
  }

  /**
   * Apply width setting to CSS
   */
  applyWidth(widthColumns) {
    const widthValue = this.widthPresets[widthColumns]
    document.documentElement.style.setProperty('--editor-max-width', widthValue)
  }

  /**
   * Apply zoom setting to CSS and CodeMirror
   */
  applyZoom(zoomLevel) {
    // Set the zoom level variable for CSS
    document.documentElement.style.setProperty('--editor-zoom-level', zoomLevel.toString())

    // Calculate the actual font size for CodeMirror
    const baseFontSize = 16 // 1rem in pixels
    const zoomedFontSize = Math.round(baseFontSize * zoomLevel)

    // Set CodeMirror specific font size
    document.documentElement.style.setProperty('--codemirror-font-size', `${zoomedFontSize}px`)

    // Trigger CodeMirror theme reconfiguration with fontSize if app is available
    if (this.app && this.app.editor && this.app.editor.reconfigureWithFontSize) {
      this.app.editor.reconfigureWithFontSize(`${zoomedFontSize}px`)
    }
  }

  /**
   * Get current width setting
   */
  getCurrentWidth() {
    return {
      columns: this.currentWidth,
      value: this.widthPresets[this.currentWidth]
    }
  }

  /**
   * Get current zoom setting
   */
  getCurrentZoom() {
    return {
      level: this.currentZoom,
      percentage: Math.round(this.currentZoom * 100)
    }
  }

  /**
   * Get available width presets
   */
  getAvailableWidths() {
    return Object.keys(this.widthPresets).map((key) => ({
      columns: parseInt(key),
      value: this.widthPresets[key],
      current: parseInt(key) === this.currentWidth
    }))
  }

  /**
   * Get zoom range info
   */
  getZoomInfo() {
    return {
      current: this.currentZoom,
      min: Math.min(...this.zoomLevels),
      max: Math.max(...this.zoomLevels),
      levels: this.zoomLevels,
      percentage: Math.round(this.currentZoom * 100)
    }
  }

  /**
   * Load width preference from Settings Manager
   */
  loadWidth() {
    try {
      const saved = this.settingsManager.get('editor.width')
      if (saved && this.widthPresets[saved]) {
        return saved
      }
    } catch (error) {
      console.warn('Failed to load width preference:', error)
    }
    return null
  }

  /**
   * Save width preference to Settings Manager
   */
  saveWidth(widthColumns) {
    try {
      this.settingsManager.set('editor.width', widthColumns)
    } catch (error) {
      console.warn('Failed to save width preference:', error)
    }
  }

  /**
   * Load zoom preference from Settings Manager
   */
  loadZoom() {
    try {
      const saved = this.settingsManager.get('editor.zoom')
      if (saved && saved >= 0.85 && saved <= 1.3) {
        return saved
      }
    } catch (error) {
      console.warn('Failed to load zoom preference:', error)
    }
    return null
  }

  /**
   * Save zoom preference to Settings Manager
   */
  saveZoom(zoomLevel) {
    try {
      this.settingsManager.set('editor.zoom', zoomLevel)
    } catch (error) {
      console.warn('Failed to save zoom preference:', error)
    }
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    this.currentWidth = 65
    this.currentZoom = 1.0
    this.applyWidth(this.currentWidth)
    this.applyZoom(this.currentZoom)
    this.saveWidth(this.currentWidth)
    this.saveZoom(this.currentZoom)

    return {
      success: true,
      message: 'Editor width and zoom reset to defaults (65ch, 100%)'
    }
  }

  /**
   * Get responsive width for mobile devices
   */
  getResponsiveWidth() {
    if (window.innerWidth < 768) {
      return '100%' // Full width on mobile
    }
    return this.widthPresets[this.currentWidth]
  }

  /**
   * Handle window resize for responsive behavior
   */
  handleResize() {
    // Update width if on mobile
    if (window.innerWidth < 768) {
      document.documentElement.style.setProperty('--editor-max-width', '100%')
    } else {
      document.documentElement.style.setProperty(
        '--editor-max-width',
        this.widthPresets[this.currentWidth]
      )
    }
  }
}
