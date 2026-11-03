/**
 * Unit Test Suite for DotyNotes Version Manager & Release Orchestrator
 * (scripts/version_manager.cjs)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  getStatus,
  parseSemver,
  compareSemver,
  calculateNextVersionAndCode,
  parseReleaseCliArgs,
  release,
} = require('./version_manager.cjs');

console.log('====================================================');
console.log('🧪 RUNNING VERSION MANAGER & RELEASE UNIT TESTS');
console.log('====================================================\n');

// 1. Semver parsing tests
console.log('👉 [1] Testing SemVer parsing & normalization...');
assert.deepStrictEqual(parseSemver('1.0.3'), { major: 1, minor: 0, patch: 3, formatted: '1.0.3' });
assert.deepStrictEqual(parseSemver('v1.0.4'), { major: 1, minor: 0, patch: 4, formatted: '1.0.4' });
assert.throws(() => parseSemver('1.0'), /Invalid semver/);
assert.throws(() => parseSemver('1.0.3-beta'), /Invalid semver/);
assert.throws(() => parseSemver(''), /Invalid version/);
assert.throws(() => parseSemver(null), /Invalid version/);
console.log('   ✅ PASS: SemVer parsing correctly handles formats and rejects invalid strings.');

// 2. Semver comparison tests
console.log('\n👉 [2] Testing SemVer comparison...');
assert.ok(compareSemver('1.0.4', '1.0.3') > 0);
assert.ok(compareSemver('1.1.0', '1.0.9') > 0);
assert.ok(compareSemver('2.0.0', '1.9.9') > 0);
assert.strictEqual(compareSemver('1.0.3', '1.0.3'), 0);
assert.ok(compareSemver('1.0.2', '1.0.3') < 0);
console.log('   ✅ PASS: SemVer comparison accurately sorts versions.');

// 3. calculateNextVersionAndCode tests
console.log('\n👉 [3] Testing version and monotonic versionCode calculation...');
// Current is 1.0.3, code 6
const patchResult = calculateNextVersionAndCode('1.0.3', 6, 'patch');
assert.strictEqual(patchResult.nextVersion, '1.0.4');
assert.strictEqual(patchResult.nextCode, 7);
assert.strictEqual(patchResult.targetTag, 'v1.0.4');

const minorResult = calculateNextVersionAndCode('1.0.3', 6, 'minor');
assert.strictEqual(minorResult.nextVersion, '1.1.0');
assert.strictEqual(minorResult.nextCode, 7);
assert.strictEqual(minorResult.targetTag, 'v1.1.0');

const majorResult = calculateNextVersionAndCode('1.0.3', 6, 'major');
assert.strictEqual(majorResult.nextVersion, '2.0.0');
assert.strictEqual(majorResult.nextCode, 7);

const customResult = calculateNextVersionAndCode('1.0.3', 6, '1.0.5');
assert.strictEqual(customResult.nextVersion, '1.0.5');
assert.strictEqual(customResult.nextCode, 7);

// Rejects equal or lower versions
assert.throws(() => calculateNextVersionAndCode('1.0.3', 6, '1.0.3'), /must be strictly greater/);
assert.throws(() => calculateNextVersionAndCode('1.0.3', 6, '1.0.2'), /must be strictly greater/);
assert.throws(() => calculateNextVersionAndCode('1.0.3', 6, 'invalid'), /Invalid version or bump type/);
console.log('   ✅ PASS: Version progression and monotonic code increments are strictly verified.');

// 4. CLI Argument parsing tests
console.log('\n👉 [4] Testing CLI argument parser...');
assert.deepStrictEqual(parseReleaseCliArgs(['1.0.4']), {
  targetVersion: '1.0.4',
  dryRun: false,
  notes: '',
  prerelease: false,
});
assert.deepStrictEqual(parseReleaseCliArgs(['--dry-run', '1.0.4']), {
  targetVersion: '1.0.4',
  dryRun: true,
  notes: '',
  prerelease: false,
});
assert.deepStrictEqual(parseReleaseCliArgs(['1.0.4', '--dry-run', '--notes', 'Fix issue']), {
  targetVersion: '1.0.4',
  dryRun: true,
  notes: 'Fix issue',
  prerelease: false,
});
assert.deepStrictEqual(parseReleaseCliArgs([]), {
  targetVersion: 'patch',
  dryRun: false,
  notes: '',
  prerelease: false,
});
console.log('   ✅ PASS: CLI argument parsing supports positional versions and flags.');

// 5. Dry-run execution test
console.log('\n👉 [5] Testing dry-run simulation against live repository...');
(async () => {
  const dryRunRes = await release('1.0.4', {
    dryRun: true,
    skipTests: true,
    allowDirty: true,
    allowBranch: true,
  });

  assert.strictEqual(dryRunRes.dryRun, true);
  assert.strictEqual(dryRunRes.currentVersion, '1.0.3');
  assert.strictEqual(dryRunRes.nextVersion, '1.0.4');
  assert.strictEqual(dryRunRes.nextCode, 7);
  assert.strictEqual(dryRunRes.targetTag, 'v1.0.4');

  // Verify app.json remains untouched at v1.0.3
  const realAppJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
  assert.strictEqual(realAppJson.expo.version, '1.0.3');
  assert.strictEqual(realAppJson.expo.android.versionCode, 6);

  console.log('   ✅ PASS: Dry-run simulation succeeded with 0 side-effects.');

  console.log('\n====================================================');
  console.log('🎉 ALL VERSION MANAGER & RELEASE UNIT TESTS PASSED!');
  console.log('====================================================\n');
})();

