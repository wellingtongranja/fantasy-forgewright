/**
 * SearchEngine - Advanced search service with fuzzy matching and ranking
 * Provides fast, intelligent command searching with debouncing and caching
 */

import { BaseService } from '../core/base/BaseService.js'

/**
 * SearchEngine service for command searching and ranking
 */
export class SearchEngine extends BaseService {
  constructor(config = {}) {
    super({
      name: 'searchEngine',
      ...config,
      options: {
        debounceMs: 150,
        minQueryLength: 0,
        maxResults: 50,
        enableCaching: true,
        enableRanking: true,
        caseSensitive: false,
        fuzzyThreshold: 0.3,
        ...config.options
      }
    })

    // Search state
    this.commands = []
    this.searchCache = new Map()
    this.debounceTimer = null
    this.lastQuery = ''
    this.lastResults = []

    // Search algorithms
    this.algorithms = {
      exact: this.exactMatch.bind(this),
      fuzzy: this.fuzzyMatch.bind(this),
      prefix: this.prefixMatch.bind(this),
      contains: this.containsMatch.bind(this)
    }

    // Ranking factors
    this.rankingFactors = {
      exactMatch: 100,
      prefixMatch: 80,
      aliasMatch: 70,
      fuzzyMatch: 50,
      containsMatch: 30,
      descriptionMatch: 20,
      recentUsage: 10,
      frequency: 5
    }

    // Usage tracking for ranking
    this.usageStats = new Map()
    this.recentCommands = []
  }

  /**
   * Validate service configuration
   * @protected
   */
  async validateConfiguration() {
    if (this.options.debounceMs < 0) {
      throw new Error('debounceMs must be non-negative')
    }

    if (this.options.maxResults < 1) {
      throw new Error('maxResults must be positive')
    }

    if (this.options.fuzzyThreshold < 0 || this.options.fuzzyThreshold > 1) {
      throw new Error('fuzzyThreshold must be between 0 and 1')
    }
  }

  /**
   * Service-specific initialization
   * @protected
   */
  async onInitialize() {
    // Setup cache cleanup interval
    if (this.options.enableCaching) {
      this.setInterval(() => this.cleanupCache(), 300000) // 5 minutes
    }
  }

  /**
   * Set commands to search through
   * @param {Command[]} commands - Commands to index
   */
  setCommands(commands) {
    if (!Array.isArray(commands)) {
      throw new Error('Commands must be an array')
    }

    return this.executeOperation('setCommands', async () => {
      this.commands = commands.filter(cmd => cmd && typeof cmd.getMetadata === 'function')
      this.clearCache()
      this.indexCommands()
      
      this.log('info', `Indexed ${this.commands.length} commands`)
      this.emit('commandsUpdated', { count: this.commands.length })
    })
  }

  /**
   * Index commands for faster searching
   * @private
   */
  indexCommands() {
    this.commandIndex = new Map()
    this.aliasIndex = new Map()
    this.categoryIndex = new Map()

    this.commands.forEach((command, index) => {
      const metadata = command.getMetadata()
      
      // Index by ID
      this.commandIndex.set(metadata.id, { command, index })
      
      // Index by name (normalized)
      const normalizedName = this.normalizeText(metadata.name)
      if (!this.commandIndex.has(normalizedName)) {
        this.commandIndex.set(normalizedName, [])
      }
      this.commandIndex.get(normalizedName).push({ command, index })
      
      // Index by aliases
      metadata.aliases?.forEach(alias => {
        const normalizedAlias = this.normalizeText(alias)
        if (!this.aliasIndex.has(normalizedAlias)) {
          this.aliasIndex.set(normalizedAlias, [])
        }
        this.aliasIndex.get(normalizedAlias).push({ command, index })
      })
      
      // Index by category
      const category = metadata.category || 'general'
      if (!this.categoryIndex.has(category)) {
        this.categoryIndex.set(category, [])
      }
      this.categoryIndex.get(category).push({ command, index })
    })
  }

  /**
   * Search commands with debouncing
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<SearchResult[]>} Search results
   */
  async search(query, options = {}) {
    const searchOptions = { ...this.options, ...options }

    // Return early for empty queries if minLength is set
    if (!query || query.length < searchOptions.minQueryLength) {
      return this.getAllCommands()
    }

    // Use debouncing if enabled
    if (searchOptions.debounceMs > 0) {
      return new Promise((resolve) => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer)
        }

        this.debounceTimer = setTimeout(async () => {
          const results = await this.performSearch(query, searchOptions)
          resolve(results)
        }, searchOptions.debounceMs)
      })
    }

    return this.performSearch(query, searchOptions)
  }

  /**
   * Perform immediate search without debouncing
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<SearchResult[]>} Search results
   */
  async performSearch(query, options = {}) {
    return this.executeOperation('search', async () => {
      const searchOptions = { ...this.options, ...options }
      const normalizedQuery = this.normalizeText(query)

      // Check cache first
      if (searchOptions.enableCaching) {
        const cached = this.getCachedResults(normalizedQuery)
        if (cached) {
          this.log('debug', 'Returning cached results')
          return cached
        }
      }

      // Perform search
      const results = await this.executeSearch(normalizedQuery, searchOptions)

      // Cache results
      if (searchOptions.enableCaching) {
        this.cacheResults(normalizedQuery, results)
      }

      this.lastQuery = normalizedQuery
      this.lastResults = results

      this.emit('searchCompleted', {
        query,
        resultCount: results.length,
        hasResults: results.length > 0
      })

      return results
    })
  }

  /**
   * Execute search algorithms
   * @param {string} query - Normalized query
   * @param {Object} options - Search options
   * @returns {Promise<SearchResult[]>} Search results
   * @private
   */
  async executeSearch(query, options) {
    if (!query.trim()) {
      return this.getAllCommands()
    }

    let allMatches = []

    // Special handling for colon shortcuts - prioritize exact matches
    if (query.startsWith(':')) {
      const exactMatches = await this.algorithms.exact(query, options)
      
      // If we have exact alias matches, only show those
      const exactAliasMatches = exactMatches.filter(match => {
        const metadata = match.command.getMetadata()
        return metadata.aliases?.some(alias => 
          this.normalizeText(alias) === query
        )
      })
      
      if (exactAliasMatches.length > 0) {
        console.log('Found exact alias matches for', query, ':', exactAliasMatches.map(m => m.command.getMetadata().name))
        return this.rankResults(exactAliasMatches, query).slice(0, options.maxResults)
      }
      
      // If no exact matches, run prefix matching for partial colon shortcuts
      const prefixMatches = await this.algorithms.prefix(query, options)
      if (prefixMatches.length > 0) {
        console.log('Found prefix matches for', query, ':', prefixMatches.map(m => m.command.getMetadata().name))
        return this.rankResults(this.removeDuplicates(prefixMatches), query).slice(0, options.maxResults)
      }
    }

    // Run all search algorithms for non-colon queries
    for (const [algorithmName, algorithm] of Object.entries(this.algorithms)) {
      try {
        const matches = await algorithm(query, options)
        allMatches = allMatches.concat(matches)
      } catch (error) {
        this.log('warn', `Search algorithm ${algorithmName} failed`, error)
      }
    }

    // Remove duplicates and rank results
    const uniqueMatches = this.removeDuplicates(allMatches)
    const rankedResults = options.enableRanking
      ? this.rankResults(uniqueMatches, query)
      : uniqueMatches

    // Apply limits
    return rankedResults.slice(0, options.maxResults)
  }

  /**
   * Exact match algorithm
   * @param {string} query - Search query
   * @returns {SearchResult[]} Exact matches
   * @private
   */
  async exactMatch(query) {
    const results = []

    this.commands.forEach((command, index) => {
      const metadata = command.getMetadata()
      const score = this.calculateExactScore(metadata, query)
      
      if (score > 0) {
        results.push(new SearchResult(command, score, 'exact', index))
      }
    })

    return results
  }

  /**
   * Fuzzy match algorithm using Levenshtein distance
   * @param {string} query - Search query
   * @returns {SearchResult[]} Fuzzy matches
   * @private
   */
  async fuzzyMatch(query) {
    const results = []
    const threshold = this.options.fuzzyThreshold

    this.commands.forEach((command, index) => {
      const metadata = command.getMetadata()
      const score = this.calculateFuzzyScore(metadata, query, threshold)
      
      if (score > 0) {
        results.push(new SearchResult(command, score, 'fuzzy', index))
      }
    })

    return results
  }

  /**
   * Prefix match algorithm
   * @param {string} query - Search query
   * @returns {SearchResult[]} Prefix matches
   * @private
   */
  async prefixMatch(query) {
    const results = []

    this.commands.forEach((command, index) => {
      const metadata = command.getMetadata()
      const score = this.calculatePrefixScore(metadata, query)
      
      if (score > 0) {
        results.push(new SearchResult(command, score, 'prefix', index))
      }
    })

    return results
  }

  /**
   * Contains match algorithm
   * @param {string} query - Search query
   * @returns {SearchResult[]} Contains matches
   * @private
   */
  async containsMatch(query) {
    const results = []

    this.commands.forEach((command, index) => {
      const metadata = command.getMetadata()
      const score = this.calculateContainsScore(metadata, query)
      
      if (score > 0) {
        results.push(new SearchResult(command, score, 'contains', index))
      }
    })

    return results
  }

  /**
   * Calculate exact match score
   * @param {Object} metadata - Command metadata
   * @param {string} query - Search query
   * @returns {number} Match score
   * @private
   */
  calculateExactScore(metadata, query) {
    const normalizedName = this.normalizeText(metadata.name)
    const normalizedQuery = this.normalizeText(query)

    if (normalizedName === normalizedQuery) {
      return this.rankingFactors.exactMatch
    }

    // Check aliases for exact match
    for (const alias of metadata.aliases || []) {
      const normalizedAlias = this.normalizeText(alias)
      if (normalizedAlias === normalizedQuery) {
        return this.rankingFactors.aliasMatch
      }
    }

    return 0
  }

  /**
   * Calculate fuzzy match score using Levenshtein distance
   * @param {Object} metadata - Command metadata
   * @param {string} query - Search query
   * @param {number} threshold - Similarity threshold
   * @returns {number} Match score
   * @private
   */
  calculateFuzzyScore(metadata, query, threshold) {
    const name = this.normalizeText(metadata.name)
    const similarity = this.calculateSimilarity(name, query)

    if (similarity >= threshold) {
      return Math.round(this.rankingFactors.fuzzyMatch * similarity)
    }

    // Check aliases
    for (const alias of metadata.aliases || []) {
      const aliasSimilarity = this.calculateSimilarity(
        this.normalizeText(alias), 
        query
      )
      if (aliasSimilarity >= threshold) {
        return Math.round(this.rankingFactors.fuzzyMatch * aliasSimilarity * 0.8)
      }
    }

    // Check description
    const description = this.normalizeText(metadata.description || '')
    const descSimilarity = this.calculateSimilarity(description, query)
    if (descSimilarity >= threshold) {
      return Math.round(this.rankingFactors.descriptionMatch * descSimilarity)
    }

    return 0
  }

  /**
   * Calculate prefix match score
   * @param {Object} metadata - Command metadata
   * @param {string} query - Search query
   * @returns {number} Match score
   * @private
   */
  calculatePrefixScore(metadata, query) {
    const normalizedName = this.normalizeText(metadata.name)
    const normalizedQuery = this.normalizeText(query)

    if (normalizedName.startsWith(normalizedQuery)) {
      const ratio = normalizedQuery.length / normalizedName.length
      return Math.round(this.rankingFactors.prefixMatch * ratio)
    }

    // Check aliases
    for (const alias of metadata.aliases || []) {
      const normalizedAlias = this.normalizeText(alias)
      if (normalizedAlias.startsWith(normalizedQuery)) {
        const ratio = normalizedQuery.length / normalizedAlias.length
        return Math.round(this.rankingFactors.prefixMatch * ratio * 0.9)
      }
    }

    return 0
  }

  /**
   * Calculate contains match score
   * @param {Object} metadata - Command metadata
   * @param {string} query - Search query
   * @returns {number} Match score
   * @private
   */
  calculateContainsScore(metadata, query) {
    const normalizedName = this.normalizeText(metadata.name)
    const normalizedQuery = this.normalizeText(query)

    if (normalizedName.includes(normalizedQuery)) {
      const ratio = normalizedQuery.length / normalizedName.length
      return Math.round(this.rankingFactors.containsMatch * ratio)
    }

    // Check description
    const normalizedDesc = this.normalizeText(metadata.description || '')
    if (normalizedDesc.includes(normalizedQuery)) {
      return this.rankingFactors.descriptionMatch
    }

    return 0
  }

  /**
   * Calculate text similarity using Levenshtein distance
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Similarity ratio (0-1)
   * @private
   */
  calculateSimilarity(a, b) {
    if (a === b) return 1
    if (a.length === 0) return 0
    if (b.length === 0) return 0

    const distance = this.levenshteinDistance(a, b)
    const maxLength = Math.max(a.length, b.length)
    
    return 1 - (distance / maxLength)
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Edit distance
   * @private
   */
  levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null))

    for (let i = 0; i <= a.length; i += 1) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= b.length; j += 1) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= b.length; j += 1) {
      for (let i = 1; i <= a.length; i += 1) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }

    return matrix[b.length][a.length]
  }

  /**
   * Remove duplicate results
   * @param {SearchResult[]} results - Search results
   * @returns {SearchResult[]} Unique results
   * @private
   */
  removeDuplicates(results) {
    const seen = new Set()
    return results.filter(result => {
      const id = result.command.getMetadata().id
      if (seen.has(id)) {
        return false
      }
      seen.add(id)
      return true
    })
  }

  /**
   * Rank search results
   * @param {SearchResult[]} results - Search results
   * @param {string} query - Search query
   * @returns {SearchResult[]} Ranked results
   * @private
   */
  rankResults(results, query) {
    return results
      .map(result => {
        // Add usage-based ranking
        const metadata = result.command.getMetadata()
        const usageBonus = this.getUsageBonus(metadata.id)
        const recentBonus = this.getRecentBonus(metadata.id)
        
        result.score += usageBonus + recentBonus
        
        return result
      })
      .sort((a, b) => {
        // Primary sort by score
        if (b.score !== a.score) {
          return b.score - a.score
        }
        
        // Secondary sort by command name length (shorter is better)
        const aName = a.command.getMetadata().name
        const bName = b.command.getMetadata().name
        return aName.length - bName.length
      })
  }

  /**
   * Get usage bonus for ranking
   * @param {string} commandId - Command ID
   * @returns {number} Usage bonus
   * @private
   */
  getUsageBonus(commandId) {
    const usage = this.usageStats.get(commandId) || { count: 0 }
    return Math.min(usage.count, 10) * this.rankingFactors.frequency
  }

  /**
   * Get recent usage bonus
   * @param {string} commandId - Command ID
   * @returns {number} Recent bonus
   * @private
   */
  getRecentBonus(commandId) {
    const recentIndex = this.recentCommands.indexOf(commandId)
    if (recentIndex === -1) return 0
    
    const recencyScore = (this.recentCommands.length - recentIndex) / this.recentCommands.length
    return Math.round(this.rankingFactors.recentUsage * recencyScore)
  }

  /**
   * Record command usage for ranking
   * @param {string} commandId - Command ID
   */
  recordUsage(commandId) {
    // Update usage stats
    const currentUsage = this.usageStats.get(commandId) || { count: 0, lastUsed: null }
    this.usageStats.set(commandId, {
      count: currentUsage.count + 1,
      lastUsed: new Date()
    })

    // Update recent commands
    const existingIndex = this.recentCommands.indexOf(commandId)
    if (existingIndex > -1) {
      this.recentCommands.splice(existingIndex, 1)
    }
    
    this.recentCommands.unshift(commandId)
    
    // Keep only recent items
    if (this.recentCommands.length > 20) {
      this.recentCommands = this.recentCommands.slice(0, 20)
    }

    this.emit('usageRecorded', { commandId })
  }

  /**
   * Get all commands as search results
   * @returns {SearchResult[]} All commands
   * @private
   */
  getAllCommands() {
    return this.commands.map((command, index) => 
      new SearchResult(command, this.rankingFactors.exactMatch, 'all', index)
    )
  }

  /**
   * Normalize text for searching
   * @param {string} text - Text to normalize
   * @returns {string} Normalized text
   * @private
   */
  normalizeText(text) {
    if (typeof text !== 'string') return ''
    
    let normalized = text.trim()
    
    if (!this.options.caseSensitive) {
      normalized = normalized.toLowerCase()
    }
    
    return normalized
  }

  /**
   * Get cached search results
   * @param {string} query - Search query
   * @returns {SearchResult[]|null} Cached results
   * @private
   */
  getCachedResults(query) {
    const cacheEntry = this.searchCache.get(query)
    if (!cacheEntry) return null

    // Check if cache entry is still valid (5 minutes)
    const maxAge = 5 * 60 * 1000
    if (Date.now() - cacheEntry.timestamp > maxAge) {
      this.searchCache.delete(query)
      return null
    }

    return cacheEntry.results
  }

  /**
   * Cache search results
   * @param {string} query - Search query
   * @param {SearchResult[]} results - Search results
   * @private
   */
  cacheResults(query, results) {
    this.searchCache.set(query, {
      results,
      timestamp: Date.now()
    })

    // Limit cache size
    if (this.searchCache.size > 100) {
      const firstKey = this.searchCache.keys().next().value
      this.searchCache.delete(firstKey)
    }
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear()
    this.emit('cacheCleared')
  }

  /**
   * Clean up old cache entries
   * @private
   */
  cleanupCache() {
    const maxAge = 5 * 60 * 1000 // 5 minutes
    const now = Date.now()

    for (const [query, entry] of this.searchCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.searchCache.delete(query)
      }
    }

    this.log('debug', `Cache cleanup completed. Entries: ${this.searchCache.size}`)
  }

  /**
   * Get search statistics
   * @returns {Object} Search statistics
   */
  getSearchStats() {
    return {
      commandCount: this.commands.length,
      cacheSize: this.searchCache.size,
      usageStatsSize: this.usageStats.size,
      recentCommandsCount: this.recentCommands.length,
      lastQuery: this.lastQuery,
      lastResultCount: this.lastResults.length
    }
  }

  /**
   * Service-specific cleanup
   * @protected
   */
  onDestroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.commands = []
    this.searchCache.clear()
    this.usageStats.clear()
    this.recentCommands = []
  }
}

/**
 * Search result containing command and match information
 */
export class SearchResult {
  /**
   * @param {Command} command - Matched command
   * @param {number} score - Match score
   * @param {string} matchType - Type of match
   * @param {number} index - Original index
   */
  constructor(command, score, matchType, index) {
    this.command = command
    this.score = score
    this.matchType = matchType
    this.index = index
    this.timestamp = new Date()
  }

  /**
   * Get result metadata
   * @returns {Object} Result metadata
   */
  getMetadata() {
    return {
      commandId: this.command.getMetadata().id,
      score: this.score,
      matchType: this.matchType,
      index: this.index,
      timestamp: this.timestamp
    }
  }
}