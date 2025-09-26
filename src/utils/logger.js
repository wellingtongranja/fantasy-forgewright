/**
 * Production-safe logging utility for Fantasy Editor
 * Provides environment-based logging with security-focused filtering
 */

/**
 * Get current environment
 * @returns {string} Environment name (development, production, test)
 */
function getEnvironment() {
  try {
    // Try to access Vite environment variables
    if (import.meta?.env?.MODE) {
      return import.meta.env.MODE
    }

    // Fallback for non-Vite environments
    if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
      return process.env.NODE_ENV
    }

    // Default to production for safety
    return 'production'
  } catch (error) {
    // If any error occurs, default to production mode
    return 'production'
  }
}

/**
 * Check if we're in development mode
 * @returns {boolean} True if in development
 */
function isDevelopment() {
  const env = getEnvironment()
  return env === 'development' || env === 'dev'
}

/**
 * Sanitize data to remove sensitive information before logging
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data safe for logging
 */
function sanitizeForLogging(data) {
  if (typeof data === 'string') {
    // Remove potential tokens, keys, and sensitive patterns
    return data
      .replace(
        /(?:token|key|password|secret|auth)[=:]\s*["']?[a-zA-Z0-9+/=._-]{10,}["']?/gi,
        '[REDACTED]'
      )
      .replace(/(?:gho_|ghp_|github_pat_)[a-zA-Z0-9_]{20,}/g, '[GITHUB_TOKEN]')
      .replace(/Bearer\s+[a-zA-Z0-9+/=._-]{20,}/gi, 'Bearer [REDACTED]')
      .replace(/https?:\/\/[^@\s]*:[^@\s]*@[^\s]*/g, 'https://[CREDENTIALS_REDACTED]@[HOST]')
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = Array.isArray(data) ? [] : {}

    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys entirely
      const sensitiveKeys = [
        'accessToken',
        'token',
        'password',
        'secret',
        'key',
        'authorization',
        'auth'
      ]
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]'
        continue
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeForLogging(value)
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeForLogging(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  return data
}

/**
 * Production-safe logger
 */
export const logger = {
  /**
   * Debug level logging (development only)
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  debug(message, ...data) {
    if (isDevelopment()) {
      const sanitizedData = data.map((item) => sanitizeForLogging(item))
      console.debug(`[DEBUG] ${message}`, ...sanitizedData)
    }
  },

  /**
   * Info level logging (development only)
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  info(message, ...data) {
    if (isDevelopment()) {
      const sanitizedData = data.map((item) => sanitizeForLogging(item))
      console.info(`[INFO] ${message}`, ...sanitizedData)
    }
  },

  /**
   * Warning level logging (always logged but sanitized)
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  warn(message, ...data) {
    const sanitizedData = data.map((item) => sanitizeForLogging(item))
    console.warn(`[WARN] ${message}`, ...sanitizedData)
  },

  /**
   * Error level logging (always logged but sanitized)
   * @param {string} message - Log message
   * @param {...any} data - Additional data to log
   */
  error(message, ...data) {
    const sanitizedData = data.map((item) => sanitizeForLogging(item))
    console.error(`[ERROR] ${message}`, ...sanitizedData)
  },

  /**
   * Group logging for development debugging
   * @param {string} groupName - Group name
   * @param {Function} fn - Function to execute within group
   */
  group(groupName, fn) {
    if (isDevelopment()) {
      console.group(`[GROUP] ${groupName}`)
      try {
        fn()
      } finally {
        console.groupEnd()
      }
    }
  },

  /**
   * Performance timing for development
   * @param {string} label - Timer label
   */
  time(label) {
    if (isDevelopment()) {
      console.time(`[TIMER] ${label}`)
    }
  },

  /**
   * End performance timing for development
   * @param {string} label - Timer label
   */
  timeEnd(label) {
    if (isDevelopment()) {
      console.timeEnd(`[TIMER] ${label}`)
    }
  }
}

/**
 * Legacy console replacement for gradual migration
 * @deprecated Use logger methods instead
 */
export const safeConsole = {
  log(...args) {
    logger.info('Legacy console.log', ...args)
  },

  debug(...args) {
    logger.debug('Legacy console.debug', ...args)
  },

  info(...args) {
    logger.info('Legacy console.info', ...args)
  },

  warn(...args) {
    logger.warn('Legacy console.warn', ...args)
  },

  error(...args) {
    logger.error('Legacy console.error', ...args)
  }
}

export default logger
