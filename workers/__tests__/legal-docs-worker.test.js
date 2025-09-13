/**
 * Unit tests for Legal Documents Worker
 * Tests CORS enforcement, rate limiting, and API endpoints
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import worker from '../legal-docs-worker.js'

describe('Legal Documents Worker', () => {
  let env
  let ctx
  
  beforeEach(() => {
    // Mock environment
    env = {
      CORS_ORIGIN: 'http://localhost:3000',
      ENVIRONMENT: 'development',
      GITHUB_OWNER: 'test-owner',
      GITHUB_TOKEN: 'test-token',
      RATE_LIMIT_KV: {
        get: vi.fn(),
        put: vi.fn()
      }
    }
    
    // Mock context
    ctx = {
      waitUntil: vi.fn()
    }
    
    // Reset all mocks
    vi.clearAllMocks()
  })
  
  describe('CORS Enforcement', () => {
    it('should reject requests without origin header', async () => {
      const request = new Request('https://worker.example.com/legal/check', {
        method: 'GET'
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Invalid Origin')
    })
    
    it('should reject requests from unauthorized origins', async () => {
      const request = new Request('https://worker.example.com/legal/check', {
        method: 'GET',
        headers: {
          'Origin': 'https://evil.com'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(403)
    })
    
    it('should allow requests from authorized origin', async () => {
      const request = new Request('https://worker.example.com/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    })
    
    it('should handle CORS preflight requests', async () => {
      const request = new Request('https://worker.example.com/legal/check', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    })
  })
  
  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      env.RATE_LIMIT_KV.get.mockResolvedValue(null)
      
      const request = new Request('https://worker.example.com/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
          'CF-Connecting-IP': '192.168.1.1'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(200)
      expect(env.RATE_LIMIT_KV.put).toHaveBeenCalledWith(
        'rate_limit:192.168.1.1',
        expect.any(String),
        expect.objectContaining({ expirationTtl: 60 })
      )
    })
    
    it('should reject requests exceeding rate limit', async () => {
      env.RATE_LIMIT_KV.get.mockResolvedValue({
        count: 10,
        timestamp: Date.now() - 30000 // 30 seconds ago
      })
      
      const request = new Request('https://worker.example.com/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
          'CF-Connecting-IP': '192.168.1.1'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Rate limit exceeded')
    })
    
    it('should reset rate limit after window expires', async () => {
      env.RATE_LIMIT_KV.get.mockResolvedValue({
        count: 10,
        timestamp: Date.now() - 70000 // 70 seconds ago (past window)
      })
      
      const request = new Request('https://worker.example.com/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
          'CF-Connecting-IP': '192.168.1.1'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(200)
      expect(env.RATE_LIMIT_KV.put).toHaveBeenCalledWith(
        'rate_limit:192.168.1.1',
        expect.stringContaining('"count":1'),
        expect.any(Object)
      )
    })
  })
  
  describe('Endpoints', () => {
    beforeEach(() => {
      // Allow all requests through rate limiting
      env.RATE_LIMIT_KV.get.mockResolvedValue(null)
    })
    
    it('should handle /health endpoint', async () => {
      const request = new Request('https://worker.example.com/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe('healthy')
    })
    
    it('should return 404 for unknown endpoints', async () => {
      const request = new Request('https://worker.example.com/unknown', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(404)
    })
    
    it('should handle /legal/documents with missing type parameter', async () => {
      const request = new Request('https://worker.example.com/legal/documents', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid document type')
    })
    
    it('should handle /legal/documents with invalid type parameter', async () => {
      const request = new Request('https://worker.example.com/legal/documents?type=invalid', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid document type')
    })
  })
  
  describe('Security Headers', () => {
    it('should include security headers in successful responses', async () => {
      const request = new Request('https://worker.example.com/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'none'")
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
    })
    
    it('should include security headers in error responses', async () => {
      const request = new Request('https://worker.example.com/unknown', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })
  })
  
  describe('Error Handling', () => {
    it('should handle internal errors gracefully', async () => {
      // Force an error by setting wrong origin when CORS_ORIGIN is set
      env.CORS_ORIGIN = 'https://different-origin.com'
      
      const request = new Request('https://worker.example.com/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      // Should return 403 for forbidden origin
      expect(response).toBeDefined()
      expect(response.status).toBe(403)
    })
    
    it('should continue without rate limiting if KV fails', async () => {
      env.RATE_LIMIT_KV.get.mockRejectedValue(new Error('KV Error'))
      
      const request = new Request('https://worker.example.com/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
          'CF-Connecting-IP': '192.168.1.1'
        }
      })
      
      const response = await worker.fetch(request, env, ctx)
      
      // Should continue and serve the request
      expect(response.status).toBe(200)
    })
  })
})