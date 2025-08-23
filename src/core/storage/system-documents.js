/**
 * Fantasy Editor - System Documents Manager
 * Copyright (c) 2025 Forgewright
 * 
 * This file is part of Fantasy Editor.
 * 
 * Fantasy Editor Community Edition is free software: you can redistribute 
 * it and/or modify it under the terms of the GNU Affero General Public 
 * License as published by the Free Software Foundation, either version 3 
 * of the License, or (at your option) any later version.
 * 
 * For commercial licensing options, please contact licensing@forgewright.io
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

import { systemDocumentsLoader } from './system-documents-loader.js'

/**
 * System Documents Manager
 * Manages built-in readonly documents for help, licensing, legal content
 */
export class SystemDocumentsManager {
  constructor(storageManager) {
    this.storageManager = storageManager
    this.systemDocuments = new Map()
    this.initialized = false
  }

  /**
   * Initialize all system documents by loading from files
   */
  async initializeSystemDocuments() {
    if (this.initialized) return
    
    try {
      this.systemDocuments = await systemDocumentsLoader.loadSystemDocuments()
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize system documents:', error)
      // Fallback to basic help document if loading fails
      this.systemDocuments.set('help', {
        systemId: 'help',
        title: 'Fantasy Editor Help',
        content: '# Fantasy Editor Help\n\nVersion 0.0.1 (Alpha)\n\nPress Ctrl+Space to open the command palette.',
        type: 'system',
        readonly: true,
        tags: ['help', 'documentation', 'commands']
      })
    }
  }

  /**
   * Get or create a system document
   * @param {string} systemId - System document identifier
   * @returns {Promise<Object|null>} Document object or null
   */
  async getSystemDocument(systemId) {
    // Ensure documents are loaded
    await this.initializeSystemDocuments()
    
    // Check if document already exists in storage
    const existingDoc = await this.storageManager.getSystemDocument(systemId)
    if (existingDoc) {
      return existingDoc
    }

    // Get system document template
    const systemDoc = this.systemDocuments.get(systemId)
    if (!systemDoc) {
      return null
    }

    // Create new document with GUID
    const document = {
      id: this.storageManager.generateGUID(),
      ...systemDoc
    }

    return document
  }

  /**
   * Get list of available system document IDs
   * @returns {Array<string>} List of system document IDs
   */
  getAvailableSystemDocuments() {
    return Array.from(this.systemDocuments.keys())
  }

  /**
   * Check if a document is a system document
   * @param {string} systemId - System document identifier
   * @returns {boolean} True if system document exists
   */
  isSystemDocument(systemId) {
    return this.systemDocuments.has(systemId)
  }
}