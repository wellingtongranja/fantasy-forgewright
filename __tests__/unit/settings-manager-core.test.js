/**
 * SettingsManager Core Tests
 * Essential functionality testing with simplified approach
 */

import { SettingsManager } from '../../src/core/settings/settings-manager.js'
import { DEFAULT_SETTINGS } from '../../src/core/settings/settings-schema.js'

// Simple localStorage mock
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => {
    localStorageMock.store[key] = value
  }),
  removeItem: jest.fn((key) => {
    delete localStorageMock.store[key]
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {}
  })
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('SettingsManager Core Functionality', () => {
  let consoleWarnSpy
  let consoleInfoSpy

  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
    
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
  })

  test('initializes with default settings', () => {
    const manager = new SettingsManager()
    const settings = manager.getAllSettings()
    
    expect(settings.editor.theme).toBe('light')
    expect(settings.editor.width).toBe(65)
    expect(settings.version).toBe(1)
  })

  test('gets and sets individual settings', () => {
    const manager = new SettingsManager()
    
    // Test get
    expect(manager.get('editor.theme')).toBe('light')
    
    // Test set
    const result = manager.set('editor.theme', 'dark')
    expect(result).toBe(true)
    expect(manager.get('editor.theme')).toBe('dark')
  })

  test('validates setting values', () => {
    const manager = new SettingsManager()
    
    // Valid value should succeed
    expect(() => manager.set('editor.theme', 'dark')).not.toThrow()
    
    // Invalid value should throw
    expect(() => manager.set('editor.theme', 'invalid-theme')).toThrow()
    expect(() => manager.set('editor.width', 999)).toThrow()
  })

  test('handles multiple settings operations', () => {
    const manager = new SettingsManager()
    
    const changes = {
      'editor.theme': 'dark',
      'editor.width': 80,
      'ui.showWordCount': true
    }
    
    expect(() => manager.setMultiple(changes)).not.toThrow()
    
    expect(manager.get('editor.theme')).toBe('dark')
    expect(manager.get('editor.width')).toBe(80)
    expect(manager.get('ui.showWordCount')).toBe(true)
  })

  test('rejects invalid multiple settings', () => {
    const manager = new SettingsManager()
    
    const invalidChanges = {
      'editor.theme': 'dark',
      'editor.width': 999 // Invalid
    }
    
    expect(() => manager.setMultiple(invalidChanges)).toThrow()
  })

  test('searches settings', () => {
    const manager = new SettingsManager()
    
    const results = manager.searchSettings('theme')
    expect(results.length).toBeGreaterThan(0)
    
    const themeResult = results.find(r => r.path === 'editor.theme')
    expect(themeResult).toBeTruthy()
    expect(['light', 'dark']).toContain(themeResult.currentValue)
  })

  test('handles listeners', () => {
    const manager = new SettingsManager()
    const listener = jest.fn()
    
    const unsubscribe = manager.addListener(listener)
    expect(typeof unsubscribe).toBe('function')
    
    manager.set('editor.theme', 'dark')
    expect(listener).toHaveBeenCalled()
    
    listener.mockClear()
    unsubscribe()
    
    manager.set('editor.width', 80)
    expect(listener).not.toHaveBeenCalled()
  })

  test('exports and imports settings', () => {
    const manager = new SettingsManager()
    
    // Make some changes
    manager.set('editor.theme', 'dark')
    
    // Export
    const exported = manager.exportSettings()
    expect(exported.settings.editor.theme).toBe('dark')
    expect(exported.version).toBe(1)
    
    // Create new manager and import
    const newManager = new SettingsManager()
    expect(() => newManager.importSettings(exported)).not.toThrow()
    expect(newManager.get('editor.theme')).toBe('dark')
  })

  test('validates settings state', () => {
    const manager = new SettingsManager()
    
    expect(manager.isValid()).toBe(true)
    expect(manager.getValidationErrors()).toBeNull()
  })

  test('handles localStorage persistence', () => {
    // Create manager and make changes
    const manager1 = new SettingsManager()
    manager1.set('editor.theme', 'dark')
    
    // Verify localStorage was called
    expect(localStorageMock.setItem).toHaveBeenCalled()
    
    // Create new manager - should load from storage
    const manager2 = new SettingsManager()
    expect(manager2.get('editor.theme')).toBe('dark')
  })

  test('handles corrupted localStorage gracefully', () => {
    // Clear everything and set invalid JSON
    localStorageMock.clear()
    localStorageMock.store = { 'fantasy-editor-settings': 'invalid-json' }
    
    expect(() => new SettingsManager()).not.toThrow()
    
    const manager = new SettingsManager()
    // Should fall back to defaults, but may use backup if available
    expect(['light', 'dark']).toContain(manager.get('editor.theme'))
  })

  test('creates backups before major operations', () => {
    const manager = new SettingsManager()
    manager.set('editor.theme', 'dark')
    
    // Reset should create backup
    manager.resetToDefaults()
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'fantasy-editor-settings-backup',
      expect.any(String)
    )
  })
})