import React from 'react';

const TICKER_ITEMS = [
  'CAPTURE THOUGHTS INSTANTLY',
  'FLOATING QUICK PAD',
  'OFFLINE-FIRST NOTES',
  'RICH TEXT EDITOR',
  'SMART REMINDERS',
  'ALWAYS WITHIN REACH',
  'YOUR THOUGHTS, SAFELY ORGANIZED',
];

interface MarqueeSetProps {
  ariaHidden?: boolean;
}

const MarqueeSet: React.FC<MarqueeSetProps> = ({ ariaHidden = false }) => {
  return (
    <div className="flex items-center shrink-0" aria-hidden={ariaHidden}>
      {TICKER_ITEMS.map((item, index) => (
        <div key={`${item}-${index}`} className="flex items-center shrink-0">
          <span className="text-xs sm:text-sm md:text-base font-extrabold tracking-wider text-white uppercase whitespace-nowrap font-['Plus_Jakarta_Sans'] select-none">
            {item}
          </span>
          <span
            className="mx-5 sm:mx-8 md:mx-10 text-white/80 select-none text-xs sm:text-sm inline-block"
            aria-hidden="true"
          >
            ✳
          </span>
        </div>
      ))}
    </div>
  );
};

export const FeatureMarquee: React.FC = () => {
  return (
    <section
      aria-label="Key features marquee"
      className="w-full bg-[#F99773] overflow-hidden py-3.5 sm:py-4 select-none relative z-20 border-y border-[#F99773]/20 shadow-xs"
    >
      <div className="w-full flex overflow-hidden">
        {/* Seamless Infinite Marquee Track: Two identical sets translated by -50% */}
        <div className="animate-marquee flex items-center shrink-0">
          {/* Primary Set (Announced to screen readers) */}
          <div className="flex items-center shrink-0">
            <MarqueeSet />
            <MarqueeSet ariaHidden />
          </div>

          {/* Secondary Duplicate Set (Seamless loop transition) */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            <MarqueeSet ariaHidden />
            <MarqueeSet ariaHidden />
          </div>
        </div>
      </div>
    </section>
  );
};
