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

  it('renders modal dialog with confirmation headline, prompt, and verified metadata when isOpen is true', () => {
    render(<DownloadModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /download dotynotes for android/i })).toBeInTheDocument();
    expect(
      screen.getByText(/do you want to download dotynotes apk for your android device\?/i)
    ).toBeInTheDocument();
    expect(screen.getByText(APP_CONFIG.release.packageId)).toBeInTheDocument();
    expect(screen.getByText(APP_CONFIG.release.version)).toBeInTheDocument();
    expect(screen.getByText('Android APK')).toBeInTheDocument();
    expect(screen.getByText(APP_CONFIG.release.fileSizeFormatted)).toBeInTheDocument();
  });

  it('displays preparation status, disabled Download APK button, and functional Cancel button when release is unavailable', () => {
    const handleClose = vi.fn();
    render(<DownloadModal isOpen={true} onClose={handleClose} />);

    // Shows Release in Preparation notice
    expect(screen.getByText(/release in preparation/i)).toBeInTheDocument();
    expect(screen.getByText(/signed standalone apk build has been generated/i)).toBeInTheDocument();

    // Primary Download APK button is disabled
    const downloadBtn = screen.getByRole('button', { name: /download apk/i });
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toBeDisabled();
    expect(downloadBtn).toHaveAttribute('aria-disabled', 'true');

    // Does NOT navigate to GitHub repository as primary action
    expect(screen.queryByRole('link', { name: /view repository on github/i })).not.toBeInTheDocument();

    // Cancel button is active and functional
    const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    expect(cancelBtn).toBeInTheDocument();
    expect(cancelBtn).not.toBeDisabled();

    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Shows checksum publication notice instead of copy button
    expect(screen.getByText(/available upon official build publication/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy sha-256 checksum/i })).not.toBeInTheDocument();
  });

  it('displays enabled Download APK link and copyable checksum when release is available', async () => {
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

    const handleClose = vi.fn();

    try {
      render(<DownloadModal isOpen={true} onClose={handleClose} />);

      // Primary button is an active download link
      const downloadLink = screen.getByRole('link', { name: /download apk/i });
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute('href', 'https://releases.dotynotes.app/v1.0.0/DotyNotes-v1.0.0.apk');
      expect(downloadLink).toHaveAttribute('download', APP_CONFIG.release.apkFileName);

      // Cancel button remains present
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();

      // Checksum display and copy functionality
      expect(screen.getByText('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')).toBeInTheDocument();
      const copyBtn = screen.getByRole('button', { name: /copy sha-256 checksum/i });
      fireEvent.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');

      // Clicking download link triggers onClose after short delay
      fireEvent.click(downloadLink);
      await waitFor(() => {
        expect(handleClose).toHaveBeenCalled();
      });
    } finally {
      Object.assign(APP_CONFIG.release, originalRelease);
    }
  });

  it('invokes onClose when clicking the close button or pressing Escape key', async () => {
    const handleClose = vi.fn();
    render(<DownloadModal isOpen={true} onClose={handleClose} />);

    // Close via header close button
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
