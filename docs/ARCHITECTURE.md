# System Architecture - Fantasy Editor

## 🏗️ Architecture Overview

Fantasy Editor is built as a Progressive Web Application (PWA) with a client-side first architecture, emphasizing offline-first functionality, conflict-free keyboard shortcuts, and seamless GitHub integration.

## 📐 High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Device   │    │   Cloudflare     │    │   GitHub API    │
│                 │    │   (Edge + CDN)   │    │                 │
│  ┌───────────┐  │    │                  │    │  ┌───────────┐  │
│  │ PWA Shell │◄─┼────┤  Security Headers│    │  │Repository │  │
│  │           │  │    │  WAF Protection  │    │  │ Storage   │  │
│  │ IndexedDB │  │    │  Static Assets   │    │  └───────────┘  │
│  └───────────┘  │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        └────── Offline Mode ────┘                        │
                                                           │
        ┌─────────────────┐    ┌──────────────────┐      │
        │ Service Worker  │    │   Project        │      │
        │                 │    │   Gutenberg API  │      │
        │ Background Sync │    │                  │      │
        │ Cache Strategy  │    │  ┌───────────┐   │      │
        └─────────────────┘    │  │Book Data  │   │      │
                               │  │& Quotes   │   │      │
                               │  └───────────┘   │      │
                               └──────────────────┘      │
                                                         │
                               ┌──────────────────┐      │
                               │   Sync Manager   │◄─────┘
                               │                  │
                               │ Conflict         │
                               │ Resolution       │
                               └──────────────────┘
```

## 🎯 Core Design Principles

### 1. Offline-First Architecture

- **Local Storage Priority**: IndexedDB stores all documents locally first
- **Background Sync**: Service Worker handles sync when connectivity returns
- **Conflict Resolution**: Three-way merge algorithm for conflicting changes
- **Graceful Degradation**: Full functionality available offline

### 2. Command-Centric Interface

- **Single Entry Point**: Ctrl+Space is the only keyboard shortcut
- **Zero Browser Conflicts**: No interference with browser shortcuts
- **Fuzzy Search**: Real-time command filtering and execution
- **Extensible Registry**: Easy addition of new commands

### 3. Theme-Aware Design

- **CSS Custom Properties**: Dynamic theming system
- **Component Consistency**: All UI elements respect current theme
- **Performance Optimized**: Minimal reflow on theme switches
- **Accessibility First**: High contrast and readable themes

## 🏛️ Component Architecture

### Core Modules

```
src/
├── core/                           # Business Logic Layer
│   ├── commands/                   # Command System
│   │   ├── command-registry.js     # Central command registry
│   │   ├── core-commands.js        # Built-in commands  
│   │   └── command-executor.js     # Command execution engine
│   │
│   ├── editor/                     # Editor Integration
│   │   ├── editor.js               # CodeMirror wrapper
│   │   ├── shortcuts.js            # Keyboard handling (Ctrl+Space only)
│   │   └── markdown-extensions.js  # Custom markdown features
│   │
│   ├── storage/                    # Data Persistence
│   │   ├── storage-manager.js      # Unified storage interface
│   │   ├── indexeddb-manager.js    # Local storage implementation
│   │   ├── github-client.js        # GitHub API integration
│   │   └── sync-manager.js         # Offline/online synchronization
│   │
│   ├── search/                     # Search Engine
│   │   ├── search-engine.js        # Full-text search with Lunr.js
│   │   ├── indexer.js              # Document indexing
│   │   └── tag-manager.js          # Tag-based organization
│   │
│   └── themes/                     # Theme Management
│       ├── theme-manager.js        # Theme switching logic
│       ├── theme-presets.js        # Built-in theme definitions
│       └── theme-persistence.js    # Theme preference storage
│
├── components/                     # UI Components Layer
│   ├── command-bar/                # Command Interface
│   │   ├── command-bar.js          # Main command palette
│   │   ├── command-results.js      # Search results display
│   │   └── command-input.js        # Input handling
│   │
│   ├── editor-panel/               # Editor Interface
│   │   ├── editor-panel.js         # Main editor container
│   │   ├── document-title.js       # Document title component
│   │   └── editor-toolbar.js       # Editor controls
│   │
│   ├── sidebar/                    # Navigation Sidebar
│   │   ├── file-tree.js            # Document navigation
│   │   ├── search-panel.js         # Search interface
│   │   └── tag-cloud.js            # Tag visualization
│   │
│   └── ui/                         # Reusable UI Components
│       ├── modal.js                # Modal dialog system
│       ├── notification.js         # Toast notifications
│       └── status-bar.js           # Application status display
│
├── workers/                        # Background Processing
│   ├── service-worker.js           # PWA service worker
│   ├── search-worker.js            # Background search indexing
│   └── sync-worker.js              # Background synchronization
│
├── styles/                         # Styling System
│   ├── variables.css               # CSS custom properties
│   ├── base.css                    # Reset and base styles
│   ├── themes/                     # Theme definitions
│   │   ├── light.css               # Light theme
│   │   ├── dark.css                # Dark theme
│   │   └── fantasy.css             # Fantasy theme
│   └── components/                 # Component-specific styles
│
└── utils/                          # Utility Functions
    ├── validation.js               # Input validation
    ├── crypto.js                   # Client-side encryption
    ├── logger.js                   # Structured logging
    └── error-handler.js            # Global error handling
```

## 🔄 Data Flow Architecture

### Document Lifecycle

```
User Input → Command System → Storage Manager → IndexedDB
    ↓              ↓               ↓              ↓
Theme Aware → Validation → Encryption → Local Storage
    ↓              ↓               ↓              ↓
UI Update → Search Index → Sync Queue → Background Sync
    ↓              ↓               ↓              ↓
Real-time → Full-text → GitHub API → Conflict Resolution
```

### Command Flow

```
Ctrl+Space → Command Bar → Fuzzy Search → Command Registry
     ↓             ↓            ↓              ↓
  Show UI → Filter Results → Match Commands → Execute
     ↓             ↓            ↓              ↓
Theme Apply → Real-time → Parameter Parse → Action
     ↓             ↓            ↓              ↓
Update UI → Hide Command → Validation → Success/Error
```

## 💾 Storage Architecture

### Multi-Layer Storage Strategy

```
┌─────────────────────┐
│   Application UI    │
└─────────────────────┘
          │
┌─────────────────────┐
│  Storage Manager    │  ← Unified Interface
└─────────────────────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐
│Local  │   │Remote │
│Store  │   │Store  │
└───────┘   └───────┘
    │           │
┌───▼───┐   ┌───▼───┐
│Index  │   │GitHub │
│DB     │   │API    │
└───────┘   └───────┘
```

### Document Data Structure

```javascript
{
  uid: 'doc_1648125632_a1b2c3d4',    // Unique identifier
  title: 'My Fantasy Novel',          // Human-readable title
  content: '# Chapter 1\n...',        // Markdown content
  tags: ['fantasy', 'novel'],         // Organization tags
  metadata: {
    created: '2024-01-15T10:30:00Z',  // Creation timestamp
    modified: '2024-01-15T14:45:00Z', // Last modification
    words: 1250,                      // Word count
    characters: 7830,                 // Character count
    readingTime: 5                    // Estimated reading time (minutes)
  },
  sync: {
    status: 'synced',                 // sync status: synced|pending|conflict
    lastSync: '2024-01-15T14:45:00Z', // Last successful sync
    remoteSha: 'abc123def456',        // GitHub commit SHA
    checksum: 'sha256:...'            // Content integrity hash
  },
  conflict: {                         // Present only during conflicts
    local: { content: '...', timestamp: '...' },
    remote: { content: '...', timestamp: '...' },
    base: { content: '...', timestamp: '...' }
  }
}
```

## 🔍 Search Architecture

### Lunr.js Integration

```javascript
// Search Index Structure
{
  documents: {
    'doc_123': {
      title: 'My Document',
      content: 'Full document content...',
      tags: 'fantasy novel writing',
      metadata: {
        words: 1250,
        modified: '2024-01-15'
      }
    }
  },
  index: lunr.Index,  // Pre-built search index
  fields: ['title', 'content', 'tags'],
  boost: {
    title: 2.0,       // Title matches ranked higher
    tags: 1.5,        // Tag matches get priority
    content: 1.0      // Content matches baseline
  }
}
```

### Search Query Processing

```
User Query → Query Parser → Lunr Search → Result Ranking
     ↓            ↓            ↓            ↓
"fantasy magic" → tokenize → index lookup → relevance score
     ↓            ↓            ↓            ↓
   normalize → stem words → match docs → sort results
     ↓            ↓            ↓            ↓
UI Components ← format results ← apply filters ← return top N
```

## 🎨 Theme Architecture

### CSS Custom Properties System

```css
/* Base theme structure */
:root {
  /* Color Palette */
  --color-primary: #1a1a1a;
  --color-secondary: #666666;
  --color-background: #ffffff;
  --color-surface: #f8f9fa;
  --color-text: #333333;
  --color-accent: #007bff;
  
  /* Typography */
  --font-family-primary: 'Inter', sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;
  --font-size-base: 16px;
  --line-height-base: 1.6;
  
  /* Layout */
  --layout-max-width: 65ch;
  --layout-padding: 2rem;
  --layout-gap: 1rem;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-medium: 300ms ease;
}

/* Theme-specific overrides */
[data-theme="dark"] {
  --color-background: #1a1a1a;
  --color-surface: #2d2d2d;
  --color-text: #e0e0e0;
  --color-primary: #ffffff;
}

[data-theme="fantasy"] {
  --color-primary: #8b4513;
  --color-accent: #daa520;
  --font-family-primary: 'Cinzel', serif;
  --font-family-mono: 'Source Code Pro', monospace;
}
```

### Theme Switching Logic

```javascript
class ThemeManager {
  constructor() {
    this.currentTheme = this.loadPersistedTheme() || 'light'
    this.applyTheme(this.currentTheme)
  }
  
  switchTheme(themeName) {
    // Validate theme exists
    if (!this.isValidTheme(themeName)) {
      throw new Error(`Theme "${themeName}" not found`)
    }
    
    // Apply CSS custom properties
    document.documentElement.setAttribute('data-theme', themeName)
    
    // Update CodeMirror theme
    this.updateEditorTheme(themeName)
    
    // Persist preference
    this.persistTheme(themeName)
    
    // Emit theme change event
    this.emit('theme-changed', { from: this.currentTheme, to: themeName })
    
    this.currentTheme = themeName
  }
  
  updateEditorTheme(themeName) {
    const editorThemes = {
      light: 'github-light',
      dark: 'github-dark', 
      fantasy: 'material-palenight'
    }
    
    // Update CodeMirror theme without losing content
    this.editor.setOption('theme', editorThemes[themeName])
  }
}
```

## 🔄 Synchronization Architecture

### Conflict-Free Synchronization

```javascript
class SyncManager {
  async syncDocument(localDoc, remoteDoc) {
    // Three-way merge algorithm
    const baseDoc = await this.getBaseDocument(localDoc.uid)
    
    if (!remoteDoc) {
      // No remote version, upload local
      return await this.uploadDocument(localDoc)
    }
    
    if (localDoc.sync.remoteSha === remoteDoc.sha) {
      // Already in sync
      return { status: 'synced', document: localDoc }
    }
    
    if (localDoc.content === baseDoc.content) {
      // No local changes, accept remote
      return await this.acceptRemoteChanges(remoteDoc)
    }
    
    if (remoteDoc.content === baseDoc.content) {
      // No remote changes, upload local
      return await this.uploadDocument(localDoc)
    }
    
    // Both changed, requires conflict resolution
    return await this.createConflict(localDoc, remoteDoc, baseDoc)
  }
  
  async createConflict(local, remote, base) {
    const conflictDoc = {
      ...local,
      status: 'conflict',
      conflict: {
        local: { content: local.content, timestamp: local.metadata.modified },
        remote: { content: remote.content, timestamp: remote.metadata.modified },
        base: { content: base.content, timestamp: base.metadata.modified }
      }
    }
    
    await this.storageManager.saveDocument(conflictDoc)
    
    return {
      status: 'conflict',
      document: conflictDoc,
      requiresUserAction: true
    }
  }
}
```

## 🎯 Performance Architecture

### Bundle Splitting Strategy

```javascript
// vite.config.js - Manual chunk optimization
{
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core application shell
          'app': ['./src/app.js'],
          
          // Heavy dependencies
          'vendor-editor': ['@codemirror/state', '@codemirror/view'],
          'vendor-search': ['lunr'],
          'vendor-utils': ['dompurify', 'date-fns'],
          
          // Feature-based chunks
          'commands': ['./src/core/commands'],
          'themes': ['./src/core/themes'],
          'sync': ['./src/core/storage/sync-manager.js'],
          
          // UI components
          'ui-components': ['./src/components/ui'],
          'editor-components': ['./src/components/editor-panel'],
          'command-components': ['./src/components/command-bar']
        }
      }
    }
  }
}
```

### Caching Strategy

```javascript
// Service Worker Cache Strategy
const CACHE_STRATEGY = {
  // App shell - Cache first, update in background
  appShell: {
    strategy: 'CacheFirst',
    cacheName: 'app-shell-v1',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    files: ['/', '/index.html', '/manifest.json']
  },
  
  // Static assets - Cache first, long expiry
  staticAssets: {
    strategy: 'CacheFirst', 
    cacheName: 'static-assets-v1',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    pattern: /\.(js|css|woff2|png|svg)$/
  },
  
  // API calls - Network first, cache fallback
  apiCalls: {
    strategy: 'NetworkFirst',
    cacheName: 'api-cache-v1',
    maxAge: 5 * 60, // 5 minutes
    pattern: /^https:\/\/api\.github\.com/
  },
  
  // Documents - Cache first for offline support
  documents: {
    strategy: 'CacheFirst',
    cacheName: 'documents-v1',
    maxAge: 24 * 60 * 60, // 24 hours
    syncBackground: true
  }
}
```

## 🔐 Security Architecture

### Defense in Depth

```
┌─────────────────────┐
│   User Input        │
└─────────────────────┘
          │
┌─────────────────────┐
│  Client Validation  │  ← Input sanitization, DOMPurify
└─────────────────────┘
          │
┌─────────────────────┐
│  CSP Headers        │  ← Content Security Policy
└─────────────────────┘
          │
┌─────────────────────┐
│  WAF Protection     │  ← Cloudflare WAF rules
└─────────────────────┘
          │
┌─────────────────────┐
│  Encryption Layer   │  ← Client-side encryption
└─────────────────────┘
          │
┌─────────────────────┐
│  Secure Transport   │  ← HTTPS/TLS 1.3
└─────────────────────┘
```

### Client-Side Security

```javascript
// Security utilities integration
class SecurityManager {
  constructor() {
    this.validator = new InputValidator()
    this.crypto = new CryptoManager()
    this.logger = new SecurityLogger()
  }
  
  async secureDocument(document) {
    // Validate input
    const sanitized = this.validator.sanitizeDocument(document)
    
    // Encrypt sensitive content
    const encrypted = await this.crypto.encrypt(
      sanitized.content, 
      await this.getUserEncryptionKey()
    )
    
    // Log security event
    this.logger.logSecurityEvent('document_encrypted', {
      documentId: sanitized.uid,
      contentLength: sanitized.content.length
    })
    
    return {
      ...sanitized,
      content: encrypted,
      encrypted: true
    }
  }
}
```

This architecture ensures Fantasy Editor remains performant, secure, and maintainable while providing the conflict-free, offline-first experience that makes it unique among markdown editors.