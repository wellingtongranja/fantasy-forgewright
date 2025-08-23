/**
 * Outline Tab - Document structure navigation
 * Shows hierarchical outline of current document headers
 */

import { OutlineParser } from '../utils/outline-parser.js'

export class OutlineTab {
  constructor(container, app) {
    this.container = container
    this.app = app
    this.outline = []
    this.currentDocument = null
    this.selectedItemId = null
    
    this.init()
  }

  init() {
    this.container.className = 'outline-tab'
    this.container.setAttribute('tabindex', '0')
    this.container.setAttribute('role', 'tree')
    this.container.setAttribute('aria-label', 'Document outline')
    
    this.render()
    this.attachEventListeners()
  }

  render() {
    this.container.innerHTML = `
      <div class="outline-header">
        <div class="outline-info">
          <span class="outline-title">Document Outline</span>
          <span class="outline-count"></span>
        </div>
      </div>
      <div class="outline-content">
        <div class="outline-empty">
          <div class="empty-icon">No outline available</div>
          <p>Open a document to see its structure</p>
        </div>
      </div>
    `
  }

  updateOutline(document) {
    if (!document) {
      this.showEmpty()
      return
    }
    
    this.currentDocument = document
    const content = document.content || ''
    
    // Parse outline from content
    this.outline = OutlineParser.parse(content)
    
    if (this.outline.length === 0) {
      this.showNoHeaders()
      return
    }
    
    this.renderOutline()
  }

  showEmpty() {
    const content = this.container.querySelector('.outline-content')
    content.innerHTML = `
      <div class="outline-empty">
        <div class="empty-icon">No outline available</div>
        <p>Open a document to see its structure</p>
      </div>
    `
    
    // Update header count and title
    this.updateHeaderCount(0)
    this.updateTitle('No Document')
  }

  updateTitle(title) {
    const titleElement = this.container.querySelector('.outline-title')
    if (titleElement) {
      titleElement.textContent = title
    }
  }

  showNoHeaders() {
    const content = this.container.querySelector('.outline-content')
    content.innerHTML = `
      <div class="outline-empty">
        <div class="empty-icon">No headers found</div>
        <p>Add headers using # in your markdown</p>
      </div>
    `
    
    // Update header count and document title
    this.updateHeaderCount(0)
    this.updateTitle(this.currentDocument ? this.currentDocument.title : 'Document Outline')
  }

  renderOutline() {
    const content = this.container.querySelector('.outline-content')
    const stats = OutlineParser.getStatistics(this.outline)
    
    // Update header count and document title
    this.updateHeaderCount(stats.total)
    this.updateTitle(this.currentDocument ? this.currentDocument.title : 'Document Outline')
    
    // Render outline tree
    content.innerHTML = `
      <div class="outline-tree" role="tree">
        ${this.renderOutlineItems(this.outline, 0)}
      </div>
    `
    
    // All items are expanded by default - no state to restore
  }

  renderOutlineItems(items, depth = 0) {
    if (!items || items.length === 0) return ''
    
    let html = ''
    
    for (const item of items) {
      const hasChildren = item.children && item.children.length > 0
      const isSelected = item.id === this.selectedItemId
      
      html += `
        <div class="outline-item ${isSelected ? 'selected' : ''}" 
             data-item-id="${item.id}"
             data-line="${item.line}"
             data-level="${item.level}"
             role="treeitem"
             aria-selected="${isSelected}"
             tabindex="0"
             style="padding-left: ${depth * 20}px">
          <div class="outline-item-content">
            <span class="outline-level-indicator level-${item.level}">H${item.level}</span>
            <span class="outline-text">${this.escapeHtml(item.text)}</span>
            <span class="outline-line">L${item.line}</span>
          </div>
          ${hasChildren ? `
            <div class="outline-children">
              ${this.renderOutlineItems(item.children, depth + 1)}
            </div>
          ` : ''}
        </div>
      `
    }
    
    return html
  }

  attachEventListeners() {
    // Click on outline item
    this.container.addEventListener('click', (e) => {
      const item = e.target.closest('.outline-item')
      
      if (item) {
        // Navigate to header
        const line = parseInt(item.dataset.line)
        this.navigateToLine(line)
        this.selectItem(item.dataset.itemId)
      }
    })
    
    
    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      const current = this.container.querySelector('.outline-item.selected')
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.navigateItems(e.key === 'ArrowDown' ? 1 : -1)
      } else if (e.key === 'ArrowRight' && current) {
        // Navigate to first child if exists
        const firstChild = current.querySelector('.outline-children .outline-item')
        if (firstChild) {
          this.selectItem(firstChild.dataset.itemId)
          firstChild.scrollIntoView({ block: 'nearest' })
        }
      } else if (e.key === 'ArrowLeft' && current) {
        // Navigate to parent
        const parent = current.parentElement.closest('.outline-item')
        if (parent && parent !== current) {
          this.selectItem(parent.dataset.itemId)
          parent.scrollIntoView({ block: 'nearest' })
        }
      } else if (e.key === 'Enter' && current) {
        const line = parseInt(current.dataset.line)
        this.navigateToLine(line)
      }
    })
  }

  // Expand/collapse methods removed - outline is always expanded

  navigateItems(direction) {
    const items = Array.from(this.container.querySelectorAll('.outline-item'))
    if (items.length === 0) return
    
    const currentIndex = items.findIndex(item => item.classList.contains('selected'))
    
    let newIndex
    if (currentIndex === -1) {
      newIndex = direction > 0 ? 0 : items.length - 1
    } else {
      newIndex = currentIndex + direction
      if (newIndex < 0) newIndex = items.length - 1
      if (newIndex >= items.length) newIndex = 0
    }
    
    const newItem = items[newIndex]
    this.selectItem(newItem.dataset.itemId)
    newItem.scrollIntoView({ block: 'nearest' })
  }

  selectItem(itemId) {
    this.selectedItemId = itemId
    
    this.container.querySelectorAll('.outline-item').forEach(item => {
      const isSelected = item.dataset.itemId === itemId
      item.classList.toggle('selected', isSelected)
      item.setAttribute('aria-selected', isSelected)
    })
  }

  navigateToLine(lineNumber) {
    if (!this.app.editor || !this.app.editor.view) return
    
    const content = this.app.editor.getContent()
    const position = OutlineParser.getPositionFromLine(content, lineNumber)
    
    // Move cursor to the line
    const view = this.app.editor.view
    view.dispatch({
      selection: { anchor: position, head: position },
      scrollIntoView: true
    })
    
    // Focus editor
    view.focus()
  }

  updateHeaderCount(count) {
    const countElement = this.container.querySelector('.outline-count')
    if (countElement) {
      countElement.textContent = count > 0 ? `(${count} headers)` : ''
    }
  }

  saveExpandedState(itemId, isExpanded) {
    if (!this.currentDocument) return
    
    const key = `outline-expanded-${this.currentDocument.id}`
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    
    if (isExpanded) {
      state[itemId] = true
    } else {
      delete state[itemId]
    }
    
    localStorage.setItem(key, JSON.stringify(state))
  }

  restoreExpandedState() {
    if (!this.currentDocument) return
    
    const key = `outline-expanded-${this.currentDocument.id}`
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    
    Object.keys(state).forEach(itemId => {
      const item = this.container.querySelector(`[data-item-id="${itemId}"]`)
      if (item && state[itemId]) {
        this.expandItem(item)
      }
    })
  }

  // Public methods
  refresh() {
    if (this.currentDocument) {
      this.updateOutline(this.currentDocument)
    }
  }

  onActivate() {
    // Called when tab becomes active
    if (this.app.currentDocument) {
      this.updateOutline(this.app.currentDocument)
    }
  }

  clear() {
    this.outline = []
    this.currentDocument = null
    this.selectedItemId = null
    this.showEmpty()
  }

  // Search within outline
  searchOutline(query) {
    if (!query || this.outline.length === 0) return []
    
    return OutlineParser.search(this.outline, query)
  }

  // Generate table of contents
  generateTOC() {
    if (this.outline.length === 0) return ''
    
    return OutlineParser.generateTOC(this.outline)
  }

  // Utility method
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}