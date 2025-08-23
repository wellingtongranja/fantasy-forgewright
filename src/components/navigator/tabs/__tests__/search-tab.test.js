/**
 * Search Tab Tests
 * Tests full-text search functionality, result rendering, and navigation
 */

import { SearchTab } from '../search-tab.js'

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

// Mock AbortController
const mockAbort = jest.fn()
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: { aborted: false },
  abort: mockAbort
}))

// Store reference to mock for test assertions
global.mockAbortController = { abort: mockAbort }

describe('SearchTab', () => {
  let searchTab
  let mockContainer
  let mockApp

  const mockDocuments = [
    {
      id: 'doc-1',
      title: 'The Epic Adventure',
      content: 'Once upon a time, in a land far away, there lived a brave knight.',
      tags: ['fantasy', 'adventure'],
      updatedAt: '2024-01-01T12:00:00Z'
    },
    {
      id: 'doc-2', 
      title: 'Mystery of the Lost Treasure',
      content: 'The old map revealed the location of the hidden treasure chest.',
      tags: ['mystery', 'treasure'],
      updatedAt: '2024-01-02T10:00:00Z'
    },
    {
      id: 'doc-3',
      title: 'Dragon\'s Lair',
      content: 'Deep in the mountain caves, the ancient dragon slept peacefully.',
      tags: ['fantasy', 'dragon'],
      updatedAt: '2024-01-03T15:00:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockContainer = new HTMLElement()
    mockApp = {
      storageManager: {
        getAllDocuments: jest.fn().mockResolvedValue(mockDocuments),
        getDocument: jest.fn().mockImplementation(id => 
          Promise.resolve(mockDocuments.find(doc => doc.id === id))
        )
      },
      loadDocument: jest.fn(),
      editor: {
        getContent: jest.fn().mockReturnValue('mock content'),
        view: {
          dispatch: jest.fn(),
          focus: jest.fn()
        }
      }
    }

    // Mock container DOM structure
    mockContainer.querySelector = jest.fn((selector) => {
      const mockElements = {
        '.search-input': { 
          value: '', 
          addEventListener: jest.fn(), 
          focus: jest.fn() 
        },
        '.search-button': { 
          addEventListener: jest.fn(),
          style: { display: 'block' }
        },
        '.search-stop': { 
          addEventListener: jest.fn(),
          style: { display: 'none' }
        },
        '.search-progress': { 
          style: { display: 'none' },
          querySelector: jest.fn((subselector) => {
            if (subselector === '.progress-fill') {
              return { style: { width: '0%' } }
            }
            if (subselector === '.progress-count') {
              return { textContent: '' }
            }
            return new HTMLElement()
          })
        },
        '.search-content': { innerHTML: '' },
        '.clear-results': { addEventListener: jest.fn() },
        '.search-result-item.selected': { 
          classList: { remove: jest.fn() },
          dataset: { docId: 'doc-1', line: '5' }
        }
      }
      return mockElements[selector] || new HTMLElement()
    })

    mockContainer.querySelectorAll = jest.fn((selector) => {
      if (selector === '.search-result-item') {
        return [
          { 
            classList: { toggle: jest.fn() }, 
            dataset: { docId: 'doc-1' },
            scrollIntoView: jest.fn()
          },
          { 
            classList: { toggle: jest.fn() }, 
            dataset: { docId: 'doc-2' },
            scrollIntoView: jest.fn()
          }
        ]
      }
      return []
    })

    searchTab = new SearchTab(mockContainer, mockApp)
  })

  afterEach(() => {
    if (searchTab) {
      // Clean up any ongoing searches
      if (searchTab.searchAbortController) {
        searchTab.searchAbortController.abort()
      }
      searchTab = null
    }
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      expect(searchTab.container).toBe(mockContainer)
      expect(searchTab.app).toBe(mockApp)
      expect(searchTab.searchResults).toEqual([])
      expect(searchTab.isSearching).toBe(false)
      expect(searchTab.currentQuery).toBe('')
      expect(searchTab.selectedResultIndex).toBe(-1)
    })

    it('should set container class and attributes', () => {
      expect(mockContainer.className).toBe('search-tab')
      expect(mockContainer.setAttribute).toHaveBeenCalledWith('role', 'search')
      expect(mockContainer.setAttribute).toHaveBeenCalledWith('aria-label', 'Search documents')
    })

    it('should render initial search interface', () => {
      expect(mockContainer.innerHTML).toContain('search-input-group')
      expect(mockContainer.innerHTML).toContain('Search all documents...')
      expect(mockContainer.innerHTML).toContain('search-welcome')
    })
  })

  describe('search functionality', () => {
    it('should perform search with valid query', async () => {
      await searchTab.performSearch('knight')

      expect(mockApp.storageManager.getAllDocuments).toHaveBeenCalled()
      expect(searchTab.searchResults.length).toBeGreaterThan(0)
      expect(searchTab.currentQuery).toBe('knight')
    })

    it('should reject queries that are too short', async () => {
      jest.spyOn(searchTab, 'showMessage')

      await searchTab.performSearch('a')

      expect(searchTab.showMessage).toHaveBeenCalledWith(
        'Please enter at least 2 characters to search'
      )
      expect(searchTab.searchResults).toEqual([])
    })

    it('should handle empty or whitespace queries', async () => {
      jest.spyOn(searchTab, 'showMessage')

      await searchTab.performSearch('   ')

      expect(searchTab.showMessage).toHaveBeenCalledWith(
        'Please enter at least 2 characters to search'
      )
    })

    it('should cancel ongoing search when new search starts', async () => {
      // Clear any previous abort calls
      mockAbort.mockClear()
      
      // Start first search
      const firstSearch = searchTab.performSearch('first query')
      
      // Start second search before first completes  
      const secondSearch = searchTab.performSearch('second query')

      await Promise.all([firstSearch, secondSearch])

      // Should have aborted the first search when starting the second
      expect(mockAbort).toHaveBeenCalled()
    })

    it('should handle search abortion gracefully', async () => {
      // Mock aborted search
      mockApp.storageManager.getAllDocuments = jest.fn()
        .mockRejectedValue(new Error('AbortError'))

      const error = new Error('Search aborted')
      error.name = 'AbortError'
      mockApp.storageManager.getAllDocuments.mockRejectedValue(error)

      await searchTab.performSearch('test')

      // Should not show error for aborted searches
      expect(searchTab.isSearching).toBe(false)
    })
  })

  describe('search in document', () => {
    it('should find matches in document title', () => {
      const doc = mockDocuments[0]
      const results = searchTab.searchInDocument(doc, 'Epic')

      expect(results).toHaveLength(1)
      expect(results[0].field).toBe('title')
      expect(results[0].text).toBe('The Epic Adventure')
    })

    it('should find matches in document content', () => {
      const doc = mockDocuments[0]
      const results = searchTab.searchInDocument(doc, 'knight')

      expect(results.some(r => r.field === 'content')).toBe(true)
      expect(results.some(r => r.text.includes('knight'))).toBe(true)
    })

    it('should find matches in document tags', () => {
      const doc = mockDocuments[0]
      const results = searchTab.searchInDocument(doc, 'fantasy')

      expect(results.some(r => r.field === 'tags')).toBe(true)
      expect(results.some(r => r.text.includes('fantasy'))).toBe(true)
    })

    it('should be case insensitive', () => {
      const doc = mockDocuments[0]
      const results = searchTab.searchInDocument(doc, 'EPIC')

      expect(results.length).toBeGreaterThan(0)
    })

    it('should return line numbers for content matches', () => {
      const doc = {
        ...mockDocuments[0],
        content: 'Line 1\nLine 2 with knight\nLine 3'
      }
      const results = searchTab.searchInDocument(doc, 'knight')

      const contentMatch = results.find(r => r.field === 'content')
      expect(contentMatch.line).toBe(2)
    })
  })

  describe('find matches utility', () => {
    it('should find all occurrences of search term', () => {
      const matches = searchTab.findMatches('The quick brown fox jumps over the lazy dog', 'the')

      expect(matches).toHaveLength(2)
      expect(matches[0].start).toBe(0)
      expect(matches[1].start).toBe(31)
    })

    it('should return positions of matches', () => {
      const matches = searchTab.findMatches('Hello world, hello universe', 'hello')

      expect(matches).toHaveLength(2)
      expect(matches[0].start).toBe(0)
      expect(matches[0].end).toBe(5)
      expect(matches[1].start).toBe(13)
      expect(matches[1].end).toBe(18)
    })

    it('should handle overlapping matches correctly', () => {
      const matches = searchTab.findMatches('aaaa', 'aa')

      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('result display', () => {
    beforeEach(() => {
      searchTab.searchResults = [
        {
          document: mockDocuments[0],
          matches: [
            { field: 'title', text: 'The Epic Adventure', positions: [{ start: 4, end: 8 }] },
            { field: 'content', line: 1, text: 'Once upon a time, in a land far away, there lived a brave knight.', positions: [{ start: 59, end: 65 }] }
          ]
        }
      ]
      searchTab.currentQuery = 'knight'
    })

    it('should display search results', () => {
      searchTab.displayResults()

      const content = mockContainer.querySelector('.search-content')
      expect(content.innerHTML).toContain('search-results-header')
      expect(content.innerHTML).toContain('Found 1 document')
      expect(content.innerHTML).toContain('The Epic Adventure')
    })

    it('should show no results message when empty', () => {
      searchTab.searchResults = []
      searchTab.currentQuery = 'nonexistent'

      searchTab.displayResults()

      const content = mockContainer.querySelector('.search-content')
      expect(content.innerHTML).toContain('No results found')
      expect(content.innerHTML).toContain('nonexistent')
    })

    it('should highlight search terms in results', () => {
      const highlighted = searchTab.highlightText('The brave knight fought', 'knight')

      expect(highlighted).toContain('<mark>knight</mark>')
    })

    it('should truncate long text with context around match', () => {
      const longText = 'A very long piece of text that contains the word knight somewhere in the middle and continues for a while'
      const truncated = searchTab.truncateText(longText, 50)

      expect(truncated.length).toBeLessThanOrEqual(80) // 50 + some ellipsis
      expect(truncated).toContain('knight')
    })

    it('should sort results by relevance', () => {
      searchTab.searchResults = [
        {
          document: mockDocuments[1],
          matches: [{ field: 'content', text: 'content match' }]
        },
        {
          document: mockDocuments[0], 
          matches: [{ field: 'title', text: 'title match' }]
        }
      ]

      searchTab.displayResults()

      // Title matches should come first
      const content = mockContainer.querySelector('.search-content')
      expect(content.innerHTML.indexOf('The Epic Adventure')).toBeLessThan(
        content.innerHTML.indexOf('Mystery of the Lost Treasure')
      )
    })
  })

  describe('result navigation', () => {
    beforeEach(() => {
      const results = [
        { classList: { toggle: jest.fn() }, scrollIntoView: jest.fn() },
        { classList: { toggle: jest.fn() }, scrollIntoView: jest.fn() },
        { classList: { toggle: jest.fn() }, scrollIntoView: jest.fn() }
      ]
      mockContainer.querySelectorAll = jest.fn(() => results)
      searchTab.selectedResultIndex = 0
    })

    it('should navigate down through results', () => {
      searchTab.navigateResults(1)

      expect(searchTab.selectedResultIndex).toBe(1)
    })

    it('should navigate up through results', () => {
      searchTab.selectedResultIndex = 2
      searchTab.navigateResults(-1)

      expect(searchTab.selectedResultIndex).toBe(1)
    })

    it('should not navigate beyond boundaries', () => {
      const results = mockContainer.querySelectorAll('.search-result-item')
      
      // Try to navigate beyond last item
      searchTab.selectedResultIndex = results.length - 1
      searchTab.navigateResults(1)

      expect(searchTab.selectedResultIndex).toBe(results.length - 1)
    })

    it('should scroll selected result into view', () => {
      const results = mockContainer.querySelectorAll('.search-result-item')
      
      searchTab.navigateResults(1)

      expect(results[1].scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    })
  })

  describe('result selection and navigation to document', () => {
    it('should navigate to selected document', async () => {
      await searchTab.navigateToResult('doc-1', 5)

      expect(mockApp.storageManager.getDocument).toHaveBeenCalledWith('doc-1')
      expect(mockApp.loadDocument).toHaveBeenCalledWith(mockDocuments[0])
    })

    it('should navigate to specific line in document', async () => {
      await searchTab.navigateToResult('doc-1', 5)

      setTimeout(() => {
        expect(mockApp.editor.view.dispatch).toHaveBeenCalled()
        expect(mockApp.editor.view.focus).toHaveBeenCalled()
      }, 150)
    })

    it('should handle navigation without line number', async () => {
      await searchTab.navigateToResult('doc-1')

      expect(mockApp.loadDocument).toHaveBeenCalled()
      // Should not try to navigate to specific position
    })

    it('should handle missing document gracefully', async () => {
      mockApp.storageManager.getDocument = jest.fn().mockResolvedValue(null)

      await searchTab.navigateToResult('nonexistent')

      expect(mockApp.loadDocument).not.toHaveBeenCalled()
    })

    it('should calculate position from line number correctly', () => {
      const content = 'Line 1\nLine 2\nLine 3\n'
      const position = searchTab.getPositionFromLine(content, 3)

      expect(position).toBe(14) // After "Line 1\nLine 2\n"
    })
  })

  describe('search progress and cancellation', () => {
    it('should show progress during search', async () => {
      const progressElement = mockContainer.querySelector('.search-progress')
      
      const searchPromise = searchTab.performSearch('test')
      
      expect(progressElement.style.display).toBe('block')
      
      await searchPromise
    })

    it('should hide progress after search completion', async () => {
      const progressElement = mockContainer.querySelector('.search-progress')
      
      await searchTab.performSearch('test')
      
      expect(progressElement.style.display).toBe('none')
    })

    it('should update progress during search', async () => {
      jest.spyOn(searchTab, 'updateProgress')
      
      await searchTab.performSearch('test')
      
      expect(searchTab.updateProgress).toHaveBeenCalled()
    })

    it('should allow search cancellation', () => {
      const searchPromise = searchTab.performSearch('test')
      
      searchTab.stopSearch()
      
      expect(searchTab.searchAbortController.abort).toHaveBeenCalled()
      expect(searchTab.isSearching).toBe(false)
    })

    it('should toggle search/stop buttons correctly', () => {
      const searchButton = mockContainer.querySelector('.search-button')
      const stopButton = mockContainer.querySelector('.search-stop')
      
      searchTab.toggleSearchButtons(true)
      
      expect(searchButton.style.display).toBe('none')
      expect(stopButton.style.display).toBe('block')
    })
  })

  describe('clear functionality', () => {
    beforeEach(() => {
      searchTab.searchResults = [{ document: mockDocuments[0], matches: [] }]
      searchTab.currentQuery = 'test'
      searchTab.selectedResultIndex = 0
    })

    it('should clear search results', () => {
      searchTab.clearResults()

      expect(searchTab.searchResults).toEqual([])
      expect(searchTab.currentQuery).toBe('')
      expect(searchTab.selectedResultIndex).toBe(-1)
    })

    it('should reset search interface to welcome state', () => {
      searchTab.clearResults()

      const content = mockContainer.querySelector('.search-content')
      expect(content.innerHTML).toContain('search-welcome')
      expect(content.innerHTML).toContain('Search across all documents')
    })

    it('should focus search input after clearing', () => {
      const searchInput = mockContainer.querySelector('.search-input')
      
      searchTab.clearResults()

      expect(searchInput.focus).toHaveBeenCalled()
      expect(searchInput.value).toBe('')
    })
  })

  describe('keyboard navigation', () => {
    let mockEvent

    beforeEach(() => {
      mockEvent = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
        target: {
          classList: {
            contains: jest.fn().mockReturnValue(false) // Not search input by default
          }
        }
      }
      searchTab.searchResults = [
        { document: mockDocuments[0], matches: [] },
        { document: mockDocuments[1], matches: [] }
      ]
    })

    it('should handle arrow key navigation', () => {
      jest.spyOn(searchTab, 'navigateResults')

      searchTab.container.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1](mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(searchTab.navigateResults).toHaveBeenCalledWith(1)
    })

    it('should handle Enter key for selection', () => {
      mockEvent.key = 'Enter'
      const mockSelected = {
        dataset: { docId: 'doc-1', line: '5' }
      }
      mockContainer.querySelector = jest.fn(() => mockSelected)
      jest.spyOn(searchTab, 'navigateToResult')

      searchTab.container.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1](mockEvent)

      expect(searchTab.navigateToResult).toHaveBeenCalledWith('doc-1', 5)
    })

    it('should ignore keydown on search input', () => {
      mockEvent.target = { classList: { contains: jest.fn().mockReturnValue(true) } }
      jest.spyOn(searchTab, 'navigateResults')

      searchTab.container.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1](mockEvent)

      expect(searchTab.navigateResults).not.toHaveBeenCalled()
    })
  })

  describe('activation and focus', () => {
    it('should focus search input on activation', () => {
      const searchInput = mockContainer.querySelector('.search-input')
      
      searchTab.onActivate()

      expect(searchInput.focus).toHaveBeenCalled()
    })

    it('should set query and perform search', () => {
      const searchInput = mockContainer.querySelector('.search-input')
      jest.spyOn(searchTab, 'performSearch')

      searchTab.setQuery('test query')

      expect(searchInput.value).toBe('test query')
      expect(searchTab.performSearch).toHaveBeenCalledWith('test query')
    })

    it('should only focus input for empty query', () => {
      const searchInput = mockContainer.querySelector('.search-input')
      jest.spyOn(searchTab, 'performSearch')

      searchTab.setQuery('')

      expect(searchInput.focus).toHaveBeenCalled()
      expect(searchTab.performSearch).not.toHaveBeenCalled()
    })
  })

  describe('utility functions', () => {
    it('should format time ago correctly', () => {
      const now = new Date()
      const today = searchTab.formatTimeAgo(now.toISOString())
      const yesterday = searchTab.formatTimeAgo(
        new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      )

      expect(today).toBe('Today')
      expect(yesterday).toBe('Yesterday')
    })

    it('should escape HTML in text', () => {
      const escaped = searchTab.escapeHtml('<script>alert("xss")</script>')

      expect(escaped).not.toContain('<script>')
      expect(escaped).toContain('&lt;script&gt;')
    })

    it('should escape regex special characters', () => {
      const escaped = searchTab.escapeRegex('.*+?^${}()|[]\\')

      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\')
    })

    it('should create delay promise', async () => {
      const start = Date.now()
      await searchTab.delay(50)
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(45) // Allow for timing variance
    })
  })

  describe('error handling', () => {
    it('should handle storage errors during search', async () => {
      mockApp.storageManager.getAllDocuments = jest.fn().mockRejectedValue(
        new Error('Storage error')
      )
      jest.spyOn(searchTab, 'showError')

      await searchTab.performSearch('test')

      expect(searchTab.showError).toHaveBeenCalledWith('Search failed. Please try again.')
    })

    it('should handle navigation errors gracefully', async () => {
      mockApp.storageManager.getDocument = jest.fn().mockRejectedValue(
        new Error('Navigation error')
      )

      await searchTab.navigateToResult('doc-1')

      // Should not crash, error is logged to console
      expect(mockApp.loadDocument).not.toHaveBeenCalled()
    })

    it('should show appropriate error messages', () => {
      searchTab.showError('Test error message')

      const content = mockContainer.querySelector('.search-content')
      expect(content.innerHTML).toContain('search-error')
      expect(content.innerHTML).toContain('Test error message')
    })
  })
})