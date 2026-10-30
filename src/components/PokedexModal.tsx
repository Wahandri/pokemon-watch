import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { SPECIES } from '../game/gen1Data';
import { frontSprite } from '../game/sprites';
import { OwnedPokemon } from '../game/types';
import { sounds } from '../game/sound';

interface PokedexModalProps {
  seen: number[];
  caught: number[];
  owned: OwnedPokemon[];
  activeUid: string | null;
  onUse: (speciesId: number) => void;
  onClose: () => void;
}

export const PokedexModal: React.FC<PokedexModalProps> = ({
  seen,
  caught,
  owned,
  activeUid,
  onUse,
  onClose
}) => {
  const [detail, setDetail] = useState<number | null>(null);
  const seenSet = new Set(seen.length ? seen : caught);

  const detailEntry = detail ? SPECIES.find((s) => s.id === detail) : null;
  const detailCaught = detail ? caught.includes(detail) : false;
  const detailSeen = detail ? detailEntry && (detailCaught || seenSet.has(detail)) : false;
  const detailOwned = detail ? owned.filter((p) => p.speciesId === detail) : [];
  const detailActive = detailOwned.some((p) => p.uid === activeUid);

  return (
    <div className="watch-safe absolute inset-0 bg-slate-950/95 z-50 flex flex-col p-3 sm:p-5 text-white overflow-hidden select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-5 h-5 text-rose-400" />
          <h2 className="text-lg font-bold text-amber-300 tracking-wider" style={{ fontFamily: '"Press Start 2P", monospace' }}>
            Pokédex
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-mono text-slate-300">
            {caught.length}/{SPECIES.length}
          </span>
          <button
            onClick={onClose}
            aria-label="Cerrar Pokédex"
            className="w-9 h-9 rounded-full bg-slate-800 active:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-3 gap-2 py-2">
        {SPECIES.map((entry) => {
          const isCaught = caught.includes(entry.id);
          const isSeen = isCaught || seenSet.has(entry.id);
          return (
            <button
              key={entry.id}
              onClick={() => setDetail(entry.id)}
              aria-label={`Ver ${isSeen ? entry.name : 'Pokémon desconocido'}`}
              className={`relative flex flex-col items-center justify-center rounded-xl border py-2 active:scale-95 transition-transform ${
                isCaught
                  ? 'bg-emerald-900/40 border-emerald-600/70'
                  : isSeen
                    ? 'bg-slate-900/80 border-slate-600'
                    : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <img
                src={frontSprite(entry.id)}
                alt={isSeen ? entry.name : '???'}
                loading="lazy"
                className="w-12 h-12 object-contain"
                style={{ imageRendering: 'pixelated', filter: isCaught ? undefined : isSeen ? 'grayscale(1) brightness(0.9)' : 'brightness(0) opacity(0.35)' }}
              />
              <span className={`text-[12px] font-mono mt-0.5 ${isCaught ? 'text-emerald-300' : 'text-slate-500'}`}>
                {String(entry.id).padStart(3, '0')}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-1 text-center text-[12px] text-slate-400">
        {caught.length} capturados · {seenSet.size} vistos · {SPECIES.length - caught.length} por capturar
      </div>

      {/* Detalle a pantalla completa: toca en cualquier sitio para cerrar */}
      {detailEntry && (
        <div
          onClick={() => setDetail(null)}
          role="button"
          aria-label="Cerrar ficha"
          className="absolute inset-0 z-[60] bg-slate-950/95 flex flex-col items-center justify-center gap-2"
        >
          <img
            src={frontSprite(detailEntry.id)}
            alt={detailSeen ? detailEntry.name : '???'}
            className="w-[78%] max-h-[68%] object-contain drop-shadow-[0_0_24px_rgba(251,191,36,0.25)]"
            style={{ imageRendering: 'pixelated', filter: detailCaught ? undefined : detailSeen ? 'grayscale(1) brightness(0.9)' : 'brightness(0) opacity(0.4)' }}
          />
          <div className="text-center">
            <p className="text-lg font-bold text-amber-300">
              {detailSeen ? detailEntry.name : '???'}
            </p>
            <p className="text-[12px] text-slate-400 font-mono">
              Nº {String(detailEntry.id).padStart(3, '0')} ·{' '}
              {detailCaught ? 'capturado' : detailSeen ? 'visto (sin capturar)' : 'no visto'}
            </p>
          </div>

          {detailCaught ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                if (detailActive) return;
                sounds.playSelect();
                onUse(detailEntry.id);
              }}
              disabled={detailActive}
              className={`mt-1 px-5 py-2.5 rounded-xl text-[15px] font-extrabold border-2 ${
                detailActive
                  ? 'bg-slate-800 border-slate-600 text-slate-500'
                  : 'bg-emerald-500 border-emerald-300 text-slate-950 active:scale-95'
              }`}
            >
              {detailActive ? 'En uso' : `Usar a ${detailEntry.name}`}
            </button>
          ) : (
            <button
              disabled
              className="mt-1 px-5 py-2.5 rounded-xl text-[13px] font-bold border-2 bg-slate-900 border-slate-700 text-slate-500"
            >
              {detailSeen ? 'Captúralo para usarlo' : 'Aún no lo has visto'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
