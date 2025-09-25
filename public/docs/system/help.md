# Fantasy Editor Help

**Version 0.0.1 (Alpha)**

Welcome to Fantasy Editor - a distraction-free, keyboard-first markdown editor for writers.

## 🚀 Getting Started

Fantasy Editor uses a revolutionary command-based interface:
1. Press `Ctrl+Space` to open the command palette
2. Type colon commands like `:n My Story` to create a new document
3. Use `:glo` to connect GitHub, `:t dark` for dark theme
4. The magic key `Ctrl+Space` is your gateway to everything!

## Key Features

- **Markdown Editing** - Full markdown support with live preview
- **Command Palette** - Access all features through `Ctrl+Space`
- **Multiple Themes** - Light, Dark, and Fantasy themes
- **GitHub Integration** - Sync your documents with GitHub
- **Offline Support** - Works without internet connection
- **Full-text Search** - Search across all your documents

## Essential Commands

### File Operations
| Command | Shortcut | Description |
|---------|----------|-------------|
| New | `:n` | Create a new document |
| Save | `:s` | Save current document |
| Open | `:o` | Open a document |
| Delete | `:del` | Delete current document |

### Editing
| Command | Shortcut | Description |
|---------|----------|-------------|
| Undo | `:u` | Undo last change |
| Redo | `:r` | Redo last change |
| Find | `:f` | Search in documents |
| Find & Replace | `:fr` | Find and replace text |

### View & Navigation
| Command | Shortcut | Description |
|---------|----------|-------------|
| Documents | `:d` | Show documents list |
| Outline | `:l` | Show document outline |
| Toggle Navigator | `:ts` | Toggle sidebar |
| Zoom In | `:zi` | Increase editor font size |
| Zoom Out | `:zo` | Decrease editor font size |
| Zoom Reset | `:zr` | Reset to default size |

### Width Control
| Command | Shortcut | Description |
|---------|----------|-------------|
| Width 65ch | `:65` | Set editor width to 65 characters (optimal) |
| Width 80ch | `:80` | Set editor width to 80 characters |
| Width 90ch | `:90` | Set editor width to 90 characters |
| Editor Info | `:ei` | Show current width and zoom settings |

### Themes
| Command | Shortcut | Description |
|---------|----------|-------------|
| Theme | `:t` | Change theme |
| Toggle Theme | `:tt` | Toggle between themes |

### Export Options
| Command | Shortcut | Description |
|---------|----------|-------------|
| Export Text | `:et` | Export as plain text |
| Export HTML | `:eh` | Export as HTML |
| Export PDF | `:ep` | Export as PDF |

### Document Management
| Command | Shortcut | Description |
|---------|----------|-------------|
| Tag | `:tag` | Manage document tags |
| Readonly | `:ro` | Make document readonly |
| Read-write | `:rw` | Make document editable |

### GitHub Integration
| Command | Shortcut | Description |
|---------|----------|-------------|
| GitHub Login | `:glo` | Login to GitHub |
| GitHub Logout | `:gou` | Logout from GitHub |
| GitHub Config | `:gcf` | Configure repository |
| GitHub Push | `:gpu` | Push changes to GitHub |
| GitHub Sync | `:gsy` | Sync with GitHub |
| GitHub Status | `:gst` | Check sync status |

### System Documents
| Command | Shortcut | Description |
|---------|----------|-------------|
| Help | `:help` | Open this help document |
| License | `:license` | View AGPL v3 license |
| Privacy | `:privacy` | View privacy policy |
| EULA | `:eula` | View end user license agreement |
| Release Notes | `:release` | View release notes |

## Tips & Tricks

1. **Quick Navigation** - Use `:d` to quickly jump between documents
2. **Fast Search** - Use `:f` followed by your search term
3. **Tag Organization** - Use `:tag add <name>` to organize documents
4. **Auto-save** - Documents save automatically as you type
5. **Offline First** - All documents stored locally, sync when online

## Keyboard Shortcuts

All commands are accessed through `Ctrl+Space` followed by the command shortcut. This design avoids conflicts with browser shortcuts and provides a consistent interface.

## 📖 More Help & Documentation

For detailed guides and technical information:
- **Complete User Guide** - Comprehensive feature documentation
- **Developer Guide** - Technical development and architecture
- **Workers Guide** - Cloudflare Workers and OAuth setup
- **Security Guide** - Security implementation details
- **Legal Documentation** - Full license, privacy, and legal terms

Access the complete documentation through the project repository.

## 💡 Writing Tips

1. **Start Simple** - Try `:n My First Story` to create your first document
2. **Use Optimal Width** - `:65` provides the most comfortable reading experience
3. **Organize with Tags** - `:tag add fantasy adventure` to organize your work
4. **GitHub Backup** - `:glo` then `:gcf username repo` for cloud sync
5. **Quick Navigation** - `:d` to jump between documents, `:f` to search

## 🆘 Troubleshooting

**Command palette not working?**
- Ensure you're pressing `Ctrl+Space` (not other shortcuts)
- Click in the editor area first to ensure proper focus

**GitHub sync issues?**
- Try `:gou` then `:glo` to re-authenticate
- Use `:gst` to check current connection and sync status

## 📞 Support

**Fantasy Editor v0.0.1 (Alpha)**
- All features free during alpha period
- Report issues via project repository
- Community support available

---

*Fantasy Editor - Write your epic tales with focus and clarity*

**Remember**: `Ctrl+Space` is your magic key to everything!