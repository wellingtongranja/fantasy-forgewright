/**
 * File Tree Component - Document navigation for sidebar
 * Shows hierarchical list of documents with creation/modification dates
 */

export class FileTree {
  constructor(container, storageManager, onDocumentSelect) {
    this.container = container
    this.storageManager = storageManager
    this.onDocumentSelect = onDocumentSelect
    this.documents = []
    this.selectedDocumentId = null
    
    this.init()
  }

  init() {
    this.container.innerHTML = ''
    this.container.className = 'file-tree'
    this.container.setAttribute('tabindex', '0')
    this.container.setAttribute('role', 'listbox')
    this.container.setAttribute('aria-label', 'Document list')
    
    // Create loading state
    this.showLoading()
    
    // Load documents
    this.loadDocuments()
  }

  showLoading() {
    this.container.innerHTML = `
      <div class="file-tree-loading">
        <div class="loading-spinner"></div>
        <span>Loading documents...</span>
      </div>
    `
  }

  showEmpty() {
    this.container.innerHTML = `
      <div class="file-tree-empty">
        <div class="empty-icon">📝</div>
        <p>No documents yet</p>
        <small>Press <kbd>Ctrl+Space</kbd> and type <strong>new</strong> to create your first document</small>
      </div>
    `
  }

  async loadDocuments() {
    try {
      this.documents = await this.storageManager.getAllDocuments()
      this.render()
    } catch (error) {
      console.error('Failed to load documents:', error)
      this.showError('Failed to load documents')
    }
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="file-tree-error">
        <div class="error-icon">⚠️</div>
        <p>${message}</p>
        <button class="retry-btn">Retry</button>
      </div>
    `
    
    this.container.querySelector('.retry-btn').addEventListener('click', () => {
      this.loadDocuments()
    })
  }

  render() {
    if (this.documents.length === 0) {
      this.showEmpty()
      return
    }

    // Group documents by date for better organization
    const groupedDocs = this.groupDocumentsByDate(this.documents)
    
    let html = '<div class="file-tree-list">'
    
    for (const [dateGroup, docs] of Object.entries(groupedDocs)) {
      html += `
        <div class="file-tree-group">
          <div class="file-tree-group-header">
            <span class="group-title">${dateGroup}</span>
            <span class="group-count">${docs.length}</span>
          </div>
          <div class="file-tree-group-items">
      `
      
      for (const doc of docs) {
        const isSelected = doc.id === this.selectedDocumentId
        const excerpt = this.generateExcerpt(doc.content)
        const timeAgo = this.formatTimeAgo(doc.updatedAt)
        
        html += `
          <div class="file-tree-item ${isSelected ? 'selected' : ''}" data-doc-id="${doc.id}">
            <div class="file-item-main">
              <div class="file-item-title">${this.escapeHtml(doc.title)}</div>
              <div class="file-item-meta">
                <span class="file-item-time">${timeAgo}</span>
                ${doc.tags && doc.tags.length > 0 ? `
                  <div class="file-item-tags">
                    ${doc.tags.slice(0, 3).map(tag => `<span class="file-tag">${this.escapeHtml(tag)}</span>`).join('')}
                    ${doc.tags.length > 3 ? '<span class="file-tag-more">+' + (doc.tags.length - 3) + '</span>' : ''}
                  </div>
                ` : ''}
              </div>
            </div>
            ${excerpt ? `<div class="file-item-excerpt">${this.escapeHtml(excerpt)}</div>` : ''}
          </div>
        `
      }
      
      html += `
          </div>
        </div>
      `
    }
    
    html += '</div>'
    
    this.container.innerHTML = html
    this.attachEventListeners()
  }

  groupDocumentsByDate(documents) {
    const groups = {}
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    for (const doc of documents) {
      const docDate = new Date(doc.updatedAt)
      let groupKey
      
      if (this.isSameDate(docDate, today)) {
        groupKey = 'Today'
      } else if (this.isSameDate(docDate, yesterday)) {
        groupKey = 'Yesterday'
      } else if (docDate > weekAgo) {
        groupKey = 'This Week'
      } else if (docDate.getFullYear() === today.getFullYear()) {
        groupKey = docDate.toLocaleDateString('en-US', { month: 'long' })
      } else {
        groupKey = docDate.getFullYear().toString()
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(doc)
    }
    
    // Sort groups by priority
    const sortedGroups = {}
    const groupOrder = ['Today', 'Yesterday', 'This Week']
    
    groupOrder.forEach(key => {
      if (groups[key]) {
        sortedGroups[key] = groups[key]
        delete groups[key]
      }
    })
    
    // Add remaining groups sorted by date
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key]
    })
    
    return sortedGroups
  }

  isSameDate(date1, date2) {
    return date1.toDateString() === date2.toDateString()
  }

  generateExcerpt(content, maxLength = 60) {
    if (!content) return ''
    
    // Remove markdown formatting for excerpt
    const plainText = content
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim()
    
    if (plainText.length <= maxLength) {
      return plainText
    }
    
    return plainText.substring(0, maxLength) + '...'
  }

  formatTimeAgo(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMinutes < 1) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  attachEventListeners() {
    // Document selection
    this.container.addEventListener('click', (e) => {
      const fileItem = e.target.closest('.file-tree-item')
      if (fileItem) {
        const docId = fileItem.dataset.docId
        this.selectDocument(docId)
      }
    })

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.navigateDocuments(e.key === 'ArrowDown' ? 1 : -1)
      } else if (e.key === 'Enter') {
        const selected = this.container.querySelector('.file-tree-item.selected')
        if (selected) {
          this.selectDocument(selected.dataset.docId)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        // Return focus to editor
        const app = window.fantasyEditor
        if (app && app.editor && app.editor.focus) {
          app.editor.focus()
        }
      }
    })
  }

  navigateDocuments(direction) {
    const items = this.container.querySelectorAll('.file-tree-item')
    if (items.length === 0) return
    
    const currentIndex = Array.from(items).findIndex(item => 
      item.classList.contains('selected')
    )
    
    let newIndex
    if (currentIndex === -1) {
      newIndex = direction > 0 ? 0 : items.length - 1
    } else {
      newIndex = currentIndex + direction
      if (newIndex < 0) newIndex = items.length - 1
      if (newIndex >= items.length) newIndex = 0
    }
    
    // Update selection
    items.forEach(item => item.classList.remove('selected'))
    items[newIndex].classList.add('selected')
    items[newIndex].scrollIntoView({ block: 'nearest' })
    
    this.selectedDocumentId = items[newIndex].dataset.docId
  }

  async selectDocument(docId) {
    if (!docId) return
    
    try {
      const document = await this.storageManager.getDocument(docId)
      if (document && this.onDocumentSelect) {
        this.selectedDocumentId = docId
        this.updateSelection()
        this.onDocumentSelect(document)
      }
    } catch (error) {
      console.error('Failed to load document:', error)
    }
  }

  updateSelection() {
    this.container.querySelectorAll('.file-tree-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.docId === this.selectedDocumentId)
    })
  }

  // Public methods for external control
  async refresh() {
    await this.loadDocuments()
  }

  setSelectedDocument(docId) {
    this.selectedDocumentId = docId
    this.updateSelection()
  }

  addDocument(document) {
    this.documents.unshift(document) // Add to beginning
    this.render()
  }

  updateDocument(document) {
    const index = this.documents.findIndex(doc => doc.id === document.id)
    if (index !== -1) {
      this.documents[index] = document
      this.render()
    }
  }

  removeDocument(docId) {
    this.documents = this.documents.filter(doc => doc.id !== docId)
    if (this.selectedDocumentId === docId) {
      this.selectedDocumentId = null
    }
    this.render()
  }
}