import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import NoteCard from './NoteCard';
import { THEME } from '../constants/theme';

export default function NotesGrid({ notes = [], onNotePress }) {
  const { width } = useWindowDimensions();

  const horizontalPadding = THEME.spacing.lg * 2;
  const gap = THEME.spacing.md;

  // On narrow screens (< 340px), collapse to 1 column to prevent overflow
  const isNarrow = width < 340;
  const cardWidth = isNarrow
    ? Math.max(260, width - horizontalPadding)
    : Math.floor((width - horizontalPadding - gap) / 2);

  if (isNarrow) {
    return (
      <View style={styles.singleColumnContainer}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            width={cardWidth}
            onPress={onNotePress}
          />
        ))}
      </View>
    );
  }

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
    paddingBottom: 90, // Space for FAB
  },
  singleColumnContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: 90,
  },
  column: {
    flexDirection: 'column',
  },
});
