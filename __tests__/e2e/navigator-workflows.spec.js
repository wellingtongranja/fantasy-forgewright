/**
 * Navigator E2E Workflow Tests
 * Tests complete Navigator user journeys and workflows
 */

import { test, expect } from '@playwright/test'

test.describe('Navigator Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="editor"]', { timeout: 10000 })
    
    // Create some test documents for testing
    await page.evaluate(() => {
      // Mock some documents in localStorage for testing
      const mockDocuments = [
        {
          id: 'doc-1',
          title: 'The Epic Adventure',
          content: '# Chapter 1\n\nOnce upon a time in a land far away.\n\n## The Hero\n\nA brave knight set forth.\n\n# Chapter 2\n\nThe adventure continues.',
          tags: ['fantasy', 'adventure'],
          updatedAt: new Date(Date.now() - 60000).toISOString()
        },
        {
          id: 'doc-2',
          title: 'Dragon Chronicles',
          content: '# Dragon Lore\n\nDragons are ancient creatures.\n\n## Fire Dragons\n\nThey breathe fire.\n\n## Ice Dragons\n\nThey breathe ice.',
          tags: ['fantasy', 'dragons'],
          updatedAt: new Date(Date.now() - 120000).toISOString()
        },
        {
          id: 'doc-3',
          title: 'Magic Systems',
          content: '# Understanding Magic\n\nMagic comes in many forms.\n\n## Elemental Magic\n\nControl over elements.\n\n## Divine Magic\n\nPower from gods.',
          tags: ['magic', 'worldbuilding'],
          updatedAt: new Date(Date.now() - 180000).toISOString()
        }
      ]

      // Store in IndexedDB simulation
      localStorage.setItem('test-documents', JSON.stringify(mockDocuments))
      localStorage.setItem('recent-documents', JSON.stringify(['doc-1', 'doc-2', 'doc-3']))
    })
  })

  test.describe('Navigator Opening and Closing', () => {
    test('should open Navigator via command palette', async ({ page }) => {
      // Open command palette
      await page.keyboard.press('Control+Space')
      await page.waitForSelector('[data-testid="command-bar"]', { state: 'visible' })

      // Execute documents command
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigator should be visible
      await expect(page.locator('.navigator')).toBeVisible()
      await expect(page.locator('.navigator')).toHaveClass(/visible/)
    })

    test('should auto-unhide Navigator when mouse approaches left edge', async ({ page }) => {
      // Ensure Navigator is hidden and unpinned
      await page.evaluate(() => {
        const navigator = document.querySelector('.navigator')
        if (navigator) {
          navigator.classList.remove('visible')
        }
      })

      // Move mouse to left edge
      await page.mouse.move(5, 300)

      // Navigator should appear
      await expect(page.locator('.navigator')).toHaveClass(/visible/, { timeout: 2000 })
    })

    test('should auto-hide Navigator when mouse leaves (unpinned)', async ({ page }) => {
      // Open Navigator first
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Ensure Navigator is unpinned
      const pinButton = page.locator('.navigator-pin')
      if (await pinButton.hasClass('active')) {
        await pinButton.click()
      }

      // Move mouse away from Navigator
      await page.mouse.move(800, 300)

      // Navigator should hide after delay
      await expect(page.locator('.navigator')).not.toHaveClass(/visible/, { timeout: 2000 })
    })

    test('should close Navigator with Escape key when unpinned', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Press Escape
      await page.keyboard.press('Escape')

      // Navigator should close
      await expect(page.locator('.navigator')).not.toHaveClass(/visible/)
    })
  })

  test.describe('Pin/Unpin Functionality', () => {
    test('should pin Navigator and keep it open', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Pin Navigator
      await page.click('.navigator-pin')

      // Verify pin button is active
      await expect(page.locator('.navigator-pin')).toHaveClass(/active/)

      // Move mouse away - Navigator should stay open
      await page.mouse.move(800, 300)
      await page.waitForTimeout(1500) // Wait longer than auto-hide delay

      // Navigator should still be visible
      await expect(page.locator('.navigator')).toHaveClass(/visible/)
    })

    test('should unpin Navigator and enable auto-hide', async ({ page }) => {
      // Open and pin Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')
      await page.click('.navigator-pin')

      // Unpin Navigator
      await page.click('.navigator-pin')

      // Verify pin button is not active
      await expect(page.locator('.navigator-pin')).not.toHaveClass(/active/)

      // Navigator should auto-hide after short delay
      await expect(page.locator('.navigator')).not.toHaveClass(/visible/, { timeout: 2000 })
    })

    test('should persist pin state across page reloads', async ({ page }) => {
      // Open and pin Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')
      await page.click('.navigator-pin')

      // Reload page
      await page.reload()
      await page.waitForSelector('[data-testid="editor"]')

      // Navigator should be pinned and visible
      await expect(page.locator('.navigator')).toHaveClass(/visible/)
      await expect(page.locator('.navigator-pin')).toHaveClass(/active/)
    })
  })

  test.describe('Tab Navigation', () => {
    test('should switch between Navigator tabs', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Should start with Documents tab active
      await expect(page.locator('[data-tab="documents"]')).toHaveClass(/active/)

      // Switch to Outline tab
      await page.click('[data-tab="outline"]')
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)
      await expect(page.locator('[data-panel="outline"]')).toHaveClass(/active/)

      // Switch to Search tab
      await page.click('[data-tab="search"]')
      await expect(page.locator('[data-tab="search"]')).toHaveClass(/active/)
      await expect(page.locator('[data-panel="search"]')).toHaveClass(/active/)
    })

    test('should open specific tabs via commands', async ({ page }) => {
      // Open Outline tab directly
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':l')
      await page.keyboard.press('Enter')

      await expect(page.locator('.navigator')).toHaveClass(/visible/)
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)

      // Open Search tab directly
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f')
      await page.keyboard.press('Enter')

      await expect(page.locator('[data-tab="search"]')).toHaveClass(/active/)
    })

    test('should use keyboard shortcuts for tab switching', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Use Ctrl+2 to switch to Outline tab
      await page.keyboard.press('Control+2')
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)

      // Use Ctrl+3 to switch to Search tab
      await page.keyboard.press('Control+3')
      await expect(page.locator('[data-tab="search"]')).toHaveClass(/active/)

      // Use Ctrl+1 to switch back to Documents tab
      await page.keyboard.press('Control+1')
      await expect(page.locator('[data-tab="documents"]')).toHaveClass(/active/)
    })
  })

  test.describe('Documents Tab Workflow', () => {
    test('should display document list with Recent/Previous sections', async ({ page }) => {
      // Open Navigator Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Check for section headers
      await expect(page.locator('.section-title')).toContainText(['RECENT', 'PREVIOUS'])

      // Check for document items
      await expect(page.locator('.document-item')).toHaveCount(3)
    })

    test('should filter documents by search term', async ({ page }) => {
      // Open Navigator Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d dragon')
      await page.keyboard.press('Enter')

      // Should focus filter input and apply filter
      await expect(page.locator('.filter-input')).toBeFocused()
      
      // Should show filtered results
      await expect(page.locator('.document-item')).toHaveCount(1)
      await expect(page.locator('.document-item')).toContainText('Dragon Chronicles')
    })

    test('should open document when clicked', async ({ page }) => {
      // Open Navigator Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Click on a document
      await page.click('.document-item[data-doc-id="doc-2"]')

      // Document should load in editor
      await expect(page.locator('#doc-title')).toHaveValue('Dragon Chronicles')
      await expect(page.locator('[data-testid="editor"]')).toContainText('Dragon Lore')
    })

    test('should handle keyboard navigation in document list', async ({ page }) => {
      // Open Navigator Documents tab  
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('.document-item:first-child')).toHaveClass(/selected/)

      // Select with Enter
      await page.keyboard.press('Enter')
      await expect(page.locator('#doc-title')).toHaveValue('The Epic Adventure')
    })
  })

  test.describe('Outline Tab Workflow', () => {
    test('should display document outline', async ({ page }) => {
      // Load a document first
      await page.fill('#doc-title', 'Test Document')
      await page.locator('[data-testid="editor"]').fill('# Chapter 1\n\n## Section A\n\n## Section B\n\n# Chapter 2')

      // Open Outline tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':l')
      await page.keyboard.press('Enter')

      // Check outline structure
      await expect(page.locator('.outline-item.level-1')).toHaveCount(2)
      await expect(page.locator('.outline-item.level-2')).toHaveCount(2)
      await expect(page.locator('.outline-item')).toContainText(['Chapter 1', 'Section A', 'Section B', 'Chapter 2'])
    })

    test('should navigate to heading when clicked', async ({ page }) => {
      // Load a document
      await page.fill('#doc-title', 'Test Document')  
      await page.locator('[data-testid="editor"]').fill('# Chapter 1\n\nSome content\n\n# Chapter 2\n\nMore content')

      // Open Outline tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':l')
      await page.keyboard.press('Enter')

      // Click on Chapter 2
      await page.click('.outline-item[data-line="4"]')

      // Editor should scroll to that position
      // Note: This would require checking editor cursor position in a real test
      await expect(page.locator('.outline-item[data-line="4"]')).toHaveClass(/selected/)
    })

    test('should update outline when document changes', async ({ page }) => {
      // Open Outline tab first
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':l')
      await page.keyboard.press('Enter')

      // Change document content
      await page.locator('[data-testid="editor"]').fill('# New Chapter\n\n## New Section')

      // Outline should update (this may require waiting for content to process)
      await page.waitForTimeout(500)
      await expect(page.locator('.outline-item')).toContainText(['New Chapter', 'New Section'])
    })
  })

  test.describe('Search Tab Workflow', () => {
    test('should perform document search', async ({ page }) => {
      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f')
      await page.keyboard.press('Enter')

      // Perform search
      await page.fill('.search-input', 'dragon')
      await page.keyboard.press('Enter')

      // Should show search results
      await expect(page.locator('.search-result-item')).toHaveCount(1)
      await expect(page.locator('.search-result-item')).toContainText('Dragon Chronicles')
    })

    test('should navigate to search result', async ({ page }) => {
      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f magic')
      await page.keyboard.press('Enter')

      // Wait for search results
      await expect(page.locator('.search-result-item')).toBeVisible()

      // Click on result
      await page.click('.search-result-item')

      // Should load the document
      await expect(page.locator('#doc-title')).toHaveValue('Magic Systems')
    })

    test('should show progress during search', async ({ page }) => {
      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f')
      await page.keyboard.press('Enter')

      // Start search
      await page.fill('.search-input', 'fantasy')
      
      // Progress should be visible briefly
      await page.keyboard.press('Enter')
      // Note: Progress may be too fast to catch in test, but structure should exist
      await expect(page.locator('.search-progress')).toBeInViewport()
    })

    test('should clear search results', async ({ page }) => {
      // Open Search tab and perform search
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f adventure')
      await page.keyboard.press('Enter')

      // Wait for results
      await expect(page.locator('.search-result-item')).toBeVisible()

      // Clear results
      await page.click('.clear-results')

      // Should return to welcome state
      await expect(page.locator('.search-welcome')).toBeVisible()
      await expect(page.locator('.search-input')).toHaveValue('')
    })
  })

  test.describe('Navigator Resizing', () => {
    test('should resize Navigator with drag handle', async ({ page }) => {
      // Open and pin Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')
      await page.click('.navigator-pin')

      // Get initial width
      const initialWidth = await page.locator('.navigator').boundingBox()

      // Drag resize handle
      const resizeHandle = page.locator('.navigator-resize-handle')
      await resizeHandle.dragTo(page.locator('body'), { targetPosition: { x: 400, y: 300 } })

      // Width should have changed
      const newWidth = await page.locator('.navigator').boundingBox()
      expect(newWidth.width).not.toBe(initialWidth.width)
    })

    test('should respect minimum width constraints', async ({ page }) => {
      // Open and pin Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')
      await page.click('.navigator-pin')

      // Try to resize below minimum
      const resizeHandle = page.locator('.navigator-resize-handle')
      await resizeHandle.dragTo(page.locator('body'), { targetPosition: { x: 100, y: 300 } })

      // Should not go below minimum width (280px)
      const width = await page.locator('.navigator').boundingBox()
      expect(width.width).toBeGreaterThanOrEqual(280)
    })

    test('should persist width across sessions', async ({ page }) => {
      // Open, pin, and resize Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')
      await page.click('.navigator-pin')

      const resizeHandle = page.locator('.navigator-resize-handle')
      await resizeHandle.dragTo(page.locator('body'), { targetPosition: { x: 450, y: 300 } })

      const customWidth = await page.locator('.navigator').boundingBox()

      // Reload page
      await page.reload()
      await page.waitForSelector('[data-testid="editor"]')

      // Width should be restored
      const restoredWidth = await page.locator('.navigator').boundingBox()
      expect(restoredWidth.width).toBeCloseTo(customWidth.width, 10)
    })
  })

  test.describe('Cross-Tab Interactions', () => {
    test('should maintain document selection across tabs', async ({ page }) => {
      // Open Documents tab and select document
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      await page.click('.document-item[data-doc-id="doc-2"]')

      // Switch to Outline tab
      await page.click('[data-tab="outline"]')

      // Should show outline for selected document
      await expect(page.locator('.outline-title')).toContainText('Dragon Chronicles')

      // Switch back to Documents tab
      await page.click('[data-tab="documents"]')

      // Selected document should still be highlighted
      await expect(page.locator('.document-item[data-doc-id="doc-2"]')).toHaveClass(/selected/)
    })

    test('should update all relevant tabs when document changes', async ({ page }) => {
      // Open Navigator with Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Load a document
      await page.click('.document-item[data-doc-id="doc-1"]')

      // Switch to Outline tab - should show outline
      await page.click('[data-tab="outline"]')
      await expect(page.locator('.outline-item')).toContainText('Chapter 1')

      // Modify document
      await page.locator('[data-testid="editor"]').fill('# Modified Chapter\n\n## New Section')

      // Outline should update
      await page.waitForTimeout(500)
      await expect(page.locator('.outline-item')).toContainText(['Modified Chapter', 'New Section'])

      // Switch back to Documents tab - document should be marked as updated
      await page.click('[data-tab="documents"]')
      // Note: In a real implementation, there might be visual indicators for unsaved changes
    })
  })

  test.describe('Accessibility Features', () => {
    test('should support keyboard-only navigation', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Tab through interface elements
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Should be able to navigate without mouse
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')

      // Document should load
      await expect(page.locator('#doc-title')).toHaveValue('The Epic Adventure')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Check ARIA attributes
      await expect(page.locator('.navigator')).toHaveAttribute('role', 'navigation')
      await expect(page.locator('.navigator-tabs')).toHaveAttribute('role', 'tablist')
      await expect(page.locator('[data-tab="documents"]')).toHaveAttribute('role', 'tab')
    })

    test('should announce tab changes to screen readers', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Switch tabs
      await page.click('[data-tab="outline"]')

      // Verify aria-selected attributes
      await expect(page.locator('[data-tab="outline"]')).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('[data-tab="documents"]')).toHaveAttribute('aria-selected', 'false')
    })
  })

  test.describe('Performance and Edge Cases', () => {
    test('should handle large document lists efficiently', async ({ page }) => {
      // Create many test documents
      await page.evaluate(() => {
        const manyDocs = Array.from({ length: 100 }, (_, i) => ({
          id: `doc-${i}`,
          title: `Document ${i}`,
          content: `# Document ${i}\n\nContent for document ${i}`,
          tags: [`tag${i % 5}`],
          updatedAt: new Date(Date.now() - i * 1000).toISOString()
        }))
        localStorage.setItem('test-documents', JSON.stringify(manyDocs))
      })

      // Open Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Should load without significant delay
      await expect(page.locator('.document-item')).toHaveCount(100, { timeout: 5000 })
    })

    test('should handle rapid tab switching', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Rapidly switch tabs
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Control+2')
        await page.keyboard.press('Control+1')
        await page.keyboard.press('Control+3')
      }

      // Should end up on Search tab without errors
      await expect(page.locator('[data-tab="search"]')).toHaveClass(/active/)
    })

    test('should gracefully handle missing documents', async ({ page }) => {
      // Clear test documents
      await page.evaluate(() => {
        localStorage.removeItem('test-documents')
        localStorage.removeItem('recent-documents')
      })

      // Open Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Should show empty state
      await expect(page.locator('.documents-empty')).toBeVisible()
      await expect(page.locator('.documents-empty')).toContainText('No documents found')
    })
  })
})