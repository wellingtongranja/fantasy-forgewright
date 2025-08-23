import { CommandRegistry } from '../command-registry'

describe('CommandRegistry', () => {
  let registry
  let mockCommand
  let mockHandler

  beforeEach(() => {
    registry = new CommandRegistry()
    mockHandler = jest.fn().mockResolvedValue({ success: true })

    mockCommand = {
      name: 'test',
      description: 'Test command',
      category: 'test',
      icon: '🧪',
      aliases: ['t'],
      handler: mockHandler
    }
  })

  describe('command registration', () => {
    it('should register a command successfully', () => {
      registry.registerCommand(mockCommand)

      const command = registry.getCommand('test')
      expect(command).toBeTruthy()
      expect(command.name).toBe('test')
      expect(command.description).toBe('Test command')
    })

    it('should register command aliases', () => {
      registry.registerCommand(mockCommand)

      const commandByAlias = registry.getCommand('t')
      expect(commandByAlias).toBeTruthy()
      expect(commandByAlias.name).toBe('test')
    })

    it('should throw error for invalid command', () => {
      expect(() => {
        registry.registerCommand({ description: 'No name' })
      }).toThrow('Command must have name and handler')
    })

    it('should unregister commands', () => {
      registry.registerCommand(mockCommand)
      expect(registry.hasCommand('test')).toBe(true)

      registry.unregisterCommand('test')
      expect(registry.hasCommand('test')).toBe(false)
    })
  })

  describe('command execution', () => {
    beforeEach(() => {
      registry.registerCommand(mockCommand)
    })

    it('should execute command successfully', async () => {
      const result = await registry.executeCommand('test')

      expect(mockHandler).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('should execute command with arguments', async () => {
      await registry.executeCommand('test arg1 arg2')

      expect(mockHandler).toHaveBeenCalledWith(['arg1', 'arg2'], expect.any(Object))
    })

    it('should execute command by alias', async () => {
      await registry.executeCommand('t')

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should handle colon prefix', async () => {
      await registry.executeCommand(':test')

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should throw error for unknown command', async () => {
      await expect(registry.executeCommand('unknown')).rejects.toThrow(
        'Command "unknown" not found'
      )
    })

    it('should add commands to history', async () => {
      await registry.executeCommand('test')

      const history = registry.getHistory()
      expect(history).toContain('test')
    })
  })

  describe('command search', () => {
    beforeEach(() => {
      registry.registerCommand(mockCommand)
      registry.registerCommand({
        name: 'save',
        description: 'Save document',
        category: 'document',
        handler: jest.fn()
      })
      registry.registerCommand({
        name: 'search',
        description: 'Search documents',
        category: 'search',
        handler: jest.fn()
      })
    })

    it('should return all commands when no query', () => {
      const results = registry.searchCommands('')
      expect(results.length).toBe(3)
    })

    it('should find exact matches with highest score', () => {
      const results = registry.searchCommands('test')
      expect(results[0].name).toBe('test')
    })

    it('should find partial matches', () => {
      const results = registry.searchCommands('sav')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.name === 'save')).toBe(true)
    })

    it('should find commands by alias', () => {
      const results = registry.searchCommands('t')
      expect(results.some((r) => r.name === 'test')).toBe(true)
    })

    it('should find commands by description', () => {
      const results = registry.searchCommands('document')
      expect(results.some((r) => r.name === 'save')).toBe(true)
    })
  })

  describe('command parsing', () => {
    it('should parse simple command', () => {
      const parsed = registry.parseCommand('test')

      expect(parsed.name).toBe('test')
      expect(parsed.args).toEqual([])
    })

    it('should parse command with arguments', () => {
      const parsed = registry.parseCommand('test arg1 arg2')

      expect(parsed.name).toBe('test')
      expect(parsed.args).toEqual(['arg1', 'arg2'])
    })

    it('should handle colon prefix', () => {
      const parsed = registry.parseCommand(':test')

      expect(parsed.name).toBe('test')
      expect(parsed.cleanInput).toBe('test')
    })

    it('should handle extra whitespace', () => {
      const parsed = registry.parseCommand('  :test  arg1  arg2  ')

      expect(parsed.name).toBe('test')
      expect(parsed.args).toEqual(['arg1', 'arg2'])
    })
  })

  describe('parameter validation', () => {
    let commandWithParams

    beforeEach(() => {
      commandWithParams = {
        name: 'paramtest',
        description: 'Test command with parameters',
        category: 'test',
        parameters: [
          { name: 'required', required: true, type: 'string' },
          { name: 'optional', required: false, type: 'number' }
        ],
        handler: jest.fn()
      }

      registry.registerCommand(commandWithParams)
    })

    it('should validate required parameters', async () => {
      await expect(registry.executeCommand('paramtest')).rejects.toThrow(
        'Missing required parameters: required'
      )
    })

    it('should accept valid parameters', async () => {
      commandWithParams.handler = jest.fn().mockResolvedValue({ success: true })
      registry.registerCommand(commandWithParams)

      const result = await registry.executeCommand('paramtest value1 123')
      expect(result).toBeTruthy()
      expect(commandWithParams.handler).toHaveBeenCalled()
    })

    it('should validate parameter types', async () => {
      commandWithParams.parameters = [{ name: 'num', required: true, type: 'number' }]
      registry.registerCommand(commandWithParams)

      await expect(registry.executeCommand('paramtest invalid')).rejects.toThrow(
        'Parameter "num" must be of type number'
      )
    })
  })

  describe('categories and organization', () => {
    beforeEach(() => {
      registry.registerCommand({ ...mockCommand, category: 'document' })
      registry.registerCommand({
        name: 'search',
        description: 'Search',
        category: 'search',
        handler: jest.fn()
      })
    })

    it('should organize commands by category', () => {
      const documentCommands = registry.getCommandsByCategory('document')
      expect(documentCommands.some((c) => c.name === 'test')).toBe(true)

      const searchCommands = registry.getCommandsByCategory('search')
      expect(searchCommands.some((c) => c.name === 'search')).toBe(true)
    })

    it('should list all categories', () => {
      const categories = registry.getCategories()
      expect(categories).toContain('document')
      expect(categories).toContain('search')
    })

    it('should provide registry statistics', () => {
      const stats = registry.getStats()
      expect(stats.totalCommands).toBe(2)
      expect(stats.totalCategories).toBe(2)
    })
  })

  describe('fuzzy matching', () => {
    it('should match fuzzy patterns', () => {
      expect(registry.fuzzyMatch('save', 'sv')).toBe(true)
      expect(registry.fuzzyMatch('search', 'srch')).toBe(true)
      expect(registry.fuzzyMatch('document', 'dcmnt')).toBe(true)
      expect(registry.fuzzyMatch('test', 'xyz')).toBe(false)
    })
  })

  describe('conditional commands', () => {
    it('should respect command conditions', () => {
      const conditionalCommand = {
        name: 'conditional',
        description: 'Conditional command',
        category: 'test',
        condition: () => false,
        handler: jest.fn()
      }

      registry.registerCommand(conditionalCommand)

      const allCommands = registry.getAllCommands()
      expect(allCommands.some((c) => c.name === 'conditional')).toBe(false)
    })

    it('should include commands when condition is true', () => {
      const conditionalCommand = {
        name: 'conditional',
        description: 'Conditional command',
        category: 'test',
        condition: () => true,
        handler: jest.fn()
      }

      registry.registerCommand(conditionalCommand)

      const allCommands = registry.getAllCommands()
      expect(allCommands.some((c) => c.name === 'conditional')).toBe(true)
    })
  })
})
