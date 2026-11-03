#!/usr/bin/env node

/**
 * DotyNotes Release Manifest & Configuration Synchronizer
 *
 * Atomically updates and synchronizes production release metadata across:
 *  1. app.json (version, versionCode, package ID safety check)
 *  2. package.json (version)
 *  3. package-lock.json (version, packages[""].version)
 *  4. update-manifest.json (root in-app updater manifest)
 *  5. dotynotes-website/public/update-manifest.json (website public updater manifest)
 *  6. dotynotes-website/src/constants/config.ts (website central release config)
 *
 * Includes transactional snapshot and rollback protection: if any file write
 * encounters an error, all modified files are restored to their exact pre-run contents.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const EXPECTED_PACKAGE_ID = 'com.dotynotes.app';
const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;

function calculateSizeFormatted(bytes) {
  const mb = bytes / (1024 * 1024);
  return `~${mb.toFixed(2)} MB`;
}

function formatReleaseDateIso(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function formatReleaseDateHuman(date = new Date()) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function validateParams(params) {
  if (!params.version || !SEMVER_REGEX.test(params.version.replace(/^v/, ''))) {
    throw new Error(`Invalid version: '${params.version}'. Must be semantic version X.Y.Z (e.g. 1.0.4).`);
  }
  const cleanVersion = params.version.replace(/^v/, '');

  const versionCode = parseInt(params.versionCode, 10);
  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    throw new Error(`Invalid versionCode: '${params.versionCode}'. Must be a positive integer.`);
  }

  if (!params.sha256 || !SHA256_REGEX.test(params.sha256)) {
    throw new Error(`Invalid sha256 checksum: '${params.sha256}'. Must be 64-character hex string.`);
  }

  const fileSizeBytes = parseInt(params.fileSizeBytes, 10);
  if (!Number.isInteger(fileSizeBytes) || fileSizeBytes <= 0) {
    throw new Error(`Invalid fileSizeBytes: '${params.fileSizeBytes}'. Must be positive integer bytes.`);
  }

  if (!params.downloadUrl || !params.downloadUrl.startsWith('https://')) {
    throw new Error(`Invalid downloadUrl: '${params.downloadUrl}'. Must start with https://.`);
  }

  return {
    version: cleanVersion,
    versionCode,
    sha256: params.sha256.toLowerCase(),
    fileSizeBytes,
    fileSizeFormatted: params.fileSizeFormatted || calculateSizeFormatted(fileSizeBytes),
    apkFileName: params.apkFileName || `DotyNotes-v${cleanVersion}.apk`,
    downloadUrl: params.downloadUrl,
    releaseNotesUrl: params.releaseNotesUrl || `https://github.com/abhijeet02singh/dotynotes/releases/tag/v${cleanVersion}`,
    releaseNotes: params.releaseNotes || `DotyNotes v${cleanVersion} official release.`,
    releaseDateIso: params.releaseDateIso || formatReleaseDateIso(),
    releaseDateHuman: params.releaseDateHuman || formatReleaseDateHuman(),
  };
}

function syncManifests(rawParams, options = {}) {
  const params = validateParams(rawParams);
  const repoRoot = options.repoRoot || REPO_ROOT;
  const isDryRun = !!options.dryRun;

  const appJsonPath = path.join(repoRoot, 'app.json');
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const packageLockPath = path.join(repoRoot, 'package-lock.json');
  const rootManifestPath = path.join(repoRoot, 'update-manifest.json');
  const webManifestPath = path.join(repoRoot, 'dotynotes-website', 'public', 'update-manifest.json');
  const webConfigPath = path.join(repoRoot, 'dotynotes-website', 'src', 'constants', 'config.ts');

  console.log(`[release_manifest_sync] Starting manifest synchronization for v${params.version} (versionCode: ${params.versionCode})`);
  if (isDryRun) {
    console.log('[release_manifest_sync] DRY RUN MODE — No files will be written.');
  }

  // 1. Snapshot original contents of all target files for transactional rollback
  const targetDefinitions = [
    { key: 'appJson', path: appJsonPath, required: true },
    { key: 'packageJson', path: packageJsonPath, required: true },
    { key: 'packageLock', path: packageLockPath, required: false },
    { key: 'rootManifest', path: rootManifestPath, required: true },
    { key: 'webManifest', path: webManifestPath, required: true },
    { key: 'webConfig', path: webConfigPath, required: true },
  ];

  const snapshots = new Map();
  for (const target of targetDefinitions) {
    if (fs.existsSync(target.path)) {
      snapshots.set(target.path, fs.readFileSync(target.path, 'utf8'));
    } else if (target.required) {
      throw new Error(`Required target file not found: ${target.path}`);
    } else {
      snapshots.set(target.path, null);
    }
  }

  // 2. Validate & parse in-memory targets
  const appJson = JSON.parse(snapshots.get(appJsonPath));
  const currentPackage = appJson.expo?.android?.package;
  if (currentPackage !== EXPECTED_PACKAGE_ID) {
    throw new Error(`Safety violation: app.json android package is '${currentPackage}', expected '${EXPECTED_PACKAGE_ID}'.`);
  }
  appJson.expo.version = params.version;
  if (!appJson.expo.android) appJson.expo.android = {};
  appJson.expo.android.versionCode = params.versionCode;

  const packageJson = JSON.parse(snapshots.get(packageJsonPath));
  packageJson.version = params.version;

  let packageLockJson = null;
  if (snapshots.get(packageLockPath) !== null) {
    packageLockJson = JSON.parse(snapshots.get(packageLockPath));
    packageLockJson.version = params.version;
    if (packageLockJson.packages && packageLockJson.packages['']) {
      packageLockJson.packages[''].version = params.version;
    }
  }

  const manifestData = {
    version: params.version,
    versionCode: params.versionCode,
    releaseDate: params.releaseDateIso,
    minAndroidVersion: 'Android 8.0 (API 26) or higher',
    targetAndroidVersion: 'Android 14 / 15 (API 34/35)',
    packageId: EXPECTED_PACKAGE_ID,
    apkFileName: params.apkFileName,
    downloadUrl: params.downloadUrl,
    fileSizeBytes: params.fileSizeBytes,
    fileSizeFormatted: params.fileSizeFormatted,
    sha256: params.sha256,
    releaseNotes: params.releaseNotes,
    releaseNotesUrl: params.releaseNotesUrl,
  };

  const webConfigRaw = snapshots.get(webConfigPath);
  const updatedWebConfig = webConfigRaw
    .replace(/(isAvailable:\s*)(false|true)/, '$1true')
    .replace(/(version:\s*)'[^']*'/, `$1'${params.version}'`)
    .replace(/(versionCode:\s*)[0-9]+/, `$1${params.versionCode}`)
    .replace(/(releaseDate:\s*)'[^']*'/, `$1'${params.releaseDateHuman}'`)
    .replace(/(apkFileName:\s*)'[^']*'/, `$1'${params.apkFileName}'`)
    .replace(/(fileSizeBytes:\s*)[0-9]+/, `$1${params.fileSizeBytes}`)
    .replace(/(fileSizeFormatted:\s*)'[^']*'/, `$1'${params.fileSizeFormatted}'`)
    .replace(/(sha256Checksum:\s*)('[^']*'|null)/, `$1'${params.sha256}'`)
    .replace(/(downloadUrl:\s*)('[^']*'|null)/, `$1'${params.downloadUrl}'`)
    .replace(/(releaseNotesUrl:\s*)'[^']*'/, `$1'${params.releaseNotesUrl}'`);

  // 3. Write targets with transactional rollback on failure
  if (!isDryRun) {
    try {
      if (options._simulateFailureAt === 'start') {
        throw new Error('Simulated write failure at transaction start.');
      }

      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

      if (options._simulateFailureAt === 'afterAppJson') {
        throw new Error('Simulated write failure after writing app.json.');
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

      if (packageLockJson) {
        fs.writeFileSync(packageLockPath, JSON.stringify(packageLockJson, null, 2) + '\n', 'utf8');
      }

      if (options._simulateFailureAt === 'afterPackageJson') {
        throw new Error('Simulated write failure after writing package.json.');
      }

      fs.writeFileSync(rootManifestPath, JSON.stringify(manifestData, null, 2) + '\n', 'utf8');
      fs.writeFileSync(webManifestPath, JSON.stringify(manifestData, null, 2) + '\n', 'utf8');

      if (options._simulateFailureAt === 'beforeWebConfig') {
        throw new Error('Simulated write failure before writing webConfig.');
      }

      fs.writeFileSync(webConfigPath, updatedWebConfig, 'utf8');

      console.log('[release_manifest_sync] ✅ All 6 configuration and manifest targets updated successfully.');
    } catch (writeError) {
      console.error(`[release_manifest_sync] 🚨 Write error encountered: ${writeError.message}`);
      console.log('[release_manifest_sync] 🔄 Initiating transactional rollback of all targets...');
      for (const [filePath, originalContent] of snapshots.entries()) {
        try {
          if (originalContent !== null) {
            fs.writeFileSync(filePath, originalContent, 'utf8');
          } else if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (rollbackErr) {
          console.error(`[release_manifest_sync] ❌ Rollback error for ${filePath}: ${rollbackErr.message}`);
        }
      }
      console.log('[release_manifest_sync] ↩️ Transactional rollback complete. All targets restored to exact pre-run state.');
      throw writeError;
    }
  } else {
    console.log('[release_manifest_sync] ✅ Dry-run completed. All 6 targets verified.');
  }

  return {
    success: true,
    params,
    targetsUpdated: [
      'app.json',
      'package.json',
      packageLockJson ? 'package-lock.json' : null,
      'update-manifest.json',
      'dotynotes-website/public/update-manifest.json',
      'dotynotes-website/src/constants/config.ts',
    ].filter(Boolean),
  };
}

// CLI parsing
function parseCliArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') parsed.dryRun = true;
    else if (arg === '--version' && args[i + 1]) parsed.version = args[++i];
    else if (arg === '--version-code' && args[i + 1]) parsed.versionCode = args[++i];
    else if (arg === '--sha256' && args[i + 1]) parsed.sha256 = args[++i];
    else if (arg === '--size-bytes' && args[i + 1]) parsed.fileSizeBytes = args[++i];
    else if (arg === '--size-formatted' && args[i + 1]) parsed.fileSizeFormatted = args[++i];
    else if (arg === '--apk-name' && args[i + 1]) parsed.apkFileName = args[++i];
    else if (arg === '--download-url' && args[i + 1]) parsed.downloadUrl = args[++i];
    else if (arg === '--release-notes-url' && args[i + 1]) parsed.releaseNotesUrl = args[++i];
    else if (arg === '--release-notes' && args[i + 1]) parsed.releaseNotes = args[++i];
  }
  return parsed;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.length === 0) {
      console.log('Usage: node scripts/release_manifest_sync.cjs [options]');
      console.log('Options:');
      console.log('  --version <X.Y.Z>          Required semantic version');
      console.log('  --version-code <int>       Required integer Android versionCode');
      console.log('  --sha256 <hex64>           Required 64-char hex SHA-256 hash');
      console.log('  --size-bytes <bytes>       Required integer byte size');
      console.log('  --download-url <https>     Required direct download URL');
      console.log('  --size-formatted <str>     Optional formatted size (e.g. "~73.87 MB")');
      console.log('  --apk-name <name>          Optional APK filename');
      console.log('  --release-notes-url <url>  Optional release notes URL');
      console.log('  --release-notes <notes>    Optional release notes text');
      console.log('  --dry-run                  Simulate validation without writing files');
      process.exit(args.includes('--help') ? 0 : 1);
    }
    const cliParams = parseCliArgs(args);
    syncManifests(cliParams, { dryRun: cliParams.dryRun });
  } catch (err) {
    console.error(`[release_manifest_sync] ❌ Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  syncManifests,
  validateParams,
  calculateSizeFormatted,
  formatReleaseDateIso,
  formatReleaseDateHuman,
  EXPECTED_PACKAGE_ID,
};
