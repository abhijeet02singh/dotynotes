import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';

export default function EmptyState({
  isSearchActive = false,
  activeTab = 'all',
  currentNav = 'notes',
  onActionPress,
}) {
  const { theme, isDark } = useTheme();

  let title = 'No notes yet';
  let description = 'Capture thoughts, reminders, and lists anytime.';
  let actionLabel = 'Create Note';
  let iconName = 'notes';

  if (isSearchActive) {
    title = 'No results found';
    description = 'Try searching with different keywords or check spelling.';
    actionLabel = 'Clear Search';
    iconName = 'search';
  } else if (currentNav === 'reminders') {
    title = 'No active reminders';
    description = 'Notes with scheduled notifications will appear here.';
    actionLabel = 'Create Reminder';
    iconName = 'clock';
  } else if (activeTab === 'pinned') {
    title = 'No pinned notes';
    description = 'Pin notes to keep your most important thoughts at the top.';
    actionLabel = 'View All Notes';
    iconName = 'pin';
  } else if (activeTab === 'archived') {
    title = 'Archive is empty';
    description = 'Archived notes will be stored safely here.';
    actionLabel = 'Back to All';
    iconName = 'archive';
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDark
              ? 'rgba(139, 92, 246, 0.12)'
              : theme.colors.primarySoft || '#F1EAFE',
            borderColor: theme.colors.border,
          },
        ]}
      >
        <AppIcon name={iconName} size={26} color={theme.colors.primary} />
      </View>

      <Text style={[styles.title, { color: theme.colors.primaryText }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>

      {onActionPress && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={onActionPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
    marginBottom: 20,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 11,
    minHeight: 42,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
