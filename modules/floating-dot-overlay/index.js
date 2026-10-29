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
 * Checks if exact alarm scheduling is permitted by Android (SCHEDULE_EXACT_ALARM).
 * Returns boolean if determined, or null if native API is unavailable.
 */
export async function checkExactAlarmPermissionAsync() {
  if (NativeOverlay && typeof NativeOverlay.canScheduleExactAlarms === 'function') {
    try {
      return Boolean(await NativeOverlay.canScheduleExactAlarms());
    } catch (e) {
      console.warn('Error checking exact alarm permission:', e);
      return null;
    }
  }
  return null;
}

/**
 * Checks if the app is exempt from battery optimizations.
 * Returns boolean if determined, or null if native API is unavailable.
 */
export async function isBatteryOptimizationIgnoredAsync() {
  if (NativeOverlay && typeof NativeOverlay.isBatteryOptimizationIgnored === 'function') {
    try {
      return Boolean(await NativeOverlay.isBatteryOptimizationIgnored());
    } catch (e) {
      console.warn('Error checking battery optimization exemption:', e);
      return null;
    }
  }
  return null;
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
 * Sets the theme on the native floating dot overlay.
 * Accepts a theme name string or a structured theme payload object.
 */
export async function setOverlayThemeAsync(themePayload) {
  if (NativeOverlay && typeof NativeOverlay.setOverlayTheme === 'function') {
    try {
      const payloadString = typeof themePayload === 'string'
        ? themePayload
        : JSON.stringify(themePayload);
      return await NativeOverlay.setOverlayTheme(payloadString);
    } catch (e) {
      console.warn('Error setting overlay theme:', e);
      return false;
    }
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
 * Performs automated safe recovery:
 * 1. Backs up all DB & JSON staging files to a timestamped folder.
 * 2. Harvests all recoverable notes.
 * 3. Safely clears corrupted WAL/SHM files.
 * 4. Returns recovered notes JSON array so JS can restore them.
 */
export async function performSafeRepairAsync() {
  if (NativeOverlay && typeof NativeOverlay.performSafeRepair === 'function') {
    try {
      return await NativeOverlay.performSafeRepair();
    } catch (e) {
      console.warn('performSafeRepair error:', e);
      return { success: false, message: e.message, recoveredNotesJson: '[]', recoveredNoteCount: 0 };
    }
  }
  return { success: false, message: 'Native module not available', recoveredNotesJson: '[]', recoveredNoteCount: 0 };
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
 * Deletes live -wal and -shm files explicitly.
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
 * Retrieves all pending mutations (creations, edits, deletions) from the overlay staging queue.
 */
export async function getPendingOverlayMutationsAsync() {
  if (NativeOverlay && typeof NativeOverlay.getPendingOverlayMutations === 'function') {
    try {
      const json = await NativeOverlay.getPendingOverlayMutations();
      return JSON.parse(json || '{"notes":[],"deletions":[]}');
    } catch (e) {
      console.warn('Error getting pending overlay mutations:', e);
      return { notes: [], deletions: [] };
    }
  }
  return { notes: [], deletions: [] };
}

/**
 * Clears all pending mutations from the overlay staging queue.
 */
export async function clearPendingOverlayMutationsAsync() {
  if (NativeOverlay && typeof NativeOverlay.clearPendingOverlayMutations === 'function') {
    try {
      return await NativeOverlay.clearPendingOverlayMutations();
    } catch (e) {
      console.warn('Error clearing pending overlay mutations:', e);
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

/**
 * Listens for any note mutations (create, update, delete) from the floating overlay.
 */
export function addOverlayMutationListener(callback) {
  if (NativeOverlay && typeof NativeOverlay.addListener === 'function') {
    return NativeOverlay.addListener('onQuickNoteMutation', callback);
  }
  return { remove: () => {} };
}

/**
 * Gets the native Android package version and versionCode from PackageManager.
 */
export function getNativeAppVersionInfo() {
  if (NativeOverlay && typeof NativeOverlay.getNativeAppVersion === 'function') {
    try {
      return NativeOverlay.getNativeAppVersion();
    } catch (_) {
      return null;
    }
  }
  return null;
}

/**
 * Checks whether the app has permission to install unknown APKs (REQUEST_INSTALL_PACKAGES).
 */
export async function canRequestPackageInstallsAsync() {
  if (NativeOverlay && typeof NativeOverlay.canRequestPackageInstalls === 'function') {
    try {
      return await NativeOverlay.canRequestPackageInstalls();
    } catch (_) {
      return false;
    }
  }
  return false;
}

/**
 * Opens system settings for "Install unknown apps" for DotyNotes.
 */
export async function openUnknownAppSourcesSettingsAsync() {
  if (NativeOverlay && typeof NativeOverlay.openUnknownAppSourcesSettings === 'function') {
    try {
      return await NativeOverlay.openUnknownAppSourcesSettings();
    } catch (_) {
      return false;
    }
  }
  return false;
}

/**
 * Downloads the APK using Android DownloadManager and launches the PackageInstaller via FileProvider.
 */
export async function downloadAndInstallApkNativeAsync(downloadUrl, fileName) {
  if (NativeOverlay && typeof NativeOverlay.downloadAndInstallApk === 'function') {
    try {
      return await NativeOverlay.downloadAndInstallApk(downloadUrl, fileName || 'DotyNotes-update.apk');
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'Native module not available' };
}

/**
 * Downloads the APK directly from trusted release URL, computes SHA-256 in real-time,
 * verifies package ID (com.dotynotes.app), checks versionCode, verifies signature,
 * and launches the Android PackageInstaller via secure FileProvider.
 */
export async function downloadAndVerifyApkNativeAsync({
  downloadUrl,
  fileName = 'DotyNotes-update.apk',
  expectedSha256 = '',
  expectedPackageId = 'com.dotynotes.app',
  minVersionCode = 0,
}) {
  if (NativeOverlay && typeof NativeOverlay.downloadAndVerifyApk === 'function') {
    try {
      return await NativeOverlay.downloadAndVerifyApk(
        downloadUrl,
        fileName,
        expectedSha256,
        expectedPackageId,
        minVersionCode
      );
    } catch (e) {
      return { success: false, errorCode: 'NATIVE_EXCEPTION', error: e.message };
    }
  }
  return { success: false, errorCode: 'MODULE_UNAVAILABLE', error: 'Native module not available' };
}

/**
 * Launches the Android PackageInstaller for a verified APK file on disk.
 */
export async function installVerifiedApkNativeAsync(apkPath) {
  if (NativeOverlay && typeof NativeOverlay.installVerifiedApk === 'function') {
    try {
      return await NativeOverlay.installVerifiedApk(apkPath);
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'Native module not available' };
}

/**
 * Cancels any active in-flight update download.
 */
export function cancelApkDownloadNative() {
  if (NativeOverlay && typeof NativeOverlay.cancelApkDownload === 'function') {
    try {
      return NativeOverlay.cancelApkDownload();
    } catch (_) {
      return false;
    }
  }
  return false;
}

/**
 * Subscribes to real-time update download progress events.
 */
export function addUpdateProgressListener(callback) {
  if (NativeOverlay && typeof NativeOverlay.addListener === 'function') {
    return NativeOverlay.addListener('onUpdateDownloadProgress', callback);
  }
  return { remove: () => {} };
}

export { default as DotyRichTextEditor } from './DotyRichTextEditor';

