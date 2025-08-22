/**
 * Storage Manager Tests - Enhanced TDD approach for document persistence
 */
import { StorageManager } from '../storage-manager.js'

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

  describe('UID Generation', () => {
    it('should generate unique document IDs with correct format', () => {
      const uid1 = storageManager.generateUID()
      const uid2 = storageManager.generateUID()
      
      expect(uid1).toMatch(/^doc_\d+_[a-f0-9]{8}$/)
      expect(uid2).toMatch(/^doc_\d+_[a-f0-9]{8}$/)
      expect(uid1).not.toBe(uid2)
    })

    it('should generate UIDs with timestamp and random component', () => {
      const beforeTime = Date.now()
      const uid = storageManager.generateUID()
      const afterTime = Date.now()
      
      const parts = uid.split('_')
      expect(parts).toHaveLength(3)
      expect(parts[0]).toBe('doc')
      
      const timestamp = Number(parts[1])
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(timestamp).toBeLessThanOrEqual(afterTime)
      
      expect(parts[2]).toHaveLength(8)
      expect(/^[a-f0-9]+$/.test(parts[2])).toBe(true)
    })
  })

  describe('Document Validation', () => {
    it('should validate correct document structure', () => {
      const validDoc = {
        title: 'Valid Document',
        content: '# Hello World\n\nThis is content.',
        tags: ['test', 'valid']
      }

      expect(() => storageManager.validateDocument(validDoc)).not.toThrow()
    })

    it('should reject documents without title', () => {
      const invalidDoc = {
        content: '# Content without title'
      }

      expect(() => storageManager.validateDocument(invalidDoc))
        .toThrow('Document title is required')
    })

    it('should reject documents with invalid title type', () => {
      const invalidDoc = {
        title: 123,
        content: 'Content'
      }

      expect(() => storageManager.validateDocument(invalidDoc))
        .toThrow('Document title is required')
    })

    it('should reject documents with title too long', () => {
      const invalidDoc = {
        title: 'A'.repeat(201),
        content: 'Content'
      }

      expect(() => storageManager.validateDocument(invalidDoc))
        .toThrow('Document title must be less than 200 characters')
    })

    it('should reject invalid content type', () => {
      const invalidDoc = {
        title: 'Valid Title',
        content: 123
      }

      expect(() => storageManager.validateDocument(invalidDoc))
        .toThrow('Document content must be a string')
    })

    it('should reject invalid tags type', () => {
      const invalidDoc = {
        title: 'Valid Title',
        content: 'Valid content',
        tags: 'not-an-array'
      }

      expect(() => storageManager.validateDocument(invalidDoc))
        .toThrow('Document tags must be an array')
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
    it('should save new document with generated UID', async () => {
      const doc = {
        title: 'New Document',
        content: '# Welcome\n\nThis is a new document.',
        tags: ['new', 'test']
      }

      const savedDoc = await storageManager.saveDocument(doc)
      
      expect(savedDoc.id).toMatch(/^doc_\d+_[a-f0-9]{8}$/)
      expect(savedDoc.title).toBe(doc.title)
      expect(savedDoc.content).toBe(doc.content)
      expect(savedDoc.createdAt).toBeDefined()
      expect(savedDoc.updatedAt).toBeDefined()
      expect(savedDoc.checksum).toBeDefined()
    })

    it('should update existing document preserving UID and createdAt', async () => {
      const doc = {
        title: 'Original Document',
        content: 'Original content',
        tags: ['original']
      }

      const savedDoc = await storageManager.saveDocument(doc)
      const originalId = savedDoc.id
      const originalCreatedAt = savedDoc.createdAt
      
      // Wait a bit to ensure different updatedAt
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Update document
      savedDoc.title = 'Updated Document'
      savedDoc.content = 'Updated content'
      
      const updatedDoc = await storageManager.saveDocument(savedDoc)
      
      expect(updatedDoc.id).toBe(originalId)
      expect(updatedDoc.createdAt).toBe(originalCreatedAt)
      expect(updatedDoc.updatedAt).not.toBe(savedDoc.updatedAt)
      expect(updatedDoc.title).toBe('Updated Document')
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
      await new Promise(resolve => setTimeout(resolve, 10))
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
        { title: 'Dragon Quest Adventures', content: 'Epic tale of dragons and brave knights', tags: ['fantasy', 'adventure'] },
        { title: 'Space Odyssey', content: 'Journey through the vast cosmos', tags: ['sci-fi', 'adventure'] },
        { title: 'Cooking with Dragons', content: 'How to prepare mythical creature steaks', tags: ['cooking', 'fantasy'] },
        { title: 'Mystery Manor', content: 'Detective investigates haunted house', tags: ['mystery', 'supernatural'] }
      ]
      
      for (const doc of testDocs) {
        await storageManager.saveDocument(doc)
      }
    })

    it('should search documents by title', async () => {
      const results = await storageManager.searchDocuments('dragon')
      
      expect(results).toHaveLength(2)
      expect(results.some(doc => doc.title.toLowerCase().includes('dragon'))).toBe(true)
    })

    it('should search documents by content', async () => {
      const results = await storageManager.searchDocuments('cosmos')
      
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Space Odyssey')
    })

    it('should search documents by tags', async () => {
      const results = await storageManager.searchDocuments('adventure')
      
      expect(results).toHaveLength(2)
      expect(results.every(doc => doc.tags.includes('adventure'))).toBe(true)
    })

    it('should return empty array for no matches', async () => {
      const results = await storageManager.searchDocuments('nonexistent')
      
      expect(results).toHaveLength(0)
    })

    it('should perform case-insensitive search', async () => {
      const results = await storageManager.searchDocuments('FANTASY')
      
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(doc => doc.tags.includes('fantasy'))).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid document gracefully', async () => {
      await expect(storageManager.saveDocument(null))
        .rejects.toThrow('Invalid document')
    })

    it('should handle non-existent document retrieval', async () => {
      const result = await storageManager.getDocument('non-existent-id')
      expect(result).toBeUndefined()
    })
  })
})
