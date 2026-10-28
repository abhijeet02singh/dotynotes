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
  Dimensions,
} from 'react-native';
import SettingsIcon from './SettingsIcon';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * AppDialog
 * 
 * Reusable, premium Android dialog component adhering to DotyNotes'
 * clean minimal Flick design system:
 * - Rounded corners (24dp)
 * - Theme-aware surface with subtle border and elevation
 * - DotyNotes brand purple primary actions
 * - High-contrast titles and readable secondary descriptions
 * - Responsive layout supporting small screens, font scaling, and keyboard safe margins
 */
export default function AppDialog({
  visible = false,
  title,
  subtitle,
  message,
  icon,
  iconColor,
  iconBgColor,
  statusBadge = null, // { label: string, type?: 'success' | 'warning' | 'neutral' }
  buttons = [],       // Array of { text, onPress, style?: 'primary' | 'destructive' | 'cancel' | 'default' }
  children,
  onClose,
  showCloseButton = false,
  dismissible = true,
}) {
  const { theme, isDark } = useTheme();

  const defaultIconColor = iconColor || theme.colors.primary;
  const defaultIconBgColor = iconBgColor || (isDark ? 'rgba(139, 92, 246, 0.15)' : '#F1EAFE');

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissible && onClose ? onClose : () => {}}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={dismissible && onClose ? onClose : undefined}>
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
              {/* Header row with optional icon, title, badge, and close button */}
              <View style={styles.headerRow}>
                {icon && (
                  <View style={[styles.iconContainer, { backgroundColor: defaultIconBgColor }]}>
                    <SettingsIcon name={icon} size={20} color={defaultIconColor} />
                  </View>
                )}

                <View style={styles.headerTextGroup}>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                    {title}
                  </Text>
                  {subtitle && (
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  )}
                </View>

                {showCloseButton && onClose && (
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Close dialog"
                  >
                    <SettingsIcon name="close" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Badge (if provided) */}
              {statusBadge && (
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.badge,
                      statusBadge.type === 'success'
                        ? [styles.badgeSuccess, { backgroundColor: theme.colors.successLight, borderColor: theme.colors.successBorder }]
                        : statusBadge.type === 'warning'
                        ? [styles.badgeWarning, { backgroundColor: theme.colors.warningLight, borderColor: theme.colors.warningBorder }]
                        : [styles.badgeNeutral, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        statusBadge.type === 'success'
                          ? [styles.badgeTextSuccess, { color: theme.colors.successText }]
                          : statusBadge.type === 'warning'
                          ? [styles.badgeTextWarning, { color: theme.colors.warningText }]
                          : [styles.badgeTextNeutral, { color: theme.colors.textSecondary }],
                      ]}
                    >
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>
              )}

              {/* Scrollable Body Content */}
              <ScrollView
                style={styles.bodyScrollView}
                contentContainerStyle={styles.bodyScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {typeof message === 'string' ? (
                  <Text style={[styles.messageText, { color: theme.colors.textSecondary }]}>{message}</Text>
                ) : (
                  message
                )}
                {children}
              </ScrollView>

              {/* Action Buttons Row */}
              {buttons && buttons.length > 0 && (
                <View
                  style={[
                    styles.buttonGroup,
                    buttons.length > 2 || SCREEN_WIDTH < 340 ? styles.buttonGroupStacked : styles.buttonGroupRow,
                  ]}
                >
                  {buttons.map((btn, index) => {
                    const isPrimary = btn.style === 'primary' || !btn.style;
                    const isDestructive = btn.style === 'destructive';
                    const isCancel = btn.style === 'cancel' || btn.style === 'default';

                    return (
                      <TouchableOpacity
                        key={`${btn.text}-${index}`}
                        style={[
                          styles.button,
                          isPrimary && [styles.btnPrimary, { backgroundColor: theme.colors.primary }],
                          isDestructive && [styles.btnDestructive, { backgroundColor: theme.colors.danger }],
                          isCancel && [styles.btnCancel, { backgroundColor: theme.colors.surfaceSecondary }],
                        ]}
                        onPress={() => {
                          if (btn.onPress) {
                            btn.onPress();
                          } else if (onClose) {
                            onClose();
                          }
                        }}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={btn.text}
                      >
                        <Text
                          style={[
                            styles.btnText,
                            isPrimary && styles.btnTextPrimary,
                            isDestructive && styles.btnTextDestructive,
                            isCancel && [styles.btnTextCancel, { color: theme.colors.textPrimary }],
                          ]}
                          numberOfLines={1}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
    maxWidth: 390,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  headerTextGroup: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeSuccess: {},
  badgeWarning: {},
  badgeNeutral: {},
  badgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  badgeTextSuccess: {},
  badgeTextWarning: {},
  badgeTextNeutral: {},
  bodyScrollView: {
    maxHeight: 280,
  },
  bodyScrollContent: {
    paddingVertical: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  buttonGroup: {
    marginTop: 18,
    gap: 10,
  },
  buttonGroupRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  buttonGroupStacked: {
    flexDirection: 'column',
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 13,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  btnPrimary: {},
  btnDestructive: {},
  btnCancel: {},
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  btnTextPrimary: {
    color: '#FFFFFF',
  },
  btnTextDestructive: {
    color: '#FFFFFF',
  },
  btnTextCancel: {},
});
