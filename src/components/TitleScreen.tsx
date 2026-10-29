import React from 'react';
import { Play, Sparkles, Trophy, HelpCircle, Volume2, VolumeX, Watch } from 'lucide-react';
import { PokemonInfo } from '../game/types';
import { sounds } from '../game/sound';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenPokemonSelector: () => void;
  onOpenAchievements: () => void;
  onOpenInstallGuide: () => void;
  selectedPokemon: PokemonInfo;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenPokemonSelector,
  onOpenAchievements,
  onOpenInstallGuide,
  selectedPokemon,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 flex flex-col items-center justify-between p-4 sm:p-6 text-white select-none overflow-hidden">
      {/* Decorative Animated GBA Grass/Sky Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top Utility Row */}
      <div className="w-full flex items-center justify-between z-10 pt-1">
        <button
          onClick={onOpenInstallGuide}
          aria-label="Guía para Xiaomi Watch 2"
          className="flex items-center gap-1 text-[10px] text-slate-300 bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 active:scale-95 transition-transform"
        >
          <Watch className="w-3 h-3 text-emerald-400" />
          <span>Guía Reloj</span>
        </button>

        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          className="w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 active:scale-95 transition-transform"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
      </div>

      {/* Center Hero Lockup: Title & Active Pokémon */}
      <div className="flex flex-col items-center justify-center text-center my-auto z-10 max-w-[280px]">
        {/* Retro GBA Title Badge */}
        <div className="flex items-center gap-1.5 mb-1 text-emerald-400 font-bold text-[10px] tracking-widest uppercase">
          <span>★ Edición Xiaomi Watch 2 ★</span>
        </div>

        <h1
          className="text-lg sm:text-xl font-extrabold text-amber-400 tracking-wider drop-shadow-[0_4px_12px_rgba(251,191,36,0.3)] mb-2"
          style={{ fontFamily: '"Press Start 2P", monospace', lineHeight: '1.4' }}
        >
          POKÉWATCH
          <span className="block text-xs text-emerald-300 mt-1">GBA BERRY RUN</span>
        </h1>

        {/* Selected Pokémon Display Showcase */}
        <div className="relative my-2 flex flex-col items-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner relative"
            style={{
              backgroundColor: `${selectedPokemon.accentColor}25`,
              border: `2px solid ${selectedPokemon.accentColor}`
            }}
          >
            <img
              src={selectedPokemon.spriteUrl}
              alt={selectedPokemon.name}
              className="w-18 h-18 object-contain filter drop-shadow-md animate-pulse"
              crossOrigin="anonymous"
            />
          </div>

          <div className="mt-1 flex items-center gap-1">
            <span className="text-xs font-bold text-slate-100">{selectedPokemon.name}</span>
            <span className="text-[9px] text-amber-400 font-mono">#{selectedPokemon.id}</span>
          </div>
        </div>

        {/* Start Game CTA Button */}
        <button
          onClick={() => {
            sounds.playSelect();
            onStartGame();
          }}
          data-start="true"
          aria-label="Iniciar Juego"
          className="mt-2 w-full max-w-[220px] py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>¡JUGAR!</span>
        </button>
      </div>

      {/* Bottom Secondary Actions */}
      <div className="w-full flex items-center justify-center gap-2 z-10 pb-1">
        <button
          onClick={() => {
            sounds.playSelect();
            onOpenPokemonSelector();
          }}
          aria-label="Cambiar Pokémon"
          className="flex-1 py-1.5 px-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Pokémon</span>
        </button>

        <button
          onClick={() => {
            sounds.playSelect();
            onOpenAchievements();
          }}
          aria-label="Ver Logros"
          className="flex-1 py-1.5 px-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <Trophy className="w-3 h-3 text-amber-400" />
          <span>Logros</span>
        </button>
      </div>

      {/* Control Hint in Bottom Safe Margin */}
      <div className="text-[9px] text-slate-400 font-sans text-center z-10 pt-1 border-t border-slate-800/80 w-full">
        Giroscopio de muñeca · Flechas/WASD · Espacio para iniciar
      </div>
    </div>
  );
};
