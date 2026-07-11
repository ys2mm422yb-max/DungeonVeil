export type ExpandedRoomPhase = 'meadow-forest' | 'darkwood-village' | 'fortress-ember';
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
  [P(-4.8, -5.2), P(0, -6.2), P(4.8, -5.2), P(-5.4, 0.2), P(5.4, 0.2), P(-3.6, 4.7), P(0, 5.7), P(3.6, 4.7)],
  [P(-5.2, -6.0), P(3.8, -5.2), P(-2.0, -2.0), P(4.6, 0.4), P(-4.6, 2.6), P(5.0, 4.8), P(-1.5, 5.7), P(1.8, 5.1)],
  [P(-4.0, -6.3), P(4.0, -6.3), P(-5.4, -1.2), P(5.4, -1.2), P(0, -3.5), P(-3.8, 4.6), P(0, 5.6), P(3.8, 4.6)],
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

const MEADOW_LAYOUTS: Record<number, ExpandedWorldSetpiece[]> = {
  1: [
    s(`${F}/Tree_1_A_Color1.gltf`, -7.4, -4.6, 0.12, 1.28, [1.8, 1.8]), s(`${F}/Tree_1_C_Color1.gltf`, 7.2, -4.1, -0.1, 1.2, [1.8, 1.8]),
    s(`${F}/Rock_2_A_Color1.gltf`, -3.5, -2.2, 0.2, 1.18, [1.2, 1.0]), s(`${F}/Rock_2_C_Color1.gltf`, 3.5, -2.2, -0.2, 1.18, [1.2, 1.0]),
    s(`${F}/Bush_2_A_Color1.gltf`, -6.0, 2.8, 0, 1.1), s(`${F}/Grass_1_A_Color1.gltf`, 5.8, 3.5, 0, 1.3),
  ],
  2: [
    s(`${F}/Tree_2_A_Color1.gltf`, -8.0, 1.2, 0.2, 1.18, [1.8, 1.8]), s(`${F}/Tree_2_C_Color1.gltf`, 8.1, 3.5, -0.2, 1.22, [1.8, 1.8]),
    s(`${F}/Grass_1_Mesh.gltf`, 0, -1.0, 0, 1.85), s(`${F}/Bush_4_A_Color1.gltf`, -4.8, -3.0, 0, 1.16), s(`${F}/Bush_4_C_Color1.gltf`, 5.5, 0.5, 0, 1.12),
    s(`${F}/Rock_1_H_Color1.gltf`, -2.8, 4.4, 0.18, 1.0),
  ],
  3: [
    s(`${F}/Rock_3_A_Color1.gltf`, -5.4, -4.6, 0.3, 1.2, [1.3, 1.0]), s(`${F}/Rock_2_D_Color1.gltf`, -2.0, -1.8, 0.15, 1.08, [1.2, 0.9]),
    s(`${F}/Rock_2_F_Color1.gltf`, 2.0, 1.0, -0.15, 1.08, [1.2, 0.9]), s(`${F}/Rock_1_K_Color1.gltf`, 5.4, 4.0, -0.3, 1.04),
    s(`${F}/Tree_1_B_Color1.gltf`, -8.2, 3.5, 0.1, 1.16, [1.8, 1.8]), s(`${F}/Grass_2_B_Color1.gltf`, 7.0, -2.5, 0, 1.28),
  ],
  4: [
    s(`${F}/Tree_1_C_Color1.gltf`, -8.2, -3.7, 0.1, 1.2, [1.8, 1.8]), s(`${F}/Tree_2_B_Color1.gltf`, 8.2, 3.8, -0.1, 1.18, [1.8, 1.8]),
    s(`${U}/table_low.gltf`, 0, -1.8, 0, 1.05, [1.7, 0.9]), s(`${T}/saw.gltf`, -0.5, -1.6, 0.3, 1.22, undefined, 0.72),
    s(`${R}/Pallet_Wood.gltf`, 5.8, -3.2, 0.1, 1.08, [1.5, 0.9]), s(`${D}/box_small.gltf`, -5.8, 2.9, -0.1, 1.0, [0.8, 0.8]),
  ],
  5: [
    s(`${F}/Rock_2_D_Color1.gltf`, -4.6, -2.6, 0.18, 1.2, [1.2, 0.9]), s(`${F}/Rock_2_F_Color1.gltf`, 4.6, -2.6, -0.18, 1.2, [1.2, 0.9]),
    s(`${F}/Rock_1_C_Color1.gltf`, -3.2, 2.0, 0.12, 1.0), s(`${F}/Rock_1_F_Color1.gltf`, 3.2, 2.0, -0.12, 1.0),
    s(`${F}/Tree_2_C_Color1.gltf`, -8.0, 4.0, 0.1, 1.16, [1.8, 1.8]), s(`${F}/Grass_2_Mesh.gltf`, 7.0, 3.0, 0, 1.5),
  ],
  6: [
    s(`${F}/Bush_4_B_Color1.gltf`, 0, -1.4, 0, 1.48), s(`${F}/Bush_3_A_Color1.gltf`, -3.8, -3.0, 0, 1.12), s(`${F}/Bush_3_C_Color1.gltf`, 3.8, -3.0, 0, 1.12),
    s(`${F}/Grass_1_A_Color1.gltf`, -3.0, 1.4, 0, 1.38), s(`${F}/Grass_1_C_Color1.gltf`, 3.0, 1.4, 0, 1.38),
    s(`${F}/Tree_1_A_Color1.gltf`, -8.3, 4.2, 0.15, 1.18, [1.8, 1.8]), s(`${F}/Tree_2_A_Color1.gltf`, 8.2, -4.5, -0.15, 1.14, [1.8, 1.8]),
  ],
  7: [
    s(`${U}/table_medium.gltf`, -1.4, -2.0, 0.08, 1.0, [1.7, 0.9]), s(`${D}/box_small.gltf`, -6.0, 2.8, 0.2, 1.0, [0.8, 0.8]),
    s(`${D}/barrel_small.gltf`, 5.8, 3.0, -0.2, 1.0, [0.8, 0.8]), s(`${F}/Tree_2_B_Color1.gltf`, -8.3, -4.6, 0.1, 1.22, [1.8, 1.8]),
    s(`${F}/Tree_1_B_Color1.gltf`, 8.1, 0.2, -0.12, 1.16, [1.8, 1.8]), s(`${F}/Bush_2_C_Color1.gltf`, 3.8, -4.0, 0, 1.08),
  ],
  8: [
    s(`${F}/Tree_2_C_Color1.gltf`, 0, -2.6, 0, 1.55, [2.1, 2.1]), s(`${F}/Tree_1_A_Color1.gltf`, -8.0, 3.8, 0.12, 1.14, [1.8, 1.8]),
    s(`${F}/Tree_1_C_Color1.gltf`, 8.0, 3.8, -0.12, 1.14, [1.8, 1.8]), s(`${F}/Rock_1_C_Color1.gltf`, -4.0, 0.6, 0, 1.0),
    s(`${F}/Rock_1_F_Color1.gltf`, 4.0, 0.6, 0, 1.0), s(`${F}/Grass_2_A_Color1.gltf`, 0, 4.5, 0, 1.3),
  ],
  9: [
    s(`${D}/pillar.gltf`, -4.2, -3.0, 0, 0.98, [0.8, 0.8]), s(`${D}/pillar.gltf`, 4.2, -3.0, 0, 0.98, [0.8, 0.8]),
    s(`${D}/rubble_half.gltf`, -6.8, 2.8, 0.18, 0.72, [1.2, 0.8]), s(`${D}/rubble_large.gltf`, 6.8, 3.4, -0.18, 0.84, [1.7, 1.2]),
    s(`${F}/Tree_1_B_Color1.gltf`, -8.4, -5.0, 0.12, 1.12, [1.8, 1.8]), s(`${F}/Grass_2_Mesh.gltf`, 0, 2.0, 0, 1.52),
  ],
  10: [
    s(`${F}/Rock_3_R_Color1.gltf`, 0, -4.8, 0, 1.62, [1.8, 1.4]), s(`${F}/Tree_1_C_Color1.gltf`, -7.0, -1.0, 0.1, 1.28, [1.8, 1.8]),
    s(`${F}/Tree_2_B_Color1.gltf`, 7.0, -1.0, -0.1, 1.28, [1.8, 1.8]), s(`${F}/Rock_2_A_Color1.gltf`, -6.2, 4.4, 0.2, 1.08, [1.2, 1.0]),
    s(`${F}/Rock_2_C_Color1.gltf`, 6.2, 4.4, -0.2, 1.08, [1.2, 1.0]),
  ],
};

const DARKWOOD_LAYOUTS: Record<number, ExpandedWorldSetpiece[]> = {
  1: [
    s(`${F}/Tree_2_A_Color1.gltf`, -8.2, -4.8, 0.2, 1.18, [1.8, 1.8]), s(`${F}/Tree_2_C_Color1.gltf`, 8.0, 3.8, -0.2, 1.14, [1.8, 1.8]),
    s(`${H}/lantern_standing.gltf`, -3.0, -2.8, 0, 1.3), s(`${H}/lantern_standing.gltf`, 3.0, 0.6, 0, 1.3),
    s(`${H}/gravemarker_A.gltf`, -6.0, 3.8, 0.1, 1.0, [1.0, 1.2]),
  ],
  2: [
    s(`${H}/bench_decorated.gltf`, -5.4, -1.4, Math.PI / 2, 1.08, [1.4, 0.8]), s(`${D}/box_stacked.gltf`, 5.4, -1.0, -0.1, 1.0, [1.1, 0.9]),
    s(`${H}/post_lantern.gltf`, 0, -4.2, 0, 1.22), s(`${F}/Tree_1_B_Color1.gltf`, -8.3, 3.8, 0.1, 1.12, [1.8, 1.8]),
    s(`${H}/grave_A_destroyed.gltf`, 7.2, 3.6, -0.12, 0.96, [1.2, 1.4]),
  ],
  3: [
    s(`${F}/Tree_2_A_Color1.gltf`, 0, -2.5, 0, 1.58, [2.0, 2.0]), s(`${H}/skull_candle.gltf`, -3.0, 0.4, 0, 1.2), s(`${H}/skull_candle.gltf`, 3.0, 0.4, 0, 1.2),
    s(`${F}/Rock_3_D_Color1.gltf`, -6.0, 3.2, 0.2, 1.08, [1.2, 0.9]), s(`${F}/Rock_3_G_Color1.gltf`, 6.0, 3.2, -0.2, 1.08, [1.2, 0.9]),
  ],
  4: [
    s(`${H}/grave_A.gltf`, -5.2, -3.2, 0.1, 1.08, [1.2, 1.5]), s(`${H}/grave_B.gltf`, 5.2, -3.2, -0.1, 1.08, [1.2, 1.5]),
    s(`${H}/gravestone.gltf`, -3.2, 2.0, 0.08, 1.02, [1.1, 1.3]), s(`${H}/gravestone.gltf`, 3.2, 2.0, -0.08, 1.02, [1.1, 1.3]),
    s(`${H}/post_lantern.gltf`, 0, 4.8, 0, 1.18),
  ],
  5: [
    s(`${H}/arch_gate.gltf`, 0, -4.8, 0, 1.18, [2.0, 1.0]), s(`${H}/shrine.gltf`, 0, 2.2, Math.PI, 1.35, [1.2, 1.2]),
    s(`${H}/grave_A_destroyed.gltf`, -6.2, 2.8, 0.14, 0.96, [1.2, 1.4]), s(`${H}/grave_A_destroyed.gltf`, 6.2, 2.8, -0.14, 0.96, [1.2, 1.4]),
    s(`${H}/candle_triple.gltf`, -3.0, -1.0, 0, 1.2), s(`${H}/candle_triple.gltf`, 3.0, -1.0, 0, 1.2),
  ],
  6: [
    s(`${F}/Rock_3_D_Color1.gltf`, -4.4, -2.2, 0.22, 1.25, [1.2, 0.9]), s(`${F}/Rock_3_G_Color1.gltf`, 4.4, 1.8, -0.22, 1.25, [1.2, 0.9]),
    s(`${H}/post_lantern.gltf`, 0, 3.8, 0, 1.25), s(`${F}/Tree_2_B_Color1.gltf`, -8.2, 3.4, 0.1, 1.14, [1.8, 1.8]),
    s(`${H}/bench.gltf`, 7.0, -3.4, -Math.PI / 2, 1.0, [1.4, 0.8]),
  ],
  7: [
    s(`${H}/bench.gltf`, -5.4, -1.2, Math.PI / 2, 1.08, [1.4, 0.8]), s(`${H}/bench_decorated.gltf`, 5.4, -1.2, -Math.PI / 2, 1.08, [1.4, 0.8]),
    s(`${D}/barrel_small_stack.gltf`, -2.2, 3.4, 0, 1.0, [1.1, 0.9]), s(`${D}/box_stacked.gltf`, 2.2, 3.4, 0, 1.0, [1.1, 0.9]),
    s(`${H}/lantern_standing.gltf`, 0, -4.2, 0, 1.28),
  ],
  8: [
    s(`${H}/shrine_candles.gltf`, 0, -1.8, 0, 1.62, [1.4, 1.4]), s(`${H}/candle_triple.gltf`, -3.4, 1.8, 0, 1.22), s(`${H}/candle_triple.gltf`, 3.4, 1.8, 0, 1.22),
    s(`${H}/gravemarker_A.gltf`, -6.8, -3.4, 0.1, 1.0, [1.0, 1.2]), s(`${H}/gravemarker_A.gltf`, 6.8, -3.4, -0.1, 1.0, [1.0, 1.2]),
  ],
  9: [
    s(`${H}/post_lantern.gltf`, -5.2, -2.2, 0, 1.24), s(`${H}/post_lantern.gltf`, 5.2, -2.2, 0, 1.24),
    s(`${H}/gravemarker_A.gltf`, 0, 3.0, 0, 1.08, [1.0, 1.2]), s(`${H}/bench_decorated.gltf`, -6.6, 3.8, Math.PI / 2, 1.0, [1.4, 0.8]),
    s(`${F}/Tree_1_A_Color1.gltf`, 8.0, 3.8, -0.1, 1.12, [1.8, 1.8]),
  ],
  10: [
    s(`${H}/shrine_candles.gltf`, 0, -4.8, 0, 1.78, [1.5, 1.5]), s(`${H}/grave_A_destroyed.gltf`, -6.4, -0.8, 0.1, 1.08, [1.2, 1.4]),
    s(`${H}/grave_A_destroyed.gltf`, 6.4, -0.8, -0.1, 1.08, [1.2, 1.4]), s(`${H}/post_lantern.gltf`, -5.6, 4.6, 0, 1.22),
    s(`${H}/post_lantern.gltf`, 5.6, 4.6, 0, 1.22),
  ],
};

const FORTRESS_LAYOUTS: Record<number, ExpandedWorldSetpiece[]> = {
  1: [
    s(`${D}/wall_corner_gated.gltf`, 0, -3.0, 0, 1.08, [2.2, 1.2]), s(`${D}/barrier_column.gltf`, -5.8, -4.2, 0, 1.28, [0.9, 0.9]),
    s(`${D}/barrier_column.gltf`, 5.8, -4.2, 0, 1.28, [0.9, 0.9]), s(`${D}/torch_lit.gltf`, -3.0, -4.6, 0, 1.34), s(`${D}/torch_lit.gltf`, 3.0, -4.6, 0, 1.34),
  ],
  2: [
    s(`${W}/shield_A.gltf`, -5.2, -1.8, 0, 1.42), s(`${W}/spear_A.gltf`, 5.2, -1.8, 0.2, 1.42), s(`${D}/chest_gold.gltf`, 0, 3.0, Math.PI, 1.08, [1.3, 0.9]),
    s(`${D}/pillar_decorated.gltf`, -7.0, 3.8, 0, 1.18, [0.9, 0.9]), s(`${D}/pillar_decorated.gltf`, 7.0, 3.8, 0, 1.18, [0.9, 0.9]),
  ],
  3: [
    s(`${D}/barrier_column.gltf`, -4.2, -2.0, 0, 1.38, [0.9, 0.9]), s(`${D}/barrier_column.gltf`, 4.2, -2.0, 0, 1.38, [0.9, 0.9]),
    s(`${H}/post_skull.gltf`, 0, 2.8, 0, 1.24), s(`${D}/wall_half.gltf`, -7.0, 3.8, 0.1, 0.9, [2.0, 0.8]),
    s(`${D}/wall_half.gltf`, 7.0, 3.8, -0.1, 0.9, [2.0, 0.8]),
  ],
  4: [
    s(`${T}/anvil.gltf`, 0, -1.8, 0, 1.68, [1.2, 0.9]), s(`${T}/grindstone.gltf`, 5.4, 2.8, -Math.PI / 2, 1.42, [1.0, 1.1]),
    s(`${R}/Iron_Bars_Stack_Large.gltf`, -5.4, 2.8, 0.1, 1.2, [1.3, 0.8]), s(`${D}/torch_lit.gltf`, -3.4, -4.2, 0, 1.38),
    s(`${D}/torch_lit.gltf`, 3.4, -4.2, 0, 1.38),
  ],
  5: [
    s(`${D}/chest_gold.gltf`, -3.4, -1.8, 0, 1.12, [1.3, 0.9]), s(`${D}/trunk_medium_A.gltf`, 3.4, -1.8, 0, 1.12, [1.3, 0.9]),
    s(`${H}/candle_triple.gltf`, 0, 2.6, 0, 1.28), s(`${D}/pillar_decorated.gltf`, -7.0, -4.0, 0, 1.2, [0.9, 0.9]),
    s(`${D}/pillar_decorated.gltf`, 7.0, 4.0, 0, 1.2, [0.9, 0.9]),
  ],
  6: [
    s(`${D}/wall_half.gltf`, -4.6, -2.0, 0.12, 1.0, [2.0, 0.8]), s(`${D}/wall_half.gltf`, 4.6, 1.8, -0.12, 1.0, [2.0, 0.8]),
    s(`${D}/barrier_column.gltf`, -7.2, 3.8, 0, 1.22, [0.9, 0.9]), s(`${D}/barrier_column.gltf`, 7.2, -4.0, 0, 1.22, [0.9, 0.9]),
    s(`${D}/torch_lit.gltf`, 0, 4.8, 0, 1.34),
  ],
  7: [
    s(`${D}/table_long_decorated_A.gltf`, 0, -1.8, 0, 1.14, [2.4, 1.0]), s(`${W}/sword_C.gltf`, -0.8, -1.6, 0.2, 1.24, undefined, 0.82),
    s(`${W}/shield_B.gltf`, 0.9, -1.6, -0.2, 1.24, undefined, 0.82), s(`${D}/pillar_decorated.gltf`, -6.6, 3.8, 0, 1.2, [0.9, 0.9]),
    s(`${D}/pillar_decorated.gltf`, 6.6, 3.8, 0, 1.2, [0.9, 0.9]),
  ],
  8: [
    s(`${H}/shrine_candles.gltf`, 0, -1.8, 0, 1.62, [1.4, 1.4]), s(`${R}/Stone_Chunks_Large.gltf`, -5.4, 3.0, 0.2, 1.08, [1.3, 0.9]),
    s(`${R}/Stone_Chunks_Large.gltf`, 5.4, 3.0, -0.2, 1.08, [1.3, 0.9]), s(`${D}/torch_lit.gltf`, -4.2, -4.0, 0, 1.34),
    s(`${D}/torch_lit.gltf`, 4.2, -4.0, 0, 1.34),
  ],
  9: [
    s(`${D}/pillar_decorated.gltf`, -5.2, -2.0, 0, 1.42, [0.9, 0.9]), s(`${D}/pillar_decorated.gltf`, 5.2, -2.0, 0, 1.42, [0.9, 0.9]),
    s(`${D}/chest_gold.gltf`, 0, 3.0, Math.PI, 1.18, [1.3, 0.9]), s(`${D}/wall_corner_gated.gltf`, -7.4, 4.2, Math.PI / 2, 0.88, [1.8, 1.8]),
    s(`${D}/wall_corner_gated.gltf`, 7.4, 4.2, -Math.PI / 2, 0.88, [1.8, 1.8]),
  ],
  10: [
    s(`${H}/shrine_candles.gltf`, 0, -4.8, 0, 1.82, [1.5, 1.5]), s(`${D}/pillar_decorated.gltf`, -6.4, -0.5, 0, 1.52, [0.9, 0.9]),
    s(`${D}/pillar_decorated.gltf`, 6.4, -0.5, 0, 1.52, [0.9, 0.9]), s(`${D}/barrier_column.gltf`, -6.4, 4.8, 0, 1.34, [0.9, 0.9]),
    s(`${D}/barrier_column.gltf`, 6.4, 4.8, 0, 1.34, [0.9, 0.9]),
  ],
};

export function expandedWorldSetpieces(room: number): ExpandedWorldSetpiece[] {
  if (room < 21 || room > 50) return [];
  const local = ((room - 1) % 10) + 1;
  const layout = room <= 30 ? MEADOW_LAYOUTS[local] : room <= 40 ? DARKWOOD_LAYOUTS[local] : FORTRESS_LAYOUTS[local];
  return (layout ?? []).map(piece => ({ ...piece }));
}
