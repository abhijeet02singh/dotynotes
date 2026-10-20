import * as SQLite from 'expo-sqlite';

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
 * Initialize the database schema safely using WAL mode.
 * Creates the notes table and helpful performance indexes.
 * Seeds initial starter notes on first launch if the table is empty.
 */
export async function initDatabase() {
  const db = await getDatabase();

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

  // Check if first-run seeding is needed
  const countRow = await db.getFirstAsync('SELECT COUNT(*) as count FROM notes;');
  if (countRow && countRow.count === 0) {
    await seedInitialNotes(db);
  }

  return db;
}

/**
 * Seeds a few helpful welcome notes into the SQLite database on first launch.
 * These are fully editable, pinnable, and deletable by the user.
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
 * Uses parameterized query.
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
 * Uses parameterized SQL query.
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

  return getNoteByIdAsync(id);
}

/**
 * Fetch a single note by ID.
 * Uses parameterized query.
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
 * Uses parameterized SQL query.
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

  return getNoteByIdAsync(id);
}

/**
 * Toggle note pinned status in SQLite.
 * Uses parameterized SQL query.
 */
export async function togglePinNoteAsync(id, currentPinned) {
  const db = await getDatabase();
  const newPinned = currentPinned ? 0 : 1;
  const now = Date.now();

  await db.runAsync(
    `UPDATE notes SET isPinned = ?, updatedAt = ? WHERE id = ?;`,
    [newPinned, now, id]
  );

  return getNoteByIdAsync(id);
}

/**
 * Toggle note archive status in SQLite.
 * Uses parameterized SQL query.
 */
export async function toggleArchiveNoteAsync(id, currentArchived) {
  const db = await getDatabase();
  const newArchived = currentArchived ? 0 : 1;
  const now = Date.now();

  await db.runAsync(
    `UPDATE notes SET isArchived = ?, updatedAt = ? WHERE id = ?;`,
    [newArchived, now, id]
  );

  return getNoteByIdAsync(id);
}

/**
 * Delete a note permanently from SQLite.
 * Uses parameterized SQL query.
 */
export async function deleteNoteAsync(id) {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM notes WHERE id = ?;`,
    [id]
  );
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
