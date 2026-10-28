/**
 * DotyNotes Versioned Backup & Restore Utility
 *
 * Implements a structured, versioned, readable, and maintainable JSON backup format
 * inspired by Flick, with full backward-compatibility for legacy DotyNotes backups.
 *
 * Target Schema (v1):
 * {
 *   "formatVersion": 1,
 *   "appName": "DotyNotes",
 *   "appVersion": "1.0.0",
 *   "createdAt": 1792692871422,
 *   "data": {
 *     "notes": [],
 *     "settings": {}
 *   },
 *   "metadata": {
 *     "storageEngine": "expo-sqlite",
 *     "journalMode": "WAL",
 *     "totalNotes": 0
 *   }
 * }
 */

export const BACKUP_FORMAT_VERSION = 1;

export const SUPPORTED_PASTEL_COLORS = [
  'purple',
  'yellow',
  'blue',
  'green',
  'pink',
  'orange',
];

/**
 * Detects whether the parsed JSON payload is the versioned format, the legacy format, or unknown.
 *
 * @param {any} payload - Parsed JSON object
 * @returns {'versioned' | 'legacy' | 'unknown'}
 */
export function detectBackupFormat(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'unknown';
  }

  // Versioned format specifies formatVersion at the root
  if (payload.formatVersion !== undefined) {
    return 'versioned';
  }

  // Legacy DotyNotes format has a root notes array without formatVersion
  if (Array.isArray(payload.notes)) {
    return 'legacy';
  }

  return 'unknown';
}

/**
 * Creates a versioned, Flick-inspired backup payload object with deterministic field ordering.
 *
 * @param {Object} options
 * @param {Array<Object>} options.notes - Collection of raw or formatted note rows from SQLite
 * @param {Object} [options.settings] - Supported persistent preferences
 * @param {string} [options.appName] - Application name from app.json
 * @param {string} [options.appVersion] - Application version from app.json
 * @param {number} [options.createdAt] - Millisecond timestamp
 * @returns {Object} Deterministic JSON-serializable backup object
 */
export function createBackupPayload({
  notes = [],
  settings = {},
  appName = 'DotyNotes',
  appVersion = '1.0.0',
  createdAt = Date.now(),
} = {}) {
  const safeNotes = Array.isArray(notes) ? notes : [];

  // Deterministically format note rows preserving rich-text and all supported schema fields
  const formattedNotes = safeNotes.map((note) => ({
    id: String(note.id),
    title: String(note.title),
    content: typeof note.content === 'string' ? note.content : '',
    colorSchemeId:
      typeof note.colorSchemeId === 'string' && note.colorSchemeId
        ? note.colorSchemeId
        : 'purple',
    tag: typeof note.tag === 'string' && note.tag ? note.tag : 'General',
    isPinned: Boolean(note.isPinned),
    isArchived: Boolean(note.isArchived),
    createdAt:
      typeof note.createdAt === 'number' && Number.isFinite(note.createdAt)
        ? note.createdAt
        : Date.now(),
    updatedAt:
      typeof note.updatedAt === 'number' && Number.isFinite(note.updatedAt)
        ? note.updatedAt
        : Date.now(),
    reminderAt:
      typeof note.reminderAt === 'number' && Number.isFinite(note.reminderAt)
        ? note.reminderAt
        : null,
    // Included as historical metadata only; sanitized to null during restore
    notificationId: note.notificationId ? String(note.notificationId) : null,
  }));

  // Filter settings to only explicitly supported preferences
  const formattedSettings = {};
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    if (
      typeof settings.default_note_color === 'string' &&
      SUPPORTED_PASTEL_COLORS.includes(settings.default_note_color)
    ) {
      formattedSettings.default_note_color = settings.default_note_color;
    }
    if (
      typeof settings.default_reminder_time === 'string' &&
      settings.default_reminder_time.trim().length > 0
    ) {
      formattedSettings.default_reminder_time = settings.default_reminder_time.trim();
    }
    if (settings.haptic_feedback_enabled !== undefined) {
      formattedSettings.haptic_feedback_enabled = Boolean(
        settings.haptic_feedback_enabled === true ||
          settings.haptic_feedback_enabled === '1'
      );
    }
  }

  // Deterministic top-level key ordering
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appName: String(appName || 'DotyNotes'),
    appVersion: String(appVersion || '1.0.0'),
    createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
    data: {
      notes: formattedNotes,
      settings: formattedSettings,
    },
    metadata: {
      storageEngine: 'expo-sqlite',
      journalMode: 'WAL',
      totalNotes: formattedNotes.length,
    },
  };
}

/**
 * Validates a DotyNotes backup JSON string or object against the versioned or legacy schema.
 * Rejects invalid, corrupt, or unsupported payloads with a clear user-facing explanation.
 *
 * @param {string|Object} payloadOrString
 * @returns {Object} Validation result { isValid, error, formatType, summary, validNotes, validSettings }
 */
export function validateBackupPayload(payloadOrString) {
  let payload;
  if (typeof payloadOrString === 'string') {
    try {
      payload = JSON.parse(payloadOrString);
    } catch (parseErr) {
      return {
        isValid: false,
        error: 'Invalid JSON format: ' + parseErr.message,
        formatType: 'unknown',
        summary: null,
        validNotes: [],
        validSettings: {},
      };
    }
  } else if (typeof payloadOrString === 'object' && payloadOrString !== null) {
    payload = payloadOrString;
  } else {
    return {
      isValid: false,
      error: 'Invalid payload: Expected a JSON object or string',
      formatType: 'unknown',
      summary: null,
      validNotes: [],
      validSettings: {},
    };
  }

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return {
      isValid: false,
      error: 'Backup file must contain a root JSON object',
      formatType: 'unknown',
      summary: null,
      validNotes: [],
      validSettings: {},
    };
  }

  const formatType = detectBackupFormat(payload);

  if (formatType === 'unknown') {
    return {
      isValid: false,
      error: 'Invalid backup format: missing "formatVersion" or "notes" structure',
      formatType: 'unknown',
      summary: null,
      validNotes: [],
      validSettings: {},
    };
  }

  let rawNotes = [];
  let rawSettings = null;
  let detectedVersion = 1;
  let createdAtTimestamp = null;

  if (formatType === 'versioned') {
    // 1. Validate formatVersion
    if (
      typeof payload.formatVersion !== 'number' ||
      !Number.isInteger(payload.formatVersion) ||
      payload.formatVersion < 1
    ) {
      return {
        isValid: false,
        error: 'Unsupported backup format version: formatVersion must be a positive integer',
        formatType: 'versioned',
        summary: null,
        validNotes: [],
        validSettings: {},
      };
    }

    if (payload.formatVersion > BACKUP_FORMAT_VERSION) {
      return {
        isValid: false,
        error: `Unsupported backup format version: ${payload.formatVersion}. This app currently supports formatVersion ${BACKUP_FORMAT_VERSION}.`,
        formatType: 'versioned',
        summary: null,
        validNotes: [],
        validSettings: {},
      };
    }

    detectedVersion = payload.formatVersion;
    createdAtTimestamp =
      typeof payload.createdAt === 'number' && Number.isFinite(payload.createdAt)
        ? payload.createdAt
        : null;

    // 2. Validate data object
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      return {
        isValid: false,
        error: 'Invalid backup: missing "data" object',
        formatType: 'versioned',
        summary: null,
        validNotes: [],
        validSettings: {},
      };
    }

    // 3. Validate data.notes array
    if (!Array.isArray(payload.data.notes)) {
      return {
        isValid: false,
        error: 'Invalid backup: missing "data.notes" array',
        formatType: 'versioned',
        summary: null,
        validNotes: [],
        validSettings: {},
      };
    }

    rawNotes = payload.data.notes;
    rawSettings = payload.data.settings;
  } else if (formatType === 'legacy') {
    // Legacy schema check: version (optional/default 1)
    if (
      payload.version !== undefined &&
      (typeof payload.version !== 'number' || payload.version < 1)
    ) {
      return {
        isValid: false,
        error: 'Unsupported backup version. Please check the backup file.',
        formatType: 'legacy',
        summary: null,
        validNotes: [],
        validSettings: {},
      };
    }

    if (payload.version !== undefined && payload.version > 1) {
      return {
        isValid: false,
        error: `Unsupported legacy backup version: ${payload.version}.`,
        formatType: 'legacy',
        summary: null,
        validNotes: [],
        validSettings: {},
      };
    }

    detectedVersion = payload.version || 1;
    createdAtTimestamp =
      typeof payload.exportedAt === 'number' && Number.isFinite(payload.exportedAt)
        ? payload.exportedAt
        : null;

    if (!Array.isArray(payload.notes)) {
      return {
        isValid: false,
        error: 'Invalid backup: missing "notes" array',
        formatType: 'legacy',
        summary: null,
        validNotes: [],
        validSettings: {},
      };
    }

    rawNotes = payload.notes;
    rawSettings = null;
  }

  // Validate Notes collection
  const validNotes = [];
  let pinnedCount = 0;
  let archivedCount = 0;
  let reminderCount = 0;

  for (let i = 0; i < rawNotes.length; i++) {
    const item = rawNotes[i];
    if (!item || typeof item !== 'object') {
      continue;
    }

    // Require non-empty ID and Title
    const id = item.id != null ? String(item.id).trim() : '';
    const title = item.title != null ? String(item.title).trim() : '';

    if (!id || !title) {
      continue;
    }

    const isPinned = item.isPinned ? 1 : 0;
    const isArchived = item.isArchived ? 1 : 0;
    const reminderAt =
      typeof item.reminderAt === 'number' &&
      Number.isFinite(item.reminderAt) &&
      item.reminderAt > 0
        ? item.reminderAt
        : null;

    if (isPinned) pinnedCount++;
    if (isArchived) archivedCount++;
    if (reminderAt) reminderCount++;

    validNotes.push({
      id,
      title,
      content: typeof item.content === 'string' ? item.content : '',
      colorSchemeId:
        typeof item.colorSchemeId === 'string' && item.colorSchemeId
          ? item.colorSchemeId
          : 'purple',
      tag: typeof item.tag === 'string' && item.tag ? item.tag : 'General',
      isPinned,
      isArchived,
      createdAt:
        typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
          ? item.createdAt
          : Date.now(),
      updatedAt:
        typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)
          ? item.updatedAt
          : Date.now(),
      reminderAt,
      // Deliberately sanitize foreign notification ID to null so live OS alarms can be safely registered
      notificationId: null,
    });
  }

  if (validNotes.length === 0 && rawNotes.length > 0) {
    return {
      isValid: false,
      error:
        'Backup contains notes, but none matched the valid schema (missing required id or title)',
      formatType,
      summary: null,
      validNotes: [],
      validSettings: {},
    };
  }

  // Validate supported settings
  const validSettings = {};
  if (rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)) {
    if (
      typeof rawSettings.default_note_color === 'string' &&
      SUPPORTED_PASTEL_COLORS.includes(rawSettings.default_note_color)
    ) {
      validSettings.default_note_color = rawSettings.default_note_color;
    }
    if (
      typeof rawSettings.default_reminder_time === 'string' &&
      rawSettings.default_reminder_time.trim().length > 0
    ) {
      validSettings.default_reminder_time = rawSettings.default_reminder_time.trim();
    }
    if (rawSettings.haptic_feedback_enabled !== undefined) {
      validSettings.haptic_feedback_enabled = Boolean(
        rawSettings.haptic_feedback_enabled === true ||
          rawSettings.haptic_feedback_enabled === '1'
      );
    }
  }

  return {
    isValid: true,
    error: null,
    formatType,
    summary: {
      total: validNotes.length,
      pinned: pinnedCount,
      archived: archivedCount,
      withReminders: reminderCount,
      version: detectedVersion,
      formatVersion: formatType === 'versioned' ? detectedVersion : undefined,
      appName: payload.appName || 'DotyNotes',
      appVersion: payload.appVersion || null,
      createdAt: createdAtTimestamp,
      hasSettings: Object.keys(validSettings).length > 0,
      settingsCount: Object.keys(validSettings).length,
    },
    validNotes,
    validSettings,
  };
}
