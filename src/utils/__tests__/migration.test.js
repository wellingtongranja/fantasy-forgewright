/**
 * Migration Utility Tests
 * Test suite for UID to GUID migration functionality
 */

import { MigrationManager } from '../migration.js'
import { guidManager } from '../guid.js'

// Mock storage manager for testing
class MockStorageManager {
  constructor() {
    this.documents = []
  }

  async getAllDocuments() {
    return [...this.documents]
  }

  async saveDocument(doc) {
    this.validateDocument(doc)
    const existingIndex = this.documents.findIndex((d) => d.id === doc.id)
    if (existingIndex >= 0) {
      this.documents[existingIndex] = doc
    } else {
      this.documents.push(doc)
    }
    return doc
  }

  async deleteDocument(id) {
    const index = this.documents.findIndex((d) => d.id === id)
    if (index >= 0) {
      this.documents.splice(index, 1)
    }
  }

  validateDocument(doc) {
    if (!doc.title || typeof doc.title !== 'string') {
      throw new Error('Document title is required')
    }
    if (!doc.id) {
      throw new Error('Document ID is required')
    }
  }

  // Helper method to seed test data
  addDocument(doc) {
    this.documents.push(doc)
  }

  clear() {
    this.documents = []
  }
}

describe('MigrationManager', () => {
  let migrationManager
  let mockStorage
  let originalLocalStorage

  beforeEach(() => {
    mockStorage = new MockStorageManager()
    migrationManager = new MigrationManager(mockStorage)

    // Mock localStorage
    originalLocalStorage = global.localStorage
    global.localStorage = {
      storage: {},
      getItem: jest.fn((key) => global.localStorage.storage[key] || null),
      setItem: jest.fn((key, value) => {
        global.localStorage.storage[key] = value
      }),
      removeItem: jest.fn((key) => {
        delete global.localStorage.storage[key]
      })
    }
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
  })

  describe('Migration Status Check', () => {
    it('should detect when migration is needed', async () => {
      // Add old format document
      mockStorage.addDocument({
        id: 'doc_1648125632_a1b2c3d4',
        title: 'Old Document',
        content: 'Test content'
      })

      const isNeeded = await migrationManager.isMigrationNeeded()
      expect(isNeeded).toBe(true)
    })

    it('should detect when migration is not needed', async () => {
      // Add new format document
      mockStorage.addDocument({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New Document',
        content: 'Test content'
      })

      const isNeeded = await migrationManager.isMigrationNeeded()
      expect(isNeeded).toBe(false)
    })

    it('should handle empty database', async () => {
      const isNeeded = await migrationManager.isMigrationNeeded()
      expect(isNeeded).toBe(false)
    })
  })

  describe('Migration Statistics', () => {
    it('should provide accurate migration statistics', async () => {
      // Add mixed format documents
      mockStorage.addDocument({
        id: 'doc_1648125632_a1b2c3d4',
        title: 'Old Document 1'
      })
      mockStorage.addDocument({
        id: 'doc_1648125633_b2c3d4e5',
        title: 'Old Document 2'
      })
      mockStorage.addDocument({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New Document'
      })

      const stats = await migrationManager.getMigrationStats()

      expect(stats.total).toBe(3)
      expect(stats.needsMigration).toBe(2)
      expect(stats.alreadyMigrated).toBe(1)
      expect(stats.invalid).toBe(0)
      expect(stats.migrationNeeded).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      // Mock storage error
      mockStorage.getAllDocuments = jest.fn().mockRejectedValue(new Error('Database error'))

      const stats = await migrationManager.getMigrationStats()
      expect(stats.error).toBe('Database error')
      expect(stats.total).toBe(0)
    })
  })

  describe('Single Document Migration', () => {
    it('should migrate document from UID to GUID format', async () => {
      const oldDoc = {
        id: 'doc_1648125632_a1b2c3d4',
        title: 'Test Document',
        content: '# Hello World',
        tags: ['test'],
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T14:45:00Z'
      }

      mockStorage.addDocument(oldDoc)

      const migratedDoc = await migrationManager.migrateDocument(oldDoc)

      expect(guidManager.isValidGuid(migratedDoc.id)).toBe(true)
      expect(migratedDoc.title).toBe('Test Document')
      expect(migratedDoc.content).toBe('# Hello World')
      expect(migratedDoc.tags).toEqual(['test'])
      expect(migratedDoc.metadata.migratedFrom).toBe('doc_1648125632_a1b2c3d4')
      expect(migratedDoc.metadata.guid).toBe(migratedDoc.id)
      expect(migratedDoc.filename).toMatch(/^test-document-[0-9a-f]{8}\.md$/)
      expect(migratedDoc.sync.status).toBe('local')

      // Old document should be deleted
      const allDocs = await mockStorage.getAllDocuments()
      expect(allDocs.find((d) => d.id === oldDoc.id)).toBeUndefined()
      expect(allDocs.find((d) => d.id === migratedDoc.id)).toBeDefined()
    })

    it('should throw error for document that does not need migration', async () => {
      const newDoc = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New Document'
      }

      await expect(migrationManager.migrateDocument(newDoc)).rejects.toThrow(
        'Document does not need migration'
      )
    })

    it('should handle documents with missing fields', async () => {
      const incompleteDoc = {
        id: 'doc_1648125632_a1b2c3d4'
        // Missing title, content, etc.
      }

      mockStorage.addDocument(incompleteDoc)
      const migratedDoc = await migrationManager.migrateDocument(incompleteDoc)

      expect(migratedDoc.title).toBe('Untitled Document')
      expect(migratedDoc.content).toBe('')
      expect(migratedDoc.tags).toEqual([])
    })
  })

  describe('Full Migration Process', () => {
    it('should migrate all documents successfully', async () => {
      // Add documents that need migration
      const oldDocs = [
        { id: 'doc_1648125632_a1b2c3d4', title: 'Document 1', content: 'Content 1' },
        { id: 'doc_1648125633_b2c3d4e5', title: 'Document 2', content: 'Content 2' },
        { id: 'doc_1648125634_c3d4e5f6', title: 'Document 3', content: 'Content 3' }
      ]

      oldDocs.forEach((doc) => mockStorage.addDocument(doc))

      const result = await migrationManager.migrateAllDocuments({
        backupFirst: false // Skip backup for test
      })

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(3)
      expect(result.errors).toBe(0)

      // Verify all documents have been migrated
      const allDocs = await mockStorage.getAllDocuments()
      expect(allDocs.length).toBe(3)
      allDocs.forEach((doc) => {
        expect(guidManager.isValidGuid(doc.id)).toBe(true)
      })
    })

    it('should skip migration when not needed', async () => {
      // Add new format document
      mockStorage.addDocument({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New Document'
      })

      const result = await migrationManager.migrateAllDocuments()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(0)
      expect(result.message).toContain('No migration needed')
    })

    it('should handle migration errors gracefully when continueOnError is true', async () => {
      // Add valid document
      mockStorage.addDocument({
        id: 'doc_1648125632_a1b2c3d4',
        title: 'Valid Document'
      })

      // Add invalid document (will cause validation error)
      mockStorage.addDocument({
        id: 'doc_1648125633_b2c3d4e5',
        title: '', // Empty title will cause validation error
        content: 'Test'
      })

      const result = await migrationManager.migrateAllDocuments({
        backupFirst: false,
        continueOnError: true
      })

      expect(result.success).toBe(false) // Has errors
      expect(result.migrated).toBe(1) // One succeeded
      expect(result.errors).toBe(1) // One failed
      expect(result.errorDetails).toHaveLength(1)
    })

    it('should stop on first error when continueOnError is false', async () => {
      // Add invalid document first
      mockStorage.addDocument({
        id: 'doc_1648125632_a1b2c3d4',
        title: '', // Will cause validation error
        content: 'Test'
      })

      mockStorage.addDocument({
        id: 'doc_1648125633_b2c3d4e5',
        title: 'Valid Document',
        content: 'Test'
      })

      await expect(
        migrationManager.migrateAllDocuments({
          backupFirst: false,
          continueOnError: false
        })
      ).rejects.toThrow('Migration stopped due to error')
    })

    it('should prevent concurrent migrations', async () => {
      mockStorage.addDocument({
        id: 'doc_1648125632_a1b2c3d4',
        title: 'Test Document'
      })

      // Start first migration
      const migration1 = migrationManager.migrateAllDocuments({ backupFirst: false })

      // Try to start second migration
      await expect(migrationManager.migrateAllDocuments({ backupFirst: false })).rejects.toThrow(
        'Migration already in progress'
      )

      // Wait for first migration to complete
      await migration1
    })
  })

  describe('Backup and Restore', () => {
    it('should create backup before migration', async () => {
      const testDoc = {
        id: 'doc_1648125632_a1b2c3d4',
        title: 'Test Document',
        content: 'Test content'
      }
      mockStorage.addDocument(testDoc)

      const backupId = await migrationManager.createBackup()

      expect(backupId).toMatch(/^backup_\d+_[a-f0-9]{8}$/)
      expect(global.localStorage.getItem).toHaveBeenCalledWith('migration_backups')
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        backupId,
        expect.stringContaining('"documents"')
      )
    })

    it('should restore from backup', async () => {
      const backupData = {
        id: 'backup_test',
        timestamp: new Date().toISOString(),
        documents: [
          { id: 'doc_1', title: 'Document 1', content: 'Content 1' },
          { id: 'doc_2', title: 'Document 2', content: 'Content 2' }
        ],
        count: 2
      }

      global.localStorage.storage['backup_test'] = JSON.stringify(backupData)

      const result = await migrationManager.restoreFromBackup('backup_test')

      expect(result.success).toBe(true)
      expect(result.restored).toBe(2)

      const allDocs = await mockStorage.getAllDocuments()
      expect(allDocs).toHaveLength(2)
      expect(allDocs[0].title).toBe('Document 1')
      expect(allDocs[1].title).toBe('Document 2')
    })

    it('should list available backups', () => {
      const backups = [
        { id: 'backup_1', timestamp: '2024-01-01T00:00:00Z', count: 5 },
        { id: 'backup_2', timestamp: '2024-01-02T00:00:00Z', count: 3 }
      ]

      global.localStorage.storage['migration_backups'] = JSON.stringify(backups)

      const result = migrationManager.listBackups()
      expect(result).toEqual(backups)
    })

    it('should cleanup old backups', () => {
      const backups = [
        { id: 'backup_1', timestamp: '2024-01-01T00:00:00Z' },
        { id: 'backup_2', timestamp: '2024-01-02T00:00:00Z' },
        { id: 'backup_3', timestamp: '2024-01-03T00:00:00Z' },
        { id: 'backup_4', timestamp: '2024-01-04T00:00:00Z' }
      ]

      global.localStorage.storage['migration_backups'] = JSON.stringify(backups)
      global.localStorage.storage['backup_1'] = '{"data":"old backup"}'
      global.localStorage.storage['backup_2'] = '{"data":"old backup"}'

      migrationManager.cleanupBackups(2) // Keep only 2 newest

      expect(global.localStorage.removeItem).toHaveBeenCalledWith('backup_1')
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('backup_2')
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'migration_backups',
        expect.stringContaining('backup_4')
      )
    })
  })

  describe('Status and Logging', () => {
    it('should track migration status', () => {
      expect(migrationManager.getStatus().status).toBe('ready')

      migrationManager.migrationStatus = 'running'
      expect(migrationManager.getStatus().status).toBe('running')
    })

    it('should log migration events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      migrationManager.log('info', 'Test message')

      expect(migrationManager.migrationLog).toHaveLength(1)
      expect(migrationManager.migrationLog[0].level).toBe('info')
      expect(migrationManager.migrationLog[0].message).toBe('Test message')
      expect(consoleSpy).toHaveBeenCalledWith('[Migration:INFO] Test message')

      consoleSpy.mockRestore()
    })

    it('should reset migration state', () => {
      migrationManager.migrationStatus = 'error'
      migrationManager.log('error', 'Test error')

      migrationManager.reset()

      expect(migrationManager.getStatus().status).toBe('ready')
      expect(migrationManager.migrationLog).toHaveLength(0)
    })
  })
})
