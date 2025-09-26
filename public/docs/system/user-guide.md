# Fantasy Editor Complete User Guide

**Version 0.0.2 (Alpha)**

Welcome to Fantasy Editor - the distraction-free, keyboard-first markdown editor designed specifically for writers. This comprehensive guide covers everything you need to know to master Fantasy Editor's powerful features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Command System](#command-system)
4. [Git Provider Integration](#git-provider-integration)
5. [Document Management](#document-management)
6. [Editor Features](#editor-features)
7. [Themes and Customization](#themes-and-customization)
8. [Export and Publishing](#export-and-publishing)
9. [Advanced Workflows](#advanced-workflows)
10. [Troubleshooting](#troubleshooting)
11. [Performance Tips](#performance-tips)

---

## Getting Started

### First Launch

When you first open Fantasy Editor, you'll see a clean, minimal interface with:
- **Editor Area** - Your writing space (65 characters wide by default)
- **Navigator** - Collapsible sidebar for documents, outline, and search
- **Status Bar** - Shows word count, sync status, and app version
- **Command Bar** - Appears when you press `Ctrl+Space`

### Your First Document

1. Press `Ctrl+Space` to open the command palette
2. Type `:n My First Story` and press Enter
3. Start writing immediately - the editor supports full Markdown syntax
4. Your document auto-saves as you type

### Essential First Steps

1. **Set Optimal Width** - Type `:65` for the best reading experience
2. **Choose a Theme** - Try `:t dark` or `:t fantasy`
3. **Connect Git Provider** - Use `:glo` to sync with GitHub, GitLab, or Bitbucket
4. **Explore Navigation** - Press `:d` to see your documents list

---

## Core Concepts

### Command-Driven Interface

Fantasy Editor uses a single keyboard shortcut (`Ctrl+Space`) for all functionality. This design:
- **Eliminates conflicts** with browser shortcuts
- **Reduces cognitive load** - only one shortcut to remember
- **Provides discoverability** through fuzzy search
- **Ensures consistency** across all features

### Colon Shortcuts

All commands have short aliases starting with `:` followed by 1-3 characters:
- `:n` = new document
- `:s` = save
- `:f` = search
- `:glo` = Git provider login

### Offline-First Architecture

Fantasy Editor works completely offline:
- **Documents stored locally** in your browser's IndexedDB
- **Full functionality** without internet connection
- **Background sync** when online
- **Conflict resolution** for simultaneous edits

### Writer-Focused Design

Every feature prioritizes the writing experience:
- **Distraction-free interface** with minimal UI
- **Optimal line length** (65 characters by default)
- **Clean typography** with readable fonts
- **Dark mode support** for low-light writing

---

## Command System

### Command Palette

Press `Ctrl+Space` to open the command palette:
- **Fuzzy search** - Type partial words to find commands
- **Parameter support** - Add arguments directly: `:n My Epic Tale`
- **Real-time filtering** - Results update as you type
- **Keyboard navigation** - Use arrow keys and Enter

### File Operations

| Command | Shortcut | Description | Examples |
|---------|----------|-------------|----------|
| New Document | `:n` | Create new document | `:n`, `:n Chapter 1` |
| Save Document | `:s` | Save current document | `:s` |
| Open Document | `:o` | Open existing document | `:o`, `:o dragon` |
| Search Documents | `:f` | Full-text search | `:f magic spells` |

### Navigation Commands

| Command | Shortcut | Description | Examples |
|---------|----------|-------------|----------|
| Documents List | `:d` | Show all documents | `:d`, `:d fantasy` |
| Document Outline | `:l` | Show current document outline | `:l` |
| Toggle Navigator | `:ts` | Show/hide sidebar | `:ts` |
| Focus Search | `:fs` | Focus on search tab | `:fs` |
| Focus Documents | `:fd` | Focus on documents tab | `:fd` |

### Editor Control Commands

| Command | Shortcut | Description | Examples |
|---------|----------|-------------|----------|
| Width 65ch | `:65` | Set optimal reading width | `:65` |
| Width 80ch | `:80` | Set standard width | `:80` |
| Width 90ch | `:90` | Set wide width | `:90` |
| Zoom In | `:zi` | Increase font size | `:zi` |
| Zoom Out | `:zo` | Decrease font size | `:zo` |
| Zoom Reset | `:zr` | Reset to 100% zoom | `:zr` |
| Editor Info | `:ei` | Show current settings | `:ei` |

### Theme Commands

| Command | Shortcut | Description | Examples |
|---------|----------|-------------|----------|
| Change Theme | `:t` | Switch to specific theme | `:t dark`, `:t light` |
| Toggle Theme | `:tt` | Cycle through themes | `:tt` |

### Export Commands

| Command | Shortcut | Description | Examples |
|---------|----------|-------------|----------|
| Export Document | `:ex` | Export in specified format | `:ex md`, `:ex pdf` |
| Export Markdown | `:em` | Quick Markdown export | `:em` |
| Export Text | `:et` | Export as plain text | `:et` |
| Export HTML | `:eh` | Export as HTML | `:eh` |
| Export PDF | `:ep` | Export as PDF | `:ep` |

### System Commands

| Command | Shortcut | Description | Examples |
|---------|----------|-------------|----------|
| Help | `:help` | Quick reference guide | `:help` |
| User Guide | `:guide` | Complete user guide | `:guide` |
| Settings | `:se` | Open settings dialog | `:se` |
| Statistics | `:st` | Document statistics | `:st` |
| Word Count | `:wc` | Current word count | `:wc` |
| Version | `:v` | App version info | `:v` |
| Spell Check | `:sp` | Toggle spell checking | `:sp` |

---

## Git Provider Integration

Fantasy Editor supports multiple Git providers for document synchronization and backup. GitHub is fully integrated, with GitLab, Bitbucket, and generic Git support coming soon.

### Supported Providers

- **GitHub** - Full integration (ready)
- **GitLab** - Coming soon
- **Bitbucket** - Coming soon
- **Generic Git** - Coming soon

### Setting Up Git Integration

#### 1. Initial Login

```
Ctrl+Space → :glo
```

This will:
- Redirect to your Git provider's authentication page
- Request necessary permissions for repository access
- Store secure tokens for API access
- Return to Fantasy Editor authenticated

#### 2. Configure Repository

```
Ctrl+Space → :gcf username repository-name
```

Examples:
- `:gcf myuser my-novel` - Use existing repository
- `:gcf myuser fantasy-stories` - Create new repository if needed

#### 3. Automatic Repository Setup

Fantasy Editor can automatically:
- Create a new repository if it doesn't exist
- Set up proper folder structure
- Initialize with README and .gitignore
- Configure for optimal document storage

### Git Provider Commands

| Command | Shortcut | Description | Usage |
|---------|----------|-------------|-------|
| Login | `:glo` | Authenticate with provider | `:glo` |
| Logout | `:gou` | Sign out from provider | `:gou` |
| Configure | `:gcf` | Set repository | `:gcf owner repo` |
| Sync | `:gsy` | Sync all documents | `:gsy` |
| Push | `:gpu` | Push local changes | `:gpu` |
| Pull | `:gpl` | Pull specific document | `:gpl filename` |
| Status | `:gst` | Check sync status | `:gst` |
| List | `:gls` | List remote documents | `:gls` |
| Import | `:gim` | Import repository | `:gim https://...` |
| Initialize | `:gin` | Setup new repository | `:gin` |

### Sync Status Indicators

The status bar shows real-time sync status:

- 🟢 **synced** - Document matches remote (green)
- 🟡 **out-of-sync** - Local changes need push (yellow)
- 🔴 **local-only** - Never synced to remote (red)

### Working with Multiple Providers

You can work with different Git providers:

1. **Switch providers** - Logout and login to different provider
2. **Multiple repositories** - Use `:gcf` to switch between repos
3. **Import from different providers** - Use `:gim` with different URLs

### Conflict Resolution

When conflicts occur:

1. **Automatic detection** - Fantasy Editor identifies conflicts
2. **Visual indicators** - Conflict status shown in status bar
3. **Resolution options** - Choose local, remote, or manual merge
4. **Backup preservation** - Original versions preserved during resolution

---

## Document Management

### Creating Documents

**Quick Creation:**
```
:n → Creates "Untitled Document"
:n My Epic Tale → Creates "My Epic Tale"
```

**From Template:**
Fantasy Editor automatically adds helpful starter content for new documents.

### Document Organization

#### Tags System

Organize documents with tags:
```
:tag add fantasy → Add "fantasy" tag
:tag add novel adventure → Add multiple tags
:tag remove fantasy → Remove specific tag
:tag list → Show all tags
```

#### Filtering Documents

```
:d → Show all documents
:d fantasy → Filter by "fantasy" tag
:d recent → Show recently modified
:d untagged → Show untagged documents
```

#### Document Sections

**RECENT** - Last 3 accessed documents
**PREVIOUS** - All other documents by modification date

### Document Metadata

Each document includes:
- **Title** - Human-readable name
- **Content** - Full Markdown text
- **Created** - Creation timestamp
- **Modified** - Last modification time
- **Tags** - Organization labels
- **Word Count** - Automatic calculation
- **Sync Status** - Git provider synchronization state

### Document Search

**Full-text search across all documents:**
```
:f magic → Search for "magic" in all content
:f "exact phrase" → Search for exact phrase
:f tag:fantasy → Search within tagged documents
```

**Search Features:**
- **Real-time results** - Updates as you type
- **Context highlighting** - Shows matching text snippets
- **Document preview** - Click to open matching documents
- **Advanced filtering** - Combine text and tag searches

---

## Editor Features

### Markdown Support

Fantasy Editor provides full Markdown editing with:

**Syntax Highlighting:**
- Headers (`# ## ###`)
- **Bold** and *italic* text
- Links `[text](url)`
- Code blocks with syntax highlighting
- Lists and tables
- Blockquotes

**Live Formatting:**
- Real-time syntax highlighting
- Automatic list continuation
- Smart quote handling
- Automatic link detection

### Width and Zoom Control

#### Optimal Width Settings

Fantasy Editor offers three width presets optimized for different writing needs:

- **65 characters** (`:65`) - Optimal reading width based on typography research
- **80 characters** (`:80`) - Standard coding width, good for structured content
- **90 characters** (`:90`) - Wide format for maximum content visibility

**Why 65 characters?** Research shows 65-75 characters per line provides optimal readability by reducing eye strain and improving comprehension.

#### Zoom Functionality

Control editor font size for comfortable writing:
- **Zoom range** - 85% to 130%
- **Zoom in** (`:zi`) - Increase font size
- **Zoom out** (`:zo`) - Decrease font size
- **Zoom reset** (`:zr`) - Return to 100%

**Zoom levels:** 85%, 100%, 115%, 130%

### Auto-save and Persistence

**Automatic Saving:**
- Documents save as you type (debounced)
- No "Ctrl+S" required (though `:s` works)
- Preserves content during browser crashes
- Works completely offline

**Data Storage:**
- Local storage in IndexedDB
- Encrypted document content
- Efficient compression
- Automatic cleanup of old versions

### Document Statistics

View detailed statistics about your writing:
- **Word count** - Real-time counting
- **Character count** - With and without spaces
- **Reading time** - Estimated based on average reading speed
- **Document structure** - Headers, paragraphs, lists

### Spell Checking

Built-in spell checking features:
- **Toggle spell check** (`:sp`)
- **Browser-based spell checking**
- **Multiple language support**
- **Custom dictionary support**

---

## Themes and Customization

### Available Themes

Fantasy Editor includes three carefully designed themes:

#### Light Theme (`:t light`)
- Clean, minimal design
- High contrast for daylight use
- Professional appearance
- Easy on the eyes for long writing sessions

#### Dark Theme (`:t dark`)
- Elegant dark interface
- Reduced eye strain in low light
- Modern, sophisticated look
- Blue accent colors

#### Fantasy Theme (`:t fantasy`)
- Rich, atmospheric colors
- Inspired by fantasy literature
- Warm, inviting palette
- Perfect for creative writing

### Theme Switching

**Quick Toggle:**
```
:tt → Cycle through all themes
```

**Specific Theme:**
```
:t light → Switch to light theme
:t dark → Switch to dark theme
:t fantasy → Switch to fantasy theme
```

### Theme Persistence

- **Automatic saving** - Theme choice preserved across sessions
- **Instant switching** - No reload required
- **Zoom preservation** - Zoom levels maintained when changing themes

### Custom Theme Configuration

Access advanced theme options through Settings (`:se`):
- **Color adjustments** - Fine-tune theme colors
- **Font preferences** - Customize typography
- **Spacing options** - Adjust line height and margins
- **Export/Import** - Share theme configurations

---

## Export and Publishing

Fantasy Editor provides comprehensive export options for various publishing workflows.

### Supported Export Formats

#### Markdown Export (`:em` or `:ex md`)
- **Preserves formatting** - Maintains all Markdown syntax
- **Clean output** - Optimized for other Markdown processors
- **Cross-platform compatibility** - Works with any Markdown tool
- **Use cases** - GitHub, GitLab, documentation sites, static generators

#### Plain Text Export (`:et` or `:ex txt`)
- **Clean text** - Removes all formatting
- **Universal compatibility** - Works everywhere
- **Focus on content** - Pure text without distractions
- **Use cases** - Email, simple text editors, word count analysis

#### HTML Export (`:eh` or `:ex html`)
- **Web-ready** - Complete HTML document
- **Styled output** - Includes CSS for proper formatting
- **Responsive design** - Works on all devices
- **Use cases** - Web publishing, email newsletters, documentation

#### PDF Export (`:ep` or `:ex pdf`)
- **Print-ready** - Professional formatting
- **Font embedding** - Consistent appearance across devices
- **Pagination** - Proper page breaks
- **Use cases** - Manuscripts, reports, professional documents

### Export Workflow

**Simple Export:**
```
:ex md → Export current document as Markdown
:ex pdf → Export current document as PDF
```

**Quick Shortcuts:**
```
:em → Export Markdown (shortcut)
:et → Export Text (shortcut)
:eh → Export HTML (shortcut)
:ep → Export PDF (shortcut)
```

### Export Features

**Automatic Naming:**
- Uses document title for filename
- Adds appropriate file extension
- Handles special characters safely
- Provides fallback names for untitled documents

**Download Integration:**
- Triggers browser download automatically
- No additional dialogs or confirmations
- Files saved to default download location
- Works in all modern browsers

**Status Feedback:**
- Success notifications via toast messages
- Error handling with helpful messages
- Export progress for large documents

### Publishing Workflows

#### Blog Publishing
1. Write in Fantasy Editor with Markdown
2. Export as Markdown (`:em`)
3. Upload to blog platform (WordPress, Ghost, Jekyll)

#### Documentation
1. Create structured content with headers
2. Use document outline (`:l`) for navigation
3. Export as HTML (`:eh`) for web publishing
4. Or export as Markdown (`:em`) for documentation generators

#### Manuscript Preparation
1. Write complete manuscript in Fantasy Editor
2. Use optimal 65ch width for comfortable editing
3. Export as PDF (`:ep`) for submission
4. Or export as Word-compatible formats

#### Version Control
1. Use Git provider integration for version history
2. Export snapshots at major milestones
3. Keep backups in multiple formats

---

## Advanced Workflows

### Multi-Document Projects

**Organizing Large Projects:**
1. Use consistent tagging system
2. Create document naming conventions
3. Leverage the outline view for structure
4. Use search to find related content

**Example Novel Workflow:**
```
:n Chapter 1: The Beginning
:tag add novel chapter fantasy
:n Character Notes
:tag add novel reference
:n World Building
:tag add novel reference worldbuilding
```

### Research and Reference Management

**Collecting Research:**
1. Create dedicated research documents
2. Tag with `research` and topic tags
3. Use full-text search to find information quickly
4. Link between related documents in content

**Reference Workflow:**
```
:n Research: Medieval Weapons
:tag add research medieval weapons
[Write your research notes]
:f medieval → Find all medieval-related content
```

### Collaboration Workflows

**Git Provider Collaboration:**
1. Share repository with collaborators
2. Use consistent file naming
3. Implement branch-based workflows
4. Regular sync to avoid conflicts

**Solo Author Version Control:**
1. Commit major changes to Git provider
2. Use descriptive commit messages
3. Create branches for experimental content
4. Keep local backups with exports

### Daily Writing Routine

**Recommended Daily Workflow:**
1. **Morning Setup** - `:glo` to ensure sync status
2. **Quick Review** - `:d` to see recent documents
3. **Focus Mode** - `:65` for optimal width, `:t` for preferred theme
4. **Write** - Focus on content, auto-save handles persistence
5. **End Session** - `:gsy` to sync, `:st` to review statistics

### Backup Strategies

**Multiple Backup Layers:**
1. **Automatic local backup** - IndexedDB storage
2. **Git provider sync** - Cloud backup and version control
3. **Regular exports** - Download copies in multiple formats
4. **External backup** - Copy important documents to external storage

---

## Troubleshooting

### Common Issues and Solutions

#### Command Palette Not Working

**Problem:** Pressing `Ctrl+Space` doesn't open command palette

**Solutions:**
1. **Check focus** - Click in the editor area first
2. **Verify shortcut** - Must be exactly `Ctrl+Space` (not Cmd+Space on Mac)
3. **Browser conflicts** - Some browsers may override this shortcut
4. **Refresh page** - Hard refresh with `Ctrl+Shift+R`

#### Git Provider Sync Issues

**Problem:** Documents not syncing with Git provider

**Solutions:**
1. **Check authentication** - Try `:gou` then `:glo` to re-login
2. **Verify repository** - Use `:gcf owner repo` to reconfigure
3. **Check status** - Use `:gst` to see current sync state
4. **Network connectivity** - Ensure internet connection is stable
5. **Repository permissions** - Verify write access to configured repository

#### Documents Not Appearing

**Problem:** Previously created documents not showing in document list

**Solutions:**
1. **Check filters** - Use `:d` without filters to show all documents
2. **Search by name** - Use `:f document-name` to find specific documents
3. **Browser storage** - Check if browser data was cleared
4. **Import from Git** - Use `:gim` to restore from Git provider

#### Performance Issues

**Problem:** Editor running slowly or unresponsively

**Solutions:**
1. **Close other tabs** - Reduce browser memory usage
2. **Clear browser cache** - May help with loading issues
3. **Reduce document size** - Very large documents may cause slowness
4. **Check system resources** - Ensure sufficient RAM available

#### Export Failures

**Problem:** Document export not working or downloading

**Solutions:**
1. **Check browser permissions** - Allow downloads from Fantasy Editor domain
2. **Try different format** - Test with `:et` (text export)
3. **Reduce document size** - Very large documents may fail to export
4. **Clear browser cache** - May resolve export library issues

### Browser-Specific Issues

#### Chrome/Chromium
- **Service Worker conflicts** - Clear site data if experiencing issues
- **Memory limits** - Chrome may limit large IndexedDB operations

#### Firefox
- **Private browsing** - Some features may not work in private mode
- **Storage permissions** - Ensure persistent storage is allowed

#### Safari
- **iOS limitations** - Some features may be limited on mobile Safari
- **Storage quotas** - May have lower storage limits than other browsers

### Data Recovery

#### Recovering Lost Documents

**If documents appear to be missing:**
1. **Check Git provider** - Use `:gim` to import from repository
2. **Search by content** - Use `:f` with remembered text snippets
3. **Check browser backup** - Look for local browser data backups
4. **Review recent exports** - Check download folder for recent exports

#### Preventing Data Loss

**Recommended practices:**
1. **Regular Git sync** - Use `:gsy` frequently
2. **Periodic exports** - Download important documents regularly
3. **Multiple devices** - Access Fantasy Editor from multiple devices
4. **Repository backup** - Ensure Git provider has proper backup systems

### Getting Help

#### Built-in Help System

- **Quick Reference** - `:help` for essential commands
- **Complete Guide** - `:guide` for this comprehensive manual
- **System Information** - `:v` for version and technical details

#### Community Support

- **Project Repository** - Report issues and request features
- **Documentation** - Complete technical documentation available
- **Community Forums** - Connect with other Fantasy Editor users

---

## Performance Tips

### Optimizing Editor Performance

#### Managing Large Documents

**For documents over 10,000 words:**
1. **Split into chapters** - Create separate documents for each chapter
2. **Use document tags** - Organize related documents with consistent tagging
3. **Regular exports** - Keep backup copies to reduce single-document size
4. **Gradual loading** - Fantasy Editor loads content progressively

#### Browser Optimization

**Recommended browser settings:**
1. **Allow persistent storage** - Prevents data clearing
2. **Enable service workers** - Required for offline functionality
3. **Sufficient memory** - Close unnecessary tabs while writing
4. **Regular updates** - Keep browser updated for best performance

#### Storage Management

**Managing local storage:**
1. **Regular cleanup** - Fantasy Editor automatically manages old data
2. **Export old documents** - Download and remove documents you rarely access
3. **Monitor usage** - Use browser developer tools to check storage usage
4. **Git provider sync** - Offload storage to remote repositories

### Network Performance

#### Sync Optimization

**For better sync performance:**
1. **Stable connection** - Use reliable internet when syncing
2. **Batch operations** - Let Fantasy Editor group sync operations
3. **Regular small syncs** - Better than infrequent large syncs
4. **Conflict prevention** - Sync before making major changes

#### Offline Performance

**Working offline:**
1. **Full functionality** - All editing features work without internet
2. **Background sync** - Automatic sync when connection returns
3. **Conflict resolution** - Handles simultaneous edits gracefully
4. **Local backup** - All data stored locally for reliability

### Best Practices

#### Document Organization

**For optimal performance:**
1. **Consistent naming** - Use clear, searchable document titles
2. **Strategic tagging** - Apply tags consistently for easy filtering
3. **Regular maintenance** - Archive or delete documents you no longer need
4. **Logical structure** - Organize related documents with similar tags

#### Writing Workflow

**Performance-optimized writing:**
1. **Focus on content** - Let auto-save handle persistence
2. **Use optimal width** - `:65` provides best reading performance
3. **Regular breaks** - Take advantage of auto-save for breaks
4. **Distraction-free** - Hide Navigator when focusing on writing

---

**Fantasy Editor v0.0.2 (Alpha)**

This comprehensive guide covers all aspects of Fantasy Editor. For quick reference, use `:help` within the application.

*Write your epic tales with focus, clarity, and the power of modern web technology.*

**Remember: `Ctrl+Space` is your gateway to everything!**