# Testing Strategy - Fantasy Editor

## 🧪 Test Pyramid

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

## 🔄 Test-Driven Development Workflow

### RED → GREEN → REFACTOR

1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green

## 🧩 Unit Tests (Jest)

### Document Store Example

```javascript
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

### Command System Tests

```javascript
describe('Command Registry', () => {
  it('should execute commands through Ctrl+Space only', async () => {
    const commandRegistry = new CommandRegistry()
    const mockCommand = jest.fn()
    
    commandRegistry.register('test', mockCommand)
    
    // Test command execution
    await commandRegistry.execute('test', ['arg1'])
    expect(mockCommand).toHaveBeenCalledWith(['arg1'])
  })

  it('should prevent browser shortcut conflicts', () => {
    const forbiddenShortcuts = ['Ctrl+K', 'Ctrl+F', 'Ctrl+N', 'Ctrl+E']
    
    forbiddenShortcuts.forEach(shortcut => {
      expect(() => {
        registerKeyboardShortcut(shortcut, () => {})
      }).toThrow('Only Ctrl+Space is allowed as keyboard shortcut')
    })
  })
})
```

## 🔗 Integration Tests

### GitHub API Integration

```javascript
describe('GitHub Integration', () => {
  it('should authenticate and create repository', async () => {
    const authResult = await GitHubClient.authenticate(testToken)
    expect(authResult.user).toBeDefined()
    
    const repo = await GitHubClient.createWritingRepository()
    expect(repo.name).toBe(`${authResult.user.login}-writing`)
  })

  it('should sync documents with conflict detection', async () => {
    const localDoc = { uid: 'doc_123', content: 'Local changes' }
    const remoteDoc = { uid: 'doc_123', content: 'Remote changes' }
    
    const result = await SyncManager.syncDocument(localDoc, remoteDoc)
    expect(result.hasConflict).toBe(true)
    expect(result.conflictResolution).toBeDefined()
  })
})
```

## 🎭 End-to-End Tests (Playwright)

### Complete User Workflow with Offline Support

```javascript
test('writer can create, edit, and sync document offline/online', async ({ page }) => {
  // Navigate to app
  await page.goto('https://forgewright.io')
  
  // Authenticate with GitHub
  await page.click('[data-testid=github-login]')
  await page.fill('#login_field', process.env.TEST_USERNAME)
  await page.fill('#password', process.env.TEST_PASSWORD)
  await page.click('[name=commit]')
  
  // Create new document via command palette
  await page.keyboard.press('Control+Space')
  await page.fill('[data-testid=command-input]', 'new Test Document')
  await page.keyboard.press('Enter')
  
  // Edit document
  await page.fill('[data-testid=editor]', '# Hello World\n\nThis is a test.')
  
  // Save document
  await page.keyboard.press('Control+Space')
  await page.fill('[data-testid=command-input]', 'save')
  await page.keyboard.press('Enter')
  
  // Verify document has UID and is saved locally
  const documentUID = await page.evaluate(() => {
    return window.currentDocument?.uid
  })
  expect(documentUID).toMatch(/^doc_\d+_[a-f0-9]+$/)
  
  // Simulate offline mode
  await page.context().setOffline(true)
  
  // Make offline changes
  await page.fill('[data-testid=editor]', '# Hello World\n\nModified offline.')
  await page.keyboard.press('Control+Space')
  await page.fill('[data-testid=command-input]', 'save')
  await page.keyboard.press('Enter')
  
  // Verify offline status indicator
  await expect(page.locator('[data-testid=sync-status]')).toHaveText('Offline')
  
  // Go back online
  await page.context().setOffline(false)
  
  // Verify sync occurs
  await expect(page.locator('[data-testid=sync-status]')).toHaveText('Synced')
})
```

### Conflict Resolution Interface

```javascript
test('conflict resolution interface works correctly', async ({ page }) => {
  await page.goto('https://forgewright.io')
  
  // Simulate conflict state
  await page.evaluate(() => {
    window.documentStore.createConflict('doc_123456_abcdef')
  })
  
  // Open conflicted document
  await page.keyboard.press('Control+Space')
  await page.fill('[data-testid=command-input]', 'open conflicted')
  await page.keyboard.press('Enter')
  
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

### Command System E2E Tests

```javascript
test('command system prevents browser shortcut conflicts', async ({ page }) => {
  await page.goto('https://forgewright.io')
  
  // Test that forbidden shortcuts don't interfere
  const forbiddenShortcuts = ['Control+k', 'Control+f', 'Control+n']
  
  for (const shortcut of forbiddenShortcuts) {
    // These should trigger browser behavior, not app behavior
    await page.keyboard.press(shortcut)
    
    // Verify app didn't capture the shortcut
    const commandBar = page.locator('[data-testid=command-bar]')
    await expect(commandBar).not.toBeVisible()
  }
  
  // Verify only Ctrl+Space works
  await page.keyboard.press('Control+Space')
  await expect(page.locator('[data-testid=command-bar]')).toBeVisible()
})
```

## 🎨 Theme Testing

### Theme Switching Tests

```javascript
describe('Theme System', () => {
  it('should switch themes without browser conflicts', async ({ page }) => {
    await page.goto('https://forgewright.io')
    
    // Switch to dark theme via command
    await page.keyboard.press('Control+Space')
    await page.fill('[data-testid=command-input]', 'theme dark')
    await page.keyboard.press('Enter')
    
    // Verify theme change
    const body = page.locator('body')
    await expect(body).toHaveClass(/theme-dark/)
    
    // Test fantasy theme
    await page.keyboard.press('Control+Space')
    await page.fill('[data-testid=command-input]', 'theme fantasy')
    await page.keyboard.press('Enter')
    
    await expect(body).toHaveClass(/theme-fantasy/)
  })
})
```

## 📱 Mobile Testing

### Responsive Design Tests

```javascript
test('mobile command palette works correctly', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('https://forgewright.io')
  
  // Test command palette on mobile
  await page.keyboard.press('Control+Space')
  const commandBar = page.locator('[data-testid=command-bar]')
  
  await expect(commandBar).toBeVisible()
  await expect(commandBar).toHaveCSS('width', '90vw') // Mobile responsive width
})
```

## 🔍 Accessibility Testing

### WCAG Compliance Tests

```javascript
test('command system is keyboard accessible', async ({ page }) => {
  await page.goto('https://forgewright.io')
  
  // Open command palette
  await page.keyboard.press('Control+Space')
  
  // Navigate through commands with keyboard
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  
  // Verify focus management
  const focusedElement = page.locator(':focus')
  await expect(focusedElement).toBeDefined()
})
```

## 📊 Performance Testing

### Bundle Size Tests

```javascript
describe('Bundle Size', () => {
  it('should stay under 1MB gzipped', async () => {
    const bundleStats = await getBundleStats()
    const gzippedSize = bundleStats.gzippedSize
    
    expect(gzippedSize).toBeLessThan(1024 * 1024) // 1MB
  })
})
```

### Loading Performance Tests

```javascript
test('app loads in under 3 seconds on 3G', async ({ page }) => {
  await page.context().route('**/*', route => {
    // Simulate 3G network conditions
    route.fulfill({
      ...route.request(),
      delay: 100
    })
  })
  
  const startTime = Date.now()
  await page.goto('https://forgewright.io')
  await page.waitForSelector('[data-testid=editor]')
  const loadTime = Date.now() - startTime
  
  expect(loadTime).toBeLessThan(3000)
})
```

## 🎯 Test Coverage Requirements

- Unit Tests: 70% of total tests
- Integration Tests: 20% of total tests  
- E2E Tests: 10% of total tests
- Overall Coverage: >90%
- Critical Path Coverage: 100%

## 🏃‍♂️ Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage

# Test specific component
npm run test -- command-registry

# Watch mode for development
npm run test:watch
```

## 🚨 Test Requirements

### Command System Testing
- ✅ All commands must be testable via registry
- ✅ No direct keyboard event testing (conflicts with browser)
- ✅ Fuzzy search algorithm must have unit tests
- ✅ Command execution must handle errors gracefully

### Browser Conflict Prevention
- ✅ Test that forbidden shortcuts don't register
- ✅ Verify only Ctrl+Space activates command palette
- ✅ Ensure browser shortcuts remain functional

### Offline Functionality
- ✅ Test document persistence in IndexedDB
- ✅ Verify sync when going back online
- ✅ Test conflict detection and resolution
- ✅ Ensure graceful handling of network failures

### Theme System
- ✅ Test all theme switches via commands
- ✅ Verify theme persistence across sessions
- ✅ Test theme consistency across all components
- ✅ Validate accessibility in all themes

This testing strategy ensures Fantasy Editor maintains its core principles: conflict-free operation, reliable offline functionality, and consistent user experience across all platforms and themes.