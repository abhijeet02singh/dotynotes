import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { normalizeNotificationText } from '../utils/richText';

const REMINDER_CHANNEL_ID = 'reminders';

let Notifications = null;
let hasAttemptedLoad = false;
let isInitialized = false;

/**
 * Safely acquire the expo-notifications module.
 *
 * Uses requireOptionalNativeModule to first verify that the native notification scheduler
 * is compiled into the running APK. If running on an older development APK, this avoids
 * triggering eager lookups for native modules (such as ExpoPushTokenManager or
 * ExpoTopicSubscriptionModule) and prevents runtime crashes.
 */
function getNotificationsModule() {
  if (hasAttemptedLoad) {
    return Notifications;
  }
  hasAttemptedLoad = true;

  try {
    // Check if expo-notifications native code is compiled into the current binary
    const nativeScheduler = requireOptionalNativeModule('ExpoNotificationScheduler');
    if (!nativeScheduler) {
      console.log(
        '[NotificationService] Native ExpoNotificationScheduler is not present in this APK. A new development build is required to enable local reminders.'
      );
      Notifications = null;
      return null;
    }

    Notifications = require('expo-notifications');
    return Notifications;
  } catch (err) {
    console.warn(
      '[NotificationService] Failed to load expo-notifications:',
      err.message
    );
    Notifications = null;
    return null;
  }
}

/**
 * Check whether native notifications are supported in the running binary.
 */
export function isNotificationSupported() {
  return Boolean(getNotificationsModule());
}

/**
 * Configure foreground notification behavior and Android notification channels.
 * Uses the default system notification sound instead of registering a custom sound file.
 */
export async function initializeNotificationsAsync() {
  const notif = getNotificationsModule();
  if (!notif) return;
  if (isInitialized) return;

  try {
    // Configure foreground notification presentation handler
    notif.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true, // Compatibility for older versions
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Android notification channel setup
    // Do not set sound: 'default' here. Omission uses the standard system notification sound
    // and avoids: "Custom sound 'default' not found in native app"
    if (Platform.OS === 'android') {
      await notif.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Note Reminders',
        description: 'Notifications for scheduled note reminders in DotyNotes',
        importance: notif.AndroidImportance?.HIGH || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
        enableLights: true,
        enableVibrate: true,
        showBadge: false,
      });
    }

    isInitialized = true;
  } catch (err) {
    console.warn('[NotificationService] Initialization warning:', err.message);
  }
}

/**
 * Query current notification permission status without requesting.
 * Returns { granted: boolean, canAskAgain: boolean, status: string }
 */
export async function getNotificationPermissionStatusAsync() {
  const notif = getNotificationsModule();
  if (!notif) {
    return {
      granted: false,
      canAskAgain: false,
      status: 'unavailable',
      reason: 'native_module_missing',
    };
  }

  try {
    const current = await notif.getPermissionsAsync();
    const isGranted = Boolean(current.granted || current.status === 'granted');
    return {
      granted: isGranted,
      canAskAgain: current.canAskAgain,
      status: current.status,
    };
  } catch (err) {
    return { granted: false, canAskAgain: false, status: 'error', error: err.message };
  }
}

/**
 * Request notification permissions gracefully.
 * Returns { granted: boolean, canAskAgain: boolean, status: string }
 */
export async function requestNotificationPermissionAsync() {
  const notif = getNotificationsModule();
  if (!notif) {
    return {
      granted: false,
      canAskAgain: false,
      status: 'unavailable',
      reason: 'native_module_missing',
    };
  }

  try {
    const current = await notif.getPermissionsAsync();
    if (current.granted || current.status === 'granted') {
      return { granted: true, status: 'granted' };
    }

    const requested = await notif.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    const isGranted = requested.granted || requested.status === 'granted';
    return {
      granted: isGranted,
      canAskAgain: requested.canAskAgain,
      status: requested.status,
    };
  } catch (err) {
    console.warn('[NotificationService] Permission request failed:', err.message);
    return { granted: false, canAskAgain: false, status: 'error', error: err.message };
  }
}

/**
 * Schedule a local notification for a note.
 * Automatically cancels any existing notification for this note to prevent duplicates.
 */
export async function scheduleNoteReminderAsync({
  noteId,
  title,
  content,
  reminderAt,
  existingNotificationId = null,
}) {
  const notif = getNotificationsModule();
  if (!notif) {
    return {
      success: false,
      reason: 'native_module_missing',
      message: 'expo-notifications native module is not compiled into the current development build.',
    };
  }

  await initializeNotificationsAsync();

  // Cancel prior notification if provided
  if (existingNotificationId) {
    await cancelNoteReminderAsync(existingNotificationId);
  }

  const timestamp = Number(reminderAt);
  if (!timestamp || isNaN(timestamp)) {
    return { success: false, reason: 'invalid_timestamp' };
  }

  const now = Date.now();
  if (timestamp <= now) {
    return { success: false, reason: 'past_time' };
  }

  // Verify permission
  const perm = await requestNotificationPermissionAsync();
  if (!perm.granted) {
    console.log('[NotificationService] Scheduling aborted: permission denied (status: ' + perm.status + ')');
    return {
      success: false,
      reason: 'permission_denied',
      permissionStatus: perm.status,
    };
  }

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const targetDate = new Date(timestamp);
  const delayMs = timestamp - now;
  console.log(
    `[NotificationService] Attempting schedule: target=${targetDate.toISOString()}, tz=${userTimezone}, delayMs=${delayMs}`
  );

  try {
    const cleanTitle = normalizeNotificationText(title) || 'Untitled Note';
    const cleanContent = normalizeNotificationText(content);
    const bodyText = cleanContent || 'You have a scheduled note reminder.';
    const truncatedBody = bodyText.length > 120
      ? bodyText.substring(0, 117) + '...'
      : bodyText;

    const notificationId = await notif.scheduleNotificationAsync({
      content: {
        title: `⏰ ${cleanTitle}`,
        body: truncatedBody,
        data: { noteId },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
        priority: notif.AndroidNotificationPriority?.HIGH || 'high',
      },
      trigger: {
        type: notif.SchedulableTriggerInputTypes?.DATE || 'date',
        date: targetDate,
        channelId: REMINDER_CHANNEL_ID,
      },
    });

    console.log(`[NotificationService] Scheduled successfully: notificationId=${notificationId}, noteId=${noteId}`);
    return { success: true, notificationId };
  } catch (err) {
    console.error('[NotificationService] Failed to schedule notification:', err.message);
    return { success: false, reason: 'schedule_failed', error: err.message };
  }
}

/**
 * Cancel a scheduled notification.
 */
export async function cancelNoteReminderAsync(notificationId) {
  if (!notificationId) return;
  const notif = getNotificationsModule();
  if (!notif) return;

  try {
    await notif.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('[NotificationService] Cancel warning:', err.message);
  }
}

/**
 * Reconcile scheduled reminders against the SQLite database on startup.
 * Ensures future reminders are registered with the OS without creating duplicate notifications.
 */
export async function reconcileScheduledRemindersAsync(db) {
  if (!db) return;
  const notif = getNotificationsModule();
  if (!notif) return;

  try {
    await initializeNotificationsAsync();

    const now = Date.now();
    // Fetch all active notes with future reminders
    const rows = await db.getAllAsync(
      `SELECT id, title, content, reminderAt, notificationId
       FROM notes
       WHERE isArchived = 0 AND reminderAt IS NOT NULL AND reminderAt > ?;`,
      [now]
    );

    if (!rows || rows.length === 0) return;

    // Get current scheduled notifications from OS
    const scheduledNotifications = await notif.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduledNotifications.map((s) => s.identifier));

    for (const note of rows) {
      const isStillScheduled = note.notificationId && scheduledIds.has(note.notificationId);

      if (isStillScheduled) {
        console.log(`[NotificationService] Reconciliation: note=${note.id} reminder retained (already scheduled in OS, id=${note.notificationId})`);
      } else {
        // Reschedule missing notification
        console.log(`[NotificationService] Reconciliation: note=${note.id} reminder missing in OS, rescheduling...`);
        const result = await scheduleNoteReminderAsync({
          noteId: note.id,
          title: note.title,
          content: note.content,
          reminderAt: note.reminderAt,
          existingNotificationId: note.notificationId,
        });

        if (result.success && result.notificationId) {
          console.log(`[NotificationService] Reconciliation: note=${note.id} rescheduled with new id=${result.notificationId}`);
          await db.runAsync(
            `UPDATE notes SET notificationId = ? WHERE id = ?;`,
            [result.notificationId, note.id]
          );
        }
      }
    }
  } catch (err) {
    console.warn('[NotificationService] Reconciliation warning:', err.message);
  }
}

/**
 * Attach notification response listener safely without direct import in App.js.
 */
export function addNotificationResponseListener(callback) {
  const notif = getNotificationsModule();
  if (!notif || typeof notif.addNotificationResponseReceivedListener !== 'function') {
    return { remove: () => {} };
  }
  try {
    return notif.addNotificationResponseReceivedListener((response) => {
      const noteId = response?.notification?.request?.content?.data?.noteId;
      console.log(`[NotificationService] Notification response received for noteId=${noteId}`);
      if (typeof callback === 'function') {
        callback(response);
      }
    });
  } catch (_) {
    return { remove: () => {} };
  }
}

/**
 * Format a reminder timestamp into user-friendly text.
 */
export function formatReminderDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  if (isNaN(date.getTime())) return '';
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  return `${month} ${day} at ${timeStr}`;
}

/**
 * Determine actual Android reminder delivery and optimization capabilities.
 * Inspects whether exact alarm permission is granted (SCHEDULE_EXACT_ALARM)
 * and whether battery optimization exemption is active.
 *
 * Never hardcodes status as "Optimized".
 */
export async function getReminderDeliveryStatusAsync() {
  if (Platform.OS !== 'android') {
    return {
      status: 'not_applicable',
      label: 'Not Applicable',
      badge: 'Not Applicable',
      description: 'Standard iOS / web notification scheduling.',
      exactAlarmsAllowed: false,
    };
  }

  try {
    const { checkExactAlarmPermissionAsync, isBatteryOptimizationIgnoredAsync } = require('../../modules/floating-dot-overlay');
    const exactAllowed = await checkExactAlarmPermissionAsync();
    const batteryExempt = await isBatteryOptimizationIgnoredAsync();

    if (exactAllowed === true) {
      return {
        status: 'exact_allowed',
        label: 'Exact Alarms Allowed',
        badge: 'Exact Alarms Allowed',
        batteryExempt: Boolean(batteryExempt),
        description: batteryExempt
          ? 'Exact alarms permitted and exempt from battery optimization.'
          : 'Exact alarms permitted. Standard Android battery limits apply.',
      };
    } else if (exactAllowed === false) {
      return {
        status: 'standard',
        label: 'Standard Scheduling',
        badge: 'Standard Scheduling',
        batteryExempt: Boolean(batteryExempt),
        description: 'Android restricts exact alarms. Notifications use standard delivery windows.',
      };
    }

    // When native check returns null (running in Expo Go or without native bridge)
    return {
      status: 'standard',
      label: 'Standard Scheduling',
      badge: 'Standard Scheduling',
      batteryExempt: false,
      description: 'Scheduled via Expo Notifications on Android.',
    };
  } catch (_err) {
    return {
      status: 'unavailable',
      label: 'Status Unavailable',
      badge: 'Status Unavailable',
      batteryExempt: false,
      description: 'Could not determine Android alarm delivery capability.',
    };
  }
}

