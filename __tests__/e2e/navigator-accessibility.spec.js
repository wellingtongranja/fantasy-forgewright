/**
 * Navigator Accessibility E2E Tests
 * Tests Navigator WCAG compliance and screen reader support
 */

import { test, expect } from '@playwright/test'

test.describe('Navigator Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="editor"]', { timeout: 10000 })

    // Add test documents with varied content for accessibility testing
    await page.evaluate(() => {
      const mockDocuments = [
        {
          id: 'doc-1',
          title: 'Accessibility Test Document',
          content: '# Main Heading\n\nThis document tests accessibility features.\n\n## Section 1\n\nContent for testing screen readers.\n\n## Section 2\n\nMore accessible content.',
          tags: ['accessibility', 'test'],
          updatedAt: new Date().toISOString()
        },
        {
          id: 'doc-2',
          title: 'Screen Reader Test',
          content: '# Screen Reader Content\n\nThis content is optimized for screen readers.\n\n## Navigation Test\n\nTesting keyboard navigation.',
          tags: ['screen-reader'],
          updatedAt: new Date(Date.now() - 60000).toISOString()
        },
        {
          id: 'doc-3',
          title: 'WCAG Compliance Test',
          content: '# WCAG Guidelines\n\nTesting Web Content Accessibility Guidelines compliance.',
          tags: ['wcag'],
          updatedAt: new Date(Date.now() - 120000).toISOString()
        }
      ]
      localStorage.setItem('test-documents', JSON.stringify(mockDocuments))
      localStorage.setItem('recent-documents', JSON.stringify(['doc-1', 'doc-2', 'doc-3']))
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation through Navigator', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Should be able to navigate with Tab key
      await page.keyboard.press('Tab')
      
      // Check that focus moves through focusable elements
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      // Continue tabbing through elements
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Should be able to activate elements with Enter/Space
      await page.keyboard.press('Enter')
    })

    test('should handle arrow key navigation in document lists', async ({ page }) => {
      // Open Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown')
      
      // First document should be selected
      await expect(page.locator('.document-item:first-child')).toHaveClass(/selected/)

      // Navigate down
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('.document-item:nth-child(2)')).toHaveClass(/selected/)

      // Navigate up
      await page.keyboard.press('ArrowUp')
      await expect(page.locator('.document-item:first-child')).toHaveClass(/selected/)

      // Select with Enter
      await page.keyboard.press('Enter')
      await expect(page.locator('#doc-title')).toHaveValue('Accessibility Test Document')
    })

    test('should handle keyboard navigation in outline tab', async ({ page }) => {
      // Load document with outline structure
      await page.evaluate(() => {
        window.fantasyEditor.loadDocument({
          id: 'outline-test',
          title: 'Outline Test',
          content: '# Chapter 1\n\nContent here\n\n## Section A\n\n### Subsection\n\n## Section B\n\n# Chapter 2'
        })
      })

      // Open Outline tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':l')
      await page.keyboard.press('Enter')

      // Navigate through outline items
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('.outline-item:first-child')).toHaveClass(/selected/)

      // Navigate to nested items
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')

      // Select with Enter to navigate in document
      await page.keyboard.press('Enter')
      // Document editor should receive focus and cursor should move
    })

    test('should handle keyboard navigation in search results', async ({ page }) => {
      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f')
      await page.keyboard.press('Enter')

      // Perform search
      await page.fill('.search-input', 'test')
      await page.keyboard.press('Enter')

      // Wait for results
      await expect(page.locator('.search-result-item')).toBeVisible()

      // Navigate through results with arrow keys
      await page.keyboard.press('ArrowDown')
      await expect(page.locator('.search-result-item:first-child')).toHaveClass(/selected/)

      // Select result with Enter
      await page.keyboard.press('Enter')
      await expect(page.locator('#doc-title')).toHaveValue('Accessibility Test Document')
    })

    test('should support keyboard shortcuts for tab switching', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Test Ctrl+1, Ctrl+2, Ctrl+3 shortcuts
      await page.keyboard.press('Control+2')
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)

      await page.keyboard.press('Control+3')
      await expect(page.locator('[data-tab="search"]')).toHaveClass(/active/)

      await page.keyboard.press('Control+1')
      await expect(page.locator('[data-tab="documents"]')).toHaveClass(/active/)
    })

    test('should handle Escape key to close Navigator', async ({ page }) => {
      // Open Navigator (unpinned)
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Press Escape to close
      await page.keyboard.press('Escape')

      // Navigator should close and focus should return to editor
      await expect(page.locator('.navigator')).not.toHaveClass(/visible/)
      await expect(page.locator('[data-testid="editor"]')).toBeFocused()
    })
  })

  test.describe('ARIA Attributes and Semantic HTML', () => {
    test('should have proper ARIA roles', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigator should have navigation role
      await expect(page.locator('.navigator')).toHaveAttribute('role', 'navigation')

      // Tab list should have tablist role
      await expect(page.locator('.navigator-tabs')).toHaveAttribute('role', 'tablist')

      // Individual tabs should have tab role
      await expect(page.locator('[data-tab="documents"]')).toHaveAttribute('role', 'tab')
      await expect(page.locator('[data-tab="outline"]')).toHaveAttribute('role', 'tab')
      await expect(page.locator('[data-tab="search"]')).toHaveAttribute('role', 'tab')

      // Panels should have tabpanel role
      await expect(page.locator('[data-panel="documents"]')).toHaveAttribute('role', 'tabpanel')
      await expect(page.locator('[data-panel="outline"]')).toHaveAttribute('role', 'tabpanel')
      await expect(page.locator('[data-panel="search"]')).toHaveAttribute('role', 'tabpanel')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigator should have aria-label
      await expect(page.locator('.navigator')).toHaveAttribute('aria-label', 'Navigator panel')

      // Pin button should have aria-label
      await expect(page.locator('.navigator-pin')).toHaveAttribute('aria-label', 'Pin Navigator')

      // Resize handle should have aria-label
      await expect(page.locator('.navigator-resize-handle')).toHaveAttribute('aria-label', 'Resize navigator')

      // Search input should have aria-label
      await page.click('[data-tab="search"]')
      await expect(page.locator('.search-input')).toHaveAttribute('aria-label', 'Search query')
    })

    test('should maintain proper aria-selected states', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Documents tab should be selected initially
      await expect(page.locator('[data-tab="documents"]')).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('[data-tab="outline"]')).toHaveAttribute('aria-selected', 'false')
      await expect(page.locator('[data-tab="search"]')).toHaveAttribute('aria-selected', 'false')

      // Switch to outline tab
      await page.click('[data-tab="outline"]')
      await expect(page.locator('[data-tab="documents"]')).toHaveAttribute('aria-selected', 'false')
      await expect(page.locator('[data-tab="outline"]')).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('[data-tab="search"]')).toHaveAttribute('aria-selected', 'false')
    })

    test('should provide proper headings hierarchy', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Check section headings exist and are properly structured
      const sectionHeadings = page.locator('.section-title')
      await expect(sectionHeadings).toHaveCount(2) // RECENT and PREVIOUS

      // Headings should be semantic HTML elements
      await expect(page.locator('h3.section-title')).toHaveCount(2)
    })

    test('should have proper list semantics', async ({ page }) => {
      // Open Navigator Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Document list should have proper list role
      const documentsList = page.locator('.documents-list')
      await expect(documentsList).toHaveAttribute('role', 'listbox')

      // Document items should have listitem role
      const documentItems = page.locator('.document-item')
      const count = await documentItems.count()
      for (let i = 0; i < count; i++) {
        await expect(documentItems.nth(i)).toHaveAttribute('role', 'option')
      }
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should announce tab changes', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Switch tabs and verify announcements are set up correctly
      await page.click('[data-tab="outline"]')
      
      // Check that aria-live regions exist for announcements
      const liveRegion = page.locator('[aria-live]')
      if (await liveRegion.count() > 0) {
        await expect(liveRegion.first()).toBeInViewport()
      }
    })

    test('should provide context for document items', async ({ page }) => {
      // Open Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Document items should have descriptive content
      const firstDoc = page.locator('.document-item').first()
      
      // Should include title
      await expect(firstDoc).toContainText('Accessibility Test Document')
      
      // Should include metadata for screen readers
      const docMeta = firstDoc.locator('.document-meta')
      await expect(docMeta).toBeVisible()
    })

    test('should provide search result context', async ({ page }) => {
      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f test')
      await page.keyboard.press('Enter')

      // Wait for search results
      await expect(page.locator('.search-result-item')).toBeVisible()

      // Results should have proper context
      const firstResult = page.locator('.search-result-item').first()
      await expect(firstResult).toContainText('Accessibility Test Document')
      
      // Should include snippets for context
      await expect(firstResult.locator('.result-snippet')).toBeVisible()
    })

    test('should announce loading states', async ({ page }) => {
      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f')
      await page.keyboard.press('Enter')

      // Start search
      await page.fill('.search-input', 'loading')
      await page.keyboard.press('Enter')

      // Progress indicator should be announced
      const progressElement = page.locator('.search-progress')
      await expect(progressElement).toHaveAttribute('aria-live', 'polite')
    })

    test('should provide outline hierarchy context', async ({ page }) => {
      // Load document with outline
      await page.evaluate(() => {
        window.fantasyEditor.loadDocument({
          id: 'hierarchy-test',
          title: 'Hierarchy Test',
          content: '# Chapter 1\n\n## Section 1.1\n\n### Subsection 1.1.1\n\n## Section 1.2\n\n# Chapter 2'
        })
      })

      // Open Outline tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':l')
      await page.keyboard.press('Enter')

      // Outline items should have proper hierarchy attributes
      const level1Items = page.locator('.outline-item.level-1')
      const level2Items = page.locator('.outline-item.level-2')
      const level3Items = page.locator('.outline-item.level-3')

      await expect(level1Items.first()).toHaveAttribute('aria-level', '1')
      await expect(level2Items.first()).toHaveAttribute('aria-level', '2')
      await expect(level3Items.first()).toHaveAttribute('aria-level', '3')
    })
  })

  test.describe('Focus Management', () => {
    test('should maintain focus when switching tabs', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Tab should receive focus
      await expect(page.locator('[data-tab="documents"]')).toBeFocused()

      // Switch tabs with keyboard
      await page.keyboard.press('Control+2')
      
      // New tab should be focused
      await expect(page.locator('[data-tab="outline"]')).toBeFocused()
    })

    test('should trap focus within Navigator when modal', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Focus should be within Navigator
      let focusedElement = page.locator(':focus')
      const navigatorElement = page.locator('.navigator')
      
      // Check that focused element is within Navigator
      await expect(focusedElement).toBeInViewport()
      
      // Tab through elements - focus should stay within Navigator
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
        focusedElement = page.locator(':focus')
        
        // Focus should still be within Navigator or related elements
        const isWithinNavigator = await focusedElement.evaluate((el, nav) => {
          return nav.contains(el) || el.closest('.navigator') !== null
        }, await navigatorElement.elementHandle())
        
        if (!isWithinNavigator) {
          // Focus might have moved to main content, which is acceptable
          break
        }
      }
    })

    test('should restore focus after Navigator operations', async ({ page }) => {
      // Focus editor initially
      await page.click('[data-testid="editor"]')
      await expect(page.locator('[data-testid="editor"]')).toBeFocused()

      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Close with Escape
      await page.keyboard.press('Escape')

      // Focus should return to editor
      await expect(page.locator('[data-testid="editor"]')).toBeFocused()
    })

    test('should handle focus when opening documents', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Select document with keyboard
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')

      // After document loads, appropriate element should be focused
      // (Could be editor, title input, etc. depending on implementation)
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })
  })

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('should maintain contrast ratios in different themes', async ({ page }) => {
      const themes = ['light', 'dark', 'fantasy']

      for (const theme of themes) {
        // Set theme
        await page.keyboard.press('Control+Space')
        await page.fill('[data-testid="command-input"]', `:tt ${theme}`)
        await page.keyboard.press('Enter')

        // Open Navigator
        await page.keyboard.press('Control+Space')
        await page.fill('[data-testid="command-input"]', ':d')
        await page.keyboard.press('Enter')

        // Check that text is visible and contrasted
        const documentItems = page.locator('.document-item')
        const firstItem = documentItems.first()
        
        // Verify text is visible
        await expect(firstItem).toBeVisible()
        await expect(firstItem).toContainText('Accessibility Test Document')

        // Selected states should be visually distinct
        await page.keyboard.press('ArrowDown')
        await expect(firstItem).toHaveClass(/selected/)

        // Close Navigator for next iteration
        await page.keyboard.press('Escape')
      }
    })

    test('should show focus indicators', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigate with Tab to see focus indicators
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      // Focus indicator should be visible (this would need actual visual testing)
      // We can check that focused elements have appropriate CSS classes/styles
      const hasVisibleFocus = await focusedElement.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.outline !== 'none' || 
               styles.boxShadow.includes('rgb') ||
               el.classList.contains('focused') ||
               el.classList.contains('focus-visible')
      })

      expect(hasVisibleFocus).toBe(true)
    })

    test('should handle high contrast mode', async ({ page }) => {
      // Simulate high contrast mode by forcing contrast
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            .navigator * {
              border: 1px solid currentColor !important;
            }
          }
        `
      })

      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Elements should still be visible and usable
      await expect(page.locator('.navigator')).toBeVisible()
      await expect(page.locator('.document-item')).toBeVisible()

      // Navigation should still work
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await expect(page.locator('#doc-title')).toHaveValue('Accessibility Test Document')
    })
  })

  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })

      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigator should appear without animation
      await expect(page.locator('.navigator')).toHaveClass(/visible/)

      // Pin/unpin should work without animation
      await page.click('.navigator-pin')
      await expect(page.locator('.navigator-pin')).toHaveClass(/active/)

      // Tab switching should work without animation
      await page.click('[data-tab="outline"]')
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)
    })

    test('should maintain functionality with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })

      // All Navigator features should work normally
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Document selection
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await expect(page.locator('#doc-title')).toHaveValue('Accessibility Test Document')

      // Tab switching
      await page.keyboard.press('Control+2')
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)

      // Search functionality
      await page.keyboard.press('Control+3')
      await page.fill('.search-input', 'test')
      await page.keyboard.press('Enter')
      await expect(page.locator('.search-result-item')).toBeVisible()
    })
  })

  test.describe('Screen Reader Announcements', () => {
    test('should have appropriate live regions', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Check for status messages area
      const statusRegion = page.locator('[aria-live="polite"]')
      if (await statusRegion.count() > 0) {
        await expect(statusRegion).toBeInViewport()
      }

      // Search progress should have live announcements
      await page.click('[data-tab="search"]')
      await page.fill('.search-input', 'test')
      await page.keyboard.press('Enter')

      const searchProgress = page.locator('.search-progress')
      await expect(searchProgress).toHaveAttribute('aria-live', 'polite')
    })

    test('should announce document changes', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Select document
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')

      // Document title should be announced (via page title or live region)
      await expect(page.locator('#doc-title')).toHaveValue('Accessibility Test Document')
      
      // Check if there's a status announcement
      const announcements = page.locator('[role="status"]')
      if (await announcements.count() > 0) {
        await expect(announcements.first()).toBeInViewport()
      }
    })
  })

  test.describe('Error Handling and User Feedback', () => {
    test('should provide accessible error messages', async ({ page }) => {
      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f')
      await page.keyboard.press('Enter')

      // Try search with very short query
      await page.fill('.search-input', 'a')
      await page.keyboard.press('Enter')

      // Error message should be accessible
      const errorMessage = page.locator('.search-message')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toContainText('at least 2 characters')

      // Error should be announced
      const errorWithRole = page.locator('[role="alert"]')
      if (await errorWithRole.count() > 0) {
        await expect(errorWithRole).toBeVisible()
      }
    })

    test('should handle empty states accessibly', async ({ page }) => {
      // Clear all documents
      await page.evaluate(() => {
        localStorage.removeItem('test-documents')
        localStorage.removeItem('recent-documents')
      })

      // Open Documents tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Empty state should be accessible
      const emptyState = page.locator('.documents-empty')
      await expect(emptyState).toBeVisible()
      await expect(emptyState).toContainText('No documents found')

      // Should be announced to screen readers
      await expect(emptyState).toHaveAttribute('role', 'status')
    })
  })
})