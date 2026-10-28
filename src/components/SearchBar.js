import React from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';

export default function SearchBar({ value, onChangeText, onClear }) {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
          },
        ]}
      >
        <View style={styles.searchIconContainer} accessibilityElementsHidden={true} importantForAccessibility="no">
          <AppIcon name="search" size={15} color={theme.colors.textSecondary} />
        </View>

        <TextInput
          style={[styles.input, { color: theme.colors.inputText }]}
          placeholder="Search notes, tags, or checklists..."
          placeholderTextColor={theme.colors.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search notes"
          accessibilityHint="Filters notes list by keyword"
        />

        {value?.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClear}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[styles.clearBadge, { backgroundColor: isDark ? '#3E4250' : '#C7C7CC' }]}>
              <AppIcon name="close" size={9} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 11,
    height: 38,
  },
  searchIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  clearButton: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBadge: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
