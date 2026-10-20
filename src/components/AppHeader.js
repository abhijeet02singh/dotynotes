import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';

/**
 * Custom Logo crafted using pure React Native View and Text elements.
 * Features a stylized note surface with the signature floating Doty dot!
 */
export function BrandLogo() {
  return (
    <View style={styles.logoContainer} accessibilityLabel="DotyNotes Brand Icon">
      {/* Outer base container with purple styling */}
      <View style={styles.logoBase}>
        {/* Note paper body */}
        <View style={styles.logoNoteBody}>
          <View style={styles.logoNoteLineLong} />
          <View style={styles.logoNoteLineShort} />
        </View>
        {/* Signature glowing floating dot (Doty) */}
        <View style={styles.floatingDotGlow}>
          <View style={styles.floatingDotCore} />
        </View>
      </View>
    </View>
  );
}

export default function AppHeader({ totalCount = 0, pinnedCount = 0 }) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <View style={styles.brandingGroup}>
          <BrandLogo />
          <View style={styles.titleTextContainer}>
            <View style={styles.appNameRow}>
              <Text style={styles.appName}>Doty</Text>
              <Text style={styles.appNameAccent}>Notes</Text>
            </View>
            <Text style={styles.appTagline}>Offline-first floating thoughts</Text>
          </View>
        </View>

        {/* Quick status pill */}
        <View style={styles.statusPill} accessibilityLabel={`${totalCount} total notes, ${pinnedCount} pinned`}>
          <View style={styles.activeIndicatorDot} />
          <Text style={styles.statusPillText}>
            {totalCount} {totalCount === 1 ? 'note' : 'notes'}
          </Text>
        </View>
      </View>

      {/* Summary greeting & stats */}
      <View style={styles.summaryBar}>
        <Text style={styles.greetingText}>Welcome back 👋</Text>
        <Text style={styles.statsSummary}>
          {pinnedCount > 0 ? `📌 ${pinnedCount} pinned for quick access` : 'All notes ready'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
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
    marginRight: THEME.spacing.md,
  },
  logoBase: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...THEME.shadows.subtle,
  },
  logoNoteBody: {
    width: 22,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    padding: 3,
    justifyContent: 'center',
    gap: 3,
  },
  logoNoteLineLong: {
    height: 2.5,
    width: '100%',
    backgroundColor: THEME.colors.primaryLight,
    borderRadius: 2,
  },
  logoNoteLineShort: {
    height: 2.5,
    width: '65%',
    backgroundColor: THEME.colors.accent,
    borderRadius: 2,
  },
  floatingDotGlow: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.accentDot,
  },
  titleTextContainer: {
    justifyContent: 'center',
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: -0.3,
  },
  appNameAccent: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  appTagline: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    gap: 6,
  },
  activeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  summaryBar: {
    marginTop: THEME.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  greetingText: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statsSummary: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
});
