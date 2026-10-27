import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';
import { APP_CONFIG } from '../constants/config';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 z-10 flex flex-col overflow-hidden outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="privacy-title" className="font-bold text-lg text-[#182E3A] font-['Plus_Jakarta_Sans']">
                    DotyNotes Privacy Policy
                  </h3>
                  <p className="text-xs text-slate-500">Official Policy • Version {APP_CONFIG.release.version}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-sm text-slate-600 leading-relaxed">
              
              <div className="space-y-2">
                <h4 className="font-bold text-base text-[#182E3A]">1. Overview</h4>
                <p>
                  DotyNotes is intentionally architected as a personal, offline-first Android note-taking application. This policy details what data the app creates, how it is stored locally, what permissions are requested, and how your privacy is guaranteed.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-base text-[#182E3A]">2. Information You Create</h4>
                <p>All data created within DotyNotes stays on your device:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>Notes & Text:</strong> Titles, body content, rich-text styling (bold, italic, underline), tags, and completion states.</li>
                  <li><strong>Checklists:</strong> Interactive task checkbox items and list bullets.</li>
                  <li><strong>Reminders:</strong> Scheduled alert timestamps and reminder configurations.</li>
                  <li><strong>Preferences:</strong> Default sticky color choices, haptic feedback toggles, and floating handle settings.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-base text-[#182E3A]">3. How Data Is Stored</h4>
                <p>
                  DotyNotes stores all user-created application data locally on your device using a local SQLite database (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">expo-sqlite</code> with Write-Ahead Logging). No database server, external hosting, or remote cloud storage is used for your personal data.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-base text-[#182E3A]">4. Data Transmission & Analytics</h4>
                <p>
                  DotyNotes does not transmit your personal notes, reminders, or preferences off your device. The application contains zero advertising frameworks, zero telemetry trackers, and zero third-party analytics SDKs. No background network requests are made to sync or upload your notes.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-base text-[#182E3A]">5. Local Notifications & Reminders</h4>
                <p>
                  All notification schedules and alert payloads are generated and triggered purely locally on your device using Android AlarmManager. Notification details never pass through external push servers or notification relays. You can disable reminders at any time in Settings.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-base text-[#182E3A]">6. Device Permissions</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>SYSTEM_ALERT_WINDOW (Appear on top):</strong> Optional. Used solely to display the native Floating Dot and Quick Pad overlay over other apps.</li>
                  <li><strong>POST_NOTIFICATIONS:</strong> Optional on Android 13+. Used solely to display scheduled note alert reminders.</li>
                  <li><strong>SCHEDULE_EXACT_ALARM:</strong> Used to trigger alarms exactly on time without server dependencies.</li>
                </ul>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#182E3A] text-white text-xs font-semibold hover:bg-[#234253] transition-colors"
              >
                Close Policy
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
