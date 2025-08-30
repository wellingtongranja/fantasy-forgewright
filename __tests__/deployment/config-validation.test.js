/**
 * Configuration Validation Tests
 * Prevents deployment-breaking configuration drift
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const __dirname = path.dirname(__filename)

// Helper functions for configuration validation
const getRootPath = () => path.resolve(__dirname, '../../')
const readWorkflowFile = (filename) => {
  const workflowPath = path.join(getRootPath(), '.github/workflows', filename)
  if (!fs.existsSync(workflowPath)) {
    throw new Error(`Workflow file not found: ${filename}`)
  }
  return yaml.load(fs.readFileSync(workflowPath, 'utf8'))
}

const getAllWorkflowFiles = () => {
  const workflowsDir = path.join(getRootPath(), '.github/workflows')
  if (!fs.existsSync(workflowsDir)) {
    return []
  }
  return fs.readdirSync(workflowsDir)
    .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map(file => ({ filename: file, content: readWorkflowFile(file) }))
}

const readPackageJson = () => {
  const packagePath = path.join(getRootPath(), 'package.json')
  return JSON.parse(fs.readFileSync(packagePath, 'utf8'))
}

const readViteConfig = () => {
  const viteConfigPath = path.join(getRootPath(), 'vite.config.js')
  return fs.readFileSync(viteConfigPath, 'utf8')
}

describe('🚨 Configuration Validation - Critical Deployment Requirements', () => {
  
  describe('Node.js Version Consistency', () => {
    test('all GitHub workflows use Node.js 20+ (Vite 7+ requirement)', () => {
      const workflows = getAllWorkflowFiles()
      const nodeVersionIssues = []

      workflows.forEach(({ filename, content }) => {
        const jobs = content.jobs || {}
        
        Object.entries(jobs).forEach(([jobName, job]) => {
          const steps = job.steps || []
          
          steps.forEach(step => {
            if (step.uses && step.uses.includes('actions/setup-node')) {
              const nodeVersion = step.with?.['node-version']
              
              if (nodeVersion) {
                // Extract major version number
                const versionMatch = nodeVersion.match(/(\d+)/)
                if (versionMatch) {
                  const majorVersion = parseInt(versionMatch[1])
                  if (majorVersion < 20) {
                    nodeVersionIssues.push({
                      workflow: filename,
                      job: jobName,
                      version: nodeVersion,
                      step: step.name || 'Setup Node.js'
                    })
                  }
                }
              }
            }
          })
          
          // Check strategy matrix for node versions
          if (job.strategy?.matrix?.['node-version']) {
            const matrixVersions = job.strategy.matrix['node-version']
            matrixVersions.forEach(version => {
              const versionMatch = version.match(/(\d+)/)
              if (versionMatch && parseInt(versionMatch[1]) < 20) {
                nodeVersionIssues.push({
                  workflow: filename,
                  job: jobName,
                  version: version,
                  step: 'matrix strategy'
                })
              }
            })
          }
        })
      })

      if (nodeVersionIssues.length > 0) {
        const errorMessage = [
          '❌ CRITICAL: Found Node.js versions < 20 in GitHub workflows',
          'Vite 7+ requires Node.js 20+ or builds will fail in CI/production',
          '',
          'Issues found:',
          ...nodeVersionIssues.map(issue => 
            `  • ${issue.workflow} → ${issue.job} → ${issue.step}: ${issue.version}`
          ),
          '',
          '🔧 Fix: Update all node-version values to "20" or higher'
        ].join('\n')
        
        throw new Error(errorMessage)
      }
    })

    test('package.json engines specifies Node.js 20+', () => {
      const packageJson = readPackageJson()
      const engines = packageJson.engines
      
      if (!engines || !engines.node) {
        throw new Error('❌ package.json missing engines.node specification')
      }

      const nodeRequirement = engines.node
      const versionMatch = nodeRequirement.match(/>=(\d+)/)
      
      if (!versionMatch || parseInt(versionMatch[1]) < 20) {
        throw new Error(`❌ package.json engines.node should be ">=20.0.0", found: ${nodeRequirement}`)
      }
    })
  })

  describe('Environment Configuration', () => {
    test('deployment workflow uses GitHub environment (not just repository secrets)', () => {
      const deployWorkflow = readWorkflowFile('deploy.yml')
      const deployJob = deployWorkflow.jobs?.deploy

      if (!deployJob) {
        throw new Error('❌ deploy.yml missing "deploy" job')
      }

      if (!deployJob.environment) {
        throw new Error([
          '❌ CRITICAL: deploy job missing "environment" configuration',
          'Deployment requires GitHub environment for secret access',
          '',
          '🔧 Fix: Add environment: fantasy.forgewright.io to deploy job'
        ].join('\n'))
      }

      const expectedEnvironment = 'fantasy.forgewright.io'
      if (deployJob.environment !== expectedEnvironment) {
        throw new Error(`❌ Expected environment "${expectedEnvironment}", found: ${deployJob.environment}`)
      }
    })

    test('environment variables use VITE_ prefix for client-side access', () => {
      const workflows = getAllWorkflowFiles()
      const envVarIssues = []

      workflows.forEach(({ filename, content }) => {
        const jobs = content.jobs || {}
        
        Object.entries(jobs).forEach(([jobName, job]) => {
          const steps = job.steps || []
          
          steps.forEach(step => {
            if (step.env) {
              Object.keys(step.env).forEach(envVar => {
                // Check for client-side variables that should have VITE_ prefix
                const clientSideVars = ['GITHUB_CLIENT_ID', 'SENTRY_DSN', 'DOMAIN', 'BASE_URL']
                if (clientSideVars.some(varName => envVar.includes(varName)) && !envVar.startsWith('VITE_')) {
                  envVarIssues.push({
                    workflow: filename,
                    job: jobName,
                    variable: envVar,
                    step: step.name || 'unnamed step'
                  })
                }
              })
            }
          })
        })
      })

      if (envVarIssues.length > 0) {
        const errorMessage = [
          '❌ Found environment variables that need VITE_ prefix for client access',
          '',
          'Issues found:',
          ...envVarIssues.map(issue => 
            `  • ${issue.workflow} → ${issue.job} → ${issue.variable}`
          ),
          '',
          '🔧 Fix: Prefix client-side variables with VITE_'
        ].join('\n')
        
        console.warn(errorMessage) // Warning, not error, as this might be intentional
      }
    })
  })

  describe('Project Configuration', () => {
    test('Cloudflare Pages project name matches across workflows', () => {
      const deployWorkflow = readWorkflowFile('deploy.yml')
      const deploySteps = deployWorkflow.jobs?.deploy?.steps || []
      
      const cloudflareSteps = deploySteps.filter(step => 
        step.uses && step.uses.includes('cloudflare/pages-action')
      )

      if (cloudflareSteps.length === 0) {
        throw new Error('❌ No Cloudflare Pages deployment step found in deploy.yml')
      }

      const projectNames = cloudflareSteps.map(step => step.with?.projectName).filter(Boolean)
      
      if (projectNames.length === 0) {
        throw new Error('❌ No projectName specified in Cloudflare Pages action')
      }

      // All project names should match
      const uniqueNames = [...new Set(projectNames)]
      if (uniqueNames.length > 1) {
        throw new Error(`❌ Inconsistent project names found: ${uniqueNames.join(', ')}`)
      }

      const projectName = uniqueNames[0]
      const expectedName = 'fantasy-forgewright' // Based on actual Cloudflare Pages project
      
      if (projectName !== expectedName) {
        throw new Error([
          `❌ CRITICAL: Incorrect Cloudflare Pages project name`,
          `Expected: ${expectedName}`,
          `Found: ${projectName}`,
          '',
          '🔧 Fix: Update projectName in deploy.yml to match Cloudflare Pages project'
        ].join('\n'))
      }
    })

    test('no gitHubToken parameter in Cloudflare Pages action (causes permission issues)', () => {
      const deployWorkflow = readWorkflowFile('deploy.yml')
      const deploySteps = deployWorkflow.jobs?.deploy?.steps || []
      
      const cloudflareSteps = deploySteps.filter(step => 
        step.uses && step.uses.includes('cloudflare/pages-action')
      )

      cloudflareSteps.forEach(step => {
        if (step.with?.gitHubToken) {
          throw new Error([
            '❌ CRITICAL: Found gitHubToken parameter in Cloudflare Pages action',
            'This parameter causes permission issues and deployment failures',
            '',
            '🔧 Fix: Remove gitHubToken parameter from cloudflare/pages-action'
          ].join('\n'))
        }
      })
    })
  })

  describe('Service Worker Configuration', () => {
    test('VitePWA configured with proper filename and strategy', () => {
      const viteConfig = readViteConfig()
      
      if (!viteConfig.includes('VitePWA')) {
        throw new Error('❌ VitePWA plugin not found in vite.config.js')
      }

      // Check for filename and strategies configuration
      if (!viteConfig.includes('filename:') && !viteConfig.includes('"filename"')) {
        console.warn('⚠️  Consider specifying filename for VitePWA service worker')
      }

      if (!viteConfig.includes('strategies:') && !viteConfig.includes('"strategies"')) {
        console.warn('⚠️  Consider specifying strategies for VitePWA')
      }
    })

    test('no manual service worker registration in app code', () => {
      const appJsPath = path.join(getRootPath(), 'src/app.js')
      if (!fs.existsSync(appJsPath)) {
        return // Skip if file doesn't exist
      }

      const appJs = fs.readFileSync(appJsPath, 'utf8')
      
      // Check for manual service worker registration
      if (appJs.includes('registerServiceWorker') && appJs.includes('navigator.serviceWorker.register')) {
        throw new Error([
          '❌ CRITICAL: Manual service worker registration found in app.js',
          'This conflicts with VitePWA automatic registration',
          '',
          '🔧 Fix: Remove manual registerServiceWorker method and let VitePWA handle it'
        ].join('\n'))
      }
    })
  })

  describe('CSS Import Strategy', () => {
    test('no dynamic CSS loading with hardcoded paths in components', () => {
      const srcDir = path.join(getRootPath(), 'src')
      const issues = []

      const checkFile = (filePath) => {
        if (!filePath.endsWith('.js')) return
        
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Check for dynamic CSS loading patterns
        const problematicPatterns = [
          /document\.createElement\(['"]link['"].*stylesheet/,
          /\.href\s*=\s*['"][^'"]*\.css['"]/,
          /injectStyles.*href.*css/,
          /appendChild.*link.*css/
        ]

        problematicPatterns.forEach(pattern => {
          if (pattern.test(content)) {
            const relativePath = path.relative(getRootPath(), filePath)
            issues.push({
              file: relativePath,
              pattern: pattern.toString()
            })
          }
        })
      }

      const walkDir = (dir) => {
        if (!fs.existsSync(dir)) return
        
        const files = fs.readdirSync(dir)
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory() && !file.includes('node_modules')) {
            walkDir(filePath)
          } else if (stat.isFile()) {
            checkFile(filePath)
          }
        })
      }

      walkDir(srcDir)

      if (issues.length > 0) {
        const errorMessage = [
          '❌ CRITICAL: Dynamic CSS loading found (fails in production builds)',
          '',
          'Issues found:',
          ...issues.map(issue => `  • ${issue.file}`),
          '',
          '🔧 Fix: Replace with static imports: import "./component.css" at top of file'
        ].join('\n')
        
        throw new Error(errorMessage)
      }
    })
  })
})

describe('🔒 Security & Dependencies Validation', () => {
  
  describe('Git Configuration', () => {
    test('all workflow checkouts use fetch-depth: 0 for SAST scans', () => {
      const workflows = getAllWorkflowFiles()
      const shallowCheckouts = []

      workflows.forEach(({ filename, content }) => {
        const jobs = content.jobs || {}
        
        Object.entries(jobs).forEach(([jobName, job]) => {
          const steps = job.steps || []
          
          steps.forEach((step, stepIndex) => {
            if (step.uses && step.uses.includes('actions/checkout')) {
              const fetchDepth = step.with?.['fetch-depth']
              
              if (fetchDepth === undefined || fetchDepth !== 0) {
                shallowCheckouts.push({
                  workflow: filename,
                  job: jobName,
                  stepIndex,
                  stepName: step.name || 'Checkout'
                })
              }
            }
          })
        })
      })

      if (shallowCheckouts.length > 0) {
        const errorMessage = [
          '❌ CRITICAL: Found shallow git checkouts (causes SAST scan failures)',
          '',
          'Issues found:',
          ...shallowCheckouts.map(issue => 
            `  • ${issue.workflow} → ${issue.job} → ${issue.stepName}`
          ),
          '',
          '🔧 Fix: Add "fetch-depth: 0" to all checkout actions'
        ].join('\n')
        
        throw new Error(errorMessage)
      }
    })
  })

  describe('Test Configuration', () => {
    test('Jest test patterns match actual folder structure', () => {
      const packageJson = readPackageJson()
      const testScripts = {}
      
      // Extract test script patterns
      Object.entries(packageJson.scripts || {}).forEach(([script, command]) => {
        if (script.startsWith('test:') && command.includes('jest')) {
          const patternMatch = command.match(/--testPathPattern[=\s]([^\s]+)/)
          if (patternMatch) {
            testScripts[script] = patternMatch[1]
          }
        }
      })

      // Check if test directories exist
      const hasTestsFolder = fs.existsSync(path.join(getRootPath(), '__tests__'))

      Object.entries(testScripts).forEach(([script, pattern]) => {
        if (pattern.includes('__tests__') && !hasTestsFolder) {
          throw new Error(`❌ ${script} pattern "${pattern}" but __tests__ folder not found`)
        }
      })
    })
  })

  describe('Dependency Security', () => {
    test('Husky install is optional (prevents CI failures)', () => {
      const packageJson = readPackageJson()
      const prepareScript = packageJson.scripts?.prepare
      
      if (prepareScript && prepareScript.includes('husky install')) {
        if (!prepareScript.includes('|| exit 0')) {
          throw new Error([
            '❌ CRITICAL: Husky install not made optional',
            'This causes CI failures when Husky cannot install',
            '',
            `Current: ${prepareScript}`,
            '🔧 Fix: Change to "husky install || exit 0"'
          ].join('\n'))
        }
      }
    })
  })
})

// Export helper functions for use in other tests
module.exports = {
  getRootPath,
  readWorkflowFile,
  getAllWorkflowFiles,
  readPackageJson,
  readViteConfig
}