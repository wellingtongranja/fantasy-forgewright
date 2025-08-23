import { ThemeManager } from '../theme-manager'

describe('ThemeManager', () => {
  let themeManager
  let mockLocalStorage
  let mockDocument

  beforeEach(() => {
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    }

    mockDocument = {
      documentElement: {
        setAttribute: jest.fn(),
        getAttribute: jest.fn()
      },
      getElementById: jest.fn(() => ({
        textContent: '',
        setAttribute: jest.fn()
      }))
    }

    global.localStorage = mockLocalStorage
    global.document = mockDocument

    // Note: ThemeManager is created individually in each test for proper mock setup
  })

  describe('initialization', () => {
    it('should initialize with saved theme from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('dark')
      const manager = new ThemeManager()

      expect(manager.currentTheme).toBe('dark')
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme-preference')
    })

    it('should initialize with light theme if no saved preference', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      const manager = new ThemeManager()

      expect(manager.currentTheme).toBe('light')
    })
  })

  describe('theme switching', () => {
    it('should apply theme and save preference', () => {
      const manager = new ThemeManager()
      manager.applyTheme('dark')

      expect(manager.currentTheme).toBe('dark')
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark')
    })

    it('should toggle through themes in order', () => {
      const manager = new ThemeManager()
      manager.currentTheme = 'light'
      manager.toggleTheme()
      expect(manager.currentTheme).toBe('dark')

      manager.toggleTheme()
      expect(manager.currentTheme).toBe('fantasy')

      manager.toggleTheme()
      expect(manager.currentTheme).toBe('light')
    })
  })

  describe('theme information', () => {
    it('should return the next theme in cycle', () => {
      themeManager.currentTheme = 'light'
      expect(themeManager.getNextTheme()).toBe('dark')

      themeManager.currentTheme = 'dark'
      expect(themeManager.getNextTheme()).toBe('fantasy')

      themeManager.currentTheme = 'fantasy'
      expect(themeManager.getNextTheme()).toBe('light')
    })

    it('should return current theme', () => {
      themeManager.currentTheme = 'dark'
      expect(themeManager.getCurrentTheme()).toBe('dark')
    })
  })
})
