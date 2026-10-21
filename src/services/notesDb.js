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
 */
async function setupSchema(db) {
  // Integrity check diagnostic (without exposing user data)
  try {
    const checkRow = await db.getFirstAsync('PRAGMA integrity_check;');
    const result = checkRow?.integrity_check || Object.values(checkRow || {})[0];
    console.log('[DotyNotes DB] SQLite integrity check:', result);
  } catch (e) {
    console.warn('[DotyNotes DB] Integrity check query warning:', e.message);
  }

  // Ensure WAL mode and schema tables/indexes
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
 * Initialize the database schema safely using WAL mode.
 * Automatically detects and repairs malformed database artifacts
 * without data loss.
 */
export async function initDatabase() {
  let db;
  try {
    db = await getDatabase();
    await setupSchema(db);
  } catch (err) {
    console.warn('[DotyNotes DB] Database initialization encountered error:', err.message);

    if (isNativeModuleAvailable) {
      console.log('[DotyNotes DB] Invoking automated native database recovery and WAL normalization...');
      try {
        const report = await repairDatabaseAsync();
        console.log('[DotyNotes DB] Recovery report:', JSON.stringify(report));
      } catch (repairErr) {
        console.error('[DotyNotes DB] Native recovery failed:', repairErr.message);
      }

      // Reset cached connection to cleanly re-open the repaired database
      if (dbInstance) {
        try {
          await dbInstance.closeAsync();
        } catch (_) {}
        dbInstance = null;
      }

      db = await getDatabase();
      await setupSchema(db);
    } else {
      throw err;
    }
  }

  // Ingest any notes captured in the floating overlay
  await flushPendingOverlayNotes(db);

  // Check if first-run starter notes are needed
  const countRow = await db.getFirstAsync('SELECT COUNT(*) as count FROM notes;');
  if (countRow && countRow.count === 0) {
    await seedInitialNotes(db);
  }

  // Update overlay cache
  await syncRecentNotesToOverlay(db);

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
