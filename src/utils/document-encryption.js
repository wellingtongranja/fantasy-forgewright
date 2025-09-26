/**
 * Client-side document encryption system for Fantasy Editor
 * Provides zero-knowledge document storage with AES-256-GCM encryption
 * Documents are encrypted before being stored in IndexedDB
 */

let documentEncryptionKey = null

/**
 * Generate or retrieve document encryption key
 * Key is stored in sessionStorage and lost when browser closes for security
 * @returns {Promise<CryptoKey>} Document encryption key
 */
async function getOrCreateDocumentEncryptionKey() {
  if (documentEncryptionKey) {
    return documentEncryptionKey
  }

  try {
    // Try to load existing key from sessionStorage
    const keyData = sessionStorage.getItem('_dek')
    if (keyData) {
      const keyBuffer = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0))
      documentEncryptionKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      )
      return documentEncryptionKey
    }
  } catch (error) {
    console.warn('Failed to load existing document encryption key, generating new one')
  }

  // Generate new encryption key
  documentEncryptionKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt'
  ])

  // Store key in sessionStorage (will be lost when browser closes)
  try {
    const keyBuffer = await crypto.subtle.exportKey('raw', documentEncryptionKey)
    const keyString = btoa(String.fromCharCode(...new Uint8Array(keyBuffer)))
    sessionStorage.setItem('_dek', keyString)
  } catch (error) {
    console.error('Failed to store document encryption key:', error)
    // Continue anyway - key will work for this session
  }

  return documentEncryptionKey
}

/**
 * Encrypt document content with metadata
 * @param {Object} document - Document object to encrypt
 * @returns {Promise<Object>} Encrypted document object
 */
export async function encryptDocument(document) {
  if (!document || typeof document !== 'object') {
    throw new Error('Invalid document for encryption')
  }

  try {
    const key = await getOrCreateDocumentEncryptionKey()

    // Create a copy to avoid modifying original
    const encryptedDoc = { ...document }

    // Encrypt sensitive content fields
    const fieldsToEncrypt = ['content', 'title']

    for (const field of fieldsToEncrypt) {
      if (encryptedDoc[field] && typeof encryptedDoc[field] === 'string') {
        const encoder = new TextEncoder()
        const data = encoder.encode(encryptedDoc[field])

        // Generate random IV for each field
        const iv = crypto.getRandomValues(new Uint8Array(12))

        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength)
        combined.set(iv)
        combined.set(new Uint8Array(encrypted), iv.length)

        // Store as base64
        encryptedDoc[field] = btoa(String.fromCharCode(...combined))
      }
    }

    // Mark as encrypted and add encryption metadata
    encryptedDoc.encrypted = true
    encryptedDoc.encryptionVersion = '1.0'
    encryptedDoc.encryptedAt = Date.now()

    return encryptedDoc
  } catch (error) {
    console.error('Document encryption failed:', error)
    throw new Error('Failed to encrypt document')
  }
}

/**
 * Decrypt document content
 * @param {Object} encryptedDocument - Encrypted document object
 * @returns {Promise<Object>} Decrypted document object
 */
export async function decryptDocument(encryptedDocument) {
  if (!encryptedDocument || typeof encryptedDocument !== 'object') {
    throw new Error('Invalid encrypted document')
  }

  // If document is not encrypted, return as-is
  if (!encryptedDocument.encrypted) {
    return encryptedDocument
  }

  try {
    const key = await getOrCreateDocumentEncryptionKey()

    // Create a copy to avoid modifying original
    const decryptedDoc = { ...encryptedDocument }

    // Decrypt sensitive content fields
    const fieldsToDecrypt = ['content', 'title']

    for (const field of fieldsToDecrypt) {
      if (decryptedDoc[field] && typeof decryptedDoc[field] === 'string') {
        try {
          // Decode from base64
          const combined = Uint8Array.from(atob(decryptedDoc[field]), (c) => c.charCodeAt(0))

          // Extract IV and encrypted data
          const iv = combined.slice(0, 12)
          const encrypted = combined.slice(12)

          const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)

          const decoder = new TextDecoder()
          decryptedDoc[field] = decoder.decode(decrypted)
        } catch (fieldError) {
          console.error(`Failed to decrypt field ${field}:`, fieldError)
          // Keep encrypted value if decryption fails
          continue
        }
      }
    }

    // Remove encryption metadata from decrypted document
    delete decryptedDoc.encrypted
    delete decryptedDoc.encryptionVersion
    delete decryptedDoc.encryptedAt

    return decryptedDoc
  } catch (error) {
    console.error('Document decryption failed:', error)
    throw new Error('Failed to decrypt document')
  }
}

/**
 * Encrypt document tags array
 * @param {string[]} tags - Array of tags to encrypt
 * @returns {Promise<string>} Encrypted tags as base64 string
 */
export async function encryptTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return ''
  }

  try {
    const key = await getOrCreateDocumentEncryptionKey()
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(tags))

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Tag encryption failed:', error)
    throw new Error('Failed to encrypt tags')
  }
}

/**
 * Decrypt document tags array
 * @param {string} encryptedTags - Encrypted tags as base64 string
 * @returns {Promise<string[]>} Decrypted tags array
 */
export async function decryptTags(encryptedTags) {
  if (!encryptedTags || typeof encryptedTags !== 'string') {
    return []
  }

  try {
    const key = await getOrCreateDocumentEncryptionKey()
    const combined = Uint8Array.from(atob(encryptedTags), (c) => c.charCodeAt(0))

    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)

    const decoder = new TextDecoder()
    const tagsJson = decoder.decode(decrypted)
    return JSON.parse(tagsJson)
  } catch (error) {
    console.error('Tag decryption failed:', error)
    return []
  }
}

/**
 * Check if Web Crypto API is available for encryption
 * @returns {boolean} True if encryption is supported
 */
export function isEncryptionSupported() {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.encrypt === 'function' &&
    typeof crypto.subtle.decrypt === 'function' &&
    typeof crypto.subtle.generateKey === 'function'
  )
}

/**
 * Clear all document encryption keys and data
 * Call this on logout or when user wants to reset encryption
 */
export function clearDocumentEncryption() {
  try {
    sessionStorage.removeItem('_dek')
    documentEncryptionKey = null
  } catch (error) {
    console.error('Failed to clear document encryption:', error)
  }
}

/**
 * Get encryption status information
 * @returns {Object} Encryption status and metadata
 */
export function getEncryptionStatus() {
  return {
    supported: isEncryptionSupported(),
    keyExists: documentEncryptionKey !== null || sessionStorage.getItem('_dek') !== null,
    algorithm: 'AES-256-GCM',
    keyDerivation: 'Direct',
    storage: 'SessionStorage (expires on browser close)'
  }
}

export default {
  encryptDocument,
  decryptDocument,
  encryptTags,
  decryptTags,
  isEncryptionSupported,
  clearDocumentEncryption,
  getEncryptionStatus
}
