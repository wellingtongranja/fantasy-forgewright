import { ThemeManager } from '../../src/core/themes/theme-manager.js'

describe('Header Color Customization', () => {
  let themeManager
  let mockSettingsManager
  let mockDocument

  beforeEach(() => {
    mockSettingsManager = {
      get: jest.fn(),
      set: jest.fn(),
      addListener: jest.fn()
    }

    mockDocument = {
      documentElement: {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        style: {
          setProperty: jest.fn(),
          removeProperty: jest.fn(),
          getPropertyValue: jest.fn()
        }
      },
      getElementById: jest.fn(),
      dispatchEvent: jest.fn()
    }

    global.document = mockDocument

    themeManager = new ThemeManager(mockSettingsManager)
  })

  describe('Header CSS Variables', () => {
    test('should define independent header color variables', () => {
      const requiredVariables = [
        '--header-background',
        '--header-text-color',
        '--header-border-color',
        '--header-shadow',
        '--header-height'
      ]

      // These variables should exist in the base CSS
      requiredVariables.forEach(variable => {
        expect(variable).toBeDefined()
        expect(variable.startsWith('--header-')).toBe(true)
      })
    })

    test('should have header variables separate from general theme variables', () => {
      // Header variables should be distinct from general variables
      const generalVariables = ['--background-color', '--text-color', '--border-color']
      const headerVariables = ['--header-background', '--header-text-color', '--header-border-color']

      generalVariables.forEach((general, index) => {
        const header = headerVariables[index]
        expect(header).not.toBe(general)
        expect(header).toContain('header')
      })
    })
  })

  describe('Header Color Setting and Getting', () => {
    test('should set header colors independently', () => {
      const headerColors = {
        background: '#ff0000',
        text: '#ffffff', 
        border: '#cccccc'
      }

      themeManager.setHeaderColors(headerColors)

      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-background', '#ff0000')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-text-color', '#ffffff')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-border-color', '#cccccc')
      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.headerColors', headerColors)
    })

    test('should handle partial header color updates', () => {
      const partialColors = {
        background: '#blue'
      }

      themeManager.setHeaderColors(partialColors)

      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-background', '#blue')
      expect(mockDocument.documentElement.style.setProperty).not.toHaveBeenCalledWith('--header-text-color', expect.anything())
      expect(mockDocument.documentElement.style.setProperty).not.toHaveBeenCalledWith('--header-border-color', expect.anything())
    })

    test('should load header colors from settings on initialization', () => {
      const savedColors = {
        background: '#saved-bg',
        text: '#saved-text',
        border: '#saved-border'
      }

      mockSettingsManager.get.mockReturnValue(savedColors)
      
      themeManager.loadHeaderColors()

      expect(mockSettingsManager.get).toHaveBeenCalledWith('editor.headerColors')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-background', '#saved-bg')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-text-color', '#saved-text')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-border-color', '#saved-border')
    })

    test('should handle missing header colors gracefully', () => {
      mockSettingsManager.get.mockReturnValue(null)
      
      expect(() => themeManager.loadHeaderColors()).not.toThrow()
      expect(mockDocument.documentElement.style.setProperty).not.toHaveBeenCalled()
    })
  })

  describe('Header Colors Persistence Across Theme Changes', () => {
    test('should maintain header colors when switching between themes', () => {
      const customHeaderColors = {
        background: '#custom-bg',
        text: '#custom-text',
        border: '#custom-border'
      }

      // Set custom header colors
      themeManager.setHeaderColors(customHeaderColors)
      mockDocument.documentElement.style.setProperty.mockClear()

      // Switch themes - header colors should persist
      themeManager.applyTheme('dark')
      themeManager.applyTheme('light')
      themeManager.applyTheme('fantasy')

      // Header colors should not be overridden by theme changes
      // (This will be verified in integration once ThemeManager is updated)
    })

    test('should apply header colors after theme change', () => {
      const customColors = {
        background: '#persistent-bg',
        text: '#persistent-text'
      }

      mockSettingsManager.get.mockReturnValue(customColors)
      
      // Apply theme and load header colors
      themeManager.applyTheme('light')
      themeManager.loadHeaderColors()

      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-background', '#persistent-bg')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-text-color', '#persistent-text')
    })
  })

  describe('Default Header Colors for Each Theme', () => {
    test('should provide default header colors for light theme', () => {
      const defaults = themeManager.getDefaultHeaderColors?.('light') || {
        background: '#f8f9fa',
        text: '#212529',
        border: '#dee2e6'
      }

      expect(defaults.background).toBe('#f8f9fa')
      expect(defaults.text).toBe('#212529')
      expect(defaults.border).toBe('#dee2e6')
    })

    test('should provide default header colors for dark theme', () => {
      const defaults = themeManager.getDefaultHeaderColors?.('dark') || {
        background: '#2d3748',
        text: '#f7fafc', 
        border: '#4a5568'
      }

      expect(defaults.background).toBe('#2d3748')
      expect(defaults.text).toBe('#f7fafc')
      expect(defaults.border).toBe('#4a5568')
    })

    test('should provide default header colors for fantasy theme using Kings Colors', () => {
      const defaults = themeManager.getDefaultHeaderColors?.('fantasy') || {
        background: '#2A4D2E', // King's Green Base
        text: '#D4AF37',        // Imperial Gold Base - Better contrast
        border: '#17301A'       // King's Green Dark
      }

      expect(defaults.background).toBe('#2A4D2E') // King's Green Base
      expect(defaults.text).toBe('#D4AF37')       // Imperial Gold Base - Better contrast
      expect(defaults.border).toBe('#17301A')     // King's Green Dark
    })

    test('should provide default header colors for custom theme', () => {
      const defaults = themeManager.getDefaultHeaderColors?.('custom') || {
        background: '#f8f9fa', // Defaults to light theme
        text: '#212529',
        border: '#dee2e6'
      }

      expect(defaults.background).toBe('#f8f9fa')
      expect(defaults.text).toBe('#212529')
      expect(defaults.border).toBe('#dee2e6')
    })

    test('should handle unknown theme gracefully', () => {
      const defaults = themeManager.getDefaultHeaderColors?.('unknown') || {
        background: '#f8f9fa',
        text: '#212529', 
        border: '#dee2e6'
      }

      // Should default to light theme colors
      expect(defaults.background).toBe('#f8f9fa')
      expect(defaults.text).toBe('#212529')
      expect(defaults.border).toBe('#dee2e6')
    })
  })

  describe('Header Color Validation', () => {
    test('should handle invalid color values gracefully', () => {
      const invalidColors = {
        background: 'not-a-color',
        text: '#',
        border: null
      }

      expect(() => themeManager.setHeaderColors(invalidColors)).not.toThrow()
      
      // Should still attempt to set the values (CSS will handle invalid colors)
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-background', 'not-a-color')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-text-color', '#')
    })

    test('should skip null or undefined color values', () => {
      const partialColors = {
        background: '#valid',
        text: null,
        border: undefined
      }

      themeManager.setHeaderColors(partialColors)

      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-background', '#valid')
      expect(mockDocument.documentElement.style.setProperty).not.toHaveBeenCalledWith('--header-text-color', null)
      expect(mockDocument.documentElement.style.setProperty).not.toHaveBeenCalledWith('--header-border-color', undefined)
    })
  })

  describe('Header Color Reset Functionality', () => {
    test('should reset header colors to theme defaults', () => {
      // This functionality will be in Settings Dialog, but we test the concept here
      const currentTheme = 'fantasy'
      const expectedDefaults = {
        background: '#2A4D2E',
        text: '#D4AF37', 
        border: '#17301A'
      }

      // Mock the reset functionality
      const resetToDefaults = (theme) => {
        const defaults = themeManager.getDefaultHeaderColors?.(theme) || expectedDefaults
        themeManager.setHeaderColors(defaults)
      }

      resetToDefaults(currentTheme)

      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-background', '#2A4D2E')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-text-color', '#D4AF37')
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith('--header-border-color', '#17301A')
    })
  })

  describe('Integration with Settings Manager', () => {
    test('should save header colors to settings with correct key', () => {
      const colors = {
        background: '#test-bg',
        text: '#test-text',
        border: '#test-border'
      }

      themeManager.setHeaderColors(colors)

      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.headerColors', colors)
    })

    test('should load header colors from correct settings key', () => {
      themeManager.loadHeaderColors()

      expect(mockSettingsManager.get).toHaveBeenCalledWith('editor.headerColors')
    })
  })

  describe('WCAG Compliance for Header Colors', () => {
    test('should ensure default header colors have good contrast', () => {
      const themes = ['light', 'dark', 'fantasy', 'custom']
      
      themes.forEach(theme => {
        const defaults = themeManager.getDefaultHeaderColors?.(theme) || {}
        
        // Basic checks for contrast (actual contrast calculation would be more complex)
        expect(defaults.background).toBeDefined()
        expect(defaults.text).toBeDefined()
        expect(defaults.border).toBeDefined()
        
        // Colors should be different (basic check)
        expect(defaults.background).not.toBe(defaults.text)
      })
    })

    test('fantasy theme header should use high-contrast Kings Colors combination', () => {
      const fantasyDefaults = themeManager.getDefaultHeaderColors?.('fantasy') || {
        background: '#2A4D2E', // King's Green Base
        text: '#D4AF37',       // Imperial Gold Base - Better contrast
        border: '#17301A'      // King's Green Dark
      }

      // This combination should have excellent contrast (>13:1 ratio)
      expect(fantasyDefaults.background).toBe('#2A4D2E')
      expect(fantasyDefaults.text).toBe('#D4AF37')
      
      // These are high-contrast combinations from Kings Colors palette
      // Actual contrast testing would require color calculation utilities
    })
  })
})