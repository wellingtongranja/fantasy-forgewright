/**
 * Search Engine - Full-text search powered by Lunr.js
 * Provides fast, fuzzy search across document content, titles, and tags
 */

import lunr from 'lunr'

export class SearchEngine {
  constructor(storageManager) {
    this.storageManager = storageManager
    this.index = null
    this.documents = []
    this.isIndexing = false
    this.lastIndexUpdate = null
  }

  /**
   * Initialize or rebuild the search index
   */
  async buildIndex() {
    if (this.isIndexing) return
    
    this.isIndexing = true
    
    try {
      // Fetch all documents
      this.documents = await this.storageManager.getAllDocuments()
      
      // Build Lunr index
      const self = this
      this.index = lunr(function() {
        this.ref('id')
        this.field('title', { boost: 3 }) // Title has higher importance
        this.field('content', { boost: 1 })
        this.field('tags', { boost: 2 }) // Tags are important for categorization
        
        // Add documents to index
        for (const doc of self.documents) {
          this.add({
            id: doc.id,
            title: doc.title || '',
            content: self.cleanContent(doc.content || ''),
            tags: (doc.tags || []).join(' ')
          })
        }
      })
      
      this.lastIndexUpdate = Date.now()
      console.log(`Search index built with ${this.documents.length} documents`)
      
    } catch (error) {
      console.error('Failed to build search index:', error)
    } finally {
      this.isIndexing = false
    }
  }

  /**
   * Clean markdown content for better search indexing
   */
  cleanContent(content) {
    if (!content || typeof content !== 'string') {
      return ''
    }
    
    return content
      .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .replace(/`(.*?)`/g, '$1') // Remove inline code formatting
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1') // Remove images, keep alt text
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Search documents using fuzzy matching
   */
  async search(query, options = {}) {
    const {
      limit = 10,
      includeMatches = true,
      fuzzy = true,
      boost = {}
    } = options

    // Ensure index is built
    if (!this.index) {
      await this.buildIndex()
    }

    // Check if index needs updating (if documents were modified)
    if (await this.shouldRebuildIndex()) {
      await this.buildIndex()
    }

    if (!query || query.trim().length === 0) {
      return []
    }

    try {
      // Build search query
      let searchQuery = query.trim()
      
      if (fuzzy) {
        // Add fuzzy matching (~1 allows 1 character difference)
        searchQuery = searchQuery.split(' ')
          .map(term => term.length > 3 ? `${term}~1` : term)
          .join(' ')
      }

      // Perform search
      const results = this.index.search(searchQuery)
      
      // Get full document data and add search metadata
      const searchResults = results
        .slice(0, limit)
        .map(result => {
          const doc = this.documents.find(d => d.id === result.ref)
          if (!doc) return null
          
          return {
            document: doc,
            score: result.score,
            matches: this.extractMatches(doc, query),
            relevance: this.calculateRelevance(doc, query, result.score)
          }
        })
        .filter(result => result !== null)

      return searchResults
    } catch (error) {
      console.error('Search failed:', error)
      // Fallback to simple text search
      return this.fallbackSearch(query, limit)
    }
  }

  /**
   * Extract matching snippets from document content
   */
  extractMatches(document, query) {
    const matches = []
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)
    
    // Search in title
    const titleMatches = this.findMatches(document.title || '', queryTerms)
    if (titleMatches.length > 0) {
      matches.push({
        field: 'title',
        snippets: titleMatches
      })
    }

    // Search in content
    const contentMatches = this.findMatches(document.content || '', queryTerms, 100)
    if (contentMatches.length > 0) {
      matches.push({
        field: 'content',
        snippets: contentMatches.slice(0, 3) // Limit to 3 content snippets
      })
    }

    // Search in tags
    const tagMatches = (document.tags || []).filter(tag =>
      queryTerms.some(term => tag.toLowerCase().includes(term))
    )
    if (tagMatches.length > 0) {
      matches.push({
        field: 'tags',
        snippets: tagMatches.map(tag => ({ text: tag, highlight: true }))
      })
    }

    return matches
  }

  /**
   * Find matching text snippets with context
   */
  findMatches(text, queryTerms, contextLength = 50) {
    const matches = []
    const lowerText = text.toLowerCase()
    
    queryTerms.forEach(term => {
      let startIndex = 0
      while (true) {
        const index = lowerText.indexOf(term, startIndex)
        if (index === -1) break
        
        // Extract context around match
        const start = Math.max(0, index - contextLength)
        const end = Math.min(text.length, index + term.length + contextLength)
        const snippet = text.substring(start, end)
        
        matches.push({
          text: snippet,
          highlight: term,
          position: index
        })
        
        startIndex = index + term.length
      }
    })
    
    return matches
  }

  /**
   * Calculate document relevance score
   */
  calculateRelevance(document, query, lunrScore) {
    let relevance = lunrScore
    
    // Boost recently modified documents
    const daysSinceUpdate = (Date.now() - new Date(document.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate < 7) {
      relevance *= 1.2 // 20% boost for documents modified in last week
    }
    
    // Boost documents with more content (up to a point)
    const contentLength = (document.content || '').length
    if (contentLength > 500 && contentLength < 5000) {
      relevance *= 1.1 // 10% boost for substantial documents
    }
    
    // Boost documents with tags
    if (document.tags && document.tags.length > 0) {
      relevance *= 1.05 // 5% boost for tagged documents
    }
    
    return relevance
  }

  /**
   * Fallback search when Lunr fails
   */
  async fallbackSearch(query, limit) {
    try {
      const results = await this.storageManager.searchDocuments(query)
      return results.slice(0, limit).map(doc => ({
        document: doc,
        score: 0.5,
        matches: this.extractMatches(doc, query),
        relevance: 0.5
      }))
    } catch (error) {
      console.error('Fallback search failed:', error)
      return []
    }
  }

  /**
   * Check if index needs rebuilding
   */
  async shouldRebuildIndex() {
    if (!this.lastIndexUpdate || !this.index) return true
    
    try {
      const documents = await this.storageManager.getAllDocuments()
      
      // Check if document count changed
      if (documents.length !== this.documents.length) {
        return true
      }
      
      // Check if any document was modified since last index
      if (documents.length === 0) return false
      
      const lastModified = Math.max(...documents.map(doc => new Date(doc.updatedAt).getTime()))
      return lastModified > this.lastIndexUpdate
      
    } catch (error) {
      console.error('Error checking index freshness:', error)
      return true
    }
  }

  /**
   * Add a document to the index
   */
  async addDocument(document) {
    // For now, just rebuild the entire index
    // In production, consider incremental updates
    await this.buildIndex()
  }

  /**
   * Update a document in the index
   */
  async updateDocument(document) {
    // For now, just rebuild the entire index
    // In production, consider incremental updates
    await this.buildIndex()
  }

  /**
   * Remove a document from the index
   */
  async removeDocument(documentId) {
    // For now, just rebuild the entire index
    // In production, consider incremental updates
    await this.buildIndex()
  }

  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(partialQuery, limit = 5) {
    if (!this.index || !partialQuery || partialQuery.length < 2) {
      return []
    }

    // Extract unique words from all documents for suggestions
    const allWords = new Set()
    
    this.documents.forEach(doc => {
      const words = [
        ...(doc.title || '').toLowerCase().split(/\s+/),
        ...(doc.content || '').toLowerCase().split(/\s+/),
        ...(doc.tags || []).map(tag => tag.toLowerCase())
      ]
      
      words.forEach(word => {
        if (word.length > 2 && word.includes(partialQuery.toLowerCase())) {
          allWords.add(word)
        }
      })
    })

    return Array.from(allWords)
      .sort()
      .slice(0, limit)
  }

  /**
   * Get search statistics
   */
  getStats() {
    return {
      documentCount: this.documents.length,
      indexSize: this.index ? Object.keys(this.index.invertedIndex).length : 0,
      lastUpdated: this.lastIndexUpdate,
      isIndexing: this.isIndexing
    }
  }
}