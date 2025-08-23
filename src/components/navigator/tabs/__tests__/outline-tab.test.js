/**
 * Outline Tab Tests
 * Tests markdown parsing, outline generation, and navigation functionality
 */

import { OutlineTab } from '../outline-tab.js'

// Mock OutlineParser
jest.mock('../../utils/outline-parser.js', () => ({
  OutlineParser: {
    parse: jest.fn(),
    flatten: jest.fn(),
    search: jest.fn(),
    getPositionFromLine: jest.fn()
  }
}))

import { OutlineParser } from '../../utils/outline-parser.js'

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

describe('OutlineTab', () => {
  let outlineTab
  let mockContainer
  let mockApp

  const mockOutlineStructure = [
    {
      id: 'heading-1',
      text: 'Chapter 1: The Beginning',
      level: 1,
      line: 1,
      children: [
        {
          id: 'heading-3',
          text: 'The Hero\'s Journey',
          level: 2,
          line: 3,
          children: []
        },
        {
          id: 'heading-5',
          text: 'First Encounter',
          level: 2,
          line: 5,
          children: []
        }
      ]
    },
    {
      id: 'heading-8',
      text: 'Chapter 2: The Adventure',
      level: 1,
      line: 8,
      children: [
        {
          id: 'heading-10',
          text: 'Into the Unknown',
          level: 2,
          line: 10,
          children: []
        }
      ]
    }
  ]

  const mockDocument = {
    id: 'doc-123',
    title: 'Epic Fantasy Tale',
    content: '# Chapter 1: The Beginning\n\n## The Hero\'s Journey\n\n## First Encounter\n\n# Chapter 2: The Adventure\n\n## Into the Unknown'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockContainer = new HTMLElement()
    mockApp = {
      editor: {
        view: {
          dispatch: jest.fn(),
          focus: jest.fn()
        },
        getContent: jest.fn().mockReturnValue(mockDocument.content)
      },
      currentDocument: mockDocument,
      showNotification: jest.fn()
    }

    // Mock container DOM structure
    mockContainer.querySelector = jest.fn((selector) => {
      const mockElements = {
        '.outline-title': { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
        '.outline-search': { value: '', addEventListener: jest.fn() },
        '.outline-content': { innerHTML: '', addEventListener: jest.fn() },
        '.outline-item.selected': { classList: { remove: jest.fn() } }
      }
      return mockElements[selector] || new HTMLElement()
    })

    mockContainer.querySelectorAll = jest.fn((selector) => {
      if (selector === '.outline-item') {
        return [
          { classList: { add: jest.fn(), remove: jest.fn() }, dataset: { itemId: 'heading-1' } },
          { classList: { add: jest.fn(), remove: jest.fn() }, dataset: { itemId: 'heading-3' } }
        ]
      }
      return []
    })

    // Setup OutlineParser mocks
    OutlineParser.parse.mockReturnValue(mockOutlineStructure)
    OutlineParser.flatten.mockReturnValue([
      { id: 'heading-1', text: 'Chapter 1: The Beginning', level: 1, line: 1 },
      { id: 'heading-3', text: 'The Hero\'s Journey', level: 2, line: 3 },
      { id: 'heading-5', text: 'First Encounter', level: 2, line: 5 },
      { id: 'heading-8', text: 'Chapter 2: The Adventure', level: 1, line: 8 },
      { id: 'heading-10', text: 'Into the Unknown', level: 2, line: 10 }
    ])
    OutlineParser.getPositionFromLine.mockImplementation((content, line) => line * 10)

    outlineTab = new OutlineTab(mockContainer, mockApp)
  })

  afterEach(() => {
    if (outlineTab) {
      outlineTab = null
    }
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      expect(outlineTab.container).toBe(mockContainer)
      expect(outlineTab.app).toBe(mockApp)
      expect(outlineTab.outline).toEqual([])
      expect(outlineTab.filteredOutline).toEqual([])
      expect(outlineTab.selectedItemId).toBeNull()
    })

    it('should set container class and attributes', () => {
      expect(mockContainer.className).toBe('outline-tab')
      expect(mockContainer.setAttribute).toHaveBeenCalledWith('role', 'tabpanel')
      expect(mockContainer.setAttribute).toHaveBeenCalledWith('aria-label', 'Document outline')
    })

    it('should generate initial outline if document exists', () => {
      expect(OutlineParser.parse).toHaveBeenCalledWith(mockDocument.content)
    })
  })

  describe('outline generation', () => {
    it('should parse document content into outline', () => {
      outlineTab.updateOutline(mockDocument)

      expect(OutlineParser.parse).toHaveBeenCalledWith(mockDocument.content)
      expect(outlineTab.outline).toEqual(mockOutlineStructure)
    })

    it('should update document title in header', () => {
      const titleElement = mockContainer.querySelector('.outline-title')
      
      outlineTab.updateOutline(mockDocument)

      expect(titleElement.textContent).toBe('Epic Fantasy Tale')
    })

    it('should handle empty content gracefully', () => {
      const emptyDoc = { ...mockDocument, content: '' }
      OutlineParser.parse.mockReturnValue([])

      outlineTab.updateOutline(emptyDoc)

      expect(outlineTab.outline).toEqual([])
    })

    it('should handle document without content', () => {
      const noContentDoc = { id: 'doc-456', title: 'Empty Document' }
      OutlineParser.parse.mockReturnValue([])

      outlineTab.updateOutline(noContentDoc)

      expect(OutlineParser.parse).toHaveBeenCalledWith('')
    })
  })

  describe('outline rendering', () => {
    beforeEach(() => {
      outlineTab.outline = mockOutlineStructure
      outlineTab.filteredOutline = mockOutlineStructure
    })

    it('should render nested outline structure', () => {
      const rendered = outlineTab.renderOutline()

      expect(rendered).toContain('outline-item level-1')
      expect(rendered).toContain('outline-item level-2')
      expect(rendered).toContain('Chapter 1: The Beginning')
      expect(rendered).toContain('The Hero\'s Journey')
    })

    it('should include line numbers in items', () => {
      const rendered = outlineTab.renderOutline()

      expect(rendered).toContain('data-line="1"')
      expect(rendered).toContain('data-line="3"')
      expect(rendered).toContain('data-line="5"')
    })

    it('should include item IDs for navigation', () => {
      const rendered = outlineTab.renderOutline()

      expect(rendered).toContain('data-item-id="heading-1"')
      expect(rendered).toContain('data-item-id="heading-3"')
    })

    it('should handle empty outline', () => {
      outlineTab.outline = []
      outlineTab.filteredOutline = []

      const rendered = outlineTab.renderOutline()

      expect(rendered).toContain('No headings found')
    })

    it('should render hierarchical structure correctly', () => {
      const rendered = outlineTab.renderOutline()

      // Should have nested structure
      expect(rendered).toContain('<div class="outline-children">')
      expect(rendered.split('outline-children').length - 1).toBeGreaterThan(0)
    })
  })

  describe('outline navigation', () => {
    beforeEach(() => {
      outlineTab.outline = mockOutlineStructure
    })

    it('should navigate to heading on click', () => {
      const mockEvent = {
        target: { 
          closest: jest.fn().mockReturnValue({ 
            dataset: { itemId: 'heading-3', line: '3' } 
          }) 
        }
      }

      outlineTab.handleItemClick(mockEvent)

      expect(OutlineParser.getPositionFromLine).toHaveBeenCalledWith(mockDocument.content, 3)
      expect(mockApp.editor.view.dispatch).toHaveBeenCalledWith({
        selection: { anchor: 30, head: 30 },
        scrollIntoView: true
      })
      expect(mockApp.editor.view.focus).toHaveBeenCalled()
    })

    it('should select clicked item', () => {
      const mockEvent = {
        target: { 
          closest: jest.fn().mockReturnValue({ 
            dataset: { itemId: 'heading-5' } 
          }) 
        }
      }

      outlineTab.handleItemClick(mockEvent)

      expect(outlineTab.selectedItemId).toBe('heading-5')
    })

    it('should update visual selection', () => {
      outlineTab.selectItem('heading-3')

      const items = mockContainer.querySelectorAll('.outline-item')
      expect(items[1].classList.add).toHaveBeenCalledWith('selected')
    })

    it('should clear previous selection', () => {
      const mockSelected = { classList: { remove: jest.fn() } }
      mockContainer.querySelector = jest.fn(() => mockSelected)

      outlineTab.selectItem('heading-1')

      expect(mockSelected.classList.remove).toHaveBeenCalledWith('selected')
    })
  })

  describe('outline search and filtering', () => {
    beforeEach(() => {
      outlineTab.outline = mockOutlineStructure
    })

    it('should filter outline by search query', () => {
      OutlineParser.search.mockReturnValue([
        { id: 'heading-1', text: 'Chapter 1: The Beginning', level: 1, line: 1 }
      ])

      outlineTab.filterOutline('Chapter 1')

      expect(OutlineParser.search).toHaveBeenCalledWith(mockOutlineStructure, 'Chapter 1')
      expect(outlineTab.filteredOutline).toHaveLength(1)
    })

    it('should show all items when search is empty', () => {
      outlineTab.filterOutline('')

      expect(outlineTab.filteredOutline).toEqual(outlineTab.outline)
    })

    it('should update display after filtering', () => {
      jest.spyOn(outlineTab, 'renderOutline')

      outlineTab.filterOutline('Hero')

      expect(outlineTab.renderOutline).toHaveBeenCalled()
    })

    it('should handle case-insensitive search', () => {
      OutlineParser.search.mockReturnValue([])

      outlineTab.filterOutline('CHAPTER')

      expect(OutlineParser.search).toHaveBeenCalledWith(mockOutlineStructure, 'CHAPTER')
    })
  })

  describe('keyboard navigation', () => {
    beforeEach(() => {
      outlineTab.outline = mockOutlineStructure
      outlineTab.filteredOutline = OutlineParser.flatten(mockOutlineStructure)
    })

    it('should handle arrow key navigation', () => {
      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
        target: { closest: jest.fn().mockReturnValue({ dataset: { itemId: 'heading-1' } }) }
      }

      outlineTab.handleKeyboardNavigation(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(outlineTab.selectedItemId).toBe('heading-3') // Next item
    })

    it('should handle Enter key for navigation', () => {
      outlineTab.selectedItemId = 'heading-5'
      const mockEvent = {
        key: 'Enter',
        preventDefault: jest.fn()
      }

      outlineTab.handleKeyboardNavigation(mockEvent)

      expect(mockApp.editor.view.dispatch).toHaveBeenCalled()
    })

    it('should wrap navigation at boundaries', () => {
      const flatOutline = OutlineParser.flatten.mockReturnValue([
        { id: 'heading-1', text: 'First', level: 1, line: 1 },
        { id: 'heading-2', text: 'Last', level: 1, line: 2 }
      ])
      outlineTab.filteredOutline = flatOutline

      // Navigate down from last item should wrap to first
      outlineTab.selectedItemId = 'heading-2'
      outlineTab.navigateDown()

      expect(outlineTab.selectedItemId).toBe('heading-1')
    })

    it('should navigate up correctly', () => {
      outlineTab.selectedItemId = 'heading-3'
      outlineTab.navigateUp()

      expect(outlineTab.selectedItemId).toBe('heading-1')
    })
  })

  describe('outline statistics', () => {
    beforeEach(() => {
      outlineTab.outline = mockOutlineStructure
    })

    it('should display heading count', () => {
      const stats = outlineTab.getOutlineStats()
      
      expect(stats.totalHeadings).toBe(5) // Based on flattened structure
    })

    it('should show heading distribution by level', () => {
      const stats = outlineTab.getOutlineStats()
      
      expect(stats.byLevel).toBeDefined()
      expect(stats.byLevel[1]).toBe(2) // Two h1 headings
      expect(stats.byLevel[2]).toBe(3) // Three h2 headings
    })

    it('should handle empty outline stats', () => {
      outlineTab.outline = []
      
      const stats = outlineTab.getOutlineStats()
      
      expect(stats.totalHeadings).toBe(0)
      expect(stats.byLevel).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 })
    })
  })

  describe('outline refresh and updates', () => {
    it('should refresh outline from current document', () => {
      jest.spyOn(outlineTab, 'updateOutline')

      outlineTab.refresh()

      expect(outlineTab.updateOutline).toHaveBeenCalledWith(mockApp.currentDocument)
    })

    it('should handle missing current document', () => {
      mockApp.currentDocument = null

      outlineTab.refresh()

      expect(outlineTab.outline).toEqual([])
    })

    it('should maintain selected item after refresh if possible', () => {
      outlineTab.selectedItemId = 'heading-3'
      
      outlineTab.refresh()

      expect(outlineTab.selectedItemId).toBe('heading-3')
    })

    it('should clear selected item if not found after refresh', () => {
      outlineTab.selectedItemId = 'non-existent-heading'
      OutlineParser.flatten.mockReturnValue([
        { id: 'heading-1', text: 'Chapter 1', level: 1, line: 1 }
      ])

      outlineTab.refresh()

      expect(outlineTab.selectedItemId).toBeNull()
    })
  })

  describe('activation and focus', () => {
    it('should focus first item on activation', () => {
      const firstItem = { focus: jest.fn(), dataset: { itemId: 'heading-1' } }
      mockContainer.querySelector = jest.fn(() => firstItem)
      outlineTab.outline = mockOutlineStructure

      outlineTab.onActivate()

      expect(firstItem.focus).toHaveBeenCalled()
      expect(outlineTab.selectedItemId).toBe('heading-1')
    })

    it('should handle activation with empty outline', () => {
      outlineTab.outline = []
      mockContainer.querySelector = jest.fn(() => null)

      expect(() => outlineTab.onActivate()).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle outline parsing errors', () => {
      OutlineParser.parse.mockImplementation(() => {
        throw new Error('Parse error')
      })

      outlineTab.updateOutline(mockDocument)

      expect(outlineTab.outline).toEqual([])
    })

    it('should handle navigation errors gracefully', () => {
      mockApp.editor.view.dispatch.mockImplementation(() => {
        throw new Error('Navigation error')
      })

      const mockEvent = {
        target: { 
          closest: jest.fn().mockReturnValue({ 
            dataset: { itemId: 'heading-1', line: '1' } 
          }) 
        }
      }

      expect(() => outlineTab.handleItemClick(mockEvent)).not.toThrow()
      expect(mockApp.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('Failed to navigate'),
        'error'
      )
    })

    it('should handle missing editor view', () => {
      mockApp.editor.view = null

      const mockEvent = {
        target: { 
          closest: jest.fn().mockReturnValue({ 
            dataset: { itemId: 'heading-1', line: '1' } 
          }) 
        }
      }

      expect(() => outlineTab.handleItemClick(mockEvent)).not.toThrow()
    })
  })

  describe('accessibility', () => {
    it('should provide proper ARIA labels', () => {
      const rendered = outlineTab.renderOutline()

      expect(rendered).toContain('role="treeitem"')
      expect(rendered).toContain('tabindex="0"')
    })

    it('should support screen reader navigation', () => {
      const rendered = outlineTab.renderOutline()

      expect(rendered).toContain('aria-level="1"')
      expect(rendered).toContain('aria-level="2"')
    })

    it('should indicate selected state for screen readers', () => {
      outlineTab.selectedItemId = 'heading-1'
      const rendered = outlineTab.renderOutline()

      expect(rendered).toContain('aria-selected="true"')
    })
  })
})