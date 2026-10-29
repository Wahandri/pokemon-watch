export type PokemonType = 
  | 'electric' 
  | 'fire' 
  | 'water' 
  | 'grass' 
  | 'normal' 
  | 'ghost' 
  | 'psychic' 
  | 'fighting' 
  | 'dragon' 
  | 'fairy' 
  | 'dark' 
  | 'ground';

export interface PokemonInfo {
  id: number;
  name: string;
  spanishName: string;
  types: PokemonType[];
  speed: number; // Speed multiplier, e.g. 1.0 to 1.3
  magnetRadius: number; // Berry attraction distance in px (e.g. 35 to 70)
  passiveAbility: string;
  spriteUrl: string;
  accentColor: string;
  generation: string;
}

export type BerryType = 'oran' | 'cheri' | 'pecha' | 'sitrus' | 'lum' | 'golden';

export interface BerryDefinition {
  type: BerryType;
  name: string;
  spanishName: string;
  points: number;
  color: string;
  glowColor: string;
  rarityWeight: number; // Higher = more common
  effectDuration?: number; // seconds
  description: string;
}

export interface BerryItem {
  id: string;
  x: number;
  y: number;
  type: BerryType;
  points: number;
  spawnTime: number;
  bobOffset: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface GyroState {
  gamma: number; // left/right tilt (-90 to 90)
  beta: number; // front/back tilt (-180 to 180)
  calibratedGamma: number;
  calibratedBeta: number;
  hasHardwareGyro: boolean;
  isActive: boolean;
  sensitivity: number; // 1.0 to 2.5
}

export interface PlayerStats {
  berriesCollected: number;
  totalScore: number;
  stepsWalked: number;
  distanceTraveled: number;
  activeBuff?: {
    type: 'speed' | 'magnet' | 'double_points';
    expiresAt: number;
  };
  comboCount: number;
  lastBerryTime: number;
}

export type GameView = 'title' | 'playing' | 'paused' | 'gameover';
