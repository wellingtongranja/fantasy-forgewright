/**
 * GUID Utility Tests
 * Comprehensive test suite for GUID generation, validation, and document management
 */

import { GuidManager, guidManager } from '../guid.js'

describe('GuidManager', () => {
  let manager

  beforeEach(() => {
    manager = new GuidManager()
  })

  describe('GUID Generation', () => {
    it('should generate valid RFC 4122 v4 UUIDs', () => {
      const guid = manager.generateGuid()
      expect(manager.isValidGuid(guid)).toBe(true)
      expect(guid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should generate unique GUIDs', () => {
      const guids = new Set()
      for (let i = 0; i < 100; i++) {
        guids.add(manager.generateGuid())
      }
      expect(guids.size).toBe(100)
    })

    it('should work without native crypto.randomUUID', () => {
      const originalRandomUUID = global.crypto?.randomUUID
      if (global.crypto) {
        delete global.crypto.randomUUID
      }

      const guid = manager.generateGuid()
      expect(manager.isValidGuid(guid)).toBe(true)

      // Restore original if it existed
      if (originalRandomUUID && global.crypto) {
        global.crypto.randomUUID = originalRandomUUID
      }
    })
  })

  describe('GUID Validation', () => {
    it('should validate correct GUID format', () => {
      const validGuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8'
      ]

      validGuids.forEach(guid => {
        expect(manager.isValidGuid(guid)).toBe(true)
      })
    })

    it('should reject invalid GUID formats', () => {
      const invalidGuids = [
        '',
        null,
        undefined,
        'invalid-guid',
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Non-hex characters
        'doc_1648125632_a1b2c3d4' // Old UID format
      ]

      invalidGuids.forEach(guid => {
        expect(manager.isValidGuid(guid)).toBe(false)
      })
    })
  })

  describe('Filename Generation', () => {
    it('should generate Git-safe filenames', () => {
      const title = 'My Epic Fantasy Tale'
      const guid = '550e8400-e29b-41d4-a716-446655440000'
      
      const filename = manager.generateFilename(title, guid)
      expect(filename).toBe('my-epic-fantasy-tale-550e8400.md')
      expect(filename).toMatch(/^[a-z0-9-]+\.md$/)
    })

    it('should handle special characters in titles', () => {
      const title = 'The Dragon\'s Quest: A Tale of Magic & Wonder!'
      const guid = '550e8400-e29b-41d4-a716-446655440000'
      
      const filename = manager.generateFilename(title, guid)
      expect(filename).toBe('the-dragons-quest-a-tale-of-magic-wonder-550e8400.md')
    })

    it('should limit filename length', () => {
      const longTitle = 'This is an extremely long document title that exceeds the reasonable length limit for filenames'
      const guid = '550e8400-e29b-41d4-a716-446655440000'
      
      const filename = manager.generateFilename(longTitle, guid)
      expect(filename.length).toBeLessThan(70) // 50 + 8 + extension
      expect(filename.endsWith('-550e8400.md')).toBe(true)
    })

    it('should handle empty or invalid titles', () => {
      const guid = '550e8400-e29b-41d4-a716-446655440000'
      
      const filename1 = manager.generateFilename('', guid)
      expect(filename1).toBe('document-550e8400.md')
      
      const filename2 = manager.generateFilename('   ', guid)
      expect(filename2).toBe('document-550e8400.md')
    })

    it('should throw error for invalid GUID', () => {
      expect(() => {
        manager.generateFilename('Test', 'invalid-guid')
      }).toThrow('Valid title and GUID required for filename generation')
    })
  })

  describe('GUID Extraction', () => {
    it('should extract GUID prefix from filename', () => {
      const filename = 'my-document-550e8400.md'
      const guidPrefix = manager.extractGuidFromFilename(filename)
      expect(guidPrefix).toBe('550e8400')
    })

    it('should return null for invalid filenames', () => {
      const invalidFilenames = [
        'document.md',
        'document-invalid.md',
        'document-123.txt',
        ''
      ]

      invalidFilenames.forEach(filename => {
        expect(manager.extractGuidFromFilename(filename)).toBeNull()
      })
    })
  })

  describe('Document Creation', () => {
    it('should create document with GUID metadata', () => {
      const title = 'Test Document'
      const content = '# Hello World'
      const tags = ['test', 'example']
      
      const doc = manager.createDocumentWithGuid(title, content, tags)
      
      expect(manager.isValidGuid(doc.id)).toBe(true)
      expect(doc.title).toBe(title)
      expect(doc.content).toBe(content)
      expect(doc.tags).toEqual(tags)
      expect(doc.metadata.guid).toBe(doc.id)
      expect(doc.metadata.created).toBeDefined()
      expect(doc.metadata.modified).toBeDefined()
      expect(doc.filename).toMatch(/^test-document-[0-9a-f]{8}\.md$/)
      expect(doc.sync.status).toBe('local')
      expect(doc.sync.checksum).toBeDefined()
    })

    it('should handle missing parameters gracefully', () => {
      const doc1 = manager.createDocumentWithGuid()
      expect(doc1.title).toBe('Untitled Document')
      expect(doc1.content).toBe('')
      expect(doc1.tags).toEqual([])

      const doc2 = manager.createDocumentWithGuid('', '', 'not-an-array')
      expect(doc2.tags).toEqual([])
    })
  })

  describe('Document Updates', () => {
    it('should update document metadata correctly', async () => {
      const doc = manager.createDocumentWithGuid('Original Title', 'Original content')
      const originalModified = doc.metadata.modified
      const originalVersion = doc.metadata.version

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 2))
      
      const updated = manager.updateDocument(doc, {
        title: 'Updated Title',
        content: 'Updated content'
      })

      expect(updated.title).toBe('Updated Title')
      expect(updated.content).toBe('Updated content')
      expect(updated.metadata.modified).not.toBe(originalModified)
      expect(updated.metadata.version).toBe(originalVersion + 1)
      expect(updated.filename).toMatch(/^updated-title-[0-9a-f]{8}\.md$/)
    })

    it('should throw error for invalid document', () => {
      expect(() => {
        manager.updateDocument(null, { title: 'New Title' })
      }).toThrow('Invalid document or missing GUID')

      expect(() => {
        manager.updateDocument({ id: 'invalid' }, { title: 'New Title' })
      }).toThrow('Invalid document or missing GUID')
    })
  })

  describe('Checksum Generation', () => {
    it('should generate consistent checksums', () => {
      const content = '# Test Document\n\nThis is test content.'
      const checksum1 = manager.generateChecksum(content)
      const checksum2 = manager.generateChecksum(content)
      
      expect(checksum1).toBe(checksum2)
      expect(checksum1).toMatch(/^[0-9a-f]{8}$/)
    })

    it('should generate different checksums for different content', () => {
      const content1 = 'Content A'
      const content2 = 'Content B'
      
      expect(manager.generateChecksum(content1)).not.toBe(manager.generateChecksum(content2))
    })

    it('should handle empty or invalid content', () => {
      expect(manager.generateChecksum('')).toBe('00000000')
      expect(manager.generateChecksum(null)).toBe('00000000')
      expect(manager.generateChecksum(undefined)).toBe('00000000')
    })
  })

  describe('UID Migration', () => {
    it('should identify old UID format', () => {
      const oldIds = [
        'doc_1648125632_a1b2c3d4',
        'doc_1234567890_deadbeef'
      ]

      oldIds.forEach(id => {
        expect(manager.isOldUidFormat(id)).toBe(true)
      })
    })

    it('should not identify GUID as old format', () => {
      const newIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ]

      newIds.forEach(id => {
        expect(manager.isOldUidFormat(id)).toBe(false)
      })
    })

    it('should migrate old UID to new GUID', () => {
      const oldId = 'doc_1648125632_a1b2c3d4'
      const newGuid = manager.migrateUidToGuid(oldId)
      
      expect(manager.isValidGuid(newGuid)).toBe(true)
      expect(manager.isOldUidFormat(newGuid)).toBe(false)
    })
  })

  describe('Statistics', () => {
    it('should return GUID system statistics', () => {
      const stats = manager.getStats()
      
      expect(stats.guidRegex).toBeDefined()
      expect(stats.nativeSupport).toBeDefined()
      expect(stats.timestamp).toBeDefined()
      expect(typeof stats.nativeSupport).toBe('boolean')
    })
  })

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(guidManager).toBeInstanceOf(GuidManager)
      expect(guidManager.generateGuid).toBeDefined()
      expect(guidManager.isValidGuid).toBeDefined()
    })
  })
})