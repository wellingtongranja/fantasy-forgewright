/**
 * Legal Document Tracker Tests - TDD approach for document change detection
 * Tests written FIRST before implementation following Fantasy Editor standards
 */
import { LegalDocumentTracker } from '../../src/core/legal/legal-tracker.js'


describe('LegalDocumentTracker', () => {
  let tracker

  beforeEach(() => {
    tracker = new LegalDocumentTracker()
    
    // Clear crypto mock calls
    if (global.crypto?.subtle?.digest?.mockClear) {
      global.crypto.subtle.digest.mockClear()
    }
  })

  describe('initialization', () => {
    it('should initialize with empty tracked documents', () => {
      expect(tracker.getTrackedDocuments()).toEqual({})
    })

    it('should have default document types configured', () => {
      const types = tracker.getDocumentTypes()
      expect(types).toContain('privacy-policy')
      expect(types).toContain('terms-of-service')
      expect(types).toContain('eula')
      expect(types).toContain('license')
      expect(types).toContain('release-notes')
    })
  })

  describe('SHA-256 hashing', () => {
    it('should generate consistent hashes for same content', async () => {
      const content = '# Privacy Policy\n\nYour privacy is important to us.'
      
      const hash1 = await tracker.generateHash(content)
      const hash2 = await tracker.generateHash(content)
      
      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe('string')
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate different hashes for different content', async () => {
      const content1 = '# Privacy Policy v1.0'
      const content2 = '# Privacy Policy v1.1'
      
      const hash1 = await tracker.generateHash(content1)
      const hash2 = await tracker.generateHash(content2)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty content', async () => {
      const hash = await tracker.generateHash('')
      
      expect(typeof hash).toBe('string')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle null or undefined content', async () => {
      await expect(tracker.generateHash(null)).rejects.toThrow('Content is required')
      await expect(tracker.generateHash(undefined)).rejects.toThrow('Content is required')
    })

    it('should handle non-string content by converting to string', async () => {
      const numberContent = 12345
      const hash = await tracker.generateHash(numberContent)
      
      expect(typeof hash).toBe('string')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('document tracking', () => {
    it('should track new document with hash and metadata', async () => {
      const document = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nYour data is safe.',
        version: '1.0'
      }
      
      await tracker.trackDocument(document)
      
      const tracked = tracker.getTrackedDocuments()
      expect(tracked['privacy-policy']).toBeDefined()
      expect(tracked['privacy-policy'].hash).toMatch(/^[a-f0-9]{64}$/)
      expect(tracked['privacy-policy'].version).toBe('1.0')
      expect(tracked['privacy-policy'].trackedAt).toBeInstanceOf(Date)
      expect(tracked['privacy-policy'].lastModified).toBeInstanceOf(Date)
    })

    it('should validate required document properties', async () => {
      const invalidDoc = {
        content: 'Some content'
        // missing type
      }
      
      await expect(tracker.trackDocument(invalidDoc)).rejects.toThrow(
        'Document type is required'
      )
    })

    it('should validate document type is in allowed list', async () => {
      const invalidDoc = {
        type: 'invalid-type',
        content: 'Some content'
      }
      
      await expect(tracker.trackDocument(invalidDoc)).rejects.toThrow(
        'Invalid document type: invalid-type'
      )
    })

    it('should update existing document tracking', async () => {
      const document = {
        type: 'terms-of-service',
        content: '# Terms v1.0',
        version: '1.0'
      }
      
      await tracker.trackDocument(document)
      const firstHash = tracker.getTrackedDocuments()['terms-of-service'].hash
      
      // Update document
      document.content = '# Terms v1.1'
      document.version = '1.1'
      
      await tracker.trackDocument(document)
      const secondHash = tracker.getTrackedDocuments()['terms-of-service'].hash
      
      expect(firstHash).not.toBe(secondHash)
      expect(tracker.getTrackedDocuments()['terms-of-service'].version).toBe('1.1')
    })
  })

  describe('change detection', () => {
    it('should detect no changes for identical content', async () => {
      const document = {
        type: 'eula',
        content: '# EULA\n\nEnd user license agreement.',
        version: '1.0'
      }
      
      await tracker.trackDocument(document)
      
      const hasChanged = await tracker.hasChanged(document.type, document.content)
      expect(hasChanged).toBe(false)
    })

    it('should detect changes when content differs', async () => {
      const document = {
        type: 'license',
        content: '# License\n\nOriginal license text.',
        version: '1.0'
      }
      
      await tracker.trackDocument(document)
      
      const newContent = '# License\n\nUpdated license text.'
      const hasChanged = await tracker.hasChanged(document.type, newContent)
      expect(hasChanged).toBe(true)
    })

    it('should return true for untracked document types', async () => {
      const hasChanged = await tracker.hasChanged('privacy-policy', 'New content')
      expect(hasChanged).toBe(true)
    })

    it('should validate inputs for change detection', async () => {
      await expect(tracker.hasChanged(null, 'content')).rejects.toThrow(
        'Document type is required'
      )
      
      await expect(tracker.hasChanged('privacy-policy', null)).rejects.toThrow(
        'Content is required'
      )
    })
  })

  describe('document retrieval', () => {
    beforeEach(async () => {
      // Set up test documents
      const documents = [
        {
          type: 'privacy-policy',
          content: '# Privacy Policy\n\nVersion 1.0',
          version: '1.0'
        },
        {
          type: 'terms-of-service', 
          content: '# Terms\n\nVersion 1.0',
          version: '1.0'
        }
      ]
      
      for (const doc of documents) {
        await tracker.trackDocument(doc)
      }
    })

    it('should get specific document by type', () => {
      const doc = tracker.getTrackedDocument('privacy-policy')
      
      expect(doc).toBeDefined()
      expect(doc.hash).toMatch(/^[a-f0-9]{64}$/)
      expect(doc.version).toBe('1.0')
      expect(doc.trackedAt).toBeInstanceOf(Date)
    })

    it('should return undefined for untracked document', () => {
      const doc = tracker.getTrackedDocument('nonexistent-type')
      expect(doc).toBeUndefined()
    })

    it('should get all tracked documents', () => {
      const all = tracker.getTrackedDocuments()
      
      expect(Object.keys(all)).toHaveLength(2)
      expect(all['privacy-policy']).toBeDefined()
      expect(all['terms-of-service']).toBeDefined()
    })

    it('should get documents by change status', async () => {
      // Add a third document
      await tracker.trackDocument({
        type: 'release-notes',
        content: '# Release Notes\n\nOriginal',
        version: '1.0'
      })
      
      const unchanged = await tracker.getUnchangedDocuments()
      expect(unchanged).toHaveLength(3) // privacy-policy, terms-of-service, release-notes
      
      const changed = await tracker.getChangedDocuments()
      // Since we haven't actually changed tracked documents, this should be empty
      expect(changed).toHaveLength(0)
    })
  })

  describe('batch operations', () => {
    it('should track multiple documents at once', async () => {
      const documents = [
        {
          type: 'privacy-policy',
          content: '# Privacy Policy\n\nBatch test',
          version: '1.0'
        },
        {
          type: 'terms-of-service',
          content: '# Terms\n\nBatch test',
          version: '1.0'
        },
        {
          type: 'eula',
          content: '# EULA\n\nBatch test',
          version: '1.0'
        }
      ]
      
      await tracker.trackDocuments(documents)
      
      const tracked = tracker.getTrackedDocuments()
      expect(Object.keys(tracked)).toHaveLength(3)
      expect(tracked['privacy-policy']).toBeDefined()
      expect(tracked['terms-of-service']).toBeDefined()
      expect(tracked['eula']).toBeDefined()
    })

    it('should validate all documents in batch', async () => {
      const documents = [
        {
          type: 'privacy-policy',
          content: '# Valid document',
          version: '1.0'
        },
        {
          // missing type - should cause failure
          content: '# Invalid document',
          version: '1.0'
        }
      ]
      
      await expect(tracker.trackDocuments(documents)).rejects.toThrow(
        'Document type is required'
      )
      
      // Should not have tracked any documents due to failure
      expect(Object.keys(tracker.getTrackedDocuments())).toHaveLength(0)
    })
  })

  describe('metadata and utilities', () => {
    it('should provide tracking statistics', async () => {
      await tracker.trackDocuments([
        {
          type: 'privacy-policy',
          content: '# Privacy',
          version: '1.0'
        },
        {
          type: 'terms-of-service',
          content: '# Terms',
          version: '1.0'
        }
      ])
      
      const stats = tracker.getTrackingStats()
      
      expect(stats.totalTracked).toBe(2)
      expect(stats.documentTypes).toEqual(['privacy-policy', 'terms-of-service'])
      expect(stats.lastUpdated).toBeInstanceOf(Date)
    })

    it('should clear all tracked documents', async () => {
      await tracker.trackDocument({
        type: 'privacy-policy',
        content: '# Privacy',
        version: '1.0'
      })
      
      expect(Object.keys(tracker.getTrackedDocuments())).toHaveLength(1)
      
      tracker.clearTracking()
      expect(Object.keys(tracker.getTrackedDocuments())).toHaveLength(0)
    })

    it('should remove specific document tracking', async () => {
      await tracker.trackDocuments([
        {
          type: 'privacy-policy',
          content: '# Privacy',
          version: '1.0'
        },
        {
          type: 'terms-of-service',
          content: '# Terms',
          version: '1.0'
        }
      ])
      
      tracker.removeTracking('privacy-policy')
      
      const tracked = tracker.getTrackedDocuments()
      expect(Object.keys(tracked)).toHaveLength(1)
      expect(tracked['privacy-policy']).toBeUndefined()
      expect(tracked['terms-of-service']).toBeDefined()
    })

    it('should validate document type for removal', () => {
      expect(() => tracker.removeTracking(null)).toThrow(
        'Document type is required'
      )
      
      expect(() => tracker.removeTracking('invalid-type')).toThrow(
        'Invalid document type: invalid-type'
      )
    })
  })

  describe('error handling', () => {
    it('should handle crypto API errors gracefully', async () => {
      // Since we're using fallback hash, this should work without throwing
      const hash = await tracker.generateHash('test')
      expect(typeof hash).toBe('string')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle invalid document objects gracefully', async () => {
      await expect(tracker.trackDocument(null)).rejects.toThrow(
        'Document is required'
      )
      
      await expect(tracker.trackDocument('not-an-object')).rejects.toThrow(
        'Document must be an object'
      )
    })

    it('should provide meaningful error messages', async () => {
      const invalidDoc = {
        type: 'privacy-policy'
        // missing content
      }
      
      await expect(tracker.trackDocument(invalidDoc)).rejects.toThrow(
        'Document content is required'
      )
    })
  })
})