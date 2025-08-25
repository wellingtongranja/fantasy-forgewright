var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-n4Gzqs/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-n4Gzqs/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// providers/base-provider.js
var BaseProvider = class {
  constructor(config = {}) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.scopes = config.scopes || [];
  }
  /**
   * Get provider name (must be implemented by subclasses)
   * @returns {string} Provider name (e.g., 'github', 'gitlab')
   */
  get name() {
    throw new Error("Provider name must be implemented by subclass");
  }
  /**
   * Get OAuth authorization URL (must be implemented by subclasses)
   * @returns {string} Authorization URL
   */
  get authorizationUrl() {
    throw new Error("Authorization URL must be implemented by subclass");
  }
  /**
   * Get OAuth token exchange URL (must be implemented by subclasses)
   * @returns {string} Token URL
   */
  get tokenUrl() {
    throw new Error("Token URL must be implemented by subclass");
  }
  /**
   * Get user info API URL (must be implemented by subclasses)
   * @returns {string} User API URL
   */
  get userApiUrl() {
    throw new Error("User API URL must be implemented by subclass");
  }
  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from OAuth callback
   * @param {string} [codeVerifier] - PKCE code verifier (optional)
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(code, codeVerifier = null) {
    if (!code) {
      throw new Error("Authorization code is required");
    }
    const tokenParams = this.buildTokenParams(code, codeVerifier);
    try {
      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: this.getTokenHeaders(),
        body: this.formatTokenRequest(tokenParams)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(`OAuth error: ${data.error_description || data.error}`);
      }
      return this.processTokenResponse(data);
    } catch (error) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }
  /**
   * Fetch user information using access token
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<Object>} User information
   */
  async fetchUserInfo(accessToken) {
    if (!accessToken) {
      throw new Error("Access token is required");
    }
    try {
      const response = await fetch(this.userApiUrl, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`User info fetch failed: ${response.status} - ${errorText}`);
      }
      const userData = await response.json();
      return this.processUserData(userData);
    } catch (error) {
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }
  /**
   * Build token exchange parameters (can be overridden by providers)
   * @param {string} code - Authorization code
   * @param {string} [codeVerifier] - PKCE code verifier
   * @returns {Object} Token parameters
   */
  buildTokenParams(code, codeVerifier = null) {
    const params = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri
    };
    if (codeVerifier) {
      params.code_verifier = codeVerifier;
    }
    return params;
  }
  /**
   * Get headers for token exchange request (can be overridden)
   * @returns {Object} Request headers
   */
  getTokenHeaders() {
    return {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Fantasy-Editor/1.0"
    };
  }
  /**
   * Format token request body (can be overridden by providers)
   * @param {Object} params - Token parameters
   * @returns {string} Formatted request body
   */
  formatTokenRequest(params) {
    return new URLSearchParams(params).toString();
  }
  /**
   * Process token response (can be overridden by providers)
   * @param {Object} data - Raw token response
   * @returns {Object} Processed token data
   */
  processTokenResponse(data) {
    return {
      access_token: data.access_token,
      token_type: data.token_type || "Bearer",
      scope: data.scope,
      refresh_token: data.refresh_token
    };
  }
  /**
   * Process user data into standardized format (must be implemented)
   * @param {Object} userData - Raw user data from provider
   * @returns {Object} Standardized user data
   */
  processUserData(userData) {
    throw new Error("processUserData must be implemented by subclass");
  }
  /**
   * Validate provider configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    if (!this.clientId) {
      throw new Error(`${this.name} client ID is required`);
    }
    if (!this.clientSecret) {
      throw new Error(`${this.name} client secret is required`);
    }
    if (!this.redirectUri) {
      throw new Error(`${this.name} redirect URI is required`);
    }
  }
};
__name(BaseProvider, "BaseProvider");

// providers/github.js
var GitHubProvider = class extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      scopes: config.scopes || ["repo", "user"]
    });
  }
  /**
   * Provider name
   * @returns {string}
   */
  get name() {
    return "github";
  }
  /**
   * GitHub OAuth authorization URL
   * @returns {string}
   */
  get authorizationUrl() {
    return "https://github.com/login/oauth/authorize";
  }
  /**
   * GitHub OAuth token exchange URL
   * @returns {string}
   */
  get tokenUrl() {
    return "https://github.com/login/oauth/access_token";
  }
  /**
   * GitHub user API URL
   * @returns {string}
   */
  get userApiUrl() {
    return "https://api.github.com/user";
  }
  /**
   * Build GitHub-specific token parameters
   * GitHub uses grant_type for OAuth Apps vs GitHub Apps
   * @param {string} code - Authorization code
   * @param {string} [codeVerifier] - PKCE code verifier
   * @returns {Object} Token parameters
   */
  buildTokenParams(code, codeVerifier = null) {
    const params = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code
    };
    if (codeVerifier) {
      params.code_verifier = codeVerifier;
    }
    return params;
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
      provider: "github",
      raw: userData
      // Keep full response for advanced features
    };
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
      sort = "updated",
      direction = "desc",
      type = "owner"
    } = options;
    const params = new URLSearchParams({
      per_page: per_page.toString(),
      sort,
      direction,
      type
    });
    try {
      const response = await fetch(`https://api.github.com/user/repos?${params}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`);
      }
      const repos = await response.json();
      return repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at
      }));
    } catch (error) {
      throw new Error(`Failed to fetch GitHub repositories: ${error.message}`);
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
      description = "",
      private: isPrivate = false,
      auto_init = true
    } = repoConfig;
    if (!name) {
      throw new Error("Repository name is required");
    }
    try {
      const response = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        },
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create repository: ${error.message || response.status}`);
      }
      const repo = await response.json();
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch
      };
    } catch (error) {
      throw new Error(`Failed to create GitHub repository: ${error.message}`);
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
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const params = branch ? `?ref=${branch}` : "";
    try {
      const response = await fetch(`${url}${params}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("File not found");
        }
        throw new Error(`Failed to get file: ${response.status}`);
      }
      const fileData = await response.json();
      const content = fileData.encoding === "base64" ? atob(fileData.content.replace(/\s/g, "")) : fileData.content;
      return {
        content,
        sha: fileData.sha,
        path: fileData.path,
        size: fileData.size,
        url: fileData.download_url
      };
    } catch (error) {
      throw new Error(`Failed to get GitHub file content: ${error.message}`);
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
      sha = null,
      // Required for updates, null for creates
      branch = null
    } = fileData;
    if (!content || !message) {
      throw new Error("Content and commit message are required");
    }
    const requestBody = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      // Base64 encode with UTF-8 support
      ...sha && { sha },
      // Include SHA for updates
      ...branch && { branch }
      // Include branch if specified
    };
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update file: ${error.message || response.status}`);
      }
      const result = await response.json();
      return {
        sha: result.content.sha,
        path: result.content.path,
        message: result.commit.message,
        url: result.content.html_url
      };
    } catch (error) {
      throw new Error(`Failed to update GitHub file: ${error.message}`);
    }
  }
};
__name(GitHubProvider, "GitHubProvider");

// providers/gitlab.js
var GitLabProvider = class extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      scopes: config.scopes || ["api", "read_user", "read_repository", "write_repository"]
    });
    this.baseUrl = config.baseUrl || "https://gitlab.com";
  }
  /**
   * Provider name
   * @returns {string}
   */
  get name() {
    return "gitlab";
  }
  /**
   * GitLab OAuth authorization URL
   * @returns {string}
   */
  get authorizationUrl() {
    return `${this.baseUrl}/oauth/authorize`;
  }
  /**
   * GitLab OAuth token exchange URL
   * @returns {string}
   */
  get tokenUrl() {
    return `${this.baseUrl}/oauth/token`;
  }
  /**
   * GitLab user API URL
   * @returns {string}
   */
  get userApiUrl() {
    return `${this.baseUrl}/api/v4/user`;
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
      code,
      grant_type: "authorization_code",
      redirect_uri: this.redirectUri
    };
    if (codeVerifier) {
      params.code_verifier = codeVerifier;
    }
    return params;
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
      provider: "gitlab",
      raw: userData
    };
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
      order_by = "updated_at",
      sort = "desc",
      membership = true,
      owned = true
    } = options;
    const params = new URLSearchParams({
      per_page: per_page.toString(),
      order_by,
      sort,
      membership: membership.toString(),
      owned: owned.toString()
    });
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects?${params}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      const projects = await response.json();
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        fullName: project.path_with_namespace,
        description: project.description,
        private: project.visibility === "private",
        url: project.web_url,
        cloneUrl: project.http_url_to_repo,
        defaultBranch: project.default_branch,
        updatedAt: project.last_activity_at
      }));
    } catch (error) {
      throw new Error(`Failed to fetch GitLab projects: ${error.message}`);
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
      description = "",
      private: isPrivate = false,
      initialize_with_readme = true
    } = projectConfig;
    if (!name) {
      throw new Error("Project name is required");
    }
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        },
        body: JSON.stringify({
          name,
          description,
          visibility: isPrivate ? "private" : "public",
          initialize_with_readme
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create project: ${error.message || response.status}`);
      }
      const project = await response.json();
      return {
        id: project.id,
        name: project.name,
        fullName: project.path_with_namespace,
        description: project.description,
        private: project.visibility === "private",
        url: project.web_url,
        cloneUrl: project.http_url_to_repo,
        defaultBranch: project.default_branch
      };
    } catch (error) {
      throw new Error(`Failed to create GitLab project: ${error.message}`);
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
  async getFileContent(accessToken, projectId, path, branch = "main") {
    const encodedPath = encodeURIComponent(path);
    const encodedProjectId = encodeURIComponent(projectId);
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects/${encodedProjectId}/repository/files/${encodedPath}?ref=${branch}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("File not found");
        }
        throw new Error(`Failed to get file: ${response.status}`);
      }
      const fileData = await response.json();
      const content = fileData.encoding === "base64" ? atob(fileData.content) : fileData.content;
      return {
        content,
        sha: fileData.blob_id,
        path: fileData.file_path,
        size: fileData.size,
        url: null
        // GitLab doesn't provide direct download URLs in this API
      };
    } catch (error) {
      throw new Error(`Failed to get GitLab file content: ${error.message}`);
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
      branch = "main",
      action = "update"
      // 'create' or 'update'
    } = fileData;
    if (!content || !message) {
      throw new Error("Content and commit message are required");
    }
    const encodedPath = encodeURIComponent(path);
    const encodedProjectId = encodeURIComponent(projectId);
    const requestBody = {
      branch,
      commit_message: message,
      content,
      encoding: "text"
    };
    const method = action === "create" ? "POST" : "PUT";
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects/${encodedProjectId}/repository/files/${encodedPath}`, {
        method,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update file: ${error.message || response.status}`);
      }
      const result = await response.json();
      return {
        sha: result.file_path,
        // GitLab doesn't return SHA in the same way
        path: result.file_path,
        message,
        url: null
        // Would need to construct from project URL
      };
    } catch (error) {
      throw new Error(`Failed to update GitLab file: ${error.message}`);
    }
  }
  /**
   * Get branches for a project
   * @param {string} accessToken - OAuth access token
   * @param {string} projectId - Project ID or path with namespace
   * @returns {Promise<Array>} List of branches
   */
  async getBranches(accessToken, projectId) {
    const encodedProjectId = encodeURIComponent(projectId);
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/projects/${encodedProjectId}/repository/branches`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.status}`);
      }
      const branches = await response.json();
      return branches.map((branch) => ({
        name: branch.name,
        protected: branch.protected,
        default: branch.default,
        lastCommit: branch.commit
      }));
    } catch (error) {
      throw new Error(`Failed to fetch GitLab branches: ${error.message}`);
    }
  }
};
__name(GitLabProvider, "GitLabProvider");

// providers/bitbucket.js
var BitbucketProvider = class extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      scopes: config.scopes || ["account", "repositories:read", "repositories:write"]
    });
  }
  /**
   * Provider name
   * @returns {string}
   */
  get name() {
    return "bitbucket";
  }
  /**
   * Bitbucket OAuth authorization URL
   * @returns {string}
   */
  get authorizationUrl() {
    return "https://bitbucket.org/site/oauth2/authorize";
  }
  /**
   * Bitbucket OAuth token exchange URL
   * @returns {string}
   */
  get tokenUrl() {
    return "https://bitbucket.org/site/oauth2/access_token";
  }
  /**
   * Bitbucket user API URL
   * @returns {string}
   */
  get userApiUrl() {
    return "https://api.bitbucket.org/2.0/user";
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
      grant_type: "authorization_code",
      code
    };
    if (codeVerifier) {
      params.code_verifier = codeVerifier;
    }
    return params;
  }
  /**
   * Get headers for token exchange request
   * Bitbucket uses Basic auth with client credentials
   * @returns {Object} Request headers
   */
  getTokenHeaders() {
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    return {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
      "User-Agent": "Fantasy-Editor/1.0"
    };
  }
  /**
   * Process Bitbucket token response
   * @param {Object} data - Raw token response
   * @returns {Object} Processed token data
   */
  processTokenResponse(data) {
    return {
      access_token: data.access_token,
      token_type: data.token_type || "Bearer",
      scope: data.scopes,
      // Bitbucket uses 'scopes' instead of 'scope'
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
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
      email: null,
      // Email requires separate API call in Bitbucket
      avatar: userData.links?.avatar?.href,
      profile: userData.links?.html?.href,
      provider: "bitbucket",
      raw: userData
    };
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
      sort = "-updated_on",
      role = "owner"
    } = options;
    const params = new URLSearchParams({
      pagelen: pagelen.toString(),
      sort,
      role
    });
    try {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories?${params}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`);
      }
      const data = await response.json();
      return data.values.map((repo) => ({
        id: repo.uuid,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.is_private,
        url: repo.links.html.href,
        cloneUrl: repo.links.clone.find((link) => link.name === "https")?.href,
        defaultBranch: repo.mainbranch?.name || "main",
        updatedAt: repo.updated_on
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Bitbucket repositories: ${error.message}`);
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
      description = "",
      private: isPrivate = false,
      has_wiki = false,
      has_issues = true
    } = repoConfig;
    if (!name) {
      throw new Error("Repository name is required");
    }
    const userResponse = await fetch(this.userApiUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });
    if (!userResponse.ok) {
      throw new Error("Failed to get current user");
    }
    const user = await userResponse.json();
    const workspace = user.username;
    try {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${name}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        },
        body: JSON.stringify({
          name,
          description,
          is_private: isPrivate,
          has_wiki,
          has_issues,
          scm: "git"
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create repository: ${error.error?.message || response.status}`);
      }
      const repo = await response.json();
      return {
        id: repo.uuid,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.is_private,
        url: repo.links.html.href,
        cloneUrl: repo.links.clone.find((link) => link.name === "https")?.href,
        defaultBranch: repo.mainbranch?.name || "main"
      };
    } catch (error) {
      throw new Error(`Failed to create Bitbucket repository: ${error.message}`);
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
  async getFileContent(accessToken, workspace, repoSlug, path, branch = "main") {
    const encodedPath = encodeURIComponent(path);
    try {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/${branch}/${encodedPath}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("File not found");
        }
        throw new Error(`Failed to get file: ${response.status}`);
      }
      const content = await response.text();
      return {
        content,
        sha: null,
        // Bitbucket doesn't provide SHA in this endpoint
        path,
        size: content.length,
        url: `https://bitbucket.org/${workspace}/${repoSlug}/src/${branch}/${path}`
      };
    } catch (error) {
      throw new Error(`Failed to get Bitbucket file content: ${error.message}`);
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
      branch = "main"
    } = fileData;
    if (!content || !message) {
      throw new Error("Content and commit message are required");
    }
    const formData = new FormData();
    formData.append(path, new Blob([content], { type: "text/plain" }));
    formData.append("message", message);
    formData.append("branch", branch);
    try {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "Fantasy-Editor/1.0"
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update file: ${error.error?.message || response.status}`);
      }
      const result = await response.json();
      return {
        sha: result.hash,
        path,
        message,
        url: `https://bitbucket.org/${workspace}/${repoSlug}/src/${result.hash}/${path}`
      };
    } catch (error) {
      throw new Error(`Failed to update Bitbucket file: ${error.message}`);
    }
  }
  /**
   * Get user's email address (requires separate API call in Bitbucket)
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<string|null>} Primary email address
   */
  async getUserEmail(accessToken) {
    try {
      const response = await fetch("https://api.bitbucket.org/2.0/user/emails", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      const primaryEmail = data.values.find((email) => email.is_primary);
      return primaryEmail ? primaryEmail.email : null;
    } catch (error) {
      return null;
    }
  }
};
__name(BitbucketProvider, "BitbucketProvider");

// providers/generic-git.js
var GenericGitProvider = class extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      scopes: config.scopes || ["repo", "user:email"]
    });
    this.baseUrl = config.baseUrl;
    if (!this.baseUrl) {
      throw new Error("Base URL is required for generic Git provider");
    }
    this.apiPath = config.apiPath || "/api/v1";
    this.oauthPath = config.oauthPath || "/login/oauth";
    this.providerName = config.providerName || "git";
    this.providerDisplayName = config.providerDisplayName || "Git Provider";
  }
  /**
   * Provider name
   * @returns {string}
   */
  get name() {
    return this.providerName;
  }
  /**
   * OAuth authorization URL
   * @returns {string}
   */
  get authorizationUrl() {
    return `${this.baseUrl}${this.oauthPath}/authorize`;
  }
  /**
   * OAuth token exchange URL
   * @returns {string}
   */
  get tokenUrl() {
    return `${this.baseUrl}${this.oauthPath}/access_token`;
  }
  /**
   * User API URL
   * @returns {string}
   */
  get userApiUrl() {
    return `${this.baseUrl}${this.apiPath}/user`;
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
    };
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
      sort = "updated",
      order = "desc"
    } = options;
    const params = new URLSearchParams({
      limit: limit.toString(),
      sort,
      order
    });
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/user/repos?${params}`, {
        headers: {
          "Authorization": `token ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`);
      }
      const repos = await response.json();
      return repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at
      }));
    } catch (error) {
      throw new Error(`Failed to fetch ${this.providerDisplayName} repositories: ${error.message}`);
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
      description = "",
      private: isPrivate = false,
      auto_init = true,
      gitignores = "",
      license = "",
      readme = "Default"
    } = repoConfig;
    if (!name) {
      throw new Error("Repository name is required");
    }
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/user/repos`, {
        method: "POST",
        headers: {
          "Authorization": `token ${accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
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
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create repository: ${error.message || response.status}`);
      }
      const repo = await response.json();
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch
      };
    } catch (error) {
      throw new Error(`Failed to create ${this.providerDisplayName} repository: ${error.message}`);
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
    const encodedPath = encodeURIComponent(path);
    const refParam = ref ? `?ref=${ref}` : "";
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/repos/${owner}/${repo}/contents/${encodedPath}${refParam}`, {
        headers: {
          "Authorization": `token ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("File not found");
        }
        throw new Error(`Failed to get file: ${response.status}`);
      }
      const fileData = await response.json();
      const content = fileData.encoding === "base64" ? atob(fileData.content.replace(/\s/g, "")) : fileData.content;
      return {
        content,
        sha: fileData.sha,
        path: fileData.path,
        size: fileData.size,
        url: fileData.download_url
      };
    } catch (error) {
      throw new Error(`Failed to get ${this.providerDisplayName} file content: ${error.message}`);
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
      sha = null,
      // Required for updates, null for creates
      branch = null
    } = fileData;
    if (!content || !message) {
      throw new Error("Content and commit message are required");
    }
    const encodedPath = encodeURIComponent(path);
    const requestBody = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      // Base64 encode with UTF-8 support
      ...sha && { sha },
      // Include SHA for updates
      ...branch && { branch }
      // Include branch if specified
    };
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: "PUT",
        headers: {
          "Authorization": `token ${accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update file: ${error.message || response.status}`);
      }
      const result = await response.json();
      return {
        sha: result.content.sha,
        path: result.content.path,
        message: result.commit.message,
        url: result.content.html_url
      };
    } catch (error) {
      throw new Error(`Failed to update ${this.providerDisplayName} file: ${error.message}`);
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
          "Authorization": `token ${accessToken}`,
          "Accept": "application/json",
          "User-Agent": "Fantasy-Editor/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.status}`);
      }
      const branches = await response.json();
      return branches.map((branch) => ({
        name: branch.name,
        protected: branch.protected || false,
        commit: branch.commit
      }));
    } catch (error) {
      throw new Error(`Failed to fetch ${this.providerDisplayName} branches: ${error.message}`);
    }
  }
  /**
   * Validate generic Git provider configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    super.validateConfig();
    if (!this.baseUrl) {
      throw new Error("Base URL is required for generic Git provider");
    }
    try {
      new URL(this.baseUrl);
    } catch {
      throw new Error("Base URL must be a valid URL");
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
        providerName: "gitea",
        providerDisplayName: "Gitea",
        apiPath: "/api/v1",
        oauthPath: "/login/oauth"
      },
      forgejo: {
        providerName: "forgejo",
        providerDisplayName: "Forgejo",
        apiPath: "/api/v1",
        oauthPath: "/login/oauth"
      },
      codeberg: {
        providerName: "codeberg",
        providerDisplayName: "Codeberg",
        baseUrl: "https://codeberg.org",
        apiPath: "/api/v1",
        oauthPath: "/login/oauth"
      }
    };
    const providerConfig = providerConfigs[providerType];
    if (!providerConfig) {
      throw new Error(`Unknown provider type: ${providerType}`);
    }
    return new GenericGitProvider({
      ...providerConfig,
      ...config
    });
  }
};
__name(GenericGitProvider, "GenericGitProvider");

// oauth-proxy.js
function createProvider(providerType, config) {
  const providers = {
    github: GitHubProvider,
    gitlab: GitLabProvider,
    bitbucket: BitbucketProvider,
    generic: GenericGitProvider
  };
  const ProviderClass = providers[providerType];
  if (!ProviderClass) {
    throw new Error(`Unsupported provider type: ${providerType}`);
  }
  return new ProviderClass(config);
}
__name(createProvider, "createProvider");
function getProviderConfig(providerType, env) {
  const baseConfig = {
    clientId: env[`${providerType.toUpperCase()}_CLIENT_ID`],
    clientSecret: env[`${providerType.toUpperCase()}_CLIENT_SECRET`],
    redirectUri: env.OAUTH_REDIRECT_URI || "https://forgewright.io/"
  };
  const configs = {
    github: baseConfig,
    gitlab: {
      ...baseConfig,
      baseUrl: env.GITLAB_BASE_URL || "https://gitlab.com"
    },
    bitbucket: baseConfig,
    generic: {
      ...baseConfig,
      baseUrl: env.GENERIC_GIT_BASE_URL,
      providerName: env.GENERIC_GIT_PROVIDER_NAME,
      providerDisplayName: env.GENERIC_GIT_DISPLAY_NAME
    }
  };
  const config = configs[providerType];
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Missing ${providerType} OAuth credentials`);
  }
  return config;
}
__name(getProviderConfig, "getProviderConfig");
async function handleTokenExchange(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const { provider, code, codeVerifier, providerConfig } = await request.json();
    if (!provider || !code) {
      return new Response("Missing required parameters", { status: 400 });
    }
    const config = providerConfig ? { ...getProviderConfig(provider, env), ...providerConfig } : getProviderConfig(provider, env);
    const providerInstance = createProvider(provider, config);
    providerInstance.validateConfig();
    const tokenData = await providerInstance.exchangeCodeForToken(code, codeVerifier);
    return new Response(JSON.stringify(tokenData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": env.CORS_ORIGIN || "https://forgewright.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    return new Response(JSON.stringify({
      error: "Token exchange failed",
      details: error.message
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": env.CORS_ORIGIN || "https://forgewright.io"
      }
    });
  }
}
__name(handleTokenExchange, "handleTokenExchange");
async function handleUserInfo(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const { provider, accessToken, providerConfig } = await request.json();
    if (!provider || !accessToken) {
      return new Response("Missing required parameters", { status: 400 });
    }
    const config = providerConfig ? { ...getProviderConfig(provider, env), ...providerConfig } : getProviderConfig(provider, env);
    const providerInstance = createProvider(provider, config);
    const userData = await providerInstance.fetchUserInfo(accessToken);
    return new Response(JSON.stringify(userData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": env.CORS_ORIGIN || "https://forgewright.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("User info fetch error:", error);
    return new Response(JSON.stringify({
      error: "User info fetch failed",
      details: error.message
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": env.CORS_ORIGIN || "https://forgewright.io"
      }
    });
  }
}
__name(handleUserInfo, "handleUserInfo");
async function handleRepositoryOps(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const { provider, operation, accessToken, providerConfig, ...params } = await request.json();
    if (!provider || !operation || !accessToken) {
      return new Response("Missing required parameters", { status: 400 });
    }
    const config = providerConfig ? { ...getProviderConfig(provider, env), ...providerConfig } : getProviderConfig(provider, env);
    const providerInstance = createProvider(provider, config);
    let result;
    switch (operation) {
      case "fetchRepositories":
        result = await providerInstance.fetchRepositories(accessToken, params.options);
        break;
      case "createRepository":
        result = await providerInstance.createRepository(accessToken, params.repoConfig);
        break;
      case "getFileContent":
        result = await providerInstance.getFileContent(
          accessToken,
          params.owner,
          params.repo,
          params.path,
          params.ref
        );
        break;
      case "updateFile":
        result = await providerInstance.updateFile(
          accessToken,
          params.owner,
          params.repo,
          params.path,
          params.fileData
        );
        break;
      case "getBranches":
        result = await providerInstance.getBranches(accessToken, params.owner, params.repo);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": env.CORS_ORIGIN || "https://forgewright.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("Repository operation error:", error);
    return new Response(JSON.stringify({
      error: "Repository operation failed",
      details: error.message
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": env.CORS_ORIGIN || "https://forgewright.io"
      }
    });
  }
}
__name(handleRepositoryOps, "handleRepositoryOps");
function handleCORS(env) {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": env.CORS_ORIGIN || "https://forgewright.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(handleCORS, "handleCORS");
var oauth_proxy_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return handleCORS(env);
    }
    switch (url.pathname) {
      case "/oauth/token":
        return handleTokenExchange(request, env);
      case "/oauth/user":
        return handleUserInfo(request, env);
      case "/oauth/repos":
        return handleRepositoryOps(request, env);
      case "/health":
        return new Response(JSON.stringify({
          status: "healthy",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          providers: ["github", "gitlab", "bitbucket", "generic"]
        }), {
          headers: { "Content-Type": "application/json" }
        });
      default:
        return new Response("Not Found", { status: 404 });
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-n4Gzqs/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = oauth_proxy_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-n4Gzqs/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=oauth-proxy.js.map
