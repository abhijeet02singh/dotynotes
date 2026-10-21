import * as SQLite from 'expo-sqlite';
import {
  isNativeModuleAvailable,
  repairDatabaseAsync,
  syncNotesToOverlayAsync,
  getPendingOverlayNotesAsync,
  clearPendingOverlayNotesAsync,
} from '../../modules/floating-dot-overlay';

const DB_NAME = 'dotynotes.db';
let dbInstance = null;

/**
 * Get or open the singleton SQLite database instance.
 */
export async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
}

/**
 * Setup database schema and performance indexes safely.
 * Does NOT run integrity_check here — that belongs in a post-startup
 * diagnostic, not in the blocking startup hot path.
 */
async function setupSchema(db) {
  // Checkpoint any pending WAL frames into the main database file first.
  // This consolidates any frames written by a previous session before we
  // set journal_mode, preventing stale WAL frame accumulation.
  try {
    await db.runAsync('PRAGMA wal_checkpoint(TRUNCATE);');
    console.log('[DotyNotes DB] WAL checkpoint completed');
  } catch (e) {
    // Non-fatal: WAL may be empty or not yet in use
    console.log('[DotyNotes DB] WAL checkpoint skipped:', e.message);
  }

  // Set WAL mode and create schema tables/indexes
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

/**
 * Flushes any notes captured by the floating overlay into the SQLite database.
 */
export async function flushPendingOverlayNotes(dbTarget) {
  if (!isNativeModuleAvailable) return;
  try {
    const pendingJson = await getPendingOverlayNotesAsync();
    if (!pendingJson || pendingJson === '[]') return;

    const pendingNotes = JSON.parse(pendingJson);
    if (!Array.isArray(pendingNotes) || pendingNotes.length === 0) return;

    console.log(`[DotyNotes DB] Ingesting ${pendingNotes.length} pending note(s) from overlay...`);
    const db = dbTarget || (await getDatabase());

    for (const note of pendingNotes) {
      if (!note.id) continue;
      await db.runAsync(
        `INSERT OR IGNORE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt)
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
    console.log('[DotyNotes DB] Pending overlay notes ingested and staging queue cleared');
    await syncRecentNotesToOverlay(db);
  } catch (e) {
    console.warn('[DotyNotes DB] Failed to flush pending overlay notes:', e.message);
  }
}

/**
 * Synchronizes recent notes to the native overlay cache for instant access without SQLite locks.
 */
export async function syncRecentNotesToOverlay(dbTarget) {
  if (!isNativeModuleAvailable) return;
  try {
    const db = dbTarget || (await getDatabase());
    const rows = await db.getAllAsync(
      `SELECT id, title, content, colorSchemeId, tag, isPinned, isArchived, updatedAt
       FROM notes WHERE isArchived = 0 ORDER BY isPinned DESC, updatedAt DESC LIMIT 5;`
    );
    await syncNotesToOverlayAsync(rows);
  } catch (e) {
    console.warn('[DotyNotes DB] Could not sync notes to overlay cache:', e.message);
  }
}

/**
 * Initialize the database schema safely.
 *
 * Strategy:
 *  1. Try to open + setup schema normally.
 *  2. On any failure, close the cached connection and retry once.
 *     This resolves transient WAL lock errors without triggering repair.
 *  3. Only if the retry also fails AND the native module is available,
 *     invoke repairDatabase() which safely deletes stale WAL/SHM files
 *     (using expo-sqlite, not Android system SQLite) so expo-sqlite can
 *     re-open the main .db cleanly.
 *  4. Run a post-startup integrity check asynchronously — never in the
 *     blocking startup path.
 */
export async function initDatabase() {
  let db;

  // ── Attempt 1: Normal open ────────────────────────────────────────────
  try {
    db = await getDatabase();
    await setupSchema(db);
  } catch (firstErr) {
    console.warn('[DotyNotes DB] First open attempt failed:', firstErr.message);

    // Close and discard the possibly-corrupt cached connection before retrying
    if (dbInstance) {
      try { await dbInstance.closeAsync(); } catch (_) {}
      dbInstance = null;
    }

    // ── Attempt 2: Retry once (resolves transient WAL lock races) ─────
    try {
      console.log('[DotyNotes DB] Retrying database open after connection reset...');
      db = await getDatabase();
      await setupSchema(db);
      console.log('[DotyNotes DB] Retry succeeded');
    } catch (retryErr) {
      console.warn('[DotyNotes DB] Retry also failed:', retryErr.message);

      // ── Attempt 3: Native repair (deletes stale WAL/SHM only) ────────
      if (isNativeModuleAvailable) {
        console.log('[DotyNotes DB] Invoking native WAL cleanup repair...');
        try {
          const report = await repairDatabaseAsync();
          console.log('[DotyNotes DB] Repair report:', JSON.stringify(report));
        } catch (repairErr) {
          console.error('[DotyNotes DB] Native repair invocation failed:', repairErr.message);
        }

        // Close cached connection again before final open attempt
        if (dbInstance) {
          try { await dbInstance.closeAsync(); } catch (_) {}
          dbInstance = null;
        }

        db = await getDatabase();
        await setupSchema(db);
      } else {
        // Running in Expo Go — native repair unavailable.
        // Expo Go stores SQLite in a sandboxed path per-app; a WAL artifact
        // from a dev build cannot survive across installs. Surface the error.
        console.error('[DotyNotes DB] Cannot repair in Expo Go — native module not available.');
        throw retryErr;
      }
    }
  }

  // Ingest any notes captured in the floating overlay
  await flushPendingOverlayNotes(db);

  // Seed welcome notes on first-ever launch
  const countRow = await db.getFirstAsync('SELECT COUNT(*) as count FROM notes;');
  if (countRow && countRow.count === 0) {
    await seedInitialNotes(db);
  }

  // Update overlay cache with latest notes
  await syncRecentNotesToOverlay(db);

  // Run integrity check asynchronously — never blocks startup
  // (uses setTimeout 0 to push to next event-loop tick)
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
      content: '• Tap any note card to view or edit\n• Use the search bar to filter by title, body, or tag\n• Switch tabs to view Pinned or Archived notes',
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
