import { CommandBar } from '../command-bar'
import { CommandRegistry } from '../../../core/commands/command-registry'

// Mock DOM methods
Object.defineProperty(global, 'HTMLElement', {
  value: class {
    addEventListener = jest.fn()
    removeEventListener = jest.fn()
    appendChild = jest.fn()
    remove = jest.fn()
    querySelector = jest.fn()
    querySelectorAll = jest.fn(() => [])
    scrollIntoView = jest.fn()
    classList = {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    }
    style = {}
    innerHTML = ''
    textContent = ''
  }
})

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => new HTMLElement()),
    body: { appendChild: jest.fn() },
    head: { appendChild: jest.fn() },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }
})

describe('CommandBar', () => {
  let commandBar
  let registry
  let mockCommand

  beforeEach(() => {
    jest.clearAllMocks()
    
    registry = new CommandRegistry()
    mockCommand = {
      name: 'test',
      description: 'Test command',
      category: 'test',
      icon: '🧪',
      handler: jest.fn().mockResolvedValue({ success: true })
    }
    registry.registerCommand(mockCommand)
    
    commandBar = new CommandBar(registry)
  })

  afterEach(() => {
    if (commandBar) {
      commandBar.destroy()
    }
  })

  describe('initialization', () => {
    it('should initialize with registry', () => {
      expect(commandBar.commandRegistry).toBe(registry)
      expect(commandBar.isVisible).toBe(false)
      expect(commandBar.selectedIndex).toBe(0)
    })

    it('should create DOM elements', () => {
      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(document.body.appendChild).toHaveBeenCalled()
    })

    it('should attach event listeners', () => {
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('visibility', () => {
    it('should show command bar', () => {
      commandBar.show()
      
      expect(commandBar.isVisible).toBe(true)
    })

    it('should hide command bar', () => {
      commandBar.show()
      commandBar.hide()
      
      expect(commandBar.isVisible).toBe(false)
    })

    it('should toggle visibility', () => {
      expect(commandBar.isVisible).toBe(false)
      
      commandBar.toggle()
      expect(commandBar.isVisible).toBe(true)
      
      commandBar.toggle()
      expect(commandBar.isVisible).toBe(false)
    })

    it('should dispatch show/hide events', () => {
      commandBar.show()
      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'commandbar:show'
        })
      )
      
      commandBar.hide()
      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'commandbar:hide'
        })
      )
    })
  })

  describe('search and filtering', () => {
    beforeEach(() => {
      registry.registerCommand({
        name: 'save',
        description: 'Save document',
        category: 'document',
        handler: jest.fn()
      })
    })

    it('should update results when query changes', () => {
      commandBar.currentQuery = 'save'
      commandBar.updateResults()
      
      expect(commandBar.filteredResults.length).toBeGreaterThan(0)
    })

    it('should show all commands when query is empty', () => {
      commandBar.currentQuery = ''
      commandBar.updateResults()
      
      expect(commandBar.filteredResults.length).toBe(2) // test + save
    })

    it('should filter commands based on query', () => {
      commandBar.currentQuery = 'test'
      commandBar.updateResults()
      
      expect(commandBar.filteredResults.some(c => c.name === 'test')).toBe(true)
    })

    it('should highlight matching text', () => {
      const highlighted = commandBar.highlightMatch('test command', 'test')
      expect(highlighted).toContain('<span class="highlight">test</span>')
    })
  })

  describe('keyboard navigation', () => {
    beforeEach(() => {
      commandBar.filteredResults = [
        { name: 'test1', description: 'Test 1' },
        { name: 'test2', description: 'Test 2' },
        { name: 'test3', description: 'Test 3' }
      ]
    })

    it('should select next result', () => {
      commandBar.selectedIndex = 0
      commandBar.selectNext()
      
      expect(commandBar.selectedIndex).toBe(1)
    })

    it('should wrap to first when selecting next at end', () => {
      commandBar.selectedIndex = 2
      commandBar.selectNext()
      
      expect(commandBar.selectedIndex).toBe(0)
    })

    it('should select previous result', () => {
      commandBar.selectedIndex = 1
      commandBar.selectPrevious()
      
      expect(commandBar.selectedIndex).toBe(0)
    })

    it('should wrap to last when selecting previous at start', () => {
      commandBar.selectedIndex = 0
      commandBar.selectPrevious()
      
      expect(commandBar.selectedIndex).toBe(2)
    })

    it('should select specific index', () => {
      commandBar.selectIndex(1)
      
      expect(commandBar.selectedIndex).toBe(1)
    })

    it('should not select invalid index', () => {
      const originalIndex = commandBar.selectedIndex
      commandBar.selectIndex(-1)
      commandBar.selectIndex(10)
      
      expect(commandBar.selectedIndex).toBe(originalIndex)
    })
  })

  describe('command execution', () => {
    beforeEach(() => {
      commandBar.filteredResults = [mockCommand]
      commandBar.selectedIndex = 0
    })

    it('should execute selected command', () => {
      commandBar.input = { value: 'test' }
      commandBar.executeSelected()
      
      expect(registry.executeCommand).toHaveBeenCalledWith('test')
      expect(commandBar.isVisible).toBe(false)
    })

    it('should dispatch execution event', () => {
      commandBar.input = { value: 'test' }
      commandBar.executeSelected()
      
      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'commandbar:execute'
        })
      )
    })

    it('should handle empty selection', () => {
      commandBar.filteredResults = []
      commandBar.executeSelected()
      
      // Should not crash or throw
      expect(commandBar.isVisible).toBe(true)
    })
  })

  describe('command registry integration', () => {
    it('should update registry reference', () => {
      const newRegistry = new CommandRegistry()
      commandBar.setCommandRegistry(newRegistry)
      
      expect(commandBar.commandRegistry).toBe(newRegistry)
    })

    it('should update results when registry changes', () => {
      commandBar.isVisible = true
      jest.spyOn(commandBar, 'updateResults')
      
      const newRegistry = new CommandRegistry()
      commandBar.setCommandRegistry(newRegistry)
      
      expect(commandBar.updateResults).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should destroy command bar properly', () => {
      commandBar.destroy()
      
      expect(commandBar.element.remove).toHaveBeenCalled()
      expect(commandBar.overlay.remove).toHaveBeenCalled()
    })
  })

  describe('keyboard shortcuts', () => {
    let keydownHandler

    beforeEach(() => {
      // Get the keydown handler that was registered
      keydownHandler = document.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1]
    })

    it('should handle Ctrl+Space to toggle', () => {
      const event = {
        ctrlKey: true,
        code: 'Space',
        preventDefault: jest.fn()
      }
      
      keydownHandler(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(commandBar.isVisible).toBe(true)
    })

    it('should handle Escape to close', () => {
      commandBar.isVisible = true
      
      const event = {
        key: 'Escape',
        preventDefault: jest.fn()
      }
      
      keydownHandler(event)
      
      expect(event.preventDefault).toHaveBeenCalled()
      expect(commandBar.isVisible).toBe(false)
    })

    it('should ignore other key combinations', () => {
      const event = {
        ctrlKey: true,
        key: 'a',
        preventDefault: jest.fn()
      }
      
      keydownHandler(event)
      
      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('results rendering', () => {
    it('should render empty state when no results', () => {
      commandBar.filteredResults = []
      commandBar.currentQuery = 'nonexistent'
      commandBar.renderResults()
      
      expect(commandBar.results.innerHTML).toContain('No commands found')
    })

    it('should render command results', () => {
      commandBar.filteredResults = [mockCommand]
      commandBar.renderResults()
      
      expect(commandBar.results.innerHTML).toContain('test')
      expect(commandBar.results.innerHTML).toContain('Test command')
    })

    it('should mark selected result', () => {
      commandBar.filteredResults = [mockCommand, { name: 'other', description: 'Other' }]
      commandBar.selectedIndex = 1
      commandBar.renderResults()
      
      expect(commandBar.results.innerHTML).toContain('selected')
    })
  })
})