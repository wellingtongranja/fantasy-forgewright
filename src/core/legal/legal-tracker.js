/**
 * Legal Document Tracker - Hash-based change detection for legal documents
 * Follows Fantasy Editor standards: max 20 lines/function, defensive programming
 */
export class LegalDocumentTracker {
  constructor() {
    this.trackedDocuments = {}
    this.documentTypes = [
      'privacy-policy',
      'terms-of-service', 
      'eula',
      'license',
      'release-notes'
    ]
  }

  /**
   * Generate SHA-256 hash for document content
   */
  async generateHash(content) {
    if (content === null || content === undefined) {
      throw new Error('Content is required')
    }

    try {
      const textContent = String(content)
      
      // Use Web Crypto API if available, fallback to simple hash for testing
      if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder()
        const data = encoder.encode(textContent)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        return this.bufferToHex(hashBuffer)
      } else {
        // Fallback for testing environments
        return this.simpleHash(textContent)
      }
    } catch (error) {
      // Fallback to simple hash on any error
      return this.simpleHash(String(content))
    }
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  bufferToHex(buffer) {
    const byteArray = new Uint8Array(buffer)
    return Array.from(byteArray, byte => 
      byte.toString(16).padStart(2, '0')
    ).join('')
  }

  /**
   * Simple hash for testing environments (not cryptographically secure)
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    // Convert to positive hex string with fixed length (64 chars like SHA-256)
    const positiveHash = Math.abs(hash)
    return positiveHash.toString(16).padStart(64, '0').slice(0, 64)
  }

  /**
   * Track a single document with hash and metadata
   */
  async trackDocument(document) {
    this.validateDocument(document)
    
    const hash = await this.generateHash(document.content)
    const now = new Date()
    
    this.trackedDocuments[document.type] = {
      hash,
      version: document.version || '1.0',
      trackedAt: now,
      lastModified: now,
      originalContent: document.content
    }
  }

  /**
   * Track multiple documents in batch
   */
  async trackDocuments(documents) {
    if (!Array.isArray(documents)) {
      throw new Error('Documents must be an array')
    }

    // Validate all documents first
    for (const doc of documents) {
      this.validateDocument(doc)
    }

    // Track all documents
    for (const doc of documents) {
      await this.trackDocument(doc)
    }
  }

  /**
   * Check if document content has changed
   */
  async hasChanged(type, content) {
    if (!type) {
      throw new Error('Document type is required')
    }
    if (content === null || content === undefined) {
      throw new Error('Content is required')
    }

    const tracked = this.trackedDocuments[type]
    if (!tracked) {
      return true // Untracked documents are considered changed
    }

    const currentHash = await this.generateHash(content)
    return currentHash !== tracked.hash
  }

  /**
   * Get tracked document by type
   */
  getTrackedDocument(type) {
    return this.trackedDocuments[type]
  }

  /**
   * Get all tracked documents
   */
  getTrackedDocuments() {
    return { ...this.trackedDocuments }
  }

  /**
   * Get available document types
   */
  getDocumentTypes() {
    return [...this.documentTypes]
  }

  /**
   * Get unchanged documents
   */
  async getUnchangedDocuments() {
    const unchanged = []
    
    for (const [type, data] of Object.entries(this.trackedDocuments)) {
      const hasChange = await this.hasChanged(type, data.originalContent)
      if (!hasChange) {
        unchanged.push({ type, ...data })
      }
    }
    
    return unchanged
  }

  /**
   * Get changed documents
   */
  async getChangedDocuments() {
    const changed = []
    
    for (const [type, data] of Object.entries(this.trackedDocuments)) {
      const hasChange = await this.hasChanged(type, data.originalContent)
      if (hasChange) {
        changed.push({ type, ...data })
      }
    }
    
    return changed
  }

  /**
   * Get tracking statistics
   */
  getTrackingStats() {
    const types = Object.keys(this.trackedDocuments)
    const lastUpdated = types.length > 0 
      ? new Date(Math.max(...types.map(type => 
          this.trackedDocuments[type].lastModified.getTime()
        )))
      : new Date()

    return {
      totalTracked: types.length,
      documentTypes: types,
      lastUpdated
    }
  }

  /**
   * Clear all tracking
   */
  clearTracking() {
    this.trackedDocuments = {}
  }

  /**
   * Remove tracking for specific document type
   */
  removeTracking(type) {
    if (!type) {
      throw new Error('Document type is required')
    }
    
    this.validateDocumentType(type)
    delete this.trackedDocuments[type]
  }

  /**
   * Validate document object
   */
  validateDocument(document) {
    if (!document) {
      throw new Error('Document is required')
    }
    
    if (typeof document !== 'object') {
      throw new Error('Document must be an object')
    }
    
    if (!document.type) {
      throw new Error('Document type is required')
    }
    
    this.validateDocumentType(document.type)
    
    if (document.content === null || document.content === undefined) {
      throw new Error('Document content is required')
    }
  }

  /**
   * Validate document type against allowed types
   */
  validateDocumentType(type) {
    if (!this.documentTypes.includes(type)) {
      throw new Error(`Invalid document type: ${type}`)
    }
  }
}