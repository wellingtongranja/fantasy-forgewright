/**
 * Migration Utility - Migrate documents from UID to GUID system
 * Ensures backward compatibility and smooth transition to new identification system
 */

import { guidManager } from './guid.js'

export class MigrationManager {
  constructor(storageManager) {
    this.storageManager = storageManager
    this.migrationLog = []
    this.migrationStatus = 'ready' // ready, running, completed, error
  }

  /**
   * Check if migration is needed
   * @returns {Promise<boolean>} Whether migration is needed
   */
  async isMigrationNeeded() {
    try {
      const documents = await this.storageManager.getAllDocuments()

      // Check if any documents use old UID format
      const oldFormatDocs = documents.filter((doc) => guidManager.isOldUidFormat(doc.id))

      return oldFormatDocs.length > 0
    } catch (error) {
      console.error('Failed to check migration status:', error)
      return false
    }
  }

  /**
   * Get migration statistics
   * @returns {Promise<Object>} Migration statistics
   */
  async getMigrationStats() {
    try {
      const documents = await this.storageManager.getAllDocuments()
      const oldFormatDocs = documents.filter((doc) => guidManager.isOldUidFormat(doc.id))
      const newFormatDocs = documents.filter((doc) => guidManager.isValidGuid(doc.id))
      const invalidDocs = documents.filter(
        (doc) => !guidManager.isOldUidFormat(doc.id) && !guidManager.isValidGuid(doc.id)
      )

      return {
        total: documents.length,
        needsMigration: oldFormatDocs.length,
        alreadyMigrated: newFormatDocs.length,
        invalid: invalidDocs.length,
        migrationNeeded: oldFormatDocs.length > 0
      }
    } catch (error) {
      console.error('Failed to get migration statistics:', error)
      return {
        total: 0,
        needsMigration: 0,
        alreadyMigrated: 0,
        invalid: 0,
        migrationNeeded: false,
        error: error.message
      }
    }
  }

  /**
   * Migrate all documents from UID to GUID system
   * @param {Object} options Migration options
   * @returns {Promise<Object>} Migration result
   */
  async migrateAllDocuments(options = {}) {
    const { backupFirst = true, continueOnError = false, batchSize = 10 } = options

    if (this.migrationStatus === 'running') {
      throw new Error('Migration already in progress')
    }

    this.migrationStatus = 'running'
    this.migrationLog = []

    try {
      const stats = await this.getMigrationStats()

      if (!stats.migrationNeeded) {
        this.migrationStatus = 'completed'
        return {
          success: true,
          message: 'No migration needed - all documents already use GUID format',
          stats,
          migrated: 0
        }
      }

      this.log('info', `Starting migration of ${stats.needsMigration} documents`)

      // Create backup if requested
      let backupId = null
      if (backupFirst) {
        backupId = await this.createBackup()
        this.log('info', `Created backup: ${backupId}`)
      }

      // Get documents that need migration
      const allDocuments = await this.storageManager.getAllDocuments()
      const documentsToMigrate = allDocuments.filter((doc) => guidManager.isOldUidFormat(doc.id))

      let migratedCount = 0
      const errors = []

      // Process documents in batches
      for (let i = 0; i < documentsToMigrate.length; i += batchSize) {
        const batch = documentsToMigrate.slice(i, i + batchSize)

        for (const doc of batch) {
          try {
            await this.migrateDocument(doc)
            migratedCount++
            this.log('success', `Migrated: ${doc.title} (${doc.id})`)
          } catch (error) {
            const errorMsg = `Failed to migrate ${doc.title}: ${error.message}`
            this.log('error', errorMsg)
            errors.push({ document: doc, error: errorMsg })

            if (!continueOnError) {
              throw new Error(`Migration stopped due to error: ${errorMsg}`)
            }
          }
        }

        // Yield to event loop between batches
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      this.migrationStatus = 'completed'

      const result = {
        success: errors.length === 0,
        message: `Migration completed: ${migratedCount}/${stats.needsMigration} documents migrated`,
        stats,
        migrated: migratedCount,
        errors: errors.length,
        backupId,
        log: [...this.migrationLog]
      }

      if (errors.length > 0) {
        result.errorDetails = errors
      }

      this.log('info', result.message)
      return result
    } catch (error) {
      this.migrationStatus = 'error'
      this.log('error', `Migration failed: ${error.message}`)

      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        error: error.message,
        log: [...this.migrationLog]
      }
    }
  }

  /**
   * Migrate a single document from UID to GUID
   * @param {Object} oldDocument Document with UID
   * @returns {Promise<Object>} Migrated document
   */
  async migrateDocument(oldDocument) {
    if (!guidManager.isOldUidFormat(oldDocument.id)) {
      throw new Error('Document does not need migration')
    }

    // Generate new GUID
    const newGuid = guidManager.migrateUidToGuid(oldDocument.id)

    // Create migrated document with new structure
    const migratedDoc = {
      id: newGuid,
      title: oldDocument.title || 'Untitled Document',
      filename: guidManager.generateFilename(oldDocument.title || 'untitled', newGuid),
      content: oldDocument.content || '',
      tags: Array.isArray(oldDocument.tags) ? oldDocument.tags : [],
      metadata: {
        guid: newGuid,
        created: oldDocument.createdAt || new Date().toISOString(),
        modified: oldDocument.updatedAt || new Date().toISOString(),
        version: 1,
        migratedFrom: oldDocument.id,
        migrationDate: new Date().toISOString()
      },
      sync: {
        status: 'local',
        lastSync: null,
        remoteSha: null,
        gitPath: null,
        checksum: guidManager.generateChecksum(oldDocument.content || '')
      }
    }

    // Validate migrated document
    this.storageManager.validateDocument(migratedDoc)

    // Save new document
    await this.storageManager.saveDocument(migratedDoc)

    // Delete old document
    await this.storageManager.deleteDocument(oldDocument.id)

    return migratedDoc
  }

  /**
   * Create backup of current database
   * @returns {Promise<string>} Backup identifier
   */
  async createBackup() {
    const backupId = `backup_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`

    try {
      const allDocuments = await this.storageManager.getAllDocuments()
      const backup = {
        id: backupId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        documents: allDocuments,
        count: allDocuments.length
      }

      // Store backup in localStorage (separate from IndexedDB)
      localStorage.setItem(backupId, JSON.stringify(backup))

      // Store backup reference
      const backupRefs = JSON.parse(localStorage.getItem('migration_backups') || '[]')
      backupRefs.push({
        id: backupId,
        timestamp: backup.timestamp,
        count: backup.count
      })
      localStorage.setItem('migration_backups', JSON.stringify(backupRefs))

      return backupId
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`)
    }
  }

  /**
   * Restore from backup
   * @param {string} backupId Backup identifier
   * @returns {Promise<Object>} Restore result
   */
  async restoreFromBackup(backupId) {
    try {
      const backupData = localStorage.getItem(backupId)
      if (!backupData) {
        throw new Error(`Backup ${backupId} not found`)
      }

      const backup = JSON.parse(backupData)

      if (!backup.documents || !Array.isArray(backup.documents)) {
        throw new Error('Invalid backup format')
      }

      // Clear current database
      const currentDocs = await this.storageManager.getAllDocuments()
      for (const doc of currentDocs) {
        await this.storageManager.deleteDocument(doc.id)
      }

      // Restore documents
      let restoredCount = 0
      for (const doc of backup.documents) {
        await this.storageManager.saveDocument(doc)
        restoredCount++
      }

      this.log('info', `Restored ${restoredCount} documents from backup ${backupId}`)

      return {
        success: true,
        message: `Restored ${restoredCount} documents from backup`,
        backupId,
        restored: restoredCount,
        backupDate: backup.timestamp
      }
    } catch (error) {
      this.log('error', `Failed to restore backup ${backupId}: ${error.message}`)
      throw new Error(`Failed to restore backup: ${error.message}`)
    }
  }

  /**
   * List available backups
   * @returns {Array} List of available backups
   */
  listBackups() {
    try {
      return JSON.parse(localStorage.getItem('migration_backups') || '[]')
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  /**
   * Clean up old backups
   * @param {number} keepCount Number of backups to keep (default: 5)
   */
  cleanupBackups(keepCount = 5) {
    try {
      const backups = this.listBackups()

      if (backups.length <= keepCount) {
        return
      }

      // Sort by timestamp, keep most recent
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      const toDelete = backups.slice(keepCount)

      toDelete.forEach((backup) => {
        localStorage.removeItem(backup.id)
        this.log('info', `Deleted old backup: ${backup.id}`)
      })

      // Update backup references
      const keepBackups = backups.slice(0, keepCount)
      localStorage.setItem('migration_backups', JSON.stringify(keepBackups))
    } catch (error) {
      console.error('Failed to cleanup backups:', error)
    }
  }

  /**
   * Log migration events
   * @param {string} level Log level (info, success, error)
   * @param {string} message Log message
   */
  log(level, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message
    }

    this.migrationLog.push(entry)
    console.log(`[Migration:${level.toUpperCase()}] ${message}`)
  }

  /**
   * Get migration status
   * @returns {Object} Current migration status
   */
  getStatus() {
    return {
      status: this.migrationStatus,
      logEntries: this.migrationLog.length,
      lastActivity:
        this.migrationLog.length > 0
          ? this.migrationLog[this.migrationLog.length - 1].timestamp
          : null
    }
  }

  /**
   * Reset migration state
   */
  reset() {
    this.migrationStatus = 'ready'
    this.migrationLog = []
  }
}
