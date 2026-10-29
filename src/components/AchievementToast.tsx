import React, { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { Achievement } from '../game/types';
import { sounds } from '../game/sound';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss
}) => {
  useEffect(() => {
    if (achievement) {
      sounds.playAchievementFanfare();
      const timer = setTimeout(() => {
        onDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div className="absolute top-10 inset-x-4 z-50 pointer-events-auto flex items-center justify-center animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-3 py-2 rounded-xl border-2 border-white shadow-2xl flex items-center gap-2 max-w-[280px]">
        <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-300 flex items-center justify-center text-lg shrink-0">
          {achievement.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-900" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-950 font-mono">
              ¡LOGRO DESBLOQUEADO!
            </span>
          </div>
          <h4 className="text-[11px] font-bold truncate leading-tight text-slate-950">
            {achievement.title}
          </h4>
          <p className="text-[8px] text-amber-950 line-clamp-1 leading-none mt-0.5">
            {achievement.description}
          </p>
        </div>
      </div>
    </div>
  );
};
