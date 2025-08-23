/**
 * Documents Tab Tests
 * Tests document listing, filtering, and RECENT/PREVIOUS grouping functionality
 */

import { DocumentsTab } from '../documents-tab.js'

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

describe('DocumentsTab', () => {
  let documentsTab
  let mockContainer
  let mockApp

  const createMockDocument = (id, title, updatedAt, tags = []) => ({
    id,
    title,
    updatedAt,
    tags,
    content: `Content of ${title}`,
    metadata: { modified: updatedAt }
  })

  const mockDocuments = [
    createMockDocument('doc-1', 'Recent Document 1', new Date(Date.now() - 60000).toISOString(), ['tag1']),
    createMockDocument('doc-2', 'Recent Document 2', new Date(Date.now() - 120000).toISOString(), ['tag2']),
    createMockDocument('doc-3', 'Recent Document 3', new Date(Date.now() - 180000).toISOString(), ['tag3']),
    createMockDocument('doc-4', 'Previous Document 1', new Date(Date.now() - 24 * 60 * 60000).toISOString(), ['tag4']),
    createMockDocument('doc-5', 'Previous Document 2', new Date(Date.now() - 48 * 60 * 60000).toISOString(), ['tag5'])
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockContainer = new HTMLElement()
    mockApp = {
      storageManager: {
        getAllDocuments: jest.fn().mockResolvedValue(mockDocuments),
        deleteDocument: jest.fn().mockResolvedValue(true)
      },
      loadDocument: jest.fn(),
      showNotification: jest.fn()
    }

    // Mock container DOM structure
    mockContainer.querySelector = jest.fn((selector) => {
      const mockElements = {
        '.filter-input': { value: '', addEventListener: jest.fn(), focus: jest.fn() },
        '.documents-list': { innerHTML: '', addEventListener: jest.fn() },
        '.document-item.selected': { classList: { remove: jest.fn() } }
      }
      return mockElements[selector] || new HTMLElement()
    })

    mockContainer.querySelectorAll = jest.fn((selector) => {
      if (selector === '.document-item') {
        return [
          { classList: { add: jest.fn(), remove: jest.fn() }, dataset: { docId: 'doc-1' } },
          { classList: { add: jest.fn(), remove: jest.fn() }, dataset: { docId: 'doc-2' } }
        ]
      }
      return []
    })

    // Mock localStorage for recent documents
    mockLocalStorage.getItem = jest.fn((key) => {
      if (key === 'recent-documents') {
        return JSON.stringify(['doc-1', 'doc-2', 'doc-3'])
      }
      return null
    })

    documentsTab = new DocumentsTab(mockContainer, mockApp)
  })

  afterEach(() => {
    if (documentsTab) {
      documentsTab = null
    }
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      expect(documentsTab.container).toBe(mockContainer)
      expect(documentsTab.app).toBe(mockApp)
      expect(documentsTab.documents).toEqual([])
      expect(documentsTab.filteredDocuments).toEqual([])
      expect(documentsTab.selectedDocumentId).toBeNull()
    })

    it('should set container class and attributes', () => {
      expect(mockContainer.className).toBe('documents-tab')
      expect(mockContainer.setAttribute).toHaveBeenCalledWith('role', 'tabpanel')
      expect(mockContainer.setAttribute).toHaveBeenCalledWith('aria-label', 'Documents list')
    })

    it('should load documents on initialization', () => {
      expect(mockApp.storageManager.getAllDocuments).toHaveBeenCalled()
    })
  })

  describe('document loading and grouping', () => {
    beforeEach(async () => {
      await documentsTab.loadDocuments()
    })

    it('should load documents from storage', () => {
      expect(documentsTab.documents).toEqual(mockDocuments)
    })

    it('should group documents into RECENT and PREVIOUS correctly', () => {
      const rendered = documentsTab.renderDocuments()
      
      expect(rendered).toContain('<div class="documents-section">')
      expect(rendered).toContain('<h3 class="section-title">RECENT</h3>')
      expect(rendered).toContain('<h3 class="section-title">PREVIOUS</h3>')
    })

    it('should limit RECENT section to 3 documents', () => {
      const recentDocs = documentsTab.getRecentDocuments()
      expect(recentDocs).toHaveLength(3)
      expect(recentDocs.map(d => d.id)).toEqual(['doc-1', 'doc-2', 'doc-3'])
    })

    it('should show remaining documents in PREVIOUS section', () => {
      const previousDocs = documentsTab.getPreviousDocuments()
      expect(previousDocs).toHaveLength(2)
      expect(previousDocs.map(d => d.id)).toEqual(['doc-4', 'doc-5'])
    })

    it('should handle empty document list', async () => {
      mockApp.storageManager.getAllDocuments = jest.fn().mockResolvedValue([])
      await documentsTab.loadDocuments()

      const rendered = documentsTab.renderDocuments()
      expect(rendered).toContain('No documents found')
    })
  })

  describe('document filtering', () => {
    beforeEach(async () => {
      await documentsTab.loadDocuments()
    })

    it('should filter documents by title', () => {
      documentsTab.applyFilter('Recent Document 1')
      
      expect(documentsTab.filteredDocuments).toHaveLength(1)
      expect(documentsTab.filteredDocuments[0].title).toBe('Recent Document 1')
    })

    it('should filter documents by tag', () => {
      documentsTab.applyFilter('tag4')
      
      expect(documentsTab.filteredDocuments).toHaveLength(1)
      expect(documentsTab.filteredDocuments[0].tags).toContain('tag4')
    })

    it('should filter documents by content', () => {
      documentsTab.applyFilter('Content of Recent Document 2')
      
      expect(documentsTab.filteredDocuments).toHaveLength(1)
      expect(documentsTab.filteredDocuments[0].id).toBe('doc-2')
    })

    it('should be case insensitive', () => {
      documentsTab.applyFilter('RECENT DOCUMENT')
      
      expect(documentsTab.filteredDocuments.length).toBeGreaterThan(0)
    })

    it('should show all documents when filter is empty', () => {
      documentsTab.applyFilter('')
      
      expect(documentsTab.filteredDocuments).toEqual(documentsTab.documents)
    })

    it('should update display after filtering', () => {
      jest.spyOn(documentsTab, 'renderDocuments')
      
      documentsTab.applyFilter('test')
      
      expect(documentsTab.renderDocuments).toHaveBeenCalled()
    })
  })

  describe('document selection', () => {
    beforeEach(async () => {
      await documentsTab.loadDocuments()
    })

    it('should select document by ID', () => {
      documentsTab.setSelectedDocument('doc-2')
      
      expect(documentsTab.selectedDocumentId).toBe('doc-2')
    })

    it('should clear previous selection', () => {
      const mockSelected = { classList: { remove: jest.fn() } }
      mockContainer.querySelector = jest.fn(() => mockSelected)
      
      documentsTab.setSelectedDocument('doc-1')
      documentsTab.setSelectedDocument('doc-2')
      
      expect(mockSelected.classList.remove).toHaveBeenCalledWith('selected')
    })

    it('should highlight new selection', () => {
      const mockItems = [
        { classList: { add: jest.fn() }, dataset: { docId: 'doc-1' } },
        { classList: { add: jest.fn() }, dataset: { docId: 'doc-2' } }
      ]
      mockContainer.querySelectorAll = jest.fn(() => mockItems)
      
      documentsTab.setSelectedDocument('doc-2')
      
      expect(mockItems[1].classList.add).toHaveBeenCalledWith('selected')
    })
  })

  describe('document operations', () => {
    beforeEach(async () => {
      await documentsTab.loadDocuments()
    })

    it('should handle document click', () => {
      const mockEvent = {
        target: { closest: jest.fn().mockReturnValue({ dataset: { docId: 'doc-1' } }) }
      }
      
      documentsTab.handleDocumentClick(mockEvent)
      
      expect(mockApp.loadDocument).toHaveBeenCalledWith(mockDocuments[0])
    })

    it('should handle document deletion', async () => {
      const mockEvent = {
        target: { closest: jest.fn().mockReturnValue({ dataset: { docId: 'doc-2' } }) },
        stopPropagation: jest.fn()
      }
      
      // Mock window.confirm
      global.confirm = jest.fn().mockReturnValue(true)
      
      await documentsTab.handleDeleteClick(mockEvent)
      
      expect(mockApp.storageManager.deleteDocument).toHaveBeenCalledWith('doc-2')
      expect(mockApp.showNotification).toHaveBeenCalledWith('Document deleted', 'info')
    })

    it('should cancel deletion when not confirmed', async () => {
      const mockEvent = {
        target: { closest: jest.fn().mockReturnValue({ dataset: { docId: 'doc-2' } }) },
        stopPropagation: jest.fn()
      }
      
      global.confirm = jest.fn().mockReturnValue(false)
      
      await documentsTab.handleDeleteClick(mockEvent)
      
      expect(mockApp.storageManager.deleteDocument).not.toHaveBeenCalled()
    })

    it('should update document in list', () => {
      const updatedDoc = { ...mockDocuments[0], title: 'Updated Title' }
      
      documentsTab.updateDocument(updatedDoc)
      
      expect(documentsTab.documents[0].title).toBe('Updated Title')
    })

    it('should add new document to list', () => {
      const newDoc = createMockDocument('doc-6', 'New Document', new Date().toISOString())
      
      documentsTab.addDocument(newDoc)
      
      expect(documentsTab.documents).toContain(newDoc)
    })

    it('should remove document from list', () => {
      documentsTab.removeDocument('doc-1')
      
      expect(documentsTab.documents.find(d => d.id === 'doc-1')).toBeUndefined()
    })
  })

  describe('recent documents tracking', () => {
    it('should load recent documents from localStorage', () => {
      const recent = documentsTab.getRecentDocumentIds()
      
      expect(recent).toEqual(['doc-1', 'doc-2', 'doc-3'])
    })

    it('should add document to recent list', () => {
      documentsTab.addToRecent('doc-4')
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'recent-documents',
        expect.stringContaining('doc-4')
      )
    })

    it('should maintain recent list order', () => {
      documentsTab.addToRecent('doc-1') // Already first, should move to front
      
      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
      expect(savedData[0]).toBe('doc-1')
    })

    it('should limit recent list to maximum size', () => {
      documentsTab.maxRecentDocuments = 2
      documentsTab.addToRecent('new-doc')
      
      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
      expect(savedData.length).toBeLessThanOrEqual(2)
    })
  })

  describe('focus and accessibility', () => {
    it('should focus filter input', () => {
      const filterInput = mockContainer.querySelector('.filter-input')
      
      documentsTab.focusFilterInput()
      
      expect(filterInput.focus).toHaveBeenCalled()
    })

    it('should handle keyboard navigation in document list', () => {
      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
        target: { closest: jest.fn().mockReturnValue({ dataset: { docId: 'doc-1' } }) }
      }
      
      documentsTab.handleKeyboardNavigation(mockEvent)
      
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    it('should handle Enter key for selection', () => {
      const mockEvent = {
        key: 'Enter',
        preventDefault: jest.fn(),
        target: { closest: jest.fn().mockReturnValue({ dataset: { docId: 'doc-1' } }) }
      }
      
      documentsTab.handleKeyboardNavigation(mockEvent)
      
      expect(mockApp.loadDocument).toHaveBeenCalled()
    })
  })

  describe('document rendering', () => {
    beforeEach(async () => {
      await documentsTab.loadDocuments()
    })

    it('should render document item with correct structure', () => {
      const doc = mockDocuments[0]
      const rendered = documentsTab.renderDocumentItem(doc)
      
      expect(rendered).toContain(`data-doc-id="${doc.id}"`)
      expect(rendered).toContain(doc.title)
      expect(rendered).toContain('document-item')
    })

    it('should include document metadata', () => {
      const doc = mockDocuments[0]
      const rendered = documentsTab.renderDocumentItem(doc)
      
      expect(rendered).toContain('document-meta')
      expect(rendered).toContain('document-actions')
    })

    it('should include tags in document item', () => {
      const doc = mockDocuments[0]
      const rendered = documentsTab.renderDocumentItem(doc)
      
      expect(rendered).toContain('document-tags')
      expect(rendered).toContain(doc.tags[0])
    })

    it('should handle documents without tags', () => {
      const docNoTags = { ...mockDocuments[0], tags: [] }
      const rendered = documentsTab.renderDocumentItem(docNoTags)
      
      expect(rendered).not.toContain('document-tags')
    })
  })

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockApp.storageManager.getAllDocuments = jest.fn().mockRejectedValue(new Error('Storage error'))
      
      await documentsTab.loadDocuments()
      
      expect(documentsTab.documents).toEqual([])
    })

    it('should handle deletion errors', async () => {
      mockApp.storageManager.deleteDocument = jest.fn().mockRejectedValue(new Error('Delete error'))
      global.confirm = jest.fn().mockReturnValue(true)
      
      const mockEvent = {
        target: { closest: jest.fn().mockReturnValue({ dataset: { docId: 'doc-1' } }) },
        stopPropagation: jest.fn()
      }
      
      await documentsTab.handleDeleteClick(mockEvent)
      
      expect(mockApp.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete'),
        'error'
      )
    })

    it('should handle malformed recent documents in localStorage', () => {
      mockLocalStorage.getItem = jest.fn().mockReturnValue('invalid-json')
      
      const recent = documentsTab.getRecentDocumentIds()
      
      expect(recent).toEqual([])
    })
  })

  describe('refresh functionality', () => {
    it('should refresh document list', async () => {
      jest.spyOn(documentsTab, 'loadDocuments')
      
      await documentsTab.refresh()
      
      expect(documentsTab.loadDocuments).toHaveBeenCalled()
    })

    it('should maintain current filter after refresh', async () => {
      documentsTab.applyFilter('test filter')
      const filterValue = documentsTab.currentFilter
      
      await documentsTab.refresh()
      
      expect(documentsTab.currentFilter).toBe(filterValue)
    })
  })
})