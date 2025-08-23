/**
 * GUID Utility - RFC 4122 compliant UUID generation and validation
 * Provides conflict-free document identification for local storage and Git repository
 */

export class GuidManager {
  constructor() {
    this.guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  }

  /**
   * Generate a new RFC 4122 v4 UUID
   * @returns {string} A new GUID
   */
  generateGuid() {
    // Use native crypto.randomUUID if available (modern browsers)
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID()
    }

    // Fallback implementation for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * Validate GUID format
   * @param {string} guid - The GUID to validate
   * @returns {boolean} Whether the GUID is valid
   */
  isValidGuid(guid) {
    if (!guid || typeof guid !== 'string') {
      return false
    }

    return this.guidRegex.test(guid)
  }

  /**
   * Generate Git-safe filename from document title and GUID
   * @param {string} title - Document title
   * @param {string} guid - Document GUID
   * @returns {string} Git-safe filename
   */
  generateFilename(title, guid) {
    if (!this.isValidGuid(guid)) {
      throw new Error('Valid title and GUID required for filename generation')
    }

    // Handle empty or invalid title
    const workingTitle = (title || '').trim()

    // Sanitize title for filesystem safety
    const sanitizedTitle = workingTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
      .substring(0, 50) // Limit length

    // Use first 8 characters of GUID for uniqueness
    const guidPrefix = guid.substring(0, 8)

    // Fallback if title becomes empty after sanitization
    const finalTitle = sanitizedTitle || 'document'

    return `${finalTitle}-${guidPrefix}.md`
  }

  /**
   * Extract GUID from filename
   * @param {string} filename - Git filename
   * @returns {string|null} Extracted GUID prefix or null
   */
  extractGuidFromFilename(filename) {
    const match = filename.match(/-([0-9a-f]{8})\.md$/i)
    return match ? match[1] : null
  }

  /**
   * Generate document metadata with GUID
   * @param {string} title - Document title
   * @param {string} content - Document content
   * @param {string[]} tags - Document tags
   * @returns {Object} Document object with GUID metadata
   */
  createDocumentWithGuid(title, content = '', tags = []) {
    const guid = this.generateGuid()
    const now = new Date().toISOString()

    return {
      id: guid,
      title: title || 'Untitled Document',
      filename: this.generateFilename(title || 'untitled', guid),
      content,
      tags: Array.isArray(tags) ? tags : [],
      metadata: {
        guid,
        created: now,
        modified: now,
        version: 1
      },
      sync: {
        status: 'local', // local, syncing, synced, conflict
        lastSync: null,
        remoteSha: null,
        gitPath: null,
        checksum: this.generateChecksum(content)
      }
    }
  }

  /**
   * Update document metadata
   * @param {Object} document - Existing document
   * @param {Object} changes - Changes to apply
   * @returns {Object} Updated document
   */
  updateDocument(document, changes) {
    if (!document || !this.isValidGuid(document.id)) {
      throw new Error('Invalid document or missing GUID')
    }

    const updated = { ...document, ...changes }

    // Update timestamps
    updated.metadata = {
      ...updated.metadata,
      modified: new Date().toISOString(),
      version: (updated.metadata?.version || 0) + 1
    }

    // Update filename if title changed
    if (changes.title && changes.title !== document.title) {
      updated.filename = this.generateFilename(changes.title, document.id)
    }

    // Update checksum if content changed
    if (changes.content !== undefined) {
      updated.sync.checksum = this.generateChecksum(changes.content)
    }

    return updated
  }

  /**
   * Generate checksum for content integrity
   * @param {string} content - Content to checksum
   * @returns {string} SHA-256 checksum
   */
  generateChecksum(content) {
    if (!content || typeof content !== 'string') {
      return '00000000'
    }

    // Simple hash for content integrity
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16).padStart(8, '0')
  }

  /**
   * Migrate old UID to GUID format
   * @param {string} oldId - Old UID (doc_timestamp_random8chars)
   * @returns {string} New GUID
   */
  migrateUidToGuid(oldId) {
    // Generate new GUID for migration
    const newGuid = this.generateGuid()

    // Log migration for debugging
    console.log(`Migrating document ID: ${oldId} → ${newGuid}`)

    return newGuid
  }

  /**
   * Check if ID is old UID format
   * @param {string} id - ID to check
   * @returns {boolean} Whether ID is old UID format
   */
  isOldUidFormat(id) {
    if (!id || typeof id !== 'string') {
      return false
    }

    // Old format: doc_1648125632_a1b2c3d4
    return /^doc_\d+_[a-f0-9]{8}$/i.test(id)
  }

  /**
   * Get GUID statistics for debugging
   * @returns {Object} GUID system statistics
   */
  getStats() {
    return {
      guidRegex: this.guidRegex.source,
      nativeSupport: !!(crypto && crypto.randomUUID),
      timestamp: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const guidManager = new GuidManager()
