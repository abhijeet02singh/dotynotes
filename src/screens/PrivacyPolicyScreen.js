import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import SettingsIcon from '../components/SettingsIcon';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyPolicyScreen({ onBack }) {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createPrivacyStyles(theme, isDark), [theme, isDark]);
  const neutralIconColor = isDark ? '#A7ADBA' : '#4B5563';
  const sections = [
    {
      id: '1',
      number: '1',
      title: 'Overview',
      icon: 'info',
      body: 'DotyNotes is designed as a personal, offline-first note-taking application. This policy explains what information the app stores, how it is used, what permissions may be requested, and how your privacy is protected.',
    },
    {
      id: '2',
      number: '2',
      title: 'Information You Create',
      icon: 'notes',
      body: 'When using DotyNotes, you may create and manage personal content on your device:',
      bullets: [
        {
          label: 'Notes & Content',
          detail: 'Titles, text content, rich-text styling (bold, italic, underline), tags, and completion states.',
        },
        {
          label: 'Checklists',
          detail: 'Interactive task checkbox items and list bullets.',
        },
        {
          label: 'Reminders',
          detail: 'Scheduled alert timestamps and reminder configurations.',
        },
        {
          label: 'Preferences',
          detail: 'Default sticky color choices, haptic feedback toggles, and floating handle settings.',
        },
      ],
    },
    {
      id: '3',
      number: '3',
      title: 'How Data Is Stored',
      icon: 'database',
      body: 'DotyNotes stores all user-created application data locally on your device using a local SQLite database (expo-sqlite with Write-Ahead Logging). No database server, external hosting, or remote cloud storage is used for your personal data.',
    },
    {
      id: '4',
      number: '4',
      title: 'Data Transmission & Analytics',
      icon: 'shield',
      body: 'DotyNotes does not transmit your personal notes, reminders, or preferences off your device.\n\nThe application contains zero advertising frameworks, zero telemetry trackers, and zero third-party analytics SDKs. No background network requests are made to sync or upload your notes.',
    },
    {
      id: '5',
      number: '5',
      title: 'Local Notifications',
      icon: 'bell',
      body: 'DotyNotes includes optional reminders for your notes. All notification schedules and alert payloads are generated and triggered purely locally on your device using Expo Notifications.\n\nNotification details never pass through external push servers or notification relays. You can disable reminders at any time in Settings or your device system settings.',
    },
    {
      id: '6',
      number: '6',
      title: 'Device Permissions',
      icon: 'controls',
      bullets: [
        {
          label: 'Notifications (POST_NOTIFICATIONS)',
          detail: 'Optional. Used solely on Android 13+ to display scheduled note alert reminders at user-defined times.',
        },
        {
          label: 'Display Over Other Apps (SYSTEM_ALERT_WINDOW)',
          detail: 'Optional. Used solely on Android to render the floating notes handle and quick-access notepad overlay over other running apps when enabled by the user.',
        },
      ],
    },
    {
      id: '7',
      number: '7',
      title: 'Data Retention & Deletion',
      icon: 'trash',
      body: 'You have complete control over your data. When you delete a note or archive it in DotyNotes, the change is applied immediately to your local SQLite database.\n\nIf you uninstall DotyNotes or clear the application data through your Android system settings, all locally saved records and preferences are permanently deleted from your device.',
    },
    {
      id: '8',
      number: '8',
      title: 'Backup & Restore',
      icon: 'export',
      body: 'DotyNotes provides optional manual JSON export and restore capabilities. When you export a backup, a versioned JSON file is generated locally and shared via the standard Android system share sheet.\n\nExported backup files are stored wherever you choose to save or send them, outside the app’s private SQLite sandbox. Restoring a backup merges notes safely into local storage without deleting existing non-matching records.',
    },
    {
      id: '9',
      number: '9',
      title: "Audience & Children's Privacy",
      icon: 'user',
      body: 'DotyNotes is a general-audience personal productivity tool. It does not collect personal identity information, age, or contact details from any user, including children.',
    },
    {
      id: '10',
      number: '10',
      title: 'Third-Party Services',
      icon: 'cpu',
      body: 'DotyNotes does not integrate with third-party tracking, advertising, analytics, or external account authentication providers. The application runs entirely on-device using local React Native, Expo, and SQLite modules.',
    },
    {
      id: '11',
      number: '11',
      title: 'Changes to This Policy',
      icon: 'refresh',
      body: 'If DotyNotes introduces new local features or permissions in future updates, this policy will be updated within the application to reflect current app behavior.',
    },
    {
      id: '12',
      number: '12',
      title: 'Contact & Architecture',
      icon: 'document',
      body: 'DotyNotes is designed and maintained as a fast, offline-first mobile companion.\n\nArchitecture: React Native + Expo SDK 57 + Local SQLite Engine.',
    },
  ];

  return (
    <View style={styles.screenWrapper}>
      {/* 1. Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.65}
          accessibilityRole="button"
          accessibilityLabel="Back to previous screen"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <SettingsIcon name="chevron-left" size={16} color={theme.colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Top Introduction Banner */}
        <View style={styles.introSection}>
          <View style={styles.shieldIconCircle}>
            <SettingsIcon name="shield" size={24} color={theme.colors.accent} />
          </View>
          <Text style={styles.introHeading}>Privacy Policy</Text>
          <Text style={styles.introSubtitle}>Your data, your device.</Text>
        </View>

        {/* 3. Numbered Policy Cards */}
        {sections.map((section) => (
          <View key={section.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconBox}>
                <SettingsIcon name={section.icon} size={16} color={neutralIconColor} />
              </View>
              <Text style={styles.cardTitle}>
                {section.number}. {section.title}
              </Text>
            </View>

            {section.body ? (
              <Text style={styles.cardBodyText}>{section.body}</Text>
            ) : null}

            {section.bullets ? (
              <View style={styles.bulletList}>
                {section.bullets.map((b, bIdx) => (
                  <View key={bIdx} style={styles.bulletRow}>
                    <Text style={styles.bulletLabel}>• {b.label}: </Text>
                    <Text style={styles.bulletDetail}>{b.detail}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const createPrivacyStyles = (theme, isDark) =>
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
      paddingHorizontal: 16,
      paddingBottom: 48,
    },
    introSection: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 22,
    },
    shieldIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F1EAFE',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139, 92, 246, 0.25)' : '#E5E7EB',
    },
    introHeading: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.primaryText,
      letterSpacing: -0.4,
      marginBottom: 4,
    },
    introSubtitle: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 12,
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
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardIconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    cardTitle: {
      fontSize: 14.5,
      fontWeight: '700',
      color: theme.colors.primaryText,
      letterSpacing: -0.1,
    },
    cardBodyText: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      lineHeight: 18.5,
    },
    bulletList: {
      marginTop: 8,
    },
    bulletRow: {
      marginBottom: 8,
    },
    bulletLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    bulletDetail: {
      fontSize: 12.5,
      color: theme.colors.secondaryText,
      lineHeight: 17,
      marginTop: 1,
    },
    bottomSpacer: {
      height: 20,
    },
  });
