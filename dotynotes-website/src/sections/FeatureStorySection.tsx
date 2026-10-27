import React from 'react';
import { Pin, Clock, CheckSquare, ShieldCheck, Database, Bell } from 'lucide-react';
import { PASTEL_NOTE_COLORS } from '../constants/theme';
import StellarVortexBackground from '@/components/lightswind-pro/stellar-vortex-background';

export const FeatureStorySection: React.FC = () => {
  return (
    <section id="features" className="py-20 sm:py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24 sm:space-y-36">

        {/* Section Intro */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#F99773]" />
            <span>Product Craftsmanship</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] tracking-tight">
            Designed for Clarity and Immediate Thought
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Every feature in DotyNotes exists to remove friction between having an idea and preserving it.
          </p>
        </div>

        {/* Story 1 & 2: Instant Capture + 7 Pastel Schemes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#A8C7FA]/30 text-[#042A6B] text-xs font-bold">
              01 • Instant Frictionless Capture
            </div>
            <h3 className="text-3xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] leading-tight">
              Capture thoughts in seconds. Organize with 7 dedicated pastel palettes.
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Ideas don't wait for folders, account logins, or spinning network wheels. Launch the app or tap the Floating Dot to start typing instantly.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Unlike harsh neon sticky notes, DotyNotes features seven calibrated pastel schemes tested specifically for high contrast against dark slate ink, reducing eye strain during night writing.
            </p>
            
            {/* Swatch display */}
            <div className="pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2.5">
                The 7 Signature Pastels
              </span>
              <div className="flex flex-wrap gap-2">
                {PASTEL_NOTE_COLORS.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs"
                    style={{ backgroundColor: col.bg, borderColor: col.border, color: col.text }}
                  >
                    <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                    <span>{col.name.replace('Pastel ', '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 relative">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div
                className="rounded-3xl p-6 shadow-md border transform -rotate-1 transition-transform hover:rotate-0"
                style={{
                  backgroundColor: PASTEL_NOTE_COLORS[0].bg, // Blue
                  borderColor: PASTEL_NOTE_COLORS[0].border,
                  color: PASTEL_NOTE_COLORS[0].text,
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Project Thought</span>
                <h4 className="text-lg font-bold mt-1 mb-2">Color Contrast Science</h4>
                <p className="text-xs leading-relaxed opacity-90">
                  Every pastel color pairs with an HSL-tuned ink color to exceed WCAG AA contrast standards.
                </p>
              </div>

              <div
                className="rounded-3xl p-6 shadow-md border transform rotate-2 transition-transform hover:rotate-0 mt-8"
                style={{
                  backgroundColor: PASTEL_NOTE_COLORS[1].bg, // Mint
                  borderColor: PASTEL_NOTE_COLORS[1].border,
                  color: PASTEL_NOTE_COLORS[1].text,
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Focus State</span>
                <h4 className="text-lg font-bold mt-1 mb-2">Zero Startup Latency</h4>
                <p className="text-xs leading-relaxed opacity-90">
                  Immediate app launch with Write-Ahead Logging so your cursor is active without loading bars.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Story 3 & 4: Pinned Ideas & Rich Text Hierarchy */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#6D28D9]/40 to-transparent rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-[#F99773]" />
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
                      Pinned Note Elevation
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                    Always at the Top
                  </span>
                </div>

                <div
                  className="rounded-2xl p-5 shadow-lg border"
                  style={{
                    backgroundColor: PASTEL_NOTE_COLORS[4].bg, // Lavender
                    borderColor: PASTEL_NOTE_COLORS[4].border,
                    color: PASTEL_NOTE_COLORS[4].text,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Crucial Note</span>
                    <Pin className="w-4 h-4 fill-current" />
                  </div>
                  <h4 className="text-lg font-bold mb-2">Launch Checklist & Priorities</h4>
                  <p className="text-xs sm:text-sm leading-relaxed mb-3">
                    Pinned notes stay firmly anchored at the top of your grid, ensuring your most essential ideas never get buried as your library grows.
                  </p>
                  <div className="flex gap-2 text-[11px] font-semibold">
                    <span className="px-2 py-0.5 rounded bg-white/40">Bold</span>
                    <span className="px-2 py-0.5 rounded bg-white/40 italic">Italic</span>
                    <span className="px-2 py-0.5 rounded bg-white/40 underline">Underline</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Formatted with clean inline formatting that respects your note’s visual tone.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#BFAFF8]/30 text-[#2A1468] text-xs font-bold">
              02 • Visual Priority & Typography
            </div>
            <h3 className="text-3xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] leading-tight">
              Pin what matters. Emphasize with rich formatting.
            </h3>
            <p className="text-slate-600 leading-relaxed">
              DotyNotes separates priorities visually. Pin important thoughts to keep them fixed at the head of your feed, and format your thoughts with bold, italic, and underline styling without navigating heavy menus.
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F99773]" />
                <span>Instant pin and unpin actions on any note card</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F99773]" />
                <span>Lightweight rich-text toolbar inside the editor modal</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F99773]" />
                <span>Clean word and character counter for focused drafting</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Story 5 & 6: Checklists + Local Reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card A: Interactive Checklists */}
          <div className="rounded-3xl p-8 bg-[#FAF9F6] border border-slate-200/80 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#A4E7C0]/40 flex items-center justify-center text-[#074820]">
                <CheckSquare className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">03 • Lists & Checklists</span>
              <h3 className="text-2xl font-bold text-[#182E3A] font-['Plus_Jakarta_Sans']">
                Turn sticky notes into interactive task lists
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Whether it's packing for a trip, a quick grocery run, or a sprint task checklist, tap items to strike them through with satisfying visual feedback.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">✓</div>
                <span className="line-through opacity-60">Review Android AlarmManager broadcast receiver</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800 font-medium">
                <div className="w-4 h-4 rounded border border-slate-300" />
                <span>Test offline JSON backup and restore</span>
              </div>
            </div>
          </div>

          {/* Card B: Local On-Device Reminders */}
          <div className="rounded-3xl p-8 bg-[#FAF9F6] border border-slate-200/80 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEA0CA]/30 flex items-center justify-center text-[#5B0E38]">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">04 • Local Exact Alarms</span>
              <h3 className="text-2xl font-bold text-[#182E3A] font-['Plus_Jakarta_Sans']">
                On-device reminder alerts without external push servers
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Schedule reminders that fire right on time. DotyNotes schedules alerts directly using Android's native exact alarm manager, meaning reminders work even when in Airplane Mode.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#EEA0CA]" />
                <div>
                  <span className="font-bold text-slate-800 block">Dentist Checkup</span>
                  <span className="text-[11px] text-slate-500">Today at 4:30 PM • Exact alert</span>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                Local Alarm
              </span>
            </div>
          </div>

        </div>

        {/* Story 7 & 8: Floating Dot Multitasking + Offline SQLite WAL with Blue Stellar Vortex Background */}
        <div className="rounded-3xl bg-[#031525] text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Authentic Blue Stellar Vortex WebGL Animation Layer */}
          <StellarVortexBackground
            colors={['#021528', '#0284c7', '#38bdf8']}
            speed={1.0}
            scale={0.95}
            noiseIntensity={0.45}
            interactive={true}
            className="rounded-3xl"
          />

          {/* Restrained translucent overlay ensuring high contrast while letting the blue stellar vortex folds radiate */}
          <div className="absolute inset-0 bg-[#02111d]/45 pointer-events-none rounded-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md text-slate-200 text-xs font-bold border border-white/10">
                05 • Overlay Architecture & Storage
              </div>

              <h3 className="text-3xl sm:text-4xl font-extrabold font-['Plus_Jakarta_Sans'] leading-tight drop-shadow-md">
                Quick Pad over any app. Stored safely in local SQLite.
              </h3>

              <p className="text-slate-200 text-base leading-relaxed drop-shadow-xs font-normal">
                When you grant DotyNotes the native Android overlay permission, the Floating Dot remains accessible as a discreet side handle. Tap it to slide out Quick Pad, save an idea, and close it in seconds.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 shadow-xs">
                  <Database className="w-5 h-5 text-[#A4E7C0] mb-2" />
                  <h4 className="font-bold text-sm text-white mb-1">SQLite with WAL Mode</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Write-Ahead Logging provides ultra-fast concurrent reads and durable persistence on device storage.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-[#F99773] mb-2" />
                  <h4 className="font-bold text-sm text-white mb-1">Zero Telemetry Trackers</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    No third-party analytics SDKs. No background network pings. Your thoughts stay entirely on your phone.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl p-6 bg-slate-950/45 backdrop-blur-md border border-white/15 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-slate-300">
                  <span className="font-mono text-[11px] text-sky-200/80">com.dotynotes.app</span>
                  <span className="text-emerald-400 font-semibold">Native Android</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-slate-200">SYSTEM_ALERT_WINDOW</span>
                    <span className="text-[#A4E7C0] font-mono text-[10px]">Active Overlay</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-slate-200">SCHEDULE_EXACT_ALARM</span>
                    <span className="text-[#A4E7C0] font-mono text-[10px]">Local Reminders</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-slate-200">INTERNET Permission</span>
                    <span className="text-slate-400 font-mono text-[10px]">Not Required for Notes</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
