# Fantasy Editor Documentation

Fantasy Editor is a distraction-free, keyboard-first markdown editor for writers, hosted at [forgewright.io](https://forgewright.io).

## Quick Start

1. Press `Ctrl+Space` to open the command palette
2. Use colon shortcuts like `:n` for new document, `:s` to save
3. Try `:h` for help or `:glo` to connect GitHub

## Documentation Index

### User Guides
- **[help.md](help.md)** - User guide with essential commands and features
- **[github-integration.md](github-integration.md)** - Complete GitHub setup and sync guide

### Development
- **[architecture.md](architecture.md)** - System architecture and design principles
- **[dev-helpers.md](dev-helpers.md)** - Console utilities for development and testing
- **[testing.md](testing.md)** - Testing strategy and examples
- **[security.md](security.md)** - Security implementation and best practices
- **[deployment.md](deployment.md)** - Deployment guide and troubleshooting

### Legal & Info
- **[release-notes.md](release-notes.md)** - Version history and changes
- **[privacy-policy.md](privacy-policy.md)** - Privacy policy and data handling
- **[license-agpl.md](license-agpl.md)** - AGPL v3 license
- **[license-commercial.md](license-commercial.md)** - Commercial license option
- **[eula.md](eula.md)** - End User License Agreement

## Key Features

- **Command Palette**: Access all features via `Ctrl+Space`
- **Offline-First**: Works without internet connection
- **GitHub Sync**: Secure document synchronization
- **Multiple Themes**: Light, Dark, and Fantasy themes
- **Full-Text Search**: Search across all documents
- **Writer-Focused**: Distraction-free interface optimized for writing

## Architecture Highlights

- **Client-side PWA** with offline-first design
- **Command-based interface** prevents browser shortcut conflicts
- **OAuth proxy** keeps credentials secure via Cloudflare Worker
- **IndexedDB storage** with optional GitHub backup
- **Conflict-free sync** with visual merge resolution

## Support

For issues and questions:
- Check the [help.md](help.md) guide
- Review [troubleshooting sections](deployment.md#troubleshooting) in deployment docs
- Report issues on the project repository

---

*Fantasy Editor v0.0.1 - Built for writers, by writers*