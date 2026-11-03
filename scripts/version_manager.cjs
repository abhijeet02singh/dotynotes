#!/usr/bin/env node

/**
 * DotyNotes Version & Release Manager
 *
 * Centralized script to manage semantic versioning, monotonic Android versionCode,
 * pre-release quality checks, and local release orchestration for:
 *  - app.json (expo.version and expo.android.versionCode)
 *  - package.json (version)
 *  - package-lock.json (version and packages[""].version)
 *  - dotynotes-website/src/constants/config.ts (APP_CONFIG.release)
 *  - update-manifest.json & dotynotes-website/public/update-manifest.json
 *
 * Provides:
 *  - npm run release -- <version|patch|minor|major>
 *  - npm run release:dry-run -- <version|patch|minor|major>
 *  - npm run version:check
 *  - npm run version:bump
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

const REPO_OWNER = 'abhijeet02singh';
const REPO_NAME = 'dotynotes';
const WORKFLOW_NAME = 'production-release.yml';

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
  if (!versionStr || typeof versionStr !== 'string') {
    throw new Error(`Invalid version: '${versionStr}'. Version must be a non-empty string.`);
  }
  const clean = versionStr.replace(/^v/, '');
  if (!SEMVER_REGEX.test(clean)) {
    throw new Error(`Invalid semver: '${versionStr}'. Must follow MAJOR.MINOR.PATCH format (e.g. 1.0.4).`);
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

function calculateNextVersionAndCode(currentVersion, currentCode, targetInput = 'patch') {
  const parsed = parseSemver(currentVersion);
  let nextMajor = parsed.major;
  let nextMinor = parsed.minor;
  let nextPatch = parsed.patch;

  const normalized = (targetInput || 'patch').trim().toLowerCase();

  if (normalized === 'patch') {
    nextPatch += 1;
  } else if (normalized === 'minor') {
    nextMinor += 1;
    nextPatch = 0;
  } else if (normalized === 'major') {
    nextMajor += 1;
    nextMinor = 0;
    nextPatch = 0;
  } else if (SEMVER_REGEX.test(normalized.replace(/^v/, ''))) {
    const custom = parseSemver(normalized);
    if (compareSemver(custom.formatted, currentVersion) <= 0) {
      throw new Error(`Target version '${custom.formatted}' must be strictly greater than current version '${currentVersion}'.`);
    }
    nextMajor = custom.major;
    nextMinor = custom.minor;
    nextPatch = custom.patch;
  } else {
    throw new Error(`Invalid version or bump type: '${targetInput}'. Must be 'patch', 'minor', 'major', or an explicit SemVer 'X.Y.Z'.`);
  }

  const nextVersion = `${nextMajor}.${nextMinor}.${nextPatch}`;
  const nextCode = (parseInt(currentCode, 10) || 1) + 1;

  return {
    nextVersion,
    nextCode,
    targetTag: `v${nextVersion}`,
  };
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
    webConfig.versionCode === manifestCode &&
    (!webManifest || webManifest.versionCode === manifestCode) &&
    Number.isInteger(versionCode) &&
    Number.isInteger(manifestCode) &&
    versionCode >= manifestCode &&
    manifestCode > 0;

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
}

function bumpVersion(bumpType) {
  const { appVersion, versionCode } = getStatus();
  if (!appVersion || !versionCode) {
    throw new Error('Cannot bump: could not read current version or versionCode.');
  }

  const { nextVersion, nextCode } = calculateNextVersionAndCode(appVersion, versionCode, bumpType);

  console.log(`\nBumping version: ${appVersion} -> ${nextVersion}`);
  console.log(`Bumping versionCode: ${versionCode} -> ${nextCode}\n`);

  applyVersions(nextVersion, nextCode);
  console.log('\nVersion bump completed successfully.');
}

async function dispatchWorkflow(version, options = {}) {
  const workflowFile = WORKFLOW_NAME;
  const targetTag = `v${version}`;

  // 1. Try GitHub CLI (gh) if available
  let ghAvailable = false;
  try {
    execSync('gh --version', { stdio: 'ignore' });
    ghAvailable = true;
  } catch (_) {}

  if (ghAvailable) {
    console.log('👉 Triggering production release via GitHub CLI (gh)...');
    let ghCmd = `gh workflow run ${workflowFile} -f version="${version}"`;
    if (options.notes) {
      ghCmd += ` -f release_notes="${options.notes.replace(/"/g, '\\"')}"`;
    }
    if (options.prerelease) {
      ghCmd += ` -f prerelease=true`;
    }
    execSync(ghCmd, { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log('\n✅ Successfully triggered production-release.yml via GitHub CLI!');
    return { method: 'gh', success: true };
  }

  // 2. Try GitHub REST API if GITHUB_TOKEN or GH_TOKEN is present
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    console.log('👉 Triggering production release via GitHub Actions REST API...');
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${workflowFile}/dispatches`;
    const payload = {
      ref: 'master',
      inputs: {
        version,
        release_notes: options.notes || '',
        prerelease: options.prerelease || false,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'DotyNotes-Release-Manager',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 204) {
      console.log('\n✅ Successfully triggered production-release.yml via GitHub REST API (HTTP 204 No Content)!');
      return { method: 'api', success: true };
    } else {
      const errText = await res.text();
      throw new Error(`GitHub API returned HTTP ${res.status}: ${errText}`);
    }
  }

  // 3. Fallback: Print clean, one-click manual release URL and instructions
  console.log('\nℹ️ Neither GitHub CLI (`gh`) nor GITHUB_TOKEN environment variable was found.');
  console.log('To trigger the release workflow automatically, you can either:');
  console.log('  1. Set a GitHub token and run again:');
  console.log(`     $env:GITHUB_TOKEN="your_personal_access_token"; npm run release -- ${version}`);
  console.log('  2. Install GitHub CLI: winget install GitHub.cli && gh auth login');
  console.log('  3. Or trigger directly in 1 click from GitHub Actions Web UI:');
  console.log(`     👉 https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${workflowFile}`);
  console.log(`     Click "Run workflow", enter version: ${version}, and click "Run workflow".\n`);
  return { method: 'manual', success: false };
}

async function release(targetInput = 'patch', options = {}) {
  const isDryRun = options.dryRun || false;
  console.log('\n========================================================');
  console.log(`🚀 DotyNotes Production Release Orchestrator`);
  if (isDryRun) {
    console.log('   [DRY RUN SIMULATION MODE - No files or git state will be modified]');
  }
  console.log('========================================================\n');

  // Step 1: Check working tree
  console.log('👉 [1/6] Validating git working tree...');
  let gitStatus = '';
  try {
    gitStatus = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch (err) {
    throw new Error(`Git status check failed: ${err.message}`);
  }

  if (gitStatus.length > 0 && !options.allowDirty && !isDryRun) {
    console.error('\n❌ Release Aborted: Git working tree is dirty.');
    console.error('Uncommitted changes detected in repository:');
    console.error(gitStatus);
    console.error('\nPlease commit, stash, or review your changes before running release.\n');
    process.exit(1);
  } else if (gitStatus.length > 0) {
    console.log('   ⚠️ Notice: Working tree has uncommitted changes (permitted in dry-run mode).');
  } else {
    console.log('   ✅ Working tree is clean.');
  }

  // Step 2: Check current branch
  console.log('\n👉 [2/6] Validating git branch...');
  let currentBranch = 'master';
  try {
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch (err) {
    console.warn(`   ⚠️ Warning: Could not detect git branch: ${err.message}`);
  }

  if (currentBranch !== 'master' && !options.allowBranch && !isDryRun) {
    console.error(`\n❌ Release Aborted: Releases must be initiated from 'master' branch (current: '${currentBranch}').\n`);
    process.exit(1);
  } else if (currentBranch !== 'master') {
    console.log(`   ⚠️ Notice: Current branch is '${currentBranch}' (permitted in dry-run mode).`);
  } else {
    console.log(`   ✅ On branch '${currentBranch}'.`);
  }

  // Step 3: Validate version consistency and calculate next target
  console.log('\n👉 [3/6] Validating version consistency and calculating next release...');
  const { appVersion, versionCode, isConsistent } = getStatus();
  if (!isConsistent || !appVersion || !versionCode) {
    console.error('\n❌ Release Aborted: Project version declarations are inconsistent.');
    console.error('Run `npm run version:check` to inspect mismatches.\n');
    process.exit(1);
  }

  const { nextVersion, nextCode, targetTag } = calculateNextVersionAndCode(appVersion, versionCode, targetInput);
  console.log(`\n🎯 Target Release: v${appVersion} (code: ${versionCode}) -> v${nextVersion} (code: ${nextCode})`);
  console.log(`   Target Tag    : ${targetTag}`);

  // Step 4: Check for tag collision
  console.log('\n👉 [4/6] Checking for tag collisions...');
  let localTags = '';
  try {
    localTags = execSync(`git tag -l "${targetTag}"`, { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch (_) {}

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
    console.warn(`   ⚠️ Note: Could not query remote tags: ${err.message}`);
  }
  console.log(`   ✅ Tag '${targetTag}' is available.`);

  // Step 5: Run quality gate tests locally
  console.log('\n👉 [5/6] Running local quality gate (regression tests, linters, manifests)...');
  if (!options.skipTests) {
    try {
      console.log('   Running manifest sync unit tests...');
      execSync('node scripts/release_manifest_sync_test.cjs', { cwd: REPO_ROOT, stdio: 'inherit' });

      console.log('   Running automated regression tests...');
      execSync('npm test', { cwd: REPO_ROOT, stdio: 'inherit' });

      console.log('   Running website automated tests...');
      execSync('npm --prefix dotynotes-website run test', { cwd: REPO_ROOT, stdio: 'inherit' });
    } catch (err) {
      console.error('\n❌ Release Aborted: Quality gate failed. Fix errors before releasing.\n');
      process.exit(1);
    }
    console.log('   ✅ All local quality gate tests passed.');
  } else {
    console.log('   ℹ️ Local tests skipped via options.skipTests.');
  }

  // Step 6: Dispatch release workflow
  console.log('\n👉 [6/6] Dispatching production release workflow...');
  if (isDryRun) {
    console.log('\n========================================================');
    console.log('✨ [DRY RUN COMPLETE] Release simulation succeeded with 0 errors!');
    console.log(`   Current Version : ${appVersion} (versionCode: ${versionCode})`);
    console.log(`   Target Version  : ${nextVersion} (versionCode: ${nextCode})`);
    console.log(`   Target Tag      : ${targetTag}`);
    console.log(`   Workflow Target : .github/workflows/${WORKFLOW_NAME}`);
    console.log(`   Inputs          : { version: '${nextVersion}', release_notes: '${options.notes || ''}' }`);
    console.log('   All local checks, tests, and manifest dry-runs verified.');
    console.log('   No files or git state were modified.');
    console.log('========================================================\n');
    return {
      dryRun: true,
      currentVersion: appVersion,
      nextVersion,
      nextCode,
      targetTag,
    };
  }

  const result = await dispatchWorkflow(nextVersion, options);

  console.log('\n========================================================');
  console.log('🎉 PRODUCTION RELEASE INITIATED!');
  console.log(`   Target Version: ${nextVersion} (versionCode: ${nextCode})`);
  console.log(`   Release Tag   : ${targetTag}`);
  console.log(`   Track build at: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_NAME}`);
  console.log('========================================================\n');

  return {
    dryRun: false,
    currentVersion: appVersion,
    nextVersion,
    nextCode,
    targetTag,
    dispatchResult: result,
  };
}

function parseReleaseCliArgs(args) {
  let targetVersion = null;
  let isDryRun = false;
  let notes = '';
  let prerelease = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') {
      isDryRun = true;
    } else if (a === '--prerelease') {
      prerelease = true;
    } else if (a === '--notes' || a === '-m') {
      notes = args[++i] || '';
    } else if (!a.startsWith('-') && !targetVersion) {
      targetVersion = a;
    }
  }

  return {
    targetVersion: targetVersion || 'patch',
    dryRun: isDryRun,
    notes,
    prerelease,
  };
}

// CLI handler
if (require.main === module) {
  const rawArgs = process.argv.slice(2);
  const command = rawArgs[0] || 'status';

  (async () => {
    try {
      switch (command) {
        case 'status':
        case 'check':
          getStatus();
          break;

        case 'bump': {
          const type = rawArgs[1] || 'patch';
          bumpVersion(type);
          break;
        }

        case 'release': {
          const cliOptions = parseReleaseCliArgs(rawArgs.slice(1));
          await release(cliOptions.targetVersion, cliOptions);
          break;
        }

        case 'set': {
          const targetVersion = rawArgs[1];
          const targetCode = rawArgs[2] ? parseInt(rawArgs[2], 10) : undefined;
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
          console.log('  status                          - check consistency of all version declarations');
          console.log('  bump <patch|minor|major|X.Y.Z>  - increment version and versionCode locally');
          console.log('  release [X.Y.Z] [--dry-run]     - validate, test, and trigger GitHub Actions release');
          console.log('  set <X.Y.Z> [code]              - set exact version and optional versionCode');
          break;
      }
    } catch (err) {
      console.error(`\n❌ Error: ${err.message}\n`);
      process.exit(1);
    }
  })();
}

module.exports = {
  getStatus,
  parseSemver,
  compareSemver,
  bumpVersion,
  calculateNextVersionAndCode,
  applyVersions,
  release,
  dispatchWorkflow,
  parseReleaseCliArgs,
};
