import React from 'react';
import { Play, RotateCcw, Home, Sparkles, Footprints, Trophy, Volume2, VolumeX } from 'lucide-react';
import { PlayerStats, PokemonInfo } from '../game/types';
import { sounds } from '../game/sound';

interface PauseModalProps {
  stats: PlayerStats;
  currentPokemon: PokemonInfo;
  isMuted: boolean;
  onToggleMute: () => void;
  onResume: () => void;
  onRestart: () => void;
  onOpenPokemonSelector: () => void;
  onOpenAchievements: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  stats,
  currentPokemon,
  isMuted,
  onToggleMute,
  onResume,
  onRestart,
  onOpenPokemonSelector,
  onOpenAchievements,
  onExitToTitle
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-between p-4 sm:p-6 text-white select-none overflow-hidden">
      {/* Title & Mute bar */}
      <div className="w-full flex items-center justify-between pt-1 px-2">
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          title={isMuted ? 'Activar sonido [M]' : 'Silenciar sonido [M]'}
          className="flex items-center gap-1 text-[10px] bg-slate-900/80 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-700 active:scale-95"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>Silenciado</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sonido ON</span>
            </>
          )}
        </button>

        <div className="text-center">
          <h2
            className="text-xs sm:text-sm font-extrabold text-amber-400 tracking-wider"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            PAUSA
          </h2>
        </div>

        <div className="w-12 text-right">
          <span className="text-[9px] text-slate-500 font-mono">#0{currentPokemon.id}</span>
        </div>
      </div>

      {/* Stats Summary Tile */}
      <div className="w-full max-w-[260px] bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 my-auto shadow-xl space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs text-slate-400">🍓 Bayas:</span>
          <span className="font-bold text-amber-300 font-mono text-sm">
            {stats.berriesCollected}
          </span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs text-slate-400">✨ Puntos:</span>
          <span className="font-bold text-emerald-400 font-mono text-sm">
            {stats.totalScore}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pasos:</span>
          </span>
          <span className="font-bold text-cyan-300 font-mono text-sm">
            {stats.stepsWalked}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-[260px] space-y-2 pb-2">
        {/* Resume Button */}
        <button
          onClick={() => {
            sounds.playSelect();
            onResume();
          }}
          data-start="true"
          aria-label="Reanudar Juego"
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-transform cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Reanudar</span>
        </button>

        {/* Secondary options row */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => {
              sounds.playSelect();
              onOpenPokemonSelector();
            }}
            aria-label="Cambiar Pokémon en pausa"
            title="Cambiar Pokémon"
            className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Pokémon</span>
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              onOpenAchievements();
            }}
            aria-label="Ver logros en pausa"
            title="Ver Logros"
            className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>Logros</span>
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              onRestart();
            }}
            aria-label="Reiniciar partida"
            title="Reiniciar Partida"
            className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>Reiniciar</span>
          </button>
        </div>

        {/* Exit to title button */}
        <button
          onClick={() => {
            sounds.playSelect();
            onExitToTitle();
          }}
          aria-label="Volver a la portada"
          className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] rounded-lg border border-slate-800 flex items-center justify-center gap-1 active:scale-95"
        >
          <Home className="w-3 h-3" />
          <span>Volver al Inicio</span>
        </button>
      </div>
    </div>
  );
};
