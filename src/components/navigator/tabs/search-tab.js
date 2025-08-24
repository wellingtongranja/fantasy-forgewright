/**
 * Search Tab - Full-text search across all documents
 * Features progress indicator and cancellable search
 */

export class SearchTab {
  constructor(container, app) {
    this.container = container
    this.app = app
    this.searchResults = []
    this.isSearching = false
    this.searchAbortController = null
    this.currentQuery = ''
    this.selectedResultIndex = -1

    this.init()
  }

  init() {
    this.container.className = 'search-tab'
    this.container.setAttribute('role', 'search')
    this.container.setAttribute('aria-label', 'Search documents')

    this.render()
    this.attachEventListeners()
  }

  render() {
    this.container.innerHTML = `
      <div class="search-header">
        <div class="search-input-group">
          <input type="search" 
                 class="search-input" 
                 placeholder="Search all documents..." 
                 aria-label="Search query"
                 autofocus>
          <button class="search-button" aria-label="Search">
            <span class="search-icon">🔍</span>
          </button>
          <button class="search-stop" aria-label="Stop search" style="display: none;">
            <span class="stop-icon">⏹</span>
          </button>
        </div>
      </div>
      
      <div class="search-progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="progress-text">
          <span class="progress-status">Searching...</span>
          <span class="progress-count"></span>
        </div>
      </div>
      
      <div class="search-content">
        <div class="search-welcome">
          <p>Search across all documents</p>
          <small>Enter keywords to find in titles, content, and metadata</small>
        </div>
      </div>
    `
  }

  attachEventListeners() {
    const searchInput = this.container.querySelector('.search-input')
    const searchButton = this.container.querySelector('.search-button')
    const stopButton = this.container.querySelector('.search-stop')

    // Search on Enter or button click
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.performSearch(searchInput.value)
      } else if (e.key === 'Escape') {
        if (this.isSearching) {
          this.stopSearch()
        } else {
          searchInput.value = ''
          this.clearResults()
        }
      }
    })

    searchButton.addEventListener('click', () => {
      this.performSearch(searchInput.value)
    })

    stopButton.addEventListener('click', () => {
      this.stopSearch()
    })

    // Result navigation
    this.container.addEventListener('click', (e) => {
      const resultItem = e.target.closest('.search-result-item')
      if (resultItem) {
        const docId = resultItem.dataset.docId
        const line = resultItem.dataset.line
        this.navigateToResult(docId, line ? parseInt(line) : null)
      }
    })

    // Keyboard navigation in results
    this.container.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('search-input')) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.navigateResults(e.key === 'ArrowDown' ? 1 : -1)
      } else if (e.key === 'Enter') {
        const selected = this.container.querySelector('.search-result-item.selected')
        if (selected) {
          const docId = selected.dataset.docId
          const line = selected.dataset.line
          this.navigateToResult(docId, line ? parseInt(line) : null)
        }
      }
    })
  }

  async performSearch(query) {
    if (!query || query.trim().length < 2) {
      this.showMessage('Please enter at least 2 characters to search')
      return
    }

    if (this.isSearching) {
      this.stopSearch()
    }

    this.currentQuery = query.trim()
    this.isSearching = true
    this.searchResults = []
    this.selectedResultIndex = -1

    // Create abort controller for cancellable search
    this.searchAbortController = new AbortController()

    // Update UI
    this.showProgress()
    this.toggleSearchButtons(true)

    try {
      // Get all documents
      const documents = await this.app.storageManager.getAllDocuments()
      const totalDocs = documents.length

      // Search through documents with progress
      for (let i = 0; i < documents.length; i++) {
        // Check if search was cancelled
        if (this.searchAbortController.signal.aborted) {
          break
        }

        const doc = documents[i]
        const results = this.searchInDocument(doc, this.currentQuery)

        if (results.length > 0) {
          this.searchResults.push({
            document: doc,
            matches: results
          })
        }

        // Update progress
        this.updateProgress(i + 1, totalDocs)

        // Allow UI to update
        if (i % 10 === 0) {
          await this.delay(10)
        }
      }

      // Display results
      this.displayResults()
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search failed:', error)
        this.showError('Search failed. Please try again.')
      }
    } finally {
      this.isSearching = false
      this.hideProgress()
      this.toggleSearchButtons(false)
    }
  }

  searchInDocument(doc, query) {
    const matches = []

    // Search in title
    const titleMatches = this.findMatches(doc.title, query)
    if (titleMatches.length > 0) {
      matches.push({
        field: 'title',
        text: doc.title,
        positions: titleMatches
      })
    }

    // Search in content
    if (doc.content) {
      const lines = doc.content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const lineMatches = this.findMatches(lines[i], query)
        if (lineMatches.length > 0) {
          matches.push({
            field: 'content',
            line: i + 1,
            text: lines[i],
            positions: lineMatches
          })
        }
      }
    }

    // Search in tags
    if (doc.tags && doc.tags.length > 0) {
      const tagsText = doc.tags.join(', ')
      const tagMatches = this.findMatches(tagsText, query)
      if (tagMatches.length > 0) {
        matches.push({
          field: 'tags',
          text: tagsText,
          positions: tagMatches
        })
      }
    }

    return matches
  }

  findMatches(text, query) {
    const matches = []
    const searchText = text.toLowerCase()
    const searchPattern = query.toLowerCase()

    // Simple case-insensitive substring search
    let index = 0
    while ((index = searchText.indexOf(searchPattern, index)) !== -1) {
      matches.push({
        start: index,
        end: index + searchPattern.length
      })
      index += searchPattern.length
    }

    return matches
  }

  displayResults() {
    const content = this.container.querySelector('.search-content')

    if (this.searchResults.length === 0) {
      content.innerHTML = `
        <div class="search-no-results">
          <div class="no-results-icon">🔍</div>
          <p>No results found for "${this.escapeHtml(this.currentQuery)}"</p>
          <small>Try different keywords</small>
        </div>
      `
      return
    }

    // Sort results by relevance (title matches first, then by match count)
    this.searchResults.sort((a, b) => {
      const aTitleMatch = a.matches.some((m) => m.field === 'title')
      const bTitleMatch = b.matches.some((m) => m.field === 'title')

      if (aTitleMatch && !bTitleMatch) return -1
      if (!aTitleMatch && bTitleMatch) return 1

      return b.matches.length - a.matches.length
    })

    let html = `
      <div class="search-results-header">
        <span class="results-count">Found ${this.searchResults.length} document${this.searchResults.length === 1 ? '' : 's'}</span>
        <button class="clear-results" aria-label="Clear results">Clear</button>
      </div>
      <div class="search-results-list" role="listbox">
    `

    for (const result of this.searchResults) {
      html += this.renderSearchResult(result)
    }

    html += '</div>'
    content.innerHTML = html

    // Add clear button handler
    content.querySelector('.clear-results').addEventListener('click', () => {
      this.clearResults()
    })
  }

  renderSearchResult(result) {
    const { document: doc, matches } = result
    const timeAgo = this.formatTimeAgo(doc.updatedAt || doc.metadata?.modified)

    let html = `
      <div class="search-result-item" 
           data-doc-id="${doc.id}"
           role="option"
           tabindex="0">
        <div class="result-header">
          <span class="result-title">${this.highlightText(doc.title, this.currentQuery)}</span>
          <span class="result-meta">${timeAgo}</span>
        </div>
    `

    // Show match snippets
    const snippets = matches.slice(0, 3) // Show max 3 snippets
    for (const match of snippets) {
      if (match.field === 'content') {
        html += `
          <div class="result-snippet" data-line="${match.line}">
            <span class="snippet-line">Line ${match.line}:</span>
            <span class="snippet-text">${this.highlightText(this.truncateText(match.text, 80), this.currentQuery)}</span>
          </div>
        `
      } else if (match.field === 'tags') {
        html += `
          <div class="result-snippet">
            <span class="snippet-field">Tags:</span>
            <span class="snippet-text">${this.highlightText(match.text, this.currentQuery)}</span>
          </div>
        `
      }
    }

    if (matches.length > 3) {
      html += `<div class="result-more">...and ${matches.length - 3} more matches</div>`
    }

    html += '</div>'
    return html
  }

  highlightText(text, query) {
    const escaped = this.escapeHtml(text)
    const pattern = new RegExp(`(${this.escapeRegex(query)})`, 'gi')
    return escaped.replace(pattern, '<mark>$1</mark>')
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text

    // Try to find the query in the text and show context around it
    const queryIndex = text.toLowerCase().indexOf(this.currentQuery.toLowerCase())
    if (queryIndex !== -1) {
      const start = Math.max(0, queryIndex - 30)
      const end = Math.min(text.length, queryIndex + this.currentQuery.length + 30)
      const truncated = text.substring(start, end)
      return (start > 0 ? '...' : '') + truncated + (end < text.length ? '...' : '')
    }

    return text.substring(0, maxLength) + '...'
  }

  navigateResults(direction) {
    const results = this.container.querySelectorAll('.search-result-item')
    if (results.length === 0) return

    const newIndex = this.selectedResultIndex + direction
    if (newIndex < 0 || newIndex >= results.length) return

    this.selectedResultIndex = newIndex

    // Update selection
    results.forEach((item, index) => {
      item.classList.toggle('selected', index === newIndex)
    })

    results[newIndex].scrollIntoView({ block: 'nearest' })
  }

  async navigateToResult(docId, lineNumber) {
    try {
      const doc = await this.app.storageManager.getDocument(docId)
      if (doc) {
        // Load document
        this.app.loadDocument(doc)

        // Navigate to specific line if provided
        if (lineNumber && this.app.editor && this.app.editor.view) {
          setTimeout(() => {
            const content = this.app.editor.getContent()
            const position = this.getPositionFromLine(content, lineNumber)

            const view = this.app.editor.view
            view.dispatch({
              selection: { anchor: position, head: position },
              scrollIntoView: true
            })
            view.focus()
          }, 100)
        }
      }
    } catch (error) {
      console.error('Failed to navigate to result:', error)
    }
  }

  getPositionFromLine(content, lineNumber) {
    const lines = content.split('\n')
    let position = 0

    for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
      position += lines[i].length + 1
    }

    return position
  }

  stopSearch() {
    if (this.searchAbortController) {
      this.searchAbortController.abort()
    }
    this.isSearching = false
    this.hideProgress()
    this.toggleSearchButtons(false)
  }

  clearResults() {
    this.searchResults = []
    this.currentQuery = ''
    this.selectedResultIndex = -1

    const content = this.container.querySelector('.search-content')
    content.innerHTML = `
      <div class="search-welcome">
        <p>Search across all documents</p>
        <small>Enter keywords to find in titles, content, and metadata</small>
      </div>
    `

    const searchInput = this.container.querySelector('.search-input')
    searchInput.value = ''
    searchInput.focus()
  }

  showProgress() {
    const progress = this.container.querySelector('.search-progress')
    progress.style.display = 'block'

    const fill = progress.querySelector('.progress-fill')
    fill.style.width = '0%'
  }

  hideProgress() {
    const progress = this.container.querySelector('.search-progress')
    progress.style.display = 'none'
  }

  updateProgress(current, total) {
    const progress = this.container.querySelector('.search-progress')
    const fill = progress.querySelector('.progress-fill')
    const count = progress.querySelector('.progress-count')

    const percentage = (current / total) * 100
    fill.style.width = `${percentage}%`
    count.textContent = `${current} / ${total} documents`
  }

  toggleSearchButtons(isSearching) {
    const searchButton = this.container.querySelector('.search-button')
    const stopButton = this.container.querySelector('.search-stop')

    searchButton.style.display = isSearching ? 'none' : 'block'
    stopButton.style.display = isSearching ? 'block' : 'none'
  }

  showMessage(message) {
    const content = this.container.querySelector('.search-content')
    content.innerHTML = `
      <div class="search-message">
        <p>${message}</p>
      </div>
    `
  }

  showError(message) {
    const content = this.container.querySelector('.search-content')
    content.innerHTML = `
      <div class="search-error">
        <div class="error-icon">⚠️</div>
        <p>${message}</p>
      </div>
    `
  }

  // Public methods
  onActivate() {
    // Focus search input when tab becomes active
    const searchInput = this.container.querySelector('.search-input')
    if (searchInput) {
      searchInput.focus()
    }
  }

  setQuery(query) {
    const searchInput = this.container.querySelector('.search-input')
    if (searchInput) {
      searchInput.value = query
      if (query && query.trim()) {
        this.performSearch(query)
      } else {
        // Just focus the input for user to type
        searchInput.focus()
      }
    }
  }

  // Utility methods
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  formatTimeAgo(dateString) {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
