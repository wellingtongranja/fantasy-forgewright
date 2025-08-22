export class StorageManager {
  constructor() {
    this.dbName = 'FantasyEditorDB'
    this.dbVersion = 1
    this.storeName = 'documents'
    this.db = null
    this.initDatabase()
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
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(document)
      
      request.onsuccess = () => resolve(document)
      request.onerror = () => reject(new Error('Failed to save document'))
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
