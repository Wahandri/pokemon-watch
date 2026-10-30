import React, { useEffect, useState } from 'react';
import { X, Check, Moon, Sun, Sparkles, Zap } from 'lucide-react';
import { OwnedPokemon } from '../game/types';
import { SPECIES_BY_ID } from '../game/gen1Data';
import { portraitSprite } from '../game/sprites';
import { isAsleep, wakeCost } from '../game/save';
import { xpToNext } from '../game/battle';
import { sounds } from '../game/sound';

interface PokemonSelectorProps {
  owned: OwnedPokemon[];
  activeUid: string | null;
  berries: number;
  onSelect: (uid: string) => void;
  onWake: (uid: string) => void;
  onClose: () => void;
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export const PokemonSelector: React.FC<PokemonSelectorProps> = ({
  owned,
  activeUid,
  berries,
  onSelect,
  onWake,
  onClose
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const now = Date.now();
  const awakeCount = owned.filter((p) => !isAsleep(p, now)).length;

  return (
    <div className="watch-safe absolute inset-0 bg-slate-950/95 z-50 flex flex-col p-3 sm:p-5 text-white overflow-hidden select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-lg font-bold text-amber-300 tracking-wider" style={{ fontFamily: '"Press Start 2P", monospace' }}>
            Equipo
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-mono text-amber-300">🍓 {berries}</span>
          <button
            onClick={onClose}
            aria-label="Cerrar equipo"
            className="w-8 h-8 rounded-full bg-slate-800 active:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 py-1.5 space-y-1.5">
        {owned.map((pokemon) => {
          const species = SPECIES_BY_ID[pokemon.speciesId];
          const asleep = isAsleep(pokemon, now);
          const active = pokemon.uid === activeUid;
          const cost = wakeCost(pokemon.level);
          const need = xpToNext(pokemon.level);
          const ratio = Math.min(1, pokemon.xp / need);

          return (
            <div
              key={pokemon.uid}
              className={`flex items-center gap-2.5 rounded-2xl border px-2.5 py-1 ${
                active ? 'bg-amber-500/15 border-amber-400/80' : 'bg-slate-900/80 border-slate-700'
              }`}
            >
              <img
                src={portraitSprite(pokemon.speciesId)}
                alt={species.name}
                className={`w-12 h-12 object-contain shrink-0 ${asleep ? 'opacity-40 grayscale' : ''}`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[16px] font-bold truncate">{species.name}</span>
                  <span className="text-[14px] font-mono text-slate-300 shrink-0">Nv {pokemon.level}</span>
                </div>

                {asleep ? (
                  <span className="text-[12px] text-indigo-300 flex items-center gap-1 mt-0.5">
                    <Moon className="w-3.5 h-3.5" /> Dormido · {formatTime(pokemon.asleepUntil - now)}
                  </span>
                ) : (
                  <>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-cyan-400" style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <span className="text-[12px] text-slate-400 font-mono">
                      {pokemon.xp}/{need} XP
                    </span>
                  </>
                )}
              </div>

              {asleep ? (
                <button
                  onClick={() => {
                    if (berries >= cost) {
                      sounds.playLevelUp();
                      onWake(pokemon.uid);
                    }
                  }}
                  disabled={berries < cost}
                  aria-label={`Despertar a ${species.name} por ${cost} bayas`}
                  className={`shrink-0 flex flex-col items-center justify-center w-[68px] h-14 rounded-xl border text-[11px] font-bold ${
                    berries >= cost
                      ? 'bg-indigo-500/25 border-indigo-400 text-indigo-100 active:scale-95'
                      : 'bg-slate-900 border-slate-700 text-slate-600'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>{cost} 🍓</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    sounds.playSelect();
                    onSelect(pokemon.uid);
                  }}
                  aria-label={`Usar a ${species.name}`}
                  disabled={active}
                  className={`shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center ${
                    active
                      ? 'bg-amber-400 border-amber-300 text-slate-950'
                      : 'bg-slate-800 border-slate-600 text-slate-300 active:scale-95'
                  }`}
                >
                  {active ? <Check className="w-5 h-5 stroke-[3]" /> : <Zap className="w-4 h-4" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="pt-1 text-center text-[11px] text-slate-400">
        {awakeCount === 0
          ? 'Todo el equipo duerme: recoge bayas o espera'
          : `${awakeCount} despiertos · ${owned.length} en el equipo`}
      </p>
    </div>
  );
};
