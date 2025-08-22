/**
 * GitHubStorage - GitHub repository storage manager
 * Handles document CRUD operations using GitHub Contents API
 */
export class GitHubStorage {
  constructor(githubAuth) {
    this.auth = githubAuth
    this.owner = null
    this.repo = null
    this.branch = 'main'
    this.documentsPath = 'documents'
  }

  /**
   * Initialize GitHub storage with repository configuration
   * @param {Object} config - Repository configuration
   * @param {string} config.owner - Repository owner
   * @param {string} config.repo - Repository name
   * @param {string} config.branch - Branch name (default: main)
   * @param {string} config.documentsPath - Path for documents (default: documents)
   */
  init(config) {
    if (!config.owner || !config.repo) {
      throw new Error('Repository owner and name are required')
    }
    
    this.owner = config.owner
    this.repo = config.repo
    this.branch = config.branch || 'main'
    this.documentsPath = config.documentsPath || 'documents'
  }

  /**
   * Check if storage is configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!(this.owner && this.repo && this.auth.isAuthenticated())
  }

  /**
   * Save document to GitHub repository
   * @param {Object} document - Document object
   * @returns {Promise<Object>} GitHub file object
   */
  async saveDocument(document) {
    if (!this.isConfigured()) {
      throw new Error('GitHub storage not configured or not authenticated')
    }

    if (!document.id || !document.title) {
      throw new Error('Document must have id and title')
    }

    try {
      const filename = this.generateFilename(document)
      const filepath = `${this.documentsPath}/${filename}`
      const content = this.formatDocumentContent(document)
      
      // Check if file already exists
      const existingFile = await this.getFileInfo(filepath)
      
      const requestBody = {
        message: existingFile 
          ? `Update document: ${document.title}` 
          : `Create document: ${document.title}`,
        content: btoa(unescape(encodeURIComponent(content))), // Base64 encode UTF-8
        branch: this.branch
      }

      // Include SHA if updating existing file
      if (existingFile) {
        requestBody.sha = existingFile.sha
      }

      const response = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to save document: ${response.status}`)
      }

      const result = await response.json()
      
      return {
        ...result,
        document: {
          ...document,
          githubSha: result.content.sha,
          githubPath: filepath,
          lastSyncedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      throw new Error(`GitHub save failed: ${error.message}`)
    }
  }

  /**
   * Load document from GitHub repository
   * @param {string} filepath - Path to document file
   * @returns {Promise<Object>} Document object
   */
  async loadDocument(filepath) {
    if (!this.isConfigured()) {
      throw new Error('GitHub storage not configured or not authenticated')
    }

    try {
      const response = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found')
        }
        throw new Error(`Failed to load document: ${response.status}`)
      }

      const fileData = await response.json()
      const content = decodeURIComponent(escape(atob(fileData.content)))
      
      return this.parseDocumentContent(content, {
        githubSha: fileData.sha,
        githubPath: filepath,
        lastSyncedAt: new Date().toISOString()
      })
    } catch (error) {
      throw new Error(`GitHub load failed: ${error.message}`)
    }
  }

  /**
   * List all documents in GitHub repository
   * @returns {Promise<Array>} Array of document metadata
   */
  async listDocuments() {
    if (!this.isConfigured()) {
      throw new Error('GitHub storage not configured or not authenticated')
    }

    try {
      const response = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${this.documentsPath}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          // Documents folder doesn't exist yet
          return []
        }
        throw new Error(`Failed to list documents: ${response.status}`)
      }

      const files = await response.json()
      
      if (!Array.isArray(files)) {
        return []
      }

      // Filter for markdown files and extract metadata
      const documents = []
      for (const file of files) {
        if (file.type === 'file' && file.name.endsWith('.md')) {
          try {
            const document = await this.loadDocument(file.path)
            documents.push({
              id: document.id,
              title: document.title,
              githubPath: file.path,
              githubSha: file.sha,
              size: file.size,
              updatedAt: document.updatedAt,
              tags: document.tags || []
            })
          } catch (error) {
            // Skip files that can't be parsed
            console.warn(`Failed to parse document ${file.name}:`, error.message)
          }
        }
      }

      return documents.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    } catch (error) {
      throw new Error(`GitHub list failed: ${error.message}`)
    }
  }

  /**
   * Delete document from GitHub repository
   * @param {string} filepath - Path to document file
   * @param {string} sha - File SHA for deletion
   * @param {string} title - Document title for commit message
   * @returns {Promise<void>}
   */
  async deleteDocument(filepath, sha, title) {
    if (!this.isConfigured()) {
      throw new Error('GitHub storage not configured or not authenticated')
    }

    try {
      const response = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Delete document: ${title}`,
            sha: sha,
            branch: this.branch
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.status}`)
      }
    } catch (error) {
      throw new Error(`GitHub delete failed: ${error.message}`)
    }
  }

  /**
   * Get file information without content
   * @param {string} filepath - Path to file
   * @returns {Promise<Object|null>} File info or null if not found
   */
  async getFileInfo(filepath) {
    try {
      const response = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3.object'
          }
        }
      )

      if (response.ok) {
        return await response.json()
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Check if repository exists and is accessible
   * @returns {Promise<boolean>} Repository accessibility
   */
  async verifyRepository() {
    if (!this.auth.isAuthenticated()) {
      return false
    }

    try {
      const response = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}`
      )
      
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Create documents directory if it doesn't exist
   * @returns {Promise<void>}
   */
  async ensureDocumentsDirectory() {
    if (!this.isConfigured()) {
      throw new Error('GitHub storage not configured or not authenticated')
    }

    try {
      // Check if documents directory exists
      const response = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${this.documentsPath}`
      )

      if (response.status === 404) {
        // Create README.md in documents directory
        const readmeContent = '# Documents\n\nThis directory contains Fantasy Editor documents.\n'
        
        await this.auth.makeAuthenticatedRequest(
          `/repos/${this.owner}/${this.repo}/contents/${this.documentsPath}/README.md`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: 'Initialize documents directory',
              content: btoa(readmeContent),
              branch: this.branch
            })
          }
        )
      }
    } catch (error) {
      throw new Error(`Failed to ensure documents directory: ${error.message}`)
    }
  }

  /**
   * Generate filename for document
   * @param {Object} document - Document object
   * @returns {string} Filename
   */
  generateFilename(document) {
    // Use document ID as base filename to ensure uniqueness
    const safeName = document.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, 50) // Limit length
    
    return `${document.id}-${safeName}.md`
  }

  /**
   * Format document content for GitHub storage
   * @param {Object} document - Document object
   * @returns {string} Formatted content
   */
  formatDocumentContent(document) {
    const frontMatter = this.generateFrontMatter(document)
    const content = document.content || ''
    
    return `${frontMatter}\n\n${content}`
  }

  /**
   * Generate YAML front matter for document
   * @param {Object} document - Document object
   * @returns {string} YAML front matter
   */
  generateFrontMatter(document) {
    const frontMatter = {
      id: document.id,
      title: document.title,
      created: document.createdAt,
      updated: document.updatedAt,
      tags: document.tags || [],
      checksum: document.checksum
    }

    const yaml = Object.entries(frontMatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length === 0) return `${key}: []`
          return `${key}:\n${value.map(item => `  - ${item}`).join('\n')}`
        }
        if (typeof value === 'string' && value.includes('\n')) {
          return `${key}: |\n  ${value.replace(/\n/g, '\n  ')}`
        }
        return `${key}: ${JSON.stringify(value)}`
      })
      .join('\n')

    return `---\n${yaml}\n---`
  }

  /**
   * Parse document content from GitHub storage
   * @param {string} content - File content
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Document object
   */
  parseDocumentContent(content, metadata = {}) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    
    if (!frontMatterMatch) {
      throw new Error('Invalid document format: missing front matter')
    }

    const [, frontMatterYaml, documentContent] = frontMatterMatch
    const frontMatter = this.parseYamlFrontMatter(frontMatterYaml)
    
    return {
      id: frontMatter.id,
      title: frontMatter.title,
      content: documentContent.trim(),
      createdAt: frontMatter.created,
      updatedAt: frontMatter.updated,
      tags: frontMatter.tags || [],
      checksum: frontMatter.checksum,
      ...metadata
    }
  }

  /**
   * Simple YAML front matter parser
   * @param {string} yaml - YAML string
   * @returns {Object} Parsed object
   */
  parseYamlFrontMatter(yaml) {
    const result = {}
    const lines = yaml.trim().split('\n')
    
    let currentKey = null
    let currentArray = null
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('- ')) {
        // Array item
        if (currentArray) {
          currentArray.push(trimmed.substring(2))
        }
      } else if (trimmed.includes(':')) {
        // Key-value pair
        const colonIndex = trimmed.indexOf(':')
        const key = trimmed.substring(0, colonIndex).trim()
        const value = trimmed.substring(colonIndex + 1).trim()
        
        currentKey = key
        currentArray = null
        
        if (value === '[]') {
          result[key] = []
        } else if (value === '') {
          // Multi-line value or array starts next
          currentArray = []
          result[key] = currentArray
        } else {
          try {
            result[key] = JSON.parse(value)
          } catch {
            result[key] = value
          }
        }
      }
    }
    
    return result
  }

  /**
   * Get storage configuration
   * @returns {Object} Configuration object
   */
  getConfig() {
    return {
      owner: this.owner,
      repo: this.repo,
      branch: this.branch,
      documentsPath: this.documentsPath,
      configured: this.isConfigured()
    }
  }

  /**
   * Update storage configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.owner !== undefined) this.owner = config.owner
    if (config.repo !== undefined) this.repo = config.repo
    if (config.branch !== undefined) this.branch = config.branch
    if (config.documentsPath !== undefined) this.documentsPath = config.documentsPath
  }
}