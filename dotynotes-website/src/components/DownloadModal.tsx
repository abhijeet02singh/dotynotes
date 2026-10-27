import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ShieldCheck, Copy, Check, Smartphone, AlertCircle, ExternalLink } from 'lucide-react';
import { APP_CONFIG } from '../constants/config';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const release = APP_CONFIG.release;

  const handleCopyChecksum = () => {
    navigator.clipboard.writeText(release.sha256Checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 z-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
          >
            {/* Header Accent */}
            <div className="h-2 w-full bg-gradient-to-r from-[#F99773] via-[#6D28D9] to-[#87D4CA]" />

            <div className="p-6 sm:p-8">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F99773]/15 flex items-center justify-center text-[#F99773]">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="modal-headline" className="text-xl font-bold text-[#182E3A] font-['Plus_Jakarta_Sans']">
                    Download DotyNotes for Android
                  </h3>
                  <p className="text-sm text-slate-500">
                    Version {release.version} ({release.releaseDate}) • {release.fileSizeFormatted}
                  </p>
                </div>
              </div>

              {/* Verified Specs Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Package ID</span>
                  <code className="font-mono text-slate-700 font-semibold">{release.packageId}</code>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Compatibility</span>
                  <span className="text-slate-700 font-medium">{release.minAndroidVersion}</span>
                </div>
              </div>

              {/* Primary Download Action */}
              <div className="space-y-3 mb-6">
                <a
                  href={release.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#182E3A] text-white font-medium hover:bg-[#234253] transition-all shadow-md hover:shadow-lg active:scale-[0.99] group text-sm sm:text-base"
                >
                  <Download className="w-5 h-5 text-[#F99773] group-hover:translate-y-0.5 transition-transform" />
                  <span>Download APK ({release.apkFileName})</span>
                </a>

                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Verified Offline & Ad-Free
                  </span>
                  <a
                    href={release.releaseNotesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#182E3A] underline underline-offset-2"
                  >
                    View Release Notes <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Sideloading Walkthrough */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Direct Sideloading Instructions
                </h4>

                <ol className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      1
                    </span>
                    <span>Download the <strong>.apk</strong> file to your Android smartphone or tablet.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      2
                    </span>
                    <span>When prompted, allow <em>"Install unknown apps"</em> for your browser or files manager in Android Settings.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      3
                    </span>
                    <span>Open DotyNotes! To activate the <strong>Floating Dot</strong> Quick Pad overlay, enable the one-time <em>"Appear on top"</em> system permission in Settings.</span>
                  </li>
                </ol>
              </div>

              {/* SHA256 Checksum */}
              <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">SHA-256 Checksum</span>
                  <span className="block font-mono text-[11px] text-slate-600 truncate max-w-[280px] sm:max-w-md">
                    {release.sha256Checksum}
                  </span>
                </div>
                <button
                  onClick={handleCopyChecksum}
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-[#182E3A] hover:bg-slate-200/70 transition-colors"
                  title="Copy SHA-256 Checksum"
                  aria-label="Copy SHA-256 Checksum"
                >
                  {copiedChecksum ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
