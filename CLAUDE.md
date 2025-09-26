# CLAUDE.md - Fantasy Editor Development Context

## 📋 Project Overview

**Fantasy Editor** is a distraction-free, keyboard-first markdown editor for writers, hosted at **forgewright.io**.

**Architecture**: Client-side PWA with Git storage (GitHub integrated), CodeMirror 6 editor, VS Code-style command palette

**License**: MIT License with Fantasy Editor Forge Premium Tier

## 🎯 Current Status

### ⚠️ Technical Debt

- **Bundle Size**: Currently >1MB (target <5MB)
- **Test Coverage**: Need to increase coverage to >90%
- **Conflict Resolution**: Basic system exists, needs robust testing
- **Local File Handling**: Requires review and optimization

### 🚀 Next Sprint Priorities

- [ ] Document persistence system optimization
- [ ] Navigator Component improvements
- [ ] Settings Dialog enhancement
- [ ] Sync System robustness

## 🛠️ Development Principles & Standards

### Core Standards (MANDATORY)

**Clean Code Requirements:**

- **Functions**: Max 20 lines, single responsibility, descriptive names
- **Files**: Max 200 lines, focused purpose, clear imports
- **Comments**: Only business logic context, no implementation details
- **Naming**: Full words, clear intent, no abbreviations

**Test-Driven Development:**

- RED → GREEN → REFACTOR cycle mandatory
- >90% test coverage for business logic
- 100% coverage for auth, sync, commands
- Test behavior, not implementation

**Security Standards:**

- **Input validation**: All boundary functions MUST validate
- **Secret management**: Never commit secrets, use environment variables
- **Error handling**: Graceful degradation, structured error types

**Architecture Principles:**

- **KISS**: Vanilla JavaScript only (except CodeMirror 6)
- **Defensive programming**: Validate all external data
- **Offline-first**: All features work without network
- **Performance**: <3s Time to Interactive, <5MB bundle size

## 🔐 Security Standards (MANDATORY)

**Secret Management (ZERO TOLERANCE):**

- Never commit secrets to version control
- Use environment variables with VITE_ prefix
- Store client secrets only on Cloudflare Workers
- Implement pre-commit hooks to block secrets

**Input Sanitization:**

- Validate all user inputs with DOMPurify
- Multi-layer validation (type, length, content, patterns)
- Never trust external data
- Structured error handling

**OAuth Security:**

- PKCE implementation for token exchange
- Secure worker proxy for API operations
- Session-based token storage (24-hour expiration)
- Automatic token cleanup on logout

## 🏗️ Core Architecture

### Design Principles

- **Offline-First**: IndexedDB stores all documents locally first
- **Command-Centric**: Ctrl+Space is the only keyboard shortcut
- **Theme-Aware**: CSS Custom Properties for dynamic theming
- **PWA**: Service Worker handles background sync and caching

### Document Data Structure

```javascript
{
  uid: 'doc_1648125632_a1b2c3d4',
  title: 'My Fantasy Novel',
  content: '# Chapter 1\n...',
  tags: ['fantasy', 'novel'],
  metadata: {
    created: '2024-01-15T10:30:00Z',
    modified: '2024-01-15T14:45:00Z',
    words: 1250
  },
  sync: {
    status: 'synced', // synced|pending|conflict
    lastSync: '2024-01-15T14:45:00Z',
    remoteSha: 'abc123def456'
  }
}
```

*For detailed architecture documentation, see `docs/developer-guide.md`*

## 📁 Key Structure

```text
src/
├── core/                    # Business logic
│   ├── auth/               # OAuth authentication
│   ├── editor/             # CodeMirror integration
│   ├── storage/            # IndexedDB + GitHub sync
│   ├── commands/           # Command registry & handlers
│   └── themes/             # Theme management
├── components/             # UI components
│   ├── navigator/          # Tabbed sidebar
│   ├── command-bar/       # Command palette interface
│   └── status-bar/        # Status bar
├── styles/                 # CSS themes & base styles
├── workers/               # Service worker + PWA
└── utils/                 # Validation, security, logging

workers/                    # Cloudflare Workers
├── oauth-proxy.js         # OAuth proxy Worker
└── providers/             # OAuth provider implementations

docs/                      # Documentation
├── README.md             # Main documentation index
├── user-guide.md         # User guide with commands
├── developer-guide.md    # Development setup & reference
└── security-guide.md     # Security implementation guide
```

## 🎯 Command System (MANDATORY RULES)

### Command Access

Access ALL functionality via `Ctrl+Space` command palette only.

### Alias Format Rules (MANDATORY)

- ✅ ALL aliases MUST start with `:`
- ✅ Followed by 1-3 characters max
- ✅ Each shortcut maps to exactly ONE command
- ❌ NO non-colon aliases allowed

### Essential Commands

| Shortcut | Command | Usage Example |
|----------|---------|---------------|
| **`:n`** | `new` | `:n My Epic Tale` |
| **`:s`** | `save` | `:s` |
| **`:f`** | `search` | `:f magic spells` |
| **`:h`** | `help` | `:h` |
| **`:t`** | `theme` | `:t dark` |
| **`:se`** | `settings` | `:se` |

### Command Implementation Example

```javascript
{
  name: 'new',
  description: 'create a new document',
  aliases: [':n'],  // MANDATORY: colon prefix only
  parameters: [
    { name: 'title', required: false, type: 'string', description: 'Document title' }
  ],
  handler: async (args) => { /* implementation */ }
}
```

*For complete command reference, see `docs/user-guide.md`*

## 🚫 CRITICAL: Keyboard Shortcut Policy

### ABSOLUTE RULE: Ctrl+Space ONLY

**NO EXCEPTIONS** - Only `Ctrl+Space` triggers command palette.

#### Why This Matters

1. **Zero Browser Conflicts** - No overriding browser shortcuts
2. **Consistent UX** - One shortcut to remember (Ctrl+Space)
3. **Discoverable** - Find commands through fuzzy search

#### For Developers (MANDATORY)

- ✅ Add commands to registry with `:xx` aliases only
- ✅ Use descriptive names and parameter definitions
- ❌ NEVER add direct keyboard event listeners for shortcuts
- ❌ NEVER create aliases without `:` prefix

## 🐙 Git Integration

GitHub OAuth integration with automatic repository setup. Multi-provider system ready for GitLab, Bitbucket, and others.

**Key Features:**

- Header authentication button with user dropdown
- Real-time sync status indicators (synced/out-of-sync/local-only)
- Color-coded status pills for quick identification

*For complete Git integration documentation, see `docs/developer-guide.md`*

## 🎯 Performance Targets

- Bundle size: < 5MB gzipped
- First Paint: < 1.5s
- Time to Interactive: < 3s
- Test coverage: > 90%
- WCAG 2.1 AA compliance

## 📄 License Information

**Fantasy Editor** is licensed under the MIT License with Fantasy Editor Forge premium tier.

### Key License Points

- **Open Source**: MIT License provides maximum freedom for personal and commercial use
- **Free Core**: Fantasy Editor core features remain free forever
- **Premium AI**: Fantasy Editor Forge adds AI-powered writing assistance via subscription

*For complete license details, see `docs/user-guide.md`*

---

**Fantasy Editor** - Single source of truth for development at **forgewright.io**
