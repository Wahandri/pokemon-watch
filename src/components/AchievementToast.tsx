import React, { useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { Achievement } from '../game/types';
import { sounds } from '../game/sound';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onDismiss }) => {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const id = achievement?.id;

  useEffect(() => {
    if (!id) return;
    sounds.playAchievementFanfare();
    const timer = window.setTimeout(() => dismissRef.current(), 4000);
    return () => window.clearTimeout(timer);
  }, [id]);

  if (!achievement) return null;

  return (
    <div className="absolute top-[16%] inset-x-0 z-50 pointer-events-none flex items-center justify-center px-3">
      <div className="bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 text-slate-950 px-3 py-2.5 rounded-2xl border-2 border-white shadow-2xl flex items-center gap-2.5 w-full max-w-[300px] animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-300 flex items-center justify-center text-xl shrink-0">
          {achievement.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-900" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-950 font-mono">
              ¡Logro desbloqueado!
            </span>
          </div>
          <h4 className="text-[13px] font-extrabold truncate leading-tight text-slate-950">
            {achievement.title}
          </h4>
          <p className="text-[10px] text-amber-950 line-clamp-1 leading-tight mt-0.5">
            {achievement.description}
          </p>
        </div>
      </div>
    </div>
  );
};
