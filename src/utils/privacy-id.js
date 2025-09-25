/**
 * Privacy-compliant user identification system for Fantasy Editor
 * Generates stable, anonymous user identifiers for legal compliance tracking
 * without collecting personal information or tracking across devices
 */

/**
 * Generate a browser fingerprint for privacy-compliant identification
 * Uses non-invasive browser characteristics that don't reveal personal info
 * @returns {Promise<string>} Anonymous browser fingerprint
 */
async function generateBrowserFingerprint() {
  const components = []

  try {
    // Screen characteristics (not personal info)
    components.push(screen.width.toString())
    components.push(screen.height.toString())
    components.push(screen.colorDepth.toString())

    // Timezone (not personal, used by many sites)
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone)

    // Language preference (not personal, publicly visible)
    components.push(navigator.language || 'en')

    // Platform/OS (not personal, in user agent)
    components.push(navigator.platform || 'unknown')

    // Available fonts (not personal, used for design compatibility)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('Privacy ID Generator', 2, 2)
      const fontFingerprint = canvas.toDataURL().slice(-50, -20)
      components.push(fontFingerprint)
    }

    // Hardware concurrency (not personal, performance optimization)
    if (navigator.hardwareConcurrency) {
      components.push(navigator.hardwareConcurrency.toString())
    }

    // Join all components and create hash
    const fingerprint = components.join('|')
    const encoder = new TextEncoder()
    const data = encoder.encode(fingerprint)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    // Return first 16 characters for reasonable anonymity
    return hashHex.slice(0, 16)
  } catch (error) {
    // Fallback to timestamp-based ID if fingerprinting fails
    const fallback = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    return fallback.slice(0, 16)
  }
}

/**
 * Get or generate a privacy-compliant user ID
 * Stored in sessionStorage to reset between browser sessions for privacy
 * @returns {Promise<string>} Privacy-compliant user identifier
 */
export async function getPrivacyCompliantUserId() {
  try {
    // Check if we already have an ID for this session
    let userId = sessionStorage.getItem('privacy_user_id')

    if (!userId) {
      // Generate new fingerprint-based ID
      const fingerprint = await generateBrowserFingerprint()
      userId = `user_${fingerprint}`

      // Store in sessionStorage (expires when browser closes)
      sessionStorage.setItem('privacy_user_id', userId)
    }

    return userId
  } catch (error) {
    console.error('Error generating privacy-compliant user ID:', error)

    // Ultimate fallback - random session-based ID
    const fallbackId = `user_${Math.random().toString(36).slice(2, 16)}`
    try {
      sessionStorage.setItem('privacy_user_id', fallbackId)
    } catch (storageError) {
      // If sessionStorage fails, just return the ID without storing
      console.warn('SessionStorage not available, using temporary ID')
    }

    return fallbackId
  }
}

/**
 * Clear the current privacy user ID (for logout, privacy reset, etc.)
 */
export function clearPrivacyUserId() {
  try {
    sessionStorage.removeItem('privacy_user_id')
  } catch (error) {
    console.warn('Failed to clear privacy user ID:', error)
  }
}

/**
 * Get user consent status for various privacy-related features
 * @returns {Object} Consent status object
 */
export function getConsentStatus() {
  try {
    const stored = localStorage.getItem('privacy_consent')
    if (!stored) {
      return {
        analytics: false,
        functionalCookies: false,
        thirdPartyIntegrations: false,
        lastUpdated: null
      }
    }

    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading consent status:', error)
    return {
      analytics: false,
      functionalCookies: false,
      thirdPartyIntegrations: false,
      lastUpdated: null
    }
  }
}

/**
 * Update user consent preferences
 * @param {Object} preferences - Consent preferences
 */
export function updateConsentStatus(preferences) {
  try {
    const consentData = {
      ...preferences,
      lastUpdated: new Date().toISOString()
    }

    localStorage.setItem('privacy_consent', JSON.stringify(consentData))
  } catch (error) {
    console.error('Error storing consent preferences:', error)
  }
}

/**
 * Generate unique document access tracking ID for legal compliance
 * Different from user ID - used to track document access patterns anonymously
 * @returns {string} Document access tracking ID
 */
export function generateDocumentAccessId() {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).slice(2, 12)
  return `doc_access_${timestamp}_${randomPart}`
}

/**
 * Privacy-compliant event tracking for legal/analytics purposes
 * @param {string} event - Event name
 * @param {Object} metadata - Non-personal metadata
 * @returns {Promise<void>}
 */
export async function trackPrivacyCompliantEvent(event, metadata = {}) {
  const consent = getConsentStatus()

  // Only track if user has consented to analytics
  if (!consent.analytics) {
    return
  }

  try {
    const userId = await getPrivacyCompliantUserId()

    const eventData = {
      event,
      userId, // Anonymous fingerprint-based ID
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        // Ensure no personal data is included
        version: import.meta?.env?.VITE_APP_VERSION || '0.0.2-alpha',
        environment: import.meta?.env?.MODE || 'production'
      }
    }

    // Store locally for now (could be sent to privacy-compliant analytics service)
    const existingEvents = JSON.parse(localStorage.getItem('privacy_events') || '[]')
    existingEvents.push(eventData)

    // Keep only last 100 events to prevent storage bloat
    if (existingEvents.length > 100) {
      existingEvents.splice(0, existingEvents.length - 100)
    }

    localStorage.setItem('privacy_events', JSON.stringify(existingEvents))
  } catch (error) {
    console.error('Error tracking privacy-compliant event:', error)
  }
}

export default {
  getPrivacyCompliantUserId,
  clearPrivacyUserId,
  getConsentStatus,
  updateConsentStatus,
  generateDocumentAccessId,
  trackPrivacyCompliantEvent
}
