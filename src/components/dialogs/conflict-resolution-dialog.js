/**
 * ConflictResolutionDialog - UI component for resolving GitHub sync conflicts
 * Provides diff view and resolution options for conflicting documents
 */
export class ConflictResolutionDialog {
  constructor() {
    this.isOpen = false
    this.conflicts = []
    this.currentConflictIndex = 0
    this.onResolve = null
    this.onCancel = null
    this.element = null
  }

  /**
   * Show conflict resolution dialog
   * @param {Array} conflicts - Array of conflict objects
   * @param {Function} onResolve - Callback for conflict resolution
   * @param {Function} onCancel - Callback for cancellation
   */
  show(conflicts, onResolve, onCancel) {
    if (this.isOpen || !conflicts || conflicts.length === 0) {
      return
    }

    this.conflicts = conflicts
    this.currentConflictIndex = 0
    this.onResolve = onResolve
    this.onCancel = onCancel
    this.isOpen = true

    this.render()
    this.attachEventListeners()
    document.body.classList.add('dialog-open')
  }

  /**
   * Hide conflict resolution dialog
   */
  hide() {
    if (!this.isOpen) return

    this.isOpen = false
    this.conflicts = []
    this.currentConflictIndex = 0
    this.onResolve = null
    this.onCancel = null

    if (this.element) {
      this.element.remove()
      this.element = null
    }

    document.body.classList.remove('dialog-open')
  }

  /**
   * Render the dialog
   */
  render() {
    if (this.element) {
      this.element.remove()
    }

    const conflict = this.conflicts[this.currentConflictIndex]
    const total = this.conflicts.length

    this.element = document.createElement('div')
    this.element.className = 'conflict-dialog-overlay'
    this.element.innerHTML = this.getDialogHTML(conflict, total)

    document.body.appendChild(this.element)
  }

  /**
   * Get dialog HTML
   * @param {Object} conflict - Current conflict object
   * @param {number} total - Total number of conflicts
   * @returns {string} HTML string
   */
  getDialogHTML(conflict, total) {
    return `
      <div class="conflict-dialog">
        <div class="conflict-dialog-header">
          <h2>🔄 Sync Conflict</h2>
          <div class="conflict-counter">
            ${this.currentConflictIndex + 1} of ${total}
          </div>
          <button class="conflict-close-btn" aria-label="Close">×</button>
        </div>

        <div class="conflict-dialog-content">
          <div class="conflict-info">
            <h3>${this.escapeHtml(conflict.local.title)}</h3>
            <p class="conflict-description">
              This document has been modified both locally and on GitHub. 
              Choose how to resolve the conflict:
            </p>
          </div>

          <div class="conflict-versions">
            <div class="version-panel local-version">
              <div class="version-header">
                <h4>📱 Local Version</h4>
                <div class="version-meta">
                  Modified: ${this.formatDate(conflict.local.updatedAt)}
                </div>
              </div>
              <div class="version-content">
                <div class="version-preview">
                  ${this.getContentPreview(conflict.local.content)}
                </div>
              </div>
            </div>

            <div class="version-panel remote-version">
              <div class="version-header">
                <h4>🐙 GitHub Version</h4>
                <div class="version-meta">
                  Modified: ${this.formatDate(conflict.remote.updatedAt)}
                </div>
              </div>
              <div class="version-content">
                <div class="version-preview">
                  ${this.getContentPreview(conflict.remote.content)}
                </div>
              </div>
            </div>
          </div>

          <div class="conflict-diff">
            <h4>📋 Changes Summary</h4>
            <div class="diff-summary">
              ${this.generateDiffSummary(conflict)}
            </div>
          </div>
        </div>

        <div class="conflict-dialog-actions">
          <div class="resolution-options">
            <button class="resolution-btn use-local" data-resolution="local">
              <span class="btn-icon">📱</span>
              <span class="btn-text">
                <strong>Use Local</strong>
                <small>Keep your changes, overwrite GitHub</small>
              </span>
            </button>

            <button class="resolution-btn use-remote" data-resolution="remote">
              <span class="btn-icon">🐙</span>
              <span class="btn-text">
                <strong>Use GitHub</strong>
                <small>Keep GitHub changes, overwrite local</small>
              </span>
            </button>

            <button class="resolution-btn merge-changes" data-resolution="merge">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">
                <strong>Merge Both</strong>
                <small>Combine both versions with conflict markers</small>
              </span>
            </button>
          </div>

          <div class="dialog-nav">
            ${
              this.currentConflictIndex > 0
                ? '<button class="nav-btn prev-conflict">← Previous</button>'
                : '<div></div>'
            }
            
            <button class="cancel-btn">Cancel All</button>
            
            ${
              this.currentConflictIndex < total - 1
                ? '<button class="nav-btn next-conflict">Skip →</button>'
                : '<div></div>'
            }
          </div>
        </div>
      </div>
    `
  }

  /**
   * Get content preview with syntax highlighting
   * @param {string} content - Document content
   * @returns {string} HTML preview
   */
  getContentPreview(content) {
    if (!content) return '<em>Empty document</em>'

    // Limit preview to first 500 characters
    const preview = content.substring(0, 500)
    const truncated = content.length > 500

    // Basic markdown highlighting
    let highlighted = this.escapeHtml(preview)
      .replace(/^(#{1,6})\s(.+)$/gm, '<span class="md-heading">$1 $2</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')

    if (truncated) {
      highlighted += '\n<span class="truncated">... (truncated)</span>'
    }

    return `<pre class="content-preview">${highlighted}</pre>`
  }

  /**
   * Generate diff summary
   * @param {Object} conflict - Conflict object
   * @returns {string} HTML diff summary
   */
  generateDiffSummary(conflict) {
    const local = conflict.local
    const remote = conflict.remote
    const changes = []

    // Check for title differences
    if (local.title !== remote.title) {
      changes.push(`<div class="diff-item title-diff">
        <strong>Title:</strong> 
        <span class="diff-local">"${this.escapeHtml(local.title)}"</span> vs 
        <span class="diff-remote">"${this.escapeHtml(remote.title)}"</span>
      </div>`)
    }

    // Check for content differences
    if (local.checksum !== remote.checksum) {
      const localWords = (local.content || '').split(/\s+/).length
      const remoteWords = (remote.content || '').split(/\s+/).length

      changes.push(`<div class="diff-item content-diff">
        <strong>Content:</strong> 
        Local: ${localWords} words, GitHub: ${remoteWords} words
      </div>`)
    }

    // Check for tag differences
    const localTags = local.tags || []
    const remoteTags = remote.tags || []
    const tagsDiffer = JSON.stringify(localTags.sort()) !== JSON.stringify(remoteTags.sort())

    if (tagsDiffer) {
      changes.push(`<div class="diff-item tags-diff">
        <strong>Tags:</strong> 
        <span class="diff-local">[${localTags.join(', ')}]</span> vs 
        <span class="diff-remote">[${remoteTags.join(', ')}]</span>
      </div>`)
    }

    return changes.length > 0 ? changes.join('') : '<em>No specific differences detected</em>'
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.element) return

    // Close button
    const closeBtn = this.element.querySelector('.conflict-close-btn')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.handleCancel())
    }

    // Resolution buttons
    const resolutionBtns = this.element.querySelectorAll('.resolution-btn')
    resolutionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const resolution = e.currentTarget.dataset.resolution
        this.handleResolve(resolution)
      })
    })

    // Navigation buttons
    const prevBtn = this.element.querySelector('.prev-conflict')
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.navigateConflict(-1))
    }

    const nextBtn = this.element.querySelector('.next-conflict')
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.navigateConflict(1))
    }

    // Cancel button
    const cancelBtn = this.element.querySelector('.cancel-btn')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel())
    }

    // Close on overlay click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.handleCancel()
      }
    })

    // Close on escape key
    document.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeydown(e) {
    if (!this.isOpen) return

    switch (e.key) {
      case 'Escape':
        this.handleCancel()
        break
      case 'ArrowLeft':
        if (e.ctrlKey || e.metaKey) {
          this.navigateConflict(-1)
        }
        break
      case 'ArrowRight':
        if (e.ctrlKey || e.metaKey) {
          this.navigateConflict(1)
        }
        break
      case '1':
        if (e.ctrlKey || e.metaKey) {
          this.handleResolve('local')
        }
        break
      case '2':
        if (e.ctrlKey || e.metaKey) {
          this.handleResolve('remote')
        }
        break
      case '3':
        if (e.ctrlKey || e.metaKey) {
          this.handleResolve('merge')
        }
        break
    }
  }

  /**
   * Navigate between conflicts
   * @param {number} direction - Direction to navigate (-1 or 1)
   */
  navigateConflict(direction) {
    const newIndex = this.currentConflictIndex + direction

    if (newIndex >= 0 && newIndex < this.conflicts.length) {
      this.currentConflictIndex = newIndex
      this.render()
      this.attachEventListeners()
    }
  }

  /**
   * Handle conflict resolution
   * @param {string} resolution - Resolution strategy ('local', 'remote', 'merge')
   */
  handleResolve(resolution) {
    const conflict = this.conflicts[this.currentConflictIndex]

    if (this.onResolve) {
      this.onResolve(conflict.id, resolution)
    }

    // Remove resolved conflict
    this.conflicts.splice(this.currentConflictIndex, 1)

    // Check if there are more conflicts
    if (this.conflicts.length === 0) {
      this.hide()
    } else {
      // Adjust index if we removed the last conflict
      if (this.currentConflictIndex >= this.conflicts.length) {
        this.currentConflictIndex = this.conflicts.length - 1
      }

      this.render()
      this.attachEventListeners()
    }
  }

  /**
   * Handle dialog cancellation
   */
  handleCancel() {
    if (this.onCancel) {
      this.onCancel()
    }
    this.hide()
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  /**
   * Escape HTML characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * Remove event listeners
   */
  cleanup() {
    document.removeEventListener('keydown', this.handleKeydown.bind(this))
  }
}
