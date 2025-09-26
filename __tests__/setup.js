// Mock IndexedDB for testing
import 'fake-indexeddb/auto'

// Polyfill structuredClone for Node.js environments
if (!global.structuredClone) {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj))
  }
}

// Mock window confirmation dialogs
global.confirm = jest.fn().mockReturnValue(true)
global.alert = jest.fn()

// Mock DOM APIs
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null
  },
  setItem(key, value) {
    this.data[key] = value
  },
  removeItem(key) {
    delete this.data[key]
  },
  clear() {
    this.data = {}
  }
}

// Mock fetch for API tests
global.fetch = jest.fn()

// Mock Service Worker
global.navigator.serviceWorker = {
  register: jest.fn().mockResolvedValue({}),
  ready: Promise.resolve({})
}

// Suppress console errors during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn()
}

// Mock Web Crypto API for Node.js testing
global.crypto = {
  subtle: {
    digest: jest.fn().mockImplementation(async (algorithm, data) => {
      // Create deterministic hash based on input content
      const input = new Uint8Array(data)
      const mockHash = new ArrayBuffer(32)
      const view = new Uint8Array(mockHash)
      
      // Create predictable hash based on input content
      let hash = 0
      for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash + input[i]) & 0xffffffff
      }
      
      // Fill array with hash-based values
      for (let i = 0; i < 32; i++) {
        view[i] = (hash >>> (i % 4 * 8)) & 0xff
      }
      
      return mockHash
    })
  }
}

// Mock import.meta for Vite environment variables
if (!global.import) {
  global.import = {
    meta: {
      env: {
        VITE_GITHUB_REDIRECT_URI: 'https://fantasy.forgewright.io/',
        VITE_APP_VERSION: '0.0.2-alpha',
        VITE_BUILD_DATE: '2025-01-15',
        MODE: 'test',
        PROD: false,
        DEV: true
      }
    }
  }
}

// Also add import.meta to global scope for Jest compatibility
global.import.meta = global.import.meta || {
  env: global.import.meta.env
}
