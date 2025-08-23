/**
 * Tests for GitHubErrorHandler class
 */
import { GitHubErrorHandler } from '../github-error-handler.js'

describe('GitHubErrorHandler', () => {
  let errorHandler

  beforeEach(() => {
    errorHandler = new GitHubErrorHandler()
  })

  describe('Response Error Handling', () => {
    const createMockResponse = (status, headers = {}, body = null) => ({
      status,
      statusText: `Status ${status}`,
      headers: {
        get: (name) => headers[name] || null
      },
      text: () => Promise.resolve(body ? JSON.stringify(body) : '')
    })

    test('should handle 400 Bad Request', async () => {
      const response = createMockResponse(400, {}, { message: 'Invalid request' })
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.success).toBe(false)
      expect(error.type).toBe('bad_request')
      expect(error.status).toBe(400)
      expect(error.canRetry).toBe(false)
      expect(error.userMessage).toContain('invalid')
    })

    test('should handle 401 Unauthorized', async () => {
      const response = createMockResponse(401)
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.type).toBe('unauthorized')
      expect(error.canRetry).toBe(true)
      expect(error.requiresAuth).toBe(true)
      expect(error.userMessage).toContain('authentication')
    })

    test('should handle 403 Rate Limit', async () => {
      const response = createMockResponse(403, {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': '1640995200',
        'X-RateLimit-Limit': '5000'
      })
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.type).toBe('rate_limit')
      expect(error.canRetry).toBe(true)
      expect(error.rateLimitInfo).toBeDefined()
      expect(error.userMessage).toContain('too many requests')
    })

    test('should handle 403 Forbidden (not rate limit)', async () => {
      const response = createMockResponse(403, {}, { message: 'Access denied' })
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.type).toBe('forbidden')
      expect(error.canRetry).toBe(false)
      expect(error.userMessage).toContain('Access denied')
    })

    test('should handle 404 Not Found', async () => {
      const response = createMockResponse(404)
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.type).toBe('not_found')
      expect(error.canRetry).toBe(false)
      expect(error.userMessage).toContain('not found')
    })

    test('should handle 409 Conflict', async () => {
      const response = createMockResponse(409)
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.type).toBe('conflict')
      expect(error.canRetry).toBe(true)
      expect(error.isConflict).toBe(true)
      expect(error.userMessage).toContain('conflict')
    })

    test('should handle 422 Validation Error', async () => {
      const response = createMockResponse(
        422,
        {},
        {
          message: 'Validation failed',
          errors: [{ field: 'name', code: 'required' }]
        }
      )
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.type).toBe('validation_error')
      expect(error.canRetry).toBe(false)
      expect(error.validationErrors).toHaveLength(1)
      expect(error.userMessage).toContain('invalid')
    })

    test('should handle 500 Server Error', async () => {
      const response = createMockResponse(500)
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.type).toBe('server_error')
      expect(error.canRetry).toBe(true)
      expect(error.userMessage).toContain('GitHub is experiencing issues')
    })

    test('should handle unknown HTTP status', async () => {
      const response = createMockResponse(418) // I'm a teapot
      const error = await errorHandler.handleError(response, 'Test operation')

      expect(error.type).toBe('http_error')
      expect(error.status).toBe(418)
      expect(error.canRetry).toBe(false)
    })
  })

  describe('Generic Error Handling', () => {
    test('should handle network errors', async () => {
      const networkError = new TypeError('Failed to fetch')
      const error = await errorHandler.handleError(networkError, 'Test operation')

      expect(error.type).toBe('network_error')
      expect(error.canRetry).toBe(true)
      expect(error.isNetworkError).toBe(true)
      expect(error.userMessage).toContain('Network error')
    })

    test('should handle OAuth errors', async () => {
      const oauthError = new Error('OAuth authentication failed')
      const error = await errorHandler.handleError(oauthError, 'Test operation')

      expect(error.type).toBe('auth_error')
      expect(error.canRetry).toBe(true)
      expect(error.requiresAuth).toBe(true)
      expect(error.userMessage).toContain('Authentication failed')
    })

    test('should handle CORS errors', async () => {
      const corsError = new Error('CORS policy blocked request')
      const error = await errorHandler.handleError(corsError, 'Test operation')

      expect(error.type).toBe('cors_error')
      expect(error.canRetry).toBe(false)
      expect(error.userMessage).toContain('browser security issue')
    })

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout exceeded')
      const error = await errorHandler.handleError(timeoutError, 'Test operation')

      expect(error.type).toBe('timeout_error')
      expect(error.canRetry).toBe(true)
      expect(error.userMessage).toContain('timed out')
    })

    test('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong')
      const error = await errorHandler.handleError(genericError, 'Test operation')

      expect(error.type).toBe('generic_error')
      expect(error.canRetry).toBe(true)
      expect(error.originalError).toBe(genericError)
    })

    test('should handle string errors', async () => {
      const error = await errorHandler.handleError('String error message', 'Test operation')

      expect(error.type).toBe('unknown')
      expect(error.canRetry).toBe(true)
      expect(error.userMessage).toBe('String error message')
    })
  })

  describe('Rate Limit Management', () => {
    test('should update rate limit info from headers', () => {
      const response = {
        headers: {
          get: (name) =>
            ({
              'X-RateLimit-Remaining': '4500',
              'X-RateLimit-Reset': '1640995200',
              'X-RateLimit-Limit': '5000'
            })[name] || null
        }
      }

      errorHandler.updateRateLimitInfo(response)

      expect(errorHandler.rateLimitInfo.remaining).toBe(4500)
      expect(errorHandler.rateLimitInfo.limit).toBe(5000)
      expect(errorHandler.rateLimitInfo.resetTime).toBeInstanceOf(Date)
    })

    test('should detect rate limiting', () => {
      const rateLimitedResponse = {
        status: 403,
        headers: {
          get: (name) => (name === 'X-RateLimit-Remaining' ? '0' : null)
        }
      }

      expect(errorHandler.isRateLimited(rateLimitedResponse)).toBe(true)

      const normalResponse = {
        status: 403,
        headers: {
          get: (name) => (name === 'X-RateLimit-Remaining' ? '100' : null)
        }
      }

      expect(errorHandler.isRateLimited(normalResponse)).toBe(false)
    })

    test('should get rate limit status', () => {
      errorHandler.rateLimitInfo = {
        remaining: 0,
        resetTime: new Date(Date.now() + 60000), // 1 minute from now
        limit: 5000
      }

      const status = errorHandler.getRateLimitStatus()

      expect(status.isLimited).toBe(true)
      expect(status.timeUntilReset).toBeGreaterThan(0)
    })
  })

  describe('Retry Logic', () => {
    test('should identify retryable errors', async () => {
      const retryableError = await errorHandler.handleError(
        new TypeError('Failed to fetch'),
        'Test operation'
      )
      expect(errorHandler.isRetryable(retryableError)).toBe(true)

      const nonRetryableError = await errorHandler.handleError(
        {
          status: 400,
          statusText: 'Bad Request',
          headers: { get: () => null },
          text: () => Promise.resolve('')
        },
        'Test operation'
      )
      expect(errorHandler.isRetryable(nonRetryableError)).toBe(false)
    })

    test('should calculate retry delays', async () => {
      // Rate limit error
      const rateLimitError = {
        type: 'rate_limit',
        retryAfter: new Date(Date.now() + 60000)
      }
      expect(errorHandler.getRetryDelay(rateLimitError)).toBeGreaterThan(0)

      // Server error
      const serverError = { type: 'server_error', retryAfter: 30 }
      expect(errorHandler.getRetryDelay(serverError)).toBe(30000)

      // Network error
      const networkError = { type: 'network_error' }
      expect(errorHandler.getRetryDelay(networkError)).toBe(5000)

      // Default
      const genericError = { type: 'generic_error' }
      expect(errorHandler.getRetryDelay(genericError)).toBe(10000)
    })
  })

  describe('Message Formatting', () => {
    test('should format user messages with retry info', () => {
      const retryableError = {
        userMessage: 'Something went wrong',
        canRetry: true
      }
      const message = errorHandler.formatUserMessage(retryableError)
      expect(message).toContain('You can try again')

      const retryAfterError = {
        userMessage: 'Rate limited',
        canRetry: true,
        retryAfter: new Date(Date.now() + 60000)
      }
      const messageWithTime = errorHandler.formatUserMessage(retryAfterError)
      expect(messageWithTime).toContain('You can try again after')

      const authError = {
        userMessage: 'Auth failed',
        canRetry: true,
        requiresAuth: true
      }
      const authMessage = errorHandler.formatUserMessage(authError)
      expect(authMessage).toContain('check your GitHub authentication')
    })
  })

  describe('Fetch Middleware', () => {
    test('should create fetch middleware', () => {
      const middleware = errorHandler.createFetchMiddleware()
      expect(typeof middleware).toBe('function')
    })
  })

  describe('Error Logging', () => {
    test('should log errors with context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const errorResponse = {
        type: 'network_error',
        message: 'Network failed',
        context: 'Test operation',
        canRetry: true
      }

      errorHandler.logError(errorResponse, { endpoint: '/test' })

      expect(consoleSpy).toHaveBeenCalledWith(
        'GitHub Error:',
        expect.objectContaining({
          type: 'network_error',
          message: 'Network failed',
          endpoint: '/test'
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Retry After Header', () => {
    test('should parse retry-after header', () => {
      const response = {
        headers: {
          get: (name) => (name === 'Retry-After' ? '120' : null)
        }
      }

      expect(errorHandler.getRetryAfter(response)).toBe(120)

      const responseWithoutHeader = {
        headers: {
          get: () => null
        }
      }

      expect(errorHandler.getRetryAfter(responseWithoutHeader)).toBeNull()
    })
  })
})
