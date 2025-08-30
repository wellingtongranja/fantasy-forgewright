/**
 * Fantasy Editor - Status Bar Manager Tests
 * Copyright (c) 2025 Forgewright
 *
 * This file is part of Fantasy Editor.
 *
 * Fantasy Editor Community Edition is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public
 * License as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 *
 * For commercial licensing options, please contact licensing@forgewright.io
 */

import { StatusBarManager } from '../../src/components/status-bar/status-bar-manager.js'

describe('StatusBarManager', () => {
  let statusBarManager
  let mockApp

  beforeEach(() => {
    // Create mock app
    mockApp = {
      showNotification: jest.fn(),
      widthManager: {
        setWidth: jest.fn().mockReturnValue({ success: true }),
        setZoom: jest.fn().mockReturnValue({ success: true })
      }
    }

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="word-count" class="status-item">0 words</div>
      <div id="editor-width" class="status-item clickable">65ch</div>
      <div id="editor-zoom" class="status-item clickable">100%</div>
      <div id="text-format" class="status-item">Markdown</div>
      <div id="repository-info" style="display: none;">
        <span id="repo-name"></span>
      </div>
      <div id="app-version" class="status-item">v0.0.1</div>
      <div id="sync-status">Ready</div>
      <div id="github-sync-indicator" style="display: none;">
        <span id="sync-status-icon"></span>
      </div>
      <div class="footer-center-content"></div>
    `

    statusBarManager = new StatusBarManager(mockApp)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    test('should initialize with app reference', () => {
      expect(statusBarManager.app).toBe(mockApp)
    })

    test('should set default values', () => {
      expect(statusBarManager.currentWidth).toBe(65)
      expect(statusBarManager.currentZoom).toBe(1.0)
      expect(statusBarManager.widthPresets).toEqual([65, 80, 90])
      expect(statusBarManager.zoomLevels).toEqual([0.85, 1.0, 1.15, 1.3])
    })
  })

  describe('updateWordCount', () => {
    test('should update word count display', () => {
      statusBarManager.updateWordCount(150)
      expect(statusBarManager.elements.wordCount.textContent).toBe('150 words')
    })

    test('should handle zero words', () => {
      statusBarManager.updateWordCount(0)
      expect(statusBarManager.elements.wordCount.textContent).toBe('0 words')
    })
  })

  describe('updateEditorWidth', () => {
    test('should update editor width display', () => {
      statusBarManager.updateEditorWidth(80)
      expect(statusBarManager.currentWidth).toBe(80)
      expect(statusBarManager.elements.editorWidth.textContent).toBe('80ch')
    })
  })

  describe('updateEditorZoom', () => {
    test('should update editor zoom display', () => {
      statusBarManager.updateEditorZoom(1.15)
      expect(statusBarManager.currentZoom).toBe(1.15)
      expect(statusBarManager.elements.editorZoom.textContent).toBe('115%')
    })

    test('should round zoom percentage', () => {
      statusBarManager.updateEditorZoom(0.875)
      expect(statusBarManager.elements.editorZoom.textContent).toBe('88%')
    })
  })

  describe('updateFormatInfo', () => {
    test('should update text format display', () => {
      statusBarManager.updateFormatInfo('Plain Text')
      expect(statusBarManager.elements.textFormat.textContent).toBe('Plain Text')
    })

    test('should use default format', () => {
      statusBarManager.updateFormatInfo()
      expect(statusBarManager.elements.textFormat.textContent).toBe('Markdown')
    })
  })

  describe('updateRepositoryInfo', () => {
    test('should show repository info when visible', () => {
      statusBarManager.updateRepositoryInfo('my-repo', true)
      expect(statusBarManager.elements.repoName.textContent).toBe('my-repo')
      expect(statusBarManager.elements.repositoryInfo.style.display).toBe('flex')
    })

    test('should hide repository info when not visible', () => {
      statusBarManager.updateRepositoryInfo('my-repo', false)
      expect(statusBarManager.elements.repositoryInfo.style.display).toBe('none')
    })
  })

  describe('updateSyncStatus', () => {
    test('should update sync status', () => {
      statusBarManager.updateSyncStatus('Syncing...')
      expect(statusBarManager.elements.syncStatus.textContent).toBe('Syncing...')
    })

    test('should update sync status with icon', () => {
      statusBarManager.updateSyncStatus('Synced', '🟢')
      expect(statusBarManager.elements.syncStatus.textContent).toBe('Synced')
      expect(statusBarManager.elements.syncStatusIcon.textContent).toBe('🟢')
    })
  })

  describe('updateGitHubSyncIndicator', () => {
    test('should show GitHub sync indicator', () => {
      statusBarManager.updateGitHubSyncIndicator(true)
      expect(statusBarManager.elements.githubSyncIndicator.style.display).toBe('flex')
    })

    test('should hide GitHub sync indicator', () => {
      statusBarManager.updateGitHubSyncIndicator(false)
      expect(statusBarManager.elements.githubSyncIndicator.style.display).toBe('none')
    })
  })

  describe('updateVersion', () => {
    test('should update app version', () => {
      statusBarManager.updateVersion()
      expect(statusBarManager.elements.appVersion.textContent).toBe('v0.0.1')
    })
  })

  describe('cycleEditorWidth', () => {
    test('should cycle through width presets', () => {
      // Start at 65
      expect(statusBarManager.currentWidth).toBe(65)
      
      // First cycle: 65 -> 80
      statusBarManager.cycleEditorWidth()
      expect(mockApp.widthManager.setWidth).toHaveBeenCalledWith(80)
      expect(statusBarManager.currentWidth).toBe(80)
      
      // Second cycle: 80 -> 90
      statusBarManager.cycleEditorWidth()
      expect(mockApp.widthManager.setWidth).toHaveBeenCalledWith(90)
      expect(statusBarManager.currentWidth).toBe(90)
      
      // Third cycle: 90 -> 65 (wrap around)
      statusBarManager.cycleEditorWidth()
      expect(mockApp.widthManager.setWidth).toHaveBeenCalledWith(65)
      expect(statusBarManager.currentWidth).toBe(65)
    })

    test('should show notification on successful width change', () => {
      statusBarManager.cycleEditorWidth()
      expect(mockApp.showNotification).toHaveBeenCalledWith('Editor width set to 80ch', 'info')
    })
  })

  describe('cycleEditorZoom', () => {
    test('should cycle through zoom levels', () => {
      // Start at 1.0
      expect(statusBarManager.currentZoom).toBe(1.0)
      
      // First cycle: 1.0 -> 1.15
      statusBarManager.cycleEditorZoom()
      expect(mockApp.widthManager.setZoom).toHaveBeenCalledWith(1.15)
      expect(statusBarManager.currentZoom).toBe(1.15)
      
      // Second cycle: 1.15 -> 1.3
      statusBarManager.cycleEditorZoom()
      expect(mockApp.widthManager.setZoom).toHaveBeenCalledWith(1.3)
      expect(statusBarManager.currentZoom).toBe(1.3)
      
      // Third cycle: 1.3 -> 0.85 (wrap around)
      statusBarManager.cycleEditorZoom()
      expect(mockApp.widthManager.setZoom).toHaveBeenCalledWith(0.85)
      expect(statusBarManager.currentZoom).toBe(0.85)
    })

    test('should show notification on successful zoom change', () => {
      statusBarManager.cycleEditorZoom()
      expect(mockApp.showNotification).toHaveBeenCalledWith('Zoom set to 115%', 'info')
    })
  })

  describe('updateReadonlyStatus', () => {
    test('should add readonly indicator for readonly document', () => {
      const doc = { readonly: true }
      statusBarManager.updateReadonlyStatus(doc)
      
      const readonlyIndicator = document.querySelector('.readonly-status-indicator')
      expect(readonlyIndicator).toBeTruthy()
      expect(readonlyIndicator.innerHTML).toContain('🔒')
      expect(readonlyIndicator.innerHTML).toContain('Readonly')
    })

    test('should add system indicator for system document', () => {
      const doc = { type: 'system' }
      statusBarManager.updateReadonlyStatus(doc)
      
      const readonlyIndicator = document.querySelector('.readonly-status-indicator')
      expect(readonlyIndicator).toBeTruthy()
      expect(readonlyIndicator.innerHTML).toContain('📖')
      expect(readonlyIndicator.innerHTML).toContain('System')
    })

    test('should remove existing indicator when updating', () => {
      // Add initial indicator
      const doc1 = { readonly: true }
      statusBarManager.updateReadonlyStatus(doc1)
      
      // Update with different document
      const doc2 = { type: 'system' }
      statusBarManager.updateReadonlyStatus(doc2)
      
      const indicators = document.querySelectorAll('.readonly-status-indicator')
      expect(indicators).toHaveLength(1)
      expect(indicators[0].innerHTML).toContain('📖')
    })

    test('should not add indicator for editable document', () => {
      const doc = { readonly: false, type: 'user' }
      statusBarManager.updateReadonlyStatus(doc)
      
      const readonlyIndicator = document.querySelector('.readonly-status-indicator')
      expect(readonlyIndicator).toBeFalsy()
    })
  })

  describe('refresh', () => {
    test('should refresh status bar elements', () => {
      // Mock width manager methods to return objects like the real implementation
      mockApp.widthManager.getCurrentWidth = jest.fn().mockReturnValue({ columns: 80, value: '80ch' })
      mockApp.widthManager.getCurrentZoom = jest.fn().mockReturnValue({ level: 1.15, percentage: 115 })
      
      statusBarManager.refresh()
      
      expect(statusBarManager.currentWidth).toBe(80)
      expect(statusBarManager.currentZoom).toBe(1.15)
    })
  })

  describe('destroy', () => {
    test('should remove event listeners', () => {
      // Mock removeEventListener
      const mockRemoveEventListener = jest.fn()
      statusBarManager.elements.editorWidth.removeEventListener = mockRemoveEventListener
      statusBarManager.elements.editorZoom.removeEventListener = mockRemoveEventListener
      
      statusBarManager.destroy()
      
      expect(mockRemoveEventListener).toHaveBeenCalledTimes(2)
    })
  })
})
