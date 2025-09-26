/**
 * Skeleton Loader Tests
 * Testing progressive loading component functionality
 */

import { SkeletonLoader } from '../../../src/components/dialogs/settings-dialog/components/skeleton-loader.js'

// Mock DOM methods
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0))
global.setTimeout = jest.fn((cb, delay) => {
  const id = Math.random()
  setTimeout(() => cb(), delay)
  return id
})

describe('SkeletonLoader Component', () => {
  describe('Constructor and Configuration', () => {
    test('creates skeleton loader with default config', () => {
      const loader = new SkeletonLoader()
      expect(loader.config.type).toBe('field')
      expect(loader.config.count).toBe(3)
      expect(loader.config.animated).toBe(true)
    })

    test('accepts custom configuration', () => {
      const loader = new SkeletonLoader({
        type: 'section',
        count: 5,
        animated: false
      })
      
      expect(loader.config.type).toBe('section')
      expect(loader.config.count).toBe(5)
      expect(loader.config.animated).toBe(false)
    })
  })

  describe('Skeleton Rendering', () => {
    test('renders field skeleton correctly', () => {
      const loader = new SkeletonLoader({ type: 'field' })
      const html = loader.render()
      
      expect(html).toContain('skeleton-container')
      expect(html).toContain('skeleton-field')
      expect(html).toContain('skeleton-label')
      expect(html).toContain('skeleton-input')
      expect(html).toContain('skeleton-description')
      expect(html).toContain('role="status"')
      expect(html).toContain('aria-label="Loading content"')
    })

    test('renders theme preview skeleton correctly', () => {
      const loader = new SkeletonLoader({ type: 'theme-preview', count: 2 })
      const html = loader.render()
      
      expect(html).toContain('skeleton-theme-preview')
      expect(html).toContain('skeleton-theme-header')
      expect(html).toContain('skeleton-preview-sample')
      // Should render 2 theme previews
      expect((html.match(/skeleton-theme-preview/g) || []).length).toBe(2)
    })

    test('renders auth status skeleton correctly', () => {
      const loader = new SkeletonLoader({ type: 'auth-status' })
      const html = loader.render()
      
      expect(html).toContain('skeleton-auth-status')
      expect(html).toContain('skeleton-auth-header')
      expect(html).toContain('skeleton-auth-indicator')
      expect(html).toContain('skeleton-auth-details')
      expect(html).toContain('skeleton-auth-line')
    })

    test('renders version info skeleton correctly', () => {
      const loader = new SkeletonLoader({ type: 'version-info' })
      const html = loader.render()
      
      expect(html).toContain('skeleton-app-logo')
      expect(html).toContain('skeleton-app-icon')
      expect(html).toContain('skeleton-version-grid')
      expect(html).toContain('skeleton-version-item')
    })

    test('includes animation class when animated', () => {
      const loader = new SkeletonLoader({ animated: true })
      const html = loader.render()
      expect(html).toContain('skeleton-animated')
    })

    test('excludes animation class when not animated', () => {
      const loader = new SkeletonLoader({ animated: false })
      const html = loader.render()
      expect(html).not.toContain('skeleton-animated')
    })
  })

  describe('Tab-Specific Factory Methods', () => {
    test('creates correct skeleton for editor tab', () => {
      const loader = SkeletonLoader.forTab('editor')
      expect(loader.config.type).toBe('full')
      expect(loader.config.count).toBe(4)
    })

    test('creates correct skeleton for themes tab', () => {
      const loader = SkeletonLoader.forTab('themes')
      expect(loader.config.type).toBe('theme-preview')
      expect(loader.config.count).toBe(3)
    })

    test('creates correct skeleton for codemirror tab', () => {
      const loader = SkeletonLoader.forTab('codemirror')
      expect(loader.config.type).toBe('full')
      expect(loader.config.count).toBe(6)
    })

    test('creates correct skeleton for git-integration tab', () => {
      const loader = SkeletonLoader.forTab('git-integration')
      expect(loader.config.type).toBe('auth-status')
      expect(loader.config.count).toBe(1)
    })

    test('creates correct skeleton for privacy tab', () => {
      const loader = SkeletonLoader.forTab('privacy')
      expect(loader.config.type).toBe('version-info')
      expect(loader.config.count).toBe(1)
    })

    test('falls back to default for unknown tab', () => {
      const loader = SkeletonLoader.forTab('unknown-tab')
      expect(loader.config.type).toBe('full')
      expect(loader.config.count).toBe(3)
    })
  })

  describe('DOM Interaction Methods', () => {
    let container

    beforeEach(() => {
      container = document.createElement('div')
      document.body.appendChild(container)
    })

    afterEach(() => {
      document.body.removeChild(container)
    })

    test('shows skeleton in container', () => {
      const loader = new SkeletonLoader({ type: 'field' })
      loader.show(container)
      
      expect(container.innerHTML).toContain('skeleton-container')
      expect(container.classList.contains('skeleton-loading')).toBe(true)
    })

    test('handles null container gracefully in show', () => {
      const loader = new SkeletonLoader()
      expect(() => loader.show(null)).not.toThrow()
    })

    test('hides skeleton and replaces with content', async () => {
      const loader = new SkeletonLoader()
      loader.show(container)
      
      const newContent = '<div>New Content</div>'
      await loader.hide(container, newContent)
      
      expect(container.innerHTML).toBe(newContent)
      expect(container.classList.contains('skeleton-loading')).toBe(false)
    })

    test('handles null container gracefully in hide', async () => {
      const loader = new SkeletonLoader()
      await expect(loader.hide(null, 'content')).resolves.not.toThrow()
    })
  })

  describe('Async Loading Integration', () => {
    let container

    beforeEach(() => {
      container = document.createElement('div')
      document.body.appendChild(container)
    })

    afterEach(() => {
      document.body.removeChild(container)
    })

    test('loads tab content successfully', async () => {
      const mockContent = '<div>Loaded Content</div>'
      const mockLoadFunction = jest.fn().mockResolvedValue(mockContent)
      
      const result = await SkeletonLoader.loadTabContent(container, 'editor', mockLoadFunction)
      
      expect(mockLoadFunction).toHaveBeenCalled()
      expect(result).toBe(mockContent)
      expect(container.innerHTML).toBe(mockContent)
    })

    test('handles loading errors gracefully', async () => {
      const mockError = new Error('Loading failed')
      const mockLoadFunction = jest.fn().mockRejectedValue(mockError)
      
      await expect(
        SkeletonLoader.loadTabContent(container, 'editor', mockLoadFunction)
      ).rejects.toThrow('Loading failed')
      
      // Should show error state in container
      expect(container.innerHTML).toContain('Error Loading Content')
      expect(container.innerHTML).toContain('Refresh Page')
    })

    test('enforces minimum loading time', async () => {
      const mockContent = '<div>Quick Content</div>'
      const mockLoadFunction = jest.fn().mockResolvedValue(mockContent)
      
      const startTime = Date.now()
      await SkeletonLoader.loadTabContent(container, 'editor', mockLoadFunction)
      const endTime = Date.now()
      
      // Should take at least 300ms due to minimum loading time
      expect(endTime - startTime).toBeGreaterThanOrEqual(290) // Small margin for test timing
    })
  })

  describe('Accessibility Features', () => {
    test('includes proper ARIA attributes', () => {
      const loader = new SkeletonLoader()
      const html = loader.render()
      
      expect(html).toContain('role="status"')
      expect(html).toContain('aria-label="Loading content"')
      expect(html).toContain('class="sr-only"')
      expect(html).toContain('Loading settings...')
    })

    test('provides screen reader text', () => {
      const loader = new SkeletonLoader()
      const html = loader.render()
      
      expect(html).toContain('<span class="sr-only">Loading settings...</span>')
    })
  })

  describe('Error Handling', () => {
    test('handles invalid container in show method', () => {
      const loader = new SkeletonLoader()
      expect(() => loader.show(null)).not.toThrow()
      expect(() => loader.show(undefined)).not.toThrow()
    })

    test('handles invalid container in hide method', async () => {
      const loader = new SkeletonLoader()
      await expect(loader.hide(undefined, 'content')).resolves.not.toThrow()
      await expect(loader.hide('', 'content')).resolves.not.toThrow()
    })
  })
})