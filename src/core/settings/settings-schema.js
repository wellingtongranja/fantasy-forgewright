/**
 * Settings Schema - Validation and defaults for Fantasy Editor settings
 * Provides type validation, default values, and migration support
 */

export const SETTINGS_VERSION = 1

/**
 * Default settings configuration
 */
export const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  
  editor: {
    theme: 'light',
    customTheme: {
      name: '',
      baseTheme: 'light',
      colors: {
        backgroundPrimary: '#ffffff',
        backgroundSecondary: '#f8fafc',
        textPrimary: '#1e293b',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        accent: '#6366f1',
        border: '#e2e8f0'
      }
    },
    width: 65,
    zoom: 1.0,
    spellCheck: false,
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
  
  ui: {
    navigatorPinned: false,
    showOutline: true,
    showWordCount: false,
    showLineNumbers: false
  },
  
  gitIntegration: {
    provider: 'github',
    enabled: false,
    autoSync: false,
    syncInterval: 300000,
    providerConfig: {
      github: { scopes: ['repo', 'user'] },
      gitlab: { 
        baseUrl: 'gitlab.com', 
        scopes: ['read_repository', 'write_repository'] 
      },
      bitbucket: { scopes: ['repository', 'account'] },
      generic: { baseUrl: '', authType: 'oauth' }
    }
  },
  
  privacy: {
    analyticsEnabled: false,
    crashReporting: false
  }
}

/**
 * Settings validation schema
 */
export const SETTINGS_SCHEMA = {
  version: { type: 'number', required: true, min: 1 },
  
  editor: {
    type: 'object',
    properties: {
      theme: { 
        type: 'string', 
        enum: ['light', 'dark', 'fantasy', 'custom'] 
      },
      customTheme: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 50 },
          baseTheme: { 
            type: 'string', 
            enum: ['light', 'dark', 'fantasy'] 
          },
          colors: {
            type: 'object',
            properties: {
              backgroundPrimary: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
              backgroundSecondary: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
              textPrimary: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
              textSecondary: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
              textMuted: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
              accent: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
              border: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ }
            }
          }
        }
      },
      width: { type: 'number', enum: [65, 80, 90] },
      zoom: { type: 'number', min: 0.85, max: 1.3 },
      spellCheck: { type: 'boolean' },
      autoSave: { type: 'boolean' },
      autoSaveInterval: { type: 'number', min: 1000, max: 30000 }
    }
  },
  
  codemirror: {
    type: 'object',
    properties: {
      lineNumbers: { type: 'boolean' },
      lineWrapping: { type: 'boolean' },
      highlightActiveLine: { type: 'boolean' },
      bracketMatching: { type: 'boolean' },
      codeFolding: { type: 'boolean' },
      foldGutter: { type: 'boolean' },
      autocompletion: { type: 'boolean' },
      searchTop: { type: 'boolean' },
      placeholderText: { type: 'string', maxLength: 100 },
      fontSize: { 
        type: 'string', 
        enum: ['inherit', 'custom'] 
      },
      fontFamily: { type: 'string', maxLength: 200 }
    }
  },
  
  ui: {
    type: 'object',
    properties: {
      navigatorPinned: { type: 'boolean' },
      showOutline: { type: 'boolean' },
      showWordCount: { type: 'boolean' },
      showLineNumbers: { type: 'boolean' }
    }
  },
  
  gitIntegration: {
    type: 'object',
    properties: {
      provider: { 
        type: 'string', 
        enum: ['github', 'gitlab', 'bitbucket', 'generic'] 
      },
      enabled: { type: 'boolean' },
      autoSync: { type: 'boolean' },
      syncInterval: { type: 'number', min: 60000, max: 600000 },
      providerConfig: { type: 'object' }
    }
  },
  
  privacy: {
    type: 'object',
    properties: {
      analyticsEnabled: { type: 'boolean' },
      crashReporting: { type: 'boolean' }
    }
  }
}

/**
 * Validate a single setting value against schema
 */
function validateProperty(value, schema) {
  if (schema.type === 'string') {
    if (typeof value !== 'string') return false
    if (schema.maxLength && value.length > schema.maxLength) return false
    if (schema.enum && !schema.enum.includes(value)) return false
    if (schema.pattern && !schema.pattern.test(value)) return false
  }
  
  if (schema.type === 'number') {
    if (typeof value !== 'number' || isNaN(value)) return false
    if (schema.min !== undefined && value < schema.min) return false
    if (schema.max !== undefined && value > schema.max) return false
    if (schema.enum && !schema.enum.includes(value)) return false
  }
  
  if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') return false
  }
  
  return true
}

/**
 * Recursively validate settings object
 */
function validateObject(obj, schema) {
  if (!obj || typeof obj !== 'object') return false
  
  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    const value = obj[key]
    
    if (propSchema.required && value === undefined) return false
    if (value === undefined) continue
    
    if (propSchema.type === 'object') {
      if (value !== null && typeof value === 'object' && !validateObject(value, propSchema)) {
        return false
      }
    } else {
      if (!validateProperty(value, propSchema)) return false
    }
  }
  
  return true
}

/**
 * Validate complete settings object
 */
export function validateSettings(settings) {
  try {
    if (!settings || typeof settings !== 'object') {
      return { valid: false, error: 'Settings must be an object' }
    }
    
    // Check version
    if (!validateProperty(settings.version, SETTINGS_SCHEMA.version)) {
      return { valid: false, error: 'Invalid settings version' }
    }
    
    // Validate each section
    for (const [section, schema] of Object.entries(SETTINGS_SCHEMA)) {
      if (section === 'version') continue
      
      // Skip validation if section doesn't exist (will be merged with defaults)
      if (!settings[section]) continue
      
      if (!validateObject(settings[section], schema)) {
        return { valid: false, error: `Invalid ${section} settings` }
      }
    }
    
    return { valid: true }
    
  } catch (error) {
    return { 
      valid: false, 
      error: `Settings validation error: ${error.message}` 
    }
  }
}

/**
 * Merge user settings with defaults, ensuring all required fields exist
 */
export function mergeWithDefaults(userSettings) {
  const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  
  if (!userSettings || typeof userSettings !== 'object') {
    return merged
  }
  
  // Deep merge user settings with defaults
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {}
        deepMerge(target[key], source[key])
      } else if (source[key] !== undefined) {
        target[key] = source[key]
      }
    }
  }
  
  deepMerge(merged, userSettings)
  return merged
}

/**
 * Get searchable setting paths for settings search functionality
 */
export function getSearchableSettings() {
  return [
    { path: 'editor.theme', label: 'Editor Theme', keywords: ['theme', 'appearance', 'color'] },
    { path: 'editor.width', label: 'Editor Width', keywords: ['width', 'column', 'line length'] },
    { path: 'editor.zoom', label: 'Editor Zoom', keywords: ['zoom', 'font size', 'scale'] },
    { path: 'editor.spellCheck', label: 'Spell Check', keywords: ['spell', 'check', 'grammar'] },
    { path: 'editor.autoSave', label: 'Auto Save', keywords: ['auto', 'save', 'automatic'] },
    { path: 'codemirror.lineNumbers', label: 'Line Numbers', keywords: ['line', 'numbers', 'gutter'] },
    { path: 'codemirror.lineWrapping', label: 'Line Wrapping', keywords: ['wrap', 'line', 'overflow'] },
    { path: 'codemirror.highlightActiveLine', label: 'Highlight Active Line', keywords: ['highlight', 'active', 'current'] },
    { path: 'ui.navigatorPinned', label: 'Pin Navigator', keywords: ['navigator', 'sidebar', 'pin'] },
    { path: 'ui.showWordCount', label: 'Word Count', keywords: ['word', 'count', 'statistics'] },
    { path: 'gitIntegration.provider', label: 'Git Provider', keywords: ['git', 'github', 'gitlab', 'bitbucket', 'version', 'control'] },
    { path: 'gitIntegration.autoSync', label: 'Auto Sync', keywords: ['auto', 'sync', 'automatic', 'backup', 'git'] },
    { path: 'privacy.analyticsEnabled', label: 'Analytics', keywords: ['analytics', 'tracking', 'privacy'] }
  ]
}