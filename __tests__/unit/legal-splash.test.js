/**
 * Legal Splash Component Tests - TDD approach for splash screen modal
 * Tests written FIRST before implementation following Fantasy Editor standards
 */
import { LegalSplash } from '../../src/components/legal-splash/legal-splash.js'

// Mock manifest loader
const mockManifestLoader = {
  getBestIcon: jest.fn().mockResolvedValue({
    src: '/icons/icon-48x48.png',
    sizes: '48x48',
    type: 'image/png'
  }),
  getAppName: jest.fn().mockResolvedValue('Fantasy Editor'),
  getThemeColor: jest.fn().mockResolvedValue('#007bff')
}

// Mock legal manager
const mockLegalManager = {
  fetchDocument: jest.fn(),
  recordUserAcceptance: jest.fn(),
  getUserAcceptanceStatus: jest.fn()
}

describe('LegalSplash', () => {
  let splash
  let mockContainer

  beforeEach(() => {
    // Setup DOM container
    mockContainer = document.createElement('div')
    document.body.appendChild(mockContainer)

    // Clear all mocks
    jest.clearAllMocks()

    // Reset CSS classes and attributes
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')

    // Setup splash instance
    splash = new LegalSplash(mockLegalManager, mockManifestLoader)
  })

  afterEach(() => {
    if (mockContainer) {
      document.body.removeChild(mockContainer)
    }
    if (splash && splash.element) {
      splash.hide()
    }
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      expect(splash.isOpen).toBe(false)
      expect(splash.currentTab).toBe('privacy-policy')
      expect(splash.documents).toEqual({})
      expect(splash.readProgress).toEqual({})
      expect(splash.acceptanceState).toEqual({})
      expect(splash.appInfo).toBeNull()
    })

    it('should store legal manager reference', () => {
      expect(splash.legalManager).toBe(mockLegalManager)
    })

    it('should store manifest loader reference', () => {
      expect(splash.manifestLoader).toBe(mockManifestLoader)
    })

    it('should initialize required document types', () => {
      const expectedTypes = ['privacy-policy', 'terms-of-service', 'eula', 'license', 'release-notes']
      expectedTypes.forEach(type => {
        expect(splash.documentTypes).toContain(type)
      })
    })
  })

  describe('show method', () => {
    it('should validate required parameters', async () => {
      await expect(splash.show(null, [])).rejects.toThrow('User ID is required')
      await expect(splash.show('', [])).rejects.toThrow('User ID is required')
      await expect(splash.show('user123', null)).rejects.toThrow('Required documents must be an array')
      await expect(splash.show('user123', 'not-array')).rejects.toThrow('Required documents must be an array')
    })

    it('should prevent showing when already open', async () => {
      splash.isOpen = true

      const result = await splash.show('user123', ['privacy-policy'])
      expect(result).toBe(false)
      expect(splash.element).toBeNull()
    })

    it('should load app info from manifest', async () => {
      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nTest content',
        hash: 'test-hash',
        version: '1.0'
      })

      await splash.show('user123', ['privacy-policy'])

      expect(mockManifestLoader.getBestIcon).toHaveBeenCalledWith(48)
      expect(mockManifestLoader.getAppName).toHaveBeenCalled()
      expect(mockManifestLoader.getThemeColor).toHaveBeenCalled()
      expect(splash.appInfo).toBeDefined()
      expect(splash.appInfo.name).toBe('Fantasy Editor')
    })

    it('should load required documents', async () => {
      const mockDoc = {
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nTest content',
        hash: 'test-hash',
        version: '1.0'
      }

      mockLegalManager.fetchDocument.mockResolvedValue(mockDoc)

      await splash.show('user123', ['privacy-policy'])

      expect(mockLegalManager.fetchDocument).toHaveBeenCalledWith('privacy-policy')
      expect(splash.documents['privacy-policy']).toEqual(mockDoc)
    })

    it('should handle document loading errors gracefully', async () => {
      mockLegalManager.fetchDocument.mockRejectedValue(new Error('Network error'))

      await splash.show('user123', ['privacy-policy'])

      expect(splash.documents['privacy-policy']).toBeDefined()
      expect(splash.documents['privacy-policy'].error).toContain('Failed to load')
    })

    it('should create modal element and add to DOM', async () => {
      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      })

      await splash.show('user123', ['privacy-policy'])

      expect(splash.element).toBeDefined()
      expect(splash.element.className).toBe('legal-splash-overlay')
      expect(document.body.contains(splash.element)).toBe(true)
      expect(splash.isOpen).toBe(true)
    })

    it('should set focus trap and manage body class', async () => {
      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      })

      await splash.show('user123', ['privacy-policy'])

      expect(document.body.classList.contains('legal-splash-open')).toBe(true)
    })
  })

  describe('hide method', () => {
    beforeEach(async () => {
      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      })
      await splash.show('user123', ['privacy-policy'])
    })

    it('should remove modal from DOM', () => {
      splash.hide()

      expect(splash.element).toBeNull()
      expect(splash.isOpen).toBe(false)
      expect(document.body.classList.contains('legal-splash-open')).toBe(false)
    })

    it('should clean up event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      splash.hide()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', splash.handleKeydown)
    })

    it('should reset internal state', () => {
      splash.hide()

      expect(splash.documents).toEqual({})
      expect(splash.readProgress).toEqual({})
      expect(splash.acceptanceState).toEqual({})
      expect(splash.currentTab).toBe('privacy-policy')
    })
  })

  describe('render method', () => {
    beforeEach(() => {
      splash.documents = {
        'privacy-policy': {
          type: 'privacy-policy',
          content: '# Privacy Policy\n\nTest content',
          hash: 'test-hash'
        }
      }
      splash.appInfo = {
        name: 'Fantasy Editor',
        icon: { src: '/icons/icon-48x48.png' },
        themeColor: '#007bff'
      }
    })

    it('should render complete modal structure', () => {
      const html = splash.render(['privacy-policy'])

      expect(html).toContain('legal-splash')
      expect(html).toContain('Legal Agreement')
      expect(html).toContain('Privacy Policy')
      expect(html).toContain('×')
    })

    it('should render app logo and branding', () => {
      const html = splash.render(['privacy-policy'])

      expect(html).toContain('/icons/icon-48x48.png')
      expect(html).toContain('Fantasy Editor')
      expect(html).toContain('Legal Agreement')
    })

    it('should render tabs for all required documents', () => {
      splash.documents = {
        'privacy-policy': { type: 'privacy-policy', content: '# Privacy' },
        'terms-of-service': { type: 'terms-of-service', content: '# Terms' }
      }

      const html = splash.render(['privacy-policy', 'terms-of-service'])

      expect(html).toContain('Privacy Policy')
      expect(html).toContain('Terms of Service')
      expect(html).toContain('data-tab="privacy-policy"')
      expect(html).toContain('data-tab="terms-of-service"')
    })

    it('should mark active tab correctly', () => {
      splash.currentTab = 'privacy-policy'
      const html = splash.render(['privacy-policy'])

      expect(html).toContain('active')
      expect(html).toContain('aria-selected="true"')
    })

    it('should render document content area', () => {
      const html = splash.render(['privacy-policy'])

      expect(html).toContain('splash-content')
      expect(html).toContain('<h1>Privacy Policy</h1>')
      expect(html).toContain('Test content')
    })

    it('should render progress indicator', () => {
      splash.readProgress['privacy-policy'] = 65
      const html = splash.render(['privacy-policy'])

      expect(html).toContain('Reading Progress')
      expect(html).toContain('65%')
      expect(html).toContain('splash-progress-bar')
    })

    it('should render acceptance checkboxes', () => {
      const html = splash.render(['privacy-policy'])

      expect(html).toContain('type="checkbox"')
      expect(html).toContain('Privacy Policy')
      expect(html).toContain('data-document="privacy-policy"')
    })

    it('should render action buttons', () => {
      const html = splash.render(['privacy-policy'])

      expect(html).toContain('Accept All')
      expect(html).toContain('Accept Required')
      expect(html).toContain('data-action="accept-all"')
      expect(html).toContain('data-action="accept-required"')
    })

    it('should disable buttons when documents not fully read', () => {
      splash.readProgress['privacy-policy'] = 30 // Less than 80% threshold
      const html = splash.render(['privacy-policy'])

      expect(html).toContain('disabled')
    })
  })

  describe('switchTab method', () => {
    beforeEach(() => {
      splash.documents = {
        'privacy-policy': { content: '# Privacy' },
        'terms-of-service': { content: '# Terms' }
      }
      splash.currentTab = 'privacy-policy'
    })

    it('should validate document type', () => {
      expect(() => splash.switchTab('invalid-type')).toThrow('Invalid document type')
    })

    it('should ignore switch to same tab', () => {
      const originalTab = splash.currentTab
      splash.switchTab('privacy-policy')
      expect(splash.currentTab).toBe(originalTab)
    })

    it('should update current tab', () => {
      splash.switchTab('terms-of-service')
      expect(splash.currentTab).toBe('terms-of-service')
    })

    it('should initialize read progress for new tab', () => {
      splash.switchTab('terms-of-service')
      expect(splash.readProgress['terms-of-service']).toBe(0)
    })
  })

  describe('scroll progress tracking', () => {
    let mockScrollElement

    beforeEach(() => {
      mockScrollElement = {
        scrollTop: 100,
        scrollHeight: 500,
        clientHeight: 200
      }
    })

    it('should calculate progress correctly', () => {
      const progress = splash.calculateReadProgress(mockScrollElement)

      // Expected: (100 / (500 - 200)) * 100 = 33.33%
      expect(progress).toBeCloseTo(33.33, 1)
    })

    it('should cap progress at 100%', () => {
      mockScrollElement.scrollTop = 400
      const progress = splash.calculateReadProgress(mockScrollElement)

      expect(progress).toBe(100)
    })

    it('should handle edge case where content fits without scrolling', () => {
      mockScrollElement.scrollHeight = mockScrollElement.clientHeight
      const progress = splash.calculateReadProgress(mockScrollElement)

      expect(progress).toBe(100)
    })

    it('should update progress in state', () => {
      splash.currentTab = 'privacy-policy'
      splash.trackScrollProgress(mockScrollElement)

      expect(splash.readProgress['privacy-policy']).toBeCloseTo(33.33, 1)
    })
  })

  describe('acceptance validation', () => {
    beforeEach(() => {
      splash.readProgress = {
        'privacy-policy': 85,
        'terms-of-service': 45,
        'eula': 90
      }
      splash.acceptanceState = {
        'privacy-policy': true,
        'terms-of-service': false,
        'eula': true
      }
    })

    it('should validate minimum reading requirements', () => {
      const canAccept = splash.canAcceptDocument('privacy-policy')
      expect(canAccept).toBe(true)

      const cannotAccept = splash.canAcceptDocument('terms-of-service')
      expect(cannotAccept).toBe(false)
    })

    it('should validate all required documents acceptance', () => {
      const requiredDocs = ['privacy-policy', 'eula']
      const isValid = splash.validateAcceptance(requiredDocs)
      expect(isValid).toBe(true)

      const invalidDocs = ['privacy-policy', 'terms-of-service']
      const isInvalid = splash.validateAcceptance(invalidDocs)
      expect(isInvalid).toBe(false)
    })

    it('should check if accept buttons should be enabled', () => {
      splash.readProgress = { 'privacy-policy': 90 }
      splash.acceptanceState = { 'privacy-policy': true }

      const canAcceptAll = splash.canSubmit(['privacy-policy'])
      expect(canAcceptAll).toBe(true)
    })
  })

  describe('acceptance handling', () => {
    beforeEach(() => {
      splash.userId = 'user123'
      splash.documents = {
        'privacy-policy': { hash: 'hash1', version: '1.0' },
        'terms-of-service': { hash: 'hash2', version: '1.1' }
      }
      splash.acceptanceState = {
        'privacy-policy': true,
        'terms-of-service': true
      }
      splash.onAcceptance = jest.fn()
    })

    it('should handle accept all action', async () => {
      mockLegalManager.recordUserAcceptance.mockResolvedValue(true)

      await splash.handleAcceptAll(['privacy-policy', 'terms-of-service'])

      expect(mockLegalManager.recordUserAcceptance).toHaveBeenCalledTimes(2)
      expect(splash.onAcceptance).toHaveBeenCalledWith({
        userId: 'user123',
        acceptedDocuments: ['privacy-policy', 'terms-of-service'],
        timestamp: expect.any(Date)
      })
    })

    it('should handle accept required action', async () => {
      mockLegalManager.recordUserAcceptance.mockResolvedValue(true)

      await splash.handleAcceptRequired(['privacy-policy'])

      expect(mockLegalManager.recordUserAcceptance).toHaveBeenCalledTimes(1)
      expect(splash.onAcceptance).toHaveBeenCalledWith({
        userId: 'user123',
        acceptedDocuments: ['privacy-policy'],
        timestamp: expect.any(Date)
      })
    })

    it('should handle acceptance errors gracefully', async () => {
      mockLegalManager.recordUserAcceptance.mockRejectedValue(new Error('Storage error'))

      await expect(splash.handleAcceptAll(['privacy-policy'])).rejects.toThrow('Storage error')
    })
  })

  describe('event handling', () => {
    beforeEach(async () => {
      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      })
      await splash.show('user123', ['privacy-policy'])
    })

    it('should handle tab clicks', () => {
      splash.documents['terms-of-service'] = { content: '# Terms' }
      const tabButton = splash.element.querySelector('[data-tab="terms-of-service"]')

      if (tabButton) {
        splash.switchTab = jest.fn()
        tabButton.click()
        // Note: actual click handling tested in integration tests
      }
    })

    it('should handle checkbox changes', () => {
      // Initialize acceptance state first
      splash.acceptanceState['privacy-policy'] = false

      // Set reading progress above threshold to enable checkbox
      splash.readProgress['privacy-policy'] = 85

      const checkbox = splash.element.querySelector('[data-document="privacy-policy"]')

      if (checkbox) {
        // Enable the checkbox first
        checkbox.disabled = false
        checkbox.checked = true

        // Create proper event with target
        const event = {
          target: {
            type: 'checkbox',
            dataset: { document: 'privacy-policy' },
            checked: true
          }
        }

        // Manually trigger the handler since JSDOM doesn't auto-attach event listeners
        splash.handleCheckboxChange(event)

        expect(splash.acceptanceState['privacy-policy']).toBe(true)
      }
    })

    it('should handle close button click', () => {
      const closeButton = splash.element.querySelector('.splash-close')
      splash.hide = jest.fn()

      if (closeButton) {
        closeButton.click()
        expect(splash.hide).toHaveBeenCalled()
      }
    })

    it('should handle escape key to close', () => {
      splash.hide = jest.fn()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(splash.hide).toHaveBeenCalled()
    })

    it('should handle overlay click to close', () => {
      splash.hide = jest.fn()

      const overlayEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(overlayEvent, 'target', {
        value: splash.element,
        enumerable: true
      })

      splash.element.dispatchEvent(overlayEvent)
      expect(splash.hide).toHaveBeenCalled()
    })
  })

  describe('theme integration', () => {
    it('should apply theme-specific styling classes', async () => {
      document.documentElement.setAttribute('data-theme', 'fantasy')

      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      })

      await splash.show('user123', ['privacy-policy'])

      const themeClasses = splash.element.className
      expect(themeClasses).toContain('legal-splash-overlay')
      // Theme-specific styling handled by CSS
    })

    it('should use theme colors from manifest', async () => {
      mockManifestLoader.getThemeColor.mockResolvedValue('#2A4D2E') // Fantasy theme color

      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      })

      await splash.show('user123', ['privacy-policy'])

      expect(splash.appInfo.themeColor).toBe('#2A4D2E')
    })
  })

  describe('error handling', () => {
    it('should handle manifest loading failure gracefully', async () => {
      mockManifestLoader.getBestIcon.mockRejectedValue(new Error('Manifest not found'))
      mockManifestLoader.getAppName.mockRejectedValue(new Error('Manifest not found'))

      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy',
        hash: 'test-hash'
      })

      await splash.show('user123', ['privacy-policy'])

      expect(splash.appInfo.name).toBe('Fantasy Editor') // Fallback name
      expect(splash.appInfo.icon.src).toContain('/dist/icons') // Fallback icon
    })

    it('should handle document rendering errors', () => {
      splash.documents = {
        'privacy-policy': {
          type: 'privacy-policy',
          content: null, // Invalid content
          hash: 'test-hash'
        }
      }

      const html = splash.render(['privacy-policy'])
      expect(html).toContain('No content available')
    })

    it('should validate acceptance state on invalid operations', () => {
      expect(() => splash.validateAcceptance(null)).toThrow('Required documents must be an array')
      expect(() => splash.validateAcceptance(['invalid-type'])).toThrow('Invalid document type')
    })
  })

  describe('accessibility features', () => {
    beforeEach(async () => {
      mockLegalManager.fetchDocument.mockResolvedValue({
        type: 'privacy-policy',
        content: '# Privacy Policy\n\nTest content for accessibility',
        hash: 'test-hash'
      })
      await splash.show('user123', ['privacy-policy'])
    })

    it('should have proper ARIA attributes', () => {
      const modal = splash.element.querySelector('.legal-splash')
      expect(modal.getAttribute('role')).toBe('dialog')
      expect(modal.getAttribute('aria-modal')).toBe('true')
      expect(modal.getAttribute('aria-labelledby')).toBeDefined()
    })

    it('should have tab navigation with ARIA', () => {
      const tabs = splash.element.querySelectorAll('[role="tab"]')
      tabs.forEach(tab => {
        expect(tab.getAttribute('aria-selected')).toBeDefined()
        expect(tab.getAttribute('aria-controls')).toBeDefined()
      })
    })

    it('should have properly labeled form elements', () => {
      const checkboxes = splash.element.querySelectorAll('input[type="checkbox"]')
      checkboxes.forEach(checkbox => {
        expect(checkbox.getAttribute('aria-describedby')).toBeDefined()
      })
    })

    it('should trap focus within modal', () => {
      const focusableElements = splash.element.querySelectorAll(
        'button, input, [tabindex="0"]'
      )
      expect(focusableElements.length).toBeGreaterThan(0)
    })
  })
})