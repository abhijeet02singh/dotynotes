# DotyNotes Product Website (`dotynotes-website`)

A complete, production-quality marketing and interactive product website for **DotyNotes**, an offline-first Android note-taking application featuring colorful sticky notes, rich-text formatting, local reminders, and the signature native Android Floating Dot that opens Quick Pad.

---

## 1. Project Overview & Architecture

- **Dedicated Directory**: `c:/Users/ankit/Downloads/project/dotynotes/dotynotes-website`
- **Isolation Guarantee**: The website is 100% isolated from the native Android Expo application. It does not import Android runtime code, does not access SQLite databases, and does not alter native Android modules, permissions, or configurations.
- **Technology Stack**:
  - React 19 + TypeScript
  - Vite 8 with Rolldown chunk code-splitting
  - Tailwind CSS v4 (`@tailwindcss/vite`)
  - Motion / Framer Motion for fluid transitions
  - Lucide React for consistent icons
  - Canvas Confetti for task completion delight

---

## 2. Implemented Sections & Features

### A. Premium Navigation (`src/components/Navbar.tsx`)
- Authentic vector reproduction of the DotyNotes logo (`/images/dotynotes-logo.svg`).
- Smooth anchor navigation across all product sections (`#product`, `#playground`, `#floating-dot`, `#features`, `#privacy`, `#gallery`, `#faq`).
- Subtle background blur and border on scroll without layout shift.
- Accessible mobile drawer menu with responsive toggle.
- Primary "Download for Android" CTA opening direct APK installation modal.

### B. Hero Experience (`src/sections/HeroSection.tsx`)
- Headline: *"Your thoughts. Always within reach."*
- Supporting copy: *"Capture ideas in seconds. Organize them your way. Keep your notes close, even when you leave the app."*
- Primary CTA: "Download for Android" & Secondary CTA: "Interactive Sandbox".
- Realistic product composition featuring:
  - Lavender pinned idea card with pushpin.
  - Interactive Mint checklist note with checkable task items.
  - Pink reminder preview note with scheduled time badge.
  - Floating Dot simulation handle peek.
  - Reduced-motion support and instant render without blocking animations.

### C. Interactive Sticky Notes Playground (`src/sections/PlaygroundSection.tsx`)
- Real-time browser sandbox demonstrating note creation, inline editing, color picking from the 7 authentic pastel schemes, pinning/unpinning, and deletion.
- Category filters: *All Notes*, *Pinned*, *Checklists*.
- Confetti celebration upon finishing all checklist items.
- Receives notes dynamically created from the Floating Dot Quick Pad drawer!
- Persisted in browser `localStorage` under `dotynotes_web_demo_notes` with one-click reset to initial sample notes.

### D. Floating Dot Signature Experience (`src/sections/FloatingDotSection.tsx` & `src/components/QuickPadDrawer.tsx`)
- **Global Floating Dot Handle**: Persistent side handle on the screen edge with an animated ping badge.
- **Sliding Quick Pad Overlay**: Tap the Floating Dot to slide out Quick Pad, write a quick thought, choose a sticky color, and save it directly to the Interactive Playground!
- **Interactive Phone Multitasking Simulation**: An Android device mockup demonstrating how the Floating Dot hovers over underlying apps (Chrome Browser, E-Reader, Team Chat) without breaking context.
- Transparent disclaimer: Clearly labeled as a browser simulation of Android's native `SYSTEM_ALERT_WINDOW` overlay.

### E. Rich-Text Editor Demonstration (`src/sections/RichTextSection.tsx`)
- Functional formatting controls: Bold, Italic, Underline, Bullets, and Checklist mode.
- Interactive pastel color switcher.
- Live character and word counter.
- Simulated SQLite WAL mode auto-save indicator.

### F. Feature Storytelling (`src/sections/FeatureStorySection.tsx`)
Eight distinct, carefully composed sections with alternating visual layouts:
1. *Capture thoughts quickly* — Frictionless instant start.
2. *Organize colorful sticky notes* — Visual palette display of the 7 pastel note schemes with contrast science.
3. *Pin important ideas* — Highlighting pinned vs unpinned hierarchy with dark-mode contrast cards.
4. *Write with rich-text formatting* — Inline typographic clarity.
5. *Use checklists* — Interactive completion animation.
6. *Schedule reminders* — On-device exact alarm scheduling without external push servers.
7. *Access Quick Pad through Floating Dot* — Multitasking without context switching.
8. *Keep notes stored locally on the device* — SQLite Write-Ahead Logging mode and zero telemetry trackers.

### G. Scroll-Driven Story ("From Chaos to Clarity") (`src/sections/ScrollStorySection.tsx`)
- A 5-step interactive journey:
  1. *The Scattered Spark*: Loose, chaotic thought fragments.
  2. *Colorful Alignment*: Grouping into pastel sticky notes.
  3. *Pinning the Priority*: Elevating critical notes to the top.
  4. *Actionable Momentum*: Completing interactive checklists.
  5. *Always Within Reach*: Native Android Floating Dot companion ready anywhere.
- Accessible tab controls and natural scrolling without scroll-hijacking.

### H. Privacy & Offline-First Philosophy (`src/sections/PrivacySection.tsx` & `src/components/PrivacyPolicyModal.tsx`)
- Headline: *"Your notes. On your device."*
- Explains local-first SQLite architecture with WAL mode.
- Zero account requirement, zero tracking beacons, zero advertising SDKs.
- Clear and honest distinction between sandboxed local storage and encryption (no exaggerated "military grade" marketing claims).
- Full accessible Privacy Policy modal based on the authentic application policy.

### I. Real Product Gallery (`src/sections/GallerySection.tsx`)
- Interactive tour of authentic DotyNotes screens in high-fidelity Android device frames:
  1. *Home Notes Grid*: Search bar, category filters, pinned notes, and pastel grid.
  2. *Rich-Text Note Editor*: Distraction-free editing canvas with formatting toolbar.
  3. *Floating Dot & Quick Pad*: System overlay multitasking view.
  4. *Settings & Themes*: 7 UI color themes, overlay toggles, and JSON backup export.

### J. Download Experience (`src/sections/DownloadSection.tsx` & `src/components/DownloadModal.tsx`)
- Headline: *"Make room for your next idea."*
- Verified release parameters:
  - Version: `v1.0.0`
  - File Size: `~36.4 MB`
  - Compatibility: `Android 8.0 (API 26) or higher`
  - Package ID: `com.dotynotes.app`
  - SHA-256 Checksum: with 1-click copy-to-clipboard.
- Concise 3-step sideloading walkthrough explaining "Install unknown apps" and "Appear on top" overlay permissions.

### K. Accessible FAQ (`src/sections/FaqSection.tsx`)
- Searchable, categorized accordion covering offline storage, SQLite, account policies, Floating Dot overlay, exact alarms, and APK installation.

### L. Global Footer (`src/components/Footer.tsx`)
- Authentic branding, product links, legal disclaimers, dynamic copyright year, and release metadata.

---

## 3. Configuration Centralization (`src/constants/config.ts`)

All external URLs, release metadata, checksums, and contact information are centralized in `src/constants/config.ts`:

```typescript
export const APP_CONFIG = {
  name: 'DotyNotes',
  siteUrl: 'https://dotynotes.app', // Update when production custom domain is configured
  release: {
    version: '1.0.0',
    releaseDate: 'October 2026',
    apkFileName: 'DotyNotes-v1.0.0.apk',
    fileSizeFormatted: '~36.4 MB',
    minAndroidVersion: 'Android 8.0 (API 26) or higher',
    packageId: 'com.dotynotes.app',
    sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    downloadUrl: 'https://github.com/abhijeet_singhk02/dotynotes/releases/download/v1.0.0/DotyNotes-v1.0.0.apk',
    releaseNotesUrl: 'https://github.com/abhijeet_singhk02/dotynotes/releases/tag/v1.0.0',
    githubUrl: 'https://github.com/abhijeet_singhk02/dotynotes',
  },
  support: {
    email: 'support@dotynotes.app',
    issuesUrl: 'https://github.com/abhijeet_singhk02/dotynotes/issues',
  },
};
```

To release a new APK or configure a custom download URL:
1. Open `src/constants/config.ts`.
2. Update `downloadUrl`, `version`, `sha256Checksum`, or `fileSizeFormatted`.
3. Run `npm run build`.

---

## 4. Commands to Run & Build

### Development Server
```bash
cd dotynotes-website
npm run dev
```

### Typecheck & Production Build
```bash
cd dotynotes-website
npm run build
```

### Linting (Oxlint)
```bash
cd dotynotes-website
npm run lint
```

### Preview Production Build Locally
```bash
cd dotynotes-website
npm run preview
```

---

## 5. Deployment Guide for Vercel

### Option 1: Vercel CLI
```bash
cd dotynotes-website
npx vercel
```

### Option 2: Git Integration via Vercel Dashboard
1. Push the repository to GitHub.
2. In the Vercel Dashboard, click **Add New Project**.
3. Select your repository.
4. Set the **Root Directory** to `dotynotes-website`.
5. Framework Preset: **Vite**.
6. Build Command: `npm run build`.
7. Output Directory: `dist`.
8. Click **Deploy**.

---

## 6. Verification & Test Results

- **TypeScript Typecheck**: Passed (`0 errors`).
- **Oxlint**: Passed (`0 errors, 0 warnings`).
- **Vite Production Build**: Passed in `2.30s`.
  - `dist/index.html`: `3.11 kB` (gzip: `1.10 kB`)
  - `dist/assets/index.css`: `61.77 kB` (gzip: `10.75 kB`)
  - `dist/assets/vendor.js`: `210.53 kB` (gzip: `65.70 kB`)
  - `dist/assets/motion.js`: `137.60 kB` (gzip: `45.54 kB`)
  - `dist/assets/index.js`: `136.49 kB` (gzip: `31.38 kB`)
  - `dist/assets/icons.js`: `21.12 kB` (gzip: `7.88 kB`)
- **Android App Isolation**: Confirmed. No files in the root Android project, `src/`, `android/`, `app.json`, or SQLite services were modified or touched.
