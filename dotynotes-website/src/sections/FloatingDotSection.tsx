import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Shield, Zap, ArrowRight, Maximize2, X, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { AndroidMockup } from '../components/AndroidMockup';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface FloatingDotSectionProps {
  onTriggerQuickPad?: () => void;
}

interface FloatingDotScenario {
  id: string;
  label: string;
  title: string;
  caption: string;
  badge: string;
  image: string;
  alt: string;
  description: string;
}

const FLOATING_DOT_SCENARIOS: FloatingDotScenario[] = [
  {
    id: 'android',
    label: 'Underlying Android App',
    title: 'Quick Pad Overlay',
    caption: 'Quick Pad Overlay',
    badge: '01 / Active Capture',
    image: '/images/floating-dot/android-quick-pad.webp',
    alt: 'Authentic DotyNotes Android screenshot showing Quick Pad overlay open on Android home screen',
    description: 'The native Quick Pad drawer opened seamlessly on top of your screen to record thoughts instantly.',
  },
  {
    id: 'chrome',
    label: 'Chrome Browser',
    title: 'Multitasking with Chrome',
    caption: 'Multitasking with Chrome',
    badge: '02 / Web Research',
    image: '/images/floating-dot/chrome-floating-dot.webp',
    alt: 'Original DotyNotes Floating Dot while browsing in Chrome',
    description: 'The discreet Floating Dot docked unobtrusively on the screen edge while reading articles in Chrome.',
  },
  {
    id: 'ereader',
    label: 'E-Reader',
    title: 'Immersion with E-Reader',
    caption: 'Immersion with E-Reader',
    badge: '03 / Deep Reading',
    image: '/images/floating-dot/ereader-floating-dot.webp',
    alt: 'DotyNotes Floating Dot while reading an e-book in an E-Reader',
    description: 'Capture quotes and book takeaways without breaking focus or leaving your reading application.',
  },
  {
    id: 'team-chat',
    label: 'Team Chat',
    title: 'Instant Access in Team Chat',
    caption: 'Instant Access in Team Chat',
    badge: '04 / Messaging & Work',
    image: '/images/floating-dot/team-chat-floating-dot.webp',
    alt: 'DotyNotes Floating Dot during a team chat conversation',
    description: 'Jot down meeting action items and reminders without switching away from team messaging conversations.',
  },
];

export const FloatingDotSection: React.FC<FloatingDotSectionProps> = ({ onTriggerQuickPad }) => {
  // State for active scenario in phone preview
  const [activeScenarioId, setActiveScenarioId] = useState<string>('android');
  
  // State for fullscreen lightbox (null = closed, number = scenario index)
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);

  const activeScenario = FLOATING_DOT_SCENARIOS.find((s) => s.id === activeScenarioId) || FLOATING_DOT_SCENARIOS[0];
  const activeIndex = FLOATING_DOT_SCENARIOS.findIndex((s) => s.id === activeScenarioId);

  const lightboxRef = useFocusTrap<HTMLDivElement>({
    isOpen: fullscreenIdx !== null,
    onClose: () => setFullscreenIdx(null),
  });

  const handlePrevFullscreen = useCallback(() => {
    setFullscreenIdx((prev) => (prev === null ? null : (prev - 1 + FLOATING_DOT_SCENARIOS.length) % FLOATING_DOT_SCENARIOS.length));
  }, []);

  const handleNextFullscreen = useCallback(() => {
    setFullscreenIdx((prev) => (prev === null ? null : (prev + 1) % FLOATING_DOT_SCENARIOS.length));
  }, []);

  // Keyboard navigation for fullscreen lightbox modal (arrow keys)
  useEffect(() => {
    if (fullscreenIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevFullscreen();
      if (e.key === 'ArrowRight') handleNextFullscreen();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenIdx, handlePrevFullscreen, handleNextFullscreen]);

  // Handle clicking "View Fullscreen" on a card: selects scenario and opens fullscreen
  const handleOpenFullscreenForScenario = (index: number) => {
    setActiveScenarioId(FLOATING_DOT_SCENARIOS[index].id);
    setFullscreenIdx(index);
  };

  return (
    <section id="floating-dot" className="py-20 sm:py-28 bg-[#FAF9F6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6346]/10 text-[#FF6346] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#FF6346] animate-pulse" />
            <span>DotyNotes Signature Feature</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] tracking-tight">
            The Native Android Floating Dot
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Never lose your train of thought while browsing, messaging, or reading. The native Android Floating Dot sits discreetly at the edge of your screen, ready to slide out Quick Pad without leaving your current app.
          </p>
        </div>

        {/* Main Interactive Layout: Phone Showcase + 4 Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start mb-16">
          
          {/* Left Column: Interactive Phone Preview with Scenario Tabs */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            {/* Tab Navigation above the Phone */}
            <div
              className="w-full max-w-[370px] flex items-center justify-between gap-1 mb-4 p-1.5 rounded-2xl bg-slate-200/70 backdrop-blur-xs text-xs font-medium"
              role="tablist"
              aria-label="Floating Dot multitasking scenarios"
            >
              {FLOATING_DOT_SCENARIOS.map((scenario) => {
                const isActive = activeScenarioId === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setActiveScenarioId(scenario.id)}
                    role="tab"
                    aria-selected={isActive}
                    className={`flex-1 px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all text-center truncate ${
                      isActive
                        ? 'bg-[#182E3A] text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                    }`}
                  >
                    {scenario.label}
                  </button>
                );
              })}
            </div>

            {/* Android Device Mockup housing Authentic Screenshot */}
            <div className="w-full max-w-[340px] sm:max-w-[370px]">
              <AndroidMockup hideStatusBar={true}>
                <div
                  onClick={() => setFullscreenIdx(activeIndex >= 0 ? activeIndex : 0)}
                  className="relative w-full h-[580px] sm:h-[620px] bg-slate-950 overflow-hidden cursor-pointer group flex items-center justify-center"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFullscreenIdx(activeIndex >= 0 ? activeIndex : 0);
                    }
                  }}
                  aria-label={`Inspect ${activeScenario.caption} in fullscreen`}
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeScenario.id}
                      src={activeScenario.image}
                      alt={activeScenario.alt}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="w-full h-full object-contain block select-none pointer-events-none"
                    />
                  </AnimatePresence>

                  {/* Click to Inspect Overlay Prompt */}
                  <div className="absolute inset-0 bg-[#182E3A]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[#182E3A] text-xs font-bold shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                      <Maximize2 className="w-3.5 h-3.5 text-[#FF6346]" />
                      Click to Inspect Fullscreen
                    </span>
                  </div>
                </div>
              </AndroidMockup>
            </div>

            {/* Helper label below phone */}
            <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-500">
              <Smartphone className="w-3.5 h-3.5 text-[#FF6346]" />
              <span>Authentic DotyNotes UI &bull; Tap preview to zoom</span>
            </div>

          </div>

          {/* Right Column: 4 Feature Cards + Architecture Badges */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* The Four Scenario Feature Cards in a 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
              {FLOATING_DOT_SCENARIOS.map((scenario, index) => {
                const isSelected = activeScenarioId === scenario.id;
                return (
                  <motion.div
                    key={scenario.id}
                    onClick={() => setActiveScenarioId(scenario.id)}
                    whileHover={{ y: -2 }}
                    className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-[#FF6346] shadow-md ring-2 ring-[#FF6346]/20'
                        : 'bg-white/80 hover:bg-white border-slate-200 shadow-2xs hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Badge & Active Indicator */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF6346]">
                          {scenario.badge}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF6346]/10 text-[#FF6346]">
                            Active In Preview
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-bold text-[#182E3A] font-['Plus_Jakarta_Sans'] mb-1.5">
                        {scenario.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {scenario.description}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400 text-[11px]">
                        {scenario.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFullscreenForScenario(index);
                        }}
                        className="font-bold text-[#182E3A] hover:text-[#FF6346] transition-colors inline-flex items-center gap-1"
                        aria-label={`View fullscreen screenshot for ${scenario.title}`}
                      >
                        View Fullscreen &rarr;
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2 text-[#FF6346]">
                  <Layers className="w-4 h-4" />
                  <span className="font-bold text-xs text-[#182E3A]">System Overlay</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Powered by native <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">SYSTEM_ALERT_WINDOW</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2 text-purple-600">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold text-xs text-[#182E3A]">Zero Switch</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Notes float above your active app without losing state.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield className="w-4 h-4" />
                  <span className="font-bold text-xs text-[#182E3A]">Customizable</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Toggle on or off anytime; adjust dock position freely.
                </p>
              </div>
            </div>

            {/* Website Edge Simulation Trigger */}
            {onTriggerQuickPad && (
              <button
                onClick={onTriggerQuickPad}
                className="w-full inline-flex items-center justify-center gap-2 p-3.5 rounded-xl bg-[#182E3A] hover:bg-[#223f4f] text-white text-xs sm:text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                <span>Trigger Website Edge Simulation</span>
                <ArrowRight className="w-4 h-4 text-[#F99773]" />
              </button>
            )}

          </div>

        </div>

      </div>

      {/* Full-Screen Lightbox Modal for Close Inspection */}
      <AnimatePresence>
        {fullscreenIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={() => setFullscreenIdx(null)}
          >
            <motion.div
              ref={lightboxRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={FLOATING_DOT_SCENARIOS[fullscreenIdx].title}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full max-h-[92vh] flex flex-col items-center outline-none"
            >
              {/* Modal Top Bar */}
              <div className="w-full flex items-center justify-between text-white mb-3 px-2">
                <div>
                  <h4 className="font-bold text-base font-['Plus_Jakarta_Sans']">
                    {FLOATING_DOT_SCENARIOS[fullscreenIdx].title}
                  </h4>
                  <p className="text-xs text-white/70">
                    Scenario {fullscreenIdx + 1} of {FLOATING_DOT_SCENARIOS.length} &bull; {FLOATING_DOT_SCENARIOS[fullscreenIdx].label}
                  </p>
                </div>

                <button
                  onClick={() => setFullscreenIdx(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Close fullscreen modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Image Frame */}
              <div className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/10 shadow-2xl p-2">
                <img
                  src={FLOATING_DOT_SCENARIOS[fullscreenIdx].image}
                  alt={FLOATING_DOT_SCENARIOS[fullscreenIdx].alt}
                  className="max-h-[76vh] w-auto max-w-full object-contain rounded-xl"
                />

                <button
                  onClick={handlePrevFullscreen}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-xs transition-colors"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={handleNextFullscreen}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-xs transition-colors"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Description & Navigation Hint */}
              <div className="text-center text-[11px] text-white/60 mt-3">
                {FLOATING_DOT_SCENARIOS[fullscreenIdx].description} &bull; Press ESC to close
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
