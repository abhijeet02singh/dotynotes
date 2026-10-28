import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { THEME, COLORS, getPastelColor } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import ReminderPickerModal from './ReminderPickerModal';
import AppDialog from './AppDialog';
import { formatReminderDate } from '../services/notificationService';
import { editorTextToHtml } from '../utils/richText';
import { DotyRichTextEditor } from '../../modules/floating-dot-overlay';
import AppIcon from './AppIcon';

export default function NoteEditorModal({
  visible,
  onClose,
  onSave,
  noteToEdit = null,
  onDelete = null,
  defaultColor = 'purple',
}) {
  const { theme, isDark } = useTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Mode: 'create' | 'edit'
  const isEditMode = Boolean(noteToEdit);

  // Note fields
  const [title, setTitle] = useState(noteToEdit ? (noteToEdit.title || '') : '');
  const [content, setContent] = useState(noteToEdit ? (noteToEdit.content || '') : '');
  const [tag, setTag] = useState(noteToEdit ? (noteToEdit.tag || 'General') : 'Quick');
  const [selectedColor, setSelectedColor] = useState(
    noteToEdit ? (noteToEdit.colorSchemeId || defaultColor || 'purple') : (defaultColor || 'purple')
  );
  const [isPinned, setIsPinned] = useState(noteToEdit ? Boolean(noteToEdit.isPinned) : false);
  const [isArchived, setIsArchived] = useState(noteToEdit ? Boolean(noteToEdit.isArchived) : false);
  const [reminderAt, setReminderAt] = useState(noteToEdit ? (noteToEdit.reminderAt || null) : null);

  // UI state
  const [isReminderPickerVisible, setIsReminderPickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('New Note');

  // Redesigned Dialog states
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [emptyNoteNoticeVisible, setEmptyNoteNoticeVisible] = useState(false);

  // Native rich-text editor actions and active styles state
  const [editorAction, setEditorAction] = useState(null);
  const actionCounterRef = useRef(0);
  const [activeStyles, setActiveStyles] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isChecklist: false,
    isBullet: false,
  });

  // Synchronize state when modal becomes visible or noteToEdit changes
  useEffect(() => {
    if (visible) {
      if (noteToEdit) {
        setTitle(noteToEdit.title || '');
        // Keep the canonical HTML/text content so RichTextHelper can construct native Spannables
        setContent(noteToEdit.content || '');
        setTag(noteToEdit.tag || 'General');
        setSelectedColor(noteToEdit.colorSchemeId || 'purple');
        setIsPinned(Boolean(noteToEdit.isPinned));
        setIsArchived(Boolean(noteToEdit.isArchived));
        setReminderAt(noteToEdit.reminderAt || null);
        setStatusText('Saved ✓');
      } else {
        setTitle('');
        setContent('');
        setTag('Quick');
        setSelectedColor(defaultColor || 'purple');
        setIsPinned(false);
        setIsArchived(false);
        setReminderAt(null);
        setStatusText('New Note');
      }
      setActiveStyles({
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isChecklist: false,
        isBullet: false,
      });
      setEditorAction(null);
    }
  }, [visible, noteToEdit, defaultColor]);

  const currentColor = getPastelColor(selectedColor);

  // Active toolbar states from real native spans
  const isBoldActive = Boolean(activeStyles.isBold);
  const isItalicActive = Boolean(activeStyles.isItalic);
  const isUnderlineActive = Boolean(activeStyles.isUnderline);
  const isChecklistActive = Boolean(activeStyles.isChecklist);
  const isBulletActive = Boolean(activeStyles.isBullet);

  const handleBold = () => {
    actionCounterRef.current += 1;
    setEditorAction({ type: 'toggleBold', id: actionCounterRef.current });
    setStatusText('Editing...');
  };

  const handleItalic = () => {
    actionCounterRef.current += 1;
    setEditorAction({ type: 'toggleItalic', id: actionCounterRef.current });
    setStatusText('Editing...');
  };

  const handleUnderline = () => {
    actionCounterRef.current += 1;
    setEditorAction({ type: 'toggleUnderline', id: actionCounterRef.current });
    setStatusText('Editing...');
  };

  const handleChecklist = () => {
    actionCounterRef.current += 1;
    setEditorAction({ type: 'toggleChecklist', id: actionCounterRef.current });
    setStatusText('Editing...');
  };

  const handleBullet = () => {
    actionCounterRef.current += 1;
    setEditorAction({ type: 'toggleBullet', id: actionCounterRef.current });
    setStatusText('Editing...');
  };

  const handleCompleteAll = () => {
    actionCounterRef.current += 1;
    setEditorAction({ type: 'completeAll', id: actionCounterRef.current });
    setStatusText('Completed ✓');
  };

  const handleEditorContentChange = useCallback((event) => {
    setContent(event.html ?? '');
    setStatusText('Editing...');
  }, []);

  const handleActiveStylesChange = useCallback((styles) => {
    setActiveStyles((prev) => ({
      ...prev,
      ...styles,
    }));
  }, []);

  // Save Note Action
  const handleSave = async () => {
    if (isSubmitting) return;

    const trimmedTitle = (title != null ? String(title) : '').trim();
    const trimmedContent = (content != null ? String(content) : '').trim();
    const trimmedTag = (tag != null ? String(tag) : '').trim();

    if (!trimmedTitle && !trimmedContent) {
      setEmptyNoteNoticeVisible(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusText('Saving...');

      // Convert clean editor text into standard, safe HTML tags
      const serializedContent = editorTextToHtml(trimmedContent);

      await onSave({
        title: trimmedTitle || 'Untitled Note',
        content: serializedContent,
        tag: trimmedTag || 'General',
        colorSchemeId: selectedColor || 'purple',
        isPinned: Boolean(isPinned),
        isArchived: Boolean(isArchived),
        reminderAt: reminderAt != null && !isNaN(Number(reminderAt)) ? Number(reminderAt) : null,
      });

      setStatusText('Saved ✓');
      onClose();
    } catch (err) {
      Alert.alert('Database Error', 'Failed to save note: ' + (err.message || 'Unknown error'));
      setStatusText('Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (isSubmitting || !noteToEdit || !onDelete) return;
    setIsDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteConfirmVisible(false);
    try {
      setIsSubmitting(true);
      await onDelete(noteToEdit.id);
      onClose();
    } catch (err) {
      console.warn('Failed to delete note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Responsive sticky card sizing strictly matching QuickNotesOverlayView.kt
  const isLandscape = windowWidth > windowHeight;
  const cardWidth = isLandscape
    ? Math.min(540, windowWidth * 0.90)
    : Math.min(380, windowWidth * 0.94);
  const cardHeight = isLandscape
    ? Math.min(380, windowHeight * 0.88)
    : Math.min(540, windowHeight * 0.84);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, { backgroundColor: theme.colors.modalBackdrop }]}
      >
        {/* Backdrop Dismiss Layer: tapping outside the card closes editor */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close editor backdrop"
        />

        {/* Central Sticky Note Card Container: clean View with direct touch responsiveness */}
        <View
          style={[
            styles.stickyCard,
            {
              width: cardWidth,
              height: cardHeight,
              backgroundColor: currentColor.bg,
              borderColor: currentColor.border,
            },
          ]}
        >
          {/* Top color indicator strip representing the chosen pastel note scheme */}
          <View
            style={[
              styles.topColorStrip,
              { backgroundColor: currentColor.accent || currentColor.text },
            ]}
          />

          {/* 1. Header Row (Fixed at top) */}
          <View style={styles.cardHeader}>
            {/* Back to Notes Button */}
            <TouchableOpacity
              onPress={onClose}
              style={[styles.backBtn, { borderColor: currentColor.border }]}
              accessibilityRole="button"
              accessibilityLabel="Back to notes"
              activeOpacity={0.7}
            >
              <AppIcon name="chevron-left" size={13} color={currentColor.text} />
              <Text style={[styles.backBtnText, { color: currentColor.text }]}>Notes</Text>
            </TouchableOpacity>

            {/* Status Badge in Center */}
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusText}</Text>
            </View>

            {/* Right Action Icons: Reminder, Pin, Done Check */}
            <View style={styles.headerRightActions}>
              {/* Reminder Button */}
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { borderColor: currentColor.border },
                  reminderAt && [styles.iconBtnActive, { backgroundColor: currentColor.tagBg, borderColor: currentColor.accent }],
                ]}
                onPress={() => setIsReminderPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={reminderAt ? 'Edit reminder' : 'Set reminder'}
                activeOpacity={0.7}
              >
                <AppIcon
                  name="clock"
                  size={14}
                  color={reminderAt ? (currentColor.accent || currentColor.text) : currentColor.text}
                />
              </TouchableOpacity>

              {/* Pin Button */}
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { borderColor: currentColor.border },
                  isPinned && styles.iconBtnPinActive,
                ]}
                onPress={() => {
                  setIsPinned(!isPinned);
                  setStatusText('Draft');
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isPinned }}
                accessibilityLabel="Pin note"
                activeOpacity={0.7}
              >
                <AppIcon
                  name="pin"
                  size={14}
                  color={isPinned ? (currentColor.accent || currentColor.text) : currentColor.text}
                />
              </TouchableOpacity>

              {/* Done/Save Check Button */}
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: currentColor.accent || COLORS.brand }]}
                onPress={handleSave}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Save and close"
                activeOpacity={0.7}
              >
                <AppIcon name="check" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Note Title Input (Fixed at top, instant keyboard focus on tap) */}
          <TextInput
            style={[styles.titleInput, { color: currentColor.text }]}
            placeholder="Title..."
            placeholderTextColor="rgba(0, 0, 0, 0.35)"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setStatusText('Editing...');
            }}
            accessibilityLabel="Note Title"
            maxLines={2}
          />

          {/* Subtle Divider */}
          <View style={[styles.divider, { backgroundColor: currentColor.border }]} />

          {/* 3. Formatting Toolbar with Active Highlights (Fixed at top) */}
          <View style={styles.toolbarRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.formatButtonsGroup}
              keyboardShouldPersistTaps="always"
            >
              {/* Bold Button */}
              <TouchableOpacity
                style={[
                  styles.formatBtn,
                  isBoldActive && styles.formatBtnActive,
                ]}
                onPress={handleBold}
                accessibilityLabel="Bold format"
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.formatBtnBold,
                    { color: isBoldActive ? COLORS.brand : COLORS.textPrimary },
                  ]}
                >
                  B
                </Text>
              </TouchableOpacity>

              {/* Italic Button */}
              <TouchableOpacity
                style={[
                  styles.formatBtn,
                  isItalicActive && styles.formatBtnActive,
                ]}
                onPress={handleItalic}
                accessibilityLabel="Italic format"
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.formatBtnItalic,
                    { color: isItalicActive ? COLORS.brand : COLORS.textPrimary },
                  ]}
                >
                  I
                </Text>
              </TouchableOpacity>

              {/* Underline Button */}
              <TouchableOpacity
                style={[
                  styles.formatBtn,
                  isUnderlineActive && styles.formatBtnActive,
                ]}
                onPress={handleUnderline}
                accessibilityLabel="Underline format"
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.formatBtnUnderline,
                    { color: isUnderlineActive ? COLORS.brand : COLORS.textPrimary },
                  ]}
                >
                  U
                </Text>
              </TouchableOpacity>

              {/* Checklist Button */}
              <TouchableOpacity
                style={[
                  styles.formatBtn,
                  isChecklistActive && styles.formatBtnActive,
                ]}
                onPress={handleChecklist}
                accessibilityLabel="Checklist item"
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.formatBtnSymbol,
                    { color: isChecklistActive ? COLORS.brand : COLORS.textPrimary },
                  ]}
                >
                  ☑
                </Text>
              </TouchableOpacity>

              {/* Bullet Button */}
              <TouchableOpacity
                style={[
                  styles.formatBtn,
                  isBulletActive && styles.formatBtnActive,
                ]}
                onPress={handleBullet}
                accessibilityLabel="Bullet item"
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.formatBtnSymbol,
                    { color: isBulletActive ? COLORS.brand : COLORS.textPrimary },
                  ]}
                >
                  •
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 4. Unified Multiline Rich-Text Content Editor (Independently scrollable native canvas) */}
          <View style={[styles.contentContainer, { minHeight: isLandscape ? 80 : 120 }]}>
            {visible && (
              <DotyRichTextEditor
                style={styles.contentInput}
                html={content}
                placeholder="Write your thoughts here..."
                textColor={COLORS.textPrimary}
                fontSize={15}
                action={editorAction}
                onContentChange={handleEditorContentChange}
                onActiveStylesChange={handleActiveStylesChange}
                accessibilityLabel="Note Content"
              />
            )}
          </View>

          {/* 5. Active Reminder Banner (if scheduled) */}
          {reminderAt && (
            <View style={styles.reminderBanner}>
              <View style={styles.reminderBannerLeft}>
                <AppIcon name="clock" size={13} color={currentColor.accent || currentColor.text} />
                <Text style={styles.reminderBannerDate} numberOfLines={1}>
                  {formatReminderDate(reminderAt)}
                </Text>
              </View>
              <View style={styles.reminderBannerActions}>
                <TouchableOpacity
                  onPress={() => setIsReminderPickerVisible(true)}
                  style={styles.reminderActionLink}
                >
                  <Text style={styles.reminderActionLinkText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setReminderAt(null);
                    setStatusText('Editing...');
                  }}
                  style={styles.reminderActionLink}
                >
                  <AppIcon name="close" size={10} color={currentColor.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 6. Sticky Color Palette matching QuickNotesOverlayView order and dimensions (Fixed near bottom) */}
          <View style={styles.paletteContainer}>
            <Text style={[styles.paletteLabel, { color: currentColor.text }]}>STICKY COLOR</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paletteRow}
              keyboardShouldPersistTaps="always"
            >
              {THEME.colors.pastels.map((p) => {
                const isSelected = getPastelColor(selectedColor).id === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: p.bg, borderColor: p.border },
                      isSelected && [
                        styles.selectedColorCircle,
                        { borderColor: p.accent || p.text },
                      ],
                    ]}
                    onPress={() => {
                      setSelectedColor(p.id);
                      setStatusText('Draft');
                    }}
                    accessibilityLabel={`${p.name || p.id} color`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.colorSelectedDot,
                          { backgroundColor: p.accent || p.text },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 7. Bottom Actions Row matching QuickNotesOverlayView (Fixed at bottom) */}
          <View style={styles.cardFooter}>
            {isEditMode && (
              <>
                {onDelete && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleDelete}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Delete note"
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.completeBtn, { borderColor: currentColor.border }]}
                  onPress={handleCompleteAll}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Mark all items complete"
                >
                  <Text style={styles.completeBtnText}>✓ Complete</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Main Submit Button: 'Save Note' in create mode, 'Update Note' in edit mode */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: currentColor.accent || COLORS.brand },
                isSubmitting && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={isEditMode ? 'Update note in SQLite' : 'Save note to SQLite'}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Note'
                  : 'Save Note'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date/Time Picker Modal for Reminders */}
        <ReminderPickerModal
          visible={isReminderPickerVisible}
          initialReminderAt={reminderAt}
          onConfirm={(timestamp) => {
            setReminderAt(timestamp);
            setStatusText('Editing...');
          }}
          onRemove={() => {
            setReminderAt(null);
            setStatusText('Editing...');
          }}
          onClose={() => setIsReminderPickerVisible(false)}
        />

        {/* Delete Note Confirmation Dialog */}
        <AppDialog
          visible={isDeleteConfirmVisible}
          title="Delete Note"
          subtitle="This action cannot be undone"
          icon="trash"
          iconColor={theme.colors.dangerText || '#F87171'}
          iconBgColor={isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2'}
          message={`Are you sure you want to permanently delete "${title || 'this note'}"?`}
          showCloseButton
          onClose={() => setIsDeleteConfirmVisible(false)}
          buttons={[
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setIsDeleteConfirmVisible(false),
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: handleConfirmDelete,
            },
          ]}
        />

        {/* Empty Note Warning Dialog */}
        <AppDialog
          visible={emptyNoteNoticeVisible}
          title="Empty Note"
          subtitle="Content required"
          icon="document"
          iconColor={theme.colors.accent}
          iconBgColor={isDark ? 'rgba(139, 92, 246, 0.15)' : '#F1EAFE'}
          message="Please provide a title or write some content for your sticky note before saving."
          showCloseButton
          onClose={() => setEmptyNoteNoticeVisible(false)}
          buttons={[
            {
              text: 'OK',
              style: 'primary',
              onPress: () => setEmptyNoteNoticeVisible(false),
            },
          ]}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stickyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  topColorStrip: {
    height: 3.5,
    width: '100%',
    borderRadius: 2,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  backBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.brand,
  },
  statusBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: COLORS.brand,
  },
  iconBtnPinActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: COLORS.warning,
  },
  iconBtnText: {
    fontSize: 14,
  },
  doneBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 0,
    minHeight: 32,
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 2,
    marginBottom: 6,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  formatButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  formatBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: COLORS.brand,
  },
  formatBtnBold: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  formatBtnItalic: {
    fontSize: 13.5,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  formatBtnUnderline: {
    fontSize: 13.5,
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  formatBtnSymbol: {
    fontSize: 14,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    minHeight: 120,
    width: '100%',
    overflow: 'hidden',
    paddingVertical: 2,
  },
  contentInput: {
    flex: 1,
    width: '100%',
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  reminderBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  reminderClock: {
    fontSize: 13,
  },
  reminderBannerDate: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reminderBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderActionLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reminderActionLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.brand,
  },
  reminderActionRemoveText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.errorText,
  },
  paletteContainer: {
    marginTop: 6,
    paddingTop: 4,
    paddingBottom: 2,
  },
  paletteLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorCircle: {
    borderWidth: 2,
  },
  colorSelectedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
  },
  deleteBtn: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.errorText,
  },
  completeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  completeBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveBtn: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.brand,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
