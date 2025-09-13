# Manual Regression Testing Guide - Phase 2 Legal Documents Worker

## 🚀 Development Servers Running

### Legal Worker (Local Development)
- **URL**: `http://localhost:8788`
- **CORS Origin**: `http://localhost:3000`
- **Status**: ✅ Running with local KV simulation

### Fantasy Editor (Main Application)
- **URL**: `http://localhost:3000`
- **Status**: ✅ Running with Vite dev server

### Remote Environments
- **Staging**: `https://fantasy-legal-docs-staging.wellington-granja.workers.dev`
- **Production**: `https://fantasy-legal-docs.wellington-granja.workers.dev`

## 📋 Manual Testing Checklist

### 1. Local Development Server Tests

#### Basic Health Check
```bash
# Should return: {"status":"healthy"}
curl -H "Origin: http://localhost:3000" http://localhost:8788/health
```

#### Document Metadata
```bash
# Should return metadata for all 5 documents
curl -H "Origin: http://localhost:3000" http://localhost:8788/legal/check | jq
```

#### Document Retrieval (Test Each Type)
```bash
# Privacy Policy
curl -H "Origin: http://localhost:3000" "http://localhost:8788/legal/documents?type=privacy-policy" | jq .type

# Terms of Service
curl -H "Origin: http://localhost:3000" "http://localhost:8788/legal/documents?type=terms-of-service" | jq .type

# EULA
curl -H "Origin: http://localhost:3000" "http://localhost:8788/legal/documents?type=eula" | jq .type

# License (AGPL-3.0)
curl -H "Origin: http://localhost:3000" "http://localhost:8788/legal/documents?type=license" | jq .type

# Release Notes
curl -H "Origin: http://localhost:3000" "http://localhost:8788/legal/documents?type=release-notes" | jq .type
```

#### CORS Security Tests
```bash
# Should return 403 - No origin header
curl http://localhost:8788/health

# Should return 403 - Wrong origin
curl -H "Origin: https://evil.com" http://localhost:8788/health

# Should work - Correct origin
curl -H "Origin: http://localhost:3000" http://localhost:8788/health
```

#### CORS Preflight Test
```bash
# Should return 200 with proper CORS headers
curl -X OPTIONS -H "Origin: http://localhost:3000" http://localhost:8788/legal/check -v
```

#### Error Handling Tests
```bash
# Invalid document type - Should return 400
curl -H "Origin: http://localhost:3000" "http://localhost:8788/legal/documents?type=invalid"

# Missing document type - Should return 400
curl -H "Origin: http://localhost:3000" "http://localhost:8788/legal/documents"

# Unknown endpoint - Should return 404
curl -H "Origin: http://localhost:3000" http://localhost:8788/unknown
```

### 2. Document Integrity Verification

#### Hash Verification
```bash
# Get document with hash
RESPONSE=$(curl -s -H "Origin: http://localhost:3000" "http://localhost:8788/legal/documents?type=privacy-policy")

# Extract content and hash
CONTENT=$(echo "$RESPONSE" | jq -r .content)
WORKER_HASH=$(echo "$RESPONSE" | jq -r .hash)

# Generate hash locally and compare
LOCAL_HASH=$(echo -n "$CONTENT" | shasum -a 256 | cut -d' ' -f1)
echo "Worker Hash:  $WORKER_HASH"
echo "Local Hash:   $LOCAL_HASH"
echo "Match: $([ "$WORKER_HASH" = "$LOCAL_HASH" ] && echo "✅ YES" || echo "❌ NO")"
```

### 3. Rate Limiting Tests

#### Rapid Requests Test
```bash
# Make 15 rapid requests (should hit rate limit after 10)
for i in {1..15}; do
  echo -n "Request $i: "
  curl -s -H "Origin: http://localhost:3000" http://localhost:8788/health | grep -o '"status":"healthy"\|"error":"Rate limit exceeded"'
  sleep 0.1
done
```

### 4. Remote Environment Tests

#### Staging Environment
```bash
# Health check
curl -H "Origin: https://fantasy-editor.pages.dev" https://fantasy-legal-docs-staging.wellington-granja.workers.dev/health

# Document retrieval
curl -H "Origin: https://fantasy-editor.pages.dev" "https://fantasy-legal-docs-staging.wellington-granja.workers.dev/legal/documents?type=license"

# CORS blocking (should fail)
curl -H "Origin: http://localhost:3000" https://fantasy-legal-docs-staging.wellington-granja.workers.dev/health
```

#### Production Environment
```bash
# Health check
curl -H "Origin: https://fantasy.forgewright.io" https://fantasy-legal-docs.wellington-granja.workers.dev/health

# Document retrieval
curl -H "Origin: https://fantasy.forgewright.io" "https://fantasy-legal-docs.wellington-granja.workers.dev/legal/documents?type=terms-of-service"

# CORS blocking (should fail)
curl -H "Origin: https://evil.com" https://fantasy-legal-docs.wellington-granja.workers.dev/health
```

### 5. Browser Testing

#### Open Fantasy Editor
1. Navigate to `http://localhost:3000`
2. Verify Fantasy Editor loads correctly
3. Check browser console for any errors
4. Test basic functionality (create document, save, etc.)

#### Developer Console Tests
```javascript
// Open browser console at http://localhost:3000 and test:

// Test 1: CORS-compliant request (should work)
fetch('http://localhost:8788/health')
  .then(r => r.json())
  .then(d => console.log('Health:', d));

// Test 2: Get legal document metadata
fetch('http://localhost:8788/legal/check')
  .then(r => r.json())
  .then(d => console.log('Metadata:', d));

// Test 3: Get privacy policy
fetch('http://localhost:8788/legal/documents?type=privacy-policy')
  .then(r => r.json())
  .then(d => console.log('Privacy Policy Length:', d.content.length));
```

### 6. Performance Testing

#### Response Time Check
```bash
echo "Testing response times:"
for endpoint in "/health" "/legal/check" "/legal/documents?type=privacy-policy"; do
  echo -n "Testing $endpoint: "
  time_ms=$(curl -w "%{time_total}" -s -o /dev/null -H "Origin: http://localhost:3000" "http://localhost:8788$endpoint")
  echo "${time_ms}s"
done
```

#### Concurrent Requests Test
```bash
# Test 10 concurrent requests
for i in {1..10}; do
  curl -s -H "Origin: http://localhost:3000" http://localhost:8788/health &
done
wait
echo "All concurrent requests completed"
```

## 🔍 What to Look For

### ✅ Expected Results
- Health endpoint returns `{"status":"healthy"}`
- All 5 document types retrievable with proper content
- SHA-256 hashes match document content
- CORS properly blocks unauthorized origins
- Error messages are informative and proper status codes
- Response times reasonable for development environment
- No console errors in browser
- Fantasy Editor loads and functions normally

### ❌ Red Flags
- 403 errors when using correct origins
- 500 internal server errors
- Missing or incorrect document content  
- Hash mismatches between worker and content
- CORS allowing unauthorized origins
- Extremely slow response times (>5 seconds)
- Console errors related to CORS or network requests
- Fantasy Editor failing to load

## 🛠️ Troubleshooting

### Local Worker Not Responding
```bash
# Check if worker is running
lsof -i :8788

# Restart if needed
pkill -f "wrangler dev"
cd workers && npx wrangler dev --config wrangler.legal.toml --env dev --port 8788
```

### CORS Issues
- Verify origin header matches exactly: `http://localhost:3000` (no trailing slash)
- Check browser network tab for preflight OPTIONS requests
- Ensure no browser extensions are modifying requests

### GitHub API Issues
- Verify GitHub token has `repo` scope
- Check if private repository is accessible
- Test GitHub API directly: `curl -H "Authorization: Bearer TOKEN" https://api.github.com/repos/wellingtongranja/fantasy-editor-legal`

## 📊 Test Results Template

```
MANUAL REGRESSION TEST RESULTS - Phase 2
Date: _______
Tester: _______

[ ] Local health endpoint working
[ ] Local document metadata working  
[ ] All 5 document types retrievable
[ ] CORS blocking unauthorized origins
[ ] CORS allowing authorized origins
[ ] Error handling working properly
[ ] Hash integrity verification passing
[ ] Rate limiting functional
[ ] Staging environment working
[ ] Production environment working
[ ] Fantasy Editor loading properly
[ ] Browser console tests passing
[ ] Performance acceptable (<2s response times)
[ ] No unexpected errors or failures

Overall Status: [ ] PASS [ ] FAIL [ ] NEEDS INVESTIGATION

Notes:
_________________________________
```

---

**Ready for Phase 3**: Once all tests pass, Phase 2 is confirmed stable and Phase 3 (Client Integration) can proceed.

**Test Duration**: ~20-30 minutes for comprehensive manual testing