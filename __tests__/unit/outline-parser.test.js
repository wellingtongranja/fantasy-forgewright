/**
 * OutlineParser Tests
 * Tests markdown parsing and outline generation functionality
 */

import { OutlineParser } from '../../src/components/navigator/utils/outline-parser.js'

describe('OutlineParser', () => {
  describe('parse method', () => {
    it('should parse simple markdown headers', () => {
      const content = `# Header 1
Some content here
## Header 2
More content
### Header 3
Even more content`

      const result = OutlineParser.parse(content)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Header 1')
      expect(result[0].level).toBe(1)
      expect(result[0].line).toBe(1)
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].text).toBe('Header 2')
      expect(result[0].children[0].level).toBe(2)
      expect(result[0].children[0].children).toHaveLength(1)
      expect(result[0].children[0].children[0].text).toBe('Header 3')
      expect(result[0].children[0].children[0].level).toBe(3)
    })

    it('should handle multiple top-level headers', () => {
      const content = `# Chapter 1
Content for chapter 1
# Chapter 2
Content for chapter 2
# Chapter 3
Content for chapter 3`

      const result = OutlineParser.parse(content)

      expect(result).toHaveLength(3)
      expect(result[0].text).toBe('Chapter 1')
      expect(result[1].text).toBe('Chapter 2')
      expect(result[2].text).toBe('Chapter 3')
    })

    it('should handle headers with various markdown formatting', () => {
      const content = `# **Bold Header**
## *Italic Header*
### \`Code Header\`
#### [Link Header](http://example.com)
##### Header with *mixed* **formatting** and \`code\`
###### Header_with_underscores`

      const result = OutlineParser.parse(content)

      expect(result[0].text).toBe('Bold Header')
      expect(result[0].children[0].text).toBe('Italic Header')
      expect(result[0].children[0].children[0].text).toBe('Code Header')
      expect(result[0].children[0].children[0].children[0].text).toBe('Link Header')
      expect(result[0].children[0].children[0].children[0].children[0].text).toBe(
        'Header with mixed formatting and code'
      )
      expect(result[0].children[0].children[0].children[0].children[0].children[0].text).toBe(
        'Headerwithunderscores'
      )
    })

    it('should correctly assign line numbers', () => {
      const content = `Line 1
# Header at line 2
Line 3
Line 4
## Header at line 5
Line 6`

      const result = OutlineParser.parse(content)

      expect(result[0].line).toBe(2)
      expect(result[0].children[0].line).toBe(5)
    })

    it('should handle empty or null content', () => {
      expect(OutlineParser.parse('')).toEqual([])
      expect(OutlineParser.parse(null)).toEqual([])
      expect(OutlineParser.parse(undefined)).toEqual([])
    })

    it('should handle non-string input', () => {
      expect(OutlineParser.parse(123)).toEqual([])
      expect(OutlineParser.parse({})).toEqual([])
      expect(OutlineParser.parse([])).toEqual([])
    })

    it('should handle content without headers', () => {
      const content = `This is just regular content
without any headers at all
just plain text`

      const result = OutlineParser.parse(content)

      expect(result).toEqual([])
    })

    it('should handle malformed headers', () => {
      const content = `#Not a header (no space)
# Proper header
##Also not proper (no space)
## Another proper header
      # Indented header (should still work)`

      const result = OutlineParser.parse(content)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Proper header')
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].text).toBe('Another proper header')
    })

    it('should handle complex nesting correctly', () => {
      const content = `# Chapter 1
## Section 1.1
### Subsection 1.1.1
### Subsection 1.1.2
## Section 1.2
### Subsection 1.2.1
# Chapter 2
## Section 2.1`

      const result = OutlineParser.parse(content)

      expect(result).toHaveLength(2)

      // Chapter 1
      expect(result[0].text).toBe('Chapter 1')
      expect(result[0].children).toHaveLength(2)

      // Section 1.1
      expect(result[0].children[0].text).toBe('Section 1.1')
      expect(result[0].children[0].children).toHaveLength(2)
      expect(result[0].children[0].children[0].text).toBe('Subsection 1.1.1')
      expect(result[0].children[0].children[1].text).toBe('Subsection 1.1.2')

      // Section 1.2
      expect(result[0].children[1].text).toBe('Section 1.2')
      expect(result[0].children[1].children).toHaveLength(1)
      expect(result[0].children[1].children[0].text).toBe('Subsection 1.2.1')

      // Chapter 2
      expect(result[1].text).toBe('Chapter 2')
      expect(result[1].children).toHaveLength(1)
      expect(result[1].children[0].text).toBe('Section 2.1')
    })

    it('should handle level skipping correctly', () => {
      const content = `# Header 1
### Header 3 (skipped level 2)
##### Header 5 (skipped level 4)
## Header 2 (back to level 2)`

      const result = OutlineParser.parse(content)

      expect(result).toHaveLength(1)
      expect(result[0].children).toHaveLength(2)
      expect(result[0].children[0].text).toBe('Header 3 (skipped level 2)')
      expect(result[0].children[0].level).toBe(3)
      expect(result[0].children[0].children[0].text).toBe('Header 5 (skipped level 4)')
      expect(result[0].children[1].text).toBe('Header 2 (back to level 2)')
      expect(result[0].children[1].level).toBe(2)
    })
  })

  describe('cleanHeaderText method', () => {
    it('should remove bold formatting', () => {
      const result = OutlineParser.cleanHeaderText('**Bold text**')
      expect(result).toBe('Bold text')
    })

    it('should remove italic formatting', () => {
      const result = OutlineParser.cleanHeaderText('*Italic text*')
      expect(result).toBe('Italic text')
    })

    it('should remove inline code formatting', () => {
      const result = OutlineParser.cleanHeaderText('`Code text`')
      expect(result).toBe('Code text')
    })

    it('should remove link formatting', () => {
      const result = OutlineParser.cleanHeaderText('[Link text](http://example.com)')
      expect(result).toBe('Link text')
    })

    it('should remove mixed formatting', () => {
      const result = OutlineParser.cleanHeaderText(
        '**Bold** and *italic* and `code` and [link](url)'
      )
      expect(result).toBe('Bold and italic and code and link')
    })

    it('should remove remaining markdown characters', () => {
      const result = OutlineParser.cleanHeaderText('Text with * and _ and ~ and ` characters')
      expect(result).toBe('Text with and and and characters')
    })

    it('should trim whitespace', () => {
      const result = OutlineParser.cleanHeaderText('  Spaced text  ')
      expect(result).toBe('Spaced text')
    })

    it('should handle empty string', () => {
      const result = OutlineParser.cleanHeaderText('')
      expect(result).toBe('')
    })
  })

  describe('getLineFromPosition method', () => {
    const sampleContent = 'Line 1\nLine 2\nLine 3\nLine 4'

    it('should return correct line for position', () => {
      expect(OutlineParser.getLineFromPosition(sampleContent, 0)).toBe(1)
      expect(OutlineParser.getLineFromPosition(sampleContent, 7)).toBe(2)
      expect(OutlineParser.getLineFromPosition(sampleContent, 14)).toBe(3)
      expect(OutlineParser.getLineFromPosition(sampleContent, 21)).toBe(4)
    })

    it('should handle invalid positions', () => {
      expect(OutlineParser.getLineFromPosition(sampleContent, -1)).toBe(1)
      expect(OutlineParser.getLineFromPosition(sampleContent, 1000)).toBe(4)
    })

    it('should handle empty content', () => {
      expect(OutlineParser.getLineFromPosition('', 0)).toBe(1)
      expect(OutlineParser.getLineFromPosition(null, 0)).toBe(1)
    })
  })

  describe('getPositionFromLine method', () => {
    const sampleContent = 'Line 1\nLine 2\nLine 3\nLine 4'

    it('should return correct position for line', () => {
      expect(OutlineParser.getPositionFromLine(sampleContent, 1)).toBe(0)
      expect(OutlineParser.getPositionFromLine(sampleContent, 2)).toBe(7)
      expect(OutlineParser.getPositionFromLine(sampleContent, 3)).toBe(14)
      expect(OutlineParser.getPositionFromLine(sampleContent, 4)).toBe(21)
    })

    it('should handle invalid line numbers', () => {
      expect(OutlineParser.getPositionFromLine(sampleContent, 0)).toBe(0)
      expect(OutlineParser.getPositionFromLine(sampleContent, -1)).toBe(0)
      expect(OutlineParser.getPositionFromLine(sampleContent, 10)).toBe(28) // End of content
    })

    it('should handle empty content', () => {
      expect(OutlineParser.getPositionFromLine('', 1)).toBe(0)
      expect(OutlineParser.getPositionFromLine(null, 1)).toBe(0)
    })
  })

  describe('flatten method', () => {
    const nestedOutline = [
      {
        id: 'h1',
        text: 'Header 1',
        level: 1,
        line: 1,
        children: [
          {
            id: 'h2',
            text: 'Header 2',
            level: 2,
            line: 3,
            children: [
              {
                id: 'h3',
                text: 'Header 3',
                level: 3,
                line: 5,
                children: []
              }
            ]
          }
        ]
      },
      {
        id: 'h4',
        text: 'Header 4',
        level: 1,
        line: 7,
        children: []
      }
    ]

    it('should flatten nested outline to linear array', () => {
      const result = OutlineParser.flatten(nestedOutline)

      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({ id: 'h1', text: 'Header 1', level: 1, line: 1 })
      expect(result[1]).toEqual({ id: 'h2', text: 'Header 2', level: 2, line: 3 })
      expect(result[2]).toEqual({ id: 'h3', text: 'Header 3', level: 3, line: 5 })
      expect(result[3]).toEqual({ id: 'h4', text: 'Header 4', level: 1, line: 7 })
    })

    it('should preserve order of headers', () => {
      const result = OutlineParser.flatten(nestedOutline)

      expect(result[0].line).toBe(1)
      expect(result[1].line).toBe(3)
      expect(result[2].line).toBe(5)
      expect(result[3].line).toBe(7)
    })

    it('should handle empty outline', () => {
      const result = OutlineParser.flatten([])
      expect(result).toEqual([])
    })

    it('should handle flat outline (no nesting)', () => {
      const flatOutline = [
        { id: 'h1', text: 'Header 1', level: 1, line: 1, children: [] },
        { id: 'h2', text: 'Header 2', level: 1, line: 3, children: [] }
      ]

      const result = OutlineParser.flatten(flatOutline)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 'h1', text: 'Header 1', level: 1, line: 1 })
      expect(result[1]).toEqual({ id: 'h2', text: 'Header 2', level: 1, line: 3 })
    })
  })

  describe('search method', () => {
    const searchableOutline = [
      {
        id: 'h1',
        text: 'Introduction to Fantasy',
        level: 1,
        line: 1,
        children: [
          {
            id: 'h2',
            text: 'Magic Systems',
            level: 2,
            line: 3,
            children: []
          }
        ]
      },
      {
        id: 'h3',
        text: 'Character Development',
        level: 1,
        line: 5,
        children: [
          {
            id: 'h4',
            text: "Hero's Journey",
            level: 2,
            line: 7,
            children: []
          }
        ]
      }
    ]

    it('should find headers matching search query', () => {
      const result = OutlineParser.search(searchableOutline, 'fantasy')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Introduction to Fantasy')
    })

    it('should be case insensitive', () => {
      const result = OutlineParser.search(searchableOutline, 'MAGIC')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Magic Systems')
    })

    it('should find partial matches', () => {
      const result = OutlineParser.search(searchableOutline, 'Develop')

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Character Development')
    })

    it('should find multiple matches', () => {
      const result = OutlineParser.search(searchableOutline, 'e')

      expect(result.length).toBeGreaterThan(1)
    })

    it('should return empty array for no matches', () => {
      const result = OutlineParser.search(searchableOutline, 'nonexistent')

      expect(result).toEqual([])
    })

    it('should return empty array for empty query', () => {
      const result = OutlineParser.search(searchableOutline, '')

      expect(result).toEqual([])
    })

    it('should handle null or undefined query', () => {
      expect(OutlineParser.search(searchableOutline, null)).toEqual([])
      expect(OutlineParser.search(searchableOutline, undefined)).toEqual([])
    })
  })

  describe('generateTOC method', () => {
    const tocOutline = [
      {
        id: 'h1',
        text: 'Chapter 1',
        level: 1,
        line: 1,
        children: [
          {
            id: 'h2',
            text: 'Section 1.1',
            level: 2,
            line: 3,
            children: []
          },
          {
            id: 'h3',
            text: 'Section 1.2',
            level: 2,
            line: 5,
            children: []
          }
        ]
      },
      {
        id: 'h4',
        text: 'Chapter 2',
        level: 1,
        line: 7,
        children: []
      }
    ]

    it('should generate markdown table of contents', () => {
      const result = OutlineParser.generateTOC(tocOutline)

      expect(result).toContain('- [Chapter 1](#heading-1)')
      expect(result).toContain('  - [Section 1.1](#heading-3)')
      expect(result).toContain('  - [Section 1.2](#heading-5)')
      expect(result).toContain('- [Chapter 2](#heading-7)')
    })

    it('should handle proper indentation for nested items', () => {
      const result = OutlineParser.generateTOC(tocOutline)
      const lines = result.split('\n')

      expect(lines[0]).toBe('- [Chapter 1](#heading-1)')
      expect(lines[1]).toBe('  - [Section 1.1](#heading-3)')
      expect(lines[2]).toBe('  - [Section 1.2](#heading-5)')
      expect(lines[3]).toBe('- [Chapter 2](#heading-7)')
    })

    it('should handle empty outline', () => {
      const result = OutlineParser.generateTOC([])
      expect(result).toBe('')
    })

    it('should generate proper anchor links', () => {
      const result = OutlineParser.generateTOC(tocOutline)

      expect(result).toContain('#heading-1')
      expect(result).toContain('#heading-3')
      expect(result).toContain('#heading-5')
      expect(result).toContain('#heading-7')
    })
  })

  describe('getStatistics method', () => {
    const statsOutline = [
      {
        id: 'h1',
        text: 'Header 1',
        level: 1,
        line: 1,
        children: [
          {
            id: 'h2',
            text: 'Header 2',
            level: 2,
            line: 3,
            children: [
              {
                id: 'h3',
                text: 'Header 3',
                level: 3,
                line: 5,
                children: []
              }
            ]
          },
          {
            id: 'h4',
            text: 'Another Header 2',
            level: 2,
            line: 7,
            children: []
          }
        ]
      },
      {
        id: 'h5',
        text: 'Another Header 1',
        level: 1,
        line: 9,
        children: []
      }
    ]

    it('should count total headers correctly', () => {
      const stats = OutlineParser.getStatistics(statsOutline)

      expect(stats.total).toBe(5)
    })

    it('should count headers by level correctly', () => {
      const stats = OutlineParser.getStatistics(statsOutline)

      expect(stats.byLevel[1]).toBe(2)
      expect(stats.byLevel[2]).toBe(2)
      expect(stats.byLevel[3]).toBe(1)
      expect(stats.byLevel[4]).toBe(0)
      expect(stats.byLevel[5]).toBe(0)
      expect(stats.byLevel[6]).toBe(0)
    })

    it('should handle empty outline', () => {
      const stats = OutlineParser.getStatistics([])

      expect(stats.total).toBe(0)
      expect(stats.byLevel).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0
      })
    })

    it('should return proper structure', () => {
      const stats = OutlineParser.getStatistics(statsOutline)

      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('byLevel')
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.byLevel).toBe('object')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle very long header text', () => {
      const longHeader = 'A'.repeat(1000)
      const content = `# ${longHeader}`

      const result = OutlineParser.parse(content)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe(longHeader)
    })

    it('should handle unicode characters in headers', () => {
      const content = `# 中文标题 🎉
## Ëmöjï Hėàdėr 🚀
### العربية Header`

      const result = OutlineParser.parse(content)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('中文标题 🎉')
      expect(result[0].children[0].text).toBe('Ëmöjï Hėàdėr 🚀')
      expect(result[0].children[0].children[0].text).toBe('العربية Header')
    })

    it('should handle headers with only whitespace', () => {
      const content = `#   
## \t\t
###    `

      const result = OutlineParser.parse(content)

      // Should skip empty headers
      expect(result).toEqual([])
    })

    it('should handle mixed line endings', () => {
      const content = `# Header 1\r\n## Header 2\r### Header 3\n#### Header 4`

      const result = OutlineParser.parse(content)

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Header 1')
      expect(result[0].children[0].text).toBe('Header 2')
    })
  })
})
