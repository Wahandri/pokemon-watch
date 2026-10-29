import { Achievement, BerryType, PlayerStats } from './types';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_berry',
    title: 'Primer Bocado',
    description: 'Recolecta tu primera baya silvestre en el reloj.',
    icon: '🍓',
    current: 0,
    target: 1,
    unlocked: false
  },
  {
    id: 'berries_25',
    title: 'Cosechador Novato',
    description: 'Recolecta un total de 25 bayas.',
    icon: '🧺',
    current: 0,
    target: 25,
    unlocked: false
  },
  {
    id: 'berries_100',
    title: 'Maestro de Bayas',
    description: 'Recolecta 100 bayas para el profesor de Hoenn.',
    icon: '👑',
    current: 0,
    target: 100,
    unlocked: false
  },
  {
    id: 'steps_100',
    title: 'Paseo Pokémon',
    description: 'Da 100 pasos mientras juegas con el reloj.',
    icon: '👟',
    current: 0,
    target: 100,
    unlocked: false
  },
  {
    id: 'steps_500',
    title: 'Maratón Entrenador',
    description: 'Completa 500 pasos en tu Xiaomi Watch 2.',
    icon: '🏃',
    current: 0,
    target: 500,
    unlocked: false
  },
  {
    id: 'golden_berry',
    title: 'Tesoro Mítico',
    description: 'Encuentra y saborea una legendaria Baya Dorada.',
    icon: '✨',
    current: 0,
    target: 1,
    unlocked: false
  },
  {
    id: 'combo_5',
    title: 'Fiebre de Bayas',
    description: 'Encadena un combo de 5 bayas seguidas sin perder ritmo.',
    icon: '🔥',
    current: 0,
    target: 5,
    unlocked: false
  },
  {
    id: 'distance_1000',
    title: 'Explorador de Hoenn',
    description: 'Recorre 1000 metros en el mapa infinito.',
    icon: '🗺️',
    current: 0,
    target: 1000,
    unlocked: false
  },
  {
    id: 'pokemon_collector',
    title: 'Entrenador Versátil',
    description: 'Juega partidas con al menos 5 Pokémon diferentes.',
    icon: '⚡',
    current: 0,
    target: 5,
    unlocked: false
  },
  {
    id: 'gyro_master',
    title: 'Giroscopio Maestro',
    description: 'Recolecta 30 bayas controlando con el sensor de muñeca.',
    icon: '⌚',
    current: 0,
    target: 30,
    unlocked: false
  }
];

const STORAGE_KEY = 'pokewatch_achievements_v1';

export function loadStoredAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ACHIEVEMENTS;
    const parsed = JSON.parse(raw) as Achievement[];
    // Merge in case new achievements were added
    return INITIAL_ACHIEVEMENTS.map((initial) => {
      const found = parsed.find((p) => p.id === initial.id);
      return found ? { ...initial, ...found } : initial;
    });
  } catch {
    return INITIAL_ACHIEVEMENTS;
  }
}

export function saveStoredAchievements(achievements: Achievement[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
  } catch {
    // ignore
  }
}

export interface CheckAchievementParams {
  stats: PlayerStats;
  lastBerryType?: BerryType;
  usedGyroCount: number;
  uniquePokemonCount: number;
}

/**
 * Checks all achievements, updates progress, and returns newly unlocked achievements
 */
export function evaluateAchievements(
  currentList: Achievement[],
  params: CheckAchievementParams
): { updatedList: Achievement[]; newlyUnlocked: Achievement[] } {
  const newlyUnlocked: Achievement[] = [];
  const now = Date.now();

  const updatedList = currentList.map((ach) => {
    if (ach.unlocked) return ach;

    let newCurrent = ach.current;

    switch (ach.id) {
      case 'first_berry':
      case 'berries_25':
      case 'berries_100':
        newCurrent = params.stats.berriesCollected;
        break;
      case 'steps_100':
      case 'steps_500':
        newCurrent = params.stats.stepsWalked;
        break;
      case 'golden_berry':
        if (params.lastBerryType === 'golden') {
          newCurrent = 1;
        }
        break;
      case 'combo_5':
        newCurrent = Math.max(ach.current, params.stats.comboCount);
        break;
      case 'distance_1000':
        newCurrent = Math.floor(params.stats.distanceTraveled);
        break;
      case 'pokemon_collector':
        newCurrent = params.uniquePokemonCount;
        break;
      case 'gyro_master':
        newCurrent = params.usedGyroCount;
        break;
    }

    const isNowUnlocked = newCurrent >= ach.target;
    if (isNowUnlocked && !ach.unlocked) {
      const unlockedAch = {
        ...ach,
        current: newCurrent,
        unlocked: true,
        unlockedAt: now
      };
      newlyUnlocked.push(unlockedAch);
      return unlockedAch;
    }

    return {
      ...ach,
      current: Math.min(newCurrent, ach.target)
    };
  });

  return { updatedList, newlyUnlocked };
}
