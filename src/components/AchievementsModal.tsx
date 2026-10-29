import React from 'react';
import { Trophy, X, CheckCircle2, Lock } from 'lucide-react';
import { Achievement } from '../game/types';

interface AchievementsModalProps {
  achievements: Achievement[];
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  achievements,
  onClose
}) => {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progressPercent = Math.round((unlockedCount / achievements.length) * 100);

  return (
    <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col p-3 sm:p-5 text-white overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2
            className="text-xs sm:text-sm font-bold text-amber-300 tracking-wider"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            Logros
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar logros"
          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Summary Card */}
      <div className="bg-slate-900/90 rounded-xl p-2.5 my-2 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 font-mono">Progreso Total</span>
          <p className="text-xs font-bold text-emerald-400 font-mono">
            {unlockedCount} de {achievements.length} Desbloqueados
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-amber-400 flex items-center justify-center font-bold text-xs text-amber-300">
          {progressPercent}%
        </div>
      </div>

      {/* Achievement List (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {achievements.map((ach) => {
          const ratio = Math.min(1, ach.current / ach.target);
          const percent = Math.round(ratio * 100);

          return (
            <div
              key={ach.id}
              className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
                ach.unlocked
                  ? 'bg-amber-500/10 border-amber-500/40 text-slate-100'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
              }`}
            >
              {/* Badge Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border ${
                  ach.unlocked
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                    : 'bg-slate-800 border-slate-700 opacity-60'
                }`}
              >
                {ach.icon}
              </div>

              {/* Title & Desc */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold truncate text-slate-200">
                    {ach.title}
                  </h4>
                  {ach.unlocked ? (
                    <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Listo
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[9px] text-slate-500">
                      <Lock className="w-2.5 h-2.5" />
                      {ach.current}/{ach.target}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                  {ach.description}
                </p>

                {/* Progress bar if not unlocked */}
                {!ach.unlocked && (
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Close Action */}
      <div className="pt-2">
        <button
          onClick={onClose}
          aria-label="Volver al juego"
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs active:scale-98 transition-transform cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
