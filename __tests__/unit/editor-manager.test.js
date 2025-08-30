/**
 * Fantasy Editor - Editor Manager Tests
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

import { EditorManager } from '../../src/core/editor/editor.js'

// Mock the dependencies
jest.mock('../../src/core/editor/editor-extensions.js', () => ({
  EditorExtensions: jest.fn().mockImplementation(() => ({
    getExtensions: jest.fn().mockReturnValue([])
  }))
}))

jest.mock('../../src/core/editor/readonly-extensions.js', () => ({
  ReadonlyExtensions: jest.fn().mockImplementation((callback) => ({
    setNotificationCallback: jest.fn(),
    getReadonlyExtensions: jest.fn().mockReturnValue([]),
    updateReadonlyState: jest.fn(),
    getReadonlyState: jest.fn().mockReturnValue(false)
  }))
}))

describe('EditorManager', () => {
  let mockElement
  let mockThemeManager
  let mockNotificationCallback

  beforeEach(() => {
    mockElement = document.createElement('div')
    mockThemeManager = {
      getCodeMirrorTheme: jest.fn().mockReturnValue([]),
      setEditorView: jest.fn()
    }
    mockNotificationCallback = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    test('should initialize with notification callback', () => {
      const { ReadonlyExtensions } = require('../../src/core/editor/readonly-extensions.js')
      
      new EditorManager(mockElement, mockThemeManager, mockNotificationCallback)
      
      expect(ReadonlyExtensions).toHaveBeenCalledWith(mockNotificationCallback)
    })

    test('should initialize without notification callback', () => {
      const { ReadonlyExtensions } = require('../../src/core/editor/readonly-extensions.js')
      
      new EditorManager(mockElement, mockThemeManager)
      
      expect(ReadonlyExtensions).toHaveBeenCalledWith(null)
    })
  })
})
