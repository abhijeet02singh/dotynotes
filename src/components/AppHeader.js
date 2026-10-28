import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';

/**
 * Signature Brand Logo using the exact DotyNotes brand mark.
 */
export function BrandLogo() {
  return (
    <View style={styles.logoContainer} accessibilityLabel="DotyNotes Brand Icon">
      <Image
        source={require('../../assets/dotynotes-mark.png')}
        style={styles.brandMarkImage}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * Reminders Tab Icon Badge
 */
export function RemindersLogo() {
  const { theme } = useTheme();

  return (
    <View style={styles.logoContainer} accessibilityLabel="Reminders Icon">
      <View style={[styles.logoBase, { backgroundColor: theme.colors.primary }]}>
        <AppIcon name="clock" size={20} color="#FFFFFF" />
      </View>
    </View>
  );
}

export default function AppHeader({
  currentNav = 'notes',
  totalCount = 0,
  pinnedCount = 0,
  reminderCount = 0,
  onStoragePress,
}) {
  const { theme, isDark } = useTheme();
  const isReminders = currentNav === 'reminders';

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.brandingGroup}>
          {isReminders ? <RemindersLogo /> : <BrandLogo />}
          <View style={styles.titleTextContainer}>
            {isReminders ? (
              <View style={styles.appNameRow}>
                <Text style={[styles.appNameTitle, { color: theme.colors.primaryText }]}>Reminders</Text>
              </View>
            ) : (
              <View style={styles.appNameRow}>
                <Text style={[styles.appNameDoty, { color: '#F99773' }]}>Doty</Text>
                <Text style={[styles.appNameNotes, { color: isDark ? '#FFFFFF' : '#182E3A' }]}>Notes</Text>
              </View>
            )}
            <Text style={[styles.appSubtitle, { color: theme.colors.textSecondary }]}>
              {isReminders ? 'Scheduled note alerts' : 'Offline-first notes'}
            </Text>
          </View>
        </View>

        {/* Minimal iOS-style status badge */}
        <TouchableOpacity
          style={[
            styles.statusBadge,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={onStoragePress}
          activeOpacity={onStoragePress ? 0.7 : 1}
          accessibilityRole="button"
          accessibilityLabel={
            isReminders
              ? `${reminderCount} active reminders`
              : `Storage settings: ${totalCount} notes, ${pinnedCount} pinned`
          }
        >
          <View
            style={[
              styles.activeDot,
              { backgroundColor: isReminders ? theme.colors.primary : theme.colors.success },
            ]}
          />
          <Text style={[styles.statusBadgeText, { color: theme.colors.primaryText }]}>
            {isReminders
              ? `${reminderCount} ${reminderCount === 1 ? 'alert' : 'alerts'}`
              : `${totalCount} ${totalCount === 1 ? 'note' : 'notes'}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandMarkImage: {
    width: 25,
    height: 33,
  },
  logoBase: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoNoteBody: {
    width: 17,
    height: 20,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    padding: 2.2,
    justifyContent: 'center',
    gap: 2.2,
  },
  logoNoteLineLong: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  logoNoteLineShort: {
    height: 2,
    width: '58%',
    backgroundColor: '#C4B5FD',
    borderRadius: 1,
  },
  floatingDotGlow: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#F1EAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleTextContainer: {
    justifyContent: 'center',
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appNameTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  appNameDoty: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  appNameNotes: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  appSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 0.5,
    letterSpacing: -0.1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
