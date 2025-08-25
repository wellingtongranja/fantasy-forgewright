/**
 * GenericGitProvider - Generic OAuth implementation for self-hosted Git providers
 * Supports Gitea, Forgejo, and other Git providers with configurable endpoints
 */
import { BaseProvider } from './base-provider.js'

export class GenericGitProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      scopes: config.scopes || ['repo', 'user:email']
    })
    
    // Required: base URL of the Git provider
    this.baseUrl = config.baseUrl
    if (!this.baseUrl) {
      throw new Error('Base URL is required for generic Git provider')
    }
    
    // Optional: custom API paths (defaults work for Gitea/Forgejo)
    this.apiPath = config.apiPath || '/api/v1'
    this.oauthPath = config.oauthPath || '/login/oauth'
    
    // Provider identification
    this.providerName = config.providerName || 'git'
    this.providerDisplayName = config.providerDisplayName || 'Git Provider'
  }

  /**
   * Provider name
   * @returns {string}
   */
  get name() {
    return this.providerName
  }

  /**
   * OAuth authorization URL
   * @returns {string}
   */
  get authorizationUrl() {
    return `${this.baseUrl}${this.oauthPath}/authorize`
  }

  /**
   * OAuth token exchange URL
   * @returns {string}
   */
  get tokenUrl() {
    return `${this.baseUrl}${this.oauthPath}/access_token`
  }

  /**
   * User API URL
   * @returns {string}
   */
  get userApiUrl() {
    return `${this.baseUrl}${this.apiPath}/user`
  }

  /**
   * Process user data into standardized format
   * Most Git providers follow GitHub-like API structure
   * @param {Object} userData - Raw user data
   * @returns {Object} Standardized user data
   */
  processUserData(userData) {
    return {
      id: userData.id,
      username: userData.login || userData.username,
      name: userData.full_name || userData.name || userData.login || userData.username,
      email: userData.email,
      avatar: userData.avatar_url,
      profile: `${this.baseUrl}/${userData.login || userData.username}`,
      provider: this.providerName,
      raw: userData
    }
  }

  /**
   * Get repositories for the authenticated user
   * @param {string} accessToken - OAuth access token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of repositories
   */
  async fetchRepositories(accessToken, options = {}) {
    const {
      limit = 100,
      sort = 'updated',
      order = 'desc'
    } = options

    const params = new URLSearchParams({
      limit: limit.toString(),
      sort,
      order
    })

    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/user/repos?${params}`, {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/json',
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
      throw new Error(`Failed to fetch ${this.providerDisplayName} repositories: ${error.message}`)
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
      auto_init = true,
      gitignores = '',
      license = '',
      readme = 'Default'
    } = repoConfig

    if (!name) {
      throw new Error('Repository name is required')
    }

    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/user/repos`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        },
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init,
          gitignores,
          license,
          readme
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
      throw new Error(`Failed to create ${this.providerDisplayName} repository: ${error.message}`)
    }
  }

  /**
   * Get file content from repository
   * @param {string} accessToken - OAuth access token
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} [ref] - Branch/tag/commit reference
   * @returns {Promise<Object>} File content and metadata
   */
  async getFileContent(accessToken, owner, repo, path, ref = null) {
    const encodedPath = encodeURIComponent(path)
    const refParam = ref ? `?ref=${ref}` : ''

    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/repos/${owner}/${repo}/contents/${encodedPath}${refParam}`, {
        headers: {
          'Authorization': `token ${accessToken}`,
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
      throw new Error(`Failed to get ${this.providerDisplayName} file content: ${error.message}`)
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

    const encodedPath = encodeURIComponent(path)
    
    const requestBody = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
      ...(sha && { sha }), // Include SHA for updates
      ...(branch && { branch }) // Include branch if specified
    }

    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/json',
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
      throw new Error(`Failed to update ${this.providerDisplayName} file: ${error.message}`)
    }
  }

  /**
   * Get branches for a repository
   * @param {string} accessToken - OAuth access token
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} List of branches
   */
  async getBranches(accessToken, owner, repo) {
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/repos/${owner}/${repo}/branches`, {
        headers: {
          'Authorization': `token ${accessToken}`,
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
        protected: branch.protected || false,
        commit: branch.commit
      }))
    } catch (error) {
      throw new Error(`Failed to fetch ${this.providerDisplayName} branches: ${error.message}`)
    }
  }

  /**
   * Validate generic Git provider configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    super.validateConfig()
    
    if (!this.baseUrl) {
      throw new Error('Base URL is required for generic Git provider')
    }
    
    // Validate URL format
    try {
      new URL(this.baseUrl)
    } catch {
      throw new Error('Base URL must be a valid URL')
    }
  }

  /**
   * Factory method to create common Git provider instances
   * @param {string} providerType - Type of provider (gitea, forgejo, etc.)
   * @param {Object} config - Provider configuration
   * @returns {GenericGitProvider} Configured provider instance
   */
  static createProvider(providerType, config) {
    const providerConfigs = {
      gitea: {
        providerName: 'gitea',
        providerDisplayName: 'Gitea',
        apiPath: '/api/v1',
        oauthPath: '/login/oauth'
      },
      forgejo: {
        providerName: 'forgejo', 
        providerDisplayName: 'Forgejo',
        apiPath: '/api/v1',
        oauthPath: '/login/oauth'
      },
      codeberg: {
        providerName: 'codeberg',
        providerDisplayName: 'Codeberg',
        baseUrl: 'https://codeberg.org',
        apiPath: '/api/v1',
        oauthPath: '/login/oauth'
      }
    }

    const providerConfig = providerConfigs[providerType]
    if (!providerConfig) {
      throw new Error(`Unknown provider type: ${providerType}`)
    }

    return new GenericGitProvider({
      ...providerConfig,
      ...config
    })
  }
}