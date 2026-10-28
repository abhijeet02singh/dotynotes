import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import SettingsIcon from './SettingsIcon';
import { useTheme } from '../context/ThemeContext';

/**
 * SelectionModal
 * 
 * Centered, premium Android selection modal inspired by the Flick reference design:
 * - Rounded corners (26dp)
 * - Top drag handle indicator
 * - Header with title and close '✕' button
 * - Supports flat options OR categorized sections (e.g. Appearance & Color Themes)
 * - Optional color swatch indicator (e.g. for color theme palettes)
 * - Highlighted active row with themed border & filled checkmark indicator
 * - Responsive support for Light & Dark theme tokens
 * - Scrollable option list with safe max-height
 * - Full-width bottom Cancel button
 */
export default function SelectionModal({
  visible = false,
  title = 'Choose Option',
  options = [],
  sections = null, // Array of { title, options, selectedId, onSelectOption }
  selectedId = '',
  onSelectOption,
  onClose,
  accentColor,
  cancelText = 'Cancel',
}) {
  const { theme, isDark } = useTheme();
  const effectiveAccent = accentColor || theme.colors.accent || theme.colors.primary;

  if (!visible) return null;

  const renderOptionItem = (item, isSelected, onSelect) => {
    const isDisabled = Boolean(item.disabled);
    const itemAccent = item.accentHex || effectiveAccent;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.optionCard,
          {
            backgroundColor: isSelected
              ? theme.colors.primarySoft
              : isDark
              ? theme.colors.surfaceSecondary
              : theme.colors.surface,
            borderColor: isSelected ? itemAccent : theme.colors.border,
          },
          isSelected && styles.optionCardSelected,
          isDisabled && styles.optionCardDisabled,
        ]}
        onPress={() => {
          if (isDisabled) return;
          if (onSelect) {
            onSelect(item);
          }
        }}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected, disabled: isDisabled }}
        accessibilityLabel={`${item.title}, ${item.description || ''}`}
      >
        {/* Optional Swatch or Icon */}
        {item.swatchColor ? (
          <View style={styles.swatchContainer}>
            <View
              style={[
                styles.swatchCircle,
                {
                  backgroundColor: item.swatchColor,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                },
              ]}
            />
          </View>
        ) : item.icon ? (
          <View style={styles.iconContainer}>
            <SettingsIcon
              name={item.icon}
              size={18}
              color={isSelected ? itemAccent : theme.colors.textSecondary}
            />
          </View>
        ) : null}

        {/* Title & Description */}
        <View style={styles.optionTextContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.optionTitle,
                { color: theme.colors.textPrimary },
                isDisabled && styles.textDisabled,
              ]}
            >
              {item.title}
            </Text>
            {isDisabled && (
              <View
                style={[
                  styles.disabledBadge,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.disabledBadgeText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Coming Soon
                </Text>
              </View>
            )}
          </View>
          {item.description ? (
            <Text
              style={[
                styles.optionDesc,
                { color: theme.colors.textSecondary },
                isDisabled && styles.textDisabled,
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
        </View>

        {/* Right: Checkmark Box */}
        {isSelected && (
          <View
            style={[
              styles.checkmarkBox,
              { backgroundColor: itemAccent },
            ]}
          >
            <SettingsIcon name="check" size={13} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.modalBackdrop }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.modalBackground,
                  borderColor: theme.colors.modalBorder,
                },
              ]}
            >
              {/* Top Handle Pill */}
              <View style={styles.handleContainer}>
                <View
                  style={[
                    styles.handlePill,
                    { backgroundColor: isDark ? theme.colors.border : '#D1D5DB' },
                  ]}
                />
              </View>

              {/* Header: Title and Close (✕) */}
              <View style={styles.headerRow}>
                <Text
                  style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.closeBtn,
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close modal"
                >
                  <SettingsIcon
                    name="close"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Scrollable Modes / Options List */}
              <ScrollView
                style={styles.optionsScrollView}
                contentContainerStyle={styles.optionsScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {sections ? (
                  sections.map((section, sIdx) => {
                    const sectionSelectedId = section.selectedId !== undefined ? section.selectedId : selectedId;
                    const sectionOnSelect = section.onSelectOption || onSelectOption;

                    return (
                      <View key={section.title || `sec-${sIdx}`} style={sIdx > 0 ? styles.sectionContainer : null}>
                        {section.title ? (
                          <Text style={[styles.sectionHeading, { color: theme.colors.textMuted }]}>
                            {section.title}
                          </Text>
                        ) : null}
                        <View style={styles.sectionCardsGroup}>
                          {section.options.map((item) =>
                            renderOptionItem(item, item.id === sectionSelectedId, sectionOnSelect)
                          )}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  options.map((item) =>
                    renderOptionItem(item, item.id === selectedId, (opt) => {
                      if (onSelectOption) onSelectOption(opt);
                      if (onClose) onClose();
                    })
                  )
                )}
              </ScrollView>

              {/* Bottom Full-Width Cancel Button */}
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
                onPress={onClose}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Cancel selection"
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 26,
    borderWidth: 1,
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 18,
    maxHeight: '88%',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  handlePill: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsScrollView: {
    maxHeight: 460,
  },
  optionsScrollContent: {
    paddingVertical: 2,
  },
  sectionContainer: {
    marginTop: 18,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCardsGroup: {
    gap: 9,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 60,
    overflow: 'hidden',
    marginBottom: 9,
  },
  optionCardSelected: {
    borderWidth: 1.8,
  },
  optionCardDisabled: {
    opacity: 0.55,
  },
  swatchContainer: {
    paddingLeft: 14,
    paddingRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  iconContainer: {
    paddingLeft: 14,
    paddingRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  disabledBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  disabledBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  textDisabled: {
    opacity: 0.6,
  },
  checkmarkBox: {
    width: 42,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cancelButton: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
