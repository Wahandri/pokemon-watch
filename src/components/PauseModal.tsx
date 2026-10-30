import React from 'react';
import { Play, RotateCcw, Home, Users, Footprints, Trophy, BookOpen } from 'lucide-react';
import { PlayerStats, OwnedPokemon } from '../game/types';
import { SPECIES_BY_ID } from '../game/gen1Data';
import { sounds } from '../game/sound';

interface PauseModalProps {
  stats: PlayerStats;
  active: OwnedPokemon | null;
  berries: number;
  onResume: () => void;
  onRestart: () => void;
  onOpenBox: () => void;
  onOpenPokedex: () => void;
  onOpenAchievements: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  stats,
  active,
  berries,
  onResume,
  onRestart,
  onOpenBox,
  onOpenPokedex,
  onOpenAchievements,
  onExitToTitle
}) => {
  const species = active ? SPECIES_BY_ID[active.speciesId] : null;

  return (
    <div className="watch-safe absolute inset-0 bg-slate-950/92 z-50 flex flex-col items-center justify-between p-4 sm:p-6 text-white select-none overflow-hidden">
      <div className="w-full flex items-center justify-between">
        <div className="w-16" />
        <h2
          className="text-lg font-extrabold text-amber-400 tracking-wider"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          PAUSA
        </h2>
        <div className="w-16 text-right">
          {species && <span className="text-[12px] text-slate-400 font-mono">{species.name}</span>}
        </div>
      </div>

      <div className="w-full max-w-[280px] bg-slate-900/90 border border-slate-700 rounded-2xl p-3.5 my-auto shadow-xl space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-[16px] text-slate-300">🍓 Bayas:</span>
          <span className="font-bold text-amber-300 font-mono text-xl">{berries}</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-[16px] text-slate-300">✨ Puntos:</span>
          <span className="font-bold text-emerald-400 font-mono text-xl">{stats.totalScore}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[16px] text-slate-300 flex items-center gap-1.5">
            <Footprints className="w-4 h-4 text-cyan-400" />
            <span>Pasos:</span>
          </span>
          <span className="font-bold text-cyan-300 font-mono text-xl">{stats.stepsWalked}</span>
        </div>
      </div>

      <div className="w-full max-w-[280px] space-y-2">
        <button
          onClick={() => {
            sounds.playSelect();
            onResume();
          }}
          data-start="true"
          aria-label="Reanudar Juego"
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Reanudar</span>
        </button>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => {
              sounds.playSelect();
              onOpenBox();
            }}
            aria-label="Abrir equipo"
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[12px] font-semibold rounded-xl border border-slate-600 flex flex-col items-center justify-center gap-1 active:scale-95"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Equipo</span>
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              onOpenPokedex();
            }}
            aria-label="Abrir Pokédex"
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[12px] font-semibold rounded-xl border border-slate-600 flex flex-col items-center justify-center gap-1 active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-rose-400" />
            <span>Pokédex</span>
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              onOpenAchievements();
            }}
            aria-label="Ver logros"
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[12px] font-semibold rounded-xl border border-slate-600 flex flex-col items-center justify-center gap-1 active:scale-95"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Logros</span>
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              onRestart();
            }}
            aria-label="Reiniciar puntos"
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[12px] font-semibold rounded-xl border border-slate-600 flex flex-col items-center justify-center gap-1 active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>Puntos</span>
          </button>
        </div>

        <button
          onClick={() => {
            sounds.playSelect();
            onExitToTitle();
          }}
          aria-label="Volver a la portada"
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[13px] rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Volver al Inicio</span>
        </button>
      </div>
    </div>
  );
};
