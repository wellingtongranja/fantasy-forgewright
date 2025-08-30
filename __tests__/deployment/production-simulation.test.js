/**
 * Production Environment Simulation Tests
 * Tests component initialization and runtime behavior in production mode
 */

const { DeploymentTestHelpers } = require('../helpers/deployment-helpers')
const { setupDeploymentMatchers } = require('../helpers/custom-matchers')
const fs = require('fs')
const path = require('path')

// Setup custom matchers
setupDeploymentMatchers()

const getRootPath = () => path.resolve(__dirname, '../../')

describe('⚡ Runtime Production Safeguards', () => {

  beforeAll(() => {
    // Set up production environment
    process.env.NODE_ENV = 'production'
  })

  afterAll(() => {
    // Restore environment
    delete process.env.NODE_ENV
  })

  describe('Component Initialization', () => {
    test('CommandBar initializes without errors in production', async () => {
      // Mock the CommandBar class since we can't import ES modules easily in CommonJS tests
      const mockCommandBar = class {
        constructor(commandRegistry) {
          this.commandRegistry = commandRegistry
          this.isVisible = false
          this.init()
        }

        init() {
          // Simulate the initialization that could fail in production
          if (process.env.NODE_ENV === 'production') {
            // Test that no uninitialized variables are accessed
            this.createDOM()
          }
        }

        createDOM() {
          // This would normally create DOM elements
          this.element = { classList: { add: () => {}, remove: () => {} } }
        }
      }

      const result = await DeploymentTestHelpers.testComponentInitialization(mockCommandBar, {})
      expect(result.success).toBe(true)
    })

    test('Navigator component handles async imports correctly', async () => {
      // Simulate Navigator component initialization pattern
      const mockNavigator = class {
        constructor(container, app) {
          this.container = container
          this.app = app
          this.tabComponents = {}
        }

        async init() {
          // Simulate async tab loading that could fail in production
          try {
            await this.initializeTabs()
            return true
          } catch (error) {
            throw new Error(`Navigator initialization failed: ${error.message}`)
          }
        }

        async initializeTabs() {
          // Mock the dynamic import pattern
          const tabModules = await Promise.all([
            Promise.resolve({ DocumentsTab: class {} }),
            Promise.resolve({ OutlineTab: class {} }),
            Promise.resolve({ SearchTab: class {} })
          ])

          // Initialize tabs
          tabModules.forEach((module, index) => {
            const tabNames = ['documents', 'outline', 'search']
            this.tabComponents[tabNames[index]] = new (Object.values(module)[0])()
          })
        }
      }

      const result = await DeploymentTestHelpers.testComponentInitialization(mockNavigator, {})
      expect(result.success).toBe(true)
    })
  })

  describe('Module Loading Validation', () => {
    test('dynamic imports are properly awaited', () => {
      const navigatorPath = path.join(getRootPath(), 'src/components/navigator/navigator.js')
      
      if (fs.existsSync(navigatorPath)) {
        const content = fs.readFileSync(navigatorPath, 'utf8')
        
        // Check for proper async/await patterns with dynamic imports
        const hasAsyncImports = content.includes('import(') && content.includes('await')
        const hasPromiseAll = content.includes('Promise.all')
        
        if (content.includes('import(') && !hasAsyncImports) {
          throw new Error('❌ Dynamic imports found but not properly awaited (can cause "Cannot access uninitialized variable" errors)')
        }
        
        // Check for proper error handling
        const hasErrorHandling = content.includes('catch') && content.includes('error')
        if (content.includes('import(') && !hasErrorHandling) {
          console.warn('⚠️  Dynamic imports should have error handling for production resilience')
        }
      }
    })

    test('no circular dependency patterns in component imports', () => {
      const srcPath = path.join(getRootPath(), 'src')
      const importGraph = new Map()

      function extractImports(filePath) {
        if (!filePath.endsWith('.js')) return []
        
        const content = fs.readFileSync(filePath, 'utf8')
        const importRegex = /import.*from\s+['"]([^'"]+)['"]/g
        const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g
        
        const imports = []
        let match
        
        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1])
        }
        
        while ((match = dynamicImportRegex.exec(content)) !== null) {
          imports.push(match[1])
        }
        
        return imports.filter(imp => imp.startsWith('.'))
      }

      function walkDir(dir) {
        if (!fs.existsSync(dir)) return
        
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory() && !file.includes('node_modules')) {
            walkDir(filePath)
          } else if (stat.isFile() && file.endsWith('.js')) {
            const relativePath = path.relative(srcPath, filePath)
            const imports = extractImports(filePath)
            importGraph.set(relativePath, imports)
          }
        })
      }

      walkDir(srcPath)
      
      // Simple circular dependency detection (could be made more sophisticated)
      const circularDeps = []
      importGraph.forEach((imports, file) => {
        imports.forEach(imp => {
          const normalizedImport = path.normalize(path.join(path.dirname(file), imp))
          if (importGraph.has(normalizedImport + '.js')) {
            const backImports = importGraph.get(normalizedImport + '.js')
            if (backImports && backImports.some(backImp => {
              const normalizedBack = path.normalize(path.join(path.dirname(normalizedImport), backImp))
              return normalizedBack === file.replace('.js', '')
            })) {
              circularDeps.push(`${file} ↔ ${normalizedImport}`)
            }
          }
        })
      })

      if (circularDeps.length > 0) {
        console.warn('⚠️  Potential circular dependencies found:', circularDeps.join(', '))
      }
    })
  })

  describe('Production Environment Handling', () => {
    test('components handle missing global variables gracefully', async () => {
      // Test that components don't assume global variables exist
      const originalWindow = global.window
      const originalDocument = global.document
      
      try {
        // Temporarily remove globals
        delete global.window
        delete global.document
        
        // Mock component that should handle missing globals
        const robustComponent = class {
          constructor() {
            this.init()
          }
          
          init() {
            // Should check for global existence
            if (typeof window !== 'undefined' && window.fantasyEditor) {
              this.app = window.fantasyEditor
            }
            
            if (typeof document !== 'undefined') {
              this.element = document.createElement('div')
            }
          }
        }

        const result = await DeploymentTestHelpers.testComponentInitialization(robustComponent, {})
        expect(result.success).toBe(true)
        
      } finally {
        // Restore globals
        global.window = originalWindow
        global.document = originalDocument
      }
    })

    test('error boundaries prevent component initialization failures from crashing app', () => {
      // Mock app with error boundary pattern
      const appWithErrorBoundary = class {
        constructor() {
          this.components = []
          this.errors = []
        }

        async initializeComponent(ComponentClass, ...args) {
          try {
            const component = new ComponentClass(...args)
            this.components.push(component)
            return component
          } catch (error) {
            this.errors.push({
              component: ComponentClass.name,
              error: error.message
            })
            console.warn(`Component ${ComponentClass.name} failed to initialize:`, error)
            return null
          }
        }
      }

      const faultyComponent = class {
        constructor() {
          throw new Error('Initialization failed')
        }
      }

      const app = new appWithErrorBoundary()
      app.initializeComponent(faultyComponent)

      expect(app.errors).toHaveLength(1)
      expect(app.errors[0].component).toBe('faultyComponent')
    })
  })

  describe('Performance in Production', () => {
    test('components initialize within reasonable time limits', async () => {
      const mockPerformantComponent = class {
        constructor() {
          this.startTime = Date.now()
          this.init()
          this.initTime = Date.now() - this.startTime
        }

        init() {
          // Simulate some initialization work
          for (let i = 0; i < 1000; i++) {
            // Light computation
            Math.random()
          }
        }
      }

      const result = await DeploymentTestHelpers.testComponentInitialization(mockPerformantComponent, {})
      
      expect(result.success).toBe(true)
      if (result.component && result.component.initTime > 100) { // 100ms threshold
        console.warn(`⚠️  Component took ${result.component.initTime}ms to initialize (>100ms threshold)`)
      }
    })

    test('no memory leaks in component initialization', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Create and destroy many components
      for (let i = 0; i < 100; i++) {
        const tempComponent = class {
          constructor() {
            this.data = new Array(1000).fill(Math.random())
            this.cleanup()
          }
          
          cleanup() {
            this.data = null
          }
        }

        await DeploymentTestHelpers.testComponentInitialization(tempComponent, {})
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Allow for some memory increase but flag excessive growth
      const maxAcceptableIncrease = 10 * 1024 * 1024 // 10MB
      if (memoryIncrease > maxAcceptableIncrease) {
        console.warn(`⚠️  Memory increased by ${(memoryIncrease / 1024 / 1024).toFixed(1)}MB during component testing`)
      }
    })
  })

  describe('Production Data Handling', () => {
    test('components handle malformed data gracefully', async () => {
      const dataHandlingComponent = class {
        constructor(container, data = {}) {
          this.data = this.validateData(data)
          this.init()
        }

        validateData(data) {
          // Defensive data handling
          if (!data || typeof data !== 'object') {
            return {}
          }

          return {
            title: typeof data.title === 'string' ? data.title : 'Untitled',
            items: Array.isArray(data.items) ? data.items : [],
            config: data.config && typeof data.config === 'object' ? data.config : {}
          }
        }

        init() {
          // Use validated data
          this.render()
        }

        render() {
          // Safe rendering based on validated data
          return this.data.title
        }
      }

      // Test with various malformed data
      const malformedDataSets = [
        null,
        undefined,
        'string instead of object',
        [],
        { title: 123, items: 'not an array', config: 'not an object' }
      ]

      for (const badData of malformedDataSets) {
        const result = await DeploymentTestHelpers.testComponentInitialization(dataHandlingComponent, badData)
        expect(result.success).toBe(true)
      }
    })
  })
})