import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { THEME } from '../constants/theme';

export default function NoteEditorModal({ visible, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState('Quick');
  const [selectedColor, setSelectedColor] = useState('purple');
  const [isPinned, setIsPinned] = useState(false);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      onClose();
      return;
    }

    onSave({
      id: `session-note-${Date.now()}`,
      title: title.trim() || 'Untitled Note',
      content: content.trim() || 'No additional content',
      tag: tag.trim() || 'Quick',
      colorSchemeId: selectedColor,
      isPinned,
      isArchived: false,
      updatedAt: 'Just now',
      dateLabel: 'Just now',
    });

    // Reset inputs
    setTitle('');
    setContent('');
    setIsPinned(false);
    onClose();
  };

  const currentColor =
    THEME.colors.pastels.find((p) => p.id === selectedColor) ||
    THEME.colors.pastels[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.sheetTitle}>Create Quick Note</Text>
              <Text style={styles.sessionNotice}>
                ⚠️ UI Preview: notes exist for this session only (no storage yet)
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close editor"
              accessibilityRole="button"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Color selection row */}
            <Text style={styles.label}>Sticky Color</Text>
            <View style={styles.colorPaletteRow}>
              {THEME.colors.pastels.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: p.bg, borderColor: p.border },
                    selectedColor === p.id && styles.selectedColorCircle,
                  ]}
                  onPress={() => setSelectedColor(p.id)}
                  accessibilityLabel={`${p.id} color`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedColor === p.id }}
                >
                  {selectedColor === p.id && (
                    <View style={[styles.colorCheckDot, { backgroundColor: p.text }]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Title Input */}
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[
                styles.titleInput,
                { backgroundColor: currentColor.bg, borderColor: currentColor.border },
              ]}
              placeholder="e.g. Grocery list, ideas..."
              placeholderTextColor={THEME.colors.textMuted}
              value={title}
              onChangeText={setTitle}
              accessibilityLabel="Note Title"
            />

            {/* Content Input */}
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={[
                styles.contentInput,
                { backgroundColor: currentColor.bg, borderColor: currentColor.border },
              ]}
              placeholder="Write your thought here..."
              placeholderTextColor={THEME.colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Note Content"
            />

            {/* Tag & Pin controls */}
            <View style={styles.optionsRow}>
              <View style={styles.tagInputWrapper}>
                <Text style={styles.label}>Tag</Text>
                <TextInput
                  style={styles.tagInput}
                  placeholder="e.g. Work, Idea"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={tag}
                  onChangeText={setTag}
                />
              </View>

              <TouchableOpacity
                style={[styles.pinToggle, isPinned && styles.pinToggleActive]}
                onPress={() => setIsPinned(!isPinned)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isPinned }}
                accessibilityLabel="Pin this note"
              >
                <Text style={styles.pinToggleText}>
                  {isPinned ? '📌 Pinned' : '📍 Pin to top'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="Add note to preview"
            >
              <Text style={styles.saveButtonText}>Add to Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    paddingTop: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : THEME.spacing.lg,
    maxHeight: '85%',
    ...THEME.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sessionNotice: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  body: {
    marginVertical: THEME.spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    marginTop: THEME.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColorCircle: {
    borderWidth: 2.5,
    borderColor: THEME.colors.primary,
  },
  colorCheckDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  titleInput: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
  },
  contentInput: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    minHeight: 90,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.xs,
    gap: THEME.spacing.md,
  },
  tagInputWrapper: {
    flex: 1,
  },
  tagInput: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 8,
    backgroundColor: THEME.colors.background,
  },
  pinToggle: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinToggleActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primary,
  },
  pinToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.subtle,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textInverse,
  },
});
