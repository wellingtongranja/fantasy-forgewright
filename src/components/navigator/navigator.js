/**
 * Navigator Component - Tabbed sidebar panel for document navigation
 * Features: Documents list, Document outline, and Search functionality
 */

export class Navigator {
  constructor(container, app) {
    this.container = container
    this.app = app
    this.tabs = ['documents', 'outline', 'search']
    this.activeTab = 'documents'
    this.isPinned = false
    this.isVisible = false
    this.width = 320
    this.minWidth = 280
    this.maxWidth = 600
    this.tabComponents = {}
    this.resizeHandler = null
    
    this.init()
  }

  init() {
    this.container.className = 'navigator'
    this.container.setAttribute('role', 'navigation')
    this.container.setAttribute('aria-label', 'Navigator panel')
    
    this.render()
    this.attachEventListeners()
    this.initializeTabs()
    
    // Start hidden
    this.hide()
  }

  render() {
    this.container.innerHTML = `
      <div class="navigator-header">
        <div class="navigator-top">
          <button class="navigator-pin" title="Pin Navigator" aria-label="Pin Navigator">
            <span class="pin-icon">▊</span>
          </button>
        </div>
        <div class="navigator-tabs" role="tablist">
          <button class="navigator-tab active" data-tab="documents" role="tab" aria-selected="true">
            <span class="tab-label">Documents</span>
          </button>
          <button class="navigator-tab" data-tab="outline" role="tab" aria-selected="false">
            <span class="tab-label">Outline</span>
          </button>
          <button class="navigator-tab" data-tab="search" role="tab" aria-selected="false">
            <span class="tab-label">Search</span>
          </button>
        </div>
      </div>
      
      <div class="navigator-content">
        <div class="navigator-panel active" data-panel="documents" role="tabpanel">
          <div id="documents-tab-content"></div>
        </div>
        <div class="navigator-panel" data-panel="outline" role="tabpanel">
          <div id="outline-tab-content"></div>
        </div>
        <div class="navigator-panel" data-panel="search" role="tabpanel">
          <div id="search-tab-content"></div>
        </div>
      </div>
      
      <div class="navigator-resize-handle" aria-label="Resize navigator"></div>
    `
    
    // Set initial width
    this.container.style.width = `${this.width}px`
  }

  initializeTabs() {
    // Lazy load tab components
    Promise.all([
      import('./tabs/documents-tab.js'),
      import('./tabs/outline-tab.js'),
      import('./tabs/search-tab.js')
    ]).then(([documentsModule, outlineModule, searchModule]) => {
      // Initialize Documents tab
      const documentsContainer = document.getElementById('documents-tab-content')
      this.tabComponents.documents = new documentsModule.DocumentsTab(
        documentsContainer, 
        this.app
      )
      
      // Initialize Outline tab
      const outlineContainer = document.getElementById('outline-tab-content')
      this.tabComponents.outline = new outlineModule.OutlineTab(
        outlineContainer,
        this.app
      )
      
      // Initialize Search tab
      const searchContainer = document.getElementById('search-tab-content')
      this.tabComponents.search = new searchModule.SearchTab(
        searchContainer,
        this.app
      )
    }).catch(error => {
      console.error('Failed to initialize navigator tabs:', error)
    })
  }

  attachEventListeners() {
    // Tab switching
    this.container.addEventListener('click', (e) => {
      const tab = e.target.closest('.navigator-tab')
      if (tab) {
        const tabName = tab.dataset.tab
        this.switchTab(tabName)
      }
      
      // Pin toggle
      const pinBtn = e.target.closest('.navigator-pin')
      if (pinBtn) {
        this.togglePin()
      }
    })
    
    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      // Tab switching with keyboard
      if (e.ctrlKey && e.key >= '1' && e.key <= '3') {
        const tabIndex = parseInt(e.key) - 1
        this.switchTab(this.tabs[tabIndex])
        e.preventDefault()
      }
      
      // Escape to close unpinned navigator
      if (e.key === 'Escape' && !this.isPinned) {
        this.hide()
        // Return focus to editor
        if (this.app.editor && this.app.editor.focus) {
          this.app.editor.focus()
        }
      }
    })
    
    // Resize functionality
    const resizeHandle = this.container.querySelector('.navigator-resize-handle')
    this.initializeResize(resizeHandle)
    
    // Global keyboard shortcut (Ctrl+Enter) to toggle visibility when unpinned
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter' && !this.isPinned) {
        e.preventDefault()
        this.toggle()
      }
    })
  }

  initializeResize(handle) {
    let isResizing = false
    let startX = 0
    let startWidth = 0
    
    handle.addEventListener('mousedown', (e) => {
      isResizing = true
      startX = e.clientX
      startWidth = this.width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      e.preventDefault()
    })
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return
      
      const diff = e.clientX - startX
      const newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, startWidth + diff))
      
      this.width = newWidth
      this.container.style.width = `${newWidth}px`
      
      // Update app main layout
      const appMain = document.querySelector('.app-main')
      if (appMain && this.isVisible) {
        appMain.style.marginLeft = `${newWidth}px`
      }
    })
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        
        // Save width preference
        localStorage.setItem('navigator-width', this.width)
      }
    })
  }

  switchTab(tabName) {
    if (!this.tabs.includes(tabName)) return
    if (tabName === this.activeTab) return
    
    this.activeTab = tabName
    
    // Update tab buttons
    this.container.querySelectorAll('.navigator-tab').forEach(tab => {
      const isActive = tab.dataset.tab === tabName
      tab.classList.toggle('active', isActive)
      tab.setAttribute('aria-selected', isActive)
    })
    
    // Update panels
    this.container.querySelectorAll('.navigator-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === tabName)
    })
    
    // Notify tab component of activation
    if (this.tabComponents[tabName] && this.tabComponents[tabName].onActivate) {
      this.tabComponents[tabName].onActivate()
    }
  }

  togglePin() {
    this.isPinned = !this.isPinned
    this.container.classList.toggle('pinned', this.isPinned)
    
    const pinBtn = this.container.querySelector('.navigator-pin')
    pinBtn.classList.toggle('active', this.isPinned)
    pinBtn.title = this.isPinned ? 'Unpin Navigator' : 'Pin Navigator'
    
    // Save pin state
    localStorage.setItem('navigator-pinned', this.isPinned)
    
    // If unpinning and navigator is visible, hide it
    if (!this.isPinned && this.isVisible) {
      setTimeout(() => this.hide(), 100)
    }
  }

  focusActiveTab() {
    const activeTab = this.tabComponents[this.activeTab]
    if (activeTab) {
      // Focus the appropriate element in the active tab
      if (this.activeTab === 'documents') {
        const firstItem = this.container.querySelector('.document-item')
        if (firstItem) {
          firstItem.focus()
          firstItem.classList.add('selected')
        }
      } else if (this.activeTab === 'outline') {
        const firstItem = this.container.querySelector('.outline-item')
        if (firstItem) {
          firstItem.focus()
          if (activeTab.selectItem) {
            activeTab.selectItem(firstItem.dataset.itemId)
          }
        }
      } else if (this.activeTab === 'search') {
        const searchInput = this.container.querySelector('.search-input')
        if (searchInput) {
          searchInput.focus()
        }
      }
    }
  }

  show() {
    this.isVisible = true
    this.container.classList.add('visible')
    
    // Update app main layout
    const appMain = document.querySelector('.app-main')
    if (appMain) {
      appMain.classList.remove('navigator-hidden')
      appMain.style.marginLeft = `${this.width}px`
    }
    
    // Focus active tab content
    setTimeout(() => this.focusActiveTab(), 100)
  }

  hide() {
    this.isVisible = false
    this.container.classList.remove('visible')
    
    // Update app main layout
    const appMain = document.querySelector('.app-main')
    if (appMain) {
      appMain.classList.add('navigator-hidden')
      appMain.style.marginLeft = '0'
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  // Public methods for external control
  openTab(tabName) {
    if (this.tabs.includes(tabName)) {
      this.switchTab(tabName)
      if (!this.isVisible) {
        this.show()
      }
      // Set focus for keyboard navigation
      setTimeout(() => this.focusActiveTab(), 100)
    }
  }

  openDocuments(filter) {
    this.openTab('documents')
    if (filter && this.tabComponents.documents) {
      this.tabComponents.documents.applyFilter(filter)
    }
    // Focus the filter input instead of the tab content
    if (this.tabComponents.documents) {
      this.tabComponents.documents.focusFilterInput()
    }
  }

  openOutline() {
    this.openTab('outline')
    // Set focus for keyboard navigation
    setTimeout(() => this.focusActiveTab(), 100)
  }

  openSearch(query) {
    this.openTab('search')
    if (query && this.tabComponents.search) {
      this.tabComponents.search.performSearch(query)
    }
    // Set focus for keyboard navigation
    setTimeout(() => this.focusActiveTab(), 100)
  }

  refresh() {
    // Refresh active tab
    if (this.tabComponents[this.activeTab] && this.tabComponents[this.activeTab].refresh) {
      this.tabComponents[this.activeTab].refresh()
    }
  }

  // Update methods for document changes
  onDocumentChange(document) {
    // Update outline when document changes
    if (this.tabComponents.outline) {
      this.tabComponents.outline.updateOutline(document)
    }
    
    // Update documents tab if needed
    if (this.tabComponents.documents) {
      this.tabComponents.documents.setSelectedDocument(document.id)
    }
  }

  onDocumentSave(document) {
    // Refresh documents list
    if (this.tabComponents.documents) {
      this.tabComponents.documents.updateDocument(document)
    }
  }

  onDocumentCreate(document) {
    // Add to documents list
    if (this.tabComponents.documents) {
      this.tabComponents.documents.addDocument(document)
    }
  }

  onDocumentDelete(documentId) {
    // Remove from documents list
    if (this.tabComponents.documents) {
      this.tabComponents.documents.removeDocument(documentId)
    }
  }

  // Restore saved preferences
  restorePreferences() {
    // Restore width
    const savedWidth = localStorage.getItem('navigator-width')
    if (savedWidth) {
      this.width = parseInt(savedWidth)
      this.container.style.width = `${this.width}px`
    }
    
    // Restore pin state
    const savedPinned = localStorage.getItem('navigator-pinned')
    if (savedPinned === 'true') {
      this.isPinned = true
      this.container.classList.add('pinned')
      this.show()
    }
  }
}