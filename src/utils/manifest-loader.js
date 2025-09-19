/**
 * Manifest Loader - PWA icon loading utility for legal splash screen
 * Follows Fantasy Editor standards: clean code, defensive programming, PWA-first
 */

export class ManifestLoader {
  constructor() {
    this.manifestPath = '/manifest.json'
    this.fallbackIconPath = '/dist/icons'
    this.cache = new Map()
    this.loaded = false
    this.manifest = null
  }

  /**
   * Load and parse PWA manifest
   */
  async loadManifest() {
    if (this.loaded && this.manifest) {
      return this.manifest
    }

    try {
      const response = await fetch(this.manifestPath)

      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`)
      }

      this.manifest = await response.json()
      this.validateManifest(this.manifest)
      this.loaded = true
      return this.manifest
    } catch (error) {
      console.warn('Failed to load manifest:', error.message)
      return this.createFallbackManifest()
    }
  }

  /**
   * Get app icons from manifest
   */
  async getAppIcons() {
    const manifest = await this.loadManifest()

    if (!manifest.icons || !Array.isArray(manifest.icons)) {
      return this.getFallbackIcons()
    }

    return manifest.icons.map((icon) => ({
      src: icon.src,
      sizes: icon.sizes || '48x48',
      type: icon.type || 'image/png',
      purpose: icon.purpose || 'any'
    }))
  }

  /**
   * Get best icon for specific size
   */
  async getBestIcon(preferredSize = 192) {
    const icons = await this.getAppIcons()

    if (icons.length === 0) {
      return this.getFallbackIcon(preferredSize)
    }

    // Find exact match first
    const exactMatch = icons.find((icon) => {
      const sizes = this.parseIconSizes(icon.sizes)
      return sizes.includes(preferredSize)
    })

    if (exactMatch) {
      return exactMatch
    }

    // Find closest larger size
    const largerIcons = icons.filter((icon) => {
      const sizes = this.parseIconSizes(icon.sizes)
      return Math.max(...sizes) >= preferredSize
    })

    if (largerIcons.length > 0) {
      return this.findClosestSize(largerIcons, preferredSize)
    }

    // Return largest available icon
    return this.findLargestIcon(icons)
  }

  /**
   * Get app name from manifest
   */
  async getAppName() {
    const manifest = await this.loadManifest()
    return manifest.name || manifest.short_name || 'Fantasy Editor'
  }

  /**
   * Get app theme color from manifest
   */
  async getThemeColor() {
    const manifest = await this.loadManifest()
    return manifest.theme_color || '#007bff'
  }

  /**
   * Parse icon sizes string into array of numbers
   */
  parseIconSizes(sizesString) {
    if (!sizesString || typeof sizesString !== 'string') {
      return [48]
    }

    return sizesString
      .split(' ')
      .map((size) => {
        const match = size.match(/^(\d+)x\d+$/)
        return match ? parseInt(match[1], 10) : null
      })
      .filter((size) => size !== null)
  }

  /**
   * Find icon with closest size to preferred
   */
  findClosestSize(icons, preferredSize) {
    let closest = icons[0]
    let closestDiff = Infinity

    for (const icon of icons) {
      const sizes = this.parseIconSizes(icon.sizes)
      const maxSize = Math.max(...sizes)
      const diff = Math.abs(maxSize - preferredSize)

      if (diff < closestDiff) {
        closest = icon
        closestDiff = diff
      }
    }

    return closest
  }

  /**
   * Find largest available icon
   */
  findLargestIcon(icons) {
    let largest = icons[0]
    let largestSize = 0

    for (const icon of icons) {
      const sizes = this.parseIconSizes(icon.sizes)
      const maxSize = Math.max(...sizes)

      if (maxSize > largestSize) {
        largest = icon
        largestSize = maxSize
      }
    }

    return largest
  }

  /**
   * Create fallback manifest when loading fails
   */
  createFallbackManifest() {
    return {
      name: 'Fantasy Editor',
      short_name: 'Fantasy Editor',
      theme_color: '#007bff',
      background_color: '#ffffff',
      icons: this.getFallbackIcons()
    }
  }

  /**
   * Get fallback icons when manifest unavailable
   */
  getFallbackIcons() {
    const sizes = [72, 96, 144, 192, 512]

    return sizes.map((size) => ({
      src: `${this.fallbackIconPath}/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any maskable'
    }))
  }

  /**
   * Get fallback icon for specific size
   */
  getFallbackIcon(size) {
    return {
      src: `${this.fallbackIconPath}/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any maskable'
    }
  }

  /**
   * Validate manifest structure
   */
  validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Invalid manifest structure')
    }

    if (!manifest.name && !manifest.short_name) {
      console.warn('Manifest missing name and short_name')
    }
  }

  /**
   * Clear cache and reload
   */
  clearCache() {
    this.cache.clear()
    this.loaded = false
    this.manifest = null
  }
}

// Export singleton instance for convenience
export const manifestLoader = new ManifestLoader()
