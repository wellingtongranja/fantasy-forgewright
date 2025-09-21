/**
 * SyncStatusManager - Centralized document synchronization status management
 *
 * This class provides a single source of truth for document sync status across the entire application.
 * It eliminates duplication between Navigator, StatusBar, and other components.
 */
export class SyncStatusManager {
  constructor(app) {
    this.app = app
    this.statusUpdateCallbacks = new Set()
  }

  /**
   * Get sync status display text for a document class
   * @param {string} statusClass - Status class (synced, out-of-sync, local-only, no-sync)
   * @returns {string} Display text for the status
   */
  getSyncStatusText(statusClass) {
    const statusMap = {
      'synced': 'Synced',
      'out-of-sync': 'Out-of-sync',
      'local-only': 'Local',
      'conflicts': 'Conflicts',
      'no-sync': ''
    }
    return statusMap[statusClass] || ''
  }

  /**
   * Get sync status for a document
   * @param {Object} doc - Document object
   * @returns {Object} Sync status with icon, class, and tooltip
   */
  getDocumentSyncStatus(doc) {
    // Check authentication and configuration
    const isAuthenticated = this.app.authManager?.isAuthenticated()
    const config = this.app.githubStorage?.getConfig()
    const isConfigured = config?.configured

    // Not configured for Git
    if (!isAuthenticated || !isConfigured) {
      return {
        icon: '',
        class: 'no-sync',
        tooltip: 'Git repository not configured'
      }
    }

    // Check if document has Git metadata (pushed to repository)
    const hasGitMetadata = doc.githubSha && doc.githubPath

    if (!hasGitMetadata) {
      return {
        icon: '🔴',
        class: 'local-only',
        tooltip: 'Local only - never synced to Git repository'
      }
    }

    // Document has Git metadata - check if it needs to be pushed
    // Only show as out-of-sync if document was modified AFTER last sync
    if (doc.lastSyncedAt) {
      const lastSynced = new Date(doc.lastSyncedAt)
      const lastModified = doc.metadata?.modified
        ? new Date(doc.metadata.modified)
        : doc.updatedAt
          ? new Date(doc.updatedAt)
          : null

      // If no modification time, assume synced
      if (!lastModified) {
        return {
          icon: '🟢',
          class: 'synced',
          tooltip: 'Synced with Git repository'
        }
      }

      // If modified after sync, show as out-of-sync
      // Add 1 second buffer to handle timing issues
      if (lastModified.getTime() > lastSynced.getTime() + 1000) {
        return {
          icon: '🟡',
          class: 'out-of-sync',
          tooltip: 'Out of sync - local changes need push'
        }
      }
    }

    // Default: has Git metadata, so it's synced
    return {
      icon: '🟢',
      class: 'synced',
      tooltip: 'Synced with Git repository'
    }
  }

  /**
   * Get sync status for current document (for status bar)
   * @returns {Object} Status with text and icon for status bar display
   */
  getCurrentDocumentStatus() {
    if (!this.app.currentDocument) {
      return {
        status: 'no-document',
        icon: '',
        display: false
      }
    }

    const syncStatus = this.getDocumentSyncStatus(this.app.currentDocument)

    // Map internal status to display text
    const statusMap = {
      'no-sync': { status: 'no-sync', icon: '', display: false },
      'local-only': { status: 'Local', icon: '🔴', display: true },
      'synced': { status: 'Synced', icon: '🟢', display: true },
      'out-of-sync': { status: 'Out-of-sync', icon: '🟡', display: true }
    }

    return statusMap[syncStatus.class] || { status: 'unknown', icon: '', display: false }
  }

  /**
   * Check if Git is properly configured
   * @returns {boolean} True if Git is configured and authenticated
   */
  isGitConfigured() {
    const isAuthenticated = this.app.authManager?.isAuthenticated()
    const config = this.app.githubStorage?.getConfig()
    const isConfigured = config?.configured && config.owner && config.repo

    return isAuthenticated && isConfigured
  }

  /**
   * Get repository information
   * @returns {Object|null} Repository config or null if not configured
   */
  getRepositoryInfo() {
    if (!this.isGitConfigured()) {
      return null
    }

    const config = this.app.githubStorage?.getConfig()
    return {
      owner: config.owner,
      repo: config.repo,
      displayName: config.repo // Just show repo name, not owner/repo
    }
  }

  /**
   * Register a callback for status updates
   * @param {Function} callback - Function to call when status updates
   */
  onStatusUpdate(callback) {
    this.statusUpdateCallbacks.add(callback)
  }

  /**
   * Unregister a status update callback
   * @param {Function} callback - Function to remove
   */
  offStatusUpdate(callback) {
    this.statusUpdateCallbacks.delete(callback)
  }

  /**
   * Notify all components that sync status has changed
   * This should be called after any operation that might change sync status
   */
  notifyStatusChange() {
    // Update status bar
    this.updateStatusBar()

    // Update navigator if available
    this.updateNavigator()

    // Call registered callbacks
    this.statusUpdateCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.warn('Error in sync status update callback:', error)
      }
    })
  }

  /**
   * Update status bar with current document sync status
   */
  updateStatusBar() {
    if (!this.app.statusBarManager) return

    if (!this.isGitConfigured()) {
      this.app.statusBarManager.updateGitHubSyncIndicator(false)
      this.app.statusBarManager.updateRepositoryInfo(null, false)
      return
    }

    // Show repository info
    const repoInfo = this.getRepositoryInfo()
    if (repoInfo) {
      this.app.statusBarManager.updateRepositoryInfo(repoInfo.displayName, true)
    }

    // Update sync status
    const currentStatus = this.getCurrentDocumentStatus()
    if (currentStatus.display) {
      this.app.statusBarManager.updateSyncStatus(currentStatus.status, currentStatus.icon)
      this.app.statusBarManager.updateGitHubSyncIndicator(true)
    } else {
      this.app.statusBarManager.updateGitHubSyncIndicator(false)
    }
  }

  /**
   * Update navigator components
   */
  updateNavigator() {
    if (this.app.navigator?.tabComponents?.documents) {
      this.app.navigator.tabComponents.documents.renderDocuments()
    }
  }

  /**
   * Update all UI components with latest sync status
   * This is the main method that should be called after sync operations
   */
  updateAll() {
    this.notifyStatusChange()
  }
}