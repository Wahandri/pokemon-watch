import { BerryItem, BerryType } from './types';
import { BERRY_DEFINITIONS } from './pokemonData';

export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Calculates normalized movement vector from gyroscope angles with deadzone and sensitivity.
 * Wrist tilt:
 * - gamma (left/right roll) maps to X axis: tilting right (+gamma) moves right (+x)
 * - beta (forward/back pitch) maps to Y axis: tilting away (+beta) moves up or down based on watch wrist posture.
 * For watch facing user: tilting wrist up (towards face) is negative beta, tilting wrist down is positive beta.
 */
export function calculateGyroVector(
  rawGamma: number,
  rawBeta: number,
  calGamma: number = 0,
  calBeta: number = 0,
  deadzoneDegrees: number = 3.5,
  sensitivity: number = 1.6
): Vector2D {
  // Delta from calibrated resting wrist angle
  let dGamma = rawGamma - calGamma;
  let dBeta = rawBeta - calBeta;

  // Clamp max tilt angles to prevent crazy speed
  dGamma = Math.max(-45, Math.min(45, dGamma));
  dBeta = Math.max(-45, Math.min(45, dBeta));

  // Apply circular or axial deadzone
  const mag = Math.hypot(dGamma, dBeta);
  if (mag < deadzoneDegrees) {
    return { x: 0, y: 0 };
  }

  // Soft transition out of deadzone
  const adjustedMag = (mag - deadzoneDegrees) / (45 - deadzoneDegrees);
  const normalizedMag = Math.min(1.0, adjustedMag * sensitivity);

  const angle = Math.atan2(dBeta, dGamma);
  return {
    x: Math.cos(angle) * normalizedMag,
    y: Math.sin(angle) * normalizedMag
  };
}

/**
 * Euclidean distance
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

/**
 * Check if player is close enough to collect a berry
 */
export function isBerryCollected(
  playerX: number,
  playerY: number,
  berryX: number,
  berryY: number,
  collectionRadius: number = 28
): boolean {
  return distance(playerX, playerY, berryX, berryY) <= collectionRadius;
}

/**
 * Calculate final points awarded when eating a berry
 */
export function calculatePoints(
  basePoints: number,
  hasDoublePoints: boolean = false,
  pokemonBonusMultiplier: number = 1.0,
  comboCount: number = 0
): number {
  let pts = basePoints;
  if (hasDoublePoints) {
    pts *= 2;
  }
  pts *= pokemonBonusMultiplier;

  // Combo multiplier: +10% per consecutive combo up to 2.0x
  const comboMultiplier = 1 + Math.min(1.0, comboCount * 0.1);
  return Math.round(pts * comboMultiplier);
}

/**
 * Simple deterministic pseudo-random generator
 */
export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Picks a random berry type based on rarity weights
 */
export function pickRandomBerryType(randomVal: number = Math.random()): BerryType {
  const berries = Object.values(BERRY_DEFINITIONS);
  const totalWeight = berries.reduce((acc, b) => acc + b.rarityWeight, 0);
  let threshold = randomVal * totalWeight;

  for (const berry of berries) {
    if (threshold <= berry.rarityWeight) {
      return berry.type;
    }
    threshold -= berry.rarityWeight;
  }
  return 'oran';
}

/**
 * Spawns berries dynamically around a world coordinate if density is low
 */
export function generateSurroundingBerries(
  currentBerries: BerryItem[],
  playerX: number,
  playerY: number,
  targetCount: number = 24,
  spawnRadius: number = 480
): BerryItem[] {
  // Filter out berries that are way too far away (> 1200px)
  const keptBerries = currentBerries.filter(
    (b) => distance(playerX, playerY, b.x, b.y) < 1200
  );

  const needed = targetCount - keptBerries.length;
  if (needed <= 0) return keptBerries;

  const newBerries: BerryItem[] = [...keptBerries];
  const now = Date.now();

  for (let i = 0; i < needed; i++) {
    // Generate berry in a ring around player
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * spawnRadius;
    const bx = Math.round(playerX + Math.cos(angle) * dist);
    const by = Math.round(playerY + Math.sin(angle) * dist);

    const type = pickRandomBerryType();
    newBerries.push({
      id: `berry_${now}_${i}_${Math.floor(Math.random() * 10000)}`,
      x: bx,
      y: by,
      type,
      points: BERRY_DEFINITIONS[type].points,
      spawnTime: now,
      bobOffset: Math.random() * Math.PI * 2
    });
  }

  return newBerries;
}
