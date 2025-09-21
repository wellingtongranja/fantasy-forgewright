/**
 * Documents Tab - Enhanced document listing with Git integration and virtual scrolling
 *
 * Features:
 * - RECENT/PREVIOUS document organization
 * - Real-time Git sync status indicators
 * - Inline Git action buttons (push, pull, diff)
 * - Debounced filtering for performance
 * - Sorting options with persistent preferences
 * - Virtual scrolling for large document lists (100+ items)
 * - Enhanced keyboard navigation
 * - Context menu support
 *
 * @class DocumentsTab
 * @example
 * const documentsTab = new DocumentsTab(container, app)
 * documentsTab.applyFilter('search term')
 * documentsTab.setSortBy('modified')
 */
export class DocumentsTab {
  /**
   * Create a DocumentsTab instance
   * @param {HTMLElement} container - Container element for the documents tab
   * @param {Object} app - Main application instance with storageManager, authManager, etc.
   */
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

    // Debouncing for filter performance
    this.filterTimeout = null
    this.FILTER_DEBOUNCE_DELAY = 300 // ms

    // Sorting preferences
    this.sortBy = localStorage.getItem('documents-sort-by') || 'recent'

    // Virtual scrolling for performance
    this.virtualScrolling = {
      enabled: false,
      itemHeight: 60, // Estimated height per document item
      containerHeight: 0,
      scrollTop: 0,
      visibleStart: 0,
      visibleEnd: 0,
      buffer: 5 // Extra items to render above/below visible area
    }

    this.init()
  }

  /**
   * Initialize the documents tab component
   * Sets up DOM structure, event listeners, and loads documents
   * @private
   */
  init() {
    this.container.className = 'documents-tab'
    this.container.setAttribute('tabindex', '0')
    this.container.setAttribute('role', 'listbox')
    this.container.setAttribute('aria-label', 'Document list')

    this.render()
    this.attachEventListeners()
    this.loadDocuments()
  }

  /**
   * Render the basic DOM structure for the documents tab
   * Creates header with filter and sort controls, and content area
   * @private
   */
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
        <div class="documents-sort">
          <select class="sort-select" aria-label="Sort documents">
            <option value="recent">Recent</option>
            <option value="modified">Modified</option>
            <option value="title">Title</option>
            <option value="tags">Tags</option>
            <option value="sync">Sync Status</option>
          </select>
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

  /**
   * Load all documents from storage and render the list
   * Applies recent document logic, sorting, and virtual scrolling as needed
   * @async
   * @throws {Error} When document loading fails
   */
  async loadDocuments() {
    try {
      this.documents = await this.app.storageManager.getAllDocuments()
      this.updateRecentDocuments()
      this.applySorting()
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
    console.log(`[NAVIGATOR] renderDocuments called, documents.length: ${this.documents.length}`)
    const content = this.container.querySelector('.documents-content')

    // Initialize sort select if needed
    this.initializeSortSelect()

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

    // Check if virtual scrolling should be enabled
    const shouldUseVirtualScrolling = this.documents.length > 100

    if (shouldUseVirtualScrolling && !this.virtualScrolling.enabled) {
      this.enableVirtualScrolling()
    } else if (!shouldUseVirtualScrolling && this.virtualScrolling.enabled) {
      this.disableVirtualScrolling()
    }

    if (this.virtualScrolling.enabled) {
      this.renderDocumentsVirtual()
    } else {
      this.renderDocumentsNormal()
    }
  }

  renderDocumentsNormal() {
    const content = this.container.querySelector('.documents-content')
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
  }

  renderDocumentsVirtual() {
    const content = this.container.querySelector('.documents-content')

    // Prepare flat list for virtual scrolling
    const allDocuments = this.filter ? this.filterDocuments(this.documents) : this.documents
    this.virtualScrolling.containerHeight = content.clientHeight
    this.calculateVisibleRange(allDocuments.length)

    const visibleDocuments = allDocuments.slice(
      this.virtualScrolling.visibleStart,
      this.virtualScrolling.visibleEnd
    )

    // Create virtual scrolling container
    const totalHeight = allDocuments.length * this.virtualScrolling.itemHeight
    const offsetY = this.virtualScrolling.visibleStart * this.virtualScrolling.itemHeight

    let html = `
      <div class="virtual-scrolling-container" style="height: ${totalHeight}px; position: relative;">
        <div class="virtual-scrolling-content" style="transform: translateY(${offsetY}px);">
    `

    // Render only visible documents
    for (const doc of visibleDocuments) {
      html += this.renderDocumentItem(doc, false)
    }

    html += `
        </div>
      </div>
    `

    content.innerHTML = html

    // Add scroll listener for virtual scrolling
    if (!content.dataset.virtualScrollingAttached) {
      content.addEventListener('scroll', () => this.onVirtualScroll())
      content.dataset.virtualScrollingAttached = 'true'
    }
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
    const isAuthenticated = this.app.authManager?.isAuthenticated()
    const isConfigured = this.app.githubStorage?.getConfig()?.configured

    return `
      <div class="document-item ${isSelected ? 'selected' : ''} ${isRecent ? 'recent-item' : ''}"
           data-doc-id="${doc.id}"
           role="option"
           aria-selected="${isSelected}"
           tabindex="0">
        <div class="document-main">
          <div class="document-header">
            <div class="document-title-row">
              <span class="document-title">${this.escapeHtml(doc.title)}</span>
              ${this.renderDocumentIndicators(doc)}
            </div>
            <div class="document-actions">
              ${this.renderSyncIndicator(syncStatus)}
              ${isAuthenticated && isConfigured ? this.renderGitActions(doc, syncStatus) : ''}
            </div>
          </div>
          <div class="document-meta">
            <div class="document-meta-left">
              <span class="document-time">${timeAgo}</span>
              ${this.renderWordCount(doc)}
            </div>
            <div class="document-meta-right">
              ${this.renderTags(doc)}
            </div>
          </div>
          ${this.renderSyncDetails(doc, syncStatus)}
        </div>
      </div>
    `
  }

  getDocumentSyncStatus(doc) {
    // BULLETPROOF SOLUTION: Ensure identical data source with status bar
    // Both navigator and status bar MUST use the exact same document instance

    if (!this.app.syncStatusManager) {
      return {
        icon: '',
        class: 'no-sync',
        tooltip: 'Sync status manager not available'
      }
    }

    // CRITICAL: For current document, ALWAYS use app.currentDocument instance
    // This guarantees navigator and status bar use identical data, eliminating inconsistencies
    if (this.app.currentDocument && this.app.currentDocument.id === doc.id) {
      console.log(`[NAVIGATOR] Using app.currentDocument for sync status:`, {
        id: this.app.currentDocument.id,
        title: this.app.currentDocument.title,
        lastSyncedAt: this.app.currentDocument.lastSyncedAt,
        'metadata.modified': this.app.currentDocument.metadata?.modified
      })
      // Use the same document instance that status bar uses via getCurrentDocumentStatus()
      return this.app.syncStatusManager.getDocumentSyncStatus(this.app.currentDocument, 'nav')
    }

    // For other documents, use the sync status manager with the document we have
    console.log(`[NAVIGATOR] Using passed doc for sync status:`, {
      id: doc.id,
      title: doc.title,
      lastSyncedAt: doc.lastSyncedAt,
      'metadata.modified': doc.metadata?.modified
    })
    return this.app.syncStatusManager.getDocumentSyncStatus(doc, 'nav')
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
    // Unified click handler for all document interactions
    this.container.addEventListener('click', (e) => {
      // Handle Git action buttons
      const gitActionBtn = e.target.closest('.git-action-btn')
      if (gitActionBtn) {
        e.stopPropagation()
        this.handleGitAction(gitActionBtn)
        return
      }

      // Handle filter clear button
      if (e.target.classList.contains('filter-clear')) {
        this.filter = ''
        this.container.querySelector('.filter-input').value = ''
        this.container.querySelector('.filter-clear').style.display = 'none'
        this.renderDocuments()
        return
      }

      // Handle document item clicks (selection)
      const documentItem = e.target.closest('.document-item')
      if (documentItem) {
        this.handleDocumentClick(documentItem, e)
        return
      }
    })

    // Enhanced keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e)
    })

    // Context menu for Git operations
    this.container.addEventListener('contextmenu', (e) => {
      const documentItem = e.target.closest('.document-item')
      if (documentItem) {
        e.preventDefault()
        this.showContextMenu(documentItem, e)
      }
    })

    // Double-click to open document
    this.container.addEventListener('dblclick', (e) => {
      const documentItem = e.target.closest('.document-item')
      if (documentItem) {
        this.openDocument(documentItem.dataset.docId)
      }
    })

    // Filter input handling with debouncing
    this.container.addEventListener('input', (e) => {
      if (e.target.classList.contains('filter-input')) {
        const filterValue = e.target.value

        // Show/hide clear button immediately for better UX
        const clearBtn = this.container.querySelector('.filter-clear')
        clearBtn.style.display = filterValue ? 'block' : 'none'

        // Debounce the actual filtering
        this.debouncedFilter(filterValue)
      }
    })

    // Sort selection handling
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('sort-select')) {
        this.setSortBy(e.target.value)
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

    // Update selection and focus
    items.forEach((item) => {
      item.classList.remove('selected')
      item.setAttribute('aria-selected', 'false')
      item.tabIndex = -1
    })

    const selectedItem = items[newIndex]
    selectedItem.classList.add('selected')
    selectedItem.setAttribute('aria-selected', 'true')
    selectedItem.tabIndex = 0
    selectedItem.focus()
    selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

    this.selectedDocumentId = selectedItem.dataset.docId
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

      // Update tabindex for keyboard navigation
      item.tabIndex = isSelected ? 0 : -1
    })
  }

  handleDocumentClick(documentItem, event) {
    const docId = documentItem.dataset.docId

    // Single click - select document
    this.selectedDocumentId = docId
    this.updateSelection()

    // If Ctrl/Cmd key is held, open document as well
    if (event.ctrlKey || event.metaKey) {
      this.openDocument(docId)
    }
  }

  handleGitAction(gitActionBtn) {
    const action = gitActionBtn.dataset.action
    const docId = gitActionBtn.dataset.docId

    switch (action) {
      case 'push':
        this.pushDocument(docId)
        break
      case 'pull':
        this.pullDocument(docId)
        break
      case 'diff':
        this.viewDocumentDiff(docId)
        break
      default:
        console.warn('Unknown Git action:', action)
    }
  }

  handleKeyboardNavigation(event) {
    const { key } = event

    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault()
        this.navigateDocuments(key === 'ArrowDown' ? 1 : -1)
        break

      case 'Home':
        event.preventDefault()
        this.navigateToFirst()
        break

      case 'End':
        event.preventDefault()
        this.navigateToLast()
        break

      case 'PageDown':
        event.preventDefault()
        this.navigateByPage(5) // Navigate down 5 items
        break

      case 'PageUp':
        event.preventDefault()
        this.navigateByPage(-5) // Navigate up 5 items
        break

      case 'Enter':
        event.preventDefault()
        const selected = this.container.querySelector('.document-item.selected')
        if (selected) {
          this.openDocument(selected.dataset.docId)
        }
        break

      case ' ': // Space key
        event.preventDefault()
        const spaceSelected = this.container.querySelector('.document-item.selected')
        if (spaceSelected) {
          this.selectDocument(spaceSelected.dataset.docId)
        }
        break

      case 'F2':
        event.preventDefault()
        const f2Selected = this.container.querySelector('.document-item.selected')
        if (f2Selected) {
          this.renameDocument(f2Selected.dataset.docId)
        }
        break

      case 'Delete':
        if (event.shiftKey) {
          event.preventDefault()
          const deleteSelected = this.container.querySelector('.document-item.selected')
          if (deleteSelected) {
            this.deleteDocument(deleteSelected.dataset.docId)
          }
        }
        break

      case 'Escape':
        event.preventDefault()
        // Clear selection and return focus to filter input
        this.selectedDocumentId = null
        this.updateSelection()
        this.focusFilterInput()
        break

      // Git command shortcuts
      case 'g':
        if (event.ctrlKey) {
          event.preventDefault()
          const gitSelected = this.container.querySelector('.document-item.selected')
          if (gitSelected) {
            this.showGitActionsMenu(gitSelected)
          }
        }
        break
    }
  }

  showContextMenu(documentItem, event) {
    const docId = documentItem.dataset.docId
    const doc = this.documents.find(d => d.id === docId)
    if (!doc) return

    const syncStatus = this.getDocumentSyncStatus(doc)
    const isAuthenticated = this.app.authManager?.isAuthenticated()
    const isConfigured = this.app.githubStorage?.getConfig()?.configured

    // Create context menu items
    const menuItems = [
      { label: 'Open', action: () => this.openDocument(docId), icon: '📖' },
      { label: 'Rename', action: () => this.renameDocument(docId), icon: '✏️' }
    ]

    // Add Git operations if available
    if (isAuthenticated && isConfigured) {
      menuItems.push({ type: 'separator' })

      if (syncStatus.class === 'out-of-sync') {
        menuItems.push({
          label: 'Push Changes',
          action: () => this.pushDocument(docId),
          icon: '⬆️',
          shortcut: ':gpu'
        })
        menuItems.push({
          label: 'View Diff',
          action: () => this.viewDocumentDiff(docId),
          icon: '👁️',
          shortcut: ':gdf'
        })
      }

      if (syncStatus.class !== 'local-only') {
        menuItems.push({
          label: 'Pull Latest',
          action: () => this.pullDocument(docId),
          icon: '⬇️',
          shortcut: ':gpl'
        })
      }
    }

    menuItems.push({ type: 'separator' })
    menuItems.push({
      label: 'Delete',
      action: () => this.deleteDocument(docId),
      icon: '🗑️',
      className: 'danger'
    })

    // Show context menu (this would integrate with a context menu component)
    this.showDocumentContextMenu(event.clientX, event.clientY, menuItems)
  }

  async openDocument(docId) {
    try {
      const document = await this.app.storageManager.getDocument(docId)
      if (document) {
        // Add to recent documents
        this.addToRecent(docId)
        // Load document in editor
        this.app.loadDocument(document)
      }
    } catch (error) {
      console.error('Failed to open document:', error)
      this.app.showNotification?.('Failed to open document', 'error')
    }
  }

  async pushDocument(docId) {
    if (!this.app.gitService) {
      this.app.showNotification?.('Git service not available', 'error')
      return
    }

    this.app.showNotification?.('Pushing document...', 'info')

    const result = await this.app.gitService.pushDocument(docId)

    if (result.success) {
      this.app.showNotification?.(result.message, 'success')
      // GitService already calls syncStatusManager.updateAll() which updates navigator
      // No need for additional renderDocuments() call which uses stale cached data
    } else {
      this.app.showNotification?.(result.message, 'error')
    }
  }

  async pullDocument(docId) {
    if (!this.app.gitService) {
      this.app.showNotification?.('Git service not available', 'error')
      return
    }

    this.app.showNotification?.('Pulling document...', 'info')

    const result = await this.app.gitService.pullDocument(docId)

    if (result.success) {
      this.app.showNotification?.(result.message, 'success')
      // GitService already calls syncStatusManager.updateAll() which updates navigator
      // No need for additional renderDocuments() call which uses stale cached data
    } else {
      this.app.showNotification?.(result.message, 'error')
    }
  }

  async viewDocumentDiff(docId) {
    // This would open a diff viewer showing local vs remote changes
    console.log('View diff for document:', docId)
    this.app.showNotification?.('Diff viewer not yet implemented', 'info')
  }

  showDocumentContextMenu(x, y, menuItems) {
    // This would show a context menu at the specified coordinates
    // For now, just log the menu items
    console.log('Context menu at', x, y, 'with items:', menuItems)
  }

  async renameDocument(docId) {
    // This would show a rename dialog
    console.log('Rename document:', docId)
    this.app.showNotification?.('Rename functionality not yet implemented', 'info')
  }

  async deleteDocument(docId) {
    if (!docId) {
      const selected = this.container.querySelector('.document-item.selected')
      if (!selected) return
      docId = selected.dataset.docId
    }

    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await this.app.storageManager.deleteDocument(docId)
        this.app.showNotification?.('Document deleted', 'success')
        this.renderDocuments()
      } catch (error) {
        console.error('Failed to delete document:', error)
        this.app.showNotification?.('Failed to delete document', 'error')
      }
    }
  }

  navigateToFirst() {
    const items = this.container.querySelectorAll('.document-item')
    if (items.length === 0) return

    this.setSelection(items[0])
  }

  navigateToLast() {
    const items = this.container.querySelectorAll('.document-item')
    if (items.length === 0) return

    this.setSelection(items[items.length - 1])
  }

  navigateByPage(direction) {
    const items = this.container.querySelectorAll('.document-item')
    if (items.length === 0) return

    const currentIndex = Array.from(items).findIndex((item) => item.classList.contains('selected'))
    let newIndex

    if (currentIndex === -1) {
      newIndex = direction > 0 ? 0 : items.length - 1
    } else {
      newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction))
    }

    this.setSelection(items[newIndex])
  }

  setSelection(item) {
    // Clear all selections
    this.container.querySelectorAll('.document-item').forEach((el) => {
      el.classList.remove('selected')
      el.setAttribute('aria-selected', 'false')
      el.tabIndex = -1
    })

    // Set new selection
    item.classList.add('selected')
    item.setAttribute('aria-selected', 'true')
    item.tabIndex = 0
    item.focus()
    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

    this.selectedDocumentId = item.dataset.docId
  }

  showGitActionsMenu(documentItem) {
    // Show a quick Git actions menu for keyboard users
    const docId = documentItem.dataset.docId
    const doc = this.documents.find(d => d.id === docId)
    if (!doc) return

    const syncStatus = this.getDocumentSyncStatus(doc)
    const actions = []

    if (syncStatus.class === 'out-of-sync') {
      actions.push({ key: 'p', label: 'Push changes', action: () => this.pushDocument(docId) })
      actions.push({ key: 'd', label: 'View diff', action: () => this.viewDocumentDiff(docId) })
    }

    if (syncStatus.class !== 'local-only') {
      actions.push({ key: 'l', label: 'Pull latest', action: () => this.pullDocument(docId) })
    }

    if (actions.length === 0) {
      this.app.showNotification?.('No Git actions available for this document', 'info')
      return
    }

    // For now, just show available actions in notification
    const actionLabels = actions.map(a => `${a.key.toUpperCase()}: ${a.label}`).join(' | ')
    this.app.showNotification?.(`Git actions: ${actionLabels}`, 'info')
  }

  /**
   * Apply debounced filtering to avoid excessive re-rendering during fast typing
   * @param {string} filterValue - The filter text to apply
   * @private
   */
  debouncedFilter(filterValue) {
    // Clear existing timeout
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout)
    }

    // Set new timeout for debounced filtering
    this.filterTimeout = setTimeout(() => {
      this.applyFilterOptimized(filterValue)
      this.filterTimeout = null
    }, this.FILTER_DEBOUNCE_DELAY)
  }

  applyFilterOptimized(filterValue) {
    // Store previous filter for comparison
    const previousFilter = this.filter
    this.filter = filterValue

    // If filter is cleared, just re-render
    if (!filterValue) {
      this.renderDocuments()
      return
    }

    // If filter is just extended (e.g., "te" -> "test"), we can optimize
    if (previousFilter && filterValue.startsWith(previousFilter)) {
      this.optimizedFilter(filterValue)
    } else {
      // Full re-render for new or shortened filters
      this.renderDocuments()
    }
  }

  optimizedFilter(filterValue) {
    // Hide items that don't match the new filter
    const items = this.container.querySelectorAll('.document-item')
    const lowerFilter = filterValue.toLowerCase()

    items.forEach(item => {
      const docId = item.dataset.docId
      const doc = this.documents.find(d => d.id === docId)

      if (doc && this.documentMatchesFilter(doc, lowerFilter)) {
        item.style.display = ''
      } else {
        item.style.display = 'none'
      }
    })

    this.updateGroupCounts()
  }

  documentMatchesFilter(doc, lowerFilter) {
    // Search in title
    if (doc.title.toLowerCase().includes(lowerFilter)) return true

    // Search in tags
    if (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(lowerFilter))) return true

    // Search in content (first 500 chars for performance)
    if (doc.content) {
      const contentPreview = doc.content.substring(0, 500).toLowerCase()
      if (contentPreview.includes(lowerFilter)) return true
    }

    return false
  }

  updateGroupCounts() {
    // Update group counts to reflect filtered items
    const groups = this.container.querySelectorAll('.documents-group')

    groups.forEach(group => {
      const visibleItems = group.querySelectorAll('.document-item:not([style*="display: none"])')
      const countElement = group.querySelector('.group-count')

      if (countElement) {
        countElement.textContent = visibleItems.length
      }

      // Hide empty groups
      group.style.display = visibleItems.length > 0 ? '' : 'none'
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

  /**
   * Set the document sorting method and persist preference
   * @param {string} sortBy - Sort method: 'recent', 'modified', 'title', 'tags', 'sync'
   * @public
   */
  setSortBy(sortBy) {
    this.sortBy = sortBy
    localStorage.setItem('documents-sort-by', sortBy)

    // Update UI
    const sortSelect = this.container.querySelector('.sort-select')
    if (sortSelect) {
      sortSelect.value = sortBy
    }

    this.applySorting()
    this.renderDocuments()
  }

  applySorting() {
    switch (this.sortBy) {
      case 'title':
        this.documents.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'modified':
        this.documents.sort((a, b) => {
          const dateA = new Date(a.metadata?.modified || a.updatedAt || 0)
          const dateB = new Date(b.metadata?.modified || b.updatedAt || 0)
          return dateB - dateA // Most recent first
        })
        break
      case 'tags':
        this.documents.sort((a, b) => {
          const tagsA = (a.tags || []).join(', ').toLowerCase()
          const tagsB = (b.tags || []).join(', ').toLowerCase()
          return tagsA.localeCompare(tagsB)
        })
        break
      case 'sync':
        this.documents.sort((a, b) => {
          const statusA = this.getDocumentSyncStatus(a).class
          const statusB = this.getDocumentSyncStatus(b).class
          const statusOrder = { 'synced': 0, 'out-of-sync': 1, 'local-only': 2, 'conflicts': 3, 'no-sync': 4 }
          return (statusOrder[statusA] || 5) - (statusOrder[statusB] || 5)
        })
        break
      case 'recent':
      default:
        // Keep natural order for recent sorting (handled by recent documents logic)
        break
    }
  }

  initializeSortSelect() {
    const sortSelect = this.container.querySelector('.sort-select')
    if (sortSelect) {
      sortSelect.value = this.sortBy
    }
  }

  enableVirtualScrolling() {
    this.virtualScrolling.enabled = true
    console.log('Virtual scrolling enabled for', this.documents.length, 'documents')
  }

  disableVirtualScrolling() {
    this.virtualScrolling.enabled = false
    const content = this.container.querySelector('.documents-content')
    if (content) {
      content.removeAttribute('data-virtual-scrolling-attached')
    }
  }

  calculateVisibleRange(totalItems) {
    const itemHeight = this.virtualScrolling.itemHeight
    const containerHeight = this.virtualScrolling.containerHeight
    const scrollTop = this.virtualScrolling.scrollTop
    const buffer = this.virtualScrolling.buffer

    const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
    const visibleCount = Math.ceil(containerHeight / itemHeight) + buffer * 2
    const visibleEnd = Math.min(totalItems, visibleStart + visibleCount)

    this.virtualScrolling.visibleStart = visibleStart
    this.virtualScrolling.visibleEnd = visibleEnd
  }

  onVirtualScroll() {
    const content = this.container.querySelector('.documents-content')
    if (!content) return

    const newScrollTop = content.scrollTop

    // Only re-render if scroll position changed significantly
    if (Math.abs(newScrollTop - this.virtualScrolling.scrollTop) > this.virtualScrolling.itemHeight) {
      this.virtualScrolling.scrollTop = newScrollTop
      this.renderDocumentsVirtual()
    }
  }

  // Estimate item height from actual DOM elements for better accuracy
  calibrateItemHeight() {
    const firstItem = this.container.querySelector('.document-item')
    if (firstItem) {
      const measuredHeight = firstItem.getBoundingClientRect().height
      if (measuredHeight > 0) {
        this.virtualScrolling.itemHeight = measuredHeight + 2 // Add small margin
      }
    }
  }

  // Public methods
  async refresh() {
    await this.loadDocuments()
  }

  /**
   * Update a specific document - bypass all async operations for current document
   * @param {string} docId - Document ID to update
   * @param {Object} updatedDoc - Updated document object (ignored, we always fetch fresh)
   */
  async updateDocument(docId, updatedDoc) {
    console.log(`[NAVIGATOR] updateDocument called for docId: ${docId}`, {
      isCurrent: this.app.currentDocument && this.app.currentDocument.id === docId,
      'app.currentDocument': this.app.currentDocument ? {
        id: this.app.currentDocument.id,
        title: this.app.currentDocument.title,
        lastSyncedAt: this.app.currentDocument.lastSyncedAt,
        'metadata.modified': this.app.currentDocument.metadata?.modified
      } : null,
      'updatedDoc': updatedDoc ? {
        id: updatedDoc.id,
        title: updatedDoc.title,
        lastSyncedAt: updatedDoc.lastSyncedAt,
        'metadata.modified': updatedDoc.metadata?.modified
      } : null
    })

    // For current document, skip ALL async operations and render immediately
    // This eliminates timing race conditions with storage updates
    if (this.app.currentDocument && this.app.currentDocument.id === docId) {
      // Update our cached document with the current document instance
      // to ensure perfect consistency with status bar
      const index = this.documents.findIndex(doc => doc.id === docId)
      if (index !== -1) {
        console.log(`[NAVIGATOR] Updating documents[${index}] with app.currentDocument`)
        this.documents[index] = this.app.currentDocument
      }

      // Update recent documents if this document is in the recent list
      const recentIndex = this.recentDocuments.findIndex(doc => doc.id === docId)
      if (recentIndex !== -1) {
        console.log(`[NAVIGATOR] Updating recentDocuments[${recentIndex}] with app.currentDocument`)
        this.recentDocuments[recentIndex] = this.app.currentDocument
      }

      // Immediate render with fresh current document data
      console.log(`[NAVIGATOR] Calling renderDocuments immediately for current document`)
      this.renderDocuments()

      // No delayed rendering - immediate only to eliminate race conditions
      return
    }

    // For other documents, do a full refresh to get latest data from storage
    console.log(`[NAVIGATOR] Calling refresh for non-current document`)
    await this.refresh()
  }

  /**
   * Apply a filter to the document list
   * @param {string} filter - Filter text to search in document titles, tags, and content
   * @public
   * @example
   * documentsTab.applyFilter('fantasy')  // Show only documents matching 'fantasy'
   * documentsTab.applyFilter('')        // Clear filter
   */
  applyFilter(filter) {
    // Update input field if called externally
    const input = this.container.querySelector('.filter-input')
    if (input && input.value !== filter) {
      input.value = filter
    }

    // Show/hide clear button
    const clearBtn = this.container.querySelector('.filter-clear')
    if (clearBtn) {
      clearBtn.style.display = filter ? 'block' : 'none'
    }

    // Use optimized filtering
    this.applyFilterOptimized(filter)
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

  renderSyncIndicator(syncStatus) {
    if (!syncStatus.icon) return ''

    return `
      <div class="sync-status-indicator ${syncStatus.class}"
           title="${syncStatus.tooltip}"
           aria-label="${syncStatus.tooltip}">
        <span class="sync-icon">${syncStatus.icon}</span>
        <span class="sync-text">${this.app.syncStatusManager?.getSyncStatusText(syncStatus.class) || ''}</span>
      </div>
    `
  }

  renderGitActions(doc, syncStatus) {
    const actions = []

    // Push action for documents that need to be uploaded
    if (syncStatus.class === 'out-of-sync' || syncStatus.class === 'local-only') {
      const label = syncStatus.class === 'local-only' ? 'Push to Git' : 'Push changes'
      actions.push({
        icon: '⬆',
        label: label,
        action: 'push',
        shortcut: ':gpu'
      })
    }

    // Pull action only for out-of-sync documents (not synced ones)
    if (syncStatus.class === 'out-of-sync') {
      actions.push({
        icon: '⬇',
        label: 'Pull latest',
        action: 'pull',
        shortcut: ':gpl'
      })
    }

    // View diff for modified documents
    if (syncStatus.class === 'out-of-sync') {
      actions.push({
        icon: '👁',
        label: 'View diff',
        action: 'diff',
        shortcut: ':gdf'
      })
    }

    if (actions.length === 0) return ''

    return `
      <div class="git-actions">
        ${actions.map(action => `
          <button class="git-action-btn"
                  data-action="${action.action}"
                  data-doc-id="${doc.id}"
                  title="${action.label} (${action.shortcut})"
                  aria-label="${action.label}">
            <span class="action-icon">${action.icon}</span>
          </button>
        `).join('')}
      </div>
    `
  }

  renderWordCount(doc) {
    if (!doc.content) return ''

    const wordCount = doc.content.split(/\s+/).filter(word => word.length > 0).length
    if (wordCount === 0) return ''

    return `<span class="word-count">${wordCount}w</span>`
  }

  renderTags(doc) {
    if (!doc.tags || doc.tags.length === 0) return ''

    return `
      <div class="document-tags">
        ${doc.tags
          .slice(0, 3)
          .map((tag) => `<span class="doc-tag">${this.escapeHtml(tag)}</span>`)
          .join('')}
        ${doc.tags.length > 3 ? `<span class="doc-tag-more">+${doc.tags.length - 3}</span>` : ''}
      </div>
    `
  }

  renderSyncDetails(doc, syncStatus) {
    if (syncStatus.class === 'no-sync') return ''

    const lastSynced = doc.lastSyncedAt ? new Date(doc.lastSyncedAt).toLocaleString() : 'Never'
    const conflictCount = doc.conflictCount || 0

    return `
      <div class="sync-details">
        <span class="last-sync">Last sync: ${lastSynced}</span>
        ${conflictCount > 0 ? `<span class="conflict-count">${conflictCount} conflicts</span>` : ''}
      </div>
    `
  }


  renderDocumentIndicators(doc) {
    const indicators = []

    // System document indicator
    if (doc.isSystem) {
      indicators.push(`<span class="document-indicator system-indicator" title="System document">⚙</span>`)
    }

    // Readonly indicator
    if (doc.readonly) {
      indicators.push(`<span class="document-indicator readonly-indicator" title="Read-only">🔒</span>`)
    }

    // Shared indicator
    if (doc.isShared) {
      indicators.push(`<span class="document-indicator shared-indicator" title="Shared document">👥</span>`)
    }

    return indicators.join('')
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
