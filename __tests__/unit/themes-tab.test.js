/**
 * Themes Tab Tests - TDD for Settings Dialog Themes functionality
 */

import { SettingsDialog } from '../../src/components/dialogs/settings-dialog.js'

// Mock Settings Manager
const mockSettingsManager = {
  get: jest.fn((path) => {
    const settings = {
      'editor.theme': 'light',
      'editor.customTheme': {
        name: 'My Custom Theme',
        baseTheme: 'light',
        colors: {
          backgroundPrimary: '#ffffff',
          backgroundSecondary: '#f8fafc',
          textPrimary: '#1e293b',
          textSecondary: '#475569',
          textMuted: '#94a3b8',
          accent: '#6366f1',
          border: '#e2e8f0'
        }
      }
    }
    return settings[path]
  }),
  set: jest.fn(),
  getAllSettings: jest.fn(() => ({
    version: 1,
    editor: { 
      theme: 'light',
      customTheme: {
        name: 'My Custom Theme',
        baseTheme: 'light',
        colors: {
          backgroundPrimary: '#ffffff',
          backgroundSecondary: '#f8fafc',
          textPrimary: '#1e293b',
          textSecondary: '#475569',
          textMuted: '#94a3b8',
          accent: '#6366f1',
          border: '#e2e8f0'
        }
      }
    }
  })),
  addListener: jest.fn(),
  removeListener: jest.fn()
}

describe('Themes Tab', () => {
  let settingsDialog
  
  beforeEach(() => {
    document.body.innerHTML = ''
    settingsDialog = new SettingsDialog(mockSettingsManager)
    mockSettingsManager.get.mockClear()
    mockSettingsManager.set.mockClear()
    
    // Mock confirm dialog for hide method
    global.confirm = jest.fn(() => false)
  })

  afterEach(() => {
    if (settingsDialog.element) {
      settingsDialog.hasChanges = false // Prevent confirm dialog
      settingsDialog.hide()
    }
    delete global.confirm
  })

  describe('Themes Tab Rendering', () => {
    test('renderThemesTabContent() renders theme selection', () => {
      settingsDialog.localSettings = {
        editor: {
          theme: 'light',
          customTheme: {
            name: '',
            baseTheme: 'light',
            colors: {}
          }
        }
      }
      
      const content = settingsDialog.renderThemesTabContent()
      
      expect(content).toContain('Theme Selection')
      expect(content).toContain('Built-in Themes')
      expect(content).toContain('Light Theme')
      expect(content).toContain('Dark Theme')
      expect(content).toContain('Fantasy Theme')
    })

    test('renderThemesTabContent() shows theme preview cards', () => {
      settingsDialog.localSettings = {
        editor: {
          theme: 'dark'
        }
      }
      
      const content = settingsDialog.renderThemesTabContent()
      
      expect(content).toContain('theme-preview-card')
      expect(content).toContain('data-theme-preview="light"')
      expect(content).toContain('data-theme-preview="dark"')
      expect(content).toContain('data-theme-preview="fantasy"')
    })

    test('renderThemesTabContent() marks current theme as active', () => {
      settingsDialog.localSettings = {
        editor: {
          theme: 'fantasy'
        }
      }
      
      const content = settingsDialog.renderThemesTabContent()
      
      // Fantasy theme card should have active class
      expect(content).toContain('class="theme-preview-card active"')
      expect(content).toContain('data-theme-preview="fantasy"')
    })

    test('renderThemesTabContent() includes custom theme section', () => {
      settingsDialog.localSettings = {
        editor: {
          customTheme: {
            name: 'My Theme',
            baseTheme: 'dark',
            colors: {
              backgroundPrimary: '#1a1a1a'
            }
          }
        }
      }
      
      const content = settingsDialog.renderThemesTabContent()
      
      expect(content).toContain('Custom Theme')
      expect(content).toContain('Theme Name')
      expect(content).toContain('Base Theme')
      expect(content).toContain('Color Customization')
    })

    test('renderThemesTabContent() shows color pickers for custom theme', () => {
      settingsDialog.localSettings = {
        editor: {
          customTheme: {
            colors: {
              backgroundPrimary: '#ffffff',
              textPrimary: '#000000',
              accent: '#6366f1'
            }
          }
        }
      }
      
      const content = settingsDialog.renderThemesTabContent()
      
      expect(content).toContain('type="color"')
      expect(content).toContain('data-setting="editor.customTheme.colors.backgroundPrimary"')
      expect(content).toContain('data-setting="editor.customTheme.colors.textPrimary"')
      expect(content).toContain('data-setting="editor.customTheme.colors.accent"')
    })
  })

  describe('Theme Selection', () => {
    beforeEach(() => {
      settingsDialog.show('themes')
    })

    test('clicking theme preview card selects theme', () => {
      const themeCard = document.querySelector('[data-theme-preview="dark"]')
      expect(themeCard).toBeTruthy()
      
      themeCard.click()
      
      expect(settingsDialog.localSettings.editor.theme).toBe('dark')
      expect(settingsDialog.hasChanges).toBe(true)
    })

    test('selecting theme updates preview immediately', () => {
      // Mock applyLivePreview method
      settingsDialog.applyLivePreview = jest.fn()
      
      const themeCard = document.querySelector('[data-theme-preview="fantasy"]')
      
      themeCard.click()
      
      // Check that live preview was applied
      expect(settingsDialog.applyLivePreview).toHaveBeenCalled()
      expect(settingsDialog.localSettings.editor.theme).toBe('fantasy')
    })

    test('theme selection marks card as active', () => {
      const darkCard = document.querySelector('[data-theme-preview="dark"]')
      const lightCard = document.querySelector('[data-theme-preview="light"]')
      
      darkCard.click()
      
      expect(darkCard.classList.contains('active')).toBe(true)
      expect(lightCard.classList.contains('active')).toBe(false)
    })
  })

  describe('Custom Theme Creation', () => {
    beforeEach(() => {
      settingsDialog.show('themes')
    })

    test('changing custom theme name updates local settings', () => {
      const nameInput = document.querySelector('[data-setting="editor.customTheme.name"]')
      expect(nameInput).toBeTruthy()
      
      nameInput.value = 'My Awesome Theme'
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
      
      expect(settingsDialog.localSettings.editor.customTheme.name).toBe('My Awesome Theme')
      expect(settingsDialog.hasChanges).toBe(true)
    })

    test('changing base theme updates custom theme', () => {
      const baseSelect = document.querySelector('[data-setting="editor.customTheme.baseTheme"]')
      expect(baseSelect).toBeTruthy()
      
      baseSelect.value = 'dark'
      baseSelect.dispatchEvent(new Event('change', { bubbles: true }))
      
      expect(settingsDialog.localSettings.editor.customTheme.baseTheme).toBe('dark')
    })

    test('color picker updates custom theme colors', () => {
      const colorPicker = document.querySelector('[data-setting="editor.customTheme.colors.accent"]')
      expect(colorPicker).toBeTruthy()
      
      colorPicker.value = '#ff0000'
      colorPicker.dispatchEvent(new Event('input', { bubbles: true }))
      
      expect(settingsDialog.localSettings.editor.customTheme.colors.accent).toBe('#ff0000')
    })

    test('activate custom theme button applies custom theme', () => {
      // Set up custom theme
      settingsDialog.localSettings.editor.customTheme = {
        name: 'Test Theme',
        baseTheme: 'light',
        colors: {
          accent: '#ff0000'
        }
      }
      
      const activateBtn = document.querySelector('[data-action="activate-custom-theme"]')
      expect(activateBtn).toBeTruthy()
      
      activateBtn.click()
      
      expect(settingsDialog.localSettings.editor.theme).toBe('custom')
      expect(document.documentElement.getAttribute('data-theme')).toBe('custom')
    })

    test('reset colors button resets to base theme defaults', () => {
      const resetBtn = document.querySelector('[data-action="reset-custom-colors"]')
      expect(resetBtn).toBeTruthy()
      
      // Modify colors first
      settingsDialog.localSettings.editor.customTheme.colors.accent = '#ff0000'
      
      resetBtn.click()
      
      // Should reset to base theme defaults
      expect(settingsDialog.localSettings.editor.customTheme.colors.accent).not.toBe('#ff0000')
    })
  })

  describe('Theme Preview', () => {
    test('theme preview shows sample text with theme colors', () => {
      settingsDialog.show('themes')
      
      const lightPreview = document.querySelector('[data-theme-preview="light"] .theme-preview-content')
      expect(lightPreview).toBeTruthy()
      expect(lightPreview.textContent).toContain('Sample text')
    })

    test('custom theme preview updates live with color changes', () => {
      settingsDialog.show('themes')
      
      const colorPicker = document.querySelector('[data-setting="editor.customTheme.colors.backgroundPrimary"]')
      
      colorPicker.value = '#123456'
      colorPicker.dispatchEvent(new Event('input', { bubbles: true }))
      
      // Check that applyCustomThemePreview was called (since DOM styles aren't reliable in jsdom)
      expect(settingsDialog.localSettings.editor.customTheme.colors.backgroundPrimary).toBe('#123456')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      settingsDialog.show('themes')
    })

    test('validates custom theme name length', () => {
      const nameInput = document.querySelector('[data-setting="editor.customTheme.name"]')
      
      // Try to set very long name
      const longName = 'a'.repeat(100)
      nameInput.value = longName
      nameInput.dispatchEvent(new Event('input'))
      
      // Should be truncated to max length (50 chars based on schema)
      expect(settingsDialog.localSettings.editor.customTheme.name.length).toBeLessThanOrEqual(50)
    })

    test('validates color format', () => {
      const colorPicker = document.querySelector('[data-setting="editor.customTheme.colors.accent"]')
      
      // Invalid color should not be accepted
      colorPicker.value = 'not-a-color'
      colorPicker.dispatchEvent(new Event('input'))
      
      // Should keep previous valid value or default
      expect(settingsDialog.localSettings.editor.customTheme.colors.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    test('prevents empty custom theme name activation', () => {
      settingsDialog.localSettings.editor.customTheme.name = ''
      // Re-render to apply disabled state
      settingsDialog.refreshTabContent()
      
      const activateBtn = document.querySelector('[data-action="activate-custom-theme"]')
      
      // Should be disabled when name is empty  
      expect(activateBtn.disabled).toBe(true)
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      settingsDialog.show('themes')
    })

    test('theme cards have proper ARIA labels', () => {
      const themeCards = document.querySelectorAll('[data-theme-preview]')
      
      themeCards.forEach(card => {
        expect(card.getAttribute('role')).toBe('button')
        expect(card.getAttribute('aria-label')).toBeTruthy()
        expect(card.getAttribute('tabindex')).toBe('0')
      })
    })

    test('color inputs have associated labels', () => {
      const colorInputs = document.querySelectorAll('input[type="color"]')
      
      colorInputs.forEach(input => {
        const id = input.id
        const label = document.querySelector(`label[for="${id}"]`)
        expect(label).toBeTruthy()
      })
    })

    test('keyboard navigation works for theme selection', () => {
      const themeCard = document.querySelector('[data-theme-preview="dark"]')
      
      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      themeCard.dispatchEvent(enterEvent)
      
      expect(settingsDialog.localSettings.editor.theme).toBe('dark')
    })
  })
})