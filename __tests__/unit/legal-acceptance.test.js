/**
 * Legal Acceptance Manager Tests - TDD approach for legal document acceptance tracking
 * Tests written FIRST before implementation following Fantasy Editor standards
 */
import { LegalAcceptanceManager } from '../../src/core/legal/legal-acceptance.js'

describe('LegalAcceptanceManager', () => {
  let manager
  let testUserId

  beforeEach(async () => {
    // Create fresh instance for each test with unique database name
    manager = new LegalAcceptanceManager()
    manager.dbName = `FantasyEditorLegalDB_Test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    testUserId = 'test-user-123'
    await manager.initDatabase()
  })

  afterEach(async () => {
    if (manager.db) {
      manager.db.close()

      // Clean up test database
      try {
        const deleteReq = indexedDB.deleteDatabase(manager.dbName)
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
    it('should initialize with correct database configuration', () => {
      expect(manager.dbName).toContain('FantasyEditorLegalDB_Test_')
      expect(manager.storeName).toBe('legal_acceptances')
      expect(manager.dbVersion).toBe(1)
    })

    it('should initialize database successfully', async () => {
      expect(manager.db).toBeTruthy()
      expect(manager.db.name).toContain('FantasyEditorLegalDB_Test_')
    })

    it('should create object store with correct structure', async () => {
      const transaction = manager.db.transaction([manager.storeName], 'readonly')
      const store = transaction.objectStore(manager.storeName)

      expect(store.keyPath).toBe('id')
      expect(store.indexNames).toContain('userId')
      expect(store.indexNames).toContain('documentType')
      expect(store.indexNames).toContain('acceptedAt')
    })
  })

  describe('acceptance recording', () => {
    it('should record new legal document acceptance', async () => {
      const acceptanceData = {
        userId: testUserId,
        documentType: 'privacy-policy',
        documentHash: 'abc123',
        documentVersion: '1.0',
        acceptedAt: new Date()
      }

      const result = await manager.recordAcceptance(acceptanceData)

      expect(result.id).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.documentType).toBe('privacy-policy')
      expect(result.documentHash).toBe('abc123')
      expect(result.documentVersion).toBe('1.0')
      expect(result.acceptedAt).toBeInstanceOf(Date)
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should generate unique IDs for acceptance records', async () => {
      const acceptanceData = {
        userId: testUserId,
        documentType: 'privacy-policy',
        documentHash: 'abc123',
        documentVersion: '1.0'
      }

      const result1 = await manager.recordAcceptance(acceptanceData)
      const result2 = await manager.recordAcceptance(acceptanceData)

      expect(result1.id).not.toBe(result2.id)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        documentType: 'privacy-policy',
        // missing userId
        documentHash: 'abc123',
        documentVersion: '1.0'
      }

      await expect(manager.recordAcceptance(invalidData)).rejects.toThrow(
        'User ID is required'
      )
    })

    it('should validate document type', async () => {
      const invalidData = {
        userId: testUserId,
        documentType: 'invalid-type',
        documentHash: 'abc123',
        documentVersion: '1.0'
      }

      await expect(manager.recordAcceptance(invalidData)).rejects.toThrow(
        'Invalid document type'
      )
    })

    it('should validate document hash', async () => {
      const invalidData = {
        userId: testUserId,
        documentType: 'privacy-policy',
        // missing documentHash
        documentVersion: '1.0'
      }

      await expect(manager.recordAcceptance(invalidData)).rejects.toThrow(
        'Document hash is required'
      )
    })

    it('should set default accepted date if not provided', async () => {
      const acceptanceData = {
        userId: testUserId,
        documentType: 'terms-of-service',
        documentHash: 'def456',
        documentVersion: '1.0'
      }

      const result = await manager.recordAcceptance(acceptanceData)
      expect(result.acceptedAt).toBeInstanceOf(Date)
      expect(result.acceptedAt.getTime()).toBeCloseTo(Date.now(), -3)
    })
  })

  describe('acceptance retrieval', () => {
    beforeEach(async () => {
      // Set up test data
      const testAcceptances = [
        {
          userId: testUserId,
          documentType: 'privacy-policy',
          documentHash: 'hash1',
          documentVersion: '1.0'
        },
        {
          userId: testUserId,
          documentType: 'terms-of-service',
          documentHash: 'hash2',
          documentVersion: '1.0'
        },
        {
          userId: 'other-user',
          documentType: 'privacy-policy',
          documentHash: 'hash3',
          documentVersion: '1.0'
        }
      ]

      for (const acceptance of testAcceptances) {
        await manager.recordAcceptance(acceptance)
      }
    })

    it('should get acceptance by ID', async () => {
      const acceptance = await manager.recordAcceptance({
        userId: testUserId,
        documentType: 'eula',
        documentHash: 'hash4',
        documentVersion: '1.0'
      })

      const retrieved = await manager.getAcceptance(acceptance.id)

      expect(retrieved).toEqual(acceptance)
    })

    it('should return null for non-existent acceptance', async () => {
      const result = await manager.getAcceptance('non-existent-id')
      expect(result).toBeNull()
    })

    it('should get acceptances by user ID', async () => {
      const userAcceptances = await manager.getAcceptancesByUser(testUserId)

      expect(userAcceptances).toHaveLength(2)
      expect(userAcceptances.every(a => a.userId === testUserId)).toBe(true)
      expect(userAcceptances.map(a => a.documentType).sort()).toEqual([
        'privacy-policy',
        'terms-of-service'
      ])
    })

    it('should get acceptances by document type', async () => {
      const privacyAcceptances = await manager.getAcceptancesByDocumentType('privacy-policy')

      expect(privacyAcceptances).toHaveLength(2)
      expect(privacyAcceptances.every(a => a.documentType === 'privacy-policy')).toBe(true)
    })

    it('should get user acceptance for specific document type', async () => {
      const acceptance = await manager.getUserAcceptance(testUserId, 'privacy-policy')

      expect(acceptance).toBeDefined()
      expect(acceptance.userId).toBe(testUserId)
      expect(acceptance.documentType).toBe('privacy-policy')
    })

    it('should return null if user has not accepted document type', async () => {
      const acceptance = await manager.getUserAcceptance(testUserId, 'license')
      expect(acceptance).toBeNull()
    })

    it('should get all acceptances', async () => {
      const allAcceptances = await manager.getAllAcceptances()

      expect(allAcceptances).toHaveLength(3)
      expect(allAcceptances.map(a => a.userId).sort()).toEqual([
        'other-user',
        testUserId,
        testUserId
      ])
    })
  })

  describe('acceptance status checking', () => {
    beforeEach(async () => {
      // Record some acceptances
      await manager.recordAcceptance({
        userId: testUserId,
        documentType: 'privacy-policy',
        documentHash: 'current-hash',
        documentVersion: '2.0'
      })

      await manager.recordAcceptance({
        userId: testUserId,
        documentType: 'terms-of-service',
        documentHash: 'old-hash',
        documentVersion: '1.0'
      })
    })

    it('should check if user has accepted document with current hash', async () => {
      const hasAccepted = await manager.hasUserAccepted(
        testUserId,
        'privacy-policy',
        'current-hash'
      )

      expect(hasAccepted).toBe(true)
    })

    it('should return false for outdated document hash', async () => {
      const hasAccepted = await manager.hasUserAccepted(
        testUserId,
        'privacy-policy',
        'different-hash'
      )

      expect(hasAccepted).toBe(false)
    })

    it('should return false for unaccepted document type', async () => {
      const hasAccepted = await manager.hasUserAccepted(
        testUserId,
        'eula',
        'any-hash'
      )

      expect(hasAccepted).toBe(false)
    })

    it('should get acceptance status for multiple documents', async () => {
      const statuses = await manager.getUserAcceptanceStatus(testUserId, {
        'privacy-policy': 'current-hash',
        'terms-of-service': 'new-hash',
        'eula': 'any-hash'
      })

      expect(statuses).toEqual({
        'privacy-policy': true,
        'terms-of-service': false, // different hash
        'eula': false // not accepted
      })
    })

    it('should validate inputs for acceptance checking', async () => {
      await expect(manager.hasUserAccepted(null, 'privacy-policy', 'hash')).rejects.toThrow(
        'User ID is required'
      )

      await expect(manager.hasUserAccepted(testUserId, null, 'hash')).rejects.toThrow(
        'Document type is required'
      )

      await expect(manager.hasUserAccepted(testUserId, 'privacy-policy', null)).rejects.toThrow(
        'Document hash is required'
      )
    })
  })

  describe('acceptance history', () => {
    beforeEach(async () => {
      // Create acceptance history
      const acceptances = [
        {
          userId: testUserId,
          documentType: 'privacy-policy',
          documentHash: 'hash-v1',
          documentVersion: '1.0',
          acceptedAt: new Date('2024-01-01')
        },
        {
          userId: testUserId,
          documentType: 'privacy-policy',
          documentHash: 'hash-v2',
          documentVersion: '2.0',
          acceptedAt: new Date('2024-02-01')
        },
        {
          userId: testUserId,
          documentType: 'terms-of-service',
          documentHash: 'terms-hash',
          documentVersion: '1.0',
          acceptedAt: new Date('2024-01-15')
        }
      ]

      for (const acceptance of acceptances) {
        await manager.recordAcceptance(acceptance)
      }
    })

    it('should get acceptance history for user and document type', async () => {
      const history = await manager.getAcceptanceHistory(testUserId, 'privacy-policy')

      expect(history).toHaveLength(2)
      expect(history[0].documentVersion).toBe('2.0') // Most recent first
      expect(history[1].documentVersion).toBe('1.0')
    })

    it('should get latest acceptance for user and document type', async () => {
      const latest = await manager.getLatestAcceptance(testUserId, 'privacy-policy')

      expect(latest.documentVersion).toBe('2.0')
      expect(latest.documentHash).toBe('hash-v2')
    })

    it('should return null if no acceptance history exists', async () => {
      const history = await manager.getAcceptanceHistory(testUserId, 'eula')
      expect(history).toHaveLength(0)

      const latest = await manager.getLatestAcceptance(testUserId, 'eula')
      expect(latest).toBeNull()
    })

    it('should get complete acceptance history for user', async () => {
      const fullHistory = await manager.getUserAcceptanceHistory(testUserId)

      expect(fullHistory).toHaveLength(3)

      // Should be sorted by acceptedAt descending
      expect(fullHistory[0].documentType).toBe('privacy-policy')
      expect(fullHistory[0].documentVersion).toBe('2.0')
    })
  })

  describe('data management', () => {
    beforeEach(async () => {
      // Add test data
      const testAcceptances = [
        {
          userId: testUserId,
          documentType: 'privacy-policy',
          documentHash: 'hash1',
          documentVersion: '1.0',
          acceptedAt: new Date('2024-01-01')
        },
        {
          userId: testUserId,
          documentType: 'terms-of-service',
          documentHash: 'hash2',
          documentVersion: '1.0',
          acceptedAt: new Date('2024-02-01')
        }
      ]

      for (const acceptance of testAcceptances) {
        await manager.recordAcceptance(acceptance)
      }
    })

    it('should delete acceptance by ID', async () => {
      const acceptance = await manager.getUserAcceptance(testUserId, 'privacy-policy')
      await manager.deleteAcceptance(acceptance.id)

      const retrieved = await manager.getAcceptance(acceptance.id)
      expect(retrieved).toBeNull()
    })

    it('should delete all acceptances for user', async () => {
      await manager.deleteUserAcceptances(testUserId)

      const userAcceptances = await manager.getAcceptancesByUser(testUserId)
      expect(userAcceptances).toHaveLength(0)
    })

    it('should clear all acceptances', async () => {
      await manager.clearAllAcceptances()

      const allAcceptances = await manager.getAllAcceptances()
      expect(allAcceptances).toHaveLength(0)
    })

    it('should get acceptance statistics', async () => {
      const stats = await manager.getAcceptanceStats()

      expect(stats.totalAcceptances).toBe(2)
      expect(stats.uniqueUsers).toBe(1)
      expect(stats.documentTypes).toEqual(['privacy-policy', 'terms-of-service'])
      expect(stats.oldestAcceptance).toEqual(new Date('2024-01-01'))
      expect(stats.newestAcceptance).toEqual(new Date('2024-02-01'))
    })

    it('should handle empty database statistics', async () => {
      await manager.clearAllAcceptances()

      const stats = await manager.getAcceptanceStats()

      expect(stats.totalAcceptances).toBe(0)
      expect(stats.uniqueUsers).toBe(0)
      expect(stats.documentTypes).toEqual([])
      expect(stats.oldestAcceptance).toBeNull()
      expect(stats.newestAcceptance).toBeNull()
    })
  })

  describe('validation and error handling', () => {
    it('should handle invalid acceptance data gracefully', async () => {
      await expect(manager.recordAcceptance(null)).rejects.toThrow(
        'Acceptance data is required'
      )

      await expect(manager.recordAcceptance('not-an-object')).rejects.toThrow(
        'Acceptance data must be an object'
      )
    })

    it('should validate document types against allowed list', async () => {
      const invalidData = {
        userId: testUserId,
        documentType: 'unknown-document',
        documentHash: 'hash123',
        documentVersion: '1.0'
      }

      await expect(manager.recordAcceptance(invalidData)).rejects.toThrow(
        'Invalid document type'
      )
    })

    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      manager.db.close()

      await expect(manager.recordAcceptance({
        userId: testUserId,
        documentType: 'privacy-policy',
        documentHash: 'hash123',
        documentVersion: '1.0'
      })).rejects.toThrow()
    })

    it('should provide meaningful error messages', async () => {
      const testCases = [
        {
          data: { documentType: 'privacy-policy', documentHash: 'hash', documentVersion: '1.0' },
          error: 'User ID is required'
        },
        {
          data: { userId: testUserId, documentHash: 'hash', documentVersion: '1.0' },
          error: 'Document type is required'
        },
        {
          data: { userId: testUserId, documentType: 'privacy-policy', documentVersion: '1.0' },
          error: 'Document hash is required'
        },
        {
          data: { userId: testUserId, documentType: 'privacy-policy', documentHash: 'hash' },
          error: 'Document version is required'
        }
      ]

      for (const testCase of testCases) {
        await expect(manager.recordAcceptance(testCase.data)).rejects.toThrow(testCase.error)
      }
    })

    it('should handle invalid ID formats', async () => {
      const result = await manager.getAcceptance('invalid-id-format')
      expect(result).toBeNull()
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent acceptance recordings', async () => {
      const acceptances = Array.from({ length: 5 }, (_, i) => ({
        userId: `user-${i}`,
        documentType: 'privacy-policy',
        documentHash: `hash-${i}`,
        documentVersion: '1.0'
      }))

      const promises = acceptances.map(acceptance => manager.recordAcceptance(acceptance))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      expect(new Set(results.map(r => r.id)).size).toBe(5) // All unique IDs
    })

    it('should maintain data integrity with concurrent operations', async () => {
      const operations = [
        () => manager.recordAcceptance({
          userId: testUserId,
          documentType: 'privacy-policy',
          documentHash: 'hash1',
          documentVersion: '1.0'
        }),
        () => manager.recordAcceptance({
          userId: testUserId,
          documentType: 'terms-of-service',
          documentHash: 'hash2',
          documentVersion: '1.0'
        }),
        () => manager.getAcceptancesByUser(testUserId)
      ]

      const results = await Promise.allSettled(operations.map(op => op()))
      const successful = results.filter(r => r.status === 'fulfilled')

      expect(successful.length).toBeGreaterThan(0)
    })
  })
})