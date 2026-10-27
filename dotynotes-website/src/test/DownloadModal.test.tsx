import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DownloadModal } from '../components/DownloadModal';
import { APP_CONFIG } from '../constants/config';

describe('DownloadModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render dialog content when isOpen is false', () => {
    render(<DownloadModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/download dotynotes for android/i)).not.toBeInTheDocument();
  });

  it('renders modal dialog and verified project metadata when isOpen is true', () => {
    render(<DownloadModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/download dotynotes for android/i)).toBeInTheDocument();
    expect(screen.getByText(APP_CONFIG.release.packageId)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`version ${APP_CONFIG.release.version}`, 'i'))).toBeInTheDocument();
  });

  it('displays release preparation state and github link when APK release is unavailable', () => {
    render(<DownloadModal isOpen={true} onClose={vi.fn()} />);

    // Shows clear Release in Preparation notice
    expect(screen.getByText(/release in preparation/i)).toBeInTheDocument();

    // Does not render active direct APK download link
    expect(
      screen.queryByRole('link', {
        name: new RegExp(`download apk \\(${APP_CONFIG.release.apkFileName}\\)`, 'i'),
      })
    ).not.toBeInTheDocument();

    // Shows safe repository link instead
    const repoLink = screen.getByRole('link', { name: /view repository on github/i });
    expect(repoLink).toBeInTheDocument();
    expect(repoLink).toHaveAttribute('href', APP_CONFIG.release.githubUrl);

    // Shows checksum publication notice instead of copy button
    expect(screen.getByText(/available upon official build publication/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy sha-256 checksum/i })).not.toBeInTheDocument();
  });

  it('displays verified download link and copyable checksum when release is available', () => {
    const originalRelease = { ...APP_CONFIG.release };
    // Temporarily mock an active verified release
    Object.assign(APP_CONFIG.release, {
      isAvailable: true,
      downloadUrl: 'https://releases.dotynotes.app/v1.0.0/DotyNotes-v1.0.0.apk',
      sha256Checksum: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    try {
      render(<DownloadModal isOpen={true} onClose={vi.fn()} />);

      const downloadLink = screen.getByRole('link', {
        name: new RegExp(`download apk \\(${APP_CONFIG.release.apkFileName}\\)`, 'i'),
      });
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute('href', 'https://releases.dotynotes.app/v1.0.0/DotyNotes-v1.0.0.apk');

      expect(screen.getByText('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')).toBeInTheDocument();
      const copyBtn = screen.getByRole('button', { name: /copy sha-256 checksum/i });
      fireEvent.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    } finally {
      Object.assign(APP_CONFIG.release, originalRelease);
    }
  });

  it('invokes onClose when clicking the close button or pressing Escape key', async () => {
    const handleClose = vi.fn();
    render(<DownloadModal isOpen={true} onClose={handleClose} />);

    // Close via close button
    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Close via Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });
});
