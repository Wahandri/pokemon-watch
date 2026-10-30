import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { frontSprite, speciesName } from '../game/sprites';
import { sounds } from '../game/sound';

interface EvolutionSceneProps {
  fromId: number;
  toId: number;
  onDone: () => void;
}

export const EvolutionScene: React.FC<EvolutionSceneProps> = ({ fromId, toId, onDone }) => {
  const [phase, setPhase] = useState<'flash' | 'reveal'>('flash');

  useEffect(() => {
    sounds.playLevelUp();
    const reveal = window.setTimeout(() => setPhase('reveal'), 1100);
    const finish = window.setTimeout(() => onDone(), 3200);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(finish);
    };
  }, [onDone]);

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white select-none overflow-hidden">
      {phase === 'flash' && (
        <div className="absolute inset-0 bg-white animate-evo-flash flex items-center justify-center">
          <img
            src={frontSprite(fromId)}
            alt={speciesName(fromId)}
            className="w-24 h-24 object-contain opacity-70"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}

      {phase === 'reveal' && (
        <div className="flex flex-col items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <img
            src={frontSprite(toId)}
            alt={speciesName(toId)}
            className="w-28 h-28 object-contain drop-shadow-[0_0_18px_rgba(251,191,36,0.6)] animate-evo-pop"
            style={{ imageRendering: 'pixelated' }}
          />
          <p className="text-[10px] text-amber-300 font-bold text-center px-6 leading-tight">
            ¡{speciesName(fromId)} ha evolucionado a {speciesName(toId)}!
          </p>
        </div>
      )}
    </div>
  );
};
