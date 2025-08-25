/**
 * BitbucketProvider - Bitbucket OAuth implementation for Fantasy Editor
 * Supports Bitbucket Cloud (bitbucket.org) OAuth
 */
import { BaseProvider } from './base-provider.js'

export class BitbucketProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      scopes: config.scopes || ['account', 'repositories:read', 'repositories:write']
    })
  }

  /**
   * Provider name
   * @returns {string}
   */
  get name() {
    return 'bitbucket'
  }

  /**
   * Bitbucket OAuth authorization URL
   * @returns {string}
   */
  get authorizationUrl() {
    return 'https://bitbucket.org/site/oauth2/authorize'
  }

  /**
   * Bitbucket OAuth token exchange URL
   * @returns {string}
   */
  get tokenUrl() {
    return 'https://bitbucket.org/site/oauth2/access_token'
  }

  /**
   * Bitbucket user API URL
   * @returns {string}
   */
  get userApiUrl() {
    return 'https://api.bitbucket.org/2.0/user'
  }

  /**
   * Build Bitbucket-specific token parameters
   * Bitbucket requires grant_type
   * @param {string} code - Authorization code
   * @param {string} [codeVerifier] - PKCE code verifier
   * @returns {Object} Token parameters
   */
  buildTokenParams(code, codeVerifier = null) {
    const params = {
      grant_type: 'authorization_code',
      code: code
    }

    // Add PKCE code verifier if provided
    if (codeVerifier) {
      params.code_verifier = codeVerifier
    }

    return params
  }

  /**
   * Get headers for token exchange request
   * Bitbucket uses Basic auth with client credentials
   * @returns {Object} Request headers
   */
  getTokenHeaders() {
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`)
    
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
      'User-Agent': 'Fantasy-Editor/1.0'
    }
  }

  /**
   * Process Bitbucket token response
   * @param {Object} data - Raw token response
   * @returns {Object} Processed token data
   */
  processTokenResponse(data) {
    return {
      access_token: data.access_token,
      token_type: data.token_type || 'Bearer',
      scope: data.scopes, // Bitbucket uses 'scopes' instead of 'scope'
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    }
  }

  /**
   * Process Bitbucket user data into standardized format
   * @param {Object} userData - Raw Bitbucket user data
   * @returns {Object} Standardized user data
   */
  processUserData(userData) {
    return {
      id: userData.account_id,
      username: userData.username,
      name: userData.display_name || userData.username,
      email: null, // Email requires separate API call in Bitbucket
      avatar: userData.links?.avatar?.href,
      profile: userData.links?.html?.href,
      provider: 'bitbucket',
      raw: userData
    }
  }

  /**
   * Get Bitbucket repositories for the authenticated user
   * @param {string} accessToken - OAuth access token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of repositories
   */
  async fetchRepositories(accessToken, options = {}) {
    const {
      pagelen = 100,
      sort = '-updated_on',
      role = 'owner'
    } = options

    const params = new URLSearchParams({
      pagelen: pagelen.toString(),
      sort,
      role
    })

    try {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`)
      }

      const data = await response.json()
      return data.values.map(repo => ({
        id: repo.uuid,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.is_private,
        url: repo.links.html.href,
        cloneUrl: repo.links.clone.find(link => link.name === 'https')?.href,
        defaultBranch: repo.mainbranch?.name || 'main',
        updatedAt: repo.updated_on
      }))
    } catch (error) {
      throw new Error(`Failed to fetch Bitbucket repositories: ${error.message}`)
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
      has_wiki = false,
      has_issues = true
    } = repoConfig

    if (!name) {
      throw new Error('Repository name is required')
    }

    // Get current user to create repository under their workspace
    const userResponse = await fetch(this.userApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get current user')
    }

    const user = await userResponse.json()
    const workspace = user.username

    try {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${name}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        },
        body: JSON.stringify({
          name,
          description,
          is_private: isPrivate,
          has_wiki,
          has_issues,
          scm: 'git'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to create repository: ${error.error?.message || response.status}`)
      }

      const repo = await response.json()
      return {
        id: repo.uuid,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.is_private,
        url: repo.links.html.href,
        cloneUrl: repo.links.clone.find(link => link.name === 'https')?.href,
        defaultBranch: repo.mainbranch?.name || 'main'
      }
    } catch (error) {
      throw new Error(`Failed to create Bitbucket repository: ${error.message}`)
    }
  }

  /**
   * Get file content from repository
   * @param {string} accessToken - OAuth access token
   * @param {string} workspace - Workspace name
   * @param {string} repoSlug - Repository slug
   * @param {string} path - File path
   * @param {string} [branch] - Branch name (defaults to main)
   * @returns {Promise<Object>} File content and metadata
   */
  async getFileContent(accessToken, workspace, repoSlug, path, branch = 'main') {
    const encodedPath = encodeURIComponent(path)

    try {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/${branch}/${encodedPath}`, {
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

      // Bitbucket returns raw content, not JSON
      const content = await response.text()
      
      return {
        content,
        sha: null, // Bitbucket doesn't provide SHA in this endpoint
        path: path,
        size: content.length,
        url: `https://bitbucket.org/${workspace}/${repoSlug}/src/${branch}/${path}`
      }
    } catch (error) {
      throw new Error(`Failed to get Bitbucket file content: ${error.message}`)
    }
  }

  /**
   * Update or create file in repository
   * Note: Bitbucket API requires a more complex approach for file operations
   * This is a simplified implementation
   * @param {string} accessToken - OAuth access token
   * @param {string} workspace - Workspace name
   * @param {string} repoSlug - Repository slug
   * @param {string} path - File path
   * @param {Object} fileData - File data and metadata
   * @returns {Promise<Object>} Update result
   */
  async updateFile(accessToken, workspace, repoSlug, path, fileData) {
    const {
      content,
      message,
      branch = 'main'
    } = fileData

    if (!content || !message) {
      throw new Error('Content and commit message are required')
    }

    // Bitbucket uses form data for file uploads
    const formData = new FormData()
    formData.append(path, new Blob([content], { type: 'text/plain' }))
    formData.append('message', message)
    formData.append('branch', branch)

    try {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Fantasy-Editor/1.0'
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to update file: ${error.error?.message || response.status}`)
      }

      // Bitbucket returns commit information
      const result = await response.json()
      return {
        sha: result.hash,
        path: path,
        message: message,
        url: `https://bitbucket.org/${workspace}/${repoSlug}/src/${result.hash}/${path}`
      }
    } catch (error) {
      throw new Error(`Failed to update Bitbucket file: ${error.message}`)
    }
  }

  /**
   * Get user's email address (requires separate API call in Bitbucket)
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<string|null>} Primary email address
   */
  async getUserEmail(accessToken) {
    try {
      const response = await fetch('https://api.bitbucket.org/2.0/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'Fantasy-Editor/1.0'
        }
      })

      if (!response.ok) {
        return null // Email access might not be granted
      }

      const data = await response.json()
      const primaryEmail = data.values.find(email => email.is_primary)
      return primaryEmail ? primaryEmail.email : null
    } catch (error) {
      return null // Fail silently for email
    }
  }
}