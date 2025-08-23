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

- **GitHub OAuth Integration** - Secure authentication with automatic private repository creation
- **Backend API Proxy** - CORS-free GitHub API access with Express server
- **Document Synchronization** - Bidirectional sync between local IndexedDB and GitHub
- **Command System Enhancement** - All GitHub operations via colon shortcuts
- **YAML Front Matter** - Proper document metadata in GitHub storage
- **Automatic Repository Setup** - Zero-configuration GitHub integration upon login

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
│   ├── editor/             # CodeMirror integration
│   ├── storage/            # IndexedDB + GitHub sync
│   ├── search/             # Full-text search + tags
│   └── themes/             # Theme management
├── components/             # UI components
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
| **`:d`** | `documents` | `:d` |
| **`:fs`** | `focus search` | `:fs` |
| **`:fd`** | `focus documents` | `:fd` |
| **`:ts`** | `toggle sidebar` | `:ts` |
| **`:tag`** | `tag` | `:tag add fantasy` |

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

## 🚀 Next Sprint Priorities

- [ ] IndexedDB storage implementation
- [ ] Document persistence system  
- [ ] GitHub OAuth integration
- [ ] Project Gutenberg integration
- [ ] Text-to-speech capabilities
- [ ] Internationalization (i18n)

## 🎯 Performance Targets

- Bundle size: < 1MB gzipped
- First Paint: < 1.5s  
- Time to Interactive: < 3s
- Test coverage: > 90%
- WCAG 2.1 AA compliance

---

**Fantasy Editor** - Single source of truth for development at **forgewright.io**

- Always remember that documentation files they have a specific folder: docs