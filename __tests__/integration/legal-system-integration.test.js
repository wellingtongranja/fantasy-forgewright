/**
 * Legal System Integration Tests - Component interaction testing
 * Tests integration between components without complex external dependencies
 */
import { LegalClient } from '../../src/core/legal/legal-client.js'
import { LegalDocumentTracker } from '../../src/core/legal/legal-tracker.js'
import { manifestLoader } from '../../src/utils/manifest-loader.js'
import { detectEnvironment, getWorkerUrl, isValidDocumentType } from '../../src/core/legal/legal-constants.js'

// Mock global fetch
global.fetch = jest.fn()

describe('Legal System Integration', () => {
  beforeEach(() => {
    fetch.mockClear()
    fetch.mockReset()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('component integration', () => {
    it('should integrate constants with client correctly', () => {
      const workerUrl = getWorkerUrl()
      const environment = detectEnvironment()

      expect(workerUrl).toBeDefined()
      expect(typeof workerUrl).toBe('string')
      expect(workerUrl).toContain('fantasy-legal-docs')
      expect(['development', 'staging', 'production']).toContain(environment)
    })

    it('should validate document types consistently across components', () => {
      const validTypes = ['privacy-policy', 'terms-of-service', 'eula', 'license', 'release-notes']
      const invalidTypes = ['invalid', '', null, undefined]

      // Test constants validation
      validTypes.forEach(type => {
        expect(isValidDocumentType(type)).toBe(true)
      })

      invalidTypes.forEach(type => {
        expect(isValidDocumentType(type)).toBe(false)
      })

      // Test tracker validation
      const tracker = new LegalDocumentTracker()
      expect(tracker.getDocumentTypes()).toEqual(validTypes)

      validTypes.forEach(type => {
        expect(() => tracker.validateDocumentType(type)).not.toThrow()
      })

      invalidTypes.forEach(type => {
        expect(() => tracker.validateDocumentType(type)).toThrow()
      })
    })

    it('should handle worker graceful degradation', () => {
      const client = new LegalClient()

      // Client should use correct worker URL
      expect(client.workerUrl).toContain('fantasy-legal-docs')
      expect(client.timeout).toBe(10000)
      expect(client.retryAttempts).toBe(3)
    })
  })

  describe('manifest integration', () => {
    it('should load PWA manifest for splash screen', async () => {
      const mockManifest = {
        name: 'Fantasy Editor',
        theme_color: '#007bff',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const appName = await manifestLoader.getAppName()
      const themeColor = await manifestLoader.getThemeColor()
      const icons = await manifestLoader.getAppIcons()

      expect(appName).toBe('Fantasy Editor')
      expect(themeColor).toBe('#007bff')
      expect(icons).toHaveLength(1)
      expect(icons[0].src).toBe('/icons/icon-192x192.png')
    })

    it('should fallback gracefully when manifest unavailable', async () => {
      fetch.mockRejectedValueOnce(new Error('Manifest not found'))

      const appName = await manifestLoader.getAppName()
      const themeColor = await manifestLoader.getThemeColor()
      const icons = await manifestLoader.getAppIcons()

      expect(appName).toBe('Fantasy Editor')
      expect(themeColor).toBe('#007bff')
      expect(icons.length).toBeGreaterThan(0)
      expect(icons[0].src).toMatch(/\/(dist\/)?icons/)
    })
  })

  describe('document tracking integration', () => {
    it('should track documents consistently', async () => {
      const tracker = new LegalDocumentTracker()

      const testDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nYour privacy matters.',
        version: '1.0'
      }

      // Track document
      await tracker.trackDocument(testDocument)

      // Verify tracking
      const tracked = tracker.getTrackedDocument('privacy-policy')
      expect(tracked).toBeDefined()
      expect(tracked.version).toBe('1.0')
      expect(tracked.hash).toBeDefined()

      // Test change detection
      const hasChanged = await tracker.hasChanged('privacy-policy', testDocument.content)
      expect(hasChanged).toBe(false) // Same content

      const hasChangedDifferent = await tracker.hasChanged('privacy-policy', 'Different content')
      expect(hasChangedDifferent).toBe(true) // Different content
    })

    it('should handle multiple documents', async () => {
      const tracker = new LegalDocumentTracker()

      const documents = [
        { type: 'privacy-policy', content: 'Privacy content', version: '1.0' },
        { type: 'terms-of-service', content: 'Terms content', version: '1.1' },
        { type: 'eula', content: 'EULA content', version: '2.0' }
      ]

      await tracker.trackDocuments(documents)

      const trackedDocs = tracker.getTrackedDocuments()
      expect(Object.keys(trackedDocs)).toHaveLength(3)
      expect(trackedDocs['privacy-policy'].version).toBe('1.0')
      expect(trackedDocs['terms-of-service'].version).toBe('1.1')
      expect(trackedDocs['eula'].version).toBe('2.0')
    })
  })

  describe('error handling integration', () => {
    it('should handle validation errors consistently', () => {
      const client = new LegalClient()
      const tracker = new LegalDocumentTracker()

      // Document type validation should be consistent
      expect(() => client.validateDocumentType('invalid')).toThrow('Invalid document type')
      expect(() => tracker.validateDocumentType('invalid')).toThrow('Invalid document type')

      expect(() => client.validateDocumentType('')).toThrow('Document type is required')
      expect(() => tracker.validateDocumentType('')).toThrow('Invalid document type')
    })

    it('should handle network errors gracefully', () => {
      const client = new LegalClient()

      // Error categorization should be available
      const networkError = client.categorizeError(new TypeError('Failed to fetch'))
      const timeoutError = client.categorizeError(new Error('timeout'))

      expect(networkError.message).toBe('Network request failed')
      expect(timeoutError.message).toBe('Request timeout')
    })
  })

  describe('caching integration', () => {
    it('should cache responses properly', async () => {
      const mockResponse = {
        documents: { 'privacy-policy': { hash: 'abc123', version: '1.0' } },
        lastUpdated: '2025-09-13T10:00:00Z'
      }

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const client = new LegalClient()

      // First call should make request
      const result1 = await client.checkDocuments()
      expect(result1).toEqual(mockResponse)

      // Second call should use cache
      const result2 = await client.checkDocuments()
      expect(result2).toEqual(mockResponse)

      // Should only have made one fetch call
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should clear cache properly', async () => {
      const mockResponse = {
        documents: { 'privacy-policy': { hash: 'abc123', version: '1.0' } },
        lastUpdated: '2025-09-13T10:00:00Z'
      }

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const client = new LegalClient()

      // First call
      await client.checkDocuments()

      // Clear cache
      client.clearCache()

      // Second call should make new request
      await client.checkDocuments()

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
})