/**
 * Legal Splash Component - Modal dialog for legal document acceptance
 * Follows Fantasy Editor standards: clean code, defensive programming, KISS principle
 */
import { manifestLoader } from '../../utils/manifest-loader.js'

export class LegalSplash {
  constructor(legalManager, manifestLoaderInstance = manifestLoader, options = {}) {
    this.legalManager = legalManager
    this.manifestLoader = manifestLoaderInstance
    this.options = options
    this.isOpen = false
    this.currentTab = 'privacy-policy'
    this.documents = {}
    this.readProgress = {}
    this.acceptanceState = {}
    this.appInfo = null
    this.userId = null
    this.element = null
    this.onAcceptance = null

    // Document types mapping
    this.documentTypes = [
      'privacy-policy',
      'terms-of-service',
      'eula',
      'license',
      'release-notes'
    ]

    // Progress threshold for enabling acceptance
    this.readThreshold = 80

    // Bind methods for event listeners
    this.handleKeydown = this.handleKeydown.bind(this)
    this.handleClick = this.handleClick.bind(this)
    this.handleScroll = this.handleScroll.bind(this)
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this)
  }

  /**
   * Show splash screen modal
   */
  async show(userId, requiredDocuments, onAcceptance = null) {
    this.validateShowParameters(userId, requiredDocuments)

    if (this.isOpen) {
      return false
    }

    try {
      this.userId = userId
      this.onAcceptance = onAcceptance

      await this.loadAppInfo()
      await this.loadDocuments(requiredDocuments)

      this.createModal(requiredDocuments)
      this.attachEventListeners()
      this.initializeProgress()

      this.isOpen = true
      document.body.classList.add('legal-splash-open')

      return true
    } catch (error) {
      console.error('Failed to show legal splash:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Hide splash screen modal
   */
  hide() {
    if (!this.isOpen) {
      return
    }

    this.removeEventListeners()

    if (this.element) {
      this.element.remove()
      this.element = null
    }

    document.body.classList.remove('legal-splash-open')

    this.cleanup()
    this.isOpen = false
  }

  /**
   * Render complete modal HTML
   */
  render(requiredDocuments) {
    this.validateRequiredDocuments(requiredDocuments)

    return `
      <div class="legal-splash" role="dialog" aria-modal="true" aria-labelledby="splash-title">
        ${this.renderHeader()}
        ${this.renderTabs(requiredDocuments)}
        <div class="splash-body">
          ${this.renderContent()}
          ${this.renderProgress()}
        </div>
        ${this.renderActions(requiredDocuments)}
      </div>
    `
  }

  /**
   * Switch to different document tab
   */
  switchTab(documentType) {
    this.validateDocumentType(documentType)

    if (documentType === this.currentTab) {
      return
    }

    this.currentTab = documentType

    if (!this.readProgress[documentType]) {
      this.readProgress[documentType] = 0
    }

    this.updateTabDisplay()
    this.updateContent()
    this.updateProgress()
  }

  /**
   * Calculate reading progress from scroll position
   */
  calculateReadProgress(element) {
    if (!element) {
      return 0
    }

    const { scrollTop, scrollHeight, clientHeight } = element

    if (scrollHeight <= clientHeight) {
      return 100 // Content fits without scrolling
    }

    const maxScroll = scrollHeight - clientHeight
    const progress = (scrollTop / maxScroll) * 100

    return Math.min(100, Math.max(0, progress))
  }

  /**
   * Track scroll progress for current document
   * Once a document reaches 100%, it stays at 100%
   */
  trackScrollProgress(element) {
    if (!this.currentTab || !element) {
      return
    }

    // Don't decrease progress if already at 100%
    const currentProgress = this.readProgress[this.currentTab] || 0
    if (currentProgress >= 100) {
      return
    }

    const progress = this.calculateReadProgress(element)
    // Only update if new progress is higher than current
    if (progress > currentProgress) {
      this.readProgress[this.currentTab] = progress
      this.updateProgressDisplay()
      // Pass required documents from the instance
      const requiredDocuments = ['privacy-policy', 'eula', 'license']
      this.updateActionButtons(requiredDocuments)
    }
  }

  /**
   * Check if document can be accepted (meets reading requirement)
   */
  canAcceptDocument(documentType) {
    const progress = this.readProgress[documentType] || 0
    return progress >= this.readThreshold
  }

  /**
   * Validate if all required documents are accepted
   */
  validateAcceptance(requiredDocuments) {
    this.validateRequiredDocuments(requiredDocuments)

    return requiredDocuments.every(docType => {
      return this.acceptanceState[docType] === true &&
             this.canAcceptDocument(docType)
    })
  }

  /**
   * Check if submit buttons should be enabled
   */
  canSubmit(requiredDocuments) {
    return requiredDocuments.every(doc =>
      this.readProgress[doc] >= this.readThreshold
    )
  }

  /**
   * Handle accept all documents
   */
  async handleAcceptAll(requiredDocuments) {
    await this.recordAcceptances(requiredDocuments)

    if (this.onAcceptance) {
      this.onAcceptance({
        userId: this.userId,
        acceptedDocuments: requiredDocuments,
        timestamp: new Date()
      })
    }

    this.hide()
  }

  /**
   * Handle accept required documents only
   */
  async handleAcceptRequired(requiredDocuments) {
    const acceptedDocs = requiredDocuments.filter(doc =>
      this.acceptanceState[doc] === true
    )

    await this.recordAcceptances(acceptedDocs)

    if (this.onAcceptance) {
      this.onAcceptance({
        userId: this.userId,
        acceptedDocuments: acceptedDocs,
        timestamp: new Date()
      })
    }

    this.hide()
  }

  /**
   * Load app info from manifest
   */
  async loadAppInfo() {
    try {
      const [icon, name, themeColor] = await Promise.all([
        this.manifestLoader.getBestIcon(48),
        this.manifestLoader.getAppName(),
        this.manifestLoader.getThemeColor()
      ])

      this.appInfo = { icon, name, themeColor }
    } catch (error) {
      console.warn('Failed to load app info:', error)
      this.appInfo = this.createFallbackAppInfo()
    }
  }

  /**
   * Load required documents
   */
  async loadDocuments(requiredDocuments) {
    this.documents = {}

    for (const docType of requiredDocuments) {
      try {
        this.documents[docType] = await this.legalManager.fetchDocument(docType)
      } catch (error) {
        console.warn(`Failed to load document ${docType}:`, error)
        this.documents[docType] = this.createFallbackDocument(docType)
      }
    }
  }

  /**
   * Create modal element and add to DOM
   */
  createModal(requiredDocuments) {
    this.element = document.createElement('div')
    this.element.className = 'legal-splash-overlay'
    this.element.innerHTML = this.render(requiredDocuments)

    document.body.appendChild(this.element)
  }

  /**
   * Initialize progress tracking for all documents
   */
  initializeProgress() {
    Object.keys(this.documents).forEach(docType => {
      if (!this.readProgress[docType]) {
        this.readProgress[docType] = 0
      }
      if (!this.acceptanceState[docType]) {
        this.acceptanceState[docType] = false
      }
    })
  }

  /**
   * Record user acceptances to storage
   */
  async recordAcceptances(documentTypes) {
    const promises = documentTypes.map(docType => {
      const document = this.documents[docType]
      return this.legalManager.recordUserAcceptance({
        userId: this.userId,
        documentType: docType,
        documentHash: document.hash,
        documentVersion: document.version,
        acceptedAt: new Date(),
        readProgress: this.readProgress[docType]
      })
    })

    await Promise.all(promises)
  }

  /**
   * Render modal header
   */
  renderHeader() {
    const iconSrc = this.appInfo?.icon?.src || '/dist/icons/icon-48x48.png'
    const appName = this.options.appName ||
                    this.appInfo?.short_name ||
                    this.appInfo?.name ||
                    'App'

    return `
      <div class="splash-header">
        <div class="splash-branding">
          <img src="${iconSrc}" alt="${appName} logo" class="splash-logo">
          <div class="splash-title-group">
            <h1 id="splash-title">${appName}</h1>
            <p class="splash-subtitle">Legal Agreement</p>
          </div>
        </div>
        <button class="splash-close" aria-label="Close legal documents">×</button>
      </div>
    `
  }

  /**
   * Render document tabs
   */
  renderTabs(requiredDocuments) {
    const tabs = requiredDocuments.map(docType => {
      const isActive = docType === this.currentTab
      const label = this.getDocumentLabel(docType)

      return `
        <button
          class="splash-tab ${isActive ? 'active' : ''}"
          data-tab="${docType}"
          role="tab"
          aria-selected="${isActive}"
          aria-controls="splash-panel-${docType}"
          tabindex="${isActive ? '0' : '-1'}"
        >
          ${label}
        </button>
      `
    }).join('')

    return `
      <div class="splash-tabs" role="tablist" aria-label="Legal documents">
        ${tabs}
      </div>
    `
  }

  /**
   * Render document content area
   */
  renderContent() {
    const document = this.documents[this.currentTab]

    if (!document) {
      return `
        <div class="splash-content" role="tabpanel" id="splash-panel-${this.currentTab}">
          <div class="splash-loading">Loading document...</div>
        </div>
      `
    }

    if (document.error) {
      return `
        <div class="splash-content" role="tabpanel" id="splash-panel-${this.currentTab}">
          <div class="splash-error">Error loading document: ${document.error}</div>
        </div>
      `
    }

    const content = this.renderMarkdown(document.content)

    return `
      <div
        class="splash-content"
        role="tabpanel"
        id="splash-panel-${this.currentTab}"
        tabindex="0"
        data-document="${this.currentTab}"
      >
        ${content}
      </div>
    `
  }

  /**
   * Render progress indicator
   */
  renderProgress() {
    const progress = this.readProgress[this.currentTab] || 0
    const progressWidth = Math.round(progress)

    return `
      <div class="splash-progress">
        <div class="splash-progress-label">
          Reading Progress:
          <span class="splash-progress-percent">${progressWidth}%</span>
        </div>
        <div class="splash-progress-bar">
          <div
            class="splash-progress-fill"
            style="width: ${progressWidth}%"
            aria-valuenow="${progressWidth}"
            aria-valuemin="0"
            aria-valuemax="100"
            role="progressbar"
          ></div>
        </div>
      </div>
    `
  }

  /**
   * Render acceptance form
   */
  renderAcceptanceForm(requiredDocuments) {
    const checkboxes = requiredDocuments.map(docType => {
      const label = this.getDocumentLabel(docType)
      const checked = this.acceptanceState[docType] ? 'checked' : ''
      const canAccept = this.canAcceptDocument(docType)
      const disabled = !canAccept ? 'disabled' : ''

      return `
        <label class="splash-checkbox">
          <input
            type="checkbox"
            data-document="${docType}"
            ${checked}
            ${disabled}
            aria-describedby="splash-help-${docType}"
          >
          <span class="splash-checkbox-label">${label}</span>
          ${!canAccept ? '<span class="splash-checkbox-help" id="splash-help-' + docType + '">Read to 80% to accept</span>' : ''}
        </label>
      `
    }).join('')

    return `
      <div class="splash-acceptance">
        <div class="splash-checkboxes">
          ${checkboxes}
        </div>
      </div>
    `
  }

  /**
   * Render action buttons
   */
  renderActions(requiredDocuments) {
    // Check if all required documents have been read to 80%
    const allDocsRead = requiredDocuments.every(doc =>
      this.readProgress[doc] >= this.readThreshold
    )

    return `
      <div class="splash-actions">
        <button
          id="accept-all-btn"
          class="splash-button splash-button-primary"
          data-action="accept-all"
          ${!allDocsRead ? 'disabled' : ''}
          aria-describedby="accept-help"
        >
          Accept Terms
        </button>
        ${''}
      </div>
    `
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    document.addEventListener('keydown', this.handleKeydown)
    this.element.addEventListener('click', this.handleClick)
    // Removed checkbox change listener - no longer needed

    const contentArea = this.element.querySelector('.splash-content')
    if (contentArea) {
      contentArea.addEventListener('scroll', this.handleScroll)
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    document.removeEventListener('keydown', this.handleKeydown)

    if (this.element) {
      this.element.removeEventListener('click', this.handleClick)
      this.element.removeEventListener('change', this.handleCheckboxChange)

      const contentArea = this.element.querySelector('.splash-content')
      if (contentArea) {
        contentArea.removeEventListener('scroll', this.handleScroll)
      }
    }
  }

  /**
   * Handle keyboard events
   */
  handleKeydown(event) {
    if (!this.isOpen) return

    switch (event.key) {
      case 'Escape':
        this.hide()
        event.preventDefault()
        break
      case 'Tab':
        this.handleTabKeyNavigation(event)
        break
    }
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    const target = event.target

    // Handle close button
    if (target.classList.contains('splash-close')) {
      this.hide()
      return
    }

    // Handle overlay click
    if (target === this.element) {
      this.hide()
      return
    }

    // Handle tab clicks
    const tab = target.closest('[data-tab]')
    if (tab) {
      const docType = tab.dataset.tab
      this.switchTab(docType)
      return
    }

    // Handle action buttons
    const action = target.dataset.action
    if (action) {
      this.handleAction(action)
      return
    }
  }

  /**
   * Handle scroll events
   */
  handleScroll(event) {
    this.trackScrollProgress(event.target)
  }

  /**
   * Handle checkbox changes
   */
  handleCheckboxChange(event) {
    const target = event.target

    if (target.type === 'checkbox' && target.dataset.document) {
      const docType = target.dataset.document
      this.acceptanceState[docType] = target.checked
      const requiredDocuments = ['privacy-policy', 'eula', 'license']
      this.updateActionButtons(requiredDocuments)
    }
  }

  /**
   * Handle action button clicks
   */
  async handleAction(action) {
    const requiredDocs = Object.keys(this.documents)

    try {
      switch (action) {
        case 'accept-all':
          await this.handleAcceptAll(requiredDocs)
          break
        case 'accept-required':
          await this.handleAcceptRequired(requiredDocs)
          break
      }
    } catch (error) {
      console.error('Failed to handle action:', action, error)
      throw error
    }
  }

  /**
   * Update tab display
   */
  updateTabDisplay() {
    if (!this.element) return

    const tabs = this.element.querySelectorAll('[data-tab]')
    tabs.forEach(tab => {
      const isActive = tab.dataset.tab === this.currentTab
      tab.classList.toggle('active', isActive)
      tab.setAttribute('aria-selected', isActive)
      tab.setAttribute('tabindex', isActive ? '0' : '-1')
    })
  }

  /**
   * Update content display
   */
  updateContent() {
    if (!this.element) return

    const contentArea = this.element.querySelector('.splash-content')
    if (contentArea) {
      const document = this.documents[this.currentTab]

      if (!document) {
        contentArea.innerHTML = '<div class="splash-loading">Loading document...</div>'
        return
      }

      if (document.error) {
        contentArea.innerHTML = `<div class="splash-error">Error loading document: ${document.error}</div>`
        return
      }

      // Direct content rendering - no regex extraction needed
      const content = this.renderMarkdown(document.content)
      contentArea.innerHTML = content
    }
  }

  /**
   * Update progress display
   */
  updateProgressDisplay() {
    if (!this.element) return

    const progressArea = this.element.querySelector('.splash-progress')
    if (progressArea) {
      progressArea.innerHTML = this.renderProgress().match(/<div class="splash-progress">(.*)<\/div>/s)[1]
    }
  }

  /**
   * Update progress indicator
   */
  updateProgress() {
    this.updateProgressDisplay()
    // Action buttons will be updated via trackScrollProgress
  }

  /**
   * Update action button states
   */
  updateActionButtons(requiredDocuments) {
    if (!this.element) return

    const button = this.element.querySelector('#accept-all-btn')
    const helpText = this.element.querySelector('#accept-help')

    if (button && requiredDocuments) {
      const allDocsRead = requiredDocuments.every(doc =>
        this.readProgress[doc] >= this.readThreshold
      )

      button.disabled = !allDocsRead

      // Update help text
      if (helpText) {
        if (allDocsRead) {
          helpText.remove()
        }
      } else if (!allDocsRead) {
        // Add help text if not present
        const help = document.createElement('p')
        help.className = 'splash-help'
        help.id = 'accept-help'
        help.textContent = ''
        button.parentNode.appendChild(help)
      }
    }
  }

  /**
   * Handle tab key navigation for accessibility
   */
  handleTabKeyNavigation(event) {
    const focusableElements = this.element.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      lastElement.focus()
      event.preventDefault()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      firstElement.focus()
      event.preventDefault()
    }
  }

  /**
   * Get display label for document type
   */
  getDocumentLabel(documentType) {
    const labels = {
      'privacy-policy': 'Privacy Policy',
      'terms-of-service': 'Terms of Service',
      'eula': 'EULA',
      'license': 'License',
      'release-notes': 'Release Notes'
    }
    return labels[documentType] || documentType
  }

  /**
   * Render markdown content (basic implementation)
   */
  renderMarkdown(content) {
    if (!content) {
      return '<p>No content available</p>'
    }

    return content
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Remove strikethrough text completely
      .replace(/~~(.*?)~~/g, '')
      // Line breaks and paragraphs
      .replace(/\n\n+/g, '</p><p>')
      // Lists
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      // Wrap in paragraphs
      .replace(/^(?!<[h123]|<ul|<li)/gm, '<p>')
      .replace(/(?<!<\/[h123]>|<\/ul>|<\/li>)$/gm, '</p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      // Clean up paragraph tags around headers and lists
      .replace(/<p>(<[h123].*?<\/[h123]>)<\/p>/g, '$1')
      .replace(/<p>(<ul.*?<\/ul>)<\/p>/gs, '$1')
  }

  /**
   * Create fallback app info
   */
  createFallbackAppInfo() {
    return {
      name: 'Fantasy',
      icon: { src: '/dist/icons/icon-48x48.png' },
      themeColor: '#007bff'
    }
  }

  /**
   * Create fallback document
   */
  createFallbackDocument(documentType) {
    return {
      type: documentType,
      content: `# ${this.getDocumentLabel(documentType)}\n\nFailed to load document content.`,
      hash: null,
      version: null,
      error: 'Failed to load document from server'
    }
  }

  /**
   * Validate show parameters
   */
  validateShowParameters(userId, requiredDocuments) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('User ID is required')
    }

    if (!Array.isArray(requiredDocuments)) {
      throw new Error('Required documents must be an array')
    }
  }

  /**
   * Validate required documents array
   */
  validateRequiredDocuments(requiredDocuments) {
    if (!Array.isArray(requiredDocuments)) {
      throw new Error('Required documents must be an array')
    }

    requiredDocuments.forEach(docType => {
      this.validateDocumentType(docType)
    })
  }

  /**
   * Validate document type
   */
  validateDocumentType(documentType) {
    if (!this.documentTypes.includes(documentType)) {
      throw new Error(`Invalid document type: ${documentType}`)
    }
  }

  /**
   * Clean up component state
   */
  cleanup() {
    this.documents = {}
    this.readProgress = {}
    this.acceptanceState = {}
    this.userId = null
    this.onAcceptance = null
    this.currentTab = 'privacy-policy'
  }
}