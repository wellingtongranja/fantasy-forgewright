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
   * For initial implementation, return false so users always see splash
   * This ensures the legal splash is shown on first visit
   */
  async hasUserAcceptedAll() {
    this.ensureInitialized()

    try {
      // For MVP: Always return false so users see the legal splash
      // This will be refined later to check actual acceptance records
      return false
    } catch (error) {
      // If there's an error checking, assume user needs to accept (safer approach)
      console.warn('Error checking user acceptance status:', error.message)
      return false
    }
  }

  /**
   * Generate a consistent user ID for legal acceptance tracking
   * Uses a simple approach for now - can be enhanced later
   */
  generateUserId() {
    // For MVP: use a simple constant user ID
    // In production, this should be based on actual user identity
    const userId = 'anonymous-user'

    // Validate the generated ID
    if (!userId || typeof userId !== 'string') {
      throw new Error('Failed to generate valid user ID')
    }

    return userId
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