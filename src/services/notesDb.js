import * as SQLite from 'expo-sqlite';
import {
  isNativeModuleAvailable,
  createDatabaseBackupAsync,
  performSafeRepairAsync,
  repairDatabaseAsync,
  syncNotesToOverlayAsync,
  getPendingOverlayMutationsAsync,
  clearPendingOverlayMutationsAsync,
  getPendingOverlayNotesAsync,
  clearPendingOverlayNotesAsync,
} from '../../modules/floating-dot-overlay';

const DB_NAME = 'dotynotes.db';
let dbInstance = null;

/**
 * Get or open the singleton SQLite database instance.
 * Exclusively owned by expo-sqlite (libexpo-sqlite.so).
 */
export async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
}

/**
 * Closes and clears the cached database instance.
 * Safe to call when preparing to perform native file operations or reset.
 */
export async function closeDatabaseAsync() {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch (_) {}
    dbInstance = null;
  }
}

/**
 * Setup database schema and performance indexes.
 *
 * Does NOT run PRAGMA integrity_check or PRAGMA wal_checkpoint here.
 * A checkpoint cannot repair a malformed WAL, and integrity_check must
 * never run in the blocking startup path. Both must only run after the
 * database has been confirmed to open and respond correctly.
 */
async function setupSchema(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      colorSchemeId TEXT NOT NULL DEFAULT 'purple',
      tag TEXT DEFAULT 'General',
      isPinned INTEGER NOT NULL DEFAULT 0,
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes (isPinned);
    CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes (isArchived);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updatedAt DESC);
  `);
}

/**
 * Runs PRAGMA integrity_check asynchronously after startup — safe to call
 * once the schema has been confirmed. Never blocks the hot startup path.
 */
async function runIntegrityCheckAsync(db) {
  try {
    const checkRow = await db.getFirstAsync('PRAGMA integrity_check;');
    const result = checkRow?.integrity_check || Object.values(checkRow || {})[0];
    console.log('[DotyNotes DB] Post-startup integrity check:', result);
    if (result && result.toLowerCase() !== 'ok') {
      console.warn('[DotyNotes DB] Integrity check found issues:', result);
    }
  } catch (e) {
    console.warn('[DotyNotes DB] Post-startup integrity check warning:', e.message);
  }
}

let isFlushingMutations = false;

/**
 * Ingests all pending overlay mutations (creations, updates, deletions) into SQLite.
 * Single source of truth: all persistent mutations land in dotynotes.db.
 */
export async function flushPendingOverlayMutations(dbTarget) {
  if (!isNativeModuleAvailable || isFlushingMutations) return;
  isFlushingMutations = true;
  try {
    const mutations = await getPendingOverlayMutationsAsync();
    const db = dbTarget || (await getDatabase());
    let hasChanges = false;

    // 1. Process pending deletions
    if (Array.isArray(mutations.deletions) && mutations.deletions.length > 0) {
      console.log(`[DotyNotes DB] Processing ${mutations.deletions.length} pending deletion(s)...`);
      for (const id of mutations.deletions) {
        if (!id) continue;
        await db.runAsync(`DELETE FROM notes WHERE id = ?;`, [id]);
      }
      hasChanges = true;
    }

    // 2. Process pending note creations / updates
    if (Array.isArray(mutations.notes) && mutations.notes.length > 0) {
      console.log(`[DotyNotes DB] Ingesting ${mutations.notes.length} pending note(s) from overlay...`);
      for (const note of mutations.notes) {
        if (!note.id) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            note.id,
            note.title || 'Quick Note',
            note.content || '',
            note.colorSchemeId || 'purple',
            note.tag || 'Floating',
            note.isPinned ? 1 : 0,
            note.isArchived ? 1 : 0,
            Number(note.createdAt) || Date.now(),
            Number(note.updatedAt) || Date.now(),
          ]
        );
      }
      hasChanges = true;
    }

    // Also check legacy pending queue if present
    const legacyPendingJson = await getPendingOverlayNotesAsync();
    if (legacyPendingJson && legacyPendingJson !== '[]') {
      try {
        const legacyNotes = JSON.parse(legacyPendingJson);
        if (Array.isArray(legacyNotes) && legacyNotes.length > 0) {
          for (const note of legacyNotes) {
            if (!note.id) continue;
            await db.runAsync(
              `INSERT OR REPLACE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                note.id,
                note.title || 'Quick Note',
                note.content || '',
                note.colorSchemeId || 'purple',
                note.tag || 'Floating',
                note.isPinned ? 1 : 0,
                note.isArchived ? 1 : 0,
                Number(note.createdAt) || Date.now(),
                Number(note.updatedAt) || Date.now(),
              ]
            );
          }
          await clearPendingOverlayNotesAsync();
          hasChanges = true;
        }
      } catch (_) {}
    }

    if (hasChanges) {
      await clearPendingOverlayMutationsAsync();
      console.log('[DotyNotes DB] Staging queues cleared; syncing latest state back to overlay...');
      await syncRecentNotesToOverlay(db);
    }
  } catch (e) {
    console.warn('[DotyNotes DB] Failed to flush pending overlay mutations:', e.message);
  } finally {
    isFlushingMutations = false;
  }
}

// Keep legacy alias for existing calls
export const flushPendingOverlayNotes = flushPendingOverlayMutations;

/**
 * Synchronizes recent notes to the native overlay cache for instant access without SQLite locks.
 */
export async function syncRecentNotesToOverlay(dbTarget) {
  if (!isNativeModuleAvailable) return;
  try {
    const db = dbTarget || (await getDatabase());
    const rows = await db.getAllAsync(
      `SELECT id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt
       FROM notes WHERE isArchived = 0 ORDER BY isPinned DESC, updatedAt DESC LIMIT 10;`
    );
    await syncNotesToOverlayAsync(rows);
  } catch (e) {
    console.warn('[DotyNotes DB] Could not sync notes to overlay cache:', e.message);
  }
}

/**
 * Initialize the database schema safely with automated data-preserving recovery.
 */
export async function initDatabase() {
  let db;

  // ── Attempt 1: Normal open ────────────────────────────────────────────
  try {
    db = await getDatabase();
    await setupSchema(db);
  } catch (firstErr) {
    console.warn('[DotyNotes DB] First open attempt failed:', firstErr.message);
    await closeDatabaseAsync();

    const isMalformed = firstErr.message?.toLowerCase().includes('malformed') ||
                        firstErr.message?.toLowerCase().includes('corrupt');

    if (isNativeModuleAvailable && isMalformed) {
      console.log('[DotyNotes DB] Detected database corruption. Initiating safe data-recovery repair...');
      const repairReport = await performSafeRepairAsync();
      console.log('[DotyNotes DB] Recovery report:', JSON.stringify(repairReport));

      try {
        db = await getDatabase();
        await setupSchema(db);

        // Restore harvested notes if present
        if (repairReport.recoveredNotesJson) {
          try {
            const recovered = JSON.parse(repairReport.recoveredNotesJson);
            if (Array.isArray(recovered) && recovered.length > 0) {
              console.log(`[DotyNotes DB] Restoring ${recovered.length} recovered note(s)...`);
              for (const note of recovered) {
                if (!note.id) continue;
                await db.runAsync(
                  `INSERT OR REPLACE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    note.id,
                    note.title || 'Quick Note',
                    note.content || '',
                    note.colorSchemeId || 'purple',
                    note.tag || 'General',
                    note.isPinned ? 1 : 0,
                    note.isArchived ? 1 : 0,
                    Number(note.createdAt) || Date.now(),
                    Number(note.updatedAt) || Date.now(),
                  ]
                );
              }
              console.log('[DotyNotes DB] All recovered notes successfully restored to database');
            }
          } catch (jsonErr) {
            console.warn('[DotyNotes DB] Failed parsing recovered notes JSON:', jsonErr.message);
          }
        }
      } catch (postRepairErr) {
        console.error('[DotyNotes DB] Failed reopening database after repair:', postRepairErr.message);
        throw postRepairErr;
      }
    } else {
      // Retry once after connection reset
      try {
        console.log('[DotyNotes DB] Retrying database open after connection reset...');
        db = await getDatabase();
        await setupSchema(db);
      } catch (retryErr) {
        await closeDatabaseAsync();
        let backupLocation = null;
        if (isNativeModuleAvailable) {
          try {
            backupLocation = await createDatabaseBackupAsync();
          } catch (_) {}
        }
        const recoveryError = new Error(
          'SQLite database cannot be opened. Original files are preserved.\n' +
          'Error: ' + retryErr.message
        );
        recoveryError.code = 'DB_NEEDS_REPAIR';
        recoveryError.backupLocation = backupLocation;
        throw recoveryError;
      }
    }
  }

  // Ingest any notes / deletions captured in the floating overlay
  await flushPendingOverlayMutations(db);

  // Seed welcome notes ONLY on a fresh installation, NEVER over recoverable user data
  const metaRow = await db.getFirstAsync("SELECT value FROM app_metadata WHERE key = 'has_seeded_initial_notes';");
  if (!metaRow) {
    const countRow = await db.getFirstAsync('SELECT COUNT(*) as count FROM notes;');
    if (countRow && countRow.count === 0) {
      await seedInitialNotes(db);
    } else {
      // Notes already exist; mark seeded so it never triggers
      await db.runAsync("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('has_seeded_initial_notes', '1');");
    }
  }

  // Update overlay cache with latest notes
  await syncRecentNotesToOverlay(db);

  // Run integrity check asynchronously after startup — never in the hot path
  setTimeout(() => runIntegrityCheckAsync(db), 0);

  return db;
}

/**
 * Seeds a few helpful welcome notes into the SQLite database on first launch.
 */
async function seedInitialNotes(db) {
  const now = Date.now();
  const initialNotes = [
    {
      id: 'welcome-1',
      title: 'Welcome to DotyNotes! 👋',
      content: 'DotyNotes is your offline-first floating quick notes companion. All your notes are saved directly in local SQLite.',
      colorSchemeId: 'purple',
      tag: 'Welcome',
      isPinned: 1,
      isArchived: 0,
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
    },
    {
      id: 'welcome-2',
      title: 'Quick Tips & Gestures 💡',
      content: '• Tap any note card to view or edit\n• Use the search bar to filter by title, body, or tag\n• Switch tabs to view Pinned or Archived notes\n• Use the Floating Dot to quickly take notes from any app!',
      colorSchemeId: 'mint',
      tag: 'Tips',
      isPinned: 1,
      isArchived: 0,
      createdAt: now - 7200000,
      updatedAt: now - 7200000,
    },
    {
      id: 'welcome-3',
      title: 'Offline & Private 🔒',
      content: 'Your notes never leave this device. No cloud sync, no tracking, instant fast access anywhere.',
      colorSchemeId: 'yellow',
      tag: 'Privacy',
      isPinned: 0,
      isArchived: 0,
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
    },
  ];

  for (const n of initialNotes) {
    await db.runAsync(
      `INSERT INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [n.id, n.title, n.content, n.colorSchemeId, n.tag, n.isPinned, n.isArchived, n.createdAt, n.updatedAt]
    );
  }

  // Mark initial notes as seeded in persistent metadata
  await db.runAsync(
    `INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('has_seeded_initial_notes', '1');`
  );
}

/**
 * Load all notes from SQLite, ordered with pinned notes first, then latest updated.
 */
export async function getAllNotesAsync() {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM notes ORDER BY isPinned DESC, updatedAt DESC;`
  );

  return rows.map(formatNoteRow);
}

/**
 * Create a new note and persist it to SQLite.
 */
export async function createNoteAsync({
  title,
  content,
  colorSchemeId = 'purple',
  tag = 'General',
  isPinned = false,
  isArchived = false,
}) {
  const db = await getDatabase();
  const id = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title.trim() || 'Untitled Note',
      content.trim() || '',
      colorSchemeId,
      tag.trim() || 'General',
      isPinned ? 1 : 0,
      isArchived ? 1 : 0,
      now,
      now,
    ]
  );

  await syncRecentNotesToOverlay(db);
  return getNoteByIdAsync(id);
}

/**
 * Fetch a single note by ID.
 */
export async function getNoteByIdAsync(id) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM notes WHERE id = ?;`,
    [id]
  );
  return row ? formatNoteRow(row) : null;
}

/**
 * Update an existing note in SQLite.
 */
export async function updateNoteAsync(id, {
  title,
  content,
  colorSchemeId,
  tag,
  isPinned,
  isArchived,
}) {
  const db = await getDatabase();
  const now = Date.now();

  await db.runAsync(
    `UPDATE notes
     SET title = ?, content = ?, colorSchemeId = ?, tag = ?, isPinned = ?, isArchived = ?, updatedAt = ?
     WHERE id = ?;`,
    [
      title.trim() || 'Untitled Note',
      content.trim() || '',
      colorSchemeId || 'purple',
      tag.trim() || 'General',
      isPinned ? 1 : 0,
      isArchived ? 1 : 0,
      now,
      id,
    ]
  );

  await syncRecentNotesToOverlay(db);
  return getNoteByIdAsync(id);
}

/**
 * Toggle note pinned status in SQLite.
 */
export async function togglePinNoteAsync(id, currentPinned) {
  const db = await getDatabase();
  const newPinned = currentPinned ? 0 : 1;
  const now = Date.now();

  await db.runAsync(
    `UPDATE notes SET isPinned = ?, updatedAt = ? WHERE id = ?;`,
    [newPinned, now, id]
  );

  await syncRecentNotesToOverlay(db);
  return getNoteByIdAsync(id);
}

/**
 * Toggle note archive status in SQLite.
 */
export async function toggleArchiveNoteAsync(id, currentArchived) {
  const db = await getDatabase();
  const newArchived = currentArchived ? 0 : 1;
  const now = Date.now();

  await db.runAsync(
    `UPDATE notes SET isArchived = ?, updatedAt = ? WHERE id = ?;`,
    [newArchived, now, id]
  );

  await syncRecentNotesToOverlay(db);
  return getNoteByIdAsync(id);
}

/**
 * Delete a note permanently from SQLite.
 */
export async function deleteNoteAsync(id) {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM notes WHERE id = ?;`,
    [id]
  );
  await syncRecentNotesToOverlay(db);
  return true;
}

/**
 * Converts a database row into standard app note object.
 */
function formatNoteRow(row) {
  const updatedAt = Number(row.updatedAt) || Date.now();
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    colorSchemeId: row.colorSchemeId || 'purple',
    tag: row.tag || 'General',
    isPinned: Boolean(row.isPinned),
    isArchived: Boolean(row.isArchived),
    createdAt: Number(row.createdAt) || Date.now(),
    updatedAt: updatedAt,
    dateLabel: formatNoteDate(updatedAt),
  };
}

/**
 * Helper to display human-readable note update dates.
 */
export function formatNoteDate(timestamp) {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Exports all user notes as a structured, versioned JSON payload.
 * Useful for local backups, sharing, and disaster recovery.
 */
export async function exportAllNotesToJsonAsync() {
  const db = await getDatabase();
  const allNotes = await db.getAllAsync('SELECT * FROM notes ORDER BY createdAt ASC;');
  const exportPayload = {
    version: 1,
    appName: 'DotyNotes',
    storageEngine: 'expo-sqlite (WAL)',
    exportedAt: Date.now(),
    totalNotes: allNotes.length,
    notes: allNotes.map(formatNoteRow),
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Restores notes from a JSON backup payload.
 * Preserves all note IDs, timestamps, colors, tags, and pin/archive states.
 */
export async function importNotesFromJsonAsync(jsonStringOrObject) {
  const payload = typeof jsonStringOrObject === 'string'
    ? JSON.parse(jsonStringOrObject)
    : jsonStringOrObject;

  if (!payload || !Array.isArray(payload.notes)) {
    throw new Error('Invalid backup file format: missing notes array');
  }

  const db = await getDatabase();
  let importedCount = 0;

  for (const note of payload.notes) {
    if (!note.id || !note.title) continue;
    await db.runAsync(
      `INSERT OR REPLACE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.title,
        note.content || '',
        note.colorSchemeId || 'purple',
        note.tag || 'General',
        note.isPinned ? 1 : 0,
        note.isArchived ? 1 : 0,
        Number(note.createdAt) || Date.now(),
        Number(note.updatedAt) || Date.now(),
      ]
    );
    importedCount++;
  }

  // Ensure metadata marks database as active
  await db.runAsync(
    `INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('has_seeded_initial_notes', '1');`
  );

  await syncRecentNotesToOverlay(db);
  return { success: true, importedCount };
}
