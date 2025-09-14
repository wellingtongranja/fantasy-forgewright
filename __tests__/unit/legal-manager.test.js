/**
 * Legal Manager Tests - TDD approach for component coordination
 * Tests written FIRST before implementation following Fantasy Editor standards
 */
import { LegalManager } from '../../src/core/legal/legal-manager.js'

// Mock dependencies
jest.mock('../../src/core/legal/legal-client.js')
jest.mock('../../src/core/legal/legal-tracker.js')
jest.mock('../../src/core/legal/legal-acceptance.js')

import { LegalClient } from '../../src/core/legal/legal-client.js'
import { LegalDocumentTracker } from '../../src/core/legal/legal-tracker.js'
import { LegalAcceptanceManager } from '../../src/core/legal/legal-acceptance.js'

describe('LegalManager', () => {
  let manager
  let mockClient
  let mockTracker
  let mockAcceptance

  beforeEach(() => {
    // Create mock instances
    mockClient = {
      checkDocuments: jest.fn(),
      fetchDocument: jest.fn(),
      clearCache: jest.fn()
    }

    mockTracker = {
      trackDocument: jest.fn(),
      trackDocuments: jest.fn(),
      hasChanged: jest.fn(),
      getTrackedDocument: jest.fn(),
      getChangedDocuments: jest.fn(),
      clearTracking: jest.fn()
    }

    mockAcceptance = {
      initDatabase: jest.fn(),
      hasUserAccepted: jest.fn(),
      getUserAcceptanceStatus: jest.fn(),
      recordAcceptance: jest.fn(),
      getUserAcceptanceHistory: jest.fn()
    }

    // Mock constructors
    LegalClient.mockImplementation(() => mockClient)
    LegalDocumentTracker.mockImplementation(() => mockTracker)
    LegalAcceptanceManager.mockImplementation(() => mockAcceptance)

    manager = new LegalManager()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with all components', () => {
      expect(LegalClient).toHaveBeenCalledTimes(1)
      expect(LegalDocumentTracker).toHaveBeenCalledTimes(1)
      expect(LegalAcceptanceManager).toHaveBeenCalledTimes(1)
      expect(manager.initialized).toBe(false)
    })

    it('should initialize database on init', async () => {
      mockAcceptance.initDatabase.mockResolvedValueOnce(true)

      await manager.init()

      expect(mockAcceptance.initDatabase).toHaveBeenCalledTimes(1)
      expect(manager.initialized).toBe(true)
    })

    it('should handle initialization errors gracefully', async () => {
      mockAcceptance.initDatabase.mockRejectedValueOnce(new Error('DB init failed'))

      await expect(manager.init()).rejects.toThrow('Failed to initialize legal manager')
    })
  })

  describe('checkForUpdates', () => {
    beforeEach(async () => {
      mockAcceptance.initDatabase.mockResolvedValueOnce(true)
      await manager.init()
    })

    it('should check for document updates successfully', async () => {
      const mockMetadata = {
        documents: {
          'privacy-policy': { hash: 'abc123', version: '1.0' },
          'terms-of-service': { hash: 'def456', version: '1.1' }
        },
        lastUpdated: '2025-09-13T10:00:00Z'
      }

      mockClient.checkDocuments.mockResolvedValueOnce(mockMetadata)

      const result = await manager.checkForUpdates()

      expect(mockClient.checkDocuments).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockMetadata)
    })

    it('should handle worker unavailable gracefully', async () => {
      mockClient.checkDocuments.mockRejectedValueOnce(new Error('Network error'))

      const result = await manager.checkForUpdates()

      expect(result).toEqual({
        documents: {},
        lastUpdated: null,
        error: 'Worker unavailable'
      })
    })

    it('should cache successful responses', async () => {
      const mockMetadata = {
        documents: { 'privacy-policy': { hash: 'abc123', version: '1.0' } },
        lastUpdated: '2025-09-13T10:00:00Z'
      }

      mockClient.checkDocuments.mockResolvedValueOnce(mockMetadata)

      // First call
      const result1 = await manager.checkForUpdates()

      // Second call (should use cache)
      const result2 = await manager.checkForUpdates()

      expect(mockClient.checkDocuments).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })
  })

  describe('getUserAcceptanceStatus', () => {
    beforeEach(async () => {
      mockAcceptance.initDatabase.mockResolvedValueOnce(true)
      await manager.init()
    })

    it('should get user acceptance status for all documents', async () => {
      const userId = 'test-user-123'
      const documentHashes = {
        'privacy-policy': 'abc123',
        'terms-of-service': 'def456',
        'eula': 'ghi789'
      }

      const mockStatus = {
        'privacy-policy': true,
        'terms-of-service': false,
        'eula': true
      }

      mockAcceptance.getUserAcceptanceStatus.mockResolvedValueOnce(mockStatus)

      const result = await manager.getUserAcceptanceStatus(userId, documentHashes)

      expect(mockAcceptance.getUserAcceptanceStatus).toHaveBeenCalledWith(userId, documentHashes)
      expect(result).toEqual(mockStatus)
    })

    it('should validate user ID input', async () => {
      await expect(manager.getUserAcceptanceStatus('', {})).rejects.toThrow('User ID is required')
      await expect(manager.getUserAcceptanceStatus(null, {})).rejects.toThrow('User ID is required')
    })

    it('should validate document hashes input', async () => {
      await expect(manager.getUserAcceptanceStatus('user-123', null)).rejects.toThrow('Document hashes are required')
    })

    it('should handle acceptance manager errors', async () => {
      mockAcceptance.getUserAcceptanceStatus.mockRejectedValueOnce(new Error('DB error'))

      await expect(manager.getUserAcceptanceStatus('user-123', {}))
        .rejects.toThrow('Failed to get user acceptance status')
    })
  })

  describe('recordUserAcceptance', () => {
    beforeEach(async () => {
      mockAcceptance.initDatabase.mockResolvedValueOnce(true)
      await manager.init()
    })

    it('should record user acceptance successfully', async () => {
      const acceptanceData = {
        userId: 'test-user-123',
        documentType: 'privacy-policy',
        documentHash: 'abc123',
        documentVersion: '1.0'
      }

      const mockRecord = { id: 'acceptance-123', ...acceptanceData }
      mockAcceptance.recordAcceptance.mockResolvedValueOnce(mockRecord)

      const result = await manager.recordUserAcceptance(acceptanceData)

      expect(mockAcceptance.recordAcceptance).toHaveBeenCalledWith(acceptanceData)
      expect(result).toEqual(mockRecord)
    })

    it('should validate acceptance data', async () => {
      await expect(manager.recordUserAcceptance(null)).rejects.toThrow('Acceptance data is required')
    })

    it('should handle recording errors', async () => {
      const acceptanceData = {
        userId: 'test-user-123',
        documentType: 'privacy-policy',
        documentHash: 'abc123',
        documentVersion: '1.0'
      }

      mockAcceptance.recordAcceptance.mockRejectedValueOnce(new Error('Recording failed'))

      await expect(manager.recordUserAcceptance(acceptanceData))
        .rejects.toThrow('Failed to record acceptance')
    })
  })

  describe('fetchDocument', () => {
    beforeEach(async () => {
      mockAcceptance.initDatabase.mockResolvedValueOnce(true)
      await manager.init()
    })

    it('should fetch and track document successfully', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nYour privacy matters.',
        hash: 'abc123',
        version: '1.0'
      }

      mockClient.fetchDocument.mockResolvedValueOnce(mockDocument)
      mockTracker.trackDocument.mockResolvedValueOnce(undefined)

      const result = await manager.fetchDocument('privacy-policy')

      expect(mockClient.fetchDocument).toHaveBeenCalledWith('privacy-policy', undefined)
      expect(mockTracker.trackDocument).toHaveBeenCalledWith(mockDocument)
      expect(result).toEqual(mockDocument)
    })

    it('should fetch document with hash verification', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nYour privacy matters.',
        hash: 'abc123',
        version: '1.0'
      }

      mockClient.fetchDocument.mockResolvedValueOnce(mockDocument)
      mockTracker.trackDocument.mockResolvedValueOnce(undefined)

      const result = await manager.fetchDocument('privacy-policy', 'abc123')

      expect(mockClient.fetchDocument).toHaveBeenCalledWith('privacy-policy', 'abc123')
      expect(result).toEqual(mockDocument)
    })

    it('should handle worker errors with fallback', async () => {
      mockClient.fetchDocument.mockRejectedValueOnce(new Error('Worker error'))

      const result = await manager.fetchDocument('privacy-policy')

      expect(result).toEqual({
        type: 'privacy-policy',
        content: '',
        hash: null,
        version: null,
        error: 'Worker unavailable'
      })
    })
  })

  describe('getDocumentChangeStatus', () => {
    beforeEach(async () => {
      mockAcceptance.initDatabase.mockResolvedValueOnce(true)
      await manager.init()
    })

    it('should determine if user needs to accept new version', async () => {
      const userId = 'test-user-123'
      const documentType = 'privacy-policy'
      const currentHash = 'new-hash-456'

      mockAcceptance.hasUserAccepted.mockResolvedValueOnce(false)

      const result = await manager.getDocumentChangeStatus(userId, documentType, currentHash)

      expect(mockAcceptance.hasUserAccepted).toHaveBeenCalledWith(userId, documentType, currentHash)
      expect(result).toEqual({
        needsAcceptance: true,
        hasChanged: true,
        currentHash: currentHash
      })
    })

    it('should handle already accepted documents', async () => {
      const userId = 'test-user-123'
      const documentType = 'privacy-policy'
      const currentHash = 'existing-hash-123'

      mockAcceptance.hasUserAccepted.mockResolvedValueOnce(true)

      const result = await manager.getDocumentChangeStatus(userId, documentType, currentHash)

      expect(result).toEqual({
        needsAcceptance: false,
        hasChanged: false,
        currentHash: currentHash
      })
    })
  })

  describe('getUserAcceptanceHistory', () => {
    beforeEach(async () => {
      mockAcceptance.initDatabase.mockResolvedValueOnce(true)
      await manager.init()
    })

    it('should get user acceptance history', async () => {
      const userId = 'test-user-123'
      const mockHistory = [
        { documentType: 'privacy-policy', acceptedAt: new Date('2025-09-13') },
        { documentType: 'terms-of-service', acceptedAt: new Date('2025-09-12') }
      ]

      mockAcceptance.getUserAcceptanceHistory.mockResolvedValueOnce(mockHistory)

      const result = await manager.getUserAcceptanceHistory(userId)

      expect(mockAcceptance.getUserAcceptanceHistory).toHaveBeenCalledWith(userId)
      expect(result).toEqual(mockHistory)
    })
  })

  describe('clearCache', () => {
    it('should clear all caches', () => {
      manager.clearCache()

      expect(mockClient.clearCache).toHaveBeenCalledTimes(1)
      expect(mockTracker.clearTracking).toHaveBeenCalledTimes(1)
      expect(manager.lastUpdateCheck).toBe(null)
    })
  })

  describe('defensive programming', () => {
    it('should throw error if not initialized', async () => {
      const uninitializedManager = new LegalManager()

      await expect(uninitializedManager.checkForUpdates())
        .rejects.toThrow('Legal manager not initialized')
    })

    it('should handle component unavailability gracefully', async () => {
      // Simulate component failure
      mockClient.checkDocuments = null

      await expect(manager.checkForUpdates()).rejects.toThrow()
    })

    it('should validate all inputs', async () => {
      await manager.init()

      // Test various invalid inputs
      await expect(manager.getUserAcceptanceStatus()).rejects.toThrow()
      await expect(manager.recordUserAcceptance()).rejects.toThrow()
      await expect(manager.fetchDocument()).rejects.toThrow()
    })
  })
})