import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ShieldCheck, Copy, Check, Smartphone, AlertCircle } from 'lucide-react';
import { APP_CONFIG } from '../constants/config';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useLatestRelease } from '../hooks/useLatestRelease';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const latestRelease = useLatestRelease();
  const release = APP_CONFIG.release.isAvailable ? APP_CONFIG.release : latestRelease;
  const dialogRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  const isReleaseReady = Boolean(release.isAvailable && release.downloadUrl);

  const handleCopyChecksum = () => {
    if (!release.sha256Checksum) return;
    navigator.clipboard.writeText(release.sha256Checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  const handleDownloadClick = () => {
    if (!isReleaseReady || !release.downloadUrl) return;
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
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
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 z-10 outline-none my-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
            aria-describedby="modal-description"
          >
            {/* Header Accent */}
            <div className="h-2 w-full bg-gradient-to-r from-[#F99773] via-[#6D28D9] to-[#87D4CA]" />

            <div className="p-6 sm:p-8">
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#182E3A]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & Icon */}
              <div className="flex items-start gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#F99773]/15 flex items-center justify-center text-[#F99773] flex-shrink-0 mt-0.5">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="modal-headline" className="text-xl sm:text-2xl font-bold text-[#182E3A] font-['Plus_Jakarta_Sans'] leading-tight">
                    Download DotyNotes for Android
                  </h3>
                  <p id="modal-description" className="text-sm text-slate-600 mt-1">
                    Do you want to download DotyNotes APK for your Android device?
                  </p>
                </div>
              </div>

              {/* Confirmation Specs Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Version</span>
                  <span className="text-slate-800 font-semibold">{release.version}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Platform</span>
                  <span className="text-slate-800 font-semibold">Android APK</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Approx. Size</span>
                  <span className="text-slate-800 font-semibold">{release.fileSizeFormatted}</span>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Package ID</span>
                    <code className="font-mono text-slate-700 font-semibold text-[11px]">{release.packageId}</code>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block mb-0.5">Compatibility</span>
                    <span className="text-slate-700 font-medium">{release.minAndroidVersion}</span>
                  </div>
                </div>
              </div>

              {/* Release Preparation Notice if not yet published */}
              {!isReleaseReady && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 mb-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-sm text-amber-950 mb-1">
                        Release in Preparation (v{release.version})
                      </span>
                      <p className="text-amber-800/90 leading-relaxed">
                        The signed standalone APK build has been generated and is awaiting final release verification and official publishing. Direct download will be activated as soon as the release is published.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Cancel
                </button>

                {isReleaseReady ? (
                  <a
                    href={release.downloadUrl!}
                    download={release.apkFileName}
                    onClick={handleDownloadClick}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[#182E3A] text-white font-semibold text-sm hover:bg-[#234253] transition-all shadow-md hover:shadow-lg active:scale-[0.99] group focus:outline-none focus:ring-2 focus:ring-[#182E3A] focus:ring-offset-2"
                  >
                    <Download className="w-4 h-4 text-[#F99773] group-hover:translate-y-0.5 transition-transform" />
                    <span>Download APK</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-slate-200 text-slate-400 font-semibold text-sm cursor-not-allowed"
                    title="Download will be available once the official release is published"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>Download APK</span>
                  </button>
                )}
              </div>

              {/* Sideloading Instructions */}
              <div className="border-t border-slate-100 mt-6 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Direct Sideloading Instructions
                </h4>

                <ol className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      1
                    </span>
                    <span>Download the <strong>.apk</strong> package to your Android device.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      2
                    </span>
                    <span>Allow <em>"Install unknown apps"</em> for your browser if prompted by Android.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      3
                    </span>
                    <span>Open DotyNotes and enable <em>"Appear on top"</em> for the Floating Dot overlay.</span>
                  </li>
                </ol>
              </div>

              {/* SHA-256 Checksum */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">SHA-256 Checksum</span>
                  {release.sha256Checksum ? (
                    <span className="block font-mono text-[11px] text-slate-600 truncate max-w-[280px] sm:max-w-md">
                      {release.sha256Checksum}
                    </span>
                  ) : (
                    <span className="block text-[11px] text-slate-500 italic">
                      Available upon official build publication
                    </span>
                  )}
                </div>
                {release.sha256Checksum && (
                  <button
                    type="button"
                    onClick={handleCopyChecksum}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-[#182E3A] hover:bg-slate-200/70 transition-colors"
                    title="Copy SHA-256 Checksum"
                    aria-label="Copy SHA-256 Checksum"
                  >
                    {copiedChecksum ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
