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

/** Hand-built room compositions. Visible setpieces and collision share this source. */
export const ROOM_SETPIECES: Record<number, RoomSetpiece[]> = {
  // 1 · Verlassener Versorgungsposten: two believable supply stations, open center lane.
  1: [
    p(`${F}/shelf_B_large_decorated.gltf`, -7.8, -7.4, Math.PI / 2, .98, [1.2, 2.8]),
    p(`${F}/cabinet_medium_decorated.gltf`, -7.7, -4.6, Math.PI / 2, .95, [1.2, 1.5]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.8, -6.7, .08, .95, [2.1, 1.5]),
    p(`${T}/rope_bundle_A.gltf`, -5.1, -5.2, .22, 1.05),
    p(`${T}/bucket_metal.gltf`, -6.2, -4.8, 0, 1),
    p(`${F}/shelf_A_big.gltf`, 7.8, -7.2, -Math.PI / 2, .94, [1.2, 2.7]),
    p(`${R}/Pallet_Wood.gltf`, 6.1, -6.4, -.08, .9, [2.1, 1.5]),
    p(`${T}/rope_bundle_B.gltf`, 5.4, -5.1, -.2, 1.05),
  ],

  // 2 · Wachstube: command table cluster left, storage/light cluster right.
  2: [
    p(`${F}/table_medium_long.gltf`, -3.6, -5.7, 0, 1.05, [3, 1.5]),
    p(`${T}/map.gltf`, -3.9, -5.75, 0, 1.08),
    p(`${T}/journal_open.gltf`, -2.9, -5.45, .25, 1.05),
    p(`${F}/chair_A_wood.gltf`, -5.1, -4.25, .12, .96, [.9, .9]),
    p(`${F}/chair_A_wood.gltf`, -2.1, -4.25, -.12, .96, [.9, .9]),
    p(`${F}/cabinet_medium_decorated.gltf`, 7.6, -7.1, -Math.PI / 2, .98, [1.2, 1.5]),
    p(`${T}/lantern.gltf`, 6.2, -5.8, 0, 1.2),
    p(`${F}/chair_stool_wood.gltf`, 6.7, -4.8, -.2, .92, [.8, .8]),
  ],

  // 3 · Alte Säulenhalle: deliberate symmetry and a clear ceremonial axis.
  3: [
    p(`${D}/column.gltf`, -5.5, -7.2, 0, 1.18, [1.2, 1.2]), p(`${D}/column.gltf`, 5.5, -7.2, 0, 1.18, [1.2, 1.2]),
    p(`${D}/column.gltf`, -5.5, -.6, 0, 1.18, [1.2, 1.2]), p(`${D}/column.gltf`, 5.5, -.6, 0, 1.18, [1.2, 1.2]),
    p(`${D}/column.gltf`, -5.5, 6.0, 0, 1.18, [1.2, 1.2]), p(`${D}/column.gltf`, 5.5, 6.0, 0, 1.18, [1.2, 1.2]),
    p(`${H}/candle_triple.gltf`, -4.35, -6.6, 0, 1.05), p(`${H}/candle_triple.gltf`, 4.35, -6.6, 0, 1.05),
    p(`${H}/candle_melted.gltf`, -4.35, 5.4, 0, 1.05), p(`${H}/candle_melted.gltf`, 4.35, 5.4, 0, 1.05),
  ],

  // 4 · Bergarbeiterlager: tool station and ore sorting station face each other.
  4: [
    p(`${F}/table_low.gltf`, -6.2, -5.9, 0, 1, [2, 1.4]),
    p(`${T}/pickaxe.gltf`, -6.8, -5.9, .18, 1.25),
    p(`${T}/shovel.gltf`, -5.8, -5.6, -.18, 1.22),
    p(`${T}/bucket_metal.gltf`, -7.2, -4.55, 0, 1.05),
    p(`${T}/lantern.gltf`, -5.3, -4.65, 0, 1.15),
    p(`${R}/Pallet_Wood.gltf`, 6.1, -6.1, 0, .95, [2.1, 1.5]),
    p(`${R}/Iron_Nuggets.gltf`, 5.55, -5.75, .2, 1.08),
    p(`${R}/Copper_Nuggets.gltf`, 6.65, -5.7, -.2, 1.08),
    p(`${T}/rope_bundle_A.gltf`, 7.05, -4.45, .2, 1.05),
  ],

  // 5 · Verlassene Werkstatt: one dense workbench scene and a smaller repair station.
  5: [
    p(`${F}/table_medium_long.gltf`, -4.2, -5.8, 0, 1.04, [3, 1.5]),
    p(`${T}/blueprint_stacked.gltf`, -4.8, -5.8, .1, 1.12),
    p(`${T}/handdrill.gltf`, -3.9, -5.5, -.3, 1.18),
    p(`${T}/file.gltf`, -3.1, -5.85, .35, 1.12),
    p(`${F}/shelf_B_large_decorated.gltf`, -7.6, -6.2, Math.PI / 2, .94, [1.2, 2.8]),
    p(`${F}/table_small.gltf`, 6.2, -5.4, 0, 1, [1.4, 1.4]),
    p(`${T}/saw.gltf`, 6.0, -5.5, .18, 1.2),
    p(`${T}/hammer.gltf`, 6.55, -5.15, -.25, 1.1),
    p(`${F}/chair_stool_wood.gltf`, 5.5, -3.9, .1, .9, [.8, .8]),
  ],

  // 6 · Schmiede: anvil station left, grind station right, materials beside each station.
  6: [
    p(`${T}/anvil.gltf`, -5.4, -5.4, 0, 1.42, [1.5, 1.1]),
    p(`${T}/hammer.gltf`, -4.7, -5.1, .3, 1.24),
    p(`${T}/tongs.gltf`, -5.0, -5.85, -.25, 1.18),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.7, -4.1, .05, 1.02, [1.7, 1.1]),
    p(`${T}/bucket_metal.gltf`, -4.3, -4.0, 0, 1),
    p(`${T}/grindstone.gltf`, 5.3, -5.2, Math.PI / 2, 1.4, [1.7, 1.3]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.5, -4.0, -.1, 1, [1.3, 1]),
    p(`${T}/torch.gltf`, 7.6, -7.7, 0, 1.25),
  ],

  // 7 · Schlafquartier: two bed bays with bedside furniture; rug is the shared center.
  7: [
    p(`${F}/bed_single_A.gltf`, -5.9, -6.5, Math.PI / 2, 1, [1.6, 3]),
    p(`${F}/cabinet_small_decorated.gltf`, -7.4, -4.4, Math.PI / 2, .96, [1.1, 1.2]),
    p(`${F}/chair_stool_wood.gltf`, -4.2, -4.5, .15, .9, [.8, .8]),
    p(`${F}/bed_single_B.gltf`, 5.9, -6.5, -Math.PI / 2, 1, [1.6, 3]),
    p(`${F}/cabinet_small.gltf`, 7.4, -4.4, -Math.PI / 2, .96, [1.1, 1.2]),
    p(`${F}/chair_stool_wood.gltf`, 4.2, -4.5, -.15, .9, [.8, .8]),
    p(`${F}/rug_rectangle_stripes_A.gltf`, 0, -1.3, 0, 1.28),
    p(`${T}/lantern.gltf`, -6.8, -3.7, 0, 1.02),
    p(`${T}/journal_closed.gltf`, 6.7, -3.7, .2, 1),
  ],

  // 8 · Materiallager: three compact storage bays with a wide zig-zag combat route.
  8: [
    p(`${F}/shelf_A_big.gltf`, -7.6, -7.0, Math.PI / 2, .96, [1.2, 2.7]),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, -5.7, -6.3, .06, .94, [2.1, 1.5]),
    p(`${T}/rope_bundle_B.gltf`, -5.0, -4.8, .2, 1.12),
    p(`${F}/shelf_B_large.gltf`, 7.6, -7.0, -Math.PI / 2, .96, [1.2, 2.7]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, 5.7, -6.2, -.06, .92, [2, 1.4]),
    p(`${T}/bucket_metal.gltf`, 5.1, -4.75, 0, 1.06),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, -6.3, 2.2, .08, 1, [1.3, 1]),
    p(`${R}/Iron_Bars_Stack_Small.gltf`, -5.0, 2.2, -.08, 1, [1.3, 1]),
  ],

  // 9 · Ritualkammer: shrine is the focal point; candles and remains form a deliberate arc.
  9: [
    p(`${H}/shrine_candles.gltf`, 0, -5.5, 0, 1.48, [2, 2]),
    p(`${H}/candle_triple.gltf`, -3.3, -4.2, 0, 1.2), p(`${H}/candle_triple.gltf`, 3.3, -4.2, 0, 1.2),
    p(`${H}/candle_melted.gltf`, -4.6, -2.3, 0, 1.08), p(`${H}/candle_melted.gltf`, 4.6, -2.3, 0, 1.08),
    p(`${H}/skull.gltf`, -2.3, -2.5, .2, 1.15), p(`${H}/bone_A.gltf`, 2.3, -2.5, -.25, 1.15),
    p(`${T}/journal_open.gltf`, 0, -2.1, .05, 1.12),
    p(`${F}/rug_oval_A.gltf`, 0, -.6, 0, 1.25),
  ],

  // 10 · Grabwächterhalle: side crypts and graves frame a clean central boss avenue.
  10: [
    p(`${H}/crypt.gltf`, -7.2, -6.2, Math.PI / 2, 1.1, [2.3, 1.8]), p(`${H}/crypt.gltf`, 7.2, -6.2, -Math.PI / 2, 1.1, [2.3, 1.8]),
    p(`${H}/grave_A.gltf`, -7.0, 1.8, .08, 1.15, [1.3, 1.8]), p(`${H}/grave_B.gltf`, 7.0, 1.8, -.08, 1.15, [1.3, 1.8]),
    p(`${H}/candle_triple.gltf`, -3.0, -3.8, 0, 1.2), p(`${H}/candle_triple.gltf`, 3.0, -3.8, 0, 1.2),
    p(`${H}/candle_triple.gltf`, -3.0, 1.0, 0, 1.2), p(`${H}/candle_triple.gltf`, 3.0, 1.0, 0, 1.2),
    p(`${H}/skull.gltf`, -4.0, 4.5, .2, 1.08), p(`${H}/bone_A.gltf`, 4.0, 4.5, -.2, 1.08),
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
