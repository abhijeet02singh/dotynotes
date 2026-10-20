import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';

export default function BottomNavigation({ currentNav = 'notes', onNavSelect }) {
  const navItems = [
    { key: 'notes', label: 'Notes', icon: '📝' },
    { key: 'floating', label: 'Floating Dot', icon: '🟢' },
    { key: 'reminders', label: 'Reminders', icon: '⏰' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={styles.navBar}>
      {navItems.map((item) => {
        const isActive = currentNav === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navButton}
            onPress={() => onNavSelect && onNavSelect(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${item.label} tab`}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
              <Text style={styles.navIcon}>{item.icon}</Text>
            </View>
            <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
              {item.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 8,
    paddingHorizontal: THEME.spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...THEME.shadows.subtle,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    minHeight: 48,
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    backgroundColor: THEME.colors.primarySoft,
  },
  navIcon: {
    fontSize: 16,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  activeNavLabel: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
    marginTop: 3,
  },
});
