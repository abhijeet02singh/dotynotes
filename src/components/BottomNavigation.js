import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';

export default function BottomNavigation({ currentNav = 'notes', onNavSelect }) {
  const { theme, isDark } = useTheme();

  const navItems = [
    { key: 'notes', label: 'Notes', iconName: 'notes' },
    { key: 'floating', label: 'Floating Dot', iconName: 'floating' },
    { key: 'reminders', label: 'Reminders', iconName: 'reminders' },
    { key: 'settings', label: 'Settings', iconName: 'settings' },
  ];

  return (
    <View
      style={[
        styles.navBar,
        {
          backgroundColor: theme.colors.navigationBackground,
          borderTopColor: theme.colors.navigationBorder,
        },
      ]}
    >
      {navItems.map((item) => {
        const isActive = currentNav === item.key;
        const iconColor = isActive ? theme.colors.navActive : theme.colors.navInactive;

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
            <View
              style={[
                styles.iconWrapper,
                isActive && {
                  backgroundColor: isDark
                    ? 'rgba(139, 92, 246, 0.16)'
                    : theme.colors.primarySoft || '#F1EAFE',
                },
              ]}
            >
              <AppIcon name={item.iconName} size={19} color={iconColor} />
            </View>
            <Text
              style={[
                styles.navLabel,
                { color: iconColor },
                isActive && styles.activeNavLabel,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'android' ? 8 : 18,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48,
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 36,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
    letterSpacing: -0.1,
  },
  activeNavLabel: {
    fontWeight: '600',
  },
});
