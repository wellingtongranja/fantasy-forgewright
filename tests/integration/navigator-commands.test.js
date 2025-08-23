/**
 * Navigator Command Integration Tests
 * Tests Navigator command integration with the command system
 */

import { CommandRegistry } from '../../src/core/commands/command-registry.js'

// Mock Navigator for command testing
const mockNavigator = {
  openDocuments: jest.fn(),
  openOutline: jest.fn(),
  openSearch: jest.fn(),
  refresh: jest.fn()
}

// Mock app with Navigator
const mockApp = {
  navigator: mockNavigator,
  showNotification: jest.fn()
}

describe('Navigator Command Integration Tests', () => {
  let commandRegistry

  beforeEach(() => {
    jest.clearAllMocks()
    commandRegistry = new CommandRegistry()

    // Register Navigator commands manually for testing
    commandRegistry.registerCommand({
      name: 'documents',
      description: 'Open documents navigator tab',
      category: 'navigator',
      aliases: [':d'],
      parameters: [
        { name: 'filter', required: false, type: 'string', description: 'Filter documents by text' }
      ],
      handler: async (args) => {
        const filter = args[0]
        mockApp.navigator.openDocuments(filter)
        return { 
          success: true, 
          message: filter ? `Opened documents filtered by "${filter}"` : 'Opened documents'
        }
      }
    })

    commandRegistry.registerCommand({
      name: 'outline',
      description: 'Open document outline navigator tab',
      category: 'navigator', 
      aliases: [':l'],
      handler: async () => {
        mockApp.navigator.openOutline()
        return { success: true, message: 'Opened document outline' }
      }
    })

    commandRegistry.registerCommand({
      name: 'search',
      description: 'Open search navigator tab',
      category: 'navigator',
      aliases: [':f'],
      parameters: [
        { name: 'query', required: false, type: 'string', description: 'Search query' }
      ],
      handler: async (args) => {
        const query = args[0]
        mockApp.navigator.openSearch(query)
        return { 
          success: true, 
          message: query ? `Searching for "${query}"` : 'Opened search'
        }
      }
    })
  })

  describe('documents command (:d)', () => {
    it('should execute documents command without filter', async () => {
      const result = await commandRegistry.executeCommand(':d')

      expect(mockNavigator.openDocuments).toHaveBeenCalledWith(undefined)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Opened documents')
    })

    it('should execute documents command with filter', async () => {
      const result = await commandRegistry.executeCommand(':d fantasy')

      expect(mockNavigator.openDocuments).toHaveBeenCalledWith('fantasy')
      expect(result.success).toBe(true)
      expect(result.message).toBe('Opened documents filtered by "fantasy"')
    })

    it('should execute documents command with multi-word filter', async () => {
      const result = await commandRegistry.executeCommand(':d epic adventure')

      expect(mockNavigator.openDocuments).toHaveBeenCalledWith('epic')
      expect(result.success).toBe(true)
    })

    it('should find command by full name', async () => {
      const result = await commandRegistry.executeCommand('documents')

      expect(mockNavigator.openDocuments).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('should find command in search results', () => {
      const results = commandRegistry.searchCommands('doc')

      expect(results.some(cmd => cmd.name === 'documents')).toBe(true)
    })

    it('should find command by alias in search', () => {
      const results = commandRegistry.searchCommands(':d')

      expect(results.some(cmd => cmd.name === 'documents')).toBe(true)
    })
  })

  describe('outline command (:l)', () => {
    it('should execute outline command', async () => {
      const result = await commandRegistry.executeCommand(':l')

      expect(mockNavigator.openOutline).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.message).toBe('Opened document outline')
    })

    it('should execute by full command name', async () => {
      const result = await commandRegistry.executeCommand('outline')

      expect(mockNavigator.openOutline).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('should be found in command search', () => {
      const results = commandRegistry.searchCommands('outline')

      expect(results.some(cmd => cmd.name === 'outline')).toBe(true)
    })

    it('should be found by alias', () => {
      const results = commandRegistry.searchCommands(':l')

      expect(results.some(cmd => cmd.name === 'outline')).toBe(true)
    })
  })

  describe('search command (:f)', () => {
    it('should execute search command without query', async () => {
      const result = await commandRegistry.executeCommand(':f')

      expect(mockNavigator.openSearch).toHaveBeenCalledWith(undefined)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Opened search')
    })

    it('should execute search command with query', async () => {
      const result = await commandRegistry.executeCommand(':f dragons')

      expect(mockNavigator.openSearch).toHaveBeenCalledWith('dragons')
      expect(result.success).toBe(true)
      expect(result.message).toBe('Searching for "dragons"')
    })

    it('should execute search command with complex query', async () => {
      const result = await commandRegistry.executeCommand(':f "ancient magic"')

      expect(mockNavigator.openSearch).toHaveBeenCalledWith('"ancient')
      expect(result.success).toBe(true)
    })

    it('should be found by full name', () => {
      const results = commandRegistry.searchCommands('search')

      expect(results.some(cmd => cmd.name === 'search')).toBe(true)
    })

    it('should be found by alias', () => {
      const results = commandRegistry.searchCommands(':f')

      expect(results.some(cmd => cmd.name === 'search')).toBe(true)
    })
  })

  describe('command discoverability', () => {
    it('should list all navigator commands in navigator category', () => {
      const navigatorCommands = commandRegistry.getCommandsByCategory('navigator')

      expect(navigatorCommands).toHaveLength(3)
      expect(navigatorCommands.map(cmd => cmd.name).sort()).toEqual(['documents', 'outline', 'search'])
    })

    it('should include navigator category in categories list', () => {
      const categories = commandRegistry.getCategories()

      expect(categories).toContain('navigator')
    })

    it('should find navigator commands in general search', () => {
      const results = commandRegistry.searchCommands('nav')

      expect(results.length).toBeGreaterThan(0)
    })

    it('should show all navigator commands with empty search', () => {
      const results = commandRegistry.searchCommands('')

      const navigatorResults = results.filter(cmd => cmd.category === 'navigator')
      expect(navigatorResults).toHaveLength(3)
    })
  })

  describe('command parsing and validation', () => {
    it('should parse colon commands correctly', () => {
      const parsed = commandRegistry.parseCommand(':d fantasy books')

      expect(parsed.name).toBe(':d')
      expect(parsed.args).toEqual(['fantasy', 'books'])
      expect(parsed.cleanInput).toBe(':d fantasy books')
    })

    it('should handle commands with extra whitespace', () => {
      const parsed = commandRegistry.parseCommand('  :f  search term  ')

      expect(parsed.name).toBe(':f')
      expect(parsed.args).toEqual(['search', 'term'])
    })

    it('should validate parameter types', () => {
      // All Navigator command parameters are optional strings, so validation should pass
      expect(() => commandRegistry.parseCommand(':d filter')).not.toThrow()
      expect(() => commandRegistry.parseCommand(':f query')).not.toThrow()
    })
  })

  describe('command execution error handling', () => {
    it('should handle Navigator method errors gracefully', async () => {
      mockNavigator.openDocuments = jest.fn().mockImplementation(() => {
        throw new Error('Navigator error')
      })

      await expect(commandRegistry.executeCommand(':d')).rejects.toThrow('Navigator error')
    })

    it('should handle missing Navigator gracefully', async () => {
      // Modify command to use non-existent navigator
      const brokenCommand = {
        name: 'broken',
        description: 'Broken navigator command',
        category: 'navigator',
        handler: async () => {
          mockApp.nonExistentNavigator.openDocuments()
        }
      }

      commandRegistry.registerCommand(brokenCommand)

      await expect(commandRegistry.executeCommand('broken')).rejects.toThrow()
    })
  })

  describe('command history integration', () => {
    beforeEach(() => {
      // Reset mocks before each test in this group
      jest.clearAllMocks()
      // Reset navigator mock to working state
      mockNavigator.openDocuments = jest.fn()
      mockNavigator.openOutline = jest.fn()
      mockNavigator.openSearch = jest.fn()
    })
    
    it('should add Navigator commands to history', async () => {
      await commandRegistry.executeCommand(':d')
      await commandRegistry.executeCommand(':l')
      await commandRegistry.executeCommand(':f')

      const history = commandRegistry.getHistory()

      expect(history).toContain(':d')
      expect(history).toContain(':l')
      expect(history).toContain(':f')
    })

    it('should track command usage for suggestions', async () => {
      // Execute documents command multiple times
      await commandRegistry.executeCommand(':d')
      await commandRegistry.executeCommand('documents fantasy')
      await commandRegistry.executeCommand(':d adventure')

      const history = commandRegistry.getHistory()
      const documentsCalls = history.filter(cmd => cmd.startsWith(':d') || cmd.startsWith('documents')).length

      expect(documentsCalls).toBe(3)
    })
  })

  describe('fuzzy matching for Navigator commands', () => {
    it('should match fuzzy patterns for Navigator commands', () => {
      expect(commandRegistry.fuzzyMatch('documents', 'doc')).toBe(true)
      expect(commandRegistry.fuzzyMatch('documents', 'dcmnts')).toBe(true)
      expect(commandRegistry.fuzzyMatch('outline', 'otln')).toBe(true)
      expect(commandRegistry.fuzzyMatch('search', 'srch')).toBe(true)
    })

    it('should rank exact matches higher', () => {
      const results = commandRegistry.searchCommands('documents')

      expect(results[0].name).toBe('documents')
    })

    it('should find commands by partial alias match', () => {
      const results = commandRegistry.searchCommands('d')

      expect(results.some(cmd => cmd.name === 'documents')).toBe(true)
    })
  })

  describe('command help integration', () => {
    it('should provide help text for Navigator commands', () => {
      const documentsCmd = commandRegistry.getCommand('documents')

      expect(documentsCmd.description).toContain('navigator')
      expect(documentsCmd.parameters).toBeDefined()
      expect(documentsCmd.parameters[0].name).toBe('filter')
    })

    it('should show parameter information', () => {
      const searchCmd = commandRegistry.getCommand('search')

      expect(searchCmd.parameters).toBeDefined()
      expect(searchCmd.parameters[0].required).toBe(false)
      expect(searchCmd.parameters[0].type).toBe('string')
    })

    it('should include aliases in command info', () => {
      const outlineCmd = commandRegistry.getCommand('outline')

      expect(outlineCmd.aliases).toContain(':l')
    })
  })

  describe('command registry stats', () => {
    it('should include Navigator commands in statistics', () => {
      const stats = commandRegistry.getStats()

      expect(stats.totalCommands).toBeGreaterThanOrEqual(3)
      expect(stats.totalCategories).toBeGreaterThanOrEqual(1)
    })

    it('should count Navigator category correctly', () => {
      const navigatorCommands = commandRegistry.getCommandsByCategory('navigator')

      expect(navigatorCommands).toHaveLength(3)
    })
  })

  describe('command context and conditions', () => {
    it('should execute Navigator commands when Navigator is available', () => {
      // All Navigator commands should be available when navigator exists
      const documentsCmd = commandRegistry.getCommand('documents')
      const outlineCmd = commandRegistry.getCommand('outline')
      const searchCmd = commandRegistry.getCommand('search')

      expect(documentsCmd).toBeDefined()
      expect(outlineCmd).toBeDefined()
      expect(searchCmd).toBeDefined()
    })

    it('should handle conditional command availability', () => {
      // Add a conditional Navigator command
      const conditionalCommand = {
        name: 'outline-advanced',
        description: 'Advanced outline features',
        category: 'navigator',
        condition: () => mockApp.navigator && mockApp.navigator.supportsAdvancedFeatures,
        handler: async () => ({ success: true })
      }

      commandRegistry.registerCommand(conditionalCommand)

      // Should not appear in available commands if condition is false
      const allCommands = commandRegistry.getAllCommands()
      expect(allCommands.some(cmd => cmd.name === 'outline-advanced')).toBe(false)
    })
  })
})