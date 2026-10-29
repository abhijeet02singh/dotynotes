#!/usr/bin/env node

/**
 * DotyNotes Version Manager
 *
 * Centralized script to manage and synchronize semantic versioning
 * and Android versionCode across:
 *  - app.json (expo.version and expo.android.versionCode)
 *  - package.json (version)
 *  - package-lock.json (version and packages[""].version)
 *  - dotynotes-website/src/constants/config.ts (APP_CONFIG.release.version, versionCode, apkFileName)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const APP_JSON_PATH = path.join(REPO_ROOT, 'app.json');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const PACKAGE_LOCK_PATH = path.join(REPO_ROOT, 'package-lock.json');
const WEBSITE_CONFIG_PATH = path.join(REPO_ROOT, 'dotynotes-website', 'src', 'constants', 'config.ts');
const ROOT_MANIFEST_PATH = path.join(REPO_ROOT, 'update-manifest.json');
const WEBSITE_MANIFEST_PATH = path.join(REPO_ROOT, 'dotynotes-website', 'public', 'update-manifest.json');

const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+$/;

function readAppJson() {
  const content = fs.readFileSync(APP_JSON_PATH, 'utf-8');
  return JSON.parse(content);
}

function readPackageJson() {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
  return JSON.parse(content);
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (_) {
    return null;
  }
}

function readWebsiteConfig() {
  const content = fs.readFileSync(WEBSITE_CONFIG_PATH, 'utf-8');
  const versionMatch = content.match(/version:\s*'([0-9]+\.[0-9]+\.[0-9]+)'/);
  const versionCodeMatch = content.match(/versionCode:\s*([0-9]+)/);
  return {
    raw: content,
    version: versionMatch ? versionMatch[1] : null,
    versionCode: versionCodeMatch ? parseInt(versionCodeMatch[1], 10) : null,
  };
}

function parseSemver(versionStr) {
  const clean = versionStr.replace(/^v/, '');
  if (!SEMVER_REGEX.test(clean)) {
    throw new Error(`Invalid semver: '${versionStr}'. Must follow MAJOR.MINOR.PATCH (e.g. 1.0.0).`);
  }
  const [major, minor, patch] = clean.split('.').map(n => parseInt(n, 10));
  return { major, minor, patch, formatted: clean };
}

function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  return p1.patch - p2.patch;
}

function getStatus() {
  const appJson = readAppJson();
  const pkgJson = readPackageJson();
  const webConfig = readWebsiteConfig();
  const rootManifest = readManifest(ROOT_MANIFEST_PATH);
  const webManifest = readManifest(WEBSITE_MANIFEST_PATH);

  const appVersion = appJson.expo?.version || null;
  const versionCode = appJson.expo?.android?.versionCode !== undefined ? appJson.expo.android.versionCode : null;
  const pkgVersion = pkgJson.version || null;
  const manifestVersion = rootManifest?.version || null;
  const manifestCode = rootManifest?.versionCode || null;

  console.log('--- DotyNotes Version Status ---');
  console.log(`app.json version     : ${appVersion}`);
  console.log(`app.json versionCode : ${versionCode}`);
  console.log(`package.json version : ${pkgVersion}`);
  console.log(`website config ver   : ${webConfig.version}`);
  console.log(`website versionCode  : ${webConfig.versionCode}`);
  console.log(`manifest version     : ${manifestVersion}`);
  console.log(`manifest versionCode : ${manifestCode}`);

  const isConsistent =
    appVersion === pkgVersion &&
    appVersion === webConfig.version &&
    appVersion === manifestVersion &&
    versionCode === webConfig.versionCode &&
    versionCode === manifestCode &&
    Number.isInteger(versionCode) &&
    versionCode > 0;

  console.log(`Consistent           : ${isConsistent ? 'YES (PASS)' : 'NO (MISMATCH DETECTED)'}`);
  if (!isConsistent) {
    process.exitCode = 1;
  }
  return { appVersion, versionCode, pkgVersion, webConfig, isConsistent };
}

function applyVersions(newVersion, newVersionCode) {
  parseSemver(newVersion);
  if (!Number.isInteger(newVersionCode) || newVersionCode <= 0) {
    throw new Error(`Invalid versionCode: ${newVersionCode}. Must be a positive integer.`);
  }

  // 1. Update app.json
  const appJson = readAppJson();
  appJson.expo.version = newVersion;
  if (!appJson.expo.android) appJson.expo.android = {};
  appJson.expo.android.versionCode = newVersionCode;
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n', 'utf-8');
  console.log(`✓ Updated app.json: version = ${newVersion}, versionCode = ${newVersionCode}`);

  // 2. Update package.json
  const pkgJson = readPackageJson();
  pkgJson.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkgJson, null, 2) + '\n', 'utf-8');
  console.log(`✓ Updated package.json: version = ${newVersion}`);

  // 3. Update package-lock.json if exists
  if (fs.existsSync(PACKAGE_LOCK_PATH)) {
    const lockJson = JSON.parse(fs.readFileSync(PACKAGE_LOCK_PATH, 'utf-8'));
    lockJson.version = newVersion;
    if (lockJson.packages && lockJson.packages['']) {
      lockJson.packages[''].version = newVersion;
    }
    fs.writeFileSync(PACKAGE_LOCK_PATH, JSON.stringify(lockJson, null, 2) + '\n', 'utf-8');
    console.log(`✓ Updated package-lock.json: version = ${newVersion}`);
  }

  // 4. Update dotynotes-website/src/constants/config.ts
  const webConfig = readWebsiteConfig();
  let updatedConfig = webConfig.raw
    .replace(/version:\s*'([0-9]+\.[0-9]+\.[0-9]+)'/, `version: '${newVersion}'`)
    .replace(/versionCode:\s*([0-9]+)/, `versionCode: ${newVersionCode}`)
    .replace(/apkFileName:\s*'DotyNotes-v([0-9]+\.[0-9]+\.[0-9]+)\.apk'/, `apkFileName: 'DotyNotes-v${newVersion}.apk'`);

  fs.writeFileSync(WEBSITE_CONFIG_PATH, updatedConfig, 'utf-8');
  console.log(`✓ Updated dotynotes-website config: version = ${newVersion}, versionCode = ${newVersionCode}`);

  // 5. Update update-manifest.json files (both root and website public)
  const manifestData = {
    version: newVersion,
    versionCode: newVersionCode,
    releaseDate: new Date().toISOString().split('T')[0],
    minAndroidVersion: 'Android 8.0 (API 26) or higher',
    targetAndroidVersion: 'Android 14 / 15 (API 34/35)',
    packageId: 'com.dotynotes.app',
    apkFileName: `DotyNotes-v${newVersion}.apk`,
    downloadUrl: `https://github.com/abhijeet02singh/dotynotes/releases/download/v${newVersion}/DotyNotes-v${newVersion}.apk`,
    fileSizeBytes: 77385920,
    fileSizeFormatted: '~73.8 MB',
    sha256: null,
    releaseNotes: `DotyNotes v${newVersion} official release with colorful pastel sticky notes, rich-text formatting, local reminders, and the signature native Android Floating Dot Quick Pad companion.`,
    releaseNotesUrl: `https://github.com/abhijeet02singh/dotynotes/releases/tag/v${newVersion}`,
  };

  fs.writeFileSync(ROOT_MANIFEST_PATH, JSON.stringify(manifestData, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(WEBSITE_MANIFEST_PATH, JSON.stringify(manifestData, null, 2) + '\n', 'utf-8');
  console.log(`✓ Updated update-manifest.json files: version = ${newVersion}, versionCode = ${newVersionCode}`);
}

function bumpVersion(bumpType) {
  const { appVersion, versionCode } = getStatus();
  if (!appVersion || !versionCode) {
    throw new Error('Cannot bump: could not read current version or versionCode.');
  }

  const parsed = parseSemver(appVersion);
  let nextMajor = parsed.major;
  let nextMinor = parsed.minor;
  let nextPatch = parsed.patch;

  if (bumpType === 'patch') {
    nextPatch += 1;
  } else if (bumpType === 'minor') {
    nextMinor += 1;
    nextPatch = 0;
  } else if (bumpType === 'major') {
    nextMajor += 1;
    nextMinor = 0;
    nextPatch = 0;
  } else if (SEMVER_REGEX.test(bumpType.replace(/^v/, ''))) {
    const custom = parseSemver(bumpType);
    if (compareSemver(custom.formatted, appVersion) <= 0) {
      throw new Error(`Custom version '${custom.formatted}' must be strictly greater than current version '${appVersion}'.`);
    }
    nextMajor = custom.major;
    nextMinor = custom.minor;
    nextPatch = custom.patch;
  } else {
    throw new Error(`Unknown bump type: '${bumpType}'. Must be 'patch', 'minor', 'major', or an explicit 'X.Y.Z'.`);
  }

  const newVersion = `${nextMajor}.${nextMinor}.${nextPatch}`;
  const newVersionCode = versionCode + 1;

  console.log(`\nBumping version: ${appVersion} -> ${newVersion}`);
  console.log(`Bumping versionCode: ${versionCode} -> ${newVersionCode}\n`);

  applyVersions(newVersion, newVersionCode);
  console.log('\nVersion bump completed successfully.');
}

function release(bumpType = 'patch', options = {}) {
  const isDryRun = options.dryRun || false;
  console.log('\n========================================');
  console.log(`DotyNotes Safe Release Automation (${bumpType.toUpperCase()})`);
  if (isDryRun) {
    console.log('   [DRY RUN MODE - No files or git state will be modified]');
  }
  console.log('========================================\n');

  // Step 1: Verify working tree is clean
  console.log('👉 [Step 1/8] Checking git working tree...');
  let gitStatus;
  try {
    gitStatus = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch (err) {
    throw new Error(`Git status check failed: ${err.message}`);
  }

  if (gitStatus.length > 0) {
    console.error('\n❌ Release Aborted: Git working tree is dirty.');
    console.error('Uncommitted changes detected in repository:');
    console.error(gitStatus);
    console.error('\nPlease commit, stash, or review your changes before running release.\n');
    process.exit(1);
  }
  console.log('   ✅ Working tree is clean (no uncommitted or untracked changes).');

  // Step 2: Check current branch
  console.log('\n👉 [Step 2/8] Checking current git branch...');
  let currentBranch;
  try {
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch (err) {
    throw new Error(`Git branch check failed: ${err.message}`);
  }

  if (currentBranch !== 'master') {
    console.error(`\n❌ Release Aborted: Releases must be initiated from 'master' branch (current: '${currentBranch}').\n`);
    process.exit(1);
  }
  console.log(`   ✅ On branch '${currentBranch}'.`);

  // Step 3: Check version consistency across project declarations
  console.log('\n👉 [Step 3/8] Validating version consistency...');
  const { appVersion, versionCode, isConsistent } = getStatus();
  if (!isConsistent || !appVersion || !versionCode) {
    console.error('\n❌ Release Aborted: Project version declarations are inconsistent.');
    console.error('Run `npm run version:check` to inspect mismatches.\n');
    process.exit(1);
  }
  console.log(`   ✅ Current versions consistent: ${appVersion} (versionCode: ${versionCode}).`);

  // Calculate next version
  const parsed = parseSemver(appVersion);
  let nextMajor = parsed.major;
  let nextMinor = parsed.minor;
  let nextPatch = parsed.patch;

  if (bumpType === 'patch') {
    nextPatch += 1;
  } else if (bumpType === 'minor') {
    nextMinor += 1;
    nextPatch = 0;
  } else if (bumpType === 'major') {
    nextMajor += 1;
    nextMinor = 0;
    nextPatch = 0;
  } else if (SEMVER_REGEX.test(bumpType.replace(/^v/, ''))) {
    const custom = parseSemver(bumpType);
    if (compareSemver(custom.formatted, appVersion) <= 0) {
      throw new Error(`Custom version '${custom.formatted}' must be strictly greater than current version '${appVersion}'.`);
    }
    nextMajor = custom.major;
    nextMinor = custom.minor;
    nextPatch = custom.patch;
  } else {
    throw new Error(`Unknown bump type: '${bumpType}'. Must be 'patch', 'minor', 'major', or an explicit 'X.Y.Z'.`);
  }

  const nextVersion = `${nextMajor}.${nextMinor}.${nextPatch}`;
  const nextVersionCode = versionCode + 1;
  const targetTag = `v${nextVersion}`;

  console.log(`\n🎯 Target Release: ${appVersion} -> ${nextVersion} (versionCode: ${versionCode} -> ${nextVersionCode}, Tag: ${targetTag})`);

  // Step 4: Verify target tag does not already exist
  console.log('\n👉 [Step 4/8] Checking for tag collisions...');
  let localTags;
  try {
    localTags = execSync(`git tag -l "${targetTag}"`, { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch (err) {
    localTags = '';
  }
  if (localTags === targetTag) {
    console.error(`\n❌ Release Aborted: Local git tag '${targetTag}' already exists.\n`);
    process.exit(1);
  }

  try {
    const remoteTagCheck = execSync(`git ls-remote --tags origin "refs/tags/${targetTag}"`, { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
    if (remoteTagCheck.length > 0) {
      console.error(`\n❌ Release Aborted: Remote git tag '${targetTag}' already exists on origin.\n`);
      process.exit(1);
    }
  } catch (err) {
    console.warn(`   ⚠️ Warning: Could not query remote tags: ${err.message}`);
  }
  console.log(`   ✅ Tag '${targetTag}' is available.`);

  // Step 5: Run quality gate tests
  console.log('\n👉 [Step 5/8] Running pre-release quality gate (automated regression tests & lint)...');
  try {
    console.log('   Running npm test (6 test suites)...');
    execSync('npm test', { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log('   Running npm run lint...');
    execSync('npm run lint', { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log('   Running website tests...');
    execSync('npm --prefix dotynotes-website run test', { cwd: REPO_ROOT, stdio: 'inherit' });
  } catch (err) {
    console.error('\n❌ Release Aborted: Pre-release quality gate failed. Fix errors before releasing.\n');
    process.exit(1);
  }
  console.log('   ✅ All quality gate tests passed.');

  if (isDryRun) {
    console.log('\n✨ [DRY RUN COMPLETE] Pre-release checks passed successfully.');
    console.log(`Would bump to: ${nextVersion} (versionCode: ${nextVersionCode})`);
    console.log(`Would commit and push tag: ${targetTag}\n`);
    return;
  }

  // Step 6: Atomic version bump
  console.log('\n👉 [Step 6/8] Applying atomic version bump...');
  applyVersions(nextVersion, nextVersionCode);

  // Step 7: Commit version bump
  console.log('\n👉 [Step 7/8] Creating git release commit and tag...');
  const filesToStage = [
    'app.json',
    'package.json',
    'package-lock.json',
    path.join('dotynotes-website', 'src', 'constants', 'config.ts'),
    'update-manifest.json',
    path.join('dotynotes-website', 'public', 'update-manifest.json'),
  ];
  execSync(`git add ${filesToStage.map(f => `"${f}"`).join(' ')}`, { cwd: REPO_ROOT, stdio: 'inherit' });
  execSync(`git commit -m "chore(release): bump version to v${nextVersion}"`, { cwd: REPO_ROOT, stdio: 'inherit' });
  execSync(`git tag -a "${targetTag}" -m "Release ${targetTag}"`, { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log(`   ✅ Created commit and annotated tag '${targetTag}'.`);

  // Step 8: Push commit and tag to GitHub
  console.log('\n👉 [Step 8/8] Pushing release commit and tag to origin...');
  execSync('git push origin master', { cwd: REPO_ROOT, stdio: 'inherit' });
  execSync(`git push origin "${targetTag}"`, { cwd: REPO_ROOT, stdio: 'inherit' });

  console.log('\n========================================');
  console.log('🎉 RELEASE TRIGGERED SUCCESSFULLY!');
  console.log(`   Version: ${nextVersion} (versionCode: ${nextVersionCode})`);
  console.log(`   Tag: ${targetTag}`);
  console.log('   GitHub Actions is now running the Android Release workflow.');
  console.log('   Track build at: https://github.com/abhijeet02singh/dotynotes/actions');
  console.log('========================================\n');
}

// CLI handler
const args = process.argv.slice(2);
const command = args[0] || 'status';

try {
  switch (command) {
    case 'status':
    case 'check':
      getStatus();
      break;

    case 'bump': {
      const type = args[1] || 'patch';
      bumpVersion(type);
      break;
    }

    case 'release': {
      const type = args[1] || 'patch';
      const isDryRun = args.includes('--dry-run');
      release(type, { dryRun: isDryRun });
      break;
    }

    case 'set': {
      const targetVersion = args[1];
      const targetCode = args[2] ? parseInt(args[2], 10) : undefined;
      if (!targetVersion) {
        console.error('Usage: node scripts/version_manager.cjs set <version> [versionCode]');
        process.exit(1);
      }
      const current = readAppJson();
      const currentCode = current.expo?.android?.versionCode || 1;
      applyVersions(targetVersion, targetCode !== undefined ? targetCode : currentCode);
      break;
    }

    default:
      console.log('Usage: node scripts/version_manager.cjs <status|bump|release|set>');
      console.log('  status                         - check consistency of all version declarations');
      console.log('  bump <patch|minor|major|X.Y.Z> - increment version and versionCode locally');
      console.log('  release <patch|minor|major>    - validate, bump, commit, tag and push release');
      console.log('  set <X.Y.Z> [code]             - set exact version and optional versionCode');
      break;
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
