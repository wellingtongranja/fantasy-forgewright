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
    
    // Load saved configuration from localStorage if available
    this.loadSavedConfig()
  }
  
  /**
   * Load saved configuration from localStorage
   */
  loadSavedConfig() {
    try {
      const savedConfig = localStorage.getItem('fantasy-editor-github-config')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        if (config.configured) {
          this.owner = config.owner
          this.repo = config.repo
          this.branch = config.branch || 'main'
          this.documentsPath = config.documentsPath || 'documents'
        }
      }
    } catch (error) {
      console.error('Failed to load saved GitHub configuration:', error)
    }
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
      throw new Error('Git repository storage not configured or not authenticated')
    }

    if (!document.id || !document.title) {
      throw new Error('Document must have id and title')
    }

    try {
      const filename = this.generateFilename(document)
      const filepath = `${this.documentsPath}/${filename}`
      const content = this.formatDocumentContent(document)

      // Check if file already exists (only for previously synced documents)
      let existingFile = null
      const hasBeenSynced = document.remoteSha || document.lastSyncedAt || document.githubSha

      if (hasBeenSynced) {
        // Only check remote file for documents that have been synced before
        try {
          existingFile = await this.getFileInfo(filepath)
        } catch (error) {
          // If we can't check file existence for a previously synced document, throw error
          throw new Error(`Failed to verify file existence: ${error.message}`)
        }
      }
      // For new documents (never synced), existingFile remains null = create new file

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

      const result = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      )

      // makeAuthenticatedRequest returns JSON data on success or throws on error

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
      throw new Error('Git repository storage not configured or not authenticated')
    }

    try {
      const fileData = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json'
          }
        }
      )

      // makeAuthenticatedRequest returns JSON data on success or throws on error
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
      throw new Error('Git repository storage not configured or not authenticated')
    }

    try {
      let files
      try {
        files = await this.auth.makeAuthenticatedRequest(
          `/repos/${this.owner}/${this.repo}/contents/${this.documentsPath}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json'
            }
          }
        )
      } catch (error) {
        // Check if this is a 404 error (documents folder doesn't exist)
        if (error.message && error.message.includes('404')) {
          return [] // Documents folder doesn't exist yet
        }
        throw error
      }

      // makeAuthenticatedRequest returns JSON data on success

      if (!Array.isArray(files)) {
        return []
      }

      // Filter for markdown files and extract metadata
      // Exclude README.md and other non-document markdown files
      const documents = []
      for (const file of files) {
        if (file.type === 'file' && file.name.endsWith('.md') && !file.name.toLowerCase().startsWith('readme')) {
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
      throw new Error('Git repository storage not configured or not authenticated')
    }

    try {
      await this.auth.makeAuthenticatedRequest(
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

      // makeAuthenticatedRequest throws on error, success if we reach here
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
      // makeAuthenticatedRequest returns JSON data on success or throws on error
      const fileData = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3.object'
          }
        }
      )

      return fileData // File exists, return the data
    } catch (error) {
      // Check if this is a 404 error (file not found)
      if (error.message && (error.message.includes('404') || error.message.includes('Not Found'))) {
        return null // File doesn't exist - this is expected
      }
      // Re-throw other errors (network, rate limit, auth, etc.)
      throw error
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

    // Check if repository is configured
    if (!this.owner || !this.repo) {
      return false
    }

    try {
      await this.auth.makeAuthenticatedRequest(`/repos/${this.owner}/${this.repo}`)
      return true // If we reach here, repository is accessible
    } catch (error) {
      return false
    }
  }


  /**
   * Generate filename for document
   * @param {Object} document - Document object
   * @returns {string} Filename
   */
  generateFilename(document) {
    // Use ONLY the GUID as filename - title changes don't affect file identity
    return `${document.id}.md`
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
   * Generate checksum for content integrity
   * @param {string} content - Content to checksum
   * @returns {string} Simple hash checksum
   */
  generateChecksum(content) {
    if (!content || typeof content !== 'string') {
      return '00000000'
    }

    // Simple hash for content integrity
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16).padStart(8, '0')
  }

  /**
   * Delete file from GitHub repository
   * @param {string} filepath - Path to file to delete
   * @param {string} sha - SHA of file to delete
   * @param {string} message - Commit message
   * @returns {Promise<void>}
   */
  async deleteFile(filepath, sha, message) {
    if (!this.isConfigured()) {
      throw new Error('Git repository storage not configured or not authenticated')
    }

    await this.auth.makeAuthenticatedRequest(
      `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message || `Delete ${filepath}`,
          sha: sha,
          branch: this.branch
        })
      }
    )

    // makeAuthenticatedRequest throws on error, success if we reach here
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
      created: document.metadata?.created || document.createdAt || new Date().toISOString(),
      updated: document.metadata?.modified || document.updatedAt || new Date().toISOString(),
      tags: document.tags || [],
      checksum: document.checksum || this.generateChecksum(document.content || '')
    }

    const yaml = Object.entries(frontMatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length === 0) return `${key}: []`
          return `${key}:\n${value.map((item) => `  - ${item}`).join('\n')}`
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
    
    // Persist configuration to localStorage
    const configToSave = {
      owner: this.owner,
      repo: this.repo,
      branch: this.branch,
      documentsPath: this.documentsPath,
      configured: true
    }
    localStorage.setItem('fantasy-editor-github-config', JSON.stringify(configToSave))
  }

  /**
   * Create default Fantasy Editor repository
   * @param {string} username - GitHub username
   * @returns {Promise<boolean>} Success status
   */
  async createDefaultRepository(username) {
    try {
      // First check if repository already exists
      try {
        const repoData = await this.auth.makeAuthenticatedRequest(
          `/repos/${username}/fantasy-editor`
        )
        if (repoData && repoData.name === 'fantasy-editor') {
          // Repository already exists, configure silently
          this.updateConfig({
            owner: username,
            repo: 'fantasy-editor',
            branch: repoData.default_branch || 'main'
          })

          // Try to ensure documents directory exists
          try {
            await this.ensureDocumentsDirectory()
          } catch (error) {
            // Silently handle - directory will be created when first document is saved
          }

          return true
        }
      } catch (error) {
        // Repository doesn't exist, continue with creation (normal flow)
        console.log('Repository does not exist, creating new one...')
      }

      const repoData = {
        name: 'fantasy-editor',
        description:
          'Documents created with Fantasy Editor - A distraction-free markdown editor for creative writers',
        private: true,
        auto_init: false, // We'll initialize it ourselves
        gitignore_template: null,
        license_template: null
      }

      let repo
      try {
        repo = await this.auth.makeAuthenticatedRequest('/user/repos', {
          method: 'POST',
          body: repoData,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } catch (apiError) {
        // Handle 422 "repository already exists" error
        if (apiError.message && apiError.message.includes('already exists')) {
          // Repository already exists, configure silently
          this.updateConfig({
            owner: username,
            repo: 'fantasy-editor',
            branch: 'main'
          })

          // Try to ensure documents directory exists
          try {
            await this.ensureDocumentsDirectory()
          } catch (error) {
            // Silently handle - directory will be created when first document is saved
          }

          return true
        }
        // Re-throw other API errors
        throw apiError
      }

      if (repo && repo.name === 'fantasy-editor') {
        // Repository created successfully

        // Configure Fantasy Editor to use this repository
        this.updateConfig({
          owner: username,
          repo: 'fantasy-editor',
          branch: repo.default_branch || 'main'
        })

        // Wait a moment for GitHub to set up the repository
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Initialize the repository with root README and documents directory
        await this.createRepositoryReadme()
        await this.ensureDocumentsDirectory()

        return true
      } else if (repo && repo.errors) {
        // Check if repository already exists
        if (
          repo.errors &&
          repo.errors.some((err) => err.message && err.message.includes('already exists'))
        ) {
          // Repository already exists, configure silently
          this.updateConfig({
            owner: username,
            repo: 'fantasy-editor',
            branch: 'main'
          })

          // Still try to ensure documents directory exists
          try {
            await this.ensureDocumentsDirectory()
          } catch (error) {
            // Silently handle - directory will be created when first document is saved
          }

          return true
        } else {
          throw new Error(`Repository creation failed: ${JSON.stringify(errorData)}`)
        }
      } else {
        const errorText = await response.text()
        throw new Error(`Failed to create repository: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Failed to create default repository:', error)
      return false
    }
  }

  /**
   * Create main repository README.md file
   * @returns {Promise<void>}
   */
  async createRepositoryReadme() {
    if (!this.isConfigured()) {
      throw new Error('Git repository storage not configured')
    }

    const readmeContent = `# Fantasy Editor

A distraction-free markdown editor for creative writers, powered by GitHub storage.

## About This Repository

This repository contains documents created with Fantasy Editor. Your creative works are stored securely and can be accessed from anywhere.

## Features

- **Offline-first**: Documents are stored locally and synced to GitHub
- **Keyboard-focused**: Complete control via command palette (Ctrl+Space)
- **Writer-friendly**: Optimized for long-form writing and creativity
- **GitHub Integration**: Automatic backup and synchronization
- **Markdown Support**: Full-featured markdown editor with live preview

## Repository Structure

- \`documents/\` - Your creative works and stories
- \`README.md\` - This file

## Getting Started

1. Open [Fantasy Editor](https://forgewright.io)
2. Sign in with GitHub
3. Start writing your stories
4. Use commands like \`:ghp\` to push documents or \`:ghs\` to sync

## Commands

- \`:ghs\` - Sync all documents
- \`:ghp\` - Push current document
- \`:ghls\` - List all documents
- \`:gst\` - Show GitHub status

## About Fantasy Editor

Fantasy Editor is designed specifically for creative writers who want a distraction-free environment for their storytelling. With GitHub integration, your work is automatically backed up and accessible from any device.

Created: ${new Date().toISOString()}
`

    try {
      await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/README.md`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Initialize Fantasy Editor repository',
            content: btoa(unescape(encodeURIComponent(readmeContent))),
            branch: this.branch
          })
        }
      )

      // makeAuthenticatedRequest throws on error, success if we reach here
    } catch (error) {
      console.error('Failed to create repository README:', error)
      throw error
    }
  }

  /**
   * Ensure documents directory exists in repository
   * @returns {Promise<void>}
   */
  async ensureDocumentsDirectory() {
    if (!this.isConfigured()) {
      throw new Error('Git repository storage not configured')
    }

    try {
      // Check if documents directory exists
      await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${this.documentsPath}`,
        { method: 'GET' }
      )
      // If we reach here, directory exists
      return
    } catch (error) {
      // Directory doesn't exist (404 error), we'll create it
      if (!error.message || !error.message.includes('404')) {
        // Not a 404 error, re-throw
        throw error
      }
    }

    // Create documents directory with a README
    const readmeContent = `# Fantasy Editor Documents

This directory contains documents created with Fantasy Editor.

## About Fantasy Editor

Fantasy Editor is a distraction-free markdown editor designed for creative writers.

- **Offline-first**: Your documents are stored locally and synced to GitHub
- **Keyboard-focused**: Complete control via command palette (Ctrl+Space)
- **Writer-friendly**: Optimized for long-form writing and creativity

## Document Format

Documents are stored as markdown files with YAML front matter containing metadata.

## Getting Started

1. Start writing in Fantasy Editor
2. Use \`:ghp\` to push your documents to this repository
3. Use \`:ghs\` to sync all documents
4. Use \`:ghls\` to list documents in this repository

Created: ${new Date().toISOString()}
`

    try {
      // Create README.md in documents directory using GitHub API
      const filepath = `${this.documentsPath}/README.md`
      const response = await this.auth.makeAuthenticatedRequest(
        `/repos/${this.owner}/${this.repo}/contents/${filepath}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Initialize Fantasy Editor documents directory',
            content: btoa(unescape(encodeURIComponent(readmeContent))), // Base64 encode UTF-8
            branch: this.branch
          })
        }
      )

      // makeAuthenticatedRequest throws on error, success if we reach here
      // Documents directory created successfully
    } catch (error) {
      console.error('Failed to create documents directory:', error)
      throw error
    }
  }
}
