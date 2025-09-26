/**
 * Legal Client - Secure worker communication for legal documents
 * Follows Fantasy Editor standards: defensive programming, clean code, PWA-first
 */
import {
  getWorkerUrl,
  API_ENDPOINTS,
  DEFAULT_CONFIG,
  isValidDocumentType
} from './legal-constants.js'

export class LegalClient {
  constructor() {
    this.workerUrl = getWorkerUrl()
    this.timeout = DEFAULT_CONFIG.TIMEOUT_MS
    this.retryAttempts = DEFAULT_CONFIG.RETRY_ATTEMPTS
    this.retryDelay = DEFAULT_CONFIG.RETRY_DELAY_MS
    this.cache = new Map()
    this.cacheDuration = DEFAULT_CONFIG.CACHE_DURATION_MS
  }

  /**
   * Check all legal documents metadata
   */
  async checkDocuments() {
    const cacheKey = 'metadata'
    const cached = this.getCachedResponse(cacheKey)

    if (cached) {
      return cached
    }

    const url = `${this.workerUrl}${API_ENDPOINTS.CHECK}`

    try {
      const response = await this.makeRequest(url)
      this.validateMetadataResponse(response)
      this.setCachedResponse(cacheKey, response)
      return response
    } catch (error) {
      throw new Error(`Failed to check documents: ${error.message}`)
    }
  }

  /**
   * Fetch specific document by type
   */
  async fetchDocument(type, expectedHash = null) {
    this.validateDocumentType(type)

    const cached = this.checkDocumentCache(type, expectedHash)
    if (cached) {
      return cached
    }

    return await this.fetchDocumentFromWorker(type, expectedHash)
  }

  /**
   * Check cache for document
   */
  checkDocumentCache(type, expectedHash) {
    const cacheKey = `document-${type}`
    const cached = this.getCachedResponse(cacheKey)

    return (cached && !expectedHash) ? cached : null
  }

  /**
   * Fetch document from worker
   */
  async fetchDocumentFromWorker(type, expectedHash) {
    const url = `${this.workerUrl}${API_ENDPOINTS.DOCUMENTS}?type=${type}`

    try {
      const response = await this.makeRequest(url)
      this.validateDocumentResponse(response)
      this.verifyDocumentHash(response, expectedHash)

      const cacheKey = `document-${type}`
      this.setCachedResponse(cacheKey, response)
      return response
    } catch (error) {
      throw new Error(`Failed to fetch document: ${error.message}`)
    }
  }

  /**
   * Verify document hash if expected
   */
  verifyDocumentHash(response, expectedHash) {
    if (expectedHash && response.hash !== expectedHash) {
      throw new Error('Document hash verification failed')
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(url, options = {}) {
    const requestOptions = this.buildRequestOptions(options)

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const data = await this.attemptRequest(url, requestOptions)
        return data
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw this.categorizeError(error)
        }

        await this.delay(this.retryDelay * attempt)
      }
    }
  }

  /**
   * Build request options with defaults
   */
  buildRequestOptions(options) {
    return {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      ...options
    }
  }

  /**
   * Attempt single HTTP request
   */
  async attemptRequest(url, requestOptions) {
    const response = await this.makeHttpRequest(url, requestOptions)

    if (!response.ok) {
      throw new Error(`Worker request failed: ${response.status} ${response.statusText}`)
    }

    try {
      const data = await response.json()
      return data
    } catch (jsonError) {
      throw new Error('Failed to parse response')
    }
  }

  /**
   * Make HTTP request with timeout
   */
  async makeHttpRequest(url, options) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      return response
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Categorize errors for better debugging
   */
  categorizeError(error) {
    if (error.message.includes('timeout')) {
      return new Error('Request timeout')
    }

    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      return new Error('Network request failed')
    }

    if (error.message.includes('JSON')) {
      return new Error('Failed to parse response')
    }

    return error
  }

  /**
   * Validate document type input
   */
  validateDocumentType(type) {
    if (!type) {
      throw new Error('Document type is required')
    }

    if (!isValidDocumentType(type)) {
      throw new Error('Invalid document type')
    }
  }

  /**
   * Validate metadata response structure
   */
  validateMetadataResponse(response) {
    if (!response) {
      throw new Error('Invalid response format')
    }

    if (!response.documents || typeof response.documents !== 'object') {
      throw new Error('Invalid response format')
    }

    if (!response.timestamp && !response.lastUpdated) {
      throw new Error('Invalid response format')
    }
  }

  /**
   * Validate document response structure
   */
  validateDocumentResponse(response) {
    if (!response) {
      throw new Error('Invalid response format')
    }

    if (!response.type || !response.hash || !response.sha) {
      throw new Error('Invalid response format')
    }

    // Content can be empty string, so check for undefined/null
    if (response.content === undefined || response.content === null) {
      throw new Error('Invalid response format')
    }
  }

  /**
   * Get cached response if still valid
   */
  getCachedResponse(key) {
    const cached = this.cache.get(key)

    if (!cached) {
      return null
    }

    const now = Date.now()
    if (now - cached.timestamp > this.cacheDuration) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Set cached response with timestamp
   */
  setCachedResponse(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Clear all cached responses
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Delay execution for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}