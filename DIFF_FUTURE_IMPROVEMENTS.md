# Git Diff Future Improvements Backlog

## Current Implementation (Simple)
- `:gdf` toggles unified merge view mode
- Only inline accept/reject buttons (CodeMirror built-in)
- `:gdf` again to exit and keep changes
- `:s` to save, `:gps` to push & sync

## Future Enhancements (Low Priority)

### Enhanced Review UI
- [ ] **Accept All / Reject All buttons** in top review bar
- [ ] **Progress indicator** showing chunks reviewed vs remaining
- [ ] **Save / Close buttons** for explicit workflow control
- [ ] **Visual chunk counter** (e.g., "3 of 8 chunks reviewed")

### Advanced Diff Features
- [ ] **Three-way merge** for complex conflicts
- [ ] **Word-level highlighting** within line changes
- [ ] **Ignore whitespace** toggle option
- [ ] **Collapse unchanged sections** for large files

### UX Improvements
- [ ] **Keyboard shortcuts** for accept/reject (e.g., `Ctrl+A`, `Ctrl+R`)
- [ ] **Jump to next/previous chunk** navigation
- [ ] **Auto-scroll to changes** when entering diff mode
- [ ] **Diff summary view** before entering merge mode

### Workflow Enhancements
- [ ] **Batch review mode** for multiple documents
- [ ] **Change annotations** with review comments
- [ ] **Undo/redo** for accept/reject operations
- [ ] **Preview mode** showing final result before save

## Implementation Notes
- Keep current simple toggle behavior as default
- Enhanced UI should be additive, not replacement
- Maintain focus on writer-friendly UX
- Consider feature flags for advanced users

## Priority: LOW
These improvements are nice-to-have but not essential. Current simple implementation covers 90% of use cases effectively.