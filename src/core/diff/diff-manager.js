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
    this.diffExtensions = null
    this.isInDiffMode = false
    this.originalContent = null
    this.contentChangeTimeout = null

    // Debug: Check if unifiedMergeView is available
    console.log('DiffManager constructor - unifiedMergeView available:', typeof unifiedMergeView)
    console.log('DiffManager constructor - acceptChunk available:', typeof acceptChunk)
    console.log('DiffManager constructor - rejectChunk available:', typeof rejectChunk)

    // Test basic import
    this.testUnifiedMergeViewImport()
  }

  /**
   * Test unifiedMergeView import and basic functionality
   */
  testUnifiedMergeViewImport() {
    try {
      console.log('Testing unifiedMergeView import...')
      console.log('unifiedMergeView type:', typeof unifiedMergeView)
      console.log('acceptChunk type:', typeof acceptChunk)
      console.log('rejectChunk type:', typeof rejectChunk)

      // Test markdown import
      console.log('markdown function:', typeof markdown, markdown)

      console.log('✅ Unified merge view imports test completed')
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
    console.log('DiffManager.enterDiffMode (unified) called with:', {
      localDoc: localDoc ? { id: localDoc.id, title: localDoc.title, contentLength: localDoc.content?.length } : null,
      remoteContentLength: remoteContent?.length
    })

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

      console.log('Creating unified diff with content:', {
        remoteLength: testRemoteContent.length,
        localLength: testLocalContent.length,
        areIdentical: testRemoteContent === testLocalContent
      })

      // Step 5: Create unified merge view extensions
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

      // Step 6: Set the local content and apply diff extensions
      // Create a new state with the unified merge extensions
      const newState = EditorState.create({
        doc: testLocalContent,
        extensions: [
          ...this.app.editor.editorExtensions.getExtensions(),
          ...(this.app.themeManager ? this.app.themeManager.getCodeMirrorTheme() : []),
          this.diffCompartment.of(this.diffExtensions),
          // Ensure content change listener is active in diff mode for Navigator outline updates
          this.createDiffModeContentListener()
        ]
      })

      // Replace the entire state
      editorView.setState(newState)

      this.isInDiffMode = true

      // Add body class for styling
      document.body.classList.add('diff-mode-active')

      // Create and add close button
      this.createCloseButton()

      console.log('✅ Unified diff mode active - use inline accept/reject controls, close button, or :gdf to exit')

      console.log('Unified diff mode entered successfully')
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

      // Remove body class
      document.body.classList.remove('diff-mode-active')

      // Remove close button
      this.removeCloseButton()

      console.log('✅ Unified diff mode exited - changes preserved')

      console.log('Unified diff mode exited successfully')
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
            console.log('DiffManager: Content changed during diff mode, updating Navigator outline')
            this.app.handleContentChange(newContent)
          }
        }, 300)
      }
    })
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

    // Find the editor container to position relative to it
    const editorContainer = document.querySelector('.app-main') || document.body
    editorContainer.appendChild(this.closeButton)
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

      // Remove from DOM
      this.closeButton.remove()
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