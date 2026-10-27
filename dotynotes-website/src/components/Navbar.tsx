import React, { useState } from 'react';
import { Menu, X, Download, ShieldCheck } from 'lucide-react';
import { APP_CONFIG } from '../constants/config';
import { useScrollPosition } from '../hooks/useScrollPosition';

interface NavbarProps {
  onOpenDownloadModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDownloadModal }) => {
  const { scrolled } = useScrollPosition(16);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FAF9F6]/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[#F99773] rounded-lg p-1 -m-1"
            aria-label="DotyNotes Home"
          >
            <img
              src="/images/dotynotes-logo.svg"
              alt="DotyNotes Logo"
              className="h-8 w-auto transition-transform group-hover:scale-105"
            />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2" aria-label="Main Navigation">
            {APP_CONFIG.navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-[#182E3A] hover:bg-black/[0.04] rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <span className="hidden xl:inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium px-2.5 py-1 rounded-full bg-slate-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Offline
            </span>

            <button
              onClick={onOpenDownloadModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#182E3A] text-white text-sm font-medium hover:bg-[#234253] transition-all shadow-sm hover:shadow active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#182E3A] focus:ring-offset-2"
            >
              <Download className="w-4 h-4 text-[#F99773] group-hover:translate-y-0.5 transition-transform" />
              <span>Download for Android</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-200/50 focus:outline-none focus:ring-2 focus:ring-[#F99773]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-[#FAF9F6]/98 backdrop-blur-lg px-4 pt-3 pb-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {APP_CONFIG.navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-base font-medium text-slate-700 hover:text-[#182E3A] hover:bg-black/[0.04] rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDownloadModal();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#182E3A] text-white text-base font-medium hover:bg-[#234253] transition-all shadow-md active:scale-95"
            >
              <Download className="w-5 h-5 text-[#F99773]" />
              <span>Download DotyNotes APK</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
