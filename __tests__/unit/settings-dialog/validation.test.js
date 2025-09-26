/**
 * Settings Dialog Validation Tests
 * Testing defensive programming validation utilities
 */

import {
  validateHexColor,
  validateZoom,
  validateWidth,
  validateThemeName,
  validateAutoSaveInterval,
  validateFontSize,
  sanitizeHtml,
  safeMerge
} from '../../../src/components/dialogs/settings-dialog/utils/validation.js'

describe('Settings Validation Utilities', () => {
  describe('validateHexColor', () => {
    test('accepts valid hex colors', () => {
      expect(validateHexColor('#ffffff')).toEqual({ isValid: true, error: null })
      expect(validateHexColor('#000000')).toEqual({ isValid: true, error: null })
      expect(validateHexColor('#FF5733')).toEqual({ isValid: true, error: null })
      expect(validateHexColor('#abc123')).toEqual({ isValid: true, error: null })
    })

    test('rejects invalid hex colors', () => {
      expect(validateHexColor('#fff')).toEqual({ 
        isValid: false, 
        error: 'Invalid hex color format. Use #RRGGBB format' 
      })
      expect(validateHexColor('ffffff')).toEqual({ 
        isValid: false, 
        error: 'Invalid hex color format. Use #RRGGBB format' 
      })
      expect(validateHexColor('#gggggg')).toEqual({ 
        isValid: false, 
        error: 'Invalid hex color format. Use #RRGGBB format' 
      })
    })

    test('handles edge cases defensively', () => {
      expect(validateHexColor('')).toEqual({ 
        isValid: false, 
        error: 'Color value is required' 
      })
      expect(validateHexColor(null)).toEqual({ 
        isValid: false, 
        error: 'Color value is required' 
      })
      expect(validateHexColor(123)).toEqual({ 
        isValid: false, 
        error: 'Color value must be a string' 
      })
    })
  })

  describe('validateZoom', () => {
    test('accepts valid zoom levels', () => {
      expect(validateZoom(1.0)).toEqual({ isValid: true, error: null })
      expect(validateZoom(0.5)).toEqual({ isValid: true, error: null })
      expect(validateZoom(3.0)).toEqual({ isValid: true, error: null })
      expect(validateZoom('2.5')).toEqual({ isValid: true, error: null })
    })

    test('rejects invalid zoom levels', () => {
      expect(validateZoom(0.4)).toEqual({ 
        isValid: false, 
        error: 'Zoom must be between 0.5 and 3.0' 
      })
      expect(validateZoom(3.1)).toEqual({ 
        isValid: false, 
        error: 'Zoom must be between 0.5 and 3.0' 
      })
      expect(validateZoom('invalid')).toEqual({ 
        isValid: false, 
        error: 'Zoom must be a number' 
      })
    })

    test('handles edge cases defensively', () => {
      expect(validateZoom(null)).toEqual({ 
        isValid: false, 
        error: 'Zoom value is required' 
      })
      expect(validateZoom(undefined)).toEqual({ 
        isValid: false, 
        error: 'Zoom value is required' 
      })
    })
  })

  describe('validateWidth', () => {
    test('accepts valid width values', () => {
      expect(validateWidth(65)).toEqual({ isValid: true, error: null })
      expect(validateWidth(40)).toEqual({ isValid: true, error: null })
      expect(validateWidth(150)).toEqual({ isValid: true, error: null })
      expect(validateWidth('80')).toEqual({ isValid: true, error: null })
    })

    test('rejects invalid width values', () => {
      expect(validateWidth(39)).toEqual({ 
        isValid: false, 
        error: 'Width must be between 40 and 150 characters' 
      })
      expect(validateWidth(151)).toEqual({ 
        isValid: false, 
        error: 'Width must be between 40 and 150 characters' 
      })
      expect(validateWidth('invalid')).toEqual({ 
        isValid: false, 
        error: 'Width must be a number' 
      })
    })
  })

  describe('validateThemeName', () => {
    test('accepts valid theme names', () => {
      expect(validateThemeName('My Theme')).toEqual({ isValid: true, error: null })
      expect(validateThemeName('dark-theme')).toEqual({ isValid: true, error: null })
      expect(validateThemeName('Theme_123')).toEqual({ isValid: true, error: null })
    })

    test('rejects invalid theme names', () => {
      expect(validateThemeName('ab')).toEqual({ 
        isValid: false, 
        error: 'Theme name must be at least 3 characters' 
      })
      expect(validateThemeName('a'.repeat(51))).toEqual({ 
        isValid: false, 
        error: 'Theme name must be 50 characters or less' 
      })
      expect(validateThemeName('theme@#$')).toEqual({ 
        isValid: false, 
        error: 'Theme name can only contain letters, numbers, spaces, hyphens, and underscores' 
      })
    })

    test('handles edge cases defensively', () => {
      expect(validateThemeName('')).toEqual({ 
        isValid: false, 
        error: 'Theme name is required' 
      })
      expect(validateThemeName(null)).toEqual({ 
        isValid: false, 
        error: 'Theme name is required' 
      })
    })
  })

  describe('validateAutoSaveInterval', () => {
    test('accepts valid intervals', () => {
      expect(validateAutoSaveInterval(1000)).toEqual({ isValid: true, error: null })
      expect(validateAutoSaveInterval(300000)).toEqual({ isValid: true, error: null })
      expect(validateAutoSaveInterval('5000')).toEqual({ isValid: true, error: null })
    })

    test('rejects invalid intervals', () => {
      expect(validateAutoSaveInterval(999)).toEqual({ 
        isValid: false, 
        error: 'Interval must be between 1 and 300 seconds' 
      })
      expect(validateAutoSaveInterval(300001)).toEqual({ 
        isValid: false, 
        error: 'Interval must be between 1 and 300 seconds' 
      })
    })
  })

  describe('validateFontSize', () => {
    test('accepts valid font sizes', () => {
      expect(validateFontSize(12)).toEqual({ isValid: true, error: null })
      expect(validateFontSize(8)).toEqual({ isValid: true, error: null })
      expect(validateFontSize(48)).toEqual({ isValid: true, error: null })
      expect(validateFontSize('14')).toEqual({ isValid: true, error: null })
    })

    test('rejects invalid font sizes', () => {
      expect(validateFontSize(7)).toEqual({ 
        isValid: false, 
        error: 'Font size must be between 8 and 48 pixels' 
      })
      expect(validateFontSize(49)).toEqual({ 
        isValid: false, 
        error: 'Font size must be between 8 and 48 pixels' 
      })
      expect(validateFontSize('invalid')).toEqual({ 
        isValid: false, 
        error: 'Font size must be a number' 
      })
    })
  })

  describe('sanitizeHtml', () => {
    test('escapes HTML entities', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;')
      expect(sanitizeHtml('Hello & Goodbye')).toBe('Hello &amp; Goodbye')
      expect(sanitizeHtml('"quoted text"')).toBe('"quoted text"')
    })

    test('handles edge cases defensively', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null)).toBe('')
      expect(sanitizeHtml(undefined)).toBe('')
      expect(sanitizeHtml(123)).toBe('')
    })
  })

  describe('safeMerge', () => {
    test('merges objects safely', () => {
      const target = { a: 1, b: { c: 2 } }
      const source = { b: { d: 3 }, e: 4 }
      const result = safeMerge(target, source)
      
      expect(result).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4
      })
    })

    test('handles null/undefined inputs defensively', () => {
      expect(safeMerge(null, { a: 1 })).toEqual({ a: 1 })
      expect(safeMerge({ a: 1 }, null)).toEqual({ a: 1 })
      expect(safeMerge(null, null)).toEqual({})
    })

    test('deep merges nested objects', () => {
      const target = { settings: { theme: 'light', zoom: 1.0 } }
      const source = { settings: { theme: 'dark', fontSize: 14 } }
      const result = safeMerge(target, source)
      
      expect(result.settings).toEqual({
        theme: 'dark',
        zoom: 1.0,
        fontSize: 14
      })
    })
  })
})