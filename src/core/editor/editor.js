import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'

export class EditorManager {
  constructor(element) {
    this.element = element
    this.view = null
    this.state = null
    this.initialize()
  }

  initialize() {
    this.state = EditorState.create({
      doc: '',
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { 
            padding: '16px',
            fontFamily: 'var(--font-family-mono)',
            fontSize: 'var(--font-size-base)',
            lineHeight: 'var(--line-height-relaxed)'
          }
        })
      ]
    })

    this.view = new EditorView({
      state: this.state,
      parent: this.element
    })
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

  applyTheme(theme) {
    if (theme === 'dark') {
      this.view?.dispatch({
        effects: EditorView.reconfigure.of([oneDark])
      })
    }
  }
}
