import { SPECIES } from './gen1Data';
import { WildPokemon } from './types';
import { uid } from './save';

/** Los 19 "NPC" de la lista del jugador. */
export const COMMON_SPECIES = [
  19, 16, 10, 13, 41, 74, 46, 48, 50, 66, 69, 43, 56, 52, 21, 23, 27, 96, 100
];

export const LEGENDARY_SPECIES = [144, 145, 146, 150, 151];

const REST_SPECIES = SPECIES.map((s) => s.id).filter(
  (id) => !COMMON_SPECIES.includes(id) && !LEGENDARY_SPECIES.includes(id)
);

export const MAX_WILDS = 3;

function pick(list: number[]): number {
  return list[Math.floor(Math.random() * list.length)];
}

export function pickWildSpecies(): number {
  const roll = Math.random();
  if (roll < 0.01) return pick(LEGENDARY_SPECIES);
  if (roll < 0.72) return pick(COMMON_SPECIES);
  return pick(REST_SPECIES);
}

export function spawnLevel(playerLevel: number): number {
  const base = Math.max(2, playerLevel);
  const roll = Math.random();
  // A niveles bajos no salen rivales +2: seria una carniceria.
  const offset = roll < 0.08 && playerLevel >= 10 ? 2 : roll < 0.45 ? 1 : roll < 0.85 ? 0 : -1;
  return Math.max(2, Math.min(50, base + offset));
}

function randomAround(playerX: number, playerY: number, min: number, max: number) {
  const angle = Math.random() * Math.PI * 2;
  const distance = min + Math.random() * (max - min);
  return {
    x: playerX + Math.cos(angle) * distance,
    y: playerY + Math.sin(angle) * distance
  };
}

export function spawnWild(
  playerX: number,
  playerY: number,
  playerLevel: number
): WildPokemon {
  const spot = randomAround(playerX, playerY, 190, 330);
  const level = spawnLevel(playerLevel);
  const target = randomAround(spot.x, spot.y, 20, 90);

  return {
    uid: uid(),
    speciesId: pickWildSpecies(),
    level,
    x: spot.x,
    y: spot.y,
    vx: 0,
    vy: 0,
    targetX: target.x,
    targetY: target.y,
    repathTimer: 1 + Math.random() * 2
  };
}

/** Mueve a los salvajes: deambulan y persiguen si te acercas. */
export function updateWilds(
  wilds: WildPokemon[],
  dt: number,
  playerX: number,
  playerY: number
): WildPokemon[] {
  return wilds
    .filter((wild) => Math.hypot(wild.x - playerX, wild.y - playerY) < 700)
    .map((wild) => {
      const dx = playerX - wild.x;
      const dy = playerY - wild.y;
      const distance = Math.hypot(dx, dy);
      const chasing = distance < 150;

      let targetX = wild.targetX;
      let targetY = wild.targetY;
      let timer = wild.repathTimer - dt;

      if (chasing) {
        targetX = playerX;
        targetY = playerY;
      } else if (timer <= 0) {
        const target = randomAround(wild.x, wild.y, 30, 110);
        targetX = target.x;
        targetY = target.y;
        timer = 1.5 + Math.random() * 2.5;
      }

      const toX = targetX - wild.x;
      const toY = targetY - wild.y;
      const length = Math.hypot(toX, toY) || 1;
      const speed = chasing ? 52 : 26;

      return {
        ...wild,
        x: wild.x + (toX / length) * speed * dt,
        y: wild.y + (toY / length) * speed * dt,
        targetX,
        targetY,
        repathTimer: timer
      };
    });
}
