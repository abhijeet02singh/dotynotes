import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { getPastelColor, COLORS } from '../constants/theme';
import { formatReminderDate } from '../services/notificationService';
import { renderRichText, stripRichText } from '../utils/richText';
import AppIcon from './AppIcon';

export default function NoteCard({ note, onPress, width }) {
  const colorScheme = getPastelColor(note.colorSchemeId);

  const [currentTimestamp] = React.useState(() => Date.now());
  const hasActiveReminder = Boolean(
    note.reminderAt &&
    Number(note.reminderAt) > currentTimestamp &&
    note.notificationId
  );

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
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={`Note: ${note.title || 'Untitled'}. ${stripRichText(note.content)}`}
      accessibilityHint="Double tap to view or edit"
    >
      {/* Top Header: Tag, Reminder, Pin */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          {note.tag ? (
            <View style={[styles.tagBadge, { backgroundColor: colorScheme.tagBg }]}>
              <Text style={[styles.tagText, { color: colorScheme.text }]} numberOfLines={1}>
                {note.tag}
              </Text>
            </View>
          ) : (
            <View style={styles.tagPlaceholder} />
          )}

          {hasActiveReminder && (
            <View
              style={styles.reminderBadge}
              accessibilityLabel="Has scheduled reminder"
            >
              <AppIcon name="clock" size={12} color={colorScheme.text} />
            </View>
          )}
        </View>

        {note.isPinned ? (
          <View style={styles.pinnedBadge} accessibilityLabel="Pinned note">
            <AppIcon name="pin" size={13} color={colorScheme.text} />
          </View>
        ) : null}
      </View>

      {/* Note Title */}
      <Text
        style={[styles.title, { color: colorScheme.text }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {note.title || 'Untitled Note'}
      </Text>

      {/* Note Content Preview (Rich-Text rendered cleanly without raw HTML) */}
      <View style={styles.contentContainer}>
        {renderRichText(
          note.content,
          [styles.content, { color: colorScheme.text }],
          {
            numberOfLines: 4,
            ellipsizeMode: 'tail',
          }
        )}
      </View>

      {/* Card Footer: Dot indicator, Date Label & Archive indicator */}
      <View style={styles.cardFooter}>
        <View style={styles.dotyIndicator}>
          {hasActiveReminder ? (
            <AppIcon name="clock" size={10} color={colorScheme.text} />
          ) : (
            <View style={[styles.miniDot, { backgroundColor: colorScheme.text }]} />
          )}
          <Text style={[styles.dateLabel, { color: colorScheme.text }]} numberOfLines={1}>
            {hasActiveReminder
              ? formatReminderDate(note.reminderAt)
              : (note.dateLabel || note.updatedAt)}
          </Text>
        </View>

        {note.isArchived && (
          <View style={[styles.archivedBadge, { backgroundColor: colorScheme.tagBg }]}>
            <Text style={[styles.archivedText, { color: colorScheme.text }]}>Archived</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    marginBottom: 11,
    justifyContent: 'space-between',
    minHeight: 128,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dotyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  tagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  tagPlaceholder: {
    width: 2,
    height: 14,
  },
  reminderBadge: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    opacity: 0.9,
  },
  pinnedBadge: {
    padding: 2,
    opacity: 0.9,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  contentContainer: {
    flex: 1,
    marginBottom: 6,
  },
  content: {
    fontSize: 13,
    lineHeight: 17.5,
    opacity: 0.92,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
    opacity: 0.85,
    letterSpacing: -0.1,
  },
  archivedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  archivedText: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
