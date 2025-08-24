/**
 * Deployment Test Helpers
 * Utilities for testing deployment configuration and build processes
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const __dirname = path.dirname(__filename)

class DeploymentTestHelpers {
  
  static getRootPath() {
    return path.resolve(__dirname, '../../')
  }

  /**
   * Simulate production build environment
   */
  static async simulateProductionBuild(envVars = {}) {
    const rootPath = this.getRootPath()
    const buildEnv = {
      NODE_ENV: 'production',
      VITE_APP_TITLE: 'Fantasy Editor Test',
      VITE_GITHUB_CLIENT_ID: 'test_client_id',
      VITE_DOMAIN: 'test.example.com',
      ...envVars
    }

    try {
      // Set environment variables
      const originalEnv = { ...process.env }
      Object.assign(process.env, buildEnv)

      // Run build command
      const result = execSync('npm run build', {
        cwd: rootPath,
        encoding: 'utf8',
        timeout: 120000, // 2 minute timeout
        stdio: 'pipe'
      })

      // Check if dist directory was created
      const distPath = path.join(rootPath, 'dist')
      const distExists = fs.existsSync(distPath)

      // Analyze build output
      let bundleSize = 0
      let hasJSFiles = false
      let hasCSSFiles = false
      let hasServiceWorker = false

      if (distExists) {
        const distContents = this.walkDirectory(distPath)
        
        bundleSize = distContents.reduce((total, file) => {
          return total + fs.statSync(file.path).size
        }, 0)

        hasJSFiles = distContents.some(file => file.path.endsWith('.js'))
        hasCSSFiles = distContents.some(file => file.path.endsWith('.css'))
        hasServiceWorker = distContents.some(file => 
          file.name.includes('sw.js') || file.name.includes('service-worker.js')
        )
      }

      // Restore environment
      process.env = originalEnv

      return {
        success: true,
        output: result,
        distExists,
        bundleSize,
        hasJSFiles,
        hasCSSFiles,
        hasServiceWorker,
        buildTime: Date.now()
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout || '',
        stderr: error.stderr || ''
      }
    }
  }

  /**
   * Validate static CSS imports vs dynamic loading
   */
  static validateCSSImportStrategy(componentPath) {
    if (!fs.existsSync(componentPath)) {
      throw new Error(`Component file not found: ${componentPath}`)
    }

    const content = fs.readFileSync(componentPath, 'utf8')
    const issues = []

    // Check for static imports (good)
    const staticImports = content.match(/import\s+['"][^'"]*\.css['"]/g) || []
    
    // Check for dynamic loading (bad)
    const dynamicPatterns = [
      /document\.createElement\(['"]link['"].*stylesheet/g,
      /\.href\s*=\s*['"][^'"]*\.css['"]/g,
      /injectStyles/g,
      /appendChild.*link/g
    ]

    dynamicPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        issues.push({
          pattern: pattern.toString(),
          matches: matches.length
        })
      }
    })

    return {
      hasStaticImports: staticImports.length > 0,
      staticImports,
      hasDynamicLoading: issues.length > 0,
      dynamicIssues: issues,
      isValid: issues.length === 0
    }
  }

  /**
   * Check service worker configuration for conflicts
   */
  static validateServiceWorkerConfig() {
    const rootPath = this.getRootPath()
    const issues = []

    // Check for manual service worker registration in app code
    const appJsPath = path.join(rootPath, 'src/app.js')
    if (fs.existsSync(appJsPath)) {
      const appJs = fs.readFileSync(appJsPath, 'utf8')
      
      if (appJs.includes('registerServiceWorker') && 
          appJs.includes('navigator.serviceWorker.register')) {
        issues.push({
          type: 'manual_registration',
          file: 'src/app.js',
          description: 'Manual service worker registration found'
        })
      }
    }

    // Check VitePWA configuration
    const viteConfigPath = path.join(rootPath, 'vite.config.js')
    if (fs.existsSync(viteConfigPath)) {
      const viteConfig = fs.readFileSync(viteConfigPath, 'utf8')
      
      if (!viteConfig.includes('VitePWA')) {
        issues.push({
          type: 'missing_vitepwa',
          file: 'vite.config.js',
          description: 'VitePWA plugin not configured'
        })
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  /**
   * Validate environment variable configuration
   */
  static validateEnvironmentVariables(envVars) {
    const issues = []
    const warnings = []

    Object.entries(envVars).forEach(([key, value]) => {
      // Check for client-side variables without VITE_ prefix
      const clientSideIndicators = ['CLIENT_ID', 'API_KEY', 'PUBLIC', 'DOMAIN', 'BASE_URL']
      if (clientSideIndicators.some(indicator => key.includes(indicator))) {
        if (!key.startsWith('VITE_')) {
          warnings.push({
            type: 'missing_vite_prefix',
            variable: key,
            suggestion: `VITE_${key}`
          })
        }
      }

      // Check for empty values
      if (!value || value.trim() === '') {
        issues.push({
          type: 'empty_value',
          variable: key
        })
      }

      // Check for development values in production
      if (process.env.NODE_ENV === 'production') {
        const devIndicators = ['localhost', '127.0.0.1', 'test', 'dev', 'local']
        if (devIndicators.some(indicator => 
            value.toLowerCase().includes(indicator))) {
          warnings.push({
            type: 'dev_value_in_prod',
            variable: key,
            value: value
          })
        }
      }
    })

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    }
  }

  /**
   * Recursively walk directory and return file information
   */
  static walkDirectory(dir, files = []) {
    if (!fs.existsSync(dir)) return files

    const dirContents = fs.readdirSync(dir)
    
    dirContents.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        this.walkDirectory(filePath, files)
      } else {
        files.push({
          name: file,
          path: filePath,
          size: stat.size,
          ext: path.extname(file)
        })
      }
    })

    return files
  }

  /**
   * Check if component can initialize without errors
   */
  static async testComponentInitialization(ComponentClass, mockDependencies = {}) {
    try {
      // Create DOM environment
      if (typeof document === 'undefined') {
        const { JSDOM } = require('jsdom')
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
        global.document = dom.window.document
        global.window = dom.window
        global.HTMLElement = dom.window.HTMLElement
      }

      // Create mock container
      const container = document.createElement('div')
      document.body.appendChild(container)

      // Initialize component
      const component = new ComponentClass(container, mockDependencies)
      
      // Basic initialization test
      if (typeof component.init === 'function') {
        await component.init()
      }

      return {
        success: true,
        component,
        container
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      }
    }
  }

  /**
   * Generate deployment readiness report
   */
  static async generateDeploymentReport() {
    const rootPath = this.getRootPath()
    const report = {
      timestamp: new Date().toISOString(),
      checks: {},
      summary: { passed: 0, failed: 0, warnings: 0 }
    }

    try {
      // Configuration validation
      const configValidation = await this.validateAllConfigurations()
      report.checks.configuration = configValidation
      
      if (configValidation.isValid) {
        report.summary.passed++
      } else {
        report.summary.failed++
      }

      // Build simulation
      const buildResult = await this.simulateProductionBuild()
      report.checks.build = buildResult
      
      if (buildResult.success) {
        report.summary.passed++
      } else {
        report.summary.failed++
      }

      // Service worker validation
      const swValidation = this.validateServiceWorkerConfig()
      report.checks.serviceWorker = swValidation
      
      if (swValidation.isValid) {
        report.summary.passed++
      } else {
        report.summary.failed++
      }

      report.overallStatus = report.summary.failed === 0 ? 'READY' : 'NOT_READY'
      
    } catch (error) {
      report.error = error.message
      report.overallStatus = 'ERROR'
    }

    return report
  }

  /**
   * Helper method to validate all configurations
   */
  static async validateAllConfigurations() {
    // This would run all configuration validation checks
    // For now, return a basic structure
    return {
      isValid: true,
      checks: ['node-versions', 'environment-config', 'project-names'],
      issues: []
    }
  }
}

module.exports = { DeploymentTestHelpers }