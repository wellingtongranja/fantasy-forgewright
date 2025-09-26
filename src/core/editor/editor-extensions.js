/**
 * EditorExtensions - Centralized management of CodeMirror 6 extensions
 * Provides writer-focused extensions with theme integration
 */

import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { EditorView, keymap, placeholder, highlightActiveLine, lineNumbers, ViewUpdate } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { foldGutter, codeFolding, bracketMatching } from '@codemirror/language'

export class EditorExtensions {
  constructor(themeManager, settingsManager = null, onContentChange = null) {
    this.themeManager = themeManager
    this.settingsManager = settingsManager
    this.onContentChange = onContentChange
    this.spellCheckEnabled = this.loadSpellCheckPreference()
    this.contentChangeTimeout = null
  }

  /**
   * Get CodeMirror settings from settings manager
   * @returns {Object} CodeMirror settings
   */
  getCodeMirrorSettings() {
    if (!this.settingsManager) {
      // Fallback defaults when no settings manager available (match schema defaults)
      return {
        lineNumbers: false,
        lineWrapping: true,
        highlightActiveLine: true,
        bracketMatching: true,
        codeFolding: true,
        foldGutter: true,
        autocompletion: true,
        searchTop: true,
        placeholderText: 'Start writing your story...'
      }
    }
    
    const settings = this.settingsManager.getAllSettings()
    const cmSettings = settings.codemirror || {}
    return cmSettings
  }

  /**
   * Get all extensions for the editor based on current configuration
   */
  getExtensions() {
    const cmSettings = this.getCodeMirrorSettings()
    
    const extensions = [
      // Core editing features
      history(),
      markdown()
    ]

    // Content change listener for real-time outline updates
    if (this.onContentChange) {
      extensions.push(this.createContentChangeListener())
    }

    // Conditional line wrapping
    if (cmSettings.lineWrapping === true) {
      extensions.push(EditorView.lineWrapping)
    }

    // Conditional visual enhancements
    if (cmSettings.highlightActiveLine === true) {
      extensions.push(highlightActiveLine())
    }
    if (cmSettings.bracketMatching === true) {
      extensions.push(bracketMatching())
    }
    extensions.push(highlightSelectionMatches())

    // Conditional writer-focused features
    if (cmSettings.autocompletion === true) {
      extensions.push(autocompletion())
    }
    
    const placeholderText = cmSettings.placeholderText || 'Start writing your story...'
    extensions.push(placeholder(placeholderText))

    // Conditional document structure and navigation
    if (cmSettings.codeFolding === true) {
      extensions.push(codeFolding({
        placeholderText: '...',
        placeholderDOM: null
      }))
    }
    if (cmSettings.foldGutter === true && cmSettings.codeFolding === true) {
      extensions.push(foldGutter({
        openText: '▼',
        closedText: '▶'
      }))
    }

    // Search functionality
    const searchTop = cmSettings.searchTop === true
    extensions.push(search({
      top: searchTop,
      caseSensitive: false,
      literal: false,
      regexp: false
    }))

    // Keyboard mappings
    extensions.push(keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...completionKeymap,
      // Custom writer shortcuts
      {
        key: 'Ctrl-d',
        run: this.duplicateLine.bind(this),
        preventDefault: true
      },
      {
        key: 'Alt-ArrowUp',
        run: this.moveLineUp.bind(this),
        preventDefault: true
      },
      {
        key: 'Alt-ArrowDown',
        run: this.moveLineDown.bind(this),
        preventDefault: true
      }
    ]))

    // Theme integration
    extensions.push(EditorView.theme(this.getEditorTheme()))

    // Spell check integration
    if (this.spellCheckEnabled) {
      extensions.push(...this.getSpellCheckExtensions())
    }

    // Conditional line numbers
    if (cmSettings.lineNumbers === true) {
      extensions.push(lineNumbers())
    }

    // Writer-optimized settings with dynamic font settings
    const fontSize = cmSettings.fontSize === 'inherit' ? 'var(--font-size-base)' : cmSettings.fontSize || 'var(--font-size-base)'
    const fontFamily = cmSettings.fontFamily || 'var(--font-family-mono)'
    
    extensions.push(EditorView.theme({
      '&': {
        height: '100%',
        fontSize: fontSize,
        fontFamily: fontFamily
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'inherit'
      },
      '.cm-content': {
        padding: '16px',
        lineHeight: 'var(--line-height-relaxed)',
        minHeight: '100%'
      },
      '.cm-focused': {
        outline: 'none'
      },
      // Fold gutter styling
      '.cm-foldGutter': {
        width: '20px'
      },
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        cursor: 'pointer'
      },
      // Search panel styling with higher specificity
      '.cm-editor .cm-search': {
        backgroundColor: 'var(--color-bg-secondary) !important',
        border: '1px solid var(--color-border) !important',
        borderRadius: 'var(--border-radius-md) !important',
        padding: '8px !important'
      },
      '.cm-editor .cm-search button': {
        backgroundColor: 'var(--color-bg-tertiary) !important',
        color: 'var(--color-text) !important',
        border: '1px solid var(--color-border) !important',
        borderRadius: 'var(--border-radius-sm) !important',
        padding: '4px 8px !important',
        margin: '0 2px !important',
        cursor: 'pointer !important',
        fontSize: '12px !important',
        lineHeight: '1 !important',
        transition: 'all var(--transition-fast) !important'
      },
      '.cm-editor .cm-search button:hover': {
        backgroundColor: 'var(--color-bg-secondary) !important',
        borderColor: 'var(--color-primary) !important'
      },
      '.cm-editor .cm-search button:focus': {
        outline: '2px solid var(--color-primary) !important',
        outlineOffset: '1px !important'
      },
      '.cm-editor .cm-search input': {
        backgroundColor: 'var(--color-bg) !important',
        color: 'var(--color-text) !important',
        border: '1px solid var(--color-border) !important',
        borderRadius: 'var(--border-radius-sm) !important',
        padding: '4px 6px !important',
        margin: '0 4px !important',
        fontSize: '13px !important'
      },
      '.cm-editor .cm-search input:focus': {
        outline: 'none !important',
        borderColor: 'var(--color-primary) !important',
        boxShadow: '0 0 0 3px rgba(var(--color-primary-rgb), 0.1) !important'
      },
      // Also try alternative class names that CodeMirror might use
      '.cm-search-panel': {
        backgroundColor: 'var(--color-bg-secondary) !important',
        border: '1px solid var(--color-border) !important',
        borderRadius: 'var(--border-radius-md) !important',
        padding: '8px !important'
      },
      '.cm-search-panel button': {
        backgroundColor: 'var(--color-bg-tertiary) !important',
        color: 'var(--color-text) !important',
        border: '1px solid var(--color-border) !important',
        borderRadius: 'var(--border-radius-sm) !important',
        padding: '4px 8px !important',
        margin: '0 2px !important',
        cursor: 'pointer !important',
        fontSize: '12px !important',
        lineHeight: '1 !important'
      },
      // Placeholder styling
      '.cm-placeholder': {
        color: 'var(--color-text-secondary)',
        fontStyle: 'italic'
      }
    }))

    return extensions
  }

  /**
   * Get spell check extensions when enabled
   */
  getSpellCheckExtensions() {
    return [
      EditorView.contentAttributes.of({
        spellcheck: 'true',
        lang: navigator.language || 'en'
      })
    ]
  }

  /**
   * Get theme-aware editor styling
   */
  getEditorTheme() {
    const theme = this.themeManager?.getCurrentTheme() || 'light'

    // Theme-specific overrides
    const themeOverrides = {
      light: {
        '.cm-activeLine': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
        '.cm-selectionMatch': { backgroundColor: 'rgba(0, 100, 200, 0.2)' }
      },
      dark: {
        '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
        '.cm-selectionMatch': { backgroundColor: 'rgba(100, 150, 255, 0.2)' }
      },
      fantasy: {
        '.cm-activeLine': { backgroundColor: 'rgba(139, 69, 19, 0.1)' },
        '.cm-selectionMatch': { backgroundColor: 'rgba(184, 134, 11, 0.3)' }
      }
    }

    return themeOverrides[theme] || themeOverrides.light
  }

  /**
   * Toggle spell check functionality
   */
  toggleSpellCheck() {
    this.spellCheckEnabled = !this.spellCheckEnabled
    this.saveSpellCheckPreference()
    return this.spellCheckEnabled
  }

  /**
   * Load spell check preference from localStorage
   */
  loadSpellCheckPreference() {
    const saved = localStorage.getItem('spell-check-enabled')
    return saved !== null ? JSON.parse(saved) : true // Default to enabled
  }

  /**
   * Save spell check preference to localStorage
   */
  saveSpellCheckPreference() {
    localStorage.setItem('spell-check-enabled', JSON.stringify(this.spellCheckEnabled))
  }

  /**
   * Custom command: Duplicate current line
   */
  duplicateLine(view) {
    const { state } = view
    const { main } = state.selection
    const line = state.doc.lineAt(main.head)
    const lineText = line.text

    view.dispatch({
      changes: {
        from: line.to,
        insert: '\n' + lineText
      },
      selection: {
        anchor: line.to + 1,
        head: line.to + 1 + lineText.length
      }
    })

    return true
  }

  /**
   * Custom command: Move line up
   */
  moveLineUp(view) {
    const { state } = view
    const { main } = state.selection
    const line = state.doc.lineAt(main.head)

    if (line.number === 1) return false // Already at top

    const prevLine = state.doc.line(line.number - 1)
    const lineText = line.text
    const prevLineText = prevLine.text

    view.dispatch({
      changes: [{ from: prevLine.from, to: line.to, insert: lineText + '\n' + prevLineText }],
      selection: {
        anchor: prevLine.from + main.anchor - line.from,
        head: prevLine.from + main.head - line.from
      }
    })

    return true
  }

  /**
   * Custom command: Move line down
   */
  moveLineDown(view) {
    const { state } = view
    const { main } = state.selection
    const line = state.doc.lineAt(main.head)

    if (line.number === state.doc.lines) return false // Already at bottom

    const nextLine = state.doc.line(line.number + 1)
    const lineText = line.text
    const nextLineText = nextLine.text

    view.dispatch({
      changes: [{ from: line.from, to: nextLine.to, insert: nextLineText + '\n' + lineText }],
      selection: {
        anchor: nextLine.from + main.anchor - line.from,
        head: nextLine.from + main.head - line.from
      }
    })

    return true
  }

  /**
   * Create content change listener for real-time outline updates
   * Uses debounced updates to avoid excessive processing
   */
  createContentChangeListener() {
    return EditorView.updateListener.of((update) => {
      // Only process if the document content actually changed
      if (update.docChanged) {
        // Clear any existing timeout
        if (this.contentChangeTimeout) {
          clearTimeout(this.contentChangeTimeout)
        }

        // Debounce the content change callback (500ms delay)
        this.contentChangeTimeout = setTimeout(() => {
          if (this.onContentChange && typeof this.onContentChange === 'function') {
            const newContent = update.state.doc.toString()
            this.onContentChange(newContent)
          }
        }, 500)
      }
    })
  }
}
