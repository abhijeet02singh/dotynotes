import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface AndroidMockupProps {
  children: React.ReactNode;
  className?: string;
  phoneColor?: 'slate' | 'charcoal';
  hideStatusBar?: boolean;
}

export const AndroidMockup: React.FC<AndroidMockupProps> = ({
  children,
  className = '',
  phoneColor = 'slate',
  hideStatusBar = false,
}) => {
  const isDarkPhone = phoneColor === 'charcoal';

  return (
    <div
      className={`relative mx-auto rounded-[42px] p-3 shadow-2xl transition-all duration-300 ${
        isDarkPhone
          ? 'bg-slate-900 shadow-slate-950/40 ring-1 ring-slate-800'
          : 'bg-[#182E3A] shadow-[#182E3A]/25 ring-1 ring-white/20'
      } ${className}`}
      style={{
        boxShadow: '0 25px 60px -15px rgba(24, 46, 58, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
      }}
    >
      {/* Side Hardware Buttons */}
      <div className="absolute -left-[5px] top-24 h-12 w-[3px] rounded-l-sm bg-slate-700/60" />
      <div className="absolute -left-[5px] top-40 h-12 w-[3px] rounded-l-sm bg-slate-700/60" />
      <div className="absolute -right-[5px] top-28 h-16 w-[3px] rounded-r-sm bg-slate-700/60" />

      {/* Screen Frame */}
      <div className="relative overflow-hidden rounded-[32px] bg-[#FAF9F6] text-[#182E3A] flex flex-col h-full min-h-[580px] select-none border border-black/5">
        {/* Status Bar (optional, hidden when authentic screenshot has its own) */}
        {!hideStatusBar && (
          <div className="relative z-20 flex h-7 w-full items-center justify-between px-6 pt-1 text-[11px] font-semibold tracking-tight text-slate-700 bg-transparent">
            <span>9:41</span>
            
            {/* Front Camera Hole-Punch */}
            <div className="absolute left-1/2 top-2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-slate-950 ring-2 ring-slate-900/50" />

            {/* System Icons */}
            <div className="flex items-center gap-1.5 opacity-85">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <div className="flex items-center gap-0.5">
                <span className="text-[10px]">98%</span>
                <Battery className="w-3.5 h-3.5 fill-current" />
              </div>
            </div>
          </div>
        )}

        {/* Screen Content Container */}
        <div className="relative flex-1 overflow-hidden flex flex-col">
          {children}
        </div>

        {/* Android Gesture Navigation Pill */}
        {!hideStatusBar && (
          <div className="relative z-20 flex h-6 w-full items-center justify-center bg-transparent pointer-events-none">
            <div className="h-1 w-28 rounded-full bg-slate-400/50" />
          </div>
        )}
      </div>
    </div>
  );
};
