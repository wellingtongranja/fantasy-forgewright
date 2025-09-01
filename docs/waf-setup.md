# WAF (Web Application Firewall) Setup Guide

## 🛡️ Overview

Fantasy Editor uses Cloudflare's Web Application Firewall to protect against common security threats including:

- SQL injection attacks
- Cross-site scripting (XSS)
- Rate limiting abuse
- Bot traffic
- Geographic-based attacks
- Command injection
- File inclusion vulnerabilities

## 🔧 Current Issue

The WAF deployment is failing with "Authentication error" during the CI/CD process. This means the security rules are not being automatically deployed, but **the application is still protected** by Cloudflare's default security features.

## 🚀 Quick Fix Instructions

### Step 1: Create Cloudflare API Token

1. **Access Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to "My Profile" → "API Tokens"

2. **Create Custom Token**
   - Click "Create Token" → "Custom token"
   - **Token name**: `Fantasy Editor WAF Deployment`
   - **Permissions**:
     - `Zone:Edit` (required for WAF rules)
     - `Zone.Zone:Read` (required to read zone info)
   - **Zone Resources**: 
     - Include: `Specific zone: forgewright.io`
   - **Client IP Address Filtering**: Leave empty (optional)
   - **TTL**: Leave empty (does not expire)

3. **Save the Token**
   - Copy the generated token immediately (it won't be shown again)

### Step 2: Get Zone ID

1. **In Cloudflare Dashboard**
   - Navigate to the `forgewright.io` domain
   - Look for "Zone ID" in the right sidebar
   - Copy the 32-character hexadecimal string

### Step 3: Update GitHub Secrets

1. **Access Repository Settings**
   - Go to GitHub repository: `wellingtongranja/fantasy-forgewright`
   - Navigate to "Settings" → "Environments"
   - Click on `fantasy.forgewright.io` environment

2. **Update Environment Secrets**
   - **CLOUDFLARE_API_TOKEN**: Paste the API token from Step 1
   - **CLOUDFLARE_ZONE_ID**: Paste the Zone ID from Step 2

### Step 4: Test Deployment

1. **Trigger New Deployment**
   - Make any small change to trigger CI/CD
   - Or manually trigger the "Deploy to Production" workflow

2. **Monitor Logs**
   - Check GitHub Actions logs for WAF deployment success
   - Should see: "✅ API authentication successful"
   - Should show: "✅ Deployed 15/15 rules"

## 🔍 Troubleshooting

### Common Issues

**"Authentication error"**
- Token lacks required permissions (ensure Zone:Edit)
- Token is for wrong zone (ensure forgewright.io is included)
- Token has expired (create new token)

**"Zone not found"**
- Zone ID is incorrect (double-check from dashboard)
- API token doesn't have access to this zone

**"Insufficient permissions"**
- Token needs Zone:Edit permission for WAF rules
- Account might not have WAF access (check Cloudflare plan)

### Verification Commands

You can test the token locally:

```bash
# Test basic authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID"

# Test WAF access
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/firewall/rules"
```

## 🛡️ Security Rules Overview

The WAF configuration deploys 15 security rules:

### Rate Limiting
- API endpoint rate limiting (100 requests/minute)
- Authentication rate limiting (10 requests/minute)  
- Global rate limiting (300 requests/minute)

### Attack Protection
- SQL injection blocking
- XSS attempt blocking
- Command injection blocking
- File inclusion blocking
- Suspicious file extension blocking

### Bot Management
- Malicious bot traffic challenges
- Search engine bot allowlisting
- Tor network user challenges

### Geographic Controls
- High-risk country challenges (CN, RU, KP, IR)

### Administrative Protection
- Admin path blocking (/admin, /wp-admin, etc.)
- API endpoint enhanced protection

## 📊 Current Status

**Without WAF**: The site still has Cloudflare's base security:
- DDoS protection
- Basic bot filtering
- SSL/TLS encryption
- CDN protection

**With WAF**: Enhanced security with custom rules for:
- Application-specific attack vectors
- Granular rate limiting
- Advanced bot detection
- Geographic filtering

## 🎯 Next Steps

1. **Immediate**: Follow the Quick Fix instructions above
2. **Optional**: Review and customize WAF rules in `cloudflare/waf-rules.json`
3. **Monitoring**: Set up Cloudflare security event alerts

The application is **fully functional and secure** without WAF, but these enhanced rules provide additional protection against sophisticated attacks.