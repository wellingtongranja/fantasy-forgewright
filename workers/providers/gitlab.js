/**
 * GitLabProvider - GitLab OAuth implementation for Fantasy Editor
 * Supports both GitLab.com and self-hosted GitLab instances
 */
import { BaseProvider } from './base-provider.js'

export class GitLabProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      scopes: config.scopes || ['api', 'read_user', 'read_repository', 'write_repository']
    })
    
    // Support custom GitLab instances
    this.baseUrl = config.baseUrl || 'https://gitlab.com'
  }

  /**
   * Provider name
   * @returns {string}
   */
  get name() {
    return 'gitlab'
  }

  /**
   * GitLab OAuth authorization URL
   * @returns {string}
   */
  get authorizationUrl() {
    return `${this.baseUrl}/oauth/authorize`
  }

  /**
   * GitLab OAuth token exchange URL
   * @returns {string}
   */
  get tokenUrl() {
    return `${this.baseUrl}/oauth/token`
  }

  /**
   * GitLab user API URL
   * @returns {string}
   */
  get userApiUrl() {
    return `${this.baseUrl}/api/v4/user`
  }

  /**
   * Build GitLab-specific token parameters
   * GitLab requires grant_type and redirect_uri
   * @param {string} code - Authorization code
   * @param {string} [codeVerifier] - PKCE code verifier
   * @returns {Object} Token parameters
   */
  buildTokenParams(code, codeVerifier = null) {
    const params = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri
    }

    // Add PKCE code verifier if provided
    if (codeVerifier) {
      params.code_verifier = codeVerifier
    }

    return params
  }

  /**
   * Process GitLab user data into standardized format
   * @param {Object} userData - Raw GitLab user data
   * @returns {Object} Standardized user data
   */
  processUserData(userData) {
    return {
      id: userData.id,
      username: userData.username,
      name: userData.name || userData.username,
      email: userData.email,
      avatar: userData.avatar_url,
      profile: userData.web_url,
      provider: 'gitlab',
      raw: userData
    }
  }

  /**
   * Get GitLab projects for the authenticated user
   * @param {string} accessToken - OAuth access token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of projects
   */
  async fetchRepositories(accessToken, options = {}) {
    const {
      per_page = 100,
      order_by = 'updated_at',
      sort = 'desc',
      membership = true,
      owned = true
    } = options

    const params = new URLSearchParams({
      per_page: per_page.toString(),
      order_by,
      sort,
      membership: membership.toString(),
      owned: owned.toString()
    })

    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`)
      }

      const projects = await response.json()
      return projects.map(project => ({
        id: project.id,
        name: project.name,
        fullName: project.path_with_namespace,
        description: project.description,
        private: project.visibility === 'private',
        url: project.web_url,
        cloneUrl: project.http_url_to_repo,
        defaultBranch: project.default_branch,
        updatedAt: project.last_activity_at
      }))
    } catch (error) {
      throw new Error(`Failed to fetch GitLab projects: ${error.message}`)
    }
  }

  /**
   * Create a new project
   * @param {string} accessToken - OAuth access token
   * @param {Object} projectConfig - Project configuration
   * @returns {Promise<Object>} Created project data
   */
  async createRepository(accessToken, projectConfig) {
    const {
      name,
      description = '',
      private: isPrivate = false,
      initialize_with_readme = true
    } = projectConfig

    if (!name) {
      throw new Error('Project name is required')
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        },
        body: JSON.stringify({
          name,
          description,
          visibility: isPrivate ? 'private' : 'public',
          initialize_with_readme
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to create project: ${error.message || response.status}`)
      }

      const project = await response.json()
      return {
        id: project.id,
        name: project.name,
        fullName: project.path_with_namespace,
        description: project.description,
        private: project.visibility === 'private',
        url: project.web_url,
        cloneUrl: project.http_url_to_repo,
        defaultBranch: project.default_branch
      }
    } catch (error) {
      throw new Error(`Failed to create GitLab project: ${error.message}`)
    }
  }

  /**
   * Get file content from project
   * @param {string} accessToken - OAuth access token
   * @param {string} projectId - Project ID or path with namespace
   * @param {string} path - File path
   * @param {string} [branch] - Branch name (defaults to default branch)
   * @returns {Promise<Object>} File content and metadata
   */
  async getFileContent(accessToken, projectId, path, branch = 'main') {
    const encodedPath = encodeURIComponent(path)
    const encodedProjectId = encodeURIComponent(projectId)
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects/${encodedProjectId}/repository/files/${encodedPath}?ref=${branch}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('File not found')
        }
        throw new Error(`Failed to get file: ${response.status}`)
      }

      const fileData = await response.json()
      
      // Decode base64 content
      const content = fileData.encoding === 'base64' 
        ? atob(fileData.content)
        : fileData.content

      return {
        content,
        sha: fileData.blob_id,
        path: fileData.file_path,
        size: fileData.size,
        url: null // GitLab doesn't provide direct download URLs in this API
      }
    } catch (error) {
      throw new Error(`Failed to get GitLab file content: ${error.message}`)
    }
  }

  /**
   * Update or create file in project
   * @param {string} accessToken - OAuth access token
   * @param {string} projectId - Project ID or path with namespace
   * @param {string} path - File path
   * @param {Object} fileData - File data and metadata
   * @returns {Promise<Object>} Update result
   */
  async updateFile(accessToken, projectId, path, fileData) {
    const {
      content,
      message,
      branch = 'main',
      action = 'update' // 'create' or 'update'
    } = fileData

    if (!content || !message) {
      throw new Error('Content and commit message are required')
    }

    const encodedPath = encodeURIComponent(path)
    const encodedProjectId = encodeURIComponent(projectId)

    const requestBody = {
      branch,
      commit_message: message,
      content,
      encoding: 'text'
    }

    // For updates, use PUT. For creates, use POST
    const method = action === 'create' ? 'POST' : 'PUT'

    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects/${encodedProjectId}/repository/files/${encodedPath}`, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to update file: ${error.message || response.status}`)
      }

      const result = await response.json()
      return {
        sha: result.file_path, // GitLab doesn't return SHA in the same way
        path: result.file_path,
        message: message,
        url: null // Would need to construct from project URL
      }
    } catch (error) {
      throw new Error(`Failed to update GitLab file: ${error.message}`)
    }
  }

  /**
   * Get branches for a project
   * @param {string} accessToken - OAuth access token
   * @param {string} projectId - Project ID or path with namespace
   * @returns {Promise<Array>} List of branches
   */
  async getBranches(accessToken, projectId) {
    const encodedProjectId = encodeURIComponent(projectId)

    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects/${encodedProjectId}/repository/branches`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.status}`)
      }

      const branches = await response.json()
      return branches.map(branch => ({
        name: branch.name,
        protected: branch.protected,
        default: branch.default,
        lastCommit: branch.commit
      }))
    } catch (error) {
      throw new Error(`Failed to fetch GitLab branches: ${error.message}`)
    }
  }
}