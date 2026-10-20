import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';

export default function NoteCard({ note, onPress, width }) {
  // Find matching pastel palette or fallback to purple
  const colorScheme =
    THEME.colors.pastels.find((p) => p.id === note.colorSchemeId) ||
    THEME.colors.pastels[0];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: width,
          backgroundColor: colorScheme.bg,
          borderColor: colorScheme.border,
        },
      ]}
      onPress={() => onPress && onPress(note)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Note: ${note.title}. ${note.content}`}
      accessibilityHint="Double tap to open note preview"
    >
      {/* Top Header: Pin badge & Category tag */}
      <View style={styles.cardHeader}>
        {note.tag ? (
          <View style={[styles.tagBadge, { backgroundColor: colorScheme.tagBg }]}>
            <Text style={[styles.tagText, { color: colorScheme.text }]} numberOfLines={1}>
              {note.tag}
            </Text>
          </View>
        ) : (
          <View style={styles.tagPlaceholder} />
        )}

        {note.isPinned && (
          <View style={styles.pinnedBadge} accessibilityLabel="Pinned note">
            <Text style={styles.pinnedIcon}>📌</Text>
          </View>
        )}
      </View>

      {/* Note Title */}
      <Text
        style={[styles.title, { color: colorScheme.text }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {note.title}
      </Text>

      {/* Note Content Preview */}
      <Text
        style={styles.content}
        numberOfLines={4}
        ellipsizeMode="tail"
      >
        {note.content}
      </Text>

      {/* Card Footer: Dot indicator & Date */}
      <View style={styles.cardFooter}>
        <View style={styles.dotyIndicator}>
          <View style={[styles.miniDot, { backgroundColor: colorScheme.text }]} />
          <Text style={styles.dateLabel}>{note.dateLabel || note.updatedAt}</Text>
        </View>

        {note.isArchived && (
          <View style={styles.archivedBadge}>
            <Text style={styles.archivedText}>Archived</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1.2,
    marginBottom: THEME.spacing.md,
    justifyContent: 'space-between',
    minHeight: 140,
    ...THEME.shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.sm,
    maxWidth: '70%',
  },
  tagPlaceholder: {
    width: 1,
    height: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pinnedBadge: {
    padding: 2,
  },
  pinnedIcon: {
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: THEME.spacing.xs,
  },
  content: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    flex: 1,
    marginBottom: THEME.spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: THEME.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
  },
  dotyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
  },
  dateLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  archivedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
  },
  archivedText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.archived,
  },
});
