# Legal Documents Management Subsystem - Implementation Plan

## 📋 Project Overview

A reusable legal documents management component with secure worker infrastructure, strict CORS enforcement, and PWA notification support for Fantasy Editor. The system automatically tracks legal document changes, syncs to private Git repository, and prompts users for acceptance with a professional splash screen interface.

## 🏗️ System Architecture

### Core Components
- **Document Tracker** - Hash-based change detection for local documents
- **Git Sync Manager** - Secure synchronization with private repository
- **Acceptance Manager** - User consent tracking in IndexedDB
- **Secure Worker** - Private Cloudflare Worker with strict CORS
- **Splash Screen** - PWA-compliant UI with app logo integration
- **Notification System** - PWA notifications for document updates

### Repository Structure
```
fantasy-editor-legal/ (private repo)
├── documents/
│   ├── privacy-policy.md
│   ├── terms-of-service.md
│   ├── eula.md
│   ├── LICENSE.md
│   └── release-notes.md
└── metadata.json
```

### Security Features
- Private worker (not publicly accessible)
- Strict CORS enforcement (fantasy.forgewright.io only)
- Rate limiting per IP address
- Document hash verification
- Content Security Policy headers
- HTTPS-only communication

## ✅ TODO List - Phase-by-Phase Implementation

### Phase 1: Core Infrastructure ✅ COMPLETED

#### Document Tracking System
- [ ] Create `src/core/legal/legal-manager.js` - Main coordinator class
- [x] Create `src/core/legal/legal-tracker.js` - Hash-based change detection
- [ ] Create `src/core/legal/legal-sync.js` - Git repository operations
- [ ] Create `src/core/legal/legal-constants.js` - Document paths and types
- [x] Implement SHA-256 hashing for document integrity
- [x] Create local document monitoring system

#### Storage System
- [x] Extend IndexedDB schema for legal acceptances
- [x] Create `src/core/legal/legal-acceptance.js` - Acceptance manager
- [x] Implement acceptance record storage with user ID linking
- [x] Add acceptance history and versioning support

#### Tests for Phase 1
- [x] Write unit tests for document hashing
- [x] Write unit tests for change detection
- [x] Write unit tests for acceptance storage
- [ ] Write integration tests for core legal manager

### Phase 2: Secure Cloudflare Worker ⏳ Not Started

#### Worker Infrastructure
- [ ] Create `workers/legal-docs-worker.js` - Secure private worker
- [ ] Implement strict CORS enforcement (fantasy.forgewright.io only)
- [ ] Add rate limiting with KV storage (10 requests/minute per IP)
- [ ] Create GitHub API integration for private repo access
- [ ] Add comprehensive error handling and logging

#### Worker Configuration
- [ ] Update `wrangler.toml` with legal worker configuration
- [ ] Set up environment variables (production/staging/development)
- [ ] Configure encrypted secrets (GitHub token, dev secret)
- [ ] Set up KV namespace for rate limiting storage

#### Worker Endpoints
- [ ] Implement `GET /legal/check` - Metadata endpoint with caching
- [ ] Implement `GET /legal/documents` - Document fetching endpoint
- [ ] Add security headers to all responses
- [ ] Implement document integrity verification

#### Tests for Phase 2
- [ ] Write worker unit tests for CORS enforcement
- [ ] Write tests for rate limiting functionality
- [ ] Write tests for GitHub API integration
- [ ] Write end-to-end tests for worker endpoints

### Phase 3: Client Integration ⏳ Not Started

#### Secure Client
- [ ] Create `src/core/legal/legal-client.js` - Worker communication
- [ ] Implement secure API calls with error handling
- [ ] Add document hash verification on client side
- [ ] Implement caching and offline fallback mechanisms
- [ ] Add retry logic with exponential backoff

#### PWA Icon Integration
- [ ] Create function to load PWA icons from manifest.json
- [ ] Add fallback to default icons in /dist directory
- [ ] Implement dynamic icon loading for splash screen
- [ ] Ensure icons work across all themes (light/dark/fantasy)

#### Tests for Phase 3
- [ ] Write tests for client API communication
- [ ] Write tests for PWA icon loading
- [ ] Write tests for offline functionality
- [ ] Write tests for error handling scenarios

### Phase 4: Splash Screen UI ⏳ Not Started

#### Core Component
- [ ] Create `src/components/legal-splash/legal-splash.js`
- [ ] Create `src/components/legal-splash/legal-splash.css`
- [ ] Implement tabbed document viewer with PWA logo
- [ ] Add scroll tracking for "read progress" indicator
- [ ] Create checkbox validation system

#### UI Features
- [ ] Add app logo integration from PWA manifest
- [ ] Implement tab navigation with visual feedback
- [ ] Add progress bar showing document read percentage
- [ ] Create "Accept All" vs "Accept Required" button logic
- [ ] Add mobile-responsive design

#### Accessibility
- [ ] Add ARIA labels and roles for screen readers
- [ ] Implement keyboard navigation support
- [ ] Ensure high contrast ratios across all themes
- [ ] Add focus management for modal interactions

#### Tests for Phase 4
- [ ] Write component render tests
- [ ] Write interaction tests (scroll tracking, tab switching)
- [ ] Write accessibility tests
- [ ] Write mobile responsive tests

### Phase 5: PWA Notification System ⏳ Not Started

#### Notification Manager
- [ ] Create `src/core/legal/notification-manager.js`
- [ ] Implement permission request system
- [ ] Add user opt-in preference storage
- [ ] Create notification with PWA icons and actions
- [ ] Add notification click handlers

#### Service Worker Integration
- [ ] Extend existing service worker for legal notifications
- [ ] Add push message handling with source verification
- [ ] Implement notification actions (Review Now, Remind Later)
- [ ] Add reminder scheduling functionality

#### Tests for Phase 5
- [ ] Write notification permission tests
- [ ] Write service worker integration tests
- [ ] Write notification interaction tests
- [ ] Write push message handling tests

### Phase 6: GitHub Actions & Automation ⏳ Not Started

#### Automated Sync
- [ ] Create `.github/workflows/legal-sync.yml`
- [ ] Add document change detection in CI/CD
- [ ] Implement automatic push to fantasy-editor-legal repo
- [ ] Add version enforcement for releases

#### Admin Integration
- [ ] Add admin-only document sync functionality
- [ ] Create command for manual sync trigger
- [ ] Add sync status reporting
- [ ] Implement conflict resolution for concurrent changes

#### Tests for Phase 6
- [ ] Write GitHub Actions workflow tests
- [ ] Write admin sync functionality tests
- [ ] Write conflict resolution tests

### Phase 7: Settings Integration ⏳ Not Started

#### Legal Settings Tab
- [ ] Create `src/components/settings-dialog/tabs/legal-tab.js`
- [ ] Add accepted documents viewer
- [ ] Implement "Check for Updates" functionality
- [ ] Add acceptance history display
- [ ] Create notification preferences UI

#### Status Bar Integration
- [ ] Add legal status indicator (§ icon)
- [ ] Implement color coding (green/yellow/red)
- [ ] Add click handler to show legal status details
- [ ] Integrate with existing status bar layout

#### Tests for Phase 7
- [ ] Write settings tab tests
- [ ] Write status bar integration tests
- [ ] Write user preference tests

## 🔒 Security Requirements Checklist

### Worker Security
- [ ] Worker URL not publicly discoverable
- [ ] Strict CORS origin validation (fantasy.forgewright.io only)
- [ ] Rate limiting implemented (10 req/min per IP)
- [ ] No credentials sent in requests
- [ ] Document hash verification on both ends
- [ ] CSP headers on all responses
- [ ] HTTPS-only communication enforced
- [ ] No cookies or localStorage for authentication
- [ ] Comprehensive error logging without data leaks

### Client Security
- [ ] Sanitized markdown rendering
- [ ] XSS prevention in all inputs
- [ ] Content Security Policy compliance
- [ ] Secure hash verification
- [ ] No sensitive data in console logs
- [ ] Proper error boundaries

## 📊 Success Metrics

### Performance
- [ ] Worker response time < 100ms
- [ ] Splash screen load time < 2s
- [ ] Document integrity verification < 50ms
- [ ] Offline functionality works seamlessly

### Security
- [ ] Zero security vulnerabilities in security scan
- [ ] 100% CORS compliance
- [ ] Rate limiting effectiveness validated
- [ ] Document integrity always verified

### User Experience
- [ ] Intuitive acceptance flow
- [ ] Clear visual feedback
- [ ] Accessible to all users
- [ ] Works across all themes and devices

### Technical Quality
- [ ] Test coverage > 90%
- [ ] All functions < 20 lines
- [ ] All files < 200 lines
- [ ] Zero code duplication
- [ ] Comprehensive error handling

## 🚀 Implementation Standards

### Code Quality
- **TDD Approach**: Write tests first, then implementation
- **Clean Code**: Max 20 lines per function, 200 lines per file
- **Defensive Programming**: Validate all inputs, handle all errors
- **KISS Principle**: Keep it simple, avoid over-engineering
- **Security First**: Always validate, sanitize, and verify

### Testing Strategy
- Unit tests for all core functions
- Integration tests for component interactions
- Security tests for all attack vectors
- Performance tests for all critical paths
- Accessibility tests for UI components

### Documentation
- JSDoc comments for all public APIs
- README for each major component
- Security guidelines documentation
- Testing procedures documentation

## 📝 Session Notes

### Working Session Log
- **Session 1** (2025-09-08): Initial architecture planning and security requirements definition
- **Session 2** (2025-09-09): Phase 1 implementation - Core infrastructure ✅ COMPLETED
  - Implemented LegalDocumentTracker with SHA-256 hashing and fallback for testing
  - Implemented LegalAcceptanceManager with IndexedDB integration
  - Created comprehensive unit tests (65 passing tests)
  - All core document tracking and acceptance functionality working
- **Session 3** (TBD): Phase 2 implementation - Secure worker
- **Session 4** (TBD): Phase 3 implementation - Client integration
- **Session 5** (TBD): Phase 4 implementation - Splash screen UI
- **Session 6** (TBD): Phase 5 implementation - PWA notifications
- **Session 7** (TBD): Phase 6 implementation - GitHub automation
- **Session 8** (TBD): Phase 7 implementation - Settings integration
- **Session 9** (TBD): Final testing and security audit

### Key Decisions Made
1. **Private Worker**: Worker will not be publicly accessible, strict CORS enforcement
2. **Git Repository**: `fantasy-editor-legal` private repo with `documents/` folder structure  
3. **Document Source**: Use existing docs/ files, rename `license-agpl.md` to `LICENSE.md`
4. **PWA Integration**: Use manifest.json icons, follow PWA notification standards
5. **Security First**: Hash verification, rate limiting, CSP headers, no credentials
6. **Reusable Design**: Generic component that can be used in other projects

### Current Status
- **Phase**: Phase 1 Complete ✅ (Core Infrastructure)
- **Next Phase**: Phase 2 - Secure Cloudflare Worker
- **Completed**: Document tracking, acceptance management, unit tests
- **Blockers**: None identified
- **Dependencies**: None external

---

## 📞 Contact & Support

For questions about this implementation plan or legal system requirements:
- Review this document before each working session
- Update TODO status as work progresses  
- Add session notes with key decisions and blockers
- Keep security checklist updated

**Last Updated**: September 8, 2025  
**Next Review**: Before Phase 1 implementation