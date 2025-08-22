export class StorageManager {
  constructor() {
    this.dbName = 'FantasyEditorDB'
    this.dbVersion = 1
    this.storeName = 'documents'
    this.db = null
    this.initDatabase()
  }

  /**
   * Generate unique document identifier
   * Format: doc_timestamp_random8chars
   */
  generateUID() {
    const timestamp = Date.now()
    const random = Math.random().toString(16).substr(2, 8)
    return `doc_${timestamp}_${random}`
  }

  /**
   * Generate checksum for content integrity
   */
  generateChecksum(content) {
    let hash = 0
    if (!content || content.length === 0) return '00000000'
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16).padStart(8, '0').substr(0, 8)
  }

  /**
   * Validate document structure
   */
  validateDocument(doc) {
    if (!doc || typeof doc !== 'object') {
      throw new Error('Invalid document: document must be an object')
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
    
    // Validate and sanitize document
    this.validateDocument(document)
    const sanitizedDoc = this.sanitizeDocument(document)
    
    // Generate UID for new documents
    if (!sanitizedDoc.id) {
      sanitizedDoc.id = this.generateUID()
      sanitizedDoc.createdAt = new Date().toISOString()
    }
    
    // Update timestamp
    sanitizedDoc.updatedAt = new Date().toISOString()
    
    // Generate checksum for integrity
    if (sanitizedDoc.content) {
      sanitizedDoc.checksum = this.generateChecksum(sanitizedDoc.content)
    }
    
    // Ensure tags array exists
    if (!sanitizedDoc.tags) {
      sanitizedDoc.tags = []
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(sanitizedDoc)
      
      transaction.oncomplete = () => resolve(sanitizedDoc)
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
}
