import * as SQLite from 'expo-sqlite';
import {
  isNativeModuleAvailable,
  createDatabaseBackupAsync,
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
 * Non-destructive strategy:
 *  1. Open the database and run schema setup.
 *  2. If that fails, close the cached connection and retry once.
 *     This resolves transient WAL lock errors without any file modification.
 *  3. If the retry also fails, close the connection, create a native
 *     file-copy backup of the database + WAL + SHM (without modifying
 *     anything), and surface a structured DB_NEEDS_REPAIR error so the
 *     UI can show a recovery prompt.
 *  4. NEVER auto-delete WAL/SHM files, NEVER silently recreate the database.
 *  5. Run a post-startup integrity check asynchronously — never in the
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

    // Close and discard the cached connection before retrying.
    // This resolves transient WAL lock races without any file modification.
    if (dbInstance) {
      try { await dbInstance.closeAsync(); } catch (_) {}
      dbInstance = null;
    }

    // ── Attempt 2: Single retry after connection reset ────────────────
    try {
      console.log('[DotyNotes DB] Retrying database open after connection reset...');
      db = await getDatabase();
      await setupSchema(db);
      console.log('[DotyNotes DB] Retry succeeded');
    } catch (retryErr) {
      // ── Both attempts failed — back up and surface error ─────────────
      // Do NOT delete WAL/SHM. Do NOT recreate the database.
      // Close the connection so the backup is taken consistently.
      if (dbInstance) {
        try { await dbInstance.closeAsync(); } catch (_) {}
        dbInstance = null;
      }

      let backupLocation = null;
      if (isNativeModuleAvailable) {
        try {
          backupLocation = await createDatabaseBackupAsync();
          console.log('[DotyNotes DB] Diagnostic backup created at:', backupLocation);
        } catch (backupErr) {
          console.warn('[DotyNotes DB] Backup creation warning:', backupErr.message);
        }
      } else {
        console.warn('[DotyNotes DB] Native module not available — cannot create backup in Expo Go.');
      }

      // Attach structured context to the thrown error so the UI can
      // display a meaningful recovery prompt to the user.
      const recoveryError = new Error(
        'SQLite database cannot be opened. Original files are preserved.\n' +
        'Error: ' + retryErr.message
      );
      recoveryError.code = 'DB_NEEDS_REPAIR';
      recoveryError.backupLocation = backupLocation;
      throw recoveryError;
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
