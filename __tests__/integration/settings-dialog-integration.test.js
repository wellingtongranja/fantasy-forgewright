/**
 * Settings Dialog Integration Tests
 * Testing complete user workflows and component interactions
 */

// Mock the problematic privacy tab first
jest.mock('../../src/components/dialogs/settings-dialog/tabs/privacy-tab.js', () => ({
  PrivacyTab: jest.fn(() => ({
    render: jest.fn().mockReturnValue('<div>Privacy Tab Content</div>'),
    attachEventListeners: jest.fn(),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    destroy: jest.fn()
  }))
}))

import { SettingsDialog } from '../../src/components/dialogs/settings-dialog.js'

// Mock window globals
global.window = {
  app: {
    authManager: {
      isAuthenticated: jest.fn().mockReturnValue(false),
      getCurrentUser: jest.fn().mockReturnValue(null),
      getCurrentRepository: jest.fn().mockReturnValue(null),
      makeAuthenticatedRequest: jest.fn().mockResolvedValue({})
    },
    commandBar: {
      executeCommand: jest.fn()
    },
    devHelpers: {
      cleanStorage: jest.fn().mockResolvedValue(),
      resetSettings: jest.fn().mockResolvedValue(),
      clearDocuments: jest.fn().mockResolvedValue(),
      showStorageInfo: jest.fn().mockResolvedValue()
    }
  }
}

global.import = {
  meta: {
    env: {
      VITE_APP_VERSION: '0.0.2-alpha',
      VITE_BUILD_DATE: '2025-01-15',
      MODE: 'test'
    }
  }
}

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockReturnValue({
    classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    focus: jest.fn(),
    click: jest.fn(),
    textContent: '',
    innerHTML: '',
    style: {},
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    dataset: {},
    value: '',
    checked: false,
    disabled: false
  }),
  writable: true
})

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    classList: { add: jest.fn(), remove: jest.fn() }
  },
  writable: true
})

describe('Settings Dialog Integration Tests', () => {
  let mockSettingsManager
  let dialog

  beforeEach(() => {
    const mockSettings = {
      editor: { theme: 'light', width: 65, zoom: 1.0 },
      themes: { selectedTheme: 'light' },
      codemirror: { fontSize: 14, lineNumbers: true },
      gitIntegration: { provider: 'github', autoSync: false },
      privacy: { analytics: false, dataSaving: true }
    }
    
    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue(mockSettings),
      getAllSettings: jest.fn().mockReturnValue(mockSettings),
      saveSettings: jest.fn().mockResolvedValue(),
      resetToDefaults: jest.fn().mockReturnValue(mockSettings),
      addListener: jest.fn(),
      removeListener: jest.fn()
    }

    dialog = new SettingsDialog(mockSettingsManager)
    
    // Mock successful DOM queries
    const mockElement = {
      querySelector: jest.fn().mockReturnValue({
        innerHTML: '',
        value: '',
        focus: jest.fn(),
        select: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
        addEventListener: jest.fn(),
        querySelectorAll: jest.fn().mockReturnValue([]),
        dataset: {}
      }),
      querySelectorAll: jest.fn().mockReturnValue([]),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      remove: jest.fn(),
      classList: { add: jest.fn(), remove: jest.fn() },
      innerHTML: '',
      appendChild: jest.fn()
    }
    
    dialog.element = mockElement
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete User Workflows', () => {
    test('user opens settings, changes theme, and saves', async () => {
      // User opens settings
      dialog.show()
      expect(dialog.isOpen).toBe(true)
      expect(dialog.currentTab).toBe('editor')
      
      // User switches to themes tab
      await dialog.switchTab('themes')
      expect(dialog.currentTab).toBe('themes')
      
      // User changes theme setting
      dialog.updateSetting('themes.selectedTheme', 'dark')
      expect(dialog.localSettings.themes.selectedTheme).toBe('dark')
      expect(dialog.hasChanges).toBe(true)
      
      // User saves settings
      await dialog.saveSettings()
      expect(mockSettingsManager.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          themes: expect.objectContaining({ selectedTheme: 'dark' })
        })
      )
    })

    test('user searches for settings and finds matches', () => {
      dialog.show()
      
      // Mock search functionality
      dialog.getVisibleTabs = jest.fn().mockReturnValue([
        { id: 'themes', name: '🎨 Themes', keywords: ['theme', 'color', 'appearance'] }
      ])
      dialog.updateFilteredTabs = jest.fn()
      
      // User types in search
      dialog.searchQuery = 'theme'
      dialog.handleSearch({ target: { value: 'theme' } })
      
      expect(dialog.searchQuery).toBe('theme')
      expect(dialog.updateFilteredTabs).toHaveBeenCalled()
    })

    test('user navigates tabs with keyboard', async () => {
      dialog.show()
      
      // Mock tab elements
      const tabs = [
        { dataset: { tab: 'editor' }, focus: jest.fn() },
        { dataset: { tab: 'themes' }, focus: jest.fn() },
        { dataset: { tab: 'codemirror' }, focus: jest.fn() }
      ]
      
      dialog.element.querySelectorAll = jest.fn().mockReturnValue(tabs)
      dialog.switchTab = jest.fn()
      
      // User presses arrow right from editor tab
      const event = {
        key: 'ArrowRight',
        target: { closest: jest.fn().mockReturnValue(tabs[0]) },
        preventDefault: jest.fn()
      }
      
      dialog.handleTabNavigation(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(tabs[1].focus).toHaveBeenCalled()
      expect(dialog.switchTab).toHaveBeenCalledWith('themes')
    })

    test('user resets settings to defaults', () => {
      dialog.show()
      dialog.localSettings = { 
        editor: { theme: 'custom', width: 120 },
        modified: true
      }
      dialog.hasChanges = true
      dialog.refreshTabContent = jest.fn()
      
      // User clicks reset
      dialog.resetSettings()
      
      expect(mockSettingsManager.resetToDefaults).toHaveBeenCalled()
      expect(dialog.hasChanges).toBe(false)
      expect(dialog.refreshTabContent).toHaveBeenCalled()
    })
  })

  describe('Tab-Specific Workflows', () => {
    test('editor tab workflow - change width and zoom', async () => {
      dialog.show()
      await dialog.switchTab('editor')
      
      // Change editor width
      dialog.updateSetting('editor.width', 80)
      expect(dialog.localSettings.editor.width).toBe(80)
      
      // Change zoom level
      dialog.updateSetting('editor.zoom', 1.2)
      expect(dialog.localSettings.editor.zoom).toBe(1.2)
      
      expect(dialog.hasChanges).toBe(true)
    })

    test('codemirror tab workflow - configure editor features', async () => {
      dialog.show()
      await dialog.switchTab('codemirror')
      
      // Enable line numbers
      dialog.updateSetting('codemirror.lineNumbers', true)
      expect(dialog.localSettings.codemirror.lineNumbers).toBe(true)
      
      // Change font size
      dialog.updateSetting('codemirror.fontSize', 16)
      expect(dialog.localSettings.codemirror.fontSize).toBe(16)
      
      // Change font family
      dialog.updateSetting('codemirror.fontFamily', 'Monaco, monospace')
      expect(dialog.localSettings.codemirror.fontFamily).toBe('Monaco, monospace')
    })

    test('git integration tab workflow - configure sync settings', async () => {
      dialog.show()
      await dialog.switchTab('git-integration')
      
      // Enable auto-sync
      dialog.updateSetting('gitIntegration.autoSync', true)
      expect(dialog.localSettings.gitIntegration.autoSync).toBe(true)
      
      // Set sync frequency
      dialog.updateSetting('gitIntegration.syncFrequency', 60000)
      expect(dialog.localSettings.gitIntegration.syncFrequency).toBe(60000)
      
      // Enable sync on save
      dialog.updateSetting('gitIntegration.syncOnSave', true)
      expect(dialog.localSettings.gitIntegration.syncOnSave).toBe(true)
    })

    test('privacy tab workflow - manage data and export settings', async () => {
      dialog.show()
      await dialog.switchTab('privacy')
      
      // Disable analytics
      dialog.updateSetting('privacy.analytics', false)
      expect(dialog.localSettings.privacy.analytics).toBe(false)
      
      // Enable crash reporting
      dialog.updateSetting('privacy.crashReporting', true)
      expect(dialog.localSettings.privacy.crashReporting).toBe(true)
    })
  })

  describe('Error Handling Workflows', () => {
    test('handles save operation failure gracefully', async () => {
      mockSettingsManager.saveSettings.mockRejectedValue(new Error('Network error'))
      
      dialog.show()
      dialog.updateSetting('editor.theme', 'dark')
      
      console.error = jest.fn()
      
      await dialog.saveSettings()
      
      expect(console.error).toHaveBeenCalledWith(
        'Failed to save settings:',
        expect.any(Error)
      )
      // Dialog should remain open for user to retry
      expect(dialog.isOpen).toBe(true)
    })

    test('handles tab loading failure with error state', async () => {
      dialog.show()
      
      // Mock tab content container
      const mockContainer = { innerHTML: '' }
      dialog.element.querySelector = jest.fn().mockReturnValue(mockContainer)
      
      // Mock render failure
      dialog.renderTabContentBody = jest.fn().mockImplementation(() => {
        throw new Error('Component render error')
      })
      
      await dialog.loadTabContentWithSkeleton('themes')
      
      expect(mockContainer.innerHTML).toContain('Error Loading Tab')
      expect(mockContainer.innerHTML).toContain('Failed to load themes settings')
    })

    test('handles git integration actions with missing command bar', async () => {
      // Remove command bar from global
      window.app.commandBar = null
      
      dialog.show()
      await dialog.switchTab('git-integration')
      
      // Should handle git actions gracefully even without command bar
      expect(() => {
        dialog.gitIntegrationTab.handleGitAction('git-login')
      }).not.toThrow()
    })
  })

  describe('Accessibility Workflows', () => {
    test('screen reader announcements work correctly', () => {
      dialog.show()
      
      const mockElement = document.createElement('div')
      document.body.appendChild = jest.fn()
      document.body.removeChild = jest.fn()
      
      jest.useFakeTimers()
      
      dialog.announceToScreenReader('Settings changed', 'polite')
      
      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(document.body.appendChild).toHaveBeenCalled()
      
      jest.advanceTimersByTime(1000)
      expect(document.body.removeChild).toHaveBeenCalled()
      
      jest.useRealTimers()
    })

    test('aria states update correctly during validation', () => {
      dialog.show()
      
      const mockSettingElement = {
        setAttribute: jest.fn(),
        removeAttribute: jest.fn()
      }
      dialog.element.querySelector = jest.fn().mockReturnValue(mockSettingElement)
      
      // Mock validation failure
      dialog.validateSetting = jest.fn().mockReturnValue(false)
      
      dialog.updateAriaStates('codemirror.fontSize', 'invalid')
      
      expect(mockSettingElement.setAttribute).toHaveBeenCalledWith('aria-invalid', 'true')
    })

    test('focus management after tab switch', () => {
      dialog.show()
      
      const mockFocusElement = { focus: jest.fn() }
      const mockContainer = {
        querySelectorAll: jest.fn().mockReturnValue([mockFocusElement])
      }
      
      jest.useFakeTimers()
      
      dialog.manageFocusAfterTabSwitch(mockContainer)
      
      jest.advanceTimersByTime(100)
      
      expect(mockFocusElement.focus).toHaveBeenCalled()
      
      jest.useRealTimers()
    })
  })

  describe('Performance and Memory Management', () => {
    test('properly cleans up event listeners on hide', () => {
      dialog.show()
      
      // Mock tab components with destroy methods
      dialog.editorTab.destroy = jest.fn()
      dialog.themesTab.destroy = jest.fn()
      dialog.codeMirrorTab.destroy = jest.fn()
      dialog.gitIntegrationTab.destroy = jest.fn()
      dialog.privacyTab.destroy = jest.fn()
      
      dialog.hide()
      
      expect(dialog.editorTab.destroy).toHaveBeenCalled()
      expect(dialog.themesTab.destroy).toHaveBeenCalled()
      expect(dialog.codeMirrorTab.destroy).toHaveBeenCalled()
      expect(dialog.gitIntegrationTab.destroy).toHaveBeenCalled()
      expect(dialog.privacyTab.destroy).toHaveBeenCalled()
    })

    test('handles rapid tab switching without memory leaks', async () => {
      dialog.show()
      
      // Rapidly switch between tabs
      await dialog.switchTab('themes')
      await dialog.switchTab('codemirror')
      await dialog.switchTab('git-integration')
      await dialog.switchTab('privacy')
      await dialog.switchTab('editor')
      
      // Should not cause memory leaks or errors
      expect(dialog.currentTab).toBe('editor')
    })
  })

  describe('Data Integrity', () => {
    test('preserves nested settings structure', () => {
      dialog.show()
      
      // Set up complex nested settings
      dialog.localSettings = {
        editor: { theme: 'light', zoom: 1.0 },
        themes: { 
          custom: { 
            colors: { primary: '#000', secondary: '#fff' } 
          } 
        }
      }
      
      // Update nested setting
      dialog.updateSetting('themes.custom.colors.primary', '#333')
      
      expect(dialog.localSettings.themes.custom.colors.primary).toBe('#333')
      expect(dialog.localSettings.themes.custom.colors.secondary).toBe('#fff')
      expect(dialog.localSettings.editor.theme).toBe('light')
    })

    test('validates settings before saving', () => {
      dialog.show()
      
      // Mock validation methods
      dialog.editorTab.validate = jest.fn().mockReturnValue({ isValid: false, errors: ['Invalid theme'] })
      
      dialog.updateSetting('editor.theme', 'invalid-theme')
      
      expect(dialog.validateSetting('editor.theme', 'invalid-theme')).toBe(false)
    })
  })
})