import { EditorManager } from './core/editor/editor.js'
import { ThemeManager } from './core/themes/theme-manager.js'
import { StorageManager } from './core/storage/storage-manager.js'

class FantasyEditorApp {
  constructor() {
    this.editor = null
    this.themeManager = null
    this.storageManager = null
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
  }

  attachEventListeners() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.themeManager.toggleTheme()
    })

    document.getElementById('save-btn').addEventListener('click', () => {
      this.saveDocument()
    })

    document.getElementById('new-btn').addEventListener('click', () => {
      this.createNewDocument()
    })

    document.getElementById('doc-title').addEventListener('input', (e) => {
      if (this.currentDocument) {
        this.currentDocument.title = e.target.value
      }
    })

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        this.saveDocument()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        this.createNewDocument()
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

  showError(message) {
    const notification = document.createElement('div')
    notification.className = 'error-notification'
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--color-danger);
      color: white;
      padding: var(--spacing-md);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-index-toast);
    `
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 5000)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new FantasyEditorApp()
  app.init()
  window.fantasyEditor = app
})
