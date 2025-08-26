import { HeaderIntegration } from '../header-integration'
import { CommandBar } from '../command-bar'
import { CommandRegistry } from '../../../core/commands/command-registry'

// Mock DOM methods
class MockHTMLElement {
  constructor() {
    this.addEventListener = jest.fn()
    this.removeEventListener = jest.fn()
    this.appendChild = jest.fn()
    this.remove = jest.fn()
    this.querySelector = jest.fn()
    this.querySelectorAll = jest.fn(() => [])
    this.scrollIntoView = jest.fn()
    this.setAttribute = jest.fn()
    this.getAttribute = jest.fn()
    this.classList = {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn(() => false)
    }
    this.style = {}
    this.innerHTML = ''
    this.textContent = ''
    this.value = ''
    this.parentNode = null
    this.children = []
    this.focus = jest.fn()
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, width: 100, height: 40 }
  }
}

Object.defineProperty(global, 'HTMLElement', {
  value: MockHTMLElement
})

// Mock document with better querySelector support
const mockDocument = {
  createElement: jest.fn(() => {
    const element = new MockHTMLElement()
    // Mock the innerHTML setter to create child elements
    Object.defineProperty(element, 'innerHTML', {
      set: function(html) {
        this._innerHTML = html
        // Mock querySelector to return input element when needed
        if (html.includes('command-bar-input')) {
          const mockInput = new MockHTMLElement()
          mockInput.classList.add = jest.fn()
          mockInput.value = ''
          this.querySelector = jest.fn((selector) => {
            if (selector === '.command-bar-input') return mockInput
            if (selector === '.command-bar-results') return new MockHTMLElement()
            return new MockHTMLElement()
          })
        }
      },
      get: function() {
        return this._innerHTML || ''
      }
    })
    return element
  }),
  body: { appendChild: jest.fn() },
  head: { appendChild: jest.fn() },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  querySelector: jest.fn(() => new MockHTMLElement()),
  querySelectorAll: jest.fn(() => []),
  documentElement: {
    setAttribute: jest.fn(),
    getAttribute: jest.fn()
  }
}

Object.defineProperty(global, 'document', {
  value: mockDocument
})

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerWidth: 1024,
    innerHeight: 768
  }
})

describe('HeaderIntegration', () => {
  let headerIntegration
  let commandBar
  let registry
  let mockHeader
  let mockTitleElement

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock DOM elements
    mockHeader = new HTMLElement()
    mockTitleElement = new HTMLElement()
    mockTitleElement.textContent = 'Fantasy'

    // Set up document.querySelector mocks
    document.querySelector.mockImplementation((selector) => {
      if (selector === '.app-header') return mockHeader
      if (selector === '.app-title') return mockTitleElement
      return new HTMLElement()
    })

    registry = new CommandRegistry()
    commandBar = new CommandBar(registry)
    headerIntegration = new HeaderIntegration(commandBar)
  })

  afterEach(() => {
    if (headerIntegration) {
      headerIntegration.destroy()
    }
    document.body.innerHTML = ''
  })

  describe('initialization', () => {
    it('should initialize with command bar reference', () => {
      expect(headerIntegration.commandBar).toBe(commandBar)
      expect(headerIntegration.isIntegrated).toBe(false)
    })

    it('should find header and title elements', () => {
      expect(document.querySelector).toHaveBeenCalledWith('.app-header')
      expect(document.querySelector).toHaveBeenCalledWith('.app-title')
    })

    it('should throw error if header elements not found', () => {
      document.querySelector.mockReturnValue(null)
      
      expect(() => {
        new HeaderIntegration(commandBar)
      }).toThrow('Required header elements not found')
    })
  })

  describe('header integration', () => {
    it('should integrate command bar into header', () => {
      headerIntegration.integrate()

      expect(headerIntegration.isIntegrated).toBe(true)
      expect(mockHeader.appendChild).toHaveBeenCalled()
    })

    it('should create header command input wrapper', () => {
      headerIntegration.integrate()

      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(headerIntegration.headerWrapper).toBeTruthy()
    })

    it('should position command bar in center of header', () => {
      headerIntegration.integrate()

      expect(headerIntegration.headerWrapper.classList.add).toHaveBeenCalledWith('command-bar-header-wrapper')
    })

    it('should move original command bar element to header', () => {
      const originalParent = commandBar.element.parentNode
      headerIntegration.integrate()

      expect(headerIntegration.headerWrapper.appendChild).toHaveBeenCalledWith(commandBar.element)
    })

    it('should update command bar positioning classes', () => {
      headerIntegration.integrate()

      expect(commandBar.element.classList.add).toHaveBeenCalledWith('command-bar-integrated')
      expect(commandBar.element.classList.remove).toHaveBeenCalledWith('command-bar-floating')
    })
  })

  describe('click-to-focus functionality', () => {
    beforeEach(() => {
      headerIntegration.integrate()
    })

    it('should make header wrapper clickable', () => {
      expect(headerIntegration.headerWrapper.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('should focus command input when wrapper is clicked', () => {
      const clickHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1]

      const mockEvent = { stopPropagation: jest.fn() }
      commandBar.input.focus = jest.fn()

      clickHandler(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(commandBar.input.focus).toHaveBeenCalled()
    })

    it('should show command bar when wrapper is clicked', () => {
      const clickHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1]

      jest.spyOn(commandBar, 'show')
      const mockEvent = { stopPropagation: jest.fn() }

      clickHandler(mockEvent)

      expect(commandBar.show).toHaveBeenCalled()
    })

    it('should not propagate click events to prevent header conflicts', () => {
      const clickHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1]

      const mockEvent = { stopPropagation: jest.fn() }

      clickHandler(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('visual integration', () => {
    beforeEach(() => {
      headerIntegration.integrate()
    })

    it('should add discrete styling to command bar', () => {
      expect(commandBar.element.classList.add).toHaveBeenCalledWith('command-bar-integrated')
    })

    it('should add header-specific CSS classes', () => {
      expect(headerIntegration.headerWrapper.classList.add).toHaveBeenCalledWith('command-bar-header-wrapper')
    })

    it('should maintain theme compatibility', () => {
      document.documentElement.setAttribute('data-theme', 'dark')
      headerIntegration.updateTheme()

      expect(headerIntegration.headerWrapper.classList.contains('theme-dark')).toBe(false)
    })
  })

  describe('responsive behavior', () => {
    beforeEach(() => {
      headerIntegration.integrate()
    })

    it('should handle window resize events', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should adjust positioning on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 500 })
      
      const resizeHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )[1]

      resizeHandler()

      expect(headerIntegration.headerWrapper.classList.add).toHaveBeenCalledWith('mobile')
    })

    it('should remove mobile class on desktop screens', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1024 })
      
      const resizeHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )[1]

      resizeHandler()

      expect(headerIntegration.headerWrapper.classList.remove).toHaveBeenCalledWith('mobile')
    })
  })

  describe('cleanup and destruction', () => {
    beforeEach(() => {
      headerIntegration.integrate()
    })

    it('should remove header integration when destroyed', () => {
      // Mock parentNode to simulate DOM structure
      headerIntegration.headerWrapper.parentNode = mockHeader
      
      headerIntegration.destroy()

      expect(headerIntegration.headerWrapper.remove).toHaveBeenCalled()
      expect(headerIntegration.isIntegrated).toBe(false)
    })

    it('should restore original command bar positioning', () => {
      headerIntegration.destroy()

      expect(commandBar.element.classList.remove).toHaveBeenCalledWith('command-bar-integrated')
      expect(commandBar.element.classList.add).toHaveBeenCalledWith('command-bar-floating')
    })

    it('should remove event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      headerIntegration.destroy()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should move command bar back to body', () => {
      headerIntegration.destroy()

      expect(document.body.appendChild).toHaveBeenCalledWith(commandBar.element)
    })
  })

  describe('accessibility', () => {
    beforeEach(() => {
      headerIntegration.integrate()
    })

    it('should add proper ARIA labels to header wrapper', () => {
      expect(headerIntegration.headerWrapper.setAttribute).toHaveBeenCalledWith('aria-label', 'Command palette input')
    })

    it('should add role attribute for screen readers', () => {
      expect(headerIntegration.headerWrapper.setAttribute).toHaveBeenCalledWith('role', 'button')
    })

    it('should add tabindex for keyboard navigation', () => {
      expect(headerIntegration.headerWrapper.setAttribute).toHaveBeenCalledWith('tabindex', '0')
    })

    it('should handle keyboard activation', () => {
      const keydownHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1]

      const mockEvent = {
        key: 'Enter',
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      }
      jest.spyOn(commandBar, 'show')

      keydownHandler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(commandBar.show).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle missing header elements gracefully', () => {
      document.querySelector.mockReturnValue(null)

      expect(() => {
        new HeaderIntegration(commandBar)
      }).toThrow('Required header elements not found')
    })

    it('should handle integration errors gracefully', () => {
      mockHeader.appendChild.mockImplementation(() => {
        throw new Error('DOM error')
      })

      expect(() => {
        headerIntegration.integrate()
      }).toThrow('Failed to integrate command bar into header')
    })
  })
})