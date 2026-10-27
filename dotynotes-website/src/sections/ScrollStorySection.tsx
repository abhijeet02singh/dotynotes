import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PASTEL_NOTE_COLORS } from '../constants/theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface StoryStep {
  id: number;
  badge: string;
  title: string;
  description: string;
}

const STORY_STEPS: StoryStep[] = [
  {
    id: 1,
    badge: 'Step 1 • The Scattered Spark',
    title: 'A storm of fragmented ideas',
    description: 'Thoughts happen anywhere — in meetings, transit, or mid-conversation. Without a quick way to capture them, great ideas slip away.',
  },
  {
    id: 2,
    badge: 'Step 2 • Colorful Alignment',
    title: 'Instant organization with pastels',
    description: 'Transform mental clutter into visual harmony. DotyNotes automatically applies gentle pastel schemes to separate work, projects, and personal errands.',
  },
  {
    id: 3,
    badge: 'Step 3 • Pinning the Priority',
    title: 'Elevate what demands focus',
    description: 'Pin the critical tasks to the top of your workspace. Pinned notes anchor firmly above regular entries so you never lose your North Star.',
  },
  {
    id: 4,
    badge: 'Step 4 • Actionable Momentum',
    title: 'Checklists that feel satisfying',
    description: 'Turn lists into momentum. Check off items with instant feedback, tracking completion without cumbersome project management overhead.',
  },
  {
    id: 5,
    badge: 'Step 5 • Always Within Reach',
    title: 'The native Floating Dot companion',
    description: 'Leave the app to read, chat, or browse. The Floating Dot stays subtly pinned to your screen edge, ready to capture your next thought in a single tap.',
  },
];

export const ScrollStorySection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const current = STORY_STEPS[activeStep];

  return (
    <section className="py-20 sm:py-32 bg-[#182E3A] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-[#6D28D9]/20 via-[#F99773]/15 to-[#87D4CA]/20 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-[#F99773]" />
            <span>Interactive Product Journey</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight">
            From Chaos to Clarity
          </h2>
          <p className="text-base sm:text-lg text-slate-300">
            Watch how DotyNotes guides a fleeting thought into an organized, actionable note.
          </p>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex items-center justify-center gap-2 mb-12 overflow-x-auto pb-2" role="tablist">
          {STORY_STEPS.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeStep === idx
                  ? 'bg-white text-[#182E3A] shadow-lg scale-105'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
              role="tab"
              aria-selected={activeStep === idx}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeStep === idx ? 'bg-[#182E3A] text-white' : 'bg-white/20'
              }`}>
                {idx + 1}
              </span>
              <span className="hidden sm:inline">{step.badge.split('• ')[1]}</span>
            </button>
          ))}
        </div>

        {/* Main Interactive Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left: Step Explanatory Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F99773]">
                {current.badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-white">
                {current.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {current.description}
              </p>

              <div className="pt-4 flex items-center justify-between border-t border-white/10">
                <span className="text-xs text-slate-400">Step {activeStep + 1} of 5</span>
                
                <div className="flex items-center gap-2">
                  <button
                    disabled={activeStep === 0}
                    onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={activeStep === STORY_STEPS.length - 1}
                    onClick={() => setActiveStep((prev) => Math.min(STORY_STEPS.length - 1, prev + 1))}
                    className="px-3 py-1.5 rounded-lg bg-[#F99773] text-[#182E3A] text-xs font-bold hover:bg-[#faaa8e] disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Dynamic Visual Canvas */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="relative w-full max-w-lg h-[400px] rounded-3xl bg-white/5 border border-white/10 p-6 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                
                {/* Step 1: Scattered Thoughts */}
                {activeStep === 0 && (
                  <motion.div
                    key="step-0"
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full h-full flex items-center justify-center"
                  >
                    <div className="absolute -top-2 left-6 p-4 rounded-xl bg-slate-800 text-slate-300 text-xs shadow transform -rotate-6 border border-slate-700 w-44">
                      "Call supplier about inventory..."
                    </div>
                    <div className="absolute bottom-6 left-12 p-4 rounded-xl bg-slate-800 text-slate-300 text-xs shadow transform rotate-4 border border-slate-700 w-48">
                      "Remember API keys on Thursday"
                    </div>
                    <div className="absolute top-12 right-6 p-4 rounded-xl bg-slate-800 text-slate-300 text-xs shadow transform rotate-12 border border-slate-700 w-40">
                      "Buy organic milk"
                    </div>
                    <div className="text-center p-6 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-xs max-w-xs">
                      <p className="text-xs text-slate-400">Random thought fragments before organization</p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Categorized into Pastels */}
                {activeStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-2 gap-4 w-full"
                  >
                    <div
                      className="p-4 rounded-2xl border shadow-md"
                      style={{
                        backgroundColor: PASTEL_NOTE_COLORS[0].bg,
                        borderColor: PASTEL_NOTE_COLORS[0].border,
                        color: PASTEL_NOTE_COLORS[0].text,
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase opacity-75">Work</span>
                      <h4 className="font-bold text-xs mt-1 mb-1">Supplier Call</h4>
                      <p className="text-[11px] opacity-85">Check inventory update</p>
                    </div>

                    <div
                      className="p-4 rounded-2xl border shadow-md"
                      style={{
                        backgroundColor: PASTEL_NOTE_COLORS[1].bg,
                        borderColor: PASTEL_NOTE_COLORS[1].border,
                        color: PASTEL_NOTE_COLORS[1].text,
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase opacity-75">Personal</span>
                      <h4 className="font-bold text-xs mt-1 mb-1">Weekly Groceries</h4>
                      <p className="text-[11px] opacity-85">Organic milk & fruit</p>
                    </div>

                    <div
                      className="p-4 rounded-2xl border shadow-md"
                      style={{
                        backgroundColor: PASTEL_NOTE_COLORS[2].bg,
                        borderColor: PASTEL_NOTE_COLORS[2].border,
                        color: PASTEL_NOTE_COLORS[2].text,
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase opacity-75">Reminders</span>
                      <h4 className="font-bold text-xs mt-1 mb-1">API Credentials</h4>
                      <p className="text-[11px] opacity-85">Update staging vault</p>
                    </div>

                    <div
                      className="p-4 rounded-2xl border shadow-md"
                      style={{
                        backgroundColor: PASTEL_NOTE_COLORS[4].bg,
                        borderColor: PASTEL_NOTE_COLORS[4].border,
                        color: PASTEL_NOTE_COLORS[4].text,
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase opacity-75">Projects</span>
                      <h4 className="font-bold text-xs mt-1 mb-1">DotyNotes Release</h4>
                      <p className="text-[11px] opacity-85">V1.0.0 APK Build</p>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Pinned Priority */}
                {activeStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full space-y-4"
                  >
                    <div
                      className="p-5 rounded-2xl border shadow-xl flex items-start justify-between relative ring-2 ring-[#F99773]"
                      style={{
                        backgroundColor: PASTEL_NOTE_COLORS[4].bg,
                        borderColor: PASTEL_NOTE_COLORS[4].border,
                        color: PASTEL_NOTE_COLORS[4].text,
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Top Priority</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/40 font-bold">PINNED</span>
                        </div>
                        <h4 className="text-base font-bold">DotyNotes Android V1.0.0 Release</h4>
                        <p className="text-xs opacity-90 mt-1">This note stays firmly fixed at the top of your screen.</p>
                      </div>
                      <div className="p-2 rounded-full bg-white/50 text-[#6D28D9]">
                        <Pin className="w-5 h-5 fill-current" />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/10 border border-white/5 opacity-50 text-xs text-slate-300">
                      Standard note below pinned priorities...
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Checklist Momentum */}
                {activeStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <div
                      className="p-5 rounded-2xl border shadow-lg"
                      style={{
                        backgroundColor: PASTEL_NOTE_COLORS[1].bg,
                        borderColor: PASTEL_NOTE_COLORS[1].border,
                        color: PASTEL_NOTE_COLORS[1].text,
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider">Action Items</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/50">3/3 Completed</span>
                      </div>
                      <div className="space-y-2.5 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                          <span className="line-through opacity-60">Implement Write-Ahead Logging</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                          <span className="line-through opacity-60">Tune 7 pastel background shades</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                          <span className="line-through opacity-60">Connect Android overlay service</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Floating Dot Overlay */}
                {activeStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex items-center justify-center relative"
                  >
                    <div className="w-full max-w-xs p-5 rounded-2xl bg-white text-[#182E3A] shadow-2xl space-y-3 relative border border-slate-200">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FF6346]" />
                          Quick Pad Active
                        </span>
                        <span className="text-[10px] text-slate-500">Over Any App</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        "Your thoughts, always within reach."
                      </p>
                      <div className="p-2 rounded-lg bg-[#A4E7C0]/30 text-[#074820] text-[11px] font-semibold">
                        ✓ Note stored to local SQLite immediately
                      </div>
                    </div>

                    <div className="absolute -right-2 p-3 rounded-l-full bg-[#182E3A] text-white shadow-2xl border-l border-white/30 flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-[#FF6346] animate-ping" />
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
