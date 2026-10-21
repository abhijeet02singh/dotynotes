import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import AppHeader from '../components/AppHeader';
import SearchBar from '../components/SearchBar';
import CategoryTabs from '../components/CategoryTabs';
import NotesGrid from '../components/NotesGrid';
import EmptyState from '../components/EmptyState';
import FloatingActionButton from '../components/FloatingActionButton';
import NoteEditorModal from '../components/NoteEditorModal';
import BottomNavigation from '../components/BottomNavigation';
import FloatingDotScreen from './FloatingDotScreen';
import {
  initDatabase,
  closeDatabaseAsync,
  getAllNotesAsync,
  createNoteAsync,
  updateNoteAsync,
  deleteNoteAsync,
  togglePinNoteAsync,
  toggleArchiveNoteAsync,
} from '../services/notesDb';
import {
  addOverlayNoteListener,
  isNativeModuleAvailable,
  repairDatabaseAsync,
  cleanupStaleWalFilesAsync,
} from '../../modules/floating-dot-overlay';
import { THEME } from '../constants/theme';

export default function HomeScreen() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pinned' | 'archived'
  
  // Modals state
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [currentNav, setCurrentNav] = useState('notes');

  // Load notes from SQLite on mount
  const loadNotesFromDb = useCallback(async () => {
    try {
      setIsLoading(true);
      setDbError(null);
      await initDatabase();
      const loadedNotes = await getAllNotesAsync();
      setNotes(loadedNotes);
    } catch (err) {
      console.error('SQLite initialization/fetch error:', err);
      setDbError(err.message || 'Failed to access local SQLite database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Safe manual recovery flow — creates safe backup, verifies notes, then asks user before cleanup
  const handleDiagnoseAndRecover = async () => {
    try {
      setIsLoading(true);
      const report = await repairDatabaseAsync();
      setIsLoading(false);
      if (!report) {
        Alert.alert('Diagnostic', 'No recovery report available.');
        return;
      }

      const noteCount = report.recoveredNoteCount || 0;
      const integrity = report.integrityCheckResult || 'unknown';
      const backupDir = report.backupDirectory ? report.backupDirectory.split(/[/\\]/).pop() : 'backup';

      Alert.alert(
        'Database Diagnostic Report',
        `Safe Backup: Created in ${backupDir}\n` +
        `Backup Integrity: ${integrity}\n` +
        `Recoverable Notes Found: ${noteCount}\n\n` +
        `All original files have been safely backed up without modification. If your database was corrupted by a WAL mismatch, you can safely clear stale WAL files and re-open the database from the main database file.`,
        [
          { text: 'Keep Files As-Is', style: 'cancel' },
          {
            text: 'Clear Stale WAL & Reconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                await closeDatabaseAsync();
                await cleanupStaleWalFilesAsync();
                await loadNotesFromDb();
              } catch (cleanErr) {
                Alert.alert('Recovery Error', cleanErr.message);
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      setIsLoading(false);
      Alert.alert('Diagnostic Error', e.message);
    }
  };

  useEffect(() => {
    loadNotesFromDb();

    // Refresh when app comes to foreground (e.g. after using floating overlay)
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadNotesFromDb();
      }
    });

    // Refresh if floating overlay emits note saved event while app is alive
    const overlaySub = addOverlayNoteListener(() => {
      loadNotesFromDb();
    });

    return () => {
      appStateSub.remove();
      if (overlaySub && typeof overlaySub.remove === 'function') {
        overlaySub.remove();
      }
    };
  }, [loadNotesFromDb]);

  // Compute live counts for category tabs
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

  // Handle note save (both Create and Update)
  const handleSaveNote = async (noteData) => {
    try {
      if (noteToEdit) {
        // Update existing note in SQLite
        const updated = await updateNoteAsync(noteToEdit.id, noteData);
        setNotes((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n))
        );
        if (selectedNote?.id === updated.id) {
          setSelectedNote(updated);
        }
      } else {
        // Create new note in SQLite
        const created = await createNoteAsync(noteData);
        setNotes((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error('Error saving note:', err);
      Alert.alert('Database Error', 'Could not save note to SQLite: ' + (err.message || ''));
      throw err;
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (id) => {
    try {
      await deleteNoteAsync(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      Alert.alert('Database Error', 'Could not delete note: ' + (err.message || ''));
      throw err;
    }
  };

  // Toggle pin state with persistent update
  const handleTogglePin = async (note) => {
    try {
      const updated = await togglePinNoteAsync(note.id, note.isPinned);
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );
      if (selectedNote?.id === updated.id) {
        setSelectedNote(updated);
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
      Alert.alert('Database Error', 'Failed to update pin status: ' + (err.message || ''));
    }
  };

  // Toggle archive state with persistent update
  const handleToggleArchive = async (note) => {
    try {
      const updated = await toggleArchiveNoteAsync(note.id, note.isArchived);
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );
      if (selectedNote?.id === updated.id) {
        setSelectedNote(updated);
      }
    } catch (err) {
      console.error('Error toggling archive:', err);
      Alert.alert('Database Error', 'Failed to update archive status: ' + (err.message || ''));
    }
  };

  // Open note for editing
  const handleStartEdit = (note) => {
    setNoteToEdit(note);
    setSelectedNote(null);
    setIsEditorVisible(true);
  };

  // Open note creation
  const handleStartCreate = () => {
    setNoteToEdit(null);
    setIsEditorVisible(true);
  };

  // Section title text
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
        {/* Header with branding and total counts */}
        <AppHeader
          totalCount={counts.all}
          pinnedCount={counts.pinned}
        />

        {/* Database Error Banner if SQLite fails */}
        {dbError && (
          <View style={styles.errorBanner}>
            <View style={styles.errorContent}>
              <Text style={styles.errorText}>⚠️ SQLite Error: {dbError}</Text>
              <View style={styles.errorButtonsRow}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadNotesFromDb}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading database"
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                {isNativeModuleAvailable && (
                  <TouchableOpacity
                    style={styles.recoverButton}
                    onPress={handleDiagnoseAndRecover}
                    accessibilityRole="button"
                    accessibilityLabel="Diagnose and recover database"
                  >
                    <Text style={styles.recoverButtonText}>Diagnose & Recover</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {currentNav === 'floating' ? (
          <FloatingDotScreen
            onBackToNotes={() => {
              setCurrentNav('notes');
              loadNotesFromDb();
            }}
          />
        ) : (
          <>
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

              {/* Section Heading & SQLite status badge */}
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {searchQuery.trim().length > 0
                      ? `Filtered by "${searchQuery}"`
                      : 'Tap any card to view details or edit'}
                  </Text>
                </View>

                {/* Offline SQLite Status Badge */}
                <View
                  style={styles.storageBadge}
                  accessibilityLabel="Offline SQLite database active"
                >
                  <View style={styles.storageIndicatorDot} />
                  <Text style={styles.storageBadgeText}>SQLITE SAVED</Text>
                </View>
              </View>

              {/* Loading Indicator or Notes Grid / Empty State */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={THEME.colors.primary} />
                  <Text style={styles.loadingText}>Reading notes from SQLite...</Text>
                </View>
              ) : filteredNotes.length > 0 ? (
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
                      handleStartCreate();
                    }
                  }}
                />
              )}
            </ScrollView>

            {/* Floating Action Button */}
            <FloatingActionButton onPress={handleStartCreate} />
          </>
        )}

        {/* Bottom Navigation */}
        <BottomNavigation
          currentNav={currentNav}
          onNavSelect={(navKey) => {
            setCurrentNav(navKey);
            if (navKey === 'notes') {
              setActiveTab('all');
              setSearchQuery('');
              loadNotesFromDb();
            }
          }}
        />

        {/* Create / Edit Note Modal */}
        <NoteEditorModal
          visible={isEditorVisible}
          onClose={() => {
            setIsEditorVisible(false);
            setNoteToEdit(null);
          }}
          onSave={handleSaveNote}
          noteToEdit={noteToEdit}
          onDelete={handleDeleteNote}
        />

        {/* Note Detail / Action Preview Modal */}
        {selectedNote && (
          <Modal
            visible={!!selectedNote}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedNote(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.previewCard}>
                {/* Header: Tag + Close button */}
                <View style={styles.previewHeader}>
                  <View style={styles.previewTagPill}>
                    <Text style={styles.previewTagText}>
                      {selectedNote.tag || 'General'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedNote(null)}
                    style={styles.previewCloseBtn}
                    accessibilityLabel="Close note preview"
                    accessibilityRole="button"
                  >
                    <Text style={styles.previewCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                  style={styles.previewScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.previewTitle}>{selectedNote.title}</Text>
                  <Text style={styles.previewContent}>{selectedNote.content}</Text>
                </ScrollView>

                {/* Status metadata */}
                <View style={styles.previewMetadata}>
                  <Text style={styles.previewDate}>
                    🕒 Updated: {selectedNote.dateLabel || 'Just now'}
                  </Text>
                  <View style={styles.badgesRow}>
                    {selectedNote.isPinned && (
                      <Text style={styles.previewPinnedBadge}>📌 Pinned</Text>
                    )}
                    {selectedNote.isArchived && (
                      <Text style={styles.previewArchivedBadge}>🗂️ Archived</Text>
                    )}
                  </View>
                </View>

                {/* Action Buttons: Pin, Archive, Edit, Delete */}
                <View style={styles.actionToolbar}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleTogglePin(selectedNote)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedNote.isPinned ? 'Unpin note' : 'Pin note'
                    }
                  >
                    <Text style={styles.actionBtnIcon}>
                      {selectedNote.isPinned ? '📍' : '📌'}
                    </Text>
                    <Text style={styles.actionBtnText}>
                      {selectedNote.isPinned ? 'Unpin' : 'Pin'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleToggleArchive(selectedNote)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedNote.isArchived ? 'Unarchive note' : 'Archive note'
                    }
                  >
                    <Text style={styles.actionBtnIcon}>
                      {selectedNote.isArchived ? '📤' : '🗂️'}
                    </Text>
                    <Text style={styles.actionBtnText}>
                      {selectedNote.isArchived ? 'Restore' : 'Archive'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editActionBtn]}
                    onPress={() => handleStartEdit(selectedNote)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit note"
                  >
                    <Text style={styles.actionBtnIcon}>✏️</Text>
                    <Text style={[styles.actionBtnText, styles.editActionBtnText]}>
                      Edit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteActionBtn]}
                    onPress={() => {
                      Alert.alert(
                        'Delete Note',
                        `Are you sure you want to delete "${selectedNote.title}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => handleDeleteNote(selectedNote.id),
                          },
                        ]
                      );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete note"
                  >
                    <Text style={styles.actionBtnIcon}>🗑️</Text>
                    <Text style={[styles.actionBtnText, styles.deleteActionBtnText]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
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
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 10,
  },
  errorContent: {
    flexDirection: 'column',
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  recoverButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
  },
  recoverButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
  storageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 5,
  },
  storageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  storageBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
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
    maxWidth: 400,
    maxHeight: '80%',
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  previewScroll: {
    maxHeight: 260,
    marginBottom: THEME.spacing.md,
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
  },
  previewMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  previewDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  previewPinnedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.pinned,
  },
  previewArchivedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.archived,
  },
  actionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background,
    minHeight: 48,
  },
  editActionBtn: {
    backgroundColor: THEME.colors.primarySoft,
  },
  deleteActionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionBtnIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  editActionBtnText: {
    color: THEME.colors.primaryDark,
  },
  deleteActionBtnText: {
    color: THEME.colors.danger,
  },
});
