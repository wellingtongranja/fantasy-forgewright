# Release Notes

## Version 0.0.2 (Alpha) - Current Release

**Release Date**: September 2025
**Status**: Alpha - Core features free forever
**License**: MIT License with Fantasy Editor Forge premium tier

### 🎉 First Production Alpha Release

Welcome to Fantasy Editor v0.0.2-alpha! This milestone represents a fully functional, production-ready markdown editor built for writers who love keyboard-first workflows and distraction-free editing.

Fantasy Editor core features remain **completely free** under the MIT License. Premium AI-powered writing assistance is available through **Fantasy Editor Forge**.

### ✨ Key Features

#### Advanced Markdown Editor
- **CodeMirror 6 Integration**: Professional editing with live syntax highlighting
- **Writer-Focused Themes**: Light, Dark, and Fantasy themes
- **Optimal Width Control**: Adjustable editor width (65ch/80ch/90ch)
- **Dynamic Zoom**: Font scaling from 85%-130%
- **Document Export**: Markdown, HTML, PDF, and Plain Text formats

#### Revolutionary Command System
- **Single-Key Access**: `Ctrl+Space` opens command palette - zero browser conflicts
- **60+ Colon Commands**: Quick shortcuts like `:n`, `:s`, `:glo`, `:t`
- **Fuzzy Search**: Intelligent command matching with parameter hints
- **VS Code-inspired**: Familiar interface for developers

#### Smart Document Management
- **Offline-First**: IndexedDB storage works completely offline
- **Full-Text Search**: Powered by Lunr.js with relevance scoring
- **Advanced Tagging**: Organize documents with flexible tag system
- **Navigator Interface**: Tabbed sidebar with Documents, Outline, and Search

#### Secure Git Integration
- **GitHub Ready**: Complete OAuth integration via Cloudflare Workers
- **Multi-Provider**: GitLab, Bitbucket, and generic Git support coming soon
- **Real-time Sync**: Bidirectional synchronization with conflict resolution
- **Visual Status**: Live sync indicators across the interface

### 🚀 Fantasy Editor Forge (Premium AI Tier)

**Coming Soon**: AI-powered writing assistance for serious writers:

- **AI Writing Assistant**: Content generation and creative suggestions
- **Grammar & Style**: Advanced language analysis and improvement
- **Smart Auto-completion**: Context-aware suggestions as you write
- **Document Insights**: AI-powered structure analysis and optimization
- **Semantic Search**: AI-powered cross-document content discovery
- **Priority Support**: Direct access to the Forgewright development team

### 🔧 Technical Excellence

#### Modern Architecture
- **Vanilla JavaScript**: Zero framework dependencies, maximum performance
- **Progressive Web App**: Offline-first with service worker caching
- **Vite 7+ Build**: Advanced code splitting and optimization
- **MIT Licensed**: Maximum freedom for personal and commercial use

#### Security & Privacy
- **Local-First**: Documents stored on your device by default
- **Secure OAuth**: PKCE-enabled authentication with token encryption
- **Privacy-Focused**: No telemetry, tracking, or data collection
- **HTTPS Everywhere**: Full TLS encryption for all communications

### 🎯 Getting Started

#### Quick Start
1. **Visit** [fantasy.forgewright.io](https://fantasy.forgewright.io)
2. **Press** `Ctrl+Space` to open command palette
3. **Create** your first document: `:n My Story`
4. **Explore** with `:h` for help, `:t dark` for themes
5. **Connect** GitHub with `:glo` for cloud sync (optional)

#### Essential Commands
- **`:n [title]`** - Create new document
- **`:s`** - Save document
- **`:65` / `:80` / `:90`** - Set editor width
- **`:t [theme]`** - Change theme
- **`:d [filter]`** - Browse documents
- **`:f [query]`** - Search all documents
- **`:ex [format]`** - Export document
- **`:glo`** - Connect GitHub

### 📈 Development Roadmap

#### Next Release (v0.0.3)
- **Code Quality**: Eliminate lint warnings, increase test coverage to 90%
- **Bundle Optimization**: Reduce size to <1.5MB
- **Mobile Enhancement**: Touch-optimized interface improvements

#### Near-term (Q4 2025)
- **Fantasy Editor Forge Launch**: AI writing assistance beta
- **Additional Git Providers**: GitLab and Bitbucket integration
- **Enhanced Conflict Resolution**: Visual diff interface
- **Settings UX**: Improved configuration experience

#### Future Vision (2026)
- **Project Gutenberg**: Research library integration
- **Collaborative Editing**: Real-time multi-user support
- **Plugin System**: Community extensions
- **Advanced AI**: Deep writing analytics and insights

### ⚖️ License & Open Source

Fantasy Editor is proudly **open source** under the **MIT License**:

- **Free Forever**: Core editing features always free
- **No Restrictions**: Use, modify, and distribute freely
- **Commercial Friendly**: Perfect for business and enterprise use
- **Community Driven**: Contributions welcome from developers worldwide

**Fantasy Editor Forge** premium features require a subscription but help fund continued development of the free core editor.

---

## 💻 For Developers

### Contributing
- **Code Style**: Clean code with <20 lines per function, <200 lines per file
- **Testing**: TDD approach with comprehensive test coverage
- **Architecture**: Modular design with defensive programming
- **Dependencies**: KISS principle with minimal external dependencies

### Technical Stats
- **Bundle Size**: 1.8MB (target: <1.5MB)
- **Test Coverage**: ~50% (target: 90%)
- **Code Quality**: 75 source files, 32k+ lines of tested code
- **Performance**: <3s Time to Interactive, >90 Lighthouse score

---

*Fantasy Editor - **Forge your story** with the power of focused writing.*

**Forgewright, Inc.**
Email: hello@forgewright.io
Website: https://forgewright.io