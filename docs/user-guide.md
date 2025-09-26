# Fantasy Editor User Guide

**Welcome to Fantasy Editor** - a distraction-free, keyboard-first markdown editor designed for writers who value focus and simplicity.

## 🚀 Getting Started

Fantasy Editor uses a revolutionary command-based interface that eliminates keyboard shortcut conflicts while providing powerful functionality.

### The Magic Key: `Ctrl+Space`

**Everything** in Fantasy Editor is accessible through a single keyboard shortcut: `Ctrl+Space`

1. Press `Ctrl+Space` to open the command palette
2. Type a colon command (like `:n` for new document)
3. Press `Enter` to execute, or `Esc` to cancel

**Why this approach?**
- **Zero browser conflicts** - No more accidentally closing tabs or triggering browser shortcuts
- **Discoverable** - Find any feature through search
- **Consistent** - One key to remember, unlimited possibilities
- **Efficient** - Colon shortcuts provide lightning-fast access

## 📝 Essential Commands

All commands use the format `:shortcut` followed by optional parameters.

### Document Operations
| Command | Shortcut | Description |
|---------|----------|-------------|
| Create New | `:n [title]` | Create a new document with optional title |
| Save | `:s` | Save current document |
| Open | `:o [search]` | Open a document with optional search filter |
| Delete | `:del` | Delete current document (with confirmation) |
| Info | `:i` | Show document information and statistics |

**Examples:**
- `:n My Epic Fantasy Novel` - Creates document with title
- `:n` - Creates untitled document
- `:o dragon` - Opens document picker filtered by "dragon"

### Navigation & Organization
| Command | Shortcut | Description |
|---------|----------|-------------|
| Documents | `:d [filter]` | Show documents list with optional filter |
| Outline | `:l` | Show document outline/table of contents |
| Search | `:f [query]` | Search across all documents |
| Focus Search | `:fs` | Jump to search tab in Navigator |
| Focus Documents | `:fd` | Jump to documents tab in Navigator |
| Toggle Navigator | `:ts` | Show/hide the sidebar |

**Examples:**
- `:d fantasy` - Shows only documents matching "fantasy"
- `:f magic spells` - Searches for "magic spells" across all documents

### Editor Customization
| Command | Shortcut | Description |
|---------|----------|-------------|
| Width 65ch | `:65` | Set optimal reading width (65 characters) |
| Width 80ch | `:80` | Set standard width (80 characters) |
| Width 90ch | `:90` | Set wide width (90 characters) |
| Zoom In | `:zi` | Increase font size for better readability |
| Zoom Out | `:zo` | Decrease font size |
| Zoom Reset | `:zr` | Reset to default zoom level |
| Editor Info | `:ei` | Show current width and zoom settings |

### Themes & Appearance
| Command | Shortcut | Description |
|---------|----------|-------------|
| Theme | `:t [theme]` | Switch to specific theme (light, dark, fantasy) |
| Toggle Theme | `:tt` | Cycle between available themes |
| Settings | `:se` | Open settings dialog for custom themes |

**Examples:**
- `:t dark` - Switch to dark theme
- `:t fantasy` - Switch to fantasy theme (optimized for genre writers)

### Document Export
| Command | Shortcut | Description |
|---------|----------|-------------|
| Export | `:ex [format]` | Export document in specified format |
| Export Markdown | `:em` | Quick export as .md file |
| Export Text | `:et` | Export as plain text (.txt) |
| Export HTML | `:eh` | Export as HTML for web |
| Export PDF | `:ep` | Export as PDF for printing/sharing |

### Document Management
| Command | Shortcut | Description |
|---------|----------|-------------|
| Tag | `:tag add [name]` | Add tags for organization |
| Untag All | `:ual` | Remove all tags from current document |
| Filter Tagged | `:ft [tag]` | Show documents with specific tag |
| Filter Untagged | `:fu` | Show documents without tags |
| Word Count | `:wc` | Display word and character count |
| Spell Check | `:sp` | Check spelling in current document |

**Examples:**
- `:tag add fantasy adventure` - Adds "fantasy" and "adventure" tags
- `:ft fantasy` - Shows only documents tagged with "fantasy"

## 🐙 GitHub Integration

Fantasy Editor provides seamless GitHub integration for backing up and syncing your documents across devices.

### Getting Started with GitHub

1. **Sign In**: Use `:glo` to authenticate with GitHub
2. **Configure Repository**: Use `:gcf owner repository` to set up sync
3. **Start Writing**: Documents sync automatically in the background

### GitHub Commands
| Command | Shortcut | Description |
|---------|----------|-------------|
| GitHub Login | `:glo` | Sign in to GitHub via secure OAuth |
| GitHub Logout | `:gou` | Sign out and clear tokens |
| GitHub Config | `:gcf owner repo` | Configure sync repository |
| GitHub Status | `:gst` | Check connection and sync status |
| GitHub Sync | `:gsy` | Sync all documents now |
| GitHub Push | `:gpu` | Push current document to GitHub |
| GitHub Pull | `:gpl [filename]` | Pull specific document from GitHub |
| GitHub List | `:gls` | List all documents in GitHub repository |
| GitHub Import | `:gim [url]` | Import document from GitHub URL |

### Setup Example
```
1. :glo                          # Sign in to GitHub
2. :gcf johndoe my-writing-docs  # Configure repository
3. :gsy                          # Sync existing documents
```

### Sync Status Indicators

Look for the sync status in the bottom-right status bar:
- 🟢 **Synced** - Document matches GitHub version
- 🟡 **Out of sync** - Local changes need to be pushed
- 🔴 **Local only** - Document not yet synced to GitHub

### Document Storage in GitHub

Your documents are stored with rich metadata:
- **File Format**: Markdown files with YAML front matter
- **Automatic Naming**: Based on document title and ID
- **Metadata Preserved**: Creation date, tags, word count
- **Git Integration**: Full commit history and version tracking

### Conflict Resolution

If you edit the same document on multiple devices:
1. Fantasy Editor detects conflicts automatically
2. Shows visual diff with local vs. remote changes
3. Choose to keep local, accept remote, or merge both
4. Conflicts are rare with offline-first design

## 🎨 Themes & Customization

Fantasy Editor offers three built-in themes plus custom theme support.

### Built-in Themes

**Light Theme** (`:t light`)
- Clean, bright interface for daytime writing
- High contrast for comfortable reading
- Optimized for focus and minimal distractions

**Dark Theme** (`:t dark`)
- Easy on the eyes for evening writing sessions
- Reduces eye strain in low-light conditions
- Popular with developers and night-owl writers

**Fantasy Theme** (`:t fantasy`)
- Inspired by medieval manuscripts and fantasy novels
- Warm colors and fantasy-appropriate fonts
- Perfect for genre fiction writers

### Custom Themes

Access advanced theme customization via `:se` (settings):
- **Color Schemes**: Customize background, text, and accent colors
- **Typography**: Choose fonts optimized for writing
- **Layout**: Adjust spacing and visual elements
- **Export/Import**: Share custom themes with other users

### Writer-Focused Features

- **65-Character Width**: Scientifically proven optimal reading width
- **Distraction-Free**: No unnecessary UI elements
- **Zoom Controls**: Perfect readability at any screen size
- **Theme Consistency**: All UI elements respect your chosen theme

## 🔍 Search & Organization

Fantasy Editor provides powerful tools for organizing and finding your writing.

### Full-Text Search

Use `:f [query]` to search across all documents:
- **Instant Results**: Real-time search as you type
- **Highlighting**: Search terms highlighted in results
- **Context Preview**: See surrounding text for each match
- **Rank by Relevance**: Most relevant documents appear first

### Document Tags

Organize your work with flexible tagging:
- **Add Tags**: `:tag add fantasy adventure magic`
- **Filter by Tag**: `:ft fantasy` shows only fantasy documents
- **Multiple Tags**: Documents can have unlimited tags
- **Tag Autocomplete**: Suggests existing tags as you type

### Navigator Sidebar

Access via `:d`, `:l`, or `:fs` to open specific tabs:

**Documents Tab** (`:d`)
- **Recent**: Last 3 accessed documents
- **Previous**: All other documents sorted by modification date
- **Smart Filtering**: Type to filter documents instantly
- **Quick Access**: Click any document to open immediately

**Outline Tab** (`:l`)
- **Live Updates**: Outline updates as you write
- **Clickable Navigation**: Jump to any section instantly
- **Markdown Headers**: Automatically detects # headers
- **Nested Structure**: Shows document hierarchy clearly

**Search Tab** (`:fs`)
- **Advanced Search**: Full-text search with filters
- **Search History**: Previous searches readily available
- **Result Context**: See where matches appear in documents
- **Quick Open**: Open matching documents with one click

## 💾 Data & Privacy

Fantasy Editor is designed with your privacy and data security as top priorities.

### Offline-First Design

- **Local Storage**: All documents stored in your browser's IndexedDB
- **Full Offline Access**: Complete functionality without internet
- **Background Sync**: Syncs with GitHub when connection available
- **No Data Loss**: Documents safe even if GitHub is unavailable

### Data Ownership

- **Your Documents**: You own all content created in Fantasy Editor
- **Open Source**: AGPL-3.0 license ensures transparency
- **GitHub Integration**: Your choice to enable cloud sync
- **Export Freedom**: Export documents in standard formats anytime

### Security Features

- **Client-Side Encryption**: Sensitive data encrypted in browser
- **Secure OAuth**: GitHub authentication via encrypted proxy
- **No Tracking**: Fantasy Editor doesn't track your usage
- **Session-Only Tokens**: GitHub tokens cleared when you close browser

## 🛟 Tips & Troubleshooting

### Writing Productivity Tips

1. **Use Optimal Width**: `:65` provides the most comfortable reading experience
2. **Organize with Tags**: Tag documents by project, genre, or status
3. **Quick Navigation**: `:d project-name` to filter to specific project
4. **Regular Sync**: Use `:gsy` periodically to backup your work
5. **Distraction-Free**: Use `:ts` to hide Navigator when deep writing

### Common Issues

**GitHub Authentication Problems**
- Try `:gou` then `:glo` to re-authenticate
- Check that popup blockers aren't preventing OAuth window
- Verify your GitHub account has necessary repository permissions

**Sync Status Issues**
- Use `:gst` to check current connection status
- `:gsy` forces immediate sync of all documents
- Check internet connection if status shows offline

**Performance Issues**
- Large documents (>1MB) may impact performance
- Try `:zr` to reset zoom if interface feels sluggish
- Clear browser cache if startup is slow

**Theme or Display Issues**
- Try `:tt` to cycle themes if display looks incorrect
- Use `:ei` to check current zoom/width settings
- Settings dialog (`:se`) can reset to defaults

### Keyboard Shortcuts Reminder

Remember: **Only `Ctrl+Space` is used**
- No browser shortcut conflicts (Ctrl+K, Ctrl+F, etc.)
- One shortcut to learn, unlimited functionality
- Type colon commands for instant access
- ESC closes command palette anytime

## 🎯 Advanced Features

### System Commands
| Command | Shortcut | Description |
|---------|----------|-------------|
| Help | `:h` | Open help documentation |
| Version | `:v` | Show version and release notes |
| Statistics | `:st` | Show detailed writing statistics |
| Refresh | `:r` | Refresh the application |
| Settings | `:se` | Open settings dialog |

### Power User Tips

**Command Chaining**: Execute multiple commands quickly by keeping command palette open with repeated `Ctrl+Space`

**Search Workflows**:
- `:f keyword` → Find content
- `:d keyword` → Find documents
- `:tag keyword` → Filter by tags

**GitHub Workflows**:
- `:gsy` → `:gst` → Check sync completed successfully
- `:gim url` → `:gsy` → Import and sync new content
- `:gpu` → `:gst` → Push specific document and verify

**Theme Switching**: Use `:tt` to quickly cycle between light/dark themes based on time of day

## 📞 Getting Help

### In-App Resources
- **Help Command**: `:h` opens comprehensive help
- **Version Info**: `:v` shows current version and changes
- **Settings**: `:se` for customization options
- **Status Check**: `:gst` for GitHub integration status

### Documentation
- **User Guide**: This document (you're reading it!)
- **Technical Docs**: See docs/README.md for developer resources
- **GitHub Integration**: Detailed OAuth and sync documentation

### Support Channels
- **Bug Reports**: Submit via project GitHub repository
- **Feature Requests**: Use GitHub issues with feature label
- **Community**: Check project discussions for tips and tricks

---

*Fantasy Editor v0.0.2 (Alpha) - Write your epic tales with focus and clarity*

**Remember**: `Ctrl+Space` is your gateway to everything. When in doubt, press it and explore!