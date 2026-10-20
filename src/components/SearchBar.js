import React from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity, Text } from 'react-native';
import { THEME } from '../constants/theme';

export default function SearchBar({ value, onChangeText, onClear }) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        {/* Styled pure React Native search icon */}
        <View style={styles.searchIconContainer} accessibilityElementsHidden={true} importantForAccessibility="no">
          <View style={styles.searchCircle} />
          <View style={styles.searchHandle} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Search notes, tags or ideas..."
          placeholderTextColor={THEME.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search notes"
          accessibilityHint="Filters the notes list by title or content"
        />

        {value?.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClear}
            accessibilityLabel="Clear search text"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.clearBadge}>
              <Text style={styles.clearText}>✕</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.md,
    height: 48,
    ...THEME.shadows.subtle,
  },
  searchIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
    position: 'relative',
  },
  searchCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: THEME.colors.primaryLight,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  searchHandle: {
    width: 6,
    height: 2,
    backgroundColor: THEME.colors.primaryLight,
    position: 'absolute',
    bottom: 3,
    right: 2,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
});
