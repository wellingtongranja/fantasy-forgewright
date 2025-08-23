/**
 * Search Engine Tests - TDD approach for full-text search
 */
import { SearchEngine } from '../search-engine.js'

// Mock StorageManager
const mockStorageManager = {
  getAllDocuments: jest.fn(),
  searchDocuments: jest.fn()
}

// Test documents
const testDocuments = [
  {
    id: 'doc_1',
    title: 'The Dragon Quest',
    content:
      '# The Dragon Quest\n\nA brave knight sets out to defeat the ancient dragon that terrorizes the kingdom. The quest will take him through dark forests and treacherous mountains.',
    tags: ['fantasy', 'adventure', 'dragon'],
    updatedAt: '2025-01-15T10:00:00.000Z'
  },
  {
    id: 'doc_2',
    title: 'Space Exploration Guide',
    content:
      '# Space Exploration\n\nHumanity ventures into the cosmos, seeking new worlds and alien civilizations. Advanced spacecraft navigate the void between stars.',
    tags: ['sci-fi', 'space', 'exploration'],
    updatedAt: '2025-01-14T15:30:00.000Z'
  },
  {
    id: 'doc_3',
    title: 'Cooking with Magic',
    content:
      '# Culinary Magic\n\nLearn to prepare enchanted meals using mystical ingredients. Dragon scales add a spicy flavor to any dish.',
    tags: ['fantasy', 'cooking', 'magic'],
    updatedAt: '2025-01-16T08:15:00.000Z'
  },
  {
    id: 'doc_4',
    title: 'JavaScript Fundamentals',
    content:
      '# JavaScript Basics\n\nVariables, functions, and objects form the foundation of JavaScript programming. Modern development uses ES6+ features.',
    tags: ['programming', 'javascript', 'tutorial'],
    updatedAt: '2025-01-13T12:00:00.000Z'
  }
]

describe('SearchEngine', () => {
  let searchEngine

  beforeEach(async () => {
    mockStorageManager.getAllDocuments.mockResolvedValue(testDocuments)
    mockStorageManager.searchDocuments.mockImplementation((query) => {
      return Promise.resolve(
        testDocuments.filter(
          (doc) =>
            doc.title.toLowerCase().includes(query.toLowerCase()) ||
            doc.content.toLowerCase().includes(query.toLowerCase())
        )
      )
    })

    searchEngine = new SearchEngine(mockStorageManager)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Index Building', () => {
    it('should build search index from documents', async () => {
      await searchEngine.buildIndex()

      expect(searchEngine.index).toBeTruthy()
      expect(searchEngine.documents).toEqual(testDocuments)
      expect(searchEngine.lastIndexUpdate).toBeTruthy()
      expect(mockStorageManager.getAllDocuments).toHaveBeenCalled()
    })

    it('should not rebuild index if already indexing', async () => {
      searchEngine.isIndexing = true

      await searchEngine.buildIndex()

      expect(mockStorageManager.getAllDocuments).not.toHaveBeenCalled()
    })

    it('should handle index building errors gracefully', async () => {
      mockStorageManager.getAllDocuments.mockRejectedValue(new Error('Database error'))

      await searchEngine.buildIndex()

      expect(searchEngine.index).toBeNull()
      expect(searchEngine.isIndexing).toBe(false)
    })
  })

  describe('Content Cleaning', () => {
    it('should clean markdown formatting from content', () => {
      const markdownContent = '# Title\n\n**Bold text** and *italic* and `code` and [link](url)'
      const cleaned = searchEngine.cleanContent(markdownContent)

      expect(cleaned).toBe('Title Bold text and italic and code and link')
      expect(cleaned).not.toContain('**')
      expect(cleaned).not.toContain('`')
      expect(cleaned).not.toContain('[')
      expect(cleaned).not.toContain('](')
    })

    it('should normalize whitespace', () => {
      const content = 'Text   with\n\nmultiple\n\nlines   and    spaces'
      const cleaned = searchEngine.cleanContent(content)

      expect(cleaned).toBe('Text with multiple lines and spaces')
    })

    it('should handle empty or null content', () => {
      expect(searchEngine.cleanContent('')).toBe('')
      expect(searchEngine.cleanContent(null)).toBe('')
      expect(searchEngine.cleanContent(undefined)).toBe('')
    })
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      await searchEngine.buildIndex()
    })

    it('should find documents by title', async () => {
      const results = await searchEngine.search('dragon')

      expect(results).toHaveLength(2)
      expect(results[0].document.title).toBe('The Dragon Quest')
      expect(results[1].document.title).toBe('Cooking with Magic')
    })

    it('should find documents by content', async () => {
      const results = await searchEngine.search('knight')

      expect(results).toHaveLength(1)
      expect(results[0].document.title).toBe('The Dragon Quest')
    })

    it('should find documents by tags', async () => {
      const results = await searchEngine.search('fantasy')

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.document.tags.includes('fantasy'))).toBe(true)
    })

    it('should return results sorted by relevance', async () => {
      const results = await searchEngine.search('dragon')

      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
      expect(results[0].document.title).toBe('The Dragon Quest') // Title match should rank higher
    })

    it('should limit results', async () => {
      const results = await searchEngine.search('the', { limit: 2 })

      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should handle fuzzy search', async () => {
      const results = await searchEngine.search('dragn', { fuzzy: true })

      expect(results).toHaveLength(2) // Should find "dragon" despite typo
    })

    it('should return empty array for empty query', async () => {
      const results = await searchEngine.search('')
      expect(results).toEqual([])

      const results2 = await searchEngine.search('   ')
      expect(results2).toEqual([])
    })

    it('should include match information', async () => {
      const results = await searchEngine.search('dragon')

      expect(results[0].matches).toBeTruthy()
      expect(results[0].matches.length).toBeGreaterThan(0)
      expect(results[0].relevance).toBeGreaterThan(0)
    })
  })

  describe('Match Extraction', () => {
    it('should extract title matches', () => {
      const document = testDocuments[0]
      const matches = searchEngine.extractMatches(document, 'dragon')

      const titleMatch = matches.find((m) => m.field === 'title')
      expect(titleMatch).toBeTruthy()
      expect(titleMatch.snippets.length).toBeGreaterThan(0)
    })

    it('should extract content matches with context', () => {
      const document = testDocuments[0]
      const matches = searchEngine.extractMatches(document, 'knight')

      const contentMatch = matches.find((m) => m.field === 'content')
      expect(contentMatch).toBeTruthy()
      expect(contentMatch.snippets[0].text).toContain('knight')
    })

    it('should extract tag matches', () => {
      const document = testDocuments[0]
      const matches = searchEngine.extractMatches(document, 'fantasy')

      const tagMatch = matches.find((m) => m.field === 'tags')
      expect(tagMatch).toBeTruthy()
      expect(tagMatch.snippets.some((s) => s.text === 'fantasy')).toBe(true)
    })

    it('should limit content snippets', () => {
      const document = {
        ...testDocuments[0],
        content: 'test '.repeat(1000) // Very long content
      }
      const matches = searchEngine.extractMatches(document, 'test')

      const contentMatch = matches.find((m) => m.field === 'content')
      expect(contentMatch.snippets.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Relevance Calculation', () => {
    it('should boost recently modified documents', () => {
      const recentDoc = {
        ...testDocuments[0],
        updatedAt: new Date().toISOString()
      }

      const relevance = searchEngine.calculateRelevance(recentDoc, 'dragon', 1.0)
      expect(relevance).toBeGreaterThan(1.0)
    })

    it('should boost substantial documents', () => {
      const substantialDoc = {
        ...testDocuments[0],
        content: 'a'.repeat(2000) // 2KB content
      }

      const relevance = searchEngine.calculateRelevance(substantialDoc, 'dragon', 1.0)
      expect(relevance).toBeGreaterThan(1.0)
    })

    it('should boost tagged documents', () => {
      const taggedDoc = {
        ...testDocuments[0],
        tags: ['fantasy', 'adventure']
      }

      const relevance = searchEngine.calculateRelevance(taggedDoc, 'dragon', 1.0)
      expect(relevance).toBeGreaterThan(1.0)
    })
  })

  describe('Index Management', () => {
    beforeEach(async () => {
      await searchEngine.buildIndex()
    })

    it('should detect when index needs rebuilding', async () => {
      // Simulate new documents
      mockStorageManager.getAllDocuments.mockResolvedValue([
        ...testDocuments,
        {
          id: 'doc_5',
          title: 'New Document',
          content: 'New content',
          tags: [],
          updatedAt: new Date().toISOString()
        }
      ])

      const shouldRebuild = await searchEngine.shouldRebuildIndex()
      expect(shouldRebuild).toBe(true)
    })

    it('should not rebuild index if no changes', async () => {
      const shouldRebuild = await searchEngine.shouldRebuildIndex()
      expect(shouldRebuild).toBe(false)
    })

    it('should rebuild index when documents are modified', async () => {
      const futureDate = new Date(Date.now() + 10000).toISOString() // 10 seconds in the future
      const modifiedDocs = testDocuments.map((doc) => ({
        ...doc,
        updatedAt: futureDate
      }))

      mockStorageManager.getAllDocuments.mockResolvedValue(modifiedDocs)

      const shouldRebuild = await searchEngine.shouldRebuildIndex()
      expect(shouldRebuild).toBe(true)
    })
  })

  describe('Suggestions', () => {
    beforeEach(async () => {
      await searchEngine.buildIndex()
    })

    it('should provide search suggestions', () => {
      const suggestions = searchEngine.getSuggestions('drag')

      expect(suggestions).toContain('dragon')
      expect(suggestions.length).toBeLessThanOrEqual(5)
    })

    it('should return empty suggestions for short queries', () => {
      const suggestions = searchEngine.getSuggestions('d')
      expect(suggestions).toEqual([])
    })

    it('should return empty suggestions when no index', () => {
      searchEngine.index = null
      const suggestions = searchEngine.getSuggestions('dragon')
      expect(suggestions).toEqual([])
    })
  })

  describe('Fallback Search', () => {
    it('should use fallback search when Lunr fails', async () => {
      await searchEngine.buildIndex()

      // Mock the search method to throw an error
      const originalSearch = searchEngine.index.search
      searchEngine.index.search = jest.fn(() => {
        throw new Error('Lunr error')
      })

      const results = await searchEngine.search('dragon')

      expect(results).toHaveLength(2)
      expect(mockStorageManager.searchDocuments).toHaveBeenCalledWith('dragon')

      // Restore original method
      searchEngine.index.search = originalSearch
    })

    it('should handle fallback search errors', async () => {
      await searchEngine.buildIndex()

      // Mock both Lunr and storage to fail
      searchEngine.index.search = jest.fn(() => {
        throw new Error('Lunr error')
      })

      mockStorageManager.searchDocuments.mockRejectedValue(new Error('Storage error'))

      const results = await searchEngine.search('dragon')
      expect(results).toEqual([])
    })
  })

  describe('Statistics', () => {
    it('should provide search statistics', async () => {
      await searchEngine.buildIndex()

      const stats = searchEngine.getStats()

      expect(stats.documentCount).toBe(testDocuments.length)
      expect(stats.indexSize).toBeGreaterThan(0)
      expect(stats.lastUpdated).toBeTruthy()
      expect(stats.isIndexing).toBe(false)
    })

    it('should handle stats when no index', () => {
      const stats = searchEngine.getStats()

      expect(stats.documentCount).toBe(0)
      expect(stats.indexSize).toBe(0)
      expect(stats.lastUpdated).toBeNull()
    })
  })
})
