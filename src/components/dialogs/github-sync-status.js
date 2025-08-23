/**
 * GitHubSyncStatus - UI component for displaying GitHub sync status
 * Shows connection status, sync progress, and pending operations
 */
export class GitHubSyncStatus {
  constructor() {
    this.element = null
    this.isVisible = false
    this.status = {
      connected: false,
      syncing: false,
      lastSync: null,
      queuedItems: 0,
      conflicts: 0,
      error: null
    }
    this.updateInterval = null
  }

  /**
   * Initialize the status component
   * @param {Object} container - Container element or selector
   */
  init(container) {
    const containerElement =
      typeof container === 'string' ? document.querySelector(container) : container

    if (!containerElement) {
      throw new Error('GitHub sync status container not found')
    }

    this.render(containerElement)
    this.startAutoUpdate()
  }

  /**
   * Update sync status
   * @param {Object} newStatus - New status object
   */
  updateStatus(newStatus) {
    this.status = { ...this.status, ...newStatus }
    this.updateDisplay()
  }

  /**
   * Show sync status indicator
   */
  show() {
    if (this.element) {
      this.element.style.display = 'block'
      this.isVisible = true
    }
  }

  /**
   * Hide sync status indicator
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none'
      this.isVisible = false
    }
  }

  /**
   * Render the status component
   * @param {Element} container - Container element
   */
  render(container) {
    this.element = document.createElement('div')
    this.element.className = 'github-sync-status'
    this.element.innerHTML = this.getStatusHTML()

    container.appendChild(this.element)
    this.attachEventListeners()
    this.updateDisplay()
  }

  /**
   * Get status HTML
   * @returns {string} HTML string
   */
  getStatusHTML() {
    return `
      <div class="sync-status-main">
        <div class="sync-icon">
          <span class="status-indicator"></span>
        </div>
        <div class="sync-text">
          <span class="status-message">Checking status...</span>
          <span class="status-details"></span>
        </div>
      </div>

      <div class="sync-status-dropdown">
        <div class="sync-dropdown-content">
          <div class="sync-section connection-section">
            <h4>🐙 GitHub Connection</h4>
            <div class="connection-info">
              <div class="connection-status">Not connected</div>
              <div class="connection-user"></div>
            </div>
          </div>

          <div class="sync-section sync-info-section">
            <h4>🔄 Sync Status</h4>
            <div class="sync-info">
              <div class="sync-stat">
                <span class="stat-label">Last sync:</span>
                <span class="last-sync-time">Never</span>
              </div>
              <div class="sync-stat">
                <span class="stat-label">Queued items:</span>
                <span class="queued-count">0</span>
              </div>
              <div class="sync-stat">
                <span class="stat-label">Conflicts:</span>
                <span class="conflict-count">0</span>
              </div>
            </div>
          </div>

          <div class="sync-section actions-section">
            <h4>⚡ Quick Actions</h4>
            <div class="sync-actions">
              <button class="sync-action-btn manual-sync" data-action="sync">
                <span class="btn-icon">🔄</span>
                Sync Now
              </button>
              <button class="sync-action-btn view-conflicts" data-action="conflicts" style="display: none;">
                <span class="btn-icon">⚠️</span>
                View Conflicts
              </button>
              <button class="sync-action-btn github-status" data-action="status">
                <span class="btn-icon">📊</span>
                Status
              </button>
            </div>
          </div>

          <div class="sync-section error-section" style="display: none;">
            <h4>❌ Error</h4>
            <div class="error-message"></div>
            <button class="retry-btn" data-action="retry">Retry</button>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Update the display based on current status
   */
  updateDisplay() {
    if (!this.element) return

    const { connected, syncing, lastSync, queuedItems, conflicts, error } = this.status

    // Update main status indicator
    const statusIndicator = this.element.querySelector('.status-indicator')
    const statusMessage = this.element.querySelector('.status-message')
    const statusDetails = this.element.querySelector('.status-details')

    // Update connection info
    const connectionStatus = this.element.querySelector('.connection-status')
    const connectionUser = this.element.querySelector('.connection-user')

    // Update sync info
    const lastSyncTime = this.element.querySelector('.last-sync-time')
    const queuedCount = this.element.querySelector('.queued-count')
    const conflictCount = this.element.querySelector('.conflict-count')

    // Update action buttons
    const manualSyncBtn = this.element.querySelector('.manual-sync')
    const viewConflictsBtn = this.element.querySelector('.view-conflicts')

    // Update error section
    const errorSection = this.element.querySelector('.error-section')
    const errorMessage = this.element.querySelector('.error-message')

    // Set status classes and messages
    this.element.className = 'github-sync-status'

    if (error) {
      this.element.classList.add('status-error')
      statusIndicator.textContent = '❌'
      statusMessage.textContent = 'Sync Error'
      statusDetails.textContent = 'Click for details'
      errorSection.style.display = 'block'
      errorMessage.textContent = error
    } else if (!connected) {
      this.element.classList.add('status-disconnected')
      statusIndicator.textContent = '⚫'
      statusMessage.textContent = 'GitHub Offline'
      statusDetails.textContent = 'Not connected'
      errorSection.style.display = 'none'
    } else if (syncing) {
      this.element.classList.add('status-syncing')
      statusIndicator.textContent = '🔄'
      statusMessage.textContent = 'Syncing...'
      statusDetails.textContent = 'Please wait'
      errorSection.style.display = 'none'
    } else if (conflicts > 0) {
      this.element.classList.add('status-conflicts')
      statusIndicator.textContent = '⚠️'
      statusMessage.textContent = 'Sync Conflicts'
      statusDetails.textContent = `${conflicts} conflict${conflicts > 1 ? 's' : ''}`
      errorSection.style.display = 'none'
    } else if (queuedItems > 0) {
      this.element.classList.add('status-pending')
      statusIndicator.textContent = '⏳'
      statusMessage.textContent = 'Sync Pending'
      statusDetails.textContent = `${queuedItems} item${queuedItems > 1 ? 's' : ''} queued`
      errorSection.style.display = 'none'
    } else {
      this.element.classList.add('status-synced')
      statusIndicator.textContent = '✅'
      statusMessage.textContent = 'GitHub Synced'
      statusDetails.textContent = lastSync ? this.formatRelativeTime(lastSync) : 'Ready'
      errorSection.style.display = 'none'
    }

    // Update connection details
    if (connected) {
      connectionStatus.textContent = 'Connected ✅'
      if (this.status.user) {
        connectionUser.textContent = `${this.status.user.name} (@${this.status.user.login})`
        connectionUser.style.display = 'block'
      } else {
        connectionUser.style.display = 'none'
      }
    } else {
      connectionStatus.textContent = 'Not connected ❌'
      connectionUser.style.display = 'none'
    }

    // Update sync statistics
    lastSyncTime.textContent = lastSync ? this.formatDateTime(lastSync) : 'Never'
    queuedCount.textContent = queuedItems.toString()
    conflictCount.textContent = conflicts.toString()

    // Update action buttons
    manualSyncBtn.disabled = !connected || syncing
    manualSyncBtn.textContent = syncing ? 'Syncing...' : 'Sync Now'

    viewConflictsBtn.style.display = conflicts > 0 ? 'block' : 'none'

    // Add visual indicators
    if (conflicts > 0) {
      conflictCount.parentElement.classList.add('has-conflicts')
    } else {
      conflictCount.parentElement.classList.remove('has-conflicts')
    }

    if (queuedItems > 0) {
      queuedCount.parentElement.classList.add('has-queued')
    } else {
      queuedCount.parentElement.classList.remove('has-queued')
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.element) return

    // Toggle dropdown on main status click
    const statusMain = this.element.querySelector('.sync-status-main')
    statusMain.addEventListener('click', () => {
      this.toggleDropdown()
    })

    // Action buttons
    const actionBtns = this.element.querySelectorAll('.sync-action-btn, .retry-btn')
    actionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = e.target.closest('button').dataset.action
        this.handleAction(action)
      })
    })

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.closeDropdown()
      }
    })
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown() {
    if (!this.element) return

    const dropdown = this.element.querySelector('.sync-status-dropdown')
    const isOpen = dropdown.classList.contains('open')

    if (isOpen) {
      this.closeDropdown()
    } else {
      this.openDropdown()
    }
  }

  /**
   * Open dropdown
   */
  openDropdown() {
    if (!this.element) return

    const dropdown = this.element.querySelector('.sync-status-dropdown')
    dropdown.classList.add('open')
    this.element.classList.add('dropdown-open')
  }

  /**
   * Close dropdown
   */
  closeDropdown() {
    if (!this.element) return

    const dropdown = this.element.querySelector('.sync-status-dropdown')
    dropdown.classList.remove('open')
    this.element.classList.remove('dropdown-open')
  }

  /**
   * Handle action button clicks
   * @param {string} action - Action name
   */
  handleAction(action) {
    const event = new CustomEvent('github-sync-action', {
      detail: { action, status: this.status }
    })
    document.dispatchEvent(event)

    // Close dropdown after action
    this.closeDropdown()
  }

  /**
   * Start automatic status updates
   */
  startAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    this.updateInterval = setInterval(() => {
      // Emit event to request status update
      const event = new CustomEvent('github-sync-status-request')
      document.dispatchEvent(event)
    }, 30000) // Update every 30 seconds
  }

  /**
   * Stop automatic status updates
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  /**
   * Format relative time
   * @param {Date|string} date - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime(date) {
    const now = new Date()
    const then = new Date(date)
    const diff = now - then

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return then.toLocaleDateString()
  }

  /**
   * Format date and time
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date and time
   */
  formatDateTime(date) {
    return new Date(date).toLocaleString()
  }

  /**
   * Destroy the component
   */
  destroy() {
    this.stopAutoUpdate()

    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }
}
