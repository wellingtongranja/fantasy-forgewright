/**
 * Development Helper Utilities
 * Console utilities for manual regression testing and development
 * Use in browser console: window.devHelpers.cleanStorage()
 */

export class DevHelpers {
  constructor() {
    this.app = null
  }

  /**
   * Initialize with the app instance
   * @param {Object} app - Fantasy Editor app instance
   */
  init(app) {
    this.app = app
  }

  /**
   * Clean all local storage including IndexedDB
   * Useful for testing fresh installs
   */
  async cleanStorage() {
    try {
      console.log('🧹 Cleaning all storage...')

      // Clear localStorage
      const localStorageKeys = Object.keys(localStorage)
      console.log(`📦 Clearing ${localStorageKeys.length} localStorage items:`, localStorageKeys)
      localStorage.clear()

      // Clear sessionStorage
      const sessionStorageKeys = Object.keys(sessionStorage)
      if (sessionStorageKeys.length > 0) {
        console.log(
          `📦 Clearing ${sessionStorageKeys.length} sessionStorage items:`,
          sessionStorageKeys
        )
        sessionStorage.clear()
      }

      // Clear IndexedDB databases
      if ('indexedDB' in window) {
        // Get list of databases (if supported)
        if (indexedDB.databases) {
          const databases = await indexedDB.databases()
          console.log(
            `🗄️ Found ${databases.length} IndexedDB databases:`,
            databases.map((db) => db.name)
          )

          for (const db of databases) {
            await this.deleteDatabase(db.name)
          }
        } else {
          // Fallback: try to delete known database
          await this.deleteDatabase('FantasyEditorDB')
        }
      }

      // Clear service worker cache if available
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        console.log(`🗃️ Found ${cacheNames.length} cache storages:`, cacheNames)

        for (const cacheName of cacheNames) {
          await caches.delete(cacheName)
          console.log(`🗑️ Deleted cache: ${cacheName}`)
        }
      }

      console.log('✅ Storage cleaned successfully!')
      console.log('🔄 Reload the page to start fresh')

      return {
        success: true,
        message: 'Storage cleaned successfully. Reload the page to start fresh.',
        clearedItems: {
          localStorage: localStorageKeys.length,
          sessionStorage: sessionStorageKeys.length,
          indexedDBCleaned: true,
          cachesCleaned: true
        }
      }
    } catch (error) {
      console.error('❌ Failed to clean storage:', error)
      return {
        success: false,
        message: `Failed to clean storage: ${error.message}`,
        error
      }
    }
  }

  /**
   * Delete an IndexedDB database
   * @param {string} dbName - Database name to delete
   */
  async deleteDatabase(dbName) {
    return new Promise((resolve) => {
      console.log(`🗑️ Deleting IndexedDB database: ${dbName}`)

      try {
        const deleteRequest = indexedDB.deleteDatabase(dbName)

        deleteRequest.onsuccess = () => {
          console.log(`✅ Deleted IndexedDB database: ${dbName}`)
          resolve()
        }

        deleteRequest.onerror = (event) => {
          console.warn(
            `⚠️ Failed to delete IndexedDB database: ${dbName}`,
            event.target?.error?.message
          )
          resolve() // Don't fail the whole operation
        }

        deleteRequest.onblocked = () => {
          console.warn(
            `⚠️ Delete blocked for IndexedDB database: ${dbName} - database may be open in another tab`
          )
          console.log('💡 Try closing other tabs or use devHelpers.freshStart() to reload')
          resolve() // Don't fail the whole operation
        }

        // Add timeout to prevent hanging
        setTimeout(() => {
          console.warn(`⏱️ Timeout deleting IndexedDB database: ${dbName} - continuing anyway`)
          resolve()
        }, 5000)
      } catch (error) {
        console.warn(`⚠️ Error deleting IndexedDB database: ${dbName}`, error.message)
        resolve() // Don't fail the whole operation
      }
    })
  }

  /**
   * Fresh start - clean storage and reload
   * Combines cleanStorage() with automatic page reload
   */
  async freshStart() {
    console.log('🚀 Starting fresh - cleaning storage and reloading...')

    const result = await this.cleanStorage()

    if (result.success) {
      console.log('🔄 Reloading page in 2 seconds...')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }

    return result
  }

  /**
   * Generate test documents for regression testing
   * @param {number} count - Number of documents to create
   */
  async generateTestDocuments(count = 5) {
    if (!this.app) {
      console.error('❌ App not initialized. Use devHelpers.init(app) first.')
      return { success: false, message: 'App not initialized' }
    }

    try {
      console.log(`📝 Generating ${count} test documents...`)
      const documents = []

      for (let i = 1; i <= count; i++) {
        const doc = {
          title: `Test Document ${i}`,
          content: `# Test Document ${i}\n\nThis is test content for document ${i}.\n\n## Features\n\n- **GUID System**: ${this.app.guidManager.generateGuid()}\n- **Creation Date**: ${new Date().toISOString()}\n- **Test Number**: ${i}\n\n## Sample Content\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n### Code Example\n\n\`\`\`javascript\nconsole.log('Test document ${i}');\n\`\`\``,
          tags: [`test`, `document-${i}`, i % 2 === 0 ? 'even' : 'odd']
        }

        const savedDoc = await this.app.storageManager.saveDocument(doc)
        documents.push(savedDoc)
        console.log(`✅ Created document ${i}: ${savedDoc.title} (${savedDoc.id})`)
      }

      // Refresh file tree if available
      if (this.app.fileTree) {
        await this.app.fileTree.refresh()
      }

      console.log(`🎉 Generated ${documents.length} test documents successfully!`)

      return {
        success: true,
        message: `Generated ${documents.length} test documents`,
        documents: documents.map((doc) => ({ id: doc.id, title: doc.title }))
      }
    } catch (error) {
      console.error('❌ Failed to generate test documents:', error)
      return {
        success: false,
        message: `Failed to generate test documents: ${error.message}`,
        error
      }
    }
  }

  /**
   * Show current storage statistics
   */
  async showStorageInfo() {
    if (!this.app) {
      console.error('❌ App not initialized. Use devHelpers.init(app) first.')
      return { success: false, message: 'App not initialized' }
    }

    try {
      console.log('📊 Storage Information:')

      // Get storage stats
      const stats = await this.app.storageManager.getStorageStats()
      console.table(stats)

      // Get all documents
      const documents = await this.app.storageManager.getAllDocuments()
      console.log('📄 Documents:')
      console.table(
        documents.map((doc) => ({
          id: `${doc.id.substring(0, 20)}...`,
          title: doc.title,
          type: this.app.guidManager.isValidGuid(doc.id) ? 'GUID' : 'Legacy',
          size: `${(doc.content || '').length} chars`,
          created: doc.metadata?.created || doc.createdAt,
          modified: doc.metadata?.modified || doc.updatedAt
        }))
      )

      // LocalStorage info
      console.log('💾 LocalStorage:')
      const localStorageInfo = {}
      Object.keys(localStorage).forEach((key) => {
        localStorageInfo[key] = `${localStorage.getItem(key).length} chars`
      })
      console.table(localStorageInfo)

      return {
        success: true,
        stats,
        documents: documents.length,
        localStorageKeys: Object.keys(localStorage).length
      }
    } catch (error) {
      console.error('❌ Failed to get storage info:', error)
      return {
        success: false,
        message: `Failed to get storage info: ${error.message}`,
        error
      }
    }
  }

  /**
   * Test document operations
   */
  async testDocumentOperations() {
    if (!this.app) {
      console.error('❌ App not initialized. Use devHelpers.init(app) first.')
      return { success: false, message: 'App not initialized' }
    }

    try {
      console.log('🧪 Testing document operations...')

      // Create a test document
      console.log('1. Creating test document...')
      const testDoc = {
        title: 'Test Document',
        content: '# Test\n\nThis is a test document.',
        tags: ['test', 'automated']
      }

      const savedDoc = await this.app.storageManager.saveDocument(testDoc)
      console.log('✅ Document created:', savedDoc.id)

      // Update the document
      console.log('2. Updating document...')
      savedDoc.content += '\n\n## Updated Content\n\nThis was added by the test.'
      await this.app.storageManager.saveDocument(savedDoc)
      console.log('✅ Document updated')

      // Retrieve the document
      console.log('3. Retrieving document...')
      const retrievedDoc = await this.app.storageManager.getDocument(savedDoc.id)
      console.log('✅ Document retrieved:', retrievedDoc.title)

      // Search for the document
      console.log('4. Searching documents...')
      const searchResults = await this.app.storageManager.searchDocuments('test')
      console.log('✅ Search results:', searchResults.length)

      // Delete the document
      console.log('5. Deleting test document...')
      await this.app.storageManager.deleteDocument(savedDoc.id)
      console.log('✅ Document deleted')

      console.log('🎉 All document operations completed successfully!')

      return {
        success: true,
        message: 'All document operations completed successfully',
        operations: ['create', 'update', 'retrieve', 'search', 'delete']
      }
    } catch (error) {
      console.error('❌ Document operations test failed:', error)
      return {
        success: false,
        message: `Document operations test failed: ${error.message}`,
        error
      }
    }
  }

  /**
   * Show help for dev helpers
   */
  help() {
    console.log(`
🛠️ Fantasy Editor Development Helpers

Available Methods:
┌─────────────────────────────────────────────────────────────┐
│ devHelpers.cleanStorage()        - Clean all storage       │
│ devHelpers.freshStart()          - Clean storage & reload  │
│ devHelpers.generateTestDocuments(5) - Create test docs     │
│ devHelpers.showStorageInfo()     - Show storage stats      │
│ devHelpers.testDocumentOperations() - Test CRUD operations │
│ devHelpers.help()                - Show this help          │
└─────────────────────────────────────────────────────────────┘

Usage Examples:
  devHelpers.cleanStorage()           // Clean all data
  devHelpers.freshStart()             // Clean and reload
  devHelpers.generateTestDocuments(3) // Create 3 test docs
  devHelpers.showStorageInfo()        // Show current state

Note: Make sure to call devHelpers.init(fantasyEditor) first
    `)

    return {
      success: true,
      message: 'Help displayed',
      methods: [
        'cleanStorage()',
        'freshStart()',
        'generateTestDocuments(count)',
        'showStorageInfo()',
        'testDocumentOperations()',
        'help()'
      ]
    }
  }
}

// Create singleton instance
export const devHelpers = new DevHelpers()

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.devHelpers = devHelpers
}
