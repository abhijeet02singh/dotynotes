import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import SettingsIcon from '../components/SettingsIcon';
import { useTheme } from '../context/ThemeContext';
import appConfig from '../../app.json';

export default function AboutScreen({ onBack, onNavigateToPrivacy, onReplayOnboarding }) {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createAboutStyles(theme, isDark), [theme, isDark]);
  const neutralIconColor = isDark ? '#A7ADBA' : '#4B5563';
  const version = appConfig.expo?.version || '1.0.0';

  const features = [
    {
      id: 'notes',
      icon: 'notes',
      title: 'Notes',
      description: 'Create, edit, organize, and delete notes.',
    },
    {
      id: 'colors',
      icon: 'color',
      title: 'Sticky Colors',
      description: 'Organize notes using available pastel sticky-note colors.',
    },
    {
      id: 'floating',
      icon: 'dot',
      title: 'Floating Dot',
      description: 'Access the floating notes companion when granted overlay permission.',
    },
    {
      id: 'reminders',
      icon: 'clock',
      title: 'Reminders',
      description: 'Schedule local alert reminders for supported notes.',
    },
    {
      id: 'formatting',
      icon: 'format',
      title: 'Rich-Text Formatting',
      description: 'Use formatting options such as bold, italic, and underline.',
    },
    {
      id: 'checklists',
      icon: 'checklist',
      title: 'Lists & Checklists',
      description: 'Create interactive bullet lists and checklists.',
    },
    {
      id: 'storage',
      icon: 'database',
      title: 'Offline-First Storage',
      description: 'Store notes locally using the existing SQLite implementation.',
    },
    {
      id: 'backup',
      icon: 'export',
      title: 'Backup & Restore',
      description: 'Export and restore versioned JSON backups locally.',
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
          accessibilityLabel="Back to settings"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <SettingsIcon name="chevron-left" size={16} color={theme.colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About DotyNotes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. App Identity Section */}
        <View style={styles.heroSection}>
          <View style={styles.appIconWrapper}>
            <Image
              source={require('../../assets/dotynotes-mark.png')}
              style={styles.appIconMarkImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandTitleRow}>
            <Text style={[styles.brandTextDoty, { color: '#F99773' }]}>Doty</Text>
            <Text style={[styles.brandTextNotes, { color: isDark ? '#F3F4F6' : '#182E3A' }]}>Notes</Text>
          </View>
          <Text style={styles.tagline}>Your thoughts, always within reach.</Text>
          <Text style={styles.heroDescription}>
            DotyNotes is an offline-first notes app designed to help you capture thoughts
            quickly, organize notes, and access them through a convenient floating notes
            companion.
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>Version v{version}</Text>
          </View>
        </View>

        {/* 3. What is DotyNotes Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>What is DotyNotes?</Text>
          <Text style={styles.cardBodyText}>
            DotyNotes helps you create, edit, organize, and access notes locally on your
            device. Its floating notes companion provides quick access without requiring
            you to open the main app every time.
          </Text>
        </View>

        {/* 4. Your Features Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Your Features</Text>
          {features.map((item, index) => {
            const isLast = index === features.length - 1;
            return (
              <React.Fragment key={item.id}>
                <View style={styles.featureRow}>
                  <View style={styles.iconContainer}>
                    <SettingsIcon name={item.icon} size={18} color={neutralIconColor} />
                  </View>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>{item.title}</Text>
                    <Text style={styles.featureSubtitle}>{item.description}</Text>
                  </View>
                </View>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* 5. Privacy & Local Data Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithIcon}>
            <View style={styles.headerIconSquircle}>
              <SettingsIcon name="shield" size={16} color="#6D28D9" />
            </View>
            <Text style={styles.cardHeaderInline}>Privacy & Local Data</Text>
          </View>
          <Text style={styles.sectionLeadText}>
            Your DotyNotes data is designed to stay on your device.
          </Text>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletTitle}>Data Stored Locally</Text>
            <Text style={styles.bulletDescription}>
              All notes, tags, formatting, and preferences are saved on-device using local
              application storage (SQLite with Write-Ahead Logging).
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletTitle}>Data Sent Off Device</Text>
            <Text style={styles.bulletDescription}>
              None. DotyNotes contains no analytics tracking, no advertising SDKs, no cloud
              sync, and no user profiling.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={styles.bulletTitle}>Permissions Used</Text>
            <Text style={styles.bulletDescription}>
              • Notifications (Optional): To display scheduled note alert reminders.
              {'\n'}• Display Over Other Apps (Optional): To display the floating notes
              companion handle across other apps.
            </Text>
          </View>
        </View>

        {/* 6. Local Reminders Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithIcon}>
            <View style={styles.headerIconSquircle}>
              <SettingsIcon name="bell" size={16} color={neutralIconColor} />
            </View>
            <Text style={styles.cardHeaderInline}>Local Reminders</Text>
          </View>
          <Text style={styles.cardBodyText}>
            DotyNotes can schedule reminders on your device for supported notes. These
            reminders are generated and managed locally via Expo Notifications.
            {'\n\n'}
            Notification permission is optional. Enabling notifications allows DotyNotes to
            alert you at your scheduled reminder times.
          </Text>
        </View>

        {/* 7. No Account Required Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithIcon}>
            <View style={styles.headerIconSquircle}>
              <SettingsIcon name="user" size={16} color={neutralIconColor} />
            </View>
            <Text style={styles.cardHeaderInline}>No Account Required</Text>
          </View>
          <Text style={styles.cardBodyText}>
            No account is required to use DotyNotes. No sign-in is required for any
            feature. All core functionality works offline without an internet connection.
          </Text>
        </View>

        {/* 8. Replay Onboarding Navigation Card */}
        {onReplayOnboarding && (
          <TouchableOpacity
            style={styles.clickableCard}
            onPress={onReplayOnboarding}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Replay Onboarding"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="play-circle" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Replay Onboarding</Text>
              <Text style={styles.featureSubtitle}>
                Restart the interactive introduction
              </Text>
            </View>
            <SettingsIcon name="chevron-right" size={12} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* 9. Privacy Policy Navigation Card */}
        {onNavigateToPrivacy && (
          <TouchableOpacity
            style={styles.clickableCard}
            onPress={onNavigateToPrivacy}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open Privacy Policy"
          >
            <View style={styles.iconContainer}>
              <SettingsIcon name="shield" size={18} color={neutralIconColor} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Privacy Policy</Text>
              <Text style={styles.featureSubtitle}>
                Read the complete data and privacy summary
              </Text>
            </View>
            <SettingsIcon name="chevron-right" size={12} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* 9. Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Made for simple, focused note-taking.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createAboutStyles = (theme, isDark) =>
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
    heroSection: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 24,
      paddingHorizontal: 12,
    },
    appIconWrapper: {
      width: 80,
      height: 80,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 10,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    appIconImage: {
      width: 70,
      height: 70,
      borderRadius: 18,
    },
    appIconMarkImage: {
      width: 46,
      height: 58,
    },
    brandTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    brandTextDoty: {
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    brandTextNotes: {
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    appNameLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.secondaryText,
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    tagline: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.primaryText,
      textAlign: 'center',
      letterSpacing: -0.4,
      marginBottom: 8,
    },
    heroDescription: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 14,
      paddingHorizontal: 8,
    },
    versionBadge: {
      backgroundColor: isDark ? '#262A35' : '#F3F4F6',
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 10,
      paddingVertical: 3.5,
      borderRadius: 12,
    },
    versionBadgeText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 14,
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
    cardHeader: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.primaryText,
      marginBottom: 10,
      letterSpacing: -0.1,
    },
    cardHeaderWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    headerIconSquircle: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: isDark ? '#262A35' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    cardHeaderInline: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.primaryText,
      letterSpacing: -0.1,
    },
    cardBodyText: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      lineHeight: 18.5,
    },
    sectionLeadText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.primaryText,
      marginBottom: 12,
    },
    bulletItem: {
      marginBottom: 12,
    },
    bulletTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 2,
    },
    bulletDescription: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      lineHeight: 16.5,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      backgroundColor: isDark ? '#262A35' : '#F3F4F6',
    },
    featureTextCol: {
      flex: 1,
      marginRight: 8,
    },
    featureTitle: {
      fontSize: 13.5,
      fontWeight: '600',
      color: theme.colors.primaryText,
    },
    featureSubtitle: {
      fontSize: 11.5,
      color: theme.colors.secondaryText,
      marginTop: 1,
      lineHeight: 15.5,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 48,
    },
    clickableCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
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
    footerContainer: {
      alignItems: 'center',
      paddingVertical: 18,
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      fontWeight: '500',
    },
  });
