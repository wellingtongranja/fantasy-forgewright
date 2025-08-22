/**
 * SyncManager - Manages bidirectional synchronization between local storage and GitHub
 * Implements conflict resolution and offline-first sync strategies
 */
export class SyncManager {
  constructor(storageManager, githubStorage, githubAuth) {
    this.storage = storageManager
    this.github = githubStorage
    this.auth = githubAuth
    this.syncQueue = []
    this.conflictQueue = []
    this.syncing = false
    this.lastSyncTime = null
    this.autoSyncEnabled = false
    this.autoSyncInterval = null
  }

  /**
   * Initialize sync manager
   * @param {Object} config - Sync configuration
   */
  init(config = {}) {
    this.autoSyncEnabled = config.autoSync || false
    this.autoSyncIntervalMs = config.autoSyncInterval || 5 * 60 * 1000 // 5 minutes

    if (this.autoSyncEnabled) {
      this.startAutoSync()
    }

    // Load last sync time from storage
    this.loadSyncMetadata()
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval)
    }

    this.autoSyncInterval = setInterval(async () => {
      if (this.auth.isAuthenticated() && this.github.isConfigured()) {
        try {
          await this.syncWithGitHub()
        } catch (error) {
          console.warn('Auto-sync failed:', error.message)
        }
      }
    }, this.autoSyncIntervalMs)
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval)
      this.autoSyncInterval = null
    }
  }

  /**
   * Perform full bidirectional sync with GitHub
   * @returns {Promise<Object>} Sync results
   */
  async syncWithGitHub() {
    if (this.syncing) {
      throw new Error('Sync already in progress')
    }

    if (!this.auth.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub')
    }

    if (!this.github.isConfigured()) {
      throw new Error('GitHub repository not configured')
    }

    this.syncing = true
    const results = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: 0,
      startTime: new Date(),
      endTime: null
    }

    try {
      // Ensure GitHub documents directory exists
      await this.github.ensureDocumentsDirectory()

      // Get all local and remote documents
      const localDocs = await this.storage.getAllDocuments()
      const remoteDocs = await this.github.listDocuments()

      // Create lookup maps
      const localMap = new Map(localDocs.map(doc => [doc.id, doc]))
      const remoteMap = new Map(remoteDocs.map(doc => [doc.id, doc]))

      // Find documents to sync
      const toUpload = []
      const toDownload = []
      const conflicts = []

      // Check each local document
      for (const localDoc of localDocs) {
        const remoteDoc = remoteMap.get(localDoc.id)
        
        if (!remoteDoc) {
          // Local document doesn't exist remotely - upload
          toUpload.push(localDoc)
        } else {
          // Document exists in both places - check for conflicts
          const conflict = this.detectConflict(localDoc, remoteDoc)
          if (conflict) {
            conflicts.push({ local: localDoc, remote: remoteDoc, type: conflict })
          } else if (this.isLocalNewer(localDoc, remoteDoc)) {
            toUpload.push(localDoc)
          }
        }
      }

      // Check each remote document
      for (const remoteDoc of remoteDocs) {
        const localDoc = localMap.get(remoteDoc.id)
        
        if (!localDoc) {
          // Remote document doesn't exist locally - download
          toDownload.push(remoteDoc)
        } else if (!conflicts.some(c => c.remote.id === remoteDoc.id) && 
                   this.isRemoteNewer(localDoc, remoteDoc)) {
          toDownload.push(remoteDoc)
        }
      }

      // Process uploads
      for (const doc of toUpload) {
        try {
          await this.uploadDocument(doc)
          results.uploaded++
        } catch (error) {
          console.error(`Failed to upload ${doc.title}:`, error)
          results.errors++
        }
      }

      // Process downloads
      for (const doc of toDownload) {
        try {
          await this.downloadDocument(doc)
          results.downloaded++
        } catch (error) {
          console.error(`Failed to download ${doc.title}:`, error)
          results.errors++
        }
      }

      // Handle conflicts
      if (conflicts.length > 0) {
        this.conflictQueue.push(...conflicts)
        results.conflicts = conflicts.length
      }

      // Update sync metadata
      this.lastSyncTime = new Date()
      this.saveSyncMetadata()

      results.endTime = new Date()
      return results

    } catch (error) {
      results.errors++
      throw error
    } finally {
      this.syncing = false
    }
  }

  /**
   * Upload a document to GitHub
   * @param {Object} document - Document to upload
   * @returns {Promise<void>}
   */
  async uploadDocument(document) {
    const result = await this.github.saveDocument(document)
    
    // Update local document with GitHub metadata
    const updatedDoc = {
      ...document,
      githubSha: result.document.githubSha,
      githubPath: result.document.githubPath,
      lastSyncedAt: result.document.lastSyncedAt
    }
    
    await this.storage.saveDocument(updatedDoc)
  }

  /**
   * Download a document from GitHub
   * @param {Object} remoteDoc - Remote document metadata
   * @returns {Promise<void>}
   */
  async downloadDocument(remoteDoc) {
    const document = await this.github.loadDocument(remoteDoc.githubPath)
    await this.storage.saveDocument(document)
  }

  /**
   * Detect conflicts between local and remote documents
   * @param {Object} localDoc - Local document
   * @param {Object} remoteDoc - Remote document
   * @returns {string|null} Conflict type or null
   */
  detectConflict(localDoc, remoteDoc) {
    const localTime = new Date(localDoc.updatedAt || localDoc.metadata?.modified)
    const remoteTime = new Date(remoteDoc.updatedAt)
    
    // If both have been modified since last sync, it's a conflict
    if (Math.abs(localTime.getTime() - remoteTime.getTime()) > 1000) { // 1 second tolerance
      if (localDoc.checksum && remoteDoc.checksum && localDoc.checksum !== remoteDoc.checksum) {
        return 'content'
      }
      if (localDoc.title !== remoteDoc.title) {
        return 'title'
      }
      return 'timestamp'
    }
    
    return null
  }

  /**
   * Check if local document is newer than remote
   * @param {Object} localDoc - Local document
   * @param {Object} remoteDoc - Remote document
   * @returns {boolean} Whether local is newer
   */
  isLocalNewer(localDoc, remoteDoc) {
    const localTime = new Date(localDoc.updatedAt || localDoc.metadata?.modified)
    const remoteTime = new Date(remoteDoc.updatedAt)
    return localTime > remoteTime
  }

  /**
   * Check if remote document is newer than local
   * @param {Object} localDoc - Local document
   * @param {Object} remoteDoc - Remote document
   * @returns {boolean} Whether remote is newer
   */
  isRemoteNewer(localDoc, remoteDoc) {
    const localTime = new Date(localDoc.updatedAt || localDoc.metadata?.modified)
    const remoteTime = new Date(remoteDoc.updatedAt)
    return remoteTime > localTime
  }

  /**
   * Resolve a conflict by choosing a resolution strategy
   * @param {string} conflictId - Conflict identifier
   * @param {string} resolution - Resolution strategy: 'local', 'remote', 'merge'
   * @returns {Promise<void>}
   */
  async resolveConflict(conflictId, resolution) {
    const conflictIndex = this.conflictQueue.findIndex(c => 
      this.generateConflictId(c) === conflictId
    )
    
    if (conflictIndex === -1) {
      throw new Error('Conflict not found')
    }
    
    const conflict = this.conflictQueue[conflictIndex]
    
    switch (resolution) {
      case 'local':
        await this.uploadDocument(conflict.local)
        break
        
      case 'remote':
        await this.downloadDocument(conflict.remote)
        break
        
      case 'merge':
        const mergedDoc = await this.mergeDocuments(conflict.local, conflict.remote)
        await this.storage.saveDocument(mergedDoc)
        await this.uploadDocument(mergedDoc)
        break
        
      default:
        throw new Error(`Unknown resolution strategy: ${resolution}`)
    }
    
    // Remove resolved conflict from queue
    this.conflictQueue.splice(conflictIndex, 1)
  }

  /**
   * Merge two conflicting documents
   * @param {Object} localDoc - Local document
   * @param {Object} remoteDoc - Remote document
   * @returns {Promise<Object>} Merged document
   */
  async mergeDocuments(localDoc, remoteDoc) {
    // Simple merge strategy: combine content and use latest metadata
    const localTime = new Date(localDoc.updatedAt || localDoc.metadata?.modified)
    const remoteTime = new Date(remoteDoc.updatedAt)
    
    const newerDoc = localTime > remoteTime ? localDoc : remoteDoc
    const olderDoc = localTime > remoteTime ? remoteDoc : localDoc
    
    // Merge content with conflict markers
    const mergedContent = `${newerDoc.content}\n\n---\n\n### Merged from ${olderDoc.title} (${olderDoc.updatedAt})\n\n${olderDoc.content}`
    
    // Merge tags
    const mergedTags = [...new Set([...(localDoc.tags || []), ...(remoteDoc.tags || [])])]
    
    return {
      ...newerDoc,
      content: mergedContent,
      tags: mergedTags,
      updatedAt: new Date().toISOString(),
      checksum: this.storage.generateChecksum(mergedContent),
      mergedAt: new Date().toISOString(),
      mergedFrom: [localDoc.id, remoteDoc.id]
    }
  }

  /**
   * Generate unique conflict identifier
   * @param {Object} conflict - Conflict object
   * @returns {string} Conflict ID
   */
  generateConflictId(conflict) {
    return `${conflict.local.id}-${conflict.type}-${Date.now()}`
  }

  /**
   * Get pending conflicts
   * @returns {Array} Array of conflicts
   */
  getPendingConflicts() {
    return this.conflictQueue.map(conflict => ({
      id: this.generateConflictId(conflict),
      type: conflict.type,
      local: {
        title: conflict.local.title,
        updatedAt: conflict.local.updatedAt,
        checksum: conflict.local.checksum
      },
      remote: {
        title: conflict.remote.title,
        updatedAt: conflict.remote.updatedAt,
        checksum: conflict.remote.checksum
      }
    }))
  }

  /**
   * Queue document for sync
   * @param {Object} document - Document to sync
   */
  queueForSync(document) {
    const existing = this.syncQueue.find(item => item.id === document.id)
    if (existing) {
      existing.document = document
      existing.timestamp = new Date()
    } else {
      this.syncQueue.push({
        id: document.id,
        document,
        timestamp: new Date()
      })
    }
  }

  /**
   * Process sync queue
   * @returns {Promise<void>}
   */
  async processSyncQueue() {
    if (this.syncQueue.length === 0 || !this.auth.isAuthenticated() || !this.github.isConfigured()) {
      return
    }

    const itemsToSync = [...this.syncQueue]
    this.syncQueue = []

    for (const item of itemsToSync) {
      try {
        await this.uploadDocument(item.document)
      } catch (error) {
        console.error(`Failed to sync queued document ${item.document.title}:`, error)
        // Re-queue failed items
        this.syncQueue.push(item)
      }
    }
  }

  /**
   * Get sync status
   * @returns {Object} Sync status
   */
  getSyncStatus() {
    return {
      syncing: this.syncing,
      lastSyncTime: this.lastSyncTime,
      queuedItems: this.syncQueue.length,
      pendingConflicts: this.conflictQueue.length,
      autoSyncEnabled: this.autoSyncEnabled,
      authenticated: this.auth.isAuthenticated(),
      configured: this.github.isConfigured()
    }
  }

  /**
   * Load sync metadata from storage
   */
  loadSyncMetadata() {
    const metadata = localStorage.getItem('fantasy_editor_sync_metadata')
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata)
        this.lastSyncTime = parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null
      } catch (error) {
        console.warn('Failed to load sync metadata:', error)
      }
    }
  }

  /**
   * Save sync metadata to storage
   */
  saveSyncMetadata() {
    const metadata = {
      lastSyncTime: this.lastSyncTime?.toISOString()
    }
    
    localStorage.setItem('fantasy_editor_sync_metadata', JSON.stringify(metadata))
  }

  /**
   * Clear all sync data
   */
  clearSyncData() {
    this.syncQueue = []
    this.conflictQueue = []
    this.lastSyncTime = null
    localStorage.removeItem('fantasy_editor_sync_metadata')
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopAutoSync()
    this.clearSyncData()
  }
}