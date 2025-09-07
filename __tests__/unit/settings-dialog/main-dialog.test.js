/**
 * Settings Dialog Main Component Tests
 * Testing the complete settings dialog functionality with integration
 */

// Mock the problematic privacy tab first
jest.mock('../../../src/components/dialogs/settings-dialog/tabs/privacy-tab.js', () => ({
  PrivacyTab: jest.fn(() => ({
    render: jest.fn().mockReturnValue('<div>Privacy Tab Content</div>'),
    attachEventListeners: jest.fn(),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    destroy: jest.fn()
  }))
}))

import { SettingsDialog } from '../../../src/components/dialogs/settings-dialog.js'

// Mock dependencies
jest.mock('../../../src/components/dialogs/settings-dialog/tabs/editor-tab.js', () => ({
  EditorTab: jest.fn(() => ({
    render: jest.fn().mockReturnValue('<div>Editor Tab Content</div>'),
    attachEventListeners: jest.fn(),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    destroy: jest.fn()
  }))
}))

jest.mock('../../../src/components/dialogs/settings-dialog/tabs/themes-tab.js', () => ({
  ThemesTab: jest.fn(() => ({
    render: jest.fn().mockReturnValue('<div>Themes Tab Content</div>'),
    attachEventListeners: jest.fn(),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    destroy: jest.fn()
  }))
}))

jest.mock('../../../src/components/dialogs/settings-dialog/tabs/codemirror-tab.js', () => ({
  CodeMirrorTab: jest.fn(() => ({
    render: jest.fn().mockReturnValue('<div>CodeMirror Tab Content</div>'),
    attachEventListeners: jest.fn(),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    destroy: jest.fn()
  }))
}))

jest.mock('../../../src/components/dialogs/settings-dialog/tabs/git-integration-tab.js', () => ({
  GitIntegrationTab: jest.fn(() => ({
    render: jest.fn().mockReturnValue('<div>Git Integration Tab Content</div>'),
    attachEventListeners: jest.fn(),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    destroy: jest.fn()
  }))
}))

jest.mock('../../../src/components/dialogs/settings-dialog/tabs/privacy-tab.js', () => ({
  PrivacyTab: jest.fn(() => ({
    render: jest.fn().mockReturnValue('<div>Privacy Tab Content</div>'),
    attachEventListeners: jest.fn(),
    validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    destroy: jest.fn()
  }))
}))

jest.mock('../../../src/components/dialogs/settings-dialog/components/skeleton-loader.js', () => ({
  SkeletonLoader: {
    loadTabContent: jest.fn().mockResolvedValue('<div>Loaded Content</div>')
  }
}))

// Mock DOM globals
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0))
Object.defineProperty(document.body, 'classList', {
  value: {
    add: jest.fn(),
    remove: jest.fn()
  },
  writable: true
})

describe('SettingsDialog Main Component', () => {
  let mockSettingsManager
  let dialog

  beforeEach(() => {
    const mockSettings = {}
    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue(mockSettings),
      getAllSettings: jest.fn().mockReturnValue(mockSettings),
      saveSettings: jest.fn().mockResolvedValue(),
      resetToDefaults: jest.fn().mockReturnValue(mockSettings),
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
    
    dialog = new SettingsDialog(mockSettingsManager)
    
    // Mock DOM methods
    document.body.appendChild = jest.fn()
    document.body.removeChild = jest.fn()
    document.createElement = jest.fn().mockReturnValue({
      classList: { add: jest.fn(), remove: jest.fn() },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
      querySelector: jest.fn().mockReturnValue(null),
      querySelectorAll: jest.fn().mockReturnValue([]),
      remove: jest.fn(),
      innerHTML: '',
      appendChild: jest.fn()
    })
  })

  afterEach(() => {
    if (dialog.element) {
      dialog.hide()
    }
    jest.clearAllMocks()
  })

  describe('Constructor and Initialization', () => {
    test('initializes with correct default values', () => {
      expect(dialog.settingsManager).toBe(mockSettingsManager)
      expect(dialog.isOpen).toBe(false)
      expect(dialog.currentTab).toBe('editor')
      expect(dialog.searchQuery).toBe('')
      expect(dialog.hasChanges).toBe(false)
    })

    test('initializes all tab components', () => {
      expect(dialog.editorTab).toBeDefined()
      expect(dialog.themesTab).toBeDefined()
      expect(dialog.codeMirrorTab).toBeDefined()
      expect(dialog.gitIntegrationTab).toBeDefined()
      expect(dialog.privacyTab).toBeDefined()
    })

    test('sets up bound event handlers', () => {
      expect(dialog.boundHandleSearch).toBeInstanceOf(Function)
      expect(dialog.boundHandleSearchKeydown).toBeInstanceOf(Function)
    })
  })

  describe('Dialog Show/Hide Functionality', () => {
    test('show method creates and displays dialog', () => {
      const callback = jest.fn()
      
      dialog.show(callback)
      
      expect(dialog.isOpen).toBe(true)
      expect(dialog.onClose).toBe(callback)
      expect(dialog.element).toBeDefined()
      expect(document.body.appendChild).toHaveBeenCalled()
      expect(document.body.classList.add).toHaveBeenCalledWith('dialog-open')
    })

    test('hide method removes dialog and cleans up', () => {
      dialog.show()
      const mockElement = { remove: jest.fn() }
      dialog.element = mockElement
      
      dialog.hide()
      
      expect(dialog.isOpen).toBe(false)
      expect(dialog.element).toBeNull()
      expect(mockElement.remove).toHaveBeenCalled()
      expect(document.body.classList.remove).toHaveBeenCalledWith('dialog-open')
    })

    test('hide method calls onClose callback', () => {
      const callback = jest.fn()
      dialog.show(callback)
      
      dialog.hide()
      
      expect(callback).toHaveBeenCalled()
    })

    test('hide method does not call callback if already closed', () => {
      const callback = jest.fn()
      dialog.onClose = callback
      dialog.isOpen = false
      
      dialog.hide()
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Tab Management', () => {
    beforeEach(() => {
      dialog.show()
      // Mock querySelector to return mock elements
      dialog.element = {
        querySelector: jest.fn().mockReturnValue({
          innerHTML: '',
          classList: { add: jest.fn(), remove: jest.fn() },
          querySelectorAll: jest.fn().mockReturnValue([])
        }),
        querySelectorAll: jest.fn().mockReturnValue([]),
        addEventListener: jest.fn(),
        remove: jest.fn()
      }
    })

    test('getCurrentTab returns current tab', () => {
      expect(dialog.getCurrentTab()).toBe('editor')
      
      dialog.currentTab = 'themes'
      expect(dialog.getCurrentTab()).toBe('themes')
    })

    test('switchTab changes current tab and loads content', async () => {
      const { SkeletonLoader } = require('../../../src/components/dialogs/settings-dialog/components/skeleton-loader.js')
      
      await dialog.switchTab('themes')
      
      expect(dialog.currentTab).toBe('themes')
      expect(SkeletonLoader.loadTabContent).toHaveBeenCalled()
    })

    test('switchTab does nothing if already on target tab', async () => {
      const { SkeletonLoader } = require('../../../src/components/dialogs/settings-dialog/components/skeleton-loader.js')
      
      await dialog.switchTab('editor') // Already on editor
      
      expect(SkeletonLoader.loadTabContent).not.toHaveBeenCalled()
    })

    test('renderTabContentBody returns correct tab content', () => {
      const editorTab = { id: 'editor' }
      const themesTab = { id: 'themes' }
      
      expect(dialog.renderTabContentBody(editorTab)).toContain('Editor Tab Content')
      expect(dialog.renderTabContentBody(themesTab)).toContain('Themes Tab Content')
    })
  })

  describe('Search Functionality', () => {
    beforeEach(() => {
      dialog.show()
    })

    test('getSearchQuery returns current search query', () => {
      expect(dialog.getSearchQuery()).toBe('')
      
      dialog.searchQuery = 'test'
      expect(dialog.getSearchQuery()).toBe('test')
    })

    test('clearSearch resets query and updates UI', () => {
      dialog.searchQuery = 'test query'
      const mockSearchInput = {
        value: 'test query',
        focus: jest.fn()
      }
      dialog.element = {
        querySelector: jest.fn().mockReturnValue(mockSearchInput)
      }
      dialog.updateFilteredTabs = jest.fn()
      
      dialog.clearSearch()
      
      expect(dialog.searchQuery).toBe('')
      expect(mockSearchInput.value).toBe('')
      expect(mockSearchInput.focus).toHaveBeenCalled()
      expect(dialog.updateFilteredTabs).toHaveBeenCalled()
    })
  })

  describe('Settings Management', () => {
    test('updateSetting updates local settings and marks as changed', () => {
      dialog.localSettings = { editor: { theme: 'light' } }
      
      dialog.updateSetting('editor.fontSize', 14)
      
      expect(dialog.localSettings.editor.fontSize).toBe(14)
      expect(dialog.hasChanges).toBe(true)
    })

    test('saveSettings calls settings manager and closes dialog', async () => {
      dialog.localSettings = { editor: { theme: 'dark' } }
      dialog.hasChanges = true
      dialog.hide = jest.fn()
      
      await dialog.saveSettings()
      
      expect(mockSettingsManager.saveSettings).toHaveBeenCalledWith({ editor: { theme: 'dark' } })
      expect(dialog.hide).toHaveBeenCalled()
    })

    test('resetSettings resets to defaults and updates UI', () => {
      dialog.localSettings = { editor: { theme: 'dark' } }
      dialog.hasChanges = true
      dialog.refreshTabContent = jest.fn()
      
      dialog.resetSettings()
      
      expect(mockSettingsManager.resetToDefaults).toHaveBeenCalled()
      expect(dialog.hasChanges).toBe(false)
      expect(dialog.refreshTabContent).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      dialog.show()
      dialog.element = {
        querySelector: jest.fn().mockReturnValue({
          focus: jest.fn(),
          select: jest.fn(),
          value: ''
        }),
        querySelectorAll: jest.fn().mockReturnValue([
          { dataset: { tab: 'editor' }, focus: jest.fn() },
          { dataset: { tab: 'themes' }, focus: jest.fn() }
        ])
      }
    })

    test('handleKeydown closes dialog on Escape', () => {
      dialog.hide = jest.fn()
      
      const event = {
        key: 'Escape',
        preventDefault: jest.fn()
      }
      
      dialog.handleKeydown(event)
      
      expect(dialog.hide).toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalled()
    })

    test('handleKeydown focuses search on Ctrl+F', () => {
      const mockSearchInput = {
        focus: jest.fn(),
        select: jest.fn()
      }
      dialog.element.querySelector = jest.fn().mockReturnValue(mockSearchInput)
      
      const event = {
        key: 'f',
        ctrlKey: true,
        preventDefault: jest.fn()
      }
      
      dialog.handleKeydown(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockSearchInput.focus).toHaveBeenCalled()
      expect(mockSearchInput.select).toHaveBeenCalled()
    })

    test('handleTabNavigation navigates between tabs with arrow keys', () => {
      const tabs = [
        { dataset: { tab: 'editor' }, focus: jest.fn() },
        { dataset: { tab: 'themes' }, focus: jest.fn() }
      ]
      dialog.element.querySelectorAll = jest.fn().mockReturnValue(tabs)
      dialog.switchTab = jest.fn()
      
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
  })

  describe('Accessibility Features', () => {
    test('announceToScreenReader creates announcement element', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        textContent: ''
      }
      document.createElement = jest.fn().mockReturnValue(mockElement)
      document.body.appendChild = jest.fn()
      document.body.removeChild = jest.fn()
      
      dialog.announceToScreenReader('Test message', 'assertive')
      
      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive')
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true')
      expect(mockElement.textContent).toBe('Test message')
      expect(document.body.appendChild).toHaveBeenCalledWith(mockElement)
    })

    test('manageFocusAfterTabSwitch focuses first element', () => {
      const mockFirstElement = { focus: jest.fn() }
      const mockContainer = {
        querySelectorAll: jest.fn().mockReturnValue([mockFirstElement])
      }
      
      jest.useFakeTimers()
      
      dialog.manageFocusAfterTabSwitch(mockContainer)
      
      jest.advanceTimersByTime(100)
      
      expect(mockFirstElement.focus).toHaveBeenCalled()
      
      jest.useRealTimers()
    })

    test('updateAriaStates updates element aria attributes', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        removeAttribute: jest.fn()
      }
      dialog.element = {
        querySelector: jest.fn().mockReturnValue(mockElement)
      }
      dialog.validateSetting = jest.fn().mockReturnValue(false)
      dialog.announceToScreenReader = jest.fn()
      
      dialog.updateAriaStates('test.setting', 'invalid-value')
      
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-invalid', 'true')
    })
  })

  describe('Error Handling', () => {
    test('handles tab loading errors gracefully', async () => {
      const mockContainer = { innerHTML: '' }
      dialog.element = {
        querySelector: jest.fn().mockReturnValue(mockContainer)
      }
      
      // Mock an error during tab content loading
      dialog.renderTabContentBody = jest.fn().mockImplementation(() => {
        throw new Error('Render error')
      })
      
      await dialog.loadTabContentWithSkeleton('editor')
      
      expect(mockContainer.innerHTML).toContain('Error Loading Tab')
      expect(mockContainer.innerHTML).toContain('Refresh Page')
    })

    test('handles save settings errors gracefully', async () => {
      mockSettingsManager.saveSettings.mockRejectedValue(new Error('Save failed'))
      dialog.localSettings = { test: 'value' }
      
      console.error = jest.fn()
      
      await dialog.saveSettings()
      
      expect(console.error).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error))
      // Dialog should not close on error
      expect(dialog.isOpen).toBe(true)
    })
  })

  describe('Validation Integration', () => {
    test('validateSetting routes to appropriate tab validator', () => {
      expect(dialog.validateSetting('editor.theme', 'dark')).toBe(true)
      expect(dialog.editorTab.validate).toHaveBeenCalled()
      
      expect(dialog.validateSetting('codemirror.fontSize', 14)).toBe(true)
      expect(dialog.codeMirrorTab.validate).toHaveBeenCalled()
    })

    test('validateSetting defaults to true for unknown settings', () => {
      expect(dialog.validateSetting('unknown.setting', 'value')).toBe(true)
    })
  })
})