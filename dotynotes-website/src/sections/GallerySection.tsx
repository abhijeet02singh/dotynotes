import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ScreenshotItem {
  id: string;
  caption: string;
  alt: string;
  src: string;
  badge: string;
  description: string;
}

const SCREENSHOTS: ScreenshotItem[] = [
  {
    id: 'home-notes',
    caption: 'Home Notes',
    badge: '01 / Grid & Search',
    description: 'Dynamic pastel sticky notes with masonry layout, search, and category filters.',
    alt: 'Authentic DotyNotes Android screenshot showing Home Notes grid with colorful sticky notes and search bar',
    src: '/images/screenshots/dotynotes-home-notes.webp',
  },
  {
    id: 'rich-text-editor',
    caption: 'Rich-Text Note Editor',
    badge: '02 / Note Crafting',
    description: 'Focused writing modal with bold, italic, underline, checklist, and pastel color choices.',
    alt: 'Authentic DotyNotes Android screenshot displaying the rich-text note editor and formatting toolbar',
    src: '/images/screenshots/dotynotes-rich-text-editor.webp',
  },
  {
    id: 'floating-dot-quick-pad',
    caption: 'Floating Dot & Quick Pad',
    badge: '03 / Native Overlay',
    description: 'System overlay handle accessible over any running app for instant note taking.',
    alt: 'Authentic DotyNotes Android screenshot showing the native Floating Dot and Quick Pad overlay',
    src: '/images/screenshots/dotynotes-floating-dot-quick-pad.webp',
  },
  {
    id: 'settings-themes',
    caption: 'Settings & Themes',
    badge: '04 / Customization',
    description: 'Theme customization, floating overlay controls, and offline JSON backup options.',
    alt: 'Authentic DotyNotes Android screenshot displaying application settings, themes, and preferences',
    src: '/images/screenshots/dotynotes-settings-themes.webp',
  },
];

export const GallerySection: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const lightboxRef = useFocusTrap<HTMLDivElement>({
    isOpen: selectedIdx !== null,
    onClose: () => setSelectedIdx(null),
  });

  const handlePrev = useCallback(() => {
    setSelectedIdx((prev) => (prev === null ? null : (prev - 1 + SCREENSHOTS.length) % SCREENSHOTS.length));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIdx((prev) => (prev === null ? null : (prev + 1) % SCREENSHOTS.length));
  }, []);

  // Arrow key navigation for full-screen inspection
  useEffect(() => {
    if (selectedIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIdx, handlePrev, handleNext]);

  return (
    <section id="gallery" className="py-20 sm:py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-[#F99773]" />
            <span>Interactive Interface Tour</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] tracking-tight">
            Crafted for Android. Refined to the Pixel.
          </h2>

          <p className="text-base sm:text-lg text-slate-600">
            Explore authentic screen designs of the DotyNotes Android application.
          </p>
        </div>

        {/* 4-Screenshot Responsive Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {SCREENSHOTS.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="group flex flex-col bg-[#FAF9F6] border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300"
            >
              {/* Screenshot Frame with Click-to-Inspect */}
              <div
                onClick={() => setSelectedIdx(idx)}
                className="relative cursor-pointer bg-slate-900/5 overflow-hidden flex items-center justify-center p-3 sm:p-4 group/image"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIdx(idx);
                  }
                }}
                aria-label={`Inspect ${item.caption} full screen`}
              >
                {/* Genuine Android App Screenshot */}
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  className="w-full h-auto max-h-[520px] object-contain rounded-xl shadow-md transition-transform duration-300 group-hover/image:scale-[1.02]"
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-[#182E3A]/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#182E3A] text-xs font-bold shadow-lg transform translate-y-2 group-hover/image:translate-y-0 transition-transform duration-200">
                    <Maximize2 className="w-3.5 h-3.5 text-[#F99773]" />
                    Click to Inspect
                  </span>
                </div>
              </div>

              {/* Caption and Meta */}
              <div className="p-5 flex flex-col flex-1 justify-between bg-white border-t border-slate-100">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#F99773]">
                    {item.badge}
                  </div>
                  <h3 className="text-lg font-bold text-[#182E3A] font-['Plus_Jakarta_Sans']">
                    {item.caption}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">Authentic UI</span>
                  <button
                    onClick={() => setSelectedIdx(idx)}
                    className="text-xs font-bold text-[#182E3A] hover:text-[#F99773] transition-colors inline-flex items-center gap-1"
                  >
                    View Fullscreen &rarr;
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Authentic UI Subtext */}
        <div className="mt-12 max-w-2xl mx-auto text-center">
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5">
            100% authentic mobile UI captured from live builds of DotyNotes on Android.
          </p>
        </div>

      </div>

      {/* Full-Screen Lightbox Modal for Pixel-Accurate Close Inspection */}
      <AnimatePresence>
        {selectedIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedIdx(null)}
          >
            {/* Modal Dialog Content */}
            <motion.div
              ref={lightboxRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={SCREENSHOTS[selectedIdx].caption}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full max-h-[92vh] flex flex-col items-center outline-none"
            >
              {/* Top Controls */}
              <div className="w-full flex items-center justify-between text-white mb-3 px-2">
                <div>
                  <h4 className="font-bold text-base font-['Plus_Jakarta_Sans']">
                    {SCREENSHOTS[selectedIdx].caption}
                  </h4>
                  <p className="text-xs text-white/70">
                    Screen {selectedIdx + 1} of {SCREENSHOTS.length} &bull; Authentic Android App UI
                  </p>
                </div>

                <button
                  onClick={() => setSelectedIdx(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image Frame */}
              <div className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/10 shadow-2xl p-2">
                <img
                  src={SCREENSHOTS[selectedIdx].src}
                  alt={SCREENSHOTS[selectedIdx].alt}
                  className="max-h-[76vh] w-auto max-w-full object-contain rounded-xl"
                />

                {/* Prev / Next navigation buttons */}
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-xs transition-colors"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-xs transition-colors"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom Instructions */}
              <div className="text-center text-[11px] text-white/60 mt-3">
                Use arrow keys to navigate &bull; Press ESC to close
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
