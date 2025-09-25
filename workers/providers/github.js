/**
 * GitHubProvider - GitHub OAuth implementation for Fantasy Editor
 * Handles GitHub OAuth Web Application Flow with PKCE support
 */
import { BaseProvider } from './base-provider.js'

export class GitHubProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      scopes: config.scopes || ['repo', 'user']
    })
  }

  /**
   * Provider name
   * @returns {string}
   */
  get name() {
    return 'github'
  }

  /**
   * GitHub OAuth authorization URL
   * @returns {string}
   */
  get authorizationUrl() {
    return 'https://github.com/login/oauth/authorize'
  }

  /**
   * GitHub OAuth token exchange URL
   * @returns {string}
   */
  get tokenUrl() {
    return 'https://github.com/login/oauth/access_token'
  }

  /**
   * GitHub user API URL
   * @returns {string}
   */
  get userApiUrl() {
    return 'https://api.github.com/user'
  }

  /**
   * Build GitHub-specific token parameters
   * GitHub uses grant_type for OAuth Apps vs GitHub Apps
   * @param {string} code - Authorization code
   * @param {string} [codeVerifier] - PKCE code verifier
   * @returns {Object} Token parameters
   */
  buildTokenParams(code, codeVerifier = null) {
    // Secure token parameter validation

    // Validate required credentials
    if (!this.clientId) {
      throw new Error('GitHub client_id is missing or undefined')
    }
    if (!this.clientSecret) {
      throw new Error('GitHub client_secret is missing or undefined')
    }
    if (!this.redirectUri) {
      throw new Error('GitHub redirect_uri is missing or undefined')
    }
    if (!code) {
      throw new Error('Authorization code is missing or undefined')
    }

    const params = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      redirect_uri: this.redirectUri
    }

    // GitHub OAuth Apps DO require redirect_uri in token exchange if used in authorization
    // This was the root cause of the "incorrect client_id/client_secret" error

    // Add PKCE code verifier if provided
    if (codeVerifier) {
      params.code_verifier = codeVerifier
    }

    // Token parameters prepared for GitHub OAuth exchange

    return params
  }

  /**
   * Process GitHub user data into standardized format
   * @param {Object} userData - Raw GitHub user data
   * @returns {Object} Standardized user data
   */
  processUserData(userData) {
    return {
      id: userData.id,
      username: userData.login,
      name: userData.name || userData.login,
      email: userData.email,
      avatar: userData.avatar_url,
      profile: userData.html_url,
      provider: 'github',
      raw: userData // Keep full response for advanced features
    }
  }

  /**
   * Get GitHub repositories for the authenticated user
   * @param {string} accessToken - OAuth access token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of repositories
   */
  async fetchRepositories(accessToken, options = {}) {
    const {
      per_page = 100,
      sort = 'updated',
      direction = 'desc',
      type = 'owner'
    } = options

    const params = new URLSearchParams({
      per_page: per_page.toString(),
      sort,
      direction,
      type
    })

    try {
      const response = await fetch(`https://api.github.com/user/repos?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Fantasy-Editor/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`)
      }

      const repos = await response.json()
      return repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at
      }))
    } catch (error) {
      throw new Error(`Failed to fetch GitHub repositories: ${error.message}`)
    }
  }

  /**
   * Create a new repository
   * @param {string} accessToken - OAuth access token
   * @param {Object} repoConfig - Repository configuration
   * @returns {Promise<Object>} Created repository data
   */
  async createRepository(accessToken, repoConfig) {
    const {
      name,
      description = '',
      private: isPrivate = false,
      auto_init = true
    } = repoConfig

    if (!name) {
      throw new Error('Repository name is required')
    }

    try {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        },
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to create repository: ${error.message || response.status}`)
      }

      const repo = await response.json()
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch
      }
    } catch (error) {
      throw new Error(`Failed to create GitHub repository: ${error.message}`)
    }
  }

  /**
   * Get file content from repository
   * @param {string} accessToken - OAuth access token
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} [branch] - Branch name (defaults to default branch)
   * @returns {Promise<Object>} File content and metadata
   */
  async getFileContent(accessToken, owner, repo, path, branch = null) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const params = branch ? `?ref=${branch}` : ''

    try {
      const response = await fetch(`${url}${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
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
        ? atob(fileData.content.replace(/\s/g, ''))
        : fileData.content

      return {
        content,
        sha: fileData.sha,
        path: fileData.path,
        size: fileData.size,
        url: fileData.download_url
      }
    } catch (error) {
      throw new Error(`Failed to get GitHub file content: ${error.message}`)
    }
  }

  /**
   * Update or create file in repository
   * @param {string} accessToken - OAuth access token
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {Object} fileData - File data and metadata
   * @returns {Promise<Object>} Update result
   */
  async updateFile(accessToken, owner, repo, path, fileData) {
    const {
      content,
      message,
      sha = null, // Required for updates, null for creates
      branch = null
    } = fileData

    if (!content || !message) {
      throw new Error('Content and commit message are required')
    }

    const requestBody = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
      ...(sha && { sha }), // Include SHA for updates
      ...(branch && { branch }) // Include branch if specified
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
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
        sha: result.content.sha,
        path: result.content.path,
        message: result.commit.message,
        url: result.content.html_url
      }
    } catch (error) {
      throw new Error(`Failed to update GitHub file: ${error.message}`)
    }
  }
}