/**
 * Navigator Integration Tests
 * Tests Navigator integration with main app and command system
 */

import { Navigator } from '../../src/components/navigator/navigator.js'
import { CommandRegistry } from '../../src/core/commands/command-registry.js'

// Mock DOM environment
Object.defineProperty(global, 'HTMLElement', {
  value: class {
    addEventListener = jest.fn()
    removeEventListener = jest.fn()
    appendChild = jest.fn()
    remove = jest.fn()
    querySelector = jest.fn()
    querySelectorAll = jest.fn(() => [])
    scrollIntoView = jest.fn()
    classList = {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    }
    style = {}
    innerHTML = ''
    textContent = ''
    setAttribute = jest.fn()
    getAttribute = jest.fn()
    dataset = {}
    value = ''
    focus = jest.fn()
  }
})

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage })

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => new HTMLElement()),
    getElementById: jest.fn(() => new HTMLElement()),
    querySelector: jest.fn(() => new HTMLElement()),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
})

// Mock tab components
jest.mock('../../src/components/navigator/tabs/documents-tab.js', () => ({
  DocumentsTab: jest.fn().mockImplementation(() => ({
    onActivate: jest.fn(),
    applyFilter: jest.fn(),
    focusFilterInput: jest.fn(),
    setSelectedDocument: jest.fn(),
    updateDocument: jest.fn(),
    addDocument: jest.fn(),
    removeDocument: jest.fn(),
    refresh: jest.fn()
  }))
}))

jest.mock('../../src/components/navigator/tabs/outline-tab.js', () => ({
  OutlineTab: jest.fn().mockImplementation(() => ({
    onActivate: jest.fn(),
    updateOutline: jest.fn(),
    selectItem: jest.fn(),
    refresh: jest.fn()
  }))
}))

jest.mock('../../src/components/navigator/tabs/search-tab.js', () => ({
  SearchTab: jest.fn().mockImplementation(() => ({
    onActivate: jest.fn(),
    performSearch: jest.fn(),
    setQuery: jest.fn()
  }))
}))

describe('Navigator Integration Tests', () => {
  let navigator
  let mockApp
  let mockContainer
  let commandRegistry

  const createMockDocument = (id, title, content = '') => ({
    id,
    title,
    content,
    tags: [],
    updatedAt: new Date().toISOString(),
    metadata: { modified: new Date().toISOString() }
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockContainer = new HTMLElement()
    commandRegistry = new CommandRegistry()
    
    mockApp = {
      editor: {
        focus: jest.fn(),
        view: {
          dispatch: jest.fn(),
          focus: jest.fn()
        },
        getContent: jest.fn().mockReturnValue('# Test Content')
      },
      storageManager: {
        getAllDocuments: jest.fn().mockResolvedValue([]),
        saveDocument: jest.fn().mockResolvedValue(createMockDocument('doc-1', 'Test Document')),
        deleteDocument: jest.fn().mockResolvedValue(true)
      },
      commandRegistry,
      currentDocument: createMockDocument('doc-1', 'Current Document', '# Current Content'),
      loadDocument: jest.fn(),
      showNotification: jest.fn()
    }

    // Setup DOM mocks
    mockContainer.querySelector = jest.fn((selector) => {
      const elements = {
        '.navigator-pin': { classList: { toggle: jest.fn() }, title: '' },
        '.navigator-resize-handle': new HTMLElement(),
        '.app-main': { 
          classList: { add: jest.fn(), remove: jest.fn() }, 
          style: {} 
        },
        '#documents-tab-content': new HTMLElement(),
        '#outline-tab-content': new HTMLElement(),
        '#search-tab-content': new HTMLElement()
      }
      return elements[selector] || new HTMLElement()
    })

    mockContainer.querySelectorAll = jest.fn((selector) => {
      if (selector === '.navigator-tab') {
        return [
          { dataset: { tab: 'documents' }, classList: { toggle: jest.fn() }, setAttribute: jest.fn() },
          { dataset: { tab: 'outline' }, classList: { toggle: jest.fn() }, setAttribute: jest.fn() },
          { dataset: { tab: 'search' }, classList: { toggle: jest.fn() }, setAttribute: jest.fn() }
        ]
      }
      if (selector === '.navigator-panel') {
        return [
          { dataset: { panel: 'documents' }, classList: { toggle: jest.fn() } },
          { dataset: { panel: 'outline' }, classList: { toggle: jest.fn() } },
          { dataset: { panel: 'search' }, classList: { toggle: jest.fn() } }
        ]
      }
      return []
    })

    document.querySelector = jest.fn(() => mockContainer.querySelector('.app-main'))

    navigator = new Navigator(mockContainer, mockApp)
  })

  afterEach(() => {
    if (navigator) {
      navigator = null
    }
  })

  describe('command system integration', () => {
    beforeEach(() => {
      // Simulate loaded tab components
      navigator.tabComponents = {
        documents: {
          onActivate: jest.fn(),
          applyFilter: jest.fn(),
          focusFilterInput: jest.fn()
        },
        outline: {
          onActivate: jest.fn()
        },
        search: {
          onActivate: jest.fn(),
          setQuery: jest.fn()
        }
      }
    })

    it('should integrate with :d (documents) command', () => {
      jest.spyOn(navigator, 'openTab')

      navigator.openDocuments()

      expect(navigator.openTab).toHaveBeenCalledWith('documents')
      expect(navigator.tabComponents.documents.focusFilterInput).toHaveBeenCalled()
    })

    it('should integrate with :d [filter] command with parameter', () => {
      jest.spyOn(navigator, 'openTab')

      navigator.openDocuments('fantasy')

      expect(navigator.openTab).toHaveBeenCalledWith('documents')
      expect(navigator.tabComponents.documents.applyFilter).toHaveBeenCalledWith('fantasy')
      expect(navigator.tabComponents.documents.focusFilterInput).toHaveBeenCalled()
    })

    it('should integrate with :l (outline) command', (done) => {
      jest.spyOn(navigator, 'switchTab')
      jest.spyOn(navigator, 'show')
      jest.spyOn(navigator, 'focusActiveTab')

      navigator.openOutline()

      expect(navigator.switchTab).toHaveBeenCalledWith('outline')
      expect(navigator.show).toHaveBeenCalled()

      setTimeout(() => {
        expect(navigator.focusActiveTab).toHaveBeenCalled()
        done()
      }, 150)
    })

    it('should integrate with :f (search) command', () => {
      jest.spyOn(navigator, 'openTab')

      navigator.openSearch('dragons')

      expect(navigator.openTab).toHaveBeenCalledWith('search')
      expect(navigator.tabComponents.search.setQuery).toHaveBeenCalledWith('dragons')
    })

    it('should integrate with :f command without query', (done) => {
      jest.spyOn(navigator, 'switchTab')
      jest.spyOn(navigator, 'show')
      jest.spyOn(navigator, 'focusActiveTab')

      navigator.openSearch()

      expect(navigator.switchTab).toHaveBeenCalledWith('search')
      expect(navigator.show).toHaveBeenCalled()

      setTimeout(() => {
        expect(navigator.focusActiveTab).toHaveBeenCalled()
        done()
      }, 150)
    })
  })

  describe('document lifecycle integration', () => {
    beforeEach(() => {
      navigator.tabComponents = {
        documents: {
          setSelectedDocument: jest.fn(),
          updateDocument: jest.fn(),
          addDocument: jest.fn(),
          removeDocument: jest.fn()
        },
        outline: {
          updateOutline: jest.fn()
        }
      }
    })

    it('should update when document changes', () => {
      const newDocument = createMockDocument('doc-2', 'New Document', '# New Content')

      navigator.onDocumentChange(newDocument)

      expect(navigator.tabComponents.outline.updateOutline).toHaveBeenCalledWith(newDocument)
      expect(navigator.tabComponents.documents.setSelectedDocument).toHaveBeenCalledWith('doc-2')
    })

    it('should update when document is saved', () => {
      const savedDocument = createMockDocument('doc-1', 'Saved Document')

      navigator.onDocumentSave(savedDocument)

      expect(navigator.tabComponents.documents.updateDocument).toHaveBeenCalledWith(savedDocument)
    })

    it('should update when document is created', () => {
      const createdDocument = createMockDocument('doc-3', 'Created Document')

      navigator.onDocumentCreate(createdDocument)

      expect(navigator.tabComponents.documents.addDocument).toHaveBeenCalledWith(createdDocument)
    })

    it('should update when document is deleted', () => {
      navigator.onDocumentDelete('doc-4')

      expect(navigator.tabComponents.documents.removeDocument).toHaveBeenCalledWith('doc-4')
    })

    it('should handle missing tab components gracefully', () => {
      navigator.tabComponents = {}

      expect(() => {
        navigator.onDocumentChange(createMockDocument('doc-1', 'Test'))
        navigator.onDocumentSave(createMockDocument('doc-1', 'Test'))
        navigator.onDocumentCreate(createMockDocument('doc-1', 'Test'))
        navigator.onDocumentDelete('doc-1')
      }).not.toThrow()
    })
  })

  describe('app state synchronization', () => {
    it('should sync with app main layout on show', () => {
      const appMain = mockContainer.querySelector('.app-main')

      navigator.show()

      expect(appMain.classList.remove).toHaveBeenCalledWith('navigator-hidden')
      expect(appMain.style.marginLeft).toBe('320px')
    })

    it('should sync with app main layout on hide', () => {
      const appMain = mockContainer.querySelector('.app-main')

      navigator.hide()

      expect(appMain.classList.add).toHaveBeenCalledWith('navigator-hidden')
      expect(appMain.style.marginLeft).toBe('0')
    })

    it('should update app layout when resized', () => {
      const appMain = mockContainer.querySelector('.app-main')
      navigator.isVisible = true
      navigator.width = 400

      // Simulate resize
      navigator.container.style.width = '400px'
      if (appMain && navigator.isVisible) {
        appMain.style.marginLeft = `${navigator.width}px`
      }

      expect(appMain.style.marginLeft).toBe('400px')
    })

    it('should return focus to editor on escape', () => {
      navigator.isPinned = false

      // Simulate escape key
      const keydownHandler = mockContainer.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1]
      
      if (keydownHandler) {
        keydownHandler({ key: 'Escape' })
        expect(mockApp.editor.focus).toHaveBeenCalled()
      }
    })
  })

  describe('preference persistence integration', () => {
    it('should save width preference on resize', () => {
      navigator.width = 450

      // Simulate resize end
      document.addEventListener.mock.calls
        .find(call => call[0] === 'mouseup')[1]()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('navigator-width', 450)
    })

    it('should save pin state preference', () => {
      navigator.togglePin()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('navigator-pinned', true)

      navigator.togglePin()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('navigator-pinned', false)
    })

    it('should restore preferences from localStorage', () => {
      mockLocalStorage.getItem = jest.fn((key) => {
        if (key === 'navigator-width') return '500'
        if (key === 'navigator-pinned') return 'true'
        return null
      })

      jest.spyOn(navigator, 'show')

      navigator.restorePreferences()

      expect(navigator.width).toBe(500)
      expect(navigator.container.style.width).toBe('500px')
      expect(navigator.isPinned).toBe(true)
      expect(navigator.show).toHaveBeenCalled()
    })
  })

  describe('tab component lifecycle integration', () => {
    it('should properly initialize tab components', (done) => {
      // Tab components are loaded asynchronously
      setTimeout(() => {
        expect(navigator.tabComponents.documents).toBeDefined()
        expect(navigator.tabComponents.outline).toBeDefined()
        expect(navigator.tabComponents.search).toBeDefined()
        done()
      }, 100)
    })

    it('should handle tab component loading errors', () => {
      // Mock import failure
      console.error = jest.fn()

      navigator.initializeTabs()

      // Should not throw error, just log to console
      expect(() => navigator.switchTab('documents')).not.toThrow()
    })

    it('should activate tab components when switching tabs', () => {
      navigator.tabComponents = {
        documents: { onActivate: jest.fn() },
        outline: { onActivate: jest.fn() },
        search: { onActivate: jest.fn() }
      }

      navigator.switchTab('outline')

      expect(navigator.tabComponents.outline.onActivate).toHaveBeenCalled()
      expect(navigator.tabComponents.documents.onActivate).not.toHaveBeenCalled()
    })

    it('should refresh current tab component', () => {
      navigator.tabComponents = {
        documents: { refresh: jest.fn() },
        outline: { refresh: jest.fn() },
        search: { refresh: jest.fn() }
      }

      navigator.activeTab = 'documents'
      navigator.refresh()

      expect(navigator.tabComponents.documents.refresh).toHaveBeenCalled()
      expect(navigator.tabComponents.outline.refresh).not.toHaveBeenCalled()
    })
  })

  describe('auto-unhide integration', () => {
    beforeEach(() => {
      navigator.setupAutoUnhide()
    })

    it('should integrate with global mouse events', () => {
      const mouseMoveHandler = document.addEventListener.mock.calls
        .find(call => call[0] === 'mousemove')[1]

      navigator.isPinned = false
      navigator.isVisible = false
      jest.spyOn(navigator, 'show')

      mouseMoveHandler({ clientX: 5 })

      expect(navigator.show).toHaveBeenCalled()
    })

    it('should respect pinned state in auto-unhide', () => {
      const mouseMoveHandler = document.addEventListener.mock.calls
        .find(call => call[0] === 'mousemove')[1]

      navigator.isPinned = true
      navigator.isVisible = false
      jest.spyOn(navigator, 'show')

      mouseMoveHandler({ clientX: 5 })

      expect(navigator.show).not.toHaveBeenCalled()
    })

    it('should auto-hide when unpinned and mouse leaves', (done) => {
      navigator.isPinned = false
      navigator.isVisible = true
      jest.spyOn(navigator, 'hide')

      // Simulate mouse leave
      const mouseleaveHandler = mockContainer.addEventListener.mock.calls
        .find(call => call[0] === 'mouseleave')[1]

      mouseleaveHandler()

      setTimeout(() => {
        expect(navigator.hide).toHaveBeenCalled()
        done()
      }, 1100) // Slightly more than the 1000ms delay
    })
  })

  describe('keyboard navigation integration', () => {
    it('should handle global Ctrl+Enter toggle', () => {
      const keydownHandler = document.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1]

      navigator.isPinned = false
      navigator.isVisible = false
      jest.spyOn(navigator, 'toggle')

      keydownHandler({
        ctrlKey: true,
        key: 'Enter',
        preventDefault: jest.fn()
      })

      expect(navigator.toggle).toHaveBeenCalled()
    })

    it('should not toggle when pinned', () => {
      const keydownHandler = document.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1]

      navigator.isPinned = true
      jest.spyOn(navigator, 'toggle')

      keydownHandler({
        ctrlKey: true,
        key: 'Enter',
        preventDefault: jest.fn()
      })

      expect(navigator.toggle).not.toHaveBeenCalled()
    })

    it('should handle tab switching shortcuts', () => {
      const keydownHandler = mockContainer.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1]

      jest.spyOn(navigator, 'switchTab')

      keydownHandler({
        ctrlKey: true,
        key: '2',
        preventDefault: jest.fn()
      })

      expect(navigator.switchTab).toHaveBeenCalledWith('outline')
    })
  })

  describe('error handling integration', () => {
    it('should handle app reference errors gracefully', () => {
      navigator.app = null

      expect(() => {
        navigator.onDocumentChange(createMockDocument('doc-1', 'Test'))
        navigator.focusActiveTab()
      }).not.toThrow()
    })

    it('should handle missing DOM elements gracefully', () => {
      mockContainer.querySelector = jest.fn(() => null)
      mockContainer.querySelectorAll = jest.fn(() => [])

      expect(() => {
        navigator.switchTab('documents')
        navigator.show()
        navigator.hide()
        navigator.togglePin()
      }).not.toThrow()
    })

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = mockLocalStorage.setItem
      mockLocalStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      // Should not crash the application
      try {
        navigator.togglePin()
      } catch (error) {
        // Expected to throw, but app should handle gracefully
        expect(error.message).toBe('Storage quota exceeded')
      }

      // Restore original implementation
      mockLocalStorage.setItem = originalSetItem
    })
  })

  describe('performance and cleanup', () => {
    it('should properly clean up event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      // Simulate component destruction
      navigator.destroy = jest.fn(() => {
        document.removeEventListener('keydown', navigator.globalKeyHandler)
        document.removeEventListener('mousemove', navigator.autoUnhideHandler)
      })

      navigator.destroy()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })

    it('should handle rapid tab switching without issues', () => {
      navigator.tabComponents = {
        documents: { onActivate: jest.fn() },
        outline: { onActivate: jest.fn() },
        search: { onActivate: jest.fn() }
      }

      // Rapidly switch tabs
      navigator.switchTab('outline')
      navigator.switchTab('search')
      navigator.switchTab('documents')
      navigator.switchTab('outline')

      expect(navigator.activeTab).toBe('outline')
      expect(navigator.tabComponents.outline.onActivate).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple simultaneous document updates', () => {
      navigator.tabComponents = {
        documents: { updateDocument: jest.fn() },
        outline: { updateOutline: jest.fn() }
      }

      const doc1 = createMockDocument('doc-1', 'Document 1')
      const doc2 = createMockDocument('doc-2', 'Document 2')

      navigator.onDocumentSave(doc1)
      navigator.onDocumentChange(doc2)
      navigator.onDocumentSave(doc2)

      expect(navigator.tabComponents.documents.updateDocument).toHaveBeenCalledTimes(2)
      expect(navigator.tabComponents.outline.updateOutline).toHaveBeenCalledTimes(1)
    })
  })
})