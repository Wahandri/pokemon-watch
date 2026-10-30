import React from 'react';

interface PokeballProps {
  size?: number;
  className?: string;
}

/** Pokéball dibujada con CSS: nitida a cualquier tamano, sin sprites borrosos. */
export const Pokeball: React.FC<PokeballProps> = ({ size = 64, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }} aria-hidden="true">
    <div
      className="absolute inset-0 rounded-full border-[3px] border-slate-950 overflow-hidden shadow-[inset_-6px_-6px_10px_rgba(0,0,0,0.25)]"
      style={{
        background:
          'linear-gradient(to bottom, #f87171 0 44%, #0f172a 44% 56%, #f8fafc 56% 100%)'
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-slate-950 bg-slate-100"
        style={{ width: size * 0.34, height: size * 0.34 }}
      />
      <div
        className="absolute rounded-full bg-white/40 blur-[1px]"
        style={{ width: size * 0.18, height: size * 0.1, left: size * 0.16, top: size * 0.12 }}
      />
    </div>
  </div>
);
