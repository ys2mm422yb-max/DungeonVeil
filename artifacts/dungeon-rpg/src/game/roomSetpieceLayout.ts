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
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';

const p = (model: string, x: number, z: number, rotation = 0, scale = 1, collider?: readonly [number, number]): RoomSetpiece => ({ model, x, z, rotation, scale, collider });

/** Functional room setpieces only. Architecture lives in roomArchitectureLayout. */
export const ROOM_SETPIECES: Record<number, RoomSetpiece[]> = {
  1: [
    p(`${F}/shelf_B_large_decorated.gltf`, -7.5, -7.0, Math.PI / 2, 1.08, [1.2, 2.8]),
    p(`${F}/cabinet_medium_decorated.gltf`, -7.1, -4.8, Math.PI / 2, 1.02, [1.2, 1.5]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.4, -6.5, .08, 1.08, [2.1, 1.5]),
    p(`${R}/Pallet_Wood.gltf`, -5.1, -4.8, -.12, .98, [2.1, 1.5]),
    p(`${F}/shelf_A_big.gltf`, 7.5, -7.0, -Math.PI / 2, 1.05, [1.2, 2.7]),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, 6.0, -6.2, .05, 1.02, [1.7, 1.1]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.4, -4.8, -.08, 1.02, [1.3, 1]),
    p(`${T}/rope_bundle_B.gltf`, 5.2, -5.0, -.2, 1.08),
  ],
  2: [
    p(`${F}/table_medium_long.gltf`, -5.2, -5.7, 0, 1.16, [3, 1.5]),
    p(`${T}/map.gltf`, -5.7, -5.75, 0, 1.12),
    p(`${T}/journal_open.gltf`, -4.5, -5.45, .25, 1.08),
    p(`${F}/chair_A_wood.gltf`, -6.4, -4.3, .1, 1, [.9, .9]),
    p(`${F}/chair_A_wood.gltf`, -4.0, -4.25, -.1, 1, [.9, .9]),
    p(`${F}/cabinet_medium_decorated.gltf`, 7.2, -6.4, -Math.PI / 2, 1.04, [1.2, 1.5]),
    p(`${F}/shelf_B_small_decorated.gltf`, 5.8, -6.1, 0, 1.04, [1.2, 1.6]),
    p(`${T}/lantern.gltf`, 5.7, -4.8, 0, 1.25),
  ],
  3: [
    p(`${H}/candle_triple.gltf`, -4.8, -4.4, 0, 1.16), p(`${H}/candle_triple.gltf`, 4.8, -4.4, 0, 1.16),
    p(`${H}/candle_melted.gltf`, -4.6, 3.5, 0, 1.08), p(`${H}/candle_melted.gltf`, 5.0, 4.2, 0, 1.08),
    p(`${H}/plaque.gltf`, 0, -6.9, 0, 1.14),
  ],
  4: [
    p(`${F}/table_low.gltf`, -6.0, -5.7, 0, 1.12, [2, 1.4]),
    p(`${T}/pickaxe.gltf`, -6.7, -5.7, .18, 1.3), p(`${T}/shovel.gltf`, -5.7, -5.4, -.18, 1.28),
    p(`${T}/bucket_metal.gltf`, -7.0, -4.4, 0, 1.08), p(`${T}/lantern.gltf`, -5.0, -4.5, 0, 1.2),
    p(`${R}/Pallet_Wood.gltf`, 6.0, -5.9, 0, 1.06, [2.1, 1.5]),
    p(`${R}/Iron_Nuggets.gltf`, 5.4, -5.45, .2, 1.18), p(`${R}/Copper_Nuggets.gltf`, 6.7, -5.45, -.2, 1.18),
    p(`${R}/Iron_Bars_Stack_Small.gltf`, 6.1, -4.2, .06, 1.02, [1.3, 1]),
  ],
  5: [
    p(`${F}/table_medium_long.gltf`, -5.4, -5.7, 0, 1.12, [3, 1.5]),
    p(`${T}/blueprint_stacked.gltf`, -6.0, -5.7, .1, 1.16), p(`${T}/handdrill.gltf`, -5.1, -5.4, -.3, 1.22), p(`${T}/file.gltf`, -4.25, -5.75, .35, 1.15),
    p(`${F}/shelf_B_large_decorated.gltf`, -7.6, -6.2, Math.PI / 2, 1, [1.2, 2.8]),
    p(`${F}/table_small.gltf`, 6.0, -5.35, 0, 1.08, [1.4, 1.4]), p(`${T}/saw.gltf`, 5.8, -5.45, .18, 1.24), p(`${T}/hammer.gltf`, 6.5, -5.05, -.25, 1.14),
    p(`${F}/chair_stool_wood.gltf`, 5.35, -4.05, .1, .94, [.8, .8]),
  ],
  6: [
    p(`${T}/anvil.gltf`, -5.7, -5.5, 0, 1.55, [1.5, 1.1]), p(`${T}/hammer.gltf`, -4.9, -5.2, .3, 1.28), p(`${T}/tongs.gltf`, -5.1, -5.9, -.25, 1.22),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.8, -4.2, .05, 1.08, [1.7, 1.1]), p(`${T}/bucket_metal.gltf`, -4.3, -4.0, 0, 1.04),
    p(`${T}/grindstone.gltf`, 5.5, -5.3, Math.PI / 2, 1.5, [1.7, 1.3]), p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.6, -4.1, -.1, 1.06, [1.3, 1]),
    p(`${T}/torch.gltf`, -7.6, -7.5, 0, 1.3), p(`${T}/torch.gltf`, 7.6, -7.5, 0, 1.3),
  ],
  7: [
    p(`${F}/bed_single_A.gltf`, -6.2, -6.3, Math.PI / 2, 1.05, [1.6, 3]), p(`${F}/cabinet_small_decorated.gltf`, -7.4, -4.2, Math.PI / 2, 1, [1.1, 1.2]),
    p(`${F}/bed_single_B.gltf`, 6.2, -6.3, -Math.PI / 2, 1.05, [1.6, 3]), p(`${F}/cabinet_small.gltf`, 7.4, -4.2, -Math.PI / 2, 1, [1.1, 1.2]),
    p(`${F}/bed_single_B.gltf`, -6.0, 5.6, Math.PI / 2, .98, [1.6, 3]), p(`${F}/bed_single_A.gltf`, 6.0, 5.6, -Math.PI / 2, .98, [1.6, 3]),
    p(`${F}/rug_rectangle_stripes_A.gltf`, 0, .2, 0, 1.5), p(`${F}/table_low.gltf`, 0, 1.0, 0, .92, [2, 1.4]),
  ],
  8: [
    p(`${F}/shelf_A_big.gltf`, -7.5, -6.8, Math.PI / 2, 1, [1.2, 2.7]), p(`${R}/Pallet_Wood_Covered_B.gltf`, -5.6, -6.1, .06, 1, [2.1, 1.5]),
    p(`${F}/shelf_B_large.gltf`, 7.5, -6.8, -Math.PI / 2, 1, [1.2, 2.7]), p(`${R}/Iron_Bars_Stack_Large.gltf`, 5.7, -6.0, -.06, .98, [2, 1.4]),
    p(`${R}/Copper_Bars_Stack_Medium.gltf`, -5.8, 3.8, .08, 1, [1.7, 1.1]), p(`${R}/Iron_Bars_Stack_Medium.gltf`, -4.0, 3.8, -.08, 1, [1.7, 1.1]),
    p(`${R}/Pallet_Wood.gltf`, 6.0, 6.0, .1, .94, [2.1, 1.5]),
  ],
  9: [
    p(`${H}/shrine_candles.gltf`, 0, -5.0, 0, 1.6, [2, 2]),
    p(`${H}/candle_triple.gltf`, -3.5, -3.8, 0, 1.25), p(`${H}/candle_triple.gltf`, 3.5, -3.8, 0, 1.25),
    p(`${H}/plaque_candles.gltf`, -4.8, -1.6, .06, 1.1), p(`${H}/plaque_candles.gltf`, 4.8, -1.6, -.06, 1.1),
    p(`${H}/skull_candle.gltf`, -2.4, -1.9, .2, 1.18), p(`${H}/ribcage.gltf`, 2.4, -1.8, -.2, 1.12),
    p(`${T}/journal_open.gltf`, 0, -1.5, .05, 1.16), p(`${F}/rug_oval_A.gltf`, 0, .4, 0, 1.4),
  ],
  10: [
    p(`${H}/crypt.gltf`, -7.2, -5.8, Math.PI / 2, 1.18, [2.3, 1.8]), p(`${H}/crypt.gltf`, 7.2, -5.8, -Math.PI / 2, 1.18, [2.3, 1.8]),
    p(`${H}/grave_A.gltf`, -7.0, 2.8, .08, 1.18, [1.3, 1.8]), p(`${H}/grave_B.gltf`, 7.0, 2.8, -.08, 1.18, [1.3, 1.8]),
    p(`${H}/candle_triple.gltf`, -3.2, -3.5, 0, 1.26), p(`${H}/candle_triple.gltf`, 3.2, -3.5, 0, 1.26),
    p(`${H}/candle_triple.gltf`, -3.4, 1.0, 0, 1.2), p(`${H}/candle_triple.gltf`, 3.4, 1.0, 0, 1.2),
  ],
  11: [
    p(`${H}/bench_decorated.gltf`, -6.5, -5.8, Math.PI / 2, 1.08, [1.2, 2.5]), p(`${H}/shrine.gltf`, -4.9, -5.4, .05, 1.2, [1.7, 1.7]),
    p(`${H}/crypt.gltf`, 7.0, -6.0, -Math.PI / 2, 1.1, [2.3, 1.8]), p(`${H}/tree_dead_medium.gltf`, -7.4, 3.8, .1, .92, [1.5, 1.5]), p(`${H}/tree_dead_small.gltf`, 6.8, 4.4, -.2, .92, [1.2, 1.2]),
  ],
  12: [
    p(`${F}/shelf_B_large_decorated.gltf`, -7.5, -6.7, Math.PI / 2, 1.04, [1.2, 2.8]), p(`${F}/shelf_B_large_decorated.gltf`, 7.5, -6.7, -Math.PI / 2, 1.04, [1.2, 2.8]),
    p(`${F}/shelf_A_big.gltf`, -7.3, -3.5, Math.PI / 2, .98, [1.2, 2.7]), p(`${F}/shelf_A_big.gltf`, 7.3, -3.5, -Math.PI / 2, .98, [1.2, 2.7]),
    p(`${F}/table_medium_long.gltf`, 0, -2.2, 0, 1.12, [3, 1.5]), p(`${T}/journal_open.gltf`, -.6, -2.2, .2, 1.2), p(`${H}/skull_candle.gltf`, .8, -2.1, -.2, 1.14),
  ],
  13: [
    p(`${F}/table_medium.gltf`, -5.8, -5.0, 0, 1.1, [2.1, 1.5]), p(`${T}/blueprint.gltf`, -6.0, -5.1, .2, 1.2), p(`${T}/drafting_compass.gltf`, -5.4, -4.7, -.2, 1.24),
    p(`${F}/table_small.gltf`, 5.8, -5.0, 0, 1.08, [1.4, 1.4]), p(`${T}/magnifying_glass.gltf`, 5.9, -5.1, .3, 1.2), p(`${T}/journal_closed.gltf`, 5.4, -4.7, -.2, 1.14),
    p(`${F}/cabinet_medium_decorated.gltf`, 0, 5.8, Math.PI, 1.02, [1.2, 1.5]),
  ],
  14: [
    p(`${H}/grave_A_destroyed.gltf`, -6.8, -5.8, .2, 1.14, [1.3, 1.8]), p(`${H}/grave_B.gltf`, 6.8, -5.6, -.2, 1.12, [1.3, 1.8]),
    p(`${H}/tree_dead_medium.gltf`, -6.6, 3.2, .1, .95, [1.5, 1.5]), p(`${H}/tree_dead_small.gltf`, 5.6, 4.8, -.2, .9, [1.2, 1.2]),
    p(`${H}/floor_dirt_grave.gltf`, -3.6, 1.6, .1, 1.08), p(`${H}/floor_dirt_small.gltf`, 3.8, -1.0, -.1, 1.08),
  ],
  15: [
    p(`${H}/shrine_candles.gltf`, 0, -4.8, 0, 1.62, [2, 2]),
    p(`${H}/plaque_candles.gltf`, -5.0, -2.6, .05, 1.12), p(`${H}/plaque_candles.gltf`, 5.0, -2.6, -.05, 1.12),
    p(`${H}/candle_triple.gltf`, -3.2, .8, 0, 1.28), p(`${H}/candle_triple.gltf`, 3.2, .8, 0, 1.28),
    p(`${H}/skull_candle.gltf`, -2.7, 4.4, .12, 1.12), p(`${H}/skull_candle.gltf`, 2.7, 4.4, -.12, 1.12),
  ],
  16: [
    p(`${F}/table_medium_long.gltf`, -6.1, -5.2, Math.PI / 2, 1.05, [1.5, 3]), p(`${T}/handdrill.gltf`, -6.0, -5.4, .2, 1.28), p(`${T}/wrench_A.gltf`, -5.6, -4.9, -.2, 1.2),
    p(`${F}/shelf_B_large.gltf`, -7.5, -1.8, Math.PI / 2, .96, [1.2, 2.7]),
    p(`${F}/table_medium.gltf`, 5.8, -5.0, 0, 1.08, [2.1, 1.5]), p(`${T}/blueprint_stacked.gltf`, 5.6, -5.1, -.2, 1.22), p(`${T}/hammer.gltf`, 6.3, -4.7, .3, 1.22),
    p(`${F}/shelf_A_big.gltf`, 7.5, 2.2, -Math.PI / 2, .94, [1.2, 2.7]),
  ],
  17: [
    p(`${H}/coffin_decorated.gltf`, -6.6, -6.2, Math.PI / 2, 1.14, [1.7, 3]), p(`${H}/coffin.gltf`, 6.6, -6.2, -Math.PI / 2, 1.14, [1.7, 3]),
    p(`${H}/grave_A.gltf`, -7.0, 2.4, .2, 1.16, [1.3, 1.8]), p(`${H}/grave_B.gltf`, 7.0, 2.4, -.2, 1.16, [1.3, 1.8]),
    p(`${H}/candle_triple.gltf`, -4.7, -3.4, 0, 1.2), p(`${H}/candle_triple.gltf`, 4.7, -3.4, 0, 1.2),
    p(`${H}/gravestone.gltf`, -5.4, 5.8, .1, 1.08, [1.2, 1.6]), p(`${H}/gravemarker_A.gltf`, 5.4, 5.8, -.1, 1.08, [1.1, 1.4]),
  ],
  18: [
    p(`${T}/anvil.gltf`, -5.8, -5.4, 0, 1.5, [1.5, 1.1]), p(`${T}/grindstone.gltf`, 5.8, -5.2, Math.PI / 2, 1.5, [1.7, 1.3]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, -6.2, 2.8, 0, 1.04, [2, 1.4]), p(`${R}/Copper_Bars_Stack_Medium.gltf`, 6.2, 2.8, 0, 1.04, [1.7, 1.1]),
    p(`${R}/Iron_Nuggets.gltf`, -5.4, -4.5, .15, 1.12), p(`${R}/Copper_Nuggets.gltf`, 5.4, -4.5, -.15, 1.12),
    p(`${T}/torch.gltf`, -7.5, -7.4, 0, 1.28), p(`${T}/torch.gltf`, 7.5, -7.4, 0, 1.28),
  ],
  19: [
    p(`${H}/shrine_candles.gltf`, 0, -4.6, 0, 1.65, [2, 2]),
    p(`${H}/crypt.gltf`, -7.4, -6.0, Math.PI / 2, 1.12, [2.3, 1.8]), p(`${H}/crypt.gltf`, 7.4, -6.0, -Math.PI / 2, 1.12, [2.3, 1.8]),
    p(`${H}/plaque_candles.gltf`, -4.7, -2.6, .08, 1.12), p(`${H}/plaque_candles.gltf`, 4.7, -2.6, -.08, 1.12),
    p(`${H}/ribcage.gltf`, -2.8, 4.8, .18, 1.1), p(`${H}/skull.gltf`, 2.8, 4.8, -.18, 1.1),
  ],
  20: [
    p(`${H}/crypt.gltf`, -7.8, -6.4, Math.PI / 2, 1.22, [2.5, 2]), p(`${H}/crypt.gltf`, 7.8, -6.4, -Math.PI / 2, 1.22, [2.5, 2]),
    p(`${H}/grave_A.gltf`, -7.4, 4.8, .1, 1.2, [1.4, 1.9]), p(`${H}/grave_B.gltf`, 7.4, 4.8, -.1, 1.2, [1.4, 1.9]),
    p(`${H}/candle_triple.gltf`, -4.4, -2.0, 0, 1.35), p(`${H}/candle_triple.gltf`, 4.4, -2.0, 0, 1.35),
    p(`${H}/skull_candle.gltf`, -4.4, 3.0, 0, 1.18), p(`${H}/skull_candle.gltf`, 4.4, 3.0, 0, 1.18),
  ],
};

export function roomSetpieces(room: number): RoomSetpiece[] {
  return ROOM_SETPIECES[Math.max(1, Math.min(20, room))] ?? [];
}
