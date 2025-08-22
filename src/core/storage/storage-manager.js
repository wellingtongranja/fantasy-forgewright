import { guidManager } from '../../utils/guid.js'

export class StorageManager {
  constructor() {
    this.dbName = 'FantasyEditorDB'
    this.dbVersion = 2 // Increment for GUID migration
    this.storeName = 'documents'
    this.db = null
    this.guidManager = guidManager
    this.initDatabase()
  }

  /**
   * Generate GUID for new documents
   * @returns {string} RFC 4122 v4 UUID
   */
  generateGUID() {
    return this.guidManager.generateGuid()
  }

  /**
   * Generate checksum for content integrity
   */
  generateChecksum(content) {
    return this.guidManager.generateChecksum(content)
  }

  /**
   * Validate document structure with GUID support
   */
  validateDocument(doc) {
    if (!doc || typeof doc !== 'object') {
      throw new Error('Invalid document: document must be an object')
    }
    
    // Validate ID (GUID or old UID for backward compatibility)
    if (!doc.id || typeof doc.id !== 'string') {
      throw new Error('Document ID is required')
    }
    
    if (!this.guidManager.isValidGuid(doc.id) && !this.guidManager.isOldUidFormat(doc.id)) {
      throw new Error('Document ID must be valid GUID or UID format')
    }
    
    if (!doc.title || typeof doc.title !== 'string' || doc.title.trim().length === 0) {
      throw new Error('Document title is required')
    }
    
    if (doc.title.length > 200) {
      throw new Error('Document title must be less than 200 characters')
    }
    
    if (doc.content && typeof doc.content !== 'string') {
      throw new Error('Document content must be a string')
    }
    
    if (doc.tags && !Array.isArray(doc.tags)) {
      throw new Error('Document tags must be an array')
    }
    
    return true
  }

  /**
   * Sanitize document content to prevent XSS
   */
  sanitizeDocument(doc) {
    const sanitized = { ...doc }
    
    // Basic XSS prevention - remove script tags and javascript: protocols
    if (sanitized.content) {
      sanitized.content = sanitized.content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    }
    
    // Sanitize title
    if (sanitized.title) {
      sanitized.title = sanitized.title
        .replace(/<[^>]*>/g, '')
        .trim()
    }
    
    // Ensure tags are strings
    if (sanitized.tags) {
      sanitized.tags = sanitized.tags
        .filter(tag => typeof tag === 'string')
        .map(tag => tag.toLowerCase().trim())
    }
    
    return sanitized
  }

  /**
   * Verify document integrity using checksum
   */
  verifyIntegrity(doc) {
    if (!doc.checksum || !doc.content) return false
    
    const currentChecksum = this.generateChecksum(doc.content)
    return currentChecksum === doc.checksum
  }

  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }
      
      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('title', 'title', { unique: false })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true })
        }
      }
    })
  }

  async saveDocument(document) {
    await this.ensureDatabase()
    
    if (!document) {
      throw new Error('Invalid document')
    }
    
    let processedDoc

    // Check if this is a new document or existing one
    if (!document.id) {
      // Create new document with GUID structure
      processedDoc = this.guidManager.createDocumentWithGuid(
        document.title,
        document.content,
        document.tags
      )
    } else {
      // Update existing document
      this.validateDocument(document)
      const sanitizedDoc = this.sanitizeDocument(document)
      
      if (this.guidManager.isValidGuid(document.id)) {
        // Update GUID document
        processedDoc = this.guidManager.updateDocument(sanitizedDoc, {
          title: sanitizedDoc.title,
          content: sanitizedDoc.content,
          tags: sanitizedDoc.tags
        })
      } else {
        // Handle old UID format (backward compatibility)
        processedDoc = { ...sanitizedDoc }
        processedDoc.updatedAt = new Date().toISOString()
        if (processedDoc.content) {
          processedDoc.checksum = this.generateChecksum(processedDoc.content)
        }
        if (!processedDoc.tags) {
          processedDoc.tags = []
        }
      }
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(processedDoc)
      
      transaction.oncomplete = () => resolve(processedDoc)
      transaction.onerror = () => reject(new Error('Failed to save document'))
    })
  }

  async getDocument(id) {
    await this.ensureDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('Failed to get document'))
    })
  }

  async getAllDocuments() {
    await this.ensureDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()
      
      request.onsuccess = () => {
        const documents = request.result
        documents.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        resolve(documents)
      }
      request.onerror = () => reject(new Error('Failed to get documents'))
    })
  }

  async deleteDocument(id) {
    await this.ensureDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to delete document'))
    })
  }

  async searchDocuments(query) {
    const documents = await this.getAllDocuments()
    const lowerQuery = query.toLowerCase()
    
    return documents.filter(doc => {
      const titleMatch = doc.title?.toLowerCase().includes(lowerQuery)
      const contentMatch = doc.content?.toLowerCase().includes(lowerQuery)
      const tagMatch = doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      
      return titleMatch || contentMatch || tagMatch
    })
  }

  async ensureDatabase() {
    if (!this.db) {
      await this.initDatabase()
    }
  }

  /**
   * Check if document with GUID already exists
   * @param {string} guid - GUID to check
   * @returns {Promise<boolean>} Whether document exists
   */
  async documentExists(guid) {
    await this.ensureDatabase()
    
    if (!this.guidManager.isValidGuid(guid)) {
      return false
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(guid)
      
      request.onsuccess = () => resolve(!!request.result)
      request.onerror = () => reject(new Error('Failed to check document existence'))
    })
  }

  /**
   * Find documents by filename (for Git integration)
   * @param {string} filename - Git filename to search for
   * @returns {Promise<Object|null>} Document with matching filename
   */
  async getDocumentByFilename(filename) {
    await this.ensureDatabase()
    
    const documents = await this.getAllDocuments()
    return documents.find(doc => doc.filename === filename) || null
  }

  /**
   * Find potential duplicate documents by title and content similarity
   * @param {Object} document - Document to check for duplicates
   * @returns {Promise<Array>} Array of potential duplicate documents
   */
  async findPotentialDuplicates(document) {
    await this.ensureDatabase()
    
    if (!document.title && !document.content) {
      return []
    }
    
    const allDocuments = await this.getAllDocuments()
    const potentialDuplicates = []
    
    for (const existingDoc of allDocuments) {
      if (existingDoc.id === document.id) {
        continue // Skip self
      }
      
      let similarity = 0
      
      // Check title similarity
      if (document.title && existingDoc.title) {
        if (document.title.toLowerCase() === existingDoc.title.toLowerCase()) {
          similarity += 50 // 50% weight for exact title match
        } else if (existingDoc.title.toLowerCase().includes(document.title.toLowerCase()) ||
                   document.title.toLowerCase().includes(existingDoc.title.toLowerCase())) {
          similarity += 25 // 25% weight for partial title match
        }
      }
      
      // Check content similarity (basic)
      if (document.content && existingDoc.content) {
        const docChecksum = this.generateChecksum(document.content)
        const existingChecksum = this.generateChecksum(existingDoc.content)
        
        if (docChecksum === existingChecksum) {
          similarity += 40 // 40% weight for identical content
        } else {
          // Simple content similarity check
          const docWords = document.content.toLowerCase().split(/\s+/)
          const existingWords = existingDoc.content.toLowerCase().split(/\s+/)
          const commonWords = docWords.filter(word => existingWords.includes(word))
          
          if (commonWords.length > Math.min(docWords.length, existingWords.length) * 0.5) {
            similarity += 20 // 20% weight for significant word overlap
          }
        }
      }
      
      // Check tag similarity
      if (document.tags && existingDoc.tags && document.tags.length > 0 && existingDoc.tags.length > 0) {
        const commonTags = document.tags.filter(tag => existingDoc.tags.includes(tag))
        if (commonTags.length > 0) {
          similarity += (commonTags.length / Math.max(document.tags.length, existingDoc.tags.length)) * 10
        }
      }
      
      // Consider it a potential duplicate if similarity > 60%
      if (similarity >= 60) {
        potentialDuplicates.push({
          document: existingDoc,
          similarity: Math.round(similarity),
          reasons: this.getDuplicateReasons(document, existingDoc, similarity)
        })
      }
    }
    
    return potentialDuplicates.sort((a, b) => b.similarity - a.similarity)
  }

  /**
   * Get reasons why documents might be duplicates
   * @private
   */
  getDuplicateReasons(doc1, doc2, similarity) {
    const reasons = []
    
    if (doc1.title && doc2.title && doc1.title.toLowerCase() === doc2.title.toLowerCase()) {
      reasons.push('Identical titles')
    }
    
    if (doc1.content && doc2.content) {
      const checksum1 = this.generateChecksum(doc1.content)
      const checksum2 = this.generateChecksum(doc2.content)
      if (checksum1 === checksum2) {
        reasons.push('Identical content')
      }
    }
    
    if (doc1.tags && doc2.tags) {
      const commonTags = doc1.tags.filter(tag => doc2.tags.includes(tag))
      if (commonTags.length > 0) {
        reasons.push(`${commonTags.length} common tags`)
      }
    }
    
    return reasons
  }

  /**
   * Get storage statistics including GUID information
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    await this.ensureDatabase()
    
    try {
      const documents = await this.getAllDocuments()
      const guidDocs = documents.filter(doc => this.guidManager.isValidGuid(doc.id))
      const uidDocs = documents.filter(doc => this.guidManager.isOldUidFormat(doc.id))
      const invalidDocs = documents.filter(doc => 
        !this.guidManager.isValidGuid(doc.id) && !this.guidManager.isOldUidFormat(doc.id)
      )
      
      const totalSize = documents.reduce((sum, doc) => 
        sum + (doc.content || '').length + (doc.title || '').length, 0
      )
      
      return {
        totalDocuments: documents.length,
        guidDocuments: guidDocs.length,
        uidDocuments: uidDocs.length,
        invalidDocuments: invalidDocs.length,
        totalSizeBytes: totalSize,
        averageSizeBytes: documents.length > 0 ? Math.round(totalSize / documents.length) : 0,
        needsMigration: uidDocs.length > 0,
        databaseVersion: this.dbVersion,
        guidManagerStats: this.guidManager.getStats()
      }
    } catch (error) {
      return {
        error: error.message,
        totalDocuments: 0,
        guidDocuments: 0,
        uidDocuments: 0,
        invalidDocuments: 0,
        needsMigration: false
      }
    }
  }
}
