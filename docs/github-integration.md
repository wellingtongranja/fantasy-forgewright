# GitHub Integration Guide

Fantasy Editor's GitHub integration enables seamless backup and synchronization of your documents with GitHub repositories. This guide covers setup, usage, and troubleshooting.

## Overview

The GitHub integration provides:
- **OAuth Authentication** - Secure login with GitHub
- **Document Backup** - Automatic document sync to GitHub repositories
- **Conflict Resolution** - Smart handling of concurrent edits
- **Offline-First** - Local storage with optional cloud sync
- **Security** - Tokens stored securely, never logged or committed

## Quick Start

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Fantasy Editor (or your preferred name)
   - **Homepage URL**: `https://your-domain.com` (or `http://localhost:5173` for development)
   - **Authorization callback URL**: `https://your-domain.com/auth/callback`
4. Save and note your **Client ID**

### 2. Configure Fantasy Editor

Add your GitHub OAuth Client ID to the `.env` file:

```bash
# .env file
VITE_GITHUB_CLIENT_ID=your-github-oauth-client-id
```

Fantasy Editor will automatically initialize GitHub integration using the environment variable. No manual configuration needed!

### 3. Connect to GitHub

Use the command palette (`Ctrl+Space`) to connect:

```bash
:ghl                    # Log in to GitHub
:ghc owner repo         # Configure repository (e.g., :ghc johndoe my-docs)
:ghs                    # Sync documents
```

## Commands Reference

All GitHub commands use the `:gh` prefix and follow CLAUDE.md guidelines:

| Command | Alias | Description | Example |
|---------|-------|-------------|---------|
| `github status` | `:gh` | Show connection status | `:gh` |
| `github login` | `:ghl` | Log in to GitHub | `:ghl` |
| `github logout` | `:gho` | Log out from GitHub | `:gho` |
| `github config` | `:ghc` | Configure repository | `:ghc owner repo [branch]` |
| `github sync` | `:ghs` | Sync all documents | `:ghs` |
| `github push` | `:ghp` | Push current document | `:ghp` |
| `github pull` | `:ghpl` | Pull documents from GitHub | `:ghpl [filename]` |
| `github import` | `:ghi` | Import from GitHub URL | `:ghi https://github.com/...` |
| `github list` | `:ghls` | List GitHub documents | `:ghls` |
| `github init` | `:ghini` | Initialize repository | `:ghini` |

## Setup Guide

### Development Environment

For local development, use these settings:

**OAuth App Configuration:**
```
Application name: Fantasy Editor (Dev)
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:3000/auth/callback
```

**Environment Configuration:**
```bash
# .env file
VITE_GITHUB_CLIENT_ID=your-dev-client-id
```

### Production Environment

For production deployment:

**OAuth App Configuration:**
```
Application name: Fantasy Editor
Homepage URL: https://forgewright.io
Authorization callback URL: https://forgewright.io/auth/callback
```

**Environment Configuration:**
```bash
# .env file
VITE_GITHUB_CLIENT_ID=your-prod-client-id
```

### Repository Setup

1. Create a repository for your documents:
   ```bash
   # On GitHub, create a new repository
   # e.g., https://github.com/yourusername/my-documents
   ```

2. Configure Fantasy Editor to use the repository:
   ```bash
   :ghc yourusername my-documents
   ```

3. Initialize the repository structure:
   ```bash
   :ghini
   ```

## Document Format

Documents are stored in GitHub with YAML front matter:

```markdown
---
id: "doc-guid-123"
title: "My Epic Tale"
created: "2023-01-01T00:00:00.000Z"
updated: "2023-01-01T12:00:00.000Z"
tags:
  - fantasy
  - adventure
checksum: "abc123def456"
---

# My Epic Tale

Once upon a time in a land far away...
```

### File Naming Convention

Files are named using the format: `{document-id}-{sanitized-title}.md`

Example: `doc-guid-123-my-epic-tale.md`

## Sync Behavior

### Offline-First Architecture

- **Local Storage**: IndexedDB (primary)
- **Cloud Storage**: GitHub (backup/sync)
- **Conflict Resolution**: User-prompted with diff view

### Sync Scenarios

1. **New Document**: Created locally, pushed to GitHub on next sync
2. **Updated Document**: Changes detected by timestamp and checksum
3. **Conflict**: Both local and remote versions modified simultaneously

### Automatic Sync

Enable automatic synchronization:

```javascript
syncManager.init({
  autoSync: true,
  autoSyncInterval: 5 * 60 * 1000  // 5 minutes
})
```

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

### Example Conflict Resolution

```bash
# View conflicts
:gh                     # Shows conflict count in status

# Conflicts appear in UI automatically
# Choose resolution:
# - Click "Use Local" to keep your version
# - Click "Use Remote" to use GitHub version  
# - Click "Merge Both" to combine versions
```

## Security

### Authentication Flow

Fantasy Editor uses OAuth 2.0 with PKCE (Proof Key for Code Exchange):

1. **Authorization Request**: Redirect to GitHub with code challenge
2. **User Authorization**: User grants permission on GitHub
3. **Authorization Code**: GitHub redirects back with code
4. **Token Exchange**: Exchange code for access token using PKCE verifier

### Token Storage

- **Storage**: Browser sessionStorage (memory-only)
- **Lifetime**: Single browser session
- **Security**: Never logged, committed, or persisted to disk

### Permissions

GitHub OAuth app requests these scopes:
- `repo`: Access to repositories for document storage
- `user`: Basic user information for display

## Rate Limiting

GitHub API has rate limits that Fantasy Editor handles automatically:

- **Authenticated**: 5,000 requests per hour
- **Rate Limit Headers**: Tracked and displayed
- **Retry Logic**: Automatic retry with exponential backoff
- **User Feedback**: Clear error messages with reset time

### Rate Limit Commands

```bash
:gh                     # Shows remaining rate limit in status
```

## Troubleshooting

### Common Issues

#### "Not authenticated" Error

**Cause**: GitHub token expired or not set
**Solution**: 
```bash
:gho                    # Log out
:ghl                    # Log back in
```

#### "Repository not found" Error

**Cause**: Repository doesn't exist or no permission
**Solution**:
1. Verify repository exists and is accessible
2. Check repository name and owner
3. Ensure GitHub user has access to repository

```bash
:ghc owner repo         # Reconfigure with correct details
```

#### "Rate limit exceeded" Error

**Cause**: Too many API requests
**Solution**: Wait for rate limit reset (shown in error message)

#### Sync Conflicts

**Cause**: Document modified both locally and on GitHub
**Solution**: Use conflict resolution dialog to choose resolution strategy

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
// Enable debug mode
localStorage.setItem('fantasy_editor_debug', 'github')

// View console for detailed logs
console.log('GitHub operations logged here')
```

### Network Issues

For network connectivity problems:

1. **Check Internet Connection**: Ensure stable connection
2. **Verify GitHub Status**: Check [GitHub Status](https://githubstatus.com)
3. **Proxy/Firewall**: Ensure `api.github.com` is accessible
4. **CORS Issues**: Verify OAuth app domain matches current domain

## API Reference

### GitHubAuth Class

```javascript
const auth = new GitHubAuth()

// Initialize with OAuth client ID
auth.init({ clientId: 'your-client-id' })

// Check authentication status
auth.isAuthenticated()          // Returns boolean
auth.getCurrentUser()           // Returns user object or null
auth.getAccessToken()           // Returns token string or null

// Authentication flow
await auth.login()              // Redirects to GitHub
await auth.handleCallback(url)  // Handles OAuth callback
auth.logout()                   // Clears authentication

// API requests
await auth.makeAuthenticatedRequest('/user')
```

### GitHubStorage Class

```javascript
const storage = new GitHubStorage(githubAuth)

// Configure repository
storage.init({
  owner: 'username',
  repo: 'repository',
  branch: 'main',              // Optional, defaults to 'main'
  documentsPath: 'documents'   // Optional, defaults to 'documents'
})

// Document operations
await storage.saveDocument(document)
await storage.loadDocument(filepath)
await storage.listDocuments()
await storage.deleteDocument(filepath, sha, title)

// Repository operations
await storage.verifyRepository()
await storage.ensureDocumentsDirectory()
```

### SyncManager Class

```javascript
const syncManager = new SyncManager(storageManager, githubStorage, githubAuth)

// Initialize sync manager
syncManager.init({
  autoSync: false,
  autoSyncInterval: 300000     // 5 minutes
})

// Sync operations
const results = await syncManager.syncWithGitHub()
await syncManager.resolveConflict(conflictId, 'local')

// Status and queue management
const status = syncManager.getSyncStatus()
const conflicts = syncManager.getPendingConflicts()
syncManager.queueForSync(document)
```

## Best Practices

### Repository Structure

Organize your documents repository:

```
my-documents/
├── documents/          # Fantasy Editor documents
│   ├── story-1.md
│   ├── story-2.md
│   └── README.md
├── assets/            # Images, references
├── backups/           # Manual backups
└── README.md          # Repository documentation
```

### Workflow Recommendations

1. **Regular Sync**: Sync documents regularly to prevent conflicts
2. **Meaningful Commits**: Fantasy Editor generates descriptive commit messages
3. **Branch Strategy**: Use main branch for documents, feature branches for experiments
4. **Backup Strategy**: GitHub serves as backup; maintain local copies

### Performance Tips

1. **Document Size**: Keep documents under 1MB for optimal performance
2. **Sync Frequency**: Balance between data safety and API rate limits
3. **Network**: Use stable internet connection for sync operations
4. **Conflicts**: Resolve conflicts promptly to prevent accumulation

## Migration Guide

### From Local-Only

If you have existing documents in Fantasy Editor:

1. **Setup GitHub**: Create OAuth app and repository
2. **Configure**: Use `:ghc owner repo` to set repository
3. **Initial Sync**: Use `:ghs` to upload all documents
4. **Verify**: Use `:ghls` to confirm documents in GitHub

### From Other Platforms

To import documents from other platforms:

1. **Export Documents**: Export to markdown format
2. **Import to Fantasy Editor**: Use `:ghi url` for individual files
3. **Bulk Import**: Copy files to GitHub repository documents folder
4. **Sync**: Use `:ghs` to pull imported documents

## Advanced Configuration

### Custom OAuth Configuration

For advanced deployments:

```javascript
githubAuth.init({
  clientId: 'your-client-id',
  redirectUri: 'https://custom-domain.com/auth/callback',
  scope: 'repo user',          // Custom scopes
})
```

### Custom Sync Settings

```javascript
syncManager.init({
  autoSync: true,
  autoSyncInterval: 600000,    // 10 minutes
  conflictStrategy: 'prompt',  // 'prompt', 'local', 'remote'
  retryAttempts: 3,
  retryDelay: 5000
})
```

### Event Handling

Listen for GitHub events:

```javascript
// Authentication events
document.addEventListener('github-auth-success', (event) => {
  console.log('User authenticated:', event.detail.user)
})

document.addEventListener('github-auth-error', (event) => {
  console.error('Auth failed:', event.detail.error)
})

// Sync events
document.addEventListener('github-sync-complete', (event) => {
  console.log('Sync results:', event.detail.results)
})

document.addEventListener('github-sync-conflict', (event) => {
  console.log('Conflicts detected:', event.detail.conflicts)
})
```

## FAQ

**Q: Is my GitHub token secure?**
A: Yes, tokens are stored in sessionStorage only and never logged or committed.

**Q: Can I use private repositories?**
A: Yes, the OAuth flow requests repository access including private repositories.

**Q: What happens if I edit the same document simultaneously?**
A: Fantasy Editor detects conflicts and provides a visual diff interface for resolution.

**Q: Can I sync to multiple repositories?**
A: Currently, one repository per session. You can reconfigure using `:ghc owner repo`.

**Q: Do I need to commit documents manually?**
A: No, Fantasy Editor automatically creates commits with descriptive messages.

**Q: Can I use GitHub Enterprise?**
A: The current implementation targets GitHub.com. Enterprise support would require configuration changes.

**Q: What if GitHub is down?**
A: Fantasy Editor works offline-first. Documents remain accessible locally until GitHub is available.

**Q: Can I export my documents?**
A: Yes, documents are stored as standard markdown files in your GitHub repository.

## Support

For issues with GitHub integration:

1. **Check Status**: Use `:gh` to verify connection status
2. **Review Logs**: Enable debug mode and check browser console
3. **Test Repository**: Verify repository accessibility on GitHub
4. **Network Issues**: Check internet connection and GitHub status
5. **Report Issues**: Create issue at [GitHub repository](https://github.com/anthropics/claude-code/issues)

---

*This documentation covers Fantasy Editor v1.0.0 GitHub integration. For updates and additional features, see the changelog and release notes.*