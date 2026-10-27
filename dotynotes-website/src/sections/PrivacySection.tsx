import React from 'react';
import { ShieldCheck, HardDrive, WifiOff, UserX, FileJson, AlertTriangle, ArrowRight } from 'lucide-react';

interface PrivacySectionProps {
  onOpenPrivacyModal?: () => void;
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({ onOpenPrivacyModal }) => {
  return (
    <section id="privacy" className="py-20 sm:py-32 bg-[#FAF9F6] border-b border-slate-200/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Honest, Transparent Privacy</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] tracking-tight">
            Your notes. On your device.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            DotyNotes is architected around a simple principle: your thoughts belong to you alone. We don't host database servers, track your keystrokes, or force you into a cloud subscription.
          </p>
        </div>

        {/* 4 Pillars of Offline-First Security */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#182E3A]">Local SQLite Database</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Notes are written locally on your Android device using SQLite with Write-Ahead Logging (WAL) mode for maximum reliability and read performance.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <UserX className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#182E3A]">No Account Required</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No email signup walls, no phone number verification, and no passwords to remember. Download the APK and start typing within 3 seconds.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <WifiOff className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#182E3A]">Zero Telemetry Trackers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              DotyNotes contains zero advertising SDKs, zero user tracking beacons, and zero third-party analytics frameworks. No keystroke leaves your phone.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <FileJson className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#182E3A]">Local JSON Backup</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Export and restore versioned JSON backup files at any time through Settings. You are never locked into proprietary formats or locked out of your data.
            </p>
          </div>

        </div>

        {/* Honest Architecture Card: Local Storage vs Encryption */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 p-6 sm:p-10 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Data Integrity Standard
              </span>
              <h3 className="text-xl font-bold text-[#182E3A] font-['Plus_Jakarta_Sans']">
                Clear & Honest Distinction: Local Storage Isolation
              </h3>
            </div>
            {onOpenPrivacyModal && (
              <button
                onClick={onOpenPrivacyModal}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F99773] hover:text-[#e07f5c] transition-colors"
              >
                <span>Read Full Privacy Policy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                How Android Sandbox Protects You
              </h4>
              <p>
                Android uses Linux application sandboxing to isolate DotyNotes' SQLite database inside its private data directory (<code className="bg-slate-100 px-1 py-0.5 rounded">/data/data/com.dotynotes.app/</code>). Other applications cannot read your notes without root privileges or explicit backup export.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Honesty Without Exaggerated Claims
              </h4>
              <p>
                We do not make false marketing claims like "military-grade security" or "impossible to hack". Local SQLite databases on non-encrypted legacy devices are subject to device-level access. We encourage enabling full-device encryption and lock screen security on your Android phone.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
