/**
 * Documents Tab - Document listing with recent section and sync status
 * Enhanced version of FileTree with GitHub sync indicators
 */

export class DocumentsTab {
  constructor(container, app) {
    this.container = container
    this.app = app
    this.documents = []
    this.recentDocuments = []
    this.selectedDocumentId = null
    this.filter = ''

    // Restore recent section height from localStorage
    const savedHeight = localStorage.getItem('recent-section-height')
    this.recentSectionHeight = savedHeight ? parseInt(savedHeight) : 120

    this.init()
  }

  init() {
    this.container.className = 'documents-tab'
    this.container.setAttribute('tabindex', '0')
    this.container.setAttribute('role', 'listbox')
    this.container.setAttribute('aria-label', 'Document list')

    this.render()
    this.attachEventListeners()
    this.loadDocuments()
  }

  render() {
    this.container.innerHTML = `
      <div class="documents-header">
        <div class="documents-filter">
          <input type="text" 
                 class="filter-input" 
                 placeholder="Filter documents..." 
                 aria-label="Filter documents">
          <button class="filter-clear" aria-label="Clear filter" style="display: none;">✕</button>
        </div>
      </div>
      <div class="documents-content">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>Loading documents...</span>
        </div>
      </div>
    `
  }

  async loadDocuments() {
    try {
      this.documents = await this.app.storageManager.getAllDocuments()
      this.updateRecentDocuments()
      this.renderDocuments()
    } catch (error) {
      console.error('Failed to load documents:', error)
      this.showError('Failed to load documents')
    }
  }

  updateRecentDocuments() {
    // Get recent documents from localStorage
    let recentIds = JSON.parse(localStorage.getItem('recent-documents') || '[]')

    // If no recent documents exist, initialize with most recently modified documents
    if (recentIds.length === 0 && this.documents.length > 0) {
      const sortedDocs = [...this.documents].sort((a, b) => {
        const dateA = new Date(a.metadata?.modified || a.updatedAt || 0)
        const dateB = new Date(b.metadata?.modified || b.updatedAt || 0)
        return dateB - dateA // Most recent first
      })

      // Take up to 3 most recently modified documents for recent, leave rest for previous
      const maxRecent = Math.min(3, this.documents.length)
      recentIds = sortedDocs.slice(0, maxRecent).map((doc) => doc.id)
      localStorage.setItem('recent-documents', JSON.stringify(recentIds))
    }

    this.recentDocuments = recentIds
      .map((id) => this.documents.find((doc) => doc.id === id))
      .filter((doc) => doc !== undefined)
      .slice(0, 3) // Keep only 3 most recent
  }

  renderDocuments() {
    const content = this.container.querySelector('.documents-content')

    if (this.documents.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>No documents yet</p>
          <small>Press <kbd>Ctrl+Space</kbd> and type <strong>:n</strong> to create your first document</small>
        </div>
      `
      return
    }

    let html = '<div class="documents-list">'
    const renderedDocumentIds = new Set()

    // Always show Recent section if there are recent documents
    if (this.recentDocuments.length > 0) {
      let recentToShow = this.recentDocuments

      // Apply filter to recent documents if filtering
      if (this.filter) {
        recentToShow = this.filterDocuments(this.recentDocuments)
      }

      if (recentToShow.length > 0) {
        html += this.renderRecentSection(recentToShow)
        // Track rendered document IDs
        recentToShow.forEach((doc) => renderedDocumentIds.add(doc.id))
      }
    }

    // Previous documents group - exclude already rendered recent documents
    const allDocuments = this.filter ? this.filterDocuments(this.documents) : this.documents
    const filteredDocuments = allDocuments.filter((doc) => !renderedDocumentIds.has(doc.id))
    const groups = this.groupDocuments(filteredDocuments)

    for (const [groupName, docs] of Object.entries(groups)) {
      html += this.renderGroup(groupName, docs)
    }

    html += '</div>'
    content.innerHTML = html

    // Separator removed - no listeners needed
  }

  renderRecentSection(recentToShow = this.recentDocuments) {
    let html = `
      <div class="documents-group recent-group">
        <div class="group-header">
          <span class="group-title">Recent</span>
          <span class="group-count">${recentToShow.length}</span>
        </div>
        <div class="group-items recent-items">
    `

    for (const doc of recentToShow) {
      html += this.renderDocumentItem(doc, true)
    }

    html += `
        </div>
      </div>
    `

    return html
  }

  renderGroup(groupName, documents) {
    let html = `
      <div class="documents-group">
        <div class="group-header">
          <span class="group-title">${groupName}</span>
          <span class="group-count">${documents.length}</span>
        </div>
        <div class="group-items">
    `

    for (const doc of documents) {
      html += this.renderDocumentItem(doc)
    }

    html += `
        </div>
      </div>
    `

    return html
  }

  renderDocumentItem(doc, isRecent = false) {
    const isSelected = doc.id === this.selectedDocumentId
    const syncStatus = this.getDocumentSyncStatus(doc)
    const timeAgo = this.formatTimeAgo(doc.updatedAt || doc.metadata?.modified)

    return `
      <div class="document-item ${isSelected ? 'selected' : ''} ${isRecent ? 'recent-item' : ''}" 
           data-doc-id="${doc.id}"
           role="option"
           aria-selected="${isSelected}">
        <div class="document-main">
          <div class="document-title-row">
            <span class="document-title">${this.escapeHtml(doc.title)}</span>
            ${this.renderDocumentIndicators(doc)}
            ${
              syncStatus.icon
                ? `
              <span class="document-sync-status ${syncStatus.class}" 
                    title="${syncStatus.tooltip}">
                ${syncStatus.icon}
              </span>
            `
                : ''
            }
          </div>
          <div class="document-meta">
            <span class="document-time">${timeAgo}</span>
            ${
              doc.tags && doc.tags.length > 0
                ? `
              <div class="document-tags">
                ${doc.tags
                  .slice(0, 3)
                  .map((tag) => `<span class="doc-tag">${this.escapeHtml(tag)}</span>`)
                  .join('')}
                ${doc.tags.length > 3 ? `<span class="doc-tag-more">+${doc.tags.length - 3}</span>` : ''}
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `
  }

  getDocumentSyncStatus(doc) {
    // Check GitHub sync status
    const hasGitHubMetadata = doc.githubSha && doc.githubPath
    const isAuthenticated = this.app.githubAuth?.isAuthenticated()
    const config = this.app.githubStorage?.getConfig()
    const isConfigured = config?.configured

    if (!isAuthenticated || !isConfigured) {
      return {
        icon: '',
        class: 'no-sync',
        tooltip: 'Git repository not configured'
      }
    }

    if (!hasGitHubMetadata) {
      return {
        icon: '🔴',
        class: 'local-only',
        tooltip: 'Local only - never synced to Git repository'
      }
    }

    const lastSynced = doc.lastSyncedAt ? new Date(doc.lastSyncedAt) : null
    const lastModified = doc.metadata?.modified
      ? new Date(doc.metadata.modified)
      : doc.updatedAt
        ? new Date(doc.updatedAt)
        : null

    if (lastSynced && lastModified && lastSynced >= lastModified) {
      return {
        icon: '🟢',
        class: 'synced',
        tooltip: 'Synced with Git repository'
      }
    }

    return {
      icon: '🟡',
      class: 'out-of-sync',
      tooltip: 'Out of sync - local changes need push'
    }
  }

  filterDocuments(documents) {
    if (!this.filter) return documents

    const lowerFilter = this.filter.toLowerCase()
    return documents.filter((doc) => {
      // Search in title
      if (doc.title.toLowerCase().includes(lowerFilter)) return true

      // Search in tags
      if (doc.tags && doc.tags.some((tag) => tag.toLowerCase().includes(lowerFilter))) return true

      // Search in content (first 200 chars)
      if (doc.content && doc.content.substring(0, 200).toLowerCase().includes(lowerFilter))
        return true

      return false
    })
  }

  sortDocuments(documents) {
    // Simple sort by modification date (newest first)
    return [...documents].sort((a, b) => {
      const dateA = new Date(a.metadata?.modified || a.updatedAt || 0)
      const dateB = new Date(b.metadata?.modified || b.updatedAt || 0)
      return dateB - dateA
    })
  }

  groupDocuments(documents) {
    // Simple grouping: just "PREVIOUS" for non-recent documents
    // Documents are already filtered at the caller level to exclude recent docs

    if (documents.length === 0) {
      return {}
    }

    // Sort documents by modification date (newest first)
    const sortedDocuments = [...documents].sort((a, b) => {
      const dateA = new Date(a.metadata?.modified || a.updatedAt || 0)
      const dateB = new Date(b.metadata?.modified || b.updatedAt || 0)
      return dateB - dateA
    })

    return {
      Previous: sortedDocuments
    }
  }

  attachEventListeners() {
    // Document selection
    this.container.addEventListener('click', (e) => {
      const item = e.target.closest('.document-item')
      if (item) {
        const docId = item.dataset.docId
        this.selectDocument(docId)
      }
    })

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.navigateDocuments(e.key === 'ArrowDown' ? 1 : -1)
      } else if (e.key === 'Enter') {
        const selected = this.container.querySelector('.document-item.selected')
        if (selected) {
          this.selectDocument(selected.dataset.docId)
        }
      }
    })

    // Filter input
    this.container.addEventListener('input', (e) => {
      if (e.target.classList.contains('filter-input')) {
        this.filter = e.target.value
        this.renderDocuments()

        // Show/hide clear button
        const clearBtn = this.container.querySelector('.filter-clear')
        clearBtn.style.display = this.filter ? 'block' : 'none'
      }
    })

    // Clear filter
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-clear')) {
        this.filter = ''
        this.container.querySelector('.filter-input').value = ''
        this.container.querySelector('.filter-clear').style.display = 'none'
        this.renderDocuments()
      }
    })
  }

  navigateDocuments(direction) {
    const items = this.container.querySelectorAll('.document-item')
    if (items.length === 0) return

    const currentIndex = Array.from(items).findIndex((item) => item.classList.contains('selected'))

    let newIndex
    if (currentIndex === -1) {
      newIndex = direction > 0 ? 0 : items.length - 1
    } else {
      newIndex = currentIndex + direction
      if (newIndex < 0) newIndex = items.length - 1
      if (newIndex >= items.length) newIndex = 0
    }

    // Update selection
    items.forEach((item) => item.classList.remove('selected'))
    items[newIndex].classList.add('selected')
    items[newIndex].scrollIntoView({ block: 'nearest' })

    this.selectedDocumentId = items[newIndex].dataset.docId
  }

  async selectDocument(docId) {
    if (!docId) return

    try {
      const document = await this.app.storageManager.getDocument(docId)
      if (document) {
        this.selectedDocumentId = docId
        this.updateSelection()

        // Update recent documents
        this.addToRecent(docId)

        // Load document in editor
        this.app.loadDocument(document)
      }
    } catch (error) {
      console.error('Failed to load document:', error)
    }
  }

  updateSelection() {
    this.container.querySelectorAll('.document-item').forEach((item) => {
      const isSelected = item.dataset.docId === this.selectedDocumentId
      item.classList.toggle('selected', isSelected)
      item.setAttribute('aria-selected', isSelected)
    })
  }

  addToRecent(docId) {
    let recentIds = JSON.parse(localStorage.getItem('recent-documents') || '[]')

    // Remove if already exists
    recentIds = recentIds.filter((id) => id !== docId)

    // Add to beginning
    recentIds.unshift(docId)

    // Keep only 6 most recent (show 3, keep 3 in history)
    recentIds = recentIds.slice(0, 6)

    localStorage.setItem('recent-documents', JSON.stringify(recentIds))

    // Update recent documents list
    this.updateRecentDocuments()
  }

  // Public methods
  async refresh() {
    await this.loadDocuments()
  }

  applyFilter(filter) {
    this.filter = filter
    const input = this.container.querySelector('.filter-input')
    if (input) {
      input.value = filter
    }
    this.renderDocuments()
  }

  setSelectedDocument(docId) {
    this.selectedDocumentId = docId
    this.updateSelection()
  }

  addDocument(document) {
    this.documents.unshift(document)

    // Add new document to recent documents
    this.addToRecent(document.id)

    this.renderDocuments()
  }

  updateDocument(document) {
    const index = this.documents.findIndex((doc) => doc.id === document.id)
    if (index !== -1) {
      this.documents[index] = document

      // Update recent documents if this document is in the recent list
      const recentIndex = this.recentDocuments.findIndex((doc) => doc.id === document.id)
      if (recentIndex !== -1) {
        this.recentDocuments[recentIndex] = document
      }

      this.renderDocuments()
    }
  }

  removeDocument(docId) {
    this.documents = this.documents.filter((doc) => doc.id !== docId)
    if (this.selectedDocumentId === docId) {
      this.selectedDocumentId = null
    }
    this.renderDocuments()
  }

  onActivate() {
    // Called when tab becomes active
    this.refresh()
  }

  focusFilterInput() {
    const input = this.container.querySelector('.filter-input')
    if (input) {
      setTimeout(() => {
        input.focus()
        input.select()
      }, 100)
    }
  }

  // Utility methods

  formatTimeAgo(dateString) {
    if (!dateString) return 'No date'

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid date'

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  attachSeparatorListeners() {
    const separator = this.container.querySelector('.recent-separator')
    if (!separator) return

    // Clean up any existing listeners to prevent duplicates
    if (this.separatorMouseDown) {
      separator.removeEventListener('mousedown', this.separatorMouseDown)
    }
    if (this.documentMouseMove) {
      document.removeEventListener('mousemove', this.documentMouseMove)
    }
    if (this.documentMouseUp) {
      document.removeEventListener('mouseup', this.documentMouseUp)
    }

    let isResizing = false
    let startY = 0
    let startHeight = 0

    this.separatorMouseDown = (e) => {
      console.log('Separator mousedown triggered') // Debug
      isResizing = true
      startY = e.clientY
      startHeight = this.recentSectionHeight
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      e.preventDefault()
    }

    this.documentMouseMove = (e) => {
      if (!isResizing) return

      const diff = e.clientY - startY
      const newHeight = Math.max(60, Math.min(400, startHeight + diff))

      this.recentSectionHeight = newHeight

      // Update the section height
      const recentGroup = this.container.querySelector('.recent-group')
      const recentItems = this.container.querySelector('.recent-items')
      if (recentGroup && recentItems) {
        recentGroup.style.maxHeight = `${newHeight}px`
        recentItems.style.maxHeight = `${newHeight - 40}px`
      }
    }

    this.documentMouseUp = () => {
      if (isResizing) {
        isResizing = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''

        // Save height preference
        localStorage.setItem('recent-section-height', this.recentSectionHeight)
      }
    }

    separator.addEventListener('mousedown', this.separatorMouseDown)
    document.addEventListener('mousemove', this.documentMouseMove)
    document.addEventListener('mouseup', this.documentMouseUp)
  }

  renderDocumentIndicators(doc) {
    // No indicators shown in document list
    return ''
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  showError(message) {
    const content = this.container.querySelector('.documents-content')
    content.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <p>${message}</p>
        <button class="retry-btn">Retry</button>
      </div>
    `

    content.querySelector('.retry-btn').addEventListener('click', () => {
      this.loadDocuments()
    })
  }
}
