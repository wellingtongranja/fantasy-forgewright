/**
 * GitService - Provider-agnostic Git operations for Fantasy Editor
 *
 * This service provides a unified interface for Git operations across all providers.
 * It eliminates code duplication between Navigator and commands while supporting
 * GitHub, GitLab, Bitbucket, and other Git providers through the AuthManager.
 */
export class GitService {
  constructor(app) {
    this.app = app
  }

  /**
   * Check if Git is available and configured
   * @returns {boolean}
   */
  isAvailable() {
    return this.app.authManager?.isAuthenticated() && this.app.githubStorage?.isConfigured()
  }

  /**
   * Get current Git provider info
   * @returns {Object|null} Provider info or null if not available
   */
  getProviderInfo() {
    if (!this.isAvailable()) return null

    const user = this.app.authManager.getCurrentUser()
    const config = this.app.githubStorage.getConfig()

    return {
      provider: this.app.authManager.getCurrentProvider()?.name || 'github',
      user: user.name || user.username,
      username: user.login || user.username,
      repository: config.configured ? `${config.owner}/${config.repo}` : null,
      branch: config.branch || 'main'
    }
  }

  /**
   * Push a document to the Git repository
   * @param {string} docId - Document ID
   * @returns {Promise<{success: boolean, message: string, document?: Object}>}
   */
  async pushDocument(docId) {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Git repository not available or not configured'
      }
    }

    try {
      // Get the document
      const document = await this.app.storageManager.getDocument(docId)
      if (!document) {
        return {
          success: false,
          message: 'Document not found'
        }
      }

      // Push to repository
      const result = await this.app.githubStorage.saveDocument(document)

      // Update local document with Git metadata
      let updatedDocument
      if (result && result.document) {
        updatedDocument = result.document
      } else {
        // Fallback: manually set Git metadata
        updatedDocument = {
          ...document,
          githubSha: `pushed-${Date.now()}`,
          githubPath: `documents/${document.id}.md`,
          lastSyncedAt: new Date().toISOString()
        }
      }

      await this.app.storageManager.saveDocument(updatedDocument)

      // Update sync status across all components with efficient document update
      if (this.app.syncStatusManager) {
        await this.app.syncStatusManager.updateAll(docId, updatedDocument)
      }

      return {
        success: true,
        message: `Document "${document.title}" pushed successfully`,
        document: updatedDocument
      }
    } catch (error) {
      return {
        success: false,
        message: `Push failed: ${error.message}`
      }
    }
  }

  /**
   * Pull a document from the Git repository
   * @param {string} docId - Document ID
   * @returns {Promise<{success: boolean, message: string, document?: Object}>}
   */
  async pullDocument(docId) {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Git repository not available or not configured'
      }
    }

    try {
      // Get the local document to find its Git path
      const localDoc = await this.app.storageManager.getDocument(docId)
      if (!localDoc) {
        return {
          success: false,
          message: 'Document not found'
        }
      }

      if (!localDoc.githubPath) {
        return {
          success: false,
          message: 'Document has no Git path - cannot pull'
        }
      }

      // Load from repository
      const remoteDoc = await this.app.githubStorage.loadDocument(localDoc.githubPath)
      if (!remoteDoc) {
        return {
          success: false,
          message: 'Document not found in repository'
        }
      }

      // Merge remote content with local metadata
      const syncTime = new Date().toISOString()
      const updatedDoc = {
        ...localDoc,
        content: remoteDoc.content,
        githubSha: remoteDoc.githubSha,
        lastSyncedAt: syncTime,
        metadata: {
          ...localDoc.metadata,
          // For pull operations, use sync time to ensure document appears synced
          // Don't increment modified time since we're not locally modifying the document
          modified: syncTime
        }
      }

      await this.app.storageManager.saveDocument(updatedDoc)

      // If this is the currently open document, reload it in the editor
      if (this.app.currentDocument && this.app.currentDocument.id === docId) {
        this.app.currentDocument = updatedDoc
        // Reload the document content in the editor
        if (this.app.loadDocument) {
          await this.app.loadDocument(updatedDoc)
        }
      }

      // Update sync status across all components with efficient document update
      if (this.app.syncStatusManager) {
        await this.app.syncStatusManager.updateAll(docId, updatedDoc)
      }

      return {
        success: true,
        message: `Document "${localDoc.title}" pulled successfully`,
        document: updatedDoc
      }
    } catch (error) {
      return {
        success: false,
        message: `Pull failed: ${error.message}`
      }
    }
  }

  /**
   * List documents in the Git repository
   * @returns {Promise<{success: boolean, message: string, documents?: Array}>}
   */
  async listDocuments() {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Git repository not available or not configured'
      }
    }

    try {
      const documents = await this.app.githubStorage.listDocuments()

      return {
        success: true,
        message: `Found ${documents.length} documents in repository`,
        documents: documents
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to list documents: ${error.message}`
      }
    }
  }

  /**
   * Sync all documents with the Git repository
   * @returns {Promise<{success: boolean, message: string, stats?: Object}>}
   */
  async syncAllDocuments() {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Git repository not available or not configured'
      }
    }

    try {
      // This would use the SyncManager for bulk operations
      if (this.app.syncManager) {
        const result = await this.app.syncManager.syncWithGitHub()

        // Update sync status across all components
        if (this.app.syncStatusManager) {
          this.app.syncStatusManager.updateAll()
        }

        return {
          success: true,
          message: 'Sync completed successfully',
          stats: {
            uploaded: result.uploaded || 0,
            downloaded: result.downloaded || 0,
            conflicts: result.conflicts || 0,
            errors: result.errors || 0
          }
        }
      } else {
        return {
          success: false,
          message: 'Sync manager not available'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error.message}`
      }
    }
  }

  /**
   * Initialize Git repository for documents
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async initRepository() {
    if (!this.isAvailable()) {
      return {
        success: false,
        message: 'Git repository not available or not configured'
      }
    }

    try {
      await this.app.githubStorage.ensureDocumentsDirectory()

      return {
        success: true,
        message: 'Git repository initialized successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: `Initialization failed: ${error.message}`
      }
    }
  }

  /**
   * Import a document from a Git repository URL
   * @param {string} url - Repository file URL
   * @returns {Promise<{success: boolean, message: string, document?: Object}>}
   */
  async importDocument(url) {
    if (!url) {
      return {
        success: false,
        message: 'URL is required'
      }
    }

    // Validate URL
    if (!url.includes('github.com') && !url.includes('gitlab.com') &&
        !url.includes('bitbucket.org') && !url.includes('raw.githubusercontent.com')) {
      return {
        success: false,
        message: 'Invalid Git repository URL'
      }
    }

    try {
      // Convert to raw URL if needed
      let rawUrl = url
      if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
        rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
      }

      const response = await fetch(rawUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const content = await response.text()

      // Create document
      const title = url.split('/').pop().replace('.md', '') || 'Imported Document'
      const document = {
        id: this.app.storageManager.generateGUID(),
        title,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['imported'],
        checksum: this.app.storageManager.generateChecksum(content)
      }

      await this.app.storageManager.saveDocument(document)

      return {
        success: true,
        message: `Document "${document.title}" imported successfully`,
        document: document
      }
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error.message}`
      }
    }
  }
}