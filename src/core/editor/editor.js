import { EditorState, Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { EditorExtensions } from './editor-extensions.js'
import { ReadonlyExtensions } from './readonly-extensions.js'
import { foldAll, unfoldAll, foldCode, unfoldCode } from '@codemirror/language'
import { openSearchPanel } from '@codemirror/search'

export class EditorManager {
  constructor(element, themeManager = null) {
    this.element = element
    this.view = null
    this.state = null
    this.themeManager = themeManager
    this.editorExtensions = new EditorExtensions(themeManager)
    this.readonlyExtensions = new ReadonlyExtensions()
    this.extensionCompartment = new Compartment()
    this.isReadonly = false
    this.initialize()
  }

  initialize() {
    // Create editor state with all extensions
    this.state = EditorState.create({
      doc: '',
      extensions: [
        this.extensionCompartment.of([
          ...this.editorExtensions.getExtensions(),
          ...this.readonlyExtensions.getReadonlyExtensions(this.isReadonly),
          ...(this.themeManager ? this.themeManager.getCodeMirrorTheme() : [])
        ])
      ]
    })

    // Create editor view
    this.view = new EditorView({
      state: this.state,
      parent: this.element
    })

    // Connect theme manager to editor view
    if (this.themeManager) {
      this.themeManager.setEditorView(this.view)
    }
  }

  setContent(content) {
    if (!this.view) return

    const transaction = this.view.state.update({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    })

    this.view.dispatch(transaction)
  }

  getContent() {
    return this.view ? this.view.state.doc.toString() : ''
  }

  focus() {
    this.view?.focus()
  }

  destroy() {
    this.view?.destroy()
  }

  /**
   * Legacy method - now handled by unified theme system
   */
  applyTheme(theme) {
    if (this.themeManager) {
      this.themeManager.applyTheme(theme)
    }
  }

  /**
   * Document folding methods
   */
  foldAll() {
    if (this.view) {
      foldAll(this.view)
      return true
    }
    return false
  }

  unfoldAll() {
    if (this.view) {
      unfoldAll(this.view)
      return true
    }
    return false
  }

  foldCurrentSection() {
    if (this.view) {
      foldCode(this.view)
      return true
    }
    return false
  }

  unfoldCurrentSection() {
    if (this.view) {
      unfoldCode(this.view)
      return true
    }
    return false
  }

  /**
   * Search functionality
   */
  openSearch() {
    if (this.view) {
      try {
        openSearchPanel(this.view)
        this.focusSearchInput()
        return true
      } catch (err) {
        console.warn('Failed to open search panel:', err)
        return false
      }
    }
    return false
  }

  openSearchAndReplace() {
    if (this.view) {
      try {
        openSearchPanel(this.view)
        // The search panel includes replace functionality by default
        this.focusSearchInput()
        return true
      } catch (err) {
        console.warn('Failed to open search and replace panel:', err)
        return false
      }
    }
    return false
  }

  /**
   * Focus the search input after panel opens
   */
  focusSearchInput() {
    // Use setTimeout to allow the panel to render first
    setTimeout(() => {
      // Look for CodeMirror search input in the panel
      const searchInput =
        document.querySelector('.cm-search input[name="search"]') ||
        document.querySelector('.cm-search input[type="text"]') ||
        document.querySelector('.cm-search input:first-of-type')

      if (searchInput) {
        searchInput.focus()
        searchInput.select() // Select any existing text
      }
    }, 100) // Small delay to ensure panel is rendered
  }

  /**
   * Spell check functionality
   */
  toggleSpellCheck() {
    if (this.editorExtensions) {
      const enabled = this.editorExtensions.toggleSpellCheck()
      // Reconfigure editor with updated extensions
      this.reconfigure()
      return enabled
    }
    return false
  }

  isSpellCheckEnabled() {
    return this.editorExtensions?.spellCheckEnabled || false
  }

  /**
   * Reconfigure editor with updated extensions
   */
  reconfigure() {
    if (this.view && this.editorExtensions) {
      this.view.dispatch({
        effects: this.extensionCompartment.reconfigure([
          ...this.editorExtensions.getExtensions(),
          ...(this.themeManager ? this.themeManager.getCodeMirrorTheme() : [])
        ])
      })
    }
  }

  /**
   * Reconfigure editor with specific font size
   */
  reconfigureWithFontSize(fontSize) {
    if (this.view && this.editorExtensions && this.themeManager) {
      this.view.dispatch({
        effects: this.extensionCompartment.reconfigure([
          ...this.editorExtensions.getExtensions(),
          ...this.themeManager.getCodeMirrorTheme(this.themeManager.currentTheme, { fontSize })
        ])
      })
    }
  }

  /**
   * Get current cursor position for context-aware commands
   */
  getCursorPosition() {
    if (!this.view) return null

    const { main } = this.view.state.selection
    const line = this.view.state.doc.lineAt(main.head)

    return {
      line: line.number,
      column: main.head - line.from,
      offset: main.head
    }
  }

  /**
   * Insert text at cursor position
   */
  insertText(text) {
    if (!this.view) return false

    const { main } = this.view.state.selection

    this.view.dispatch({
      changes: {
        from: main.from,
        to: main.to,
        insert: text
      },
      selection: { anchor: main.from + text.length }
    })

    return true
  }

  /**
   * Get selected text
   */
  getSelectedText() {
    if (!this.view) return ''

    const { main } = this.view.state.selection
    return this.view.state.doc.sliceString(main.from, main.to)
  }

  /**
   * Replace selected text
   */
  replaceSelectedText(text) {
    if (!this.view) return false

    const { main } = this.view.state.selection

    this.view.dispatch({
      changes: {
        from: main.from,
        to: main.to,
        insert: text
      },
      selection: { anchor: main.from + text.length }
    })

    return true
  }

  /**
   * Get document statistics
   */
  getDocumentStats() {
    if (!this.view) return null

    const content = this.view.state.doc.toString()
    const words = content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    const characters = content.length
    const charactersNoSpaces = content.replace(/\s/g, '').length
    const lines = this.view.state.doc.lines
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length

    return {
      words: words.length,
      characters,
      charactersNoSpaces,
      lines,
      paragraphs
    }
  }

  /**
   * Set readonly mode
   * @param {boolean} readonly - Whether editor should be readonly
   */
  setReadonlyMode(readonly = true) {
    if (!this.view) return false

    this.isReadonly = readonly

    try {
      // Update readonly extensions
      this.readonlyExtensions.updateReadonlyState(this.view, readonly)

      // Reconfigure editor with updated extensions
      this.view.dispatch({
        effects: this.extensionCompartment.reconfigure([
          ...this.editorExtensions.getExtensions(),
          ...this.readonlyExtensions.getReadonlyExtensions(readonly),
          ...(this.themeManager ? this.themeManager.getCodeMirrorTheme() : [])
        ])
      })

      return true
    } catch (error) {
      console.error('Failed to set readonly mode:', error)
      return false
    }
  }

  /**
   * Get readonly status
   * @returns {boolean} Whether editor is readonly
   */
  isReadonlyMode() {
    return this.isReadonly
  }

  /**
   * Toggle readonly mode
   * @returns {boolean} New readonly state
   */
  toggleReadonlyMode() {
    const newState = !this.isReadonly
    this.setReadonlyMode(newState)
    return newState
  }

  /**
   * Reconfigure editor with readonly state
   */
  reconfigure() {
    if (this.view && this.editorExtensions) {
      this.view.dispatch({
        effects: this.extensionCompartment.reconfigure([
          ...this.editorExtensions.getExtensions(),
          ...this.readonlyExtensions.getReadonlyExtensions(this.isReadonly),
          ...(this.themeManager ? this.themeManager.getCodeMirrorTheme() : [])
        ])
      })
    }
  }

  /**
   * Reconfigure editor with specific font size and readonly state
   */
  reconfigureWithFontSize(fontSize) {
    if (this.view && this.editorExtensions && this.themeManager) {
      this.view.dispatch({
        effects: this.extensionCompartment.reconfigure([
          ...this.editorExtensions.getExtensions(),
          ...this.readonlyExtensions.getReadonlyExtensions(this.isReadonly),
          ...this.themeManager.getCodeMirrorTheme(this.themeManager.currentTheme, { fontSize })
        ])
      })
    }
  }
}
