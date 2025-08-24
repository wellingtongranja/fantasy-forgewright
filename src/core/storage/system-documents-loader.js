/**
 * System Documents Loader
 * Loads system documents from markdown files
 */

export class SystemDocumentsLoader {
  constructor() {
    this.systemDocsPath = '/docs/system/'
    this.documents = new Map()
  }

  /**
   * Load all system documents from files
   */
  async loadSystemDocuments() {
    const documents = [
      { id: 'help', filename: 'help.md', title: 'Fantasy Editor Help' },
      {
        id: 'license-agpl',
        filename: 'license-agpl.md',
        title: 'AGPL v3 License (Community Edition)'
      },
      {
        id: 'license-commercial',
        filename: 'license-commercial.md',
        title: 'Commercial License Terms'
      },
      { id: 'eula', filename: 'eula.md', title: 'End User License Agreement' },
      { id: 'privacy', filename: 'privacy-policy.md', title: 'Privacy Policy' },
      { id: 'release-notes', filename: 'release-notes.md', title: 'Release Notes' }
    ]

    for (const doc of documents) {
      try {
        const content = await this.loadDocument(doc.filename)
        this.documents.set(doc.id, {
          systemId: doc.id,
          title: doc.title,
          content: content,
          tags: this.getTagsForDocument(doc.id),
          readonly: true,
          type: 'system'
        })
      } catch (error) {
        console.error(`Failed to load system document ${doc.filename}:`, error)
        // Fallback to a simple error message if file can't be loaded
        this.documents.set(doc.id, {
          systemId: doc.id,
          title: doc.title,
          content: `# ${doc.title}\n\nError loading document. Please check your installation.`,
          tags: this.getTagsForDocument(doc.id),
          readonly: true,
          type: 'system'
        })
      }
    }

    return this.documents
  }

  /**
   * Load a single document from file
   */
  async loadDocument(filename) {
    const response = await fetch(this.systemDocsPath + filename)
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`)
    }
    return await response.text()
  }

  /**
   * Get tags for a specific system document
   */
  getTagsForDocument(systemId) {
    const tagMap = {
      help: ['help', 'documentation', 'commands'],
      'license-agpl': ['license', 'legal', 'agpl'],
      'license-commercial': ['license', 'commercial', 'premium'],
      eula: ['legal', 'agreement', 'terms'],
      privacy: ['privacy', 'legal', 'data'],
      'release-notes': ['updates', 'version', 'changelog']
    }
    return tagMap[systemId] || []
  }

  /**
   * Get a specific system document
   */
  getSystemDocument(systemId) {
    return this.documents.get(systemId)
  }

  /**
   * Get all system documents
   */
  getAllSystemDocuments() {
    return Array.from(this.documents.values())
  }
}

// Create singleton instance
export const systemDocumentsLoader = new SystemDocumentsLoader()
