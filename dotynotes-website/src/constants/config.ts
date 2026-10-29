/**
 * DotyNotes Website Central Configuration
 *
 * All external URLs, APK download endpoints, app versioning,
 * release metadata, and system requirements are centralized here.
 * When a new APK is released or domain configured, update these fields.
 */

export interface ReleaseMetadata {
  isAvailable: boolean;
  version: string;
  versionCode: number;
  releaseDate: string;
  apkFileName: string;
  fileSizeBytes: number; // in bytes (e.g. 36.4 MB = ~38,168,000 bytes)
  fileSizeFormatted: string;
  minAndroidVersion: string;
  targetAndroidVersion: string;
  packageId: string;
  sha256Checksum: string | null;
  downloadUrl: string | null; // Direct APK download URL or null if not yet published
  releaseNotesUrl: string;
  githubUrl: string;
}

export const APP_CONFIG = {
  name: 'DotyNotes',
  tagline: 'Your thoughts. Always within reach.',
  supportingCopy: 'Capture ideas in seconds. Organize them your way. Keep your notes close, even when you leave the app.',
  description: 'An offline-first Android note-taking application featuring colorful sticky notes, rich-text formatting, local reminders, and the signature Floating Dot Quick Pad overlay.',
  
  // Production domain configuration placeholder
  siteUrl: 'https://dotynotes.app',
  
  // Release Metadata (Strictly verifiable from app.json & actual build specifications)
  release: {
    isAvailable: false,
    version: '1.0.0',
    versionCode: 1,
    releaseDate: 'Upcoming Release',
    apkFileName: 'DotyNotes-v1.0.0.apk',
    fileSizeBytes: 38168576,
    fileSizeFormatted: '~36.4 MB',
    minAndroidVersion: 'Android 8.0 (API 26) or higher',
    targetAndroidVersion: 'Android 14 / 15 (API 34/35)',
    packageId: 'com.dotynotes.app',
    sha256Checksum: null,
    downloadUrl: null,
    releaseNotesUrl: 'https://github.com/abhijeet02singh/dotynotes/releases',
    githubUrl: 'https://github.com/abhijeet02singh/dotynotes',
  } as ReleaseMetadata,

  // Support and legal configuration
  support: {
    email: 'support@dotynotes.app',
    issuesUrl: 'https://github.com/abhijeet02singh/dotynotes/issues',
  },

  // Navigation Links
  navLinks: [
    { label: 'Product', href: '#product' },
    { label: 'Playground', href: '#playground' },
    { label: 'Floating Dot', href: '#floating-dot' },
    { label: 'Features', href: '#features' },
    { label: 'Privacy', href: '#privacy' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'FAQ', href: '#faq' },
  ],
};
