# Legal Documents Worker - Deployment Reference

## Deployed Environments

### Development
- **URL**: `https://fantasy-legal-docs-dev.wellington-granja.workers.dev`
- **CORS Origin**: `http://localhost:3000`
- **Use Case**: Local development and testing

### Staging  
- **URL**: `https://fantasy-legal-docs-staging.wellington-granja.workers.dev`
- **CORS Origin**: `https://fantasy-editor.pages.dev`
- **Use Case**: Staging environment testing

### Production
- **URL**: `https://fantasy-legal-docs.wellington-granja.workers.dev`
- **CORS Origin**: `https://fantasy.forgewright.io`
- **Use Case**: Production Fantasy Editor application

## API Endpoints

### Health Check
```bash
GET /health
```
**Response**: `{"status": "healthy"}`

### Document Metadata
```bash
GET /legal/check
```
**Response**: 
```json
{
  "documents": {
    "privacy-policy": {"sha": "...", "size": 4039, "path": "documents/privacy-policy.md"},
    "terms-of-service": {"sha": "...", "size": 2091, "path": "documents/terms-of-service.md"},
    "eula": {"sha": "...", "size": 3799, "path": "documents/eula.md"},
    "license": {"sha": "...", "size": 5080, "path": "documents/LICENSE.md"},
    "release-notes": {"sha": "...", "size": 2931, "path": "documents/release-notes.md"}
  },
  "timestamp": "2025-09-12T00:47:57.152Z"
}
```

### Document Retrieval
```bash
GET /legal/documents?type={document-type}
```
**Parameters**:
- `type`: One of `privacy-policy`, `terms-of-service`, `eula`, `license`, `release-notes`

**Response**:
```json
{
  "type": "privacy-policy",
  "content": "# Privacy Policy\n\n...",
  "sha": "1de6cb8aa928267d5146a5b879e69013b4852a36",
  "hash": "242a0c274fc60834621413da3001ba70d004848d783af18b0b0fbcc8ceb0b82f",
  "size": 4039,
  "path": "documents/privacy-policy.md"
}
```

## Manual Testing Commands

### Development Environment
```bash
# Health check
curl -H "Origin: http://localhost:3000" https://fantasy-legal-docs-dev.wellington-granja.workers.dev/health

# Get metadata
curl -H "Origin: http://localhost:3000" https://fantasy-legal-docs-dev.wellington-granja.workers.dev/legal/check

# Get privacy policy
curl -H "Origin: http://localhost:3000" "https://fantasy-legal-docs-dev.wellington-granja.workers.dev/legal/documents?type=privacy-policy"

# Test CORS blocking
curl https://fantasy-legal-docs-dev.wellington-granja.workers.dev/health  # Should return 403
```

### Staging Environment
```bash
# Health check
curl -H "Origin: https://fantasy-editor.pages.dev" https://fantasy-legal-docs-staging.wellington-granja.workers.dev/health

# Get license document
curl -H "Origin: https://fantasy-editor.pages.dev" "https://fantasy-legal-docs-staging.wellington-granja.workers.dev/legal/documents?type=license"
```

### Production Environment
```bash
# Health check
curl -H "Origin: https://fantasy.forgewright.io" https://fantasy-legal-docs.wellington-granja.workers.dev/health

# Get terms of service
curl -H "Origin: https://fantasy.forgewright.io" "https://fantasy-legal-docs.wellington-granja.workers.dev/legal/documents?type=terms-of-service"
```

## Security Features

- **CORS Enforcement**: Each environment only accepts requests from its designated origin
- **Rate Limiting**: 10 requests per minute per IP address
- **Document Integrity**: SHA-256 hashing for all documents
- **Private Repository**: Documents stored in private GitHub repository
- **No Public Discovery**: Worker URLs not publicly listed

## Error Responses

- **403 Forbidden**: Invalid or missing Origin header
- **400 Bad Request**: Invalid or missing document type parameter
- **404 Not Found**: Unknown endpoint
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Worker or GitHub API error

## GitHub Repository

- **Repository**: `https://github.com/wellingtongranja/fantasy-editor-legal` (Private)
- **Structure**: Documents in `/documents/` folder
- **Authentication**: GitHub Personal Access Token with repo scope

---

**Last Updated**: September 12, 2025  
**Status**: All environments operational and regression tested ✅