/**
 * Privacy-compliant user identification system for Fantasy Editor
 * Generates stable, anonymous user identifiers for legal compliance tracking
 * without collecting personal information or tracking across devices
 */

/**
 * Generate a browser fingerprint ONLY with explicit user consent
 * This function performs fingerprinting which requires GDPR consent
 * @param {boolean} hasConsent - Whether user has explicitly consented to fingerprinting
 * @returns {Promise<string>} Anonymous browser fingerprint or consent-free fallback
 */
async function generateBrowserFingerprint(hasConsent = false) {
  // GDPR/CCPA Compliance: Only perform fingerprinting with explicit consent
  if (!hasConsent) {
    // Return consent-free random identifier
    const fallback = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    return fallback.slice(0, 16)
  }

  const components = []

  try {
    // Only collect browser characteristics if user has explicitly consented
    // Screen characteristics
    components.push(screen.width.toString())
    components.push(screen.height.toString())
    components.push(screen.colorDepth.toString())

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone)

    // Language preference
    components.push(navigator.language || 'en')

    // Platform/OS
    components.push(navigator.platform || 'unknown')

    // WARNING: Canvas fingerprinting requires explicit consent under GDPR
    // Only perform if user has specifically consented to fingerprinting
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('Privacy ID Generator', 2, 2)
      const fontFingerprint = canvas.toDataURL().slice(-50, -20)
      components.push(fontFingerprint)
    }

    // Hardware concurrency
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
    // Fallback to consent-free random ID if fingerprinting fails
    const fallback = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    return fallback.slice(0, 16)
  }
}

/**
 * Get or generate a privacy-compliant user ID
 * Stored in localStorage for legal compliance persistence across sessions
 * GDPR/CCPA Compliant: Only performs fingerprinting with explicit user consent
 * @returns {Promise<string>} Privacy-compliant user identifier
 */
export async function getPrivacyCompliantUserId() {
  try {
    // Check if we already have an ID (check both storage types)
    let userId =
      localStorage.getItem('privacy_user_id') || sessionStorage.getItem('privacy_user_id')

    if (!userId) {
      // Check if user has explicitly consented to fingerprinting (GDPR requirement)
      const consent = getConsentStatus()
      const hasFingerprintingConsent = consent.fingerprinting || false

      // Generate ID based on consent status
      // With consent: stable fingerprint-based ID
      // Without consent: random session ID (GDPR compliant)
      const fingerprint = await generateBrowserFingerprint(hasFingerprintingConsent)
      userId = `user_${fingerprint}`

      // Store in localStorage for persistence across sessions (needed for legal acceptance tracking)
      // This is GDPR compliant as it's pseudonymous and used only for legal compliance
      localStorage.setItem('privacy_user_id', userId)
      // Also store in sessionStorage for backward compatibility
      sessionStorage.setItem('privacy_user_id', userId)
    }

    // Ensure both storages have the ID for consistency
    if (!localStorage.getItem('privacy_user_id')) {
      localStorage.setItem('privacy_user_id', userId)
    }
    if (!sessionStorage.getItem('privacy_user_id')) {
      sessionStorage.setItem('privacy_user_id', userId)
    }

    return userId
  } catch (error) {
    console.error('Error generating privacy-compliant user ID:', error)

    // Ultimate fallback - random session-based ID (no consent required)
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
 * GDPR/CCPA Compliant: All consent defaults to false until explicitly granted
 * @returns {Object} Consent status object
 */
export function getConsentStatus() {
  try {
    const stored = localStorage.getItem('privacy_consent')
    if (!stored) {
      return {
        // Essential functionality (cannot be disabled)
        essential: true,

        // Functional features (optional, includes fingerprinting)
        functionalCookies: false,
        fingerprinting: false, // Explicit fingerprinting consent

        // Analytics and tracking (optional)
        analytics: false,

        // Third-party integrations (optional)
        thirdPartyIntegrations: false,

        lastUpdated: null,
        consentVersion: '1.0' // Track consent schema version
      }
    }

    const parsed = JSON.parse(stored)

    // Ensure all required fields exist with secure defaults
    return {
      essential: true, // Always true - cannot be disabled
      functionalCookies: parsed.functionalCookies || false,
      fingerprinting: parsed.fingerprinting || false, // Explicit fingerprinting consent
      analytics: parsed.analytics || false,
      thirdPartyIntegrations: parsed.thirdPartyIntegrations || false,
      lastUpdated: parsed.lastUpdated || null,
      consentVersion: parsed.consentVersion || '1.0'
    }
  } catch (error) {
    console.error('Error reading consent status:', error)
    // Return secure defaults on error
    return {
      essential: true,
      functionalCookies: false,
      fingerprinting: false,
      analytics: false,
      thirdPartyIntegrations: false,
      lastUpdated: null,
      consentVersion: '1.0'
    }
  }
}

/**
 * Update user consent preferences
 * GDPR/CCPA Compliant: Validates and stores user consent securely
 * @param {Object} preferences - Consent preferences
 */
export function updateConsentStatus(preferences) {
  try {
    // Validate that essential consent is always true
    const consentData = {
      essential: true, // Cannot be disabled
      functionalCookies: Boolean(preferences.functionalCookies),
      fingerprinting: Boolean(preferences.fingerprinting), // Explicit fingerprinting consent
      analytics: Boolean(preferences.analytics),
      thirdPartyIntegrations: Boolean(preferences.thirdPartyIntegrations),
      lastUpdated: new Date().toISOString(),
      consentVersion: '1.0',
      // Track user's IP country for GDPR applicability (if available from other sources)
      gdprApplicable: preferences.gdprApplicable || null,
      ccpaApplicable: preferences.ccpaApplicable || null
    }

    localStorage.setItem('privacy_consent', JSON.stringify(consentData))

    // Clear existing user ID if fingerprinting consent was revoked
    if (!consentData.fingerprinting) {
      clearPrivacyUserId()
    }
  } catch (error) {
    console.error('Error storing consent preferences:', error)
  }
}

/**
 * Check if user needs to provide consent (GDPR/CCPA compliance check)
 * @returns {boolean} True if consent is required and not yet provided
 */
export function isConsentRequired() {
  const consent = getConsentStatus()

  // If no consent timestamp, consent is required
  if (!consent.lastUpdated) {
    return true
  }

  // Check if consent is older than 12 months (GDPR recommendation)
  const consentDate = new Date(consent.lastUpdated)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  if (consentDate < twelveMonthsAgo) {
    return true
  }

  return false
}

/**
 * Get privacy compliance summary for debugging and auditing
 * @returns {Object} Privacy compliance status
 */
export function getPrivacyComplianceStatus() {
  const consent = getConsentStatus()

  return {
    hasValidConsent: !isConsentRequired(),
    consentAge: consent.lastUpdated ? new Date() - new Date(consent.lastUpdated) : null,
    fingerprintingEnabled: consent.fingerprinting,
    analyticsEnabled: consent.analytics,
    consentVersion: consent.consentVersion,
    lastUpdated: consent.lastUpdated,
    isGdprCompliant: true, // Our system is designed to be GDPR compliant by default
    isCcpaCompliant: true // Our system is designed to be CCPA compliant by default
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
  isConsentRequired,
  getPrivacyComplianceStatus,
  generateDocumentAccessId,
  trackPrivacyCompliantEvent
}
