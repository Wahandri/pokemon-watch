import { OwnedPokemon, SaveData } from './types';

const STORAGE_KEY = 'pokewatch.save.v1';
const STARTERS = [1, 4, 7, 25]; // Bulbasaur, Charmander, Squirtle, Pikachu

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createPokemon(speciesId: number, level: number): OwnedPokemon {
  return {
    uid: uid(),
    speciesId,
    level,
    xp: 0,
    asleepUntil: 0
  };
}

export function defaultSave(): SaveData {
  const owned = STARTERS.map((id) => createPokemon(id, 5));
  return {
    version: 1,
    owned,
    activeUid: owned[0].uid,
    dexSeen: [...STARTERS],
    dexCaught: [...STARTERS],
    berries: 0
  };
}

export function loadSave(): SaveData {
  if (typeof window === 'undefined') {
    return defaultSave();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();

    const parsed = JSON.parse(raw) as SaveData;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.owned) || !parsed.owned.length) {
      return defaultSave();
    }

    // Limpieza: el activo debe existir y no estar dormido.
    const now = Date.now();
    const awake = parsed.owned.filter((p) => p.asleepUntil <= now);
    const activeExists = parsed.owned.some((p) => p.uid === parsed.activeUid);
    if (!activeExists) {
      parsed.activeUid = (awake[0] ?? parsed.owned[0]).uid;
    }

    return {
      ...parsed,
      dexSeen: parsed.dexSeen ?? [],
      dexCaught: parsed.dexCaught ?? [],
      berries: parsed.berries ?? 0
    };
  } catch (error) {
    console.warn('No se pudo leer la partida guardada', error);
    return defaultSave();
  }
}

export function persistSave(save: SaveData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch (error) {
    console.warn('No se pudo guardar la partida', error);
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sin localStorage no hay nada que borrar
  }
}

export const SLEEP_MS = 30 * 60 * 1000;

export function wakeCost(level: number): number {
  return 20 + level * 2;
}

export function isAsleep(pokemon: OwnedPokemon, now: number = Date.now()): boolean {
  return pokemon.asleepUntil > now;
}
