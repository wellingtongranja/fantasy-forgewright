/**
 * Storage Manager Tests - Enhanced TDD approach for document persistence with GUID support
 */
import { StorageManager } from '../../src/core/storage/storage-manager.js'
import { guidManager } from '../../src/utils/guid.js'

describe('StorageManager', () => {
  let storageManager

  beforeEach(async () => {
    // Create fresh instance for each test with unique database name
    storageManager = new StorageManager()
    storageManager.dbName = `FantasyEditorDB_Test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    await storageManager.initDatabase()
  })

  afterEach(async () => {
    if (storageManager.db) {
      storageManager.db.close()

      // Clean up test database
      try {
        const deleteReq = indexedDB.deleteDatabase(storageManager.dbName)
        await new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve()
          deleteReq.onerror = () => reject()
        })
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })

  describe('initialization', () => {
    it('should initialize with correct store configuration', () => {
      expect(storageManager.dbName).toContain('FantasyEditorDB_Test_')
      expect(storageManager.storeName).toBe('documents')
    })

    it('should initialize database successfully', async () => {
      expect(storageManager.db).toBeTruthy()
      expect(storageManager.db.name).toContain('FantasyEditorDB_Test_')
    })
  })

  describe('GUID Generation', () => {
    it('should generate unique document GUIDs with RFC 4122 format', () => {
      const guid1 = storageManager.generateGUID()
      const guid2 = storageManager.generateGUID()

      expect(guidManager.isValidGuid(guid1)).toBe(true)
      expect(guidManager.isValidGuid(guid2)).toBe(true)
      expect(guid1).not.toBe(guid2)
    })

    it('should generate GUIDs that pass validation', () => {
      const guid = storageManager.generateGUID()

      expect(guid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(guidManager.isValidGuid(guid)).toBe(true)
      expect(guidManager.isOldUidFormat(guid)).toBe(false)
    })
  })

  describe('Document Validation', () => {
    it('should validate correct document structure with GUID', () => {
      const validDoc = {
        id: guidManager.generateGuid(),
        title: 'Valid Document',
        content: '# Hello World\n\nThis is content.',
        tags: ['test', 'valid']
      }

      expect(() => storageManager.validateDocument(validDoc)).not.toThrow()
    })

    it('should validate documents with old UID format for backward compatibility', () => {
      const validDoc = {
        id: 'doc_1648125632_a1b2c3d4',
        title: 'Valid Document',
        content: 'Content',
        tags: []
      }

      expect(() => storageManager.validateDocument(validDoc)).not.toThrow()
    })

    it('should reject documents with invalid ID format', () => {
      const invalidDoc = {
        id: 'invalid-id-format',
        title: 'Valid Title',
        content: 'Content'
      }

      expect(() => storageManager.validateDocument(invalidDoc)).toThrow(
        'Document ID must be valid GUID or UID format'
      )
    })

    it('should reject documents without ID', () => {
      const invalidDoc = {
        title: 'Valid Title',
        content: 'Content'
      }

      expect(() => storageManager.validateDocument(invalidDoc)).toThrow('Document ID is required')
    })

    it('should reject documents without title', () => {
      const invalidDoc = {
        id: '123e4567-e89b-42d3-a456-426614174000',
        content: '# Content without title'
      }

      expect(() => storageManager.validateDocument(invalidDoc)).toThrow(
        'Document title is required'
      )
    })

    it('should reject documents with invalid title type', () => {
      const invalidDoc = {
        id: '123e4567-e89b-42d3-a456-426614174001',
        title: 123,
        content: 'Content'
      }

      expect(() => storageManager.validateDocument(invalidDoc)).toThrow(
        'Document title is required'
      )
    })

    it('should reject documents with title too long', () => {
      const invalidDoc = {
        id: '123e4567-e89b-42d3-a456-426614174002',
        title: 'A'.repeat(201),
        content: 'Content'
      }

      expect(() => storageManager.validateDocument(invalidDoc)).toThrow(
        'Document title must be less than 200 characters'
      )
    })

    it('should reject invalid content type', () => {
      const invalidDoc = {
        id: '123e4567-e89b-42d3-a456-426614174003',
        title: 'Valid Title',
        content: 123
      }

      expect(() => storageManager.validateDocument(invalidDoc)).toThrow(
        'Document content must be a string'
      )
    })

    it('should reject invalid tags type', () => {
      const invalidDoc = {
        id: '123e4567-e89b-42d3-a456-426614174005',
        title: 'Valid Title',
        content: 'Valid content',
        tags: 'not-an-array'
      }

      expect(() => storageManager.validateDocument(invalidDoc)).toThrow(
        'Document tags must be an array'
      )
    })
  })

  describe('Document Sanitization', () => {
    it('should remove script tags from content', () => {
      const doc = {
        title: 'Test Document',
        content: '# Hello <script>alert("xss")</script> World',
        tags: ['test']
      }

      const sanitized = storageManager.sanitizeDocument(doc)
      expect(sanitized.content).toBe('# Hello  World')
      expect(sanitized.content).not.toContain('<script>')
    })

    it('should remove javascript protocols', () => {
      const doc = {
        title: 'Test Document',
        content: '[Click me](javascript:alert("xss"))',
        tags: ['test']
      }

      const sanitized = storageManager.sanitizeDocument(doc)
      expect(sanitized.content).not.toContain('javascript:')
    })

    it('should sanitize title', () => {
      const doc = {
        title: '<b>Bold Title</b>',
        content: 'Content',
        tags: ['test']
      }

      const sanitized = storageManager.sanitizeDocument(doc)
      expect(sanitized.title).toBe('Bold Title')
    })

    it('should normalize tags to lowercase strings', () => {
      const doc = {
        title: 'Test Document',
        content: 'Content',
        tags: ['Test', 'UPPERCASE', 123, 'normal']
      }

      const sanitized = storageManager.sanitizeDocument(doc)
      expect(sanitized.tags).toEqual(['test', 'uppercase', 'normal'])
    })
  })

  describe('Checksum and Integrity', () => {
    it('should generate consistent checksums', () => {
      const content = 'This is test content for checksum verification'
      const checksum1 = storageManager.generateChecksum(content)
      const checksum2 = storageManager.generateChecksum(content)

      expect(checksum1).toBe(checksum2)
      expect(checksum1).toHaveLength(8)
      expect(/^[a-f0-9]+$/.test(checksum1)).toBe(true)
    })

    it('should generate different checksums for different content', () => {
      const content1 = 'First content'
      const content2 = 'Second content'

      const checksum1 = storageManager.generateChecksum(content1)
      const checksum2 = storageManager.generateChecksum(content2)

      expect(checksum1).not.toBe(checksum2)
    })

    it('should verify document integrity correctly', () => {
      const content = 'Original content'
      const checksum = storageManager.generateChecksum(content)

      const validDoc = { content, checksum }
      expect(storageManager.verifyIntegrity(validDoc)).toBe(true)

      const corruptedDoc = { content: 'Modified content', checksum }
      expect(storageManager.verifyIntegrity(corruptedDoc)).toBe(false)
    })
  })

  describe('Document CRUD Operations', () => {
    it('should save new document with generated GUID', async () => {
      const doc = {
        title: 'New Document',
        content: '# Welcome\n\nThis is a new document.',
        tags: ['new', 'test']
      }

      const savedDoc = await storageManager.saveDocument(doc)

      expect(guidManager.isValidGuid(savedDoc.id)).toBe(true)
      expect(savedDoc.title).toBe(doc.title)
      expect(savedDoc.content).toBe(doc.content)
      expect(savedDoc.filename).toMatch(/^new-document-[0-9a-f]{8}\.md$/)
      expect(savedDoc.metadata.created).toBeDefined()
      expect(savedDoc.metadata.modified).toBeDefined()
      expect(savedDoc.metadata.guid).toBe(savedDoc.id)
      expect(savedDoc.sync.checksum).toBeDefined()
      expect(savedDoc.sync.status).toBe('local')
    })

    it('should update existing document preserving GUID and created timestamp', async () => {
      const doc = {
        title: 'Original Document',
        content: 'Original content',
        tags: ['original']
      }

      const savedDoc = await storageManager.saveDocument(doc)
      const originalId = savedDoc.id
      const originalCreated = savedDoc.metadata.created

      // Wait a bit to ensure different modified timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Update document
      savedDoc.title = 'Updated Document'
      savedDoc.content = 'Updated content'

      const updatedDoc = await storageManager.saveDocument(savedDoc)

      expect(updatedDoc.id).toBe(originalId)
      expect(updatedDoc.metadata.created).toBe(originalCreated)
      expect(updatedDoc.metadata.modified).not.toBe(savedDoc.metadata.modified)
      expect(updatedDoc.title).toBe('Updated Document')
      expect(updatedDoc.filename).toMatch(/^updated-document-[0-9a-f]{8}\.md$/)
    })

    it('should retrieve document by ID', async () => {
      const doc = {
        title: 'Retrievable Document',
        content: 'Content to retrieve',
        tags: ['retrieve']
      }

      const savedDoc = await storageManager.saveDocument(doc)
      const retrievedDoc = await storageManager.getDocument(savedDoc.id)

      expect(retrievedDoc).toEqual(savedDoc)
    })

    it('should return all documents sorted by updatedAt', async () => {
      const doc1 = { title: 'First Document', content: 'First content', tags: [] }
      const doc2 = { title: 'Second Document', content: 'Second content', tags: [] }

      await storageManager.saveDocument(doc1)
      await new Promise((resolve) => setTimeout(resolve, 10))
      await storageManager.saveDocument(doc2)

      const allDocs = await storageManager.getAllDocuments()

      expect(allDocs).toHaveLength(2)
      expect(allDocs[0].title).toBe('Second Document') // Most recent first
      expect(allDocs[1].title).toBe('First Document')
    })

    it('should delete document by ID', async () => {
      const doc = { title: 'Document to Delete', content: 'Delete me', tags: [] }
      const savedDoc = await storageManager.saveDocument(doc)

      await storageManager.deleteDocument(savedDoc.id)

      const retrievedDoc = await storageManager.getDocument(savedDoc.id)
      expect(retrievedDoc).toBeUndefined()
    })
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Set up test documents
      const testDocs = [
        {
          title: 'Dragon Quest Adventures',
          content: 'Epic tale of dragons and brave knights',
          tags: ['fantasy', 'adventure']
        },
        {
          title: 'Space Odyssey',
          content: 'Journey through the vast cosmos',
          tags: ['sci-fi', 'adventure']
        },
        {
          title: 'Cooking with Dragons',
          content: 'How to prepare mythical creature steaks',
          tags: ['cooking', 'fantasy']
        },
        {
          title: 'Mystery Manor',
          content: 'Detective investigates haunted house',
          tags: ['mystery', 'supernatural']
        }
      ]

      for (const doc of testDocs) {
        await storageManager.saveDocument(doc)
      }
    })

    it('should search documents by title', async () => {
      const results = await storageManager.searchDocuments('dragon')

      expect(results).toHaveLength(2)
      expect(results.some((doc) => doc.title.toLowerCase().includes('dragon'))).toBe(true)
    })

    it('should search documents by content', async () => {
      const results = await storageManager.searchDocuments('cosmos')

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Space Odyssey')
    })

    it('should search documents by tags', async () => {
      const results = await storageManager.searchDocuments('adventure')

      expect(results).toHaveLength(2)
      expect(results.every((doc) => doc.tags.includes('adventure'))).toBe(true)
    })

    it('should return empty array for no matches', async () => {
      const results = await storageManager.searchDocuments('nonexistent')

      expect(results).toHaveLength(0)
    })

    it('should perform case-insensitive search', async () => {
      const results = await storageManager.searchDocuments('FANTASY')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some((doc) => doc.tags.includes('fantasy'))).toBe(true)
    })
  })

  describe('GUID-specific Functionality', () => {
    it('should check document existence by GUID', async () => {
      const doc = {
        title: 'Existence Test',
        content: 'Test content',
        tags: []
      }

      const savedDoc = await storageManager.saveDocument(doc)

      const exists = await storageManager.documentExists(savedDoc.id)
      expect(exists).toBe(true)

      const nonExistentGuid = guidManager.generateGuid()
      const notExists = await storageManager.documentExists(nonExistentGuid)
      expect(notExists).toBe(false)
    })

    it('should find document by filename', async () => {
      const doc = {
        title: 'Filename Test Document',
        content: 'Test content',
        tags: []
      }

      const savedDoc = await storageManager.saveDocument(doc)

      const foundDoc = await storageManager.getDocumentByFilename(savedDoc.filename)
      expect(foundDoc).toEqual(savedDoc)

      const notFound = await storageManager.getDocumentByFilename('nonexistent.md')
      expect(notFound).toBeNull()
    })

    it('should detect potential duplicates', async () => {
      // Create original document
      const originalDoc = {
        title: 'Unique Document Title',
        content: 'This is unique content for testing duplicates',
        tags: ['unique', 'test']
      }
      await storageManager.saveDocument(originalDoc)

      // Create potential duplicate
      const duplicateCandidate = {
        title: 'Unique Document Title', // Same title
        content: 'Different content but same title',
        tags: ['test']
      }

      const duplicates = await storageManager.findPotentialDuplicates(duplicateCandidate)

      expect(duplicates).toHaveLength(1)
      expect(duplicates[0].similarity).toBeGreaterThan(60)
      expect(duplicates[0].reasons).toContain('Identical titles')
    })

    it('should provide storage statistics with GUID info', async () => {
      // Create test documents
      const docs = [
        { title: 'GUID Doc 1', content: 'Content 1', tags: [] },
        { title: 'GUID Doc 2', content: 'Content 2', tags: [] }
      ]

      for (const doc of docs) {
        await storageManager.saveDocument(doc)
      }

      const stats = await storageManager.getStorageStats()

      expect(stats.totalDocuments).toBe(2)
      expect(stats.guidDocuments).toBe(2)
      expect(stats.uidDocuments).toBe(0)
      expect(stats.invalidDocuments).toBe(0)
      expect(stats.needsMigration).toBe(false)
      expect(stats.databaseVersion).toBe(2)
      expect(stats.totalSizeBytes).toBeGreaterThan(0)
      expect(stats.guidManagerStats).toBeDefined()
    })

    it('should handle backward compatibility with old UID documents', async () => {
      // Manually insert old UID format document
      const oldDoc = {
        id: 'doc_1648125632_a1b2c3d4',
        title: 'Old UID Document',
        content: 'Legacy content',
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        checksum: '12345678'
      }

      const transaction = storageManager.db.transaction([storageManager.storeName], 'readwrite')
      const store = transaction.objectStore(storageManager.storeName)
      await new Promise((resolve, reject) => {
        const request = store.add(oldDoc)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      const stats = await storageManager.getStorageStats()
      expect(stats.uidDocuments).toBe(1)
      expect(stats.needsMigration).toBe(true)

      // Should be able to retrieve old document
      const retrieved = await storageManager.getDocument(oldDoc.id)
      expect(retrieved).toEqual(oldDoc)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid document gracefully', async () => {
      await expect(storageManager.saveDocument(null)).rejects.toThrow('Invalid document')
    })

    it('should handle non-existent document retrieval', async () => {
      const result = await storageManager.getDocument('non-existent-id')
      expect(result).toBeUndefined()
    })

    it('should handle invalid GUID in documentExists', async () => {
      const result = await storageManager.documentExists('invalid-guid')
      expect(result).toBe(false)
    })

    it('should handle errors in storage statistics gracefully', async () => {
      // Mock database error
      const originalGetAllDocuments = storageManager.getAllDocuments
      storageManager.getAllDocuments = jest.fn().mockRejectedValue(new Error('DB Error'))

      const stats = await storageManager.getStorageStats()
      expect(stats.error).toBe('DB Error')
      expect(stats.totalDocuments).toBe(0)

      // Restore original method
      storageManager.getAllDocuments = originalGetAllDocuments
    })
  })
})
