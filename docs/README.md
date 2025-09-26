# Fantasy Editor Documentation

**Fantasy Editor** is a distraction-free, keyboard-first markdown editor for writers, hosted at [forgewright.io](https://forgewright.io).

## 🚀 Quick Start

1. Press `Ctrl+Space` to open the command palette
2. Use colon shortcuts: `:n` for new document, `:s` to save, `:glo` to connect GitHub
3. Try `:h` for help or browse the guides below

## 📚 Documentation Guide

### For Writers & End Users
**[→ User Guide](user-guide.md)** - Complete guide to using Fantasy Editor
- Essential commands and keyboard shortcuts
- GitHub integration and document sync
- Themes, export options, and customization
- Writing workflows and productivity tips

### For Developers
**[→ Developer Guide](developer-guide.md)** - Technical development reference
- Local setup and build process
- Architecture overview and component structure
- Testing strategy and development tools
- Code standards and contribution guidelines

**[→ CLAUDE.md](../CLAUDE.md)** - **Complete Development Authority**
- Comprehensive development principles (TDD, Clean Code, KISS, PWA)
- Technical architecture with diagrams and data flow
- Command system documentation and API reference
- Complete project context and implementation details

### For Operations & Security
**[→ Deployment Guide](deployment-guide.md)** - Production deployment and CI/CD
- GitHub Actions configuration and troubleshooting
- Cloudflare Pages setup and environment management
- Performance monitoring and optimization

**[→ Security Guide](security-guide.md)** - Security implementation and compliance
- WAF rules and security headers configuration
- OAuth security model and client-side encryption
- Compliance checklists and security monitoring

**[→ Workers Guide](workers-guide.md)** - Cloudflare Workers documentation
- OAuth proxy architecture and multi-provider setup
- Legal documents worker configuration and testing
- Worker deployment and monitoring procedures

### Legal & Compliance
All legal documents are accessible in-app via system commands (`:license`, `:eula`, `:privacy`):
- MIT license with commercial licensing options available
- Privacy-first policy with local storage and optional Git sync
- End User License Agreement with alpha period terms
- Comprehensive legal documentation served via secure Cloudflare Worker

## 🏗️ Project Architecture

Fantasy Editor is built with these core principles:

- **Offline-First**: Full functionality without internet connection
- **Command-Centric**: Single `Ctrl+Space` entry point prevents browser conflicts
- **Writer-Focused**: Optimized for distraction-free creative writing
- **Security-First**: Client-side encryption, WAF protection, secure OAuth
- **PWA Excellence**: Service worker, background sync, installable

### Key Technologies
- **Editor**: CodeMirror 6 for markdown editing
- **Storage**: IndexedDB (primary) + GitHub sync (backup)
- **Authentication**: Multi-provider OAuth via Cloudflare Workers
- **Deployment**: Cloudflare Pages with global CDN
- **Build**: Vite with optimized bundle splitting

## 🎯 Core Features

### Command System
Access all functionality via `Ctrl+Space` command palette:
- `:n My Story` - Create new document
- `:s` - Save current document
- `:glo` - Sign in with GitHub
- `:t dark` - Switch to dark theme
- `:65` - Set editor width to 65 characters
- `:ex pdf` - Export document as PDF

### GitHub Integration
- Secure OAuth authentication via Cloudflare Worker proxy
- Automatic repository setup and document synchronization
- Real-time sync status with conflict resolution
- Offline-first with background sync when online

### Writer Experience
- Distraction-free interface with optimal 65-character line width
- Multiple themes including fantasy theme for genre writers
- Full-text search across all documents with tagging
- Document export to Markdown, HTML, PDF, and plain text

## 📊 Project Status

**Current Version**: v0.0.2 (Alpha)
**License**: MIT (with commercial licensing available)
**Bundle Size**: >1MB (target: <5MB)
**Test Coverage**: Working toward >90%

### ✅ Completed
- Core editor with CodeMirror 6
- Complete command system with 50+ commands
- GitHub OAuth integration and sync
- Multi-theme support with custom configuration
- Document export system
- Legal compliance workflow

### 🚧 In Progress
- Settings dialog UX improvements
- Bundle size optimization
- Mobile experience enhancement
- Test coverage expansion

### 📋 Planned
- GitLab, Bitbucket, and generic Git provider support
- Project Gutenberg integration for research
- Collaborative editing features
- Mobile application

## 🤝 Contributing

Fantasy Editor follows strict development principles:

1. **Test-Driven Development** - Write tests first (RED → GREEN → REFACTOR)
2. **Clean Code** - Max 20 lines/function, 200 lines/file
3. **KISS Principle** - Vanilla JavaScript, minimal dependencies
4. **Security-First** - Input validation, secure by default
5. **PWA Excellence** - Offline-first, performance optimized

See **[CLAUDE.md](../CLAUDE.md)** for complete development guidelines and architecture.

## 📞 Support

- **Documentation Issues**: Check the relevant guide above
- **Bug Reports**: Use the project GitHub repository
- **Feature Requests**: Submit via GitHub issues
- **Development Questions**: Reference CLAUDE.md and Developer Guide

## 🔗 Important Links

- **Production App**: [forgewright.io](https://forgewright.io)
- **Development Authority**: [CLAUDE.md](../CLAUDE.md)
- **GitHub Repository**: Project repository (check header for link)
- **Cloudflare Pages**: Deployment dashboard
- **OAuth Worker**: `https://fantasy-oauth-proxy.wellington-granja.workers.dev`

---

*Fantasy Editor v0.0.2 (Alpha) - Write your epic tales with focus and clarity*

**Documentation last updated**: September 2025