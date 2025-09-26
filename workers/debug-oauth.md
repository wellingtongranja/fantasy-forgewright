# OAuth Debugging Guide

## Current Issues Fixed

### 1. Enhanced Debugging in GitHub Provider
- Added comprehensive credential validation
- Detailed token exchange parameter logging
- Proper error tracing with censored sensitive data

### 2. Origin Validation Fixed for Localhost
- Added localhost support in development mode
- Proper CORS origin handling for development

### 3. Token Exchange Debugging Enhanced
- Comprehensive request/response logging in BaseProvider
- Error details with status codes and response bodies
- Stack trace logging for exceptions

## Testing the Fixes

### Prerequisites
1. **GitHub OAuth App Configuration**:
   - Application name: `Fantasy Editor Development`
   - Authorization callback URL: `http://localhost:3000/auth/callback`
   - Client ID: `Ov23li5IGc4FBYktya45` (from .dev.vars)
   - Client Secret: `5b8a3bd1a89aa20b5d76cfc8c3f980744a550fa4` (from .dev.vars)

### Testing Steps

1. **Start Worker in Development Mode**:
   ```bash
   cd /Users/wellingtongranja/Projects/Personal/fantasy-forgewright/workers
   npx wrangler dev --env dev
   ```

2. **Start Frontend Application**:
   ```bash
   cd /Users/wellingtongranja/Projects/Personal/fantasy-forgewright
   npm run dev
   ```

3. **Trigger OAuth Flow**:
   - Navigate to http://localhost:3000
   - Click "Sign in with GitHub" button
   - Complete GitHub authorization
   - Check both browser console and worker logs

### Expected Debug Output

#### Worker Console:
```
DEBUG: Origin Validation: {
  request_origin: 'http://localhost:3000',
  allowed_origins: ['http://localhost:3000', ...],
  cors_origin_env: 'http://localhost:3000'
}

DEBUG: Token Exchange Request: {
  provider: 'github',
  code_present: true,
  code_length: 20,
  codeVerifier_present: true
}

DEBUG: Final Provider Configuration: {
  provider: 'github',
  clientId: 'Ov23li5I***',
  clientSecret_present: true,
  redirectUri: 'http://localhost:3000/auth/callback'
}

DEBUG: GitHub OAuth Token Exchange Parameters: {
  client_id: 'Ov23li5I***ya45',
  client_secret_present: true,
  redirect_uri: 'http://localhost:3000/auth/callback',
  code_present: true
}

DEBUG: Token Exchange Request Details: {
  url: 'https://github.com/login/oauth/access_token',
  method: 'POST',
  headers: { ... },
  body_length: 150
}

DEBUG: Token Exchange Response: {
  status: 200,
  statusText: 'OK',
  headers: { ... }
}

DEBUG: Token Exchange Success Response: {
  has_access_token: true,
  token_type: 'Bearer',
  scope: 'repo user'
}
```

#### Browser Console:
```
🔍 OAuth Debug: Starting completeOAuthFlow
🔍 OAuth Debug: Code: gho_abc123...
🔍 AuthManager Debug: handleCallback called with URL: http://localhost:3000/auth/callback?code=...
```

## Common Issues and Solutions

### Issue: "client_id and/or client_secret passed are incorrect"

**Possible Causes**:
1. **GitHub OAuth App Configuration Mismatch**
   - Check that redirect URI in GitHub matches exactly: `http://localhost:3000/auth/callback`
   - Verify client ID and secret match what's in .dev.vars

2. **Environment Variable Issues**
   - Ensure .dev.vars is properly loaded by wrangler
   - Check that GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set

3. **Request Format Issues**
   - Verify redirect_uri parameter exactly matches what was used in authorization

### Issue: "Forbidden - Invalid Origin"

**Solution**:
- Check that CORS_ORIGIN in .dev.vars matches the origin in the request
- Ensure localhost origins are being added to allowedOrigins

### Issue: Code exchange fails silently

**Solution**:
- Check worker logs for detailed error messages
- Verify GitHub OAuth app is active and not suspended
- Ensure authorization code hasn't expired (10 minutes max)

## Verification Checklist

- [ ] Worker starts without errors
- [ ] Frontend can reach worker at http://localhost:8787/oauth/token
- [ ] Origin validation passes for localhost requests
- [ ] GitHub OAuth app redirect URI matches frontend expectation
- [ ] Token exchange request includes all required parameters
- [ ] GitHub returns successful token response
- [ ] User info fetch succeeds after token exchange

## Next Steps if Issues Persist

1. Verify GitHub OAuth App settings match exactly
2. Create new OAuth App if current one has issues
3. Test with production OAuth app temporarily
4. Check GitHub API status and rate limits
5. Test with minimal token exchange request outside the worker