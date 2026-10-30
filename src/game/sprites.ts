import { SPECIES_BY_ID } from './gen1Data';

const pad = (id: number) => String(id).padStart(3, '0');

/** Hoja 192x32 con los 6 fotogramas de caminar. */
export function walkSprite(speciesId: number): string {
  return `sprites/walk/${SPECIES_BY_ID[speciesId].slug}.png`;
}

/** Retrato 32x32 (fotograma frontal) para menus. */
export function portraitSprite(speciesId: number): string {
  return `sprites/portrait/${SPECIES_BY_ID[speciesId].slug}.png`;
}

/** Sprite de combate frontal (rival). */
export function frontSprite(speciesId: number): string {
  return `sprites/battle/front/${pad(speciesId)}.png`;
}

/** Sprite de combate de espalda (jugador). */
export function backSprite(speciesId: number): string {
  return `sprites/battle/back/${pad(speciesId)}.png`;
}

export function iconSprite(speciesId: number): string {
  return `sprites/battle/icon/${pad(speciesId)}.png`;
}

export function speciesName(speciesId: number): string {
  return SPECIES_BY_ID[speciesId]?.name ?? '???';
}
