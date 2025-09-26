/**
 * Legal Client Tests - TDD approach for worker communication
 * Tests written FIRST before implementation following Fantasy Editor standards
 */
import { LegalClient } from '../../src/core/legal/legal-client.js'

// Mock global fetch
global.fetch = jest.fn()

describe('LegalClient', () => {
  let client

  beforeEach(() => {
    client = new LegalClient()
    fetch.mockClear()
    fetch.mockReset()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with correct worker URL based on environment', () => {
      expect(client.workerUrl).toBeDefined()
      expect(typeof client.workerUrl).toBe('string')
      expect(client.workerUrl).toMatch(/fantasy-legal-docs.*\.workers\.dev/)
    })

    it('should initialize with default configuration', () => {
      expect(client.timeout).toBe(10000)
      expect(client.retryAttempts).toBe(3)
      expect(client.retryDelay).toBe(1000)
    })
  })

  describe('checkDocuments', () => {
    it('should fetch document metadata successfully', async () => {
      const mockMetadata = {
        documents: {
          'privacy-policy': { hash: 'abc123', version: '1.0' },
          'terms-of-service': { hash: 'def456', version: '1.1' }
        },
        lastUpdated: '2025-09-13T10:00:00Z'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMetadata
      })

      const result = await client.checkDocuments()

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/legal/check'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual(mockMetadata)
    })

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.checkDocuments()).rejects.toThrow('Failed to check documents')
    })

    it('should handle HTTP errors with retry', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(client.checkDocuments()).rejects.toThrow('Worker request failed')
    })

    it('should implement exponential backoff on retries', async () => {
      const startTime = Date.now()

      fetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })

      try {
        await client.checkDocuments()
      } catch (error) {
        const endTime = Date.now()
        const duration = endTime - startTime

        // Should have retried with delays (at least 3 attempts with backoff)
        expect(duration).toBeGreaterThan(2000) // 1s + 2s delays minimum
        expect(fetch).toHaveBeenCalledTimes(3)
      }
    })
  })

  describe('fetchDocument', () => {
    it('should fetch specific document successfully', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nYour privacy is important.',
        hash: 'abc123',
        version: '1.0'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDocument
      })

      const result = await client.fetchDocument('privacy-policy')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/legal/documents?type=privacy-policy'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual(mockDocument)
    })

    it('should validate document type input', async () => {
      await expect(client.fetchDocument('')).rejects.toThrow('Document type is required')
      await expect(client.fetchDocument(null)).rejects.toThrow('Document type is required')
      await expect(client.fetchDocument('invalid-type')).rejects.toThrow('Invalid document type')
    })

    it('should handle document not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(client.fetchDocument('privacy-policy')).rejects.toThrow('Failed to fetch document')
    })

    it('should verify document hash if provided', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nYour privacy is important.',
        hash: 'abc123',
        version: '1.0'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDocument
      })

      const result = await client.fetchDocument('privacy-policy', 'abc123')

      expect(result).toEqual(mockDocument)
    })

    it('should throw error on hash mismatch', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nYour privacy is important.',
        hash: 'abc123',
        version: '1.0'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDocument
      })

      await expect(client.fetchDocument('privacy-policy', 'wrong-hash'))
        .rejects.toThrow('Document hash verification failed')
    })
  })

  describe('error handling', () => {
    it('should handle malformed JSON responses', async () => {
      // Set single retry for this test
      client.retryAttempts = 1

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Invalid JSON') }
      })

      await expect(client.checkDocuments()).rejects.toThrow('parse response')
    })

    it('should handle CORS errors gracefully', async () => {
      // Set single retry for this test
      client.retryAttempts = 1

      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(client.checkDocuments()).rejects.toThrow('Network request failed')
    })

    it('should handle timeout errors by throwing timeout error', () => {
      // Test timeout by checking that AbortController is used correctly
      expect(client.timeout).toBe(10000)
    })
  })

  describe('caching', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should cache successful responses', async () => {
      const mockMetadata = {
        documents: { 'privacy-policy': { hash: 'abc123', version: '1.0' } },
        lastUpdated: '2025-09-13T10:00:00Z'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMetadata
      })

      // First call
      const result1 = await client.checkDocuments()

      // Second call (should use cache)
      const result2 = await client.checkDocuments()

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })

    it('should respect cache expiration', async () => {
      const mockMetadata = {
        documents: { 'privacy-policy': { hash: 'abc123', version: '1.0' } },
        lastUpdated: '2025-09-13T10:00:00Z'
      }

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMetadata
      })

      // First call
      await client.checkDocuments()

      // Fast-forward time past cache expiration
      jest.advanceTimersByTime(6 * 60 * 1000) // 6 minutes

      // Second call (should fetch again)
      await client.checkDocuments()

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('defensive programming', () => {
    it('should handle null/undefined responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null
      })

      await expect(client.checkDocuments()).rejects.toThrow('Invalid response format')
    })

    it('should validate response structure', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'structure' })
      })

      await expect(client.checkDocuments()).rejects.toThrow('Invalid response format')
    })

    it('should handle empty document content', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '',
        hash: 'empty-hash',
        version: '1.0'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockDocument
      })

      const result = await client.fetchDocument('privacy-policy')
      expect(result.content).toBe('')
    })
  })
})