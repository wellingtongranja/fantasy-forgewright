/**
 * @jest-environment jsdom
 */

import { CommandRegistry } from '../../src/core/commands/command-registry.js'

describe('CommandRegistry Fuzzy Search Ranking', () => {
  let registry

  beforeEach(() => {
    registry = new CommandRegistry()
    
    // Register both commands to test ranking
    registry.registerCommand({
      name: 'open',
      description: 'open document',
      aliases: [':o'],
      handler: () => {}
    })
    
    registry.registerCommand({
      name: 'documents',
      description: 'open documents panel',
      aliases: [':d'],
      handler: () => {}
    })
  })

  test('should rank "open" higher than "documents" for query "op"', () => {
    const results = registry.searchCommands('op')
    
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('open')
    
    // Find documents in results (might not be second)
    const documentsIndex = results.findIndex(cmd => cmd.name === 'documents')
    const openIndex = results.findIndex(cmd => cmd.name === 'open')
    
    expect(openIndex).toBe(0) // open should be first
    if (documentsIndex !== -1) {
      expect(openIndex).toBeLessThan(documentsIndex) // open should come before documents
    }
  })
  
  test('should return open command as first result for "op"', () => {
    const results = registry.searchCommands('op')
    
    expect(results).toHaveLength(2) // Both commands should match
    expect(results[0].name).toBe('open')
    expect(results[0].aliases).toEqual([':o'])
  })
})