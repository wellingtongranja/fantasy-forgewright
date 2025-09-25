/**
 * Legal System Constants - Configuration for legal documents management
 * Follows Fantasy Editor standards: KISS principle, defensive programming
 */

// Worker URLs for different environments
export const LEGAL_WORKER_URLS = {
  development: 'http://localhost:64667',
  staging: 'https://fantasy-legal-docs-staging.wellington-granja.workers.dev',
  production: 'https://fantasy-legal-docs.wellington-granja.workers.dev'
}

// Document types supported by the legal system
export const DOCUMENT_TYPES = [
  'privacy-policy',
  'terms-of-service',
  'eula',
  'license',
  'release-notes'
]

// API endpoints
export const API_ENDPOINTS = {
  CHECK: '/legal/check',
  DOCUMENTS: '/legal/documents'
}

// Environment detection
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
}

// Default configuration
export const DEFAULT_CONFIG = {
  TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  CACHE_DURATION_MS: 5 * 60 * 1000 // 5 minutes
}

/**
 * Detect current environment based on hostname
 */
export function detectEnvironment() {
  if (typeof window === 'undefined') {
    return ENVIRONMENTS.DEVELOPMENT
  }

  const hostname = window.location.hostname

  if (hostname === 'fantasy.forgewright.io') {
    return ENVIRONMENTS.PRODUCTION
  }

  if (hostname.includes('pages.dev')) {
    return ENVIRONMENTS.STAGING
  }

  return ENVIRONMENTS.DEVELOPMENT
}

/**
 * Get worker URL for current environment
 */
export function getWorkerUrl() {
  const environment = detectEnvironment()
  return LEGAL_WORKER_URLS[environment]
}

/**
 * Validate document type
 */
export function isValidDocumentType(type) {
  return DOCUMENT_TYPES.includes(type)
}