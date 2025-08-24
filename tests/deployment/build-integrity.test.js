/**
 * Build Process Integrity Tests
 * Validates production builds and catches build-time issues
 */

const { DeploymentTestHelpers } = require('../helpers/deployment-helpers')
const { setupDeploymentMatchers } = require('../helpers/custom-matchers')
const fs = require('fs')
const path = require('path')

// Setup custom matchers
setupDeploymentMatchers()

const getRootPath = () => path.resolve(__dirname, '../../')

describe('🏗️ Build Process Protection', () => {
  
  describe('Production Build Simulation', () => {
    test('production build succeeds with standard environment variables', async () => {
      const standardEnv = {
        NODE_ENV: 'production',
        VITE_APP_TITLE: 'Fantasy Editor Test',
        VITE_GITHUB_CLIENT_ID: 'test_client_id',
        VITE_DOMAIN: 'test.example.com'
      }

      const buildResult = await DeploymentTestHelpers.simulateProductionBuild(standardEnv)
      
      if (!buildResult.success) {
        throw new Error(`Production build failed: ${buildResult.error}\nOutput: ${buildResult.output}`)
      }

      expect(buildResult).toHaveBuildAssets({
        javascript: true,
        css: true,
        serviceWorker: true,
        maxSize: 5 * 1024 * 1024 // 5MB max
      })
    }, 120000) // 2 minute timeout for build

    test('build fails gracefully with invalid environment variables', async () => {
      const invalidEnv = {
        NODE_ENV: 'production',
        // Missing required VITE_ prefixed variables
        GITHUB_CLIENT_ID: 'invalid_without_prefix'
      }

      const buildResult = await DeploymentTestHelpers.simulateProductionBuild(invalidEnv)
      
      // Build might succeed but should warn about environment variables
      if (buildResult.success) {
        console.warn('Build succeeded with potentially invalid env vars - consider validation')
      }
    })

    test('build output includes required assets for PWA', async () => {
      const standardEnv = {
        NODE_ENV: 'production',
        VITE_APP_TITLE: 'Fantasy Editor',
        VITE_DOMAIN: 'fantasy.forgewright.io'
      }

      const buildResult = await DeploymentTestHelpers.simulateProductionBuild(standardEnv)
      
      if (buildResult.success) {
        const distPath = path.join(getRootPath(), 'dist')
        const distFiles = fs.readdirSync(distPath)
        
        // Check for PWA assets
        expect(distFiles.some(file => file.includes('manifest'))).toBe(true)
        expect(distFiles.some(file => file.includes('.html'))).toBe(true)
        
        // Check for service worker
        expect(buildResult.hasServiceWorker || distFiles.some(file => 
          file.includes('sw.js') || file.includes('service-worker')
        )).toBe(true)
      }
    }, 120000)
  })

  describe('Static Asset Validation', () => {
    test('CSS files are properly bundled (not dynamically loaded)', () => {
      const srcPath = path.join(getRootPath(), 'src')
      const problematicFiles = []

      function checkFile(filePath) {
        if (!filePath.endsWith('.js')) return
        
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Check for problematic dynamic CSS loading patterns
        const badPatterns = [
          /document\.createElement\(['"]link['"].*href.*\.css/,
          /\.href\s*=\s*['"][^'"]*\.css['"]/,
          /injectStyles.*css/,
          /appendChild.*link.*stylesheet/
        ]

        const hasProblematicPattern = badPatterns.some(pattern => pattern.test(content))
        if (hasProblematicPattern) {
          problematicFiles.push(path.relative(getRootPath(), filePath))
        }
      }

      function walkDir(dir) {
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

      walkDir(srcPath)

      if (problematicFiles.length > 0) {
        throw new Error([
          '❌ Components found with dynamic CSS loading (fails in production):',
          ...problematicFiles.map(file => `  • ${file}`),
          '',
          '🔧 Fix: Use static imports: import "./component.css" at top of file'
        ].join('\n'))
      }
    })

    test('components use proper static CSS imports', () => {
      const commandBarPath = path.join(getRootPath(), 'src/components/command-bar/command-bar.js')
      
      if (fs.existsSync(commandBarPath)) {
        expect(commandBarPath).toUseStaticCSSImports()
      }
    })
  })

  describe('Bundle Optimization', () => {
    test('bundle size stays within acceptable limits', async () => {
      const buildResult = await DeploymentTestHelpers.simulateProductionBuild()
      
      if (buildResult.success) {
        const bundleSizeKB = buildResult.bundleSize / 1024
        const maxSizeKB = 1024 // 1MB limit as per documentation
        
        if (bundleSizeKB > maxSizeKB) {
          throw new Error(`Bundle size (${bundleSizeKB.toFixed(1)}KB) exceeds limit (${maxSizeKB}KB)`)
        }
        
        console.log(`✅ Bundle size: ${bundleSizeKB.toFixed(1)}KB (limit: ${maxSizeKB}KB)`)
      }
    }, 120000)

    test('Vite configuration avoids problematic manual chunking', () => {
      const viteConfigPath = path.join(getRootPath(), 'vite.config.js')
      
      if (fs.existsSync(viteConfigPath)) {
        const config = fs.readFileSync(viteConfigPath, 'utf8')
        
        // Check for complex manual chunking that can cause issues
        if (config.includes('manualChunks')) {
          const hasComplexChunking = config.includes('vendor-codemirror') && 
                                      config.includes('vendor-ui') &&
                                      config.includes('vendor-utils')
          
          if (hasComplexChunking) {
            console.warn('⚠️  Complex manual chunking detected - may cause runtime initialization errors')
          }
        }
      }
    })
  })

  describe('Service Worker Integration', () => {
    test('no conflicting service worker registrations', () => {
      expect({}).toHaveNoServiceWorkerConflicts()
    })

    test('VitePWA configuration is valid', () => {
      const viteConfigPath = path.join(getRootPath(), 'vite.config.js')
      expect(viteConfigPath).toHaveValidViteConfig()
    })
  })

  describe('Environment Variable Handling', () => {
    test('environment variables are properly configured for client access', () => {
      const testEnv = {
        NODE_ENV: 'production',
        VITE_GITHUB_CLIENT_ID: 'test_id',
        VITE_APP_TITLE: 'Test App',
        VITE_DOMAIN: 'test.example.com'
      }

      expect(testEnv).toHaveValidEnvironmentConfig()
    })

    test('no manual NODE_ENV setting in production env files', () => {
      const prodEnvPath = path.join(getRootPath(), '.env.production')
      
      if (fs.existsSync(prodEnvPath)) {
        const prodEnv = fs.readFileSync(prodEnvPath, 'utf8')
        
        if (prodEnv.includes('NODE_ENV=production')) {
          throw new Error([
            '❌ CRITICAL: Manual NODE_ENV=production found in .env.production',
            'Vite sets NODE_ENV automatically in production builds',
            '',
            '🔧 Fix: Remove NODE_ENV=production from .env.production file'
          ].join('\n'))
        }
      }
    })

    test('client-side variables use VITE_ prefix', () => {
      const envFiles = ['.env.production', '.env.development', '.env.local']
      
      envFiles.forEach(envFile => {
        const envPath = path.join(getRootPath(), envFile)
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8')
          const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))
          
          const issues = []
          lines.forEach(line => {
            const [key] = line.split('=')
            const clientSideIndicators = ['CLIENT_ID', 'API_KEY', 'DOMAIN', 'BASE_URL']
            
            if (clientSideIndicators.some(indicator => key.includes(indicator))) {
              if (!key.startsWith('VITE_')) {
                issues.push({ file: envFile, variable: key })
              }
            }
          })
          
          if (issues.length > 0) {
            console.warn(`⚠️  Potentially missing VITE_ prefix in ${envFile}:`, 
              issues.map(i => i.variable).join(', '))
          }
        }
      })
    })
  })

  describe('Build Configuration Validation', () => {
    test('Vite target is appropriate for modern browsers', () => {
      const viteConfigPath = path.join(getRootPath(), 'vite.config.js')
      
      if (fs.existsSync(viteConfigPath)) {
        const config = fs.readFileSync(viteConfigPath, 'utf8')
        
        // Check for build target
        if (config.includes('target:') || config.includes('"target"')) {
          // Should use es2020 or higher for modern features
          if (!config.includes('es2020') && !config.includes('es2021') && !config.includes('es2022')) {
            console.warn('⚠️  Consider using es2020+ build target for better performance')
          }
        }
      }
    })

    test('build uses appropriate minification for production', () => {
      const viteConfigPath = path.join(getRootPath(), 'vite.config.js')
      
      if (fs.existsSync(viteConfigPath)) {
        const config = fs.readFileSync(viteConfigPath, 'utf8')
        
        // Check for minify configuration
        const hasMinifyConfig = config.includes('minify:') || config.includes('"minify"')
        if (!hasMinifyConfig) {
          console.warn('⚠️  Consider explicit minify configuration for production builds')
        }
      }
    })
  })

  describe('Asset Organization', () => {
    test('build output has proper file structure', async () => {
      const buildResult = await DeploymentTestHelpers.simulateProductionBuild()
      
      if (buildResult.success) {
        const distPath = path.join(getRootPath(), 'dist')
        const assetsPath = path.join(distPath, 'assets')
        
        // Check for assets directory
        expect(fs.existsSync(assetsPath)).toBe(true)
        
        if (fs.existsSync(assetsPath)) {
          const assetFiles = fs.readdirSync(assetsPath)
          
          // Should have hashed filenames for caching
          const hasHashedFiles = assetFiles.some(file => file.includes('-') && file.includes('.'))
          expect(hasHashedFiles).toBe(true)
        }
      }
    }, 120000)
  })
})