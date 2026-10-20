import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  AppState,
} from 'react-native';
import {
  isNativeModuleAvailable,
  checkOverlayPermission,
  requestOverlayPermission,
  startFloatingOverlay,
  stopFloatingOverlay,
  isFloatingOverlayRunning,
} from '../../modules/floating-dot-overlay';
import { THEME } from '../constants/theme';

export default function FloatingDotScreen({ onBackToNotes }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [isSimulatedActive, setIsSimulatedActive] = useState(false);

  // Check overlay permission
  const checkStatus = useCallback(async () => {
    setCheckingPermission(true);
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
    } finally {
      setCheckingPermission(false);
    }
  }, []);

  // Re-check permission when user returns from Android Settings
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

  const handleOpenSettings = async () => {
    if (!isNativeModuleAvailable) {
      Alert.alert(
        'Expo Go Environment',
        'Custom native overlay permissions and WindowManager code require an Expo Development Build. Expo Go only includes its precompiled modules.\n\nUse EAS Build to compile a development APK for real device testing.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await requestOverlayPermission();
    } catch (err) {
      Alert.alert('Settings Error', err.message || 'Could not open Android settings.');
    }
  };

  const handleToggleOverlay = async () => {
    if (!isNativeModuleAvailable) {
      Alert.alert(
        'Native Build Required',
        'Real system-level overlays across other apps cannot run inside Expo Go because Expo Go cannot bundle custom native Kotlin code.\n\nWould you like to toggle the in-app prototype simulation instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Toggle Simulation',
            onPress: () => setIsSimulatedActive(!isSimulatedActive),
          },
        ]
      );
      return;
    }

    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'You must grant "Display over other apps" permission in Android settings before starting the floating dot.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: handleOpenSettings },
        ]
      );
      return;
    }

    try {
      if (isRunning) {
        await stopFloatingOverlay();
        setIsRunning(false);
        Alert.alert('Floating Dot Stopped', 'The overlay service has been stopped.');
      } else {
        const started = await startFloatingOverlay();
        if (started) {
          setIsRunning(true);
          Alert.alert(
            'Floating Dot Active! 🟢',
            'DotyNotes is now floating over your other apps. You can drag it anywhere or tap it to capture quick notes.'
          );
        } else {
          Alert.alert('Start Failed', 'Could not start overlay service. Check permissions.');
        }
      }
    } catch (err) {
      Alert.alert('Overlay Error', err.message || 'Failed to toggle floating overlay.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title & Description */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.dotyLogo}>
            <View style={styles.innerDot} />
          </View>
          <Text style={styles.title}>System Floating Dot</Text>
        </View>
        <Text style={styles.subtitle}>
          Keep DotyNotes floating over any app to capture thoughts without leaving what you are doing.
        </Text>
      </View>

      {/* 1. Runtime Environment Status Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Runtime Environment</Text>
          <View
            style={[
              styles.statusPill,
              isNativeModuleAvailable ? styles.pillSuccess : styles.pillWarning,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isNativeModuleAvailable ? styles.pillTextSuccess : styles.pillTextWarning,
              ]}
            >
              {isNativeModuleAvailable ? 'Native Build' : 'Expo Go'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardText}>
          {isNativeModuleAvailable
            ? '✅ Native Kotlin module loaded. Ready to display real system-level overlays via Android WindowManager.'
            : '⚠️ Running inside Expo Go. Expo Go only includes precompiled modules and cannot execute custom native WindowManager code. A development build (custom APK) is required for real system overlays.'}
        </Text>
      </View>

      {/* 2. Overlay Permission Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Overlay Permission</Text>
          <View
            style={[
              styles.statusPill,
              hasPermission ? styles.pillSuccess : styles.pillDanger,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                hasPermission ? styles.pillTextSuccess : styles.pillTextDanger,
              ]}
            >
              {checkingPermission
                ? 'Checking...'
                : hasPermission
                ? 'Granted'
                : 'Required'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardText}>
          Android requires explicit permission for an app to display a floating window over other applications (SYSTEM_ALERT_WINDOW).
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Open Android overlay settings"
          >
            <Text style={styles.settingsButtonText}>⚙️ Open Android Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={checkStatus}
            accessibilityRole="button"
            accessibilityLabel="Refresh permission status"
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Floating Overlay Control Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Overlay Service</Text>
          <View
            style={[
              styles.statusPill,
              isRunning ? styles.pillSuccess : styles.pillMuted,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isRunning ? styles.pillTextSuccess : styles.pillTextMuted,
              ]}
            >
              {isRunning ? 'Active Over Apps' : 'Stopped'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardText}>
          When active, a draggable purple floating dot appears on your screen. Tap it anytime to open the compact quick pad and write notes directly to SQLite.
        </Text>

        <TouchableOpacity
          style={[
            styles.toggleServiceBtn,
            isRunning ? styles.toggleServiceBtnStop : styles.toggleServiceBtnStart,
          ]}
          onPress={handleToggleOverlay}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? 'Stop floating dot' : 'Start floating dot'}
        >
          <Text style={styles.toggleServiceBtnText}>
            {isRunning ? '🛑 Stop Floating Dot' : '🟢 Start Floating Dot'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Development Build Instructions Card */}
      {!isNativeModuleAvailable && (
        <View style={[styles.card, styles.instructionCard]}>
          <Text style={styles.instructionTitle}>📱 How to Test on Real Device</Text>
          <Text style={styles.instructionStep}>
            1. Install EAS CLI: <Text style={styles.codeText}>npm install -g eas-cli</Text>
          </Text>
          <Text style={styles.instructionStep}>
            2. Run cloud development build:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeBlockText}>eas build --profile development --platform android</Text>
          </View>
          <Text style={styles.instructionStep}>
            3. Download and install the development APK on your Android device.
          </Text>
          <Text style={styles.instructionStep}>
            4. Start Metro bundler: <Text style={styles.codeText}>npx expo start</Text>
          </Text>
        </View>
      )}

      {/* Back to Notes Button */}
      {onBackToNotes && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToNotes}
          accessibilityRole="button"
          accessibilityLabel="Back to notes list"
        >
          <Text style={styles.backButtonText}>← Back to My Notes</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  header: {
    marginBottom: THEME.spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  dotyLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.subtle,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  cardText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: THEME.spacing.md,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
  },
  pillSuccess: {
    backgroundColor: '#DCFCE7',
  },
  pillWarning: {
    backgroundColor: '#FEF9C3',
  },
  pillDanger: {
    backgroundColor: '#FEE2E2',
  },
  pillMuted: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pillTextSuccess: {
    color: '#15803D',
  },
  pillTextWarning: {
    color: '#A16207',
  },
  pillTextDanger: {
    color: '#B91C1C',
  },
  pillTextMuted: {
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsButton: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  refreshButton: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 10,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  refreshButtonText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleServiceBtn: {
    paddingVertical: 12,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  toggleServiceBtnStart: {
    backgroundColor: '#10B981',
  },
  toggleServiceBtnStop: {
    backgroundColor: '#EF4444',
  },
  toggleServiceBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  instructionCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  codeBlock: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
  },
  codeBlockText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#38BDF8',
  },
  backButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
