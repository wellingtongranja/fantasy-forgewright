# CLAUDE.md - Fantasy Editor Project Context

## 📋 Project Overview

**Fantasy Editor** is a distraction-free, keyboard-first markdown editor for writers, hosted at **forgewright.io**.

**Architecture**: Client-side PWA with GitHub storage, CodeMirror 6 editor, VS Code-style command palette

## 🎯 Core Requirements

### Current Status

- [x] Markdown editing with CodeMirror 6
- [x] VS Code-style command palette (Ctrl+Space only)
- [x] Multi-theme support (Light, Dark, Fantasy)
- [x] Offline-first PWA functionality
- [x] Full-text search and document tagging
- [x] Writer-focused UI with optimal 65ch layout
- [x] GitHub OAuth integration with automatic repository setup
- [x] **Navigator Component** - Tabbed sidebar with Documents, Outline, Search
- [x] **Auto-unhide functionality** - Mouse-triggered Navigator appearance
- [x] **RECENT/PREVIOUS document organization** - Simplified grouping system
- [x] **Editor Width & Zoom Controls** - Width presets (65ch/80ch/90ch) and zoom functionality (85%-130%)
- [x] **Document Export System** - Multi-format export (Markdown, HTML, PDF, Text) with `:ex` and `:em` commands
- [ ] Project Gutenberg integration
- [ ] Internationalization support

## 🏗️ Architecture Highlights

### Command System (VS Code-style)

- **Single trigger**: `Ctrl+Space` activates command palette
- **Zero conflicts**: No browser shortcut interference
- **Fuzzy search**: Real-time command filtering
- **Command bar**: Positioned at browser top (16px edge)
- **Layout alignment**: Title and editor share 65ch container

### Recent Improvements

- **Navigator Component** - Complete tabbed sidebar replacing legacy sidebar with Documents, Outline, and Search tabs
- **Auto-unhide System** - Mouse proximity detection (10px from left edge) with smooth animations
- **Enhanced Pin Button** - Left seven-eighths block icon (▊) with CSS border styling for clear sidebar representation
- **RECENT/PREVIOUS Organization** - Simplified document grouping without complex time-based categories
- **Smooth Animations** - 0.4s cubic-bezier transitions for polished Navigator show/hide effects
- **Integrated Commands** - `:d`, `:f`, `:l` commands with proper focus management and filtering
- **GitHub UI Integration** - Authentication button in header with user dropdown menu
- **Sync Status Indicators** - Real-time document sync status in status bar (🟢🟡🔴)
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

## 📁 Key Structure

```text
src/
├── core/                    # Business logic
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
│   ├── auth/              # GitHub authentication UI
│   └── sidebar/           # Legacy sidebar (fallback)
├── styles/                 # CSS themes & base styles
├── workers/               # Service worker + PWA
└── utils/                 # Validation, security, logging
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
| **`:f`** | `search` | `:f` or `:f query` |
| **`:fs`** | `focus search` | `:fs` |
| **`:fd`** | `focus documents` | `:fd` |
| **`:ts`** | `toggle sidebar` | `:ts` |
| **`:tag`** | `tag` | `:tag add fantasy` |

#### Editor Width and Zoom Commands
*Optimized for writer-focused editing experience*

| **`:65`** | `width 65` | `:65` |
| **`:80`** | `width 80` | `:80` |
| **`:90`** | `width 90` | `:90` |
| **`:zi`** | `zoom in` | `:zi` |
| **`:zo`** | `zoom out` | `:zo` |
| **`:zr`** | `zoom reset` | `:zr` |
| **`:ei`** | `editor info` | `:ei` |

#### Export Commands
*Writer-focused document export functionality*

| **`:ex`** | `export` | `:ex md` |
| **`:em`** | `export markdown` | `:em` |
| **`:et`** | `export text` | `:et` |
| **`:eh`** | `export html` | `:eh` |
| **`:ep`** | `export pdf` | `:ep` |

#### Search and Navigation Commands
*Enhanced document discovery and navigation*

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

| **`:sp`** | `spell check` | `:sp` |
| **`:wc`** | `word count` | `:wc` |
| **`:se`** | `settings` | `:se` |
| **`:sy`** | `sync` | `:sy` |
| **`:r`** | `refresh` | `:r` |
| **`:st`** | `statistics` | `:st` |
| **`:v`** | `version` | `:v` |

#### GitHub Integration Commands
*Aligned with standard Git aliases (st=status, pu=push, pl=pull, etc.)*

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

**Pill-shaped status labels with discrete styling:**
- 🟢 **Synced**: Document matches remote repository
- 🟡 **Out of sync**: Local changes need push to GitHub
- 🔴 **Local only**: Document never synced to GitHub
- **Hidden**: When not authenticated or not configured

**Features:**
- Real-time updates every 5 seconds
- Updates when tab regains focus
- Updates after authentication changes
- Shows repository name next to status icon

### UI Integration Details

**Responsive Design:**
- Mobile-friendly dropdown positioning
- Username truncation on smaller screens
- Proper touch targets for mobile devices

**Theme Compatibility:**
- Adapts to Light, Dark, and Fantasy themes
- Consistent styling with editor theme
- Proper contrast ratios for accessibility

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
4. Confirm Cloudflare Pages project name exacty matches workflow
5. Rollback by reverting to last working commit if needed

**Reference:** See `docs/CICD_LESSONS_LEARNED.md` for comprehensive troubleshooting guide.

---

**Fantasy Editor** - Single source of truth for development at **forgewright.io**

- Always remember that documentation files they have a specific folder: docs