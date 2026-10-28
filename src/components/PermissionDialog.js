import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppDialog from './AppDialog';
import { useTheme } from '../context/ThemeContext';

/**
 * PermissionDialog
 * 
 * Specialized dialog for system permissions and delivery optimization
 * in DotyNotes. Reflects real Android device status, provides seamless
 * actions to open system settings, and strictly adheres to the Flick dark theme standard.
 */
export default function PermissionDialog({
  visible = false,
  type = 'notification', // 'notification' | 'overlay' | 'delivery'
  onClose,
  // Notification Props
  notificationStatus = { granted: false, canAskAgain: true, status: 'checking' },
  onRequestNotificationPermission,
  onOpenNotificationSettings,
  // Overlay Props
  isOverlayGranted = false,
  onRequestOverlayPermission,
  // Delivery Props
  deliveryStatus = {
    status: 'checking',
    label: 'Checking...',
    badge: 'Standard Scheduling',
    exactAlarmsAllowed: false,
    batteryExempt: false,
    description: '',
  },
}) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createPermissionStyles(theme, isDark), [theme, isDark]);

  if (!visible) return null;

  // 1. NOTIFICATION PERMISSION DIALOG
  if (type === 'notification') {
    const isGranted = Boolean(notificationStatus?.granted);
    const isBlocked = !isGranted && !notificationStatus?.canAskAgain;

    return (
      <AppDialog
        visible={visible}
        title="Notification Permission"
        subtitle="Scheduled note alerts & chime notifications"
        icon="bell"
        iconColor={isGranted ? (isDark ? '#34D399' : '#059669') : (isDark ? '#FBBF24' : '#C2410C')}
        iconBgColor={isGranted ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFF7ED')}
        statusBadge={{
          label: isGranted ? 'Enabled' : 'Not Enabled',
          type: isGranted ? 'success' : 'warning',
        }}
        showCloseButton
        onClose={onClose}
        buttons={
          isGranted
            ? [
                {
                  text: 'Notification Settings',
                  style: 'cancel',
                  onPress: () => {
                    if (onOpenNotificationSettings) onOpenNotificationSettings();
                    onClose();
                  },
                },
                {
                  text: 'OK',
                  style: 'primary',
                  onPress: onClose,
                },
              ]
            : [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: onClose,
                },
                {
                  text: isBlocked ? 'Open Settings' : 'Enable Notifications',
                  style: 'primary',
                  onPress: () => {
                    if (isBlocked && onOpenNotificationSettings) {
                      onOpenNotificationSettings();
                    } else if (onRequestNotificationPermission) {
                      onRequestNotificationPermission();
                    }
                    onClose();
                  },
                },
              ]
        }
      >
        <View style={styles.contentBox}>
          <Text style={styles.paragraph}>
            {isGranted
              ? 'Notification permission is actively granted on this device. DotyNotes will deliver alert chimes for your scheduled note reminders at the designated times.'
              : 'Notification permission is currently not enabled. DotyNotes cannot play alert chimes or notify you of upcoming note reminders without this permission.'}
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What notifications do:</Text>
            <Text style={styles.infoBullet}>• Chime at scheduled reminder times</Text>
            <Text style={styles.infoBullet}>• Direct tap opens the specific note</Text>
            <Text style={styles.infoBullet}>• 100% offline — zero tracking or cloud relays</Text>
          </View>

          {!isGranted && isBlocked && (
            <View style={styles.blockedNotice}>
              <Text style={styles.blockedNoticeText}>
                Notifications are permanently disabled for this app. Please tap &quot;Open Settings&quot; to allow notifications in Android Settings.
              </Text>
            </View>
          )}
        </View>
      </AppDialog>
    );
  }

  // 2. DISPLAY OVER OTHER APPS (OVERLAY) DIALOG
  if (type === 'overlay') {
    const isGranted = Boolean(isOverlayGranted);

    return (
      <AppDialog
        visible={visible}
        title="Display Over Other Apps"
        subtitle="Android system permission for Floating Dot"
        icon="overlay"
        iconColor={isGranted ? (isDark ? '#34D399' : '#059669') : theme.colors.accent}
        iconBgColor={isGranted ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(139, 92, 246, 0.15)' : '#F1EAFE')}
        statusBadge={{
          label: isGranted ? 'Granted' : 'Not Granted',
          type: isGranted ? 'success' : 'warning',
        }}
        showCloseButton
        onClose={onClose}
        buttons={
          isGranted
            ? [
                {
                  text: 'Done',
                  style: 'primary',
                  onPress: onClose,
                },
              ]
            : [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: onClose,
                },
                {
                  text: 'Open Android Settings',
                  style: 'primary',
                  onPress: () => {
                    if (onRequestOverlayPermission) onRequestOverlayPermission();
                    onClose();
                  },
                },
              ]
        }
      >
        <View style={styles.contentBox}>
          <Text style={styles.paragraph}>
            {isGranted
              ? 'Permission is granted on your device. The Floating Dot handle can appear over other applications whenever the service switch is turned on.'
              : 'Android requires explicit permission for DotyNotes to draw the floating screen handle on top of other running applications.'}
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Floating Dot Capabilities:</Text>
            <Text style={styles.infoBullet}>• Quick pad accessible from any app</Text>
            <Text style={styles.infoBullet}>• Instant note capture without switching apps</Text>
            <Text style={styles.infoBullet}>• Completely independent from the service switch</Text>
          </View>

          <View style={styles.decoupledNotice}>
            <Text style={styles.decoupledNoticeText}>
              <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>Note: </Text>
              Granting overlay permission does not automatically start the Floating Dot service. The service is toggled independently using its switch.
            </Text>
          </View>
        </View>
      </AppDialog>
    );
  }

  // 3. DELIVERY & OPTIMIZATION DIALOG
  const isExact = Boolean(deliveryStatus?.exactAlarmsAllowed);
  const isExempt = Boolean(deliveryStatus?.batteryExempt);

  return (
    <AppDialog
      visible={visible}
      title="Delivery & Optimization"
      subtitle="Android alarm timing and background limits"
      icon="info"
      iconColor={theme.colors.accent}
      iconBgColor={isDark ? 'rgba(139, 92, 246, 0.15)' : '#F1EAFE'}
      statusBadge={{
        label: deliveryStatus?.badge || (isExact ? 'Exact Alarms Allowed' : 'Standard Scheduling'),
        type: isExact ? 'success' : 'neutral',
      }}
      showCloseButton
      onClose={onClose}
      buttons={[
        {
          text: 'Got It',
          style: 'primary',
          onPress: onClose,
        },
      ]}
    >
      <View style={styles.contentBox}>
        <Text style={styles.paragraph}>
          DotyNotes schedules reminders strictly on-device using Android&apos;s AlarmManager and local notification scheduler without cloud dependencies.
        </Text>

        <View style={styles.statusSectionCard}>
          <View style={styles.statusRowItem}>
            <Text style={styles.statusItemLabel}>Exact Alarms</Text>
            <Text
              style={[
                styles.statusItemValue,
                { color: isExact ? (isDark ? '#34D399' : '#059669') : theme.colors.textSecondary },
              ]}
            >
              {isExact ? 'Allowed' : 'Standard Window'}
            </Text>
          </View>
          <Text style={styles.statusItemDesc}>
            {isExact
              ? 'SCHEDULE_EXACT_ALARM is authorized. Reminders trigger precisely at the scheduled second.'
              : 'Android batches background alarms into delivery windows to preserve device battery life.'}
          </Text>

          <View style={styles.innerDivider} />

          <View style={styles.statusRowItem}>
            <Text style={styles.statusItemLabel}>Battery Saver (Doze)</Text>
            <Text
              style={[
                styles.statusItemValue,
                { color: isExempt ? (isDark ? '#34D399' : '#059669') : theme.colors.textSecondary },
              ]}
            >
              {isExempt ? 'Exempt' : 'Optimized (Active)'}
            </Text>
          </View>
          <Text style={styles.statusItemDesc}>
            {isExempt
              ? 'App is exempt from battery optimization; alerts fire unhindered during deep sleep.'
              : 'Standard Android battery optimization applies. Deep sleep (Doze mode) may adjust delivery timing.'}
          </Text>
        </View>
      </View>
    </AppDialog>
  );
}

const createPermissionStyles = (theme, isDark) =>
  StyleSheet.create({
    contentBox: {
      paddingVertical: 2,
    },
    paragraph: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18.5,
      marginBottom: 12,
    },
    infoCard: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      marginBottom: 10,
    },
    infoTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    infoBullet: {
      fontSize: 11.5,
      color: theme.colors.textSecondary,
      lineHeight: 17,
    },
    blockedNotice: {
      backgroundColor: isDark ? 'rgba(251, 146, 60, 0.15)' : '#FFF7ED',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(251, 146, 60, 0.3)' : '#FED7AA',
      borderRadius: 10,
      padding: 10,
      marginTop: 4,
    },
    blockedNoticeText: {
      fontSize: 11.5,
      color: isDark ? '#FB923C' : '#C2410C',
      lineHeight: 16,
      fontWeight: '500',
    },
    decoupledNotice: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 10,
      marginTop: 4,
    },
    decoupledNoticeText: {
      fontSize: 11.5,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    statusSectionCard: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
    },
    statusRowItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
    },
    statusItemLabel: {
      fontSize: 12.5,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    statusItemValue: {
      fontSize: 12,
      fontWeight: '600',
    },
    statusItemDesc: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      lineHeight: 15.5,
    },
    innerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.divider,
      marginVertical: 10,
    },
  });
