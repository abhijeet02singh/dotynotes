# DotyNotes Release Process & CI/CD Pipeline

This document outlines the production CI/CD architecture, automated validation gates, semantic versioning strategy, Android APK build pipeline, and website download resolution for DotyNotes.

---

## 1. Pipeline Overview

The repository utilizes three decoupled GitHub Actions workflows:

| Workflow | File | Trigger | Purpose |
| :--- | :--- | :--- | :--- |
| **Android CI** | `.github/workflows/android-ci.yml` | Push & PR to `master` (app paths) | Validates Expo Doctor, ESLint, and all 6 regression test suites. |
| **Website CI** | `.github/workflows/website-ci.yml` | Push & PR to `master` (`dotynotes-website/**`) | Validates oxlint, TypeScript types, Vitest tests, and Vite production bundle. |
| **Android Release** | `.github/workflows/android-release.yml` | Manual (`workflow_dispatch`) | Runs pre-release verification, builds standalone APK via EAS, creates GitHub Release, and attaches APK + SHA-256 assets. |

---

## 2. Continuous Integration & Quality Gates

On every pull request and push to `master`:
- **Android App Checks:**
  1. `npm ci`
  2. `npx expo-doctor` (Ensures package compatibility with Expo SDK 57)
  3. `npm run lint` (ESLint via `eslint-config-expo`)
  4. `npm test` (Runs all 6 test suites: rich-text, note colors, onboarding, floating quickpad theme, settings/backup, and theme system)
- **Website Checks:**
  1. `npm ci` in `dotynotes-website/`
  2. `npm run lint` (`oxlint`)
  3. `npm run typecheck` (`tsc -b --noEmit`)
  4. `npm test` (`vitest run` — 26 unit and component tests)
  5. `npm run build` (`vite build` production bundle)

---

## 3. Controlled Versioning Strategy

DotyNotes strictly adheres to **Semantic Versioning (`MAJOR.MINOR.PATCH`)**:
- **Consistency Rule:** `app.json` (`expo.version`), `package.json` (`version`), and `dotynotes-website/src/constants/config.ts` must always remain identical.
- **Android `versionCode` Rule:** Every release must have a strictly increasing integer `versionCode` (e.g. `1` -> `2` -> `3`). Google Play and Android package installers reject APK updates with identical or decreasing version codes.
- **Release Isolation Rule:** Ordinary code pushes to `master` **never** increment the release version or create a public tag.

### Managing Versions with `version_manager.cjs`

Use the included version manager utility:

```bash
# 1. Inspect version consistency across all project declarations
npm run version:check

# 2. Bump patch version (e.g. 1.0.0 -> 1.0.1, versionCode 1 -> 2)
npm run version:bump patch

# 3. Bump minor version (e.g. 1.0.1 -> 1.1.0, versionCode 2 -> 3)
npm run version:bump minor

# 4. Bump major version (e.g. 1.1.0 -> 2.0.0, versionCode 3 -> 4)
npm run version:bump major

# 5. Set explicit custom version
node scripts/version_manager.cjs set 1.0.1 2
```

---

## 4. Required GitHub Secrets & Permissions

Before triggering a release build, configure the following:

### Repository Secrets (`Settings -> Secrets and variables -> Actions`)
| Secret Name | Required By | Description |
| :--- | :--- | :--- |
| `EXPO_TOKEN` | `android-release.yml` | Personal Access Token from Expo (`expo.dev -> Account Settings -> Access Tokens`). Grants EAS permission to build Android APK. |

*(Note: `GITHUB_TOKEN` is automatically injected by GitHub Actions and requires no manual token generation).*

### Workflow Permissions
The `android-release.yml` workflow requires:
- `contents: write` (Configured automatically at job level for publishing GitHub Releases and uploading APK assets).
- `contents: read` for validation jobs.

---

## 5. How to Publish an Android Release

### Option A: One-Command Automated Release (Recommended)

Run the release script from your terminal:
```bash
# Verify all pre-release checks without modifying files or git state
npm run release:dry-run

# Automatically validate working tree, run all tests, bump version, commit, tag, and trigger GitHub Actions
npm run release:patch   # e.g. 1.0.0 -> 1.0.1, versionCode: 1 -> 2
npm run release:minor   # e.g. 1.0.1 -> 1.1.0, versionCode: 2 -> 3
npm run release:major   # e.g. 1.1.0 -> 2.0.0, versionCode: 3 -> 4
```

The script enforces:
1. Clean working tree (no uncommitted or untracked changes).
2. Clean `master` branch.
3. Pre-release version consistency check.
4. Duplicate tag check (local and remote).
5. All 6 root automated regression test suites + linter + website tests.
6. Atomic version bump across `app.json`, `package.json`, and website config.
7. Git commit (`chore(release): bump version to vX.Y.Z`).
8. Annotated Git tag (`vX.Y.Z`).
9. Git push of commit and tag to `origin master`.
10. Tag push automatically triggers the `.github/workflows/android-release.yml` pipeline on GitHub Actions.

---

### Option B: Manual Tag Push

1. Bump version locally:
   ```bash
   npm run version:bump patch
   ```
2. Run tests to ensure quality:
   ```bash
   npm test
   npm run lint
   npm run version:check
   ```
3. Commit and push commit + tag to GitHub:
   ```bash
   git add app.json package.json package-lock.json dotynotes-website/src/constants/config.ts
   git commit -m "chore(release): bump version to v1.0.1"
   git tag -a "v1.0.1" -m "Release v1.0.1"
   git push origin master
   git push origin v1.0.1
   ```
   Pushing the `v1.0.1` tag automatically triggers the Android Release workflow.

---

### Option C: Manual Trigger via GitHub Actions UI

1. Navigate to:  
   `https://github.com/abhijeet02singh/dotynotes/actions/workflows/android-release.yml`
2. Click **Run workflow**.
3. Enter the release version matching `app.json` (e.g. `1.0.0`).
4. Click **Run workflow**.

---

### Step 2: Automated Pipeline Execution on GitHub Actions
The pipeline will automatically:
1. **Pre-flight Quality Gate:** Verify `EXPO_TOKEN`, assert version matches `app.json` and `package.json`, check for duplicate GitHub tags, and run the full test suite.
2. **EAS Cloud Build:** Invoke `eas build --platform android --profile release-apk` non-interactively using the configured EAS credentials.
3. **Artifact Archive:** Upload `eas_build_raw.json` as a GitHub Actions workflow artifact for long-term auditability.
4. **Download & Checksum:** Stream the generated `.apk` from EAS, verify file size, and compute its SHA-256 checksum.
5. **Publish GitHub Release:** Create tag `v1.0.1`, generate structured release notes with verification details, and attach `DotyNotes-v1.0.1.apk` and `DotyNotes-v1.0.1.apk.sha256`.

---

## 6. Website Download Integration

The DotyNotes landing website (`dotynotes-website`) dynamically links to official releases:

- **Dynamic Resolution (`useLatestRelease.ts`):** When the website loads, it queries GitHub's public API (`https://api.github.com/repos/abhijeet02singh/dotynotes/releases/latest`).
- **Automatic APK Linking:** If a release is published with an `.apk` asset, the download modal automatically updates its download link, version badge, and file size to match the latest GitHub release.
- **Graceful Fallback:** If no release has been published yet or the API is offline/rate-limited, the modal gracefully displays the *"Release in Preparation"* status and links users to the GitHub Releases page, preventing broken downloads or dead links.
- **Zero Frontend Secrets:** The public client code uses standard unauthenticated public GitHub REST endpoints with no API tokens exposed.

---

## 7. Troubleshooting Failed Releases

### Error: `Secret EXPO_TOKEN is missing or empty`
- **Cause:** GitHub Actions secret `EXPO_TOKEN` has not been configured.
- **Fix:** Log into [expo.dev](https://expo.dev), navigate to **Account Settings -> Access Tokens**, generate a token, and add it to GitHub repository settings.

### Error: `Release for tag 'vX.Y.Z' already exists on GitHub`
- **Cause:** Attempted to release a version tag that was already published.
- **Fix:** Releases are immutable. Run `npm run version:bump patch` to increment the version and `versionCode` before triggering a new release.

### Error: `Target release version does not match app.json`
- **Cause:** The version entered in `workflow_dispatch` differs from `app.json`.
- **Fix:** Ensure the workflow input matches `app.json` and `package.json`.

### Error: `EAS build did not finish successfully`
- **Cause:** Android build failed in the EAS cloud runner.
- **Fix:** Download the `eas-build-metadata` artifact from the failed workflow run or inspect the EAS build logs at [expo.dev](https://expo.dev).
