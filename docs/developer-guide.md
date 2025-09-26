# Fantasy Editor Developer Guide

A practical guide for developers working on Fantasy Editor. For comprehensive development principles and architecture, see **[CLAUDE.md](../CLAUDE.md)**.

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** (required for Vite 7+ compatibility)
- **Git** for version control
- **Modern browser** for development and testing

### Local Setup

```bash
# Clone repository
git clone https://github.com/your-org/fantasy-forgewright.git
cd fantasy-forgewright

# Install dependencies
npm install

# Start development server
npm run dev
```

Access the development server at `http://localhost:3000`

### Development Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build           # Production build
npm run preview         # Preview production build locally

# Code Quality
npm run lint            # ESLint with max 200 warnings
npm run lint:fix        # Fix auto-fixable lint issues
npm test               # Run Jest unit tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report

# Development Utilities
npm run dev:helpers     # Load with dev helpers in console
npm run bundle-size     # Analyze bundle size
```

## 🧪 Testing Strategy

Fantasy Editor follows a comprehensive testing pyramid emphasizing Test-Driven Development (TDD).

### Test Pyramid Distribution
```
                 ╭─────────╮
                ╱    E2E    ╲     (10% - User journeys)
               ╱   Tests     ╲
              ╱_______________╲
             ╱                 ╲
            ╱   Integration     ╲   (20% - Component interactions)
           ╱      Tests         ╲
          ╱_______________________╲
         ╱                         ╲
        ╱       Unit Tests          ╲ (70% - Business logic)
       ╱_____________________________╲
```

### TDD Workflow (MANDATORY)

Every feature MUST follow the RED → GREEN → REFACTOR cycle:

```javascript
// 1. RED: Write failing test first
describe('DocumentValidator', () => {
  it('should reject empty titles', () => {
    expect(() => validateDocumentTitle('')).toThrow('Title is required')
  })

  it('should accept valid titles', () => {
    const result = validateDocumentTitle('My Document')
    expect(result).toBe('My Document')
  })
})

// 2. GREEN: Implement minimal passing code
export function validateDocumentTitle(title) {
  if (!title?.trim()) {
    throw new ValidationError('Title is required')
  }
  return title.trim()
}

// 3. REFACTOR: Improve while keeping tests green
export function validateDocumentTitle(title) {
  const trimmedTitle = title?.trim() ?? ''

  if (!trimmedTitle) {
    throw new ValidationError('Title is required', 'title')
  }

  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Title exceeds ${MAX_TITLE_LENGTH} characters`, 'title')
  }

  return trimmedTitle
}
```

### Unit Testing with Jest

**Test Structure:**
```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup for each test
    jest.clearAllMocks()
  })

  describe('methodName', () => {
    it('should handle expected case', () => {
      // Arrange
      const input = 'test input'

      // Act
      const result = component.method(input)

      // Assert
      expect(result).toBe('expected output')
    })

    it('should handle error case gracefully', () => {
      // Arrange & Act & Assert
      expect(() => component.method(null)).toThrow('Expected error message')
    })
  })
})
```

**Command System Testing:**
```javascript
describe('Command Registry', () => {
  it('should prevent browser shortcut registration', () => {
    const forbiddenShortcuts = ['Ctrl+K', 'Ctrl+F', 'Ctrl+N']

    forbiddenShortcuts.forEach(shortcut => {
      expect(() => {
        registerKeyboardShortcut(shortcut, () => {})
      }).toThrow('Only Ctrl+Space is allowed as keyboard shortcut')
    })
  })

  it('should execute commands through registry', async () => {
    const mockHandler = jest.fn().mockResolvedValue('success')
    commandRegistry.register('test', mockHandler)

    const result = await commandRegistry.execute('test', ['param'])

    expect(mockHandler).toHaveBeenCalledWith(['param'])
    expect(result).toBe('success')
  })
})
```

### Integration Testing

Test component interactions and API integrations:

```javascript
describe('GitHub Integration', () => {
  beforeEach(() => {
    // Setup test environment
    process.env.NODE_ENV = 'test'
  })

  it('should sync document with GitHub', async () => {
    const testDoc = {
      id: 'test_doc_123',
      title: 'Test Document',
      content: '# Test Content'
    }

    // Mock GitHub API responses
    jest.spyOn(github, 'createFile').mockResolvedValue({ sha: 'abc123' })

    const result = await syncManager.syncDocument(testDoc)

    expect(result.status).toBe('synced')
    expect(result.remoteSha).toBe('abc123')
  })
})
```

### E2E Testing with Playwright

Test complete user workflows:

```javascript
test('writer can create and sync document', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000')

  // Create new document via command palette
  await page.keyboard.press('Control+Space')
  await page.fill('[data-testid=command-input]', ':n Test Document')
  await page.keyboard.press('Enter')

  // Edit document
  await page.fill('[data-testid=editor]', '# My Story\n\nOnce upon a time...')

  // Save document
  await page.keyboard.press('Control+Space')
  await page.type('[data-testid=command-input]', ':s')
  await page.keyboard.press('Enter')

  // Verify document saved
  const documentTitle = await page.textContent('[data-testid=document-title]')
  expect(documentTitle).toBe('Test Document')
})
```

### Coverage Requirements

- **Unit Tests**: >90% coverage for all business logic
- **Integration Tests**: 100% coverage for critical paths (auth, sync, commands)
- **E2E Tests**: Cover all major user workflows
- **Manual Testing**: Phase 4 legal splash screen and conflict resolution

## 🛠️ Development Environment

### Browser Console Helpers

Fantasy Editor includes development utilities available in the browser console:

```javascript
// Show all available helpers
devHelpers.help()

// Clean all storage for fresh testing
devHelpers.cleanStorage()

// Clean storage and reload page
devHelpers.freshStart()

// Generate test documents with sample content
devHelpers.generateTestDocuments(5)

// Show storage information and statistics
devHelpers.showStorageInfo()

// Test all CRUD operations
devHelpers.testDocumentOperations()
```

### Development Workflow

```javascript
// Example testing workflow
// 1. Start fresh
devHelpers.freshStart()

// 2. After page reload, generate test data
devHelpers.generateTestDocuments(3)

// 3. Check current state
devHelpers.showStorageInfo()

// 4. Test specific functionality
devHelpers.testDocumentOperations()

// 5. Clean up
devHelpers.cleanStorage()
```

### Debug Mode

Enable detailed logging for specific systems:

```javascript
// Enable debug logging
localStorage.setItem('fantasy_editor_debug', 'github')  // GitHub integration
localStorage.setItem('fantasy_editor_debug', 'commands') // Command system
localStorage.setItem('fantasy_editor_debug', 'sync')     // Sync operations
localStorage.setItem('fantasy_editor_debug', 'all')      // All systems

// Check browser console for detailed logs
```

## 📦 Build & Bundle Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npm run bundle-analyzer

# Monitor bundle size in development
npm run dev -- --analyze
```

### Performance Targets

- **Bundle Size**: <5MB gzipped (currently >1MB, acceptable for feature-rich editor)
- **First Paint**: <1.5s on 3G connection
- **Time to Interactive**: <3s on 3G connection
- **Lighthouse Score**: >90 in all categories

### Optimization Strategies

**Code Splitting:**
```javascript
// Lazy load non-critical features
const loadSearchEngine = () => import('./search/search-engine.js')
const loadExportManager = () => import('./export/export-manager.js')

// Critical path optimization
export async function initializeApp() {
  // Load editor immediately (critical)
  const { CodeMirror } = await import('@codemirror/view')

  // Load features after initial render
  setTimeout(async () => {
    const searchEngine = await loadSearchEngine()
    const exportManager = await loadExportManager()
  }, 100)
}
```

**Dependency Management:**
- **Current Dependencies**: <10 total
- **Bundle Dependencies**: Only CodeMirror 6, Lunr.js, DOMPurify
- **Tree Shaking**: Automatic via Vite
- **Chunk Splitting**: Vendor, app, and feature-based chunks

## 🏗️ Component Architecture

### Component Structure

```javascript
// Standard component pattern
export class DocumentManager {
  constructor(storage, eventBus) {
    this.storage = storage
    this.eventBus = eventBus
    this.documents = new Map()
  }

  // Max 20 lines per method
  async createDocument(title, content = '') {
    // Validate inputs (defensive programming)
    if (!title?.trim()) {
      throw new ValidationError('Document title is required')
    }

    const document = {
      id: generateDocumentId(),
      title: title.trim(),
      content: sanitizeContent(content),
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }

    await this.storage.save(document)
    this.eventBus.emit('document:created', document)

    return document
  }

  // Additional methods...
}
```

### Event System

```javascript
// Centralized event bus for component communication
export class EventBus {
  constructor() {
    this.listeners = new Map()
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(handler)
  }

  emit(event, data) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }
}
```

## 🔧 Configuration

### Environment Variables

**Development (.env):**
```bash
VITE_OAUTH_WORKER_URL=http://localhost:8788
VITE_GITHUB_CLIENT_ID=your_dev_client_id
VITE_DEBUG_MODE=true
```

**Production (.env.production):**
```bash
VITE_OAUTH_WORKER_URL=https://fantasy-oauth-proxy.wellington-granja.workers.dev
VITE_GITHUB_CLIENT_ID=your_production_client_id
```

### Vite Configuration

```javascript
// vite.config.js
export default {
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-editor': ['@codemirror/state', '@codemirror/view'],
          'vendor-search': ['lunr'],
          'vendor-utils': ['dompurify']
        }
      }
    }
  },

  test: {
    environment: 'jsdom',
    coverage: {
      threshold: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  }
}
```

## 🐛 Debugging

### Common Issues

**Command System Not Working:**
```javascript
// Check command registration
console.log(window.commandRegistry.commands)

// Test command execution
await window.commandRegistry.execute('test-command', [])

// Verify Ctrl+Space listener
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.code === 'Space') {
    console.log('Ctrl+Space detected')
  }
})
```

**Storage Issues:**
```javascript
// Check IndexedDB status
await window.storageManager.getStats()

// List all documents
const docs = await window.storageManager.getAllDocuments()
console.table(docs.map(d => ({ id: d.id, title: d.title, size: d.content.length })))

// Clear storage if corrupted
await window.storageManager.clearAll()
```

**GitHub Sync Problems:**
```javascript
// Check authentication status
const authStatus = await window.authManager.checkAuthStatus()
console.log('Auth status:', authStatus)

// Manual sync test
await window.syncManager.syncAll()

// Check sync status
window.syncManager.getSyncStatus()
```

### Performance Debugging

```javascript
// Monitor memory usage
performance.measureUserAgentSpecificMemory?.().then(result => {
  console.log('Memory usage:', result)
})

// Track bundle loading
performance.getEntriesByType('navigation').forEach(entry => {
  console.log(`Load time: ${entry.loadEventEnd - entry.loadEventStart}ms`)
})

// Profile component rendering
console.time('component-render')
await component.render()
console.timeEnd('component-render')
```

## 🚀 Deployment Preparation

### Pre-deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Linting clean (`npm run lint`)
- [ ] Bundle size within limits (`npm run build && ls -lah dist/`)
- [ ] No console errors in production build (`npm run preview`)
- [ ] GitHub integration working with production OAuth
- [ ] Legal documents loading correctly
- [ ] Performance targets met (Lighthouse audit)

### Production Build

```bash
# Create optimized production build
npm run build

# Test production build locally
npm run preview

# Deploy (via CI/CD pipeline)
git push origin main
```

### Monitoring Production

```javascript
// Performance monitoring in production
if (process.env.NODE_ENV === 'production') {
  // Track Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log)
    getFID(console.log)
    getFCP(console.log)
    getLCP(console.log)
    getTTFB(console.log)
  })

  // Error tracking
  window.addEventListener('error', (event) => {
    // Send to monitoring service
    console.error('Production error:', event.error)
  })
}
```

## 🤝 Contributing Guidelines

### Code Review Checklist

Before submitting a pull request:

- [ ] **Follows TDD**: Tests written first, all tests passing
- [ ] **Clean Code**: Functions <20 lines, files <200 lines
- [ ] **Input Validation**: All boundary functions validate inputs
- [ ] **Error Handling**: Graceful error handling with user-friendly messages
- [ ] **No New Dependencies**: Justified if adding any dependencies
- [ ] **Performance Impact**: Considered bundle size and runtime impact
- [ ] **Security Review**: No secrets committed, inputs sanitized
- [ ] **Documentation**: Updated relevant documentation
- [ ] **Browser Compatibility**: Tested in Chrome, Firefox, Safari, Edge

### Git Workflow

```bash
# Feature development workflow
git checkout -b feature/document-validation

# TDD: Write tests first
git add test/document-validator.test.js
git commit -m "test: add document validation test cases"

# Implement feature
git add src/core/validation/document-validator.js
git commit -m "feat: implement document validation with input sanitization"

# Refactor if needed
git add src/core/validation/document-validator.js
git commit -m "refactor: optimize validation performance"

# Merge to main
git checkout main
git merge feature/document-validation
git push origin main
```

### Documentation Requirements

- **Code Comments**: Business logic only, no implementation comments
- **JSDoc**: All public APIs must have complete JSDoc
- **README Updates**: Update relevant documentation for feature changes
- **CLAUDE.md**: Update project context for significant architectural changes

---

*For complete development principles and technical architecture details, see **[CLAUDE.md](../CLAUDE.md)***

**Fantasy Editor Developer Guide - Last Updated: September 2025**