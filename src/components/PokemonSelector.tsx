import React, { useState } from 'react';
import { POKEMON_LIST } from '../game/pokemonData';
import { PokemonInfo } from '../game/types';
import { Sparkles, Check, X, Shield, Zap } from 'lucide-react';
import { sounds } from '../game/sound';

interface PokemonSelectorProps {
  currentPokemon: PokemonInfo;
  onSelect: (pokemon: PokemonInfo) => void;
  onClose: () => void;
}

export const PokemonSelector: React.FC<PokemonSelectorProps> = ({
  currentPokemon,
  onSelect,
  onClose
}) => {
  const [selectedId, setSelectedId] = useState<number>(currentPokemon.id);
  const activePoke = POKEMON_LIST.find((p) => p.id === selectedId) || POKEMON_LIST[0];

  const handlePick = (poke: PokemonInfo) => {
    setSelectedId(poke.id);
    sounds.playSelect();
  };

  const handleConfirm = () => {
    onSelect(activePoke);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col p-3 sm:p-5 text-white overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2
            className="text-xs sm:text-sm font-bold text-amber-300 tracking-wider"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            Elegir Pokémon
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar selector"
          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Featured Pokémon Card Preview */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-900 to-slate-800 p-2.5 my-2 rounded-xl border border-slate-700">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden"
          style={{ backgroundColor: `${activePoke.accentColor}25`, border: `2px solid ${activePoke.accentColor}` }}
        >
          <img
            src={activePoke.spriteUrl}
            alt={activePoke.name}
            className="w-14 h-14 object-contain filter drop-shadow"
            crossOrigin="anonymous"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm text-slate-100 truncate">{activePoke.name}</h3>
            <span className="text-[10px] text-slate-400">#{activePoke.id}</span>
          </div>
          <p className="text-[10px] text-amber-300 truncate font-mono mt-0.5">
            {activePoke.passiveAbility}
          </p>

          {/* Stats Bar */}
          <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-300">
            <span className="flex items-center gap-0.5">
              <Zap className="w-3 h-3 text-yellow-400" />
              Vel {Math.round(activePoke.speed * 100)}%
            </span>
            <span className="flex items-center gap-0.5">
              <Shield className="w-3 h-3 text-pink-400" />
              Imán {activePoke.magnetRadius}px
            </span>
          </div>
        </div>
      </div>

      {/* 22 Pokémon Grid (Scrollable for Smartwatch touch or desktop) */}
      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-4 gap-2 py-1 scrollbar-thin">
        {POKEMON_LIST.map((poke) => {
          const isSelected = poke.id === selectedId;
          return (
            <button
              key={poke.id}
              onClick={() => handlePick(poke)}
              aria-label={`Seleccionar ${poke.name}`}
              className={`relative flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 active:scale-95'
              }`}
            >
              <img
                src={poke.spriteUrl}
                alt={poke.name}
                className="w-10 h-10 object-contain"
                crossOrigin="anonymous"
                loading="lazy"
              />
              <span className="text-[9px] font-medium text-slate-300 truncate w-full text-center mt-0.5">
                {poke.name}
              </span>
              {isSelected && (
                <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center text-black">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm Button */}
      <div className="pt-2">
        <button
          onClick={handleConfirm}
          aria-label="Confirmar Pokémon"
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>¡Elegir a {activePoke.name}!</span>
        </button>
      </div>
    </div>
  );
};
