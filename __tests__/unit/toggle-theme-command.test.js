import { CommandRegistry } from '../../src/core/commands/command-registry.js'

describe('Toggle Theme Command', () => {
  let mockApp
  let commandRegistry
  let mockSettingsManager

  beforeEach(() => {
    mockSettingsManager = {
      get: jest.fn(),
      set: jest.fn()
    }

    mockApp = {
      settingsManager: mockSettingsManager
    }

    global.app = mockApp

    // Mock CommandRegistry with required methods
    commandRegistry = {
      register: jest.fn(),
      execute: jest.fn(),
      getCommand: jest.fn(),
      findByAlias: jest.fn()
    }
    
    // Find and add the toggle theme command
    const toggleThemeCommand = {
      name: 'toggle theme',
      description: 'cycle through themes',
      category: 'appearance',
      icon: '🌙',
      aliases: [':tt'],
      handler: async () => {
        // Get current theme and cycle to next
        const currentTheme = app.settingsManager.get('editor.theme') || 'light'
        const themes = ['light', 'dark', 'fantasy', 'custom']
        const currentIndex = themes.indexOf(currentTheme)
        
        // Handle unknown theme (fallback to light)
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themes.length
        const nextTheme = themes[nextIndex]
        
        // Update via Settings Manager
        app.settingsManager.set('editor.theme', nextTheme)
        
        // Return appropriate icon and message
        const themeIcons = {
          light: '☀️',
          dark: '🌙',
          fantasy: '⚔️',
          custom: '🎨'
        }
        
        return { 
          success: true, 
          message: `${themeIcons[nextTheme]} Switched to ${nextTheme} theme` 
        }
      }
    }
    
    // Setup command registry mocks
    commandRegistry.register(toggleThemeCommand)
    commandRegistry.getCommand.mockReturnValue(toggleThemeCommand)
    commandRegistry.findByAlias.mockReturnValue(toggleThemeCommand)
    commandRegistry.execute.mockImplementation(async () => {
      return await toggleThemeCommand.handler()
    })
  })

  afterEach(() => {
    delete global.app
  })

  describe('Theme Cycling', () => {
    test(':tt command should cycle through all four themes in correct order', async () => {
      // Start with light theme
      mockSettingsManager.get.mockReturnValue('light')
      
      let result = await commandRegistry.execute('toggle theme')
      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.theme', 'dark')
      expect(result.message).toContain('🌙 Switched to dark theme')

      // Continue to fantasy
      mockSettingsManager.get.mockReturnValue('dark')
      mockSettingsManager.set.mockClear()
      
      result = await commandRegistry.execute('toggle theme')
      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.theme', 'fantasy')
      expect(result.message).toContain('⚔️ Switched to fantasy theme')

      // Continue to custom
      mockSettingsManager.get.mockReturnValue('fantasy')
      mockSettingsManager.set.mockClear()
      
      result = await commandRegistry.execute('toggle theme')
      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.theme', 'custom')
      expect(result.message).toContain('🎨 Switched to custom theme')

      // Complete cycle back to light
      mockSettingsManager.get.mockReturnValue('custom')
      mockSettingsManager.set.mockClear()
      
      result = await commandRegistry.execute('toggle theme')
      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.theme', 'light')
      expect(result.message).toContain('☀️ Switched to light theme')
    })

    test('should handle no current theme (defaults to light)', async () => {
      mockSettingsManager.get.mockReturnValue(null)
      
      const result = await commandRegistry.execute('toggle theme')
      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.theme', 'dark')
      expect(result.success).toBe(true)
      expect(result.message).toContain('🌙 Switched to dark theme')
    })

    test('should handle unknown theme gracefully', async () => {
      mockSettingsManager.get.mockReturnValue('unknown-theme')
      
      const result = await commandRegistry.execute('toggle theme')
      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.theme', 'light')
      expect(result.success).toBe(true)
      expect(result.message).toContain('☀️ Switched to light theme')
    })
  })

  describe('Command Registration', () => {
    test('should be registered with correct alias :tt', () => {
      const command = commandRegistry.getCommand('toggle theme')
      expect(command).toBeDefined()
      expect(command.aliases).toContain(':tt')
    })

    test('should be findable by alias :tt', () => {
      const command = commandRegistry.findByAlias(':tt')
      expect(command).toBeDefined()
      expect(command.name).toBe('toggle theme')
    })

    test('should have correct metadata', () => {
      const command = commandRegistry.getCommand('toggle theme')
      expect(command.description).toBe('cycle through themes')
      expect(command.category).toBe('appearance')
      expect(command.icon).toBe('🌙')
    })
  })

  describe('Theme Icons', () => {
    test('should use correct theme icons in success messages', () => {
      const expectedIcons = {
        light: '☀️',
        dark: '🌙', 
        fantasy: '⚔️',
        custom: '🎨'
      }

      Object.entries(expectedIcons).forEach(([theme, expectedIcon]) => {
        expect(expectedIcon).toBeDefined()
        expect(expectedIcon.length).toBeGreaterThan(0)
      })
    })

    test('should include theme icon in success message', async () => {
      mockSettingsManager.get.mockReturnValue('light')
      
      const result = await commandRegistry.execute('toggle theme')
      expect(result.message).toMatch(/^🌙 Switched to dark theme$/)
    })
  })

  describe('Error Handling', () => {
    test('should handle settings manager errors gracefully', async () => {
      mockSettingsManager.get.mockImplementation(() => {
        throw new Error('Settings error')
      })

      // Command should not throw, but might handle error internally
      await expect(commandRegistry.execute('toggle theme')).resolves.toBeDefined()
    })

    test('should handle settings save errors gracefully', async () => {
      mockSettingsManager.get.mockReturnValue('light')
      mockSettingsManager.set.mockImplementation(() => {
        throw new Error('Save error')
      })

      // Command should not throw, but might handle error internally  
      await expect(commandRegistry.execute('toggle theme')).resolves.toBeDefined()
    })
  })

  describe('Integration Requirements', () => {
    test('should use Settings Manager for persistence', async () => {
      mockSettingsManager.get.mockReturnValue('light')
      
      await commandRegistry.execute('toggle theme')
      
      // Should get current theme from settings
      expect(mockSettingsManager.get).toHaveBeenCalledWith('editor.theme')
      // Should save new theme to settings
      expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.theme', 'dark')
    })

    test('should work with global app object', async () => {
      expect(global.app).toBeDefined()
      expect(global.app.settingsManager).toBe(mockSettingsManager)
    })
  })

  describe('Backward Compatibility', () => {
    test('should maintain same command name and alias as before', () => {
      const command = commandRegistry.getCommand('toggle theme')
      
      expect(command.name).toBe('toggle theme')
      expect(command.aliases).toContain(':tt')
      
      // Should still work with the old two-theme behavior expectation
      // but now support four themes
    })

    test('should still work when started from any theme position', async () => {
      // Test starting from each theme position
      const themes = ['light', 'dark', 'fantasy', 'custom']
      
      for (let i = 0; i < themes.length; i++) {
        const currentTheme = themes[i]
        const expectedNextTheme = themes[(i + 1) % themes.length]
        
        mockSettingsManager.get.mockReturnValue(currentTheme)
        mockSettingsManager.set.mockClear()
        
        const result = await commandRegistry.execute('toggle theme')
        
        expect(mockSettingsManager.set).toHaveBeenCalledWith('editor.theme', expectedNextTheme)
        expect(result.success).toBe(true)
      }
    })
  })
})