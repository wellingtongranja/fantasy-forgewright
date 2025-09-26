/**
 * Fantasy Editor - System Documents Manager
 * Copyright (c) 2025 Forgewright, Inc.
 *
 * This file is part of Fantasy Editor.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
        content:
          '# Fantasy Editor Help\n\nVersion 0.0.1 (Alpha)\n\nPress Ctrl+Space to open the command palette.',
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
