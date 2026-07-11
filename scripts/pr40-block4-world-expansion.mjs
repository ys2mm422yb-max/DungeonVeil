import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP = path.join(ROOT, 'artifacts/dungeon-rpg');
const SRC = path.join(APP, 'src');

function read(relative) {
  return fs.readFileSync(path.join(APP, relative), 'utf8');
}
function write(relative, content) {
  const target = path.join(APP, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
function replaceOne(content, before, after, label) {
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return content.replace(before, after);
}
function replaceRegex(content, pattern, after, label) {
  const matches = content.match(pattern);
  if (!matches || matches.length !== 1) throw new Error(`${label}: expected one regex match, found ${matches?.length ?? 0}`);
  return content.replace(pattern, after);
}

const expansion = String.raw`export type ExpandedRoomPhase = 'meadow-forest' | 'darkwood-village' | 'fortress-ember';
export type ExpandedRoomSilhouette = 'tri-island' | 'axial' | 'three-lane' | 'diagonal' | 's-curve' | 'ring' | 'zigzag' | 's-lane' | 'cross' | 'arena' | 'orbit';
export type ExpandedRoomPack = 'furniture' | 'tools' | 'resources' | 'forest' | 'halloween';
export type ExpandedRoomShell = 'intact' | 'abandoned' | 'monumental' | 'veil';

export type ExpandedRoomBlueprint = {
  room: number;
  nameDe: string;
  nameEn: string;
  phase: ExpandedRoomPhase;
  silhouette: ExpandedRoomSilhouette;
  heroObject: string;
  packs: ExpandedRoomPack[];
  keywords: string[];
  forbiddenKeywords: string[];
  density: number;
  shell: ExpandedRoomShell;
  portal: { x: number; z: number };
  enemySpawns: Array<{ x: number; z: number }>;
};

export type ExpandedWorldSetpiece = {
  model: string;
  x: number;
  y?: number;
  z: number;
  rotation?: number;
  scale?: number;
  collider?: readonly [number, number];
  fallbackModel?: string;
};

const P = (x: number, z: number) => ({ x, z });
const COMMON_SPAWNS = [
  [P(-4.8, -5.2), P(0, -6.2), P(4.8, -5.2), P(-5.4, 0.2), P(5.4, 0.2), P(-3.6, 4.7), P(3.6, 4.7)],
  [P(-5.2, -6.0), P(3.8, -5.2), P(-2.0, -2.0), P(4.6, 0.4), P(-4.6, 2.6), P(1.8, 5.1)],
  [P(-4.0, -6.3), P(4.0, -6.3), P(-5.4, -1.2), P(5.4, -1.2), P(-3.8, 4.6), P(0, 5.6), P(3.8, 4.6)],
] as const;

const regions = [
  {
    first: 21,
    phase: 'meadow-forest' as const,
    namesDe: ['Waldtor', 'Sonnenlichtung', 'Steinpfad', 'Holzfällerlager', 'Bachübergang', 'Pilzgarten', 'Jägerlager', 'Alter Hain', 'Ruinenwiese', 'Waldhüter-Arena'],
    namesEn: ['Forest Gate', 'Sunlit Clearing', 'Stone Path', 'Woodcutters Camp', 'Brook Crossing', 'Mushroom Garden', 'Hunters Camp', 'Ancient Grove', 'Ruined Meadow', 'Forest Warden Arena'],
    heroes: ['Baumtor', 'offene Lichtung', 'alter Wegstein', 'Holzstapel und Werkbank', 'Steinübergang', 'Pilzring', 'Jägertisch', 'uralter Baumkreis', 'überwachsene Ruinen', 'Waldhüter-Stein'],
    packs: ['forest', 'furniture', 'tools'] as ExpandedRoomPack[],
    keywords: ['tree', 'bush', 'grass', 'rock', 'path', 'camp'],
    forbidden: ['coffin', 'crypt', 'lava', 'dungeon_wall'],
    shell: 'intact' as const,
  },
  {
    first: 31,
    phase: 'darkwood-village' as const,
    namesDe: ['Nebelpfad', 'Verlassener Hof', 'Schwarzwurzelhain', 'Friedhofsweg', 'Zerfallene Kapelle', 'Morsche Brücke', 'Nachtmarkt', 'Hexenplatz', 'Dorfplatz', 'Schattenhüter-Arena'],
    namesEn: ['Mist Path', 'Abandoned Yard', 'Blackroot Grove', 'Grave Road', 'Ruined Chapel', 'Rotten Bridge', 'Night Market', 'Witch Square', 'Village Square', 'Shadow Warden Arena'],
    heroes: ['Nebelgasse', 'verlassener Hofbrunnen', 'verwurzelter Steinkreis', 'Graballee', 'Kapellenschrein', 'morsche Übergangsstelle', 'leere Marktstände', 'Hexenschrein', 'Dorfdenkmal', 'Schattenaltar'],
    packs: ['forest', 'halloween', 'furniture'] as ExpandedRoomPack[],
    keywords: ['tree', 'root', 'grave', 'lantern', 'bench', 'shrine'],
    forbidden: ['bright_flower', 'gold_chest', 'clean_table'],
    shell: 'abandoned' as const,
  },
  {
    first: 41,
    phase: 'fortress-ember' as const,
    namesDe: ['Festungstor', 'Waffengang', 'Kettenhof', 'Glutschmiede', 'Glutarchiv', 'Barrikadenhof', 'Kommandosaal', 'Aschenkammer', 'Thronschleuse', 'Glutwächter-Arena'],
    namesEn: ['Fortress Gate', 'Weapon Gallery', 'Chain Yard', 'Ember Forge', 'Ember Archive', 'Barricade Court', 'Command Hall', 'Ash Chamber', 'Throne Approach', 'Ember Warden Arena'],
    heroes: ['schweres Tor', 'Waffenständer', 'Kettenanker', 'glühender Amboss', 'versiegelte Truhen', 'zentrale Barrikade', 'Kriegstisch', 'Aschenaltar', 'Thronachse', 'Glutkern'],
    packs: ['tools', 'resources', 'halloween'] as ExpandedRoomPack[],
    keywords: ['gate', 'weapon', 'shield', 'anvil', 'brazier', 'torch', 'stone'],
    forbidden: ['bed', 'flower', 'mushroom', 'pillow'],
    shell: 'monumental' as const,
  },
] as const;

const silhouettes: ExpandedRoomSilhouette[] = ['axial', 'ring', 'diagonal', 's-curve', 'cross', 'orbit', 'zigzag', 'three-lane', 's-lane', 'arena'];

export const EXPANDED_ROOM_BLUEPRINTS: ExpandedRoomBlueprint[] = regions.flatMap(region =>
  region.namesDe.map((nameDe, index) => {
    const room = region.first + index;
    const boss = index === 9;
    return {
      room,
      nameDe,
      nameEn: region.namesEn[index],
      phase: region.phase,
      silhouette: silhouettes[index],
      heroObject: region.heroes[index],
      packs: [...region.packs],
      keywords: [...region.keywords],
      forbiddenKeywords: [...region.forbidden],
      density: boss ? 2 : 4 + (index % 3),
      shell: region.shell,
      portal: P(0, -13.7),
      enemySpawns: boss ? [P(0, -3.0)] : COMMON_SPAWNS[index % COMMON_SPAWNS.length].map(point => ({ ...point })),
    };
  }),
);

const F = 'forest/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
const T = 'tools/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';
const U = 'furniture/Assets/gltf';
const W = 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf';

const s = (model: string, x: number, z: number, rotation = 0, scale = 1, collider?: readonly [number, number], y = 0): ExpandedWorldSetpiece => ({ model, x, y, z, rotation, scale, collider });

function meadowBoundary(variant: number): ExpandedWorldSetpiece[] {
  const trees = ['Tree_1_A_Color1.gltf', 'Tree_1_B_Color1.gltf', 'Tree_1_C_Color1.gltf', 'Tree_2_A_Color1.gltf', 'Tree_2_B_Color1.gltf', 'Tree_2_C_Color1.gltf'];
  return [
    s(`${F}/${trees[variant % trees.length]}`, -8.4, -5.2, 0.1, 1.18, [1.8, 1.8]),
    s(`${F}/${trees[(variant + 1) % trees.length]}`, 8.4, -5.0, -0.1, 1.14, [1.8, 1.8]),
    s(`${F}/${trees[(variant + 2) % trees.length]}`, -8.5, 4.5, 0.2, 1.12, [1.8, 1.8]),
    s(`${F}/${trees[(variant + 3) % trees.length]}`, 8.5, 4.4, -0.2, 1.18, [1.8, 1.8]),
    s(`${F}/Bush_2_${String.fromCharCode(65 + (variant % 6))}_Color1.gltf`, -6.5, 0.2, 0, 1.0),
    s(`${F}/Bush_3_${String.fromCharCode(65 + (variant % 3))}_Color1.gltf`, 6.5, 0.6, 0, 1.0),
    s(`${F}/Grass_1_${String.fromCharCode(65 + (variant % 4))}_Color1.gltf`, -3.2, 3.8, 0, 1.25),
    s(`${F}/Grass_2_${String.fromCharCode(65 + ((variant + 1) % 4))}_Color1.gltf`, 3.2, 3.6, 0, 1.2),
  ];
}

function meadowRoom(local: number): ExpandedWorldSetpiece[] {
  const pieces = meadowBoundary(local);
  const focal: Record<number, ExpandedWorldSetpiece[]> = {
    1: [s(`${F}/Rock_2_A_Color1.gltf`, -2.4, -2.3, 0.2, 1.2, [1.2, 1.0]), s(`${F}/Rock_2_C_Color1.gltf`, 2.4, -2.3, -0.2, 1.2, [1.2, 1.0])],
    2: [s(`${F}/Grass_1_Mesh.gltf`, 0, -1.2, 0, 1.7), s(`${F}/Bush_4_A_Color1.gltf`, -5.2, -2.3, 0, 1.1), s(`${F}/Bush_4_C_Color1.gltf`, 5.2, -2.3, 0, 1.1)],
    3: [s(`${F}/Rock_3_A_Color1.gltf`, 0, -1.8, 0, 1.35, [1.3, 1.0]), s(`${F}/Rock_1_H_Color1.gltf`, -4.8, 1.5, 0.2, 1.0), s(`${F}/Rock_1_K_Color1.gltf`, 4.8, 1.5, -0.2, 1.0)],
    4: [s(`${U}/table_low.gltf`, 0, -2.0, 0, 1.0, [1.7, 0.9]), s(`${T}/saw.gltf`, -0.5, -1.8, 0.3, 1.15, undefined, 0.72), s(`${R}/Pallet_Wood.gltf`, 5.6, 2.7, 0.1, 1.05, [1.5, 0.9])],
    5: [s(`${F}/Rock_2_D_Color1.gltf`, -3.2, -1.6, 0.2, 1.15, [1.2, 0.9]), s(`${F}/Rock_2_F_Color1.gltf`, 3.2, -1.6, -0.2, 1.15, [1.2, 0.9]), s(`${F}/Grass_2_Mesh.gltf`, 0, 2.6, 0, 1.4)],
    6: [s(`${F}/Bush_4_B_Color1.gltf`, 0, -1.6, 0, 1.35, [1.0, 1.0]), s(`${F}/Grass_1_A_Color1.gltf`, -2.4, -0.2, 0, 1.3), s(`${F}/Grass_1_C_Color1.gltf`, 2.4, -0.2, 0, 1.3)],
    7: [s(`${U}/table_medium.gltf`, 0, -2.0, 0, 0.95, [1.7, 0.9]), s(`${D}/box_small.gltf`, -5.6, 2.6, 0.2, 1.0, [0.8, 0.8]), s(`${D}/barrel_small.gltf`, 5.6, 2.6, -0.2, 1.0, [0.8, 0.8])],
    8: [s(`${F}/Tree_2_C_Color1.gltf`, 0, -2.4, 0, 1.45, [2.1, 2.1]), s(`${F}/Rock_1_C_Color1.gltf`, -3.6, 0.2, 0, 1.0), s(`${F}/Rock_1_F_Color1.gltf`, 3.6, 0.2, 0, 1.0)],
    9: [s(`${D}/pillar.gltf`, -3.8, -2.8, 0, 0.9, [0.8, 0.8]), s(`${D}/pillar.gltf`, 3.8, -2.8, 0, 0.9, [0.8, 0.8]), s(`${F}/Grass_2_Mesh.gltf`, 0, 1.6, 0, 1.45)],
    10: [s(`${F}/Rock_3_R_Color1.gltf`, 0, -4.6, 0, 1.5, [1.8, 1.4]), s(`${F}/Tree_1_C_Color1.gltf`, -6.0, -1.0, 0.1, 1.25, [1.8, 1.8]), s(`${F}/Tree_2_B_Color1.gltf`, 6.0, -1.0, -0.1, 1.25, [1.8, 1.8])],
  };
  return [...pieces, ...(focal[local] ?? [])];
}

function darkwoodRoom(local: number): ExpandedWorldSetpiece[] {
  const pieces = meadowBoundary(local + 4);
  const focal: Record<number, ExpandedWorldSetpiece[]> = {
    1: [s(`${H}/lantern_standing.gltf`, -3.0, -2.6, 0, 1.15), s(`${H}/lantern_standing.gltf`, 3.0, -2.6, 0, 1.15)],
    2: [s(`${H}/bench_decorated.gltf`, -4.8, -1.2, Math.PI / 2, 1.0, [1.4, 0.8]), s(`${D}/box_stacked.gltf`, 4.8, -1.2, -0.1, 1.0, [1.1, 0.9])],
    3: [s(`${F}/Tree_2_A_Color1.gltf`, 0, -2.5, 0, 1.5, [2.0, 2.0]), s(`${H}/skull_candle.gltf`, -2.8, 0.2, 0, 1.05), s(`${H}/skull_candle.gltf`, 2.8, 0.2, 0, 1.05)],
    4: [s(`${H}/grave_A.gltf`, -4.2, -1.8, 0.1, 1.0, [1.2, 1.5]), s(`${H}/grave_B.gltf`, 4.2, -1.8, -0.1, 1.0, [1.2, 1.5]), s(`${H}/gravestone.gltf`, 0, 2.4, 0, 1.0, [1.1, 1.3])],
    5: [s(`${H}/arch_gate.gltf`, 0, -4.8, 0, 1.1, [2.0, 1.0]), s(`${H}/shrine.gltf`, 0, 2.0, Math.PI, 1.2, [1.2, 1.2])],
    6: [s(`${F}/Rock_3_D_Color1.gltf`, -3.4, -1.4, 0.2, 1.2, [1.2, 0.9]), s(`${F}/Rock_3_G_Color1.gltf`, 3.4, -1.4, -0.2, 1.2, [1.2, 0.9]), s(`${H}/post_lantern.gltf`, 0, 2.8, 0, 1.1)],
    7: [s(`${H}/bench.gltf`, -5.0, -1.0, Math.PI / 2, 1.0, [1.4, 0.8]), s(`${H}/bench_decorated.gltf`, 5.0, -1.0, -Math.PI / 2, 1.0, [1.4, 0.8]), s(`${D}/barrel_small_stack.gltf`, 0, 2.8, 0, 1.0, [1.1, 0.9])],
    8: [s(`${H}/shrine_candles.gltf`, 0, -1.8, 0, 1.45, [1.4, 1.4]), s(`${H}/candle_triple.gltf`, -3.0, 1.6, 0, 1.1), s(`${H}/candle_triple.gltf`, 3.0, 1.6, 0, 1.1)],
    9: [s(`${H}/post_lantern.gltf`, -4.8, -2.0, 0, 1.1), s(`${H}/post_lantern.gltf`, 4.8, -2.0, 0, 1.1), s(`${H}/gravemarker_A.gltf`, 0, 2.8, 0, 1.0, [1.0, 1.2])],
    10: [s(`${H}/shrine_candles.gltf`, 0, -4.6, 0, 1.65, [1.5, 1.5]), s(`${H}/grave_A_destroyed.gltf`, -6.0, -0.8, 0.1, 1.0, [1.2, 1.4]), s(`${H}/grave_A_destroyed.gltf`, 6.0, -0.8, -0.1, 1.0, [1.2, 1.4])],
  };
  return [...pieces, ...(focal[local] ?? [])];
}

function fortressRoom(local: number): ExpandedWorldSetpiece[] {
  const perimeter = [
    s(`${D}/barrier_column.gltf`, -7.2, -5.0, 0, 1.25, [0.9, 0.9]),
    s(`${D}/barrier_column.gltf`, 7.2, -5.0, 0, 1.25, [0.9, 0.9]),
    s(`${D}/barrier_column.gltf`, -7.2, 4.6, 0, 1.18, [0.9, 0.9]),
    s(`${D}/barrier_column.gltf`, 7.2, 4.6, 0, 1.18, [0.9, 0.9]),
    s(`${D}/torch_lit.gltf`, -3.0, -4.6, 0, 1.25),
    s(`${D}/torch_lit.gltf`, 3.0, -4.6, 0, 1.25),
  ];
  const focal: Record<number, ExpandedWorldSetpiece[]> = {
    1: [s(`${D}/wall_corner_gated.gltf`, 0, -2.8, 0, 1.0, [2.2, 1.2])],
    2: [s(`${W}/shield_A.gltf`, -4.8, -1.6, 0, 1.3), s(`${W}/spear_A.gltf`, 4.8, -1.6, 0.2, 1.3), s(`${D}/chest_gold.gltf`, 0, 2.8, Math.PI, 1.0, [1.3, 0.9])],
    3: [s(`${D}/barrier_column.gltf`, -3.8, -1.5, 0, 1.3, [0.9, 0.9]), s(`${D}/barrier_column.gltf`, 3.8, -1.5, 0, 1.3, [0.9, 0.9]), s(`${H}/post_skull.gltf`, 0, 2.6, 0, 1.1)],
    4: [s(`${T}/anvil.gltf`, 0, -1.7, 0, 1.55, [1.2, 0.9]), s(`${T}/grindstone.gltf`, 5.2, 2.8, -Math.PI / 2, 1.3, [1.0, 1.1]), s(`${R}/Iron_Bars_Stack_Large.gltf`, -5.2, 2.8, 0.1, 1.1, [1.3, 0.8])],
    5: [s(`${D}/chest_gold.gltf`, -3.2, -1.8, 0, 1.05, [1.3, 0.9]), s(`${D}/trunk_medium_A.gltf`, 3.2, -1.8, 0, 1.05, [1.3, 0.9]), s(`${H}/candle_triple.gltf`, 0, 2.4, 0, 1.15)],
    6: [s(`${D}/wall_half.gltf`, -3.8, -1.4, 0.1, 0.95, [2.0, 0.8]), s(`${D}/wall_half.gltf`, 3.8, 1.2, -0.1, 0.95, [2.0, 0.8])],
    7: [s(`${D}/table_long_decorated_A.gltf`, 0, -1.8, 0, 1.05, [2.4, 1.0]), s(`${W}/sword_C.gltf`, -0.7, -1.6, 0.2, 1.1, undefined, 0.82), s(`${W}/shield_B.gltf`, 0.8, -1.6, -0.2, 1.1, undefined, 0.82)],
    8: [s(`${H}/shrine_candles.gltf`, 0, -1.8, 0, 1.45, [1.4, 1.4]), s(`${R}/Stone_Chunks_Large.gltf`, -5.0, 2.8, 0.2, 1.0, [1.3, 0.9]), s(`${R}/Stone_Chunks_Large.gltf`, 5.0, 2.8, -0.2, 1.0, [1.3, 0.9])],
    9: [s(`${D}/pillar_decorated.gltf`, -4.8, -1.8, 0, 1.3, [0.9, 0.9]), s(`${D}/pillar_decorated.gltf`, 4.8, -1.8, 0, 1.3, [0.9, 0.9]), s(`${D}/chest_gold.gltf`, 0, 2.8, Math.PI, 1.1, [1.3, 0.9])],
    10: [s(`${H}/shrine_candles.gltf`, 0, -4.8, 0, 1.65, [1.5, 1.5]), s(`${D}/pillar_decorated.gltf`, -6.0, -0.5, 0, 1.4, [0.9, 0.9]), s(`${D}/pillar_decorated.gltf`, 6.0, -0.5, 0, 1.4, [0.9, 0.9])],
  };
  return [...perimeter, ...(focal[local] ?? [])];
}

export function expandedWorldSetpieces(room: number): ExpandedWorldSetpiece[] {
  if (room < 21 || room > 50) return [];
  const local = ((room - 1) % 10) + 1;
  if (room <= 30) return meadowRoom(local);
  if (room <= 40) return darkwoodRoom(local);
  return fortressRoom(local);
}
`;
write('src/game/expandedWorldRooms.ts', expansion);

let bible = read('src/game/roomBible.ts');
bible = `import { EXPANDED_ROOM_BLUEPRINTS } from './expandedWorldRooms';\n${bible}`;
bible = replaceOne(
  bible,
  "export type RoomPhaseId = 'inhabited-mine' | 'abandoned-quarters' | 'ancient-ruins' | 'warden-veil';",
  "export type RoomPhaseId = 'inhabited-mine' | 'abandoned-quarters' | 'ancient-ruins' | 'warden-veil' | 'meadow-forest' | 'darkwood-village' | 'fortress-ember';",
  'room phase union',
);
bible = replaceOne(
  bible,
  "  'warden-veil': {\n    background: 0x100c13, fog: 0x100c13, ambient: 0xb9a9bf,\n    hemisphereSky: 0xc8b1d6, hemisphereGround: 0x160d18,\n    key: 0xb86a68, fill: 0x7643ba, exposure: 1.14,\n  },\n};",
  "  'warden-veil': {\n    background: 0x100c13, fog: 0x100c13, ambient: 0xb9a9bf,\n    hemisphereSky: 0xc8b1d6, hemisphereGround: 0x160d18,\n    key: 0xb86a68, fill: 0x7643ba, exposure: 1.14,\n  },\n  'meadow-forest': {\n    background: 0x789c99, fog: 0x8eb0a7, ambient: 0xdce7c8,\n    hemisphereSky: 0xcfe8e4, hemisphereGround: 0x31452d,\n    key: 0xffdfa2, fill: 0x84b9c2, exposure: 1.18,\n  },\n  'darkwood-village': {\n    background: 0x0d171f, fog: 0x101a23, ambient: 0x8f9da4,\n    hemisphereSky: 0x7891a8, hemisphereGround: 0x10151a,\n    key: 0x91a8c9, fill: 0x59447a, exposure: 1.04,\n  },\n  'fortress-ember': {\n    background: 0x1d0d08, fog: 0x1b0b07, ambient: 0xc5a08f,\n    hemisphereSky: 0xd09a7d, hemisphereGround: 0x24100b,\n    key: 0xff7042, fill: 0x6d3458, exposure: 1.12,\n  },\n};",
  'expanded phase lights',
);
bible = replaceOne(
  bible,
  "};\n\nexport function roomBibleSpec(roomNumber: number): RoomBibleSpec {\n  return ROOM_BIBLE[Math.max(1, Math.min(20, roomNumber))] ?? ROOM_BIBLE[1];\n}",
  "};\n\nfor (const blueprint of EXPANDED_ROOM_BLUEPRINTS) {\n  ROOM_BIBLE[blueprint.room] = room(\n    blueprint.room, blueprint.nameDe, blueprint.nameEn, blueprint.phase, blueprint.silhouette, blueprint.heroObject,\n    [...blueprint.packs], [...blueprint.keywords], [...blueprint.forbiddenKeywords], blueprint.density, blueprint.shell,\n    { ...blueprint.portal }, blueprint.enemySpawns.map(point => ({ ...point })),\n  );\n}\n\nexport function roomBibleSpec(roomNumber: number): RoomBibleSpec {\n  return ROOM_BIBLE[Math.max(1, Math.min(50, roomNumber))] ?? ROOM_BIBLE[1];\n}",
  'expanded room bible registration',
);
write('src/game/roomBible.ts', bible);

let chapter = read('src/game/chapterRun.ts');
chapter = replaceOne(chapter, 'export const CHAPTER_ROOMS = 20;', 'export const CHAPTER_ROOMS = 50;', 'chapter room count');
chapter = replaceOne(chapter, 'export const FINAL_BOSS_ROOM = 20;', 'export const FINAL_BOSS_ROOM = 50;\nexport const BOSS_ROOMS = [10, 20, 30, 40, 50] as const;', 'final boss room');
chapter = replaceOne(chapter, '  return room === MID_CHAPTER_BOSS_ROOM || room === FINAL_BOSS_ROOM;', '  return BOSS_ROOMS.includes(room as (typeof BOSS_ROOMS)[number]);', 'boss room detection');
write('src/game/chapterRun.ts', chapter);

let logical = read('src/game/logicalRoomSetpieces.ts');
logical = `import { expandedWorldSetpieces } from './expandedWorldRooms';\n${logical}`;
logical = replaceOne(
  logical,
  "export function logicalRoomSetpieces(room: number): LogicalRoomSetpiece[] {\n  const key = Math.max(1, Math.min(20, room));\n  const override = ROOM_OVERRIDES[key];",
  "export function logicalRoomSetpieces(room: number): LogicalRoomSetpiece[] {\n  const safeRoom = Math.max(1, Math.min(50, room));\n  const expanded = expandedWorldSetpieces(safeRoom);\n  if (expanded.length) return expanded.map(piece => ({ ...piece }));\n  const key = Math.min(20, safeRoom);\n  const override = ROOM_OVERRIDES[key];",
  'expanded setpiece routing',
);
write('src/game/logicalRoomSetpieces.ts', logical);

let identity = read('src/game/roomIdentity.ts');
identity = replaceOne(identity, "  | 'first-warden';", "  | 'first-warden'\n  | `world-room-${number}`;", 'identity id union');
identity = replaceOne(identity, '    id: STABLE_IDS[spec.room],', '    id: STABLE_IDS[spec.room] ?? `world-room-${spec.room}`,', 'identity fallback');
identity = replaceOne(identity, 'ROOM_IDENTITIES[Math.max(1, Math.min(20, room))]', 'ROOM_IDENTITIES[Math.max(1, Math.min(50, room))]', 'identity clamp');
write('src/game/roomIdentity.ts', identity);

let encounters = read('src/game/encounterPlan.ts');
encounters = replaceOne(
  encounters,
  "export function getEncounterPlan(room: number): EnemyType[] {\n  return ENCOUNTERS[Math.max(1, Math.min(20, room))] ?? ENCOUNTERS[1];\n}",
  "const REGION_POOLS: Record<number, EnemyType[]> = {\n  2: ['goblin', 'spider', 'vampire', 'skeleton', 'orc', 'slime'],\n  3: ['vampire', 'spider', 'demon', 'skeleton', 'golem', 'orc'],\n  4: ['orc', 'golem', 'demon', 'skeleton', 'vampire', 'spider'],\n  5: ['golem', 'demon', 'orc', 'vampire', 'skeleton', 'spider'],\n};\n\nexport function getEncounterPlan(room: number): EnemyType[] {\n  const safeRoom = Math.max(1, Math.min(50, room));\n  if (ENCOUNTERS[safeRoom]) return [...ENCOUNTERS[safeRoom]];\n  if (safeRoom % 10 === 0) return [];\n  const region = Math.ceil(safeRoom / 10);\n  const pool = REGION_POOLS[region] ?? REGION_POOLS[2];\n  const local = (safeRoom - 1) % 10;\n  const count = Math.min(8, 5 + Math.floor(local / 2));\n  return Array.from({ length: count }, (_, index) => pool[(index + local * 2) % pool.length]);\n}",
  'expanded encounter generation',
);
write('src/game/encounterPlan.ts', encounters);

let audit = read('src/game/productionAudit.ts');
audit = replaceOne(audit, "import { isBossRoom } from './chapterRun';", "import { CHAPTER_ROOMS, isBossRoom } from './chapterRun';", 'audit chapter import');
audit = replaceOne(audit, 'Array.from({ length: 20 }', 'Array.from({ length: CHAPTER_ROOMS }', 'audit room count');
write('src/game/productionAudit.ts', audit);

let room3d = read('src/components/kaykitRoom3D.ts');
room3d = replaceOne(room3d, "  floorBroken: 'floor_tile_large_rocks.gltf',", "  floorBroken: 'floor_tile_large_rocks.gltf',\n  floorDirt: 'floor_dirt_large.gltf',", 'dirt floor asset');
room3d = replaceOne(
  room3d,
  "function requiredAssets(spec: RoomBibleSpec): AssetName[] {\n  const required = new Set<AssetName>(['floor', 'wall', 'corner', 'wallColumn', 'torch']);",
  "function isOutdoorSpec(spec: RoomBibleSpec) {\n  return spec.phase === 'meadow-forest' || spec.phase === 'darkwood-village';\n}\n\nfunction requiredAssets(spec: RoomBibleSpec): AssetName[] {\n  const required = new Set<AssetName>(['floor', 'wall', 'corner', 'wallColumn', 'torch']);\n  if (isOutdoorSpec(spec)) required.add('floorDirt');",
  'outdoor asset detection',
);
room3d = replaceOne(
  room3d,
  "  const { x, z } = portalStagePoint(spec);\n  root.userData.portalStage = { x, z };\n\n  if (spec.portal.z < -8) {",
  "  const { x, z } = portalStagePoint(spec);\n  root.userData.portalStage = { x, z };\n  if (isOutdoorSpec(spec)) return;\n\n  if (spec.portal.z < -8) {",
  'outdoor portal stage',
);
room3d = replaceOne(
  room3d,
  "function addSilhouetteArchitecture(root: any, spec: RoomBibleSpec, loaded: Record<AssetName, any>) {\n  const pillar = loaded.pillar ?? loaded.wallColumn;",
  "function addSilhouetteArchitecture(root: any, spec: RoomBibleSpec, loaded: Record<AssetName, any>) {\n  if (isOutdoorSpec(spec)) return;\n  const pillar = loaded.pillar ?? loaded.wallColumn;",
  'outdoor silhouette skip',
);
room3d = replaceOne(
  room3d,
  "    const floorStep = 4;\n    let tileIndex = 0;\n    const cleanFloorRoom = [7, 8, 9, 10].includes(spec.room);",
  "    const floorStep = 4;\n    let tileIndex = 0;\n    const outdoor = isOutdoorSpec(spec);\n    root.userData.outdoor = outdoor;\n    const cleanFloorRoom = [7, 8, 9, 10].includes(spec.room);",
  'outdoor room flag',
);
room3d = replaceOne(
  room3d,
  "        const broken = !cleanFloorRoom && spec.shell !== 'intact' && loaded.floorBroken && (tileIndex + room * 3) % (spec.shell === 'veil' ? 3 : 6) === 0;\n        addObject(root, broken ? loaded.floorBroken : loaded.floor, x, 0, z, (tileIndex + room) % 2 ? Math.PI / 2 : 0);",
  "        const broken = !outdoor && !cleanFloorRoom && spec.shell !== 'intact' && loaded.floorBroken && (tileIndex + room * 3) % (spec.shell === 'veil' ? 3 : 6) === 0;\n        const floorModel = outdoor ? (loaded.floorDirt ?? loaded.floor) : broken ? loaded.floorBroken : loaded.floor;\n        addObject(root, floorModel, x, 0, z, (tileIndex + room) % 2 ? Math.PI / 2 : 0);",
  'outdoor dirt floor',
);
room3d = replaceOne(
  room3d,
  "    for (let x = left + wallStep; x < right - wallStep; x += wallStep) {\n      addObject(root, wallFor(spec, wallIndex++, loaded), x, 0, top, 0, 1, 'back-wall');\n      addObject(root, wallFor(spec, wallIndex++, loaded), x, 0, bottom, Math.PI, 1, 'front-wall');\n    }\n    for (let z = top + wallStep; z < bottom - wallStep; z += wallStep) {\n      addObject(root, wallFor(spec, wallIndex++, loaded), left, 0, z, Math.PI / 2, 1, 'side-wall');\n      addObject(root, wallFor(spec, wallIndex++, loaded), right, 0, z, -Math.PI / 2, 1, 'side-wall');\n    }\n\n    addObject(root, loaded.corner, left, 0, top, Math.PI / 2, 1, 'back-wall');\n    addObject(root, loaded.corner, right, 0, top, Math.PI, 1, 'back-wall');\n    addObject(root, loaded.corner, right, 0, bottom, -Math.PI / 2, 1, 'front-wall');\n    addObject(root, loaded.corner, left, 0, bottom, 0, 1, 'front-wall');\n\n    const columnXs = spec.shell === 'monumental' || spec.shell === 'veil' ? [-8, -4, 4, 8] : [-6, 6];\n    for (const x of columnXs) {\n      addObject(root, loaded.wallColumn, x, 0, top, 0, spec.shell === 'veil' ? 1.18 : 1, 'back-wall');\n      addObject(root, loaded.wallColumn, x, 0, bottom, Math.PI, spec.shell === 'veil' ? 1.18 : 1, 'front-wall');\n    }\n\n    const torchCount = spec.phase === 'inhabited-mine' ? 4 : spec.phase === 'abandoned-quarters' ? 2 : spec.phase === 'ancient-ruins' ? 3 : 1;\n    const torchXs = [-7.5, -2.5, 2.5, 7.5];\n    for (let index = 0; index < torchCount; index++) addObject(root, loaded.torch, torchXs[index], 0, top + 0.18, Math.PI, spec.phase === 'warden-veil' ? 0.86 : 1);",
  "    if (!outdoor) {\n      for (let x = left + wallStep; x < right - wallStep; x += wallStep) {\n        addObject(root, wallFor(spec, wallIndex++, loaded), x, 0, top, 0, 1, 'back-wall');\n        addObject(root, wallFor(spec, wallIndex++, loaded), x, 0, bottom, Math.PI, 1, 'front-wall');\n      }\n      for (let z = top + wallStep; z < bottom - wallStep; z += wallStep) {\n        addObject(root, wallFor(spec, wallIndex++, loaded), left, 0, z, Math.PI / 2, 1, 'side-wall');\n        addObject(root, wallFor(spec, wallIndex++, loaded), right, 0, z, -Math.PI / 2, 1, 'side-wall');\n      }\n\n      addObject(root, loaded.corner, left, 0, top, Math.PI / 2, 1, 'back-wall');\n      addObject(root, loaded.corner, right, 0, top, Math.PI, 1, 'back-wall');\n      addObject(root, loaded.corner, right, 0, bottom, -Math.PI / 2, 1, 'front-wall');\n      addObject(root, loaded.corner, left, 0, bottom, 0, 1, 'front-wall');\n\n      const columnXs = spec.shell === 'monumental' || spec.shell === 'veil' ? [-8, -4, 4, 8] : [-6, 6];\n      for (const x of columnXs) {\n        addObject(root, loaded.wallColumn, x, 0, top, 0, spec.shell === 'veil' ? 1.18 : 1, 'back-wall');\n        addObject(root, loaded.wallColumn, x, 0, bottom, Math.PI, spec.shell === 'veil' ? 1.18 : 1, 'front-wall');\n      }\n\n      const torchCount = spec.phase === 'inhabited-mine' ? 4 : spec.phase === 'abandoned-quarters' ? 2 : spec.phase === 'ancient-ruins' ? 3 : 1;\n      const torchXs = [-7.5, -2.5, 2.5, 7.5];\n      for (let index = 0; index < torchCount; index++) addObject(root, loaded.torch, torchXs[index], 0, top + 0.18, Math.PI, spec.phase === 'warden-veil' ? 0.86 : 1);\n    }",
  'outdoor wall removal',
);
write('src/components/kaykitRoom3D.ts', room3d);

let runEngine = read('src/game/runEngine.ts');
runEngine = runEngine.replaceAll('this.state.floor === 20', 'this.state.floor === 50');
runEngine = replaceOne(runEngine, '(room === 20 ? 1.18 : 1)', '(room === 50 ? 1.18 : 1)', 'final boss scale');
write('src/game/runEngine.ts', runEngine);

let enemyVisual = read('src/components/kaykitEnemy3D.ts');
enemyVisual = enemyVisual.replace('Math.min(20, room)', 'Math.min(50, room)');
enemyVisual = replaceOne(enemyVisual, "roomFromEnemyId(enemy) === 20", "roomFromEnemyId(enemy) === 50", 'final boss visual room');
write('src/components/kaykitEnemy3D.ts', enemyVisual);

let enemyAi = read('src/game/enemyRunAI.ts');
enemyAi = enemyAi.replace('Math.min(20, parsed)', 'Math.min(50, parsed)');
write('src/game/enemyRunAI.ts', enemyAi);

console.log('Block 4 world expansion written.');
