import { EditorManager } from './core/editor/editor.js'
import { ThemeManager } from './core/themes/theme-manager.js'
import { StorageManager } from './core/storage/storage-manager.js'
import { SearchEngine } from './core/search/search-engine.js'
import { CommandRegistry } from './core/commands/command-registry.js'
import { CommandBar } from './components/command-bar/command-bar.js'
import { FileTree } from './components/sidebar/file-tree.js'
import { registerCoreCommands } from './core/commands/core-commands.js'
import { guidManager } from './utils/guid.js'
import { devHelpers } from './utils/dev-helpers.js'

class FantasyEditorApp {
  constructor() {
    this.editor = null
    this.themeManager = null
    this.storageManager = null
    this.searchEngine = null
    this.commandRegistry = null
    this.commandBar = null
    this.fileTree = null
    this.currentDocument = null
    this.autoSaveTimeout = null
    this.autoSaveDelay = 2000 // 2 seconds
    this.guidManager = guidManager
    this.documentChangeTracking = {
      lastContentChecksum: null,
      lastTitleHash: null,
      hasUnsavedChanges: false
    }
  }

  async init() {
    try {
      this.registerServiceWorker()
      await this.initializeManagers()
      this.attachEventListeners()
      await this.loadInitialDocument()
      this.updateUI()
      
      // Hide sidebar initially for distraction-free writing
      const sidebar = document.querySelector('.sidebar')
      const appMain = document.querySelector('.app-main')
      if (sidebar) {
        sidebar.classList.add('sidebar-hidden')
      }
      if (appMain) {
        appMain.classList.add('sidebar-hidden')
      }
      
      console.log('Fantasy Editor initialized successfully')
    } catch (error) {
      console.error('Failed to initialize app:', error)
      this.showError('Failed to initialize the editor. Please refresh the page.')
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/src/workers/service-worker.js')
        console.log('Service Worker registered:', registration)
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  async initializeManagers() {
    const editorElement = document.getElementById('editor')
    this.editor = new EditorManager(editorElement)
    this.themeManager = new ThemeManager()
    this.storageManager = new StorageManager()
    this.searchEngine = new SearchEngine(this.storageManager)
    
    // Initialize command system
    this.commandRegistry = new CommandRegistry()
    this.commandBar = new CommandBar(this.commandRegistry)
    
    // Initialize file tree
    const fileTreeContainer = document.getElementById('file-tree')
    this.fileTree = new FileTree(fileTreeContainer, this.storageManager, (document) => {
      this.loadDocument(document)
    })
    
    // Register core commands
    registerCoreCommands(this.commandRegistry, this)
    
    // Initialize dev helpers for console access
    devHelpers.init(this)
  }

  attachEventListeners() {
    // No direct keyboard shortcuts - everything goes through Ctrl+Space command palette
    // No icon buttons - everything goes through command palette

    document.getElementById('doc-title').addEventListener('input', (e) => {
      if (this.currentDocument) {
        this.currentDocument.title = e.target.value
      }
    })

    if (this.editor.view) {
      this.editor.view.dom.addEventListener('input', () => {
        this.updateWordCount()
        this.scheduleAutoSave()
      })
    }

    document.getElementById('doc-title').addEventListener('input', () => {
      if (this.currentDocument) {
        this.currentDocument.title = document.getElementById('doc-title').value
        this.scheduleAutoSave()
      }
    })

    // Setup search input
    const searchInput = document.getElementById('search-input')
    if (searchInput) {
      let searchTimeout
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(() => {
          this.performSearch(e.target.value)
        }, 300) // Debounce search by 300ms
      })

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = ''
          this.clearSearchResults()
          // Return focus to editor
          if (this.editor && this.editor.focus) {
            this.editor.focus()
          }
        }
      })
    }

  }

  async loadInitialDocument() {
    const documents = await this.storageManager.getAllDocuments()
    
    if (documents.length > 0) {
      this.currentDocument = documents[0]
    } else {
      this.currentDocument = this.createNewDocument()
    }
    
    this.loadDocument(this.currentDocument)
  }

  async createNewDocument(title = 'Untitled Document') {
    const newDoc = {
      title: title,
      content: '# Welcome to Fantasy Editor\n\nStart writing your epic tale...',
      tags: []
    }
    
    try {
      // Create document with GUID system
      this.currentDocument = await this.storageManager.saveDocument(newDoc)
      this.loadDocument(this.currentDocument)
      
      // Initialize change tracking
      this.initializeChangeTracking()
      
      // Update file tree
      if (this.fileTree) {
        this.fileTree.addDocument(this.currentDocument)
        this.fileTree.setSelectedDocument(this.currentDocument.id)
      }
      
      console.log(`Created new document with GUID: ${this.currentDocument.id}`)
      return this.currentDocument
    } catch (error) {
      console.error('Failed to create document:', error)
      this.showError('Failed to create document')
      return null
    }
  }

  loadDocument(doc) {
    if (!doc) return
    
    this.currentDocument = doc
    document.getElementById('doc-title').value = doc.title || 'Untitled Document'
    this.editor.setContent(doc.content || '')
    this.updateWordCount()
    this.updateSyncStatus('Ready')
    
    // Initialize change tracking for the loaded document
    this.initializeChangeTracking()
    
    // Update file tree selection
    if (this.fileTree) {
      this.fileTree.setSelectedDocument(doc.id)
    }
    
    // Log GUID info for debugging
    if (this.guidManager.isValidGuid(doc.id)) {
      console.log(`Loaded GUID document: ${doc.filename || doc.title} (${doc.id})`)
    } else if (this.guidManager.isOldUidFormat(doc.id)) {
      console.log(`Loaded legacy UID document: ${doc.title} (${doc.id}) - consider migration`)
    }
  }

  async saveDocument() {
    if (!this.currentDocument) return
    
    try {
      this.updateSyncStatus('Saving...')
      
      // Get current title and content
      const title = document.getElementById('doc-title').value || 'Untitled Document'
      const content = this.editor.getContent()
      
      // Check for actual changes before saving
      const hasContentChanges = this.hasContentChanged(content)
      const hasTitleChanges = this.hasTitleChanged(title)
      
      if (!hasContentChanges && !hasTitleChanges) {
        this.updateSyncStatus('No changes')
        setTimeout(() => this.updateSyncStatus('Ready'), 1000)
        return
      }
      
      // Update document
      this.currentDocument.title = title
      this.currentDocument.content = content
      
      const savedDoc = await this.storageManager.saveDocument(this.currentDocument)
      this.currentDocument = savedDoc
      
      // Update change tracking
      this.initializeChangeTracking()
      
      // Update file tree
      if (this.fileTree) {
        this.fileTree.updateDocument(savedDoc)
      }
      
      // Show GUID info if this is a newly created GUID document
      if (this.guidManager.isValidGuid(savedDoc.id) && savedDoc.metadata?.created === savedDoc.metadata?.modified) {
        console.log(`Saved new GUID document: ${savedDoc.filename} (${savedDoc.id})`)
      }
      
      this.updateSyncStatus('Saved')
      setTimeout(() => this.updateSyncStatus('Ready'), 2000)
    } catch (error) {
      console.error('Failed to save document:', error)
      this.showError('Failed to save document. Your changes are preserved locally.')
      this.updateSyncStatus('Error')
    }
  }

  updateWordCount() {
    try {
      const content = this.editor?.getContent() || ''
      if (typeof content !== 'string') {
        console.warn('Editor content is not a string:', content)
        document.getElementById('word-count').textContent = '0 words'
        return
      }
      
      const words = content.trim().split(/\s+/).filter(word => word.length > 0).length
      const wordCount = isNaN(words) ? 0 : words
      document.getElementById('word-count').textContent = `${wordCount} words`
    } catch (error) {
      console.error('Error updating word count:', error)
      document.getElementById('word-count').textContent = '0 words'
    }
  }

  updateSyncStatus(status) {
    document.getElementById('sync-status').textContent = status
  }

  updateUI() {
    this.updateWordCount()
    this.updateSyncStatus('Ready')
  }

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    
    // Theme-aware colors using CSS variables
    const typeClasses = {
      success: 'notification-success',
      error: 'notification-error',
      warning: 'notification-warning',
      info: 'notification-info'
    }
    
    notification.className += ` ${typeClasses[type] || typeClasses.info}`
    
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--color-bg);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-md);
      z-index: var(--z-index-toast);
      max-width: 320px;
      font-size: var(--font-size-sm);
      opacity: 0;
      transform: translateY(20px);
      transition: all 200ms ease-out;
      border-left: 3px solid var(--notification-accent-color, var(--color-primary));
    `
    
    // Add notification styles if not already present
    if (!document.getElementById('notification-styles')) {
      const styleSheet = document.createElement('style')
      styleSheet.id = 'notification-styles'
      styleSheet.textContent = `
        .notification-success {
          --notification-accent-color: var(--color-success);
        }
        .notification-error {
          --notification-accent-color: var(--color-danger);
        }
        .notification-warning {
          --notification-accent-color: var(--color-warning);
        }
        .notification-info {
          --notification-accent-color: var(--color-primary);
        }
        
        /* Dark theme adjustments */
        [data-theme="dark"] .notification {
          background: var(--color-bg-secondary);
          border-color: var(--color-border);
        }
        
        /* Fantasy theme adjustments */
        [data-theme="fantasy"] .notification {
          background: rgba(61, 40, 97, 0.95);
          border-color: var(--color-primary);
          color: var(--color-text);
        }
      `
      document.head.appendChild(styleSheet)
    }
    
    document.body.appendChild(notification)
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1'
      notification.style.transform = 'translateY(0)'
    })
    
    // Auto-hide
    setTimeout(() => {
      notification.style.opacity = '0'
      notification.style.transform = 'translateY(20px)'
      setTimeout(() => notification.remove(), 200)
    }, duration)
  }

  showError(message) {
    this.showNotification(message, 'error')
  }

  /**
   * Schedule auto-save after user stops typing
   */
  scheduleAutoSave() {
    if (!this.currentDocument) return
    
    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
    }
    
    // Schedule new auto-save
    this.autoSaveTimeout = setTimeout(() => {
      this.performAutoSave()
    }, this.autoSaveDelay)
    
    // Show pending save indicator
    this.updateSyncStatus('Pending...')
  }

  /**
   * Perform auto-save without user notification
   */
  async performAutoSave() {
    if (!this.currentDocument) return
    
    try {
      // Get current title and content
      const title = document.getElementById('doc-title').value || 'Untitled Document'
      const content = this.editor.getContent()
      
      // Use GUID-aware change detection
      const hasContentChanges = this.hasContentChanged(content)
      const hasTitleChanges = this.hasTitleChanged(title)
      
      if (!hasContentChanges && !hasTitleChanges) {
        this.updateSyncStatus('Ready')
        this.documentChangeTracking.hasUnsavedChanges = false
        return
      }
      
      this.updateSyncStatus('Auto-saving...')
      
      // Update document
      this.currentDocument.title = title
      this.currentDocument.content = content
      
      const savedDoc = await this.storageManager.saveDocument(this.currentDocument)
      this.currentDocument = savedDoc
      
      // Update change tracking
      this.initializeChangeTracking()
      
      // Update file tree silently
      if (this.fileTree) {
        this.fileTree.updateDocument(savedDoc)
      }
      
      this.updateSyncStatus('Auto-saved')
      setTimeout(() => this.updateSyncStatus('Ready'), 1000)
      
    } catch (error) {
      console.error('Auto-save failed:', error)
      this.updateSyncStatus('Auto-save failed')
      setTimeout(() => this.updateSyncStatus('Ready'), 2000)
    }
  }

  /**
   * Perform search using the search engine
   */
  async performSearch(query) {
    const searchResultsContainer = document.getElementById('search-results')
    if (!searchResultsContainer) return
    
    if (!query || query.trim().length === 0) {
      this.clearSearchResults()
      return
    }

    try {
      // Show loading state
      searchResultsContainer.innerHTML = '<div class="search-loading">Searching...</div>'
      
      // Perform search
      const results = await this.searchEngine.search(query.trim(), { limit: 10 })
      
      if (results.length === 0) {
        searchResultsContainer.innerHTML = `
          <div class="search-empty">
            <div class="empty-icon">🔍</div>
            <p>No documents found for "${query}"</p>
          </div>
        `
        return
      }

      // Display results
      let html = '<div class="search-results-list">'
      
      results.forEach(result => {
        const { document, matches, relevance } = result
        const timeAgo = this.formatTimeAgo(document.updatedAt)
        
        html += `
          <div class="search-result-item" data-doc-id="${document.id}">
            <div class="search-result-header">
              <h3 class="search-result-title">${this.escapeHtml(document.title)}</h3>
              <span class="search-result-meta">${timeAgo}</span>
            </div>
        `
        
        // Add snippets from matches
        if (matches && matches.length > 0) {
          matches.forEach(match => {
            if (match.field === 'content' && match.snippets.length > 0) {
              const snippet = match.snippets[0]
              const highlightedText = this.highlightSearchTerm(snippet.text, snippet.highlight)
              html += `<div class="search-result-snippet">${highlightedText}</div>`
            }
          })
        }
        
        // Add tags if available
        if (document.tags && document.tags.length > 0) {
          html += `
            <div class="search-result-tags">
              ${document.tags.slice(0, 3).map(tag => 
                `<span class="search-tag">${this.escapeHtml(tag)}</span>`
              ).join('')}
            </div>
          `
        }
        
        html += '</div>'
      })
      
      html += '</div>'
      searchResultsContainer.innerHTML = html
      
      // Add click handlers for search results
      searchResultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', async () => {
          const docId = item.dataset.docId
          try {
            const doc = await this.storageManager.getDocument(docId)
            if (doc) {
              this.loadDocument(doc)
              // Clear search on selection
              document.getElementById('search-input').value = ''
              this.clearSearchResults()
            }
          } catch (error) {
            console.error('Failed to load document:', error)
            this.showError('Failed to load document')
          }
        })
      })
      
    } catch (error) {
      console.error('Search failed:', error)
      searchResultsContainer.innerHTML = `
        <div class="search-error">
          <p>Search failed. Please try again.</p>
        </div>
      `
    }
  }

  /**
   * Clear search results display
   */
  clearSearchResults() {
    const searchResultsContainer = document.getElementById('search-results')
    if (searchResultsContainer) {
      searchResultsContainer.innerHTML = ''
    }
  }

  /**
   * Highlight search terms in text
   */
  highlightSearchTerm(text, term) {
    if (!term || !text) return this.escapeHtml(text)
    
    const escaped = this.escapeHtml(text)
    const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi')
    return escaped.replace(regex, '<mark>$1</mark>')
  }

  /**
   * Escape regex special characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * Format time ago string
   */
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
        day: 'numeric'
      })
    }
  }

  /**
   * Execute a command directly
   */
  async executeCommand(commandInput) {
    try {
      await this.commandRegistry.executeCommand(commandInput)
    } catch (error) {
      console.error('Command execution failed:', error)
      this.showError(`Command failed: ${error.message}`)
    }
  }


  /**
   * Initialize change tracking for the current document
   */
  initializeChangeTracking() {
    if (!this.currentDocument) return
    
    const content = this.currentDocument.content || ''
    const title = this.currentDocument.title || ''
    
    this.documentChangeTracking = {
      lastContentChecksum: this.guidManager.generateChecksum(content),
      lastTitleHash: this.simpleHash(title),
      hasUnsavedChanges: false
    }
  }

  /**
   * Check if content has changed using checksum comparison
   */
  hasContentChanged(currentContent) {
    const currentChecksum = this.guidManager.generateChecksum(currentContent || '')
    return currentChecksum !== this.documentChangeTracking.lastContentChecksum
  }

  /**
   * Check if title has changed using simple hash comparison
   */
  hasTitleChanged(currentTitle) {
    const currentHash = this.simpleHash(currentTitle || '')
    return currentHash !== this.documentChangeTracking.lastTitleHash
  }

  /**
   * Simple hash function for title comparison
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  /**
   * Get document information including GUID details
   */
  getDocumentInfo() {
    if (!this.currentDocument) return null
    
    const doc = this.currentDocument
    const isGuid = this.guidManager.isValidGuid(doc.id)
    const isOldUid = this.guidManager.isOldUidFormat(doc.id)
    
    return {
      ...doc,
      idType: isGuid ? 'GUID' : isOldUid ? 'Legacy UID' : 'Unknown',
      filename: doc.filename || (isGuid ? this.guidManager.generateFilename(doc.title, doc.id) : null),
      hasUnsavedChanges: this.documentChangeTracking.hasUnsavedChanges
    }
  }

}

document.addEventListener('DOMContentLoaded', () => {
  const app = new FantasyEditorApp()
  app.init()
  window.fantasyEditor = app
})
