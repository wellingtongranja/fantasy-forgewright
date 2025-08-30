/**
 * SettingsManager - Core settings management with persistence and validation
 * Follows Fantasy Editor principles: defensive programming, clean code, TDD-ready
 */

import { 
  DEFAULT_SETTINGS, 
  SETTINGS_VERSION, 
  validateSettings, 
  mergeWithDefaults,
  getSearchableSettings 
} from './settings-schema.js'

export class SettingsManager {
  constructor() {
    this.storageKey = 'fantasy-editor-settings'
    this.backupKey = 'fantasy-editor-settings-backup'
    this.settings = null
    this.listeners = new Set()
    
    this.initialize()
  }

  /**
   * Initialize settings manager
   */
  initialize() {
    try {
      this.loadSettings()
      this.validateAndMigrate()
    } catch (error) {
      console.warn('Settings initialization failed:', error)
      this.resetToDefaults()
    }
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) {
        this.settings = { ...DEFAULT_SETTINGS }
        return
      }

      const parsed = JSON.parse(stored)
      this.settings = mergeWithDefaults(parsed)
      
    } catch (error) {
      console.warn('Failed to load settings:', error)
      this.loadBackupSettings()
    }
  }

  /**
   * Load backup settings if main settings fail
   */
  loadBackupSettings() {
    try {
      const backup = localStorage.getItem(this.backupKey)
      if (backup) {
        const parsed = JSON.parse(backup)
        this.settings = mergeWithDefaults(parsed)
        console.info('Loaded settings from backup')
        return
      }
    } catch (error) {
      console.warn('Backup settings also corrupted:', error)
    }
    
    this.settings = { ...DEFAULT_SETTINGS }
  }

  /**
   * Validate current settings and migrate if needed
   */
  validateAndMigrate() {
    const validation = validateSettings(this.settings)
    
    if (!validation.valid) {
      console.warn('Settings validation failed:', validation.error)
      this.migrateSettings()
    }

    // Check if migration is needed
    if (this.settings.version < SETTINGS_VERSION) {
      this.migrateSettings()
    }
  }

  /**
   * Migrate settings to current version
   */
  migrateSettings() {
    const oldVersion = this.settings.version || 1
    console.info(`Migrating settings from v${oldVersion} to v${SETTINGS_VERSION}`)
    
    // Create backup before migration
    this.createBackup()
    
    // Future migration logic will go here
    // For now, merge with defaults to ensure all fields exist
    this.settings = mergeWithDefaults(this.settings)
    this.settings.version = SETTINGS_VERSION
    
    this.saveSettings()
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      const validation = validateSettings(this.settings)
      
      if (!validation.valid) {
        throw new Error(`Invalid settings: ${validation.error}`)
      }

      localStorage.setItem(this.storageKey, JSON.stringify(this.settings))
      this.notifyListeners('settings-saved', this.settings)
      
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  /**
   * Create backup of current settings
   */
  createBackup() {
    try {
      if (this.settings) {
        localStorage.setItem(this.backupKey, JSON.stringify(this.settings))
      }
    } catch (error) {
      console.warn('Failed to create settings backup:', error)
    }
  }

  /**
   * Get setting value by path (e.g., 'editor.theme')
   */
  get(path) {
    if (!path || typeof path !== 'string') {
      throw new Error('Setting path must be a non-empty string')
    }

    const keys = path.split('.')
    let value = this.settings

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * Set setting value by path
   */
  set(path, value) {
    if (!path || typeof path !== 'string') {
      throw new Error('Setting path must be a non-empty string')
    }

    const keys = path.split('.')
    let current = this.settings

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    // Set the final value
    const finalKey = keys[keys.length - 1]
    const oldValue = current[finalKey]
    current[finalKey] = value

    // Validate the entire settings object
    const validation = validateSettings(this.settings)
    
    if (!validation.valid) {
      // Revert the change
      current[finalKey] = oldValue
      throw new Error(`Invalid setting value: ${validation.error}`)
    }

    // Save and notify
    this.saveSettings()
    this.notifyListeners('setting-changed', { path, value, oldValue })

    return true
  }

  /**
   * Get multiple settings at once
   */
  getMultiple(paths) {
    if (!Array.isArray(paths)) {
      throw new Error('Paths must be an array')
    }

    const result = {}
    
    for (const path of paths) {
      result[path] = this.get(path)
    }

    return result
  }

  /**
   * Set multiple settings at once
   */
  setMultiple(settings) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings must be an object')
    }

    const changes = []

    // Apply all changes
    for (const [path, value] of Object.entries(settings)) {
      const oldValue = this.get(path)
      
      // Set value without saving (we'll save once at the end)
      const keys = path.split('.')
      let current = this.settings

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {}
        }
        current = current[key]
      }

      current[keys[keys.length - 1]] = value
      changes.push({ path, value, oldValue })
    }

    // Validate all changes
    const validation = validateSettings(this.settings)
    
    if (!validation.valid) {
      // Revert all changes
      for (const { path, oldValue } of changes) {
        const keys = path.split('.')
        let current = this.settings

        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]]
        }

        current[keys[keys.length - 1]] = oldValue
      }
      
      throw new Error(`Invalid settings: ${validation.error}`)
    }

    // Save and notify
    this.saveSettings()
    this.notifyListeners('settings-changed', changes)

    return true
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    this.createBackup()
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveSettings()
    this.notifyListeners('settings-reset', this.settings)
  }

  /**
   * Reset specific section to defaults
   */
  resetSection(section) {
    if (!section || typeof section !== 'string') {
      throw new Error('Section name must be a non-empty string')
    }

    if (!DEFAULT_SETTINGS[section]) {
      throw new Error(`Unknown settings section: ${section}`)
    }

    const oldValues = { ...this.settings[section] }
    this.settings[section] = { ...DEFAULT_SETTINGS[section] }
    
    this.saveSettings()
    this.notifyListeners('section-reset', { section, oldValues })
  }

  /**
   * Export settings as JSON
   */
  exportSettings() {
    return {
      settings: { ...this.settings },
      exportDate: new Date().toISOString(),
      version: SETTINGS_VERSION
    }
  }

  /**
   * Import settings from exported JSON
   */
  importSettings(exportData) {
    if (!exportData || typeof exportData !== 'object') {
      throw new Error('Import data must be an object')
    }

    if (!exportData.settings) {
      throw new Error('Import data must contain settings')
    }

    const validation = validateSettings(exportData.settings)
    
    if (!validation.valid) {
      throw new Error(`Invalid import data: ${validation.error}`)
    }

    this.createBackup()
    this.settings = mergeWithDefaults(exportData.settings)
    this.saveSettings()
    this.notifyListeners('settings-imported', this.settings)

    return true
  }

  /**
   * Get all settings
   */
  getAllSettings() {
    return { ...this.settings }
  }

  /**
   * Search settings by query
   */
  searchSettings(query) {
    if (!query || typeof query !== 'string') {
      return []
    }

    const searchableSettings = getSearchableSettings()
    const lowercaseQuery = query.toLowerCase()
    
    return searchableSettings.filter(setting => {
      const labelMatch = setting.label.toLowerCase().includes(lowercaseQuery)
      const keywordMatch = setting.keywords.some(keyword => 
        keyword.toLowerCase().includes(lowercaseQuery)
      )
      
      return labelMatch || keywordMatch
    }).map(setting => ({
      ...setting,
      currentValue: this.get(setting.path)
    }))
  }

  /**
   * Add settings change listener
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Listener must be a function')
    }
    
    this.listeners.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener({ event, data, timestamp: Date.now() })
      } catch (error) {
        console.warn('Settings listener error:', error)
      }
    }
  }

  /**
   * Check if settings are valid
   */
  isValid() {
    return validateSettings(this.settings).valid
  }

  /**
   * Get settings validation errors
   */
  getValidationErrors() {
    const validation = validateSettings(this.settings)
    return validation.valid ? null : validation.error
  }
}