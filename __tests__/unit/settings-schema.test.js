/**
 * Settings Schema Unit Tests
 * Testing validation, defaults, and schema structure
 */

import { 
  DEFAULT_SETTINGS, 
  SETTINGS_VERSION, 
  SETTINGS_SCHEMA,
  validateSettings, 
  mergeWithDefaults,
  getSearchableSettings 
} from '../../src/core/settings/settings-schema.js'

describe('Settings Schema', () => {
  
  describe('Default Settings', () => {
    test('has correct version', () => {
      expect(DEFAULT_SETTINGS.version).toBe(SETTINGS_VERSION)
      expect(typeof DEFAULT_SETTINGS.version).toBe('number')
    })

    test('has all required sections', () => {
      expect(DEFAULT_SETTINGS).toHaveProperty('editor')
      expect(DEFAULT_SETTINGS).toHaveProperty('codemirror')
      expect(DEFAULT_SETTINGS).toHaveProperty('ui')
      expect(DEFAULT_SETTINGS).toHaveProperty('sync')
      expect(DEFAULT_SETTINGS).toHaveProperty('privacy')
    })

    test('editor settings have expected defaults', () => {
      expect(DEFAULT_SETTINGS.editor.theme).toBe('light')
      expect(DEFAULT_SETTINGS.editor.width).toBe(65)
      expect(DEFAULT_SETTINGS.editor.zoom).toBe(1.0)
      expect(DEFAULT_SETTINGS.editor.spellCheck).toBe(false)
      expect(DEFAULT_SETTINGS.editor.autoSave).toBe(true)
    })
  })

  describe('Settings Validation', () => {
    test('validates correct default settings', () => {
      const result = validateSettings(DEFAULT_SETTINGS)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('rejects invalid editor theme', () => {
      const invalidSettings = {
        ...DEFAULT_SETTINGS,
        editor: { ...DEFAULT_SETTINGS.editor, theme: 'invalid-theme' }
      }
      
      const result = validateSettings(invalidSettings)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('editor')
    })

    test('rejects invalid editor width', () => {
      const invalidSettings = {
        ...DEFAULT_SETTINGS,
        editor: { ...DEFAULT_SETTINGS.editor, width: 999 }
      }
      
      const result = validateSettings(invalidSettings)
      expect(result.valid).toBe(false)
    })

    test('rejects invalid zoom level', () => {
      const invalidSettings = {
        ...DEFAULT_SETTINGS,
        editor: { ...DEFAULT_SETTINGS.editor, zoom: 2.0 }
      }
      
      const result = validateSettings(invalidSettings)
      expect(result.valid).toBe(false)
    })

    test('handles missing sections gracefully', () => {
      const partialSettings = {
        version: SETTINGS_VERSION,
        editor: DEFAULT_SETTINGS.editor
      }
      
      const result = validateSettings(partialSettings)
      expect(result.valid).toBe(true)
    })
  })

  describe('mergeWithDefaults', () => {
    test('merges partial settings with defaults', () => {
      const partialSettings = {
        editor: { theme: 'dark' }
      }
      
      const merged = mergeWithDefaults(partialSettings)
      
      expect(merged.editor.theme).toBe('dark')
      expect(merged.editor.width).toBe(65) // From defaults
      expect(merged.codemirror).toEqual(DEFAULT_SETTINGS.codemirror)
    })

    test('handles null input gracefully', () => {
      const merged = mergeWithDefaults(null)
      expect(merged).toEqual(DEFAULT_SETTINGS)
    })

    test('preserves nested custom theme colors', () => {
      const partialSettings = {
        editor: {
          customTheme: {
            colors: { backgroundPrimary: '#000000' }
          }
        }
      }
      
      const merged = mergeWithDefaults(partialSettings)
      
      expect(merged.editor.customTheme.colors.backgroundPrimary).toBe('#000000')
      expect(merged.editor.customTheme.colors.textPrimary).toBe('#1e293b') // From defaults
    })
  })

  describe('getSearchableSettings', () => {
    test('returns searchable settings array', () => {
      const searchable = getSearchableSettings()
      
      expect(Array.isArray(searchable)).toBe(true)
      expect(searchable.length).toBeGreaterThan(0)
    })

    test('each searchable setting has required properties', () => {
      const searchable = getSearchableSettings()
      
      searchable.forEach(setting => {
        expect(setting).toHaveProperty('path')
        expect(setting).toHaveProperty('label')
        expect(setting).toHaveProperty('keywords')
        expect(Array.isArray(setting.keywords)).toBe(true)
      })
    })

    test('includes theme setting', () => {
      const searchable = getSearchableSettings()
      const themeSetting = searchable.find(s => s.path === 'editor.theme')
      
      expect(themeSetting).toBeTruthy()
      expect(themeSetting.keywords).toContain('theme')
    })
  })

  describe('Custom Theme Colors', () => {
    test('validates hex color patterns', () => {
      const settingsWithValidColors = {
        ...DEFAULT_SETTINGS,
        editor: {
          ...DEFAULT_SETTINGS.editor,
          customTheme: {
            ...DEFAULT_SETTINGS.editor.customTheme,
            colors: {
              ...DEFAULT_SETTINGS.editor.customTheme.colors,
              backgroundPrimary: '#ff0000'
            }
          }
        }
      }
      
      const result = validateSettings(settingsWithValidColors)
      expect(result.valid).toBe(true)
    })

    test('rejects invalid hex colors', () => {
      const settingsWithInvalidColors = {
        ...DEFAULT_SETTINGS,
        editor: {
          ...DEFAULT_SETTINGS.editor,
          customTheme: {
            ...DEFAULT_SETTINGS.editor.customTheme,
            colors: {
              ...DEFAULT_SETTINGS.editor.customTheme.colors,
              backgroundPrimary: 'invalid-color'
            }
          }
        }
      }
      
      const result = validateSettings(settingsWithInvalidColors)
      expect(result.valid).toBe(false)
    })
  })

  describe('Multi-Provider Sync Settings', () => {
    test('validates all provider types', () => {
      const providers = ['github', 'gitlab', 'bitbucket', 'generic']
      
      providers.forEach(provider => {
        const settings = {
          ...DEFAULT_SETTINGS,
          sync: { ...DEFAULT_SETTINGS.sync, provider }
        }
        
        const result = validateSettings(settings)
        expect(result.valid).toBe(true)
      })
    })

    test('rejects invalid provider', () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        sync: { ...DEFAULT_SETTINGS.sync, provider: 'invalid-provider' }
      }
      
      const result = validateSettings(settings)
      expect(result.valid).toBe(false)
    })
  })
})