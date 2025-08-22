import { EditorManager } from './core/editor/editor.js'
import { ThemeManager } from './core/themes/theme-manager.js'
import { StorageManager } from './core/storage/storage-manager.js'
import { CommandRegistry } from './core/commands/command-registry.js'
import { CommandBar } from './components/command-bar/command-bar.js'
import { registerCoreCommands } from './core/commands/core-commands.js'

class FantasyEditorApp {
  constructor() {
    this.editor = null
    this.themeManager = null
    this.storageManager = null
    this.commandRegistry = null
    this.commandBar = null
    this.currentDocument = null
  }

  async init() {
    try {
      this.registerServiceWorker()
      this.initializeManagers()
      this.attachEventListeners()
      await this.loadInitialDocument()
      this.updateUI()
      
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

  initializeManagers() {
    const editorElement = document.getElementById('editor')
    this.editor = new EditorManager(editorElement)
    this.themeManager = new ThemeManager()
    this.storageManager = new StorageManager()
    
    // Initialize command system
    this.commandRegistry = new CommandRegistry()
    this.commandBar = new CommandBar(this.commandRegistry)
    
    // Register core commands
    registerCoreCommands(this.commandRegistry, this)
  }

  attachEventListeners() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.themeManager.toggleTheme()
    })

    document.getElementById('doc-title').addEventListener('input', (e) => {
      if (this.currentDocument) {
        this.currentDocument.title = e.target.value
      }
    })

    if (this.editor.view) {
      this.editor.view.dom.addEventListener('input', () => {
        this.updateWordCount()
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

  createNewDocument() {
    this.currentDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Untitled Document',
      content: '# Welcome to Fantasy Editor\n\nStart writing your epic tale...',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    this.loadDocument(this.currentDocument)
    return this.currentDocument
  }

  loadDocument(doc) {
    if (!doc) return
    
    document.getElementById('doc-title').value = doc.title || 'Untitled Document'
    this.editor.setContent(doc.content || '')
    this.updateWordCount()
    this.updateSyncStatus('Ready')
  }

  async saveDocument() {
    if (!this.currentDocument) return
    
    try {
      this.updateSyncStatus('Saving...')
      
      this.currentDocument.content = this.editor.getContent()
      this.currentDocument.updatedAt = new Date().toISOString()
      
      await this.storageManager.saveDocument(this.currentDocument)
      
      this.updateSyncStatus('Saved')
      setTimeout(() => this.updateSyncStatus('Ready'), 2000)
    } catch (error) {
      console.error('Failed to save document:', error)
      this.showError('Failed to save document. Your changes are preserved locally.')
      this.updateSyncStatus('Error')
    }
  }

  updateWordCount() {
    const content = this.editor?.getContent() || ''
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length
    document.getElementById('word-count').textContent = `${words} words`
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
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new FantasyEditorApp()
  app.init()
  window.fantasyEditor = app
})
