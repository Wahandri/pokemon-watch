import React, { useEffect, useRef, useState } from 'react';
import { Swords, LogOut } from 'lucide-react';
import { Combatant, species } from '../game/battle';
import { MOVES } from '../game/gen1Data';
import { frontSprite, backSprite } from '../game/sprites';
import { sounds } from '../game/sound';

interface BattleScreenProps {
  player: Combatant;
  enemy: Combatant;
  log: string[];
  phase: 'menu' | 'won' | 'lost';
  onMove: (moveId: string) => void;
  onFlee: () => void;
  onContinue: () => void;
}

const TYPE_NAMES: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  electric: 'Eléctrico',
  grass: 'Planta',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón'
};

const TYPE_COLORS: Record<string, string> = {
  normal: '#e2e8f0',
  fire: '#fb923c',
  water: '#60a5fa',
  electric: '#fde047',
  grass: '#4ade80',
  ice: '#a5f3fc',
  fighting: '#f87171',
  poison: '#c084fc',
  ground: '#d6b25e',
  flying: '#c4b5fd',
  psychic: '#f472b6',
  bug: '#bef264',
  rock: '#d6c48a',
  ghost: '#a78bfa',
  dragon: '#818cf8'
};

interface AttackAnim {
  id: number;
  type: string;
  particles: { tx: number; ty: number; delay: number }[];
}

const HpBar: React.FC<{ hp: number; max: number }> = ({ hp, max }) => {
  const ratio = Math.max(0, Math.min(1, hp / max));
  const color = ratio > 0.5 ? '#34d399' : ratio > 0.22 ? '#fbbf24' : '#f87171';
  return (
    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/70 mt-1">
      <div className="h-full transition-all duration-300" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
    </div>
  );
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  player,
  enemy,
  log,
  phase,
  onMove,
  onFlee,
  onContinue
}) => {
  const moves = species(player.speciesId).moves.slice(0, 2);
  const [anim, setAnim] = useState<AttackAnim | null>(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => timers.current.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const triggerAttack = (moveId: string) => {
    if (busy) return;

    const move = MOVES[moveId];
    const particles = Array.from({ length: 10 }).map((_, index) => {
      const angle = (Math.PI * 2 * index) / 10 + Math.random() * 0.5;
      const distance = 26 + Math.random() * 26;
      return {
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        delay: Math.random() * 80
      };
    });

    setBusy(true);
    setAnim({ id: Date.now(), type: move.type, particles });
    sounds.triggerHaptic(25);

    // El golpe se resuelve a mitad de la animacion.
    later(() => onMove(moveId), 300);
    later(() => {
      setAnim(null);
      setBusy(false);
    }, 900);
  };

  const attackerClass = anim ? 'animate-attack-lunge' : '';
  const defenderClass = anim ? 'animate-hit-flash' : '';
  const particleColor = anim ? TYPE_COLORS[anim.type] ?? '#fbbf24' : '#fbbf24';

  return (
    <div
      className={`watch-safe absolute inset-0 z-40 bg-gradient-to-b from-sky-950 via-slate-950 to-emerald-950 flex flex-col justify-between text-white select-none overflow-hidden ${
        anim ? 'animate-battle-shake' : ''
      }`}
    >
      {/* Marcadores */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold truncate">
            {player.name} <span className="text-[13px] text-slate-400 font-mono">Nv {player.level}</span>
          </div>
          <HpBar hp={player.hp} max={player.maxHp} />
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {player.hp}/{player.maxHp} PS
          </div>
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="text-[16px] font-bold truncate">
            {enemy.name} <span className="text-[13px] text-slate-400 font-mono">Nv {enemy.level}</span>
          </div>
          <HpBar hp={enemy.hp} max={enemy.maxHp} />
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {enemy.hp}/{enemy.maxHp} PS
          </div>
        </div>
      </div>

      {/* Sprites */}
      <div className="flex items-center justify-between px-1">
        <img
          src={backSprite(player.speciesId)}
          alt={player.name}
          className={`w-20 h-20 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.6)] ${attackerClass}`}
          style={{ imageRendering: 'pixelated' }}
        />

        <div className="relative">
          <img
            src={frontSprite(enemy.speciesId)}
            alt={enemy.name}
            className={`w-20 h-20 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.6)] ${defenderClass}`}
            style={{ imageRendering: 'pixelated' }}
          />

          {anim && (
            <div key={anim.id} className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <span
                className="absolute w-16 h-16 rounded-full border-2 animate-impact-ring"
                style={{ borderColor: particleColor }}
              />
              {anim.particles.map((particle, index) => (
                <span
                  key={index}
                  className="absolute w-2 h-2 rounded-full animate-hit-particle"
                  style={{
                    backgroundColor: particleColor,
                    ['--tx' as string]: `${particle.tx}px`,
                    ['--ty' as string]: `${particle.ty}px`,
                    animationDelay: `${particle.delay}ms`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Texto */}
      <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-[14px] leading-tight min-h-[48px] flex flex-col justify-center gap-0.5">
        {log.slice(-2).map((line, index, arr) => (
          <p key={`${line}-${index}`} className={index === arr.length - 1 ? 'text-white' : 'text-slate-400'}>
            {line}
          </p>
        ))}
      </div>

      {phase === 'menu' ? (
        <div className="space-y-1.5">
          {moves.map((moveId) => {
            const move = MOVES[moveId];
            return (
              <button
                key={moveId}
                onClick={() => triggerAttack(moveId)}
                disabled={busy}
                aria-label={`Usar ${move.name}`}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 active:scale-95 transition-transform ${
                  busy ? 'opacity-50' : ''
                }`}
              >
                <span className="text-[16px] font-bold leading-tight text-left">{move.name}</span>
                <span className="text-[12px] font-mono" style={{ color: TYPE_COLORS[move.type] ?? '#cbd5e1' }}>
                  {TYPE_NAMES[move.type] ?? move.type} · {move.power}
                </span>
              </button>
            );
          })}

          <button
            onClick={onFlee}
            disabled={busy}
            aria-label="Huir del combate"
            className={`w-full py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[14px] font-bold flex items-center justify-center gap-1.5 active:scale-95 ${
              busy ? 'opacity-50' : ''
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Huir</span>
          </button>
        </div>
      ) : (
        <button
          onClick={onContinue}
          aria-label="Continuar"
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[15px] font-extrabold flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Swords className="w-4 h-4" />
          <span>{phase === 'won' ? 'Continuar' : 'Volver al mapa'}</span>
        </button>
      )}
    </div>
  );
};
