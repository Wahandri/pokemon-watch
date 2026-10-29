import React, { ReactNode } from 'react';
import { Watch, Maximize2, Minimize2 } from 'lucide-react';

interface WatchFrameProps {
  children: ReactNode;
  isWatchBezelVisible: boolean;
  onToggleBezel: () => void;
  onCrownClick?: () => void;
}

export const WatchFrame: React.FC<WatchFrameProps> = ({
  children,
  isWatchBezelVisible,
  onToggleBezel,
  onCrownClick
}) => {
  if (!isWatchBezelVisible) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
        {/* Fullscreen circular display viewport */}
        <div className="relative w-[min(100vw,100vh)] h-[min(100vw,100vh)] max-w-[466px] max-h-[466px] rounded-full overflow-hidden shadow-2xl bg-black">
          {children}
        </div>

        {/* Floating toggle for bezel preview */}
        <button
          onClick={onToggleBezel}
          aria-label="Ver marco Xiaomi Watch 2"
          title="Ver marco Xiaomi Watch 2"
          className="absolute top-4 right-4 z-50 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-transform active:scale-95"
        >
          <Watch className="w-3.5 h-3.5 text-emerald-400" />
          <span>Marco Xiaomi Watch 2</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-6 px-4 overflow-hidden select-none">
      {/* Top Quick Bar */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-xs text-slate-400 z-50 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-200">Xiaomi Watch 2 (Wear OS)</span>
          <span className="hidden sm:inline text-slate-500">· 466x466 AMOLED · Sensor Giroscopio</span>
        </div>
        <button
          onClick={onToggleBezel}
          aria-label="Pantalla completa reloj"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs transition-colors"
        >
          <Maximize2 className="w-3 h-3 text-cyan-400" />
          <span>Pantalla Reloj Sola</span>
        </button>
      </div>

      {/* Realistic Xiaomi Watch 2 Hardware Chassis */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        {/* Top Silicone Strap */}
        <div className="w-32 h-20 bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-800 rounded-t-xl shadow-inner border-t border-neutral-700/50 flex flex-col items-center justify-start pt-2 gap-2">
          <div className="w-8 h-1.5 rounded-full bg-neutral-950/80" />
          <div className="w-8 h-1.5 rounded-full bg-neutral-950/80" />
        </div>

        {/* Watch Body & Bezel */}
        <div className="relative">
          {/* Hardware Crown Button (Rotary Dial) */}
          <button
            onClick={onCrownClick}
            title="Corona digital Xiaomi (Pausar / Menú)"
            aria-label="Corona física digital Xiaomi"
            className="absolute -right-3.5 top-1/3 -translate-y-1/2 w-4 h-12 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-800 rounded-r-md border border-neutral-600 shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all z-20 flex flex-col justify-around py-1 items-center"
          >
            <div className="w-2 h-0.5 bg-neutral-400" />
            <div className="w-2 h-0.5 bg-neutral-400" />
            <div className="w-2 h-0.5 bg-neutral-400" />
          </button>

          {/* Lower Secondary Button */}
          <button
            onClick={onCrownClick}
            title="Botón secundario de acción"
            aria-label="Botón secundario de acción"
            className="absolute -right-2.5 top-2/3 -translate-y-1/2 w-3 h-8 bg-gradient-to-r from-neutral-700 via-neutral-800 to-neutral-900 rounded-r-sm border border-neutral-700 shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all z-20"
          />

          {/* Outer Black Titanium Bezel (480px) */}
          <div className="w-[380px] h-[380px] sm:w-[466px] sm:h-[466px] rounded-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 p-3 sm:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.2)] border border-neutral-700/60 flex items-center justify-center">
            {/* Inner AMOLED Bezel Ring */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-black shadow-[inset_0_0_15px_rgba(0,0,0,0.95)]">
              {children}
            </div>
          </div>
        </div>

        {/* Bottom Silicone Strap */}
        <div className="w-32 h-20 bg-gradient-to-t from-neutral-800 via-neutral-900 to-neutral-800 rounded-b-xl shadow-inner border-b border-neutral-700/50 flex flex-col items-center justify-end pb-2 gap-2">
          <div className="w-8 h-1.5 rounded-full bg-neutral-950/80" />
          <div className="w-8 h-1.5 rounded-full bg-neutral-950/80" />
        </div>
      </div>
    </div>
  );
};
