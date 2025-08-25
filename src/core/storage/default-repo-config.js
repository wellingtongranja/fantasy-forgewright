/**
 * Default repository configuration for Fantasy Editor
 * This file sets the default GitHub repository when user first signs in
 */

export const DEFAULT_REPO_CONFIG = {
  owner: null, // Will be set to the authenticated user's username
  repo: 'fantasy-editor',
  branch: 'main',
  documentsPath: 'documents',
  autoCreate: false, // Don't auto-create if it exists
  description: 'Fantasy Editor documents repository'
}

/**
 * Get repository configuration with user's username
 * @param {string} username - GitHub username
 * @returns {Object} Repository configuration
 */
export function getRepoConfig(username) {
  return {
    ...DEFAULT_REPO_CONFIG,
    owner: username
  }
}