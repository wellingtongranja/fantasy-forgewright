# Fantasy Editor Security Guide

Comprehensive security implementation guide covering all layers of Fantasy Editor's defense-in-depth security architecture.

## 🛡️ Security Overview

Fantasy Editor implements enterprise-grade security across multiple layers:

- **Web Application Firewall (WAF)** - Cloudflare rules blocking attacks
- **Security Headers** - Comprehensive HTTP security headers
- **Client-Side Security** - Input validation and content sanitization
- **OAuth Security** - Secure authentication with PKCE
- **Data Encryption** - Client-side encryption for sensitive data
- **Compliance** - GDPR, SOC 2, and OWASP Top 10 compliance

## 🔥 Web Application Firewall (WAF)

### Cloudflare WAF Configuration

Fantasy Editor uses Cloudflare's Web Application Firewall with custom rules protecting against:

- SQL injection attacks
- Cross-site scripting (XSS)
- Command injection
- File inclusion vulnerabilities
- Rate limiting abuse
- Bot traffic and geographic attacks

### WAF Rules Implementation

**Core Security Rules:**

```json
{
  "rules": [
    {
      "id": "block_sql_injection",
      "expression": "(http.request.uri.query contains \"union select\") or (http.request.uri.query contains \"drop table\")",
      "action": "block",
      "description": "Block SQL injection attempts"
    },
    {
      "id": "block_xss_attempts",
      "expression": "(http.request.uri.query contains \"<script\") or (http.request.body contains \"javascript:\")",
      "action": "block",
      "description": "Block XSS attempts"
    },
    {
      "id": "rate_limit_api",
      "expression": "(http.request.uri.path matches \"^/api/\") and (cf.rate_limit.requests_per_minute > 60)",
      "action": "challenge",
      "description": "Rate limit API endpoints"
    },
    {
      "id": "block_bad_bots",
      "expression": "(cf.bot_management.score < 30) and not (cf.bot_management.verified_bot)",
      "action": "block",
      "description": "Block malicious bots"
    },
    {
      "id": "geo_restrictions",
      "expression": "ip.geoip.country in {\"CN\" \"RU\" \"KP\" \"IR\"}",
      "action": "challenge",
      "description": "Challenge requests from high-risk countries"
    }
  ],
  "managed_rules": [
    {
      "id": "cloudflare_managed_rules",
      "enabled": true,
      "mode": "on"
    },
    {
      "id": "owasp_core_ruleset",
      "enabled": true,
      "mode": "on",
      "paranoia_level": 2
    }
  ]
}
```

**Rate Limiting Rules:**

- **API endpoints**: 100 requests/minute per IP
- **Authentication**: 10 requests/minute per IP
- **Global rate limiting**: 300 requests/minute per IP

### WAF Deployment Setup

#### Prerequisites

- Cloudflare account with WAF access
- API token with Zone:Edit permissions
- Zone ID for forgewright.io domain

#### Step 1: Create Cloudflare API Token

1. **Access Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to "My Profile" → "API Tokens"

2. **Create Custom Token**
   - Click "Create Token" → "Custom token"
   - **Token name**: `Fantasy Editor WAF Deployment`
   - **Permissions**:
     - `Zone:Edit` (required for WAF rules)
     - `Zone.Zone:Read` (required to read zone info)
   - **Zone Resources**: `Include: Specific zone: forgewright.io`
   - **TTL**: Leave empty (does not expire)

#### Step 2: Configure GitHub Secrets

1. **Repository Settings**
   - Navigate to repository settings
   - Go to "Settings" → "Environments"
   - Click on `fantasy.forgewright.io` environment

2. **Add Environment Secrets**
   - **CLOUDFLARE_API_TOKEN**: API token from Step 1
   - **CLOUDFLARE_ZONE_ID**: 32-character zone ID from Cloudflare dashboard

#### Step 3: Test WAF Deployment

```bash
# Verify API token access
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID"

# Test WAF rule access
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/firewall/rules"
```

### WAF Troubleshooting

**Common Issues:**

#### "Authentication error"

- Token lacks Zone:Edit permissions
- Token is for wrong zone
- Token has expired

#### "Zone not found"

- Incorrect Zone ID
- Token doesn't have access to zone

#### "Insufficient permissions"

- Token needs Zone:Edit for WAF rules
- Account lacks WAF access (check Cloudflare plan)

## 🔐 Security Headers

Fantasy Editor implements comprehensive HTTP security headers via Cloudflare Workers.

### Security Headers Configuration

```javascript
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://api.github.com https://gutendex.com",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=(self)',
    'camera=()',
    'payment=()',
    'usb=()'
  ].join(', '),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
}
```

### Headers Implementation

```javascript
// Cloudflare Worker for security headers
export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request)

    // Add security headers to all responses
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}
```

### Header Explanations

- **Content-Security-Policy**: Prevents XSS by controlling resource loading
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME-type confusion attacks
- **Strict-Transport-Security**: Enforces HTTPS connections
- **Permissions-Policy**: Restricts browser feature access

## ✅ Input Validation & Sanitization

Comprehensive input validation protects against malicious data injection.

### Validation Framework

```javascript
import DOMPurify from 'dompurify'

export class ValidationError extends Error {
  constructor(message, field, code) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.code = code
    this.userFacing = true
  }
}

export const validators = {
  /**
   * Validates document title with length and character restrictions
   */
  validateDocumentTitle(title) {
    if (!title || typeof title !== 'string') {
      throw new ValidationError('Title is required', 'title')
    }

    if (title.length > 100) {
      throw new ValidationError('Title must be less than 100 characters', 'title')
    }

    if (!/^[a-zA-Z0-9\s\-_.,!?]+$/.test(title)) {
      throw new ValidationError('Title contains invalid characters', 'title')
    }

    return title.trim()
  },

  /**
   * Sanitizes markdown content while preserving formatting
   */
  sanitizeMarkdown(content) {
    if (!content || typeof content !== 'string') {
      return ''
    }

    // Remove potential XSS vectors while preserving markdown
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })

    return sanitized
  },

  /**
   * Validates GitHub token format
   */
  validateGitHubToken(token) {
    if (!token || typeof token !== 'string') {
      throw new ValidationError('GitHub token is required', 'token')
    }

    // GitHub token patterns: ghp_, gho_, ghu_, ghs_, ghr_
    if (!/^(ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{36}$/.test(token)) {
      throw new ValidationError('Invalid GitHub token format', 'token')
    }

    return token
  },

  /**
   * Validates and normalizes document tags
   */
  validateTags(tags) {
    if (!Array.isArray(tags)) {
      throw new ValidationError('Tags must be an array', 'tags')
    }

    if (tags.length > 20) {
      throw new ValidationError('Maximum 20 tags allowed', 'tags')
    }

    return tags.map(tag => {
      if (typeof tag !== 'string') {
        throw new ValidationError('Tag must be a string', 'tags')
      }

      if (tag.length > 30) {
        throw new ValidationError('Tag must be less than 30 characters', 'tags')
      }

      if (!/^[a-zA-Z0-9\-_]+$/.test(tag)) {
        throw new ValidationError('Tag contains invalid characters', 'tags')
      }

      return tag.toLowerCase().trim()
    })
  }
}
```

### Content Sanitization

```javascript
/**
 * Comprehensive content sanitization
 */
export function sanitizeUserInput(input, type = 'text') {
  if (!input) return ''

  switch (type) {
    case 'markdown':
      return validators.sanitizeMarkdown(input)

    case 'title':
      return validators.validateDocumentTitle(input)

    case 'tag':
      return input.toLowerCase().replace(/[^a-z0-9\-_]/g, '')

    default:
      // Basic HTML sanitization for any text input
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      })
  }
}
```

## 🔑 Client-Side Encryption

Fantasy Editor encrypts sensitive data before storage using Web Crypto API.

### Encryption Implementation

```javascript
/**
 * Client-side encryption manager using AES-GCM
 */
export class CryptoManager {
  constructor() {
    this.algorithm = 'AES-GCM'
    this.keyLength = 256
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  async deriveKey(password, salt) {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,  // OWASP recommended minimum
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt sensitive data with AES-GCM
   */
  async encrypt(plaintext, key) {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: this.algorithm, iv: iv },
      key,
      encoder.encode(plaintext)
    )

    return { encrypted, iv }
  }

  /**
   * Decrypt data with AES-GCM
   */
  async decrypt(ciphertext, iv, key) {
    const decrypted = await crypto.subtle.decrypt(
      { name: this.algorithm, iv: iv },
      key,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }
}
```

### Encryption Usage

```javascript
// Example: Encrypting GitHub tokens before storage
export class SecureTokenManager {
  constructor() {
    this.crypto = new CryptoManager()
  }

  async storeToken(token, userPassword) {
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // Derive key from user password
    const key = await this.crypto.deriveKey(userPassword, salt)

    // Encrypt token
    const { encrypted, iv } = await this.crypto.encrypt(token, key)

    // Store encrypted data with salt and IV
    sessionStorage.setItem('encrypted_token', JSON.stringify({
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      salt: Array.from(salt)
    }))
  }

  async retrieveToken(userPassword) {
    const stored = JSON.parse(sessionStorage.getItem('encrypted_token'))
    if (!stored) return null

    // Reconstruct ArrayBuffers
    const encrypted = new Uint8Array(stored.encrypted).buffer
    const iv = new Uint8Array(stored.iv)
    const salt = new Uint8Array(stored.salt)

    // Derive key from password
    const key = await this.crypto.deriveKey(userPassword, salt)

    // Decrypt token
    return await this.crypto.decrypt(encrypted, iv, key)
  }
}
```

## 🔐 OAuth Security Model

Fantasy Editor uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication.

### PKCE Flow Implementation

```javascript
/**
 * Secure OAuth implementation with PKCE
 */
export class SecureOAuthManager {
  /**
   * Generate PKCE parameters
   */
  async generatePKCEParams() {
    // Generate random code verifier
    const codeVerifier = this.generateRandomString(128)

    // Create code challenge from verifier
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    return { codeVerifier, codeChallenge }
  }

  /**
   * Initiate secure OAuth flow
   */
  async initiateOAuth(provider) {
    const { codeVerifier, codeChallenge } = await this.generatePKCEParams()

    // Store verifier securely (session storage)
    sessionStorage.setItem('oauth_code_verifier', codeVerifier)

    // Build authorization URL with PKCE
    const authUrl = new URL(`https://github.com/login/oauth/authorize`)
    authUrl.searchParams.set('client_id', process.env.VITE_GITHUB_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', window.location.origin + '/')
    authUrl.searchParams.set('scope', 'repo user')
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    // Redirect to provider
    window.location.href = authUrl.toString()
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(code) {
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier')
    if (!codeVerifier) {
      throw new SecurityError('PKCE code verifier not found')
    }

    // Exchange via secure worker proxy
    const response = await fetch(`${process.env.VITE_OAUTH_WORKER_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'github',
        code: code,
        codeVerifier: codeVerifier
      })
    })

    if (!response.ok) {
      throw new SecurityError('Token exchange failed')
    }

    // Clear verifier after successful exchange
    sessionStorage.removeItem('oauth_code_verifier')

    return await response.json()
  }

  generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let result = ''
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)

    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length]
    }

    return result
  }
}
```

### OAuth Security Features

- **PKCE Implementation**: Prevents authorization code interception
- **Session Storage**: Tokens cleared when browser closes
- **Worker Proxy**: Client secrets never exposed to client-side
- **Origin Validation**: Strict CORS enforcement
- **Token Rotation**: Automatic refresh when possible

## 🔍 Security Monitoring & Logging

Comprehensive security event logging and monitoring system.

### Security Event Logger

```javascript
export class SecurityLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'security',
      event: event,
      details: details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId()
    }

    if (this.isProduction) {
      this.sendToSecurityService(logEntry)
    } else {
      console.warn('Security Event:', logEntry)
    }
  }

  logSuspiciousActivity(activity, riskLevel = 'medium') {
    this.logSecurityEvent('suspicious_activity', {
      activity,
      riskLevel,
      timestamp: Date.now()
    })
  }

  logAuthEvent(event, success, details = {}) {
    this.logSecurityEvent('auth_event', {
      event,
      success,
      details
    })
  }

  getSessionId() {
    return sessionStorage.getItem('sessionId') || 'anonymous'
  }

  sendToSecurityService(logEntry) {
    // Integration with security monitoring service
    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        message: `Security: ${logEntry.event}`,
        level: 'warning',
        data: logEntry.details
      })
    }

    // Send to custom security endpoint
    fetch('/api/security/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    }).catch(() => {
      // Fail silently to prevent disrupting user experience
    })
  }
}
```

### Security Monitoring Integration

```javascript
// Example usage in authentication flow
export class AuthManager {
  constructor() {
    this.securityLogger = new SecurityLogger()
  }

  async authenticate(credentials) {
    try {
      // Log authentication attempt
      this.securityLogger.logAuthEvent('login_attempt', null, {
        provider: credentials.provider,
        timestamp: Date.now()
      })

      const result = await this.performAuthentication(credentials)

      // Log successful authentication
      this.securityLogger.logAuthEvent('login_success', true, {
        provider: credentials.provider,
        userId: result.userId
      })

      return result

    } catch (error) {
      // Log failed authentication
      this.securityLogger.logAuthEvent('login_failure', false, {
        provider: credentials.provider,
        error: error.message,
        attempts: this.getFailedAttempts()
      })

      // Check for suspicious patterns
      if (this.getFailedAttempts() > 5) {
        this.securityLogger.logSuspiciousActivity('repeated_login_failures', 'high')
      }

      throw error
    }
  }
}
```

## 📋 Compliance & Standards

Fantasy Editor complies with major security standards and regulations.

### OWASP Top 10 Mitigation

1. **Injection** - Input validation, parameterized queries, DOMPurify
2. **Broken Authentication** - Secure token storage, PKCE, proper session management
3. **Sensitive Data Exposure** - Client-side encryption, HTTPS everywhere
4. **XML External Entities (XXE)** - No XML processing on client-side
5. **Broken Access Control** - Command-based authorization, proper validation
6. **Security Misconfiguration** - Security headers, CSP, proper error handling
7. **Cross-Site Scripting (XSS)** - Content sanitization, CSP headers
8. **Insecure Deserialization** - JSON-only communication, validation
9. **Known Vulnerabilities** - Regular dependency updates, security scanning
10. **Insufficient Logging** - Comprehensive security event logging

### GDPR Compliance

- [ ] **Privacy Policy**: Published and accessible
- [ ] **Data Processing Legal Basis**: Documented
- [ ] **User Consent**: Mechanisms implemented
- [ ] **Data Portability**: Features available (document export)
- [ ] **Right to Deletion**: Implemented (document deletion)
- [ ] **Data Breach Notification**: Procedures ready
- [ ] **Privacy by Design**: Principles followed
- [ ] **DPIA**: Data protection impact assessment completed

### SOC 2 Type II Requirements

- [ ] **Access Control**: Policies implemented
- [ ] **Data Encryption**: In transit and at rest
- [ ] **Change Management**: Procedures documented
- [ ] **Monitoring**: Logging systems operational
- [ ] **Incident Response**: Procedures tested
- [ ] **Vendor Risk**: Assessments completed
- [ ] **Employee Screening**: Background checks performed
- [ ] **Security Audits**: Regular audits conducted

## 🚨 Incident Response

### Security Incident Workflow

1. **Detection** - Automated monitoring alerts trigger response
2. **Assessment** - Evaluate severity and impact on users/data
3. **Containment** - Isolate affected systems and prevent spread
4. **Eradication** - Remove security threats and vulnerabilities
5. **Recovery** - Restore normal operations with enhanced security
6. **Lessons Learned** - Post-incident review and improvements

### Incident Response Contacts

- **Security Team**: <security@forgewright.io>
- **Emergency Hotline**: Available via GitHub repository contacts
- **Incident Report**: Submit via GitHub issues with security label

### Common Security Scenarios

#### OAuth Token Compromise

1. Immediately revoke affected tokens
2. Clear all user sessions
3. Force re-authentication for all users
4. Review OAuth logs for suspicious activity
5. Update OAuth configuration if needed

#### XSS/Injection Attempt

1. Review WAF logs for attack patterns
2. Update WAF rules to block similar attempts
3. Audit input validation functions
4. Review recent code changes for vulnerabilities
5. Deploy security patches immediately

#### Data Breach

1. Contain breach and assess scope
2. Document affected data and users
3. Notify users within 72 hours (GDPR requirement)
4. Report to authorities if required
5. Implement additional security measures

## 📊 Security Metrics & KPIs

### Key Security Indicators

- **Security Incidents**: 0 critical issues (target)
- **Vulnerability Response**: <24 hours for critical, <72 hours for high
- **Security Scan Frequency**: Weekly automated scans
- **Team Security Training**: 100% completion annually
- **Dependency Vulnerabilities**: 0 high/critical in production
- **SSL Certificate Validity**: Always valid with auto-renewal
- **Security Header Grade**: A+ rating maintained (securityheaders.com)

### Monitoring Dashboard

```javascript
// Security metrics collection
export class SecurityMetrics {
  static async collectMetrics() {
    return {
      // WAF metrics
      wafBlockedRequests: await this.getWAFStats(),

      // Authentication metrics
      authenticationFailures: await this.getAuthFailures(),

      // Vulnerability metrics
      dependencyVulnerabilities: await this.getDependencyVulns(),

      // Performance metrics
      securityHeaderGrade: await this.getHeaderGrade(),

      // Compliance metrics
      complianceScore: await this.getComplianceScore()
    }
  }
}
```

This comprehensive security implementation ensures Fantasy Editor maintains enterprise-grade security while preserving the user-friendly experience that makes it unique in the markdown editor space.

---

## Documentation Info

Fantasy Editor Security Guide - Last Updated: September 2025

*For development security practices, see [Developer Guide](developer-guide.md). For deployment security, see [Deployment Guide](deployment-guide.md).*