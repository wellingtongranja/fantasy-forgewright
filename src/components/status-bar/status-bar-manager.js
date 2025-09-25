/**
 * StatusBarManager - Enhanced status bar for Fantasy Editor
 * Manages all status bar elements and interactions
 */

export class StatusBarManager {
  constructor(app) {
    this.app = app
    this.elements = {}
    this.currentWidth = 65
    this.currentZoom = 1.0
    this.zoomLevels = [0.85, 1.0, 1.15, 1.3]
    this.widthPresets = [65, 80, 90]
    
    this.initialize()
  }

  /**
   * Initialize the status bar
   */
  initialize() {
    this.cacheElements()
    this.attachEventListeners()
    this.updateVersion()
    this.updateFormatInfo()
    
    // Set initial values to ensure display
    this.updateEditorWidth(this.currentWidth)
    this.updateEditorZoom(this.currentZoom)
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      wordCount: document.getElementById('word-count'),
      editorWidth: document.getElementById('editor-width'),
      editorZoom: document.getElementById('editor-zoom'),
      textFormat: document.getElementById('text-format'),
      repositoryInfo: document.getElementById('repository-info'),
      repoName: document.getElementById('repo-name'),
      appVersion: document.getElementById('app-version'),
      syncStatus: document.getElementById('sync-status'),
      syncStatusIcon: document.querySelector('#sync-status .sync-status-icon'),
      syncStatusText: document.querySelector('#sync-status .sync-status-text')
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Editor width cycling
    if (this.elements.editorWidth) {
      this.elements.editorWidth.addEventListener('dblclick', () => {
        this.cycleEditorWidth()
      })
    }

    // Editor zoom cycling
    if (this.elements.editorZoom) {
      this.elements.editorZoom.addEventListener('dblclick', () => {
        this.cycleEditorZoom()
      })
    }

    // Sync status double-click for diff mode
    if (this.elements.syncStatus) {
      this.elements.syncStatus.addEventListener('dblclick', () => {
        this.handleSyncStatusDoubleClick()
      })
    }
  }

  /**
   * Handle double-click on sync status to enter diff mode
   */
  handleSyncStatusDoubleClick() {
    // Only trigger diff mode if document is out-of-sync
    if (this.elements.syncStatus && this.elements.syncStatus.classList.contains('out-of-sync')) {
      // Check if currently in diff mode - if so, toggle off
      if (this.app.editor && this.app.editor.isInDiffMode()) {
        this.app.editor.exitDiffMode(true) // Keep current changes
        this.app.showNotification?.('Diff mode closed - changes preserved', 'info')
      } else {
        // Enter diff mode using the Git diff command
        if (this.app.commandRegistry) {
          this.app.commandRegistry.executeCommand('git diff', [])
        }
      }
    }
  }

  /**
   * Update word count
   */
  updateWordCount(count) {
    if (this.elements.wordCount) {
      this.elements.wordCount.textContent = `${count} words`
    }
  }

  /**
   * Update editor width display
   */
  updateEditorWidth(width) {
    // Ensure width is a valid number
    if (typeof width !== 'number' || isNaN(width)) {
      console.warn('Invalid width value:', width)
      return
    }
    
    this.currentWidth = width
    if (this.elements.editorWidth) {
      this.elements.editorWidth.textContent = `${width}ch`
    }
  }

  /**
   * Update editor zoom display
   */
  updateEditorZoom(zoom) {
    // Ensure zoom is a valid number
    if (typeof zoom !== 'number' || isNaN(zoom)) {
      console.warn('Invalid zoom value:', zoom)
      return
    }
    
    this.currentZoom = zoom
    if (this.elements.editorZoom) {
      const percentage = Math.round(zoom * 100)
      this.elements.editorZoom.textContent = `${percentage}%`
    }
  }

  /**
   * Update text format information
   */
  updateFormatInfo(format = 'Markdown') {
    if (this.elements.textFormat) {
      this.elements.textFormat.textContent = format
    }
  }

  /**
   * Update repository information
   */
  updateRepositoryInfo(repoName, isVisible = false) {
    if (this.elements.repositoryInfo && this.elements.repoName) {
      if (isVisible && repoName) {
        this.elements.repoName.textContent = repoName
        this.elements.repositoryInfo.style.display = 'flex'
      } else {
        this.elements.repositoryInfo.style.display = 'none'
      }
    }
  }

  /**
   * Update sync status
   */
  updateSyncStatus(status, icon = null) {
    if (this.elements.syncStatus) {
      // Remove all sync status classes
      this.elements.syncStatus.classList.remove('synced', 'out-of-sync', 'local-only')
      
      // Update the text content
      if (this.elements.syncStatusText) {
        this.elements.syncStatusText.textContent = status
      }
      
      // Update the icon if provided
      if (icon && this.elements.syncStatusIcon) {
        this.elements.syncStatusIcon.textContent = icon
      }
      
      // Add appropriate class based on status - exact matching for consistency
      const statusLower = status.toLowerCase()
      if (statusLower === 'synced' || (icon && icon.includes('🟢'))) {
        this.elements.syncStatus.classList.add('synced')
      } else if (statusLower === 'out-of-sync' || (icon && icon.includes('🟡'))) {
        this.elements.syncStatus.classList.add('out-of-sync')
      } else if (statusLower === 'local' || (icon && icon.includes('🔴'))) {
        this.elements.syncStatus.classList.add('local-only')
      }
    }
  }

  /**
   * Update GitHub sync indicator (deprecated - now unified with sync status)
   */
  updateGitHubSyncIndicator(isVisible = false) {
    // This method is deprecated as we now use unified sync status display
    // Kept for backwards compatibility but does nothing
  }

  /**
   * Update app version
   */
  updateVersion() {
    if (this.elements.appVersion) {
      // Get version from package.json or use default
      const version = this.getAppVersion()
      this.elements.appVersion.textContent = `v${version}`
    }
  }

  /**
   * Get app version
   */
  getAppVersion() {
    // Get version from Vite environment variable or fallback to package.json version
    // Use dynamic access to avoid Jest syntax errors with import.meta
    let env = {}
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Safely access import.meta without eval to prevent code injection
      try {
        // Use try-catch to safely access import.meta
        env = import.meta?.env || {}
      } catch (error) {
        // import.meta not available (likely in test environment)
        env = {}
      }
    } else if (typeof global !== 'undefined' && global.import?.meta?.env) {
      // Jest environment with mocked import.meta
      env = global.import.meta.env
    }
    
    return env.VITE_APP_VERSION || '0.0.2-alpha'
  }

  /**
   * Cycle through editor width presets
   */
  cycleEditorWidth() {
    const currentIndex = this.widthPresets.indexOf(this.currentWidth)
    const nextIndex = (currentIndex + 1) % this.widthPresets.length
    const nextWidth = this.widthPresets[nextIndex]
    
    // Update the width manager if available
    if (this.app && this.app.widthManager) {
      const result = this.app.widthManager.setWidth(nextWidth)
      if (result && result.success) {
        // Update display
        this.updateEditorWidth(nextWidth)
        
        // Show notification
        if (this.app && this.app.showNotification) {
          this.app.showNotification(`Editor width set to ${nextWidth}ch`, 'info')
        }
      }
    }
  }

  /**
   * Cycle through zoom levels
   */
  cycleEditorZoom() {
    const currentIndex = this.zoomLevels.indexOf(this.currentZoom)
    const nextIndex = (currentIndex + 1) % this.zoomLevels.length
    const nextZoom = this.zoomLevels[nextIndex]
    
    // Update the width manager if available
    if (this.app && this.app.widthManager) {
      const result = this.app.widthManager.setZoom(nextZoom)
      if (result && result.success) {
        // Update display
        this.updateEditorZoom(nextZoom)
        
        // Show notification
        if (this.app && this.app.showNotification) {
          const percentage = Math.round(nextZoom * 100)
          this.app.showNotification(`Zoom set to ${percentage}%`, 'info')
    }
      }
    }
  }

  /**
   * Update readonly status indicator
   */
  updateReadonlyStatus(doc) {
    const centerContent = document.querySelector('.footer-center-content')
    if (!centerContent) return

    // Remove existing readonly indicator
    const existingIndicator = centerContent.querySelector('.readonly-status-indicator')
    if (existingIndicator) {
      existingIndicator.remove()
    }

    // Add readonly indicator if document is readonly
    const isReadonly = doc.readonly === true || doc.type === 'system'
    if (isReadonly) {
      const readonlyStatus = document.createElement('div')
      readonlyStatus.className = 'readonly-status-indicator'

      if (doc.type === 'system') {
        readonlyStatus.innerHTML =
          '<span class="status-icon">📖</span><span class="status-text">System</span>'
        readonlyStatus.title = 'System document - readonly'
      } else {
        readonlyStatus.innerHTML =
          '<span class="status-icon">🔒</span><span class="status-text">Readonly</span>'
        readonlyStatus.title = 'Document is readonly'
      }

      // Insert into center content
      centerContent.appendChild(readonlyStatus)
    }
  }

  /**
   * Refresh all status bar elements
   */
  refresh() {
    // Update width and zoom from width manager if available
    if (this.app && this.app.widthManager) {
      try {
        const currentWidth = this.app.widthManager.getCurrentWidth()
        const currentZoom = this.app.widthManager.getCurrentZoom()
        
        // Handle different possible return formats
        if (currentWidth) {
          if (typeof currentWidth === 'number') {
            this.updateEditorWidth(currentWidth)
          } else if (currentWidth.columns && typeof currentWidth.columns === 'number') {
            this.updateEditorWidth(currentWidth.columns)
          }
        }
        
        if (currentZoom) {
          if (typeof currentZoom === 'number') {
            this.updateEditorZoom(currentZoom)
          } else if (currentZoom.level && typeof currentZoom.level === 'number') {
            this.updateEditorZoom(currentZoom.level)
          }
        }
      } catch (error) {
        console.warn('Error refreshing status bar:', error)
      }
    }
  }

  /**
   * Destroy the status bar manager
   */
  destroy() {
    // Remove event listeners
    if (this.elements.editorWidth) {
      this.elements.editorWidth.removeEventListener('dblclick', this.cycleEditorWidth)
    }
    if (this.elements.editorZoom) {
      this.elements.editorZoom.removeEventListener('dblclick', this.cycleEditorZoom)
    }
  }
}
