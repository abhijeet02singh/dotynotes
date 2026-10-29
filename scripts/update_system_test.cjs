/**
 * DotyNotes Comprehensive Update System Test Suite
 *
 * Validates all required test specifications:
 * 1. Installed version equals latest version.
 * 2. Installed version is older than latest version.
 * 3. VersionCode comparison.
 * 4. Manifest unavailable but GitHub API succeeds.
 * 5. Both sources unavailable.
 * 6. Manual check bypasses cache.
 * 7. Automatic check respects cache.
 * 8. User chooses Later.
 * 9. Download and installer failure handling.
 * 10. Settings/About update option is visible.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING DOTYNOTES IN-APP UPDATE SYSTEM TEST SUITE');
  console.log('====================================================\n');

  // Load the updateService module dynamically
  const updateService = await import('../src/services/updateService.js');
  const {
    parseSemver,
    compareSemver,
    isReleaseNewer,
    fetchManifestFromUrlAsync,
    fetchGitHubLatestReleaseAsync,
    fetchLatestReleaseInfoAsync,
    checkForUpdatesAsync,
    dismissUpdateVersionAsync,
    getDismissedUpdateVersionAsync,
    clearDismissedUpdateVersionAsync,
    openApkDownloadAsync,
    setUpdateServiceDependencies,
    resetUpdateServiceDependencies,
    UPDATE_CACHE_DURATION_MS,
  } = updateService;

  let passedTests = 0;
  function test(name, fn) {
    try {
      fn();
      console.log(`PASS: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`FAIL: ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`FAIL: ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // --------------------------------------------------------------------------
  // SPEC 1: Installed version equals latest version
  // --------------------------------------------------------------------------
  console.log('👉 [SPEC 1] Installed version equals latest version');
  test('Exact same version (1.0.1, code 2) reports no update available', () => {
    const isNewer = isReleaseNewer({
      installedVersion: '1.0.1',
      installedVersionCode: 2,
      releaseVersion: '1.0.1',
      releaseVersionCode: 2,
    });
    assert.strictEqual(isNewer, false, 'Same version and code should not be newer');
  });

  test('Future identical releases (1.0.2 == 1.0.2, 2.0.0 == 2.0.0) report no update', () => {
    assert.strictEqual(
      isReleaseNewer({
        installedVersion: '1.0.2',
        installedVersionCode: 3,
        releaseVersion: '1.0.2',
        releaseVersionCode: 3,
      }),
      false
    );
    assert.strictEqual(
      isReleaseNewer({
        installedVersion: '2.0.0',
        installedVersionCode: 10,
        releaseVersion: '2.0.0',
        releaseVersionCode: 10,
      }),
      false
    );
  });

  // --------------------------------------------------------------------------
  // SPEC 2: Installed version is older than latest version
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 2] Installed version is older than latest version');
  test('Patch bump (1.0.1 -> 1.0.2) reports update available', () => {
    const isNewer = isReleaseNewer({
      installedVersion: '1.0.1',
      installedVersionCode: 2,
      releaseVersion: '1.0.2',
      releaseVersionCode: 3,
    });
    assert.strictEqual(isNewer, true, 'Patch bump should trigger update');
  });

  test('Minor bump (1.0.1 -> 1.1.0) reports update available', () => {
    const isNewer = isReleaseNewer({
      installedVersion: '1.0.1',
      installedVersionCode: 2,
      releaseVersion: '1.1.0',
      releaseVersionCode: 4,
    });
    assert.strictEqual(isNewer, true, 'Minor bump should trigger update');
  });

  test('Major bump (1.0.1 -> 2.0.0) reports update available', () => {
    const isNewer = isReleaseNewer({
      installedVersion: '1.0.1',
      installedVersionCode: 2,
      releaseVersion: '2.0.0',
      releaseVersionCode: 10,
    });
    assert.strictEqual(isNewer, true, 'Major bump should trigger update');
  });

  // --------------------------------------------------------------------------
  // SPEC 3: VersionCode comparison
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 3] VersionCode comparison logic');
  test('Same semver (1.0.1) but higher versionCode (3 > 2) reports update available', () => {
    const isNewer = isReleaseNewer({
      installedVersion: '1.0.1',
      installedVersionCode: 2,
      releaseVersion: '1.0.1',
      releaseVersionCode: 3,
    });
    assert.strictEqual(isNewer, true, 'Higher versionCode must trigger update even with identical semver');
  });

  test('Lower versionCode (1 < 2) does not report update even if semver strings are identical', () => {
    const isNewer = isReleaseNewer({
      installedVersion: '1.0.1',
      installedVersionCode: 2,
      releaseVersion: '1.0.1',
      releaseVersionCode: 1,
    });
    assert.strictEqual(isNewer, false, 'Older versionCode must never trigger update');
  });

  test('Fallback to semver when versionCode is missing or null', () => {
    const isNewer = isReleaseNewer({
      installedVersion: '1.0.1',
      installedVersionCode: null,
      releaseVersion: '1.0.2',
      releaseVersionCode: null,
    });
    assert.strictEqual(isNewer, true, 'Should fall back to semver when code is absent');
  });

  // --------------------------------------------------------------------------
  // SPEC 4: Manifest unavailable but GitHub API succeeds
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 4] Manifest unavailable but GitHub API succeeds');
  await testAsync('Fallback hierarchy gracefully switches to GitHub Releases API', async () => {
    const mockGitHubRelease = {
      tag_name: 'v1.0.2',
      draft: false,
      prerelease: false,
      published_at: '2026-10-29T10:00:00Z',
      html_url: 'https://github.com/abhijeet02singh/dotynotes/releases/tag/v1.0.2',
      body: '## Release v1.0.2\n- **Version Code:** 3\nSHA-256: 1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff\nNew features and fixes.',
      assets: [
        {
          name: 'DotyNotes-v1.0.2.apk',
          size: 78000000,
          browser_download_url: 'https://github.com/abhijeet02singh/dotynotes/releases/download/v1.0.2/DotyNotes-v1.0.2.apk',
        },
      ],
    };

    let fetchCount = 0;
    const mockFetch = async (url) => {
      fetchCount++;
      if (url.includes('update-manifest.json')) {
        return { ok: false, status: 404 };
      }
      if (url.includes('api.github.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockGitHubRelease,
        };
      }
      return { ok: false, status: 500 };
    };

    setUpdateServiceDependencies({ fetch: mockFetch });

    const release = await fetchLatestReleaseInfoAsync();
    assert.strictEqual(release.source, 'github-api');
    assert.strictEqual(release.version, '1.0.2');
    assert.strictEqual(release.versionCode, 3);
    assert.strictEqual(release.apkFileName, 'DotyNotes-v1.0.2.apk');
    assert.strictEqual(release.sha256, '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff');
    resetUpdateServiceDependencies();
  });

  await testAsync('GitHub drafts and prereleases are filtered out', async () => {
    const mockDraft = {
      tag_name: 'v1.0.3-beta',
      draft: true,
      prerelease: false,
      assets: [],
    };

    setUpdateServiceDependencies({
      fetch: async () => ({
        ok: true,
        status: 200,
        json: async () => mockDraft,
      }),
    });

    let threw = false;
    try {
      await fetchGitHubLatestReleaseAsync();
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('draft or prerelease'));
    }
    assert.strictEqual(threw, true, 'Drafts must be rejected');
    resetUpdateServiceDependencies();
  });

  // --------------------------------------------------------------------------
  // SPEC 5: Both sources unavailable
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 5] Both sources unavailable (network failure handling)');
  await testAsync('Automatic check handles total network outage without throwing', async () => {
    setUpdateServiceDependencies({
      fetch: async () => {
        throw new Error('ENOTFOUND network offline');
      },
      getSettingAsync: async () => null,
      setSettingAsync: async () => {},
      installedAppVersion: '1.0.1',
      installedVersionCode: 2,
    });

    const result = await checkForUpdatesAsync({ isManual: false });
    assert.strictEqual(result.isAvailable, false, 'Should not report update on error');
    assert.ok(result.error !== null, 'Error string must be returned');
    assert.ok(result.error.includes('network offline'));
    resetUpdateServiceDependencies();
  });

  await testAsync('Manual check throws descriptive error to trigger user retry UI', async () => {
    setUpdateServiceDependencies({
      fetch: async () => {
        throw new Error('Connection refused');
      },
      getSettingAsync: async () => null,
      setSettingAsync: async () => {},
    });

    let threw = false;
    try {
      await checkForUpdatesAsync({ isManual: true });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('Connection refused'));
    }
    assert.strictEqual(threw, true, 'Manual check must bubble error to UI');
    resetUpdateServiceDependencies();
  });

  // --------------------------------------------------------------------------
  // SPEC 6: Manual check bypasses cache
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 6] Manual check bypasses cache');
  await testAsync('Manual check queries network even when fresh cache exists', async () => {
    const memoryStore = {
      last_update_check_time: String(Date.now() - 1000), // 1 second ago (very fresh)
      cached_update_release_data: JSON.stringify({
        version: '1.0.1',
        versionCode: 2,
        downloadUrl: 'https://example.com/cached.apk',
        source: 'cache',
      }),
    };

    let networkFetchCalled = false;
    setUpdateServiceDependencies({
      getSettingAsync: async (k) => memoryStore[k] || null,
      setSettingAsync: async (k, v) => {
        memoryStore[k] = v;
      },
      fetch: async (url) => {
        networkFetchCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            version: '1.0.2',
            versionCode: 3,
            downloadUrl: 'https://example.com/new.apk',
          }),
        };
      },
      installedAppVersion: '1.0.1',
      installedVersionCode: 2,
    });

    const result = await checkForUpdatesAsync({ isManual: true });
    assert.strictEqual(networkFetchCalled, true, 'Network fetch must be called on manual check');
    assert.strictEqual(result.isAvailable, true);
    assert.strictEqual(result.release.version, '1.0.2');
    resetUpdateServiceDependencies();
  });

  // --------------------------------------------------------------------------
  // SPEC 7: Automatic check respects cache
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 7] Automatic check respects cache');
  await testAsync('Automatic check uses fresh cache and avoids network call', async () => {
    const memoryStore = {
      last_update_check_time: String(Date.now() - 1000 * 60 * 60), // 1 hour ago (< 24 hrs)
      cached_update_release_data: JSON.stringify({
        version: '1.0.2',
        versionCode: 3,
        downloadUrl: 'https://example.com/cached.apk',
        source: 'manifest',
      }),
    };

    let networkFetchCalled = false;
    setUpdateServiceDependencies({
      getSettingAsync: async (k) => memoryStore[k] || null,
      setSettingAsync: async () => {},
      fetch: async () => {
        networkFetchCalled = true;
        throw new Error('Should not be called!');
      },
      installedAppVersion: '1.0.1',
      installedVersionCode: 2,
    });

    const result = await checkForUpdatesAsync({ isManual: false });
    assert.strictEqual(networkFetchCalled, false, 'Network should NOT be queried when cache is fresh');
    assert.strictEqual(result.source, 'cache');
    assert.strictEqual(result.isAvailable, true);
    assert.strictEqual(result.release.version, '1.0.2');
    resetUpdateServiceDependencies();
  });

  await testAsync('Automatic check refetches when cache is older than 24 hours', async () => {
    const memoryStore = {
      last_update_check_time: String(Date.now() - (UPDATE_CACHE_DURATION_MS + 1000)), // expired
      cached_update_release_data: JSON.stringify({
        version: '1.0.1',
        versionCode: 2,
      }),
    };

    let networkFetchCalled = false;
    setUpdateServiceDependencies({
      getSettingAsync: async (k) => memoryStore[k] || null,
      setSettingAsync: async (k, v) => {
        memoryStore[k] = v;
      },
      fetch: async () => {
        networkFetchCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            version: '1.0.2',
            versionCode: 3,
            downloadUrl: 'https://example.com/new.apk',
          }),
        };
      },
      installedAppVersion: '1.0.1',
      installedVersionCode: 2,
    });

    const result = await checkForUpdatesAsync({ isManual: false });
    assert.strictEqual(networkFetchCalled, true, 'Expired cache must trigger re-fetch');
    assert.strictEqual(result.isAvailable, true);
    resetUpdateServiceDependencies();
  });

  // --------------------------------------------------------------------------
  // SPEC 8: User chooses Later
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 8] User chooses Later dismissal behavior');
  await testAsync('Dismissed version suppresses automatic check but not manual check', async () => {
    const memoryStore = {
      dismissed_update_version: '1.0.2',
    };

    setUpdateServiceDependencies({
      getSettingAsync: async (k) => memoryStore[k] || null,
      setSettingAsync: async (k, v) => {
        memoryStore[k] = v;
      },
      fetch: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          version: '1.0.2',
          versionCode: 3,
          downloadUrl: 'https://example.com/102.apk',
        }),
      }),
      installedAppVersion: '1.0.1',
      installedVersionCode: 2,
    });

    // 1. Automatic check marks isDismissed = true
    const autoResult = await checkForUpdatesAsync({ isManual: false });
    assert.strictEqual(autoResult.isAvailable, true);
    assert.strictEqual(autoResult.isDismissed, true, 'Automatic check must recognize dismissed version');

    // 2. Manual check ignores dismissal (isDismissed = false)
    const manualResult = await checkForUpdatesAsync({ isManual: true });
    assert.strictEqual(manualResult.isAvailable, true);
    assert.strictEqual(manualResult.isDismissed, false, 'Manual check must bypass dismissal');

    // 3. New release (1.0.3) is NOT suppressed by 1.0.2 dismissal
    memoryStore.last_update_check_time = '0'; // Simulate cache expired/refreshed
    setUpdateServiceDependencies({
      getSettingAsync: async (k) => memoryStore[k] || null,
      fetch: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          version: '1.0.3',
          versionCode: 4,
          downloadUrl: 'https://example.com/103.apk',
        }),
      }),
      installedAppVersion: '1.0.1',
      installedVersionCode: 2,
    });
    const newResult = await checkForUpdatesAsync({ isManual: false });
    assert.strictEqual(newResult.isDismissed, false, 'New release must not be suppressed by old dismissal');

    resetUpdateServiceDependencies();
  });

  // --------------------------------------------------------------------------
  // SPEC 9: Download and installer failure handling
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 9] Download and installer failure handling');
  await testAsync('openApkDownloadAsync successfully delegates to Linking module', async () => {
    let openedUrl = null;
    const mockLinking = {
      canOpenURL: async () => true,
      openURL: async (url) => {
        openedUrl = url;
      },
    };

    setUpdateServiceDependencies({ Linking: mockLinking });
    const res = await openApkDownloadAsync('https://github.com/test.apk');
    assert.strictEqual(res.success, true);
    assert.strictEqual(openedUrl, 'https://github.com/test.apk');
    resetUpdateServiceDependencies();
  });

  await testAsync('openApkDownloadAsync falls back to release page if APK url fails', async () => {
    let openedUrl = null;
    const mockLinking = {
      canOpenURL: async (url) => !url.endsWith('.apk'), // APK protocol unsupported
      openURL: async (url) => {
        openedUrl = url;
      },
    };

    setUpdateServiceDependencies({ Linking: mockLinking });
    const res = await openApkDownloadAsync('https://github.com/test.apk', 'https://github.com/releases');
    assert.strictEqual(res.success, true);
    assert.strictEqual(openedUrl, 'https://github.com/releases');
    resetUpdateServiceDependencies();
  });

  await testAsync('openApkDownloadAsync throws clear error if device cannot open link', async () => {
    const mockLinking = {
      canOpenURL: async () => false,
      openURL: async () => {},
    };

    setUpdateServiceDependencies({ Linking: mockLinking });
    let threw = false;
    try {
      await openApkDownloadAsync('https://github.com/test.apk', '');
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('Device cannot open the download link'));
    }
    assert.strictEqual(threw, true);
    resetUpdateServiceDependencies();
  });

  // --------------------------------------------------------------------------
  // SPEC 10: Settings/About update option is visible
  // --------------------------------------------------------------------------
  console.log('\n👉 [SPEC 10] Settings/About update option is visible and connected');
  test('SettingsScreen.js contains "Check for Updates" and dynamic version display', () => {
    const settingsPath = path.resolve(__dirname, '../src/screens/SettingsScreen.js');
    const content = fs.readFileSync(settingsPath, 'utf8');

    assert.ok(content.includes('onCheckForUpdates'), 'SettingsScreen must accept onCheckForUpdates prop');
    assert.ok(content.includes('isCheckingUpdate'), 'SettingsScreen must accept isCheckingUpdate prop');
    assert.ok(content.includes('Check for Updates'), 'SettingsScreen must render "Check for Updates" label');
    assert.ok(content.includes('ActivityIndicator'), 'SettingsScreen must render ActivityIndicator while checking');
    assert.ok(content.includes('getInstalledAppVersion'), 'SettingsScreen must use dynamic runtime app version');
  });

  test('AboutScreen.js contains "Check for Updates" card and dynamic version display', () => {
    const aboutPath = path.resolve(__dirname, '../src/screens/AboutScreen.js');
    const content = fs.readFileSync(aboutPath, 'utf8');

    assert.ok(content.includes('onCheckForUpdates'), 'AboutScreen must accept onCheckForUpdates prop');
    assert.ok(content.includes('isCheckingUpdate'), 'AboutScreen must accept isCheckingUpdate prop');
    assert.ok(content.includes('Check for Updates'), 'AboutScreen must render "Check for Updates" card');
    assert.ok(content.includes('ActivityIndicator'), 'AboutScreen must render ActivityIndicator');
    assert.ok(content.includes('getInstalledAppVersion'), 'AboutScreen must use dynamic runtime app version');
  });

  test('HomeScreen.js orchestrates startup check, manual update handler, and UpdateModal', () => {
    const homePath = path.resolve(__dirname, '../src/screens/HomeScreen.js');
    const content = fs.readFileSync(homePath, 'utf8');

    assert.ok(content.includes('checkForUpdatesAsync'), 'HomeScreen must import checkForUpdatesAsync');
    assert.ok(content.includes('handleCheckForUpdates'), 'HomeScreen must define handleCheckForUpdates handler');
    assert.ok(content.includes('UpdateModal'), 'HomeScreen must render UpdateModal');
    assert.ok(content.includes('onCheckForUpdates={handleCheckForUpdates}'), 'HomeScreen must pass onCheckForUpdates to Settings & About');
    assert.ok(content.includes('dismissUpdateVersionAsync'), 'HomeScreen must persist dismissal when user taps Later');
    assert.ok(content.includes('openApkDownloadAsync'), 'HomeScreen must trigger openApkDownloadAsync on Update Now');
  });

  await testAsync('openApkDownloadAsync invokes native package installer when available', async () => {
    let nativeCalled = false;
    const mockOverlay = {
      downloadAndInstallApkNativeAsync: async () => {
        nativeCalled = true;
        return { success: true, downloadId: 101 };
      },
    };

    setUpdateServiceDependencies({ nativeOverlay: mockOverlay });
    const res = await openApkDownloadAsync('https://github.com/test.apk', 'https://github.com/releases', 'test.apk');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.method, 'native-installer');
    assert.strictEqual(nativeCalled, true);
    resetUpdateServiceDependencies();
  });

  test('update-manifest.json exists and is valid', () => {
    const manifestPath = path.resolve(__dirname, '../update-manifest.json');
    const websiteManifestPath = path.resolve(__dirname, '../dotynotes-website/public/update-manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'Root update-manifest.json must exist');
    assert.ok(fs.existsSync(websiteManifestPath), 'Website public update-manifest.json must exist');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf8'));
    assert.strictEqual(manifest.version, appJson.expo.version);
    assert.ok(
      appJson.expo.android.versionCode >= manifest.versionCode,
      `app.json versionCode (${appJson.expo.android.versionCode}) must be >= manifest versionCode (${manifest.versionCode})`
    );
    assert.ok(manifest.downloadUrl.includes('github.com'));
    assert.ok(manifest.downloadUrl.endsWith('.apk'));
  });

  test('expo-application and REQUEST_INSTALL_PACKAGES are configured for Android updates', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    assert.ok(pkg.dependencies['expo-application'], 'expo-application must be declared in package.json');

    const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf8'));
    assert.ok(
      appJson.expo.android.permissions.includes('android.permission.REQUEST_INSTALL_PACKAGES'),
      'REQUEST_INSTALL_PACKAGES permission must be declared in app.json'
    );

    const manifestXml = fs.readFileSync(
      path.resolve(__dirname, '../modules/floating-dot-overlay/android/src/main/AndroidManifest.xml'),
      'utf8'
    );
    assert.ok(manifestXml.includes('REQUEST_INSTALL_PACKAGES'), 'REQUEST_INSTALL_PACKAGES must be in AndroidManifest.xml');
    assert.ok(manifestXml.includes('androidx.core.content.FileProvider'), 'FileProvider must be configured in AndroidManifest.xml');

    const filePathsXml = path.resolve(__dirname, '../modules/floating-dot-overlay/android/src/main/res/xml/dotynotes_file_paths.xml');
    assert.ok(fs.existsSync(filePathsXml), 'dotynotes_file_paths.xml FileProvider config must exist');
  });

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests} SPECIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
