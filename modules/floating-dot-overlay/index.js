import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/**
 * JavaScript interface for the native Android Floating Dot Overlay.
 * 
 * Uses requireOptionalNativeModule so that running in Expo Go or web
 * never causes a runtime crash.
 */
const NativeOverlay = Platform.OS === 'android'
  ? requireOptionalNativeModule('FloatingDotOverlay')
  : null;

export const isNativeModuleAvailable = Boolean(NativeOverlay);

/**
 * Checks if SYSTEM_ALERT_WINDOW (display over other apps) permission is granted.
 */
export async function checkOverlayPermission() {
  if (NativeOverlay && typeof NativeOverlay.checkPermission === 'function') {
    try {
      return await NativeOverlay.checkPermission();
    } catch (e) {
      console.warn('Error checking overlay permission:', e);
      return false;
    }
  }
  return false;
}

/**
 * Opens Android system settings for this app to grant "Display over other apps".
 */
export async function requestOverlayPermission() {
  if (NativeOverlay && typeof NativeOverlay.requestPermission === 'function') {
    try {
      return await NativeOverlay.requestPermission();
    } catch (e) {
      console.warn('Error requesting overlay permission:', e);
      return false;
    }
  }
  return false;
}

/**
 * Starts the native floating dot foreground service.
 */
export async function startFloatingOverlay() {
  if (NativeOverlay && typeof NativeOverlay.startOverlay === 'function') {
    return await NativeOverlay.startOverlay();
  }
  throw new Error(
    'Native FloatingDotOverlay module is not loaded in this environment. ' +
    'Expo Go does not include custom native modules. A development build (APK) is required.'
  );
}

/**
 * Stops the native floating dot foreground service.
 */
export async function stopFloatingOverlay() {
  if (NativeOverlay && typeof NativeOverlay.stopOverlay === 'function') {
    return await NativeOverlay.stopOverlay();
  }
  return false;
}

/**
 * Returns whether the floating dot overlay service is currently running.
 */
export function isFloatingOverlayRunning() {
  if (NativeOverlay && typeof NativeOverlay.isOverlayRunning === 'function') {
    return Boolean(NativeOverlay.isOverlayRunning());
  }
  return false;
}

/**
 * Diagnoses the SQLite database by creating a safe file-copy backup,
 * running PRAGMA integrity_check on the backup copy, counting recoverable
 * notes, and returning a detailed report. NO live files are modified.
 */
export async function repairDatabaseAsync() {
  if (NativeOverlay && typeof NativeOverlay.repairDatabase === 'function') {
    return await NativeOverlay.repairDatabase();
  }
  return { success: false, message: 'Native module not available' };
}

/**
 * Creates a timestamped safe backup of all SQLite files (pure file copy).
 * Never opens a SQLite connection. Returns the backup directory path.
 */
export async function createDatabaseBackupAsync() {
  if (NativeOverlay && typeof NativeOverlay.createDatabaseBackup === 'function') {
    return await NativeOverlay.createDatabaseBackup();
  }
  return null;
}

/**
 * DESTRUCTIVE: Deletes live -wal and -shm files.
 *
 * Must only be called after ALL of:
 *  1. expo-sqlite connection has been closed (dbInstance.closeAsync() called)
 *  2. repairDatabaseAsync() confirmed recoveredNoteCount > 0 and backup exists
 *  3. The user has explicitly confirmed the repair action in the UI
 *
 * Returns { walDeleted, shmDeleted, mainDbExists }.
 */
export async function cleanupStaleWalFilesAsync() {
  if (NativeOverlay && typeof NativeOverlay.cleanupStaleWalFiles === 'function') {
    try {
      return await NativeOverlay.cleanupStaleWalFiles();
    } catch (e) {
      console.warn('cleanupStaleWalFiles error:', e);
      return { walDeleted: false, shmDeleted: false, mainDbExists: false };
    }
  }
  return { walDeleted: false, shmDeleted: false, mainDbExists: false };
}

/**
 * Synchronizes the top recent notes into the native overlay's cache.
 */
export async function syncNotesToOverlayAsync(notes) {
  if (NativeOverlay && typeof NativeOverlay.syncNotesToOverlay === 'function') {
    try {
      const notesJson = JSON.stringify(notes || []);
      return await NativeOverlay.syncNotesToOverlay(notesJson);
    } catch (e) {
      console.warn('Error syncing notes to overlay cache:', e);
      return false;
    }
  }
  return false;
}

/**
 * Retrieves pending notes captured while using the floating overlay.
 */
export async function getPendingOverlayNotesAsync() {
  if (NativeOverlay && typeof NativeOverlay.getPendingOverlayNotes === 'function') {
    try {
      return await NativeOverlay.getPendingOverlayNotes();
    } catch (e) {
      console.warn('Error getting pending overlay notes:', e);
      return '[]';
    }
  }
  return '[]';
}

/**
 * Clears pending overlay notes once they are safely inserted into SQLite.
 */
export async function clearPendingOverlayNotesAsync() {
  if (NativeOverlay && typeof NativeOverlay.clearPendingOverlayNotes === 'function') {
    try {
      return await NativeOverlay.clearPendingOverlayNotes();
    } catch (e) {
      console.warn('Error clearing pending overlay notes:', e);
      return false;
    }
  }
  return false;
}

/**
 * Listens for new notes saved from the floating overlay.
 */
export function addOverlayNoteListener(callback) {
  if (NativeOverlay && typeof NativeOverlay.addListener === 'function') {
    return NativeOverlay.addListener('onQuickNoteSaved', callback);
  }
  return { remove: () => {} };
}
