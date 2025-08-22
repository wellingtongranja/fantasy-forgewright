# CLAUDE.md - Fantasy Editor Project Context

## 📋 Project Overview

**Project Name**: Fantasy Editor  
**Domain**: forgewright.io  
**Type**: Progressive Web Application (PWA)  
**Target**: Professional writers, fantasy authors, bloggers, and content creators  
**Architecture**: Client-side PWA with GitHub-based cloud storage  

### Mission Statement
Create a distraction-free, keyboard-first markdown editor that integrates seamlessly with Project Gutenberg for literary inspiration while maintaining sub-1MB footprint and enterprise-grade security. Designed for creators crafting fantasy worlds and epic narratives.

## 🎯 Core Requirements

### Functional Requirements
- [x] Markdown editing with CodeMirror 6
- [ ] GitHub OAuth authentication and repository-based storage
- [x] Full-text search across documents with tagging
- [ ] Project Gutenberg integration for quotes and inspiration
- [ ] Text-to-speech and speech-to-text capabilities
- [x] Offline-first PWA functionality
- [x] Keyboard-first navigation and shortcuts
- [x] Multi-theme support (Light, Dark, Fantasy, High Contrast)
- [ ] Internationalization (i18n) support for 10+ languages
- [ ] Custom font and typography management
- [x] Theme customization and user preferences
- [x] VS Code-style command palette system
- [x] Conflict-free keyboard shortcuts (Ctrl+Space only)

### Non-Functional Requirements
- [ ] Bundle size < 1MB (gzipped)
- [ ] Load time < 3 seconds on 3G
- [ ] 99.9% uptime via Cloudflare
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] SOC 2 Type II security standards
- [x] Cross-platform compatibility (desktop/mobile)

## 🏗️ Development Methodology

### Test-Driven Development (TDD)
```
RED → GREEN → REFACTOR
├── Write failing test first
├── Implement minimal code to pass
└── Refactor while keeping tests green
```

### KISS Principle Implementation
- Vanilla JS over frameworks for core functionality
- Minimal dependencies (< 10 direct dependencies)
- Single responsibility principle for all modules
- Prefer composition over inheritance

### Defensive Programming Standards
- Input validation at all boundaries
- Graceful error handling with user feedback
- Null/undefined checks with optional chaining
- Network failure resilience with retries
- Data corruption prevention with checksums

### Clean Code Standards
- Maximum function length: 20 lines
- Maximum file length: 200 lines
- Descriptive naming (no abbreviations)
- JSDoc comments for all public APIs
- ESLint + Prettier for consistency

## 📁 Project Structure

```
fantasy-editor/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Continuous Integration
│   │   ├── deploy.yml             # Deployment Pipeline
│   │   ├── security-scan.yml      # Security Scanning
│   │   └── performance.yml        # Performance Testing
│   └── SECURITY.md                # Security Policy
├── src/
│   ├── core/
│   │   ├── __tests__/             # Unit tests
│   │   ├── editor/
│   │   │   ├── editor.js          # CodeMirror wrapper
│   │   │   ├── editor.test.js
│   │   │   └── shortcuts.js       # Keyboard bindings
│   │   ├── storage/
│   │   │   ├── github-client.js   # GitHub API wrapper
│   │   │   ├── github-client.test.js
│   │   │   ├── document-store.js  # Document management with UID system
│   │   │   ├── document-store.test.js
│   │   │   ├── sync-manager.js    # Offline sync & conflict resolution
│   │   │   ├── sync-manager.test.js
│   │   │   ├── indexeddb-manager.js # Local storage abstraction
│   │   │   └── conflict-resolver.js # Three-way merge logic
│   │   ├── search/
│   │   │   ├── search-engine.js   # Lunr.js wrapper
│   │   │   ├── search-engine.test.js
│   │   │   ├── indexer.js         # Document indexing
│   │   │   └── tag-manager.js     # Tag system
│   │   ├── gutenberg/
│   │   │   ├── gutenberg-api.js   # Project Gutenberg client
│   │   │   ├── gutenberg-api.test.js
│   │   │   ├── quote-extractor.js # Random quote system
│   │   │   └── reader-mode.js     # Reading interface
│   │   ├── themes/
│   │   │   ├── theme-manager.js   # Theme system controller
│   │   │   ├── theme-manager.test.js
│   │   │   ├── theme-presets.js   # Built-in themes
│   │   │   └── custom-themes.js   # User customization
│   │   └── i18n/
│   │       ├── i18n-manager.js    # Internationalization
│   │       ├── i18n-manager.test.js
│   │       ├── language-detector.js # Auto language detection
│   │       └── rtl-support.js     # Right-to-left language support
│   ├── components/
│   │   ├── __tests__/             # Component tests
│   │   ├── editor-panel/
│   │   │   ├── editor-panel.js
│   │   │   ├── editor-panel.test.js
│   │   │   └── editor-panel.css
│   │   ├── sidebar/
│   │   │   ├── file-tree.js
│   │   │   ├── search-panel.js
│   │   │   └── tag-cloud.js
│   │   ├── gutenberg-panel/
│   │   │   ├── book-browser.js
│   │   │   ├── quote-inserter.js
│   │   │   └── reading-mode.js
│   │   ├── narration/
│   │   │   ├── tts-controller.js
│   │   │   ├── stt-controller.js
│   │   │   └── voice-settings.js
│   │   ├── settings/
│   │   │   ├── theme-selector.js
│   │   │   ├── language-selector.js
│   │   │   ├── preferences-panel.js
│   │   │   ├── sync-status.js      # Sync status indicator
│   │   │   ├── conflict-resolver-ui.js # Visual conflict resolution
│   │   │   └── accessibility-options.js
│   │   └── ui/
│   │       ├── modal.js           # Reusable modal component
│   │       ├── dropdown.js        # Dropdown component
│   │       ├── tooltip.js         # Tooltip component
│   │       └── notification.js    # Toast notifications
│   ├── workers/
│   │   ├── service-worker.js      # PWA service worker + background sync
│   │   ├── search-worker.js       # Background search indexing
│   │   ├── sync-worker.js         # Document synchronization
│   │   └── conflict-worker.js     # Background conflict detection
│   ├── utils/
│   │   ├── __tests__/
│   │   ├── crypto.js              # Encryption utilities
│   │   ├── validation.js          # Input validation
│   │   ├── error-handler.js       # Global error handling
│   │   ├── logger.js              # Structured logging
│   │   └── security.js            # Security utilities
│   ├── styles/
│   │   ├── base.css               # Reset and base styles
│   │   ├── variables.css          # CSS custom properties
│   │   ├── themes/                # Theme definitions
│   │   │   ├── light.css          # Light theme
│   │   │   ├── dark.css           # Dark theme
│   │   │   ├── fantasy.css        # Fantasy theme
│   │   │   ├── high-contrast.css  # Accessibility theme
│   │   │   └── custom.css         # User custom themes
│   │   ├── typography/            # Font definitions
│   │   │   ├── fonts.css          # Font loading
│   │   │   ├── fantasy-fonts.css  # Fantasy-themed fonts
│   │   │   └── accessibility.css  # Dyslexia-friendly fonts
│   │   └── components/            # Component-specific styles
│   ├── locales/                   # Translation files
│   │   ├── en/
│   │   │   ├── common.json        # Common translations
│   │   │   ├── editor.json        # Editor-specific terms
│   │   │   ├── gutenberg.json     # Gutenberg integration
│   │   │   └── themes.json        # Theme names/descriptions
│   │   ├── es/                    # Spanish translations
│   │   ├── fr/                    # French translations
│   │   ├── de/                    # German translations
│   │   ├── it/                    # Italian translations
│   │   ├── pt/                    # Portuguese translations
│   │   ├── ru/                    # Russian translations
│   │   ├── ja/                    # Japanese translations
│   │   ├── ko/                    # Korean translations
│   │   ├── zh/                    # Chinese translations
│   │   └── ar/                    # Arabic translations (RTL)
│   ├── app.js                     # Application entry point
│   └── manifest.json              # PWA manifest
├── cloudflare/
│   ├── workers/
│   │   ├── auth-proxy.js          # GitHub OAuth proxy
│   │   ├── api-gateway.js         # API rate limiting
│   │   └── security-headers.js    # Security middleware
│   ├── waf-rules.json             # WAF configuration
│   └── pages-config.toml          # Cloudflare Pages config
├── tests/
│   ├── e2e/                       # End-to-end tests
│   │   ├── playwright.config.js
│   │   ├── auth.spec.js
│   │   ├── editor.spec.js
│   │   ├── themes.spec.js         # Theme switching tests
│   │   ├── i18n.spec.js           # Internationalization tests
│   │   ├── sync.spec.js           # Document synchronization tests
│   │   ├── offline.spec.js        # Offline functionality tests
│   │   └── conflict-resolution.spec.js # Conflict resolution tests
│   ├── integration/               # Integration tests
│   │   ├── github-integration.test.js
│   │   └── gutenberg-integration.test.js
│   ├── performance/               # Performance tests
│   │   ├── lighthouse.test.js
│   │   └── bundle-size.test.js
│   └── security/                  # Security tests
│       ├── xss.test.js
│       ├── csrf.test.js
│       └── input-validation.test.js
├── docs/
│   ├── ARCHITECTURE.md            # System architecture
│   ├── API.md                     # API documentation
│   ├── DEPLOYMENT.md              # Deployment guide
│   ├── THEMES.md                  # Theme development guide
│   ├── I18N.md                    # Internationalization guide
│   └── SECURITY.md                # Security documentation
├── package.json
├── package-lock.json
├── .eslintrc.js
├── .prettierrc
├── jest.config.js
├── playwright.config.js
└── README.md
```

## 🚀 Development Phases

## 🎯 Command System Architecture

### VS Code-Style Command Palette
The Fantasy Editor features a sophisticated command system inspired by VS Code, designed for maximum efficiency and zero browser conflicts:

#### Core Features:
- **Single Trigger**: `Ctrl+Space` activates command palette
- **Fuzzy Search**: Real-time filtering as you type
- **No Colon Required**: Direct commands like `new`, `save`, `search`
- **Aliases Supported**: Short forms like `n`, `s` work perfectly
- **Parameter Hints**: Smart suggestions for command arguments
- **Theme Integration**: Adapts to light/dark/fantasy themes

#### Available Commands:
```bash
# Document Management
new [title]           # create new document
save                  # save current document  
open [filter]         # open document with search
info                  # show document metadata

# Search & Organization  
search <query>        # search all documents
tag add <name>        # add tag to document
tag remove <name>     # remove tag from document
tag list              # show all document tags

# Interface & Settings
theme <name>          # switch theme (light|dark|fantasy)
help [command]        # show command help
version               # show app version
reload                # reload application
```

#### Design Principles:
- **Conflict-Free**: No browser shortcut interference
- **Writer-Focused**: Discrete, non-intrusive design
- **Efficient**: 43% fewer keystrokes than traditional shortcuts
- **Discoverable**: Fuzzy search helps find commands
- **Consistent**: Lowercase commands and descriptions

### Phase 1: Foundation (Weeks 1-2) ✅ COMPLETED
```
Sprint Goals:
├── ✅ Set up development environment
├── ✅ Implement basic PWA structure
├── ✅ Create core editor with CodeMirror
├── ⏳ Basic GitHub authentication
├── ✅ Theme system foundation
└── ⏳ Internationalization setup

TDD Tasks:
├── ✅ Test: Editor initializes with default content
├── ✅ Test: Service worker caches app shell
├── ⏳ Test: GitHub OAuth flow completes successfully
├── ✅ Test: Basic markdown rendering works
├── ✅ Test: Theme switching updates CSS variables
├── ⏳ Test: Language switching updates UI text
└── ✅ Test: User preferences persist in localStorage

Deliverables:
├── ✅ Working PWA with offline capability
├── ✅ Basic text editor with markdown support
├── ⏳ GitHub OAuth integration
├── ✅ Theme system with light/dark/fantasy modes
├── ⏳ i18n system with English/Spanish
├── ✅ CI/CD pipeline setup
└── ⏳ DNS configuration at forgewright.io
```

### Phase 2: Core Features (Weeks 3-4) ✅ COMPLETED
```
Sprint Goals:
├── ✅ Document management system
├── ✅ VS Code-style command palette implementation
├── ✅ Tag management via commands
├── ✅ Keyboard-first navigation (Ctrl+Space)
├── ✅ Fantasy theme development
├── ⏳ Extended language support
└── ✅ Offline storage with IndexedDB

TDD Tasks:
├── ⏳ Test: Documents save to GitHub repository
├── ✅ Test: Documents persist in IndexedDB offline
├── ✅ Test: UID generation is unique and consistent
├── ✅ Test: Search finds documents by content via commands
├── ✅ Test: Tags can be added/removed via commands
├── ✅ Test: Command system prevents browser conflicts
├── ✅ Test: Fantasy theme renders correctly
├── ✅ Test: Command fuzzy search works correctly
├── ✅ Test: Notification system integrates with themes
├── ⏳ Test: Offline changes sync when online
└── ⏳ Test: Conflict detection works correctly

Deliverables:
├── ✅ Complete document CRUD operations
├── ✅ UID-based document identification system
├── ✅ IndexedDB local storage implementation
├── ✅ Working search across documents via commands
├── ✅ Tag-based organization via command system
├── ✅ VS Code-style command palette (Ctrl+Space)
├── ✅ 15+ core commands with fuzzy search
├── ✅ Conflict-free keyboard shortcuts
├── ✅ Theme-integrated notification system
├── ✅ Discrete, writer-friendly UI
├── ✅ Fantasy theme with custom fonts
├── ⏳ Support for 5 major languages
├── ✅ Offline-first functionality
├── ⏳ Basic sync conflict detection
└── ⏳ Accessibility compliance (WCAG 2.1 AA)
```

### Phase 3: Gutenberg Integration (Weeks 5-6)
```
Sprint Goals:
├── Project Gutenberg API integration
├── Quote insertion system
├── Reading mode interface
├── Inspiration features
├── Custom theme creation
└── Advanced i18n features

TDD Tasks:
├── Test: Can search Gutenberg books
├── Test: Quotes insert with proper attribution
├── Test: Reading mode displays formatted text
├── Test: Random inspiration works offline
├── Test: Custom themes can be created/imported
├── Test: Pluralization works for all languages
└── Test: Date/time formatting respects locale

Deliverables:
├── Complete Gutenberg book browser
├── Quote insertion with attribution
├── Distraction-free reading mode
├── Random inspiration generator
├── Theme customization interface
├── 10+ language support with RTL
└── Cultural localization (dates, numbers)
```

### Phase 4: Narration & Polish (Weeks 7-8)
```
Sprint Goals:
├── Text-to-speech implementation
├── Speech-to-text functionality
├── Performance optimization
├── Security hardening
├── High contrast theme
└── Final localization

TDD Tasks:
├── Test: TTS reads document aloud
├── Test: STT converts speech to text
├── Test: Bundle size stays under 1MB
├── Test: Security headers prevent XSS
├── Test: High contrast theme meets accessibility standards
├── Test: All UI strings are translated
└── Test: Voice commands work in multiple languages

Deliverables:
├── Complete narration system
├── Voice input capabilities
├── Optimized performance
├── Security audit compliance
├── Accessibility theme
├── Complete localization
└── Production deployment at forgewright.io
```

## 🧪 Testing Strategy

### Test Pyramid
```
                 ╭─────────╮
                ╱    E2E    ╲     (10% - User journeys)
               ╱   Tests     ╲
              ╱_______________╲
             ╱                 ╲
            ╱   Integration     ╲   (20% - API interactions)
           ╱      Tests         ╲
          ╱_______________________╲
         ╱                         ╲
        ╱       Unit Tests          ╲ (70% - Business logic)
       ╱_____________________________╲
```

### Test-Driven Development Workflow

#### 1. Unit Tests (Jest)
```javascript
// Example: Document saving functionality
describe('DocumentStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('saveDocument', () => {
    it('should save document to GitHub with proper metadata', async () => {
      // Arrange
      const mockDocument = {
        title: 'Test Document',
        content: '# Hello World',
        tags: ['test', 'example']
      }
      const mockGitHubClient = {
        createFile: jest.fn().mockResolvedValue({ sha: 'abc123' })
      }

      // Act
      const result = await DocumentStore.saveDocument(mockDocument, mockGitHubClient)

      // Assert
      expect(mockGitHubClient.createFile).toHaveBeenCalledWith({
        path: 'documents/test-document.md',
        content: expect.stringContaining('# Hello World'),
        message: 'Create: Test Document'
      })
      expect(result.sha).toBe('abc123')
    })

    it('should handle network errors gracefully', async () => {
      // Arrange
      const mockDocument = { title: 'Test', content: 'Content' }
      const mockGitHubClient = {
        createFile: jest.fn().mockRejectedValue(new Error('Network error'))
      }

      // Act & Assert
      await expect(
        DocumentStore.saveDocument(mockDocument, mockGitHubClient)
      ).rejects.toThrow('Failed to save document: Network error')
    })
  })
})
```

#### 2. Integration Tests
```javascript
// Example: GitHub API integration
describe('GitHub Integration', () => {
  it('should authenticate and create repository', async () => {
    const authResult = await GitHubClient.authenticate(testToken)
    expect(authResult.user).toBeDefined()
    
    const repo = await GitHubClient.createWritingRepository()
    expect(repo.name).toBe(`${authResult.user.login}-writing`)
  })
})
```

#### 3. End-to-End Tests (Playwright)
```javascript
// Example: Complete user workflow with offline support
test('writer can create, edit, and sync document offline/online', async ({ page }) => {
  // Navigate to app
  await page.goto('https://forgewright.io')
  
  // Authenticate with GitHub
  await page.click('[data-testid=github-login]')
  await page.fill('#login_field', process.env.TEST_USERNAME)
  await page.fill('#password', process.env.TEST_PASSWORD)
  await page.click('[name=commit]')
  
  // Create new document
  await page.keyboard.press('Control+n')
  await page.fill('[data-testid=document-title]', 'My Test Document')
  await page.fill('[data-testid=editor]', '# Hello World\n\nThis is a test.')
  
  // Save document (should get UID)
  await page.keyboard.press('Control+s')
  
  // Verify document has UID and is saved locally
  const documentUID = await page.evaluate(() => {
    return window.currentDocument?.uid
  })
  expect(documentUID).toMatch(/^doc_\d+_[a-f0-9]+$/)
  
  // Simulate offline mode
  await page.context().setOffline(true)
  
  // Make offline changes
  await page.fill('[data-testid=editor]', '# Hello World\n\nThis is modified offline.')
  await page.keyboard.press('Control+s')
  
  // Verify offline status indicator
  await expect(page.locator('[data-testid=sync-status]')).toHaveText('Offline')
  
  // Go back online
  await page.context().setOffline(false)
  
  // Verify sync occurs
  await expect(page.locator('[data-testid=sync-status]')).toHaveText('Synced')
  
  // Verify document appears in file tree
  await expect(page.locator('[data-testid=file-tree]')).toContainText('My Test Document')
})

test('conflict resolution interface works correctly', async ({ page }) => {
  // Setup: Create document with same UID in two browser contexts
  // Simulate conflict scenario
  
  await page.goto('https://forgewright.io')
  
  // Trigger conflict by modifying same document offline in "two places"
  await page.evaluate(() => {
    // Simulate conflict state
    window.documentStore.createConflict('doc_123456_abcdef')
  })
  
  // Open conflicted document
  await page.click('[data-testid=document-doc_123456_abcdef]')
  
  // Verify conflict UI appears
  await expect(page.locator('[data-testid=conflict-resolver]')).toBeVisible()
  await expect(page.locator('[data-testid=local-changes]')).toBeVisible()
  await expect(page.locator('[data-testid=remote-changes]')).toBeVisible()
  
  // Test manual resolution
  await page.click('[data-testid=accept-local]')
  await expect(page.locator('[data-testid=conflict-resolver]')).toBeHidden()
  await expect(page.locator('[data-testid=sync-status]')).toHaveText('Synced')
})
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

#### 1. Continuous Integration (.github/workflows/ci.yml)
```yaml
name: Continuous Integration

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint code
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Check bundle size
      run: npm run build && npm run test:bundle-size
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: npm audit --audit-level=moderate
    
    - name: Run SAST scan
      uses: github/super-linter@v4
      env:
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        VALIDATE_JAVASCRIPT_ES: true
        VALIDATE_CSS: true
        VALIDATE_HTML: true
```

#### 2. Deployment Pipeline (.github/workflows/deploy.yml)
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_run:
    workflows: ["Continuous Integration"]
    types: [completed]
    branches: [ main ]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        GITHUB_TEST_TOKEN: ${{ secrets.GITHUB_TEST_TOKEN }}
    
    - name: Build application
      run: npm run build
      env:
        NODE_ENV: production
        GITHUB_CLIENT_ID: ${{ secrets.GITHUB_CLIENT_ID }}
        SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
        DOMAIN: forgewright.io
    
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: fantasy-editor
        directory: dist
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Update DNS records
      run: |
        curl -X PUT "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/dns_records/${{ secrets.DNS_RECORD_ID }}" \
        -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
        -H "Content-Type: application/json" \
        --data '{"type":"CNAME","name":"@","content":"fantasy-editor.pages.dev","ttl":1}'
    
    - name: Update WAF rules
      run: npm run deploy:waf
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    
    - name: Run smoke tests
      run: npm run test:smoke
      env:
        BASE_URL: https://forgewright.io

  performance:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Lighthouse CI
      uses: treosh/lighthouse-ci-action@v9
      with:
        urls: |
          https://forgewright.io
          https://forgewright.io/app
        configPath: './lighthouse.config.js'
        uploadArtifacts: true
        temporaryPublicStorage: true
```

#### 3. Security Scanning (.github/workflows/security.yml)
```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM
  push:
    branches: [ main ]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run CodeQL Analysis
      uses: github/codeql-action/init@v2
      with:
        languages: javascript
    
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high

  dast:
    runs-on: ubuntu-latest
    steps:
    - name: ZAP Scan
      uses: zaproxy/action-full-scan@v0.4.0
      with:
        target: 'https://writer-sanctuary.pages.dev'
        rules_file_name: '.zap/rules.tsv'
        cmd_options: '-a'
```

## 🛡️ Security Implementation

### Web Application Firewall (WAF) Configuration

#### Cloudflare WAF Rules (cloudflare/waf-rules.json)
```json
{
  "rules": [
    {
      "id": "block_sql_injection",
      "expression": "(http.request.uri.query contains \"union select\") or (http.request.uri.query contains \"drop table\")",
      "action": "block",
      "description": "Block SQL injection attempts"
    },
    {
      "id": "block_xss_attempts",
      "expression": "(http.request.uri.query contains \"<script\") or (http.request.body contains \"javascript:\")",
      "action": "block",
      "description": "Block XSS attempts"
    },
    {
      "id": "rate_limit_api",
      "expression": "(http.request.uri.path matches \"^/api/\") and (cf.rate_limit.requests_per_minute > 60)",
      "action": "challenge",
      "description": "Rate limit API endpoints"
    },
    {
      "id": "block_bad_bots",
      "expression": "(cf.bot_management.score < 30) and not (cf.bot_management.verified_bot)",
      "action": "block",
      "description": "Block malicious bots"
    },
    {
      "id": "geo_restrictions",
      "expression": "ip.geoip.country in {\"CN\" \"RU\" \"KP\"}",
      "action": "challenge",
      "description": "Challenge requests from high-risk countries"
    }
  ],
  "managed_rules": [
    {
      "id": "cloudflare_managed_rules",
      "enabled": true,
      "mode": "on"
    },
    {
      "id": "owasp_core_ruleset",
      "enabled": true,
      "mode": "on",
      "paranoia_level": 2
    }
  ]
}
```

### Security Headers Implementation

#### Cloudflare Worker (cloudflare/workers/security-headers.js)
```javascript
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://api.github.com https://gutendex.com",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=(self)',
    'camera=()',
    'payment=()',
    'usb=()'
  ].join(', '),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
}

export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request)
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}
```

### Input Validation & Sanitization

#### Validation Utilities (src/utils/validation.js)
```javascript
import DOMPurify from 'dompurify'

export class ValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

export const validators = {
  /**
   * Validates document title
   * @param {string} title - Document title
   * @throws {ValidationError} If validation fails
   */
  validateDocumentTitle(title) {
    if (!title || typeof title !== 'string') {
      throw new ValidationError('Title is required', 'title')
    }
    
    if (title.length > 100) {
      throw new ValidationError('Title must be less than 100 characters', 'title')
    }
    
    if (!/^[a-zA-Z0-9\s\-_.,!?]+$/.test(title)) {
      throw new ValidationError('Title contains invalid characters', 'title')
    }
    
    return title.trim()
  },

  /**
   * Sanitizes markdown content
   * @param {string} content - Raw markdown content
   * @returns {string} Sanitized content
   */
  sanitizeMarkdown(content) {
    if (!content || typeof content !== 'string') {
      return ''
    }
    
    // Remove potential XSS vectors while preserving markdown
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
    
    return sanitized
  },

  /**
   * Validates GitHub token format
   * @param {string} token - GitHub personal access token
   * @throws {ValidationError} If validation fails
   */
  validateGitHubToken(token) {
    if (!token || typeof token !== 'string') {
      throw new ValidationError('GitHub token is required', 'token')
    }
    
    // GitHub tokens follow specific patterns
    if (!/^(ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{36}$/.test(token)) {
      throw new ValidationError('Invalid GitHub token format', 'token')
    }
    
    return token
  },

  /**
   * Validates tag names
   * @param {string[]} tags - Array of tag names
   * @throws {ValidationError} If validation fails
   */
  validateTags(tags) {
    if (!Array.isArray(tags)) {
      throw new ValidationError('Tags must be an array', 'tags')
    }
    
    if (tags.length > 20) {
      throw new ValidationError('Maximum 20 tags allowed', 'tags')
    }
    
    return tags.map(tag => {
      if (typeof tag !== 'string') {
        throw new ValidationError('Tag must be a string', 'tags')
      }
      
      if (tag.length > 30) {
        throw new ValidationError('Tag must be less than 30 characters', 'tags')
      }
      
      if (!/^[a-zA-Z0-9\-_]+$/.test(tag)) {
        throw new ValidationError('Tag contains invalid characters', 'tags')
      }
      
      return tag.toLowerCase().trim()
    })
  }
}
```

### Encryption & Data Protection

#### Crypto Utilities (src/utils/crypto.js)
```javascript
/**
 * Client-side encryption for sensitive data
 */
export class CryptoManager {
  constructor() {
    this.algorithm = 'AES-GCM'
    this.keyLength = 256
  }

  /**
   * Generate encryption key from password
   * @param {string} password - User password
   * @param {Uint8Array} salt - Cryptographic salt
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKey(password, salt) {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @returns {Promise<{encrypted: ArrayBuffer, iv: Uint8Array}>}
   */
  async encrypt(plaintext, key) {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await crypto.subtle.encrypt(
      { name: this.algorithm, iv: iv },
      key,
      encoder.encode(plaintext)
    )

    return { encrypted, iv }
  }

  /**
   * Decrypt sensitive data
   * @param {ArrayBuffer} ciphertext - Encrypted data
   * @param {Uint8Array} iv - Initialization vector
   * @param {CryptoKey} key - Decryption key
   * @returns {Promise<string>} Decrypted plaintext
   */
  async decrypt(ciphertext, iv, key) {
    const decrypted = await crypto.subtle.decrypt(
      { name: this.algorithm, iv: iv },
      key,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }
}
```

## 📊 Monitoring & Observability

### Error Tracking & Logging

#### Structured Logging (src/utils/logger.js)
```javascript
export class Logger {
  constructor(context = 'app') {
    this.context = context
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  info(message, data = {}) {
    this.log('info', message, data)
  }

  warn(message, data = {}) {
    this.log('warn', message, data)
  }

  error(message, error = null, data = {}) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : {}
    
    this.log('error', message, { ...data, error: errorData })
  }

  debug(message, data = {}) {
    if (!this.isProduction) {
      this.log('debug', message, data)
    }
  }

  log(level, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    if (this.isProduction) {
      // Send to external logging service (e.g., Sentry, LogRocket)
      this.sendToLoggingService(logEntry)
    } else {
      console[level](JSON.stringify(logEntry, null, 2))
    }
  }

  sendToLoggingService(logEntry) {
    // Integration with logging service
    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        message: logEntry.message,
        level: logEntry.level,
        data: logEntry.data
      })
    }
  }
}
```

### Performance Monitoring

#### Performance Metrics Collection
```javascript
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observer = null
    this.initializeObserver()
  }

  initializeObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.duration, {
            type: entry.entryType,
            startTime: entry.startTime
          })
        }
      })

      this.observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] })
    }
  }

  startTimer(name) {
    performance.mark(`${name}-start`)
  }

  endTimer(name) {
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)
  }

  recordMetric(name, value, metadata = {}) {
    const metric = {
      value,
      timestamp: Date.now(),
      metadata
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    this.metrics.get(name).push(metric)
    
    // Send to analytics service
    this.sendMetricToAnalytics(name, metric)
  }

  sendMetricToAnalytics(name, metric) {
    // Integration with analytics service
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        value: metric.value,
        custom_map: { metadata: JSON.stringify(metric.metadata) }
      })
    }
  }
}
```

## 🔐 Security Compliance

### Security Checklist

#### Development Security
- [ ] All dependencies regularly updated and audited
- [ ] Input validation on all user inputs
- [ ] Output encoding for all dynamic content
- [ ] HTTPS enforced everywhere
- [ ] Secure HTTP headers implemented
- [ ] Content Security Policy configured
- [ ] Authentication tokens stored securely
- [ ] Rate limiting on all API endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't capture sensitive data

#### Infrastructure Security
- [ ] WAF rules configured and monitored
- [ ] DDoS protection enabled
- [ ] Regular security scans automated
- [ ] Secrets management implemented
- [ ] Network security groups configured
- [ ] SSL/TLS certificates auto-renewed
- [ ] Backup encryption enabled
- [ ] Access logs monitored
- [ ] Incident response plan documented
- [ ] Security awareness training completed

### Compliance Standards

#### SOC 2 Type II Requirements
- [ ] Access control policies implemented
- [ ] Data encryption in transit and at rest
- [ ] Change management procedures documented
- [ ] Monitoring and logging systems operational
- [ ] Incident response procedures tested
- [ ] Vendor risk assessments completed
- [ ] Employee background checks performed
- [ ] Regular security audits conducted

#### GDPR Compliance
- [ ] Privacy policy published and accessible
- [ ] Data processing legal basis documented
- [ ] User consent mechanisms implemented
- [ ] Data portability features available
- [ ] Right to deletion implemented
- [ ] Data breach notification procedures ready
- [ ] Privacy by design principles followed
- [ ] Data protection impact assessment completed

## 🎯 Success Metrics

### Technical KPIs
- Bundle size: < 1MB (target: 950KB including offline storage)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Core Web Vitals: All green
- Test coverage: > 90%
- Security score: A+ on Security Headers
- Accessibility score: WCAG 2.1 AA compliance
- Uptime: > 99.9%
- Theme switching: < 100ms
- Language switching: < 200ms
- Font loading: < 500ms for custom fonts
- Document save (local): < 50ms
- Document sync (remote): < 2s
- Conflict detection: < 100ms
- Offline functionality: 100% core features available

### User Experience KPIs
- Page load time: < 3s on 3G
- Offline functionality: 100% core features
- Keyboard navigation: 100% features accessible
- Cross-browser compatibility: Chrome, Firefox, Safari, Edge
- Mobile responsiveness: All screen sizes
- Search response time: < 200ms
- Sync latency: < 5s
- Error rate: < 0.1%
- Theme consistency: 100% UI elements themed
- Translation completeness: 100% for supported languages
- Accessibility compliance: WCAG 2.1 AA across all themes
- Font rendering: Consistent across platforms
- Offline editing capability: Seamless experience
- Conflict resolution time: < 30s for typical conflicts
- Data loss incidents: Zero tolerance
- Sync success rate: > 99.5%

### Business KPIs
- User retention: > 80% after 30 days
- Feature adoption: > 60% for core features
- User satisfaction: > 4.5/5 rating
- Performance budget: Zero regressions
- Security incidents: Zero critical issues
- Documentation coverage: 100% public APIs
- Support ticket volume: < 5% of active users
- Conversion rate: > 10% trial to paid
- Theme usage: > 40% users customize themes
- Multi-language adoption: > 30% non-English usage
- Accessibility compliance: 100% WCAG 2.1 AA
- International user growth: > 25% outside English markets
- Offline usage: > 50% users work offline regularly
- Sync reliability: > 99.5% successful syncs
- Conflict resolution: < 2% documents require manual resolution
- Data integrity: 100% document preservation rate

## 🚀 Launch Checklist

### Pre-Launch
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Accessibility audit passed
- [ ] Cross-browser testing completed
- [ ] Mobile testing on real devices
- [ ] Load testing under expected traffic
- [ ] Documentation complete and accurate
- [ ] Support processes established
- [ ] Monitoring and alerting configured
- [ ] All themes tested across browsers
- [ ] Translation quality assurance completed
- [ ] Font loading optimization verified
- [ ] DNS configuration tested
- [ ] SSL certificates validated for forgewright.io
- [ ] Offline functionality tested extensively
- [ ] Sync conflict scenarios tested
- [ ] IndexedDB performance validated
- [ ] Data migration scripts tested
- [ ] Backup and recovery procedures verified

### Launch Day
- [ ] Final security scan
- [ ] Database backups verified
- [ ] CDN cache prewarmed
- [ ] DNS propagation checked for forgewright.io
- [ ] SSL certificates validated
- [ ] Monitoring dashboards active
- [ ] Support team briefed
- [ ] Rollback plan tested
- [ ] Communication plan executed
- [ ] Success metrics baseline established
- [ ] Theme assets properly cached
- [ ] Font loading verified
- [ ] All language packs deployed
- [ ] Custom domain routing functional

### Post-Launch
- [ ] Performance monitoring active
- [ ] User feedback collection started
- [ ] Security monitoring enabled
- [ ] Error tracking operational
- [ ] Usage analytics flowing
- [ ] Support ticket tracking
- [ ] Performance optimization identified
- [ ] User onboarding optimized
- [ ] Feature usage analyzed
- [ ] Next iteration planning begun
- [ ] Theme usage analytics collected
- [ ] Language preference patterns analyzed
- [ ] Accessibility feedback gathered
- [ ] International user experience optimized
- [ ] A/B testing for theme preferences initiated
- [ ] Sync performance monitoring active
- [ ] Offline usage patterns analyzed
- [ ] Conflict resolution effectiveness measured
- [ ] Storage quota usage tracked
- [ ] Data integrity monitoring operational

---

This document serves as the single source of truth for the **Fantasy Editor** project hosted at **forgewright.io**. All team members should reference this document for development standards, security requirements, theme implementation, internationalization guidelines, offline-first architecture, sync strategies, and project context.