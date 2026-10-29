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

const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+$/;

function readAppJson() {
  const content = fs.readFileSync(APP_JSON_PATH, 'utf-8');
  return JSON.parse(content);
}

function readPackageJson() {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
  return JSON.parse(content);
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

  const appVersion = appJson.expo?.version || null;
  const versionCode = appJson.expo?.android?.versionCode !== undefined ? appJson.expo.android.versionCode : null;
  const pkgVersion = pkgJson.version || null;

  console.log('--- DotyNotes Version Status ---');
  console.log(`app.json version     : ${appVersion}`);
  console.log(`app.json versionCode : ${versionCode}`);
  console.log(`package.json version : ${pkgVersion}`);
  console.log(`website config ver   : ${webConfig.version}`);
  console.log(`website versionCode  : ${webConfig.versionCode}`);

  const isConsistent =
    appVersion === pkgVersion &&
    appVersion === webConfig.version &&
    versionCode === webConfig.versionCode &&
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
      console.log('Usage: node scripts/version_manager.cjs <status|bump|set>');
      console.log('  status                 - check consistency of all version declarations');
      console.log('  bump <patch|minor|major|X.Y.Z> - increment version and versionCode');
      console.log('  set <X.Y.Z> [code]     - set exact version and optional versionCode');
      break;
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
