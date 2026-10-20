import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import NoteCard from './NoteCard';
import { THEME } from '../constants/theme';

export default function NotesGrid({ notes = [], onNotePress }) {
  const { width } = useWindowDimensions();

  // Calculate dynamic card width for responsive two-column layout
  const horizontalPadding = THEME.spacing.lg * 2;
  const gap = THEME.spacing.md;
  const cardWidth = Math.floor((width - horizontalPadding - gap) / 2);

  // Distribute notes into two columns for natural staggered grid
  const leftColumn = notes.filter((_, index) => index % 2 === 0);
  const rightColumn = notes.filter((_, index) => index % 2 === 1);

  return (
    <View style={styles.gridContainer}>
      <View style={[styles.column, { width: cardWidth }]}>
        {leftColumn.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            width={cardWidth}
            onPress={onNotePress}
          />
        ))}
      </View>

      <View style={[styles.column, { width: cardWidth }]}>
        {rightColumn.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            width={cardWidth}
            onPress={onNotePress}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: 80, // Space for FAB
  },
  column: {
    flexDirection: 'column',
  },
});
