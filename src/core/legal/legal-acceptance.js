/**
 * Legal Acceptance Manager - IndexedDB-based legal document acceptance tracking
 * Follows Fantasy Editor standards: max 20 lines/function, defensive programming
 */
export class LegalAcceptanceManager {
  constructor() {
    this.dbName = 'FantasyEditorLegalDB'
    this.dbVersion = undefined // Will be determined dynamically
    this.storeName = 'legal_acceptances'
    this.db = null
    this.allowedDocumentTypes = [
      'privacy-policy',
      'terms-of-service',
      'eula',
      'license',
      'release-notes'
    ]
  }

  /**
   * Initialize IndexedDB database
   */
  async initDatabase() {

    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.warn('IndexedDB not supported, falling back to localStorage')
      this.db = null
      return Promise.resolve(null)
    }

    try {
      // First, try to open without version to get current version
      const currentVersion = await this.getCurrentDatabaseVersion()
      console.log('Current database version:', currentVersion)

      // Use current version + 1 if database exists, otherwise start with 1
      this.dbVersion = currentVersion ? currentVersion + 1 : 1
      console.log('Using database version:', this.dbVersion)

      return this.openDatabase()
    } catch (error) {
      console.error('Failed to initialize database:', error)
      console.warn('Falling back to localStorage')
      this.db = null
      return Promise.resolve(null)
    }
  }

  /**
   * Get current database version
   */
  async getCurrentDatabaseVersion() {
    return new Promise((resolve, reject) => {
      // Open without version to get current version
      const request = indexedDB.open(this.dbName)

      request.onsuccess = (event) => {
        const db = event.target.result
        const version = db.version
        db.close()
        resolve(version)
      }

      request.onerror = () => {
        // Database doesn't exist
        resolve(0)
      }
    })
  }

  /**
   * Open database with proper version
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion)

        request.onerror = (event) => {
          console.error('IndexedDB open error:', event.target.error)
          reject(new Error(`Failed to open legal database: ${event.target.error?.message || event.target.error || 'Unknown error'}`))
        }

        request.onsuccess = (event) => {
          const db = event.target.result
          this.db = db
          resolve(db)
        }

        request.onupgradeneeded = (event) => {
          const db = event.target.result

          // Remove existing object store if it exists with wrong name
          if (db.objectStoreNames.contains('legalAcceptances')) {
            console.log('Removing legacy object store: legalAcceptances')
            db.deleteObjectStore('legalAcceptances')
          }

          if (!db.objectStoreNames.contains(this.storeName)) {
            console.log('Creating object store:', this.storeName)
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
            store.createIndex('userId', 'userId', { unique: false })
            store.createIndex('documentType', 'documentType', { unique: false })
            store.createIndex('acceptedAt', 'acceptedAt', { unique: false })
            console.log('Object store created with indexes')
          }
        }
      } catch (error) {
        console.error('Error opening IndexedDB:', error)
        reject(new Error(`Failed to access IndexedDB: ${error.message}`))
      }
    })
  }


  /**
   * Record legal document acceptance
   */
  async recordAcceptance(acceptanceData) {
    await this.ensureDatabase()
    this.validateAcceptanceData(acceptanceData)

    const record = this.createAcceptanceRecord(acceptanceData)

    // Fallback to localStorage if IndexedDB failed
    if (!this.db) {
      return this.recordAcceptanceLocalStorage(record)
    }

    return new Promise((resolve, reject) => {
      try {
        // Double-check database and object store exist
        if (!this.db.objectStoreNames.contains(this.storeName)) {
          console.warn('Object store missing, falling back to localStorage')
          this.recordAcceptanceLocalStorage(record).then(resolve).catch(reject)
          return
        }

        const transaction = this.db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        // Use put instead of add to allow overwriting existing records
        const request = store.put(record)

        transaction.oncomplete = () => resolve(record)
        transaction.onerror = (event) => {
          console.error('Transaction error:', event.target.error)
          console.warn('Falling back to localStorage')
          this.recordAcceptanceLocalStorage(record).then(resolve).catch(reject)
        }
        transaction.onabort = (event) => {
          console.error('Transaction aborted:', event.target.error)
          console.warn('Falling back to localStorage')
          this.recordAcceptanceLocalStorage(record).then(resolve).catch(reject)
        }
      } catch (error) {
        console.error('Error creating transaction:', error)
        console.warn('Falling back to localStorage')
        this.recordAcceptanceLocalStorage(record).then(resolve).catch(reject)
      }
    })
  }

  /**
   * Record acceptance using localStorage fallback
   */
  async recordAcceptanceLocalStorage(record) {
    try {
      const storageKey = `${this.dbName}_${this.storeName}`
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')

      // Remove any existing record with same ID
      const filtered = existing.filter(r => r.id !== record.id)
      filtered.push(record)

      localStorage.setItem(storageKey, JSON.stringify(filtered))
      return record
    } catch (error) {
      throw new Error(`Failed to store acceptance in localStorage: ${error.message}`)
    }
  }

  /**
   * Get acceptance record by ID
   */
  async getAcceptance(id) {
    await this.ensureDatabase()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // Convert date strings back to Date objects
          result.acceptedAt = new Date(result.acceptedAt)
          result.createdAt = new Date(result.createdAt)
          result.updatedAt = new Date(result.updatedAt)
        }
        resolve(result || null)
      }
      request.onerror = () => reject(new Error('Failed to get acceptance'))
    })
  }

  /**
   * Get all acceptances for a user
   */
  async getAcceptancesByUser(userId) {
    await this.ensureDatabase()
    this.validateUserId(userId)

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('userId')
      const request = index.getAll(userId)

      request.onsuccess = () => {
        const results = request.result.map(this.convertDates)
        resolve(results)
      }
      request.onerror = () => reject(new Error('Failed to get user acceptances'))
    })
  }

  /**
   * Get acceptances by document type
   */
  async getAcceptancesByDocumentType(documentType) {
    await this.ensureDatabase()
    this.validateDocumentType(documentType)

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('documentType')
      const request = index.getAll(documentType)

      request.onsuccess = () => {
        const results = request.result.map(this.convertDates)
        resolve(results)
      }
      request.onerror = () => reject(new Error('Failed to get document acceptances'))
    })
  }

  /**
   * Get user's acceptance for specific document type
   */
  async getUserAcceptance(userId, documentType) {
    this.validateUserId(userId)
    this.validateDocumentType(documentType)

    const userAcceptances = await this.getAcceptancesByUser(userId)
    return userAcceptances.find(a => a.documentType === documentType) || null
  }

  /**
   * Get all acceptances
   */
  async getAllAcceptances() {
    await this.ensureDatabase()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result.map(this.convertDates)
        resolve(results)
      }
      request.onerror = () => reject(new Error('Failed to get all acceptances'))
    })
  }

  /**
   * Check if user has accepted document with specific hash
   */
  async hasUserAccepted(userId, documentType, documentHash) {
    this.validateUserId(userId)
    this.validateDocumentType(documentType)

    if (!documentHash) {
      throw new Error('Document hash is required')
    }

    try {
      const acceptance = await this.getUserAcceptance(userId, documentType)
      return acceptance ? acceptance.documentHash === documentHash : false
    } catch (error) {
      // Fallback to localStorage if IndexedDB fails
      return this.hasUserAcceptedLocalStorage(userId, documentType, documentHash)
    }
  }

  /**
   * Check acceptance using localStorage fallback
   */
  hasUserAcceptedLocalStorage(userId, documentType, documentHash) {
    try {
      const storageKey = `${this.dbName}_${this.storeName}`
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]')

      const acceptance = records.find(r =>
        r.userId === userId && r.documentType === documentType
      )

      return acceptance ? acceptance.documentHash === documentHash : false
    } catch (error) {
      console.error('Error checking localStorage acceptance:', error)
      return false
    }
  }

  /**
   * Get acceptance status for multiple documents
   */
  async getUserAcceptanceStatus(userId, documentHashes) {
    this.validateUserId(userId)

    if (!documentHashes || typeof documentHashes !== 'object') {
      throw new Error('Document hashes must be an object')
    }

    const statuses = {}

    for (const [documentType, expectedHash] of Object.entries(documentHashes)) {
      try {
        statuses[documentType] = await this.hasUserAccepted(userId, documentType, expectedHash)
      } catch (error) {
        statuses[documentType] = false
      }
    }

    return statuses
  }

  /**
   * Get acceptance history for user and document type
   */
  async getAcceptanceHistory(userId, documentType) {
    this.validateUserId(userId)
    this.validateDocumentType(documentType)

    const userAcceptances = await this.getAcceptancesByUser(userId)
    return userAcceptances
      .filter(a => a.documentType === documentType)
      .sort((a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt))
  }

  /**
   * Get latest acceptance for user and document type
   */
  async getLatestAcceptance(userId, documentType) {
    const history = await this.getAcceptanceHistory(userId, documentType)
    return history.length > 0 ? history[0] : null
  }

  /**
   * Check if user has any acceptance records at all
   * Used to determine if user has previously accepted legal documents
   */
  async hasAnyAcceptanceRecords(userId) {
    this.validateUserId(userId)

    try {
      const userAcceptances = await this.getAcceptancesByUser(userId)
      return userAcceptances.length > 0
    } catch (error) {
      console.warn('Error checking acceptance records:', error)
      return false
    }
  }

  /**
   * Get complete acceptance history for user
   */
  async getUserAcceptanceHistory(userId) {
    const userAcceptances = await this.getAcceptancesByUser(userId)
    return userAcceptances.sort((a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt))
  }

  /**
   * Delete acceptance by ID
   */
  async deleteAcceptance(id) {
    await this.ensureDatabase()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Failed to delete acceptance'))
    })
  }

  /**
   * Delete all acceptances for user
   */
  async deleteUserAcceptances(userId) {
    const userAcceptances = await this.getAcceptancesByUser(userId)

    for (const acceptance of userAcceptances) {
      await this.deleteAcceptance(acceptance.id)
    }
  }

  /**
   * Clear all acceptances
   */
  async clearAllAcceptances() {
    await this.ensureDatabase()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Failed to clear acceptances'))
    })
  }

  /**
   * Get acceptance statistics
   */
  async getAcceptanceStats() {
    const allAcceptances = await this.getAllAcceptances()

    if (allAcceptances.length === 0) {
      return {
        totalAcceptances: 0,
        uniqueUsers: 0,
        documentTypes: [],
        oldestAcceptance: null,
        newestAcceptance: null
      }
    }

    const uniqueUsers = [...new Set(allAcceptances.map(a => a.userId))].length
    const documentTypes = [...new Set(allAcceptances.map(a => a.documentType))].sort()
    const dates = allAcceptances.map(a => new Date(a.acceptedAt))

    return {
      totalAcceptances: allAcceptances.length,
      uniqueUsers,
      documentTypes,
      oldestAcceptance: new Date(Math.min(...dates)),
      newestAcceptance: new Date(Math.max(...dates))
    }
  }

  /**
   * Ensure database is initialized
   */
  async ensureDatabase() {
    if (!this.db) {
      await this.initDatabase()
    }
  }

  /**
   * Create acceptance record with metadata
   */
  createAcceptanceRecord(data) {
    const now = new Date()
    const id = this.generateAcceptanceId()

    return {
      id,
      userId: data.userId,
      documentType: data.documentType,
      documentHash: data.documentHash,
      documentVersion: data.documentVersion,
      acceptedAt: data.acceptedAt || now,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Generate unique acceptance ID
   */
  generateAcceptanceId() {
    return `acceptance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate acceptance data
   */
  validateAcceptanceData(data) {
    if (!data) {
      throw new Error('Acceptance data is required')
    }

    if (typeof data !== 'object') {
      throw new Error('Acceptance data must be an object')
    }

    this.validateUserId(data.userId)
    this.validateDocumentType(data.documentType)

    if (!data.documentHash) {
      throw new Error('Document hash is required')
    }

    if (!data.documentVersion) {
      throw new Error('Document version is required')
    }
  }

  /**
   * Validate user ID
   */
  validateUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required')
    }
  }

  /**
   * Validate document type
   */
  validateDocumentType(documentType) {
    if (!documentType) {
      throw new Error('Document type is required')
    }

    if (!this.allowedDocumentTypes.includes(documentType)) {
      throw new Error('Invalid document type')
    }
  }

  /**
   * Convert date strings back to Date objects
   */
  convertDates(record) {
    if (!record) return record

    return {
      ...record,
      acceptedAt: record.acceptedAt ? new Date(record.acceptedAt) : record.acceptedAt,
      createdAt: record.createdAt ? new Date(record.createdAt) : record.createdAt,
      updatedAt: record.updatedAt ? new Date(record.updatedAt) : record.updatedAt
    }
  }
}