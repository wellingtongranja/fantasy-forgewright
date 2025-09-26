/**
 * Legal Manager - Main coordinator for legal documents management
 * Follows Fantasy Editor standards: clean code, defensive programming, KISS principle
 */
import { LegalClient } from './legal-client.js'
import { LegalDocumentTracker } from './legal-tracker.js'
import { LegalAcceptanceManager } from './legal-acceptance.js'
import { DOCUMENT_TYPES } from './legal-constants.js'

export class LegalManager {
  constructor() {
    this.client = new LegalClient()
    this.tracker = new LegalDocumentTracker()
    this.acceptance = new LegalAcceptanceManager()
    this.initialized = false
    this.lastUpdateCheck = null
    this.cachedMetadata = null
  }

  /**
   * Initialize legal manager and database
   */
  async init() {
    try {
      await this.acceptance.initDatabase()
      this.initialized = true
    } catch (error) {
      throw new Error(`Failed to initialize legal manager: ${error.message}`)
    }
  }

  /**
   * Check for document updates from worker
   */
  async checkForUpdates() {
    this.ensureInitialized()

    // Use cached results if available and recent
    if (this.isCacheValid()) {
      return this.cachedMetadata
    }

    try {
      const metadata = await this.client.checkDocuments()
      this.cachedMetadata = metadata
      this.lastUpdateCheck = Date.now()
      return metadata
    } catch (error) {
      return this.createFallbackResponse('Worker unavailable')
    }
  }

  /**
   * Get user acceptance status for all documents
   */
  async getUserAcceptanceStatus(userId, documentHashes) {
    this.ensureInitialized()
    this.validateUserId(userId)
    this.validateDocumentHashes(documentHashes)

    try {
      return await this.acceptance.getUserAcceptanceStatus(userId, documentHashes)
    } catch (error) {
      throw new Error(`Failed to get user acceptance status: ${error.message}`)
    }
  }

  /**
   * Record user acceptance for a document
   */
  async recordUserAcceptance(acceptanceData) {
    this.ensureInitialized()
    this.validateAcceptanceData(acceptanceData)

    try {
      return await this.acceptance.recordAcceptance(acceptanceData)
    } catch (error) {
      throw new Error(`Failed to record acceptance: ${error.message}`)
    }
  }

  /**
   * Fetch specific document and track it
   */
  async fetchDocument(type, expectedHash) {
    this.ensureInitialized()
    this.validateDocumentType(type)

    try {
      const document = await this.client.fetchDocument(type, expectedHash)
      await this.tracker.trackDocument(document)
      return document
    } catch (error) {
      return this.createFallbackDocument(type, 'Worker unavailable')
    }
  }

  /**
   * Get document change status for user
   */
  async getDocumentChangeStatus(userId, documentType, currentHash) {
    this.ensureInitialized()
    this.validateUserId(userId)
    this.validateDocumentType(documentType)

    try {
      const hasAccepted = await this.acceptance.hasUserAccepted(
        userId,
        documentType,
        currentHash
      )

      return {
        needsAcceptance: !hasAccepted,
        hasChanged: !hasAccepted,
        currentHash
      }
    } catch (error) {
      throw new Error(`Failed to get change status: ${error.message}`)
    }
  }

  /**
   * Get user's acceptance history
   */
  async getUserAcceptanceHistory(userId) {
    this.ensureInitialized()
    this.validateUserId(userId)

    try {
      return await this.acceptance.getUserAcceptanceHistory(userId)
    } catch (error) {
      throw new Error(`Failed to get acceptance history: ${error.message}`)
    }
  }

  /**
   * Check if user has accepted all required legal documents
   * Checks actual acceptance records in IndexedDB
   */
  async hasUserAcceptedAll() {
    this.ensureInitialized()

    try {
      const userId = await this.generateUserId()
      const requiredDocuments = ['privacy-policy', 'eula', 'license']

      // DEVELOPMENT MODE: Check if user has any previous acceptances
      // In development, if user has previously accepted ANY legal documents,
      // don't show the splash again (even if versions have changed)
      const isLocalhost = window.location.hostname === 'localhost'
      if (isLocalhost) {
        try {
          const existingAcceptances = await this.acceptance.hasAnyAcceptanceRecords(userId)
          if (existingAcceptances) {
            console.log('💻 Development mode: User has previous acceptances, skipping legal splash')
            return true
          }
        } catch (error) {
          console.warn('Could not check existing acceptance records:', error)
        }
      }

      // Get current document metadata to check versions
      const metadata = await this.checkForUpdates()

      // If worker is unavailable, we can't verify current document versions
      if (!metadata || !metadata.documents || Object.keys(metadata.documents).length === 0) {
        // If we have the error field, this means worker is unavailable (not just no documents)
        // In this case, check if user has any existing acceptances stored locally
        if (metadata && metadata.error) {
          try {
            const existingAcceptances = await this.acceptance.hasAnyAcceptanceRecords(userId)
            if (existingAcceptances) {
              // User has accepted documents previously, even though we can't verify versions
              // This prevents legal splash from showing on every refresh in development
              return true
            }
          } catch (error) {
            console.warn('Could not check existing acceptance records:', error)
          }
        }
        // No existing acceptances or other failure - show legal splash
        return false
      }

      // Check if user has accepted all required documents with current versions
      for (const docType of requiredDocuments) {
        const currentDocHash = metadata.documents[docType]?.hash || metadata.documents[docType]?.sha

        if (!currentDocHash) {
          return false
        }

        const hasAccepted = await this.acceptance.hasUserAccepted(userId, docType, currentDocHash)

        if (!hasAccepted) {
          return false
        }
      }
      return true
    } catch (error) {
      // If there's an error checking, assume user needs to accept (safer approach)
      console.error('Error checking user acceptance status:', error)
      return false
    }
  }

  /**
   * Generate a privacy-compliant user ID for legal acceptance tracking
   * Uses browser fingerprinting for stable anonymous identification
   */
  async generateUserId() {
    try {
      // Import privacy-compliant ID generator
      const { getPrivacyCompliantUserId } = await import('../../utils/privacy-id.js')
      const userId = await getPrivacyCompliantUserId()

      // Validate the generated ID
      if (!userId || typeof userId !== 'string') {
        throw new Error('Failed to generate valid privacy-compliant user ID')
      }

      return userId
    } catch (error) {
      console.error('Error generating privacy-compliant user ID:', error)

      // Fallback to session-based ID
      let fallbackId = sessionStorage.getItem('legal_fallback_user_id')
      if (!fallbackId) {
        fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        sessionStorage.setItem('legal_fallback_user_id', fallbackId)
      }

      return fallbackId
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.client.clearCache()
    this.tracker.clearTracking()
    this.cachedMetadata = null
    this.lastUpdateCheck = null
  }

  /**
   * Check if cached metadata is still valid
   */
  isCacheValid() {
    if (!this.cachedMetadata || !this.lastUpdateCheck) {
      return false
    }

    const cacheAge = Date.now() - this.lastUpdateCheck
    const maxCacheAge = 5 * 60 * 1000 // 5 minutes

    return cacheAge < maxCacheAge
  }

  /**
   * Create fallback response when worker unavailable
   */
  createFallbackResponse(errorMessage) {
    return {
      documents: {},
      lastUpdated: null,
      error: errorMessage
    }
  }

  /**
   * Create fallback document when worker unavailable
   */
  createFallbackDocument(type, errorMessage) {
    return {
      type,
      content: '',
      hash: null,
      version: null,
      error: errorMessage
    }
  }

  /**
   * Ensure manager is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Legal manager not initialized')
    }
  }

  /**
   * Validate user ID
   */
  validateUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required')
    }
  }

  /**
   * Validate document hashes object
   */
  validateDocumentHashes(documentHashes) {
    if (!documentHashes || typeof documentHashes !== 'object') {
      throw new Error('Document hashes are required')
    }
  }

  /**
   * Validate acceptance data
   */
  validateAcceptanceData(acceptanceData) {
    if (!acceptanceData || typeof acceptanceData !== 'object') {
      throw new Error('Acceptance data is required')
    }
  }

  /**
   * Validate document type
   */
  validateDocumentType(type) {
    if (!type) {
      throw new Error('Document type is required')
    }

    if (!DOCUMENT_TYPES.includes(type)) {
      throw new Error('Invalid document type')
    }
  }
}