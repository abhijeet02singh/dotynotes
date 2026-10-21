import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';

export default function NoteEditorModal({
  visible,
  onClose,
  onSave,
  noteToEdit = null,
  onDelete = null,
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState('Quick');
  const [selectedColor, setSelectedColor] = useState('purple');
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when modal opens or noteToEdit changes
  useEffect(() => {
    if (visible) {
      if (noteToEdit) {
        setTitle(noteToEdit.title || '');
        setContent(noteToEdit.content || '');
        setTag(noteToEdit.tag || 'General');
        setSelectedColor(noteToEdit.colorSchemeId || 'purple');
        setIsPinned(Boolean(noteToEdit.isPinned));
        setIsArchived(Boolean(noteToEdit.isArchived));
      } else {
        setTitle('');
        setContent('');
        setTag('Quick');
        setSelectedColor('purple');
        setIsPinned(false);
        setIsArchived(false);
      }
    }
  }, [visible, noteToEdit]);

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!title.trim() && !content.trim()) {
      Alert.alert('Empty Note', 'Please provide a title or some content for the note.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim() || 'Untitled Note',
        content: content.trim(),
        tag: tag.trim() || 'General',
        colorSchemeId: selectedColor,
        isPinned,
        isArchived,
      });
      onClose();
    } catch (err) {
      Alert.alert('Database Error', 'Failed to save note: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (isSubmitting || !noteToEdit || !onDelete) return;

    Alert.alert(
      'Delete Note',
      `Are you sure you want to permanently delete "${title || 'this note'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await onDelete(noteToEdit.id);
              onClose();
            } catch (err) {
              Alert.alert('Delete Error', 'Failed to delete note: ' + (err.message || ''));
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const currentColor =
    THEME.colors.pastels.find((p) => p.id === selectedColor) ||
    THEME.colors.pastels[0];

  const isEditMode = Boolean(noteToEdit);

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
            <View style={styles.headerTitleGroup}>
              <Text style={styles.sheetTitle}>
                {isEditMode ? 'Edit Note' : 'Create Quick Note'}
              </Text>
              <Text style={styles.sessionNotice}>
                💾 Offline Persistent • Saved directly to SQLite
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close note editor"
              accessibilityRole="button"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
              placeholder="e.g. Grocery list, ideas, architecture..."
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
              placeholder="Write your thoughts here..."
              placeholderTextColor={THEME.colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Note Content"
            />

            {/* Tag & Action Toggles */}
            <View style={styles.optionsRow}>
              <View style={styles.tagInputWrapper}>
                <Text style={styles.label}>Tag</Text>
                <TextInput
                  style={styles.tagInput}
                  placeholder="e.g. Work, Ideas, Tasks"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={tag}
                  onChangeText={setTag}
                />
              </View>

              <View style={styles.togglesGroup}>
                <TouchableOpacity
                  style={[styles.toggleBtn, isPinned && styles.toggleBtnActive]}
                  onPress={() => setIsPinned(!isPinned)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isPinned }}
                  accessibilityLabel="Pin this note"
                >
                  <Text style={styles.toggleBtnText}>
                    {isPinned ? '📌 Pinned' : '📍 Pin'}
                  </Text>
                </TouchableOpacity>

                {isEditMode && (
                  <TouchableOpacity
                    style={[styles.toggleBtn, isArchived && styles.toggleBtnArchived]}
                    onPress={() => setIsArchived(!isArchived)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isArchived }}
                    accessibilityLabel="Archive this note"
                  >
                    <Text style={styles.toggleBtnText}>
                      {isArchived ? '🗂️ Archived' : '📥 Archive'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action buttons footer */}
          <View style={styles.footer}>
            {isEditMode && onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>
            )}

            <View style={styles.footerRight}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={isEditMode ? 'Save changes to SQLite' : 'Save note to SQLite'}
              >
                <Text style={styles.saveButtonText}>
                  {isSubmitting
                    ? 'Saving...'
                    : isEditMode
                    ? 'Save Changes'
                    : 'Save Note'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    paddingTop: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : THEME.spacing.lg,
    maxHeight: '90%',
    ...THEME.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  sessionNotice: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '600',
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
    fontSize: 11,
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
  togglesGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  toggleBtnActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primary,
  },
  toggleBtnArchived: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: THEME.colors.archived,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  footerRight: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    alignItems: 'center',
    marginLeft: 'auto',
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...THEME.shadows.subtle,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textInverse,
  },
});
