import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { APP_CONFIG } from '../constants/config';

interface FooterProps {
  onOpenDownloadModal: () => void;
  onOpenPrivacyModal: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC<FooterProps> = ({ onOpenDownloadModal, onOpenPrivacyModal }) => {

  return (
    <footer className="bg-[#182E3A] text-white pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">

          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <a href="#" className="inline-block">
              <img
                src="/images/dotynotes-logo-white.png"
                alt="DotyNotes"
                className="h-8 w-auto"
                onError={(e) => {
                  // Fallback to SVG if white PNG not available
                  (e.currentTarget as HTMLImageElement).src = '/images/dotynotes-logo.svg';
                }}
              />
            </a>

            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
              {APP_CONFIG.tagline} {APP_CONFIG.supportingCopy}
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#A4E7C0]" />
              <span>Offline-first Android notes application.</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Product</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <a href="#product" className="hover:text-white transition-colors">Overview</a>
              </li>
              <li>
                <a href="#playground" className="hover:text-white transition-colors">Interactive Sandbox</a>
              </li>
              <li>
                <a href="#floating-dot" className="hover:text-white transition-colors">Floating Dot Quick Pad</a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">Feature Story</a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-white transition-colors">Interface Gallery</a>
              </li>
            </ul>
          </div>

          {/* Resources & Releases */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Releases & Docs</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <button
                  onClick={onOpenDownloadModal}
                  className="hover:text-white transition-colors text-left flex items-center gap-1"
                >
                  <span>Download APK (v{APP_CONFIG.release.version})</span>
                </button>
              </li>
              <li>
                <a
                  href={APP_CONFIG.release.releaseNotesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  Release Notes <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href={APP_CONFIG.release.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  GitHub Source <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href={APP_CONFIG.support.issuesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  Report an Issue <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Privacy & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Privacy & Legal</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <button
                  onClick={onOpenPrivacyModal}
                  className="hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <a href="#privacy" className="hover:text-white transition-colors">
                  Offline-First Architecture
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <span className="text-xs text-slate-400 block pt-1">
                  Android is a trademark of Google LLC.
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Credits & Dynamic Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {CURRENT_YEAR} DotyNotes. Designed for distraction-free thought capture.
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-slate-400">
              Package: {APP_CONFIG.release.packageId}
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
