/**
 * Settings Dialog Integration Tests
 * Testing command integration and full dialog workflow
 */

import { SettingsDialog } from '../../src/components/dialogs/settings-dialog.js'
import { SettingsManager } from '../../src/core/settings/settings-manager.js'

// Simple integration test with minimal mocking
describe('Settings Dialog Integration', () => {
  let settingsManager
  let settingsDialog
  let mockCreateElement
  let mockAppendChild
  let mockClassListRemove
  let mockElement

  // Mock localStorage
  const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => { localStorageMock.store[key] = value }),
    clear: jest.fn(() => { localStorageMock.store = {} })
  }
  
  global.localStorage = localStorageMock

  beforeEach(() => {
    localStorageMock.clear()
    
    // Create fresh mocks for each test
    mockCreateElement = jest.fn()
    mockAppendChild = jest.fn()
    mockClassListRemove = jest.fn()

    // Mock document methods
    mockElement = {
      className: '',
      innerHTML: '',
      remove: jest.fn(),
      querySelector: jest.fn(() => ({ focus: jest.fn(), value: '' })),
      querySelectorAll: jest.fn(() => []),
      addEventListener: jest.fn()
    }

    mockCreateElement.mockReturnValue(mockElement)

    global.document = {
      createElement: mockCreateElement,
      body: {
        appendChild: mockAppendChild,
        classList: { 
          add: jest.fn(), 
          remove: mockClassListRemove
        }
      }
    }
    
    settingsManager = new SettingsManager()
    settingsDialog = new SettingsDialog(settingsManager)
  })

  test('dialog can be created with settings manager', () => {
    expect(settingsDialog).toBeDefined()
    expect(settingsDialog.settingsManager).toBe(settingsManager)
    expect(settingsDialog.isOpen).toBe(false)
  })

  test('dialog can be opened with different tabs', () => {
    const tabs = ['editor', 'themes', 'codemirror', 'git-integration', 'privacy']
    
    tabs.forEach(tab => {
      settingsDialog.show(tab)
      expect(settingsDialog.currentTab).toBe(tab)
      expect(settingsDialog.isOpen).toBe(true)
      settingsDialog.hide()
    })
  })

  test('search functionality works across tabs', () => {
    // Search for 'theme' should find editor and themes tabs
    settingsDialog.searchQuery = 'theme'
    const visibleTabs = settingsDialog.getVisibleTabs()
    
    expect(visibleTabs.length).toBeGreaterThan(0)
    const hasThemeTab = visibleTabs.some(tab => 
      tab.id === 'themes' || tab.keywords.includes('theme')
    )
    expect(hasThemeTab).toBe(true)
  })

  test('settings manager integration works', () => {
    // Test that dialog can access settings
    const allSettings = settingsManager.getAllSettings()
    expect(allSettings).toHaveProperty('editor')
    expect(allSettings).toHaveProperty('codemirror')
    
    // Test settings operations
    settingsManager.set('editor.theme', 'dark')
    expect(settingsManager.get('editor.theme')).toBe('dark')
  })

  test('dialog renders without errors', () => {
    expect(() => {
      settingsDialog.show('editor')
    }).not.toThrow()
    
    // Check that dialog was opened
    expect(settingsDialog.isOpen).toBe(true)
    expect(settingsDialog.currentTab).toBe('editor')
  })

  test('accessibility features are present', () => {
    const tabNavigation = settingsDialog.renderTabNavigation()
    
    // Check for ARIA attributes
    expect(tabNavigation).toContain('role="tablist"')
    expect(tabNavigation).toContain('aria-label')
    expect(tabNavigation).toContain('aria-selected')
    
    const tabContent = settingsDialog.renderTabContent()
    expect(tabContent).toContain('role="tabpanel"')
    expect(tabContent).toContain('aria-labelledby')
  })

  test('keyboard navigation support', () => {
    settingsDialog.show('editor')
    
    // Test Escape key handling
    const escapeEvent = {
      key: 'Escape',
      preventDefault: jest.fn()
    }
    
    settingsDialog.handleSearchKeydown(escapeEvent)
    expect(escapeEvent.preventDefault).toHaveBeenCalled()
  })

  test('tab switching works correctly', () => {
    settingsDialog.show('editor')
    
    expect(settingsDialog.currentTab).toBe('editor')
    
    settingsDialog.switchTab('themes')
    expect(settingsDialog.currentTab).toBe('themes')
    
    // Should not change for same tab
    settingsDialog.switchTab('themes')
    expect(settingsDialog.currentTab).toBe('themes')
  })

  test('dialog cleanup on hide', () => {
    // Show dialog first to set up the element
    settingsDialog.show('editor')
    expect(settingsDialog.isOpen).toBe(true)
    
    // Now hide it and check cleanup
    settingsDialog.hide()
    
    expect(settingsDialog.isOpen).toBe(false)
    expect(settingsDialog.element).toBeNull()
    expect(settingsDialog.searchQuery).toBe('')
  })

  test('step numbering is correct for tabs', () => {
    expect(settingsDialog.getStepForTab('editor')).toBe('4')
    expect(settingsDialog.getStepForTab('codemirror')).toBe('5')
    expect(settingsDialog.getStepForTab('themes')).toBe('6')
    expect(settingsDialog.getStepForTab('git-integration')).toBe('7')
    expect(settingsDialog.getStepForTab('privacy')).toBe('8')
  })

  test('all required tabs are present', () => {
    expect(settingsDialog.tabs).toHaveLength(5)
    
    const expectedTabs = ['editor', 'themes', 'codemirror', 'git-integration', 'privacy']
    const actualTabs = settingsDialog.tabs.map(t => t.id)
    
    expectedTabs.forEach(tabId => {
      expect(actualTabs).toContain(tabId)
    })
  })
})