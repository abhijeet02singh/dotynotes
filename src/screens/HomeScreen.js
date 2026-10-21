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
  flushPendingOverlayMutations,
  exportAllNotesToJsonAsync,
} from '../services/notesDb';
import {
  addOverlayNoteListener,
  addOverlayMutationListener,
  isNativeModuleAvailable,
  repairDatabaseAsync,
  performSafeRepairAsync,
  createDatabaseBackupAsync,
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
  const [isStorageModalVisible, setIsStorageModalVisible] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [currentNav, setCurrentNav] = useState('notes');

  // Load notes from SQLite with optional silent background refresh
  const loadNotesFromDb = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setIsLoading(true);
      setDbError(null);
      await initDatabase();
      await flushPendingOverlayMutations();
      const loadedNotes = await getAllNotesAsync();
      setNotes(loadedNotes);
    } catch (err) {
      console.error('SQLite initialization/fetch error:', err);
      setDbError(err.message || 'Failed to access local SQLite database.');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  // Safe recovery flow — creates safe backup, verifies notes, restores data cleanly
  const handleDiagnoseAndRecover = async () => {
    try {
      setIsLoading(true);
      const report = await performSafeRepairAsync();
      setIsLoading(false);
      if (!report || !report.success) {
        Alert.alert('Recovery Warning', report?.message || 'Repair could not be completed.');
        return;
      }

      const noteCount = report.recoveredNoteCount || 0;
      const backupDir = report.backupDirectory ? report.backupDirectory.split(/[/\\]/).pop() : 'backup folder';

      Alert.alert(
        'Database Repaired Successfully',
        `A safe backup was created in: ${backupDir}\n\n` +
        `Recovered and restored: ${noteCount} note(s).\n` +
        `The database has been restored to a healthy state with zero data loss.`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadNotesFromDb(true);
            },
          },
        ]
      );
    } catch (e) {
      setIsLoading(false);
      Alert.alert('Diagnostic Error', e.message);
    }
  };

  // Create an explicit safety backup of all SQLite files & staging queues
  const handleCreateBackup = async () => {
    try {
      setIsLoading(true);
      const backupPath = await createDatabaseBackupAsync();
      setIsLoading(false);
      if (backupPath) {
        const folderName = backupPath.split(/[/\\]/).pop();
        Alert.alert(
          'Backup Created Successfully',
          `Full file-copy backup saved:\n\n${folderName}\n\nAll SQLite database files, WAL, and overlay mutation queues have been safely archived.`
        );
      } else {
        Alert.alert('Backup Notice', 'Native backup module unavailable in Expo Go.');
      }
    } catch (err) {
      setIsLoading(false);
      Alert.alert('Backup Error', err.message || 'Failed creating backup.');
    }
  };

  // Export all notes to JSON payload
  const handleExportNotes = async () => {
    try {
      setIsLoading(true);
      const json = await exportAllNotesToJsonAsync();
      setIsLoading(false);
      const parsed = JSON.parse(json);
      Alert.alert(
        'Notes Exported',
        `Successfully exported ${parsed.totalNotes} notes in standard DotyNotes JSON format.\n\nAll titles, content, timestamps, and tags are preserved.`
      );
    } catch (err) {
      setIsLoading(false);
      Alert.alert('Export Error', err.message || 'Failed exporting notes.');
    }
  };

  useEffect(() => {
    loadNotesFromDb(true);

    // Refresh when app comes to foreground (e.g. after using floating overlay)
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadNotesFromDb(false);
      }
    });

    // Refresh if floating overlay emits note saved or mutation event while app is alive
    const overlaySub = addOverlayNoteListener(() => {
      loadNotesFromDb(false);
    });
    const mutationSub = addOverlayMutationListener(() => {
      loadNotesFromDb(false);
    });

    return () => {
      appStateSub.remove();
      if (overlaySub && typeof overlaySub.remove === 'function') {
        overlaySub.remove();
      }
      if (mutationSub && typeof mutationSub.remove === 'function') {
        mutationSub.remove();
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
        {/* Header with branding, total counts, and storage modal trigger */}
        <AppHeader
          totalCount={counts.all}
          pinnedCount={counts.pinned}
          onStoragePress={() => setIsStorageModalVisible(true)}
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

        {/* Storage & Safety Backup Modal */}
        <Modal
          visible={isStorageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsStorageModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.storageModalCard}>
              <View style={styles.storageModalHeader}>
                <Text style={styles.storageModalTitle}>Storage & Backup 🛡️</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setIsStorageModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close storage modal"
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.storageInfoBox}>
                <Text style={styles.storageInfoTitle}>Authoritative Storage</Text>
                <Text style={styles.storageInfoText}>Engine: expo-sqlite (WAL Mode)</Text>
                <Text style={styles.storageInfoText}>
                  Total Notes: {counts.all} active ({counts.pinned} pinned, {counts.archived} archived)
                </Text>
                <Text style={styles.storageInfoStatus}>● Single Source of Truth (Connected)</Text>
              </View>

              <View style={styles.storageActionsColumn}>
                <TouchableOpacity
                  style={styles.storageActionButton}
                  onPress={handleCreateBackup}
                >
                  <Text style={styles.storageActionIcon}>💾</Text>
                  <View style={styles.storageActionTextContainer}>
                    <Text style={styles.storageActionTitle}>Create File Backup</Text>
                    <Text style={styles.storageActionDesc}>Archive raw SQLite files & queues safely</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.storageActionButton}
                  onPress={handleExportNotes}
                >
                  <Text style={styles.storageActionIcon}>📤</Text>
                  <View style={styles.storageActionTextContainer}>
                    <Text style={styles.storageActionTitle}>Export Notes (JSON)</Text>
                    <Text style={styles.storageActionDesc}>Export structured backup for safekeeping</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.storageActionButton, styles.repairActionButton]}
                  onPress={() => {
                    setIsStorageModalVisible(false);
                    handleDiagnoseAndRecover();
                  }}
                >
                  <Text style={styles.storageActionIcon}>🔧</Text>
                  <View style={styles.storageActionTextContainer}>
                    <Text style={styles.storageActionTitle}>Diagnose & Safe Repair</Text>
                    <Text style={styles.storageActionDesc}>Harvest notes & clear any corrupted WAL state</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  storageModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    ...THEME.shadows.card,
  },
  storageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  storageModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  storageInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: THEME.spacing.lg,
  },
  storageInfoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  storageInfoText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  storageInfoStatus: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    marginTop: 4,
  },
  storageActionsColumn: {
    gap: 10,
  },
  storageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  repairActionButton: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  storageActionIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  storageActionTextContainer: {
    flex: 1,
  },
  storageActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  storageActionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
});
