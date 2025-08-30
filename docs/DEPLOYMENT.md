# Deployment Guide - Fantasy Editor

Fantasy Editor uses GitHub Actions for CI/CD with deployment to Cloudflare Pages, providing global CDN distribution and edge computing capabilities.

## Quick Deployment

### Prerequisites
- Node.js 20+ (required for Vite 7+)
- Cloudflare account with Pages enabled
- GitHub repository

### Setup Steps

1. **Create Cloudflare Pages Project**
   - Go to [Cloudflare Pages](https://pages.cloudflare.com/)
   - Connect your GitHub repository
   - Set project name: `fantasy-forgewright`

2. **Configure Environment Variables**
   - Create GitHub Environment: `fantasy.forgewright.io`
   - Add secrets to the ENVIRONMENT (not repository):
     - `CLOUDFLARE_API_TOKEN`
     - `CLOUDFLARE_ACCOUNT_ID`
     - `VITE_GITHUB_CLIENT_ID`

3. **Deploy**
   - Push to `main` branch triggers automatic deployment
   - Check deployment status in GitHub Actions

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: fantasy.forgewright.io  # MANDATORY
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'  # Node 20+ required
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: fantasy-forgewright  # Exact Cloudflare project name
        directory: dist
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Build Configuration

**package.json scripts:**
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src/**/*.js --max-warnings=200",
    "test": "jest"
  }
}
```

**vite.config.js:**
```javascript
export default {
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@codemirror/state', '@codemirror/view'],
          utils: ['dompurify', 'lunr']
        }
      }
    }
  }
}
```

## Environment Configuration

### Production Environment Variables

**Cloudflare Pages Settings:**
```bash
NODE_VERSION=20
VITE_OAUTH_WORKER_URL=https://fantasy-oauth-proxy.wellington-granja.workers.dev
VITE_GITHUB_CLIENT_ID=your_production_client_id
```

**GitHub Environment Secrets:**
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Pages:Edit permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `VITE_GITHUB_CLIENT_ID` - GitHub OAuth app client ID

### Development Environment

**Local Development:**
```bash
# .env
VITE_OAUTH_WORKER_URL=http://localhost:8788
VITE_GITHUB_CLIENT_ID=your_dev_client_id
```

**GitHub OAuth App (Development):**
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/`

## Troubleshooting

### Common Deployment Issues

#### ❌ Node.js Version Mismatch
**Symptom:** Build fails with Vite errors despite working locally
**Solution:** Update all workflows to Node.js 20+
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'  # NOT '18'
```

#### ❌ Missing Secrets
**Symptom:** "Missing secrets" errors despite secrets being configured
**Solution:** Use GitHub Environments, not repository secrets
1. Repository Settings > Environments > New environment
2. Name: `fantasy.forgewright.io`
3. Add secrets to ENVIRONMENT
4. Add `environment: fantasy.forgewright.io` to workflow

#### ❌ Project Name Mismatch
**Symptom:** "Deployment target not found" errors
**Solution:** Use exact Cloudflare Pages project name
```yaml
projectName: fantasy-forgewright  # NOT fantasy-editor
```

#### ❌ npm Audit Failures
**Symptom:** CI fails on npm audit with vulnerabilities
**Solution:** Update dependencies or remove problematic packages
```bash
npm audit fix --force
# OR remove vulnerable packages like bundlesize
npm uninstall bundlesize
```

#### ❌ Security Scan Issues
**Symptom:** CodeQL or SAST scans fail with shallow clone errors
**Solution:** Add `fetch-depth: 0` to all checkout actions
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full clone for security scans
```

### Runtime Issues

#### CSS Not Loading in Production
**Symptom:** Styles missing in production build
**Solution:** Use static CSS imports instead of dynamic loading
```javascript
// ✅ Correct
import './component.css'

// ❌ Incorrect
injectStyles('./component.css')
```

#### Service Worker Conflicts
**Symptom:** SW registration errors or duplicate registrations
**Solution:** Let VitePWA handle service worker exclusively
```javascript
// Remove manual SW registration
// registerServiceWorker() // DELETE THIS

// Let VitePWA handle it in vite.config.js
VitePWA({
  registerType: 'autoUpdate'
})
```

### Performance Optimization

#### Bundle Size Monitoring
```bash
# Check bundle size
npm run build
ls -lah dist/assets/

# Target: < 1MB gzipped
gzip -9 dist/assets/*.js | wc -c
```

#### Lighthouse Scores
Target metrics:
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

## Security Considerations

### Content Security Policy
Cloudflare Pages automatically applies security headers. Verify CSP allows:
- `script-src 'self' 'unsafe-inline'` for CodeMirror
- `connect-src 'self' https://api.github.com`

### Environment Variables
- Prefix client-side vars with `VITE_`
- Store sensitive data in GitHub Environment secrets
- Never commit secrets to repository

### OAuth Security
- Use separate OAuth apps for dev/prod
- Validate redirect URIs match deployment URLs
- Store client secrets only in Cloudflare Worker

## Monitoring & Maintenance

### Deployment Health Checks
- Monitor Cloudflare Pages deployment logs
- Set up uptime monitoring for production URL
- Track Core Web Vitals via Lighthouse CI

### Automated Maintenance
```yaml
# .github/workflows/maintenance.yml
- name: Update dependencies
  run: npm update
  
- name: Security audit
  run: npm audit --audit-level moderate

- name: Lint check
  run: npm run lint
```

### Rollback Procedure
If deployment fails:
1. Check GitHub Actions logs for specific errors
2. Rollback via Cloudflare Pages dashboard
3. Fix issues in development
4. Test locally: `npm run build && npm run preview`
5. Deploy again

## Performance Targets

- **Bundle Size**: < 1MB gzipped
- **First Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: >90 in all categories

## Quick Reference

### Key Commands
```bash
# Local development
npm run dev

# Production build
npm run build
npm run preview

# Testing
npm run lint
npm run test

# Deployment (automatic on main branch push)
git push origin main
```

### Important URLs
- **Production**: https://forgewright.io
- **Cloudflare Pages**: https://pages.cloudflare.com
- **GitHub Actions**: Repository > Actions tab
- **OAuth Worker**: https://fantasy-oauth-proxy.wellington-granja.workers.dev

---

*This guide covers Fantasy Editor v0.0.1 deployment. For updates, see release notes.*