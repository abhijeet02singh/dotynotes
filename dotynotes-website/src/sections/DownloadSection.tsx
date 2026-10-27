import React, { useState } from 'react';
import { Download, Check, Copy, ExternalLink } from 'lucide-react';
import { APP_CONFIG } from '../constants/config';
import StellarVortexBackground from '@/components/lightswind-pro/stellar-vortex-background';

interface DownloadSectionProps {
  onOpenDownloadModal: () => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({ onOpenDownloadModal }) => {
  const [copied, setCopied] = useState(false);
  const release = APP_CONFIG.release;

  const handleCopyChecksum = () => {
    if (!release.sha256Checksum) return;
    navigator.clipboard.writeText(release.sha256Checksum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isReleaseReady = Boolean(release.isAvailable && release.downloadUrl);

  return (
    <section id="download" className="py-20 sm:py-32 bg-[#FAF9F6] border-b border-slate-200/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main High-Impact Download Container with Blue Stellar Vortex Background */}
        <div className="rounded-3xl text-white p-8 sm:p-14 lg:p-16 shadow-2xl relative overflow-hidden bg-[#031525]">
          {/* Authentic Blue Stellar Vortex WebGL Animation Layer */}
          <StellarVortexBackground
            colors={['#021528', '#0284c7', '#38bdf8']}
            speed={1.0}
            scale={0.95}
            noiseIntensity={0.45}
            interactive={true}
            className="rounded-3xl"
          />

          {/* Restrained translucent overlay ensuring high contrast for text and controls while letting the blue satin folds radiate */}
          <div className="absolute inset-0 bg-[#02111d]/45 pointer-events-none rounded-3xl" />

          {/* Content layer above the animated background */}
          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-slate-100 text-xs font-semibold border border-white/10 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
              <span>Android APK Direct Sideloading</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight drop-shadow-md">
              Make room for your next idea.
            </h2>

            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl mx-auto drop-shadow-xs font-normal">
              Ready for focused, distraction-free notes? Download the official Android APK and start capturing your thoughts offline in seconds.
            </p>

            {/* Verified Specs Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-2 text-xs text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="text-sky-200/70">Version:</span>
                <span className="font-semibold text-white">v{release.version}</span>
              </div>
              <span className="text-sky-300/40 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sky-200/70">File Size:</span>
                <span className="font-semibold text-white">{release.fileSizeFormatted}</span>
              </div>
              <span className="text-sky-300/40 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sky-200/70">Requirement:</span>
                <span className="font-semibold text-white">{release.minAndroidVersion}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isReleaseReady ? (
                <a
                  href={release.downloadUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#F99773] text-[#182E3A] font-bold text-base hover:bg-[#faa98d] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] group"
                >
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download DotyNotes for Android</span>
                </a>
              ) : (
                <button
                  onClick={onOpenDownloadModal}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#F99773] text-[#182E3A] font-bold text-base hover:bg-[#faa98d] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] group"
                >
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download APK (Upcoming Release)</span>
                </button>
              )}

              <button
                onClick={onOpenDownloadModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base transition-colors border border-white/20 backdrop-blur-sm"
              >
                <span>Installation Guide &amp; Checksum</span>
              </button>
            </div>

            {/* Checksum Verification Snippet */}
            <div className="pt-6 border-t border-white/15 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-950/40 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <div className="text-left overflow-hidden w-full sm:w-auto">
                <span className="text-[10px] text-sky-200/80 uppercase font-bold block">SHA-256 Checksum</span>
                {release.sha256Checksum ? (
                  <span className="font-mono text-[11px] text-slate-200 truncate block max-w-xs sm:max-w-md">
                    {release.sha256Checksum}
                  </span>
                ) : (
                  <span className="text-xs text-sky-200/80 italic block">
                    Available upon official build publication
                  </span>
                )}
              </div>
              {release.sha256Checksum && (
                <button
                  onClick={handleCopyChecksum}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors flex-shrink-0 border border-white/10"
                  title="Copy SHA-256 Checksum"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {/* Release Links */}
            <div className="flex items-center justify-center gap-6 text-xs text-slate-300 pt-2">
              <a
                href={release.releaseNotesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline underline-offset-2 flex items-center gap-1 transition-colors"
              >
                Release Notes <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-sky-300/40">•</span>
              <a
                href={release.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline underline-offset-2 flex items-center gap-1 transition-colors"
              >
                Source Repository <ExternalLink className="w-3 h-3" />
              </a>
            </div>

          </div>
        </div>

        {/* 3-Step Sideloading Walkthrough Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-[#182E3A] text-white flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h4 className="font-bold text-base text-[#182E3A]">Download the APK</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tap the download button above to save <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">DotyNotes-v1.0.0.apk</code> to your device.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-[#182E3A] text-white flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h4 className="font-bold text-base text-[#182E3A]">Allow Unknown Apps</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Android may show a security prompt when installing from outside Google Play. In Settings, toggle "Allow from this source" for your browser.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="w-8 h-8 rounded-full bg-[#182E3A] text-white flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h4 className="font-bold text-base text-[#182E3A]">Launch & Start Writing</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Open DotyNotes! To activate the Floating Dot overlay companion across any app, grant the "Appear on top" permission in Settings.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
