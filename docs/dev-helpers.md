# 🛠️ Development Helpers

Console utilities for manual regression testing and development.

## Quick Start

1. Open Fantasy Editor at `http://localhost:3000/`
2. Open browser console (F12)
3. Use the available helpers:

```javascript
// Show help
devHelpers.help()

// Clean all storage (useful for fresh testing)
devHelpers.cleanStorage()

// Clean storage and reload page
devHelpers.freshStart()

// Generate test documents
devHelpers.generateTestDocuments(5)

// Show current storage info
devHelpers.showStorageInfo()

// Test document CRUD operations
devHelpers.testDocumentOperations()
```

## Available Methods

### `devHelpers.cleanStorage()`

Cleans all storage including:

- localStorage
- sessionStorage  
- IndexedDB databases
- Service worker caches

**Use case:** Reset to clean state for testing

### `devHelpers.freshStart()`

Combines `cleanStorage()` with automatic page reload after 2 seconds.

**Use case:** Quick reset during development

### `devHelpers.generateTestDocuments(count = 5)`

Creates test documents with:

- GUID-based IDs
- Sample content including code blocks
- Different tags for testing
- Varying content lengths

**Use case:** Populate app with test data

### `devHelpers.showStorageInfo()`

Displays comprehensive storage information:

- Storage statistics table
- Documents table with ID types (GUID vs Legacy)
- localStorage contents
- Document counts and sizes

**Use case:** Debug storage state

### `devHelpers.testDocumentOperations()`

Runs automated test of all CRUD operations:

1. Create document
2. Update document  
3. Retrieve document
4. Search documents
5. Delete document

**Use case:** Verify storage system functionality

## Example Testing Workflow

```javascript
// 1. Start fresh
devHelpers.freshStart()

// 2. After reload, generate test data
devHelpers.generateTestDocuments(3)

// 3. Check current state
devHelpers.showStorageInfo()

// 4. Test operations
devHelpers.testDocumentOperations()

// 5. Clean up when done
devHelpers.cleanStorage()
```

## GUID System Testing

The helpers automatically work with the GUID system:

- All test documents use proper GUID IDs
- Storage info shows ID types (GUID vs Legacy)
- Operations test the full GUID workflow
- Filename generation is tested

## Note

Dev helpers are automatically initialized when the app loads. They're available in the global `window.devHelpers` object for easy console access.
