export type RoomSetpiece = {
  model: string;
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
  collider?: readonly [number, number];
};

const F = 'furniture/Assets/gltf';
const T = 'tools/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';

const p = (
  model: string,
  x: number,
  z: number,
  rotation = 0,
  scale = 1,
  collider?: readonly [number, number],
): RoomSetpiece => ({ model, x, z, rotation, scale, collider });

/**
 * Dense hand-built chapter-one compositions translated from the Canva V2 room pass.
 * Architecture shapes combat lanes first; decorative props only reinforce the scene.
 * Only visually massive pieces receive colliders and every collider is deliberately
 * smaller than the visible model footprint.
 */
export const ROOM_SETPIECES: Record<number, RoomSetpiece[]> = {
  // 1 · Verlassener Versorgungsposten — broken cross-wall and two believable supply bays.
  1: [
    p(`${D}/wall_broken.gltf`, -4.9, -2.2, 0, .86, [3.5, .72]),
    p(`${D}/wall_broken.gltf`, 4.9, 2.4, Math.PI, .86, [3.5, .72]),
    p(`${F}/shelf_B_large_decorated.gltf`, -7.4, -6.9, Math.PI / 2, 1.02, [1.0, 2.2]),
    p(`${D}/shelf_large.gltf`, -7.2, -3.9, Math.PI / 2, 1.02, [1.0, 2.0]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.2, -6.0, .08, 1.0, [1.55, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, -5.3, -4.4, .15, 1.0, [1.0, .9]),
    p(`${D}/box_stacked.gltf`, -6.2, -1.0, -.1, 1.0, [1.25, 1.0]),
    p(`${F}/shelf_A_big.gltf`, 7.4, -6.8, -Math.PI / 2, 1.0, [1.0, 2.2]),
    p(`${D}/trunk_medium_A.gltf`, 5.6, -6.1, -.1, 1.05, [1.4, .85]),
    p(`${D}/barrel_large_decorated.gltf`, 7.0, -3.6, 0, 1.0, [1.0, 1.0]),
    p(`${D}/box_large.gltf`, 5.6, -3.5, .1, 1.0, [1.25, 1.05]),
    p(`${T}/rope_bundle_A.gltf`, -4.7, -4.5, .22, 1.08),
    p(`${T}/bucket_metal.gltf`, 6.4, -5.0, 0, 1.0),
  ],

  // 2 · Wachstube — command island, shielded flank and staggered barricade.
  2: [
    p(`${D}/wall_corner_small.gltf`, -7.0, -6.7, 0, .92, [1.8, 1.8]),
    p(`${D}/table_long_decorated_A.gltf`, -3.7, -5.6, 0, 1.0, [2.5, 1.0]),
    p(`${T}/map.gltf`, -4.0, -5.6, 0, 1.08),
    p(`${T}/journal_open.gltf`, -2.9, -5.35, .25, 1.05),
    p(`${D}/chair.gltf`, -5.0, -4.1, .1, 1.0),
    p(`${D}/chair.gltf`, -2.2, -4.1, -.1, 1.0),
    p(`${D}/barrier_half.gltf`, 3.2, -2.3, .22, 1.0, [2.0, .75]),
    p(`${D}/barrier.gltf`, 5.8, 1.5, -.18, 1.0, [2.7, .8]),
    p(`${D}/shelf_small_candles.gltf`, 7.2, -6.5, -Math.PI / 2, 1.05, [1.0, 1.5]),
    p(`${D}/box_stacked.gltf`, 6.0, -4.4, .1, 1.0, [1.25, 1.0]),
    p(`${D}/sword_shield.gltf`, 6.9, -2.6, 0, 1.2),
    p(`${T}/lantern.gltf`, 4.8, -3.7, 0, 1.18),
  ],

  // 3 · Alte Säulenhalle — a real colonnade with broken transverse walls and side circulation.
  3: [
    p(`${D}/column.gltf`, -5.6, -7.0, 0, 1.22, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, -7.0, 0, 1.22, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, -2.4, 0, 1.22, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, -2.4, 0, 1.22, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, 2.3, 0, 1.22, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, 2.3, 0, 1.22, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, 6.7, 0, 1.22, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, 6.7, 0, 1.22, [.9, .9]),
    p(`${D}/wall_broken.gltf`, -2.9, -.1, 0, .8, [3.2, .7]),
    p(`${D}/wall_broken.gltf`, 2.9, -.1, Math.PI, .8, [3.2, .7]),
    p(`${D}/banner_patternB_red.gltf`, -5.6, -5.6, 0, 1.15),
    p(`${D}/banner_patternB_red.gltf`, 5.6, -5.6, 0, 1.15),
    p(`${H}/candle_triple.gltf`, -4.3, 5.9, 0, 1.15),
    p(`${H}/candle_triple.gltf`, 4.3, 5.9, 0, 1.15),
  ],

  // 4 · Bergarbeiterlager — tool station, ore sorting bay and rubble choke.
  4: [
    p(`${D}/wall_cracked.gltf`, -6.2, -1.8, Math.PI / 2, .82, [3.4, .72]),
    p(`${F}/table_low.gltf`, -5.8, -5.8, 0, 1.02, [1.55, .95]),
    p(`${T}/pickaxe.gltf`, -6.4, -5.7, .18, 1.3),
    p(`${T}/shovel.gltf`, -5.4, -5.4, -.18, 1.28),
    p(`${D}/barrel_small_stack.gltf`, -7.0, -4.0, .1, 1.0, [1.0, .9]),
    p(`${D}/box_small_decorated.gltf`, -4.6, -4.1, -.1, 1.0, [.9, .9]),
    p(`${R}/Pallet_Wood.gltf`, 5.8, -6.0, 0, 1.0, [1.55, 1.0]),
    p(`${R}/Iron_Nuggets.gltf`, 5.2, -5.6, .2, 1.12),
    p(`${R}/Copper_Nuggets.gltf`, 6.4, -5.5, -.2, 1.12),
    p(`${D}/barrier_half.gltf`, 4.8, -2.2, -.2, 1.05, [2.0, .75]),
    p(`${D}/rubble_large.gltf`, 5.6, 3.5, .2, .9, [2.1, 1.45]),
    p(`${D}/barrel_large.gltf`, 7.0, 1.6, 0, 1.0, [1.0, 1.0]),
    p(`${T}/lantern.gltf`, 4.4, -4.2, 0, 1.2),
    p(`${T}/rope_bundle_A.gltf`, 6.9, 4.4, .2, 1.1),
  ],

  // 5 · Verlassene Werkstatt — three connected work zones instead of isolated furniture.
  5: [
    p(`${D}/wall_corner.gltf`, -7.1, -6.5, 0, .88, [2.0, 2.0]),
    p(`${D}/wall_broken.gltf`, -4.5, -1.2, Math.PI / 2, .8, [3.2, .7]),
    p(`${D}/table_long_decorated_C.gltf`, -3.9, -5.5, 0, 1.0, [2.5, 1.0]),
    p(`${T}/blueprint_stacked.gltf`, -4.7, -5.6, .1, 1.15),
    p(`${T}/handdrill.gltf`, -3.8, -5.3, -.3, 1.2),
    p(`${T}/file.gltf`, -2.8, -5.7, .35, 1.15),
    p(`${D}/shelves.gltf`, -7.2, -3.1, Math.PI / 2, 1.0, [1.0, 2.0]),
    p(`${D}/box_stacked.gltf`, -6.0, 1.9, .1, 1.0, [1.25, 1.0]),
    p(`${D}/table_medium_decorated_A.gltf`, 5.7, -5.0, 0, 1.0, [1.8, 1.0]),
    p(`${T}/saw.gltf`, 5.2, -5.1, .18, 1.22),
    p(`${T}/hammer.gltf`, 6.1, -4.8, -.25, 1.15),
    p(`${D}/shelf_small.gltf`, 7.2, -2.8, -Math.PI / 2, 1.0, [1.0, 1.45]),
    p(`${D}/trunk_medium_B.gltf`, 5.4, 2.6, .1, 1.0, [1.4, .85]),
    p(`${D}/barrel_small_stack.gltf`, 7.0, 3.7, -.1, 1.0, [1.0, .9]),
  ],

  // 6 · Schmiede — forge lane, grinding lane and a central material barricade.
  6: [
    p(`${D}/wall_cracked.gltf`, -7.1, -5.7, Math.PI / 2, .82, [3.4, .72]),
    p(`${T}/anvil.gltf`, -5.3, -5.2, 0, 1.48, [1.0, .8]),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.2, -3.5, .05, 1.08, [1.25, .8]),
    p(`${D}/barrel_large.gltf`, -4.4, -3.5, 0, 1.0, [1.0, 1.0]),
    p(`${T}/hammer.gltf`, -4.6, -5.0, .3, 1.28),
    p(`${T}/tongs.gltf`, -5.0, -5.8, -.25, 1.22),
    p(`${D}/barrier_column.gltf`, 0, -1.0, 0, 1.05, [1.0, 1.0]),
    p(`${D}/barrier_half.gltf`, -1.7, -1.0, 0, 1.05, [2.0, .75]),
    p(`${D}/barrier_half.gltf`, 1.7, -1.0, Math.PI, 1.05, [2.0, .75]),
    p(`${T}/grindstone.gltf`, 5.3, -5.0, Math.PI / 2, 1.45, [1.0, 1.25]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.6, -3.5, -.1, 1.05, [1.0, .7]),
    p(`${D}/box_large.gltf`, 4.5, -3.3, .1, 1.0, [1.25, 1.05]),
    p(`${D}/torch_lit.gltf`, -7.5, -7.8, 0, 1.25),
    p(`${D}/torch_lit.gltf`, 7.5, -7.8, 0, 1.25),
  ],

  // 7 · Schlafquartier — four bed bays with wall fragments forming actual rooms.
  7: [
    p(`${D}/wall_broken.gltf`, -4.7, -2.0, Math.PI / 2, .78, [3.1, .7]),
    p(`${D}/wall_broken.gltf`, 4.7, 1.8, Math.PI / 2, .78, [3.1, .7]),
    p(`${F}/bed_single_A.gltf`, -6.4, -6.3, Math.PI / 2, 1.0, [1.15, 2.2]),
    p(`${F}/cabinet_small_decorated.gltf`, -7.4, -3.8, Math.PI / 2, 1.0, [.8, .9]),
    p(`${F}/bed_single_B.gltf`, -6.2, 4.5, Math.PI / 2, 1.0, [1.15, 2.2]),
    p(`${D}/trunk_small_A.gltf`, -7.1, 2.0, 0, 1.0, [1.0, .75]),
    p(`${F}/bed_single_B.gltf`, 6.4, -6.3, -Math.PI / 2, 1.0, [1.15, 2.2]),
    p(`${F}/cabinet_small.gltf`, 7.4, -3.8, -Math.PI / 2, 1.0, [.8, .9]),
    p(`${F}/bed_single_A.gltf`, 6.2, 4.5, -Math.PI / 2, 1.0, [1.15, 2.2]),
    p(`${D}/trunk_small_B.gltf`, 7.1, 2.0, 0, 1.0, [1.0, .75]),
    p(`${F}/rug_rectangle_stripes_A.gltf`, 0, -.3, 0, 1.45),
    p(`${D}/shelf_small_candles.gltf`, -2.1, -6.9, 0, 1.0, [1.0, 1.45]),
    p(`${T}/lantern.gltf`, 2.1, 5.7, 0, 1.08),
  ],

  // 8 · Materiallager — alternating shelf aisles create a deliberate S-shaped route.
  8: [
    p(`${D}/shelf_large.gltf`, -6.8, -6.6, Math.PI / 2, 1.05, [1.0, 2.0]),
    p(`${D}/shelf_large.gltf`, -3.4, -3.0, 0, 1.05, [1.0, 2.0]),
    p(`${D}/shelf_large.gltf`, 3.4, .7, 0, 1.05, [1.0, 2.0]),
    p(`${D}/shelf_large.gltf`, 6.8, 4.2, -Math.PI / 2, 1.05, [1.0, 2.0]),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, -4.9, -6.1, .06, 1.0, [1.55, 1.0]),
    p(`${D}/box_stacked.gltf`, -6.1, -1.8, .1, 1.0, [1.25, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, -2.0, -4.2, .1, 1.0, [1.0, .9]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, 5.2, -5.6, -.06, 1.0, [1.45, 1.0]),
    p(`${D}/trunk_large_A.gltf`, 6.0, -2.0, -.1, 1.0, [1.5, .9]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, -5.2, 4.0, .08, 1.0, [1.0, .7]),
    p(`${D}/box_large.gltf`, -3.4, 5.3, .1, 1.0, [1.25, 1.05]),
    p(`${D}/barrel_large_decorated.gltf`, 1.7, 4.2, 0, 1.0, [1.0, 1.0]),
    p(`${T}/rope_bundle_B.gltf`, 5.0, 5.5, .2, 1.12),
    p(`${T}/bucket_metal.gltf`, 2.0, -1.9, 0, 1.05),
  ],

  // 9 · Ritualkammer — central shrine wrapped by a broken octagonal enclosure.
  9: [
    p(`${H}/shrine_candles.gltf`, 0, -1.0, 0, 1.62, [1.45, 1.45]),
    p(`${D}/wall_broken.gltf`, -4.6, -4.8, .35, .72, [3.0, .65]),
    p(`${D}/wall_broken.gltf`, 4.6, -4.8, -.35, .72, [3.0, .65]),
    p(`${D}/wall_broken.gltf`, -5.2, 3.2, -1.1, .72, [3.0, .65]),
    p(`${D}/wall_broken.gltf`, 5.2, 3.2, 1.1, .72, [3.0, .65]),
    p(`${D}/column.gltf`, -3.7, -1.0, 0, 1.12, [.85, .85]),
    p(`${D}/column.gltf`, 3.7, -1.0, 0, 1.12, [.85, .85]),
    p(`${D}/column.gltf`, 0, -5.0, 0, 1.12, [.85, .85]),
    p(`${D}/column.gltf`, 0, 3.2, 0, 1.12, [.85, .85]),
    p(`${H}/candle_triple.gltf`, -2.5, -3.1, 0, 1.25),
    p(`${H}/candle_triple.gltf`, 2.5, -3.1, 0, 1.25),
    p(`${H}/candle_melted.gltf`, -2.5, 1.2, 0, 1.15),
    p(`${H}/candle_melted.gltf`, 2.5, 1.2, 0, 1.15),
    p(`${T}/journal_open.gltf`, 0, 1.2, .05, 1.15),
  ],

  // 10 · Grabwächterhalle — crypt aisles, gated corners and a ceremonial approach.
  10: [
    p(`${D}/wall_corner_gated.gltf`, -7.2, -6.7, 0, .86, [2.0, 2.0]),
    p(`${D}/wall_corner_gated.gltf`, 7.2, -6.7, -Math.PI / 2, .86, [2.0, 2.0]),
    p(`${H}/crypt.gltf`, -6.2, -4.4, Math.PI / 2, 1.12, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 6.2, -4.4, -Math.PI / 2, 1.12, [1.6, 1.25]),
    p(`${H}/grave_A.gltf`, -6.0, 1.2, .08, 1.15, [1.0, 1.35]),
    p(`${H}/grave_B.gltf`, 6.0, 1.2, -.08, 1.15, [1.0, 1.35]),
    p(`${D}/barrier_column.gltf`, -2.8, -1.8, 0, 1.0, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 2.8, -1.8, 0, 1.0, [1.0, 1.0]),
    p(`${D}/barrier_half.gltf`, -1.5, 3.5, 0, 1.0, [2.0, .75]),
    p(`${D}/barrier_half.gltf`, 1.5, 3.5, Math.PI, 1.0, [2.0, .75]),
    p(`${H}/candle_triple.gltf`, -3.0, -4.0, 0, 1.25),
    p(`${H}/candle_triple.gltf`, 3.0, -4.0, 0, 1.25),
    p(`${D}/sword_shield_broken.gltf`, 0, -6.4, 0, 1.25),
  ],

  // 11 · Kreuzgang der Wachen — four occupied quadrants and a clear but pressured cross.
  11: [
    p(`${D}/wall_Tsplit.gltf`, 0, -1.0, 0, .82, [3.0, 3.0]),
    p(`${D}/column.gltf`, -6.4, -5.8, 0, 1.2, [.9, .9]),
    p(`${D}/column.gltf`, 6.4, -5.8, 0, 1.2, [.9, .9]),
    p(`${D}/column.gltf`, -6.4, 4.8, 0, 1.2, [.9, .9]),
    p(`${D}/column.gltf`, 6.4, 4.8, 0, 1.2, [.9, .9]),
    p(`${D}/table_medium_broken.gltf`, -5.2, -3.6, .15, 1.0, [1.7, 1.0]),
    p(`${D}/trunk_medium_C.gltf`, 5.2, -3.8, -.15, 1.0, [1.4, .85]),
    p(`${D}/barrel_small_stack.gltf`, -5.1, 2.9, .1, 1.0, [1.0, .9]),
    p(`${D}/shelf_small_candles.gltf`, 5.4, 2.8, -Math.PI / 2, 1.0, [1.0, 1.45]),
    p(`${D}/sword_shield.gltf`, -7.3, -1.2, Math.PI / 2, 1.2),
    p(`${D}/sword_shield.gltf`, 7.3, -1.2, -Math.PI / 2, 1.2),
    p(`${H}/candle_triple.gltf`, 0, -4.4, 0, 1.25),
  ],

  // 12 · Gefallene Galerie — diagonal ruins create hard sight-line breaks and two side pockets.
  12: [
    p(`${D}/wall_broken.gltf`, -4.8, -5.3, .48, .84, [3.4, .72]),
    p(`${D}/wall_cracked.gltf`, 3.6, -2.5, -.42, .84, [3.4, .72]),
    p(`${D}/wall_broken.gltf`, -3.2, 2.1, .42, .84, [3.4, .72]),
    p(`${D}/rubble_large.gltf`, -6.2, -2.0, .2, .95, [2.0, 1.4]),
    p(`${D}/rubble_large.gltf`, 5.6, 2.6, -.2, .9, [2.0, 1.4]),
    p(`${D}/shelf_large.gltf`, -7.1, -6.6, Math.PI / 2, 1.0, [1.0, 2.0]),
    p(`${D}/table_long_broken.gltf`, 5.7, -5.5, 0, 1.0, [2.4, 1.0]),
    p(`${D}/trunk_large_B.gltf`, -5.4, 5.0, .12, 1.0, [1.5, .9]),
    p(`${D}/barrel_large.gltf`, 7.0, -3.6, 0, 1.0, [1.0, 1.0]),
    p(`${D}/box_stacked.gltf`, 4.4, 4.9, -.1, 1.0, [1.25, 1.0]),
    p(`${T}/journal_open.gltf`, 5.3, -5.4, .2, 1.15),
    p(`${H}/skull.gltf`, 2.8, -1.7, -.2, 1.15),
    p(`${T}/lantern.gltf`, -4.9, 4.1, 0, 1.12),
  ],

  // 13 · Gefangenenring — gated cell blocks ring a narrow, dangerous central corridor.
  13: [
    p(`${D}/wall_corner_gated.gltf`, -7.0, -6.2, 0, .86, [2.0, 2.0]),
    p(`${D}/wall_corner_gated.gltf`, -7.0, 3.8, Math.PI / 2, .86, [2.0, 2.0]),
    p(`${D}/wall_corner_gated.gltf`, 7.0, -6.2, -Math.PI / 2, .86, [2.0, 2.0]),
    p(`${D}/wall_corner_gated.gltf`, 7.0, 3.8, Math.PI, .86, [2.0, 2.0]),
    p(`${H}/coffin_decorated.gltf`, -5.7, -4.5, Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${H}/coffin.gltf`, -5.7, 1.5, Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${H}/coffin.gltf`, 5.7, -4.5, -Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${H}/coffin_decorated.gltf`, 5.7, 1.5, -Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${D}/barrier_half.gltf`, -2.6, -1.0, Math.PI / 2, 1.0, [2.0, .75]),
    p(`${D}/barrier_half.gltf`, 2.6, 1.1, Math.PI / 2, 1.0, [2.0, .75]),
    p(`${D}/box_small.gltf`, -4.0, -1.1, .1, 1.0, [.9, .9]),
    p(`${D}/barrel_small.gltf`, 4.0, 1.2, -.1, 1.0, [.85, .85]),
    p(`${H}/candle_melted.gltf`, 0, -5.0, 0, 1.15),
  ],

  // 14 · Knochenhof — ruined enclosures make four combat quadrants instead of an empty square.
  14: [
    p(`${D}/wall_broken.gltf`, -5.0, -4.8, .3, .82, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 5.0, -4.8, -.3, .82, [3.3, .7]),
    p(`${D}/wall_cracked.gltf`, -5.2, 3.6, -.35, .82, [3.3, .7]),
    p(`${D}/wall_cracked.gltf`, 5.2, 3.6, .35, .82, [3.3, .7]),
    p(`${H}/grave_A_destroyed.gltf`, -5.7, -2.5, .2, 1.12, [1.0, 1.35]),
    p(`${H}/grave_B.gltf`, 5.7, -2.5, -.2, 1.12, [1.0, 1.35]),
    p(`${H}/fence_broken.gltf`, -5.7, 1.7, Math.PI / 2, 1.1, [.9, 1.8]),
    p(`${H}/fence_seperate_broken.gltf`, 5.7, 1.7, -Math.PI / 2, 1.1, [.9, 1.8]),
    p(`${D}/rubble_large.gltf`, -2.4, 4.8, .2, .85, [1.8, 1.25]),
    p(`${D}/rubble_large.gltf`, 2.6, -6.2, -.2, .85, [1.8, 1.25]),
    p(`${H}/tree_dead_small.gltf`, 0, -1.0, 0, .92, [.85, .85]),
    p(`${H}/skull.gltf`, -2.0, -1.3, 0, 1.25),
    p(`${H}/bone_A.gltf`, 2.0, -1.0, .4, 1.25),
  ],

  // 15 · Ritualarena — four architectural pylons, broken outer walls and a contested shrine core.
  15: [
    p(`${D}/column.gltf`, -5.8, -5.5, 0, 1.25, [.9, .9]),
    p(`${D}/column.gltf`, 5.8, -5.5, 0, 1.25, [.9, .9]),
    p(`${D}/column.gltf`, -5.8, 4.5, 0, 1.25, [.9, .9]),
    p(`${D}/column.gltf`, 5.8, 4.5, 0, 1.25, [.9, .9]),
    p(`${D}/wall_broken.gltf`, -7.1, -1.0, Math.PI / 2, .76, [3.1, .7]),
    p(`${D}/wall_broken.gltf`, 7.1, -1.0, Math.PI / 2, .76, [3.1, .7]),
    p(`${H}/shrine_candles.gltf`, 0, -1.0, 0, 1.55, [1.45, 1.45]),
    p(`${D}/barrier_column.gltf`, -3.2, -1.0, 0, 1.0, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 3.2, -1.0, 0, 1.0, [1.0, 1.0]),
    p(`${H}/candle_triple.gltf`, -3.5, -3.0, 0, 1.3),
    p(`${H}/candle_triple.gltf`, 3.5, -3.0, 0, 1.3),
    p(`${H}/skull.gltf`, -4.7, 2.7, 0, 1.3),
    p(`${H}/bone_A.gltf`, 4.7, 2.7, .4, 1.3),
  ],

  // 16 · Warden-Passage — staggered wall-and-pillar slalom with two recovery pockets.
  16: [
    p(`${D}/wall_broken.gltf`, -4.7, -6.0, .2, .78, [3.1, .7]),
    p(`${D}/wall_cracked.gltf`, 4.2, -2.8, -.2, .78, [3.1, .7]),
    p(`${D}/wall_broken.gltf`, -4.0, .7, .2, .78, [3.1, .7]),
    p(`${D}/wall_cracked.gltf`, 4.7, 4.0, -.2, .78, [3.1, .7]),
    p(`${D}/column.gltf`, -7.0, -6.2, 0, 1.16, [.8, .8]),
    p(`${D}/column.gltf`, 6.5, -2.8, 0, 1.16, [.8, .8]),
    p(`${D}/column.gltf`, -6.3, .7, 0, 1.16, [.8, .8]),
    p(`${D}/column.gltf`, 7.0, 4.0, 0, 1.16, [.8, .8]),
    p(`${D}/trunk_medium_A.gltf`, 6.1, -6.5, -.1, 1.0, [1.4, .85]),
    p(`${D}/barrel_small_stack.gltf`, -6.0, 4.8, .1, 1.0, [1.0, .9]),
    p(`${T}/blueprint_stacked.gltf`, 0, -7.1, -.2, 1.2),
    p(`${D}/sword_shield_broken.gltf`, 0, 5.5, 0, 1.25),
  ],

  // 17 · Eingestürztes Gewölbe — rubble wedges and broken masonry carve three distinct combat pockets.
  17: [
    p(`${D}/wall_broken.gltf`, -5.3, -5.5, .55, .86, [3.5, .72]),
    p(`${D}/wall_cracked.gltf`, 5.3, -5.3, -.55, .86, [3.5, .72]),
    p(`${D}/wall_broken.gltf`, -4.0, 3.3, -.35, .82, [3.3, .7]),
    p(`${D}/rubble_large.gltf`, -6.0, -2.4, .2, 1.0, [2.1, 1.45]),
    p(`${D}/rubble_large.gltf`, 5.7, 1.4, -.2, 1.0, [2.1, 1.45]),
    p(`${D}/rubble_large.gltf`, .8, 4.7, .1, .9, [1.9, 1.3]),
    p(`${H}/crypt.gltf`, -7.0, 4.4, Math.PI / 2, 1.08, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 7.0, -6.7, -Math.PI / 2, 1.08, [1.6, 1.25]),
    p(`${H}/coffin_decorated.gltf`, 5.4, 4.8, -Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${D}/box_stacked.gltf`, -2.4, -2.0, .1, 1.0, [1.25, 1.0]),
    p(`${H}/grave_A_destroyed.gltf`, 2.8, -1.0, .2, 1.0),
    p(`${H}/candle_triple.gltf`, 0, -4.2, 0, 1.3),
  ],

  // 18 · Veil-Riss — cracked wall ring and four anchors frame a large but no longer empty orbit.
  18: [
    p(`${H}/shrine_candles.gltf`, 0, -1.0, 0, 1.7, [1.55, 1.55]),
    p(`${D}/wall_cracked.gltf`, -5.0, -5.0, .45, .8, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, 5.0, -5.0, -.45, .8, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, -5.0, 3.3, -.45, .8, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, 5.0, 3.3, .45, .8, [3.2, .7]),
    p(`${D}/column.gltf`, -6.8, -1.0, 0, 1.18, [.85, .85]),
    p(`${D}/column.gltf`, 6.8, -1.0, 0, 1.18, [.85, .85]),
    p(`${D}/column.gltf`, 0, -6.5, 0, 1.18, [.85, .85]),
    p(`${D}/column.gltf`, 0, 4.7, 0, 1.18, [.85, .85]),
    p(`${H}/candle_triple.gltf`, -3.0, -1.0, 0, 1.3),
    p(`${H}/candle_triple.gltf`, 3.0, -1.0, 0, 1.3),
    p(`${H}/candle_melted.gltf`, 0, 1.7, 0, 1.2),
    p(`${H}/skull.gltf`, -2.0, 1.1, .2, 1.2),
    p(`${H}/bone_A.gltf`, 2.0, 1.1, -.2, 1.2),
  ],

  // 19 · Vorhalle des Wächters — monumental gate axis with dense side architecture and a readable boss sight-line.
  19: [
    p(`${D}/wall_arched.gltf`, 0, -7.0, 0, 1.0, [3.2, .8]),
    p(`${D}/wall.gltf`, -4.7, -7.0, 0, .85, [3.4, .72]),
    p(`${D}/wall.gltf`, 4.7, -7.0, 0, .85, [3.4, .72]),
    p(`${D}/column.gltf`, -5.8, -4.3, 0, 1.25, [.9, .9]),
    p(`${D}/column.gltf`, 5.8, -4.3, 0, 1.25, [.9, .9]),
    p(`${D}/column.gltf`, -5.8, 3.8, 0, 1.2, [.85, .85]),
    p(`${D}/column.gltf`, 5.8, 3.8, 0, 1.2, [.85, .85]),
    p(`${D}/wall_broken.gltf`, -7.2, -.3, Math.PI / 2, .75, [3.0, .65]),
    p(`${D}/wall_broken.gltf`, 7.2, -.3, Math.PI / 2, .75, [3.0, .65]),
    p(`${H}/shrine_candles.gltf`, 0, -4.8, 0, 1.42, [1.35, 1.35]),
    p(`${D}/banner_triple_red.gltf`, -4.4, -6.7, 0, 1.2),
    p(`${D}/banner_triple_red.gltf`, 4.4, -6.7, 0, 1.2),
    p(`${D}/sword_shield_gold.gltf`, -3.6, -6.5, 0, 1.25),
    p(`${D}/sword_shield_gold.gltf`, 3.6, -6.5, 0, 1.25),
    p(`${H}/candle_triple.gltf`, -4.0, 1.5, 0, 1.3),
    p(`${H}/candle_triple.gltf`, 4.0, 1.5, 0, 1.3),
  ],

  // 20 · Kapitelboss — open boss core, dense perimeter, four unmistakable phase anchors.
  20: [
    p(`${D}/wall_corner.gltf`, -7.4, -6.4, 0, .9, [2.0, 2.0]),
    p(`${D}/wall_corner.gltf`, 7.4, -6.4, -Math.PI / 2, .9, [2.0, 2.0]),
    p(`${D}/wall_corner.gltf`, -7.4, 4.6, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${D}/wall_corner.gltf`, 7.4, 4.6, Math.PI, .9, [2.0, 2.0]),
    p(`${D}/column.gltf`, -5.7, -4.9, 0, 1.35, [1.0, 1.0]),
    p(`${D}/column.gltf`, 5.7, -4.9, 0, 1.35, [1.0, 1.0]),
    p(`${D}/column.gltf`, -5.7, 3.1, 0, 1.35, [1.0, 1.0]),
    p(`${D}/column.gltf`, 5.7, 3.1, 0, 1.35, [1.0, 1.0]),
    p(`${D}/wall_broken.gltf`, -7.7, -1.0, Math.PI / 2, .75, [3.0, .65]),
    p(`${D}/wall_broken.gltf`, 7.7, -1.0, Math.PI / 2, .75, [3.0, .65]),
    p(`${H}/crypt.gltf`, -8.1, -3.0, Math.PI / 2, 1.08, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 8.1, -3.0, -Math.PI / 2, 1.08, [1.6, 1.25]),
    p(`${D}/barrier_column.gltf`, 0, -5.4, 0, 1.15, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, -4.3, -1.0, 0, 1.15, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 4.3, -1.0, 0, 1.15, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 0, 3.4, 0, 1.15, [1.0, 1.0]),
    p(`${H}/candle_triple.gltf`, -3.0, -5.0, 0, 1.35),
    p(`${H}/candle_triple.gltf`, 3.0, -5.0, 0, 1.35),
    p(`${H}/skull.gltf`, -2.2, 2.3, .2, 1.25),
    p(`${H}/bone_A.gltf`, 2.2, 2.3, -.2, 1.25),
  ],
};

export function roomSetpieces(room: number): RoomSetpiece[] {
  return ROOM_SETPIECES[Math.max(1, Math.min(20, room))] ?? [];
}
