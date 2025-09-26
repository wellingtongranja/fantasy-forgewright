/**
 * Fantasy Editor - Readonly Extensions for CodeMirror 6
 * Copyright (c) 2025 Forgewright, Inc.
 *
 * This file is part of Fantasy Editor.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { EditorState, Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/**
 * Readonly Extensions Manager
 * Handles CodeMirror readonly state and visual indicators
 */
export class ReadonlyExtensions {
  constructor(notificationCallback = null) {
    this.readonlyCompartment = new Compartment()
    this.isReadonly = false
    this.notificationCallback = notificationCallback
  }

  /**
   * Set notification callback for readonly warnings
   * @param {Function} callback - Function to call with notification message and type
   */
  setNotificationCallback(callback) {
    this.notificationCallback = callback
  }

  /**
   * Get readonly extensions
   * @param {boolean} readonly - Whether editor should be readonly
   * @returns {Array} CodeMirror extensions
   */
  getReadonlyExtensions(readonly = false) {
    this.isReadonly = readonly

    const extensions = []

    if (readonly) {
      // Core readonly state
      extensions.push(EditorState.readOnly.of(true))

      // Visual indicators for readonly
      extensions.push(this.createReadonlyTheme())

      // Disable certain interactions
      extensions.push(this.createReadonlyBehavior())
    } else {
      // Ensure editor is editable
      extensions.push(EditorState.readOnly.of(false))
    }

    return extensions
  }

  /**
   * Create readonly theme extensions
   * @private
   */
  createReadonlyTheme() {
    return EditorView.theme({
      '&.cm-readonly': {
        backgroundColor: 'var(--readonly-background, rgba(0, 0, 0, 0.02))',
        cursor: 'default'
      },

      '.cm-readonly .cm-content': {
        cursor: 'default',
        caretColor: 'transparent'
      },

      '.cm-readonly .cm-focused': {
        outline: 'none'
      },

      '.cm-readonly .cm-selectionBackground': {
        backgroundColor: 'var(--readonly-selection, rgba(0, 0, 0, 0.1))'
      },

      '.cm-readonly .cm-line': {
        cursor: 'default'
      },

      // Indicate readonly state in gutters
      '.cm-readonly .cm-gutters': {
        backgroundColor: 'var(--readonly-gutter-bg, rgba(0, 0, 0, 0.05))',
        borderRight: '2px solid var(--readonly-indicator, rgba(0, 0, 0, 0.2))'
      }
    })
  }

  /**
   * Create readonly behavior extensions
   * @private
   */
  createReadonlyBehavior() {
    return EditorView.domEventHandlers({
      // Prevent context menu in readonly mode
      contextmenu: (event, view) => {
        if (this.isReadonly) {
          event.preventDefault()
          return true
        }
        return false
      },

      // Add readonly class to editor
      focus: (event, view) => {
        if (this.isReadonly) {
          view.dom.classList.add('cm-readonly')
        }
      },

      // Show readonly message on edit attempts
      beforeinput: (event, view) => {
        if (this.isReadonly && event.inputType && event.inputType.startsWith('insert')) {
          event.preventDefault()
          this.showReadonlyMessage(view)
          return true
        }
        return false
      }
    })
  }

  /**
   * Show readonly message to user
   * @private
   */
  showReadonlyMessage(view) {
    // Show toast notification if callback is available
    if (this.notificationCallback && typeof this.notificationCallback === 'function') {
      this.notificationCallback('Document is readonly - use :rw to make editable', 'warning')
    } else {
      // Fallback to temporary tooltip for backward compatibility
      this.showReadonlyTooltip(view)
    }
  }

  /**
   * Show readonly tooltip (fallback method)
   * @private
   */
  showReadonlyTooltip(view) {
    // Create temporary tooltip to show readonly message
    const tooltip = document.createElement('div')
    tooltip.className = 'readonly-tooltip'
    tooltip.textContent = 'Document is readonly - use :rw to make editable'
    tooltip.style.cssText = `
      position: absolute;
      background: var(--color-warning, #f39c12);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `

    // Position tooltip near cursor
    const coords = view.coordsAtPos(view.state.selection.main.head)
    if (coords) {
      tooltip.style.left = coords.left + 'px'
      tooltip.style.top = coords.top - 40 + 'px'
    }

    document.body.appendChild(tooltip)

    // Remove tooltip after 2 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip)
      }
    }, 2000)
  }

  /**
   * Update readonly state
   * @param {EditorView} view - CodeMirror view
   * @param {boolean} readonly - New readonly state
   */
  updateReadonlyState(view, readonly) {
    if (!view) return

    this.isReadonly = readonly

    // Reconfigure readonly extensions
    view.dispatch({
      effects: this.readonlyCompartment.reconfigure(this.getReadonlyExtensions(readonly))
    })

    // Update DOM classes
    if (readonly) {
      view.dom.classList.add('cm-readonly')
    } else {
      view.dom.classList.remove('cm-readonly')
    }
  }

  /**
   * Check if editor is currently readonly
   * @returns {boolean} Current readonly state
   */
  getReadonlyState() {
    return this.isReadonly
  }

  /**
   * Create readonly indicator widget
   * @returns {EditorView.theme} Theme extension for readonly indicator
   */
  createReadonlyIndicator() {
    return EditorView.theme({
      '.readonly-indicator': {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'var(--color-warning, #f39c12)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: '100',
        userSelect: 'none',
        pointerEvents: 'none'
      }
    })
  }
}
