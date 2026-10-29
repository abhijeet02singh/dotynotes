import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  AppState,
  Switch,
  Share,
  Modal,
  TextInput,
  Vibration,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SettingsIcon from '../components/SettingsIcon';
import {
  getSettingAsync,
  setSettingAsync,
  exportAllNotesToJsonAsync,
  importNotesFromJsonAsync,
  validateBackupPayload,
} from '../services/notesDb';
import {
  isNativeModuleAvailable,
  checkOverlayPermission,
  requestOverlayPermission,
  startFloatingOverlay,
  stopFloatingOverlay,
  isFloatingOverlayRunning,
} from '../../modules/floating-dot-overlay';
import {
  getNotificationPermissionStatusAsync,
  requestNotificationPermissionAsync,
  getReminderDeliveryStatusAsync,
} from '../services/notificationService';
import { getInstalledAppVersion } from '../services/updateService';
import AppDialog from '../components/AppDialog';
import PermissionDialog from '../components/PermissionDialog';
import SelectionModal from '../components/SelectionModal';

export default function SettingsScreen({
  onBackToNotes,
  counts = { all: 0, pinned: 0, archived: 0 },
  onDefaultColorChange,
  onNavigateToFloating,
  onNavigateToAbout,
  onNavigateToPrivacy,
  onReplayOnboarding,
  onCheckForUpdates,
  isCheckingUpdate = false,
}) {
  const {
    themeMode,
    colorTheme,
    resolvedTheme,
    isDark,
    theme,
    setThemeMode,
    setColorTheme,
    defaultStickyColor,
    setDefaultStickyColor,
    pastels,
    getPastelColor,
    colorThemes,
  } = useTheme();

  // General preferences
  const [defaultColor, setDefaultColor] = useState(defaultStickyColor || 'lavender');
  const [colorSaveFeedback, setColorSaveFeedback] = useState(false);
  const [defaultReminderTime, setDefaultReminderTime] = useState('09:00 AM');
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Time Picker Modal States
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerPeriod, setPickerPeriod] = useState('AM');

  // System Permission & Service States
  const [notificationStatus, setNotificationStatus] = useState({
    granted: false,
    canAskAgain: true,
    status: 'checking',
  });
  const [deliveryStatus, setDeliveryStatus] = useState({
    status: 'checking',
    label: 'Checking...',
    badge: 'Checking...',
    description: '',
    exactAlarmsAllowed: false,
    batteryExempt: false,
  });
  const [isOverlayGranted, setIsOverlayGranted] = useState(false);
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [isTogglingOverlay, setIsTogglingOverlay] = useState(false);

  // Backup & Restore States
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreValidation, setRestoreValidation] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Redesigned Dialog & Modal States
  const [activePermissionDialog, setActivePermissionDialog] = useState(null); // 'notification' | 'overlay' | 'delivery' | null
  const [appDialogConfig, setAppDialogConfig] = useState(null);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);

  // Load persistent settings and actual Android system permissions
  const refreshAllStatus = useCallback(async () => {
    try {
      // 1. Persistent Default Color from SQLite app_metadata
      const savedColor = await getSettingAsync('default_note_color', 'purple');
      if (savedColor) setDefaultColor(savedColor);

      // 2. Persistent Default Reminder Time preset
      const savedTime = await getSettingAsync('default_reminder_time', '09:00 AM');
      if (savedTime) setDefaultReminderTime(savedTime);

      // 3. Persistent Haptic Feedback preference
      const savedHaptic = await getSettingAsync('haptic_feedback_enabled', '1');
      setHapticEnabled(savedHaptic !== '0');

      // 4. Real Android Notification Permission
      const notifState = await getNotificationPermissionStatusAsync();
      setNotificationStatus(notifState);

      // 5. Real Android Reminder Delivery & Optimization Status
      const deliveryInfo = await getReminderDeliveryStatusAsync();
      setDeliveryStatus(deliveryInfo);

      // 6. Real Android Overlay Permission & Service Status (canDrawOverlays)
      if (isNativeModuleAvailable) {
        const overlayPerm = await checkOverlayPermission();
        setIsOverlayGranted(Boolean(overlayPerm));

        const overlayRunning = await isFloatingOverlayRunning();
        setIsOverlayActive(Boolean(overlayRunning));
      } else {
        setIsOverlayGranted(false);
        setIsOverlayActive(false);
      }
    } catch (err) {
      console.warn('[SettingsScreen] refreshAllStatus warning:', err.message);
    }
  }, []);

  useEffect(() => {
    refreshAllStatus();

    // Re-check actual system state when returning from system Settings
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshAllStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshAllStatus]);

  // Handle changing the default sticky-note color
  const handleSelectDefaultColor = async (colorId) => {
    setDefaultColor(colorId);
    await setDefaultStickyColor(colorId);
    if (hapticEnabled) {
      try {
        Vibration.vibrate(15);
      } catch (_) {}
    }
    if (onDefaultColorChange) {
      onDefaultColorChange(colorId);
    }
    setColorSaveFeedback(true);
    setTimeout(() => {
      setColorSaveFeedback(false);
    }, 2000);
  };

  // Toggle Haptic Feedback
  const handleToggleHaptic = async (val) => {
    setHapticEnabled(val);
    await setSettingAsync('haptic_feedback_enabled', val ? '1' : '0');
    if (val) {
      try {
        Vibration.vibrate(20);
      } catch (_) {}
    }
  };

  // Parse time string e.g. "09:00 AM" into components
  const parseTimeString = (timeStr) => {
    try {
      const parts = (timeStr || '09:00 AM').trim().split(' ');
      if (parts.length === 2) {
        const [hStr, mStr] = parts[0].split(':');
        const h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        const p = parts[1].toUpperCase() === 'PM' ? 'PM' : 'AM';
        return {
          hour: !isNaN(h) && h >= 1 && h <= 12 ? h : 9,
          minute: !isNaN(m) && m >= 0 && m < 60 ? m : 0,
          period: p,
        };
      }
    } catch (_) {}
    return { hour: 9, minute: 0, period: 'AM' };
  };

  // Open Interactive Default Reminder Time Picker
  const handleOpenTimePicker = () => {
    const parsed = parseTimeString(defaultReminderTime);
    setPickerHour(parsed.hour);
    setPickerMinute(parsed.minute);
    setPickerPeriod(parsed.period);
    setIsTimePickerVisible(true);
  };

  // Save Default Reminder Time (Applies to new notes only, never touches existing reminders)
  const handleSaveDefaultReminderTime = async () => {
    const formatted = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')} ${pickerPeriod}`;
    setDefaultReminderTime(formatted);
    setIsTimePickerVisible(false);

    if (hapticEnabled) {
      try {
        Vibration.vibrate(15);
      } catch (_) {}
    }

    // Persist to SQLite metadata only. CRITICAL: Existing note reminders are never modified!
    await setSettingAsync('default_reminder_time', formatted);
  };

  // Current active color theme definition
  const currentColorThemeDef = useMemo(() => {
    return colorThemes?.find((ct) => ct.id === colorTheme) || colorThemes?.[0] || {
      id: 'purple',
      name: 'Doty Purple',
      colorHex: '#8B5CF6',
    };
  }, [colorThemes, colorTheme]);

  // Structured Theme Sections (Appearance Modes + 7 Custom Color Themes)
  const THEME_SECTIONS = useMemo(() => {
    return [
      {
        title: 'APPEARANCE',
        selectedId: themeMode,
        onSelectOption: (option) => {
          setThemeMode(option.id);
          if (hapticEnabled) {
            try { Vibration.vibrate(15); } catch (_) {}
          }
        },
        options: [
          {
            id: 'light',
            title: 'Light Theme',
            description: 'Clean light interface with comfortable contrast.',
            icon: 'sun',
          },
          {
            id: 'dark',
            title: 'Dark Theme',
            description: 'Dark interface designed for comfortable viewing in low light.',
            icon: 'moon',
          },
          {
            id: 'system',
            title: 'System Default',
            description: "Automatically follows your device's light or dark appearance.",
            icon: 'device',
          },
        ],
      },
      {
        title: 'COLOR THEMES',
        selectedId: colorTheme,
        onSelectOption: (option) => {
          setColorTheme(option.id);
          if (hapticEnabled) {
            try { Vibration.vibrate(15); } catch (_) {}
          }
        },
        options: (colorThemes || []).map((ct) => ({
          id: ct.id,
          title: ct.name,
          description: ct.description,
          swatchColor: ct.colorHex,
          accentHex: ct.accentHex,
        })),
      },
    ];
  }, [themeMode, colorTheme, colorThemes, hapticEnabled, setThemeMode, setColorTheme]);

  // Notification Permission Row Action (Opens Redesigned PermissionDialog)
  const handleNotificationRowPress = () => {
    setActivePermissionDialog('notification');
  };

  // Reminder Delivery & Optimization Details (Opens Redesigned Delivery Dialog)
  const handleShowDeliveryDetails = () => {
    setActivePermissionDialog('delivery');
  };

  // Display Over Other Apps Permission Row Action (Opens Redesigned Overlay Dialog)
  const handleOverlayPermissionPress = () => {
    setActivePermissionDialog('overlay');
  };

  // Floating Dot Service Switch Action (Independent of permission state)
  const handleToggleOverlayService = async (nextValue) => {
    if (!isNativeModuleAvailable) {
      setAppDialogConfig({
        visible: true,
        title: 'Service Unavailable',
        subtitle: 'Development build required',
        message: 'Floating Dot native overlay module is not compiled into this build. A development build with native modules is required.',
        icon: 'dot',
        iconColor: '#6B7280',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
      });
      return;
    }

    if (nextValue) {
      // User is turning the service ON: verify permission first
      if (!isOverlayGranted) {
        setActivePermissionDialog('overlay');
        return;
      }

      setIsTogglingOverlay(true);
      try {
        await startFloatingOverlay();
        setIsOverlayActive(true);
      } catch (err) {
        setAppDialogConfig({
          visible: true,
          title: 'Overlay Service Error',
          message: err.message || 'Failed to start Floating Dot overlay service.',
          icon: 'alert',
          iconColor: '#DC2626',
          iconBgColor: '#FEF2F2',
          buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
        });
      } finally {
        setIsTogglingOverlay(false);
      }
    } else {
      // User is turning the service OFF
      setIsTogglingOverlay(true);
      try {
        await stopFloatingOverlay();
        setIsOverlayActive(false);
      } catch (err) {
        setAppDialogConfig({
          visible: true,
          title: 'Overlay Service Error',
          message: err.message || 'Failed to stop Floating Dot overlay service.',
          icon: 'alert',
          iconColor: '#DC2626',
          iconBgColor: '#FEF2F2',
          buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
        });
      } finally {
        setIsTogglingOverlay(false);
      }
    }
  };

  // Export Notes Backup (JSON)
  const handleExportBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const json = await exportAllNotesToJsonAsync();
      const parsed = JSON.parse(json);

      const noteCount =
        parsed.metadata?.totalNotes ?? parsed.totalNotes ?? parsed.data?.notes?.length ?? 0;

      await Share.share({
        title: 'DotyNotes_Backup.json',
        message: json,
      });

      setAppDialogConfig({
        visible: true,
        title: 'Backup Exported',
        subtitle: 'DotyNotes JSON format',
        icon: 'export',
        iconColor: '#6D28D9',
        iconBgColor: '#F1EAFE',
        statusBadge: { label: 'Export Successful', type: 'success' },
        message: `Successfully exported ${noteCount} note(s) and preferences in versioned DotyNotes JSON format.\n\nAll titles, content, formatting, reminders, and tags are preserved.`,
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => setAppDialogConfig(null),
          },
        ],
      });
    } catch (err) {
      setAppDialogConfig({
        visible: true,
        title: 'Export Error',
        message: err.message || 'Failed to export notes backup.',
        icon: 'alert',
        iconColor: '#DC2626',
        iconBgColor: '#FEF2F2',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Validate Restore Input
  const handleValidateRestoreText = (text) => {
    setRestoreJsonInput(text);
    if (!text || text.trim().length === 0) {
      setRestoreValidation(null);
      return;
    }
    const val = validateBackupPayload(text);
    setRestoreValidation(val);
  };

  // Confirm Restore Operation
  const handleConfirmRestore = async () => {
    if (!restoreValidation || !restoreValidation.isValid) {
      setAppDialogConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please paste a valid DotyNotes JSON backup before restoring.',
        icon: 'alert',
        iconColor: '#C2410C',
        iconBgColor: '#FFF7ED',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
      });
      return;
    }

    setIsRestoring(true);
    try {
      const result = await importNotesFromJsonAsync(restoreJsonInput);
      setIsRestoring(false);
      setIsRestoreModalVisible(false);
      setRestoreJsonInput('');
      setRestoreValidation(null);

      const prefMsg = result.settingsRestoredCount
        ? ` and ${result.settingsRestoredCount} preference(s)`
        : '';

      setAppDialogConfig({
        visible: true,
        title: 'Restore Completed',
        subtitle: 'Synchronized with SQLite',
        icon: 'restore',
        iconColor: '#059669',
        iconBgColor: '#ECFDF5',
        statusBadge: { label: 'Restore Successful', type: 'success' },
        message: `Restored ${result.importedCount} note(s) (${result.newCount} new, ${result.updatedCount} updated)${prefMsg}.\n\nFuture reminders have been safely reconciled with Android.`,
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => {
              setAppDialogConfig(null);
              if (onBackToNotes) {
                onBackToNotes();
              }
            },
          },
        ],
      });
    } catch (err) {
      setIsRestoring(false);
      setAppDialogConfig({
        visible: true,
        title: 'Restore Error',
        message: err.message || 'Failed to restore notes from backup.',
        icon: 'alert',
        iconColor: '#DC2626',
        iconBgColor: '#FEF2F2',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) }],
      });
    }
  };

  const selectedPastel = useMemo(() => {
    return getPastelColor(defaultStickyColor || defaultColor);
  }, [defaultStickyColor, defaultColor, getPastelColor]);

  const styles = useMemo(() => createSettingsStyles(theme, isDark), [theme, isDark]);
  const neutralIconColor = isDark ? '#A7ADBA' : '#4B5563';

  return (
    <View style={styles.screenWrapper}>
      {/* 1. Header with Flick-Style Minimal Top Bar */}
      <View style={styles.headerBar}>
        {onBackToNotes ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToNotes}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel="Back to notes"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SettingsIcon name="chevron-left" size={16} color={theme.colors.primaryText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ==================================================
            SECTION A: GENERAL
            ================================================== */}
        <Text style={styles.sectionHeader}>GENERAL</Text>
        <View style={styles.sectionCard}>
          {/* Row 1: Theme (Tapping opens Theme SelectionModal) */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => setIsThemeModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Select theme"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="theme" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Theme</Text>
              <Text style={styles.itemSubtitle}>
                {currentColorThemeDef?.name || 'Doty Purple'} • {themeMode === 'light' ? 'Light' : themeMode === 'dark' ? 'Dark' : `System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`}
              </Text>
            </View>
            <View style={styles.rowRightGroup}>
              <Text style={styles.valueText}>
                {currentColorThemeDef?.name || 'Doty Purple'}
              </Text>
              <SettingsIcon name="chevron-right" size={11} color={neutralIconColor} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2: Default Sticky Color */}
          <View style={styles.colorItemBlock}>
            <View style={styles.colorItemHeaderRow}>
              <View style={styles.iconContainer}>
                <SettingsIcon name="color" size={18} color={neutralIconColor} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.itemTitle}>Default Sticky Color</Text>
                <Text style={styles.itemSubtitle}>
                  Initial palette for newly created notes
                </Text>
              </View>
              {colorSaveFeedback ? (
                <View style={styles.savedPill}>
                  <Text style={styles.savedPillText}>Saved ✓</Text>
                </View>
              ) : (
                <View style={styles.rowRightGroup}>
                  <Text style={[styles.valueText, { color: selectedPastel.accent || '#6D28D9', fontWeight: '600' }]}>
                    {selectedPastel.name || selectedPastel.id}
                  </Text>
                </View>
              )}
            </View>

            {/* 7 Responsive Dedicated Pastel Swatches */}
            <View style={styles.swatchesContainer}>
              {pastels.map((pastel) => {
                const isSelected = getPastelColor(defaultStickyColor || defaultColor).id === pastel.id;
                return (
                  <TouchableOpacity
                    key={pastel.id}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: pastel.bg, borderColor: pastel.border },
                      isSelected && styles.colorSwatchSelected,
                    ]}
                    onPress={() => handleSelectDefaultColor(pastel.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${pastel.name || pastel.id} default color`}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {isSelected && (
                      <View style={[styles.colorSwatchIndicator, { backgroundColor: pastel.accent || '#6D28D9' }]}>
                        <SettingsIcon name="check" size={9} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 3: Haptic Feedback */}
          <View style={styles.itemRow}>
            <View style={styles.iconContainer}>
              <SettingsIcon name="haptic" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Haptic Feedback</Text>
              <Text style={styles.itemSubtitle}>Physical vibrations across all interactions</Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={handleToggleHaptic}
              trackColor={{ false: isDark ? '#30343E' : '#E5E7EB', true: theme.colors.accent }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Toggle haptic feedback"
            />
          </View>
        </View>

        {/* ==================================================
            SECTION B: NOTES & EDITOR
            ================================================== */}
        <Text style={styles.sectionHeader}>NOTES & EDITOR</Text>
        <View style={styles.sectionCard}>
          {/* Row 1: Rich Text */}
          <View style={styles.itemRow}>
            <View style={styles.iconContainer}>
              <SettingsIcon name="format" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Rich-Text Formatting</Text>
              <Text style={styles.itemSubtitle}>Bold, Italic, and Underline with native Spannables</Text>
            </View>
            <View style={styles.badgeNeutral}>
              <Text style={styles.badgeNeutralText}>B I U</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 2: Lists & Checklists */}
          <View style={styles.itemRow}>
            <View style={styles.iconContainer}>
              <SettingsIcon name="checklist" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Lists & Checklists</Text>
              <Text style={styles.itemSubtitle}>Interactive task checkboxes and bullet points</Text>
            </View>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>Supported</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 3: Instant Auto-Save */}
          <View style={styles.itemRow}>
            <View style={styles.iconContainer}>
              <SettingsIcon name="autosave" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Instant Auto-Save</Text>
              <Text style={styles.itemSubtitle}>Persist note modifications immediately</Text>
            </View>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>Active</Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            SECTION C: REMINDERS & NOTIFICATIONS
            ================================================== */}
        <Text style={styles.sectionHeader}>REMINDERS & NOTIFICATIONS</Text>
        <View style={styles.sectionCard}>
          {/* Row 1: Notification Permission */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleNotificationRowPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Notification Permission"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="bell" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Notification Permission</Text>
              <Text style={styles.itemSubtitle}>Required for scheduled note alert chimes</Text>
            </View>
            {notificationStatus.granted ? (
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>Enabled</Text>
              </View>
            ) : notificationStatus.status === 'unavailable' ? (
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>Unavailable</Text>
              </View>
            ) : !notificationStatus.canAskAgain ? (
              <View style={styles.badgeWarning}>
                <Text style={styles.badgeWarningText}>Blocked</Text>
              </View>
            ) : (
              <View style={styles.badgeWarning}>
                <Text style={styles.badgeWarningText}>Permission Required</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2: Default Reminder Time */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleOpenTimePicker}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Default Reminder Time"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="clock" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Default Reminder Time</Text>
              <Text style={styles.itemSubtitle}>Initial reminder time for new notes</Text>
            </View>
            <View style={styles.rowRightGroup}>
              <Text style={styles.valueTextBold}>{defaultReminderTime}</Text>
              <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 3: Delivery & Optimization */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleShowDeliveryDetails}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Delivery & Optimization"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="info" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Delivery & Optimization</Text>
              <Text style={styles.itemSubtitle}>Android battery limits can adjust alarm timing</Text>
            </View>
            <View style={styles.rowRightGroup}>
              <Text style={styles.subtleBadgeText}>{deliveryStatus.badge || 'Standard Scheduling'}</Text>
              <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ==================================================
            SECTION D: FLOATING DOT
            ================================================== */}
        <Text style={styles.sectionHeader}>FLOATING DOT</Text>
        <View style={styles.sectionCard}>
          {/* Row 1: Overlay Permission (Display Over Other Apps) */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleOverlayPermissionPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Display Over Other Apps Permission"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="overlay" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Display Over Other Apps</Text>
              <Text style={styles.itemSubtitle}>Android permission for floating screen handle</Text>
            </View>
            {!isNativeModuleAvailable ? (
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>Unavailable</Text>
              </View>
            ) : isOverlayGranted ? (
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>Granted</Text>
              </View>
            ) : (
              <View style={styles.badgeWarning}>
                <Text style={styles.badgeWarningText}>Permission Required</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2: Floating Dot Service Switch (Strictly decoupled from permission) */}
          <View style={styles.itemRow}>
            <View style={styles.iconContainer}>
              <SettingsIcon name="dot" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Floating Dot Service</Text>
              <Text style={styles.itemSubtitle}>Quick note pad accessible from any app</Text>
            </View>
            {isTogglingOverlay ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Switch
                value={isOverlayActive}
                onValueChange={handleToggleOverlayService}
                disabled={isTogglingOverlay}
                trackColor={{ false: isDark ? '#30343E' : '#E5E7EB', true: theme.colors.accent }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Toggle Floating Dot service"
              />
            )}
          </View>

          {onNavigateToFloating && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.itemRow}
                onPress={onNavigateToFloating}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open floating dot controls"
              >
                <View style={styles.iconContainer}>
                  <SettingsIcon name="controls" size={18} color={neutralIconColor} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.itemTitle}>Floating Dot Controls</Text>
                  <Text style={styles.itemSubtitle}>Configure handle size, snap, and behavior</Text>
                </View>
                <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ==================================================
            SECTION E: DATA & BACKUP
            ================================================== */}
        <Text style={styles.sectionHeader}>DATA & BACKUP</Text>
        <View style={styles.sectionCard}>
          {/* Row 1: Export Backup (JSON) */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={handleExportBackup}
            disabled={isExporting}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Export notes backup"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="export" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Export Backup (JSON)</Text>
              <Text style={styles.itemSubtitle}>Save all notes and reminders locally</Text>
            </View>
            {isExporting ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 2: Restore Backup (JSON) */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => setIsRestoreModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Restore backup from file"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="restore" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Restore Backup (JSON)</Text>
              <Text style={styles.itemSubtitle}>Restore data from an exported backup file</Text>
            </View>
            <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
          </TouchableOpacity>
        </View>

        {/* ==================================================
            SECTION F: ABOUT (Flick-Style Rows)
            ================================================== */}
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.sectionCard}>
          {/* Row 1: Version */}
          <View style={styles.itemRow}>
            <View style={styles.iconContainer}>
              <SettingsIcon name="info" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Version</Text>
            </View>
            <Text style={styles.valueTextBold}>v{getInstalledAppVersion()}</Text>
          </View>

          <View style={styles.divider} />

          {/* Row 2: Check for Updates */}
          {onCheckForUpdates && (
            <>
              <TouchableOpacity
                style={styles.itemRow}
                onPress={onCheckForUpdates}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Check for Updates"
                disabled={isCheckingUpdate}
              >
                <View style={styles.iconContainer}>
                  <SettingsIcon name="refresh" size={18} color={neutralIconColor} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.itemTitle}>Check for Updates</Text>
                  <Text style={styles.itemSubtitle}>
                    {isCheckingUpdate ? 'Checking for updates...' : 'Verify latest DotyNotes release'}
                  </Text>
                </View>
                {isCheckingUpdate ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
                )}
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}

          {/* Row 3: About DotyNotes */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={onNavigateToAbout}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="About DotyNotes"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="info" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>About DotyNotes</Text>
              <Text style={styles.itemSubtitle}>Learn about DotyNotes and its features.</Text>
            </View>
            <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 3: Replay Onboarding */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={onReplayOnboarding}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Replay Onboarding"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="play-circle" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Replay Onboarding</Text>
              <Text style={styles.itemSubtitle}>Restart the interactive introduction</Text>
            </View>
            <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Row 4: Privacy Policy */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={onNavigateToPrivacy}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Privacy Policy"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="shield" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>Privacy Policy</Text>
              <Text style={styles.itemSubtitle}>How your notes and data are handled.</Text>
            </View>
            <SettingsIcon name="chevron-right" size={11} color={theme.colors.secondaryText} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ==================================================
          RESTORE BACKUP MODAL (Clean, Minimalist Redesign)
          ================================================== */}
      <Modal
        visible={isRestoreModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRestoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconBox}>
                <SettingsIcon name="restore" size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.modalHeaderTextCol}>
                <Text style={styles.modalTitle}>Restore Notes Backup</Text>
                <Text style={styles.modalSubtitle}>Import notes from a DotyNotes JSON backup file</Text>
              </View>
            </View>

            {/* Safe duplicate explanation */}
            <View style={styles.safeNoticeBox}>
              <Text style={styles.safeNoticeText}>
                <Text style={{ fontWeight: '600', color: theme.colors.textPrimary }}>Safe Restore: </Text>
                Existing notes with matching IDs will be updated; new notes will be added. Zero existing notes are deleted.
              </Text>
            </View>

            {/* JSON Input */}
            <Text style={styles.inputLabel}>JSON Backup Payload</Text>
            <TextInput
              style={styles.modalTextInput}
              multiline
              numberOfLines={6}
              value={restoreJsonInput}
              onChangeText={handleValidateRestoreText}
              placeholder='{"formatVersion": 1, "appName": "DotyNotes", "data": {"notes": [...]}}'
              placeholderTextColor={theme.colors.inputPlaceholder}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Validation Feedback */}
            {restoreValidation && (
              <View style={restoreValidation.isValid ? styles.validationSuccessBox : styles.validationErrorBox}>
                <Text style={restoreValidation.isValid ? styles.validationSuccessText : styles.validationErrorText}>
                  {restoreValidation.isValid
                    ? `✓ Valid DotyNotes Backup (v${restoreValidation.summary.version}): Found ${restoreValidation.summary.total} note(s) (${restoreValidation.summary.pinned} pinned, ${restoreValidation.summary.withReminders} reminders)${restoreValidation.summary.hasSettings ? ', with preferences' : ''}.`
                    : `⚠️ ${restoreValidation.error}`}
                </Text>
              </View>
            )}

            {/* Modal Action Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setIsRestoreModalVisible(false);
                  setRestoreJsonInput('');
                  setRestoreValidation(null);
                }}
                disabled={isRestoring}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  (!restoreValidation || !restoreValidation.isValid || isRestoring) && styles.buttonDisabled,
                ]}
                onPress={handleConfirmRestore}
                disabled={!restoreValidation || !restoreValidation.isValid || isRestoring}
                activeOpacity={0.8}
              >
                {isRestoring ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirm Restore</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          DEFAULT REMINDER TIME PICKER MODAL
          ================================================== */}
      <Modal
        visible={isTimePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconBox}>
                <SettingsIcon name="clock" size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.modalHeaderTextCol}>
                <Text style={styles.modalTitle}>Default Reminder Time</Text>
                <Text style={styles.modalSubtitle}>Initial time pre-selected for new note reminders</Text>
              </View>
            </View>

            {/* Safety Notice */}
            <View style={styles.safeNoticeBox}>
              <Text style={styles.safeNoticeText}>
                <Text style={{ fontWeight: '600', color: theme.colors.textPrimary }}>Preservation Guarantee: </Text>
                Only newly created reminders will use this default time. Existing note reminders are never modified.
              </Text>
            </View>

            {/* Quick Presets */}
            <Text style={styles.inputLabel}>Quick Presets</Text>
            <View style={styles.presetButtonsRow}>
              {[
                { label: '09:00 AM', h: 9, m: 0, p: 'AM', title: 'Morning' },
                { label: '01:00 PM', h: 1, m: 0, p: 'PM', title: 'Afternoon' },
                { label: '06:00 PM', h: 6, m: 0, p: 'PM', title: 'Evening' },
                { label: '08:30 PM', h: 8, m: 30, p: 'PM', title: 'Night' },
              ].map((preset) => {
                const isActive =
                  pickerHour === preset.h &&
                  pickerMinute === preset.m &&
                  pickerPeriod === preset.p;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.presetChip, isActive && styles.presetChipActive]}
                    onPress={() => {
                      setPickerHour(preset.h);
                      setPickerMinute(preset.m);
                      setPickerPeriod(preset.p);
                      if (hapticEnabled) {
                        try {
                          Vibration.vibrate(10);
                        } catch (_) {}
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                      {preset.label}
                    </Text>
                    <Text style={[styles.presetChipSub, isActive && styles.presetChipSubActive]}>
                      {preset.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Interactive Time Selector */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Custom Time</Text>
            <View style={styles.timeSelectorCard}>
              {/* Hour Column */}
              <View style={styles.timeUnitCol}>
                <TouchableOpacity
                  style={styles.timeStepperBtn}
                  onPress={() => setPickerHour((prev) => (prev >= 12 ? 1 : prev + 1))}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.timeStepperBtnText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.timeDisplayBox}>
                  <Text style={styles.timeDisplayText}>{String(pickerHour).padStart(2, '0')}</Text>
                  <Text style={styles.timeUnitLabel}>Hour</Text>
                </View>
                <TouchableOpacity
                  style={styles.timeStepperBtn}
                  onPress={() => setPickerHour((prev) => (prev <= 1 ? 12 : prev - 1))}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.timeStepperBtnText}>▼</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeColon}>:</Text>

              {/* Minute Column */}
              <View style={styles.timeUnitCol}>
                <TouchableOpacity
                  style={styles.timeStepperBtn}
                  onPress={() => setPickerMinute((prev) => (prev + 5 >= 60 ? 0 : prev + 5))}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.timeStepperBtnText}>▲</Text>
                </TouchableOpacity>
                <View style={styles.timeDisplayBox}>
                  <Text style={styles.timeDisplayText}>{String(pickerMinute).padStart(2, '0')}</Text>
                  <Text style={styles.timeUnitLabel}>Minute</Text>
                </View>
                <TouchableOpacity
                  style={styles.timeStepperBtn}
                  onPress={() => setPickerMinute((prev) => (prev - 5 < 0 ? 55 : prev - 5))}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.timeStepperBtnText}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* AM / PM Toggle */}
              <View style={styles.periodCol}>
                <TouchableOpacity
                  style={[styles.periodBtn, pickerPeriod === 'AM' && styles.periodBtnActive]}
                  onPress={() => setPickerPeriod('AM')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodBtnText, pickerPeriod === 'AM' && styles.periodBtnTextActive]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodBtn, pickerPeriod === 'PM' && styles.periodBtnActive]}
                  onPress={() => setPickerPeriod('PM')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodBtnText, pickerPeriod === 'PM' && styles.periodBtnTextActive]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Action Buttons */}
            <View style={[styles.modalButtonsRow, { marginTop: 20 }]}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsTimePickerVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleSaveDefaultReminderTime}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmButtonText}>Save Default Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          REDESIGNED PERMISSION & DELIVERY DIALOGS
          ================================================== */}
      <PermissionDialog
        visible={activePermissionDialog !== null}
        type={activePermissionDialog || 'notification'}
        onClose={() => setActivePermissionDialog(null)}
        notificationStatus={notificationStatus}
        onRequestNotificationPermission={async () => {
          const res = await requestNotificationPermissionAsync();
          setNotificationStatus(res);
        }}
        onOpenNotificationSettings={() => Linking.openSettings()}
        isOverlayGranted={isOverlayGranted}
        onRequestOverlayPermission={async () => {
          await requestOverlayPermission();
        }}
        deliveryStatus={deliveryStatus}
      />



      {/* ==================================================
          THEME SELECTION MODAL
          ================================================== */}
      <SelectionModal
        visible={isThemeModalVisible}
        title="Choose Theme"
        sections={THEME_SECTIONS}
        onClose={() => setIsThemeModalVisible(false)}
        accentColor={theme.colors.accent}
      />

      {/* ==================================================
          GENERAL IN-APP DIALOG (AppDialog)
          ================================================== */}
      {appDialogConfig && (
        <AppDialog
          visible={Boolean(appDialogConfig?.visible)}
          title={appDialogConfig?.title || 'Notice'}
          subtitle={appDialogConfig?.subtitle}
          message={appDialogConfig?.message}
          icon={appDialogConfig?.icon}
          iconColor={appDialogConfig?.iconColor}
          iconBgColor={appDialogConfig?.iconBgColor}
          statusBadge={appDialogConfig?.statusBadge}
          buttons={appDialogConfig?.buttons || [
            { text: 'OK', style: 'primary', onPress: () => setAppDialogConfig(null) },
          ]}
          showCloseButton
          onClose={() => setAppDialogConfig(null)}
        />
      )}
    </View>
  );
}

const createSettingsStyles = (theme, isDark) =>
  StyleSheet.create({
    screenWrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? 12 : 10,
      paddingBottom: 14,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerSpacer: {
      width: 36,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.primaryText,
      letterSpacing: -0.2,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 56,
    },
    sectionHeader: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.colors.secondaryText,
      letterSpacing: 0.8,
      marginTop: 22,
      marginBottom: 8,
      paddingHorizontal: 20,
      textTransform: 'uppercase',
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginHorizontal: 16,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.2 : 0.03,
          shadowRadius: 3,
        },
        android: {
          elevation: 0.5,
        },
      }),
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 11,
      minHeight: 50,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F3F4F6',
    },
    textContainer: {
      flex: 1,
      marginRight: 10,
      justifyContent: 'center',
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primaryText,
      letterSpacing: -0.1,
    },
    itemSubtitle: {
      fontSize: 11.5,
      color: theme.colors.secondaryText,
      marginTop: 1.5,
      lineHeight: 15.5,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 60,
    },
    valueText: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },
    valueTextBold: {
      fontSize: 13,
      color: theme.colors.primaryText,
      fontWeight: '600',
    },
    subtleBadgeText: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },
    rowRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    badgeSuccess: {
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5',
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 6,
    },
    badgeSuccessText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#34D399' : '#059669',
    },
    badgeNeutral: {
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F1EAFE',
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 6,
    },
    badgeNeutralText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#A78BFA' : '#6D28D9',
    },
    actionPillPrimary: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 5.5,
      borderRadius: 8,
    },
    actionPillPrimaryText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    actionPillWarning: {
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFF7ED',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : '#FED7AA',
      paddingHorizontal: 10,
      paddingVertical: 4.5,
      borderRadius: 8,
    },
    actionPillWarningText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: isDark ? '#FBBF24' : '#C2410C',
    },
    colorItemBlock: {
      paddingHorizontal: 16,
      paddingTop: 13,
      paddingBottom: 15,
    },
    colorItemHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    savedPill: {
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5',
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 6,
    },
    savedPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#34D399' : '#059669',
    },
    swatchesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingHorizontal: 4,
    },
    colorSwatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorSwatchSelected: {
      borderWidth: 2.5,
      borderColor: theme.colors.accent,
    },
    colorSwatchIndicator: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomSpacer: {
      height: 36,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.modalBackdrop,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: theme.colors.modalBackground,
      borderRadius: 20,
      padding: 22,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: theme.colors.modalBorder,
      ...Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.1,
          shadowRadius: 16,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    modalIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F1EAFE',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    modalHeaderTextCol: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    modalSubtitle: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      marginTop: 2,
    },
    safeNoticeBox: {
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F9FAFB',
      borderRadius: 10,
      padding: 11,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 14,
    },
    safeNoticeText: {
      fontSize: 11.5,
      color: theme.colors.secondaryText,
      lineHeight: 16,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 6,
    },
    modalTextInput: {
      backgroundColor: isDark ? theme.colors.inputBackground : '#F9FAFB',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      padding: 11,
      fontSize: 12,
      color: theme.colors.primaryText,
      height: 104,
      marginBottom: 12,
    },
    validationSuccessBox: {
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5',
      borderRadius: 8,
      padding: 9,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : '#BBF7D0',
    },
    validationSuccessText: {
      fontSize: 11,
      color: isDark ? '#34D399' : '#059669',
      fontWeight: '600',
      lineHeight: 15.5,
    },
    validationErrorBox: {
      backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2',
      borderRadius: 8,
      padding: 9,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#FECDD3',
    },
    validationErrorText: {
      fontSize: 11,
      color: isDark ? '#F87171' : '#DC2626',
      fontWeight: '600',
    },
    modalButtonsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    modalCancelButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 10,
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    modalConfirmButton: {
      flex: 1.5,
      minHeight: 42,
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalConfirmButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    badgeWarning: {
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFF7ED',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : '#FED7AA',
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderRadius: 6,
    },
    badgeWarningText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#FBBF24' : '#C2410C',
    },
    presetButtonsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 6,
    },
    presetChip: {
      flex: 1,
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F9FAFB',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingVertical: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetChipActive: {
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#F1EAFE',
      borderColor: theme.colors.accent,
    },
    presetChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    presetChipTextActive: {
      color: theme.colors.accent,
    },
    presetChipSub: {
      fontSize: 9.5,
      color: theme.colors.secondaryText,
      marginTop: 1,
    },
    presetChipSubActive: {
      color: theme.colors.accent,
      fontWeight: '500',
    },
    timeSelectorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F9FAFB',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    timeUnitCol: {
      alignItems: 'center',
      width: 60,
    },
    timeStepperBtn: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeStepperBtnText: {
      fontSize: 12,
      color: theme.colors.accent,
      fontWeight: '700',
    },
    timeDisplayBox: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingVertical: 6,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeDisplayText: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.primaryText,
    },
    timeUnitLabel: {
      fontSize: 9.5,
      color: theme.colors.secondaryText,
      textTransform: 'uppercase',
      fontWeight: '600',
      marginTop: 1,
    },
    timeColon: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.secondaryText,
      marginBottom: 8,
    },
    periodCol: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 3,
      gap: 3,
    },
    periodBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodBtnActive: {
      backgroundColor: theme.colors.accent,
    },
    periodBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.secondaryText,
    },
    periodBtnTextActive: {
      color: '#FFFFFF',
    },
    aboutVersionBadge: {
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F3F4F6',
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 6,
    },
    aboutVersionText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
  });
