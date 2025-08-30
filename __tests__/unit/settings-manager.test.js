/**
 * SettingsManager Unit Tests
 * Comprehensive testing following TDD principles and Fantasy Editor standards
 */

import { SettingsManager } from '../../src/core/settings/settings-manager.js'
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../../src/core/settings/settings-schema.js'

// Mock localStorage for testing
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

// Setup localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('SettingsManager', () => {
  let settingsManager
  let consoleWarnSpy
  let consoleErrorSpy

  beforeEach(() => {
    // Clear localStorage completely
    localStorageMock.clear()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()

    // Ensure store is truly empty
    localStorageMock.store = {}

    // Spy on console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'info').mockImplementation(() => {})

    // Create new instance for clean state
    settingsManager = new SettingsManager()
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('Initialization', () => {
    test('initializes with default settings when localStorage is empty', () => {
      const settings = settingsManager.getAllSettings()
      
      expect(settings).toEqual(DEFAULT_SETTINGS)
      expect(settings.version).toBe(SETTINGS_VERSION)
    })

    test('loads existing settings from localStorage', () => {
      const existingSettings = {
        ...DEFAULT_SETTINGS,
        editor: { ...DEFAULT_SETTINGS.editor, theme: 'dark' }
      }
      
      localStorageMock.store['fantasy-editor-settings'] = JSON.stringify(existingSettings)
      
      const newManager = new SettingsManager()
      const settings = newManager.getAllSettings()
      
      expect(settings.editor.theme).toBe('dark')
    })

    test('falls back to defaults when localStorage contains invalid JSON', () => {
      localStorageMock.store['fantasy-editor-settings'] = 'invalid-json'
      
      const newManager = new SettingsManager()
      const settings = newManager.getAllSettings()
      
      expect(settings).toEqual(DEFAULT_SETTINGS)
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    test('loads backup settings when main settings fail', () => {
      const backupSettings = {
        ...DEFAULT_SETTINGS,
        editor: { ...DEFAULT_SETTINGS.editor, theme: 'fantasy' }
      }
      
      localStorageMock.store['fantasy-editor-settings'] = 'invalid-json'
      localStorageMock.store['fantasy-editor-settings-backup'] = JSON.stringify(backupSettings)
      
      const newManager = new SettingsManager()
      const settings = newManager.getAllSettings()
      
      expect(settings.editor.theme).toBe('fantasy')
    })
  })

  describe('Get/Set Operations', () => {
    test('gets setting value by path', () => {
      const theme = settingsManager.get('editor.theme')
      const width = settingsManager.get('editor.width')
      
      expect(theme).toBe('light')
      expect(width).toBe(65)
    })

    test('returns undefined for non-existent path', () => {
      const nonExistent = settingsManager.get('editor.nonExistent')
      const deepNonExistent = settingsManager.get('editor.deep.nested.path')
      
      expect(nonExistent).toBeUndefined()
      expect(deepNonExistent).toBeUndefined()
    })

    test('throws error for invalid path types', () => {
      expect(() => settingsManager.get(null)).toThrow('Setting path must be a non-empty string')
      expect(() => settingsManager.get('')).toThrow('Setting path must be a non-empty string')
      expect(() => settingsManager.get(123)).toThrow('Setting path must be a non-empty string')
    })

    test('sets setting value by path', () => {
      const result = settingsManager.set('editor.theme', 'dark')
      
      expect(result).toBe(true)
      expect(settingsManager.get('editor.theme')).toBe('dark')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    test('validates setting values on set', () => {
      expect(() => {
        settingsManager.set('editor.theme', 'invalid-theme')
      }).toThrow('Invalid setting value')
      
      expect(() => {
        settingsManager.set('editor.width', 999)
      }).toThrow('Invalid setting value')
    })

    test('reverts invalid changes', () => {
      const originalTheme = settingsManager.get('editor.theme')
      
      try {
        settingsManager.set('editor.theme', 'invalid-theme')
      } catch (error) {
        // Expected error
      }
      
      expect(settingsManager.get('editor.theme')).toBe(originalTheme)
    })
  })

  describe('Multiple Settings Operations', () => {
    test('gets multiple settings at once', () => {
      const result = settingsManager.getMultiple(['editor.theme', 'editor.width', 'ui.navigatorPinned'])
      
      expect(result).toEqual({
        'editor.theme': 'light',
        'editor.width': 65,
        'ui.navigatorPinned': false
      })
    })

    test('throws error for non-array input to getMultiple', () => {
      expect(() => settingsManager.getMultiple('not-array')).toThrow('Paths must be an array')
      expect(() => settingsManager.getMultiple(null)).toThrow('Paths must be an array')
    })

    test('sets multiple settings at once', () => {
      const changes = {
        'editor.theme': 'dark',
        'editor.width': 80,
        'ui.showWordCount': true
      }
      
      const result = settingsManager.setMultiple(changes)
      
      expect(result).toBe(true)
      expect(settingsManager.get('editor.theme')).toBe('dark')
      expect(settingsManager.get('editor.width')).toBe(80)
      expect(settingsManager.get('ui.showWordCount')).toBe(true)
    })

    test('validates all changes in setMultiple', () => {
      const invalidChanges = {
        'editor.theme': 'dark',
        'editor.width': 999 // Invalid value
      }
      
      expect(() => settingsManager.setMultiple(invalidChanges)).toThrow('Invalid settings')
      
      // Should not have changed any values
      expect(settingsManager.get('editor.theme')).toBe('light')
      expect(settingsManager.get('editor.width')).toBe(65)
    })
  })

  describe('Reset Operations', () => {
    test('resets all settings to defaults', () => {
      // Make some changes
      settingsManager.set('editor.theme', 'dark')
      settingsManager.set('ui.showWordCount', true)
      
      // Reset
      settingsManager.resetToDefaults()
      
      const settings = settingsManager.getAllSettings()
      expect(settings).toEqual(DEFAULT_SETTINGS)
    })

    test('resets specific section to defaults', () => {
      // Make changes to editor section
      settingsManager.set('editor.theme', 'dark')
      settingsManager.set('editor.width', 90)
      
      // Make changes to other sections
      settingsManager.set('ui.showWordCount', true)
      
      // Reset only editor section
      settingsManager.resetSection('editor')
      
      expect(settingsManager.get('editor.theme')).toBe('light')
      expect(settingsManager.get('editor.width')).toBe(65)
      expect(settingsManager.get('ui.showWordCount')).toBe(true) // Unchanged
    })

    test('throws error for invalid section name', () => {
      expect(() => settingsManager.resetSection('invalidSection')).toThrow('Unknown settings section')
      expect(() => settingsManager.resetSection('')).toThrow('Section name must be a non-empty string')
      expect(() => settingsManager.resetSection(null)).toThrow('Section name must be a non-empty string')
    })
  })

  describe('Import/Export', () => {
    test('exports settings correctly', () => {
      settingsManager.set('editor.theme', 'dark')
      
      const exported = settingsManager.exportSettings()
      
      expect(exported.settings.editor.theme).toBe('dark')
      expect(exported.version).toBe(SETTINGS_VERSION)
      expect(exported.exportDate).toBeTruthy()
      expect(new Date(exported.exportDate)).toBeInstanceOf(Date)
    })

    test('imports settings correctly', () => {
      const importData = {
        settings: {
          ...DEFAULT_SETTINGS,
          editor: { ...DEFAULT_SETTINGS.editor, theme: 'fantasy' }
        },
        version: SETTINGS_VERSION,
        exportDate: new Date().toISOString()
      }
      
      const result = settingsManager.importSettings(importData)
      
      expect(result).toBe(true)
      expect(settingsManager.get('editor.theme')).toBe('fantasy')
    })

    test('validates imported settings', () => {
      const invalidImport = {
        settings: {
          editor: { theme: 'invalid-theme' }
        }
      }
      
      expect(() => settingsManager.importSettings(invalidImport)).toThrow('Invalid import data')
    })

    test('throws error for invalid import data', () => {
      expect(() => settingsManager.importSettings(null)).toThrow('Import data must be an object')
      expect(() => settingsManager.importSettings({})).toThrow('Import data must contain settings')
    })
  })

  describe('Search Functionality', () => {
    test('searches settings by label', () => {
      const results = settingsManager.searchSettings('theme')
      
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].label).toContain('Theme')
      expect(results[0].path).toBe('editor.theme')
      expect(results[0].currentValue).toBe('light')
    })

    test('searches settings by keywords', () => {
      const results = settingsManager.searchSettings('line')
      
      expect(results.length).toBeGreaterThan(0)
      const lineNumberResult = results.find(r => r.path === 'codemirror.lineNumbers')
      expect(lineNumberResult).toBeTruthy()
    })

    test('returns empty array for invalid search query', () => {
      expect(settingsManager.searchSettings('')).toEqual([])
      expect(settingsManager.searchSettings(null)).toEqual([])
    })

    test('returns empty array when no matches found', () => {
      const results = settingsManager.searchSettings('nonexistentsetting')
      expect(results).toEqual([])
    })
  })

  describe('Event Listeners', () => {
    test('adds and removes listeners correctly', () => {
      const listener = jest.fn()
      
      const unsubscribe = settingsManager.addListener(listener)
      
      expect(typeof unsubscribe).toBe('function')
      
      // Trigger a change
      settingsManager.set('editor.theme', 'dark')
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        event: 'setting-changed',
        data: { path: 'editor.theme', value: 'dark', oldValue: 'light' },
        timestamp: expect.any(Number)
      }))
      
      // Unsubscribe and test
      listener.mockClear()
      unsubscribe()
      
      settingsManager.set('editor.width', 80)
      expect(listener).not.toHaveBeenCalled()
    })

    test('throws error for non-function listener', () => {
      expect(() => settingsManager.addListener('not-a-function')).toThrow('Listener must be a function')
      expect(() => settingsManager.addListener(null)).toThrow('Listener must be a function')
    })

    test('handles listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error')
      })
      
      settingsManager.addListener(errorListener)
      
      // Should not throw
      expect(() => {
        settingsManager.set('editor.theme', 'dark')
      }).not.toThrow()
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Settings listener error:', expect.any(Error))
    })
  })

  describe('Validation', () => {
    test('reports settings validity correctly', () => {
      expect(settingsManager.isValid()).toBe(true)
      expect(settingsManager.getValidationErrors()).toBeNull()
    })

    test('detects invalid settings', () => {
      // Manually corrupt settings to test validation
      settingsManager.settings.editor.theme = 'invalid-theme'
      
      expect(settingsManager.isValid()).toBe(false)
      expect(settingsManager.getValidationErrors()).toBeTruthy()
    })
  })

  describe('Backup and Recovery', () => {
    test('creates backup before reset', () => {
      settingsManager.set('editor.theme', 'dark')
      settingsManager.resetToDefaults()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fantasy-editor-settings-backup',
        expect.any(String)
      )
    })

    test('creates backup before import', () => {
      const importData = {
        settings: DEFAULT_SETTINGS,
        version: SETTINGS_VERSION
      }
      
      settingsManager.importSettings(importData)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fantasy-editor-settings-backup',
        expect.any(String)
      )
    })
  })

  describe('Edge Cases', () => {
    test('handles localStorage quota exceeded', () => {
      const originalSetItem = localStorageMock.setItem
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      expect(() => {
        settingsManager.set('editor.theme', 'dark')
      }).toThrow()
      
      localStorageMock.setItem = originalSetItem
    })

    test('handles setting deeply nested paths', () => {
      settingsManager.set('editor.customTheme.colors.backgroundPrimary', '#ffffff')
      
      expect(settingsManager.get('editor.customTheme.colors.backgroundPrimary')).toBe('#ffffff')
    })

    test('creates intermediate objects for nested paths', () => {
      settingsManager.set('new.nested.path', 'value')
      
      expect(settingsManager.get('new.nested.path')).toBe('value')
      expect(typeof settingsManager.get('new.nested')).toBe('object')
    })
  })
})