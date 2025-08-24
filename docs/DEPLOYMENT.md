# Deployment & CI/CD - Fantasy Editor

## 🚀 Deployment Overview

Fantasy Editor uses GitHub Actions for CI/CD with deployment to Cloudflare Pages, providing global CDN distribution and edge computing capabilities.

## 🔄 CI/CD Pipeline

### 1. Continuous Integration (.github/workflows/ci.yml)

```yaml
name: Continuous Integration

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint code
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Check bundle size
      run: npm run build && npm run test:bundle-size
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: npm audit --audit-level=moderate
    
    - name: Run SAST scan
      uses: github/super-linter@v4
      env:
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        VALIDATE_JAVASCRIPT_ES: true
        VALIDATE_CSS: true
        VALIDATE_HTML: true

  accessibility:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Run accessibility tests
      run: npm run test:a11y
```

### 2. Deployment Pipeline (.github/workflows/deploy.yml)

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_run:
    workflows: ["Continuous Integration"]
    types: [completed]
    branches: [ main ]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        GITHUB_TEST_TOKEN: ${{ secrets.GITHUB_TEST_TOKEN }}
    
    - name: Build application
      run: npm run build
      env:
        NODE_ENV: production
        GITHUB_CLIENT_ID: ${{ secrets.GITHUB_CLIENT_ID }}
        SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
        DOMAIN: fantasy.forgewright.io
    
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: fantasy-forgewright
        directory: dist
    
    - name: Update DNS records
      run: |
        curl -X PUT "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/dns_records/${{ secrets.DNS_RECORD_ID }}" \
        -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
        -H "Content-Type: application/json" \
        --data '{"type":"CNAME","name":"@","content":"fantasy-editor.pages.dev","ttl":1}'
    
    - name: Update WAF rules
      run: npm run deploy:waf
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    
    - name: Run smoke tests
      run: npm run test:smoke
      env:
        BASE_URL: https://fantasy.forgewright.io

  performance:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Lighthouse CI
      uses: treosh/lighthouse-ci-action@v9
      with:
        urls: |
          https://fantasy.forgewright.io
          https://fantasy.forgewright.io/app
        configPath: './lighthouse.config.js'
        uploadArtifacts: true
        temporaryPublicStorage: true

  notify:
    needs: [deploy, performance]
    runs-on: ubuntu-latest
    if: always()
    steps:
    - name: Notify deployment status
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 3. Security Scanning (.github/workflows/security.yml)

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM
  push:
    branches: [ main ]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run CodeQL Analysis
      uses: github/codeql-action/init@v2
      with:
        languages: javascript
    
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high

  dast:
    runs-on: ubuntu-latest
    steps:
    - name: ZAP Scan
      uses: zaproxy/action-full-scan@v0.4.0
      with:
        target: 'https://fantasy.forgewright.io'
        rules_file_name: '.zap/rules.tsv'
        cmd_options: '-a'
```

### 4. Performance Monitoring (.github/workflows/performance.yml)

```yaml
name: Performance Monitoring

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Lighthouse CI
      uses: treosh/lighthouse-ci-action@v9
      with:
        urls: |
          https://fantasy.forgewright.io
          https://fantasy.forgewright.io/?theme=dark
          https://fantasy.forgewright.io/?theme=fantasy
        uploadArtifacts: true
        temporaryPublicStorage: true

  bundle-analysis:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Analyze bundle
      run: npm run analyze-bundle
    
    - name: Upload bundle analysis
      uses: actions/upload-artifact@v3
      with:
        name: bundle-analysis
        path: bundle-analysis.html
```

## ☁️ Cloudflare Configuration

### Pages Configuration (cloudflare/pages-config.toml)

```toml
[build]
command = "npm run build"
publish = "dist"

[build.environment]
NODE_VERSION = "20"
NPM_VERSION = "9"

[[headers]]
for = "/*"

[headers.values]
X-Frame-Options = "DENY"
X-Content-Type-Options = "nosniff"
X-XSS-Protection = "1; mode=block"
Referrer-Policy = "strict-origin-when-cross-origin"
Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"

[[headers]]
for = "/assets/*"

[headers.values]
Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
for = "*.js"

[headers.values]
Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
for = "*.css"

[headers.values]
Cache-Control = "public, max-age=31536000, immutable"

[[redirects]]
from = "/app"
to = "/index.html"
status = 200

[[redirects]]
from = "/app/*"
to = "/index.html"
status = 200
```

### WAF Deployment Script

```javascript
// scripts/deploy-waf.js
const cloudflare = require('cloudflare')

const cf = cloudflare({
  token: process.env.CLOUDFLARE_API_TOKEN
})

async function deployWAFRules() {
  try {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID
    const wafRules = require('../cloudflare/waf-rules.json')
    
    console.log('Deploying WAF rules...')
    
    for (const rule of wafRules.rules) {
      await cf.firewallRules.add(zoneId, {
        filter: {
          expression: rule.expression
        },
        action: rule.action,
        description: rule.description
      })
      
      console.log(`✅ Deployed rule: ${rule.id}`)
    }
    
    console.log('🛡️ WAF deployment complete')
  } catch (error) {
    console.error('❌ WAF deployment failed:', error)
    process.exit(1)
  }
}

deployWAFRules()
```

## 🏗️ Build Process

### Vite Configuration (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['codemirror'],
          utils: ['lunr', 'dompurify']
        }
      }
    },
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development'
  },
  
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'github-api',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60 // 24 hours
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Fantasy Editor',
        short_name: 'Fantasy Editor',
        description: 'Distraction-free markdown editor for writers',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration", 
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:smoke": "playwright test --grep='smoke'",
    "test:a11y": "axe-playwright",
    "test:bundle-size": "bundlesize",
    "lint": "eslint src --ext .js",
    "lint:fix": "eslint src --ext .js --fix",
    "format": "prettier --write src/**/*.{js,css,html}",
    "analyze-bundle": "vite-bundle-analyzer dist",
    "deploy:waf": "node scripts/deploy-waf.js",
    "prepare": "husky install"
  }
}
```

## 🚦 Environment Configuration

### Environment Variables

```bash
# Production (.env.production)
# NOTE: NODE_ENV is set automatically by Vite - do NOT set manually
VITE_APP_TITLE=Fantasy Editor
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_SENTRY_DSN=your_sentry_dsn
VITE_DOMAIN=fantasy.fantasy.forgewright.io

# Development (.env.development)  
NODE_ENV=development
VITE_APP_TITLE=Fantasy Editor (Dev)
VITE_GITHUB_CLIENT_ID=your_dev_github_client_id
VITE_DEBUG=true

# Testing (.env.test)
NODE_ENV=test
VITE_APP_TITLE=Fantasy Editor (Test)
GITHUB_TEST_TOKEN=your_test_token
```

### GitHub Secrets

```bash
# Required secrets in GitHub repository settings
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id  
CLOUDFLARE_ZONE_ID=your_zone_id
DNS_RECORD_ID=your_dns_record_id
GITHUB_CLIENT_ID=your_github_oauth_app_id
GITHUB_TEST_TOKEN=your_test_user_token
SENTRY_DSN=your_sentry_project_dsn
SNYK_TOKEN=your_snyk_api_token
SLACK_WEBHOOK=your_slack_webhook_url
```

## 🎯 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit, integration, e2e)
- [ ] Security scan completed with no critical issues
- [ ] Bundle size under 1MB limit
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Cross-browser testing completed
- [ ] Mobile testing on real devices
- [ ] Environment variables configured
- [ ] DNS records updated
- [ ] SSL certificates validated
- [ ] CDN configuration verified

### Deployment

- [ ] GitHub Actions workflow triggered
- [ ] Build process completed successfully
- [ ] Security headers deployed
- [ ] WAF rules updated
- [ ] Performance monitoring active
- [ ] Error tracking operational
- [ ] Smoke tests passed
- [ ] Rollback plan ready

### Post-Deployment

- [ ] Application accessible at fantasy.forgewright.io
- [ ] All core functionality working
- [ ] Command palette responds to Ctrl+Space
- [ ] Theme switching operational
- [ ] Search functionality active
- [ ] Offline mode working
- [ ] Performance metrics within targets
- [ ] Security monitoring active
- [ ] User feedback collection enabled

## 🚨 Common Deployment Issues

### Critical Configuration Fixes

**Node.js Version Mismatch:**
```yaml
# ❌ WRONG - Causes build failures
node-version: '18'

# ✅ CORRECT - Vite 7+ requires Node 20+
node-version: '20'
```

**GitHub Environment Missing:**
```yaml
# ❌ INCOMPLETE - Missing environment configuration
jobs:
  deploy:
    runs-on: ubuntu-latest

# ✅ CORRECT - Environment required for secrets
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: fantasy.fantasy.forgewright.io  # MANDATORY
```

**Project Name Mismatch:**
```yaml
# ❌ WRONG - Deployment target not found
projectName: fantasy-editor

# ✅ CORRECT - Must match Cloudflare Pages project exactly
projectName: fantasy-forgewright
```

### Frequent Build Failures

**1. npm Audit Vulnerabilities**
- **Symptom:** CI fails at security scanning step
- **Quick Fix:** Remove bundlesize package: `npm uninstall bundlesize`
- **Long-term:** Update vulnerable dependencies regularly

**2. SAST Scan Shallow Repository**
- **Symptom:** "shallow repository" error in CodeQL
- **Fix:** Add to all checkout actions:
  ```yaml
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  ```

**3. CSS MIME Type Errors in Production**
- **Symptom:** Unstyled components, CSS not loading
- **Cause:** Dynamic CSS imports with hardcoded paths
- **Fix:** Replace with static imports:
  ```javascript
  // At top of component file
  import './component.css'
  ```

**4. Service Worker Registration Conflicts**
- **Symptom:** SW registration failed console errors  
- **Cause:** Manual SW registration conflicts with VitePWA
- **Fix:** Remove custom `registerServiceWorker()` methods

**5. "Cannot access uninitialized variable" Runtime Errors**
- **Symptom:** JavaScript initialization errors in production only
- **Cause:** Complex Vite chunk splitting configuration
- **Fix:** Simplify or remove `manualChunks` configuration

### Environment Variable Issues

**Client-Side Variables Not Accessible:**
```bash
# ❌ WRONG - Not accessible in client code
GITHUB_CLIENT_ID=your_client_id

# ✅ CORRECT - VITE_ prefix required
VITE_GITHUB_CLIENT_ID=your_client_id
```

**Manual NODE_ENV Setting:**
```bash
# ❌ WRONG - Remove from .env.production
NODE_ENV=production

# ✅ CORRECT - Vite sets automatically, remove manual setting
```

### Cloudflare Pages Gotchas

**DNS Record Configuration:**
- **Type:** CNAME
- **Name:** `fantasy` (NOT `fantasy.fantasy.forgewright.io`)
- **Target:** `fantasy-forgewright.pages.dev`
- **Proxied:** Yes (orange cloud)

**GitHub Token Permission Errors:**
```yaml
# ❌ PROBLEMATIC - Can cause permission issues
gitHubToken: ${{ secrets.GITHUB_TOKEN }}

# ✅ CORRECT - Remove gitHubToken parameter entirely
```

### Quick Diagnostic Steps

When deployment fails:

1. **Check Node.js version in ALL workflows**
2. **Verify GitHub environment exists with all secrets**
3. **Confirm Cloudflare Pages project name matches exactly**
4. **Test production build locally:**
   ```bash
   NODE_ENV=production npm run build
   npm run preview
   ```
5. **Check browser console for runtime errors**

### Emergency Rollback

If deployment succeeds but site is broken:

```bash
# Get previous working commit
git log --oneline -5

# Revert to last working state
git revert HEAD --no-edit
git push origin main
```

For detailed troubleshooting, see `CICD_LESSONS_LEARNED.md`.

## 🎭 Environment-Specific Configurations

### Development

```javascript
// vite.config.dev.js
export default defineConfig({
  server: {
    port: 3000,
    open: true,
    hmr: true
  },
  define: {
    __DEV__: true,
    __APP_VERSION__: JSON.stringify('dev')
  }
})
```

### Staging

```javascript  
// vite.config.staging.js
export default defineConfig({
  base: '/staging/',
  build: {
    sourcemap: true,
    minify: false
  },
  define: {
    __STAGING__: true
  }
})
```

### Production

```javascript
// vite.config.prod.js  
export default defineConfig({
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['codemirror', 'lunr'],
          'ui': ['./src/components/ui']
        }
      }
    }
  },
  define: {
    __PROD__: true
  }
})
```

## 📊 Monitoring & Alerting

### Performance Alerts

```yaml
# .github/workflows/performance-alert.yml
name: Performance Alert

on:
  schedule:
    - cron: '0 */12 * * *'

jobs:
  performance-check:
    runs-on: ubuntu-latest
    steps:
    - name: Check Lighthouse scores
      run: |
        SCORES=$(lighthouse https://fantasy.forgewright.io --output=json --quiet)
        PERFORMANCE=$(echo $SCORES | jq '.categories.performance.score * 100')
        
        if [ "$PERFORMANCE" -lt 90 ]; then
          curl -X POST -H 'Content-type: application/json' \
          --data '{"text":"🚨 Performance Alert: Lighthouse score dropped to '$PERFORMANCE'"}' \
          ${{ secrets.SLACK_WEBHOOK }}
        fi
```

### Uptime Monitoring

```javascript
// scripts/uptime-check.js
const fetch = require('node-fetch')

async function checkUptime() {
  try {
    const response = await fetch('https://fantasy.forgewright.io')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    console.log('✅ Site is up and running')
  } catch (error) {
    console.error('❌ Site is down:', error.message)
    
    // Send alert
    await fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 fantasy.forgewright.io is down: ${error.message}`
      })
    })
    
    process.exit(1)
  }
}

checkUptime()
```

## 🔄 Rollback Strategy

### Automatic Rollback

```yaml
# In deploy.yml, add rollback on failure
- name: Deploy to Cloudflare Pages
  id: deploy
  uses: cloudflare/pages-action@1
  # ... deployment config

- name: Rollback on failure
  if: failure()
  run: |
    # Get previous successful deployment
    PREV_DEPLOYMENT=$(gh api repos/${{ github.repository }}/deployments \
      --jq '[.[] | select(.environment=="production" and .task=="deploy")][1].sha')
    
    # Trigger rollback deployment
    curl -X POST "https://api.cloudflare.com/client/v4/accounts/${{ secrets.CLOUDFLARE_ACCOUNT_ID }}/pages/projects/fantasy-editor/deployments" \
      -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"source_branch":"main","source_commit":"'$PREV_DEPLOYMENT'"}'
```

This deployment strategy ensures Fantasy Editor maintains high availability, security, and performance while providing rapid, reliable deployments with comprehensive monitoring and rollback capabilities.