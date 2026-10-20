import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';

export default function EmptyState({
  isSearchActive = false,
  activeTab = 'all',
  onActionPress,
}) {
  let title = 'No notes yet';
  let description = 'Capture quick thoughts, reminders, and ideas with the floating dot.';
  let actionLabel = '+ Create Note';
  let icon = '📝';

  if (isSearchActive) {
    title = 'No matching notes';
    description = 'Try searching with different keywords or check spelling.';
    actionLabel = 'Clear Search';
    icon = '🔍';
  } else if (activeTab === 'pinned') {
    title = 'No pinned notes';
    description = 'Pin your most important thoughts to keep them at the top.';
    actionLabel = 'View All Notes';
    icon = '📌';
  } else if (activeTab === 'archived') {
    title = 'Archive is empty';
    description = 'Notes you archive to clean up your workspace will show up here.';
    actionLabel = 'Back to All';
    icon = '🗂️';
  }

  return (
    <View style={styles.container}>
      {/* Decorative illustration circle */}
      <View style={styles.iconCircle}>
        <Text style={styles.iconEmoji}>{icon}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {onActionPress && (
        <TouchableOpacity
          style={styles.actionButton}
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
    paddingVertical: THEME.spacing.xxxl,
    paddingHorizontal: THEME.spacing.xl,
    marginTop: THEME.spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.lg,
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: THEME.spacing.xl,
  },
  actionButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.full,
    minHeight: 44,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.subtle,
  },
  actionButtonText: {
    color: THEME.colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});
