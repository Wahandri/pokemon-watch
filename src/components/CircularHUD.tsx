import React, { useState, useEffect } from 'react';
import { Footprints, BatteryCharging, Pause, Compass, Zap, Magnet, Volume2, VolumeX } from 'lucide-react';
import { PlayerStats, PokemonInfo } from '../game/types';

interface CircularHUDProps {
  stats: PlayerStats;
  pokemon: PokemonInfo;
  gyroTilt: { gamma: number; beta: number };
  isGyroActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onCalibrateGyro: () => void;
}

export const CircularHUD: React.FC<CircularHUDProps> = ({
  stats,
  pokemon,
  gyroTilt,
  isGyroActive,
  isMuted,
  onToggleMute,
  onPause,
  onCalibrateGyro
}) => {
  const [timeStr, setTimeStr] = useState<string>('12:00');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      setTimeStr(`${hh}:${mm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Arc progress towards next milestone (every 25 berries)
  const currentTierProgress = (stats.berriesCollected % 25) / 25;
  const strokeDashoffset = 283 - 283 * currentTierProgress;

  // Gyro bubble offset clamped to small circle
  const bubbleX = Math.max(-10, Math.min(10, (gyroTilt.gamma / 30) * 10));
  const bubbleY = Math.max(-10, Math.min(10, (gyroTilt.beta / 30) * 10));

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 text-white font-mono">
      {/* 1. Curved Progress Rim SVG Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90">
        {/* Background track circle */}
        <circle
          cx="50%"
          cy="50%"
          r="47%"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="3"
        />
        {/* Active progress arc */}
        <circle
          cx="50%"
          cy="50%"
          r="47%"
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          strokeDasharray="295"
          strokeDashoffset={295 - 295 * Math.min(1, currentTierProgress)}
          strokeLinecap="round"
        />
      </svg>

      {/* 2. Top Curved Cluster: Watch Time & Steps */}
      <div className="flex flex-col items-center pt-2 sm:pt-3">
        {/* Smartwatch Status Bar */}
        <div className="flex items-center gap-3 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-xs">
          <div className="flex items-center gap-1 text-[11px] text-amber-300 font-bold">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            <span>{stats.stepsWalked}</span>
          </div>

          <span className="text-[12px] font-bold text-slate-100 tracking-wider">
            {timeStr}
          </span>

          <div className="flex items-center gap-0.5 text-[10px] text-emerald-400">
            <BatteryCharging className="w-3 h-3" />
            <span>98%</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Floating Edge Badges (Buffs & Gyro Bubble) */}
      <div className="flex items-center justify-between px-2">
        {/* Active Buffs (Speed / Magnet) */}
        <div className="flex flex-col gap-1.5 items-start">
          {stats.activeBuff && stats.activeBuff.expiresAt > Date.now() && (
            <div className="flex items-center gap-1 bg-rose-600/90 text-white text-[10px] px-2 py-0.5 rounded-full border border-rose-300 shadow-md animate-bounce">
              {stats.activeBuff.type === 'speed' ? (
                <>
                  <Zap className="w-3 h-3 text-yellow-300" />
                  <span>x1.5 VEL</span>
                </>
              ) : stats.activeBuff.type === 'magnet' ? (
                <>
                  <Magnet className="w-3 h-3 text-pink-300" />
                  <span>IMÁN</span>
                </>
              ) : (
                <span>x2 PTS</span>
              )}
            </div>
          )}

          {stats.comboCount > 1 && (
            <div className="bg-amber-500/90 text-black font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-amber-300 shadow-md">
              COMBO x{stats.comboCount}
            </div>
          )}
        </div>

        {/* Gyroscope Bubble Level Widget & Calibrate Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onCalibrateGyro}
            aria-label="Calibrar sensor de giroscopio"
            title="Calibrar centro del giroscopio (Toca para centrar tu muñeca)"
            className="pointer-events-auto relative w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700/80 flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-transform shadow-md"
          >
            {/* Center target ring */}
            <div className="w-2 h-2 rounded-full border border-slate-600" />
            {/* Moving bubble indicating wrist tilt */}
            <div
              className={`absolute w-2.5 h-2.5 rounded-full shadow-sm transition-transform duration-75 ${
                isGyroActive ? 'bg-cyan-400 shadow-cyan-400/50' : 'bg-slate-500'
              }`}
              style={{
                transform: `translate(${bubbleX}px, ${bubbleY}px)`
              }}
            />
          </button>
          <span className="text-[9px] text-slate-400 tracking-tight font-sans">
            {isGyroActive ? 'Giro ON' : 'Toca'}
          </span>
        </div>
      </div>

      {/* 4. Bottom Cluster: Pause, Berry Counter & Mute/Pokemon */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 px-4 sm:px-6">
        {/* Pause / Menu Button */}
        <button
          onClick={onPause}
          aria-label="Pausar juego"
          title="Pausa"
          className="pointer-events-auto w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 active:scale-95 transition-transform shadow-lg"
        >
          <Pause className="w-4 h-4" />
        </button>

        {/* Berry Counter & Score */}
        <div className="flex flex-col items-center bg-black/75 px-4 py-1.5 rounded-full border border-amber-500/30 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🍓</span>
            <span
              className="text-amber-400 font-extrabold text-sm sm:text-base tracking-wider"
              style={{ fontFamily: '"Press Start 2P", monospace' }}
            >
              {stats.berriesCollected}
            </span>
          </div>
          <span className="text-[10px] text-slate-300 font-semibold tracking-wide">
            {stats.totalScore} pts
          </span>
        </div>

        {/* Mute Toggle Button + Pokémon Icon Mini Badge */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            title={isMuted ? 'Activar sonido [M]' : 'Silenciar sonido [M]'}
            className="pointer-events-auto w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 active:scale-95 transition-transform shadow-lg"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <div
            className="w-8 h-8 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center overflow-hidden shadow-md"
            title={pokemon.name}
          >
            <img
              src={pokemon.spriteUrl}
              alt={pokemon.name}
              className="w-7 h-7 object-contain"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
