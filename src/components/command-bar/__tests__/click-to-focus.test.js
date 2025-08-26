import { CommandBar } from '../command-bar'
import { CommandRegistry } from '../../../core/commands/command-registry'

// Mock DOM methods (reusing setup from header-integration tests)
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
    Object.defineProperty(element, 'innerHTML', {
      set: function(html) {
        this._innerHTML = html
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

describe('Click-to-Focus Functionality', () => {
  let commandBar
  let registry

  beforeEach(() => {
    jest.clearAllMocks()
    
    registry = new CommandRegistry()
    registry.registerCommand({
      name: 'test command',
      description: 'Test command description',
      handler: jest.fn(),
      aliases: [':test']
    })
    
    commandBar = new CommandBar(registry)
  })

  afterEach(() => {
    if (commandBar) {
      commandBar.destroy()
    }
    document.body.innerHTML = ''
  })

  describe('header integration click-to-focus', () => {
    it('should integrate into header on initialization', () => {
      expect(commandBar.headerIntegration).toBeTruthy()
    })

    it('should create clickable header wrapper', () => {
      const headerIntegration = commandBar.headerIntegration
      expect(headerIntegration.headerWrapper).toBeTruthy()
      expect(headerIntegration.headerWrapper.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('should focus command input when header wrapper is clicked', () => {
      const headerIntegration = commandBar.headerIntegration
      const clickHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1]

      const mockEvent = { stopPropagation: jest.fn() }
      jest.spyOn(commandBar, 'show')
      commandBar.input.focus = jest.fn()

      clickHandler(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(commandBar.show).toHaveBeenCalled()
      expect(commandBar.input.focus).toHaveBeenCalled()
    })

    it('should stop event propagation to prevent header conflicts', () => {
      const headerIntegration = commandBar.headerIntegration
      const clickHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1]

      const mockEvent = { stopPropagation: jest.fn() }

      clickHandler(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('keyboard activation for accessibility', () => {
    it('should handle Enter key activation', () => {
      const headerIntegration = commandBar.headerIntegration
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

    it('should handle Space key activation', () => {
      const headerIntegration = commandBar.headerIntegration
      const keydownHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1]

      const mockEvent = {
        key: ' ',
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      }
      jest.spyOn(commandBar, 'show')

      keydownHandler(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(commandBar.show).toHaveBeenCalled()
    })

    it('should ignore other key presses', () => {
      const headerIntegration = commandBar.headerIntegration
      const keydownHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1]

      const mockEvent = {
        key: 'a',
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      }
      jest.spyOn(commandBar, 'show')

      keydownHandler(mockEvent)

      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
      expect(commandBar.show).not.toHaveBeenCalled()
    })
  })

  describe('accessibility attributes', () => {
    it('should have proper ARIA label', () => {
      const headerIntegration = commandBar.headerIntegration
      expect(headerIntegration.headerWrapper.setAttribute).toHaveBeenCalledWith('aria-label', 'Command palette input')
    })

    it('should have button role for screen readers', () => {
      const headerIntegration = commandBar.headerIntegration
      expect(headerIntegration.headerWrapper.setAttribute).toHaveBeenCalledWith('role', 'button')
    })

    it('should be keyboard focusable with tabindex', () => {
      const headerIntegration = commandBar.headerIntegration
      expect(headerIntegration.headerWrapper.setAttribute).toHaveBeenCalledWith('tabindex', '0')
    })
  })

  describe('visual feedback', () => {
    it('should add integrated styling classes', () => {
      expect(commandBar.element.classList.add).toHaveBeenCalledWith('command-bar-integrated')
    })

    it('should remove floating styling classes', () => {
      expect(commandBar.element.classList.remove).toHaveBeenCalledWith('command-bar-floating')
    })
  })

  describe('focus behavior', () => {
    it('should show command bar when focused via click', () => {
      const headerIntegration = commandBar.headerIntegration
      const clickHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1]

      jest.spyOn(commandBar, 'show')
      commandBar.isVisible = false

      clickHandler({ stopPropagation: jest.fn() })

      expect(commandBar.show).toHaveBeenCalled()
    })

    it('should focus input after showing command bar', () => {
      const headerIntegration = commandBar.headerIntegration
      const clickHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1]

      commandBar.input.focus = jest.fn()

      clickHandler({ stopPropagation: jest.fn() })

      expect(commandBar.input.focus).toHaveBeenCalled()
    })
  })

  describe('fallback behavior', () => {
    it('should handle missing header elements gracefully', () => {
      // This is tested by ensuring the command bar still works even if header integration fails
      expect(commandBar.element).toBeTruthy()
      expect(commandBar.input).toBeTruthy()
      expect(commandBar.results).toBeTruthy()
    })

    it('should maintain original functionality without header integration', () => {
      // Test that command bar still works with Ctrl+Space
      const globalKeyHandler = document.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1]

      const mockEvent = {
        ctrlKey: true,
        code: 'Space',
        preventDefault: jest.fn()
      }
      jest.spyOn(commandBar, 'toggle')

      globalKeyHandler(mockEvent)

      expect(commandBar.toggle).toHaveBeenCalled()
    })
  })

  describe('integration with command execution', () => {
    it('should execute commands normally after focus', () => {
      // Simulate click-to-focus
      const headerIntegration = commandBar.headerIntegration
      const clickHandler = headerIntegration.headerWrapper.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1]

      clickHandler({ stopPropagation: jest.fn() })

      // Simulate typing and selecting a command
      commandBar.currentQuery = 'test'
      commandBar.updateResults()
      
      expect(commandBar.filteredResults.length).toBeGreaterThan(0)
      expect(commandBar.filteredResults[0].name).toBe('test command')
    })
  })
})