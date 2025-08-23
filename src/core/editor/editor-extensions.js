/**
 * EditorExtensions - Centralized management of CodeMirror 6 extensions
 * Provides writer-focused extensions with theme integration
 */

import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { EditorView, keymap, placeholder, highlightActiveLine, lineNumbers } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { foldGutter, codeFolding, bracketMatching } from '@codemirror/language'

export class EditorExtensions {
  constructor(themeManager) {
    this.themeManager = themeManager
    this.spellCheckEnabled = this.loadSpellCheckPreference()
  }

  /**
   * Get all extensions for the editor based on current configuration
   */
  getExtensions() {
    return [
      // Core editing features
      history(),
      markdown(),
      EditorView.lineWrapping,
      
      // Theme and visual enhancements  
      highlightActiveLine(),
      bracketMatching(),
      highlightSelectionMatches(),
      
      // Writer-focused features
      autocompletion(),
      placeholder('Start writing your story...'),
      
      // Document structure and navigation
      codeFolding({
        placeholderText: '...',
        placeholderDOM: null
      }),
      foldGutter({
        openText: '▼',
        closedText: '▶'
      }),
      
      // Search functionality
      search({
        top: true,
        caseSensitive: false,
        literal: false,
        regexp: false
      }),
      
      // Keyboard mappings
      keymap.of([
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
      ]),
      
      // Theme integration
      EditorView.theme(this.getEditorTheme()),
      
      // Spell check integration
      ...(this.spellCheckEnabled ? this.getSpellCheckExtensions() : []),
      
      // Line numbers with custom styling
      lineNumbers(),
      
      // Writer-optimized settings
      EditorView.theme({
        '&': { 
          height: '100%',
          fontSize: 'var(--font-size-base)',
          fontFamily: 'var(--font-family-mono)'
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
        // Search panel styling
        '.cm-search': {
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)'
        },
        // Placeholder styling
        '.cm-placeholder': {
          color: 'var(--text-muted)',
          fontStyle: 'italic'
        }
      })
    ]
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
      changes: [
        { from: prevLine.from, to: line.to, insert: lineText + '\n' + prevLineText },
      ],
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
      changes: [
        { from: line.from, to: nextLine.to, insert: nextLineText + '\n' + lineText },
      ],
      selection: {
        anchor: nextLine.from + main.anchor - line.from,
        head: nextLine.from + main.head - line.from
      }
    })
    
    return true
  }
}

