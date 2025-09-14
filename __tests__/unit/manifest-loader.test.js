/**
 * Manifest Loader Tests - TDD approach for PWA icon loading
 * Tests for PWA integration following Fantasy Editor standards
 */
import { ManifestLoader, manifestLoader } from '../../src/utils/manifest-loader.js'

// Mock global fetch
global.fetch = jest.fn()

describe('ManifestLoader', () => {
  let loader

  beforeEach(() => {
    loader = new ManifestLoader()
    fetch.mockClear()
    fetch.mockReset()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(loader.manifestPath).toBe('/manifest.json')
      expect(loader.fallbackIconPath).toBe('/dist/icons')
      expect(loader.loaded).toBe(false)
      expect(loader.manifest).toBe(null)
    })

    it('should provide singleton instance', () => {
      expect(manifestLoader).toBeInstanceOf(ManifestLoader)
    })
  })

  describe('loadManifest', () => {
    it('should load manifest successfully', async () => {
      const mockManifest = {
        name: 'Fantasy Editor',
        short_name: 'Fantasy Editor',
        theme_color: '#007bff',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockManifest
      })

      const result = await loader.loadManifest()

      expect(fetch).toHaveBeenCalledWith('/manifest.json')
      expect(result).toEqual(mockManifest)
      expect(loader.loaded).toBe(true)
      expect(loader.manifest).toEqual(mockManifest)
    })

    it('should cache manifest after loading', async () => {
      const mockManifest = {
        name: 'Fantasy Editor',
        icons: []
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      // First call
      const result1 = await loader.loadManifest()

      // Second call (should use cache)
      const result2 = await loader.loadManifest()

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })

    it('should handle fetch errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await loader.loadManifest()

      // Should return fallback manifest
      expect(result.name).toBe('Fantasy Editor')
      expect(result.icons).toBeDefined()
      expect(Array.isArray(result.icons)).toBe(true)
    })

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await loader.loadManifest()

      // Should return fallback manifest
      expect(result).toBeDefined()
      expect(result.name).toBe('Fantasy Editor')
    })
  })

  describe('getAppIcons', () => {
    it('should return icons from manifest', async () => {
      const mockManifest = {
        name: 'Fantasy Editor',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const icons = await loader.getAppIcons()

      expect(icons).toHaveLength(2)
      expect(icons[0]).toEqual({
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      })
    })

    it('should return fallback icons when manifest has no icons', async () => {
      const mockManifest = { name: 'Fantasy Editor' }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const icons = await loader.getAppIcons()

      expect(icons.length).toBeGreaterThan(0)
      expect(icons[0].src).toContain('/dist/icons')
    })

    it('should normalize icon properties', async () => {
      const mockManifest = {
        name: 'Fantasy Editor',
        icons: [
          { src: '/icons/icon.png' } // Missing sizes, type, purpose
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const icons = await loader.getAppIcons()

      expect(icons[0]).toEqual({
        src: '/icons/icon.png',
        sizes: '48x48',
        type: 'image/png',
        purpose: 'any'
      })
    })
  })

  describe('getBestIcon', () => {
    it('should find exact size match', async () => {
      const mockManifest = {
        name: 'Fantasy Editor',
        icons: [
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const bestIcon = await loader.getBestIcon(192)

      expect(bestIcon.src).toBe('/icons/icon-192x192.png')
      expect(bestIcon.sizes).toBe('192x192')
    })

    it('should find closest larger size when exact match unavailable', async () => {
      const mockManifest = {
        name: 'Fantasy Editor',
        icons: [
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const bestIcon = await loader.getBestIcon(200) // Between 96 and 256

      expect(bestIcon.src).toBe('/icons/icon-256x256.png')
    })

    it('should return largest icon when no larger size available', async () => {
      const mockManifest = {
        name: 'Fantasy Editor',
        icons: [
          { src: '/icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const bestIcon = await loader.getBestIcon(512)

      expect(bestIcon.src).toBe('/icons/icon-96x96.png')
    })

    it('should return fallback icon when no icons available', async () => {
      const mockManifest = { name: 'Fantasy Editor', icons: [] }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const bestIcon = await loader.getBestIcon(192)

      expect(bestIcon.src).toContain('/dist/icons')
      expect(bestIcon.sizes).toBe('192x192')
    })
  })

  describe('parseIconSizes', () => {
    it('should parse single size', () => {
      const sizes = loader.parseIconSizes('192x192')
      expect(sizes).toEqual([192])
    })

    it('should parse multiple sizes', () => {
      const sizes = loader.parseIconSizes('48x48 96x96 192x192')
      expect(sizes).toEqual([48, 96, 192])
    })

    it('should handle invalid size strings', () => {
      const sizes = loader.parseIconSizes('invalid')
      expect(sizes).toEqual([])
    })

    it('should handle null/undefined input', () => {
      const sizes1 = loader.parseIconSizes(null)
      const sizes2 = loader.parseIconSizes(undefined)
      const sizes3 = loader.parseIconSizes('')

      expect(sizes1).toEqual([48])
      expect(sizes2).toEqual([48])
      expect(sizes3).toEqual([48])
    })
  })

  describe('getAppName', () => {
    it('should return name from manifest', async () => {
      const mockManifest = {
        name: 'Fantasy Writer Pro',
        short_name: 'Fantasy Pro'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const name = await loader.getAppName()
      expect(name).toBe('Fantasy Writer Pro')
    })

    it('should fallback to short_name', async () => {
      const mockManifest = { short_name: 'Fantasy Pro' }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const name = await loader.getAppName()
      expect(name).toBe('Fantasy Pro')
    })

    it('should fallback to default name', async () => {
      fetch.mockRejectedValueOnce(new Error('Failed to load'))

      const name = await loader.getAppName()
      expect(name).toBe('Fantasy Editor')
    })
  })

  describe('getThemeColor', () => {
    it('should return theme color from manifest', async () => {
      const mockManifest = { theme_color: '#ff6b35' }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const color = await loader.getThemeColor()
      expect(color).toBe('#ff6b35')
    })

    it('should fallback to default color', async () => {
      fetch.mockRejectedValueOnce(new Error('Failed to load'))

      const color = await loader.getThemeColor()
      expect(color).toBe('#007bff')
    })
  })

  describe('clearCache', () => {
    it('should clear cache and reset state', async () => {
      // Load manifest first
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'Test' })
      })

      await loader.loadManifest()
      expect(loader.loaded).toBe(true)
      expect(loader.manifest).not.toBe(null)

      loader.clearCache()

      expect(loader.loaded).toBe(false)
      expect(loader.manifest).toBe(null)
    })
  })

  describe('defensive programming', () => {
    it('should handle malformed JSON gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      const result = await loader.loadManifest()

      // Should return fallback manifest
      expect(result.name).toBe('Fantasy Editor')
    })

    it('should validate manifest structure', async () => {
      const invalidManifest = null

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidManifest
      })

      const result = await loader.loadManifest()

      // Should return fallback manifest
      expect(result.name).toBe('Fantasy Editor')
    })

    it('should handle missing icon arrays gracefully', async () => {
      const mockManifest = { name: 'Fantasy Editor', icons: null }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest
      })

      const icons = await loader.getAppIcons()

      expect(Array.isArray(icons)).toBe(true)
      expect(icons.length).toBeGreaterThan(0)
    })
  })
})