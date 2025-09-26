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
        color: 'var(--color-text)',
        backgroundColor: 'var(--color-bg)',
        fontSize: fontSize || 'var(--codemirror-font-size)',
        fontFamily: 'var(--font-family-mono)'
      },

      '.cm-content': {
        padding: '16px',
        lineHeight: 'var(--line-height-relaxed)',
        caretColor: 'var(--color-text)',
        minHeight: '100%',
        fontSize: fontSize || 'var(--codemirror-font-size)'
      },

      '.cm-focused': {
        outline: 'none'
      },

      '.cm-editor': {
        backgroundColor: 'var(--color-bg)'
      },

      '.cm-scroller': {
        fontFamily: 'inherit',
        fontSize: 'inherit'
      },

      // Line numbers
      '.cm-gutters': {
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        border: 'none',
        borderRight: '1px solid var(--color-border)'
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
        color: 'var(--color-text-secondary)'
      },

      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        cursor: 'pointer',
        fontSize: '12px'
      },

      '.cm-foldGutter .cm-gutterElement:hover': {
        backgroundColor: 'var(--color-bg-tertiary)',
        color: 'var(--color-text)'
      },

      // Placeholder text
      '.cm-placeholder': {
        color: 'var(--color-text-secondary)',
        fontStyle: 'italic'
      },

      // Search panel
      '.cm-search': {
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-md, 6px)',
        padding: '8px',
        boxShadow: 'var(--shadow-sm)'
      },

      '.cm-search input, .cm-search button, .cm-search label': {
        margin: '0 4px',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family-base)'
      },

      '.cm-search input[type=text]': {
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-sm, 4px)',
        padding: '4px 8px',
        outline: 'none'
      },

      '.cm-search input[type=text]:focus': {
        borderColor: 'var(--color-primary)',
        boxShadow: '0 0 0 2px rgba(var(--color-primary-rgb), 0.2)'
      },

      '.cm-search button': {
        backgroundColor: 'var(--color-bg-tertiary)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-sm, 4px)',
        padding: '4px 8px',
        cursor: 'pointer'
      },

      '.cm-search button:hover': {
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-primary)'
      },

      // Panel styling
      '.cm-panels': {
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text)'
      },

      '.cm-panels.cm-panels-top': {
        borderBottom: '1px solid var(--color-border)'
      },

      '.cm-panels.cm-panels-bottom': {
        borderTop: '1px solid var(--color-border)'
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
        color: 'var(--color-text-secondary)'
      },

      '.cm-tooltip': {
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-md, 6px)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '400px'
      },

      '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: 'var(--color-border)'
      },

      '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: 'var(--color-bg-secondary)'
      }
    },
    { dark: themeName === 'dark' || themeName === 'fantasy' }
  )
}

/**
 * Creates syntax highlighting that respects theme colors
 */
function createSyntaxHighlighting(themeName) {
  const isDark = themeName === 'dark' || themeName === 'fantasy'
  const isFantasy = themeName === 'fantasy'

  return syntaxHighlighting(
    HighlightStyle.define([
      // Markdown-specific highlighting
      {
        tag: t.heading,
        color: isFantasy ? '#6A1B2D' : (isDark ? '#ffffff' : '#1a1a1a'), // Royal Burgundy for fantasy
        fontWeight: 'bold'
      },
      {
        tag: t.heading1,
        fontSize: '1.4em',
        borderBottom: `2px solid var(--border-color)`
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
        color: 'inherit'
      },
      {
        tag: t.emphasis,
        fontStyle: 'italic',
        color: 'inherit'
      },
      {
        tag: t.strikethrough,
        textDecoration: 'line-through'
      },
      {
        tag: t.link,
        color: isFantasy ? '#A6801D' : (isDark ? '#4fc3f7' : '#1976d2'), // Imperial Gold Dark for fantasy
        textDecoration: 'underline'
      },
      {
        tag: t.url,
        color: isFantasy ? '#A6801D' : (isDark ? '#4fc3f7' : '#1976d2') // Imperial Gold Dark for fantasy
      },
      {
        tag: [t.list, t.quote],
        color: 'var(--text-secondary)'
      },
      {
        tag: t.monospace,
        fontFamily: 'var(--font-family-mono)',
        backgroundColor: isFantasy ? 'rgba(106, 27, 45, 0.1)' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'), // Royal Burgundy background for fantasy
        color: isFantasy ? '#8E2C42' : 'inherit', // Royal Burgundy Light for fantasy
        padding: '2px 4px',
        borderRadius: '3px'
      },
      {
        tag: t.processingInstruction, // Code blocks
        backgroundColor: isFantasy ? 'rgba(42, 77, 46, 0.05)' : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'), // King's Green background for fantasy
        color: isFantasy ? '#2A4D2E' : (isDark ? '#e0e0e0' : '#424242') // King's Green Base for fantasy
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
    fantasy: 'rgba(23, 48, 26, 0.05)' // King's Green Dark for fantasy
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
    fantasy: 'rgba(212, 175, 55, 0.25)' // Imperial Gold Base for fantasy
  }
  return matches[themeName] || matches.light
}

/**
 * Export theme extensions for each Fantasy Editor theme
 */
export const fantasyLightTheme = [createUnifiedTheme('light'), createSyntaxHighlighting('light')]

export const fantasyDarkTheme = [createUnifiedTheme('dark'), createSyntaxHighlighting('dark')]

export const fantasyFantasyTheme = [createUnifiedTheme('fantasy'), createSyntaxHighlighting('fantasy')]


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
    fantasy: fantasyFantasyTheme,
    custom: fantasyLightTheme // Custom theme falls back to light base
  }
  return themes[themeName] || fantasyLightTheme
}
