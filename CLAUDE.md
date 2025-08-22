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
- [ ] GitHub OAuth integration
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

- Unified command interface (removed dual inputs)
- Perfect document title/editor alignment
- Status bar with three-column layout
- Theme-aware notifications
- Mobile responsive design

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

## 🎯 Available Commands

Access all functionality via `Ctrl+Space` command palette:

```bash
# Document Management
new [title]           # create new document
save                  # save current document  
open [filter]         # open document with search

# Search & Organization  
search <query>        # search all documents
tag add <name>        # add tag to document
tag list              # show all document tags

# Navigation & Interface
focus search          # focus sidebar search
focus documents       # focus document list
theme <name>          # switch theme (light|dark|fantasy)
help [command]        # show command help
```

## 🚫 CRITICAL: Keyboard Shortcut Policy

### ABSOLUTE RULE: Ctrl+Space ONLY

**NO EXCEPTIONS** - Only `Ctrl+Space` is allowed as a direct keyboard shortcut.

#### ❌ FORBIDDEN SHORTCUTS

Never implement these (they conflict with browsers):

- `Ctrl+K`, `Ctrl+F`, `Ctrl+E`, `Ctrl+L`, `Ctrl+T`, `Ctrl+N`, `Ctrl+R`, `Ctrl+H`
- ANY other Ctrl combinations

#### ✅ CORRECT APPROACH

All functionality through command palette:

```bash
Ctrl+Space → "focus search"      # Instead of Ctrl+F
Ctrl+Space → "new My Document"   # Instead of Ctrl+N
Ctrl+Space → "search dragons"    # Instead of Ctrl+F
```

#### WHY THIS MATTERS

1. **Zero Browser Conflicts** - No overriding browser shortcuts
2. **Consistent UX** - One shortcut to remember
3. **Discoverable** - Find commands through fuzzy search
4. **Professional** - Matches VS Code patterns

#### FOR DEVELOPERS

- ✅ Add commands to registry, use descriptive names
- ❌ NEVER add direct keyboard event listeners
- ❌ NEVER use `addEventListener('keydown')` for shortcuts

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
