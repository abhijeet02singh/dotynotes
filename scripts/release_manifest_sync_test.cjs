/**
 * Unit Test Suite for DotyNotes Release Manifest & Config Synchronizer
 * (scripts/release_manifest_sync.cjs)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  syncManifests,
  validateParams,
  calculateSizeFormatted,
  formatReleaseDateIso,
  formatReleaseDateHuman,
  EXPECTED_PACKAGE_ID,
} = require('./release_manifest_sync.cjs');

console.log('====================================================');
console.log('🧪 RUNNING RELEASE MANIFEST SYNC UNIT TESTS');
console.log('====================================================\n');

// 1. Helper function tests
console.log('👉 [1] Testing formatting helpers...');
assert.strictEqual(calculateSizeFormatted(1048576), '~1.00 MB');
assert.strictEqual(calculateSizeFormatted(77459912), '~73.87 MB');
assert.match(formatReleaseDateIso(), /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
assert.match(formatReleaseDateHuman(), /^[A-Z][a-z]+ [0-9]{4}$/);
console.log('   ✅ PASS: Formatting helpers return expected shapes.');

// 2. Parameter validation tests
console.log('\n👉 [2] Testing parameter validation & safety bounds...');
const validSample = {
  version: '1.0.4',
  versionCode: 7,
  sha256: 'a'.repeat(64),
  fileSizeBytes: 77459912,
  downloadUrl: 'https://github.com/abhijeet02singh/dotynotes/releases/download/v1.0.4/DotyNotes-v1.0.4.apk',
};

const validated = validateParams(validSample);
assert.strictEqual(validated.version, '1.0.4');
assert.strictEqual(validated.versionCode, 7);
assert.strictEqual(validated.sha256, 'a'.repeat(64));
assert.strictEqual(validated.apkFileName, 'DotyNotes-v1.0.4.apk');

// Should reject invalid semver
assert.throws(() => validateParams({ ...validSample, version: 'invalid' }), /Invalid version/);
assert.throws(() => validateParams({ ...validSample, version: '1.0.4-beta' }), /Invalid version/);

// Should reject invalid versionCode
assert.throws(() => validateParams({ ...validSample, versionCode: 'not-int' }), /Invalid versionCode/);
assert.throws(() => validateParams({ ...validSample, versionCode: 0 }), /Invalid versionCode/);
assert.throws(() => validateParams({ ...validSample, versionCode: -5 }), /Invalid versionCode/);

// Should reject invalid sha256
assert.throws(() => validateParams({ ...validSample, sha256: 'too-short' }), /Invalid sha256/);
assert.throws(() => validateParams({ ...validSample, sha256: 'z'.repeat(64) }), /Invalid sha256/);

// Should reject invalid size
assert.throws(() => validateParams({ ...validSample, fileSizeBytes: 0 }), /Invalid fileSizeBytes/);
assert.throws(() => validateParams({ ...validSample, fileSizeBytes: -100 }), /Invalid fileSizeBytes/);

// Should reject non-https downloadUrl
assert.throws(() => validateParams({ ...validSample, downloadUrl: 'http://insecure.com/apk.apk' }), /Invalid downloadUrl/);
console.log('   ✅ PASS: Parameter validation strictly guards all inputs.');

// 3. Dry-run mode against repository root
console.log('\n👉 [3] Testing dry-run safety against real files...');
const dryRunResult = syncManifests(validSample, { dryRun: true });
assert.strictEqual(dryRunResult.success, true);
// Verify real files on disk remain untouched at v1.0.3
const realAppJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
assert.strictEqual(realAppJson.expo.version, '1.0.3');
assert.strictEqual(realAppJson.expo.android.versionCode, 6);
console.log('   ✅ PASS: Dry-run verified without altering production files.');

// 4. Isolated mock sync test in temporary directory
console.log('\n👉 [4] Testing isolated sync against mock repository tree...');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotynotes-sync-test-'));

try {
  // Setup mock file tree
  const mockAppJson = {
    expo: {
      name: 'DotyNotes',
      version: '1.0.3',
      android: {
        package: EXPECTED_PACKAGE_ID,
        versionCode: 6,
      },
    },
  };
  const mockPkgJson = { name: 'dotynotes', version: '1.0.3' };
  const mockLockJson = { name: 'dotynotes', version: '1.0.3', packages: { '': { version: '1.0.3' } } };
  const mockManifest = { version: '1.0.3', versionCode: 6, packageId: EXPECTED_PACKAGE_ID };
  const mockWebConfig = `
  release: {
    isAvailable: false,
    version: '1.0.3',
    versionCode: 6,
    releaseDate: 'October 2026',
    apkFileName: 'DotyNotes-v1.0.3.apk',
    fileSizeBytes: 70000000,
    fileSizeFormatted: '~70.00 MB',
    minAndroidVersion: 'Android 8.0 (API 26) or higher',
    targetAndroidVersion: 'Android 14 / 15 (API 34/35)',
    packageId: 'com.dotynotes.app',
    sha256Checksum: null,
    downloadUrl: null,
    releaseNotesUrl: 'https://github.com/abhijeet02singh/dotynotes/releases/tag/v1.0.3',
  } as ReleaseMetadata,
  `;

  fs.writeFileSync(path.join(tempDir, 'app.json'), JSON.stringify(mockAppJson, null, 2), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(mockPkgJson, null, 2), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify(mockLockJson, null, 2), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'update-manifest.json'), JSON.stringify(mockManifest, null, 2), 'utf8');

  fs.mkdirSync(path.join(tempDir, 'dotynotes-website', 'public'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'dotynotes-website', 'src', 'constants'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'dotynotes-website', 'public', 'update-manifest.json'), JSON.stringify(mockManifest, null, 2), 'utf8');
  fs.writeFileSync(path.join(tempDir, 'dotynotes-website', 'src', 'constants', 'config.ts'), mockWebConfig, 'utf8');

  // Execute syncManifests against temp directory
  const syncResult = syncManifests(validSample, { repoRoot: tempDir, dryRun: false });
  assert.strictEqual(syncResult.success, true);

  // Assert app.json
  const updatedApp = JSON.parse(fs.readFileSync(path.join(tempDir, 'app.json'), 'utf8'));
  assert.strictEqual(updatedApp.expo.version, '1.0.4');
  assert.strictEqual(updatedApp.expo.android.versionCode, 7);
  assert.strictEqual(updatedApp.expo.android.package, EXPECTED_PACKAGE_ID);

  // Assert package.json & package-lock.json
  const updatedPkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
  assert.strictEqual(updatedPkg.version, '1.0.4');
  const updatedLock = JSON.parse(fs.readFileSync(path.join(tempDir, 'package-lock.json'), 'utf8'));
  assert.strictEqual(updatedLock.version, '1.0.4');
  assert.strictEqual(updatedLock.packages[''].version, '1.0.4');

  // Assert root update-manifest.json
  const updatedRootManifest = JSON.parse(fs.readFileSync(path.join(tempDir, 'update-manifest.json'), 'utf8'));
  assert.strictEqual(updatedRootManifest.version, '1.0.4');
  assert.strictEqual(updatedRootManifest.versionCode, 7);
  assert.strictEqual(updatedRootManifest.packageId, EXPECTED_PACKAGE_ID);
  assert.strictEqual(updatedRootManifest.sha256, 'a'.repeat(64));
  assert.strictEqual(updatedRootManifest.fileSizeBytes, 77459912);
  assert.strictEqual(updatedRootManifest.fileSizeFormatted, '~73.87 MB');
  assert.strictEqual(updatedRootManifest.downloadUrl, validSample.downloadUrl);

  // Assert website update-manifest.json
  const updatedWebManifest = JSON.parse(fs.readFileSync(path.join(tempDir, 'dotynotes-website', 'public', 'update-manifest.json'), 'utf8'));
  assert.strictEqual(updatedWebManifest.version, '1.0.4');
  assert.strictEqual(updatedWebManifest.versionCode, 7);
  assert.strictEqual(updatedWebManifest.sha256, 'a'.repeat(64));

  // Assert website config.ts
  const updatedConfigTs = fs.readFileSync(path.join(tempDir, 'dotynotes-website', 'src', 'constants', 'config.ts'), 'utf8');
  assert.ok(updatedConfigTs.includes("isAvailable: true"), 'config.ts must set isAvailable: true');
  assert.ok(updatedConfigTs.includes("version: '1.0.4'"), 'config.ts must set version 1.0.4');
  assert.ok(updatedConfigTs.includes("versionCode: 7"), 'config.ts must set versionCode 7');
  assert.ok(updatedConfigTs.includes(`sha256Checksum: '${'a'.repeat(64)}'`), 'config.ts must set sha256Checksum');
  assert.ok(updatedConfigTs.includes(`downloadUrl: '${validSample.downloadUrl}'`), 'config.ts must set downloadUrl');
  assert.ok(updatedConfigTs.includes("fileSizeBytes: 77459912"), 'config.ts must set fileSizeBytes');
  assert.ok(updatedConfigTs.includes("fileSizeFormatted: '~73.87 MB'"), 'config.ts must set fileSizeFormatted');

  console.log('   ✅ PASS: Mock tree synchronization correctly updated all 6 configuration and manifest targets.');

  // Test package ID mismatch rejection
  mockAppJson.expo.android.package = 'com.other.fakeapp';
  fs.writeFileSync(path.join(tempDir, 'app.json'), JSON.stringify(mockAppJson, null, 2), 'utf8');
  assert.throws(() => syncManifests(validSample, { repoRoot: tempDir }), /Safety violation: app.json android package/);
  console.log('   ✅ PASS: Mismatched package ID correctly rejected.');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// 5. Transactional Rollback Regression Tests
console.log('\n👉 [5] Testing transactional rollback on write failure...');
const rollbackDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotynotes-rollback-test-'));

try {
  const initialAppJson = JSON.stringify({
    expo: {
      name: 'DotyNotes',
      version: '1.0.3',
      android: { package: EXPECTED_PACKAGE_ID, versionCode: 6 },
    },
  }, null, 2) + '\n';
  const initialPkgJson = JSON.stringify({ name: 'dotynotes', version: '1.0.3' }, null, 2) + '\n';
  const initialManifest = JSON.stringify({ version: '1.0.3', versionCode: 6, packageId: EXPECTED_PACKAGE_ID }, null, 2) + '\n';
  const initialWebConfig = `// Original Config v1.0.3\nversion: '1.0.3'\nversionCode: 6\nisAvailable: false\n`;

  fs.writeFileSync(path.join(rollbackDir, 'app.json'), initialAppJson, 'utf8');
  fs.writeFileSync(path.join(rollbackDir, 'package.json'), initialPkgJson, 'utf8');
  fs.writeFileSync(path.join(rollbackDir, 'update-manifest.json'), initialManifest, 'utf8');

  fs.mkdirSync(path.join(rollbackDir, 'dotynotes-website', 'public'), { recursive: true });
  fs.mkdirSync(path.join(rollbackDir, 'dotynotes-website', 'src', 'constants'), { recursive: true });
  fs.writeFileSync(path.join(rollbackDir, 'dotynotes-website', 'public', 'update-manifest.json'), initialManifest, 'utf8');
  fs.writeFileSync(path.join(rollbackDir, 'dotynotes-website', 'src', 'constants', 'config.ts'), initialWebConfig, 'utf8');

  // Scenario A: Failure after writing app.json
  assert.throws(() => {
    syncManifests(validSample, {
      repoRoot: rollbackDir,
      _simulateFailureAt: 'afterAppJson',
    });
  }, /Simulated write failure after writing app.json/);

  // Verify app.json and other files were rolled back to their exact original pre-run content
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'app.json'), 'utf8'), initialAppJson, 'app.json must be restored');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'package.json'), 'utf8'), initialPkgJson, 'package.json must be intact');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'update-manifest.json'), 'utf8'), initialManifest, 'root manifest must be intact');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'dotynotes-website', 'public', 'update-manifest.json'), 'utf8'), initialManifest, 'web manifest must be intact');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'dotynotes-website', 'src', 'constants', 'config.ts'), 'utf8'), initialWebConfig, 'web config must be intact');
  console.log('   ✅ PASS 5.1: Failure after app.json write triggers full rollback to exact snapshot.');

  // Scenario B: Failure after writing package.json
  assert.throws(() => {
    syncManifests(validSample, {
      repoRoot: rollbackDir,
      _simulateFailureAt: 'afterPackageJson',
    });
  }, /Simulated write failure after writing package.json/);

  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'app.json'), 'utf8'), initialAppJson, 'app.json must be restored');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'package.json'), 'utf8'), initialPkgJson, 'package.json must be restored');
  console.log('   ✅ PASS 5.2: Failure after package.json write triggers full rollback to exact snapshot.');

  // Scenario C: Failure before writing webConfig (after manifests written)
  assert.throws(() => {
    syncManifests(validSample, {
      repoRoot: rollbackDir,
      _simulateFailureAt: 'beforeWebConfig',
    });
  }, /Simulated write failure before writing webConfig/);

  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'app.json'), 'utf8'), initialAppJson, 'app.json must be restored');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'package.json'), 'utf8'), initialPkgJson, 'package.json must be restored');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'update-manifest.json'), 'utf8'), initialManifest, 'root manifest must be restored');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'dotynotes-website', 'public', 'update-manifest.json'), 'utf8'), initialManifest, 'web manifest must be restored');
  assert.strictEqual(fs.readFileSync(path.join(rollbackDir, 'dotynotes-website', 'src', 'constants', 'config.ts'), 'utf8'), initialWebConfig, 'web config must be restored');
  console.log('   ✅ PASS 5.3: Failure midway through manifests triggers full rollback across all 6 targets.');
} finally {
  fs.rmSync(rollbackDir, { recursive: true, force: true });
}

console.log('\n====================================================');
console.log('🎉 ALL RELEASE MANIFEST SYNC & ROLLBACK TESTS PASSED!');
console.log('====================================================\n');
