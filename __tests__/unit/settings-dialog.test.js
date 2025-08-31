/**
 * SettingsDialog Unit Tests
 * Testing dialog functionality, navigation, and accessibility
 */

import { SettingsDialog } from '../../src/components/dialogs/settings-dialog.js'

// Mock SettingsManager
const mockSettingsManager = {
  get: jest.fn(),
  set: jest.fn(),
  getAllSettings: jest.fn(() => ({
    version: 1,
    editor: { theme: 'light', width: 65 },
    codemirror: { lineNumbers: false },
    ui: { navigatorPinned: false },
    gitIntegration: { provider: 'github' },
    privacy: { analyticsEnabled: false }
  })),
  resetToDefaults: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn()
}

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    className: '',
    innerHTML: '',
    addEventListener: jest.fn(),
    remove: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    closest: jest.fn(() => null),
    dataset: {}
  }))
})

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  }
})

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true)
})

describe('SettingsDialog', () => {
  let settingsDialog
  let mockOnClose
  let mockOnSave

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock confirm dialog
    global.confirm = jest.fn(() => false)
    
    settingsDialog = new SettingsDialog(mockSettingsManager)
    mockOnClose = jest.fn()
    mockOnSave = jest.fn()
  })

  afterEach(() => {
    delete global.confirm
  })

  describe('Constructor and Initial State', () => {
    test('initializes with correct default state', () => {
      expect(settingsDialog.isOpen).toBe(false)
      expect(settingsDialog.element).toBeNull()
      expect(settingsDialog.currentTab).toBe('editor')
      expect(settingsDialog.searchQuery).toBe('')
      expect(settingsDialog.hasChanges).toBe(false)
    })

    test('stores reference to settings manager', () => {
      expect(settingsDialog.settingsManager).toBe(mockSettingsManager)
    })

    test('has correct tab configuration', () => {
      expect(settingsDialog.tabs).toHaveLength(5)
      
      const tabIds = settingsDialog.tabs.map(t => t.id)
      expect(tabIds).toEqual(['editor', 'themes', 'codemirror', 'git-integration', 'privacy'])
      
      // Check each tab has required properties
      settingsDialog.tabs.forEach(tab => {
        expect(tab).toHaveProperty('id')
        expect(tab).toHaveProperty('name')
        expect(tab).toHaveProperty('label')
        expect(tab).toHaveProperty('keywords')
        expect(Array.isArray(tab.keywords)).toBe(true)
      })
    })
  })

  describe('Dialog Lifecycle', () => {
    test('show() opens dialog with correct state', () => {
      settingsDialog.show('themes', mockOnClose, mockOnSave)
      
      expect(settingsDialog.isOpen).toBe(true)
      expect(settingsDialog.currentTab).toBe('themes')
      expect(settingsDialog.onClose).toBe(mockOnClose)
      expect(settingsDialog.onSave).toBe(mockOnSave)
      expect(settingsDialog.hasChanges).toBe(false)
      expect(mockSettingsManager.getAllSettings).toHaveBeenCalled()
    })

    test('show() with default parameters', () => {
      settingsDialog.show()
      
      expect(settingsDialog.currentTab).toBe('editor')
      expect(settingsDialog.onClose).toBeNull()
      expect(settingsDialog.onSave).toBeNull()
    })

    test('show() does nothing when already open', () => {
      settingsDialog.isOpen = true
      const originalTab = settingsDialog.currentTab
      
      settingsDialog.show('sync')
      
      expect(settingsDialog.currentTab).toBe(originalTab)
    })

    test('hide() closes dialog and cleans up', () => {
      // Setup open state
      settingsDialog.isOpen = true
      settingsDialog.searchQuery = 'test'
      settingsDialog.element = { remove: jest.fn() }
      settingsDialog.onClose = mockOnClose
      settingsDialog.hasChanges = true
      
      settingsDialog.hide()
      
      expect(settingsDialog.isOpen).toBe(false)
      expect(settingsDialog.searchQuery).toBe('')
      expect(settingsDialog.filteredTabs).toEqual([])
      expect(settingsDialog.element).toBeNull()
      expect(mockOnClose).toHaveBeenCalledWith(true)
      expect(document.body.classList.remove).toHaveBeenCalledWith('dialog-open')
    })

    test('hide() does nothing when already closed', () => {
      settingsDialog.hide()
      
      expect(document.body.classList.remove).not.toHaveBeenCalled()
    })
  })

  describe('Search Functionality', () => {
    test('getVisibleTabs() returns all tabs when no search query', () => {
      settingsDialog.searchQuery = ''
      
      const visibleTabs = settingsDialog.getVisibleTabs()
      
      expect(visibleTabs).toHaveLength(5)
      expect(visibleTabs).toEqual(settingsDialog.tabs)
    })

    test('getVisibleTabs() filters tabs by name', () => {
      settingsDialog.searchQuery = 'Themes'
      
      const visibleTabs = settingsDialog.getVisibleTabs()
      
      expect(visibleTabs).toHaveLength(1)
      expect(visibleTabs[0].id).toBe('themes')
    })

    test('getVisibleTabs() filters tabs by keywords', () => {
      settingsDialog.searchQuery = 'github'
      
      const visibleTabs = settingsDialog.getVisibleTabs()
      
      expect(visibleTabs).toHaveLength(1)
      expect(visibleTabs[0].id).toBe('git-integration')
    })

    test('getVisibleTabs() is case insensitive', () => {
      settingsDialog.searchQuery = 'EDITOR'
      
      const visibleTabs = settingsDialog.getVisibleTabs()
      
      expect(visibleTabs).toHaveLength(1)
      expect(visibleTabs[0].id).toBe('editor')
    })

    test('getVisibleTabs() returns multiple matching tabs', () => {
      settingsDialog.searchQuery = 'color'
      
      const visibleTabs = settingsDialog.getVisibleTabs()
      
      expect(visibleTabs.length).toBeGreaterThan(0)
      const hasThemesTab = visibleTabs.some(tab => tab.id === 'themes')
      expect(hasThemesTab).toBe(true)
    })

    test('clearSearch() resets search state', () => {
      settingsDialog.searchQuery = 'test'
      settingsDialog.element = {
        querySelector: jest.fn(() => ({
          value: 'test',
          focus: jest.fn()
        }))
      }
      
      settingsDialog.clearSearch()
      
      expect(settingsDialog.searchQuery).toBe('')
    })
  })

  describe('Tab Navigation', () => {
    test('switchTab() changes current tab', () => {
      settingsDialog.currentTab = 'editor'
      
      settingsDialog.switchTab('sync')
      
      expect(settingsDialog.currentTab).toBe('sync')
    })

    test('switchTab() does nothing for same tab', () => {
      const originalTab = settingsDialog.currentTab
      
      settingsDialog.switchTab(originalTab)
      
      expect(settingsDialog.currentTab).toBe(originalTab)
    })

    test('getStepForTab() returns correct step numbers', () => {
      expect(settingsDialog.getStepForTab('editor')).toBe('4')
      expect(settingsDialog.getStepForTab('codemirror')).toBe('5')
      expect(settingsDialog.getStepForTab('themes')).toBe('6')
      expect(settingsDialog.getStepForTab('git-integration')).toBe('7')
      expect(settingsDialog.getStepForTab('privacy')).toBe('8')
      expect(settingsDialog.getStepForTab('unknown')).toBe('?')
    })
  })

  describe('Settings Operations', () => {
    test('saveSettings() calls onSave callback and resets changes flag', () => {
      settingsDialog.hasChanges = true
      settingsDialog.onSave = mockOnSave
      
      settingsDialog.saveSettings()
      
      expect(settingsDialog.hasChanges).toBe(false)
      expect(mockOnSave).toHaveBeenCalled()
    })

    test('resetSettings() with confirmation calls settingsManager', () => {
      window.confirm.mockReturnValue(true)
      
      settingsDialog.resetSettings()
      
      expect(window.confirm).toHaveBeenCalled()
      expect(mockSettingsManager.resetToDefaults).toHaveBeenCalled()
      expect(settingsDialog.hasChanges).toBe(true)
    })

    test('resetSettings() without confirmation does nothing', () => {
      window.confirm.mockReturnValue(false)
      
      settingsDialog.resetSettings()
      
      expect(mockSettingsManager.resetToDefaults).not.toHaveBeenCalled()
      expect(settingsDialog.hasChanges).toBe(false)
    })
  })

  describe('Event Handling', () => {
    test('handleSearch() updates search query', () => {
      const event = { target: { value: 'test query' } }
      
      settingsDialog.handleSearch(event)
      
      expect(settingsDialog.searchQuery).toBe('test query')
    })

    test('handleClick() handles close action', () => {
      const hideSpy = jest.spyOn(settingsDialog, 'hide')
      const event = { 
        target: { 
          dataset: { action: 'close' },
          closest: jest.fn(() => null)
        } 
      }
      
      settingsDialog.handleClick(event)
      
      expect(hideSpy).toHaveBeenCalled()
    })

    test('handleClick() handles save action', () => {
      const saveSpy = jest.spyOn(settingsDialog, 'saveSettings')
      const event = { 
        target: { 
          dataset: { action: 'save' },
          closest: jest.fn(() => null)
        } 
      }
      
      settingsDialog.handleClick(event)
      
      expect(saveSpy).toHaveBeenCalled()
    })

    test('handleClick() handles reset action', () => {
      const resetSpy = jest.spyOn(settingsDialog, 'resetSettings')
      const event = { 
        target: { 
          dataset: { action: 'reset' },
          closest: jest.fn(() => null)
        } 
      }
      
      settingsDialog.handleClick(event)
      
      expect(resetSpy).toHaveBeenCalled()
    })

    test('handleClick() handles tab switching', () => {
      const switchSpy = jest.spyOn(settingsDialog, 'switchTab')
      const event = { 
        target: { 
          dataset: { tab: 'themes' },
          closest: jest.fn(() => null)
        } 
      }
      
      settingsDialog.handleClick(event)
      
      expect(switchSpy).toHaveBeenCalledWith('themes')
    })

    test('handleSearchKeydown() handles Escape key', () => {
      const clearSpy = jest.spyOn(settingsDialog, 'clearSearch')
      const hideSpy = jest.spyOn(settingsDialog, 'hide')
      
      // Test Escape with search query
      settingsDialog.searchQuery = 'test'
      const eventWithQuery = { 
        key: 'Escape', 
        preventDefault: jest.fn() 
      }
      
      settingsDialog.handleSearchKeydown(eventWithQuery)
      
      expect(clearSpy).toHaveBeenCalled()
      expect(eventWithQuery.preventDefault).toHaveBeenCalled()
      
      clearSpy.mockClear()
      hideSpy.mockClear()
      
      // Test Escape without search query
      settingsDialog.searchQuery = ''
      const eventWithoutQuery = { 
        key: 'Escape', 
        preventDefault: jest.fn() 
      }
      
      settingsDialog.handleSearchKeydown(eventWithoutQuery)
      
      expect(hideSpy).toHaveBeenCalled()
      expect(eventWithoutQuery.preventDefault).toHaveBeenCalled()
    })

    test('handleOverlayClick() closes dialog when clicking overlay', () => {
      const hideSpy = jest.spyOn(settingsDialog, 'hide')
      settingsDialog.element = { /* mock element */ }
      const event = { target: settingsDialog.element }
      
      settingsDialog.handleOverlayClick(event)
      
      expect(hideSpy).toHaveBeenCalled()
    })

    test('handleOverlayClick() does nothing when clicking inside dialog', () => {
      const hideSpy = jest.spyOn(settingsDialog, 'hide')
      const event = { target: { /* different element */ } }
      
      settingsDialog.handleOverlayClick(event)
      
      expect(hideSpy).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    test('dialog has proper ARIA attributes in render methods', () => {
      const tabNavigation = settingsDialog.renderTabNavigation()
      
      expect(tabNavigation).toContain('role="tablist"')
      expect(tabNavigation).toContain('aria-label="Settings categories"')
      expect(tabNavigation).toContain('role="tab"')
      expect(tabNavigation).toContain('aria-selected')
      expect(tabNavigation).toContain('aria-controls')
    })

    test('tab content has proper ARIA attributes', () => {
      const tabContent = settingsDialog.renderTabContent()
      
      expect(tabContent).toContain('role="tabpanel"')
      expect(tabContent).toContain('aria-labelledby')
    })

    test('focusSearchInput() attempts to focus search input', () => {
      const mockInput = { focus: jest.fn() }
      settingsDialog.element = {
        querySelector: jest.fn(() => mockInput)
      }
      
      settingsDialog.focusSearchInput()
      
      expect(settingsDialog.element.querySelector).toHaveBeenCalledWith('.settings-search')
      expect(mockInput.focus).toHaveBeenCalled()
    })
  })

  describe('Utility Methods', () => {
    test('isDialogOpen() returns current open state', () => {
      expect(settingsDialog.isDialogOpen()).toBe(false)
      
      settingsDialog.isOpen = true
      expect(settingsDialog.isDialogOpen()).toBe(true)
    })

    test('getCurrentTab() returns current tab', () => {
      settingsDialog.currentTab = 'themes'
      expect(settingsDialog.getCurrentTab()).toBe('themes')
    })

    test('getSearchQuery() returns current search query', () => {
      settingsDialog.searchQuery = 'test'
      expect(settingsDialog.getSearchQuery()).toBe('test')
    })

    test('showNotification() logs message (simple implementation)', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      settingsDialog.showNotification('Test message', 'info')
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test message')
      
      consoleLogSpy.mockRestore()
    })
  })

  describe('Content Rendering', () => {
    test('renderHeader() includes all required elements', () => {
      const header = settingsDialog.renderHeader()
      
      expect(header).toContain('settings-header')
      expect(header).toContain('Settings')
      expect(header).toContain('data-action="close"')
    })

    test('renderTabNavigation() shows correct tabs', () => {
      const navigation = settingsDialog.renderTabNavigation()
      
      expect(navigation).toContain('📝 Editor')
      expect(navigation).toContain('🎨 Themes')
      expect(navigation).toContain('🖥️ CodeMirror')
      expect(navigation).toContain('🔀 Git Integration')
      expect(navigation).toContain('🔒 Privacy')
    })

    test('renderTabNavigation() shows no results when search has no matches', () => {
      settingsDialog.searchQuery = 'nonexistent'
      
      const navigation = settingsDialog.renderTabNavigation()
      
      expect(navigation).toContain('settings-no-results')
      expect(navigation).toContain('No settings found')
    })

    test('renderTabContent() shows editor settings for editor tab', () => {
      settingsDialog.currentTab = 'editor'
      
      const content = settingsDialog.renderTabContent()
      
      expect(content).toContain('settings-panel')
      expect(content).toContain('Editor Settings')
      expect(content).toContain('Editor Width')
      expect(content).toContain('Zoom Level')
      expect(content).toContain('Enable spell checking')
      expect(content).toContain('Auto-save documents')
    })

    test('renderTabContent() shows themes tab content for themes tab', () => {
      settingsDialog.currentTab = 'themes'
      settingsDialog.localSettings = { editor: { theme: 'light' } }
      
      const content = settingsDialog.renderTabContent()
      
      expect(content).toContain('settings-panel')
      expect(content).toContain('Theme Customization')
      expect(content).toContain('Theme Selection')
      expect(content).toContain('Built-in Themes')
    })
  })

  describe('Editor Settings Functionality', () => {
    beforeEach(() => {
      settingsDialog.currentTab = 'editor'
      settingsDialog.show() // Need the element to be created for event handling
    })

    test('parseSettingValue() correctly parses different value types', () => {
      expect(settingsDialog.parseSettingValue('editor.width', '80', '', false)).toBe(80)
      expect(settingsDialog.parseSettingValue('editor.zoom', '1.15', '', false)).toBe(1.15)
      expect(settingsDialog.parseSettingValue('editor.spellCheck', '', 'checkbox', true)).toBe(true)
      expect(settingsDialog.parseSettingValue('editor.autoSave', '', 'checkbox', false)).toBe(false)
    })

    test('updateZoomDisplay() updates zoom percentage', () => {
      // Mock the DOM element
      const mockZoomValue = { textContent: '' }
      const mockQuerySelector = jest.fn(() => mockZoomValue)
      settingsDialog.element = { querySelector: mockQuerySelector }
      
      settingsDialog.updateZoomDisplay(1.15)
      
      expect(mockQuerySelector).toHaveBeenCalledWith('.zoom-value')
      expect(mockZoomValue.textContent).toBe('115%')
    })

    test('handleZoomReset() resets zoom to 100%', () => {
      const mockSlider = { value: '1.15' }
      const mockQuerySelector = jest.fn(() => mockSlider)
      settingsDialog.element = { querySelector: mockQuerySelector }
      
      const updateSettingSpy = jest.spyOn(settingsDialog, 'updateSetting').mockImplementation(() => {})
      
      settingsDialog.handleZoomReset()
      
      expect(mockQuerySelector).toHaveBeenCalledWith('#editor-zoom')
      expect(mockSlider.value).toBe(1.0)
      expect(updateSettingSpy).toHaveBeenCalledWith('editor.zoom', 1.0)
      
      updateSettingSpy.mockRestore()
    })

    test('handleSettingChange() processes setting changes correctly', () => {
      const updateSettingSpy = jest.spyOn(settingsDialog, 'updateSetting').mockImplementation(() => {})
      
      // Test select change (using autoSave interval since theme is no longer in Editor tab)
      const selectEvent = {
        target: {
          dataset: { setting: 'editor.autoSaveInterval' },
          value: '10000',
          type: 'select-one',
          checked: false
        }
      }
      
      settingsDialog.handleSettingChange(selectEvent)
      expect(updateSettingSpy).toHaveBeenCalledWith('editor.autoSaveInterval', expect.any(Number))
      
      // Test checkbox change
      const checkboxEvent = {
        target: {
          dataset: { setting: 'editor.spellCheck' },
          value: 'on',
          type: 'checkbox',
          checked: true
        }
      }
      
      settingsDialog.handleSettingChange(checkboxEvent)
      expect(updateSettingSpy).toHaveBeenCalledWith('editor.spellCheck', true)
      
      updateSettingSpy.mockRestore()
    })

    test('handleSettingInput() processes range input changes', () => {
      const updateSettingSpy = jest.spyOn(settingsDialog, 'updateSetting').mockImplementation(() => {})
      const updateZoomSpy = jest.spyOn(settingsDialog, 'updateZoomDisplay').mockImplementation(() => {})
      
      const rangeEvent = {
        target: {
          dataset: { setting: 'editor.zoom' },
          value: '1.15',
          type: 'range'
        }
      }
      
      settingsDialog.handleSettingInput(rangeEvent)
      
      expect(updateSettingSpy).toHaveBeenCalledWith('editor.zoom', 1.15)
      expect(updateZoomSpy).toHaveBeenCalledWith(1.15)
      
      updateSettingSpy.mockRestore()
      updateZoomSpy.mockRestore()
    })

    test('refreshSettingsUI() updates UI elements after setting changes', () => {
      // Set current tab to editor so refreshSettingsUI runs
      settingsDialog.currentTab = 'editor'
      
      // Mock width preset buttons - preset 80 is currently active, we're changing to 65
      const mockPresets = [
        { dataset: { value: '65' }, classList: { toggle: jest.fn(), contains: jest.fn(() => false) } }, // should become active
        { dataset: { value: '80' }, classList: { toggle: jest.fn(), contains: jest.fn(() => true) } },  // currently active, should become inactive
        { dataset: { value: '90' }, classList: { toggle: jest.fn(), contains: jest.fn(() => false) } }  // not active, stays inactive
      ]
      
      const mockQuerySelectorAll = jest.fn(() => mockPresets)
      settingsDialog.element = { querySelectorAll: mockQuerySelectorAll }
      
      settingsDialog.refreshSettingsUI('editor.width', 65)
      
      expect(mockQuerySelectorAll).toHaveBeenCalledWith('.width-preset')
      // Only presets that change state should have toggle called
      expect(mockPresets[0].classList.toggle).toHaveBeenCalledWith('active', true)  // 65 becomes active
      expect(mockPresets[1].classList.toggle).toHaveBeenCalledWith('active', false) // 80 becomes inactive  
      expect(mockPresets[2].classList.toggle).not.toHaveBeenCalled() // 90 stays inactive, no change
    })
  })
})