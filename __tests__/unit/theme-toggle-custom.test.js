/**
 * @jest-environment jsdom
 */

import { ThemeManager } from '../../src/core/themes/theme-manager.js'
import { SettingsManager } from '../../src/core/settings/settings-manager.js'

// Mock getThemeExtension function
jest.mock('../../src/core/themes/codemirror-themes.js', () => ({
  getThemeExtension: jest.fn(() => [])
}))

describe('Theme Toggle from Custom Theme', () => {
  let themeManager
  let settingsManager

  beforeEach(() => {
    // Setup DOM
    document.documentElement.innerHTML = ''
    document.documentElement.removeAttribute('data-theme')
    
    // Clear any inline styles
    document.documentElement.style.cssText = ''
    
    // Create settings manager and theme manager
    settingsManager = new SettingsManager()
    themeManager = new ThemeManager(settingsManager)
  })

  afterEach(() => {
    // Clean up
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.cssText = ''
  })

  test('should clear custom theme styles when toggling to light theme', () => {
    // Apply custom theme first
    settingsManager.set('editor.theme', 'custom')
    settingsManager.set('editor.customTheme', {
      baseTheme: 'light',
      colors: {
        backgroundPrimary: '#ff0000',
        textPrimary: '#00ff00',
        accent: '#0000ff'
      }
    })
    
    themeManager.applyThemeOnly('custom')
    
    // Verify custom styles were applied
    const docStyle = document.documentElement.style
    expect(docStyle.getPropertyValue('--background-color')).toBe('#ff0000')
    expect(docStyle.getPropertyValue('--color-bg')).toBe('#ff0000')
    expect(docStyle.getPropertyValue('--text-color')).toBe('#00ff00')
    expect(docStyle.getPropertyValue('--accent-color')).toBe('#0000ff')
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom')
    
    // Toggle to light theme
    themeManager.applyThemeOnly('light')
    
    // Verify custom styles were cleared
    expect(docStyle.getPropertyValue('--background-color')).toBe('')
    expect(docStyle.getPropertyValue('--color-bg')).toBe('')
    expect(docStyle.getPropertyValue('--text-color')).toBe('')
    expect(docStyle.getPropertyValue('--accent-color')).toBe('')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('should clear custom theme styles when toggling to dark theme', () => {
    // Apply custom theme first
    settingsManager.set('editor.theme', 'custom')
    settingsManager.set('editor.customTheme', {
      baseTheme: 'dark',
      colors: {
        backgroundPrimary: '#111111',
        textPrimary: '#ffffff',
        accent: '#ff6600'
      }
    })
    
    themeManager.applyThemeOnly('custom')
    
    // Verify custom styles were applied
    const docStyle = document.documentElement.style
    expect(docStyle.getPropertyValue('--background-color')).toBe('#111111')
    expect(docStyle.getPropertyValue('--text-color')).toBe('#ffffff')
    expect(docStyle.getPropertyValue('--accent-color')).toBe('#ff6600')
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom')
    
    // Toggle to dark theme
    themeManager.applyThemeOnly('dark')
    
    // Verify custom styles were cleared
    expect(docStyle.getPropertyValue('--background-color')).toBe('')
    expect(docStyle.getPropertyValue('--text-color')).toBe('')
    expect(docStyle.getPropertyValue('--accent-color')).toBe('')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('should reapply custom theme when switching back to custom', () => {
    // Set up custom theme
    settingsManager.set('editor.customTheme', {
      baseTheme: 'light',
      colors: {
        backgroundPrimary: '#f0f0f0',
        accent: '#cc0000'
      }
    })
    
    // Apply light theme first
    themeManager.applyThemeOnly('light')
    expect(document.documentElement.style.getPropertyValue('--background-color')).toBe('')
    
    // Apply custom theme
    themeManager.applyThemeOnly('custom')
    
    // Verify custom styles were applied
    const docStyle = document.documentElement.style
    expect(docStyle.getPropertyValue('--background-color')).toBe('#f0f0f0')
    expect(docStyle.getPropertyValue('--accent-color')).toBe('#cc0000')
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom')
  })

  test('should clear all custom theme variables from clearCustomTheme method', () => {
    // Manually set some custom theme variables
    const docStyle = document.documentElement.style
    docStyle.setProperty('--background-color', '#test1')
    docStyle.setProperty('--color-bg', '#test2')
    docStyle.setProperty('--color-primary', '#test3')
    docStyle.setProperty('--color-border-rgb', '255, 0, 0')
    docStyle.setProperty('--surface-hover', '#test4')
    
    // Verify they were set
    expect(docStyle.getPropertyValue('--background-color')).toBe('#test1')
    expect(docStyle.getPropertyValue('--color-bg')).toBe('#test2')
    expect(docStyle.getPropertyValue('--color-primary')).toBe('#test3')
    expect(docStyle.getPropertyValue('--color-border-rgb')).toBe('255, 0, 0')
    expect(docStyle.getPropertyValue('--surface-hover')).toBe('#test4')
    
    // Clear custom theme
    themeManager.clearCustomTheme()
    
    // Verify they were cleared
    expect(docStyle.getPropertyValue('--background-color')).toBe('')
    expect(docStyle.getPropertyValue('--color-bg')).toBe('')
    expect(docStyle.getPropertyValue('--color-primary')).toBe('')
    expect(docStyle.getPropertyValue('--color-border-rgb')).toBe('')
    expect(docStyle.getPropertyValue('--surface-hover')).toBe('')
  })
})