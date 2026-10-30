import React, { useState, useEffect } from 'react';
import { Footprints, Pause, Zap, Magnet } from 'lucide-react';
import { PlayerStats } from '../game/types';
import { portraitSprite, speciesName } from '../game/sprites';

interface CircularHUDProps {
  stats: PlayerStats;
  speciesId: number;
  level: number;
  berries: number;
  gyroTilt: { gamma: number; beta: number };
  isGyroActive: boolean;
  onPause: () => void;
  onCalibrateGyro: () => void;
}

export const CircularHUD: React.FC<CircularHUDProps> = ({
  stats,
  speciesId,
  level,
  berries,
  gyroTilt,
  isGyroActive,
  onPause,
  onCalibrateGyro
}) => {
  const [timeStr, setTimeStr] = useState<string>('12:00');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentTierProgress = (stats.berriesCollected % 25) / 25;
  const bubbleX = Math.max(-9, Math.min(9, (gyroTilt.gamma / 30) * 9));
  const bubbleY = Math.max(-9, Math.min(9, (gyroTilt.beta / 30) * 9));

  return (
    <div className="watch-safe absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 text-white font-mono">
      <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90">
        <circle cx="50%" cy="50%" r="47%" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="50%"
          cy="50%"
          r="47%"
          fill="none"
          stroke="#10b981"
          strokeWidth="5"
          strokeDasharray="295"
          strokeDashoffset={295 - 295 * Math.min(1, currentTierProgress)}
          strokeLinecap="round"
        />
      </svg>

      {/* Barra superior */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-3 bg-black/65 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-1 text-[14px] text-amber-300 font-bold">
            <Footprints className="w-4 h-4 text-emerald-400" />
            <span>{stats.stepsWalked}</span>
          </div>
          <span className="text-[15px] font-bold text-slate-100 tracking-wider">{timeStr}</span>
          <div className="flex items-center gap-1 text-[14px] text-amber-300">
            <span className="text-[13px]">🍓</span>
            <span className="font-bold">{berries}</span>
          </div>
        </div>
      </div>

      {/* Badges laterales */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1.5 items-start">
          {stats.activeBuff && stats.activeBuff.expiresAt > Date.now() && (
            <div className="flex items-center gap-1 bg-rose-600/90 text-white text-[10px] px-2 py-1 rounded-full border border-rose-300 shadow-md animate-bounce">
              {stats.activeBuff.type === 'speed' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  <span>x1.5</span>
                </>
              ) : stats.activeBuff.type === 'magnet' ? (
                <>
                  <Magnet className="w-3.5 h-3.5 text-pink-300" />
                  <span>IMÁN</span>
                </>
              ) : (
                <span>x2</span>
              )}
            </div>
          )}
          {stats.comboCount > 1 && (
            <div className="bg-amber-500/90 text-black font-extrabold text-[10px] px-2 py-1 rounded-full border border-amber-300 shadow-md">
              x{stats.comboCount}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onCalibrateGyro}
            aria-label="Calibrar giroscopio"
            className="pointer-events-auto relative w-10 h-10 rounded-full bg-slate-900/80 border border-slate-600 flex items-center justify-center active:scale-95 transition-transform shadow-md"
          >
            <div className="w-2.5 h-2.5 rounded-full border border-slate-500" />
            <div
              className={`absolute w-3 h-3 rounded-full shadow-sm transition-transform duration-75 ${
                isGyroActive ? 'bg-cyan-400 shadow-cyan-400/50' : 'bg-slate-500'
              }`}
              style={{ transform: `translate(${bubbleX}px, ${bubbleY}px)` }}
            />
          </button>
          <span className="text-[12px] text-slate-300 font-sans">{isGyroActive ? 'Giro ON' : 'Toca'}</span>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={onPause}
          aria-label="Pausar juego"
          className="pointer-events-auto w-10 h-10 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center text-slate-100 active:scale-95 transition-transform shadow-lg"
        >
          <Pause className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center bg-black/75 px-4 py-1.5 rounded-full border border-amber-500/30 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px]">🍓</span>
            <span
              className="text-amber-400 font-extrabold text-[18px] tracking-wider"
              style={{ fontFamily: '"Press Start 2P", monospace' }}
            >
              {stats.berriesCollected}
            </span>
          </div>
          <span className="text-[12px] text-slate-300 font-semibold tracking-wide">
            Nv {level} · {stats.totalScore} pts
          </span>
        </div>

        <div
          className="w-10 h-10 rounded-full bg-slate-900/90 border border-slate-600 flex items-center justify-center overflow-hidden shadow-md"
          title={speciesName(speciesId)}
        >
          <img src={portraitSprite(speciesId)} alt="Tu Pokémon" className="w-8 h-8 object-contain" />
        </div>
      </div>
    </div>
  );
};
