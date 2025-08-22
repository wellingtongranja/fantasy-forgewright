// Mock IndexedDB for testing
import 'fake-indexeddb/auto'

// Polyfill structuredClone for Node.js environments
if (!global.structuredClone) {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj))
  }
}

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
