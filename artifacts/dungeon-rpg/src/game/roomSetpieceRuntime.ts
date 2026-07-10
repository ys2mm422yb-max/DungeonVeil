import { roomSetpieces as legacyRoomSetpieces, type RoomSetpiece } from './roomSetpieceLayout';

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
 * Runtime translation of the individually reviewed Canva V3 mobile room pages.
 * One Canva macro mass becomes one or more visible KayKit objects so the camera
 * reads architecture, not isolated furniture islands. Rooms 12-20 deliberately
 * fall back to the prior layout until their Canva pages can be converted.
 */
const CANVA_V3_ROOMS: Partial<Record<number, RoomSetpiece[]>> = {
  // ROOM 01 · Verlassener Versorgungsposten
  1: [
    p(`${D}/wall_broken.gltf`, -6.1, -2.6, 0, .92, [3.4, .7]),
    p(`${D}/wall_broken.gltf`, -3.1, -2.6, Math.PI, .92, [3.4, .7]),
    p(`${D}/wall_broken.gltf`, 3.1, -2.6, 0, .92, [3.4, .7]),
    p(`${D}/wall_broken.gltf`, 6.1, -2.6, Math.PI, .92, [3.4, .7]),
    p(`${F}/shelf_B_large_decorated.gltf`, -7.2, -6.4, Math.PI / 2, 1.08, [1.0, 2.2]),
    p(`${D}/shelf_large.gltf`, -5.2, -6.8, 0, 1.08, [2.0, 1.0]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.7, -4.7, .08, 1.08, [1.5, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, -7.0, -4.2, .12, 1.08, [1.0, .9]),
    p(`${D}/box_stacked.gltf`, -6.8, -1.0, -.08, 1.08, [1.2, 1.0]),
    p(`${F}/shelf_A_big.gltf`, 7.2, -6.3, -Math.PI / 2, 1.08, [1.0, 2.2]),
    p(`${D}/trunk_medium_A.gltf`, 5.2, -6.5, 0, 1.1, [1.4, .85]),
    p(`${D}/barrel_large_decorated.gltf`, 6.7, -4.2, 0, 1.08, [1.0, 1.0]),
    p(`${D}/box_large.gltf`, 5.0, -4.0, .1, 1.08, [1.2, 1.0]),
    p(`${D}/box_stacked.gltf`, -6.5, 4.6, 0, 1.08, [1.2, 1.0]),
    p(`${R}/Pallet_Wood.gltf`, -4.3, 4.6, 0, 1.04, [1.5, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, -2.6, 4.6, .1, 1.04, [1.0, .9]),
    p(`${D}/wall_cracked.gltf`, 5.6, 5.1, 0, .9, [3.3, .7]),
    p(`${T}/rope_bundle_A.gltf`, -4.8, -4.5, .22, 1.12),
    p(`${T}/bucket_metal.gltf`, 6.0, -5.1, 0, 1.08),
  ],

  // ROOM 02 · Wachstube
  2: [
    p(`${D}/wall_corner_small.gltf`, -7.1, -6.3, 0, 1.0, [1.8, 1.8]),
    p(`${D}/wall_broken.gltf`, -4.3, -5.8, 0, .9, [3.3, .7]),
    p(`${D}/table_long_decorated_A.gltf`, -4.6, -4.2, 0, 1.12, [2.5, 1.0]),
    p(`${T}/map.gltf`, -4.8, -4.2, 0, 1.14),
    p(`${T}/journal_open.gltf`, -3.5, -4.0, .2, 1.1),
    p(`${D}/chair.gltf`, -5.8, -2.9, .1, 1.05),
    p(`${D}/chair.gltf`, -3.2, -2.9, -.1, 1.05),
    p(`${D}/wall_broken.gltf`, 4.5, -5.8, Math.PI, .9, [3.3, .7]),
    p(`${D}/shelf_large.gltf`, 7.0, -4.6, -Math.PI / 2, 1.08, [1.0, 2.0]),
    p(`${D}/box_stacked.gltf`, 5.4, -4.2, .08, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_large.gltf`, 6.7, -2.3, 0, 1.08, [1.0, 1.0]),
    p(`${D}/sword_shield.gltf`, 5.0, -2.7, 0, 1.25),
    p(`${D}/barrier.gltf`, -6.0, .3, 0, 1.08, [2.6, .8]),
    p(`${D}/barrier_half.gltf`, -1.4, .3, 0, 1.08, [2.0, .75]),
    p(`${D}/barrier_half.gltf`, 1.4, .3, Math.PI, 1.08, [2.0, .75]),
    p(`${D}/barrier.gltf`, 6.0, .3, Math.PI, 1.08, [2.6, .8]),
    p(`${D}/pillar.gltf`, -7.2, 4.3, 0, 1.18, [.9, .9]),
    p(`${D}/pillar.gltf`, 7.2, 4.3, 0, 1.18, [.9, .9]),
    p(`${D}/wall_arched.gltf`, 0, -7.4, 0, 1.0, [3.2, .8]),
  ],

  // ROOM 03 · Alte Säulenhalle
  3: [
    p(`${D}/column.gltf`, -5.6, -6.0, 0, 1.34, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, -6.0, 0, 1.34, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, -2.2, 0, 1.34, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, -2.2, 0, 1.34, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, 1.8, 0, 1.34, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, 1.8, 0, 1.34, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, 5.7, 0, 1.34, [.9, .9]),
    p(`${D}/pillar.gltf`, 5.2, 4.7, .2, 1.18, [.9, .9]),
    p(`${D}/rubble_large.gltf`, 6.1, 5.5, .25, 1.1, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, 4.9, 6.4, -.15, 1.08, [1.5, 1.0]),
    p(`${D}/wall_broken.gltf`, -2.8, 0, 0, .92, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 2.8, 0, Math.PI, .92, [3.3, .7]),
    p(`${D}/barrier_column.gltf`, 0, -4.0, 0, 1.22, [1.0, 1.0]),
    p(`${D}/banner_patternB_red.gltf`, -5.6, -4.9, 0, 1.22),
    p(`${D}/banner_patternB_red.gltf`, 5.6, -4.9, 0, 1.22),
    p(`${D}/wall_cracked.gltf`, 5.7, 6.4, 0, .82, [3.2, .7]),
    p(`${H}/candle_triple.gltf`, -4.0, 5.9, 0, 1.22),
  ],

  // ROOM 04 · Bergarbeiterlager
  4: [
    p(`${D}/wall_cracked.gltf`, -7.3, -5.7, Math.PI / 2, .9, [3.4, .72]),
    p(`${D}/wall_broken.gltf`, -5.2, -5.8, 0, .86, [3.3, .7]),
    p(`${F}/table_low.gltf`, -5.4, -4.1, 0, 1.1, [1.55, .95]),
    p(`${T}/pickaxe.gltf`, -6.1, -4.2, .18, 1.35),
    p(`${T}/shovel.gltf`, -5.0, -3.8, -.18, 1.32),
    p(`${D}/barrel_small_stack.gltf`, -6.7, -1.9, .1, 1.08, [1.0, .9]),
    p(`${D}/box_small_decorated.gltf`, -5.0, -1.6, -.1, 1.08, [.9, .9]),
    p(`${R}/Pallet_Wood.gltf`, 5.3, -5.3, 0, 1.08, [1.55, 1.0]),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, 6.6, -5.0, .08, 1.08, [1.55, 1.0]),
    p(`${R}/Iron_Nuggets.gltf`, 4.6, -4.8, .2, 1.18),
    p(`${R}/Copper_Nuggets.gltf`, 6.3, -3.8, -.2, 1.18),
    p(`${D}/shelf_large.gltf`, 7.1, -2.2, -Math.PI / 2, 1.08, [1.0, 2.0]),
    p(`${D}/barrier.gltf`, -4.8, 1.5, .16, 1.06, [2.6, .8]),
    p(`${D}/barrier.gltf`, -.6, .8, .16, 1.06, [2.6, .8]),
    p(`${D}/barrier.gltf`, 3.6, .1, .16, 1.06, [2.6, .8]),
    p(`${D}/rubble_large.gltf`, 6.0, 2.3, .2, 1.08, [2.0, 1.4]),
    p(`${D}/barrier_half.gltf`, -5.3, 4.6, .08, 1.08, [2.0, .75]),
    p(`${D}/barrier_half.gltf`, -2.5, 4.8, .08, 1.08, [2.0, .75]),
    p(`${D}/box_stacked.gltf`, 5.2, 5.0, 0, 1.08, [1.2, 1.0]),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, 6.8, 5.0, .1, 1.08, [1.25, .8]),
  ],

  // ROOM 05 · Verlassene Werkstatt
  5: [
    p(`${D}/wall_corner.gltf`, -7.2, -6.1, 0, .96, [2.0, 2.0]),
    p(`${D}/wall_broken.gltf`, -4.7, -5.9, 0, .88, [3.3, .7]),
    p(`${D}/table_long_decorated_C.gltf`, -4.8, -4.4, 0, 1.1, [2.5, 1.0]),
    p(`${T}/blueprint_stacked.gltf`, -5.7, -4.4, .1, 1.18),
    p(`${T}/handdrill.gltf`, -4.6, -4.1, -.3, 1.25),
    p(`${T}/file.gltf`, -3.5, -4.5, .35, 1.2),
    p(`${D}/shelves.gltf`, -7.1, -1.9, Math.PI / 2, 1.08, [1.0, 2.0]),
    p(`${D}/wall_broken.gltf`, -3.0, .1, Math.PI / 2, .9, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, -3.0, 3.0, Math.PI / 2, .9, [3.3, .7]),
    p(`${D}/table_medium_decorated_A.gltf`, 4.8, -4.8, 0, 1.1, [1.8, 1.0]),
    p(`${T}/saw.gltf`, 4.2, -4.9, .18, 1.25),
    p(`${T}/hammer.gltf`, 5.5, -4.5, -.25, 1.2),
    p(`${D}/shelf_small.gltf`, 7.1, -2.7, -Math.PI / 2, 1.08, [1.0, 1.45]),
    p(`${D}/box_stacked.gltf`, 5.5, -1.1, .1, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 7.0, -.8, -.1, 1.08, [1.0, .9]),
    p(`${D}/wall_broken.gltf`, 3.0, 2.0, 0, .9, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 6.0, 2.0, Math.PI, .9, [3.3, .7]),
    p(`${D}/trunk_medium_B.gltf`, 5.1, 5.0, .1, 1.08, [1.4, .85]),
    p(`${D}/barrel_small_stack.gltf`, 7.0, 5.0, -.1, 1.08, [1.0, .9]),
    p(`${D}/rubble_large.gltf`, -6.0, 5.0, .15, 1.05, [2.0, 1.4]),
  ],

  // ROOM 06 · Schmiede
  6: [
    p(`${D}/wall_cracked.gltf`, -7.3, -5.5, Math.PI / 2, .92, [3.4, .72]),
    p(`${D}/wall_cracked.gltf`, -7.3, -2.2, Math.PI / 2, .92, [3.4, .72]),
    p(`${T}/anvil.gltf`, -5.4, -4.4, 0, 1.58, [1.0, .8]),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.1, -2.0, .05, 1.14, [1.25, .8]),
    p(`${D}/barrel_large.gltf`, -4.4, -1.8, 0, 1.08, [1.0, 1.0]),
    p(`${T}/hammer.gltf`, -4.7, -4.2, .3, 1.35),
    p(`${T}/tongs.gltf`, -5.2, -5.0, -.25, 1.28),
    p(`${D}/barrier_half.gltf`, -4.0, 1.1, 0, 1.12, [2.0, .75]),
    p(`${D}/barrier_column.gltf`, -2.3, 1.1, 0, 1.12, [1.0, 1.0]),
    p(`${D}/barrier_half.gltf`, 0, 1.1, 0, 1.12, [2.0, .75]),
    p(`${D}/barrier_column.gltf`, 2.3, 1.1, 0, 1.12, [1.0, 1.0]),
    p(`${D}/barrier_half.gltf`, 4.0, 1.1, Math.PI, 1.12, [2.0, .75]),
    p(`${T}/grindstone.gltf`, 5.3, -4.4, Math.PI / 2, 1.55, [1.0, 1.25]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.5, -1.8, -.1, 1.12, [1.0, .7]),
    p(`${D}/box_large.gltf`, 4.5, -1.6, .1, 1.08, [1.2, 1.0]),
    p(`${D}/wall_broken.gltf`, -5.8, 5.0, 0, .92, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 5.8, 5.0, Math.PI, .92, [3.3, .7]),
    p(`${D}/barrier_column.gltf`, 0, -3.7, 0, 1.28, [1.0, 1.0]),
    p(`${D}/torch_lit.gltf`, -7.2, -7.3, 0, 1.3),
    p(`${D}/torch_lit.gltf`, 7.2, -7.3, 0, 1.3),
  ],

  // ROOM 07 · Schlafquartier
  7: [
    p(`${D}/wall_broken.gltf`, -5.5, -5.8, 0, .9, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, -3.2, -3.7, Math.PI / 2, .9, [3.3, .7]),
    p(`${F}/bed_single_A.gltf`, -6.1, -4.3, Math.PI / 2, 1.08, [1.15, 2.2]),
    p(`${F}/bed_single_B.gltf`, -6.1, -1.8, Math.PI / 2, 1.08, [1.15, 2.2]),
    p(`${F}/cabinet_small_decorated.gltf`, -7.2, -.1, Math.PI / 2, 1.08, [.8, .9]),
    p(`${D}/wall_broken.gltf`, 5.5, -5.8, Math.PI, .9, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 3.2, -3.7, Math.PI / 2, .9, [3.3, .7]),
    p(`${F}/bed_single_A.gltf`, 6.1, -4.3, -Math.PI / 2, 1.08, [1.15, 2.2]),
    p(`${F}/bed_single_B.gltf`, 6.1, -1.8, -Math.PI / 2, 1.08, [1.15, 2.2]),
    p(`${F}/cabinet_small_decorated.gltf`, 7.2, -.1, -Math.PI / 2, 1.08, [.8, .9]),
    p(`${D}/table_medium_tablecloth_decorated_B.gltf`, 0, -2.0, 0, 1.12, [1.8, 1.0]),
    p(`${D}/chair.gltf`, -1.5, -.5, .1, 1.04),
    p(`${D}/chair.gltf`, 1.5, -.5, -.1, 1.04),
    p(`${F}/cabinet_medium_decorated.gltf`, -6.2, 3.5, 0, 1.08, [1.2, 1.2]),
    p(`${F}/shelf_A_big.gltf`, -4.4, 3.5, 0, 1.04, [2.0, 1.0]),
    p(`${F}/cabinet_medium_decorated.gltf`, 6.2, 3.5, 0, 1.08, [1.2, 1.2]),
    p(`${F}/shelf_A_big.gltf`, 4.4, 3.5, Math.PI, 1.04, [2.0, 1.0]),
    p(`${D}/wall_broken.gltf`, -1.8, 5.2, 0, .92, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 1.8, 5.2, Math.PI, .92, [3.3, .7]),
  ],

  // ROOM 08 · Materiallager
  8: [
    p(`${F}/shelf_B_large_decorated.gltf`, -6.3, -6.0, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${F}/shelf_B_large.gltf`, -6.3, -3.5, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${F}/shelf_A_big.gltf`, -2.8, -5.0, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${F}/shelf_A_big.gltf`, -2.8, -2.5, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${D}/shelf_large.gltf`, 1.2, -6.0, Math.PI / 2, 1.12, [1.0, 2.0]),
    p(`${D}/shelf_large.gltf`, 1.2, -3.5, Math.PI / 2, 1.12, [1.0, 2.0]),
    p(`${F}/shelf_B_large_decorated.gltf`, 5.8, -5.0, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${F}/shelf_B_large.gltf`, 5.8, -2.5, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${F}/shelf_A_big.gltf`, -5.6, .7, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${F}/shelf_A_big.gltf`, -5.6, 3.0, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${D}/shelf_large.gltf`, -1.0, 2.0, Math.PI / 2, 1.12, [1.0, 2.0]),
    p(`${D}/shelf_large.gltf`, -1.0, 4.5, Math.PI / 2, 1.12, [1.0, 2.0]),
    p(`${F}/shelf_B_large.gltf`, 3.2, .7, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${F}/shelf_B_large.gltf`, 3.2, 3.0, Math.PI / 2, 1.12, [1.0, 2.2]),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, 6.2, 2.7, 0, 1.12, [1.55, 1.0]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, 6.5, 4.1, .1, 1.08, [2.0, 1.4]),
    p(`${D}/rubble_large.gltf`, -6.4, 5.5, .2, 1.12, [2.0, 1.4]),
    p(`${D}/barrier.gltf`, 0, 5.3, 0, 1.12, [2.6, .8]),
    p(`${D}/wall_broken.gltf`, 5.8, 6.0, 0, .88, [3.3, .7]),
  ],

  // ROOM 09 · Ritualkammer
  9: [
    p(`${H}/shrine_candles.gltf`, 0, -.3, 0, 1.85, [1.6, 1.6]),
    p(`${D}/column.gltf`, -5.2, -4.6, 0, 1.38, [.9, .9]),
    p(`${D}/column.gltf`, 5.2, -4.6, 0, 1.38, [.9, .9]),
    p(`${D}/column.gltf`, -5.2, 4.1, 0, 1.38, [.9, .9]),
    p(`${D}/column.gltf`, 5.2, 4.1, 0, 1.38, [.9, .9]),
    p(`${D}/wall_cracked.gltf`, -5.8, -4.0, .65, .84, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, -3.5, -5.7, .65, .84, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, 3.5, -5.7, -.65, .84, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, 5.8, -4.0, -.65, .84, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, -5.8, 3.4, -.65, .84, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, -3.5, 5.5, -.65, .84, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, 3.5, 5.5, .65, .84, [3.2, .7]),
    p(`${D}/wall_cracked.gltf`, 5.8, 3.4, .65, .84, [3.2, .7]),
    p(`${D}/pillar.gltf`, 0, -6.6, 0, 1.18, [.9, .9]),
    p(`${D}/pillar.gltf`, 0, 6.0, 0, 1.18, [.9, .9]),
    p(`${H}/candle_triple.gltf`, -2.8, -.3, 0, 1.25),
    p(`${H}/candle_triple.gltf`, 2.8, -.3, 0, 1.25),
  ],

  // ROOM 10 · Grabwächterhalle
  10: [
    p(`${H}/crypt.gltf`, -6.7, -5.6, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, -6.7, -2.8, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, -6.7, 0, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 6.7, -5.6, -Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 6.7, -2.8, -Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 6.7, 0, -Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/grave_A_destroyed.gltf`, -4.0, 3.0, .1, 1.18, [1.3, 1.8]),
    p(`${H}/grave_B.gltf`, 4.0, 3.0, -.1, 1.18, [1.3, 1.8]),
    p(`${H}/grave_A.gltf`, -4.0, 5.5, -.1, 1.18, [1.3, 1.8]),
    p(`${H}/grave_B_destroyed.gltf`, 4.0, 5.5, .1, 1.18, [1.3, 1.8]),
    p(`${D}/wall_arched.gltf`, 0, -7.3, 0, 1.08, [3.2, .8]),
    p(`${D}/barrier_column.gltf`, 0, -4.2, 0, 1.18, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 0, -1.9, 0, 1.18, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 0, .4, 0, 1.18, [1.0, 1.0]),
    p(`${D}/column.gltf`, -2.0, -5.8, 0, 1.28, [.9, .9]),
    p(`${D}/column.gltf`, 2.0, -5.8, 0, 1.28, [.9, .9]),
    p(`${H}/candle_triple.gltf`, -2.0, -3.0, 0, 1.28),
    p(`${H}/candle_triple.gltf`, 2.0, -3.0, 0, 1.28),
  ],

  // ROOM 11 · Kreuzgang der Wachen
  11: [
    p(`${D}/wall_broken.gltf`, -5.8, -5.2, 0, .92, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, -7.2, -3.5, Math.PI / 2, .92, [3.3, .7]),
    p(`${D}/column.gltf`, -4.2, -3.8, 0, 1.32, [.9, .9]),
    p(`${D}/barrier_column.gltf`, -5.3, -4.2, 0, 1.08, [1.0, 1.0]),
    p(`${D}/wall_broken.gltf`, 5.8, -5.2, Math.PI, .92, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 7.2, -3.5, Math.PI / 2, .92, [3.3, .7]),
    p(`${D}/column.gltf`, 4.2, -3.8, 0, 1.32, [.9, .9]),
    p(`${D}/barrier_column.gltf`, 5.3, -4.2, 0, 1.08, [1.0, 1.0]),
    p(`${D}/wall_broken.gltf`, -5.8, 4.7, 0, .92, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, -7.2, 3.0, Math.PI / 2, .92, [3.3, .7]),
    p(`${D}/column.gltf`, -4.2, 3.4, 0, 1.32, [.9, .9]),
    p(`${D}/barrier_column.gltf`, -5.3, 4.0, 0, 1.08, [1.0, 1.0]),
    p(`${D}/wall_broken.gltf`, 5.8, 4.7, Math.PI, .92, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 7.2, 3.0, Math.PI / 2, .92, [3.3, .7]),
    p(`${D}/column.gltf`, 4.2, 3.4, 0, 1.32, [.9, .9]),
    p(`${D}/barrier_column.gltf`, 5.3, 4.0, 0, 1.08, [1.0, 1.0]),
    p(`${D}/barrier_half.gltf`, -5.0, -1.0, 0, 1.08, [2.0, .75]),
    p(`${D}/barrier_half.gltf`, 5.0, 1.0, Math.PI, 1.08, [2.0, .75]),
  ],
};

export function runtimeRoomSetpieces(room: number): RoomSetpiece[] {
  const key = Math.max(1, Math.min(20, room));
  return CANVA_V3_ROOMS[key] ?? legacyRoomSetpieces(key);
}
