import { StorageManager } from '../storage-manager'

describe('StorageManager', () => {
  let storageManager
  let mockIndexedDB

  beforeEach(() => {
    mockIndexedDB = {
      open: jest.fn(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          transaction: jest.fn(() => ({
            objectStore: jest.fn(() => ({
              put: jest.fn(() => ({ onsuccess: null, onerror: null })),
              get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
              getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
              delete: jest.fn(() => ({ onsuccess: null, onerror: null }))
            }))
          })),
          objectStoreNames: { contains: jest.fn(() => false) }
        }
      }))
    }
    
    global.indexedDB = mockIndexedDB
    storageManager = new StorageManager()
  })

  describe('initialization', () => {
    it('should initialize with correct database name', () => {
      expect(storageManager.dbName).toBe('FantasyEditorDB')
      expect(storageManager.storeName).toBe('documents')
    })

    it('should open database on initialization', () => {
      expect(mockIndexedDB.open).toHaveBeenCalledWith('FantasyEditorDB', 1)
    })
  })

  describe('document operations', () => {
    it('should create document with unique ID', async () => {
      const doc = {
        id: 'doc_123456_abcdef',
        title: 'Test Document',
        content: '# Test Content',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      expect(doc.id).toMatch(/^doc_\d+_[a-z0-9]+$/)
      expect(doc.title).toBe('Test Document')
    })

    it('should filter documents by search query', async () => {
      const documents = [
        { id: '1', title: 'Fantasy Novel', content: 'Dragons and magic', tags: ['fantasy'] },
        { id: '2', title: 'Sci-Fi Story', content: 'Space and robots', tags: ['scifi'] },
        { id: '3', title: 'Mystery Tale', content: 'Detective work', tags: ['mystery', 'fantasy'] }
      ]
      
      storageManager.getAllDocuments = jest.fn().mockResolvedValue(documents)
      
      const results = await storageManager.searchDocuments('fantasy')
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('1')
      expect(results[1].id).toBe('3')
    })
  })
})
