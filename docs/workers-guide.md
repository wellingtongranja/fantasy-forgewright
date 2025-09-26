# Fantasy Editor Cloudflare Workers Guide

Fantasy Editor uses two Cloudflare Workers to provide secure backend services while maintaining the client-side architecture:

1. **OAuth Proxy Worker** - Multi-provider OAuth authentication
2. **Legal Documents Worker** - Secure legal document serving

## 🔐 OAuth Proxy Worker

A secure proxy enabling multi-provider OAuth authentication for Fantasy Editor while keeping client secrets server-side.

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Fantasy Editor │    │  OAuth Worker    │    │  Git Provider   │
│  (Client-side)  │    │  (Cloudflare)    │    │  (GitHub, etc)  │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ 1. User clicks  │    │ 3. Store PKCE    │    │ 5. User grants  │
│    "Sign in"    │    │    challenge     │    │    permissions  │
│                 │    │                  │    │                 │
│ 2. Generate     │◄──►│ 4. Redirect to   │◄──►│ 6. Return auth  │
│    PKCE params  │    │    provider      │    │    code         │
│                 │    │                  │    │                 │
│ 7. Receive code │    │ 8. Exchange code │    │ 9. Return access│
│    and tokens   │    │    for tokens    │    │    token        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Supported Git Providers

- **GitHub** - GitHub.com OAuth Apps (Primary)
- **GitLab** - GitLab.com and self-hosted instances (Infrastructure ready)
- **Bitbucket** - Bitbucket Cloud OAuth Consumers (Infrastructure ready)
- **Generic Git** - Gitea, Forgejo, Codeberg (Infrastructure ready)

### Worker Endpoints

#### Authentication Endpoints

**POST `/oauth/token`** - Exchange authorization code for access token

```javascript
// Request
{
  "provider": "github",
  "code": "authorization_code_from_provider",
  "codeVerifier": "pkce_code_verifier_generated_by_client"
}

// Response
{
  "access_token": "gho_xxxxxxxxxxxxxxxxxxxx",
  "token_type": "Bearer",
  "scope": "repo user"
}
```

**POST `/oauth/user`** - Fetch authenticated user information

```javascript
// Request
{
  "provider": "github",
  "accessToken": "gho_xxxxxxxxxxxxxxxxxxxx"
}

// Response
{
  "id": 123456,
  "username": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://avatars.githubusercontent.com/u/123456?v=4",
  "provider": "github"
}
```

**POST `/oauth/repos`** - Perform repository operations

```javascript
// Request: List repositories
{
  "provider": "github",
  "operation": "fetchRepositories",
  "accessToken": "gho_xxxxxxxxxxxxxxxxxxxx",
  "options": { "per_page": 100, "sort": "updated" }
}

// Request: File operations
{
  "provider": "github",
  "operation": "getFile",
  "accessToken": "gho_xxxxxxxxxxxxxxxxxxxx",
  "owner": "johndoe",
  "repo": "my-documents",
  "path": "documents/my-story.md"
}
```

**GET `/health`** - Worker health check

### Development Setup

#### Prerequisites
- **Wrangler CLI** - Cloudflare Workers CLI tool
- **Node.js 20+** - For local development
- **Cloudflare Account** - With Workers enabled

#### Local Development

```bash
# Navigate to workers directory
cd workers/

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure local environment
# Edit .env.local with development OAuth app credentials

# Start local development server
npm run dev
# Worker available at http://localhost:8788
```

#### Environment Configuration

**Development (.dev.vars):**
```bash
# GitHub OAuth App (Development)
GITHUB_CLIENT_ID=your_dev_client_id
GITHUB_CLIENT_SECRET=your_dev_client_secret

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
OAUTH_REDIRECT_URI=http://localhost:3000/
```

**Production (via Cloudflare Dashboard):**
```bash
# GitHub OAuth App (Production)
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret

# CORS Configuration
CORS_ORIGIN=https://fantasy.forgewright.io
OAUTH_REDIRECT_URI=https://fantasy.forgewright.io/
```

### Security Features

#### PKCE (Proof Key for Code Exchange)
- **Code Challenge**: Client generates cryptographic challenge
- **Code Verifier**: Stored securely, used to verify token exchange
- **Prevents Interception**: Authorization code useless without verifier

#### Origin Validation
```javascript
function validateOrigin(request) {
  const origin = request.headers.get('Origin')
  const allowedOrigins = [
    'https://fantasy.forgewright.io',
    'http://localhost:3000'  // Development only
  ]

  return allowedOrigins.includes(origin)
}
```

#### Token Security
- **Client Secrets**: Never exposed to client-side code
- **Session Storage**: Tokens stored in sessionStorage (cleared on browser close)
- **No Persistence**: Worker doesn't store tokens long-term
- **CORS Protected**: Strict origin validation

### OAuth App Configuration

#### GitHub OAuth App Setup

1. **Create OAuth App**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in application details

2. **Production Configuration**:
   ```
   Application name: Fantasy Editor
   Homepage URL: https://forgewright.io
   Authorization callback URL: https://forgewright.io/
   ```

3. **Development Configuration**:
   ```
   Application name: Fantasy Editor (Dev)
   Homepage URL: http://localhost:3000
   Authorization callback URL: http://localhost:3000/
   ```

#### Required Permissions
- **`repo`** - Access to repositories for document storage
- **`user`** - Basic user information for display

### Deployment

#### Deploy to Production
```bash
# Deploy OAuth worker to production
npm run deploy

# Verify deployment
curl https://fantasy-oauth-proxy.wellington-granja.workers.dev/health
```

#### Deploy to Staging
```bash
# Deploy to staging environment
npm run deploy:staging

# Test staging deployment
curl https://fantasy-oauth-staging.wellington-granja.workers.dev/health
```

### Monitoring & Debugging

#### View Worker Logs
```bash
# Stream real-time logs
npm run tail

# View recent logs in dashboard
wrangler pages deployment tail
```

#### Test OAuth Flow
```bash
# Test health endpoint
curl https://fantasy-oauth-proxy.wellington-granja.workers.dev/health

# Test with invalid origin (should return 403)
curl https://fantasy-oauth-proxy.wellington-granja.workers.dev/oauth/user

# Test with valid origin
curl -H "Origin: https://fantasy.forgewright.io" \
     https://fantasy-oauth-proxy.wellington-granja.workers.dev/health
```

## 📄 Legal Documents Worker

A secure worker serving legal documents (Privacy Policy, EULA, License, etc.) to the Fantasy Editor legal splash screen.

### Architecture

The Legal Documents Worker provides:
- **Secure Document Serving** - Legal documents from private GitHub repository
- **CORS Protection** - Origin-based access control
- **Rate Limiting** - 10 requests per minute per IP
- **Document Integrity** - SHA-256 hashing for all documents
- **Multi-Environment** - Development, staging, and production deployments

### Deployed Environments

#### Production
- **URL**: `https://fantasy-legal-docs.wellington-granja.workers.dev`
- **CORS Origin**: `https://fantasy.forgewright.io`
- **Use Case**: Production Fantasy Editor application

#### Staging
- **URL**: `https://fantasy-legal-docs-staging.wellington-granja.workers.dev`
- **CORS Origin**: `https://fantasy-editor.pages.dev`
- **Use Case**: Staging environment testing

#### Development
- **URL**: `https://fantasy-legal-docs-dev.wellington-granja.workers.dev`
- **CORS Origin**: `http://localhost:3000`
- **Use Case**: Local development and testing

### API Endpoints

#### Document Metadata
**GET `/legal/check`** - Get all document metadata

```javascript
// Response
{
  "documents": {
    "privacy-policy": {
      "sha": "1de6cb8aa928267d5146a5b879e69013b4852a36",
      "size": 4039,
      "path": "documents/privacy-policy.md"
    },
    "eula": {
      "sha": "a1b2c3d4e5f6789...",
      "size": 3799,
      "path": "documents/eula.md"
    },
    "license": {
      "sha": "f6e5d4c3b2a1987...",
      "size": 5080,
      "path": "documents/LICENSE.md"
    }
  },
  "timestamp": "2025-09-12T00:47:57.152Z"
}
```

#### Document Retrieval
**GET `/legal/documents?type={document-type}`** - Get specific document

```javascript
// Request
GET /legal/documents?type=privacy-policy

// Response
{
  "type": "privacy-policy",
  "content": "# Privacy Policy\n\nFantasy Editor...",
  "sha": "1de6cb8aa928267d5146a5b879e69013b4852a36",
  "hash": "242a0c274fc60834621413da3001ba70d004848d783af18b0b0fbcc8ceb0b82f",
  "size": 4039,
  "path": "documents/privacy-policy.md"
}
```

**Supported Document Types:**
- `privacy-policy` - Privacy Policy
- `eula` - End User License Agreement
- `license` - AGPL-3.0 License
- `release-notes` - Version history and changes

#### Health Check
**GET `/health`** - Worker health status

```javascript
// Response
{
  "status": "healthy"
}
```

### Development Setup

#### Local Development
```bash
# Navigate to workers directory
cd workers/

# Install dependencies (if not already done)
npm install

# Deploy legal worker to development
wrangler deploy --config wrangler.legal.toml --env dev

# Test local development
curl -H "Origin: http://localhost:3000" \
     https://fantasy-legal-docs-dev.wellington-granja.workers.dev/health
```

#### Environment Configuration

The legal worker uses a **private GitHub repository** to store legal documents:

**Repository Structure:**
```
fantasy-editor-legal/ (Private Repository)
├── documents/
│   ├── privacy-policy.md
│   ├── eula.md
│   ├── LICENSE.md (AGPL-3.0)
│   └── release-notes.md
└── README.md
```

**Environment Variables:**
```bash
# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx  # Personal Access Token
GITHUB_OWNER=wellingtongranja
GITHUB_REPO=fantasy-editor-legal

# CORS Configuration (per environment)
CORS_ORIGIN=https://fantasy.forgewright.io  # Production
# CORS_ORIGIN=http://localhost:3000         # Development
```

### Security Features

#### CORS Enforcement
```javascript
function validateOrigin(request, expectedOrigin) {
  const origin = request.headers.get('Origin')
  return origin === expectedOrigin
}

// Returns 403 Forbidden for invalid origins
if (!validateOrigin(request, env.CORS_ORIGIN)) {
  return new Response('Forbidden', { status: 403 })
}
```

#### Rate Limiting
- **Limit**: 10 requests per minute per IP address
- **Response**: 429 Too Many Requests when exceeded
- **Reset**: Rate limit window resets every minute

#### Document Integrity
- **SHA-256 Hashing**: All documents include integrity hash
- **GitHub SHA**: Original GitHub commit SHA preserved
- **Content Validation**: Hash verification on client side

### Deployment

#### Deploy All Environments
```bash
# Deploy to development
wrangler deploy --config wrangler.legal.toml --env dev

# Deploy to staging
wrangler deploy --config wrangler.legal.toml --env staging

# Deploy to production
wrangler deploy --config wrangler.legal.toml --env production
```

#### Verify Deployments
```bash
# Test production
curl -H "Origin: https://fantasy.forgewright.io" \
     https://fantasy-legal-docs.wellington-granja.workers.dev/health

# Test staging
curl -H "Origin: https://fantasy-editor.pages.dev" \
     https://fantasy-legal-docs-staging.wellington-granja.workers.dev/health

# Test development
curl -H "Origin: http://localhost:3000" \
     https://fantasy-legal-docs-dev.wellington-granja.workers.dev/health
```

### Testing

#### Manual Testing Commands

```bash
# Health checks (all environments)
curl -H "Origin: https://fantasy.forgewright.io" \
     https://fantasy-legal-docs.wellington-granja.workers.dev/health

curl -H "Origin: https://fantasy-editor.pages.dev" \
     https://fantasy-legal-docs-staging.wellington-granja.workers.dev/health

curl -H "Origin: http://localhost:3000" \
     https://fantasy-legal-docs-dev.wellington-granja.workers.dev/health

# Get document metadata
curl -H "Origin: https://fantasy.forgewright.io" \
     https://fantasy-legal-docs.wellington-granja.workers.dev/legal/check

# Get specific documents
curl -H "Origin: https://fantasy.forgewright.io" \
     "https://fantasy-legal-docs.wellington-granja.workers.dev/legal/documents?type=privacy-policy"

curl -H "Origin: https://fantasy.forgewright.io" \
     "https://fantasy-legal-docs.wellington-granja.workers.dev/legal/documents?type=license"

# Test CORS blocking (should return 403)
curl https://fantasy-legal-docs.wellington-granja.workers.dev/health

# Test rate limiting (run >10 times quickly)
for i in {1..12}; do
  curl -H "Origin: https://fantasy.forgewright.io" \
       https://fantasy-legal-docs.wellington-granja.workers.dev/health
done
```

### Error Handling

**Common Error Responses:**
- **403 Forbidden**: Invalid or missing Origin header
- **400 Bad Request**: Invalid or missing document type parameter
- **404 Not Found**: Unknown endpoint or document type
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Worker or GitHub API error

**Error Response Format:**
```javascript
{
  "error": "Invalid document type",
  "code": "INVALID_DOCUMENT_TYPE",
  "timestamp": "2025-09-12T00:47:57.152Z"
}
```

## 🚀 Worker Best Practices

### Performance Optimization

#### Caching Strategy
```javascript
// Cache responses at edge for performance
export default {
  async fetch(request, env, ctx) {
    const cache = caches.default
    const cacheKey = new Request(request.url, request)

    // Try cache first
    let response = await cache.match(cacheKey)

    if (!response) {
      // Generate response
      response = await handleRequest(request, env)

      // Cache for 5 minutes
      response.headers.set('Cache-Control', 'max-age=300')
      ctx.waitUntil(cache.put(cacheKey, response.clone()))
    }

    return response
  }
}
```

#### Request Optimization
- **Parallel Requests**: Use `Promise.all()` for multiple GitHub API calls
- **Request Deduplication**: Cache identical requests within same execution
- **Minimal Payloads**: Return only necessary data to client

### Security Best Practices

#### Secret Management
```bash
# Use Wrangler secrets, never commit secrets
wrangler secret put GITHUB_TOKEN --env production
wrangler secret put GITHUB_CLIENT_SECRET --env production

# List secrets (without exposing values)
wrangler secret list --env production
```

#### Input Validation
```javascript
function validateDocumentType(type) {
  const allowedTypes = ['privacy-policy', 'eula', 'license', 'release-notes']
  return allowedTypes.includes(type)
}

function validateProvider(provider) {
  const allowedProviders = ['github', 'gitlab', 'bitbucket', 'generic-git']
  return allowedProviders.includes(provider)
}
```

#### Error Sanitization
```javascript
// Never expose internal errors to client
try {
  const result = await dangerousOperation()
  return new Response(JSON.stringify(result))
} catch (error) {
  // Log internally but return generic error
  console.error('Internal error:', error)
  return new Response('Internal server error', { status: 500 })
}
```

### Monitoring & Maintenance

#### Health Monitoring
- **Automated Health Checks**: Monitor `/health` endpoints
- **Performance Metrics**: Track response times and error rates
- **Uptime Monitoring**: Use external services to monitor availability

#### Log Analysis
```bash
# Monitor OAuth worker logs
wrangler tail --env production

# Monitor legal worker logs
wrangler tail --config wrangler.legal.toml --env production

# Filter for errors only
wrangler tail --env production | grep ERROR
```

#### Capacity Planning
- **Rate Limits**: Monitor request patterns and adjust limits
- **Cost Optimization**: Review Cloudflare Workers usage and costs
- **Scaling**: Workers auto-scale but monitor for unusual traffic patterns

---

**Fantasy Editor Workers Guide - Last Updated: September 2025**

*For integration details and client-side usage, see [User Guide](user-guide.md) and [Developer Guide](developer-guide.md)*