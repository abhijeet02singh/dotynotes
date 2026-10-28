import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function FloatingActionButton({ onPress, style }) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.fabContainer,
        { backgroundColor: theme.colors.primary },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel="Create note"
      accessibilityHint="Opens note editor"
    >
      <View style={styles.fabInner}>
        <View style={styles.plusHorizontal} />
        <View style={styles.plusVertical} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 76 : 88,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 999,
  },
  fabInner: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusHorizontal: {
    width: 16,
    height: 2.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    position: 'absolute',
  },
  plusVertical: {
    width: 2.8,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    position: 'absolute',
  },
});
