import { useState, useEffect } from 'react';
import { APP_CONFIG } from '../constants/config';
import type { ReleaseMetadata } from '../constants/config';

const GITHUB_LATEST_RELEASE_API = 'https://api.github.com/repos/abhijeet02singh/dotynotes/releases/latest';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubReleaseResponse {
  tag_name: string;
  published_at: string;
  html_url: string;
  body?: string;
  assets: GitHubAsset[];
}

export function useLatestRelease(): ReleaseMetadata {
  const [release, setRelease] = useState<ReleaseMetadata>(APP_CONFIG.release);

  useEffect(() => {
    // If the static configuration is already marked active with a verified URL, use it directly
    if (APP_CONFIG.release.isAvailable && APP_CONFIG.release.downloadUrl) {
      return;
    }

    let mounted = true;
    const controller = new AbortController();

    async function fetchRelease() {
      try {
        const response = await fetch(GITHUB_LATEST_RELEASE_API, {
          signal: controller.signal,
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (!response.ok) {
          // If no release exists yet (HTTP 404) or rate limit (HTTP 403), gracefully keep fallback
          return;
        }

        const data: GitHubReleaseResponse = await response.json();
        const apkAsset = data.assets?.find((asset) => asset.name.endsWith('.apk'));

        if (!apkAsset) {
          return;
        }

        // Look for SHA-256 checksum in release body if present
        let sha256: string | null = null;
        if (data.body) {
          const match = data.body.match(/SHA-256:\s*([a-f0-9]{64})/i);
          if (match) {
            sha256 = match[1];
          }
        }

        const sizeInMb = (apkAsset.size / (1024 * 1024)).toFixed(1);
        const releaseDate = data.published_at
          ? new Date(data.published_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : APP_CONFIG.release.releaseDate;

        if (mounted) {
          setRelease((prev) => ({
            ...prev,
            isAvailable: true,
            version: data.tag_name ? data.tag_name.replace(/^v/, '') : prev.version,
            apkFileName: apkAsset.name,
            downloadUrl: apkAsset.browser_download_url,
            fileSizeBytes: apkAsset.size,
            fileSizeFormatted: `~${sizeInMb} MB`,
            releaseDate,
            sha256Checksum: sha256 || prev.sha256Checksum,
            releaseNotesUrl: data.html_url || prev.releaseNotesUrl,
          }));
        }
      } catch (err: unknown) {
        // Silently preserve fallback when offline or aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    fetchRelease();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return release;
}
