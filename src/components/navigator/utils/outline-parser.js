/**
 * Outline Parser - Extracts document structure from markdown content
 * Parses headers to create navigable outline
 */

export class OutlineParser {
  /**
   * Parse markdown content and extract outline structure
   * @param {string} content - Markdown content
   * @returns {Array} Outline tree structure
   */
  static parse(content) {
    if (!content || typeof content !== 'string') {
      return []
    }

    // Normalize line endings to handle mixed \r\n, \r, \n
    const normalizedContent = content.replace(/\r\n?/g, '\n')
    const lines = normalizedContent.split('\n')
    const outline = []
    const stack = []
    let lineNumber = 0

    for (const line of lines) {
      lineNumber++

      // Match markdown headers (# ## ### #### ##### ######)
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)

      if (headerMatch) {
        const level = headerMatch[1].length
        const text = headerMatch[2].trim()

        // Remove markdown formatting from header text
        const cleanText = this.cleanHeaderText(text)

        // Skip headers that are empty after cleaning
        if (!cleanText) {
          continue
        }

        const item = {
          id: `heading-${lineNumber}`,
          text: cleanText,
          level: level,
          line: lineNumber,
          children: []
        }

        // Find parent based on level
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }

        if (stack.length === 0) {
          // Top-level header
          outline.push(item)
        } else {
          // Nested header
          stack[stack.length - 1].children.push(item)
        }

        stack.push(item)
      }
    }

    return outline
  }

  /**
   * Clean markdown formatting from header text
   * @param {string} text - Header text with potential markdown
   * @returns {string} Clean text
   */
  static cleanHeaderText(text) {
    if (!text || typeof text !== 'string') {
      return ''
    }

    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
      .replace(/[*_~`]/g, '') // Remove remaining markdown chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    return cleaned || text.trim() // Fallback to original if cleaned is empty
  }

  /**
   * Find the line number for a given position in content
   * @param {string} content - Document content
   * @param {number} position - Character position
   * @returns {number} Line number (1-indexed)
   */
  static getLineFromPosition(content, position) {
    if (!content || position < 0) return 1

    const lines = content.substring(0, position).split('\n')
    return lines.length
  }

  /**
   * Get character position for a given line number
   * @param {string} content - Document content
   * @param {number} lineNumber - Line number (1-indexed)
   * @returns {number} Character position
   */
  static getPositionFromLine(content, lineNumber) {
    if (!content || lineNumber <= 1) return 0

    const lines = content.split('\n')
    let position = 0

    for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
      position += lines[i].length + 1 // +1 for newline
    }

    return position
  }

  /**
   * Generate a flat list from outline tree for easier navigation
   * @param {Array} outline - Outline tree structure
   * @returns {Array} Flat list of headers
   */
  static flatten(outline) {
    const flat = []

    function traverse(items) {
      for (const item of items) {
        flat.push({
          id: item.id,
          text: item.text,
          level: item.level,
          line: item.line
        })

        if (item.children && item.children.length > 0) {
          traverse(item.children)
        }
      }
    }

    traverse(outline)
    return flat
  }

  /**
   * Search outline for matching headers
   * @param {Array} outline - Outline structure
   * @param {string} query - Search query
   * @returns {Array} Matching headers
   */
  static search(outline, query) {
    if (!query) return []

    const flat = this.flatten(outline)
    const lowerQuery = query.toLowerCase()

    return flat.filter((item) => item.text.toLowerCase().includes(lowerQuery))
  }

  /**
   * Get table of contents as markdown
   * @param {Array} outline - Outline structure
   * @returns {string} Markdown formatted TOC
   */
  static generateTOC(outline) {
    const lines = []

    function traverse(items, indent = '') {
      for (const item of items) {
        const link = `[${item.text}](#heading-${item.line})`
        lines.push(`${indent}- ${link}`)

        if (item.children && item.children.length > 0) {
          traverse(item.children, indent + '  ')
        }
      }
    }

    traverse(outline)
    return lines.join('\n')
  }

  /**
   * Count headers by level
   * @param {Array} outline - Outline structure
   * @returns {Object} Count of headers by level
   */
  static getStatistics(outline) {
    const stats = {
      total: 0,
      byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    }

    function traverse(items) {
      for (const item of items) {
        stats.total++
        stats.byLevel[item.level]++

        if (item.children && item.children.length > 0) {
          traverse(item.children)
        }
      }
    }

    traverse(outline)
    return stats
  }
}
