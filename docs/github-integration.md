# GitHub Integration Guide

Fantasy Editor provides seamless GitHub integration through a secure OAuth system that supports GitHub and other Git providers. This guide covers setup, authentication, synchronization, and troubleshooting.

## Overview

The GitHub integration provides:
- **OAuth Authentication** - Secure login via Cloudflare Worker proxy
- **Document Synchronization** - Automatic backup and sync with GitHub repositories
- **Conflict Resolution** - Smart handling of concurrent edits
- **Offline-First** - Local storage with optional cloud sync
- **Multi-Provider Support** - GitHub, GitLab, Bitbucket, and generic Git

## Architecture

### OAuth System Components

1. **AuthManager** (`src/core/auth/auth-manager.js`)
   - Provider-agnostic authentication manager
   - Handles OAuth flow, token management, and user sessions

2. **OAuth Worker** (`workers/oauth-proxy.js`)
   - Cloudflare Worker acting as secure OAuth proxy
   - Keeps client secrets server-side for security
   - Deployed at: `https://fantasy-oauth-proxy.wellington-granja.workers.dev`

3. **Provider Support**
   - GitHub (primary)
   - GitLab, Bitbucket, Generic Git (future)

## Quick Start

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Configure:
   - **Application name**: Fantasy Editor
   - **Homepage URL**: `https://forgewright.io`
   - **Authorization callback URL**: `https://forgewright.io/`
4. Save and note your **Client ID**

### 2. Environment Configuration

**Production (.env):**
```bash
VITE_OAUTH_WORKER_URL=https://fantasy-oauth-proxy.wellington-granja.workers.dev
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

**Development (.env):**
```bash
VITE_OAUTH_WORKER_URL=http://localhost:8788
VITE_GITHUB_CLIENT_ID=your_dev_client_id
```

### 3. Connect and Configure

Use the command palette (`Ctrl+Space`):

```bash
:glo                    # Log in to GitHub
:gcf owner repo         # Configure repository (e.g., :gcf johndoe my-docs)
:gsy                    # Sync documents
```

## Commands Reference

All GitHub commands use the `:g` prefix:

| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `github status` | `:gst` | Show connection status | `:gst` |
| `github login` | `:glo` | Log in to GitHub | `:glo` |
| `github logout` | `:gou` | Log out from GitHub | `:gou` |
| `github config` | `:gcf` | Configure repository | `:gcf owner repo` |
| `github sync` | `:gsy` | Sync all documents | `:gsy` |
| `github push` | `:gpu` | Push current document | `:gpu` |
| `github pull` | `:gpl` | Pull specific document | `:gpl filename` |
| `github import` | `:gim` | Import from GitHub URL | `:gim https://github.com/...` |
| `github list` | `:gls` | List GitHub documents | `:gls` |
| `github init` | `:gin` | Initialize repository | `:gin` |

## Security & Authentication

### OAuth Flow (PKCE)

1. **Authorization Request**: Redirect to GitHub with code challenge
2. **User Authorization**: User grants permission on GitHub  
3. **Authorization Code**: GitHub redirects back with code
4. **Token Exchange**: Worker exchanges code for access token securely

### Security Features

- **Client Secrets**: Stored only on Cloudflare Worker (never exposed to client)
- **Token Storage**: sessionStorage only (single browser session)
- **Origin Validation**: Strict origin checking
- **CORS Security**: Properly configured cross-origin requests

### Permissions

The OAuth app requests:
- `repo`: Access to repositories for document storage
- `user`: Basic user information for display

## Document Synchronization

### Storage Architecture

- **Primary**: IndexedDB (local, offline-first)
- **Secondary**: GitHub (backup/sync)
- **Conflict Resolution**: User-prompted with visual diff

### Document Format

Documents are stored with YAML front matter:

```markdown
---
id: "doc_1648125632_a1b2c3d4"
title: "My Epic Tale"
created: "2023-01-01T00:00:00.000Z"
updated: "2023-01-01T12:00:00.000Z" 
tags:
  - fantasy
  - adventure
checksum: "sha256:abc123def456"
---

# My Epic Tale

Once upon a time in a land far away...
```

### File Naming Convention

Files use the format: `{document-id}-{sanitized-title}.md`
Example: `doc_1648125632_a1b2c3d4-my-epic-tale.md`

## Conflict Resolution

When conflicts occur, Fantasy Editor provides a visual diff interface:

### Conflict Types
- **Content Conflict**: Different content checksums
- **Title Conflict**: Different document titles
- **Timestamp Conflict**: Modified after last sync

### Resolution Options
1. **Use Local** - Keep your changes, overwrite GitHub
2. **Use Remote** - Keep GitHub changes, overwrite local
3. **Merge Both** - Combine versions with conflict markers

## Rate Limiting

GitHub API limits are handled automatically:

- **Authenticated**: 5,000 requests per hour
- **Rate Limit Headers**: Tracked and displayed
- **Retry Logic**: Automatic retry with exponential backoff
- **User Feedback**: Clear error messages with reset time

Check rate limit status with `:gst`

## Troubleshooting

### Common Issues

**"Not authenticated" Error**
```bash
:gou        # Log out
:glo        # Log back in
```

**"Repository not found" Error**
1. Verify repository exists and is accessible
2. Check repository name and owner
3. Ensure GitHub user has repository access
```bash
:gcf owner repo         # Reconfigure with correct details
```

**Rate Limit Exceeded**
Wait for rate limit reset (shown in error message)

**Sync Conflicts**
Use conflict resolution dialog to choose resolution strategy

### Debug Mode

Enable detailed logging:
```javascript
localStorage.setItem('fantasy_editor_debug', 'github')
// Check browser console for detailed logs
```

## Worker Configuration

### Environment Variables (Cloudflare Dashboard)

**Required:**
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret (encrypted)
- `CORS_ORIGIN` - `https://fantasy.forgewright.io`
- `OAUTH_REDIRECT_URI` - `https://fantasy.forgewright.io/`

### Development Setup

1. Create development GitHub OAuth app (callback: `http://localhost:3000/`)
2. Configure `.dev.vars` in workers directory
3. Run Worker locally: `npx wrangler dev --env dev`

## Best Practices

### Repository Structure
```
my-documents/
├── documents/          # Fantasy Editor documents
├── assets/            # Images, references  
├── backups/           # Manual backups
└── README.md          # Repository documentation
```

### Workflow Recommendations

1. **Regular Sync**: Sync documents regularly to prevent conflicts
2. **Meaningful Commits**: Fantasy Editor generates descriptive commit messages
3. **Branch Strategy**: Use main branch for documents
4. **Backup Strategy**: GitHub serves as backup; maintain local copies

### Performance Tips

1. **Document Size**: Keep documents under 1MB for optimal performance
2. **Sync Frequency**: Balance between data safety and API rate limits
3. **Network**: Use stable internet connection for sync operations
4. **Conflicts**: Resolve conflicts promptly to prevent accumulation

## Migration Guide

### From Local-Only

1. **Setup GitHub**: Create OAuth app and repository
2. **Configure**: Use `:gcf owner repo` to set repository  
3. **Initial Sync**: Use `:gsy` to upload all documents
4. **Verify**: Use `:gls` to confirm documents in GitHub

### From Other Platforms

1. **Export Documents**: Export to markdown format
2. **Import to Fantasy Editor**: Use `:gim url` for individual files
3. **Bulk Import**: Copy files to GitHub repository documents folder
4. **Sync**: Use `:gsy` to pull imported documents

## FAQ

**Q: Is my GitHub token secure?**
A: Yes, tokens are stored in sessionStorage only and never logged or committed.

**Q: Can I use private repositories?**
A: Yes, the OAuth flow requests repository access including private repositories.

**Q: What happens if I edit the same document simultaneously?**
A: Fantasy Editor detects conflicts and provides a visual diff interface for resolution.

**Q: Can I sync to multiple repositories?**
A: Currently, one repository per session. You can reconfigure using `:gcf owner repo`.

**Q: What if GitHub is down?**
A: Fantasy Editor works offline-first. Documents remain accessible locally until GitHub is available.

---

*Fantasy Editor v0.0.1 - For updates and additional features, see release notes.*