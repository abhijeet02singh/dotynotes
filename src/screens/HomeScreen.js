import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import AppIcon from '../components/AppIcon';
import FloatingDotScreen from './FloatingDotScreen';
import SettingsScreen from './SettingsScreen';
import AboutScreen from './AboutScreen';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import OnboardingScreen from './OnboardingScreen';
import {
  initDatabase,
  getAllNotesAsync,
  createNoteAsync,
  updateNoteAsync,
  deleteNoteAsync,
  flushPendingOverlayMutations,
  exportAllNotesToJsonAsync,
  getSettingAsync,
} from '../services/notesDb';
import {
  addOverlayNoteListener,
  addOverlayMutationListener,
  isNativeModuleAvailable,
  performSafeRepairAsync,
  createDatabaseBackupAsync,
} from '../../modules/floating-dot-overlay';
import {
  scheduleNoteReminderAsync,
  cancelNoteReminderAsync,
  formatReminderDate,
} from '../services/notificationService';
import { THEME, COLORS, getPastelColor } from '../constants/theme';
import { stripRichText } from '../utils/richText';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const { theme, isDark, defaultStickyColor } = useTheme();
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pinned' | 'archived'
  
  // Modals state
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [isStorageModalVisible, setIsStorageModalVisible] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [currentNav, setCurrentNav] = useState('notes');
  const navHistoryRef = useRef(['notes']);
  const [defaultNoteColor, setDefaultNoteColor] = useState('lavender');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const isSavingRef = useRef(false);

  // Navigation helpers for sub-screens (About, Privacy Policy)
  const navigateTo = (navKey) => {
    navHistoryRef.current.push(navKey);
    setCurrentNav(navKey);
  };

  const navigateBack = () => {
    if (navHistoryRef.current.length <= 1) {
      setCurrentNav('settings');
      navHistoryRef.current = ['notes', 'settings'];
      return;
    }
    navHistoryRef.current.pop();
    const targetNav = navHistoryRef.current[navHistoryRef.current.length - 1];
    setCurrentNav(targetNav);
  };

  // Load persistent default note color
  useEffect(() => {
    getSettingAsync('default_note_color', 'purple').then((savedColor) => {
      if (savedColor) setDefaultNoteColor(savedColor);
    });
  }, []);

  // Load notes from SQLite with optional silent background refresh
  const loadNotesFromDb = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setIsLoading(true);
      setDbError(null);
      await initDatabase();
      await flushPendingOverlayMutations();
      const loadedNotes = await getAllNotesAsync();
      setNotes(loadedNotes);
      setCurrentTime(Date.now());
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
        `The database has been restored to a healthy state.`,
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
      const noteCount =
        parsed.metadata?.totalNotes ?? parsed.totalNotes ?? parsed.data?.notes?.length ?? 0;
      Alert.alert(
        'Notes Exported',
        `Successfully exported ${noteCount} notes in versioned DotyNotes JSON format.\n\nAll titles, content, timestamps, and tags are preserved.`
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

  // Compute live counts for category tabs and reminders
  const counts = useMemo(() => {
    return {
      all: notes.filter((n) => !n.isArchived).length,
      pinned: notes.filter((n) => n.isPinned && !n.isArchived).length,
      archived: notes.filter((n) => n.isArchived).length,
      reminders: notes.filter((n) => !n.isArchived && n.reminderAt != null && Number(n.reminderAt) > currentTime).length,
    };
  }, [notes, currentTime]);

  // Filter notes based on currentNav, activeTab, and searchQuery
  // Filter notes based on currentNav, activeTab, and searchQuery
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        // Reminders view: active, non-archived notes with scheduled reminders
        if (currentNav === 'reminders') {
          if (note.isArchived) return false;
          if (note.reminderAt == null) return false;
          const reminderTime = Number(note.reminderAt);
          if (isNaN(reminderTime)) return false;
        } else {
          // Standard Notes view: filter by activeTab
          if (activeTab === 'pinned' && (!note.isPinned || note.isArchived)) {
            return false;
          }
          if (activeTab === 'archived' && !note.isArchived) {
            return false;
          }
          if (activeTab === 'all' && note.isArchived) {
            return false;
          }
        }

        // Search query filter
        if (searchQuery.trim().length > 0) {
          const query = searchQuery.toLowerCase().trim();
          const matchesTitle = note.title?.toLowerCase().includes(query);
          const matchesContent = stripRichText(note.content).toLowerCase().includes(query);
          const matchesTag = note.tag?.toLowerCase().includes(query);
          return matchesTitle || matchesContent || matchesTag;
        }

        return true;
      })
      .sort((a, b) => {
        // In reminders view, sort by scheduled reminder time (soonest first)
        if (currentNav === 'reminders') {
          return Number(a.reminderAt) - Number(b.reminderAt);
        }
        return 0; // maintain default SQLite order
      });
  }, [notes, activeTab, searchQuery, currentNav]);

  // Distinguish upcoming vs past reminders
  const upcomingReminders = useMemo(() => {
    if (currentNav !== 'reminders') return [];
    return filteredNotes
      .filter((n) => Number(n.reminderAt) > currentTime)
      .sort((a, b) => Number(a.reminderAt) - Number(b.reminderAt));
  }, [filteredNotes, currentNav, currentTime]);

  const pastReminders = useMemo(() => {
    if (currentNav !== 'reminders') return [];
    return filteredNotes
      .filter((n) => Number(n.reminderAt) <= currentTime)
      .sort((a, b) => Number(b.reminderAt) - Number(a.reminderAt));
  }, [filteredNotes, currentNav, currentTime]);

  // Handle note save (both Create and Update)
  const handleSaveNote = async (noteData) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      if (noteToEdit) {
        let finalNotificationId = noteToEdit.notificationId || null;
        let finalReminderAt = noteData.reminderAt != null ? Number(noteData.reminderAt) : null;

        const reminderTimestampChanged =
          finalReminderAt !== (noteToEdit.reminderAt != null ? Number(noteToEdit.reminderAt) : null);
        const contentChanged =
          noteData.title !== noteToEdit.title || noteData.content !== noteToEdit.content;

        if (finalReminderAt === null) {
          // Reminder was explicitly removed or cancelled
          if (noteToEdit.notificationId) {
            await cancelNoteReminderAsync(noteToEdit.notificationId);
          }
          finalNotificationId = null;
        } else if (reminderTimestampChanged || (contentChanged && noteToEdit.notificationId)) {
          // Reminder timestamp changed or note content updated with existing reminder
          const schedResult = await scheduleNoteReminderAsync({
            noteId: noteToEdit.id,
            title: noteData.title || noteToEdit.title,
            content: noteData.content || noteToEdit.content,
            reminderAt: finalReminderAt,
            existingNotificationId: noteToEdit.notificationId,
          });

          if (schedResult.success && schedResult.notificationId) {
            finalNotificationId = schedResult.notificationId;
          } else {
            // Scheduling failed or permission denied
            finalNotificationId = null;
            finalReminderAt = null;

            if (schedResult.reason === 'native_module_missing') {
              Alert.alert(
                'New Build Required',
                'Your note has been saved. Reminders require a new development build containing the expo-notifications module.'
              );
            } else if (schedResult.reason === 'permission_denied') {
              Alert.alert(
                'Permission Required',
                'The note was saved, but notification permission is required to deliver reminders. Please enable notifications in device Settings.'
              );
            } else {
              Alert.alert(
                'Reminder Notice',
                'The note was saved, but the reminder could not be scheduled: ' +
                  (schedResult.error || schedResult.reason || 'Unknown error')
              );
            }
          }
        }

        // Update existing note in SQLite
        const updated = await updateNoteAsync(noteToEdit.id, {
          ...noteData,
          reminderAt: finalReminderAt,
          notificationId: finalNotificationId,
        });

        setNotes((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n))
        );
      } else {
        // Create new note with unique ID upfront
        const newNoteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let scheduledNotificationId = null;
        let scheduledReminderAt = null;

        if (noteData.reminderAt) {
          const schedResult = await scheduleNoteReminderAsync({
            noteId: newNoteId,
            title: noteData.title || 'Untitled Note',
            content: noteData.content || '',
            reminderAt: noteData.reminderAt,
          });

          if (schedResult.success && schedResult.notificationId) {
            scheduledNotificationId = schedResult.notificationId;
            scheduledReminderAt = Number(noteData.reminderAt);
          } else {
            // Scheduling failed: do not persist fake reminder
            scheduledNotificationId = null;
            scheduledReminderAt = null;

            if (schedResult.reason === 'native_module_missing') {
              Alert.alert(
                'New Build Required',
                'Your note has been saved. Reminders require a new development build containing the expo-notifications module.'
              );
            } else if (schedResult.reason === 'permission_denied') {
              Alert.alert(
                'Permission Required',
                'The note was saved, but notification permission is required to deliver reminders. Please enable notifications in device Settings.'
              );
            } else {
              Alert.alert(
                'Reminder Notice',
                'The note was saved, but the reminder could not be scheduled: ' +
                  (schedResult.error || schedResult.reason || 'Unknown error')
              );
            }
          }
        }

        // Persist note to SQLite in a single atomic insertion
        const created = await createNoteAsync({
          id: newNoteId,
          ...noteData,
          reminderAt: scheduledReminderAt,
          notificationId: scheduledNotificationId,
        });

        setNotes((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
      }
    } catch (err) {
      console.error('Error saving note:', err);
      Alert.alert('Database Error', 'Could not save note to SQLite: ' + (err.message || ''));
      throw err;
    } finally {
      isSavingRef.current = false;
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (id) => {
    try {
      const noteToDelete = notes.find((n) => n.id === id);
      if (noteToDelete?.notificationId) {
        await cancelNoteReminderAsync(noteToDelete.notificationId);
      }
      await deleteNoteAsync(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error deleting note:', err);
      Alert.alert('Database Error', 'Could not delete note: ' + (err.message || ''));
      throw err;
    }
  };


  // Cancel/clear a note reminder directly from the list
  const handleCancelReminder = async (note) => {
    try {
      if (note.notificationId) {
        await cancelNoteReminderAsync(note.notificationId);
      }
      const updated = await updateNoteAsync(note.id, {
        reminderAt: null,
        notificationId: null,
      });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    } catch (err) {
      console.error('Error canceling reminder:', err);
    }
  };

  // Render individual reminder card with sticky color strip, formatted alert time, and quick actions
  const renderReminderCard = (note, isPast = false) => {
    const colorScheme = getPastelColor(note.colorSchemeId);
    return (
      <TouchableOpacity
        key={note.id}
        style={[
          styles.reminderCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderLeftWidth: 4,
            borderLeftColor: colorScheme.accent || colorScheme.border,
          },
        ]}
        onPress={() => handleStartEdit(note)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Reminder: ${note.title || 'Untitled'}`}
      >
        <View style={styles.reminderCardLeft}>
          <View
            style={[
              styles.reminderIconBox,
              {
                backgroundColor: isPast
                  ? (isDark ? 'rgba(156, 163, 175, 0.16)' : '#F3F4F6')
                  : (isDark ? 'rgba(139, 92, 246, 0.16)' : theme.colors.primarySoft || '#F1EAFE'),
              },
            ]}
          >
            <AppIcon
              name="clock"
              size={18}
              color={isPast ? theme.colors.textSecondary : theme.colors.primary}
            />
          </View>
          <View style={styles.reminderTextCol}>
            <Text style={[styles.reminderTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {note.title || 'Untitled Note'}
            </Text>
            <Text style={[styles.reminderBody, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {stripRichText(note.content) || 'No content'}
            </Text>
            <View style={styles.schedulePill}>
              <AppIcon
                name="clock"
                size={10}
                color={isPast ? theme.colors.textSecondary : theme.colors.primary}
              />
              <Text
                style={[
                  styles.reminderScheduleText,
                  { color: isPast ? theme.colors.textSecondary : theme.colors.primary },
                ]}
              >
                {isPast ? 'Triggered: ' : ''}{formatReminderDate(note.reminderAt)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.reminderRightActions}>
          <TouchableOpacity
            style={[
              styles.reminderCancelBtn,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
            ]}
            onPress={() => handleCancelReminder(note)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Remove reminder"
          >
            <AppIcon name="close" size={10} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <AppIcon name="chevron-right" size={12} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  // Open note for editing
  const handleStartEdit = (note) => {
    setNoteToEdit(note);
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
    if (currentNav === 'reminders') {
      return `Active Reminders (${filteredNotes.length})`;
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
    <View style={[styles.safeArea, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header with branding, total counts, and storage modal trigger (only on notes/reminders) */}
        {(currentNav === 'notes' || currentNav === 'reminders') && (
          <AppHeader
            currentNav={currentNav}
            totalCount={counts.all}
            pinnedCount={counts.pinned}
            reminderCount={counts.reminders}
            onStoragePress={() => navigateTo('settings')}
          />
        )}

        {/* Database Error Banner if SQLite fails */}
        {dbError && (
          <View style={[styles.errorBanner, { backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2', borderBottomColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#FECDD3' }]}>
            <View style={styles.errorContent}>
              <Text style={[styles.errorText, { color: theme.colors.dangerText }]}>⚠️ SQLite Error: {dbError}</Text>
              <View style={styles.errorButtonsRow}>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: isDark ? 'rgba(248, 113, 113, 0.2)' : '#FEE2E2', borderColor: isDark ? 'rgba(248, 113, 113, 0.4)' : '#FECDD3' }]}
                  onPress={() => loadNotesFromDb(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading database"
                >
                  <Text style={[styles.retryButtonText, { color: theme.colors.dangerText }]}>Retry</Text>
                </TouchableOpacity>
                {isNativeModuleAvailable && (
                  <TouchableOpacity
                    style={[styles.recoverButton, { backgroundColor: theme.colors.primary }]}
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
        ) : currentNav === 'settings' ? (
          <SettingsScreen
            onBackToNotes={() => {
              setCurrentNav('notes');
              loadNotesFromDb();
            }}
            counts={counts}
            onDefaultColorChange={(color) => setDefaultNoteColor(color)}
            onNavigateToFloating={() => setCurrentNav('floating')}
            onNavigateToAbout={() => navigateTo('about')}
            onNavigateToPrivacy={() => navigateTo('privacy')}
            onReplayOnboarding={() => navigateTo('onboarding')}
          />
        ) : currentNav === 'about' ? (
          <AboutScreen
            onBack={navigateBack}
            onNavigateToPrivacy={() => navigateTo('privacy')}
            onReplayOnboarding={() => navigateTo('onboarding')}
          />
        ) : currentNav === 'privacy' ? (
          <PrivacyPolicyScreen
            onBack={navigateBack}
          />
        ) : currentNav === 'onboarding' ? (
          <OnboardingScreen
            onComplete={() => {
              setCurrentNav('notes');
              navHistoryRef.current = ['notes'];
              loadNotesFromDb();
            }}
            onBack={navigateBack}
          />
        ) : (
          <>
            {/* Scrollable Content */}
            <ScrollView
              style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
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

              {/* Category Filter Tabs (only on Notes screen) */}
              {currentNav === 'notes' && (
                <CategoryTabs
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  counts={counts}
                />
              )}

              {/* Section Heading & Subtle SQLite status indicator */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTextCol}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{getSectionTitle()}</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    {searchQuery.trim().length > 0
                      ? `Filtered by "${searchQuery}"`
                      : currentNav === 'reminders'
                      ? 'Upcoming scheduled alerts'
                      : 'All notes synced to local SQLite'}
                  </Text>
                </View>

                {/* Subtle SQLite Status Indicator */}
                <View
                  style={[styles.storageBadge, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
                  accessibilityLabel="Offline SQLite database active"
                >
                  <View style={[styles.storageIndicatorDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={[styles.storageBadgeText, { color: theme.colors.textSecondary }]}>SQLite</Text>
                </View>
              </View>

              {/* Loading Indicator or Notes Grid / Reminders List / Empty State */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading notes...</Text>
                </View>
              ) : currentNav === 'reminders' ? (
                upcomingReminders.length > 0 || pastReminders.length > 0 ? (
                  <View style={styles.remindersList}>
                    {upcomingReminders.length > 0 && (
                      <View style={styles.remindersSection}>
                        <View style={styles.remindersSectionHeader}>
                          <Text style={[styles.remindersSectionTitle, { color: theme.colors.textSecondary }]}>
                            Upcoming Reminders
                          </Text>
                          <View style={[styles.remindersSectionBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
                            <Text style={[styles.remindersSectionBadgeText, { color: theme.colors.primary }]}>
                              {upcomingReminders.length}
                            </Text>
                          </View>
                        </View>
                        {upcomingReminders.map((note) => renderReminderCard(note, false))}
                      </View>
                    )}

                    {pastReminders.length > 0 && (
                      <View style={[styles.remindersSection, { marginTop: 16 }]}>
                        <View style={styles.remindersSectionHeader}>
                          <Text style={[styles.remindersSectionTitle, { color: theme.colors.textSecondary }]}>
                            Past Reminders
                          </Text>
                          <View style={[styles.remindersSectionBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
                            <Text style={[styles.remindersSectionBadgeText, { color: theme.colors.textSecondary }]}>
                              {pastReminders.length}
                            </Text>
                          </View>
                        </View>
                        {pastReminders.map((note) => renderReminderCard(note, true))}
                      </View>
                    )}
                  </View>
                ) : (
                  <EmptyState
                    isSearchActive={searchQuery.trim().length > 0}
                    activeTab={activeTab}
                    currentNav={currentNav}
                    onActionPress={() => {
                      if (searchQuery.trim().length > 0) {
                        setSearchQuery('');
                      } else {
                        handleStartCreate();
                      }
                    }}
                  />
                )
              ) : filteredNotes.length > 0 ? (
                <NotesGrid
                  notes={filteredNotes}
                  onNotePress={handleStartEdit}
                />
              ) : (
                <EmptyState
                  isSearchActive={searchQuery.trim().length > 0}
                  activeTab={activeTab}
                  currentNav={currentNav}
                  onActionPress={() => {
                    if (searchQuery.trim().length > 0) {
                      setSearchQuery('');
                    } else if (currentNav === 'reminders') {
                      handleStartCreate();
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

        {/* Bottom Navigation (hidden during immersive onboarding) */}
        {currentNav !== 'onboarding' && (
          <BottomNavigation
            currentNav={
              currentNav === 'about' || currentNav === 'privacy'
                ? 'settings'
                : currentNav
            }
            onNavSelect={(navKey) => {
              navHistoryRef.current = ['notes', navKey];
              setCurrentNav(navKey);
              if (navKey === 'notes') {
                setActiveTab('all');
                setSearchQuery('');
                loadNotesFromDb();
              } else if (navKey === 'reminders') {
                setSearchQuery('');
                loadNotesFromDb();
              } else if (navKey === 'settings') {
                loadNotesFromDb();
              }
            }}
          />
        )}

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
          defaultColor={defaultStickyColor || defaultNoteColor || 'lavender'}
        />

        {/* Storage & Safety Backup Modal */}
        <Modal
          visible={isStorageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsStorageModalVisible(false)}
        >
          <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.modalBackdrop }]}>
            <View
              style={[
                styles.storageModalCard,
                {
                  backgroundColor: theme.colors.modalBackground,
                  borderColor: theme.colors.modalBorder,
                },
              ]}
            >
              <View style={styles.storageModalHeader}>
                <Text style={[styles.storageModalTitle, { color: theme.colors.textPrimary }]}>Storage & Backup 🛡️</Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
                  onPress={() => setIsStorageModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close storage modal"
                >
                  <Text style={[styles.closeBtnText, { color: theme.colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.storageInfoBox,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.storageInfoTitle, { color: theme.colors.textPrimary }]}>Authoritative Storage</Text>
                <Text style={[styles.storageInfoText, { color: theme.colors.textSecondary }]}>Engine: expo-sqlite (WAL Mode)</Text>
                <Text style={[styles.storageInfoText, { color: theme.colors.textSecondary }]}>
                  Total Notes: {counts.all} active ({counts.pinned} pinned, {counts.archived} archived)
                </Text>
                <Text style={[styles.storageInfoStatus, { color: theme.colors.successText }]}>● Single Source of Truth (Connected)</Text>
              </View>

              <View style={styles.storageActionsColumn}>
                <TouchableOpacity
                  style={[
                    styles.storageActionButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={handleCreateBackup}
                >
                  <Text style={styles.storageActionIcon}>💾</Text>
                  <View style={styles.storageActionTextContainer}>
                    <Text style={[styles.storageActionTitle, { color: theme.colors.textPrimary }]}>Create File Backup</Text>
                    <Text style={[styles.storageActionDesc, { color: theme.colors.textSecondary }]}>Archive raw SQLite files & queues safely</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.storageActionButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={handleExportNotes}
                >
                  <Text style={styles.storageActionIcon}>📤</Text>
                  <View style={styles.storageActionTextContainer}>
                    <Text style={[styles.storageActionTitle, { color: theme.colors.textPrimary }]}>Export Notes (JSON)</Text>
                    <Text style={[styles.storageActionDesc, { color: theme.colors.textSecondary }]}>Export structured backup for safekeeping</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.storageActionButton,
                    styles.repairActionButton,
                    {
                      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
                      borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
                    },
                  ]}
                  onPress={() => {
                    setIsStorageModalVisible(false);
                    handleDiagnoseAndRecover();
                  }}
                >
                  <Text style={styles.storageActionIcon}>🔧</Text>
                  <View style={styles.storageActionTextContainer}>
                    <Text style={[styles.storageActionTitle, { color: theme.colors.textPrimary }]}>Diagnose & Safe Repair</Text>
                    <Text style={[styles.storageActionDesc, { color: theme.colors.textSecondary }]}>Harvest notes & clear any corrupted WAL state</Text>
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
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  errorBanner: {
    backgroundColor: COLORS.errorLight,
    borderBottomWidth: 1,
    borderBottomColor: '#FECDD3',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorContent: {
    flexDirection: 'column',
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    color: COLORS.errorText,
    fontWeight: '600',
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.errorText,
    fontSize: 11.5,
    fontWeight: '700',
  },
  recoverButton: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recoverButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionHeaderTextCol: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '400',
    marginTop: 1,
  },
  storageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
  },
  storageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  storageBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  remindersList: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
  },
  reminderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  reminderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reminderIconEmoji: {
    fontSize: 18,
  },
  reminderTextCol: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  reminderBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reminderScheduleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.brand,
    letterSpacing: -0.1,
  },
  remindersSection: {
    gap: 8,
  },
  remindersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  remindersSectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  remindersSectionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  remindersSectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reminderRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderCancelBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 4,
    lineHeight: 24,
  },
  previewDivider: {
    height: 1,
    marginVertical: 10,
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
  previewMetaLeft: {
    flex: 1,
    marginRight: 10,
  },
  previewDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  previewReminder: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginTop: 3,
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
    color: THEME.colors.successText,
    fontWeight: '700',
    marginTop: 4,
  },
  storageActionsColumn: {
    gap: 10,
  },
  storageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  repairActionButton: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: '#DDD6FE',
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
