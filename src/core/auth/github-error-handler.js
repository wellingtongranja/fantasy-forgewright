/**
 * GitHubErrorHandler - Comprehensive error handling for GitHub integration
 * Handles authentication, API rate limits, network errors, and user-friendly messaging
 */
export class GitHubErrorHandler {
  constructor() {
    this.rateLimitInfo = {
      remaining: null,
      resetTime: null,
      limit: null
    }
  }

  /**
   * Handle GitHub API errors with user-friendly messaging
   * @param {Error|Response} error - Error object or Response
   * @param {string} context - Context where error occurred
   * @returns {Object} Formatted error response
   */
  async handleError(error, context = 'GitHub operation') {
    // Handle Response objects
    if (error instanceof Response) {
      return await this.handleResponseError(error, context)
    }

    // Handle Error objects
    if (error instanceof Error) {
      return this.handleGenericError(error, context)
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        success: false,
        message: `${context} failed: ${error}`,
        type: 'unknown',
        userMessage: error,
        canRetry: true
      }
    }

    // Unknown error type
    return {
      success: false,
      message: `${context} failed: Unknown error`,
      type: 'unknown',
      userMessage: 'An unexpected error occurred. Please try again.',
      canRetry: true
    }
  }

  /**
   * Handle HTTP Response errors
   * @param {Response} response - HTTP Response object
   * @param {string} context - Context where error occurred
   * @returns {Promise<Object>} Formatted error response
   */
  async handleResponseError(response, context) {
    const status = response.status
    const statusText = response.statusText

    // Update rate limit info from headers
    this.updateRateLimitInfo(response)

    // Try to get detailed error from response body
    let errorDetails = null
    try {
      const text = await response.text()
      errorDetails = JSON.parse(text)
    } catch {
      // Response body is not JSON or can't be read
    }

    const baseError = {
      success: false,
      status,
      statusText,
      context,
      details: errorDetails
    }

    switch (status) {
      case 400:
        return {
          ...baseError,
          type: 'bad_request',
          message: `Invalid request: ${errorDetails?.message || statusText}`,
          userMessage: 'The request was invalid. Please check your input and try again.',
          canRetry: false
        }

      case 401:
        return {
          ...baseError,
          type: 'unauthorized',
          message: 'Authentication failed or expired',
          userMessage: 'Your GitHub authentication has expired. Please log in again.',
          canRetry: true,
          requiresAuth: true
        }

      case 403:
        if (this.isRateLimited(response)) {
          return this.handleRateLimit(response, context)
        }
        return {
          ...baseError,
          type: 'forbidden',
          message: `Access denied: ${errorDetails?.message || 'Insufficient permissions'}`,
          userMessage: 'Access denied. Please check your repository permissions.',
          canRetry: false
        }

      case 404:
        return {
          ...baseError,
          type: 'not_found',
          message: `Resource not found: ${errorDetails?.message || 'The requested resource does not exist'}`,
          userMessage: 'The requested file or repository was not found.',
          canRetry: false
        }

      case 409:
        return {
          ...baseError,
          type: 'conflict',
          message: `Conflict: ${errorDetails?.message || 'Resource conflict'}`,
          userMessage: 'There was a conflict. The file may have been modified by someone else.',
          canRetry: true,
          isConflict: true
        }

      case 422:
        return {
          ...baseError,
          type: 'validation_error',
          message: `Validation failed: ${errorDetails?.message || 'Invalid data'}`,
          userMessage: 'The data provided was invalid. Please check and try again.',
          canRetry: false,
          validationErrors: errorDetails?.errors || []
        }

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          ...baseError,
          type: 'server_error',
          message: `GitHub server error: ${status} ${statusText}`,
          userMessage: 'GitHub is experiencing issues. Please try again later.',
          canRetry: true,
          retryAfter: this.getRetryAfter(response)
        }

      default:
        return {
          ...baseError,
          type: 'http_error',
          message: `HTTP ${status}: ${errorDetails?.message || statusText}`,
          userMessage: `GitHub returned an error (${status}). Please try again.`,
          canRetry: status >= 500
        }
    }
  }

  /**
   * Handle generic Error objects
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Formatted error response
   */
  handleGenericError(error, context) {
    const message = error.message || 'Unknown error'

    // Network errors
    if (error.name === 'TypeError' && message.includes('fetch')) {
      return {
        success: false,
        type: 'network_error',
        message: `Network error: ${message}`,
        userMessage: 'Network error. Please check your internet connection and try again.',
        canRetry: true,
        isNetworkError: true
      }
    }

    // OAuth-specific errors
    if (message.includes('OAuth') || message.includes('authentication')) {
      return {
        success: false,
        type: 'auth_error',
        message: `Authentication error: ${message}`,
        userMessage: 'Authentication failed. Please try logging in again.',
        canRetry: true,
        requiresAuth: true
      }
    }

    // CORS errors
    if (message.includes('CORS') || message.includes('cross-origin')) {
      return {
        success: false,
        type: 'cors_error',
        message: `CORS error: ${message}`,
        userMessage: 'Unable to connect to GitHub. This may be a browser security issue.',
        canRetry: false
      }
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        success: false,
        type: 'timeout_error',
        message: `Request timeout: ${message}`,
        userMessage: 'The request timed out. Please try again.',
        canRetry: true
      }
    }

    // Generic error
    return {
      success: false,
      type: 'generic_error',
      message: `${context} failed: ${message}`,
      userMessage: 'An error occurred. Please try again.',
      canRetry: true,
      originalError: error
    }
  }

  /**
   * Handle rate limit errors
   * @param {Response} response - HTTP Response object
   * @param {string} context - Context where error occurred
   * @returns {Object} Formatted rate limit error
   */
  handleRateLimit(response, context) {
    const resetTime = this.rateLimitInfo.resetTime
    const timeUntilReset = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000 / 60) : 'unknown'

    return {
      success: false,
      type: 'rate_limit',
      message: `Rate limit exceeded. Resets in ${timeUntilReset} minutes.`,
      userMessage: `You've made too many requests to GitHub. Please wait ${timeUntilReset} minutes before trying again.`,
      canRetry: true,
      retryAfter: resetTime,
      rateLimitInfo: { ...this.rateLimitInfo }
    }
  }

  /**
   * Update rate limit information from response headers
   * @param {Response} response - HTTP Response object
   */
  updateRateLimitInfo(response) {
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')
    const limit = response.headers.get('X-RateLimit-Limit')

    if (remaining !== null) {
      this.rateLimitInfo.remaining = parseInt(remaining)
    }
    if (reset !== null) {
      this.rateLimitInfo.resetTime = new Date(parseInt(reset) * 1000)
    }
    if (limit !== null) {
      this.rateLimitInfo.limit = parseInt(limit)
    }
  }

  /**
   * Check if response indicates rate limiting
   * @param {Response} response - HTTP Response object
   * @returns {boolean} Whether response indicates rate limiting
   */
  isRateLimited(response) {
    return response.status === 403 && 
           response.headers.get('X-RateLimit-Remaining') === '0'
  }

  /**
   * Get retry-after delay from response
   * @param {Response} response - HTTP Response object
   * @returns {number|null} Retry delay in seconds
   */
  getRetryAfter(response) {
    const retryAfter = response.headers.get('Retry-After')
    return retryAfter ? parseInt(retryAfter) : null
  }

  /**
   * Get current rate limit status
   * @returns {Object} Rate limit information
   */
  getRateLimitStatus() {
    return {
      ...this.rateLimitInfo,
      isLimited: this.rateLimitInfo.remaining === 0,
      timeUntilReset: this.rateLimitInfo.resetTime 
        ? Math.max(0, this.rateLimitInfo.resetTime.getTime() - Date.now())
        : null
    }
  }

  /**
   * Format error for user display
   * @param {Object} errorResponse - Error response from handleError
   * @returns {string} User-friendly error message
   */
  formatUserMessage(errorResponse) {
    let message = errorResponse.userMessage || errorResponse.message

    // Add retry information if applicable
    if (errorResponse.canRetry) {
      if (errorResponse.retryAfter) {
        const retryTime = new Date(errorResponse.retryAfter)
        message += ` You can try again after ${retryTime.toLocaleTimeString()}.`
      } else {
        message += ' You can try again.'
      }
    }

    // Add authentication reminder if needed
    if (errorResponse.requiresAuth) {
      message += ' Please check your GitHub authentication.'
    }

    return message
  }

  /**
   * Check if error is retryable
   * @param {Object} errorResponse - Error response from handleError
   * @returns {boolean} Whether error is retryable
   */
  isRetryable(errorResponse) {
    return errorResponse.canRetry === true
  }

  /**
   * Get suggested retry delay in milliseconds
   * @param {Object} errorResponse - Error response from handleError
   * @returns {number} Suggested retry delay
   */
  getRetryDelay(errorResponse) {
    // Rate limit errors - wait until reset
    if (errorResponse.type === 'rate_limit' && errorResponse.retryAfter) {
      return Math.max(0, errorResponse.retryAfter.getTime() - Date.now())
    }

    // Server errors - exponential backoff
    if (errorResponse.type === 'server_error') {
      return errorResponse.retryAfter ? errorResponse.retryAfter * 1000 : 30000 // 30 seconds default
    }

    // Network errors - short delay
    if (errorResponse.type === 'network_error') {
      return 5000 // 5 seconds
    }

    // Default retry delay
    return 10000 // 10 seconds
  }

  /**
   * Create error handler middleware for fetch requests
   * @returns {Function} Middleware function
   */
  createFetchMiddleware() {
    return async (url, options = {}) => {
      try {
        const response = await fetch(url, options)
        
        // Update rate limit info for all responses
        this.updateRateLimitInfo(response)
        
        if (!response.ok) {
          throw response
        }
        
        return response
      } catch (error) {
        const errorResponse = await this.handleError(error, `Request to ${url}`)
        throw new Error(JSON.stringify(errorResponse))
      }
    }
  }

  /**
   * Log error for debugging
   * @param {Object} errorResponse - Error response from handleError
   * @param {Object} context - Additional context
   */
  logError(errorResponse, context = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      type: errorResponse.type,
      message: errorResponse.message,
      context: errorResponse.context,
      status: errorResponse.status,
      canRetry: errorResponse.canRetry,
      ...context
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('GitHub Error:', logData)
    }

    // In production, you might want to send to error tracking service
    // this.sendToErrorTracking(logData)
  }
}