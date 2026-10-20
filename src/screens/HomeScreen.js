import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import AppHeader from '../components/AppHeader';
import SearchBar from '../components/SearchBar';
import CategoryTabs from '../components/CategoryTabs';
import NotesGrid from '../components/NotesGrid';
import EmptyState from '../components/EmptyState';
import FloatingActionButton from '../components/FloatingActionButton';
import NoteEditorModal from '../components/NoteEditorModal';
import BottomNavigation from '../components/BottomNavigation';
import { MOCK_NOTES } from '../data/mockNotes';
import { THEME } from '../constants/theme';

export default function HomeScreen() {
  // In-memory UI demonstration state initialized from mock data
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pinned' | 'archived'
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [currentNav, setCurrentNav] = useState('notes');

  // Compute counts for tabs
  const counts = useMemo(() => {
    return {
      all: notes.filter((n) => !n.isArchived).length,
      pinned: notes.filter((n) => n.isPinned && !n.isArchived).length,
      archived: notes.filter((n) => n.isArchived).length,
    };
  }, [notes]);

  // Filter notes based on activeTab and searchQuery
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Tab filter
      if (activeTab === 'pinned' && (!note.isPinned || note.isArchived)) {
        return false;
      }
      if (activeTab === 'archived' && !note.isArchived) {
        return false;
      }
      if (activeTab === 'all' && note.isArchived) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = note.title?.toLowerCase().includes(query);
        const matchesContent = note.content?.toLowerCase().includes(query);
        const matchesTag = note.tag?.toLowerCase().includes(query);
        return matchesTitle || matchesContent || matchesTag;
      }

      return true;
    });
  }, [notes, activeTab, searchQuery]);

  // Handle adding a session note from the modal
  const handleSaveNote = (newNote) => {
    setNotes((prev) => [newNote, ...prev]);
  };

  // Section subtitle text
  const getSectionTitle = () => {
    if (searchQuery.trim().length > 0) {
      return `Search Results (${filteredNotes.length})`;
    }
    switch (activeTab) {
      case 'pinned':
        return `Pinned Notes (${filteredNotes.length})`;
      case 'archived':
        return `Archived Notes (${filteredNotes.length})`;
      default:
        return `My Notes (${filteredNotes.length})`;
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with custom branding and stats */}
        <AppHeader
          totalCount={counts.all}
          pinnedCount={counts.pinned}
        />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />

          {/* Category Filter Tabs */}
          <CategoryTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            counts={counts}
          />

          {/* Section Heading */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
              <Text style={styles.sectionSubtitle}>
                {searchQuery.trim().length > 0
                  ? `Matching "${searchQuery}"`
                  : 'Tap any note to view full details'}
              </Text>
            </View>

            {/* Informative pill indicating UI demo mode */}
            <View style={styles.mockBadge} accessibilityLabel="UI Prototype Mode">
              <Text style={styles.mockBadgeText}>MOCK DATA</Text>
            </View>
          </View>

          {/* Main Notes Grid or Empty State */}
          {filteredNotes.length > 0 ? (
            <NotesGrid
              notes={filteredNotes}
              onNotePress={(note) => setSelectedNote(note)}
            />
          ) : (
            <EmptyState
              isSearchActive={searchQuery.trim().length > 0}
              activeTab={activeTab}
              onActionPress={() => {
                if (searchQuery.trim().length > 0) {
                  setSearchQuery('');
                } else if (activeTab !== 'all') {
                  setActiveTab('all');
                } else {
                  setIsEditorVisible(true);
                }
              }}
            />
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <FloatingActionButton onPress={() => setIsEditorVisible(true)} />

        {/* Bottom Navigation */}
        <BottomNavigation
          currentNav={currentNav}
          onNavSelect={(navKey) => {
            setCurrentNav(navKey);
            if (navKey === 'notes') {
              setActiveTab('all');
              setSearchQuery('');
            }
          }}
        />

        {/* Create Note Temporary Modal */}
        <NoteEditorModal
          visible={isEditorVisible}
          onClose={() => setIsEditorVisible(false)}
          onSave={handleSaveNote}
        />

        {/* Note Detail Preview Modal */}
        {selectedNote && (
          <Modal
            visible={!!selectedNote}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedNote(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewTagPill}>
                    <Text style={styles.previewTagText}>{selectedNote.tag || 'General'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedNote(null)}
                    style={styles.previewCloseBtn}
                    accessibilityLabel="Close note preview"
                  >
                    <Text style={styles.previewCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.previewTitle}>{selectedNote.title}</Text>
                <Text style={styles.previewContent}>{selectedNote.content}</Text>

                <View style={styles.previewFooter}>
                  <Text style={styles.previewDate}>
                    🕒 Updated: {selectedNote.updatedAt || selectedNote.dateLabel}
                  </Text>
                  {selectedNote.isPinned && (
                    <Text style={styles.previewPinnedBadge}>📌 Pinned</Text>
                  )}
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  mockBadge: {
    backgroundColor: 'rgba(109, 40, 217, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(109, 40, 217, 0.15)',
  },
  mockBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  previewCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    ...THEME.shadows.card,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  previewTagPill: {
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  previewTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    textTransform: 'uppercase',
  },
  previewCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
    lineHeight: 24,
  },
  previewContent: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
    marginBottom: THEME.spacing.lg,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  previewDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  previewPinnedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.pinned,
  },
});
