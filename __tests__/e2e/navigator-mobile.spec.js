/**
 * Navigator Mobile E2E Tests
 * Tests Navigator functionality on mobile devices and different screen sizes
 */

import { test, expect, devices } from '@playwright/test'

test.describe('Navigator Mobile Tests', () => {
  test.describe('Mobile Phone (Portrait)', () => {
    test.use({ ...devices['iPhone 12'] })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]', { timeout: 10000 })

      // Add test documents
      await page.evaluate(() => {
        const mockDocuments = [
          {
            id: 'doc-1',
            title: 'Mobile Test Document 1',
            content: '# Chapter 1\n\nContent for mobile testing.\n\n## Section A\n\nMore content.',
            tags: ['mobile', 'test'],
            updatedAt: new Date().toISOString()
          },
          {
            id: 'doc-2',
            title: 'Mobile Test Document 2',
            content: '# Chapter 2\n\nSecond document content.',
            tags: ['mobile'],
            updatedAt: new Date(Date.now() - 60000).toISOString()
          }
        ]
        localStorage.setItem('test-documents', JSON.stringify(mockDocuments))
        localStorage.setItem('recent-documents', JSON.stringify(['doc-1', 'doc-2']))
      })
    })

    test('should adapt Navigator width for mobile screens', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigator should take appropriate width on mobile
      const navigator = page.locator('.navigator')
      const navBox = await navigator.boundingBox()
      const viewportSize = page.viewportSize()

      expect(navBox.width).toBeLessThan(viewportSize.width * 0.95)
      expect(navBox.width).toBeGreaterThan(280) // Minimum width
    })

    test('should handle touch interactions', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Tap on a document
      await page.tap('.document-item:first-child')

      // Document should load
      await expect(page.locator('#doc-title')).toHaveValue('Mobile Test Document 1')
    })

    test('should handle tab switching with touch', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Tap outline tab
      await page.tap('[data-tab="outline"]')
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)

      // Tap search tab
      await page.tap('[data-tab="search"]')
      await expect(page.locator('[data-tab="search"]')).toHaveClass(/active/)
    })

    test('should hide resize handle on mobile', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Resize handle should be hidden or disabled on mobile
      const resizeHandle = page.locator('.navigator-resize-handle')
      await expect(resizeHandle).not.toBeVisible()
    })

    test('should support mobile search interactions', async ({ page }) => {
      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f')
      await page.keyboard.press('Enter')

      // Focus search input
      await page.tap('.search-input')
      await expect(page.locator('.search-input')).toBeFocused()

      // Type search query
      await page.fill('.search-input', 'mobile')

      // Tap search button
      await page.tap('.search-button')

      // Should show results
      await expect(page.locator('.search-result-item')).toBeVisible()
    })

    test('should handle mobile keyboard interactions', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Focus filter input
      await page.tap('.filter-input')

      // Mobile keyboard should appear and be usable
      await page.fill('.filter-input', 'test')

      // Should filter documents
      await expect(page.locator('.document-item')).toHaveCount(2)
    })
  })

  test.describe('Mobile Phone (Landscape)', () => {
    test.use({ ...devices['iPhone 12 landscape'] })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]')

      // Add test documents
      await page.evaluate(() => {
        const mockDocuments = [
          {
            id: 'doc-1',
            title: 'Landscape Test Document',
            content: '# Chapter 1\n\nContent for landscape testing.',
            tags: ['landscape'],
            updatedAt: new Date().toISOString()
          }
        ]
        localStorage.setItem('test-documents', JSON.stringify(mockDocuments))
      })
    })

    test('should adjust Navigator layout for landscape orientation', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Navigator should have appropriate width for landscape
      const navigator = page.locator('.navigator')
      const navBox = await navigator.boundingBox()

      expect(navBox.width).toBeGreaterThan(280)
      expect(navBox.width).toBeLessThan(400) // Should not take too much horizontal space
    })

    test('should maintain functionality in landscape mode', async ({ page }) => {
      // Open Navigator and use all tabs
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Documents tab should work
      await page.tap('.document-item')
      await expect(page.locator('#doc-title')).toHaveValue('Landscape Test Document')

      // Outline tab should work
      await page.tap('[data-tab="outline"]')
      await expect(page.locator('.outline-item')).toBeVisible()

      // Search tab should work
      await page.tap('[data-tab="search"]')
      await expect(page.locator('.search-input')).toBeVisible()
    })
  })

  test.describe('Tablet (iPad)', () => {
    test.use({ ...devices['iPad'] })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]')
    })

    test('should provide desktop-like experience on tablet', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Should have resize handle on tablet
      await expect(page.locator('.navigator-resize-handle')).toBeVisible()

      // Should support pinning
      await page.tap('.navigator-pin')
      await expect(page.locator('.navigator-pin')).toHaveClass(/active/)

      // Should support auto-unhide
      await page.tap('.navigator-pin') // Unpin
      await page.mouse.move(5, 300)
      await expect(page.locator('.navigator')).toHaveClass(/visible/)
    })

    test('should handle tablet-specific interactions', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')
      await page.tap('.navigator-pin') // Pin it

      // Should support drag resizing on tablet
      const resizeHandle = page.locator('.navigator-resize-handle')
      const initialBox = await page.locator('.navigator').boundingBox()

      await resizeHandle.dragTo(page.locator('body'), { 
        targetPosition: { x: 450, y: 300 },
        force: true
      })

      const newBox = await page.locator('.navigator').boundingBox()
      expect(newBox.width).not.toBe(initialBox.width)
    })
  })

  test.describe('Responsive Design Tests', () => {
    test('should adapt to different screen sizes', async ({ page }) => {
      const screenSizes = [
        { width: 320, height: 568 },  // iPhone 5
        { width: 375, height: 812 },  // iPhone X
        { width: 768, height: 1024 }, // iPad Portrait
        { width: 1024, height: 768 }, // iPad Landscape
        { width: 1366, height: 768 }, // Laptop
        { width: 1920, height: 1080 } // Desktop
      ]

      for (const size of screenSizes) {
        await page.setViewportSize(size)
        await page.goto('/')
        await page.waitForSelector('[data-testid="editor"]')

        // Open Navigator
        await page.keyboard.press('Control+Space')
        await page.fill('[data-testid="command-input"]', ':d')
        await page.keyboard.press('Enter')

        // Check Navigator is responsive
        const navigator = page.locator('.navigator')
        const navBox = await navigator.boundingBox()

        // Should not exceed viewport width
        expect(navBox.width).toBeLessThan(size.width)
        
        // Should maintain minimum usability
        expect(navBox.width).toBeGreaterThan(250)

        // Clean up
        await page.keyboard.press('Escape')
      }
    })

    test('should adjust font sizes on small screens', async ({ page }) => {
      // Set to mobile size
      await page.setViewportSize({ width: 320, height: 568 })
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]')

      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Check that mobile styles are applied
      const appTitle = page.locator('.app-title')
      const fontSize = await appTitle.evaluate(el => 
        window.getComputedStyle(el).getPropertyValue('font-size')
      )

      // Font size should be smaller on mobile (based on CSS media queries)
      expect(parseInt(fontSize)).toBeLessThanOrEqual(16)
    })

    test('should hide certain elements on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 })
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]')

      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Command hints should be hidden on mobile
      await expect(page.locator('.command-hint')).toBeHidden()
    })
  })

  test.describe('Touch Gestures and Interactions', () => {
    test.use({ ...devices['iPhone 12'] })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]')
    })

    test('should support swipe gestures (if implemented)', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Test swipe to close (if implemented)
      const navigator = page.locator('.navigator')
      const navBox = await navigator.boundingBox()

      // Swipe left to close
      await page.touchscreen.tap(navBox.x + 50, navBox.y + 100)
      await page.touchscreen.tap(navBox.x - 100, navBox.y + 100)

      // Note: This test would need actual swipe gesture implementation
    })

    test('should handle long press interactions', async ({ page }) => {
      // Add test documents
      await page.evaluate(() => {
        const docs = [{ id: 'doc-1', title: 'Test Doc', content: '# Test', tags: [] }]
        localStorage.setItem('test-documents', JSON.stringify(docs))
      })

      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Long press on document (if context menu is implemented)
      const docItem = page.locator('.document-item').first()
      
      // Simulate long press with touchscreen
      await page.touchscreen.tap(
        ...(await docItem.boundingBox()).then(box => [box.x + box.width/2, box.y + box.height/2])
      )
      
      // Hold for long press duration
      await page.waitForTimeout(800)

      // Context menu should appear (if implemented)
      // This would test actual long press menu functionality
    })

    test('should provide appropriate touch targets', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Check tab buttons have sufficient touch target size
      const tabs = page.locator('.navigator-tab')
      const tabCount = await tabs.count()

      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i)
        const box = await tab.boundingBox()
        
        // Minimum touch target should be 44x44px (iOS guidelines)
        expect(box.height).toBeGreaterThanOrEqual(44)
        // Allow some flexibility for width due to responsive design
        expect(box.width).toBeGreaterThanOrEqual(44)
      }

      // Check pin button has sufficient size
      const pinButton = page.locator('.navigator-pin')
      const pinBox = await pinButton.boundingBox()
      expect(pinBox.height).toBeGreaterThanOrEqual(44)
      expect(pinBox.width).toBeGreaterThanOrEqual(44)
    })
  })

  test.describe('Mobile Performance', () => {
    test.use({ ...devices['iPhone 12'] })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]')
    })

    test('should load quickly on mobile devices', async ({ page }) => {
      const startTime = Date.now()

      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Wait for Navigator to be visible
      await expect(page.locator('.navigator')).toBeVisible()

      const loadTime = Date.now() - startTime
      
      // Should load within reasonable time on mobile
      expect(loadTime).toBeLessThan(3000)
    })

    test('should handle rapid interactions without lag', async ({ page }) => {
      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      const startTime = Date.now()

      // Rapidly switch tabs
      await page.tap('[data-tab="outline"]')
      await page.tap('[data-tab="search"]')
      await page.tap('[data-tab="documents"]')
      await page.tap('[data-tab="outline"]')

      const interactionTime = Date.now() - startTime

      // Should handle rapid interactions smoothly
      expect(interactionTime).toBeLessThan(1000)
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)
    })

    test('should maintain performance with many documents on mobile', async ({ page }) => {
      // Create many documents for performance test
      await page.evaluate(() => {
        const manyDocs = Array.from({ length: 50 }, (_, i) => ({
          id: `mobile-doc-${i}`,
          title: `Mobile Document ${i}`,
          content: `# Mobile Document ${i}\n\nContent for testing mobile performance.`,
          tags: [`mobile-tag-${i % 5}`],
          updatedAt: new Date(Date.now() - i * 1000).toISOString()
        }))
        localStorage.setItem('test-documents', JSON.stringify(manyDocs))
      })

      const startTime = Date.now()

      // Open Navigator
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      // Wait for all documents to load
      await expect(page.locator('.document-item')).toHaveCount(50)

      const loadTime = Date.now() - startTime

      // Should load many documents reasonably quickly on mobile
      expect(loadTime).toBeLessThan(5000)

      // Scrolling should be smooth
      const documentsContainer = page.locator('.documents-list')
      await documentsContainer.scrollIntoViewIfNeeded()
      
      // Tap on a document in the middle of the list
      await page.tap('.document-item:nth-child(25)')
      
      // Should load without significant delay
      await expect(page.locator('#doc-title')).toHaveValue('Mobile Document 24', { timeout: 2000 })
    })
  })

  test.describe('Mobile Edge Cases', () => {
    test.use({ ...devices['iPhone 12'] })

    test('should handle orientation changes gracefully', async ({ page, context }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]')

      // Open Navigator in portrait
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':d')
      await page.keyboard.press('Enter')

      await expect(page.locator('.navigator')).toBeVisible()

      // Simulate orientation change to landscape
      await page.setViewportSize({ width: 812, height: 375 })
      await page.waitForTimeout(500) // Allow for reflow

      // Navigator should still be functional
      await expect(page.locator('.navigator')).toBeVisible()
      await page.tap('[data-tab="outline"]')
      await expect(page.locator('[data-tab="outline"]')).toHaveClass(/active/)

      // Change back to portrait
      await page.setViewportSize({ width: 375, height: 812 })
      await page.waitForTimeout(500)

      // Should still work
      await expect(page.locator('.navigator')).toBeVisible()
    })

    test('should handle virtual keyboard appearance', async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="editor"]')

      // Open Search tab
      await page.keyboard.press('Control+Space')
      await page.fill('[data-testid="command-input"]', ':f')
      await page.keyboard.press('Enter')

      // Tap search input to bring up virtual keyboard
      await page.tap('.search-input')

      // Layout should adjust appropriately
      // Note: Virtual keyboard detection is limited in Playwright, 
      // but we can check that input is focused and accessible
      await expect(page.locator('.search-input')).toBeFocused()

      // Should be able to type
      await page.fill('.search-input', 'test search')
      await expect(page.locator('.search-input')).toHaveValue('test search')
    })
  })
})