# CLAUDE.md - Fantasy Editor Project Context

## 📋 Project Overview

**Fantasy Editor** is a distraction-free, keyboard-first markdown editor for writers, hosted at **forgewright.io**.

**Architecture**: Client-side PWA with GitHub storage, CodeMirror 6 editor, VS Code-style command palette

**License**: GNU Affero General Public License v3 (AGPL-3.0)

## 🎯 Core Requirements

### Current Status (Updated: January 2025)

#### ✅ Completed Features
- [x] Markdown editing with CodeMirror 6
- [x] VS Code-style command palette (Ctrl+Space only)
- [x] Theme support (Light, Dark modes)
- [x] Custom theme configuration via Settings Dialog
- [x] Offline-first PWA functionality
- [x] Full-text search and document tagging
- [x] Writer-focused UI with optimal 65ch layout
- [x] GitHub OAuth integration with automatic repository setup
- [x] Editor Width & Zoom Controls - Width presets (65ch/80ch/90ch) and zoom functionality (85%-130%)
- [x] Document Export System - Multi-format export (Markdown, HTML, PDF, Text) with `:ex` and `:em` commands

#### 🚧 In Progress / Needs Improvement
- [ ] **Fantasy Theme** - Not yet implemented (only Light/Dark + custom theme exist)
- [ ] **Navigator Component** - Basic implementation exists, needs refinement
- [ ] **Settings Dialog** - Functional but requires UX enhancements
- [ ] **Sync Status Indicators** - Implemented but needs review and fixes
- [ ] **Conflict Resolution** - Basic system exists, needs robust testing and improvements
- [ ] **Local File Handling** - Requires review and optimization
- [ ] **Merge Functionality** - Needs comprehensive review

#### 📋 Planned Features
- [ ] Multi-Provider OAuth System (GitLab, Bitbucket, generic Git)
- [ ] Project Gutenberg integration
- [ ] Internationalization support

#### ⚠️ Technical Debt
- **Bundle Size**: Currently >1MB (target relaxed to <3MB, needs optimization)
- **Test Coverage**: Need to increase coverage to >90%
- **Mobile Experience**: Functional but not optimized

## 🏗️ Architecture Highlights

### Command System (VS Code-style)

- **Single trigger**: `Ctrl+Space` activates command palette
- **Zero conflicts**: No browser shortcut interference
- **Fuzzy search**: Real-time command filtering with exact alias matching
- **Command bar**: Positioned at browser top (16px edge)
- **Layout alignment**: Title and editor share 65ch container

### Recent Improvements

- **Status Bar Layout** - Reorganized with sync status prominently positioned before app version
- **Unified Sync Indicator** - Combined red indicator and status text in single container with color-coded states
- **Command Filtering Enhancement** - Fixed `:sp` filtering to show only spell check, not save command
- **Navigator Component** - Complete tabbed sidebar replacing legacy sidebar with Documents, Outline, and Search tabs
- **Auto-unhide System** - Mouse proximity detection (10px from left edge) with smooth animations
- **Enhanced Pin Button** - Left seven-eighths block icon (▊) with CSS border styling for clear sidebar representation
- **RECENT/PREVIOUS Organization** - Simplified document grouping without complex time-based categories
- **Smooth Animations** - 0.4s cubic-bezier transitions for polished Navigator show/hide effects
- **Integrated Commands** - `:d`, `:f`, `:l` commands with proper focus management and filtering
- **GitHub UI Integration** - Authentication button in header with user dropdown menu
- **Document Synchronization** - Bidirectional sync between local IndexedDB and GitHub
- **Command System Enhancement** - All GitHub operations via colon shortcuts
- **Editor Width & Zoom Controls** - Dynamic width presets (65ch/80ch/90ch) and zoom functionality (85%-130%)
- **Document Export System** - Multi-format export capabilities (Markdown, HTML, PDF, Text) with streamlined commands

## 🛠️ Development Standards

### Core Principles

- **TDD**: RED → GREEN → REFACTOR cycle
- **KISS**: Vanilla JS, minimal dependencies (< 10)
- **Clean Code**: Max 20 lines/function, 200 lines/file
- **Defensive**: Input validation, graceful error handling
- **Security**: Never commit secrets, validate all inputs
- **License Compliance**: AGPL-3.0 - Ensure network service compliance

## 📁 Key Structure

```text
src/
├── core/                    # Business logic
│   ├── auth/               # OAuth authentication
│   │   ├── auth-manager.js # Multi-provider OAuth manager
│   │   └── github-auth.js  # GitHub-specific auth (legacy)
│   ├── editor/             # CodeMirror integration & width/zoom controls
│   │   ├── editor.js       # Main editor manager
│   │   └── width-manager.js # Width presets & zoom functionality
│   ├── storage/            # IndexedDB + GitHub sync
│   ├── search/             # Full-text search + tags
│   ├── commands/           # Command registry & handlers
│   ├── export/             # Document export functionality
│   └── themes/             # Theme management
├── components/             # UI components
│   ├── navigator/          # Tabbed sidebar (Documents/Outline/Search)
│   │   ├── tabs/          # Individual tab components
│   │   └── utils/         # Navigator utilities (outline parser)
│   ├── command-bar/       # Command palette interface
│   ├── command-bar-v2/    # Enhanced command system with SearchEngine
│   ├── auth/              # GitHub authentication UI
│   ├── status-bar/        # Status bar with unified sync indicators
│   └── sidebar/           # Legacy sidebar (fallback)
├── styles/                 # CSS themes & base styles
├── workers/               # Service worker + PWA
└── utils/                 # Validation, security, logging

workers/                    # Cloudflare Workers (OAuth proxy)
├── oauth-proxy.js         # Main OAuth proxy Worker
├── providers/             # OAuth provider implementations
│   ├── base-provider.js  # Abstract base class
│   ├── github.js         # GitHub OAuth provider
│   ├── gitlab.js         # GitLab OAuth provider
│   ├── bitbucket.js      # Bitbucket OAuth provider
│   └── generic-git.js    # Generic Git provider
└── wrangler.toml         # Cloudflare Worker configuration

docs/                      # Documentation (simplified structure)
├── README.md             # Main documentation index
├── help.md              # User guide with essential commands
├── github-integration.md # Complete GitHub/OAuth guide
├── architecture.md      # System architecture
├── testing.md           # Testing strategy
├── security.md          # Security implementation
├── deployment.md        # Deployment & troubleshooting guide
├── dev-helpers.md       # Development utilities
├── release-notes.md     # Version history
├── privacy-policy.md    # Privacy policy
├── license-agpl.md      # AGPL-3.0 license
├── license-commercial.md # Commercial license option
└── eula.md              # End User License Agreement
```

## 🎯 Command System (MANDATORY RULES)

### Command Access
Access ALL functionality via `Ctrl+Space` command palette only.

### Colon Shortcuts (MANDATORY FORMAT)
ALL command aliases MUST use colon prefix followed by 1-3 characters:

| Shortcut | Command | Usage Example |
|----------|---------|---------------|
| **`:n`** | `new` | `:n My Epic Tale` |
| **`:s`** | `save` | `:s` |
| **`:o`** | `open` | `:o dragon` |
| **`:f`** | `search` | `:f magic spells` |
| **`:t`** | `theme` | `:t dark` |
| **`:tt`** | `toggle theme` | `:tt` |
| **`:i`** | `info` | `:i` |
| **`:h`** | `help` | `:h` |
| **`:d`** | `documents` | `:d` or `:d filter` |
| **`:l`** | `outline` | `:l` |
| **`:fs`** | `focus search` | `:fs` |
| **`:fd`** | `focus documents` | `:fd` |
| **`:ts`** | `toggle sidebar` | `:ts` |
| **`:tag`** | `tag` | `:tag add fantasy` |

#### Editor Width and Zoom Commands
*Optimized for writer-focused editing experience*

| Shortcut | Command | Usage Example |
|----------|---------|---------------|
| **`:65`** | `width 65` | `:65` |
| **`:80`** | `width 80` | `:80` |
| **`:90`** | `width 90` | `:90` |
| **`:zi`** | `zoom in` | `:zi` |
| **`:zo`** | `zoom out` | `:zo` |
| **`:zr`** | `zoom reset` | `:zr` |
| **`:ei`** | `editor info` | `:ei` |

#### Export Commands
*Writer-focused document export functionality*

| Shortcut | Command | Usage Example |
|----------|---------|---------------|
| **`:ex`** | `export` | `:ex md` |
| **`:em`** | `export markdown` | `:em` |
| **`:et`** | `export text` | `:et` |
| **`:eh`** | `export html` | `:eh` |
| **`:ep`** | `export pdf` | `:ep` |

#### Search and Navigation Commands
*Enhanced document discovery and navigation*

| Shortcut | Command | Usage Example |
|----------|---------|---------------|
| **`:fs`** | `focus search` | `:fs` |
| **`:fd`** | `focus documents` | `:fd` |
| **`:ts`** | `toggle sidebar` | `:ts` |
| **`:fo`** | `filter open` | `:fo` |
| **`:fu`** | `filter untagged` | `:fu` |
| **`:fal`** | `filter all` | `:fal` |
| **`:ual`** | `untag all` | `:ual` |
| **`:fl`** | `filter list` | `:fl` |
| **`:sr`** | `sort recent` | `:sr` |
| **`:fa`** | `filter archived` | `:fa` |

#### System and Utility Commands
*Editor configuration and system functions*

| Shortcut | Command | Usage Example |
|----------|---------|---------------|
| **`:sp`** | `spell check` | `:sp` |
| **`:wc`** | `word count` | `:wc` |
| **`:se`** | `settings` | `:se` |
| **`:sy`** | `sync` | `:sy` |
| **`:r`** | `refresh` | `:r` |
| **`:st`** | `statistics` | `:st` |
| **`:v`** | `version` | `:v` |

#### GitHub Integration Commands
*Aligned with standard Git aliases (st=status, pu=push, pl=pull, etc.)*

| Shortcut | Command | Usage Example |
|----------|---------|---------------|
| **`:gst`** | `github status` | `:gst` |
| **`:glo`** | `github login` | `:glo` |
| **`:gou`** | `github logout` | `:gou` |
| **`:gcf`** | `github config` | `:gcf owner repo` |
| **`:gpu`** | `github push` | `:gpu` |
| **`:gsy`** | `github sync` | `:gsy` |
| **`:gls`** | `github list` | `:gls` |
| **`:gpl`** | `github pull` | `:gpl filename` |
| **`:gim`** | `github import` | `:gim https://github.com/...` |
| **`:gin`** | `github init` | `:gin` |

### Command System Rules (MANDATORY)

#### 1. **Alias Format Rules**
- ✅ ALL aliases MUST start with `:` 
- ✅ Followed by 1-3 characters max
- ✅ Each shortcut maps to exactly ONE command
- ❌ NO non-colon aliases allowed

#### 2. **Dropdown Behavior**
- When user types `:n` → Show ONLY `new` command
- When user types `:n My Story` → Show `new` command with parameters
- Each colon shortcut is unique and unambiguous
- **Fixed**: `:sp` now shows only spell check, not save command

#### 3. **Parameter Display**
- Show parameters in italics: `new <em>[title] Document title</em>`
- Required parameters: `<name>`
- Optional parameters: `[name]`
- Include parameter descriptions

#### 4. **UI/UX Requirements**
- Command bar appears at browser top (16px from edge)
- Click outside or ESC hides command bar
- Arrow keys navigate command list
- Enter executes selected command
- Always return focus to editor after execution

## 🚫 CRITICAL: Keyboard Shortcut Policy

### ABSOLUTE RULE: Ctrl+Space ONLY

**NO EXCEPTIONS** - Only `Ctrl+Space` triggers command palette.

#### ❌ FORBIDDEN SHORTCUTS
- `Ctrl+K`, `Ctrl+F`, `Ctrl+E`, `Ctrl+L`, `Ctrl+T`, `Ctrl+N`, `Ctrl+R`, `Ctrl+H`
- ANY other direct keyboard shortcuts

#### ✅ CORRECT APPROACH
```bash
Ctrl+Space → ":fs"           # Focus search
Ctrl+Space → ":n My Story"   # Create document  
Ctrl+Space → ":f dragons"    # Search documents
```

#### WHY THIS MATTERS
1. **Zero Browser Conflicts** - No overriding browser shortcuts
2. **Consistent UX** - One shortcut to remember (Ctrl+Space)
3. **Discoverable** - Find commands through fuzzy search
4. **Efficient** - Colon shortcuts provide quick access

#### FOR DEVELOPERS (MANDATORY)
- ✅ Add commands to registry with `:xx` aliases only
- ✅ Use descriptive names and parameter definitions
- ✅ All colon shortcuts must be 2-3 characters (`:n`, `:tt`, `:fs`)
- ✅ Test command parsing with and without parameters
- ❌ NEVER add direct keyboard event listeners for shortcuts
- ❌ NEVER use `addEventListener('keydown')` for application shortcuts
- ❌ NEVER create aliases without `:` prefix
- ❌ NEVER create duplicate colon shortcuts

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

## 🐙 GitHub Integration UI

Fantasy Editor provides a complete GitHub integration experience with visual feedback and seamless authentication.

### GitHub Authentication Button (Header - Top-right)

**When not signed in:**
- "Sign in with GitHub" button with GitHub icon
- Clicking redirects to GitHub OAuth authorization

**When signed in:**
- Shows user avatar, username, and dropdown arrow
- Click to open user dropdown menu

### GitHub User Dropdown Menu

**Repository Information:**
- Current configured repository name
- "Not configured" if no repository set up
- Hint to use `:gcf` (GitHub Configure) command

**Menu Actions:**
- **Sign out** - Log out from GitHub
- **Help** - Show GitHub command documentation

### Sync Status Indicators (Status Bar - Bottom-right)

**Unified status container with color-coded pill styling:**
- 🟢 **synced**: Document matches remote repository (green background)
- 🟡 **out-of-sync**: Local changes need push to GitHub (yellow background)
- 🔴 **local-only**: Document never synced to GitHub (red background)
- **Hidden**: When not authenticated or not configured

**Enhanced Features:**
- **Unified container**: Icon and text in same pill-shaped container
- **Color-coded backgrounds**: Green/yellow/red backgrounds for quick status identification
- **Proper positioning**: Sync status appears before app version for better information hierarchy
- **Real-time updates**: Updates every 5 seconds and when tab regains focus
- **Repository integration**: Shows repository name next to status when applicable

### UI Integration Details

**Responsive Design:**
- Mobile-friendly dropdown positioning
- Username truncation on smaller screens
- Proper touch targets for mobile devices
- Status bar adapts to mobile layout while maintaining sync status prominence

**Theme Compatibility:**
- Adapts to Light, Dark, and Fantasy themes
- Consistent styling with editor theme
- Proper contrast ratios for accessibility

## 🔐 Multi-Provider OAuth System

Fantasy Editor implements a secure, provider-agnostic OAuth system supporting multiple Git providers through a Cloudflare Worker proxy.

### OAuth Architecture

**Core Components:**
- **AuthManager** (`src/core/auth/auth-manager.js`) - Provider-agnostic authentication manager
- **OAuth Worker** (`workers/oauth-proxy.js`) - Secure Cloudflare Worker proxy for token exchange
- **Provider Implementations** - GitHub, GitLab, Bitbucket, and generic Git support

### Security Features

**Token Security:**
- Client secrets stored only on Cloudflare Worker (never exposed to client)
- PKCE (Proof Key for Code Exchange) implementation
- Session-based token storage (24-hour expiration)
- Automatic token cleanup on logout

**Origin Validation:**
- Strict origin checking (only `fantasy.forgewright.io` allowed)
- User-Agent validation
- CORS properly configured
- No custom domain exposure (uses workers.dev subdomain)

### OAuth Flow

1. **Initiation**: User clicks "Sign in with GitHub"
2. **Authorization**: Redirect to provider with PKCE challenge
3. **Token Exchange**: Worker exchanges code for access token
4. **Session**: Token stored securely, user authenticated
5. **Auto-setup**: Repository automatically configured

### Configuration

**Production Worker URL:**
```
https://fantasy-oauth-proxy.wellington-granja.workers.dev
```

**Environment Variables (Cloudflare Dashboard):**
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID (regular variable)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret (encrypted)
- `CORS_ORIGIN` - `https://fantasy.forgewright.io`
- `OAUTH_REDIRECT_URI` - `https://fantasy.forgewright.io/`

### API Operations

All GitHub API operations are proxied through the Worker for security:
```javascript
// Repository operations
await authManager.makeAuthenticatedRequest('fetchRepositories')

// Direct API proxy (GitHub Storage compatibility)
await authManager.makeAuthenticatedRequest('/repos/owner/repo/contents/file.md')
```

**Supported Operations:**
- Repository listing and creation
- File reading and writing
- Branch operations
- User information fetching

### Development Setup

For local development with OAuth:
1. Create development GitHub OAuth app (callback: `http://localhost:3000/`)
2. Configure `.dev.vars` with client ID and secret
3. Run Worker locally: `npx wrangler dev --env dev`

See `docs/github-integration.md` for complete OAuth documentation.

## ✏️ Editor Width and Zoom Controls

Fantasy Editor provides comprehensive width and zoom controls optimized for writer-focused editing experiences.

### Width Presets

**Three Optimized Widths:**
- **65ch** - Optimal reading width for comfortable text consumption
- **80ch** - Standard coding width for balanced line length
- **90ch** - Wide editing width for maximum content visibility

**Features:**
- Instant switching via `:65`, `:80`, `:90` commands
- CSS transitions for smooth visual changes
- Responsive behavior on mobile (auto-adjusts to 100% width)
- localStorage persistence across sessions

### Zoom Functionality

**Dynamic Font Size Control:**
- **Zoom Range**: 85% - 130% in discrete steps
- **Commands**: `:zi` (zoom in), `:zo` (zoom out), `:zr` (reset to 100%)
- **Increments**: 85%, 100%, 115%, 130%

**Technical Implementation:**
- CodeMirror-native font size changes (not CSS scaling)
- Dynamic theme regeneration with computed pixel values
- Immediate visual feedback with toast notifications
- Preserved zoom levels across editor theme changes

### Editor Configuration

**Information Display:**
- `:ei` command shows current width and zoom settings
- Available width options and current selection
- Zoom percentage and range information
- Quick reference for all available controls

**Integration:**
- Seamless coordination with theme system
- Mobile-responsive width behavior
- Persistent user preferences via localStorage
- Smooth animations and visual feedback

## 📤 Document Export System

Fantasy Editor provides comprehensive document export capabilities for various publishing workflows.

### Supported Export Formats

**Multiple Output Formats:**
- **Markdown (.md)** - Preserve original formatting and structure
- **Plain Text (.txt)** - Clean text without formatting
- **HTML (.html)** - Web-ready formatted output  
- **PDF (.pdf)** - Print-ready document format

### Export Commands

**Quick Export:**
- **`:ex [format]`** - Export to specified format (md, txt, html, pdf)
- **`:em`** - Direct Markdown export shortcut
- **`:ex`** - Show available export formats

**Features:**
- Automatic filename generation based on document title
- Browser download integration for seamless file saving
- Format validation with helpful error messages
- Export status feedback via toast notifications

### Technical Integration

**Export Manager:**
- Dedicated ExportManager class for format handling
- Support detection and validation system
- Consistent API across all export formats
- Error handling and user feedback integration

**Writer Workflow:**
- One-command export process from editor
- No interruption to writing flow
- Immediate download without additional dialogs
- Support for untitled documents with fallback naming

## 🧭 Navigator Component

Fantasy Editor features a comprehensive Navigator component that replaces the traditional sidebar with a modern, tabbed interface.

### Navigator Architecture

**Three Primary Tabs:**
- **Documents** - RECENT/PREVIOUS organization with filtering capability
- **Outline** - Live document structure with clickable navigation
- **Search** - Full-text search across all documents with discrete results

### Auto-unhide System

**Smart Proximity Detection:**
- **Left edge trigger** - Mouse within 10px of browser left edge
- **Instant show** - Navigator slides in with smooth animation
- **Auto-hide delay** - 1-second delay after mouse leaves Navigator area
- **Pin state respect** - No auto-hide when Navigator is pinned

### Pin Button Design

**Enhanced Visual Representation:**
- **Icon**: Left seven-eighths block (▊) representing sidebar panel
- **CSS styling**: Border with hover effects for button-like appearance
- **States**: Default, hover, and active/pinned visual feedback
- **Position**: Top-right corner of Navigator for easy access

### Document Organization

**RECENT Section:**
- Shows 3 most recently accessed documents
- Based on actual user interaction (opening documents)
- Excludes documents shown in PREVIOUS to avoid duplication

**PREVIOUS Section:**
- All other documents sorted by modification date (newest first)
- Clean, simple organization without complex time-based grouping

### Animation System

**Smooth Transitions:**
- **Duration**: 0.4s for balanced responsiveness and smoothness
- **Easing**: cubic-bezier(0.25, 0.46, 0.45, 0.94) for natural motion
- **Coordinated**: Navigator slide and content shift move in harmony
- **Opacity fades**: Polished appearance/disappearance effects

### Command Integration

**Navigator Commands:**
- **`:d [filter]`** - Open Documents tab with optional filtering, focus on search input
- **`:l`** - Open Outline tab for document structure navigation  
- **`:f [query]`** - Open Search tab with optional query, focus on search input

**Focus Management:**
- Commands automatically focus appropriate input fields
- Seamless keyboard workflow integration
- Maintains editor focus after Navigator operations

### Technical Features

**Responsive Design:**
- Mobile-friendly interaction patterns
- Touch-optimized controls and spacing
- Proper viewport handling for different screen sizes

**Performance:**
- Lazy-loaded tab components for faster initialization
- Efficient document filtering and search algorithms
- Minimal DOM manipulation for smooth interactions

**Accessibility:**
- ARIA labels and roles for screen readers
- Keyboard navigation support
- High contrast ratios across all themes

## 🚀 Next Sprint Priorities

- [ ] Document persistence system  
- [ ] Project Gutenberg integration
- [ ] Text-to-speech capabilities
- [ ] Internationalization (i18n)

## 🎯 Performance Targets

- Bundle size: < 1MB gzipped
- First Paint: < 1.5s  
- Time to Interactive: < 3s
- Test coverage: > 90%
- WCAG 2.1 AA compliance

## 🚨 CI/CD Deployment Lessons Learned

### Critical Deployment Requirements

**Node.js Version:** MANDATORY Node.js 20+ (Vite 7+ compatibility)
- ❌ Node.js 18 causes build failures in production
- ✅ Update all CI workflows to `node-version: '20'`

**Environment Configuration:** GitHub Environments Required
- ❌ Repository secrets alone insufficient for Cloudflare Pages
- ✅ Create GitHub environment: `fantasy.forgewright.io` 
- ✅ Store all secrets in environment, not repository

**Project Naming:** Exact Match Required
- ❌ `fantasy-editor` (incorrect project name)
- ✅ `fantasy-forgewright` (actual Cloudflare Pages project)

### Security & Dependencies

**npm Audit Failures:**
- Remove `bundlesize` package completely if vulnerabilities block CI
- Update dependencies like `jspdf` to latest secure versions
- Make Husky optional: `"prepare": "husky install || exit 0"`

**SAST Scan Issues:**
- Add `fetch-depth: 0` to ALL checkout actions in workflows
- Shallow git clones cause CodeQL and security scanning failures

### Build Configuration Pitfalls

**CSS Import Strategy:**
- ❌ Dynamic CSS loading with hardcoded paths fails in production
- ✅ Use static imports: `import './component.css'` at top of JS files
- ❌ Never use `injectStyles()` methods for production builds

**Service Worker Conflicts:**
- ❌ Manual SW registration + VitePWA causes conflicts
- ✅ Remove custom `registerServiceWorker()` methods
- ✅ Let VitePWA handle service worker generation exclusively

**Vite Chunk Splitting:**
- ❌ Manual chunk configuration can cause runtime initialization errors
- ✅ Let Vite auto-handle dependency chunking for stability
- ❌ Avoid complex `manualChunks` configurations

### Runtime Production Issues

**JavaScript Initialization:**
- "Cannot access uninitialized variable" usually indicates module order issues
- Prefer dynamic imports for lazy-loaded components
- Test production builds locally with `npm run build && npm run preview`

**Environment Variables:**
- Remove `NODE_ENV=production` from .env.production (Vite sets automatically)
- Prefix all custom variables with `VITE_` for client-side access
- Different handling between development and production builds

### Deployment Quick Checklist

**Pre-Deployment Verification:**
- [ ] Node.js 20+ in all workflows
- [ ] GitHub environment configured with all secrets
- [ ] Correct Cloudflare Pages project name
- [ ] No manual CSS loading in components
- [ ] Single service worker registration source
- [ ] Production build tested locally

**Common Failure Points:**
1. **Security scan fails** → Check `fetch-depth: 0` in workflows
2. **npm audit blocks** → Remove vulnerable packages, update dependencies  
3. **Build fails in CI** → Verify Node.js 20+ requirement
4. **CSS broken in production** → Replace dynamic CSS imports with static imports
5. **Service Worker errors** → Remove duplicate SW registrations
6. **Runtime JS errors** → Simplify Vite chunk configuration

### Recovery Strategies

**When Deployment Fails:**
1. Check GitHub Actions logs for specific error patterns
2. Test build locally: `NODE_ENV=production npm run build`
3. Verify environment variables match between local and CI
4. Confirm Cloudflare Pages project name exactly matches workflow
5. Rollback by reverting to last working commit if needed

**Reference:** See `docs/deployment.md` for comprehensive troubleshooting guide.

## 🚀 Development Roadmap (Q1 2025)

### Phase 1: Core Stabilization (Weeks 1-2)

#### 1.1 Fantasy Theme Implementation
**Approach**: TDD with visual regression testing
- [ ] Design color palette (parchment, aged paper, medieval tones)
- [ ] Write theme tests first (contrast ratios, WCAG compliance)
- [ ] Implement CSS variables for Fantasy theme
- [ ] Test with all UI components
- [ ] Add theme preview in Settings Dialog

#### 1.2 Bundle Size Optimization
**Target**: <3MB gzipped (currently >1MB)
- [ ] Analyze bundle with `npm run bundle-analyzer`
- [ ] Implement code splitting for non-critical features
- [ ] Lazy load heavy dependencies (jspdf, html2canvas)
- [ ] Tree-shake unused CodeMirror extensions
- [ ] Optimize image assets and fonts

### Phase 2: Component Enhancement (Weeks 3-4)

#### 2.1 Navigator Component Improvements
**Principles**: KISS, defensive programming
- [ ] Write unit tests for current Navigator behavior
- [ ] Fix keyboard navigation issues
- [ ] Improve document filtering performance
- [ ] Add document sorting options
- [ ] Enhance outline parser for better markdown support
- [ ] Implement virtual scrolling for large document lists

#### 2.2 Settings Dialog Enhancement
**Focus**: UX and accessibility
- [ ] Add theme preview panel
- [ ] Implement settings validation
- [ ] Add import/export settings functionality
- [ ] Improve mobile responsiveness
- [ ] Add keyboard shortcuts configuration

### Phase 3: Sync System Robustness (Weeks 5-6)

#### 3.1 Conflict Resolution Review
**Approach**: Defensive programming with comprehensive testing
- [ ] Write extensive conflict scenario tests
- [ ] Implement three-way merge algorithm
- [ ] Add visual diff interface
- [ ] Create conflict resolution strategies (auto/manual)
- [ ] Add conflict prevention mechanisms

#### 3.2 Status Indicators Fix
**Requirements**: Real-time, accurate status
- [ ] Review current status detection logic
- [ ] Fix race conditions in status updates
- [ ] Add debouncing for status changes
- [ ] Implement retry logic with exponential backoff
- [ ] Add detailed sync logs for debugging

#### 3.3 Local File Handling Optimization
**Goals**: Performance and reliability
- [ ] Optimize IndexedDB queries
- [ ] Implement file chunking for large documents
- [ ] Add compression for stored documents
- [ ] Create backup/restore functionality
- [ ] Add data migration system

### Development Standards for Each Phase

#### Test-Driven Development (TDD)
1. **RED**: Write failing test for new feature/fix
2. **GREEN**: Implement minimal code to pass test
3. **REFACTOR**: Clean up while keeping tests green
4. **Coverage**: Maintain >90% test coverage

#### Code Quality Standards
- **Functions**: Max 20 lines, single responsibility
- **Files**: Max 200 lines, focused purpose
- **Complexity**: Cyclomatic complexity <10
- **Documentation**: JSDoc for all public APIs

#### Progressive Web App (PWA) Principles
- **Offline-first**: All features work without network
- **Performance**: <3s Time to Interactive
- **Responsive**: Mobile-first design approach
- **Installable**: Full PWA manifest compliance

#### Security & Defensive Programming
- **Input Validation**: Sanitize all user inputs
- **Error Boundaries**: Graceful error handling
- **Rate Limiting**: Prevent API abuse
- **CSP Headers**: Strict content security policy

### Success Metrics

#### Performance
- [ ] Bundle size <3MB gzipped
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] Lighthouse score >90

#### Quality
- [ ] Test coverage >90%
- [ ] 0 critical/high security vulnerabilities
- [ ] WCAG 2.1 AA compliance
- [ ] No memory leaks

#### User Experience
- [ ] Sync conflicts reduced by 50%
- [ ] Settings changes apply instantly
- [ ] Navigator responds in <100ms
- [ ] Fantasy theme user satisfaction >80%

## 📄 License Information

**Fantasy Editor** is licensed under the GNU Affero General Public License v3 (AGPL-3.0).

### Key License Points

- **Source Code**: Must be made available to users of the network service
- **Copyleft**: Derivative works must also be licensed under AGPL-3.0
- **Network Use**: Users accessing Fantasy Editor over a network have the right to receive the complete source code
- **Commercial Use**: Separate commercial license available (see `docs/license-commercial.md`)

### License Files

- **Primary License**: `docs/license-agpl.md` - Full AGPL-3.0 text
- **Commercial Option**: `docs/license-commercial.md` - Commercial licensing terms
- **EULA**: `docs/eula.md` - End User License Agreement

### Important Notes

- Fantasy Editor is NOT under MIT license
- Network deployment requires AGPL compliance
- Users have the right to request source code
- See `docs/license-agpl.md` for complete terms

---

**Fantasy Editor** - Single source of truth for development at **forgewright.io**

Documentation is organized in the `docs/` directory with a simplified, flat structure for better maintainability.