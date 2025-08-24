/**
 * CodeMirror Theme Extensions - Unified theme system
 * Creates CodeMirror themes that read from CSS custom properties
 */

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * Creates a CodeMirror theme that reads CSS custom properties
 */
function createUnifiedTheme(themeName, options = {}) {
  const { fontSize } = options
  return EditorView.theme(
    {
      '&': {
        color: 'var(--text-primary)',
        backgroundColor: 'var(--background-primary)',
        fontSize: fontSize || 'var(--codemirror-font-size)',
        fontFamily: 'var(--font-family-mono)'
      },

      '.cm-content': {
        padding: '16px',
        lineHeight: 'var(--line-height-relaxed)',
        caretColor: 'var(--text-primary)',
        minHeight: '100%',
        fontSize: fontSize || 'var(--codemirror-font-size)'
      },

      '.cm-focused': {
        outline: 'none'
      },

      '.cm-editor': {
        backgroundColor: 'var(--background-primary)'
      },

      '.cm-scroller': {
        fontFamily: 'inherit',
        fontSize: 'inherit'
      },

      // Line numbers
      '.cm-gutters': {
        backgroundColor: 'var(--background-secondary)',
        color: 'var(--text-muted)',
        border: 'none',
        borderRight: '1px solid var(--border-color)'
      },

      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 16px',
        minWidth: '40px'
      },

      // Active line highlighting
      '.cm-activeLine': {
        backgroundColor: `var(--highlight-line, ${getThemeHighlight(themeName)})`
      },

      // Selection
      '.cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--selection-background, rgba(0, 100, 200, 0.3))'
      },

      '.cm-focused .cm-selectionBackground': {
        backgroundColor: 'var(--selection-background-focused, rgba(0, 100, 200, 0.4))'
      },

      // Search highlighting
      '.cm-selectionMatch': {
        backgroundColor: `var(--search-match, ${getThemeSearchMatch(themeName)})`
      },

      '.cm-searchMatch': {
        backgroundColor: 'var(--search-current, rgba(255, 150, 0, 0.4))',
        outline: '1px solid var(--search-current-border, rgba(255, 150, 0, 0.8))'
      },

      // Fold gutter
      '.cm-foldGutter': {
        width: '20px',
        color: 'var(--text-muted)'
      },

      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        cursor: 'pointer',
        fontSize: '12px'
      },

      '.cm-foldGutter .cm-gutterElement:hover': {
        backgroundColor: 'var(--background-hover)',
        color: 'var(--text-primary)'
      },

      // Placeholder text
      '.cm-placeholder': {
        color: 'var(--text-muted)',
        fontStyle: 'italic'
      },

      // Search panel
      '.cm-search': {
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius, 6px)',
        padding: '8px',
        boxShadow: 'var(--shadow-sm)'
      },

      '.cm-search input, .cm-search button, .cm-search label': {
        margin: '0 4px',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family-sans)'
      },

      '.cm-search input[type=text]': {
        backgroundColor: 'var(--background-primary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius, 4px)',
        padding: '4px 8px',
        outline: 'none'
      },

      '.cm-search input[type=text]:focus': {
        borderColor: 'var(--color-primary)',
        boxShadow: '0 0 0 2px var(--color-primary-alpha)'
      },

      '.cm-search button': {
        backgroundColor: 'var(--background-tertiary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius, 4px)',
        padding: '4px 8px',
        cursor: 'pointer'
      },

      '.cm-search button:hover': {
        backgroundColor: 'var(--background-hover)'
      },

      // Panel styling
      '.cm-panels': {
        backgroundColor: 'var(--background-secondary)',
        color: 'var(--text-primary)'
      },

      '.cm-panels.cm-panels-top': {
        borderBottom: '1px solid var(--border-color)'
      },

      '.cm-panels.cm-panels-bottom': {
        borderTop: '1px solid var(--border-color)'
      },

      // Completion popup
      '.cm-completionIcon': {
        fontSize: '16px',
        width: '20px',
        textAlign: 'center'
      },

      '.cm-completionLabel': {
        fontFamily: 'var(--font-family-mono)'
      },

      '.cm-completionDetail': {
        fontStyle: 'italic',
        color: 'var(--text-muted)'
      },

      '.cm-tooltip': {
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius, 6px)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '400px'
      },

      '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: 'var(--border-color)'
      },

      '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: 'var(--background-secondary)'
      }
    },
    { dark: themeName === 'dark' }
  )
}

/**
 * Creates syntax highlighting that respects theme colors
 */
function createSyntaxHighlighting(themeName) {
  const isDark = themeName === 'dark'
  const isFantasy = themeName === 'fantasy'

  return syntaxHighlighting(
    HighlightStyle.define([
      // Markdown-specific highlighting
      {
        tag: t.heading,
        color: isFantasy ? 'var(--color-primary)' : isDark ? '#ffffff' : '#1a1a1a',
        fontWeight: 'bold'
      },
      {
        tag: t.heading1,
        fontSize: '1.4em',
        borderBottom: `2px solid ${isFantasy ? 'var(--color-primary)' : 'var(--border-color)'}`
      },
      {
        tag: t.heading2,
        fontSize: '1.3em'
      },
      {
        tag: t.heading3,
        fontSize: '1.2em'
      },
      {
        tag: t.strong,
        fontWeight: 'bold',
        color: isFantasy ? 'var(--color-secondary)' : 'inherit'
      },
      {
        tag: t.emphasis,
        fontStyle: 'italic',
        color: isFantasy ? 'var(--color-accent)' : 'inherit'
      },
      {
        tag: t.strikethrough,
        textDecoration: 'line-through'
      },
      {
        tag: t.link,
        color: isDark ? '#4fc3f7' : '#1976d2',
        textDecoration: 'underline'
      },
      {
        tag: t.url,
        color: isDark ? '#4fc3f7' : '#1976d2'
      },
      {
        tag: [t.list, t.quote],
        color: 'var(--text-secondary)'
      },
      {
        tag: t.monospace,
        fontFamily: 'var(--font-family-mono)',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        padding: '2px 4px',
        borderRadius: '3px'
      },
      {
        tag: t.processingInstruction, // Code blocks
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        color: isDark ? '#e0e0e0' : '#424242'
      },
      {
        tag: t.invalid,
        color: isDark ? '#f48fb1' : '#c62828'
      }
    ])
  )
}

/**
 * Get theme-specific highlight colors
 */
function getThemeHighlight(themeName) {
  const highlights = {
    light: 'rgba(0, 0, 0, 0.05)',
    dark: 'rgba(255, 255, 255, 0.05)',
    fantasy: 'rgba(139, 69, 19, 0.1)'
  }
  return highlights[themeName] || highlights.light
}

/**
 * Get theme-specific search match colors
 */
function getThemeSearchMatch(themeName) {
  const matches = {
    light: 'rgba(0, 100, 200, 0.2)',
    dark: 'rgba(100, 150, 255, 0.2)',
    fantasy: 'rgba(184, 134, 11, 0.3)'
  }
  return matches[themeName] || matches.light
}

/**
 * Export theme extensions for each Fantasy Editor theme
 */
export const fantasyLightTheme = [createUnifiedTheme('light'), createSyntaxHighlighting('light')]

export const fantasyDarkTheme = [createUnifiedTheme('dark'), createSyntaxHighlighting('dark')]

export const fantasyTheme = [createUnifiedTheme('fantasy'), createSyntaxHighlighting('fantasy')]

/**
 * Get theme extension by name with optional font size
 */
export function getThemeExtension(themeName, options = {}) {
  if (options.fontSize) {
    // Create theme with specific font size
    return [createUnifiedTheme(themeName, options), createSyntaxHighlighting(themeName)]
  }

  // Use default themes
  const themes = {
    light: fantasyLightTheme,
    dark: fantasyDarkTheme,
    fantasy: fantasyTheme
  }
  return themes[themeName] || fantasyLightTheme
}
