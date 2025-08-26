import { CommandCategories } from '../command-categories'
import { CommandRegistry } from '../../../core/commands/command-registry'

describe('CommandCategories', () => {
  let commandCategories
  let registry
  let mockCommands

  beforeEach(() => {
    jest.clearAllMocks()
    
    registry = new CommandRegistry()
    
    // Create mock commands with different categories
    mockCommands = [
      {
        name: 'new document',
        description: 'Create a new document',
        category: 'document',
        icon: '📄',
        aliases: [':new'],
        handler: jest.fn()
      },
      {
        name: 'save document',
        description: 'Save current document',
        category: 'document',
        icon: '💾',
        aliases: [':save'],
        handler: jest.fn()
      },
      {
        name: 'git status',
        description: 'Show git status',
        category: 'git',
        icon: '📊',
        aliases: [':gst'],
        handler: jest.fn()
      },
      {
        name: 'git commit',
        description: 'Commit changes',
        category: 'git',
        icon: '✅',
        aliases: [':gc'],
        handler: jest.fn()
      },
      {
        name: 'license',
        description: 'View AGPL v3 license',
        category: 'about',
        icon: '📜',
        aliases: [':license'],
        handler: jest.fn()
      },
      {
        name: 'help',
        description: 'Show help information',
        category: 'about',
        icon: '❓',
        aliases: [':help'],
        handler: jest.fn()
      },
      {
        name: 'theme toggle',
        description: 'Toggle theme',
        category: 'preferences',
        icon: '🎨',
        aliases: [':theme'],
        handler: jest.fn()
      }
    ]

    // Register mock commands
    mockCommands.forEach(cmd => registry.registerCommand(cmd))
    
    commandCategories = new CommandCategories(registry)
  })

  describe('initialization', () => {
    it('should initialize with command registry', () => {
      expect(commandCategories.commandRegistry).toBe(registry)
    })

    it('should define category configuration', () => {
      expect(commandCategories.categoryConfig).toBeDefined()
      expect(typeof commandCategories.categoryConfig).toBe('object')
    })

    it('should have predefined category order', () => {
      expect(commandCategories.categoryOrder).toBeInstanceOf(Array)
      expect(commandCategories.categoryOrder.length).toBeGreaterThan(0)
    })
  })

  describe('category configuration', () => {
    it('should define document category', () => {
      const docCategory = commandCategories.categoryConfig.document
      expect(docCategory).toBeDefined()
      expect(docCategory.name).toBe('Documents')
      expect(docCategory.icon).toBe('📄')
      expect(docCategory.priority).toBe(1)
    })

    it('should define git category', () => {
      const gitCategory = commandCategories.categoryConfig.git
      expect(gitCategory).toBeDefined()
      expect(gitCategory.name).toBe('Git')
      expect(gitCategory.icon).toBe('🔧')
      expect(gitCategory.priority).toBe(2)
    })

    it('should define about category', () => {
      const aboutCategory = commandCategories.categoryConfig.about
      expect(aboutCategory).toBeDefined()
      expect(aboutCategory.name).toBe('About & Help')
      expect(aboutCategory.icon).toBe('ℹ️')
      expect(aboutCategory.priority).toBeGreaterThan(5)
    })

    it('should define preferences category', () => {
      const prefCategory = commandCategories.categoryConfig.preferences
      expect(prefCategory).toBeDefined()
      expect(prefCategory.name).toBe('Preferences')
      expect(prefCategory.icon).toBe('⚙️')
    })
  })

  describe('command grouping', () => {
    it('should group commands by category', () => {
      const grouped = commandCategories.groupCommandsByCategory()
      
      expect(grouped).toBeDefined()
      expect(typeof grouped).toBe('object')
      
      // Should have document category
      expect(grouped.document).toBeDefined()
      expect(grouped.document.commands).toHaveLength(2)
      
      // Should have git category
      expect(grouped.git).toBeDefined()
      expect(grouped.git.commands).toHaveLength(2)
      
      // Should have about category
      expect(grouped.about).toBeDefined()
      expect(grouped.about.commands).toHaveLength(2)
    })

    it('should include category metadata in groups', () => {
      const grouped = commandCategories.groupCommandsByCategory()
      
      Object.keys(grouped).forEach(categoryKey => {
        const category = grouped[categoryKey]
        expect(category.name).toBeDefined()
        expect(category.icon).toBeDefined()
        expect(category.priority).toBeDefined()
        expect(category.commands).toBeInstanceOf(Array)
      })
    })

    it('should sort categories by priority', () => {
      const orderedCategories = commandCategories.getOrderedCategories()
      
      expect(orderedCategories).toBeInstanceOf(Array)
      expect(orderedCategories.length).toBeGreaterThan(0)
      
      // Check if sorted by priority (lower numbers first)
      for (let i = 1; i < orderedCategories.length; i++) {
        const prev = commandCategories.categoryConfig[orderedCategories[i-1]]
        const curr = commandCategories.categoryConfig[orderedCategories[i]]
        expect(prev.priority).toBeLessThanOrEqual(curr.priority)
      }
    })

    it('should handle commands without explicit category', () => {
      // Register a command without category
      registry.registerCommand({
        name: 'uncategorized command',
        description: 'A command without category',
        handler: jest.fn()
      })

      const grouped = commandCategories.groupCommandsByCategory()
      
      // Should have general category for uncategorized commands
      expect(grouped.general).toBeDefined()
      expect(grouped.general.commands.some(cmd => cmd.name === 'uncategorized command')).toBe(true)
    })
  })

  describe('search within categories', () => {
    it('should search commands within specific category', () => {
      const documentResults = commandCategories.searchInCategory('document', 'new')
      
      expect(documentResults).toBeInstanceOf(Array)
      expect(documentResults.length).toBe(1)
      expect(documentResults[0].name).toBe('new document')
    })

    it('should return empty array for non-existent category', () => {
      const results = commandCategories.searchInCategory('nonexistent', 'test')
      
      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBe(0)
    })

    it('should return all commands in category when query is empty', () => {
      const allDocumentCommands = commandCategories.searchInCategory('document', '')
      
      expect(allDocumentCommands).toBeInstanceOf(Array)
      expect(allDocumentCommands.length).toBe(2)
    })
  })

  describe('category filtering', () => {
    it('should filter commands by multiple categories', () => {
      const filtered = commandCategories.filterByCategories(['document', 'git'])
      
      expect(filtered).toBeInstanceOf(Array)
      expect(filtered.length).toBe(4) // 2 document + 2 git commands
      
      const categories = filtered.map(cmd => cmd.category)
      expect(categories.every(cat => ['document', 'git'].includes(cat))).toBe(true)
    })

    it('should return empty array for non-matching categories', () => {
      const filtered = commandCategories.filterByCategories(['nonexistent'])
      
      expect(filtered).toBeInstanceOf(Array)
      expect(filtered.length).toBe(0)
    })

    it('should handle empty category array', () => {
      const filtered = commandCategories.filterByCategories([])
      
      expect(filtered).toBeInstanceOf(Array)
      expect(filtered.length).toBe(0)
    })
  })

  describe('category statistics', () => {
    it('should get category statistics', () => {
      const stats = commandCategories.getCategoryStats()
      
      expect(stats).toBeDefined()
      expect(typeof stats).toBe('object')
      expect(stats.totalCategories).toBeGreaterThan(0)
      expect(stats.totalCommands).toBeGreaterThan(0)
      expect(stats.categoryCounts).toBeDefined()
      expect(typeof stats.categoryCounts).toBe('object')
    })

    it('should count commands per category correctly', () => {
      const stats = commandCategories.getCategoryStats()
      
      expect(stats.categoryCounts.document).toBe(2)
      expect(stats.categoryCounts.git).toBe(2)
      expect(stats.categoryCounts.about).toBe(2)
      expect(stats.categoryCounts.preferences).toBe(1)
    })
  })

  describe('category validation', () => {
    it('should validate existing category', () => {
      expect(commandCategories.isValidCategory('document')).toBe(true)
      expect(commandCategories.isValidCategory('git')).toBe(true)
      expect(commandCategories.isValidCategory('about')).toBe(true)
    })

    it('should reject invalid category', () => {
      expect(commandCategories.isValidCategory('invalid')).toBe(false)
      expect(commandCategories.isValidCategory('')).toBe(false)
      expect(commandCategories.isValidCategory(null)).toBe(false)
      expect(commandCategories.isValidCategory(undefined)).toBe(false)
    })
  })

  describe('registry integration', () => {
    it('should update when registry changes', () => {
      const initialGrouped = commandCategories.groupCommandsByCategory()
      const initialDocumentCount = initialGrouped.document.commands.length
      
      // Add new document command
      registry.registerCommand({
        name: 'export document',
        description: 'Export current document',
        category: 'document',
        handler: jest.fn()
      })
      
      const updatedGrouped = commandCategories.groupCommandsByCategory()
      const updatedDocumentCount = updatedGrouped.document.commands.length
      
      expect(updatedDocumentCount).toBe(initialDocumentCount + 1)
    })

    it('should handle registry with no commands', () => {
      const emptyRegistry = new CommandRegistry()
      const emptyCategories = new CommandCategories(emptyRegistry)
      
      const grouped = emptyCategories.groupCommandsByCategory()
      
      expect(grouped).toBeDefined()
      expect(typeof grouped).toBe('object')
      expect(Object.keys(grouped).length).toBe(0)
    })
  })

  describe('accessibility and display', () => {
    it('should provide category display names', () => {
      expect(commandCategories.getCategoryDisplayName('document')).toBe('Documents')
      expect(commandCategories.getCategoryDisplayName('git')).toBe('Git')
      expect(commandCategories.getCategoryDisplayName('about')).toBe('About & Help')
    })

    it('should provide category icons', () => {
      expect(commandCategories.getCategoryIcon('document')).toBe('📄')
      expect(commandCategories.getCategoryIcon('git')).toBe('🔧')
      expect(commandCategories.getCategoryIcon('about')).toBe('ℹ️')
    })

    it('should handle unknown categories gracefully', () => {
      expect(commandCategories.getCategoryDisplayName('unknown')).toBe('General')
      expect(commandCategories.getCategoryIcon('unknown')).toBe('⚡')
    })
  })
})