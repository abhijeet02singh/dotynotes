import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import SettingsIcon from './SettingsIcon';
import { useTheme } from '../context/ThemeContext';
import {
  getInstalledAppVersion,
  downloadAndInstallUpdateAsync,
  installVerifiedApkAsync,
  openUnknownAppSourcesSettingsAsync,
  cancelUpdateDownloadAsync,
  openApkDownloadAsync,
  DEV_SIMULATE_UPDATE,
  GITHUB_RELEASES_PAGE_URL,
} from '../services/updateService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * UpdateModal
 *
 * Dedicated in-app update notification and installer modal.
 * Manages the entire lifecycle:
 * - Version comparison and release notes inspection
 * - Direct APK download with real-time percentage progress bar
 * - On-the-fly cryptographic SHA-256 integrity verification
 * - Package identity (com.dotynotes.app) & signing compatibility checks
 * - Android Unknown Apps installation permission flow with 1-tap Settings link
 * - Launching the official Android PackageInstaller via secure FileProvider URI
 * - Robust error handling with Retry and Browser Fallback options
 */
export default function UpdateModal({
  visible = false,
  release = null,
  onDismiss,
  onUpdate,
  onComplete,
}) {
  const { theme, isDark } = useTheme();
  const installedVersion = getInstalledAppVersion();

  // State: 'idle' | 'downloading' | 'verifying' | 'permission_required' | 'installed_prompt' | 'error'
  const [stage, setStage] = useState('idle');
  const [downloadProgress, setDownloadProgress] = useState({
    percent: 0,
    downloadedMb: '0',
    totalMb: '',
    status: 'downloading',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [savedApkPath, setSavedApkPath] = useState('');

  // Reset state whenever modal opens or release changes
  useEffect(() => {
    if (visible) {
      setStage('idle');
      setErrorMessage('');
      setSavedApkPath('');
      setDownloadProgress({
        percent: 0,
        downloadedMb: '0',
        totalMb: release?.fileSizeFormatted ? release.fileSizeFormatted.replace('~', '') : '',
        status: 'downloading',
      });
    } else {
      cancelUpdateDownloadAsync();
    }
  }, [visible, release]);

  if (!visible || !release) return null;

  const newVersion = release.version || 'New';
  const sizeText = release.fileSizeFormatted || (release.fileSizeBytes ? `~${(release.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : '');

  // Initiates download, verification, and package installation
  const handleStartUpdate = async () => {
    // If simulation mode is active (for dev testing), safely open browser without downloading fake APK
    if (DEV_SIMULATE_UPDATE) {
      if (typeof onUpdate === 'function') {
        onUpdate(release.downloadUrl);
      } else {
        await openApkDownloadAsync(release.downloadUrl, release.releaseNotesUrl);
        onDismiss?.();
      }
      return;
    }

    try {
      setStage('downloading');
      setErrorMessage('');
      setDownloadProgress({
        percent: 0,
        downloadedMb: '0',
        totalMb: release.fileSizeFormatted ? release.fileSizeFormatted.replace('~', '') : '',
        status: 'downloading',
      });

      const result = await downloadAndInstallUpdateAsync({
        release,
        onProgress: (ev) => {
          const percent = ev.percent || 0;
          const dlBytes = ev.bytesDownloaded || 0;
          const totBytes = ev.totalBytes || 0;
          const downloadedMb = (dlBytes / (1024 * 1024)).toFixed(1);
          const totalMb = totBytes > 0 ? (totBytes / (1024 * 1024)).toFixed(1) + ' MB' : '';
          const status = ev.status || (percent >= 100 ? 'verifying' : 'downloading');

          setDownloadProgress({
            percent,
            downloadedMb,
            totalMb,
            status,
          });

          if (status === 'verifying') {
            setStage('verifying');
          }
        },
      });

      if (result.success) {
        if (result.needsInstallPermission) {
          setSavedApkPath(result.apkPath || '');
          setStage('permission_required');
        } else {
          setStage('installed_prompt');
          setTimeout(() => {
            if (typeof onComplete === 'function') {
              onComplete();
            } else if (typeof onDismiss === 'function') {
              onDismiss();
            }
          }, 3500);
        }
      } else if (result.cancelled) {
        setStage('idle');
      } else {
        setStage('error');
        setErrorMessage(result.error || 'Failed to download or verify the update package.');
      }
    } catch (err) {
      setStage('error');
      setErrorMessage(err.message || 'An unexpected error occurred while downloading update.');
    }
  };

  const handleCancelDownload = () => {
    cancelUpdateDownloadAsync();
    setStage('idle');
  };

  const handleOpenSettings = async () => {
    await openUnknownAppSourcesSettingsAsync();
  };

  const handleInstallVerified = async () => {
    if (savedApkPath) {
      const res = await installVerifiedApkAsync(savedApkPath);
      if (res.success) {
        setStage('installed_prompt');
        setTimeout(() => {
          if (typeof onComplete === 'function') {
            onComplete();
          } else if (typeof onDismiss === 'function') {
            onDismiss();
          }
        }, 2500);
      } else if (res.needsInstallPermission) {
        await openUnknownAppSourcesSettingsAsync();
      } else {
        setStage('error');
        setErrorMessage(res.error || 'Could not launch Android Package Installer.');
      }
    } else {
      handleStartUpdate();
    }
  };

  const handleBrowserFallback = async () => {
    await openApkDownloadAsync(
      release.downloadUrl,
      release.releaseNotesUrl || GITHUB_RELEASES_PAGE_URL,
      release.apkFileName
    );
    onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={stage === 'downloading' ? handleCancelDownload : onDismiss}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={stage === 'downloading' ? null : onDismiss}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.modalBackdrop }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.modalBackground,
                  borderColor: theme.colors.modalBorder,
                },
              ]}
            >
              {/* STAGE 1: IDLE / DETAILS */}
              {stage === 'idle' && (
                <>
                  {/* Header */}
                  <View style={styles.headerRow}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE' }]}>
                      <SettingsIcon name="download" size={20} color={theme.colors.accent} />
                    </View>
                    <View style={styles.headerTextCol}>
                      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                        Update Available
                      </Text>
                      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        A new version of DotyNotes is ready
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
                      onPress={onDismiss}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Dismiss update dialog"
                    >
                      <SettingsIcon name="close" size={12} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Version Comparison Card */}
                  <View style={[styles.versionBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.colors.border }]}>
                    <View style={styles.versionCol}>
                      <Text style={[styles.versionLabel, { color: theme.colors.textSecondary }]}>Installed</Text>
                      <Text style={[styles.versionVal, { color: theme.colors.textPrimary }]}>v{installedVersion}</Text>
                    </View>
                    <View style={styles.versionArrowCol}>
                      <Text style={[styles.versionArrow, { color: theme.colors.accent }]}>→</Text>
                    </View>
                    <View style={styles.versionCol}>
                      <Text style={[styles.versionLabel, { color: theme.colors.textSecondary }]}>Latest Release</Text>
                      <View style={styles.newBadgeRow}>
                        <Text style={[styles.versionValHighlight, { color: theme.colors.accent }]}>v{newVersion}</Text>
                        {sizeText ? (
                          <View style={[styles.sizePill, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.25)' : '#EDE9FE' }]}>
                            <Text style={[styles.sizePillText, { color: theme.colors.accent }]}>{sizeText}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Release Notes */}
                  {release.releaseNotes ? (
                    <View style={styles.notesSection}>
                      <Text style={[styles.notesHeader, { color: theme.colors.textSecondary }]}>{"What's New"}</Text>
                      <ScrollView
                        style={[styles.notesScroll, { backgroundColor: isDark ? '#111827' : '#F3F4F6' }]}
                        contentContainerStyle={styles.notesScrollContent}
                        showsVerticalScrollIndicator={false}
                      >
                        <Text style={[styles.notesText, { color: theme.colors.textPrimary }]}>
                          {release.releaseNotes}
                        </Text>
                      </ScrollView>
                    </View>
                  ) : null}

                  {/* Safe update guarantee notice */}
                  <View style={styles.safetyNoticeRow}>
                    <SettingsIcon name="shield" size={14} color="#10B981" />
                    <Text style={[styles.safetyNoticeText, { color: theme.colors.textSecondary }]}>
                      Your notes, categories, and settings are 100% safe and will remain untouched.
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[styles.dismissBtn, { borderColor: theme.colors.border }]}
                      onPress={onDismiss}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Update later"
                    >
                      <Text style={[styles.dismissBtnText, { color: theme.colors.textSecondary }]}>
                        Later
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.updateBtn, { backgroundColor: theme.colors.accent }]}
                      onPress={handleStartUpdate}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Update now"
                    >
                      <SettingsIcon name="download" size={16} color="#FFFFFF" />
                      <Text style={styles.updateBtnText}>Update Now</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* STAGE 2 & 3: DOWNLOADING & VERIFYING */}
              {(stage === 'downloading' || stage === 'verifying') && (
                <View style={styles.progressContainer}>
                  <View style={styles.headerRow}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE' }]}>
                      {stage === 'verifying' ? (
                        <SettingsIcon name="shield" size={20} color={theme.colors.accent} />
                      ) : (
                        <SettingsIcon name="download" size={20} color={theme.colors.accent} />
                      )}
                    </View>
                    <View style={styles.headerTextCol}>
                      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                        {stage === 'verifying' ? 'Verifying Package' : 'Downloading Update'}
                      </Text>
                      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        {stage === 'verifying'
                          ? 'Checking SHA-256 and com.dotynotes.app identity'
                          : `DotyNotes v${newVersion}`}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(5, Math.min(100, downloadProgress.percent))}%`,
                          backgroundColor: stage === 'verifying' ? '#10B981' : theme.colors.accent,
                        },
                      ]}
                    />
                  </View>

                  {/* Progress Details Row */}
                  <View style={styles.progressStatsRow}>
                    <Text style={[styles.progressStatsText, { color: theme.colors.textSecondary }]}>
                      {stage === 'verifying'
                        ? 'Verifying cryptographic checksum...'
                        : downloadProgress.totalMb
                        ? `${downloadProgress.downloadedMb} MB / ${downloadProgress.totalMb}`
                        : `${downloadProgress.downloadedMb} MB downloaded`}
                    </Text>
                    <Text style={[styles.progressPercentText, { color: theme.colors.accent }]}>
                      {stage === 'verifying' ? 'Verifying' : `${downloadProgress.percent}%`}
                    </Text>
                  </View>

                  {/* Security badge indicator */}
                  <View style={[styles.securityBadge, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                    <SettingsIcon name="shield" size={13} color="#10B981" />
                    <Text style={[styles.securityBadgeText, { color: theme.colors.textSecondary }]}>
                      Direct GitHub release download • SHA-256 protected
                    </Text>
                  </View>

                  {/* Cancel Button */}
                  {stage === 'downloading' && (
                    <TouchableOpacity
                      style={[styles.cancelDownloadBtn, { borderColor: theme.colors.border }]}
                      onPress={handleCancelDownload}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cancelDownloadBtnText, { color: theme.colors.textSecondary }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* STAGE 4: PERMISSION REQUIRED */}
              {stage === 'permission_required' && (
                <View style={styles.permissionContainer}>
                  <View style={styles.headerRow}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
                      <SettingsIcon name="shield" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.headerTextCol}>
                      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                        Install Permission Needed
                      </Text>
                      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        Android unknown apps permission
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.permissionInfoBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.colors.border }]}>
                    <Text style={[styles.permissionInfoText, { color: theme.colors.textPrimary }]}>
                      The update package has been downloaded and verified with SHA-256.
                    </Text>
                    <Text style={[styles.permissionInstructionText, { color: theme.colors.textSecondary }]}>
                      {'To install, allow "Install unknown apps" for DotyNotes in Android Settings, then return and tap "Install Now".'}
                    </Text>
                  </View>

                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[styles.dismissBtn, { borderColor: theme.colors.border }]}
                      onPress={handleOpenSettings}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dismissBtnText, { color: theme.colors.textPrimary }]}>
                        Settings
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.updateBtn, { backgroundColor: '#10B981' }]}
                      onPress={handleInstallVerified}
                      activeOpacity={0.8}
                    >
                      <SettingsIcon name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.updateBtnText}>Install Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STAGE 5: LAUNCHED PACKAGE INSTALLER */}
              {stage === 'installed_prompt' && (
                <View style={styles.installedContainer}>
                  <View style={[styles.iconContainerLarge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                    <SettingsIcon name="check" size={28} color="#10B981" />
                  </View>
                  <Text style={[styles.titleCenter, { color: theme.colors.textPrimary }]}>
                    Installer Launched
                  </Text>
                  <Text style={[styles.subtitleCenter, { color: theme.colors.textSecondary }]}>
                    Please approve the installation on the Android system prompt to complete the update.
                  </Text>
                  <TouchableOpacity
                    style={[styles.updateBtnFull, { backgroundColor: theme.colors.accent }]}
                    onPress={() => onComplete ? onComplete() : onDismiss?.()}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.updateBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STAGE 6: ERROR & BROWSER FALLBACK */}
              {stage === 'error' && (
                <View style={styles.errorContainer}>
                  <View style={styles.headerRow}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
                      <SettingsIcon name="close" size={20} color="#EF4444" />
                    </View>
                    <View style={styles.headerTextCol}>
                      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                        Update Notice
                      </Text>
                      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        Direct update could not complete
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.errorBox, { backgroundColor: isDark ? '#1F2937' : '#FEF2F2', borderColor: isDark ? '#374151' : '#FCA5A5' }]}>
                    <Text style={[styles.errorBoxText, { color: isDark ? '#F87171' : '#B91C1C' }]}>
                      {errorMessage || 'Direct download was interrupted or could not be verified.'}
                    </Text>
                  </View>

                  <Text style={[styles.fallbackExplanation, { color: theme.colors.textSecondary }]}>
                    You can retry the download or open the official release page in your browser.
                  </Text>

                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[styles.dismissBtn, { borderColor: theme.colors.border }]}
                      onPress={handleStartUpdate}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dismissBtnText, { color: theme.colors.textPrimary }]}>
                        Retry
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.updateBtn, { backgroundColor: theme.colors.accent }]}
                      onPress={handleBrowserFallback}
                      activeOpacity={0.8}
                    >
                      <SettingsIcon name="external-link" size={15} color="#FFFFFF" />
                      <Text style={styles.updateBtnText}>Browser</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 40, 420),
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  titleCenter: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  subtitleCenter: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  versionCol: {
    flex: 1,
  },
  versionArrowCol: {
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  versionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  versionVal: {
    fontSize: 14,
    fontWeight: '600',
  },
  newBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  versionValHighlight: {
    fontSize: 15,
    fontWeight: '700',
  },
  sizePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sizePillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  notesSection: {
    marginBottom: 14,
  },
  notesHeader: {
    fontSize: 11.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesScroll: {
    maxHeight: 110,
    borderRadius: 12,
  },
  notesScrollContent: {
    padding: 10,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  safetyNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 8,
  },
  safetyNoticeText: {
    fontSize: 11.5,
    flex: 1,
    lineHeight: 15,
  },
  progressContainer: {
    paddingVertical: 4,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressStatsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cancelDownloadBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDownloadBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  permissionContainer: {
    paddingVertical: 4,
  },
  permissionInfoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    gap: 8,
  },
  permissionInfoText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  permissionInstructionText: {
    fontSize: 12,
    lineHeight: 17,
  },
  installedContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 4,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorBoxText: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
  },
  fallbackExplanation: {
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dismissBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  updateBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updateBtnFull: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
