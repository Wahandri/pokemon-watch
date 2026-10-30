import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SPECIES_BY_ID } from '../game/gen1Data';
import { frontSprite, speciesName } from '../game/sprites';
import { sounds } from '../game/sound';
import { Pokeball } from './Pokeball';

interface CatchSceneProps {
  speciesId: number;
  onDone: (caught: boolean) => void;
}

type Phase = 'ready' | 'flying' | 'shaking' | 'caught' | 'escaped' | 'failed';

const MAX_ATTEMPTS = 3;

function catchChance(speciesId: number): number {
  const stats = SPECIES_BY_ID[speciesId].baseStats;
  const total = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
  if (total >= 600) return 0.35;
  if (total >= 500) return 0.55;
  if (total >= 400) return 0.75;
  return 0.9;
}

export const CatchScene: React.FC<CatchSceneProps> = ({ speciesId, onDone }) => {
  const [phase, setPhase] = useState<Phase>('ready');
  const [attempts, setAttempts] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [throwOffset, setThrowOffset] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState('Arrastra la Pokéball hasta el Pokémon');

  const draggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const ballRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  const name = speciesName(speciesId);

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'ready') return;
    const ball = ballRef.current;
    if (!ball) return;
    const rect = ball.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (Math.hypot(event.clientX - cx, event.clientY - cy) > 80) return;

    draggingRef.current = true;
    startRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    sounds.playSelect();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDrag({ x: event.clientX - startRef.current.x, y: event.clientY - startRef.current.y });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDrag({ x: 0, y: 0 });

    const target = targetRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (Math.hypot(event.clientX - cx, event.clientY - cy) > 90) {
      setMessage('¡Casi! Arrastra hasta el Pokémon');
      return;
    }

    throwBall();
  };

  const throwBall = () => {
    const ball = ballRef.current;
    const target = targetRef.current;
    if (!ball || !target) return;

    const ballRect = ball.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    setThrowOffset({
      x: targetRect.left + targetRect.width / 2 - (ballRect.left + ballRect.width / 2),
      y: targetRect.top + targetRect.height / 2 - (ballRect.top + ballRect.height / 2)
    });
    setPhase('flying');
    setMessage('¡Allá va!');
    sounds.triggerHaptic(20);

    later(() => {
      const nextAttempt = attempts + 1;
      setAttempts(nextAttempt);
      setPhase('shaking');
      setMessage('La Pokéball tiembla...');

      later(() => {
        if (Math.random() < catchChance(speciesId)) {
          setPhase('caught');
          setMessage(`¡${name} capturado!`);
          sounds.playLevelUp();
          later(() => onDone(true), 1400);
        } else if (nextAttempt >= MAX_ATTEMPTS) {
          setPhase('escaped');
          setMessage(`¡${name} se ha escapado!`);
          later(() => onDone(false), 1400);
        } else {
          setPhase('failed');
          setMessage('¡Se ha liberado! Prueba otra vez');
          later(() => {
            setPhase('ready');
            setMessage(`Intento ${nextAttempt + 1} de ${MAX_ATTEMPTS}`);
          }, 1100);
        }
      }, 2100);
    }, 550);
  };

  const ballTransform =
    phase === 'ready' || phase === 'failed'
      ? `translate(calc(-50% + ${drag.x}px), ${drag.y}px)`
      : `translate(calc(-50% + ${throwOffset.x}px), ${throwOffset.y}px)`;

  return (
    <div
      className="watch-safe absolute inset-0 z-50 bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 flex flex-col items-center justify-between text-white select-none overflow-hidden touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="text-center">
        <p className="text-[13px] text-amber-300 font-bold tracking-[0.2em] uppercase">Captura</p>
        <p className="text-[13px] text-slate-400 mt-0.5">
          Intento {Math.min(attempts + 1, MAX_ATTEMPTS)} / {MAX_ATTEMPTS}
        </p>
      </div>

      <div ref={targetRef} className="relative flex items-center justify-center">
        <img
          src={frontSprite(speciesId)}
          alt={name}
          className={`w-32 h-32 object-contain transition-all duration-300 ${
            phase === 'caught' ? 'scale-0 opacity-0' : 'opacity-95'
          }`}
          style={{ imageRendering: 'pixelated' }}
        />

        {['-left-4 top-2', 'right-0 top-8', 'left-2 bottom-2', 'right-3 -top-2'].map((pos, index) => (
          <span
            key={pos}
            className={`absolute ${pos} text-amber-300 text-lg animate-pulse`}
            style={{ animationDelay: `${index * 180}ms` }}
          >
            ✦
          </span>
        ))}
      </div>

      <p className="text-[15px] text-center text-slate-200 leading-tight px-2 min-h-[32px]">{message}</p>

      <div
        ref={ballRef}
        onPointerDown={handlePointerDown}
        aria-label="Pokéball"
        className="relative mb-1 cursor-grab active:cursor-grabbing"
        style={{
          transform: ballTransform,
          transition: phase === 'ready' || phase === 'failed' ? 'transform 120ms ease-out' : 'transform 500ms ease-in'
        }}
      >
        <Pokeball
          size={64}
          className={
            phase === 'ready' ? 'animate-ball-spin' : phase === 'shaking' ? 'animate-ball-shake' : ''
          }
        />

        {(phase === 'caught' || phase === 'shaking') && (
          <Sparkles className="absolute -top-3 -right-3 w-5 h-5 text-amber-300 animate-ping" />
        )}
      </div>
    </div>
  );
};
