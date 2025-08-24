# CI/CD Deployment Lessons Learned - Fantasy Editor

## 📋 Overview

This document captures comprehensive lessons learned from the Fantasy Editor CI/CD deployment process to Cloudflare Pages. These hard-won insights prevent repeating critical mistakes and provide step-by-step solutions for common deployment issues.

## 🚨 Pre-Deployment Critical Checks

### ✅ Node.js Version Requirements

**Issue:** Vite 7+ requires Node.js 20+, but workflows used Node.js 18
**Symptom:** Build failures in CI despite working locally
**Solution:**
```yaml
# In ALL GitHub workflow files
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'  # NOT '18'
    cache: 'npm'
```

### ✅ GitHub Environment Configuration

**Issue:** Repository secrets insufficient for Cloudflare Pages deployment
**Symptom:** Missing secrets errors despite secrets being configured
**Solution:**
1. Create GitHub Environment: `Repository Settings > Environments > New environment`
2. Name: `fantasy.forgewright.io`
3. Add all secrets to the ENVIRONMENT, not repository
4. Update workflow:
```yaml
jobs:
  deploy:
    environment: fantasy.forgewright.io  # This line is MANDATORY
```

### ✅ Cloudflare Pages Project Name

**Issue:** Project name mismatch between workflow and Cloudflare Pages
**Symptom:** Deployment target not found errors
**Solution:**
```yaml
# In deploy.yml - use EXACT Cloudflare Pages project name
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    projectName: fantasy-forgewright  # NOT fantasy-editor
```

## 🔒 Security & Dependencies Issues

### npm Audit Vulnerabilities

**Issue:** Security vulnerabilities in dependencies block CI pipeline
**Symptoms:**
- `npm audit` fails with critical/high vulnerabilities
- CI stops at security scanning step

**Solutions:**
1. **Remove problematic packages:**
   ```bash
   npm uninstall bundlesize  # If causing vulnerabilities
   ```

2. **Update dependencies:**
   ```bash
   npm update jspdf  # Update to latest secure version
   ```

3. **Make Husky optional in CI:**
   ```json
   // package.json
   {
     "scripts": {
       "prepare": "husky install || exit 0"  // Won't fail CI
     }
   }
   ```

### SAST Scan Failures

**Issue:** Static Application Security Testing fails on shallow git repos
**Symptom:** "shallow repository" errors in CodeQL/security scans
**Solution:**
```yaml
# Add to ALL workflow checkout actions
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # This line is MANDATORY for SAST
```

### Test Pattern Mismatches

**Issue:** Jest test patterns don't match actual folder structure
**Symptom:** "No tests found" or test runner fails
**Solution:**
```json
// package.json - Fix test patterns
{
  "scripts": {
    "test:unit": "jest --testPathPattern=__tests__",  // Match actual folders
    "test:integration": "jest --testPathPattern=tests/integration"
  }
}
```

## 🏗️ Build Configuration Issues

### CSS Loading in Production Builds

**Issue:** Dynamic CSS imports fail in production builds
**Symptoms:**
- CSS MIME type errors in browser console
- Components appear unstyled in production
- Hardcoded CSS paths don't resolve

**Example Problem:**
```javascript
// ❌ WRONG - Dynamic CSS loading fails in production
injectStyles() {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/src/components/command-bar/command-bar.css'  // Fails in production
  document.head.appendChild(link)
}
```

**Solution:**
```javascript
// ✅ CORRECT - Static CSS import at top of file
import './command-bar.css'

// Remove injectStyles() method entirely
// Remove injectStyles() call from init()
```

### Service Worker Registration Conflicts

**Issue:** Manual service worker registration conflicts with VitePWA
**Symptoms:**
- "Service worker registration failed" console errors
- Multiple SW registration attempts
- SW script not found errors

**Problem:**
```javascript
// ❌ WRONG - Conflicts with VitePWA
async registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register(
      '/src/workers/service-worker.js'  // Conflicts with VitePWA
    )
  }
}
```

**Solution:**
```javascript
// ✅ CORRECT - Remove manual registration entirely
// Let VitePWA handle SW registration automatically

// In vite.config.js:
VitePWA({
  registerType: "autoUpdate",
  filename: "sw.js",
  strategies: "generateSW"  // Let VitePWA generate SW
})
```

### Vite Chunk Splitting Issues

**Issue:** Manual chunk configuration causes runtime initialization errors
**Symptom:** "Cannot access uninitialized variable" errors in production
**Problem:**
```javascript
// ❌ PROBLEMATIC - Manual chunking can cause issues
rollupOptions: {
  output: {
    manualChunks: {
      'vendor': ['codemirror', 'lunr'],
      'ui': ['./src/components/ui']
    }
  }
}
```

**Solution:**
```javascript
// ✅ SAFER - Let Vite auto-handle chunking
rollupOptions: {
  output: {
    chunkFileNames: (chunkInfo) => {
      const facadeModuleId = chunkInfo.facadeModuleId
      if (facadeModuleId) {
        const name = facadeModuleId.split('/').pop().replace(/\.[^.]+$/, '')
        return `assets/${name}-[hash].js`
      }
      return 'assets/[name]-[hash].js'
    }
  }
  // Remove manualChunks configuration
}
```

## ⚡ Runtime Production Issues

### JavaScript Initialization Errors

**Issue:** "Cannot access uninitialized variable" errors in production
**Root Causes:**
- Module initialization order problems
- Circular dependencies
- Improper async/await handling

**Investigation Steps:**
1. **Test production build locally:**
   ```bash
   NODE_ENV=production npm run build
   npm run preview
   ```

2. **Check browser console for specific error locations**

3. **Verify dynamic imports are properly awaited:**
   ```javascript
   // ✅ CORRECT - Properly awaited dynamic imports
   async initializeTabs() {
     try {
       const [documentsModule, outlineModule, searchModule] = await Promise.all([
         import('./tabs/documents-tab.js'),
         import('./tabs/outline-tab.js'),
         import('./tabs/search-tab.js')
       ])
       // Use modules...
     } catch (error) {
       console.error('Failed to initialize navigator tabs:', error)
     }
   }
   ```

### Environment Variable Issues

**Issue:** Environment variables behave differently in development vs production
**Common Problems:**
- `NODE_ENV=production` set manually (Vite sets automatically)
- Non-prefixed variables not accessible in client code
- Different values between local and CI builds

**Solutions:**
1. **Remove manual NODE_ENV setting:**
   ```bash
   # ❌ Remove from .env.production
   # NODE_ENV=production  # Vite sets this automatically
   ```

2. **Use VITE_ prefix for client-side variables:**
   ```bash
   # ✅ CORRECT - Accessible in client code
   VITE_GITHUB_CLIENT_ID=your_client_id
   VITE_BASE_URL=https://fantasy.forgewright.io
   ```

3. **Match environment variables between local and CI:**
   ```yaml
   # In GitHub Actions workflow
   env:
     NODE_ENV: production
     VITE_GITHUB_CLIENT_ID: ${{ secrets.VITE_GITHUB_CLIENT_ID }}
     VITE_BASE_URL: https://fantasy.forgewright.io
   ```

## 🛠️ Deployment Platform Gotchas

### Cloudflare Pages Configuration

**GitHub Token Permission Issues:**
```yaml
# ❌ PROBLEMATIC - Can cause permission errors
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    gitHubToken: ${{ secrets.GITHUB_TOKEN }}  # Remove this line
```

**Solution:**
```yaml
# ✅ CORRECT - Let action use default permissions
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    projectName: fantasy-forgewright
    directory: dist
    # No gitHubToken parameter
```

### DNS Configuration

**Issue:** CNAME record configuration confusion
**What you need:**
1. **CNAME Record:** `fantasy` → `fantasy-forgewright.pages.dev`
2. **NOT:** Full domain CNAME

**Cloudflare DNS Setup:**
- Type: CNAME
- Name: fantasy (not fantasy.forgewright.io)
- Target: fantasy-forgewright.pages.dev
- Proxied: Yes (orange cloud)

## 📊 Troubleshooting Guide

### Step 1: Identify Error Category

**Security/Audit Failures:**
- Keywords: "vulnerability", "audit", "SAST", "shallow repository"
- Solution: Update dependencies, fix git checkout depth

**Build Failures:**
- Keywords: "command failed", "exit code 1", "Node.js", "npm install"
- Solution: Check Node.js version, environment variables

**Deployment Failures:**
- Keywords: "project not found", "authentication", "token"
- Solution: Verify project name, environment configuration

**Runtime Errors:**
- Keywords: "uninitialized variable", "MIME type", "service worker"
- Solution: Check production build, CSS imports, SW configuration

### Step 2: Systematic Diagnosis

1. **Check GitHub Actions logs** for specific error messages
2. **Test locally** with production configuration:
   ```bash
   NODE_ENV=production npm run build
   npm run preview
   ```
3. **Compare working configuration** with current setup
4. **Verify environment variables** match between local and CI

### Step 3: Apply Targeted Fixes

**For CSS Issues:**
- Replace dynamic CSS loading with static imports
- Remove injectStyles methods
- Test production build locally

**For Service Worker Issues:**
- Remove manual SW registration
- Configure VitePWA properly
- Clear browser SW cache for testing

**For JavaScript Runtime Issues:**
- Simplify Vite chunk configuration
- Fix async/await patterns
- Check module initialization order

## 🎯 Prevention Strategies

### Automated Checks

Add these to your development process:

```json
// package.json - Add production build verification
{
  "scripts": {
    "verify:prod": "NODE_ENV=production npm run build && npm run preview",
    "test:prod-build": "npm run build && node scripts/verify-build.js"
  }
}
```

### Pre-Deployment Checklist

Create this checklist template:

```markdown
## Deployment Checklist

### Environment Configuration
- [ ] Node.js 20+ in ALL workflows
- [ ] GitHub environment `fantasy.forgewright.io` configured
- [ ] All secrets stored in environment (not repository)
- [ ] Cloudflare Pages project name: `fantasy-forgewright`

### Build Configuration  
- [ ] No dynamic CSS loading (use static imports)
- [ ] Single service worker registration source (VitePWA only)
- [ ] Simplified Vite chunk configuration
- [ ] Production build tested locally

### Dependencies & Security
- [ ] `npm audit` passes with no critical/high vulnerabilities
- [ ] All workflows have `fetch-depth: 0`
- [ ] Test patterns match actual folder structure
- [ ] Husky install is optional: `|| exit 0`

### Runtime Verification
- [ ] Environment variables properly prefixed with `VITE_`
- [ ] No manual `NODE_ENV=production` setting
- [ ] Async imports properly awaited
- [ ] Console clean of errors in production build
```

## 📚 Reference Implementation

See the working configuration in:
- `.github/workflows/deploy.yml` - Correct deployment workflow
- `vite.config.js` - Proper Vite/PWA configuration  
- `src/components/command-bar/command-bar.js` - Static CSS import example
- `src/app.js` - No manual service worker registration

These files represent the battle-tested, working configuration after resolving all deployment issues.

---

**Last Updated:** Based on successful deployment to `https://fantasy.forgewright.io` with all issues resolved.