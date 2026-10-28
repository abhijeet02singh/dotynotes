import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  AppState,
  ActivityIndicator,
} from 'react-native';
import {
  isNativeModuleAvailable,
  checkOverlayPermission,
  requestOverlayPermission,
  startFloatingOverlay,
  stopFloatingOverlay,
  isFloatingOverlayRunning,
} from '../../modules/floating-dot-overlay';
import { useTheme } from '../context/ThemeContext';
import AppDialog from '../components/AppDialog';
import PermissionDialog from '../components/PermissionDialog';
import AppIcon from '../components/AppIcon';

export default function FloatingDotScreen({ onBackToNotes }) {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createFloatingStyles(theme, isDark), [theme, isDark]);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Redesigned Dialog states
  const [isPermissionDialogVisible, setIsPermissionDialogVisible] = useState(false);
  const [appDialogConfig, setAppDialogConfig] = useState(null);

  // Check actual overlay permission and running state from native module
  const checkStatus = useCallback(async () => {
    try {
      if (isNativeModuleAvailable) {
        const granted = await checkOverlayPermission();
        setHasPermission(Boolean(granted));
        setIsRunning(isFloatingOverlayRunning());
      } else {
        setHasPermission(false);
        setIsRunning(false);
      }
    } catch (e) {
      console.warn('Error checking overlay permission:', e);
    }
  }, []);

  // Refresh status on mount and when app returns to foreground from Android Settings
  useEffect(() => {
    checkStatus();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkStatus]);

  // Request Android overlay permission
  const handleOpenSettings = async () => {
    if (!isNativeModuleAvailable) {
      setAppDialogConfig({
        visible: true,
        title: 'Development Build Required',
        subtitle: 'Native module needed',
        message: 'System overlays require an Expo development build containing native modules.',
        icon: 'dot',
        iconColor: '#6B7280',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
      });
      return;
    }

    try {
      await requestOverlayPermission();
    } catch (err) {
      setAppDialogConfig({
        visible: true,
        title: 'Settings Error',
        message: err.message || 'Could not open Android settings.',
        icon: 'alert',
        iconColor: '#DC2626',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
      });
    }
  };

  // Toggle overlay service on or off
  const handleToggleOverlay = async () => {
    if (!isNativeModuleAvailable) {
      setAppDialogConfig({
        visible: true,
        title: 'Development Build Required',
        subtitle: 'Native module needed',
        message: 'Real system-level overlays across other apps require a development build containing native modules.',
        icon: 'dot',
        iconColor: '#6B7280',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
      });
      return;
    }

    if (!hasPermission) {
      setIsPermissionDialogVisible(true);
      return;
    }

    setIsProcessing(true);
    try {
      if (isRunning) {
        await stopFloatingOverlay();
        setIsRunning(false);
      } else {
        await startFloatingOverlay();
        setIsRunning(true);
      }
    } catch (err) {
      setAppDialogConfig({
        visible: true,
        title: 'Overlay Service Error',
        message: err.message || 'Failed to toggle Floating Dot overlay.',
        icon: 'alert',
        iconColor: '#DC2626',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerBadgeRow}>
          <View style={styles.headerLogoBadge}>
            <View style={styles.headerLogoDot} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>Floating Dot</Text>
            <Text style={styles.headerSubtitle}>Quick notes, anywhere.</Text>
          </View>
        </View>
        <Text style={styles.headerDescription}>
          Capture your thoughts without leaving the app you&apos;re using.
        </Text>
      </View>

      {/* 2. Primary Status Card */}
      <View style={styles.card}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.statusLabel}>OVERLAY SERVICE</Text>
          <View
            style={[
              styles.statusPill,
              isRunning ? styles.statusPillActive : styles.statusPillInactive,
            ]}
          >
            {isRunning && <View style={styles.statusPulseDot} />}
            <Text
              style={[
                styles.statusPillText,
                isRunning ? styles.statusPillTextActive : styles.statusPillTextInactive,
              ]}
            >
              {isRunning ? 'Active' : 'Off'}
            </Text>
          </View>
        </View>

        <Text style={styles.statusHeading}>
          {isRunning ? 'Floating Dot is Active' : 'Floating Dot is Off'}
        </Text>
        <Text style={styles.statusSupportingText}>
          {isRunning
            ? 'Your quick notes are ready whenever you need them.'
            : 'Start Floating Dot to access Quick Pad over other apps.'}
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryActionBtn,
            isRunning ? styles.stopBtn : styles.startBtn,
            isProcessing && styles.btnDisabled,
          ]}
          onPress={handleToggleOverlay}
          disabled={isProcessing}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? 'Stop Floating Dot' : 'Start Floating Dot'}
        >
          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color={isRunning ? theme.colors.dangerText : '#FFFFFF'}
            />
          ) : (
            <Text
              style={[
                styles.primaryActionBtnText,
                isRunning && styles.stopBtnText,
              ]}
            >
              {isRunning ? 'Stop Floating Dot' : 'Start Floating Dot'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. Permission Management */}
      {hasPermission ? (
        <View style={styles.permissionCompactCard}>
          <View style={styles.permissionLeft}>
            <View style={styles.permissionCheckBadge}>
              <AppIcon name="check" size={13} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={styles.permissionTextGroup}>
              <Text style={styles.permissionTitle}>Display Over Other Apps</Text>
              <Text style={styles.permissionSubtitle}>Permission enabled</Text>
            </View>
          </View>
          <View style={styles.grantedPill}>
            <Text style={styles.grantedPillText}>Enabled</Text>
          </View>
        </View>
      ) : (
        <View style={styles.permissionCard}>
          <View style={styles.permissionHeaderRow}>
            <Text style={styles.permissionTitle}>Display Over Other Apps</Text>
            <View style={styles.permissionAlertPill}>
              <Text style={styles.permissionAlertPillText}>Action Required</Text>
            </View>
          </View>
          <Text style={styles.permissionCardText}>
            DotyNotes needs permission to show the floating handle over other apps.
          </Text>
          <TouchableOpacity
            style={styles.enablePermissionBtn}
            onPress={handleOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Enable display over other apps permission"
          >
            <Text style={styles.enablePermissionBtnText}>Enable Permission</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Compact How-To Card */}
      <View style={styles.card}>
        <Text style={styles.howToTitle}>How to use Floating Dot</Text>
        <View style={styles.howToList}>
          <View style={styles.howToItem}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.howToText}>Tap the edge handle to open Quick Pad.</Text>
          </View>

          <View style={styles.howToItem}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.howToText}>Select a note to continue editing.</Text>
          </View>

          <View style={styles.howToItem}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.howToText}>Tap + to create a new note.</Text>
          </View>

          <View style={styles.howToItem}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>4</Text>
            </View>
            <Text style={styles.howToText}>Drag the handle to reposition it.</Text>
          </View>
        </View>
      </View>

      {/* Back to Notes Navigation Link */}
      {onBackToNotes && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToNotes}
          accessibilityRole="button"
          accessibilityLabel="Back to notes"
        >
          <Text style={styles.backButtonText}>← Back to Notes</Text>
        </TouchableOpacity>
      )}

      {/* Redesigned Overlay Permission Dialog */}
      <PermissionDialog
        visible={isPermissionDialogVisible}
        type="overlay"
        isOverlayGranted={hasPermission}
        onRequestOverlayPermission={handleOpenSettings}
        onClose={() => setIsPermissionDialogVisible(false)}
      />

      {/* General In-App Dialog */}
      {appDialogConfig && (
        <AppDialog
          visible={Boolean(appDialogConfig?.visible)}
          title={appDialogConfig?.title || 'Notice'}
          subtitle={appDialogConfig?.subtitle}
          message={appDialogConfig?.message}
          icon={appDialogConfig?.icon}
          iconColor={appDialogConfig?.iconColor}
          buttons={appDialogConfig?.buttons || [
            { text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) },
          ]}
          showCloseButton
          onClose={() => setAppDialogConfig(null)}
        />
      )}
    </ScrollView>
  );
}

const createFloatingStyles = (theme, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 16,
    },
    headerBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    headerLogoBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerLogoDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.success,
    },
    headerTextCol: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.primaryText,
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.accent,
      marginTop: 1,
    },
    headerDescription: {
      fontSize: 13.5,
      color: theme.colors.secondaryText,
      lineHeight: 19,
      marginTop: 4,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    statusHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    statusLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: theme.colors.secondaryText,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 8,
      gap: 5,
    },
    statusPillActive: {
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5',
    },
    statusPillInactive: {
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F3F4F6',
    },
    statusPulseDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.success,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    statusPillTextActive: {
      color: isDark ? '#34D399' : '#059669',
    },
    statusPillTextInactive: {
      color: theme.colors.secondaryText,
    },
    statusHeading: {
      fontSize: 16.5,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: 4,
    },
    statusSupportingText: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      lineHeight: 18,
      marginBottom: 16,
    },
    primaryActionBtn: {
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    startBtn: {
      backgroundColor: theme.colors.accent,
    },
    stopBtn: {
      backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#FECDD3',
    },
    stopBtnText: {
      color: isDark ? '#F87171' : '#DC2626',
    },
    btnDisabled: {
      opacity: 0.6,
    },
    primaryActionBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
    permissionCompactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    permissionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    permissionCheckBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    permissionCheckIcon: {
      fontSize: 12,
      fontWeight: '800',
      color: isDark ? '#34D399' : '#059669',
    },
    permissionTextGroup: {
      flex: 1,
    },
    permissionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    permissionSubtitle: {
      fontSize: 11.5,
      color: theme.colors.secondaryText,
      marginTop: 1,
    },
    grantedPill: {
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    grantedPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#34D399' : '#059669',
    },
    permissionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    permissionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    permissionAlertPill: {
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFF7ED',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    permissionAlertPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#FBBF24' : '#C2410C',
    },
    permissionCardText: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      lineHeight: 18,
      marginBottom: 12,
    },
    enablePermissionBtn: {
      backgroundColor: theme.colors.accent,
      minHeight: 42,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    enablePermissionBtnText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      fontWeight: '700',
    },
    howToTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: 12,
    },
    howToList: {
      gap: 10,
    },
    howToItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    howToText: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      flex: 1,
    },
    backButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
  });
