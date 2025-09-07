/**
 * Settings Dialog Helper Utilities
 * Common functionality shared across settings components
 */

import { getThemeColors, getHeaderColors, getCustomThemeBaseColors } from '../../../../core/themes/theme-constants.js'

/**
 * Safe get nested setting value
 * @param {Object} settings - Settings object
 * @param {string} path - Dot notation path (e.g., 'editor.theme')
 * @returns {*} Setting value or undefined
 */
export function getSetting(settings, path) {
  if (!settings || typeof settings !== 'object') {
    return undefined
  }
  
  if (!path || typeof path !== 'string') {
    return undefined
  }
  
  const keys = path.split('.')
  let current = settings
  
  for (const key of keys) {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    current = current[key]
  }
  
  return current
}

/**
 * Safe set nested setting value
 * @param {Object} settings - Settings object to modify
 * @param {string} path - Dot notation path
 * @param {*} value - Value to set
 * @returns {Object} Updated settings object
 */
export function setSetting(settings, path, value) {
  if (!settings || typeof settings !== 'object') {
    settings = {}
  }
  
  if (!path || typeof path !== 'string') {
    return settings
  }
  
  const keys = path.split('.')
  const result = { ...settings }
  let current = result
  
  // Navigate to parent object
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    } else {
      current[key] = { ...current[key] }
    }
    current = current[key]
  }
  
  // Set final value
  current[keys[keys.length - 1]] = value
  return result
}

/**
 * Get theme colors with fallback
 * @param {string} theme - Theme name
 * @returns {Object} Theme colors object
 */
export function getThemeColorsWithFallback(theme) {
  try {
    return getThemeColors(theme)
  } catch (error) {
    console.warn('Failed to get theme colors for', theme, error)
    return getThemeColors('light') // Fallback to light theme
  }
}

/**
 * Get header colors with fallback
 * @param {string} theme - Theme name
 * @returns {Object} Header colors object
 */
export function getHeaderColorsWithFallback(theme) {
  try {
    return getHeaderColors(theme)
  } catch (error) {
    console.warn('Failed to get header colors for', theme, error)
    return getHeaderColors('light') // Fallback to light theme
  }
}

/**
 * Get custom theme base colors with fallback
 * @param {string} baseTheme - Base theme name
 * @returns {Object} Base colors object
 */
export function getCustomThemeBaseColorsWithFallback(baseTheme) {
  try {
    return getCustomThemeBaseColors(baseTheme)
  } catch (error) {
    console.warn('Failed to get base colors for', baseTheme, error)
    return getCustomThemeBaseColors('light') // Fallback to light theme
  }
}

/**
 * Parse setting value based on type
 * @param {string} settingPath - Setting path for type inference
 * @param {*} value - Raw value to parse
 * @param {string} inputType - HTML input type
 * @param {boolean} checked - Checkbox checked state
 * @returns {*} Parsed value
 */
export function parseSettingValue(settingPath, value, inputType = '', checked = false) {
  if (inputType === 'checkbox') {
    return checked
  }
  
  // Number settings
  if (settingPath.includes('width') || 
      settingPath.includes('zoom') || 
      settingPath.includes('Interval')) {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? value : parsed
  }
  
  return value
}

/**
 * Get default settings for a component
 * @param {string} component - Component name (editor, codemirror, etc.)
 * @returns {Object} Default settings
 */
export function getDefaultSettings(component) {
  const defaults = {
    editor: {
      theme: 'light',
      width: 65,
      zoom: 1.0,
      spellCheck: true,
      autoSave: true,
      autoSaveInterval: 5000
    },
    codemirror: {
      lineNumbers: false,
      lineWrapping: true,
      highlightActiveLine: true,
      bracketMatching: true,
      codeFolding: true,
      foldGutter: true,
      autocompletion: true,
      searchTop: true,
      placeholderText: 'Start writing your story...',
      fontSize: 'inherit',
      fontFamily: 'var(--font-family-mono)'
    },
    gitIntegration: {
      provider: 'github',
      autoSync: false,
      syncFrequency: 300000,
      syncOnSave: false,
      conflictResolution: 'prompt'
    },
    privacy: {
      analytics: false,
      crashReporting: false,
      dataSaving: true
    }
  }
  
  return defaults[component] || {}
}

/**
 * Generate unique ID for form elements
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'setting') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounce function for input handlers
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for performance-critical operations
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Format bytes to human readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}