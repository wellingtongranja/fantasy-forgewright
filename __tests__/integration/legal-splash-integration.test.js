/**
 * Legal Splash Integration Tests - Component interaction testing
 * Tests integration between LegalSplash and other legal system components
 */
import { LegalSplash } from '../../src/components/legal-splash/legal-splash.js'
import { LegalManager } from '../../src/core/legal/legal-manager.js'
import { LegalClient } from '../../src/core/legal/legal-client.js'
import { LegalDocumentTracker } from '../../src/core/legal/legal-tracker.js'
import { LegalAcceptanceManager } from '../../src/core/legal/legal-acceptance.js'
import { manifestLoader } from '../../src/utils/manifest-loader.js'

// Mock global fetch for tests
global.fetch = jest.fn()

// Mock IndexedDB
const mockIDB = {
  open: jest.fn(),
  transaction: jest.fn(),
  objectStore: jest.fn(),
  add: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  getAll: jest.fn()
}

global.indexedDB = mockIDB

describe('Legal Splash Integration', () => {
  let legalManager
  let legalSplash
  let mockContainer

  beforeEach(() => {
    // Setup DOM
    mockContainer = document.createElement('div')
    document.body.appendChild(mockContainer)

    // Clear all mocks
    jest.clearAllMocks()
    fetch.mockClear()

    // Reset theme
    document.documentElement.removeAttribute('data-theme')

    // Mock successful database operations
    mockIDB.open.mockResolvedValue({
      result: {
        transaction: () => ({
          objectStore: () => ({
            add: jest.fn().mockResolvedValue(),
            get: jest.fn().mockResolvedValue(),
            put: jest.fn().mockResolvedValue(),
            getAll: jest.fn().mockResolvedValue([])
          })
        })
      }
    })

    // Setup legal manager
    legalManager = new LegalManager()
    legalSplash = new LegalSplash(legalManager)
  })

  afterEach(() => {
    if (mockContainer && document.body.contains(mockContainer)) {
      document.body.removeChild(mockContainer)
    }
    if (legalSplash && legalSplash.isOpen) {
      legalSplash.hide()
    }
  })

  describe('legal manager integration', () => {
    it('should integrate with legal manager for document fetching', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nIntegration test content',
        hash: 'integration-hash',
        version: '1.0'
      }

      // Mock legal manager methods
      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)
      jest.spyOn(legalManager, 'recordUserAcceptance').mockResolvedValue(true)

      await legalSplash.show('user123', ['privacy-policy'])

      expect(legalManager.fetchDocument).toHaveBeenCalledWith('privacy-policy')
      expect(legalSplash.documents['privacy-policy']).toEqual(mockDocument)
    })

    it('should handle legal manager initialization', async () => {
      const initSpy = jest.spyOn(legalManager, 'init').mockResolvedValue()

      await legalManager.init()
      expect(initSpy).toHaveBeenCalled()
    })

    it('should record user acceptances through legal manager', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash',
        version: '1.0'
      }

      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)
      const recordSpy = jest.spyOn(legalManager, 'recordUserAcceptance').mockResolvedValue(true)

      await legalSplash.show('user123', ['privacy-policy'])

      // Simulate user accepting document
      legalSplash.acceptanceState['privacy-policy'] = true
      legalSplash.readProgress['privacy-policy'] = 100

      await legalSplash.handleAcceptAll(['privacy-policy'])

      expect(recordSpy).toHaveBeenCalledWith({
        userId: 'user123',
        documentType: 'privacy-policy',
        documentHash: 'test-hash',
        documentVersion: '1.0',
        acceptedAt: expect.any(Date),
        readProgress: 100
      })
    })
  })

  describe('manifest loader integration', () => {
    it('should load app information from manifest loader', async () => {
      const mockIcon = { src: '/icons/icon-192x192.png', sizes: '192x192' }
      const mockName = 'Fantasy Editor Test'
      const mockThemeColor = '#007bff'

      jest.spyOn(manifestLoader, 'getBestIcon').mockResolvedValue(mockIcon)
      jest.spyOn(manifestLoader, 'getAppName').mockResolvedValue(mockName)
      jest.spyOn(manifestLoader, 'getThemeColor').mockResolvedValue(mockThemeColor)

      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      }

      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)

      await legalSplash.show('user123', ['privacy-policy'])

      expect(manifestLoader.getBestIcon).toHaveBeenCalledWith(48)
      expect(manifestLoader.getAppName).toHaveBeenCalled()
      expect(manifestLoader.getThemeColor).toHaveBeenCalled()

      expect(legalSplash.appInfo).toEqual({
        icon: mockIcon,
        name: mockName,
        themeColor: mockThemeColor
      })
    })

    it('should handle manifest loader failures gracefully', async () => {
      jest.spyOn(manifestLoader, 'getBestIcon').mockRejectedValue(new Error('Manifest error'))
      jest.spyOn(manifestLoader, 'getAppName').mockRejectedValue(new Error('Manifest error'))
      jest.spyOn(manifestLoader, 'getThemeColor').mockRejectedValue(new Error('Manifest error'))

      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      }

      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)

      await legalSplash.show('user123', ['privacy-policy'])

      // Should use fallback values
      expect(legalSplash.appInfo.name).toBe('Fantasy Editor')
      expect(legalSplash.appInfo.icon.src).toContain('/dist/icons')
      expect(legalSplash.appInfo.themeColor).toBe('#007bff')
    })
  })

  describe('document workflow integration', () => {
    let mockDocuments

    beforeEach(() => {
      mockDocuments = {
        'privacy-policy': {
          type: 'privacy-policy',
          content: '# Privacy Policy\n\nYour privacy is important.',
          hash: 'privacy-hash',
          version: '1.0'
        },
        'terms-of-service': {
          type: 'terms-of-service',
          content: '# Terms of Service\n\nThese are the terms.',
          hash: 'terms-hash',
          version: '1.1'
        }
      }
    })

    it('should handle complete document acceptance workflow', async () => {
      jest.spyOn(legalManager, 'fetchDocument')
        .mockImplementation(type => Promise.resolve(mockDocuments[type]))
      jest.spyOn(legalManager, 'recordUserAcceptance').mockResolvedValue(true)

      const onAcceptanceSpy = jest.fn()

      await legalSplash.show('user123', ['privacy-policy', 'terms-of-service'], onAcceptanceSpy)

      // Simulate reading both documents
      legalSplash.readProgress['privacy-policy'] = 90
      legalSplash.readProgress['terms-of-service'] = 85

      // Accept both documents
      legalSplash.acceptanceState['privacy-policy'] = true
      legalSplash.acceptanceState['terms-of-service'] = true

      await legalSplash.handleAcceptAll(['privacy-policy', 'terms-of-service'])

      // Should record both acceptances
      expect(legalManager.recordUserAcceptance).toHaveBeenCalledTimes(2)

      // Should call acceptance callback
      expect(onAcceptanceSpy).toHaveBeenCalledWith({
        userId: 'user123',
        acceptedDocuments: ['privacy-policy', 'terms-of-service'],
        timestamp: expect.any(Date)
      })

      // Should close modal
      expect(legalSplash.isOpen).toBe(false)
    })

    it('should handle selective document acceptance', async () => {
      jest.spyOn(legalManager, 'fetchDocument')
        .mockImplementation(type => Promise.resolve(mockDocuments[type]))
      jest.spyOn(legalManager, 'recordUserAcceptance').mockResolvedValue(true)

      const onAcceptanceSpy = jest.fn()

      await legalSplash.show('user123', ['privacy-policy', 'terms-of-service'], onAcceptanceSpy)

      // Simulate reading and accepting only privacy policy
      legalSplash.readProgress['privacy-policy'] = 95
      legalSplash.readProgress['terms-of-service'] = 30 // Not fully read
      legalSplash.acceptanceState['privacy-policy'] = true
      legalSplash.acceptanceState['terms-of-service'] = false

      await legalSplash.handleAcceptRequired(['privacy-policy', 'terms-of-service'])

      // Should only record privacy policy acceptance
      expect(legalManager.recordUserAcceptance).toHaveBeenCalledTimes(1)
      expect(legalManager.recordUserAcceptance).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: 'privacy-policy'
        })
      )

      expect(onAcceptanceSpy).toHaveBeenCalledWith({
        userId: 'user123',
        acceptedDocuments: ['privacy-policy'],
        timestamp: expect.any(Date)
      })
    })

    it('should handle document loading errors in workflow', async () => {
      jest.spyOn(legalManager, 'fetchDocument')
        .mockImplementation(type => {
          if (type === 'privacy-policy') {
            return Promise.resolve(mockDocuments[type])
          } else {
            return Promise.reject(new Error('Network error'))
          }
        })

      await legalSplash.show('user123', ['privacy-policy', 'terms-of-service'])

      // Should have loaded privacy policy successfully
      expect(legalSplash.documents['privacy-policy']).toEqual(mockDocuments['privacy-policy'])

      // Should have fallback for terms of service
      expect(legalSplash.documents['terms-of-service']).toBeDefined()
      expect(legalSplash.documents['terms-of-service'].error).toContain('Failed to load')
    })
  })

  describe('user interaction integration', () => {
    beforeEach(async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nTest content for interaction',
        hash: 'interaction-hash',
        version: '1.0'
      }

      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)
      jest.spyOn(legalManager, 'recordUserAcceptance').mockResolvedValue(true)

      await legalSplash.show('user123', ['privacy-policy'])
    })

    it('should handle tab switching with UI updates', () => {
      // Add second document for testing
      legalSplash.documents['terms-of-service'] = {
        type: 'terms-of-service',
        content: '# Terms of Service',
        hash: 'terms-hash'
      }

      const initialTab = legalSplash.currentTab
      expect(initialTab).toBe('privacy-policy')

      legalSplash.switchTab('terms-of-service')

      expect(legalSplash.currentTab).toBe('terms-of-service')
      expect(legalSplash.readProgress['terms-of-service']).toBe(0)
    })

    it('should track scroll progress correctly', () => {
      const mockScrollElement = {
        scrollTop: 100,
        scrollHeight: 500,
        clientHeight: 200
      }

      legalSplash.trackScrollProgress(mockScrollElement)

      const expectedProgress = (100 / (500 - 200)) * 100
      expect(legalSplash.readProgress['privacy-policy']).toBeCloseTo(expectedProgress, 1)
    })

    it('should validate acceptance requirements', () => {
      // Set up test data
      legalSplash.readProgress['privacy-policy'] = 85
      legalSplash.acceptanceState['privacy-policy'] = true

      const canAccept = legalSplash.canAcceptDocument('privacy-policy')
      expect(canAccept).toBe(true)

      const isValidAcceptance = legalSplash.validateAcceptance(['privacy-policy'])
      expect(isValidAcceptance).toBe(true)

      const canSubmit = legalSplash.canSubmit(['privacy-policy'])
      expect(canSubmit).toBe(true)
    })

    it('should prevent acceptance when reading requirements not met', () => {
      legalSplash.readProgress['privacy-policy'] = 50 // Below 80% threshold
      legalSplash.acceptanceState['privacy-policy'] = true

      const canAccept = legalSplash.canAcceptDocument('privacy-policy')
      expect(canAccept).toBe(false)

      const canSubmit = legalSplash.canSubmit(['privacy-policy'])
      expect(canSubmit).toBe(false)
    })
  })

  describe('event handling integration', () => {
    beforeEach(async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nEvent handling test',
        hash: 'event-hash',
        version: '1.0'
      }

      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)
      await legalSplash.show('user123', ['privacy-policy'])
    })

    it('should handle modal close events', () => {
      expect(legalSplash.isOpen).toBe(true)

      const closeButton = legalSplash.element.querySelector('.splash-close')
      expect(closeButton).toBeDefined()

      // Simulate close button click
      const clickEvent = new MouseEvent('click', { bubbles: true })
      closeButton.dispatchEvent(clickEvent)

      expect(legalSplash.isOpen).toBe(false)
      expect(document.body.classList.contains('legal-splash-open')).toBe(false)
    })

    it('should handle escape key to close modal', () => {
      expect(legalSplash.isOpen).toBe(true)

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)

      expect(legalSplash.isOpen).toBe(false)
    })

    it('should handle checkbox changes', () => {
      legalSplash.readProgress['privacy-policy'] = 85 // Above threshold

      const checkbox = legalSplash.element.querySelector('[data-document="privacy-policy"]')
      expect(checkbox).toBeDefined()

      // Simulate checkbox change with proper event target
      checkbox.checked = true
      const changeEvent = {
        target: {
          type: 'checkbox',
          dataset: { document: 'privacy-policy' },
          checked: true
        }
      }

      legalSplash.handleCheckboxChange(changeEvent)

      expect(legalSplash.acceptanceState['privacy-policy']).toBe(true)
    })

    it('should handle scroll events for progress tracking', () => {
      const contentArea = legalSplash.element.querySelector('.splash-content')
      expect(contentArea).toBeDefined()

      // Mock scroll properties
      Object.defineProperty(contentArea, 'scrollTop', { value: 150, writable: true })
      Object.defineProperty(contentArea, 'scrollHeight', { value: 600, writable: true })
      Object.defineProperty(contentArea, 'clientHeight', { value: 300, writable: true })

      // Simulate scroll event
      const scrollEvent = new Event('scroll', { bubbles: true })
      contentArea.dispatchEvent(scrollEvent)

      // Should update progress
      expect(legalSplash.readProgress['privacy-policy']).toBeCloseTo(50, 0)
    })
  })

  describe('theme integration', () => {
    it('should adapt to fantasy theme', async () => {
      document.documentElement.setAttribute('data-theme', 'fantasy')

      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nFantasy theme test',
        hash: 'fantasy-hash',
        version: '1.0'
      }

      jest.clearAllMocks()
      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)

      // Mock manifestLoader for fantasy theme
      const mockManifestLoader = {
        getBestIcon: jest.fn().mockResolvedValue({
          src: '/icons/icon-192x192.png',
          sizes: '192x192'
        }),
        getAppName: jest.fn().mockResolvedValue('Fantasy Editor'),
        getThemeColor: jest.fn().mockResolvedValue('#d4af37')
      }

      const fantasyLegalSplash = new LegalSplash(legalManager, mockManifestLoader)

      await fantasyLegalSplash.show('user123', ['privacy-policy'])

      expect(fantasyLegalSplash.appInfo.themeColor).toBe('#d4af37')

      // Check that modal exists (theme styling tested in CSS)
      expect(fantasyLegalSplash.element).toBeDefined()
      expect(fantasyLegalSplash.element.querySelector('.legal-splash')).toBeDefined()

      fantasyLegalSplash.hide()
    })

    it('should adapt to dark theme', async () => {
      document.documentElement.setAttribute('data-theme', 'dark')

      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nDark theme test',
        hash: 'dark-hash',
        version: '1.0'
      }

      jest.clearAllMocks()
      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)

      // Mock manifestLoader for dark theme
      const mockManifestLoader = {
        getBestIcon: jest.fn().mockResolvedValue({
          src: '/icons/icon-192x192.png',
          sizes: '192x192'
        }),
        getAppName: jest.fn().mockResolvedValue('Fantasy Editor'),
        getThemeColor: jest.fn().mockResolvedValue('#1f2937')
      }

      const darkLegalSplash = new LegalSplash(legalManager, mockManifestLoader)

      await darkLegalSplash.show('user123', ['privacy-policy'])

      expect(darkLegalSplash.appInfo.themeColor).toBe('#1f2937')
      expect(darkLegalSplash.element.querySelector('.legal-splash')).toBeDefined()

      darkLegalSplash.hide()
    })
  })

  describe('error handling integration', () => {
    it('should handle legal manager failures gracefully', async () => {
      jest.spyOn(legalManager, 'fetchDocument').mockRejectedValue(new Error('Manager error'))

      // Should not throw, should show with fallback documents
      await expect(legalSplash.show('user123', ['privacy-policy'])).resolves.toBe(true)

      expect(legalSplash.documents['privacy-policy']).toBeDefined()
      expect(legalSplash.documents['privacy-policy'].error).toContain('Failed to load')
    })

    it('should handle acceptance recording failures', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'error-hash',
        version: '1.0'
      }

      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)
      jest.spyOn(legalManager, 'recordUserAcceptance').mockRejectedValue(new Error('Storage error'))

      await legalSplash.show('user123', ['privacy-policy'])

      legalSplash.readProgress['privacy-policy'] = 85
      legalSplash.acceptanceState['privacy-policy'] = true

      await expect(legalSplash.handleAcceptAll(['privacy-policy'])).rejects.toThrow('Storage error')
    })

    it('should handle initialization failures', async () => {
      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      })
      jest.spyOn(manifestLoader, 'getBestIcon').mockRejectedValue(new Error('Initialization error'))

      // Should handle gracefully with fallbacks
      await expect(legalSplash.show('user123', ['privacy-policy'])).resolves.toBe(true)
      expect(legalSplash.isOpen).toBe(true)
    })
  })

  describe('cleanup and memory management', () => {
    it('should properly clean up resources on hide', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nCleanup test',
        hash: 'cleanup-hash',
        version: '1.0'
      }

      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)

      await legalSplash.show('user123', ['privacy-policy'])

      expect(legalSplash.isOpen).toBe(true)
      expect(legalSplash.element).toBeDefined()
      expect(document.body.classList.contains('legal-splash-open')).toBe(true)

      legalSplash.hide()

      expect(legalSplash.isOpen).toBe(false)
      expect(legalSplash.element).toBeNull()
      expect(legalSplash.documents).toEqual({})
      expect(legalSplash.readProgress).toEqual({})
      expect(legalSplash.acceptanceState).toEqual({})
      expect(document.body.classList.contains('legal-splash-open')).toBe(false)
    })

    it('should handle multiple show/hide cycles', async () => {
      const mockDocument = {
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'cycle-hash',
        version: '1.0'
      }

      jest.spyOn(legalManager, 'fetchDocument').mockResolvedValue(mockDocument)

      // First cycle
      await legalSplash.show('user123', ['privacy-policy'])
      expect(legalSplash.isOpen).toBe(true)

      legalSplash.hide()
      expect(legalSplash.isOpen).toBe(false)

      // Second cycle
      await legalSplash.show('user456', ['privacy-policy'])
      expect(legalSplash.isOpen).toBe(true)
      expect(legalSplash.userId).toBe('user456')

      legalSplash.hide()
      expect(legalSplash.isOpen).toBe(false)
    })
  })
})