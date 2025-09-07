/**
 * Centralized theme color constants
 * Single source of truth for all theme colors to prevent duplication
 */

export const THEME_COLORS = {
  // Light Theme
  light: {
    background: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#e9ecef'
    },
    text: {
      primary: '#212529',
      secondary: '#6c757d',
      tertiary: '#868e96',
      muted: '#868e96',
      inverse: '#ffffff'
    },
    accent: '#007bff',
    border: {
      default: '#dee2e6',
      light: '#f1f3f4',
      dark: '#adb5bd'
    },
    header: {
      background: '#f8f9fa',
      text: '#212529',
      border: '#dee2e6'
    }
  },

  // Dark Theme
  dark: {
    background: {
      primary: '#1a1a1a',
      secondary: '#2d3748',
      tertiary: '#4a5568'
    },
    text: {
      primary: '#f7fafc',
      secondary: '#a0aec0',
      tertiary: '#718096',
      muted: '#718096',
      inverse: '#1a1a1a'
    },
    accent: '#63b3ed',
    border: {
      default: '#4a5568',
      light: '#2d3748',
      dark: '#718096'
    },
    header: {
      background: '#2d3748',
      text: '#f7fafc',
      border: '#4a5568'
    }
  },

  // Fantasy Theme - King's Colors Palette
  fantasy: {
    background: {
      primary: '#F3E6D1',     // Parchment Light
      secondary: '#E6D5B8',   // Parchment Base
      tertiary: '#C9B28A'     // Parchment Dark
    },
    text: {
      primary: '#17301A',     // King's Green Dark
      secondary: '#2A4D2E',   // King's Green Base
      tertiary: '#4F7A55',    // King's Green Light
      muted: '#4F7A55',       // King's Green Light
      inverse: '#F3E6D1'      // Parchment Light
    },
    accent: '#D4AF37',        // Imperial Gold Base
    border: {
      default: '#C9B28A',     // Parchment Dark
      light: '#E6D5B8',       // Parchment Base
      dark: '#A6801D'         // Imperial Gold Dark
    },
    header: {
      background: '#2A4D2E',  // King's Green Base
      text: '#D4AF37',        // Imperial Gold Base
      border: '#E6C875'       // Light Imperial Gold
    }
  },

  // Custom Theme Defaults
  custom: {
    background: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#e9ecef'
    },
    text: {
      primary: '#212529',
      secondary: '#6c757d',
      tertiary: '#868e96',
      muted: '#868e96',
      inverse: '#ffffff'
    },
    accent: '#6366f1',
    border: {
      default: '#e2e8f0',
      light: '#f1f3f4',
      dark: '#cbd5e0'
    },
    header: {
      background: '#f8f9fa',
      text: '#212529',
      border: '#dee2e6'
    }
  }
}

// King's Colors Palette Constants
export const KINGS_COLORS = {
  green: {
    dark: '#17301A',
    base: '#2A4D2E',
    light: '#4F7A55'
  },
  burgundy: {
    dark: '#40101C',
    base: '#6A1B2D',
    light: '#8E2C42'
  },
  gold: {
    dark: '#A6801D',
    base: '#D4AF37',
    light: '#E6C875'
  },
  parchment: {
    dark: '#C9B28A',
    base: '#E6D5B8',
    light: '#F3E6D1'
  }
}

// Helper function to get theme colors
export function getThemeColors(theme) {
  return THEME_COLORS[theme] || THEME_COLORS.light
}

// Helper function to get header colors for a theme
export function getHeaderColors(theme) {
  const themeColors = getThemeColors(theme)
  return themeColors.header
}

// Helper function to get custom theme base colors
export function getCustomThemeBaseColors(baseTheme) {
  const themeColors = getThemeColors(baseTheme)
  return {
    backgroundPrimary: themeColors.background.primary,
    backgroundSecondary: themeColors.background.secondary,
    textPrimary: themeColors.text.primary,
    textSecondary: themeColors.text.secondary,
    textMuted: themeColors.text.muted,
    accent: themeColors.accent,
    border: themeColors.border.default
  }
}