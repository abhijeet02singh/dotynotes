import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { THEME } from '../constants/theme';

export default function FloatingActionButton({ onPress }) {
  return (
    <TouchableOpacity
      style={styles.fabContainer}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Create new note"
      accessibilityHint="Opens temporary note creator"
    >
      <View style={styles.fabInner}>
        {/* Stylized plus icon using clean React Native view elements */}
        <View style={styles.plusHorizontal} />
        <View style={styles.plusVertical} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.fab,
    zIndex: 999,
  },
  fabInner: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusHorizontal: {
    width: 20,
    height: 3.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    position: 'absolute',
  },
  plusVertical: {
    width: 3.5,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    position: 'absolute',
  },
});
