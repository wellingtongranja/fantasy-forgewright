/**
 * Runtime Debug Logging for Git PULL Operation
 *
 * This module patches the existing methods to add comprehensive logging
 * without modifying the core files that might be auto-formatted.
 */

// Store original methods for restoration
const originalMethods = {};

/**
 * Patch SyncStatusManager.getDocumentSyncStatus to add debug logging
 */
function patchSyncStatusManager(app) {
  if (!app.syncStatusManager) return;

  const manager = app.syncStatusManager;

  // Store original method
  originalMethods.getDocumentSyncStatus = manager.getDocumentSyncStatus.bind(manager);

  // Patch with logging
  manager.getDocumentSyncStatus = function(doc, caller = 'unknown') {
    console.log(`[SYNC-MGR-${caller.toUpperCase()}] getDocumentSyncStatus called for:`, {
      id: doc?.id,
      title: doc?.title,
      lastSyncedAt: doc?.lastSyncedAt,
      'metadata.modified': doc?.metadata?.modified,
      githubSha: doc?.githubSha,
      githubPath: doc?.githubPath
    });

    // Call original method and log result
    const result = originalMethods.getDocumentSyncStatus(doc);

    console.log(`[SYNC-MGR-${caller.toUpperCase()}] Returning status:`, result);

    return result;
  };
}

/**
 * Patch Navigator.getDocumentSyncStatus to add debug logging
 */
function patchNavigator(app) {
  if (!app.navigator?.tabComponents?.documents) return;

  const documentsTab = app.navigator.tabComponents.documents;

  // Store original method
  originalMethods.navigatorGetDocumentSyncStatus = documentsTab.getDocumentSyncStatus.bind(documentsTab);

  // Patch with logging
  documentsTab.getDocumentSyncStatus = function(doc) {
    console.log(`[NAVIGATOR] getDocumentSyncStatus called for doc:`, {
      id: doc?.id,
      title: doc?.title,
      lastSyncedAt: doc?.lastSyncedAt,
      'metadata.modified': doc?.metadata?.modified
    });

    if (this.app.currentDocument && this.app.currentDocument.id === doc.id) {
      console.log(`[NAVIGATOR] Using app.currentDocument for sync status:`, {
        id: this.app.currentDocument.id,
        title: this.app.currentDocument.title,
        lastSyncedAt: this.app.currentDocument.lastSyncedAt,
        'metadata.modified': this.app.currentDocument.metadata?.modified
      });
    }

    // Call original method with logging
    const result = originalMethods.navigatorGetDocumentSyncStatus(doc);

    console.log(`[NAVIGATOR] Returning sync status:`, result);

    return result;
  };

  // Store original updateDocument method
  originalMethods.navigatorUpdateDocument = documentsTab.updateDocument.bind(documentsTab);

  // Patch updateDocument with logging
  documentsTab.updateDocument = async function(docId, updatedDoc) {
    console.log(`[NAVIGATOR] updateDocument called for docId: ${docId}`, {
      isCurrent: this.app.currentDocument && this.app.currentDocument.id === docId,
      'app.currentDocument': this.app.currentDocument ? {
        id: this.app.currentDocument.id,
        title: this.app.currentDocument.title,
        lastSyncedAt: this.app.currentDocument.lastSyncedAt,
        'metadata.modified': this.app.currentDocument.metadata?.modified
      } : null,
      'updatedDoc': updatedDoc ? {
        id: updatedDoc.id,
        title: updatedDoc.title,
        lastSyncedAt: updatedDoc.lastSyncedAt,
        'metadata.modified': updatedDoc.metadata?.modified
      } : null
    });

    // Call original method
    return await originalMethods.navigatorUpdateDocument(docId, updatedDoc);
  };

  // Store original renderDocuments method
  originalMethods.navigatorRenderDocuments = documentsTab.renderDocuments.bind(documentsTab);

  // Patch renderDocuments with logging
  documentsTab.renderDocuments = function() {
    console.log(`[NAVIGATOR] renderDocuments called, documents.length: ${this.documents.length}`);

    // Call original method
    return originalMethods.navigatorRenderDocuments();
  };
}

/**
 * Initialize debug logging by patching methods
 */
function initializeDebugLogging(app) {
  console.log('[DEBUG] Initializing runtime debug logging for Git PULL operations');

  patchSyncStatusManager(app);
  patchNavigator(app);

  console.log('[DEBUG] Debug logging patches applied successfully');
}

/**
 * Restore original methods
 */
function restoreOriginalMethods(app) {
  console.log('[DEBUG] Restoring original methods');

  if (app.syncStatusManager && originalMethods.getDocumentSyncStatus) {
    app.syncStatusManager.getDocumentSyncStatus = originalMethods.getDocumentSyncStatus;
  }

  if (app.navigator?.tabComponents?.documents) {
    const documentsTab = app.navigator.tabComponents.documents;
    if (originalMethods.navigatorGetDocumentSyncStatus) {
      documentsTab.getDocumentSyncStatus = originalMethods.navigatorGetDocumentSyncStatus;
    }
    if (originalMethods.navigatorUpdateDocument) {
      documentsTab.updateDocument = originalMethods.navigatorUpdateDocument;
    }
    if (originalMethods.navigatorRenderDocuments) {
      documentsTab.renderDocuments = originalMethods.navigatorRenderDocuments;
    }
  }

  console.log('[DEBUG] Original methods restored');
}

// Export functions for use in browser console
window.debugRuntime = {
  initializeDebugLogging,
  restoreOriginalMethods
};

console.log('[DEBUG] Runtime debug logging module loaded. Use window.debugRuntime.initializeDebugLogging(app) to enable.');