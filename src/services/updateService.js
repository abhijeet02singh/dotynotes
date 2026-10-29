// Native and runtime bindings with graceful fallback for Node.js test environments
let nativeLinking = null;
try {
  nativeLinking = require('react-native')?.Linking;
} catch (_) {}

let nativeApplication = null;
try {
  nativeApplication = require('expo-application');
} catch (_) {}

let expoConstants = null;
try {
  expoConstants = require('expo-constants')?.default || require('expo-constants');
} catch (_) {}

let appConfig = null;
try {
  appConfig = require('../../app.json');
} catch (_) {}

let notesDb = null;
try {
  notesDb = require('./notesDb');
} catch (_) {}

let nativeOverlay = null;
try {
  nativeOverlay = require('../../modules/floating-dot-overlay');
} catch (_) {}

export const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/abhijeet02singh/dotynotes/master/update-manifest.json';
export const UPDATE_MANIFEST_WEBSITE_URL =
  'https://dotynotes.vercel.app/update-manifest.json';
export const GITHUB_RELEASES_API_URL =
  'https://api.github.com/repos/abhijeet02singh/dotynotes/releases/latest';
export const GITHUB_RELEASES_PAGE_URL =
  'https://github.com/abhijeet02singh/dotynotes/releases';
export const UPDATE_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const SETTING_KEY_LAST_CHECK_TIME = 'last_update_check_time';
const SETTING_KEY_DISMISSED_VERSION = 'dismissed_update_version';
const SETTING_KEY_CACHED_RELEASE = 'cached_update_release_data';

/**
 * Isolated Simulation Override for Development / QA Testing:
 * Set to true to test the Update Available dialog on development/test builds.
 * When enabled, returns a simulated v1.0.2 (versionCode 3) release.
 * Set to false for standard production releases.
 */
export const DEV_SIMULATE_UPDATE = false;

let customDeps = {};

/**
 * Allows test suites to inject mock versions, storage adapters, or linkers.
 */
export function setUpdateServiceDependencies(deps = {}) {
  customDeps = { ...customDeps, ...deps };
}

export function resetUpdateServiceDependencies() {
  customDeps = {};
}

/**
 * Resolves the installed app version string, preferring native runtime
 * Application info, then Expo runtime config, and falling back to app.json.
 */
export function getInstalledAppVersion() {
  if (customDeps.installedAppVersion !== undefined) {
    return customDeps.installedAppVersion;
  }
  const overlay = customDeps.nativeOverlay || nativeOverlay;
  const overlayVer = overlay?.getNativeAppVersionInfo?.()?.version;
  if (overlayVer) return overlayVer;

  const app = customDeps.Application || nativeApplication;
  const constants = customDeps.Constants || expoConstants;
  const config = customDeps.appConfig || appConfig;

  return (
    app?.nativeApplicationVersion ||
    constants?.expoConfig?.version ||
    config?.expo?.version ||
    '1.0.1'
  );
}

/**
 * Resolves the installed app integer versionCode, preferring native Android
 * BuildConfig info, then Expo runtime config, and falling back to app.json.
 */
export function getInstalledVersionCode() {
  if (customDeps.installedVersionCode !== undefined) {
    return customDeps.installedVersionCode;
  }
  const overlay = customDeps.nativeOverlay || nativeOverlay;
  const overlayCode = overlay?.getNativeAppVersionInfo?.()?.versionCode;
  if (Number.isInteger(overlayCode) && overlayCode > 0) return overlayCode;

  const app = customDeps.Application || nativeApplication;
  const constants = customDeps.Constants || expoConstants;
  const config = customDeps.appConfig || appConfig;

  const raw =
    app?.nativeBuildVersion ||
    constants?.expoConfig?.android?.versionCode ||
    config?.expo?.android?.versionCode ||
    1;
  const parsed = parseInt(String(raw), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Parses a semantic version string into major, minor, patch numbers.
 */
export function parseSemver(versionStr) {
  if (!versionStr || typeof versionStr !== 'string') return null;
  const clean = versionStr.replace(/^v/, '').trim();
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    formatted: `${match[1]}.${match[2]}.${match[3]}`,
  };
}

/**
 * Compares two semantic version strings.
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, and 0 if equal.
 */
export function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (!p1 || !p2) return 0;
  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  return p1.patch - p2.patch;
}

/**
 * Determines whether the remote release is newer than the installed app.
 * Enforces integer versionCode check first, followed by semantic version comparison.
 */
export function isReleaseNewer({
  installedVersion,
  installedVersionCode,
  releaseVersion,
  releaseVersionCode,
}) {
  const relCode = Number.isInteger(releaseVersionCode) ? releaseVersionCode : null;
  const instCode = Number.isInteger(installedVersionCode) ? installedVersionCode : null;

  if (relCode !== null && instCode !== null && relCode > 0 && instCode > 0) {
    if (relCode > instCode) return true;
    if (relCode < instCode) return false;
  }

  return compareSemver(releaseVersion, installedVersion) > 0;
}

/**
 * Helper to fetch a JSON resource with an abortable timeout.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const fetchImpl = customDeps.fetch || fetch;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Attempts to fetch the update manifest from raw GitHub or the website CDN.
 */
export async function fetchManifestFromUrlAsync(url, timeoutMs = 8000) {
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching manifest from ${url}`);
  }

  const data = await response.json();
  if (!data || !data.version || !data.downloadUrl) {
    throw new Error('Manifest missing required version or downloadUrl properties');
  }

  return {
    version: data.version.replace(/^v/, ''),
    versionCode: Number.isInteger(data.versionCode) ? data.versionCode : null,
    releaseDate: data.releaseDate || '',
    apkFileName: data.apkFileName || `DotyNotes-v${data.version}.apk`,
    downloadUrl: data.downloadUrl,
    fileSizeBytes: data.fileSizeBytes || null,
    fileSizeFormatted: data.fileSizeFormatted || '',
    sha256: data.sha256 || null,
    releaseNotes: data.releaseNotes || 'Bug fixes and performance improvements.',
    releaseNotesUrl: data.releaseNotesUrl || GITHUB_RELEASES_PAGE_URL,
    source: 'manifest',
  };
}

/**
 * Fallback to query the official GitHub Releases API for the repository.
 */
export async function fetchGitHubLatestReleaseAsync(timeoutMs = 8000) {
  const response = await fetchWithTimeout(
    GITHUB_RELEASES_API_URL,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DotyNotes-Android-App',
      },
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from GitHub Releases API`);
  }

  const data = await response.json();

  if (data.draft || data.prerelease) {
    throw new Error('Latest release on GitHub is marked as draft or prerelease');
  }

  const apkAsset = data.assets?.find(
    (asset) => typeof asset.name === 'string' && asset.name.endsWith('.apk')
  );

  if (!apkAsset || !apkAsset.browser_download_url) {
    throw new Error('No APK binary asset attached to the latest release');
  }

  const cleanVersion = data.tag_name ? data.tag_name.replace(/^v/, '') : '';
  if (!cleanVersion) {
    throw new Error('Release tag missing on GitHub release');
  }

  // Extract versionCode from release body: "- **Version Code:** 2"
  let parsedCode = null;
  if (data.body) {
    const vcMatch = data.body.match(/Version Code:\*?\*?\s*`?(\d+)`?/i);
    if (vcMatch) {
      parsedCode = parseInt(vcMatch[1], 10);
    }
  }

  // Extract SHA-256 checksum from release body
  let sha256 = null;
  if (data.body) {
    const shaMatch = data.body.match(/SHA-256:\s*([a-f0-9]{64})/i);
    if (shaMatch) {
      sha256 = shaMatch[1];
    }
  }

  const sizeMb = (apkAsset.size / (1024 * 1024)).toFixed(1);
  const releaseDate = data.published_at
    ? new Date(data.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  // Extract friendly release notes
  let releaseNotes = '';
  if (data.body) {
    const lines = data.body.split('\n');
    const firstContentLine = lines.find(
      (l) => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('-')
    );
    releaseNotes = firstContentLine ? firstContentLine.trim() : 'Official DotyNotes release update.';
  } else {
    releaseNotes = 'Official DotyNotes release update.';
  }

  return {
    version: cleanVersion,
    versionCode: parsedCode,
    releaseDate,
    apkFileName: apkAsset.name,
    downloadUrl: apkAsset.browser_download_url,
    fileSizeBytes: apkAsset.size,
    fileSizeFormatted: `~${sizeMb} MB`,
    sha256,
    releaseNotes,
    releaseNotesUrl: data.html_url || GITHUB_RELEASES_PAGE_URL,
    source: 'github-api',
  };
}

/**
 * Unified release detection: tries the primary manifest URL first,
 * then website manifest URL, and falls back to GitHub Releases API.
 */
export async function fetchLatestReleaseInfoAsync(options = {}) {
  // If simulation mode is explicitly enabled for development/testing (bypassed if test injected mock fetch)
  if (DEV_SIMULATE_UPDATE && !customDeps.fetch) {
    return {
      version: '1.0.2',
      versionCode: 3,
      releaseDate: new Date().toISOString().split('T')[0],
      apkFileName: 'DotyNotes-v1.0.2.apk',
      // Safe destination: opens release notes page, preventing fake APK downloads
      downloadUrl: GITHUB_RELEASES_PAGE_URL,
      fileSizeBytes: 77385920,
      fileSizeFormatted: '~73.8 MB',
      sha256: null,
      releaseNotes: '• Verified in-app update detection\n• Native Android Package Installer support\n• Database safety guarantee active',
      releaseNotesUrl: GITHUB_RELEASES_PAGE_URL,
      source: 'dev-simulation',
    };
  }

  const timeoutMs = options.timeoutMs || 8000;
  const errors = [];

  // 1. Try primary GitHub raw manifest
  try {
    return await fetchManifestFromUrlAsync(UPDATE_MANIFEST_URL, timeoutMs);
  } catch (err) {
    errors.push(`Primary manifest: ${err.message}`);
  }

  // 2. Try website public manifest
  try {
    return await fetchManifestFromUrlAsync(UPDATE_MANIFEST_WEBSITE_URL, timeoutMs);
  } catch (err) {
    errors.push(`Website manifest: ${err.message}`);
  }

  // 3. Fallback to GitHub Releases API
  try {
    return await fetchGitHubLatestReleaseAsync(timeoutMs);
  } catch (err) {
    errors.push(`GitHub API: ${err.message}`);
  }

  throw new Error(`Unable to fetch release details: ${errors.join(' | ')}`);
}

/**
 * Retrieves cached update information from persistent SQLite storage.
 */
export async function getCachedUpdateInfoAsync() {
  try {
    const getSetting = customDeps.getSettingAsync || notesDb?.getSettingAsync;
    if (!getSetting) return { lastCheckTime: 0, releaseData: null };
    const rawTime = await getSetting(SETTING_KEY_LAST_CHECK_TIME, '0');
    const rawData = await getSetting(SETTING_KEY_CACHED_RELEASE, null);
    const lastCheckTime = parseInt(rawTime, 10) || 0;
    const releaseData = rawData ? JSON.parse(rawData) : null;
    return { lastCheckTime, releaseData };
  } catch (_) {
    return { lastCheckTime: 0, releaseData: null };
  }
}

/**
 * Saves update information to persistent SQLite storage.
 */
export async function saveCachedUpdateInfoAsync(releaseData) {
  try {
    const setSetting = customDeps.setSettingAsync || notesDb?.setSettingAsync;
    if (!setSetting) return;
    await setSetting(SETTING_KEY_LAST_CHECK_TIME, String(Date.now()));
    if (releaseData) {
      await setSetting(SETTING_KEY_CACHED_RELEASE, JSON.stringify(releaseData));
    }
  } catch (_) {}
}

/**
 * Gets the version string dismissed by the user (if any).
 */
export async function getDismissedUpdateVersionAsync() {
  const getSetting = customDeps.getSettingAsync || notesDb?.getSettingAsync;
  if (!getSetting) return null;
  return await getSetting(SETTING_KEY_DISMISSED_VERSION, null);
}

/**
 * Persists a dismissed version string so automatic startup checks don't repeat.
 */
export async function dismissUpdateVersionAsync(version) {
  if (!version) return;
  const setSetting = customDeps.setSettingAsync || notesDb?.setSettingAsync;
  if (!setSetting) return;
  await setSetting(SETTING_KEY_DISMISSED_VERSION, String(version));
}

/**
 * Clears the dismissed version so future checks show prompts normally.
 */
export async function clearDismissedUpdateVersionAsync() {
  const setSetting = customDeps.setSettingAsync || notesDb?.setSettingAsync;
  if (!setSetting) return;
  await setSetting(SETTING_KEY_DISMISSED_VERSION, '');
}

/**
 * Core update check function supporting both automatic startup checks and manual checks.
 *
 * @param {Object} options
 * @param {boolean} options.isManual - When true, bypasses cache and ignored dismissed version.
 * @param {number} options.timeoutMs - Custom timeout in ms.
 */
export async function checkForUpdatesAsync({ isManual = false, timeoutMs = 8000 } = {}) {
  const installedVersion = getInstalledAppVersion();
  const installedVersionCode = getInstalledVersionCode();

  // If automatic check, evaluate cache freshness first
  if (!isManual) {
    const { lastCheckTime, releaseData } = await getCachedUpdateInfoAsync();
    const isCacheFresh = Date.now() - lastCheckTime < UPDATE_CACHE_DURATION_MS;

    if (isCacheFresh && releaseData) {
      const isAvailable = isReleaseNewer({
        installedVersion,
        installedVersionCode,
        releaseVersion: releaseData.version,
        releaseVersionCode: releaseData.versionCode,
      });

      const dismissedVersion = await getDismissedUpdateVersionAsync();
      const isDismissed = dismissedVersion === releaseData.version;

      return {
        isAvailable,
        isDismissed,
        installedVersion,
        installedVersionCode,
        release: releaseData,
        source: 'cache',
        error: null,
      };
    }
  }

  // Fetch from network (manifest -> GitHub fallback)
  let latestRelease = null;
  try {
    latestRelease = await fetchLatestReleaseInfoAsync({ timeoutMs });
    await saveCachedUpdateInfoAsync(latestRelease);
  } catch (err) {
    if (isManual) {
      throw err;
    }
    return {
      isAvailable: false,
      isDismissed: false,
      installedVersion,
      installedVersionCode,
      release: null,
      source: null,
      error: err.message,
    };
  }

  const isAvailable = isReleaseNewer({
    installedVersion,
    installedVersionCode,
    releaseVersion: latestRelease.version,
    releaseVersionCode: latestRelease.versionCode,
  });

  const dismissedVersion = isManual ? null : await getDismissedUpdateVersionAsync();
  const isDismissed = dismissedVersion === latestRelease.version;

  return {
    isAvailable,
    isDismissed,
    installedVersion,
    installedVersionCode,
    release: latestRelease,
    source: latestRelease.source,
    error: null,
  };
}

/**
 * Initiates the Android APK download by opening the official browser / download manager.
 * Safely handles errors and falls back to the release notes URL.
 */
export async function openApkDownloadAsync(
  downloadUrl,
  fallbackUrl = GITHUB_RELEASES_PAGE_URL,
  fileName = ''
) {
  // In development simulation mode, safely open official releases page without downloading fake APKs
  if (DEV_SIMULATE_UPDATE && !customDeps.nativeOverlay && !customDeps.Linking) {
    const linker = nativeLinking;
    if (linker?.openURL) {
      await linker.openURL(GITHUB_RELEASES_PAGE_URL);
      return { success: true, method: 'dev-simulation-browser', url: GITHUB_RELEASES_PAGE_URL };
    }
    return { success: true, method: 'dev-simulation' };
  }

  const overlay = customDeps.nativeOverlay || nativeOverlay;

  // 1. Try native download and package installer invocation via DownloadManager & FileProvider
  if (downloadUrl && overlay?.downloadAndInstallApkNativeAsync) {
    try {
      const res = await overlay.downloadAndInstallApkNativeAsync(downloadUrl, fileName);
      if (res && res.success) {
        return { success: true, method: 'native-installer', downloadId: res.downloadId };
      }
    } catch (_) {}
  }

  // 2. Fall back to opening download URL directly in browser / download manager
  const linker = customDeps.Linking || nativeLinking;
  const targetUrl = downloadUrl || fallbackUrl;
  try {
    if (!linker || !linker.openURL) {
      throw new Error('Linking module not available on this platform.');
    }
    const supported = linker.canOpenURL ? await linker.canOpenURL(targetUrl) : true;
    if (supported) {
      await linker.openURL(targetUrl);
      return { success: true, url: targetUrl, method: 'browser' };
    }
    // If specific download URL wasn't supported, try fallback
    if (fallbackUrl && fallbackUrl !== targetUrl) {
      await linker.openURL(fallbackUrl);
      return { success: true, url: fallbackUrl, method: 'browser-fallback' };
    }
    throw new Error('Device cannot open the download link.');
  } catch (err) {
    if (fallbackUrl && fallbackUrl !== targetUrl && linker?.openURL) {
      try {
        await linker.openURL(fallbackUrl);
        return { success: true, url: fallbackUrl, method: 'browser-fallback' };
      } catch (_) {}
    }
    throw new Error(`Failed to open update link: ${err.message}`);
  }
}

/**
 * Downloads the latest official APK directly, verifies its SHA-256 cryptographic checksum,
 * confirms package ID (com.dotynotes.app) and version compatibility, and prompts Android's
 * PackageInstaller. If native capability is absent, safely falls back to the browser.
 */
export async function downloadAndInstallUpdateAsync({ release, onProgress = null }) {
  if (!release || !release.downloadUrl) {
    throw new Error('No release download URL available');
  }

  // Safety rule: Simulation mode must NEVER attempt to download or install a fake APK
  if (DEV_SIMULATE_UPDATE) {
    const linker = customDeps.Linking || nativeLinking;
    if (linker?.openURL) {
      await linker.openURL(GITHUB_RELEASES_PAGE_URL);
      return { success: true, method: 'dev-simulation-browser', url: GITHUB_RELEASES_PAGE_URL };
    }
    return { success: true, method: 'dev-simulation' };
  }

  const overlay = customDeps.nativeOverlay || nativeOverlay;

  // 1. Direct native download, SHA-256 verification, and PackageInstaller invocation
  if (overlay?.downloadAndVerifyApkNativeAsync) {
    let progressSub = null;
    if (onProgress && overlay.addUpdateProgressListener) {
      progressSub = overlay.addUpdateProgressListener((event) => {
        try {
          onProgress(event);
        } catch (_) {}
      });
    }

    try {
      let expectedSha256 = release.sha256 || null;

      // If SHA-256 is missing from metadata, attempt to fetch companion .sha256 file
      if (!expectedSha256 && release.downloadUrl && !release.downloadUrl.endsWith('.sha256')) {
        try {
          const fetchImpl = customDeps.fetch || fetch;
          const shaUrl = `${release.downloadUrl}.sha256`;
          const shaRes = await fetchImpl(shaUrl, { headers: { Accept: 'text/plain' } });
          if (shaRes.ok) {
            const text = await shaRes.text();
            const match = text.match(/([a-f0-9]{64})/i);
            if (match) {
              expectedSha256 = match[1];
            }
          }
        } catch (_) {}
      }

      const fileName = release.apkFileName || `DotyNotes-v${release.version}.apk`;
      const result = await overlay.downloadAndVerifyApkNativeAsync({
        downloadUrl: release.downloadUrl,
        fileName,
        expectedSha256: expectedSha256 || '',
        expectedPackageId: 'com.dotynotes.app',
        minVersionCode: release.versionCode || 0,
      });

      return result;
    } finally {
      if (progressSub && typeof progressSub.remove === 'function') {
        progressSub.remove();
      }
    }
  }

  // 2. Browser fallback with clear explanation
  const fallbackRes = await openApkDownloadAsync(
    release.downloadUrl,
    release.releaseNotesUrl || GITHUB_RELEASES_PAGE_URL,
    release.apkFileName
  );
  return {
    ...fallbackRes,
    fallbackToBrowser: true,
  };
}

/**
 * Launches the Android PackageInstaller for a downloaded and verified APK.
 */
export async function installVerifiedApkAsync(apkPath) {
  const overlay = customDeps.nativeOverlay || nativeOverlay;
  if (overlay?.installVerifiedApkNativeAsync) {
    return await overlay.installVerifiedApkNativeAsync(apkPath);
  }
  return { success: false, error: 'Native installer module unavailable' };
}

/**
 * Checks whether the app can request package installations.
 */
export async function canRequestPackageInstallsAsync() {
  const overlay = customDeps.nativeOverlay || nativeOverlay;
  if (overlay?.canRequestPackageInstallsAsync) {
    return await overlay.canRequestPackageInstallsAsync();
  }
  return true;
}

/**
 * Opens Android system settings for Unknown App Sources.
 */
export async function openUnknownAppSourcesSettingsAsync() {
  const overlay = customDeps.nativeOverlay || nativeOverlay;
  if (overlay?.openUnknownAppSourcesSettingsAsync) {
    return await overlay.openUnknownAppSourcesSettingsAsync();
  }
  return false;
}

/**
 * Cancels active in-flight update download.
 */
export function cancelUpdateDownloadAsync() {
  const overlay = customDeps.nativeOverlay || nativeOverlay;
  if (overlay?.cancelApkDownloadNative) {
    return overlay.cancelApkDownloadNative();
  }
  return false;
}

export default {
  UPDATE_MANIFEST_URL,
  UPDATE_MANIFEST_WEBSITE_URL,
  GITHUB_RELEASES_API_URL,
  GITHUB_RELEASES_PAGE_URL,
  UPDATE_CACHE_DURATION_MS,
  getInstalledAppVersion,
  getInstalledVersionCode,
  parseSemver,
  compareSemver,
  isReleaseNewer,
  fetchManifestFromUrlAsync,
  fetchGitHubLatestReleaseAsync,
  fetchLatestReleaseInfoAsync,
  getCachedUpdateInfoAsync,
  saveCachedUpdateInfoAsync,
  getDismissedUpdateVersionAsync,
  dismissUpdateVersionAsync,
  clearDismissedUpdateVersionAsync,
  checkForUpdatesAsync,
  openApkDownloadAsync,
  downloadAndInstallUpdateAsync,
  installVerifiedApkAsync,
  canRequestPackageInstallsAsync,
  openUnknownAppSourcesSettingsAsync,
  cancelUpdateDownloadAsync,
  setUpdateServiceDependencies,
  resetUpdateServiceDependencies,
};
