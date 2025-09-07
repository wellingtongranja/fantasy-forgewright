/**
 * Settings Validation Utilities
 * Defensive programming for settings input validation
 */

/**
 * Validate hex color value
 * @param {string} value - Color value to validate
 * @returns {Object} Validation result with isValid and error message
 */
export function validateHexColor(value) {
  if (!value) {
    return { isValid: false, error: 'Color value is required' }
  }
  
  if (typeof value !== 'string') {
    return { isValid: false, error: 'Color value must be a string' }
  }
  
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    return { isValid: false, error: 'Invalid hex color format. Use #RRGGBB format' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate zoom level
 * @param {number} value - Zoom value to validate
 * @returns {Object} Validation result
 */
export function validateZoom(value) {
  if (value === null || value === undefined) {
    return { isValid: false, error: 'Zoom value is required' }
  }
  
  const num = parseFloat(value)
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Zoom must be a number' }
  }
  
  if (num < 0.5 || num > 3.0) {
    return { isValid: false, error: 'Zoom must be between 0.5 and 3.0' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate editor width
 * @param {number} value - Width value to validate  
 * @returns {Object} Validation result
 */
export function validateWidth(value) {
  if (value === null || value === undefined) {
    return { isValid: false, error: 'Width value is required' }
  }
  
  const num = parseInt(value, 10)
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Width must be a number' }
  }
  
  if (num < 40 || num > 150) {
    return { isValid: false, error: 'Width must be between 40 and 150 characters' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate theme name
 * @param {string} value - Theme name to validate
 * @returns {Object} Validation result
 */
export function validateThemeName(value) {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Theme name is required' }
  }
  
  if (value.length > 50) {
    return { isValid: false, error: 'Theme name must be 50 characters or less' }
  }
  
  if (value.length < 3) {
    return { isValid: false, error: 'Theme name must be at least 3 characters' }
  }
  
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
    return { isValid: false, error: 'Theme name can only contain letters, numbers, spaces, hyphens, and underscores' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate auto-save interval
 * @param {number} value - Interval in milliseconds
 * @returns {Object} Validation result
 */
export function validateAutoSaveInterval(value) {
  if (value === null || value === undefined) {
    return { isValid: false, error: 'Auto-save interval is required' }
  }
  
  const num = parseInt(value, 10)
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Interval must be a number' }
  }
  
  if (num < 1000 || num > 300000) {
    return { isValid: false, error: 'Interval must be between 1 and 300 seconds' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate font size
 * @param {number} value - Font size in pixels
 * @returns {Object} Validation result
 */
export function validateFontSize(value) {
  if (value === null || value === undefined) {
    return { isValid: false, error: 'Font size is required' }
  }
  
  const num = parseInt(value, 10)
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Font size must be a number' }
  }
  
  if (num < 8 || num > 48) {
    return { isValid: false, error: 'Font size must be between 8 and 48 pixels' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeHtml(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Deep merge objects safely
 * @param {Object} target - Target object
 * @param {Object} source - Source object  
 * @returns {Object} Merged object
 */
export function safeMerge(target, source) {
  if (!target || typeof target !== 'object') {
    target = {}
  }
  
  if (!source || typeof source !== 'object') {
    return { ...target }
  }
  
  const result = { ...target }
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = safeMerge(result[key], source[key])
      } else {
        result[key] = source[key]
      }
    }
  }
  
  return result
}