/**
 * Security utilities for safe HTML handling and XSS prevention
 * Used throughout Fantasy Editor to ensure secure content rendering
 */

/**
 * Safely render HTML content using DOMPurify sanitization
 * @param {string} html - The HTML content to sanitize and render
 * @param {string[]} allowedTags - Array of allowed HTML tags (default: basic formatting tags)
 * @param {string[]} allowedAttributes - Array of allowed HTML attributes (default: empty)
 * @returns {string} - Sanitized HTML safe for innerHTML usage
 */
export async function safeHTML(html, allowedTags = [], allowedAttributes = []) {
  if (!html || typeof html !== 'string') {
    return ''
  }

  try {
    // Dynamically import DOMPurify
    const DOMPurify = (await import('dompurify')).default

    // Default safe tags for rich text content
    const defaultTags = [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'sub',
      'sup',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'a',
      'span',
      'div'
    ]

    // Default safe attributes
    const defaultAttributes = ['href', 'title', 'alt', 'class']

    const config = {
      ALLOWED_TAGS: allowedTags.length > 0 ? allowedTags : defaultTags,
      ALLOWED_ATTR: allowedAttributes.length > 0 ? allowedAttributes : defaultAttributes,
      ALLOW_DATA_ATTR: false,
      FORBID_SCRIPT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'style']
    }

    return DOMPurify.sanitize(html, config)
  } catch (error) {
    console.error('Error sanitizing HTML:', error)
    // Fallback to text content for security
    return html.replace(/<[^>]*>/g, '')
  }
}

/**
 * Safely render plain text with line breaks converted to <br> tags
 * @param {string} text - Plain text content
 * @returns {string} - Safe HTML with line breaks
 */
export function safeTextWithBreaks(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // Escape HTML characters first, then convert line breaks
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  // Convert line breaks to <br> tags
  return escaped.replace(/\n/g, '<br>')
}

/**
 * Safely set element content (prefers textContent, falls back to sanitized innerHTML)
 * @param {HTMLElement} element - The DOM element to update
 * @param {string} content - The content to set
 * @param {boolean} allowHTML - Whether to allow HTML content (default: false)
 * @param {string[]} allowedTags - Array of allowed HTML tags if allowHTML is true
 */
export async function safeSetContent(element, content, allowHTML = false, allowedTags = []) {
  if (!element || !content) {
    if (element) element.textContent = ''
    return
  }

  if (!allowHTML) {
    // Safe text-only content
    element.textContent = content
  } else {
    // Sanitized HTML content
    element.innerHTML = await safeHTML(content, allowedTags)
  }
}

/**
 * Safely set element content with line breaks (for notifications, etc.)
 * @param {HTMLElement} element - The DOM element to update
 * @param {string} text - Plain text content with potential line breaks
 */
export function safeSetTextWithBreaks(element, text) {
  if (!element || !text) {
    if (element) element.textContent = ''
    return
  }

  element.innerHTML = safeTextWithBreaks(text)
}

/**
 * Validate and sanitize document content for storage
 * @param {Object} document - Document object to sanitize
 * @returns {Object} - Sanitized document object
 */
export async function sanitizeDocument(document) {
  if (!document || typeof document !== 'object') {
    throw new Error('Invalid document object')
  }

  const sanitized = { ...document }

  // Sanitize title (text only)
  if (sanitized.title) {
    sanitized.title = sanitized.title.replace(/<[^>]*>/g, '').trim()
  }

  // Sanitize content (allow markdown-safe HTML)
  if (sanitized.content) {
    const markdownSafeTags = [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre'
    ]
    sanitized.content = await safeHTML(sanitized.content, markdownSafeTags)
  }

  // Sanitize tags array
  if (Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags
      .map((tag) => tag.replace(/<[^>]*>/g, '').trim())
      .filter((tag) => tag.length > 0)
  }

  return sanitized
}

/**
 * Security validation for user input
 * @param {string} input - User input to validate
 * @param {number} maxLength - Maximum allowed length (default: 10000)
 * @returns {boolean} - Whether input passes security validation
 */
export function validateUserInput(input, maxLength = 10000) {
  if (typeof input !== 'string') {
    return false
  }

  // Check length
  if (input.length > maxLength) {
    return false
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i
  ]

  return !suspiciousPatterns.some((pattern) => pattern.test(input))
}

/**
 * Secure token encryption and decryption using Web Crypto API
 * Provides client-side encryption for OAuth tokens and sensitive data
 */

let encryptionKey = null

/**
 * Generate or retrieve encryption key for token storage
 * @returns {Promise<CryptoKey>} - Encryption key
 */
async function getOrCreateEncryptionKey() {
  if (encryptionKey) {
    return encryptionKey
  }

  try {
    // Try to load existing key from sessionStorage
    const keyData = sessionStorage.getItem('_ek')
    if (keyData) {
      const keyBuffer = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0))
      encryptionKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt'
      ])
      return encryptionKey
    }
  } catch (error) {
    // Key doesn't exist or is corrupted, generate new one
  }

  // Generate new encryption key
  encryptionKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt'
  ])

  // Store key in sessionStorage (will be lost when browser closes)
  try {
    const keyBuffer = await crypto.subtle.exportKey('raw', encryptionKey)
    const keyString = btoa(String.fromCharCode(...new Uint8Array(keyBuffer)))
    sessionStorage.setItem('_ek', keyString)
  } catch (error) {
    console.error('Failed to store encryption key:', error)
  }

  return encryptionKey
}

/**
 * Encrypt sensitive token data
 * @param {string} token - Token to encrypt
 * @returns {Promise<string>} - Encrypted token as base64 string
 */
export async function encryptToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token for encryption')
  }

  try {
    const key = await getOrCreateEncryptionKey()
    const encoder = new TextEncoder()
    const data = encoder.encode(token)

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    // Return as base64
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Token encryption failed:', error)
    throw new Error('Failed to encrypt token')
  }
}

/**
 * Decrypt encrypted token data
 * @param {string} encryptedToken - Encrypted token as base64 string
 * @returns {Promise<string>} - Decrypted token
 */
export async function decryptToken(encryptedToken) {
  if (!encryptedToken || typeof encryptedToken !== 'string') {
    throw new Error('Invalid encrypted token')
  }

  try {
    const key = await getOrCreateEncryptionKey()

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedToken), (c) => c.charCodeAt(0))

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Token decryption failed:', error)
    throw new Error('Failed to decrypt token')
  }
}

/**
 * Secure authentication data storage
 * @param {Object} authData - Authentication data to store
 * @returns {Promise<void>}
 */
export async function storeSecureAuth(authData) {
  if (!authData || typeof authData !== 'object') {
    throw new Error('Invalid authentication data')
  }

  try {
    const secureData = { ...authData }

    // Encrypt sensitive fields
    if (secureData.accessToken) {
      secureData.accessToken = await encryptToken(secureData.accessToken)
      secureData.encrypted = true
    }

    // Add expiration time (4 hours for session security)
    secureData.expiresAt = Date.now() + 4 * 60 * 60 * 1000

    // Store in sessionStorage (more secure than localStorage)
    sessionStorage.setItem('auth_data', JSON.stringify(secureData))
  } catch (error) {
    console.error('Failed to store authentication data:', error)
    throw new Error('Failed to store authentication data securely')
  }
}

/**
 * Secure authentication data loading
 * @returns {Promise<Object|null>} - Decrypted authentication data or null
 */
export async function loadSecureAuth() {
  try {
    const stored = sessionStorage.getItem('auth_data')
    if (!stored) {
      return null
    }

    const authData = JSON.parse(stored)

    // Check expiration
    if (authData.expiresAt && Date.now() > authData.expiresAt) {
      sessionStorage.removeItem('auth_data')
      return null
    }

    // Decrypt sensitive fields
    if (authData.encrypted && authData.accessToken) {
      try {
        authData.accessToken = await decryptToken(authData.accessToken)
        delete authData.encrypted
      } catch (error) {
        // Decryption failed, remove corrupted data
        sessionStorage.removeItem('auth_data')
        return null
      }
    }

    return authData
  } catch (error) {
    console.error('Failed to load authentication data:', error)
    // Remove corrupted data
    sessionStorage.removeItem('auth_data')
    return null
  }
}

/**
 * Clear all secure authentication data
 */
export function clearSecureAuth() {
  sessionStorage.removeItem('auth_data')
  sessionStorage.removeItem('_ek') // Remove encryption key as well
  encryptionKey = null
}
