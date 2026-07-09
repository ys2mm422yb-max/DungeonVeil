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

const p = (model: string, x: number, z: number, rotation = 0, scale = 1, collider?: readonly [number, number]): RoomSetpiece => ({ model, x, z, rotation, scale, collider });

export const ROOM_SETPIECES: Record<number, RoomSetpiece[]> = {
  1: [
    p(`${F}/shelf_B_large_decorated.gltf`, -8.7, -8.8, Math.PI / 2, .92, [1.2, 2.8]),
    p(`${F}/cabinet_medium_decorated.gltf`, -8.7, -4.8, Math.PI / 2, .95, [1.2, 1.5]),
    p(`${F}/shelf_A_big.gltf`, 8.7, -8.2, -Math.PI / 2, .9, [1.2, 2.7]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 7.2, -4.8, 0, .9, [2.1, 1.5]),
    p(`${T}/rope_bundle_A.gltf`, 8.1, -2.8, .2, 1.1, [1.1, 1.1]),
  ],
  2: [
    p(`${F}/table_medium_long.gltf`, -6.8, -6.1, Math.PI / 2, 1, [1.5, 3]),
    p(`${T}/map.gltf`, -6.8, -6.1, 0, 1.05),
    p(`${T}/journal_open.gltf`, -6.35, -5.7, .25, 1.05),
    p(`${F}/chair_A_wood.gltf`, -5.1, -6.1, -Math.PI / 2, .95, [.9, .9]),
    p(`${F}/cabinet_medium_decorated.gltf`, 8.4, -7.5, -Math.PI / 2, .95, [1.2, 1.5]),
    p(`${T}/lantern.gltf`, 7.6, -4.9, 0, 1.15, [.7, .7]),
  ],
  3: [
    p(`${D}/column.gltf`, -6.2, -7.5, 0, 1.15, [1.2, 1.2]), p(`${D}/column.gltf`, 6.2, -7.5, 0, 1.15, [1.2, 1.2]),
    p(`${D}/column.gltf`, -6.2, -.5, 0, 1.15, [1.2, 1.2]), p(`${D}/column.gltf`, 6.2, -.5, 0, 1.15, [1.2, 1.2]),
    p(`${D}/column.gltf`, -6.2, 6.5, 0, 1.15, [1.2, 1.2]), p(`${D}/column.gltf`, 6.2, 6.5, 0, 1.15, [1.2, 1.2]),
  ],
  4: [
    p(`${T}/pickaxe.gltf`, -8.8, -8.2, .2, 1.3), p(`${T}/shovel.gltf`, -8.5, -6.9, -.2, 1.25),
    p(`${T}/lantern.gltf`, -7.2, -4.7, 0, 1.2, [.7, .7]), p(`${T}/bucket_metal.gltf`, -8.1, -3.4, 0, 1.1, [.8, .8]),
    p(`${R}/Iron_Nuggets.gltf`, 7.3, -7.3, .2, 1.1, [1.1, 1.1]), p(`${R}/Copper_Nuggets.gltf`, 8.2, -5.5, -.2, 1.05, [1.1, 1.1]),
    p(`${R}/Pallet_Wood.gltf`, 7.2, 4.5, 0, .9, [2.1, 1.5]),
  ],
  5: [
    p(`${F}/table_medium_long.gltf`, -7.3, -5.4, Math.PI / 2, 1, [1.5, 3]), p(`${T}/blueprint_stacked.gltf`, -7.3, -5.6, .1, 1.15),
    p(`${T}/handdrill.gltf`, -7, -4.8, -.3, 1.2), p(`${T}/file.gltf`, -6.7, -5.7, .4, 1.15),
    p(`${F}/shelf_B_large_decorated.gltf`, 8.6, -7.1, -Math.PI / 2, .9, [1.2, 2.8]), p(`${T}/saw.gltf`, 7.8, 3.6, .1, 1.25),
  ],
  6: [
    p(`${T}/anvil.gltf`, -6.6, -5.4, 0, 1.35, [1.5, 1.1]), p(`${T}/grindstone.gltf`, 0, 2.3, Math.PI / 2, 1.35, [1.7, 1.3]),
    p(`${T}/hammer.gltf`, -5.5, -4.7, .3, 1.25), p(`${T}/tongs.gltf`, -5.8, -5.7, -.25, 1.2),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, 7.2, -6.2, 0, 1, [1.7, 1.1]), p(`${R}/Copper_Bars_Stack_Small.gltf`, 7.8, -3.9, .2, 1, [1.3, 1]),
    p(`${T}/torch.gltf`, 8.8, -8.8, 0, 1.25),
  ],
  7: [
    p(`${F}/bed_single_A.gltf`, -7.2, -7.5, Math.PI / 2, 1, [1.6, 3]), p(`${F}/bed_single_B.gltf`, 7.2, -7.5, -Math.PI / 2, 1, [1.6, 3]),
    p(`${F}/cabinet_small_decorated.gltf`, -8.5, -2.7, Math.PI / 2, 1, [1.1, 1.2]), p(`${F}/cabinet_small.gltf`, 8.5, -2.7, -Math.PI / 2, 1, [1.1, 1.2]),
    p(`${F}/rug_rectangle_stripes_A.gltf`, 0, 1.8, 0, 1.25), p(`${F}/chair_stool_wood.gltf`, -5.8, 5.3, 0, 1, [.8, .8]),
  ],
  8: [
    p(`${F}/shelf_A_big.gltf`, -8.7, -8.2, Math.PI / 2, .95, [1.2, 2.7]), p(`${F}/shelf_B_large.gltf`, 8.7, -8.2, -Math.PI / 2, .95, [1.2, 2.7]),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, -7.1, -3.7, .2, .9, [2.1, 1.5]), p(`${R}/Iron_Bars_Stack_Large.gltf`, 7.2, -3.7, -.2, .9, [2, 1.4]),
    p(`${T}/rope_bundle_B.gltf`, -7.4, 4.2, .2, 1.2, [1.1, 1.1]), p(`${T}/bucket_metal.gltf`, 7.7, 4.4, 0, 1.15, [.8, .8]),
  ],
  9: [
    p(`${H}/shrine_candles.gltf`, 0, -4.7, 0, 1.35, [1.8, 1.8]), p(`${H}/candle_triple.gltf`, -3.4, -3.1, 0, 1.2), p(`${H}/candle_triple.gltf`, 3.4, -3.1, 0, 1.2),
    p(`${H}/skull.gltf`, -5.5, 2.5, .2, 1.2), p(`${T}/journal_open.gltf`, 5.5, 2.5, -.2, 1.15), p(`${H}/candle_melted.gltf`, 0, 4.8, 0, 1.25),
  ],
  10: [
    p(`${H}/crypt.gltf`, -7.8, -6.3, Math.PI / 2, 1.05, [2.3, 1.8]), p(`${H}/crypt.gltf`, 7.8, -6.3, -Math.PI / 2, 1.05, [2.3, 1.8]),
    p(`${H}/grave_A.gltf`, -7.4, 3.8, .1, 1.1, [1.3, 1.8]), p(`${H}/grave_B.gltf`, 7.4, 3.8, -.1, 1.1, [1.3, 1.8]),
  ],
  11: [
    p(`${H}/bench_decorated.gltf`, -7.2, -6.6, Math.PI / 2, 1.05, [1.2, 2.5]), p(`${H}/crypt.gltf`, 7.8, -6.5, -Math.PI / 2, 1.05, [2.3, 1.8]),
    p(`${H}/tree_dead_medium.gltf`, -7.8, 3.8, .1, .9, [1.5, 1.5]), p(`${H}/tree_dead_small.gltf`, 7.5, 4.2, -.2, .9, [1.2, 1.2]),
  ],
  12: [
    p(`${F}/shelf_B_large_decorated.gltf`, -8.5, -7.5, Math.PI / 2, 1, [1.2, 2.8]), p(`${F}/shelf_B_large_decorated.gltf`, 8.5, -7.5, -Math.PI / 2, 1, [1.2, 2.8]),
    p(`${F}/table_medium_long.gltf`, 0, -2.2, 0, 1.05, [3, 1.5]), p(`${T}/journal_open.gltf`, -.5, -2.2, .2, 1.2), p(`${H}/skull.gltf`, .7, -2.1, -.2, 1.15),
  ],
  13: [
    p(`${F}/table_medium.gltf`, -6.2, -5.1, 0, 1.05, [2.1, 1.5]), p(`${T}/blueprint.gltf`, -6.4, -5.2, .2, 1.2), p(`${T}/drafting_compass.gltf`, -5.8, -4.8, -.2, 1.25),
    p(`${F}/table_small.gltf`, 6.1, -5, 0, 1, [1.4, 1.4]), p(`${T}/magnifying_glass.gltf`, 6.2, -5.1, .3, 1.2), p(`${T}/journal_closed.gltf`, 5.7, -4.7, -.2, 1.15),
  ],
  14: [
    p(`${H}/grave_A_destroyed.gltf`, -7.4, -6.4, .2, 1.1, [1.3, 1.8]), p(`${H}/grave_B.gltf`, 7.4, -6.4, -.2, 1.1, [1.3, 1.8]),
    p(`${H}/fence_broken.gltf`, -7.1, 2.4, Math.PI / 2, 1.1, [1.1, 2.5]), p(`${H}/fence_seperate_broken.gltf`, 7.1, 2.4, -Math.PI / 2, 1.1, [1.1, 2.5]),
    p(`${H}/tree_dead_small.gltf`, 0, -1.4, 0, .85, [1.2, 1.2]),
  ],
  15: [
    p(`${H}/shrine_candles.gltf`, 0, -3.8, 0, 1.5, [2, 2]), p(`${H}/candle_triple.gltf`, -4.2, -2, 0, 1.3), p(`${H}/candle_triple.gltf`, 4.2, -2, 0, 1.3),
    p(`${H}/skull.gltf`, -5.4, 3, 0, 1.3), p(`${H}/bone_A.gltf`, 5.4, 3, .4, 1.3),
  ],
  16: [
    p(`${F}/table_medium_long.gltf`, -6.7, -5.2, Math.PI / 2, 1, [1.5, 3]), p(`${T}/handdrill.gltf`, -6.6, -5.4, .2, 1.3), p(`${T}/wrench_A.gltf`, -6.2, -4.9, -.2, 1.25),
    p(`${T}/blueprint_stacked.gltf`, 6.7, -5.1, -.2, 1.25), p(`${T}/hammer.gltf`, 6.2, -4.7, .3, 1.25), p(`${F}/shelf_A_big.gltf`, 8.6, 2.6, -Math.PI / 2, .9, [1.2, 2.7]),
  ],
  17: [
    p(`${H}/coffin_decorated.gltf`, -6.8, -6.8, Math.PI / 2, 1.1, [1.7, 3]), p(`${H}/coffin.gltf`, 6.8, -6.8, -Math.PI / 2, 1.1, [1.7, 3]),
    p(`${H}/grave_A.gltf`, -7.5, 2.5, .2, 1.15, [1.3, 1.8]), p(`${H}/grave_B.gltf`, 7.5, 2.5, -.2, 1.15, [1.3, 1.8]), p(`${H}/candle_triple.gltf`, 0, -2.3, 0, 1.3),
  ],
  18: [
    p(`${T}/anvil.gltf`, -6.5, -5.5, 0, 1.45, [1.5, 1.1]), p(`${T}/grindstone.gltf`, 6.3, -5.2, Math.PI / 2, 1.45, [1.7, 1.3]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, -6.6, 2.7, 0, 1, [2, 1.4]), p(`${R}/Copper_Bars_Stack_Medium.gltf`, 6.5, 2.7, 0, 1, [1.7, 1.1]),
    p(`${T}/hammer.gltf`, -5.5, -4.7, .3, 1.3), p(`${T}/tongs.gltf`, -5.6, -5.8, -.2, 1.25),
  ],
  19: [
    p(`${H}/shrine_candles.gltf`, 0, -4.6, 0, 1.55, [2, 2]), p(`${H}/crypt.gltf`, -7.8, -6.4, Math.PI / 2, 1.1, [2.3, 1.8]), p(`${H}/crypt.gltf`, 7.8, -6.4, -Math.PI / 2, 1.1, [2.3, 1.8]),
    p(`${H}/candle_triple.gltf`, -4.5, 1.8, 0, 1.35), p(`${H}/candle_triple.gltf`, 4.5, 1.8, 0, 1.35),
  ],
  20: [
    p(`${H}/crypt.gltf`, -8, -6.8, Math.PI / 2, 1.2, [2.5, 2]), p(`${H}/crypt.gltf`, 8, -6.8, -Math.PI / 2, 1.2, [2.5, 2]),
    p(`${H}/grave_A.gltf`, -8, 4.7, .1, 1.2, [1.4, 1.9]), p(`${H}/grave_B.gltf`, 8, 4.7, -.1, 1.2, [1.4, 1.9]),
    p(`${H}/candle_triple.gltf`, -4.2, -1.5, 0, 1.35), p(`${H}/candle_triple.gltf`, 4.2, -1.5, 0, 1.35),
  ],
};

export function roomSetpieces(room: number): RoomSetpiece[] {
  return ROOM_SETPIECES[Math.max(1, Math.min(20, room))] ?? [];
}
