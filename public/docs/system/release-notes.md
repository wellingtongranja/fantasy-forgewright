# Release Notes

## Version 0.0.1 (Alpha) - Current Release

**Release Date**: January 2025  
**Status**: Alpha - All features free

### 🎉 Initial Alpha Release

Welcome to the first alpha release of Fantasy Editor! This release establishes the foundation for a powerful, distraction-free writing environment.

### ✨ Core Features

#### Editor
- Full markdown support with CodeMirror 6
- Live markdown syntax highlighting
- Multiple themes (Light, Dark, Fantasy)
- Adjustable editor width (65ch, 80ch, 90ch, full)
- Zoom controls for comfortable reading
- Spell check support
- Find and replace functionality

#### Command System
- VS Code-style command palette (`Ctrl+Space`)
- 50+ commands with colon shortcuts
- Fuzzy search for quick command access
- No keyboard shortcut conflicts

#### Document Management
- Local storage with IndexedDB
- Document tagging system
- Full-text search across documents
- Recent/Previous document organization
- Readonly document support
- System documents (Help, License, etc.)

#### GitHub Integration
- OAuth authentication
- Repository synchronization
- Push/pull documents
- Automatic repository setup
- Real-time sync status indicators

#### User Interface
- Navigator sidebar with tabs
- Documents list with filtering
- Live document outline
- Auto-hide sidebar with pin option
- Responsive design
- Status bar with sync indicators

### 🔧 Technical Details

- **Framework**: Vanilla JavaScript
- **Editor**: CodeMirror 6
- **Storage**: IndexedDB
- **Sync**: GitHub API
- **Build**: Vite
- **PWA**: Service Worker enabled

### 📝 Known Issues

As this is an alpha release, you may encounter some issues:

- GitHub sync may occasionally require re-authentication
- Large documents (>1MB) may impact performance
- Some export formats are still in development
- Mobile experience is functional but not yet optimized

### 🚀 Coming Soon

- Project Gutenberg integration
- Enhanced export options
- Collaborative editing
- Plugin system
- Mobile app
- Advanced themes
- Writing statistics
- Version history

### 💡 Feedback

We'd love to hear from you! Please report bugs and suggest features through our GitHub repository.

### 📜 License

Fantasy Editor is dual-licensed:
- **AGPL v3**: For open source use
- **Commercial License**: Available for proprietary use (coming soon)

During the alpha period, all features are available free of charge.

---

*Thank you for being an early adopter of Fantasy Editor!*