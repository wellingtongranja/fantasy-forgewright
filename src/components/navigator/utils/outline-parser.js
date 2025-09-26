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
    let inCodeBlock = false
    let codeBlockDelimiter = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      lineNumber = i + 1

      // Check for code block boundaries
      const codeBlockMatch = line.match(/^(\s*)(```|~~~)(.*)$/)
      if (codeBlockMatch) {
        const delimiter = codeBlockMatch[2]
        if (!inCodeBlock) {
          // Starting code block
          inCodeBlock = true
          codeBlockDelimiter = delimiter
        } else if (delimiter === codeBlockDelimiter) {
          // Ending code block
          inCodeBlock = false
          codeBlockDelimiter = null
        }
        continue
      }

      // Skip processing if we're inside a code block
      if (inCodeBlock) {
        continue
      }

      // Check for indented code blocks (4+ spaces or 1+ tabs)
      if (line.match(/^(\s{4,}|\t+)/)) {
        continue
      }

      // Match ATX headers (# ## ### #### ##### ######)
      const atxHeaderMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s*#+\s*)?$/)

      if (atxHeaderMatch) {
        const level = atxHeaderMatch[1].length
        const text = atxHeaderMatch[2].trim()
        this.addHeaderToOutline(outline, stack, text, level, lineNumber)
        continue
      }

      // Match setext headers (underlined with = or -)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        const setextMatch = nextLine.match(/^(=+|-+)\s*$/)

        if (setextMatch && line.trim()) {
          const level = setextMatch[1][0] === '=' ? 1 : 2
          const text = line.trim()
          this.addHeaderToOutline(outline, stack, text, level, lineNumber)
          i++ // Skip the underline
          continue
        }
      }

      // Optional: Parse list items for enhanced structure
      // const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
      // if (listMatch) {
      //   // Could add list structure parsing here if needed
      // }
    }

    return outline
  }

  /**
   * Add a header to the outline structure
   * @param {Array} outline - Current outline array
   * @param {Array} stack - Header stack for nesting
   * @param {string} text - Header text
   * @param {number} level - Header level (1-6)
   * @param {number} lineNumber - Line number
   */
  static addHeaderToOutline(outline, stack, text, level, lineNumber) {
    // Remove markdown formatting from header text
    const cleanText = this.cleanHeaderText(text)

    // Skip headers that are empty after cleaning
    if (!cleanText) {
      return
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
      // Remove HTML tags (sometimes found in headers)
      .replace(/<[^>]*>/g, '')
      // Remove strikethrough
      .replace(/~~(.*?)~~/g, '$1')
      // Remove bold (both ** and __)
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      // Remove italic (both * and _)
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove inline code
      .replace(/`(.*?)`/g, '$1')
      // Remove links but keep link text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove reference links
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
      // Remove images but keep alt text
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
      // Remove remaining markdown characters
      .replace(/[*_~`#\\]/g, '')
      // Remove excess whitespace
      .replace(/\s+/g, ' ')
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
      byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      maxDepth: 0,
      hasNesting: false
    }

    function traverse(items, depth = 1) {
      for (const item of items) {
        stats.total++
        stats.byLevel[item.level]++
        stats.maxDepth = Math.max(stats.maxDepth, depth)

        if (item.children && item.children.length > 0) {
          stats.hasNesting = true
          traverse(item.children, depth + 1)
        }
      }
    }

    traverse(outline)
    return stats
  }

  /**
   * Validate outline structure and detect common issues
   * @param {Array} outline - Outline structure
   * @returns {Object} Validation results with warnings
   */
  static validateStructure(outline) {
    const warnings = []
    const levels = new Set()

    function traverse(items, parentLevel = 0) {
      for (const item of items) {
        levels.add(item.level)

        // Check for level skipping (e.g., H1 -> H3)
        if (parentLevel > 0 && item.level > parentLevel + 1) {
          warnings.push({
            type: 'level-skip',
            line: item.line,
            message: `Header level ${item.level} follows level ${parentLevel} without intermediate levels`,
            text: item.text
          })
        }

        // Check for very long header text
        if (item.text.length > 100) {
          warnings.push({
            type: 'long-header',
            line: item.line,
            message: `Header text is very long (${item.text.length} characters)`,
            text: item.text.substring(0, 50) + '...'
          })
        }

        if (item.children && item.children.length > 0) {
          traverse(item.children, item.level)
        }
      }
    }

    traverse(outline)

    // Check for missing H1
    if (outline.length > 0 && !levels.has(1)) {
      warnings.push({
        type: 'missing-h1',
        message: 'Document has headers but no H1 (top-level) header'
      })
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      levels: Array.from(levels).sort(),
      hasStructure: outline.length > 0
    }
  }

  /**
   * Optimize parsing for large documents by using early termination
   * @param {string} content - Markdown content
   * @param {Object} options - Parsing options
   * @returns {Array} Outline tree structure
   */
  static parseOptimized(content, options = {}) {
    const {
      maxHeaders = 1000, // Stop parsing after N headers
      maxLines = 10000,   // Stop parsing after N lines
      includeValidation = false
    } = options

    if (!content || typeof content !== 'string') {
      return []
    }

    const lines = content.replace(/\r\n?/g, '\n').split('\n')
    const outline = []
    const stack = []
    let headerCount = 0
    let inCodeBlock = false
    let codeBlockDelimiter = null

    const maxLinesToProcess = Math.min(lines.length, maxLines)

    for (let i = 0; i < maxLinesToProcess; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Early termination if we have enough headers
      if (headerCount >= maxHeaders) {
        break
      }

      // Handle code blocks
      const codeBlockMatch = line.match(/^(\s*)(```|~~~)(.*)$/)
      if (codeBlockMatch) {
        const delimiter = codeBlockMatch[2]
        if (!inCodeBlock) {
          inCodeBlock = true
          codeBlockDelimiter = delimiter
        } else if (delimiter === codeBlockDelimiter) {
          inCodeBlock = false
          codeBlockDelimiter = null
        }
        continue
      }

      if (inCodeBlock || line.match(/^(\s{4,}|\t+)/)) {
        continue
      }

      // ATX headers
      const atxHeaderMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s*#+\s*)?$/)
      if (atxHeaderMatch) {
        const level = atxHeaderMatch[1].length
        const text = atxHeaderMatch[2].trim()
        this.addHeaderToOutline(outline, stack, text, level, lineNumber)
        headerCount++
        continue
      }

      // Setext headers
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        const setextMatch = nextLine.match(/^(=+|-+)\s*$/)
        if (setextMatch && line.trim()) {
          const level = setextMatch[1][0] === '=' ? 1 : 2
          const text = line.trim()
          this.addHeaderToOutline(outline, stack, text, level, lineNumber)
          headerCount++
          i++ // Skip the underline
          continue
        }
      }
    }

    if (includeValidation) {
      const validation = this.validateStructure(outline)
      return { outline, validation, stats: this.getStatistics(outline) }
    }

    return outline
  }
}
