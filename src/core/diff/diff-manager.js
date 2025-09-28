/**
 * DiffManager - Git diff and merge functionality for Fantasy Editor
 *
 * This manager provides diff visualization and merge capabilities using CodeMirror 6's
 * @codemirror/merge package. It handles showing differences between local and remote
 * document versions with interactive merge functionality.
 */

import { unifiedMergeView, acceptChunk, rejectChunk } from '@codemirror/merge'
import { EditorView } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'

export class DiffManager {
  constructor(app) {
    this.app = app
    this.diffCompartment = new Compartment()
    this.themeCompartment = new Compartment()
    this.diffExtensions = null
    this.isInDiffMode = false
    this.originalContent = null
    this.contentChangeTimeout = null
    this.themeChangeListener = null

    // Dependencies initialized - debug logging removed for production security

    // Test basic import
    this.testUnifiedMergeViewImport()
  }

  /**
   * Test unifiedMergeView import and basic functionality
   */
  testUnifiedMergeViewImport() {
    try {
      // Validate dependencies are available
      if (typeof unifiedMergeView === 'undefined' || typeof acceptChunk === 'undefined' || typeof rejectChunk === 'undefined') {
        throw new Error('Required diff dependencies not available')
      }
    } catch (error) {
      console.error('❌ Unified merge view import test failed:', error)
    }
  }

  /**
   * Enter unified diff mode for a document
   * @param {Object} localDoc - Local document
   * @param {string} remoteContent - Remote document content
   * @returns {Promise<boolean>} Success status
   */
  async enterDiffMode(localDoc, remoteContent) {
    // Entering unified diff mode - debug logging removed for production security

    // Step 1: Validate inputs
    if (!localDoc || typeof remoteContent !== 'string') {
      const error = new Error('Local document and remote content are required')
      console.error('Invalid parameters:', error)
      throw error
    }

    // Step 2: Check unifiedMergeView availability
    if (typeof unifiedMergeView === 'undefined') {
      const error = new Error('unifiedMergeView is not available - import failed')
      console.error('unifiedMergeView import error:', error)
      throw error
    }

    try {
      // Step 3: Get editor view
      const editorView = this.app.editor?.view
      if (!editorView) {
        throw new Error('Editor not available')
      }

      // Step 4: Store original content for different operations
      this.originalContent = localDoc.content  // For cancel functionality

      // For testing purposes, let's create content with differences
      const testRemoteContent = remoteContent || "# Remote Document\n\nThis is the **remote** version.\n\n- Remote item 1\n- Remote item 2"
      const testLocalContent = localDoc.content || "# Local Document\n\nThis is the **local** version.\n\n- Local item 1\n- Local item 2\n- Local item 3"

      // Store remote content for reject all functionality
      this.remoteContent = testRemoteContent

      // Creating unified diff view - content analysis removed for security

      // Step 5: Get current theme and map to CodeMirror theme class
      const currentTheme = this.app.themeManager?.getCurrentTheme() || 'light'

      // Get theme-specific merge class
      let mergeThemeClass
      if (currentTheme === 'fantasy') {
        // Fantasy theme gets custom styling
        mergeThemeClass = 'dark' // Use dark as base but we'll add custom CSS
      } else {
        const isDark = this.app.themeManager?.isDarkTheme(currentTheme) || false
        mergeThemeClass = isDark ? 'dark' : 'light'
      }

      // Create custom theme styling for Fantasy theme
      const customThemeStyles = currentTheme === 'fantasy' ? {
        '&dark .cm-collapsedLines': {
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-sm)',
          padding: '2px 8px',
          fontSize: '11px',
          textAlign: 'center',
          cursor: 'pointer'
        }
      } : {}

      // Step 6: Create unified merge view extensions with proper theme class
      this.diffExtensions = unifiedMergeView({
        original: testRemoteContent,
        highlightChanges: true,
        gutter: true,
        mergeControls: true,
        allowInlineDiffs: true,
        collapseUnchanged: {
          margin: 3,
          minSize: 4
        }
      })

      // Step 7: Set the local content and apply diff extensions with theme class
      // Create a new state with the unified merge extensions and theme class
      const newState = EditorState.create({
        doc: testLocalContent,
        extensions: [
          ...this.app.editor.editorExtensions.getExtensions(),
          ...(this.app.themeManager ? this.app.themeManager.getCodeMirrorTheme() : []),
          this.diffCompartment.of(this.diffExtensions),
          // Ensure content change listener is active in diff mode for Navigator outline updates
          this.createDiffModeContentListener(),
          // Add theme class for CodeMirror merge package styling with custom Fantasy support
          this.themeCompartment.of(EditorView.theme(customThemeStyles, { dark: mergeThemeClass === 'dark' }))
        ]
      })

      // Step 8: Set up theme change listener for dynamic theme updates
      this.setupThemeChangeListener()

      // Replace the entire state
      editorView.setState(newState)

      this.isInDiffMode = true

      // Add body class for styling
      document.body.classList.add('diff-mode-active')

      // Create and add close button
      this.createCloseButton()

      // Unified diff mode active - UI controls ready
      return true
    } catch (error) {
      console.error('Failed to enter unified diff mode:', error)
      throw error
    }
  }

  /**
   * Exit unified diff mode and return to normal editing
   * @param {boolean} saveChanges - Whether to save changes made in diff mode
   * @returns {Promise<boolean>} Success status
   */
  async exitDiffMode(saveChanges = false) {
    if (!this.isInDiffMode) {
      return false
    }

    try {
      const editorView = this.app.editor?.view
      if (!editorView) {
        throw new Error('Editor not available')
      }

      let mergedContent = null

      if (saveChanges) {
        // Get the current content from the editor (after user edits/accepts changes)
        mergedContent = editorView.state.doc.toString()
      }

      // Remove the diff extensions and restore original content if not saving
      const newContent = saveChanges ? mergedContent : this.originalContent

      // Create a new state without diff extensions
      const newState = EditorState.create({
        doc: newContent || '',
        extensions: [
          ...this.app.editor.editorExtensions.getExtensions(),
          ...(this.app.themeManager ? this.app.themeManager.getCodeMirrorTheme() : []),
          this.diffCompartment.of([])  // Empty compartment to remove diff extensions
        ]
      })

      // Replace the entire state
      editorView.setState(newState)

      // If saving changes, update the document
      if (saveChanges && mergedContent && this.app.currentDocument) {
        this.app.currentDocument.content = mergedContent
        this.app.currentDocument.metadata = {
          ...this.app.currentDocument.metadata,
          modified: new Date().toISOString()
        }

        // Update word count and other UI elements
        if (this.app.updateWordCount) {
          this.app.updateWordCount()
        }
      }

      this.isInDiffMode = false
      this.diffExtensions = null
      this.originalContent = null
      this.remoteContent = null

      // Clear any pending content change timeout
      if (this.contentChangeTimeout) {
        clearTimeout(this.contentChangeTimeout)
        this.contentChangeTimeout = null
      }

      // Remove theme change listener
      this.removeThemeChangeListener()

      // Remove body class
      document.body.classList.remove('diff-mode-active')

      // Remove close button
      this.removeCloseButton()

      // Unified diff mode exited - changes preserved
      return true
    } catch (error) {
      console.error('Failed to exit unified diff mode:', error)
      throw error
    }
  }

  /**
   * Check if currently in diff mode
   * @returns {boolean} True if in diff mode
   */
  isInDiff() {
    return this.isInDiffMode
  }

  /**
   * Get the current state of the diff (merged content)
   * @returns {string|null} Current merged content or null if not in diff mode
   */
  getCurrentMergedContent() {
    if (!this.isInDiffMode) {
      return null
    }

    const editorView = this.app.editor?.view
    if (!editorView) {
      return null
    }

    return editorView.state.doc.toString()
  }

  /**
   * Accept a chunk at the current cursor position
   * @returns {boolean} Success status
   */
  acceptCurrentChunk() {
    if (!this.isInDiffMode) {
      return false
    }

    const editorView = this.app.editor?.view
    if (!editorView) {
      return false
    }

    try {
      return acceptChunk(editorView)
    } catch (error) {
      console.error('Failed to accept chunk:', error)
      return false
    }
  }

  /**
   * Reject a chunk at the current cursor position
   * @returns {boolean} Success status
   */
  rejectCurrentChunk() {
    if (!this.isInDiffMode) {
      return false
    }

    const editorView = this.app.editor?.view
    if (!editorView) {
      return false
    }

    try {
      return rejectChunk(editorView)
    } catch (error) {
      console.error('Failed to reject chunk:', error)
      return false
    }
  }



  /**
   * Create diff between two text strings
   * @param {string} original - Original text
   * @param {string} modified - Modified text
   * @returns {Array} Array of diff chunks
   */
  createDiff(original, modified) {
    // This is a simplified diff implementation
    // In a production environment, you might want to use a more sophisticated diff algorithm

    const originalLines = original.split('\n')
    const modifiedLines = modified.split('\n')
    const chunks = []

    let i = 0, j = 0

    while (i < originalLines.length || j < modifiedLines.length) {
      if (i >= originalLines.length) {
        // Added lines
        chunks.push({
          type: 'added',
          content: modifiedLines[j],
          originalLine: null,
          modifiedLine: j + 1
        })
        j++
      } else if (j >= modifiedLines.length) {
        // Deleted lines
        chunks.push({
          type: 'deleted',
          content: originalLines[i],
          originalLine: i + 1,
          modifiedLine: null
        })
        i++
      } else if (originalLines[i] === modifiedLines[j]) {
        // Unchanged lines
        chunks.push({
          type: 'unchanged',
          content: originalLines[i],
          originalLine: i + 1,
          modifiedLine: j + 1
        })
        i++
        j++
      } else {
        // Modified lines (simplified - treat as delete + add)
        chunks.push({
          type: 'deleted',
          content: originalLines[i],
          originalLine: i + 1,
          modifiedLine: null
        })
        chunks.push({
          type: 'added',
          content: modifiedLines[j],
          originalLine: null,
          modifiedLine: j + 1
        })
        i++
        j++
      }
    }

    return chunks
  }

  /**
   * Create a content change listener specifically for diff mode
   * This ensures Navigator Outline updates work correctly during unified merge view
   */
  createDiffModeContentListener() {
    return EditorView.updateListener.of((update) => {
      // Only process if the document content actually changed and we're in diff mode
      if (update.docChanged && this.isInDiffMode) {
        // Clear any existing timeout
        if (this.contentChangeTimeout) {
          clearTimeout(this.contentChangeTimeout)
        }

        // Debounce the content change callback (300ms delay for diff mode - faster than normal)
        this.contentChangeTimeout = setTimeout(() => {
          if (this.app?.handleContentChange && typeof this.app.handleContentChange === 'function') {
            const newContent = update.state.doc.toString()
            // Content changed during diff mode - updating Navigator outline
            this.app.handleContentChange(newContent)
          }
        }, 300)
      }
    })
  }

  /**
   * Set up theme change listener for dynamic theme updates in diff mode
   */
  setupThemeChangeListener() {
    if (!this.isInDiffMode) return

    // Listen for theme change events
    this.themeChangeListener = (event) => {
      if (event.detail && event.detail.theme) {
        this.updateDiffModeTheme(event.detail.theme)
      }
    }

    document.addEventListener('themechange', this.themeChangeListener)
  }

  /**
   * Update diff mode theme when theme changes
   */
  updateDiffModeTheme(newTheme) {
    if (!this.isInDiffMode) return

    const editorView = this.app.editor?.view
    if (!editorView) return

    try {
      // Get theme-specific merge class
      let mergeThemeClass
      if (newTheme === 'fantasy') {
        // Fantasy theme gets custom styling
        mergeThemeClass = 'dark' // Use dark as base but we'll add custom CSS
      } else {
        const isDark = this.app.themeManager?.isDarkTheme(newTheme) || false
        mergeThemeClass = isDark ? 'dark' : 'light'
      }

      // Create custom theme styling for Fantasy theme
      const customThemeStyles = newTheme === 'fantasy' ? {
        '&dark .cm-collapsedLines': {
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-sm)',
          padding: '2px 8px',
          fontSize: '11px',
          textAlign: 'center',
          cursor: 'pointer'
        }
      } : {}

      // Preserve current state but update theme extensions only
      editorView.dispatch({
        effects: [
          // Update theme compartment with custom styling for Fantasy
          this.themeCompartment.reconfigure(
            EditorView.theme(customThemeStyles, { dark: mergeThemeClass === 'dark' })
          )
        ]
      })

      // Force re-render of merge view widgets by temporarily hiding and showing
      setTimeout(() => {
        if (this.isInDiffMode && editorView.state) {
          // Trigger a view update to refresh merge widgets
          editorView.requestMeasure()
        }
      }, 10)

    } catch (error) {
      console.error('Failed to update diff mode theme:', error)
    }
  }

  /**
   * Remove theme change listener
   */
  removeThemeChangeListener() {
    if (this.themeChangeListener) {
      document.removeEventListener('themechange', this.themeChangeListener)
      this.themeChangeListener = null
    }
  }

  /**
   * Create and add the close button for diff mode
   */
  createCloseButton() {
    // Remove any existing close button first
    this.removeCloseButton()

    // Create the close button element
    this.closeButton = document.createElement('button')
    this.closeButton.className = 'diff-close-button'
    this.closeButton.innerHTML = '×'
    this.closeButton.title = 'Close diff mode'
    this.closeButton.setAttribute('aria-label', 'Close diff mode')

    // Add event listener
    this.closeButtonHandler = () => {
      this.exitDiffMode(true) // Keep changes when closing via button
    }
    this.closeButton.addEventListener('click', this.closeButtonHandler)

    // Position the close button specifically in the document title area
    const titleContainer = document.querySelector('.doc-title-container')

    if (titleContainer) {
      // Make the title container relative positioned to contain the absolute close button
      titleContainer.style.position = 'relative'
      titleContainer.appendChild(this.closeButton)
    } else {
      // Fallback: create our own container in the editor area
      const editorContainer = document.querySelector('.editor-container') ||
                             document.querySelector('.editor') ||
                             document.querySelector('.app-main')

      if (editorContainer) {
        // Create a positioned container for the close button
        const closeButtonContainer = document.createElement('div')
        closeButtonContainer.className = 'diff-close-button-container'
        closeButtonContainer.style.position = 'absolute'
        closeButtonContainer.style.top = '16px'
        closeButtonContainer.style.right = '16px'
        closeButtonContainer.style.zIndex = '1000'
        closeButtonContainer.appendChild(this.closeButton)

        editorContainer.style.position = 'relative'
        editorContainer.appendChild(closeButtonContainer)
      } else {
        // Last resort: use document body
        document.body.appendChild(this.closeButton)
      }
    }
  }

  /**
   * Remove the close button
   */
  removeCloseButton() {
    if (this.closeButton) {
      // Remove event listener
      if (this.closeButtonHandler) {
        this.closeButton.removeEventListener('click', this.closeButtonHandler)
        this.closeButtonHandler = null
      }

      // Clean up any positioning changes we made
      const parentContainer = this.closeButton.parentElement

      if (parentContainer) {
        // If we created a special container, remove it
        if (parentContainer.classList.contains('diff-close-button-container')) {
          parentContainer.remove()
        } else {
          // Clean up positioning styles we added
          if (parentContainer.classList.contains('doc-title-container') ||
              parentContainer.classList.contains('editor-container') ||
              parentContainer.classList.contains('editor')) {
            // Remove the position: relative we added if no other absolute positioned children
            const hasOtherAbsoluteChildren = Array.from(parentContainer.children).some(
              child => child !== this.closeButton &&
              window.getComputedStyle(child).position === 'absolute'
            )
            if (!hasOtherAbsoluteChildren) {
              parentContainer.style.position = ''
            }
          }

          // Remove the close button
          this.closeButton.remove()
        }
      }

      this.closeButton = null
    }
  }

  /**
   * Destroy the diff manager
   */
  destroy() {
    if (this.isInDiffMode) {
      this.exitDiffMode(false)
    }

    // Clear any pending content change timeout
    if (this.contentChangeTimeout) {
      clearTimeout(this.contentChangeTimeout)
      this.contentChangeTimeout = null
    }

    // Remove close button
    this.removeCloseButton()
  }
}