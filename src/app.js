import { EditorManager } from './core/editor/editor.js'
import { ThemeManager } from './core/themes/theme-manager.js'
import { StorageManager } from './core/storage/storage-manager.js'
import { SettingsManager } from './core/settings/settings-manager.js'
import { SearchEngine } from './core/search/search-engine.js'
import { CommandRegistry } from './core/commands/command-registry.js'
import { CommandBar } from './components/command-bar-v2/components/CommandBar.js'
import './components/command-bar-v2/styles/command-bar.css'
import './components/dialogs/settings-dialog.css'
import { Navigator } from './components/navigator/navigator.js'
import { FileTree } from './components/sidebar/file-tree.js'
import { registerCoreCommands } from './core/commands/core-commands.js'
import { registerGitCommands } from './core/commands/git-commands.js'
import { guidManager } from './utils/guid.js'
import { devHelpers } from './utils/dev-helpers.js'
import { AuthManager } from './core/auth/auth-manager.js'
import { GitHubStorage } from './core/storage/github-storage.js'
import { SyncManager } from './core/storage/sync-manager.js'
import { SyncStatusManager } from './core/sync/sync-status-manager.js'
import { GitService } from './core/git/git-service.js'
import { AuthButton } from './components/auth/auth-button.js'
import { GitHubUserMenu } from './components/auth/github-user-menu.js'
import { WidthManager } from './core/editor/width-manager.js'
import { StatusBarManager } from './components/status-bar/status-bar-manager.js'
import { LegalManager } from './core/legal/legal-manager.js'
import { LegalSplash } from './components/legal-splash/legal-splash.js'
import './components/legal-splash/legal-splash.css'
import { DiffManager } from './core/diff/diff-manager.js'
import './styles/diff-mode.css'

class FantasyEditorApp {
  constructor() {
    this.editor = null
    this.settingsManager = null
    this.themeManager = null
    this.storageManager = null
    this.searchEngine = null
    this.commandRegistry = null
    this.commandBar = null
    this.navigator = null
    this.fileTree = null
    this.currentDocument = null
    this.autoSaveTimeout = null
    this.guidManager = guidManager
    this.documentChangeTracking = {
      lastContentChecksum: null,
      lastTitleHash: null,
      hasUnsavedChanges: false
    }

    // Multi-provider authentication integration
    this.authManager = null
    this.githubStorage = null
    this.syncManager = null
    this.authButton = null
    this.githubUserMenu = null

    // Writer enhancements
    this.exportManager = null
    this.widthManager = null
    this.statusBarManager = null

    // Legal compliance system
    this.legalManager = null
    this.legalSplash = null

    // Git diff functionality
    this.diffManager = null
  }

  async init() {
    try {
      await this.initializeManagers()
      await this.initializeLegalCompliance()
      this.attachEventListeners()
      await this.loadInitialDocument()
      this.updateUI()

      // Hide legacy sidebar initially and setup navigator
      const sidebar = document.querySelector('.sidebar')
      const appMain = document.querySelector('.app-main')
      if (sidebar) {
        sidebar.classList.add('sidebar-hidden')
      }
      if (appMain) {
        appMain.classList.add('navigator-hidden')
      }

      // Initialize navigator preferences
      if (this.navigator) {
        this.navigator.restorePreferences()
      }

      // Set up periodic sync status updates
      this.startPeriodicSyncStatusUpdates()

      // Fantasy Editor initialized successfully
    } catch (error) {
      console.error('Failed to initialize app:', error)
      this.showError('Failed to initialize the editor. Please refresh the page.')
    }
  }


  async initializeManagers() {
    // Initialize settings manager first
    this.settingsManager = new SettingsManager()
    
    // Initialize theme manager (pass settings manager)
    this.themeManager = new ThemeManager(this.settingsManager)

    // Initialize storage
    this.storageManager = new StorageManager()
    this.searchEngine = new SearchEngine(this.storageManager)

    // Initialize editor with theme manager integration
    const editorElement = document.getElementById('editor')
    this.editor = new EditorManager(editorElement, this.themeManager, this.showNotification.bind(this), this.settingsManager, this.handleContentChange.bind(this))

    // Initialize writer enhancements
    this.widthManager = new WidthManager(this.settingsManager, this)
    this.statusBarManager = new StatusBarManager(this)
    
    // ExportManager is lazy-loaded to reduce bundle size
    this._exportManager = null
    
    // Set up width manager callbacks to update status bar
    if (this.widthManager && this.statusBarManager) {
      this.widthManager.setWidthChangeCallback((width) => {
        this.statusBarManager.updateEditorWidth(width)
      })
      this.widthManager.setZoomChangeCallback((zoom) => {
        this.statusBarManager.updateEditorZoom(zoom)
      })
      
      // Initialize status bar with current values
      const currentWidth = this.widthManager.getCurrentWidth()
      const currentZoom = this.widthManager.getCurrentZoom()
      
      if (currentWidth && currentWidth.columns) {
        this.statusBarManager.updateEditorWidth(currentWidth.columns)
      }
      if (currentZoom && typeof currentZoom.level === 'number') {
        this.statusBarManager.updateEditorZoom(currentZoom.level)
      }
    }

    // Initialize Git diff functionality
    this.diffManager = new DiffManager(this)

    // Initialize multi-provider authentication integration
    await this.initializeAuthIntegration()

    // Initialize command system
    this.commandRegistry = new CommandRegistry()
    this.commandBar = new CommandBar(this.commandRegistry, {
      container: document.body,
      options: {
        placeholder: 'Type a command or search...',
        position: 'top',
        maxResults: 20
      }
    })

    // Initialize Navigator
    const navigatorContainer = document.getElementById('navigator')
    if (navigatorContainer) {
      this.navigator = new Navigator(navigatorContainer, this)
    }

    // Initialize file tree (legacy fallback)
    const fileTreeContainer = document.getElementById('file-tree')
    this.fileTree = new FileTree(fileTreeContainer, this.storageManager, (document) => {
      this.loadDocument(document)
    })

    // Register core commands
    registerCoreCommands(this.commandRegistry, this)

    // Register Git commands
    registerGitCommands(this.commandRegistry, this)
    
    // Initialize command bar v2 after commands are registered
    await this.commandBar.initialize()

    // Initialize dev helpers for console access
    devHelpers.init(this)

    // Handle GitHub OAuth callback
    this.handleOAuthCallback()

    // Handle command execution results
    this.setupCommandEventHandlers()

    // Setup window resize handler for responsive width behavior
    this.setupResizeHandler()
  }

  /**
   * Initialize legal compliance system
   */
  async initializeLegalCompliance() {
    try {
      // Initialize legal manager
      this.legalManager = new LegalManager()
      await this.legalManager.init()

      // Initialize legal splash component
      this.legalSplash = new LegalSplash(this.legalManager, undefined, { appName: 'Fantasy' })

      // Check if user needs to accept legal documents
      const hasAccepted = await this.legalManager.hasUserAcceptedAll()
      if (!hasAccepted) {
        // Show legal splash modal with required parameters
        const userId = this.legalManager.generateUserId()
        const requiredDocuments = ['privacy-policy', 'eula', 'license'] // Required documents for app usage

        const onAcceptance = async () => {
          // Auto-open release notes after legal acceptance (first-time only)
          console.log('🎉 Legal documents accepted - opening release notes')
          await this.openReleaseNotesAfterAcceptance()
        }

        await this.legalSplash.show(userId, requiredDocuments, onAcceptance)
      }

    } catch (error) {
      console.error('Failed to initialize legal compliance system:', error)
      // Continue app initialization even if legal system fails
      // This ensures the app remains functional for existing users
    }
  }

  /**
   * Auto-open release notes after legal acceptance
   * Provides users with latest updates after they accept legal documents
   */
  async openReleaseNotesAfterAcceptance() {
    try {
      console.log('📋 Attempting to open release notes after legal acceptance')

      // Initialize system documents manager if needed
      if (!this.systemDocumentsManager) {
        console.log('📋 Initializing system documents manager')
        const { SystemDocumentsManager } = await import('./core/storage/system-documents.js')
        this.systemDocumentsManager = new SystemDocumentsManager(this.storageManager)
      }

      // Load release notes using same pattern as :release command
      console.log('📋 Loading release notes document')
      const releaseDoc = await this.systemDocumentsManager.getSystemDocument('release-notes')
      if (releaseDoc) {
        console.log('📋 Release notes found, loading with delay')
        // Small delay to ensure legal splash has finished closing
        setTimeout(() => {
          console.log('📋 Loading release notes document into editor')
          this.loadDocument(releaseDoc)
          this.showNotification('Welcome to Fantasy Editor! Here\'s what\'s new in this version.', 'info')
        }, 500)
      } else {
        console.warn('⚠️ Release notes not available for auto-open after legal acceptance')
      }
    } catch (error) {
      console.error('❌ Failed to auto-open release notes after legal acceptance:', error)
      // Non-critical failure - don't block user experience
    }
  }

  /**
   * Setup command event handlers
   */
  setupCommandEventHandlers() {
    // Command event handling is now done in core-commands.js
    // This avoids duplicate event listeners and inconsistent formatting
  }

  /**
   * Lazy-load ExportManager to reduce bundle size
   * Only loads when export functionality is first used
   */
  async getExportManager() {
    if (!this._exportManager) {
      // Dynamically import ExportManager only when needed
      const module = await import('./core/export/export-manager.js')
      const { ExportManager } = module
      this._exportManager = new ExportManager(this)
    }
    return this._exportManager
  }

  /**
   * Setup window resize handler for responsive behavior
   */
  setupResizeHandler() {
    if (this.widthManager) {
      // Handle resize for responsive width behavior
      window.addEventListener('resize', () => {
        this.widthManager.handleResize()
      })

      // Initial resize handling
      this.widthManager.handleResize()
    }
  }

  /**
   * Handle GitHub OAuth callback
   */
  handleOAuthCallback() {
    // Check if current URL contains OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const error = urlParams.get('error')

    if (code || error) {
      // This is an OAuth callback
      if (error) {
        console.error('OAuth error:', error)
        this.showNotification(`Git repository login failed: ${error}`, 'error')
      } else if (code) {
        this.completeOAuthFlow(code, state)
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  /**
   * Complete OAuth authentication flow
   */
  async completeOAuthFlow(code, state) {
    try {
      if (!this.authManager) {
        throw new Error('Authentication integration not initialized')
      }

      // Handle the OAuth callback
      const user = await this.authManager.handleCallback(window.location.href)

      this.showNotification(`Successfully logged in as ${user.name}!`, 'success')

      // Update authentication UI
      this.updateAuthUI()

      // Automatically create and configure default repository
      await this.setupDefaultRepository(user)
    } catch (error) {
      console.error('OAuth completion failed:', error)
      this.showNotification(`Login failed: ${error.message}`, 'error')
    }
  }

  /**
   * Setup default Fantasy Editor repository after login
   */
  async setupDefaultRepository(user) {
    try {
      if (!this.githubStorage) {
        console.log('Git repository storage not initialized, skipping repository setup')
        return
      }

      // Extract username - GitHub uses 'username' property in AuthManager
      const username = user?.login || user?.username
      if (!username) {
        console.error('ERROR: No username found in user object')
        this.showNotification('GitHub user information incomplete. Please try logging in again.', 'error')
        return
      }
      
      const success = await this.githubStorage.createDefaultRepository(username)

      if (success) {
        // Only show success notification when everything is working
        this.showNotification(`Repository "${username}/fantasy-editor" ready!`, 'success')
        // Repository setup complete
        // Reset the flag so future configuration changes work
        this.hasAttemptedRepositorySetup = false
        // Update UI to reflect new repository configuration
        this.updateAuthUI()
        // Trigger immediate sync status update
        this.updateGitHubSyncStatus()
      } else {
        // Only log to console, don't show warning notification for setup issues
        // Repository auto-setup skipped
      }
    } catch (error) {
      console.error('Repository auto-setup failed:', error)
      // No warning notification - users can configure manually if needed
    }
  }

  async initializeAuthIntegration() {
    try {
      // Initialize multi-provider authentication manager
      this.authManager = new AuthManager()
      await this.authManager.init()

      const availableProviders = this.authManager.getAvailableProviders()
      if (availableProviders.length === 0) {
        console.warn('No OAuth providers configured. Check environment variables for provider client IDs.')
        // Don't return early - continue with initialization even without providers
      }

      // Initialize GitHub storage (backward compatibility)
      // TODO: Create provider-agnostic storage in future updates
      this.githubStorage = new GitHubStorage(this.authManager)

      // Initialize sync manager with multi-provider support
      this.syncManager = new SyncManager(this.storageManager, this.githubStorage, this.authManager)
      this.syncManager.init({
        autoSync: false, // Can be enabled by user
        autoSyncInterval: 5 * 60 * 1000 // 5 minutes
      })

      // Initialize centralized sync status manager
      this.syncStatusManager = new SyncStatusManager(this)

      // Initialize generic Git service (provider-agnostic)
      this.gitService = new GitService(this)

      // Multi-provider authentication integration initialized

      // Initialize authentication UI components
      this.initializeAuthUI()
    } catch (error) {
      console.error('Failed to initialize authentication integration:', error)
      // Don't show warning notification - authentication is optional functionality
      
      // Ensure authManager is null on failure so debugging is clear
      this.authManager = null
    }
  }

  /**
   * Initialize multi-provider authentication UI components
   */
  initializeAuthUI() {
    if (!this.authManager) {
      console.warn('Authentication manager not initialized, skipping UI setup')
      return
    }

    // Initialize multi-provider auth button
    this.authButton = new AuthButton(
      this.authManager,
      (event, user, provider) => this.handleUserClick(event, user, provider)
    )

    // Initialize GitHub user menu (backward compatibility)
    // TODO: Create provider-agnostic user menu in future updates
    this.githubUserMenu = new GitHubUserMenu(
      this.authManager,
      this.githubStorage,
      () => this.handleSignOut(),
      () => this.handleAuthHelp()
    )

    // Add auth button to header
    const authContainer = document.getElementById('github-auth-container')
    if (authContainer && this.authButton) {
      const buttonElement = this.authButton.getElement()
      if (buttonElement) {
        authContainer.appendChild(buttonElement)
      }
    }

    // Connect auth button and menu for arrow control
    if (this.githubUserMenu && this.authButton) {
      this.githubUserMenu.setAuthButton(this.authButton)
    }

    // Update authentication UI on state changes
    this.updateAuthUI()
  }

  /**
   * Handle user click on authenticated user button
   */
  async handleUserClick(event, user, provider) {
    try {
      // Show user menu
      if (this.githubUserMenu) {
        this.githubUserMenu.show(event.currentTarget)
      }
    } catch (error) {
      console.error('User menu failed:', error)
    }
  }

  /**
   * Handle sign out from current provider
   */
  handleSignOut() {
    if (this.authManager) {
      const user = this.authManager.getCurrentUser()
      const provider = this.authManager.getCurrentProvider()
      this.authManager.logout()
      this.showNotification(`Signed out from ${provider?.displayName || 'Git provider'} (was: ${user?.name || 'Unknown'})`, 'info')
      this.updateAuthUI()
    }
  }

  /**
   * Handle authentication help
   */
  handleAuthHelp() {
    // Execute help command through command system
    this.executeCommand('help github') // TODO: Update to generic auth help
  }

  /**
   * Update authentication UI components
   */
  updateAuthUI() {
    if (this.authButton) {
      this.authButton.refresh()
    }
    if (this.githubUserMenu) {
      this.githubUserMenu.refresh()
    }
    this.updateGitHubSyncStatus() // TODO: Rename to updateSyncStatus

    // Refresh navigator documents tab to update sync status indicators
    if (
      this.navigator &&
      this.navigator.tabComponents &&
      this.navigator.tabComponents['documents']
    ) {
      this.navigator.tabComponents['documents'].refresh()
    }
  }

  attachEventListeners() {
    // Ctrl+Space to open command palette
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        this.commandBar.toggle()
      }
    })

    // Command bar trigger button
    const commandBarTrigger = document.getElementById('command-bar-trigger')
    if (commandBarTrigger) {
      commandBarTrigger.addEventListener('click', (e) => {
        e.preventDefault()
        this.commandBar.show()
      })
    }

    document.getElementById('doc-title').addEventListener('input', (e) => {
      if (this.currentDocument) {
        this.currentDocument.title = e.target.value
      }
    })

    // Auto save is now handled through CodeMirror content change callback in handleContentChange()

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

    // Listen for GitHub authentication state changes
    window.addEventListener('github-auth-state-changed', () => {
      // this.updateGitHubUI() - Method not implemented yet
      // TODO: Update UI to reflect GitHub authentication state
    })
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

      // Update navigator and file tree
      if (this.navigator) {
        this.navigator.onDocumentCreate(this.currentDocument)
      }
      if (this.fileTree) {
        this.fileTree.addDocument(this.currentDocument)
        this.fileTree.setSelectedDocument(this.currentDocument.id)
      }

      // Focus title field for new documents and select all text for easy editing
      this.focusDocumentTitle(true)

      // Created new document with GUID
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
    const titleField = document.getElementById('doc-title')
    titleField.value = doc.title || 'Untitled Document'
    this.editor.setContent(doc.content || '')
    this.updateWordCount()
    this.updateSyncStatus('Ready')

    // Handle readonly mode for system documents and readonly documents
    const isReadonly = doc.readonly === true || doc.type === 'system'
    this.editor.setReadonlyMode(isReadonly)

    // Update title field readonly state and add visual indicators
    const titleContainer = document.querySelector('.doc-title-container')

    if (titleField) {
      titleField.readOnly = isReadonly
      if (isReadonly) {
        titleField.classList.add('readonly')
      } else {
        titleField.classList.remove('readonly')
      }
    }

    // Add visual indicators for document status
    this.updateDocumentIndicators(doc, titleContainer)
    this.updateReadonlyStatusIndicator(doc)

    // Initialize change tracking for the loaded document (if not readonly)
    if (!isReadonly) {
      this.initializeChangeTracking()
    }

    // Update navigator and file tree selection
    if (this.navigator) {
      this.navigator.onDocumentChange(doc)
    }
    if (this.fileTree) {
      this.fileTree.setSelectedDocument(doc.id)
    }

    // Update all UI components including GitHub sync status
    this.updateUI()

    // Document loaded successfully
  }

  /**
   * Focus and select title field for new document creation
   * @param {boolean} selectAll - Whether to select all text in title field
   */
  focusDocumentTitle(selectAll = false) {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      const titleField = document.getElementById('doc-title')
      if (titleField && !titleField.readOnly) {
        titleField.focus()
        if (selectAll) {
          titleField.select()
        }
      }
    }, 100) // Small delay to ensure command bar has closed and DOM is ready
  }

  /**
   * Handle content changes from the editor for real-time outline updates and auto save
   * This is called by the editor when content changes (debounced)
   * @param {string} newContent - The updated content from the editor
   */
  handleContentChange(newContent) {
    if (!this.currentDocument) return

    // Update the current document content for outline parsing
    // Note: This doesn't save the document, just updates it for outline parsing
    const updatedDocument = {
      ...this.currentDocument,
      content: newContent
    }

    // Update the Navigator outline with the new content
    if (this.navigator && this.navigator.tabComponents && this.navigator.tabComponents.outline) {
      this.navigator.tabComponents.outline.updateOutline(updatedDocument)
    }

    // Trigger word count update
    this.updateWordCount()

    // Trigger auto save
    this.scheduleAutoSave()
  }

  async saveDocument() {
    if (!this.currentDocument) return { success: false, reason: 'no_document' }

    // Check if document is readonly
    const isReadonly =
      this.currentDocument.readonly === true || this.currentDocument.type === 'system'
    if (isReadonly) {
      this.showNotification('Cannot save readonly document', 'warning')
      return { success: false, reason: 'readonly' }
    }

    try {
      this.updateSyncStatus('Saving...')

      // Get current title and content
      const title = document.getElementById('doc-title').value || 'Untitled Document'
      const content = this.editor.getContent()

      // Check for actual changes before saving
      const hasContentChanges = this.hasContentChanged(content)
      const hasTitleChanges = this.hasTitleChanged(title)

      // Check if tags have changed (compare arrays)
      const oldTags = this.lastSavedState?.tags || []
      const currentTags = this.currentDocument.tags || []
      const hasTagChanges = JSON.stringify(oldTags.sort()) !== JSON.stringify(currentTags.sort())

      if (!hasContentChanges && !hasTitleChanges && !hasTagChanges) {
        this.updateSyncStatus('No changes')
        setTimeout(() => this.updateSyncStatus('Ready'), 1000)
        return { success: true, reason: 'no_changes' }
      }

      // Update document (preserve existing properties like tags)
      this.currentDocument.title = title
      this.currentDocument.content = content
      // Tags and other properties are preserved from this.currentDocument

      const savedDoc = await this.storageManager.saveDocument(this.currentDocument)
      this.currentDocument = savedDoc

      // Update change tracking
      this.initializeChangeTracking()

      // Update navigator and file tree
      if (this.navigator) {
        this.navigator.onDocumentSave(savedDoc)
      }
      if (this.fileTree) {
        this.fileTree.updateDocument(savedDoc)
      }

      // CRITICAL FIX: Update sync status manager after document save
      // This ensures both navigator and status bar display consistent sync status
      if (this.syncStatusManager) {
        await this.syncStatusManager.updateAll(savedDoc.id, savedDoc)
      }

      // Document saved successfully

      this.updateSyncStatus('Saved')
      setTimeout(() => this.updateSyncStatus('Ready'), 2000)

      return { success: true, reason: 'saved', document: savedDoc }
    } catch (error) {
      console.error('Failed to save document:', error)
      this.showError('Failed to save document. Your changes are preserved locally.')
      this.updateSyncStatus('Error')
      return { success: false, reason: 'error', error: error.message }
    }
  }

  updateWordCount() {
    try {
      const content = this.editor?.getContent() || ''
      if (typeof content !== 'string') {
        console.warn('Editor content is not a string:', content)
        if (this.statusBarManager) {
          this.statusBarManager.updateWordCount(0)
        }
        return
      }

      const words = content
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
      const wordCount = isNaN(words) ? 0 : words
      
      // Update status bar if available
      if (this.statusBarManager) {
        this.statusBarManager.updateWordCount(wordCount)
      }
      
      return wordCount
    } catch (error) {
      console.error('Error updating word count:', error)
      if (this.statusBarManager) {
        this.statusBarManager.updateWordCount(0)
      }
    }
  }

  updateSyncStatus(status) {
    if (this.statusBarManager) {
      this.statusBarManager.updateSyncStatus(status)
    }
  }

  /**
   * Update document visual indicators based on document type and status
   */
  updateDocumentIndicators(doc, titleContainer) {
    if (!titleContainer) return

    // Remove existing indicators
    const existingIndicators = titleContainer.querySelectorAll(
      '.readonly-indicator, .system-document-indicator'
    )
    existingIndicators.forEach((indicator) => indicator.remove())

    // No indicators needed here - readonly status is shown in the status bar
  }

  /**
   * Update readonly status indicator in the footer
   */
  updateReadonlyStatusIndicator(doc) {
    // Use status bar manager if available
    if (this.statusBarManager) {
      this.statusBarManager.updateReadonlyStatus(doc)
    }
  }

  /**
   * Update document GUID label visibility and content
   */
  updateGuidLabel() {
    const guidLabel = document.getElementById('doc-guid-label')

    if (!guidLabel) {
      return
    }

    // Always hide GUID label (per user request)
    guidLabel.style.display = 'none'
  }

  /**
   * Start periodic sync status updates
   */
  startPeriodicSyncStatusUpdates() {
    // Update sync status every 5 seconds
    setInterval(() => {
      this.updateGitHubSyncStatus()
    }, 5000)

    // Also update when visibility changes (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateGitHubSyncStatus()
      }
    })
  }

  /**
   * Update GitHub sync status indicator in footer
   */
  updateGitHubSyncStatus() {
    // Delegate to centralized sync status manager
    if (this.syncStatusManager) {
      this.syncStatusManager.updateStatusBar()
    }
  }

  updateUI() {
    this.updateWordCount()
    this.updateSyncStatus('Ready')
    this.updateGuidLabel()
    this.updateGitHubSyncStatus()
    
    // Refresh status bar if available
    if (this.statusBarManager) {
      this.statusBarManager.refresh()
    }
  }

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`

    // Handle multiline messages by converting newlines to <br> tags safely
    if (message.includes('\n')) {
      // Use safe text with line breaks - escape HTML and convert newlines
      const escaped = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/\n/g, '<br>')
      notification.innerHTML = escaped
    } else {
      notification.textContent = message
    }

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
      bottom: calc(var(--footer-height) + var(--spacing-md));
      right: var(--spacing-lg);
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

    // Check if auto save is enabled in settings
    const autoSaveEnabled = this.settingsManager.get('editor.autoSave')
    if (!autoSaveEnabled) {
      return
    }

    // Check if document is readonly - don't schedule auto-save for readonly documents
    const isReadonly =
      this.currentDocument.readonly === true || this.currentDocument.type === 'system'
    if (isReadonly) {
      // Don't show pending status for readonly documents
      return
    }

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
    }

    // Get auto save interval from settings (with fallback to default)
    const autoSaveInterval = this.settingsManager.get('editor.autoSaveInterval') || 5000

    // Schedule new auto-save
    this.autoSaveTimeout = setTimeout(() => {
      this.performAutoSave()
    }, autoSaveInterval)

    // Show pending save indicator
    this.updateSyncStatus('Pending...')
  }

  /**
   * Perform auto-save without user notification
   */
  async performAutoSave() {
    if (!this.currentDocument) return

    // Check if auto save is enabled in settings
    const autoSaveEnabled = this.settingsManager.get('editor.autoSave')
    if (!autoSaveEnabled) {
      return
    }

    // Double-check if document is readonly before attempting auto-save
    const isReadonly =
      this.currentDocument.readonly === true || this.currentDocument.type === 'system'
    if (isReadonly) {
      // Don't attempt to save readonly documents
      return
    }

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

      // Update navigator and file tree silently
      if (this.navigator) {
        this.navigator.onDocumentSave(savedDoc)
      }
      if (this.fileTree) {
        this.fileTree.updateDocument(savedDoc)
      }

      // CRITICAL FIX: Update sync status manager after auto-save as well
      // This ensures both navigator and status bar display consistent sync status
      if (this.syncStatusManager) {
        await this.syncStatusManager.updateAll(savedDoc.id, savedDoc)
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

      results.forEach((result) => {
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
          matches.forEach((match) => {
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
              ${document.tags
                .slice(0, 3)
                .map((tag) => `<span class="search-tag">${this.escapeHtml(tag)}</span>`)
                .join('')}
            </div>
          `
        }

        html += '</div>'
      })

      html += '</div>'
      searchResultsContainer.innerHTML = html

      // Add click handlers for search results
      searchResultsContainer.querySelectorAll('.search-result-item').forEach((item) => {
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
    const tags = this.currentDocument.tags || []

    this.documentChangeTracking = {
      lastContentChecksum: this.guidManager.generateChecksum(content),
      lastTitleHash: this.simpleHash(title),
      hasUnsavedChanges: false
    }

    // Store the last saved state for comparison
    this.lastSavedState = {
      title: title,
      content: content,
      tags: [...tags] // Clone the array to avoid reference issues
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
      hash = (hash << 5) - hash + char
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
      filename:
        doc.filename || (isGuid ? this.guidManager.generateFilename(doc.title, doc.id) : null),
      hasUnsavedChanges: this.documentChangeTracking.hasUnsavedChanges
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new FantasyEditorApp()
  app.init()
  window.fantasyEditor = app
})
