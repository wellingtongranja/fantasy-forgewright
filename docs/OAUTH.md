# OAuth Integration Documentation

## Overview

Fantasy Editor uses a multi-provider OAuth system that supports GitHub, GitLab, Bitbucket, and generic Git providers. The authentication is handled through a secure Cloudflare Worker proxy that manages token exchange and API operations.

## Architecture

### Components

1. **AuthManager** (`src/core/auth/auth-manager.js`)
   - Provider-agnostic authentication manager
   - Handles OAuth flow, token management, and user sessions
   - Supports multiple Git providers with unified interface

2. **OAuth Worker** (`workers/oauth-proxy.js`)
   - Cloudflare Worker acting as OAuth proxy
   - Handles token exchange securely (keeps client secrets on server)
   - Provides API proxy for repository operations
   - Deployed at: `https://fantasy-oauth-proxy.wellington-granja.workers.dev`

3. **Provider Implementations** (`workers/providers/`)
   - BaseProvider: Abstract class for common OAuth operations
   - GitHubProvider: GitHub-specific implementation
   - GitLabProvider: GitLab-specific implementation
   - BitbucketProvider: Bitbucket-specific implementation
   - GenericGitProvider: For self-hosted Git instances

## Configuration

### Environment Variables

#### Frontend (.env)
```bash
# OAuth Worker URL
VITE_OAUTH_WORKER_URL=https://fantasy-oauth-proxy.wellington-granja.workers.dev

# GitHub OAuth App (Public Client ID)
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

#### Worker (Cloudflare Dashboard)

**Regular Variables:**
- `GITHUB_CLIENT_ID`: GitHub OAuth app client ID
- `OAUTH_REDIRECT_URI`: https://fantasy.forgewright.io/
- `CORS_ORIGIN`: https://fantasy.forgewright.io

**Encrypted Secrets:**
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret

## OAuth Flow

### 1. Authentication Initiation
```javascript
// User clicks "Sign in with GitHub"
authManager.login('github')
```

### 2. OAuth Authorization
- User redirected to GitHub authorization page
- PKCE (Proof Key for Code Exchange) used for security
- State parameter prevents CSRF attacks

### 3. Token Exchange
- Authorization code sent to OAuth Worker
- Worker exchanges code for access token
- Token returned to client securely

### 4. User Session
- Access token stored in session storage
- User information fetched and cached
- Repository automatically configured

## Security Features

### Origin Validation
- Strict origin checking (only allows fantasy.forgewright.io)
- Requests from unauthorized origins blocked with 403

### PKCE Implementation
- Code verifier generated client-side
- SHA-256 code challenge sent with authorization
- Prevents authorization code interception

### Token Management
- Tokens stored in sessionStorage (not localStorage)
- 24-hour token expiration
- Automatic cleanup on logout

### Worker Security
```javascript
// Origin validation in Worker
const allowedOrigins = [
  'https://fantasy.forgewright.io',
  'https://forgewright.io'
]

if (!origin || !allowedOrigins.includes(origin)) {
  return new Response('Forbidden', { status: 403 })
}
```

## API Operations

### Authenticated Requests
```javascript
// Make authenticated API request through Worker
const repos = await authManager.makeAuthenticatedRequest('fetchRepositories')

// Direct GitHub API proxy
const file = await authManager.makeAuthenticatedRequest('/repos/owner/repo/contents/file.md')
```

### Supported Operations
- `fetchRepositories`: Get user repositories
- `createRepository`: Create new repository
- `getFileContent`: Read file from repository
- `updateFile`: Update/create file in repository
- `getBranches`: List repository branches

## GitHub Integration

### Repository Auto-Configuration
When user authenticates, the system automatically:
1. Checks for existing `fantasy-editor-docs` repository
2. Creates repository if it doesn't exist
3. Configures repository with default settings
4. Sets up as document storage backend

### GitHub Storage Integration
- Seamlessly works with existing GitHubStorage class
- All API calls proxied through Worker
- Maintains backward compatibility

## Deployment

### Development Setup

1. **Create GitHub OAuth App (Development)**
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/`

2. **Configure Environment**
   ```bash
   # .dev.vars (workers directory)
   GITHUB_CLIENT_ID=dev_client_id
   GITHUB_CLIENT_SECRET=dev_client_secret
   ```

3. **Run Workers Locally**
   ```bash
   cd workers
   npx wrangler dev --env dev
   ```

### Production Deployment

1. **Create GitHub OAuth App (Production)**
   - Homepage URL: `https://fantasy.forgewright.io`
   - Authorization callback URL: `https://fantasy.forgewright.io/`

2. **Deploy Worker**
   ```bash
   cd workers
   npx wrangler deploy --env production
   ```

3. **Configure Cloudflare Worker**
   - Add `GITHUB_CLIENT_ID` as environment variable
   - Add `GITHUB_CLIENT_SECRET` as encrypted secret

## Troubleshooting

### Common Issues

#### CORS Errors
- Ensure `CORS_ORIGIN` matches your domain
- Check Worker allows your specific origin
- Verify GitHub OAuth callback URL matches

#### Authentication Failures
- Verify client ID and secret are correct
- Check OAuth app callback URL configuration
- Ensure Worker has all required environment variables

#### Token Issues
- Clear sessionStorage and re-authenticate
- Check token hasn't expired (24-hour limit)
- Verify Worker is accessible

### Debug Commands
```javascript
// Check authentication status
authManager.getStatus()

// Get current user
authManager.getCurrentUser()

// Get access token (for debugging)
authManager.getAccessToken()
```

## Future Enhancements

### Planned Features
- [ ] GitLab provider implementation
- [ ] Bitbucket provider implementation
- [ ] Generic Git provider for self-hosted instances
- [ ] Refresh token support
- [ ] OAuth scope customization
- [ ] Multiple account support

### Provider Extension
To add a new provider:
1. Create provider class extending BaseProvider
2. Implement required methods (token exchange, user fetch)
3. Add provider configuration to AuthManager
4. Update Worker to handle new provider

## API Reference

### AuthManager Methods

#### `init()`
Initialize the authentication manager.

#### `login(provider, customConfig)`
Start OAuth flow for specified provider.

#### `handleCallback(callbackUrl)`
Process OAuth callback and complete authentication.

#### `logout()`
Clear authentication and cleanup session.

#### `isAuthenticated()`
Check if user is currently authenticated.

#### `getCurrentUser()`
Get current user information.

#### `makeAuthenticatedRequest(operation, params)`
Make authenticated API request through Worker proxy.

### Worker Endpoints

#### `POST /oauth/token`
Exchange authorization code for access token.

#### `POST /oauth/user`
Fetch authenticated user information.

#### `POST /oauth/repos`
Execute repository operations.

#### `GET /health`
Health check endpoint.

---

For implementation details, see:
- `/src/core/auth/auth-manager.js`
- `/workers/oauth-proxy.js`
- `/workers/providers/*.js`