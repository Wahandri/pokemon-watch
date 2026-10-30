import { SPECIES_BY_ID, MOVES, TYPE_CHART, SpeciesData } from './gen1Data';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface Combatant {
  speciesId: number;
  level: number;
  hp: number;
  maxHp: number;
  stats: Stats;
  name: string;
}

export interface TurnEvent {
  text: string;
}

export interface TurnResult {
  events: string[];
  player: Combatant;
  enemy: Combatant;
  playerFainted: boolean;
  enemyFainted: boolean;
}

const IV = 15;

function statFormula(base: number, level: number): number {
  return Math.floor(((2 * base + IV) * level) / 100) + 5;
}

export function statsFor(speciesId: number, level: number): Stats {
  const species = SPECIES_BY_ID[speciesId];
  const b = species.baseStats;
  return {
    hp: Math.floor(((2 * b.hp + IV) * level) / 100) + level + 10,
    atk: statFormula(b.atk, level),
    def: statFormula(b.def, level),
    spa: statFormula(b.spa, level),
    spd: statFormula(b.spd, level),
    spe: statFormula(b.spe, level)
  };
}

export function createCombatant(speciesId: number, level: number, wild = false): Combatant {
  const stats = statsFor(speciesId, level);

  // Los salvajes son algo mas debiles que un Pokemon entrenado: asi el jugador
  // gana la mayoria de combates igualados sin que sea trivial.
  if (wild) {
    const factor = 0.88;
    stats.hp = Math.max(1, Math.round(stats.hp * factor));
    stats.atk = Math.round(stats.atk * 0.95);
    stats.def = Math.round(stats.def * 0.95);
    stats.spa = Math.round(stats.spa * 0.95);
    stats.spd = Math.round(stats.spd * 0.95);
  }

  return {
    speciesId,
    level,
    hp: stats.hp,
    maxHp: stats.hp,
    stats,
    name: SPECIES_BY_ID[speciesId].name
  };
}

export function species(id: number): SpeciesData {
  return SPECIES_BY_ID[id];
}

export function moveName(moveId: string): string {
  return MOVES[moveId]?.name ?? moveId;
}

export function effectiveness(moveType: string, defenderTypes: string[]): number {
  let multiplier = 1;
  for (const type of defenderTypes) {
    multiplier *= TYPE_CHART[moveType]?.[type] ?? 1;
  }
  return multiplier;
}

export function effectivenessLabel(multiplier: number): string | null {
  if (multiplier > 1.01) return '¡Es supereficaz!';
  if (multiplier === 0) return 'No afecta...';
  if (multiplier < 0.99) return 'No es muy eficaz...';
  return null;
}

/** Danio con la formula de GBA simplificada y ajustada a combates de 2-3 rondas. */
export function calculateDamage(
  attacker: Combatant,
  defender: Combatant,
  moveId: string,
  roll: number = Math.random()
): { damage: number; multiplier: number; missed: boolean } {
  const move = MOVES[moveId];
  const attackerTypes = species(attacker.speciesId).types;
  const defenderTypes = species(defender.speciesId).types;

  if (roll * 100 > move.accuracy) {
    return { damage: 0, multiplier: 1, missed: true };
  }

  const physical = move.category === 'physical';
  const attackStat = physical ? attacker.stats.atk : attacker.stats.spa;
  const defenseStat = physical ? defender.stats.def : defender.stats.spd;

  const base =
    (((2 * attacker.level) / 5 + 2) * move.power * (attackStat / Math.max(1, defenseStat))) / 38 + 2;

  const stab = attackerTypes.includes(move.type) ? 1.5 : 1;
  const multiplier = effectiveness(move.type, defenderTypes);
  const variance = 0.85 + Math.random() * 0.15;

  const damage = Math.max(1, Math.floor(base * stab * multiplier * variance));
  return { damage: multiplier === 0 ? 0 : damage, multiplier, missed: false };
}

export function xpForWin(enemyLevel: number): number {
  return 6 + Math.round(enemyLevel * 3);
}

export function xpToNext(level: number): number {
  return 12 + level * 8;
}

export function canEvolve(speciesId: number, level: number) {
  return species(speciesId).evolutions.filter((evo) => evo.level <= level);
}

export function enemyMoveFor(combatant: Combatant): string {
  const moves = species(combatant.speciesId).moves;
  return moves[Math.floor(Math.random() * moves.length)];
}

/** Resuelve un turno completo. El mas rapido ataca primero. */
export function resolveTurn(
  player: Combatant,
  enemy: Combatant,
  playerMoveId: string
): TurnResult {
  const events: string[] = [];
  const p = { ...player };
  const e = { ...enemy };
  const enemyMoveId = enemyMoveFor(e);

  const playerFirst = p.stats.spe >= e.stats.spe;

  const attack = (attacker: Combatant, defender: Combatant, moveId: string, label: string) => {
    const result = calculateDamage(attacker, defender, moveId);
    const move = MOVES[moveId];
    if (result.missed) {
      events.push(`${label} usa ${move.name}... ¡pero falla!`);
      return;
    }
    const notVery = effectivenessLabel(result.multiplier);
    events.push(`${label} usa ${move.name}${notVery ? ` · ${notVery}` : ''}`);
    defender.hp = Math.max(0, defender.hp - result.damage);
  };

  const playerLabel = `${p.name}`;
  const enemyLabel = `El ${e.name} rival`;

  if (playerFirst) {
    attack(p, e, playerMoveId, playerLabel);
    if (e.hp > 0) attack(e, p, enemyMoveId, enemyLabel);
  } else {
    attack(e, p, enemyMoveId, enemyLabel);
    if (p.hp > 0) attack(p, e, playerMoveId, playerLabel);
  }

  return {
    events,
    player: p,
    enemy: e,
    playerFainted: p.hp <= 0,
    enemyFainted: e.hp <= 0
  };
}

export function fleeChance(player: Combatant, enemy: Combatant): number {
  const speedDiff = player.stats.spe - enemy.stats.spe;
  return Math.min(0.95, Math.max(0.35, 0.55 + speedDiff * 0.01));
}

/** Solo el ataque del rival (cuando fallas al huir). */
export function resolveEnemyAttack(player: Combatant, enemy: Combatant): TurnResult {
  const events: string[] = [];
  const p = { ...player };
  const e = { ...enemy };
  const moveId = enemyMoveFor(e);
  const move = MOVES[moveId];
  const result = calculateDamage(e, p, moveId);

  if (result.missed) {
    events.push(`El ${e.name} rival usa ${move.name}... ¡pero falla!`);
  } else {
    const label = effectivenessLabel(result.multiplier);
    events.push(`El ${e.name} rival usa ${move.name}${label ? ` · ${label}` : ''}`);
    p.hp = Math.max(0, p.hp - result.damage);
  }

  return { events, player: p, enemy: e, playerFainted: p.hp <= 0, enemyFainted: false };
}
