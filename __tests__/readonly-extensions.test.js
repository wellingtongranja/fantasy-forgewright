/**
 * Fantasy Editor - Readonly Extensions Tests
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

import { ReadonlyExtensions } from '../src/core/editor/readonly-extensions.js'

describe('ReadonlyExtensions', () => {
  let readonlyExtensions
  let mockNotificationCallback

  beforeEach(() => {
    mockNotificationCallback = jest.fn()
    readonlyExtensions = new ReadonlyExtensions(mockNotificationCallback)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    test('should initialize with notification callback', () => {
      expect(readonlyExtensions.notificationCallback).toBe(mockNotificationCallback)
    })

    test('should initialize without notification callback', () => {
      const extensionsWithoutCallback = new ReadonlyExtensions()
      expect(extensionsWithoutCallback.notificationCallback).toBeNull()
    })
  })

  describe('setNotificationCallback', () => {
    test('should set notification callback', () => {
      const newCallback = jest.fn()
      readonlyExtensions.setNotificationCallback(newCallback)
      expect(readonlyExtensions.notificationCallback).toBe(newCallback)
    })
  })

  describe('getReadonlyExtensions', () => {
    test('should return readonly extensions when readonly is true', () => {
      const extensions = readonlyExtensions.getReadonlyExtensions(true)
      expect(extensions).toHaveLength(3) // readOnly state + theme + behavior
      expect(readonlyExtensions.isReadonly).toBe(true)
    })

    test('should return editable extensions when readonly is false', () => {
      const extensions = readonlyExtensions.getReadonlyExtensions(false)
      expect(extensions).toHaveLength(1) // readOnly state only
      expect(readonlyExtensions.isReadonly).toBe(false)
    })
  })

  describe('showReadonlyMessage', () => {
    test('should call notification callback when available', () => {
      const mockView = {}
      readonlyExtensions.isReadonly = true
      
      readonlyExtensions.showReadonlyMessage(mockView)
      
      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'Document is readonly - use :rw to make editable',
        'warning'
      )
    })

    test('should fall back to tooltip when no callback available', () => {
      const extensionsWithoutCallback = new ReadonlyExtensions()
      const mockView = {
        coordsAtPos: jest.fn().mockReturnValue({ left: 100, top: 200 }),
        state: {
          selection: {
            main: { head: 0 }
          }
        }
      }
      extensionsWithoutCallback.isReadonly = true
      
      // Mock document.createElement and appendChild
      const mockTooltip = {
        style: {},
        className: '',
        textContent: ''
      }
      const mockBody = {
        appendChild: jest.fn()
      }
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockTooltip)
      jest.spyOn(document, 'body', 'get').mockReturnValue(mockBody)
      
      extensionsWithoutCallback.showReadonlyMessage(mockView)
      
      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(mockBody.appendChild).toHaveBeenCalledWith(mockTooltip)
    })
  })

  describe('getReadonlyState', () => {
    test('should return current readonly state', () => {
      readonlyExtensions.isReadonly = true
      expect(readonlyExtensions.getReadonlyState()).toBe(true)
      
      readonlyExtensions.isReadonly = false
      expect(readonlyExtensions.getReadonlyState()).toBe(false)
    })
  })
})
