import * as SQLite from 'expo-sqlite';
import {
  reconcileScheduledRemindersAsync,
  cancelNoteReminderAsync,
} from './notificationService';
import {
  isNativeModuleAvailable,
  createDatabaseBackupAsync,
  performSafeRepairAsync,
  syncNotesToOverlayAsync,
  getPendingOverlayMutationsAsync,
  clearPendingOverlayMutationsAsync,
  getPendingOverlayNotesAsync,
  clearPendingOverlayNotesAsync,
} from '../../modules/floating-dot-overlay';
import appConfig from '../../app.json';
import {
  BACKUP_FORMAT_VERSION,
  createBackupPayload,
  detectBackupFormat,
  validateBackupPayload,
} from '../utils/backupFormat';

const DB_NAME = 'dotynotes.db';
let dbInstance = null;
let initPromise = null;
let isInitialized = false;
let openDbPromise = null;

/**
 * Open the underlying SQLite database file safely without concurrent handle races.
 */
async function openRawDatabaseAsync() {
  if (dbInstance) return dbInstance;
  if (openDbPromise) return openDbPromise;

  openDbPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      dbInstance = db;
      return db;
    } finally {
      openDbPromise = null;
    }
  })();

  return openDbPromise;
}

/**
 * Get the initialized singleton SQLite database instance.
 * Guarantees schema setup and migrations are completed before returning.
 */
export async function getDatabase() {
  if (isInitialized && dbInstance) {
    return dbInstance;
  }
  return initDatabase();
}

/**
 * Closes and clears the cached database instance.
 * Safe to call when preparing to perform native file operations or reset.
 */
export async function closeDatabaseAsync() {
  isInitialized = false;
  initPromise = null;
  openDbPromise = null;
  if (dbInstance) {
    const dbToClose = dbInstance;
    dbInstance = null;
    try {
      await dbToClose.closeAsync();
    } catch (_) {}
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
  // Step 1: Ensure WAL mode is active
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  } catch (pragmaErr) {
    console.warn('[DotyNotes DB] PRAGMA journal_mode notice:', pragmaErr?.message);
  }

  // Step 2: Ensure core tables and base indexes exist.
  // Note: Do NOT create idx_notes_reminder here because on existing databases
  // the table already exists without the reminderAt column.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      colorSchemeId TEXT NOT NULL DEFAULT 'purple',
      tag TEXT DEFAULT 'General',
      isPinned INTEGER NOT NULL DEFAULT 0,
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      reminderAt INTEGER DEFAULT NULL,
      notificationId TEXT DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes (isPinned);
    CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes (isArchived);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updatedAt DESC);
  `);

  // Step 2: Backward-compatible migration for existing tables:
  // Add missing reminderAt and notificationId columns BEFORE creating dependent indexes or executing queries
  try {
    const tableInfo = await db.getAllAsync('PRAGMA table_info(notes);');
    const columnNames = new Set(tableInfo.map((col) => col.name));

    if (!columnNames.has('reminderAt')) {
      console.log('[DotyNotes DB] Migrating schema: adding reminderAt column...');
      await db.execAsync('ALTER TABLE notes ADD COLUMN reminderAt INTEGER DEFAULT NULL;');
    }
    if (!columnNames.has('notificationId')) {
      console.log('[DotyNotes DB] Migrating schema: adding notificationId column...');
      await db.execAsync('ALTER TABLE notes ADD COLUMN notificationId TEXT DEFAULT NULL;');
    }

    // Step 3: Now that reminderAt is guaranteed to exist on both new and existing tables, create its index safely
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_notes_reminder ON notes (reminderAt);');
  } catch (migErr) {
    console.warn('[DotyNotes DB] Schema migration notice:', migErr.message);
  }
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
        try {
          const row = await db.getFirstAsync('SELECT notificationId FROM notes WHERE id = ?;', [id]);
          if (row?.notificationId) {
            await cancelNoteReminderAsync(row.notificationId);
          }
        } catch (_) {}
        await db.runAsync(`DELETE FROM notes WHERE id = ?;`, [id]);
      }
      hasChanges = true;
    }

    // 2. Process pending note creations / updates
    if (Array.isArray(mutations.notes) && mutations.notes.length > 0) {
      console.log(`[DotyNotes DB] Ingesting ${mutations.notes.length} pending note(s) from overlay...`);
      for (const note of mutations.notes) {
        if (!note.id) continue;
        let reminderAt = note.reminderAt !== undefined ? note.reminderAt : null;
        let notificationId = note.notificationId !== undefined ? note.notificationId : null;
        try {
          const existing = await db.getFirstAsync(
            'SELECT reminderAt, notificationId FROM notes WHERE id = ?;',
            [note.id]
          );
          if (existing) {
            if (reminderAt === null && existing.reminderAt != null) reminderAt = existing.reminderAt;
            if (notificationId === null && existing.notificationId != null) notificationId = existing.notificationId;
          }
        } catch (_) {}

        await db.runAsync(
          `INSERT OR REPLACE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt, reminderAt, notificationId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            reminderAt,
            notificationId,
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
            let reminderAt = null;
            let notificationId = null;
            try {
              const existing = await db.getFirstAsync(
                'SELECT reminderAt, notificationId FROM notes WHERE id = ?;',
                [note.id]
              );
              if (existing) {
                reminderAt = existing.reminderAt;
                notificationId = existing.notificationId;
              }
            } catch (_) {}

            await db.runAsync(
              `INSERT OR REPLACE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt, reminderAt, notificationId)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                reminderAt,
                notificationId,
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
  if (isInitialized && dbInstance) {
    return dbInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    let db;

    // ── Attempt 1: Normal open ────────────────────────────────────────────
    try {
      db = await openRawDatabaseAsync();
      await setupSchema(db);
    } catch (firstErr) {
      console.warn('[DotyNotes DB] First open attempt failed:', firstErr?.message);
      await closeDatabaseAsync();

      const isMalformed = firstErr?.message?.toLowerCase().includes('malformed') ||
                          firstErr?.message?.toLowerCase().includes('corrupt');

      if (isNativeModuleAvailable && isMalformed) {
        console.log('[DotyNotes DB] Detected database corruption. Initiating safe data-recovery repair...');
        const repairReport = await performSafeRepairAsync();
        console.log('[DotyNotes DB] Recovery report:', JSON.stringify(repairReport));

        try {
          db = await openRawDatabaseAsync();
          await setupSchema(db);

          // Restore harvested notes if present
          if (repairReport?.recoveredNotesJson) {
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
              console.warn('[DotyNotes DB] Failed parsing recovered notes JSON:', jsonErr?.message);
            }
          }
        } catch (postRepairErr) {
          console.error('[DotyNotes DB] Failed reopening database after repair:', postRepairErr?.message);
          isInitialized = false;
          dbInstance = null;
          throw postRepairErr;
        }
      } else {
        // Retry once after connection reset
        try {
          console.log('[DotyNotes DB] Retrying database open after connection reset...');
          db = await openRawDatabaseAsync();
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
            'Error: ' + (retryErr?.message || 'Database initialization failed.')
          );
          recoveryError.code = 'DB_NEEDS_REPAIR';
          recoveryError.backupLocation = backupLocation;
          isInitialized = false;
          dbInstance = null;
          throw recoveryError;
        }
      }
    }

    // Ingest any notes / deletions captured in the floating overlay
    await flushPendingOverlayMutations(db);

    // Seed welcome notes ONLY on a fresh installation, NEVER over recoverable user data
    try {
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
    } catch (seedErr) {
      console.warn('[DotyNotes DB] Welcome seed check warning:', seedErr?.message);
    }

    // Update overlay cache with latest notes
    await syncRecentNotesToOverlay(db);

    // Run integrity check asynchronously after startup — never in the hot path
    setTimeout(() => runIntegrityCheckAsync(db), 0);

    // Reconcile scheduled reminder notifications with OS asynchronously without blocking startup
    setTimeout(() => reconcileScheduledRemindersAsync(db), 100);

    isInitialized = true;
    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
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
  id,
  title,
  content,
  colorSchemeId = 'purple',
  tag = 'General',
  isPinned = false,
  isArchived = false,
  reminderAt = null,
  notificationId = null,
} = {}) {
  const db = await getDatabase();
  const noteId = id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const safeTitle = (typeof title === 'string' ? title.trim() : String(title || '')).trim() || 'Untitled Note';
  const safeContent = typeof content === 'string' ? content.trim() : String(content || '');
  const safeTag = (typeof tag === 'string' ? tag.trim() : String(tag || '')).trim() || 'General';
  const safeReminderAt = reminderAt != null && !isNaN(Number(reminderAt)) ? Number(reminderAt) : null;
  const safeNotificationId = notificationId ? String(notificationId) : null;

  await db.runAsync(
    `INSERT INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt, reminderAt, notificationId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      noteId,
      safeTitle,
      safeContent,
      colorSchemeId || 'purple',
      safeTag,
      isPinned ? 1 : 0,
      isArchived ? 1 : 0,
      now,
      now,
      safeReminderAt,
      safeNotificationId,
    ]
  );

  await syncRecentNotesToOverlay(db);
  return getNoteByIdAsync(noteId);
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
 * Safely merges partial updates with current note values to prevent undefined errors.
 */
export async function updateNoteAsync(id, fields = {}) {
  const db = await getDatabase();
  const currentNote = await getNoteByIdAsync(id);
  if (!currentNote) {
    throw new Error(`Note not found: ${id}`);
  }

  const {
    title,
    content,
    colorSchemeId,
    tag,
    isPinned,
    isArchived,
    reminderAt,
    notificationId,
  } = fields;

  const now = Date.now();

  const finalTitle = title !== undefined
    ? ((typeof title === 'string' ? title.trim() : String(title || '')).trim() || 'Untitled Note')
    : currentNote.title;

  const finalContent = content !== undefined
    ? (typeof content === 'string' ? content.trim() : String(content || ''))
    : (currentNote.content || '');

  const finalColorSchemeId = colorSchemeId !== undefined
    ? (colorSchemeId || 'purple')
    : (currentNote.colorSchemeId || 'purple');

  const finalTag = tag !== undefined
    ? ((typeof tag === 'string' ? tag.trim() : String(tag || '')).trim() || 'General')
    : (currentNote.tag || 'General');

  const finalIsPinned = isPinned !== undefined
    ? (isPinned ? 1 : 0)
    : (currentNote.isPinned ? 1 : 0);

  const finalIsArchived = isArchived !== undefined
    ? (isArchived ? 1 : 0)
    : (currentNote.isArchived ? 1 : 0);

  const finalReminderAt = reminderAt !== undefined
    ? (reminderAt != null && !isNaN(Number(reminderAt)) ? Number(reminderAt) : null)
    : (currentNote.reminderAt != null ? Number(currentNote.reminderAt) : null);

  const finalNotificationId = notificationId !== undefined
    ? (notificationId ? String(notificationId) : null)
    : (currentNote.notificationId || null);

  await db.runAsync(
    `UPDATE notes
     SET title = ?, content = ?, colorSchemeId = ?, tag = ?, isPinned = ?, isArchived = ?, updatedAt = ?, reminderAt = ?, notificationId = ?
     WHERE id = ?;`,
    [
      finalTitle,
      finalContent,
      finalColorSchemeId,
      finalTag,
      finalIsPinned,
      finalIsArchived,
      now,
      finalReminderAt,
      finalNotificationId,
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
  const note = await getNoteByIdAsync(id);
  if (note?.notificationId) {
    try {
      await cancelNoteReminderAsync(note.notificationId);
    } catch (_) {}
  }
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
    reminderAt: row.reminderAt != null ? Number(row.reminderAt) : null,
    notificationId: row.notificationId || null,
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
 * Exports all user notes and supported preferences as a structured, versioned JSON payload.
 * Inspired by Flick, compatible with standard JSON parsers and future format migrations.
 */
export async function exportAllNotesToJsonAsync() {
  const db = await getDatabase();
  const allNotes = await db.getAllAsync('SELECT * FROM notes ORDER BY createdAt ASC;');

  // Fetch supported preferences from app_metadata
  const defaultNoteColor = await getSettingAsync('default_note_color', 'purple');
  const defaultReminderTime = await getSettingAsync('default_reminder_time', '09:00 AM');
  const hapticSetting = await getSettingAsync('haptic_feedback_enabled', '1');

  const payload = createBackupPayload({
    notes: allNotes,
    settings: {
      default_note_color: defaultNoteColor,
      default_reminder_time: defaultReminderTime,
      haptic_feedback_enabled: hapticSetting !== '0',
    },
    appName: appConfig?.expo?.name || 'DotyNotes',
    appVersion: appConfig?.expo?.version || '1.0.0',
    createdAt: Date.now(),
  });

  return JSON.stringify(payload, null, 2);
}

/**
 * Safely restores notes and supported preferences from a validated JSON backup payload or string.
 * Supports both the new versioned format (v1) and legacy DotyNotes backups.
 * Preserves all note IDs, timestamps, colors, tags, content, and pin/archive status.
 * Reconciles scheduled reminders with the device OS without duplicate scheduling.
 * Never deletes or resets the SQLite database.
 */
export async function importNotesFromJsonAsync(jsonStringOrObject) {
  const validation = validateBackupPayload(jsonStringOrObject);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid backup payload');
  }

  const { validNotes, validSettings, formatType } = validation;
  const db = await getDatabase();

  let importedCount = 0;
  let updatedCount = 0;
  let newCount = 0;

  // Use transaction if supported by environment for atomic restoration
  const executeRestore = async () => {
    for (const note of validNotes) {
      // Check if note already exists
      const existing = await db.getFirstAsync(
        'SELECT id, reminderAt, notificationId FROM notes WHERE id = ?;',
        [note.id]
      );

      let notificationIdToSave = null;

      if (existing) {
        updatedCount++;
        // If reminder has NOT changed and there is an existing live notificationId, keep it
        if (existing.reminderAt === note.reminderAt && existing.notificationId) {
          notificationIdToSave = existing.notificationId;
        } else if (existing.notificationId) {
          // Reminder changed, cancel old notification so reconciler can schedule fresh one
          try {
            await cancelNoteReminderAsync(existing.notificationId);
          } catch (_) {}
        }
      } else {
        newCount++;
      }

      await db.runAsync(
        `INSERT OR REPLACE INTO notes (id, title, content, colorSchemeId, tag, isPinned, isArchived, createdAt, updatedAt, reminderAt, notificationId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          note.id,
          note.title,
          note.content,
          note.colorSchemeId,
          note.tag,
          note.isPinned,
          note.isArchived,
          note.createdAt,
          note.updatedAt,
          note.reminderAt,
          notificationIdToSave,
        ]
      );
      importedCount++;
    }

    // Restore supported preferences if present in backup
    let settingsRestoredCount = 0;
    if (validSettings.default_note_color) {
      await setSettingAsync('default_note_color', validSettings.default_note_color);
      settingsRestoredCount++;
    }
    if (validSettings.default_reminder_time) {
      await setSettingAsync('default_reminder_time', validSettings.default_reminder_time);
      settingsRestoredCount++;
    }
    if (validSettings.haptic_feedback_enabled !== undefined) {
      await setSettingAsync(
        'haptic_feedback_enabled',
        validSettings.haptic_feedback_enabled ? '1' : '0'
      );
      settingsRestoredCount++;
    }

    // Ensure metadata marks database as active
    await db.runAsync(
      `INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('has_seeded_initial_notes', '1');`
    );

    return settingsRestoredCount;
  };

  let settingsRestoredCount = 0;
  if (typeof db.withTransactionAsync === 'function') {
    settingsRestoredCount = await db.withTransactionAsync(executeRestore);
  } else {
    settingsRestoredCount = await executeRestore();
  }

  // Sync latest notes to floating overlay cache
  await syncRecentNotesToOverlay(db);

  // Reconcile future scheduled reminders with OS so live alarms are created safely
  try {
    await reconcileScheduledRemindersAsync(db);
  } catch (recErr) {
    console.warn('[DotyNotes DB] Reminder reconciliation during restore notice:', recErr?.message);
  }

  return {
    success: true,
    importedCount,
    updatedCount,
    newCount,
    totalValid: validNotes.length,
    settingsRestoredCount,
    formatType,
  };
}

export {
  validateBackupPayload,
  detectBackupFormat,
  createBackupPayload,
  BACKUP_FORMAT_VERSION,
};


/**
 * Read a persistent setting from the app_metadata table.
 */
export async function getSettingAsync(key, defaultValue = null) {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      'SELECT value FROM app_metadata WHERE key = ?;',
      [key]
    );
    return row && row.value != null ? row.value : defaultValue;
  } catch (err) {
    console.error('getSettingAsync error:', err);
    return defaultValue;
  }
}

/**
 * Persist a setting to the app_metadata table.
 */
export async function setSettingAsync(key, value) {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?);',
      [key, String(value)]
    );
    return true;
  } catch (err) {
    console.error('setSettingAsync error:', err);
    return false;
  }
}
