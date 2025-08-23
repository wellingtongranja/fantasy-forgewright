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

    // Validate readonly property
    if (doc.readonly !== undefined && typeof doc.readonly !== 'boolean') {
      throw new Error('Document readonly must be a boolean')
    }

    // Validate document type
    if (doc.type !== undefined && !['user', 'system'].includes(doc.type)) {
      throw new Error('Document type must be "user" or "system"')
    }

    // Validate system ID for system documents
    if (doc.type === 'system' && (!doc.systemId || typeof doc.systemId !== 'string')) {
      throw new Error('System documents must have a valid systemId')
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
      sanitized.title = sanitized.title.replace(/<[^>]*>/g, '').trim()
    }

    // Ensure tags are strings
    if (sanitized.tags) {
      sanitized.tags = sanitized.tags
        .filter((tag) => typeof tag === 'string')
        .map((tag) => tag.toLowerCase().trim())
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

    // Check if document is readonly (system documents cannot be modified)
    if (document.readonly === true || document.type === 'system') {
      throw new Error('Cannot modify readonly or system documents')
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
      
      // Set default properties for new documents
      processedDoc.readonly = document.readonly || false
      processedDoc.type = document.type || 'user'
      if (document.systemId) {
        processedDoc.systemId = document.systemId
      }
    } else {
      // Update existing document - check if it's readonly first
      const existingDoc = await this.getDocument(document.id)
      if (existingDoc && (existingDoc.readonly === true || existingDoc.type === 'system')) {
        throw new Error('Cannot modify readonly or system documents')
      }

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
      
      // Preserve readonly and type properties
      processedDoc.readonly = document.readonly !== undefined ? document.readonly : (existingDoc?.readonly || false)
      processedDoc.type = document.type || existingDoc?.type || 'user'
      if (document.systemId || existingDoc?.systemId) {
        processedDoc.systemId = document.systemId || existingDoc.systemId
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

    return documents.filter((doc) => {
      const titleMatch = doc.title?.toLowerCase().includes(lowerQuery)
      const contentMatch = doc.content?.toLowerCase().includes(lowerQuery)
      const tagMatch = doc.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))

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
    return documents.find((doc) => doc.filename === filename) || null
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
        } else if (
          existingDoc.title.toLowerCase().includes(document.title.toLowerCase()) ||
          document.title.toLowerCase().includes(existingDoc.title.toLowerCase())
        ) {
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
          const commonWords = docWords.filter((word) => existingWords.includes(word))

          if (commonWords.length > Math.min(docWords.length, existingWords.length) * 0.5) {
            similarity += 20 // 20% weight for significant word overlap
          }
        }
      }

      // Check tag similarity
      if (
        document.tags &&
        existingDoc.tags &&
        document.tags.length > 0 &&
        existingDoc.tags.length > 0
      ) {
        const commonTags = document.tags.filter((tag) => existingDoc.tags.includes(tag))
        if (commonTags.length > 0) {
          similarity +=
            (commonTags.length / Math.max(document.tags.length, existingDoc.tags.length)) * 10
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
      const commonTags = doc1.tags.filter((tag) => doc2.tags.includes(tag))
      if (commonTags.length > 0) {
        reasons.push(`${commonTags.length} common tags`)
      }
    }

    return reasons
  }

  /**
   * Get storage statistics including GUID and GitHub information
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    await this.ensureDatabase()

    try {
      const documents = await this.getAllDocuments()
      const guidDocs = documents.filter((doc) => this.guidManager.isValidGuid(doc.id))
      const githubDocs = documents.filter((doc) => doc.githubSha || doc.githubPath)
      const syncedDocs = documents.filter((doc) => doc.lastSyncedAt)

      const totalSize = documents.reduce(
        (sum, doc) => sum + (doc.content || '').length + (doc.title || '').length,
        0
      )

      return {
        totalDocuments: documents.length,
        guidDocuments: guidDocs.length,
        githubDocuments: githubDocs.length,
        syncedDocuments: syncedDocs.length,
        totalSizeBytes: totalSize,
        averageSizeBytes: documents.length > 0 ? Math.round(totalSize / documents.length) : 0,
        databaseVersion: this.dbVersion
      }
    } catch (error) {
      return {
        error: error.message,
        totalDocuments: 0,
        guidDocuments: 0,
        githubDocuments: 0,
        syncedDocuments: 0
      }
    }
  }

  /**
   * Update document with GitHub sync metadata
   * @param {string} documentId - Document ID
   * @param {Object} githubMetadata - GitHub metadata
   * @returns {Promise<Object>} Updated document
   */
  async updateGitHubMetadata(documentId, githubMetadata) {
    await this.ensureDatabase()

    const document = await this.getDocument(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const updatedDoc = {
      ...document,
      githubSha: githubMetadata.sha,
      githubPath: githubMetadata.path,
      lastSyncedAt: githubMetadata.lastSyncedAt || new Date().toISOString()
    }

    return await this.saveDocument(updatedDoc)
  }

  /**
   * Get documents that need syncing to GitHub
   * @param {Date} since - Only return documents modified since this date
   * @returns {Promise<Array>} Documents needing sync
   */
  async getDocumentsNeedingSync(since = null) {
    await this.ensureDatabase()

    const documents = await this.getAllDocuments()

    return documents.filter((doc) => {
      // Skip if document has never been modified
      if (!doc.updatedAt) return false

      const updatedAt = new Date(doc.updatedAt)

      // If since date provided, only include documents modified after that
      if (since && updatedAt <= since) return false

      // Include if never synced or modified after last sync
      if (!doc.lastSyncedAt) return true

      const lastSynced = new Date(doc.lastSyncedAt)
      return updatedAt > lastSynced
    })
  }

  /**
   * Mark document as synced
   * @param {string} documentId - Document ID
   * @returns {Promise<void>}
   */
  async markAsSynced(documentId) {
    await this.ensureDatabase()

    const document = await this.getDocument(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    document.lastSyncedAt = new Date().toISOString()
    await this.saveDocument(document)
  }

  /**
   * Get sync status for a document
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Sync status
   */
  async getDocumentSyncStatus(documentId) {
    await this.ensureDatabase()

    const document = await this.getDocument(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const hasGitHubMetadata = !!(document.githubSha && document.githubPath)
    const lastSynced = document.lastSyncedAt ? new Date(document.lastSyncedAt) : null
    const lastModified = document.updatedAt ? new Date(document.updatedAt) : null

    let status = 'unknown'
    if (!hasGitHubMetadata) {
      status = 'not_synced'
    } else if (!lastSynced) {
      status = 'pending_sync'
    } else if (lastModified && lastModified > lastSynced) {
      status = 'needs_sync'
    } else {
      status = 'synced'
    }

    return {
      status,
      hasGitHubMetadata,
      lastSynced,
      lastModified,
      githubSha: document.githubSha,
      githubPath: document.githubPath
    }
  }

  /**
   * Remove GitHub metadata from document
   * @param {string} documentId - Document ID
   * @returns {Promise<void>}
   */
  async removeGitHubMetadata(documentId) {
    await this.ensureDatabase()

    const document = await this.getDocument(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    delete document.githubSha
    delete document.githubPath
    delete document.lastSyncedAt

    await this.saveDocument(document)
  }

  /**
   * Set document readonly status
   * @param {string} documentId - Document ID
   * @param {boolean} readonly - Whether document should be readonly
   * @returns {Promise<Object>} Updated document
   */
  async setDocumentReadonly(documentId, readonly = true) {
    await this.ensureDatabase()

    const document = await this.getDocument(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    // System documents are always readonly
    if (document.type === 'system') {
      throw new Error('Cannot modify readonly status of system documents')
    }

    document.readonly = readonly
    return await this.saveDocument(document)
  }

  /**
   * Check if document is readonly
   * @param {string} documentId - Document ID
   * @returns {Promise<boolean>} Whether document is readonly
   */
  async isDocumentReadonly(documentId) {
    await this.ensureDatabase()

    const document = await this.getDocument(documentId)
    if (!document) {
      return false
    }

    return document.readonly === true || document.type === 'system'
  }

  /**
   * Get documents by type
   * @param {string} type - Document type ('user' or 'system')
   * @returns {Promise<Array>} Documents of specified type
   */
  async getDocumentsByType(type) {
    await this.ensureDatabase()

    const documents = await this.getAllDocuments()
    return documents.filter(doc => (doc.type || 'user') === type)
  }

  /**
   * Get system document by systemId
   * @param {string} systemId - System document identifier
   * @returns {Promise<Object|null>} System document or null
   */
  async getSystemDocument(systemId) {
    await this.ensureDatabase()

    const documents = await this.getAllDocuments()
    return documents.find(doc => doc.type === 'system' && doc.systemId === systemId) || null
  }

  /**
   * Get readonly documents
   * @returns {Promise<Array>} All readonly documents
   */
  async getReadonlyDocuments() {
    await this.ensureDatabase()

    const documents = await this.getAllDocuments()
    return documents.filter(doc => doc.readonly === true || doc.type === 'system')
  }

  /**
   * Get user documents (editable documents)
   * @returns {Promise<Array>} All user documents
   */
  async getUserDocuments() {
    await this.ensureDatabase()

    const documents = await this.getAllDocuments()
    return documents.filter(doc => (doc.type || 'user') === 'user' && doc.readonly !== true)
  }
}
