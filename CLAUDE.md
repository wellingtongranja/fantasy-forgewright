# CLAUDE.md - Fantasy Editor Project Context

## 📋 Project Overview

**Fantasy Editor** is a distraction-free, keyboard-first markdown editor for writers, hosted at **forgewright.io**.

**Architecture**: Client-side PWA with Git storage (GitHub integrated, GitLab/Bitbucket/others planned), CodeMirror 6 editor, VS Code-style command palette

**License**: MIT License with Fantasy Editor Forge Premium Tier

## 🎯 Core Requirements

### Current Status (Updated: September 2025)

#### ✅ Completed Features
- [x] Markdown editing with CodeMirror 6
- [x] VS Code-style command palette (Ctrl+Space only)
- [x] Theme support (Light, Dark, Fantasy modes)
- [x] Custom theme configuration via Settings Dialog
- [x] Offline-first PWA functionality
- [x] Full-text search and document tagging
- [x] Writer-focused UI with optimal 65ch layout
- [x] Git OAuth integration with automatic repository setup (GitHub completed, multi-provider system in place)
- [x] Editor Width & Zoom Controls - Width presets (65ch/80ch/90ch) and zoom functionality (85%-130%)
- [x] Document Export System - Multi-format export (Markdown, HTML, PDF, Text) with `:ex` and `:em` commands
- [x] Legal Documents Management System - Complete Phase 4 implementation with splash screen, secure worker, user acceptance tracking, and hash consistency fixes
- [x] Centralized Sync Status Management - Unified sync status detection and display across Navigator and status bar components
- [x] Real-time Navigator Outline Updates - Live document outline updates synchronized with editor content changes

#### 🚧 In Progress / Needs Improvement
- [ ] **Settings Dialog** - Functional but requires UX enhancements
- [ ] **Conflict Resolution** - Basic system exists, needs robust testing and improvements
- [ ] **Local File Handling** - Requires review and optimization
- [ ] **Merge Functionality** - Needs comprehensive review

#### 📋 Planned Features
- [ ] Additional Git Providers (GitLab, Bitbucket, generic Git) - OAuth system already supports multi-provider
- [ ] Project Gutenberg integration
- [ ] Internationalization support

#### ⚠️ Technical Debt
- **Bundle Size**: Currently >1MB (target <5MB, acceptable for feature-rich editor)
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
- **Git Provider UI Integration** - Authentication button in header with user dropdown menu (GitHub first, others coming)
- **Document Synchronization** - Bidirectional sync between local IndexedDB and Git providers
- **Command System Enhancement** - All Git operations via colon shortcuts
- **Editor Width & Zoom Controls** - Dynamic width presets (65ch/80ch/90ch) and zoom functionality (85%-130%)
- **Document Export System** - Multi-format export capabilities (Markdown, HTML, PDF, Text) with streamlined commands
- **Legal Documents Management System** - Complete legal compliance workflow with responsive modal splash screen, secure Cloudflare Worker for document serving, IndexedDB acceptance tracking, automatic release notes display after legal acceptance, and hash consistency fixes for persistent user acceptance records

## 🛠️ Development Principles & Standards

Fantasy Editor follows strict development principles to ensure maintainable, secure, and performant code. Every developer MUST adhere to these standards without exception.

### Code Clean (MANDATORY)

#### Function Standards
- **Max 20 lines per function** - If longer, break into smaller functions
- **Single Responsibility** - Each function does exactly one thing
- **Pure functions preferred** - Avoid side effects when possible
- **Descriptive names** - No abbreviations, clear intent

```javascript
// ✅ CORRECT: Clean, focused, testable
export function validateDocumentTitle(title) {
  if (!title?.trim()) {
    throw new ValidationError('Title is required', 'title')
  }

  if (title.length > 100) {
    throw new ValidationError('Title must be less than 100 characters', 'title')
  }

  return title.trim()
}

// ❌ INCORRECT: Complex, multiple responsibilities
export function processDoc(d) {
  // 50+ lines mixing validation, transformation, saving, syncing, etc.
}
```

#### File Standards
- **Max 200 lines per file** - If longer, split into multiple files
- **Focused purpose** - Each file handles one domain/concern
- **Clear imports** - Explicit imports, avoid barrel exports
- **Consistent structure** - Exports at bottom, imports at top

#### Variable & Naming Standards
```javascript
// ✅ CORRECT: Descriptive, clear intent
const documentValidationResult = await validateDocumentContent(content)
const isUserAuthenticated = await authManager.checkAuthStatus()
const syncStatusIndicator = document.querySelector('[data-testid=sync-status]')

// ❌ INCORRECT: Abbreviated, unclear
const dvr = await validate(c)
const auth = await check()
const el = document.querySelector('.sync')
```

#### Comments Policy
- **NO implementation comments** - Code should be self-explaining
- **Business logic comments ONLY** - Why, not what or how
- **JSDoc for public APIs** - Complete parameter and return documentation

```javascript
// ✅ CORRECT: Business context comment
// GitHub API has 5000 req/hour limit, so we batch document uploads
const batchSize = 10

// ❌ INCORRECT: Implementation comment
// Loop through documents and save each one
for (const doc of documents) { ... }
```

### Test-Driven Development (TDD)

#### RED → GREEN → REFACTOR Cycle
Every feature MUST follow this exact cycle:

```javascript
// 1. RED: Write failing test first
describe('DocumentValidator', () => {
  it('should reject empty titles', () => {
    expect(() => validateDocumentTitle('')).toThrow('Title is required')
  })

  it('should reject titles over 100 characters', () => {
    const longTitle = 'a'.repeat(101)
    expect(() => validateDocumentTitle(longTitle)).toThrow('must be less than 100')
  })

  it('should trim whitespace from valid titles', () => {
    const result = validateDocumentTitle('  My Document  ')
    expect(result).toBe('My Document')
  })
})

// 2. GREEN: Implement minimal passing code
export function validateDocumentTitle(title) {
  if (!title?.trim()) {
    throw new ValidationError('Title is required', 'title')
  }

  if (title.length > 100) {
    throw new ValidationError('Title must be less than 100 characters', 'title')
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
    throw new ValidationError(`Title must be less than ${MAX_TITLE_LENGTH} characters`, 'title')
  }

  return trimmedTitle
}
```

#### Coverage Requirements
- **>90% test coverage** for all business logic
- **100% coverage** for critical paths (auth, sync, commands)
- **Integration tests** for component interactions
- **E2E tests** for complete user workflows

#### Testing Principles
```javascript
// ✅ CORRECT: Test behavior, not implementation
it('should save document when user runs save command', async () => {
  const doc = { title: 'Test', content: 'Content' }
  await commandSystem.execute('save', [doc])

  const saved = await storage.getDocument(doc.id)
  expect(saved.content).toBe('Content')
})

// ❌ INCORRECT: Testing implementation details
it('should call storage.save with correct parameters', async () => {
  const spy = jest.spyOn(storage, 'save')
  // ... test implementation instead of behavior
})
```

### Defensive Programming

#### Input Validation (MANDATORY)
All boundary functions MUST validate inputs:

```javascript
// ✅ CORRECT: Comprehensive input validation
export async function saveDocument(document, options = {}) {
  // Validate document structure
  if (!document || typeof document !== 'object') {
    throw new ValidationError('Document must be an object')
  }

  // Validate required fields
  if (!document.id) {
    throw new ValidationError('Document ID is required')
  }

  if (!document.title?.trim()) {
    throw new ValidationError('Document title is required')
  }

  // Validate content
  if (typeof document.content !== 'string') {
    throw new ValidationError('Document content must be a string')
  }

  // Sanitize inputs
  const sanitizedDocument = {
    ...document,
    title: sanitizeInput(document.title.trim()),
    content: sanitizeMarkdown(document.content)
  }

  return await storage.save(sanitizedDocument, options)
}

// ❌ INCORRECT: No validation, assumes valid input
export async function saveDocument(document, options) {
  return await storage.save(document, options)  // Will fail with bad input
}
```

#### Error Handling
```javascript
// ✅ CORRECT: Graceful error handling with user feedback
export async function syncDocument(documentId) {
  try {
    const localDoc = await storage.getDocument(documentId)
    const remoteDoc = await github.fetchDocument(documentId)

    return await mergeDocs(localDoc, remoteDoc)

  } catch (error) {
    if (error instanceof NetworkError) {
      // Graceful degradation for network issues
      logger.warn('Sync failed due to network issue', { documentId, error })
      return { status: 'offline', document: localDoc }
    }

    if (error instanceof AuthenticationError) {
      // Clear invalid auth and prompt user
      await authManager.clearAuth()
      throw new UserActionRequiredError('Please sign in again', 'REAUTHENTICATION_REQUIRED')
    }

    // Log unexpected errors but don't expose internals to user
    logger.error('Unexpected sync error', { documentId, error })
    throw new UserError('Unable to sync document. Please try again.')
  }
}
```

#### Never Trust External Data
```javascript
// ✅ CORRECT: Validate all external data
export async function handleGitHubResponse(response) {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid GitHub API response format')
  }

  // Validate required fields exist
  const requiredFields = ['content', 'sha', 'path']
  for (const field of requiredFields) {
    if (!(field in response)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }

  // Sanitize content before processing
  return {
    content: sanitizeMarkdown(response.content),
    sha: validateSha(response.sha),
    path: validatePath(response.path)
  }
}
```

### KISS (Keep It Simple, Stupid)

#### Dependency Management
- **Vanilla JavaScript only** - No frameworks except CodeMirror 6
- **Current dependencies <10** - Every new dependency must be justified
- **Standard Web APIs first** - Prefer native browser APIs over libraries
- **Bundle size monitoring** - Target <5MB, track with every change

```javascript
// ✅ CORRECT: Use native APIs
const searchWorker = new Worker('/js/search-worker.js')
const docs = await fetch('/api/documents').then(r => r.json())
const element = document.querySelector('[data-testid=command-bar]')

// ❌ INCORRECT: Adding unnecessary dependencies
import _ from 'lodash'  // For simple operations
import axios from 'axios'  // Instead of fetch
import jQuery from 'jquery'  // For DOM manipulation
```

#### Architecture Simplicity
```javascript
// ✅ CORRECT: Simple, direct approach
export class CommandSystem {
  constructor() {
    this.commands = new Map()
  }

  register(name, handler) {
    this.commands.set(name, handler)
  }

  async execute(name, args) {
    const handler = this.commands.get(name)
    if (!handler) throw new Error(`Unknown command: ${name}`)
    return await handler(args)
  }
}

// ❌ INCORRECT: Over-engineered with unnecessary abstractions
export class CommandSystemFactory extends BaseFactory {
  createCommandSystem() {
    return new Proxy(new CommandSystemImpl(), {
      // Complex proxy logic for no real benefit
    })
  }
}
```

### PWA Excellence

#### Offline-First Architecture
All features MUST work offline:

```javascript
// ✅ CORRECT: Offline-first data access
export async function getDocument(id) {
  try {
    // Always try local storage first
    const localDoc = await indexedDB.getDocument(id)

    if (navigator.onLine && shouldSync(localDoc)) {
      // Sync in background if online
      syncDocumentInBackground(id)
    }

    return localDoc

  } catch (localError) {
    // Fallback to remote only if local fails
    if (navigator.onLine) {
      const remoteDoc = await github.fetchDocument(id)
      await indexedDB.saveDocument(remoteDoc)  // Cache for offline
      return remoteDoc
    }

    throw new Error('Document not available offline')
  }
}
```

#### Service Worker Implementation
```javascript
// ✅ CORRECT: Comprehensive caching strategy
const CACHE_STRATEGIES = {
  appShell: {
    strategy: 'CacheFirst',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    files: ['/', '/index.html', '/manifest.json']
  },

  staticAssets: {
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
    pattern: /\.(js|css|woff2|png|svg)$/
  },

  documents: {
    strategy: 'NetworkFirst',
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    syncBackground: true
  }
}
```

#### Performance Standards
- **First Paint**: <1.5s on 3G
- **Time to Interactive**: <3s on 3G
- **Lighthouse Score**: >90 in all categories
- **Bundle Size**: <5MB gzipped (currently >1MB, working to optimize)

```javascript
// ✅ CORRECT: Performance-conscious loading
export async function loadEditor() {
  // Critical path: Load editor immediately
  const { CodeMirror } = await import('@codemirror/view')

  // Non-critical: Load features lazily
  setTimeout(async () => {
    const { SearchEngine } = await import('./search/search-engine.js')
    const { ExportManager } = await import('./export/export-manager.js')
  }, 100)
}
```

### Security-First Development

#### Input Sanitization (ALWAYS)
```javascript
// ✅ CORRECT: Sanitize all inputs
import DOMPurify from 'dompurify'

export function processUserContent(content) {
  // Sanitize HTML content
  const cleanHTML = DOMPurify.sanitize(content)

  // Validate markdown
  const safeMarkdown = sanitizeMarkdown(cleanHTML)

  return safeMarkdown
}
```

#### Secret Management
- **NEVER commit secrets** - Use environment variables
- **Client-side encryption** - Encrypt sensitive data before storage
- **Token rotation** - Implement automatic token refresh

#### MIT License Compliance
- **Open source** - Maximum freedom for personal and commercial use
- **Fantasy Editor Forge** - Premium AI features available via subscription
- **Attribution** - Maintain copyright notices

### Error Handling & Logging

#### Structured Error Types
```javascript
export class ValidationError extends Error {
  constructor(message, field, code) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.code = code
    this.userFacing = true
  }
}

export class SystemError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'SystemError'
    this.originalError = originalError
    this.userFacing = false
  }
}
```

#### Logging Standards
```javascript
// ✅ CORRECT: Structured logging
logger.info('Document saved', {
  documentId: doc.id,
  titleLength: doc.title.length,
  contentLength: doc.content.length,
  tags: doc.tags.length
})

logger.error('Sync failed', {
  documentId: doc.id,
  error: error.message,
  syncAttempt: attemptNumber
})

// ❌ INCORRECT: Unstructured logging
console.log('Document saved: ' + doc.title)
console.log('Error: ' + error.toString())
```

### Development Workflow

#### Git Workflow
```bash
# 1. Create feature branch
git checkout -b feature/document-validation

# 2. Write tests first (TDD RED)
git add test/document-validator.test.js
git commit -m "test: add document validation test cases"

# 3. Implement feature (TDD GREEN)
git add src/core/validation/document-validator.js
git commit -m "feat: implement document validation"

# 4. Refactor if needed (TDD REFACTOR)
git add src/core/validation/document-validator.js
git commit -m "refactor: optimize validation performance"

# 5. Integration
git checkout main
git merge feature/document-validation
```

#### Code Review Checklist
- [ ] Follows all development principles above
- [ ] Tests written first (TDD)
- [ ] Functions <20 lines, files <200 lines
- [ ] Input validation for all boundary functions
- [ ] Error handling with user-friendly messages
- [ ] No new dependencies without justification
- [ ] Performance impact considered
- [ ] **MANDATORY**: Enterprise Security checklist completed (see Security Implementation section above)
- [ ] Security implications reviewed and documented

This comprehensive set of development principles ensures Fantasy Editor maintains its high quality standards while remaining maintainable and secure.

## 🔐 Enterprise Security Implementation (MANDATORY)

Fantasy Editor has undergone a comprehensive security audit and implements enterprise-level security standards. All developers MUST adhere to these security requirements without exception.

### Completed Security Audit Results

#### ✅ CRITICAL Security Issues Resolved (September 2025)
- **OAuth Credential Exposure**: Removed exposed GitHub OAuth token and client secret from version control
- **Production Debug Logging**: Eliminated all console.log statements exposing sensitive data in production builds
- **GDPR Compliance**: Implemented consent-based browser fingerprinting with user control
- **Version Control Security**: Completely removed GitHub Client ID and secrets from git history using filter-branch
- **Service Worker Logging**: Removed production console logging from service workers

#### ✅ HIGH Priority Security Implementations
- **OAuth Security**: Implemented secure token handling via Cloudflare Worker proxy
- **Environment Variable Security**: Secured all environment variables with proper .gitignore patterns
- **Git History Sanitization**: Complete removal of sensitive data using git filter-branch

### Mandatory Security Standards for All Development

#### 1. Secret Management (ZERO TOLERANCE)
```javascript
// ✅ CORRECT: Never commit secrets
// Use environment variables only
const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID

// ❌ FORBIDDEN: Never hardcode secrets
const clientId = 'ghp_abc123...'  // NEVER DO THIS
const secret = 'oauth_secret_123' // NEVER DO THIS
```

**Enforcement Rules:**
- **Pre-commit hooks**: Block any commits containing patterns like `ghp_`, `gho_`, `oauth_`, API keys
- **Git history scanning**: Regular audits using tools like `git-secrets` or `truffleHog`
- **Environment variable validation**: All secrets must use VITE_ prefix for client access
- **Worker proxy pattern**: Client secrets stored only on Cloudflare Workers, never in client code

#### 2. Production Debug Logging (MANDATORY REMOVAL)
```javascript
// ✅ CORRECT: Conditional logging
if (import.meta.env.DEV) {
  console.log('Debug info:', sensitiveData)
}

// ✅ CORRECT: Production-safe logging
logger.info('Operation completed', {
  documentId: doc.id,  // Safe to log
  // Never log: tokens, secrets, user data
})

// ❌ FORBIDDEN: Production console logging
console.log('User token:', token)      // SECURITY VIOLATION
console.log('OAuth response:', response) // SECURITY VIOLATION
```

#### 3. GDPR/CCPA Compliance (LEGALLY REQUIRED)
```javascript
// ✅ CORRECT: Consent-based data collection
export class ConsentManager {
  constructor() {
    this.consentStatus = this.getStoredConsent()
  }

  async requestConsent(dataType) {
    if (!this.consentStatus[dataType]) {
      const consent = await this.showConsentDialog(dataType)
      this.storeConsent(dataType, consent)
    }
    return this.consentStatus[dataType]
  }

  // Only collect data AFTER consent
  async collectFingerprint() {
    const canCollect = await this.requestConsent('fingerprinting')
    if (!canCollect) return null

    return generateFingerprint()
  }
}

// ❌ FORBIDDEN: Automatic data collection
const fingerprint = generateFingerprint() // No consent check
```

#### 4. Input Sanitization (DEFENSE IN DEPTH)
```javascript
// ✅ CORRECT: Multi-layer sanitization
import DOMPurify from 'dompurify'

export function processUserInput(input) {
  // Layer 1: Type validation
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be string')
  }

  // Layer 2: Length validation
  if (input.length > MAX_INPUT_LENGTH) {
    throw new ValidationError('Input too long')
  }

  // Layer 3: Content sanitization
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  })

  // Layer 4: Additional validation
  if (containsMaliciousPatterns(sanitized)) {
    throw new SecurityError('Input contains prohibited content')
  }

  return sanitized
}
```

#### 5. OAuth Security Architecture (CLOUDFLARE WORKER PATTERN)
```javascript
// ✅ CORRECT: Secure OAuth implementation
export class SecureOAuthManager {
  constructor() {
    this.workerUrl = import.meta.env.VITE_OAUTH_WORKER_URL
    // Client secrets NEVER exposed to browser
  }

  async authenticate(provider) {
    // Step 1: Generate PKCE challenge
    const { codeVerifier, codeChallenge } = this.generatePKCE()

    // Step 2: Redirect to provider (no client secret exposed)
    const authUrl = this.buildAuthUrl(provider, codeChallenge)
    window.location.href = authUrl
  }

  async exchangeCodeForToken(code, state) {
    // Step 3: Exchange via secure worker (client secret on server)
    const response = await fetch(`${this.workerUrl}/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state, provider: 'github' })
    })

    if (!response.ok) {
      throw new AuthenticationError('Token exchange failed')
    }

    return response.json()
  }
}
```

### Security Review Checklist (MANDATORY FOR ALL PRs)

#### Code Review Requirements
- [ ] **Secret Scanning**: No hardcoded secrets, tokens, or API keys
- [ ] **Debug Logging**: No console.log statements in production code paths
- [ ] **Input Validation**: All user inputs validated and sanitized
- [ ] **Error Handling**: No sensitive data in error messages
- [ ] **GDPR Compliance**: User consent obtained before data collection
- [ ] **OAuth Security**: Tokens handled via secure worker proxy only
- [ ] **Environment Variables**: Proper VITE_ prefixing for client variables

#### Deployment Security Checklist
- [ ] **Production Build**: No development debugging enabled
- [ ] **Environment Separation**: Production secrets separate from development
- [ ] **CSP Headers**: Strict Content Security Policy implemented
- [ ] **HTTPS Enforcement**: All connections encrypted
- [ ] **Token Validation**: OAuth tokens properly validated and scoped

### Incident Response Procedures

#### Security Incident Classification
1. **CRITICAL**: Secret exposure, data breach, authentication bypass
2. **HIGH**: XSS vulnerability, unauthorized access, privacy violation
3. **MEDIUM**: Missing validation, weak encryption, information disclosure
4. **LOW**: Missing security headers, incomplete logging

#### Immediate Response Actions
```bash
# CRITICAL: Secret exposed in commit
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env.production' --prune-empty --tag-name-filter cat -- --all

# HIGH: Revoke exposed tokens immediately
# 1. Revoke on provider (GitHub/GitLab)
# 2. Regenerate new credentials
# 3. Update environment variables
# 4. Deploy new version

# Force push cleaned history
git push origin --force --all
```

### Continuous Security Monitoring

#### Automated Security Checks
- **Pre-commit**: Block commits with secrets or debug logging
- **CI/CD Pipeline**: Security scanning with tools like CodeQL
- **Dependency Scanning**: Regular `npm audit` and vulnerability updates
- **Environment Auditing**: Regular review of production environment variables

### Remaining Security Tasks

#### HIGH Priority
- [ ] **Environment Variable Audit**: Review all VITE_ variables for sensitive data exposure
- [ ] **Consent Management System**: Complete GDPR/CCPA consent framework implementation

#### MEDIUM Priority
- [ ] **Privacy Policy Update**: Align privacy policy with actual data collection practices
- [ ] **localStorage Encryption**: Implement Web Crypto API encryption for local storage

### Security Training Requirements

#### Developer Onboarding
- Complete OWASP Top 10 training
- Understand Fantasy Editor security architecture
- Review completed security audit and lessons learned
- Practice secure coding patterns specific to this codebase

#### Ongoing Education
- Monthly security newsletter review
- Quarterly security architecture reviews
- Annual penetration testing participation
- Stay updated on JavaScript/PWA security best practices

This enterprise-level security framework ensures Fantasy Editor maintains the highest security standards while preventing regression of the extensive security work completed during the September 2025 audit.

## 🏗️ Technical Architecture

### High-Level System Architecture

Fantasy Editor is built as a Progressive Web Application (PWA) with a client-side first architecture, emphasizing offline-first functionality, conflict-free keyboard shortcuts, and seamless Git provider integration.

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
        │ Background Sync │    │   (Future)       │      │
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

### Core Design Principles

#### 1. Offline-First Architecture
- **Local Storage Priority**: IndexedDB stores all documents locally first
- **Background Sync**: Service Worker handles sync when connectivity returns
- **Conflict Resolution**: Three-way merge algorithm for conflicting changes
- **Graceful Degradation**: Full functionality available offline

#### 2. Command-Centric Interface
- **Single Entry Point**: Ctrl+Space is the only keyboard shortcut
- **Zero Browser Conflicts**: No interference with browser shortcuts
- **Fuzzy Search**: Real-time command filtering and execution
- **Extensible Registry**: Easy addition of new commands

#### 3. Theme-Aware Design
- **CSS Custom Properties**: Dynamic theming system
- **Component Consistency**: All UI elements respect current theme
- **Performance Optimized**: Minimal reflow on theme switches
- **Accessibility First**: High contrast and readable themes

### Data Flow Architecture

#### Document Lifecycle
```
User Input → Command System → Storage Manager → IndexedDB
    ↓              ↓               ↓              ↓
Theme Aware → Validation → Encryption → Local Storage
    ↓              ↓               ↓              ↓
UI Update → Search Index → Sync Queue → Background Sync
    ↓              ↓               ↓              ↓
Real-time → Full-text → GitHub API → Conflict Resolution
```

#### Command Flow
```
Ctrl+Space → Command Bar → Fuzzy Search → Command Registry
     ↓             ↓            ↓              ↓
  Show UI → Filter Results → Match Commands → Execute
     ↓             ↓            ↓              ↓
Theme Apply → Real-time → Parameter Parse → Action
     ↓             ↓            ↓              ↓
Update UI → Hide Command → Validation → Success/Error
```

#### Multi-Layer Storage Strategy
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

Documents use a comprehensive metadata structure for sync, search, and organization:

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

### Security Architecture

#### Defense in Depth
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

### Performance Architecture

#### Bundle Splitting Strategy
```javascript
// vite.config.js - Optimized chunk strategy
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

#### Service Worker Cache Strategy
```javascript
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

## 📁 Key Structure

```text
src/
├── core/                    # Business logic
│   ├── auth/               # OAuth authentication
│   │   ├── auth-manager.js # Multi-provider OAuth manager
│   │   └── github-auth.js  # GitHub-specific auth (legacy, kept for compatibility)
│   ├── editor/             # CodeMirror integration & width/zoom controls
│   │   ├── editor.js       # Main editor manager
│   │   └── width-manager.js # Width presets & zoom functionality
│   ├── storage/            # IndexedDB + GitHub sync
│   ├── search/             # Full-text search + tags
│   ├── commands/           # Command registry & handlers
│   ├── export/             # Document export functionality
│   ├── legal/              # Legal documents management system
│   ├── sync/               # Centralized sync status management
│   └── themes/             # Theme management
├── components/             # UI components
│   ├── navigator/          # Tabbed sidebar (Documents/Outline/Search)
│   │   ├── tabs/          # Individual tab components
│   │   └── utils/         # Navigator utilities (outline parser)
│   ├── command-bar/       # Command palette interface
│   ├── command-bar-v2/    # Enhanced command system with SearchEngine
│   ├── auth/              # Git provider authentication UI
│   ├── status-bar/        # Status bar with unified sync indicators
│   ├── legal-splash/      # Legal documents modal interface
│   └── sidebar/           # Legacy sidebar (fallback)
├── styles/                 # CSS themes & base styles
├── workers/               # Service worker + PWA
└── utils/                 # Validation, security, logging

workers/                    # Cloudflare Workers
├── oauth-proxy.js         # OAuth proxy Worker
├── legal-docs-worker.js   # Legal documents Worker
├── providers/             # OAuth provider implementations
│   ├── base-provider.js  # Abstract base class
│   ├── github.js         # GitHub OAuth provider
│   ├── gitlab.js         # GitLab OAuth provider
│   ├── bitbucket.js      # Bitbucket OAuth provider
│   └── generic-git.js    # Generic Git provider
├── wrangler.toml         # OAuth Worker configuration
└── wrangler.legal.toml   # Legal Worker configuration

docs/                      # Documentation (simplified structure)
├── README.md             # Main documentation index
├── help.md              # User guide with essential commands
├── github-integration.md # Complete Git provider/OAuth guide
├── architecture.md      # System architecture
├── testing.md           # Testing strategy
├── security-guide.md    # Comprehensive security implementation guide (see Enterprise Security section above)
├── deployment.md        # Deployment & troubleshooting guide
├── dev-helpers.md       # Development utilities
├── release-notes.md     # Version history
├── privacy-policy.md    # Privacy policy
├── license-mit.md       # MIT License
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
| **`:v`** | `version` | `:v` or `:v notes` |

#### Git Provider Integration Commands
*Currently GitHub, with GitLab/Bitbucket/others coming. Aligned with standard Git aliases (st=status, pu=push, pl=pull, etc.)*

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

## 🐙 Git Provider Integration UI

Fantasy Editor provides a complete Git integration experience with visual feedback and seamless authentication. GitHub is the first integrated provider, with GitLab, Bitbucket, and others planned.

### Git Provider Authentication Button (Header - Top-right)

**When not signed in:**
- "Sign in with [Provider]" button with provider icon (currently GitHub)
- Clicking redirects to provider's OAuth authorization

**When signed in:**
- Shows user avatar, username, and dropdown arrow
- Click to open user dropdown menu

### Git Provider User Dropdown Menu

**Repository Information:**
- Current configured repository name
- "Not configured" if no repository set up
- Hint to use `:gcf` (GitHub Configure) command

**Menu Actions:**
- **Sign out** - Log out from Git provider
- **Help** - Show Git provider command documentation

### Sync Status Indicators (Status Bar - Bottom-right)

**Unified status container with color-coded pill styling:**
- 🟢 **synced**: Document matches remote repository (green background)
- 🟡 **out-of-sync**: Local changes need push to remote (yellow background)
- 🔴 **local-only**: Document never synced to remote (red background)
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

Fantasy Editor implements a secure, provider-agnostic OAuth system supporting multiple Git providers through a Cloudflare Worker proxy. GitHub is fully integrated as the first provider, with GitLab, Bitbucket, and generic Git support coming soon.

### OAuth Architecture

**Core Components:**
- **AuthManager** (`src/core/auth/auth-manager.js`) - Provider-agnostic authentication manager
- **OAuth Worker** (`workers/oauth-proxy.js`) - Secure Cloudflare Worker proxy for token exchange
- **Provider Implementations** - GitHub (completed), GitLab, Bitbucket, and generic Git (infrastructure ready, integration pending)

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

1. **Initiation**: User clicks "Sign in with [Provider]" (currently GitHub)
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

All Git provider API operations are proxied through the Worker for security (GitHub currently implemented):
```javascript
// Repository operations
await authManager.makeAuthenticatedRequest('fetchRepositories')

// Direct API proxy (Git provider storage compatibility)
await authManager.makeAuthenticatedRequest('/repos/owner/repo/contents/file.md')
```

**Supported Operations:**
- Repository listing and creation
- File reading and writing
- Branch operations
- User information fetching

### Development Setup

For local development with OAuth:
1. Create development OAuth app for your provider (GitHub example - callback: `http://localhost:3000/`)
2. Configure `.dev.vars` with client ID and secret
3. Run Worker locally: `npx wrangler dev --env dev`

See `docs/github-integration.md` for complete OAuth and Git provider documentation.

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

- Bundle size: < 5MB gzipped
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

#### 1.1 Bundle Size Optimization
**Target**: <5MB gzipped (currently >1MB, acceptable for feature-rich editor)
- [ ] Analyze bundle with `npm run bundle-analyzer`
- [ ] Implement code splitting for non-critical features
- [ ] Lazy load heavy dependencies (jspdf, html2canvas)
- [ ] Tree-shake unused CodeMirror extensions
- [ ] Optimize image assets and fonts

#### 1.2 Navigator Component Improvements
**Principles**: KISS, defensive programming
- [ ] Write unit tests for current Navigator behavior
- [ ] Fix keyboard navigation issues
- [ ] Improve document filtering performance
- [ ] Add document sorting options
- [ ] Enhance outline parser for better markdown support
- [ ] Implement virtual scrolling for large document lists

### Phase 2: Component Enhancement (Weeks 3-4)

#### 2.1 Settings Dialog Enhancement
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

**Fantasy Editor** is licensed under the MIT License with Fantasy Editor Forge premium tier.

### Key License Points

- **Open Source**: MIT License provides maximum freedom for personal and commercial use
- **Free Core**: Fantasy Editor core features remain free forever
- **Premium AI**: Fantasy Editor Forge adds AI-powered writing assistance via subscription
- **No Restrictions**: Modify, distribute, and use commercially without limitations

### License Files

- **Primary License**: `docs/license-mit.md` - Full MIT License text
- **EULA**: `docs/eula.md` - End User License Agreement

### Fantasy Editor Forge

**Premium AI-Powered Features:**
- AI writing assistance and content generation
- AI grammar and style guidance
- Smart auto-completion with context awareness
- AI document insights and structure analysis
- AI-powered semantic document search
- Priority support from the Forgewright team

### Important Notes

- Fantasy Editor core is completely free and open source under MIT License
- Fantasy Editor Forge premium features require subscription
- No copyleft restrictions - use and modify freely
- See `docs/license-mit.md` for complete terms

---

**Fantasy Editor** - Single source of truth for development at **forgewright.io**

Documentation is organized in the `docs/` directory with a simplified, flat structure for better maintainability.