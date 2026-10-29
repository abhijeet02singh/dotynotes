/**
 * DotyNotes End-to-End Update Detection & Dismissal Simulation Test
 *
 * Tests the exact decision paths of updateService.js when installed on a real
 * Android device at version 1.0.1 (versionCode 2) and detecting version 1.0.2 (versionCode 3).
 *
 * Simulates:
 * 1. Current state: installed 1.0.1 (code 2) vs remote 1.0.1 (code 2) -> "You're Up to Date"
 * 2. New version release: installed 1.0.1 (code 2) vs remote 1.0.2 (code 3) -> "Update Available"
 * 3. Automatic startup check triggers the Update Available dialog
 * 4. User chooses "Later", persisting dismissed_update_version to SQLite
 * 5. Subsequent startup checks are suppressed by dismissal
 * 6. Manual check in Settings/About bypasses dismissal and shows update dialog
 * 7. Future release (1.0.3, code 4) automatically invalidates prior dismissal
 */

const assert = require('assert');

async function runSimulation() {
  console.log('================================================================');
  console.log('📱 DOTYNOTES SIMULATED UPDATE DETECTION & LIFECYCLE VERIFICATION');
  console.log('================================================================\n');

  const updateService = await import('../src/services/updateService.js');
  const {
    isReleaseNewer,
    checkForUpdatesAsync,
    dismissUpdateVersionAsync,
    getDismissedUpdateVersionAsync,
    clearDismissedUpdateVersionAsync,
    setUpdateServiceDependencies,
    resetUpdateServiceDependencies,
  } = updateService;

  // In-memory persistent SQLite store simulation (mimics notesDb app_metadata)
  const sqliteMetadataStore = {};

  const mockGetSetting = async (key, fallback = null) => {
    return sqliteMetadataStore[key] !== undefined ? sqliteMetadataStore[key] : fallback;
  };

  const mockSetSetting = async (key, value) => {
    sqliteMetadataStore[key] = String(value);
  };

  // --------------------------------------------------------------------------
  // STEP 1: Verify current device baseline behavior
  // --------------------------------------------------------------------------
  console.log('🔍 [STEP 1] Testing Current Baseline on Device');
  console.log('   Installed Binary : Version 1.0.1 (versionCode: 2)');
  console.log('   Remote Production: Version 1.0.1 (versionCode: 2)');

  let currentRemoteManifest = {
    version: '1.0.1',
    versionCode: 2,
    releaseDate: '2026-10-29',
    apkFileName: 'DotyNotes-v1.0.1.apk',
    downloadUrl: 'https://github.com/abhijeet02singh/dotynotes/releases/download/v1.0.1/DotyNotes-v1.0.1.apk',
    fileSizeFormatted: '~73.8 MB',
    releaseNotes: 'Official DotyNotes release.',
  };

  setUpdateServiceDependencies({
    installedAppVersion: '1.0.1',
    installedVersionCode: 2,
    getSettingAsync: mockGetSetting,
    setSettingAsync: mockSetSetting,
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => currentRemoteManifest,
    }),
  });

  const baselineResult = await checkForUpdatesAsync({ isManual: true });
  console.log(`   Manual Check Result: isAvailable = ${baselineResult.isAvailable}`);
  assert.strictEqual(baselineResult.isAvailable, false, 'Baseline must show no update available');
  console.log('   ✅ Explanation verified: Installed matches remote release. App displays "You\'re Up to Date".\n');

  // --------------------------------------------------------------------------
  // STEP 2: Simulate Newer Version 1.0.2 (versionCode: 3)
  // --------------------------------------------------------------------------
  console.log('🚀 [STEP 2] Simulating New Remote Release Published');
  console.log('   Installed Binary : Version 1.0.1 (versionCode: 2)');
  console.log('   Simulated Release: Version 1.0.2 (versionCode: 3)');

  const simulatedNewReleaseManifest = {
    version: '1.0.2',
    versionCode: 3,
    releaseDate: '2026-10-29',
    minAndroidVersion: 'Android 8.0 (API 26) or higher',
    targetAndroidVersion: 'Android 14 / 15 (API 34/35)',
    packageId: 'com.dotynotes.app',
    apkFileName: 'DotyNotes-v1.0.2.apk',
    downloadUrl: 'https://expo.dev/artifacts/eas/6Mb7x3cvBeyZMfrn60PDHm9WH2CJk--185iu7YT5Ycw.apk',
    fileSizeBytes: 77385920,
    fileSizeFormatted: '~73.8 MB',
    sha256: '6Mb7x3cvBeyZMfrn60PDHm9WH2CJk--185iu7YT5Ycw',
    releaseNotes: 'New features: In-app update detection, native package installer, and performance optimizations.',
    releaseNotesUrl: 'https://github.com/abhijeet02singh/dotynotes/releases/tag/v1.0.2',
  };

  setUpdateServiceDependencies({
    installedAppVersion: '1.0.1',
    installedVersionCode: 2,
    getSettingAsync: mockGetSetting,
    setSettingAsync: mockSetSetting,
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => simulatedNewReleaseManifest,
    }),
  });

  const manualResult = await checkForUpdatesAsync({ isManual: true });
  console.log(`   isAvailable           : ${manualResult.isAvailable}`);
  console.log(`   New Release Version   : v${manualResult.release.version}`);
  console.log(`   New Release Code      : ${manualResult.release.versionCode}`);
  console.log(`   Direct Download URL   : ${manualResult.release.downloadUrl}`);

  assert.strictEqual(manualResult.isAvailable, true, 'Manual check must detect new release');
  assert.strictEqual(manualResult.release.version, '1.0.2');
  assert.strictEqual(manualResult.release.versionCode, 3);
  console.log('   ✅ Manual Check verified: Update Available dialog would be displayed with v1.0.2.\n');

  // --------------------------------------------------------------------------
  // STEP 3: Verify Automatic Startup Check
  // --------------------------------------------------------------------------
  console.log('📲 [STEP 3] Verifying Automatic Startup Check Behavior');
  const startupResult = await checkForUpdatesAsync({ isManual: false });
  console.log(`   isAvailable : ${startupResult.isAvailable}`);
  console.log(`   isDismissed : ${startupResult.isDismissed}`);

  assert.strictEqual(startupResult.isAvailable, true);
  assert.strictEqual(startupResult.isDismissed, false);

  // Simulate HomeScreen.js guard:
  const wouldShowStartupDialog = Boolean(
    startupResult.isAvailable && !startupResult.isDismissed && startupResult.release
  );
  console.log(`   HomeScreen UI Guard (isAvailable && !isDismissed): ${wouldShowStartupDialog}`);
  assert.strictEqual(wouldShowStartupDialog, true, 'Startup update modal must trigger on first detection');
  console.log('   ✅ Automatic startup check successfully triggers UpdateModal.\n');

  // --------------------------------------------------------------------------
  // STEP 4: User selects "Later" in UpdateModal
  // --------------------------------------------------------------------------
  console.log('⏳ [STEP 4] Simulating User Tapping "Later"');
  await dismissUpdateVersionAsync('1.0.2');
  console.log(`   SQLite app_metadata stored: dismissed_update_version = "${sqliteMetadataStore['dismissed_update_version']}"`);
  assert.strictEqual(sqliteMetadataStore['dismissed_update_version'], '1.0.2');
  console.log('   ✅ Dismissal persisted to persistent storage.\n');

  // --------------------------------------------------------------------------
  // STEP 5: App Reopened (Subsequent Automatic Startup Check)
  // --------------------------------------------------------------------------
  console.log('🔄 [STEP 5] App Reopened: Verifying Dismissal Suppression on Startup');
  const suppressedStartupResult = await checkForUpdatesAsync({ isManual: false });
  console.log(`   isAvailable : ${suppressedStartupResult.isAvailable}`);
  console.log(`   isDismissed : ${suppressedStartupResult.isDismissed}`);

  assert.strictEqual(suppressedStartupResult.isAvailable, true);
  assert.strictEqual(suppressedStartupResult.isDismissed, true, 'Must report isDismissed = true');

  // Simulate HomeScreen.js guard:
  const wouldShowSuppressedDialog = Boolean(
    suppressedStartupResult.isAvailable && !suppressedStartupResult.isDismissed && suppressedStartupResult.release
  );
  console.log(`   HomeScreen UI Guard (isAvailable && !isDismissed): ${wouldShowSuppressedDialog}`);
  assert.strictEqual(wouldShowSuppressedDialog, false, 'Startup modal MUST NOT show when dismissed');
  console.log('   ✅ Repeated startup prompt successfully suppressed! User is not interrupted.\n');

  // --------------------------------------------------------------------------
  // STEP 6: User Manually Checks for Updates in Settings/About
  // --------------------------------------------------------------------------
  console.log('👆 [STEP 6] User Manually Taps "Check for Updates" in Settings');
  const manualBypassResult = await checkForUpdatesAsync({ isManual: true });
  console.log(`   isAvailable : ${manualBypassResult.isAvailable}`);
  console.log(`   isDismissed : ${manualBypassResult.isDismissed}`);

  assert.strictEqual(manualBypassResult.isAvailable, true);
  assert.strictEqual(manualBypassResult.isDismissed, false, 'Manual check must bypass dismissal');

  // Simulate HomeScreen.js guard:
  const wouldShowManualDialog = manualBypassResult.isAvailable && manualBypassResult.release;
  console.log(`   HomeScreen UI Guard (isAvailable && release): ${Boolean(wouldShowManualDialog)}`);
  assert.strictEqual(Boolean(wouldShowManualDialog), true, 'Manual check MUST show update modal even if previously dismissed');
  console.log('   ✅ Manual check bypasses dismissal and allows user to update at any time.\n');

  // --------------------------------------------------------------------------
  // STEP 7: Future Release 1.0.3 (versionCode: 4) Supersedes Dismissal
  // --------------------------------------------------------------------------
  console.log('✨ [STEP 7] Future Release Published (v1.0.3, versionCode: 4)');
  console.log('   Prior dismissal was for: v1.0.2');

  const futureReleaseManifest = {
    ...simulatedNewReleaseManifest,
    version: '1.0.3',
    versionCode: 4,
    apkFileName: 'DotyNotes-v1.0.3.apk',
  };

  // Expire cache to simulate network query
  delete sqliteMetadataStore['last_update_check_time'];
  delete sqliteMetadataStore['cached_update_release_data'];

  setUpdateServiceDependencies({
    installedAppVersion: '1.0.1',
    installedVersionCode: 2,
    getSettingAsync: mockGetSetting,
    setSettingAsync: mockSetSetting,
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => futureReleaseManifest,
    }),
  });

  const futureStartupResult = await checkForUpdatesAsync({ isManual: false });
  console.log(`   Future Release Version: v${futureStartupResult.release.version}`);
  console.log(`   isDismissed           : ${futureStartupResult.isDismissed}`);

  assert.strictEqual(futureStartupResult.isDismissed, false, '1.0.2 dismissal must not suppress 1.0.3');
  const wouldShowFutureDialog = Boolean(
    futureStartupResult.isAvailable && !futureStartupResult.isDismissed && futureStartupResult.release
  );
  assert.strictEqual(wouldShowFutureDialog, true, 'Newer release must trigger update modal');
  console.log('   ✅ Future release supersedes old dismissal and prompts normally.\n');

  console.log('================================================================');
  console.log('🎉 ALL 7 UPDATE DETECTION & LIFECYCLE SIMULATION TESTS PASSED!');
  console.log('================================================================\n');

  resetUpdateServiceDependencies();
}

runSimulation().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
