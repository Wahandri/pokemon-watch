import React, { useRef, useState } from 'react';
import { Play, Trophy, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { OwnedPokemon } from '../game/types';
import { SPECIES_BY_ID } from '../game/gen1Data';
import { portraitSprite } from '../game/sprites';
import { sounds } from '../game/sound';

interface TitleScreenProps {
  owned: OwnedPokemon[];
  activeUid: string | null;
  onSelect: (uid: string) => void;
  onStartGame: () => void;
  onOpenPokedex: () => void;
  onOpenAchievements: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  owned,
  activeUid,
  onSelect,
  onStartGame,
  onOpenPokedex,
  onOpenAchievements
}) => {
  const starters = owned.slice(0, 4);
  const activeIndex = Math.max(0, starters.findIndex((p) => p.uid === activeUid));
  const active = starters[activeIndex] ?? starters[0];
  const activeSpecies = active ? SPECIES_BY_ID[active.speciesId] : null;

  const dragStart = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const go = (delta: number) => {
    if (starters.length < 2) return;
    const next = (activeIndex + delta + starters.length) % starters.length;
    sounds.playSelect();
    onSelect(starters[next].uid);
  };

  const prev = starters[(activeIndex - 1 + starters.length) % starters.length];
  const next = starters[(activeIndex + 1) % starters.length];

  return (
    <div className="watch-safe absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 flex flex-col items-center justify-center gap-1 text-white select-none overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="flex flex-col items-center text-center z-10">
        <span className="text-emerald-400 font-bold text-[10px] tracking-[0.18em] uppercase">
          ★ Xiaomi Watch 2 ★
        </span>
        <h1
          className="text-[24px] leading-tight font-extrabold text-amber-400 tracking-wider drop-shadow-[0_4px_12px_rgba(251,191,36,0.35)] mt-0.5"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          POKÉWATCH
        </h1>
        <span
          className="text-[13px] text-emerald-300 mt-0.5 tracking-widest"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          GBA BERRY RUN
        </span>
      </div>

      <span className="text-[13px] text-slate-400 z-10">Desliza para elegir compañero</span>

      {/* Carrusel */}
      <div
        className="flex items-center justify-center gap-1 z-10 w-full"
        onPointerDown={(e) => {
          dragStart.current = e.clientX;
          setDragging(true);
        }}
        onPointerUp={(e) => {
          if (dragStart.current !== null) {
            const delta = e.clientX - dragStart.current;
            if (Math.abs(delta) > 30) go(delta > 0 ? -1 : 1);
          }
          dragStart.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          dragStart.current = null;
          setDragging(false);
        }}
      >
        <button
          onClick={() => go(-1)}
          aria-label="Pokémon anterior"
          className="w-10 h-10 rounded-full bg-slate-900/70 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-95 shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {prev && (
          <button
            onClick={() => go(-1)}
            aria-label={`Ver a ${SPECIES_BY_ID[prev.speciesId].name}`}
            className="opacity-50 shrink-0"
          >
            <img src={portraitSprite(prev.speciesId)} alt="" className="w-12 h-12 object-contain" />
          </button>
        )}

        <div
          className={`flex flex-col items-center justify-center rounded-3xl border-2 border-amber-300 bg-amber-500/15 px-3 py-2 shadow-lg shadow-amber-500/20 transition-transform ${
            dragging ? 'scale-95' : 'scale-100'
          }`}
        >
          <img
            src={portraitSprite(active.speciesId)}
            alt={activeSpecies?.name}
            className="w-24 h-24 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          />
          <span className="text-[15px] font-extrabold text-amber-200 mt-0.5">
            {activeSpecies?.name}
          </span>
          <span className="text-[11px] text-slate-300 font-mono">Nv {active.level}</span>
        </div>

        {next && (
          <button
            onClick={() => go(1)}
            aria-label={`Ver a ${SPECIES_BY_ID[next.speciesId].name}`}
            className="opacity-50 shrink-0"
          >
            <img src={portraitSprite(next.speciesId)} alt="" className="w-12 h-12 object-contain" />
          </button>
        )}

        <button
          onClick={() => go(1)}
          aria-label="Pokémon siguiente"
          className="w-10 h-10 rounded-full bg-slate-900/70 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-95 shrink-0"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 z-10">
        {starters.map((pokemon) => (
          <button
            key={pokemon.uid}
            onClick={() => {
              sounds.playSelect();
              onSelect(pokemon.uid);
            }}
            aria-label={`Elegir a ${SPECIES_BY_ID[pokemon.speciesId].name}`}
            className={`rounded-full transition-all ${
              pokemon.uid === activeUid ? 'w-5 h-2 bg-amber-300' : 'w-2 h-2 bg-slate-600'
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => {
          sounds.playSelect();
          onStartGame();
        }}
        data-start="true"
        aria-label="Iniciar Juego"
        className="w-full max-w-[260px] py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-extrabold rounded-2xl text-[15px] flex items-center justify-center gap-2 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer z-10"
        style={{ fontFamily: '"Press Start 2P", monospace' }}
      >
        <Play className="w-4 h-4 fill-current" />
        <span>¡JUGAR!</span>
      </button>

      <div className="w-full max-w-[280px] flex items-center justify-center gap-2 z-10">
        <button
          onClick={() => {
            sounds.playSelect();
            onOpenPokedex();
          }}
          aria-label="Abrir Pokédex"
          className="flex-1 py-2.5 px-2 bg-slate-900/90 text-slate-100 text-[13px] font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          <BookOpen className="w-4 h-4 text-rose-400" />
          <span>Pokédex</span>
        </button>

        <button
          onClick={() => {
            sounds.playSelect();
            onOpenAchievements();
          }}
          aria-label="Ver Logros"
          className="flex-1 py-2.5 px-2 bg-slate-900/90 text-slate-100 text-[13px] font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Logros</span>
        </button>
      </div>
    </div>
  );
};
