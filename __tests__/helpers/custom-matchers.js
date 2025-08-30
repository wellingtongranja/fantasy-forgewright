/**
 * Custom Jest Matchers for Deployment Testing
 * Domain-specific assertions for Fantasy Editor deployment validation
 */

const { DeploymentTestHelpers } = require('./deployment-helpers')
const fs = require('fs')
const path = require('path')

const deploymentMatchers = {

  /**
   * Check if Vite configuration is valid for production deployment
   */
  toHaveValidViteConfig(received) {
    const viteConfigPath = path.join(DeploymentTestHelpers.getRootPath(), 'vite.config.js')
    
    if (!fs.existsSync(viteConfigPath)) {
      return {
        message: () => 'vite.config.js file not found',
        pass: false
      }
    }

    const config = fs.readFileSync(viteConfigPath, 'utf8')
    const issues = []

    // Check for essential plugins
    if (!config.includes('VitePWA')) {
      issues.push('Missing VitePWA plugin')
    }

    // Check for proper build configuration
    if (!config.includes('target:') && !config.includes('"target"')) {
      issues.push('Missing build target specification')
    }

    // Check for problematic manual chunking
    if (config.includes('manualChunks') && config.includes('vendor')) {
      issues.push('Manual chunking detected - can cause runtime errors')
    }

    const pass = issues.length === 0

    return {
      message: () => pass 
        ? 'Vite configuration is valid'
        : `Vite configuration issues:\n${issues.map(issue => `  • ${issue}`).join('\n')}`,
      pass
    }
  },

  /**
   * Check if all workflow files have consistent Node.js versions
   */
  toHaveConsistentNodeVersions(received, minimumVersion = 20) {
    const workflows = received // Should be array of workflow objects
    const versionIssues = []

    workflows.forEach(({ filename, content }) => {
      const jobs = content.jobs || {}
      
      Object.entries(jobs).forEach(([jobName, job]) => {
        // Check setup-node steps
        const steps = job.steps || []
        steps.forEach(step => {
          if (step.uses && step.uses.includes('actions/setup-node')) {
            const nodeVersion = step.with?.['node-version']
            if (nodeVersion) {
              const versionMatch = nodeVersion.match(/(\d+)/)
              if (versionMatch && parseInt(versionMatch[1]) < minimumVersion) {
                versionIssues.push({
                  workflow: filename,
                  job: jobName,
                  version: nodeVersion
                })
              }
            }
          }
        })

        // Check matrix strategies
        if (job.strategy?.matrix?.['node-version']) {
          job.strategy.matrix['node-version'].forEach(version => {
            const versionMatch = version.match(/(\d+)/)
            if (versionMatch && parseInt(versionMatch[1]) < minimumVersion) {
              versionIssues.push({
                workflow: filename,
                job: jobName,
                version: version
              })
            }
          })
        }
      })
    })

    const pass = versionIssues.length === 0

    return {
      message: () => pass
        ? `All workflows use Node.js ${minimumVersion}+`
        : `Node.js version inconsistencies found:\n${versionIssues.map(issue => 
            `  • ${issue.workflow} → ${issue.job}: ${issue.version}`
          ).join('\n')}`,
      pass
    }
  },

  /**
   * Check if component uses static CSS imports instead of dynamic loading
   */
  toUseStaticCSSImports(received) {
    const componentPath = typeof received === 'string' ? received : received.filePath
    
    if (!fs.existsSync(componentPath)) {
      return {
        message: () => `Component file not found: ${componentPath}`,
        pass: false
      }
    }

    const validation = DeploymentTestHelpers.validateCSSImportStrategy(componentPath)
    
    return {
      message: () => validation.isValid
        ? `Component uses static CSS imports correctly`
        : `Component has dynamic CSS loading issues:\n${validation.dynamicIssues.map(issue => 
            `  • Pattern: ${issue.pattern} (${issue.matches} occurrences)`
          ).join('\n')}`,
      pass: validation.isValid
    }
  },

  /**
   * Check if service worker configuration is free of conflicts
   */
  toHaveNoServiceWorkerConflicts(received) {
    const validation = DeploymentTestHelpers.validateServiceWorkerConfig()
    
    return {
      message: () => validation.isValid
        ? 'Service worker configuration is conflict-free'
        : `Service worker conflicts found:\n${validation.issues.map(issue => 
            `  • ${issue.type}: ${issue.description} (${issue.file})`
          ).join('\n')}`,
      pass: validation.isValid
    }
  },

  /**
   * Check if production build succeeds with given environment
   */
  async toPassProductionBuildTest(received, envVars = {}) {
    const buildResult = await DeploymentTestHelpers.simulateProductionBuild(envVars)
    
    return {
      message: () => buildResult.success
        ? `Production build succeeded (${(buildResult.bundleSize / 1024).toFixed(1)}KB)`
        : `Production build failed:\n${buildResult.error}\n\nOutput: ${buildResult.output}`,
      pass: buildResult.success
    }
  },

  /**
   * Check if environment variables are properly configured
   */
  toHaveValidEnvironmentConfig(received) {
    const envVars = received || process.env
    const validation = DeploymentTestHelpers.validateEnvironmentVariables(envVars)
    
    const pass = validation.isValid
    const issues = validation.issues
    const warnings = validation.warnings

    let message = pass ? 'Environment configuration is valid' : 'Environment configuration issues found'
    
    if (issues.length > 0) {
      message += `:\n${issues.map(issue => `  • ${issue.type}: ${issue.variable}`).join('\n')}`
    }
    
    if (warnings.length > 0) {
      message += `\nWarnings:\n${warnings.map(warning => 
        `  • ${warning.type}: ${warning.variable}${warning.suggestion ? ` (suggestion: ${warning.suggestion})` : ''}`
      ).join('\n')}`
    }

    return { message: () => message, pass }
  },

  /**
   * Check if component initializes without errors in production mode
   */
  async toInitializeInProductionMode(received, mockDependencies = {}) {
    const ComponentClass = received
    
    // Simulate production environment
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    try {
      const result = await DeploymentTestHelpers.testComponentInitialization(ComponentClass, mockDependencies)
      
      return {
        message: () => result.success
          ? 'Component initializes successfully in production mode'
          : `Component initialization failed in production mode:\n${result.error}`,
        pass: result.success
      }
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  },

  /**
   * Check if build output has required assets
   */
  toHaveBuildAssets(received, requirements = {}) {
    const buildResult = received
    const issues = []

    if (!buildResult.distExists) {
      issues.push('dist directory not created')
    }

    if (requirements.javascript && !buildResult.hasJSFiles) {
      issues.push('JavaScript files not found in build output')
    }

    if (requirements.css && !buildResult.hasCSSFiles) {
      issues.push('CSS files not found in build output')
    }

    if (requirements.serviceWorker && !buildResult.hasServiceWorker) {
      issues.push('Service worker not found in build output')
    }

    if (requirements.maxSize && buildResult.bundleSize > requirements.maxSize) {
      issues.push(`Bundle size (${buildResult.bundleSize}B) exceeds limit (${requirements.maxSize}B)`)
    }

    const pass = issues.length === 0

    return {
      message: () => pass
        ? 'Build output has all required assets'
        : `Build output issues:\n${issues.map(issue => `  • ${issue}`).join('\n')}`,
      pass
    }
  },

  /**
   * Check if deployment configuration is ready for production
   */
  async toBeDeploymentReady(received) {
    const report = await DeploymentTestHelpers.generateDeploymentReport()
    
    const pass = report.overallStatus === 'READY'
    
    return {
      message: () => pass
        ? `Deployment ready: ${report.summary.passed} checks passed`
        : `Deployment not ready: ${report.summary.failed} checks failed, ${report.summary.warnings} warnings`,
      pass
    }
  }
}

// Helper function to setup custom matchers
function setupDeploymentMatchers() {
  Object.entries(deploymentMatchers).forEach(([matcherName, matcher]) => {
    expect.extend({ [matcherName]: matcher })
  })
}

// Auto-setup if in Jest environment
if (typeof expect !== 'undefined') {
  setupDeploymentMatchers()
}

module.exports = {
  deploymentMatchers,
  setupDeploymentMatchers
}