import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ArrowRight, Pin, Clock, CheckCircle2, Circle, ShieldCheck, Sparkles, Smartphone } from 'lucide-react';
import { PASTEL_NOTE_COLORS } from '../constants/theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface HeroSectionProps {
  onOpenDownloadModal: () => void;
  onOpenQuickPad?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenDownloadModal, onOpenQuickPad }) => {
  const prefersReducedMotion = useReducedMotion();

  // Interactive Checklist inside the Hero preview
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, text: 'Confirm offline SQLite sync test', done: true },
    { id: 2, text: 'Verify Floating Dot overlay permission', done: true },
    { id: 3, text: 'Schedule weekend reminder alarm', done: false },
    { id: 4, text: 'Pack favorite pastel sticky colors', done: false },
  ]);

  const toggleCheck = (id: number) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  return (
    <section id="product" className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#F99773]/10 via-[#BFAFF8]/15 to-[#A4E7C0]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Editorial Story */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-center lg:text-left">
            {/* Native Android Offline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/[0.04] border border-slate-900/10 text-xs font-semibold text-slate-800">
              <span className="flex h-2 w-2 rounded-full bg-[#FF6346] animate-pulse" />
              <span>Offline-First Android Notes</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-normal">No Account Needed</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#182E3A] font-['Plus_Jakarta_Sans'] leading-[1.12]">
              Your thoughts.{' '}
              <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#FF6346] via-[#F99773] to-[#6D28D9]">
                Always within reach.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
              Capture ideas in seconds. Organize them your way. Keep your notes close, even when you leave the app with our native Android Floating Dot.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onOpenDownloadModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-[#182E3A] text-white font-semibold text-base hover:bg-[#234253] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] group focus:outline-none focus:ring-2 focus:ring-[#182E3A] focus:ring-offset-2"
              >
                <Download className="w-5 h-5 text-[#F99773] group-hover:translate-y-0.5 transition-transform" />
                <span>Download for Android</span>
              </button>

              <a
                href="#playground"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white text-slate-700 font-semibold text-base hover:bg-slate-50 border border-slate-200 transition-all shadow-xs hover:shadow active:scale-[0.98] group"
              >
                <span>Interactive Sandbox</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Verified Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Local SQLite Storage</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Native Android Quick Pad</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>On-Device Reminders</span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Product Composition */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-[500px] h-[520px] sm:h-[560px]">
              
              {/* Note 1: Pinned Lavender Note (Back / Top Right) */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20, rotate: 3 }}
                animate={{ opacity: 1, y: 0, rotate: 3 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute top-0 right-2 sm:right-6 w-64 sm:w-72 rounded-2xl p-5 shadow-lg border transition-transform hover:scale-102 hover:z-20 cursor-default"
                style={{
                  backgroundColor: PASTEL_NOTE_COLORS[4].bg, // Lavender
                  borderColor: PASTEL_NOTE_COLORS[4].border,
                  color: PASTEL_NOTE_COLORS[4].text,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                    Pinned Idea
                  </span>
                  <div className="w-6 h-6 rounded-full bg-white/40 flex items-center justify-center">
                    <Pin className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
                <h2 className="text-base font-bold mb-1">Product Vision 2026</h2>
                <p className="text-xs leading-relaxed opacity-90">
                  Build the most tactile, offline-first notes experience on Android. Zero trackers, zero cloud dependencies. Pure peace of mind.
                </p>
                <div className="mt-3 text-[10px] opacity-70">Saved locally • SQLite WAL</div>
              </motion.div>

              {/* Note 2: Mint Checklist Note (Center Left) */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute top-28 left-0 sm:left-4 w-72 sm:w-80 rounded-2xl p-5 shadow-xl border z-10 hover:z-20 transition-transform cursor-default"
                style={{
                  backgroundColor: PASTEL_NOTE_COLORS[1].bg, // Mint
                  borderColor: PASTEL_NOTE_COLORS[1].border,
                  color: PASTEL_NOTE_COLORS[1].text,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                    Interactive Checklist
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/40 font-semibold">
                    {checklistItems.filter((i) => i.done).length} / {checklistItems.length}
                  </span>
                </div>
                <h2 className="text-base font-bold mb-2.5">Pre-Launch Verification</h2>
                
                <div className="space-y-2">
                  {checklistItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className="w-full flex items-center gap-2.5 text-xs text-left group transition-opacity"
                    >
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-[#137333] flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 opacity-50 group-hover:opacity-100 flex-shrink-0" />
                      )}
                      <span className={item.done ? 'line-through opacity-60' : 'font-medium'}>
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-3.5 pt-2 border-t border-black/10 text-[10px] opacity-70">
                  Tap checkboxes to test live state!
                </div>
              </motion.div>

              {/* Note 3: Pastel Pink Reminder Note (Bottom Right) */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 40, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 2 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="absolute bottom-6 right-0 sm:right-4 w-68 sm:w-76 rounded-2xl p-4 sm:p-5 shadow-lg border z-10 hover:z-20 transition-transform cursor-default"
                style={{
                  backgroundColor: PASTEL_NOTE_COLORS[2].bg, // Pink
                  borderColor: PASTEL_NOTE_COLORS[2].border,
                  color: PASTEL_NOTE_COLORS[2].text,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Scheduled Alert
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/40 font-semibold">
                    Today 4:30 PM
                  </span>
                </div>
                <h2 className="text-sm font-bold mb-1">Architecture Review</h2>
                <p className="text-xs leading-relaxed opacity-90">
                  Verify on-device exact alarm scheduling using Android AlarmManager. No network delay.
                </p>
              </motion.div>

              {/* Floating Dot Simulation Peek Anchor */}
              <motion.button
                onClick={onOpenQuickPad}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-xl bg-[#182E3A] text-white shadow-2xl border border-white/20 flex items-center gap-2 group"
                title="Click to simulate Floating Dot"
                aria-label="Open Floating Dot Quick Pad"
              >
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6346] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FF6346]" />
                </span>
                <span className="text-xs font-bold text-slate-100 group-hover:text-[#F99773] transition-colors pr-1">
                  Try Floating Dot
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#F99773]" />
              </motion.button>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
