# Fantasy Editor OAuth Proxy

A Cloudflare Worker that provides multi-provider OAuth token exchange for Fantasy Editor, enabling seamless authentication with GitHub, GitLab, Bitbucket, and self-hosted Git providers.

## Architecture

This OAuth proxy enables Fantasy Editor (a client-side application) to perform OAuth authentication flows that require server-side token exchange, while maintaining the app's client-only architecture.

### Supported Providers

- **GitHub** - GitHub.com OAuth Apps
- **GitLab** - GitLab.com and self-hosted GitLab instances  
- **Bitbucket** - Bitbucket Cloud OAuth Consumers
- **Generic Git** - Self-hosted Git providers (Gitea, Forgejo, Codeberg)

## API Endpoints

### POST /oauth/token
Exchange authorization code for access token.

**Request:**
```json
{
  "provider": "github",
  "code": "authorization_code",
  "codeVerifier": "pkce_code_verifier"
}
```

**Response:**
```json
{
  "access_token": "token",
  "token_type": "Bearer",
  "scope": "repo user"
}
```

### POST /oauth/user
Fetch authenticated user information.

**Request:**
```json
{
  "provider": "github",
  "accessToken": "access_token"
}
```

**Response:**
```json
{
  "id": 123456,
  "username": "user",
  "name": "User Name",
  "email": "user@example.com",
  "avatar": "https://avatar.url",
  "provider": "github"
}
```

### POST /oauth/repos
Perform repository operations (fetch, create, file operations).

**Request:**
```json
{
  "provider": "github",
  "operation": "fetchRepositories",
  "accessToken": "access_token",
  "options": { "per_page": 100 }
}
```

### GET /health
Health check endpoint.

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your OAuth app credentials
   ```

3. **Set up Wrangler secrets:**
   ```bash
   # GitHub
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   
   # GitLab
   wrangler secret put GITLAB_CLIENT_ID
   wrangler secret put GITLAB_CLIENT_SECRET
   
   # Bitbucket
   wrangler secret put BITBUCKET_CLIENT_ID
   wrangler secret put BITBUCKET_CLIENT_SECRET
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Deployment

### Development Environment
```bash
npm run deploy:dev
```

### Staging Environment  
```bash
npm run deploy:staging
```

### Production Environment
```bash
npm run deploy
```

## OAuth App Configuration

### GitHub OAuth App
- **Authorization callback URL**: `https://forgewright.io/`
- **Application name**: Fantasy Editor
- **Homepage URL**: `https://forgewright.io`

### GitLab OAuth Application
- **Redirect URI**: `https://forgewright.io/`
- **Scopes**: `api`, `read_user`, `read_repository`, `write_repository`

### Bitbucket OAuth Consumer
- **Callback URL**: `https://forgewright.io/`
- **Permissions**: Account, Repositories (Read, Write)

### Generic Git Provider (Gitea/Forgejo)
- **Redirect URI**: `https://forgewright.io/`
- **Client Type**: Web Application

## Security Features

- CORS protection with configurable origins
- Environment-based configuration isolation
- Secure credential management via Wrangler secrets
- Provider-specific token validation
- Error sanitization to prevent information leakage

## Provider-Specific Notes

### GitHub
- Uses OAuth Apps (not GitHub Apps) for simpler flow
- Supports PKCE for enhanced security
- Repository operations include file content and branch management

### GitLab
- Supports both GitLab.com and self-hosted instances
- Uses "projects" terminology instead of "repositories"
- Requires specific token parameters including `redirect_uri`

### Bitbucket
- Uses Basic authentication for token exchange
- FormData required for file uploads
- Different user data structure (`account_id` vs `id`)

### Generic Git (Gitea/Forgejo)
- Configurable API and OAuth paths
- Factory method for common provider instances
- Supports Codeberg and other hosted instances

## Monitoring

View Worker logs:
```bash
npm run tail
```

## Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```