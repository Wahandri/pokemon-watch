/**
 * Genera los datos de combate de Gen 1 (151 especies).
 *
 * - Especies, tipos, stats y evoluciones: @pkmn/dex (MIT), ya instalado en
 *   el servidor dentro de poke-rpg.
 * - Movimientos y learnsets: JSON de poke-rpg (Pokémon League Online).
 *
 * Salida:
 *   src/game/gen1Data.ts      especies, movimientos y tabla de tipos
 *   scripts/species-map.json  mapa nombre -> numero/slug para la libreria
 *
 * Uso: node scripts/build-battle-data.cjs
 */
const fs = require('fs');
const path = require('path');

const POKE_RPG = '/opt/server/apps/poke-rpg';
const { Dex } = require(`${POKE_RPG}/node_modules/@pkmn/dex`);

const dex = Dex.forGen(1);
const modern = Dex;

const learnsets = JSON.parse(fs.readFileSync(`${POKE_RPG}/src/data/learnsets.json`, 'utf8'));
const moveCatalog = JSON.parse(fs.readFileSync(`${POKE_RPG}/src/data/moves.json`, 'utf8'));

const STONE_LEVEL = 30;
const TRADE_LEVEL = 40;
const EEVEE_LEVEL = 25;

// Mew no tiene learnset en el JSON: se le da un pool decente.
const MEW_MOVES = ['psychic', 'thunderbolt', 'icebeam', 'flamethrower', 'surf', 'shadowball', 'aurasphere'];
const MEW_FALLBACK = MEW_MOVES.filter((id) => moveCatalog[id]);

// --- utilidades -----------------------------------------------------------

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[’'.]/g, '')
    .replace(/♀/g, '_f')
    .replace(/♂/g, '_m')
    .replace(/[\s-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function effectiveness(moveType, defenderTypes) {
  let result = 1;
  for (const def of defenderTypes) {
    const taken = dex.types.get(def).damageTaken[moveType];
    // 0 = normal, 1 = debil (x2), 2 = resiste (x0.5), 3 = inmune
    if (taken === 1) result *= 2;
    else if (taken === 2) result *= 0.5;
    else if (taken === 3) result *= 0;
  }
  return result;
}

function evolutionsFor(species) {
  if (species.num === 133) {
    return {
      special: 'eevee',
      evolutions: [134, 135, 136].map((num) => ({ to: num, level: EEVEE_LEVEL })),
    };
  }

  const evolutions = [];
  const seen = new Set();
  for (const evoName of species.evos || []) {
    const evo = modern.species.get(evoName);
    if (!evo || !evo.num || evo.num > 151) continue;

    let level = evo.evoLevel;
    if (!level) {
      if (evo.evoType === 'trade' || evo.evoTrade) level = TRADE_LEVEL;
      else if (evo.evoItem || evo.evoType === 'useItem') level = STONE_LEVEL;
    }
    if (!level || seen.has(evo.num)) continue;
    seen.add(evo.num);
    evolutions.push({ to: evo.num, level });
  }
  return { evolutions };
}


// Nombres oficiales en castellano de los movimientos usados.
const MOVE_NAMES_ES = {
  gigadrain: 'Gigadrenado', headbutt: 'Golpe Cabeza', bodyslam: 'Golpe Cuerpo',
  acidspray: 'Bomba Ácida', flameburst: 'Pirotecnia', firepunch: 'Puño Fuego',
  airslash: 'Tajo Aéreo', firefang: 'Colmillo Ígneo', brine: 'Salmuera',
  bubblebeam: 'Rayo Burbuja', xscissor: 'Tijera X', bugbite: 'Picadura',
  signalbeam: 'Doble Rayo', uturn: 'Ida y Vuelta', venoshock: 'Carga Tóxica',
  facade: 'Imagen', aerialace: 'Ataque Aéreo', aircutter: 'Aire Afilado',
  poisonjab: 'Puya Nociva', voltswitch: 'Voltio Cambio', thunderpunch: 'Puño Trueno',
  dig: 'Excavar', brickbreak: 'Demolición', drillrun: 'Taladradora',
  chipaway: 'Guardia Baja', flamecharge: 'Nitrocarga', absorb: 'Absorber',
  mudbomb: 'Bomba Fango', drainpunch: 'Puño Drenaje', ember: 'Ascuas',
  bubble: 'Burbuja', psybeam: 'Psicoonda', psyshock: 'Psicochoque',
  psychocut: 'Psicocorte', karatechop: 'Golpe Kárate', acid: 'Ácido',
  crosspoison: 'Veneno X', rockslide: 'Avalancha', ancientpower: 'Poder Pasado',
  flamewheel: 'Rueda Fuego', spark: 'Chispa', mirrorshot: 'Disparo Espejo',
  flashcannon: 'Cañón Flash', acrobatics: 'Acróbata', aurorabeam: 'Rayo Aurora',
  sludge: 'Residuos', razorshell: 'Concha Filo', shadowball: 'Bola Sombra',
  shadowclaw: 'Garra Umbría', synchronoise: 'Sincrorruido', boneclub: 'Hueso Palo',
  aurasphere: 'Esfera Aural', dizzypunch: 'Puño Mareo', aquatail: 'Acua Cola',
  icepunch: 'Puño Hielo', bulldoze: 'Terratemblor', surf: 'Surf', bounce: 'Bote',
  tackle: 'Placaje', slash: 'Cuchillada', quickattack: 'Ataque Rápido',
  electroweb: 'Electrotela', confusion: 'Confusión', thunderfang: 'Colmillo Rayo', discharge: 'Chispazo',
  dragonclaw: 'Garra Dragón', dragonbreath: 'Dragón Aliento', psychic: 'Psíquico',
};

const TYPE_FILLERS = {
  normal: ['tackle', 'headbutt', 'quickattack', 'bodyslam', 'slash'],
  fire: ['ember', 'flamethrower', 'firefang', 'firespin'],
  water: ['watergun', 'surf', 'bubblebeam', 'aquajet'],
  grass: ['vinewhip', 'razorleaf', 'magicalleaf', 'gigadrain'],
  electric: ['thundershock', 'thunderbolt', 'spark', 'chargebeam'],
  ice: ['icebeam', 'icywind', 'powdersnow'],
  fighting: ['karatechop', 'lowkick', 'brickbreak'],
  poison: ['poisonsting', 'sludgebomb', 'acid'],
  ground: ['mudslap', 'dig', 'earthquake'],
  flying: ['gust', 'wingattack', 'aerialace'],
  psychic: ['confusion', 'psybeam', 'psychic'],
  bug: ['bugbite', 'xscissor', 'silverwind'],
  rock: ['rockthrow', 'rockslide'],
  ghost: ['lick', 'shadowball', 'nightshade'],
  dragon: ['dragonbreath', 'dragonclaw'],
};

/** Elige 4 movimientos: 2 del tipo propio y 2 de cobertura, con potencia media. */
function pickMoves(num, species) {
  const types = species.types.map((t) => t.toLowerCase());
  const valid = (m) => m && m.power > 0 && m.power <= 95 && m.accuracy > 0;

  const fromLearn = (learnsets[num] || MEW_FALLBACK).map((id) => moveCatalog[id]).filter(valid);
  const normalFillers = (TYPE_FILLERS.normal || []).map((id) => moveCatalog[id]).filter(valid);
  const typeFillers = [...types, 'normal']
    .flatMap((t) => (TYPE_FILLERS[t] || []).map((id) => moveCatalog[id]))
    .filter(valid);

  const usable = [...fromLearn, ...typeFillers];
  if (!usable.length) return ['tackle'];

  const byPower = (a, b) => Math.abs(a.power - 70) - Math.abs(b.power - 70) || b.power - a.power;
  const stab = usable.filter((m) => types.includes(m.type.toLowerCase())).sort(byPower);
  const coverageFromLearn = fromLearn
    .filter((m) => !types.includes(m.type.toLowerCase()))
    .sort(byPower);

  const stabPick = stab[0];
  let coveragePick = coverageFromLearn[0];

  // Si solo aprende movimientos de su tipo, se le da un ataque normal distinto
  // segun la especie (para no acabar todos con Golpe Cabeza).
  if (!coveragePick && normalFillers.length) {
    coveragePick = normalFillers[num % normalFillers.length];
  }

  return [stabPick, coveragePick].filter(Boolean).map((m) => m.id);
}

// --- especies -------------------------------------------------------------

const speciesList = [];
for (let num = 1; num <= 151; num++) {
  const species = dex.species.all().find((s) => s.num === num);
  if (!species) throw new Error(`Sin especie para ${num}`);
  speciesList.push(species);
}

const moveIds = new Set();

const outSpecies = speciesList.map((species) => {
  const { evolutions, special } = evolutionsFor(species);
  const moves = pickMoves(species.num, species);
  moves.forEach((m) => moveIds.add(m));

  return {
    id: species.num,
    name: species.name,
    slug: slugify(species.name),
    types: species.types.map((t) => t.toLowerCase()),
    baseStats: {
      hp: species.baseStats.hp,
      atk: species.baseStats.atk,
      def: species.baseStats.def,
      spa: species.baseStats.spa,
      spd: species.baseStats.spd,
      spe: species.baseStats.spe,
    },
    evolutions,
    ...(special ? { special } : {}),
    moves,
  };
});

// --- movimientos ----------------------------------------------------------

const outMoves = {};
for (const id of moveIds) {
  const move = moveCatalog[id];
  outMoves[id] = {
    name: MOVE_NAMES_ES[id] ?? move.name ?? id,
    type: move.type.toLowerCase(),
    power: move.power,
    accuracy: move.accuracy === true ? 100 : move.accuracy,
    category: move.category === 'Special' ? 'special' : 'physical',
  };
}

// --- tabla de tipos -------------------------------------------------------

const typesUsed = [...new Set(outSpecies.flatMap((s) => s.types))].sort();
const outTypes = {};
for (const atk of typesUsed) {
  outTypes[atk] = {};
  for (const def of typesUsed) {
    const mult = effectiveness(atk, [def]);
    if (mult !== 1) outTypes[atk][def] = mult;
  }
}

// --- escribir -------------------------------------------------------------

const header = `// Generado por scripts/build-battle-data.cjs
// Especies/evoluciones: @pkmn/dex (MIT). Movimientos: datos de poke-rpg.
// No editar a mano: vuelve a ejecutar el script.

export interface SpeciesEvolution {
  to: number;
  level: number;
}

export interface SpeciesData {
  id: number;
  name: string;
  slug: string;
  types: string[];
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  evolutions: SpeciesEvolution[];
  special?: 'eevee';
  moves: string[];
}

export interface MoveData {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  category: 'physical' | 'special';
}

`;

const body =
  `${header}export const SPECIES: SpeciesData[] = ${JSON.stringify(outSpecies)};\n\n` +
  `export const MOVES: Record<string, MoveData> = ${JSON.stringify(outMoves)};\n\n` +
  `export const TYPE_CHART: Record<string, Record<string, number>> = ${JSON.stringify(outTypes)};\n\n` +
  `export const SPECIES_BY_ID: Record<number, SpeciesData> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));\n`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'game', 'gen1Data.ts'), body);

fs.writeFileSync(
  path.join(__dirname, 'gen1-list.json'),
  JSON.stringify(outSpecies.map((s) => ({ id: s.id, name: s.name, slug: s.slug })), null, 0)
);

const allSpecies = modern.species.all().map((s) => ({
  num: s.num,
  name: s.name,
  slug: slugify(s.name),
}));
fs.writeFileSync(path.join(__dirname, 'species-map.json'), JSON.stringify(allSpecies, null, 0));

const missingMoves = outSpecies.filter((s) => s.moves.length < 4).length;
console.log(`especies gen1: ${outSpecies.length}`);
console.log(`movimientos distintos: ${Object.keys(outMoves).length}`);
console.log(`especies con menos de 4 movimientos: ${missingMoves}`);
console.log(`tipos: ${typesUsed.join(', ')}`);
console.log(`gen1Data.ts: ${(body.length / 1024).toFixed(0)} KB`);
console.log(`species-map.json: ${allSpecies.length} especies`);
