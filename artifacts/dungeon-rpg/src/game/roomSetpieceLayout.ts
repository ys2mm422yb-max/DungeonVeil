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
  // 1 · Versorgungsposten: two framed supply bays, central lane deliberately open.
  1: [
    p(`${D}/barrier_half.gltf`, -6.2, -3.8, 0, 1.05, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, -4.7, -3.8, 0, 1.08, [1, 1]),
    p(`${F}/shelf_B_large_decorated.gltf`, -7.6, -7.0, Math.PI / 2, 1.02, [1.2, 2.8]),
    p(`${F}/cabinet_medium_decorated.gltf`, -7.4, -5.0, Math.PI / 2, .98, [1.2, 1.5]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.7, -6.5, .08, 1, [2.1, 1.5]),
    p(`${T}/rope_bundle_A.gltf`, -5.3, -5.15, .22, 1.08),
    p(`${T}/bucket_metal.gltf`, -6.45, -4.7, 0, 1.02),
    p(`${D}/barrier_half.gltf`, 6.2, -3.8, 0, 1.05, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, 4.7, -3.8, 0, 1.08, [1, 1]),
    p(`${F}/shelf_A_big.gltf`, 7.6, -7.0, -Math.PI / 2, 1, [1.2, 2.7]),
    p(`${R}/Pallet_Wood.gltf`, 5.9, -6.4, -.08, .96, [2.1, 1.5]),
    p(`${R}/Iron_Bars_Stack_Small.gltf`, 6.1, -5.0, .08, .95, [1.3, 1]),
    p(`${T}/rope_bundle_B.gltf`, 5.15, -4.9, -.2, 1.08),
  ],

  // 2 · Wachstube: command post on the left, guarded equipment nook on the right.
  2: [
    p(`${D}/wall_pillar.gltf`, -7.2, -3.0, 0, 1.05, [1, 1]),
    p(`${D}/barrier_half.gltf`, -5.7, -3.0, 0, 1.05, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, -4.15, -3.0, 0, 1.05, [1, 1]),
    p(`${F}/table_medium_long.gltf`, -5.55, -5.5, 0, 1.08, [3, 1.5]),
    p(`${T}/map.gltf`, -5.95, -5.55, 0, 1.1),
    p(`${T}/journal_open.gltf`, -4.85, -5.3, .25, 1.06),
    p(`${F}/chair_A_wood.gltf`, -6.7, -4.35, .1, .96, [.9, .9]),
    p(`${F}/chair_A_wood.gltf`, -4.35, -4.3, -.1, .96, [.9, .9]),
    p(`${D}/wall_pillar.gltf`, 7.2, -3.0, 0, 1.05, [1, 1]),
    p(`${D}/barrier_half.gltf`, 5.7, -3.0, 0, 1.05, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, 4.15, -3.0, 0, 1.05, [1, 1]),
    p(`${F}/cabinet_medium_decorated.gltf`, 7.25, -6.5, -Math.PI / 2, 1, [1.2, 1.5]),
    p(`${T}/lantern.gltf`, 5.75, -5.35, 0, 1.24),
    p(`${F}/chair_stool_wood.gltf`, 6.55, -4.5, -.2, .94, [.8, .8]),
  ],

  // 3 · Alte Säulenhalle: a processional nave, side aisles and a raised rear arch.
  3: [
    p(`${D}/wall_arched.gltf`, 0, -8.0, 0, 1.3),
    p(`${D}/stairs_wide.gltf`, 0, -6.7, Math.PI, 1.12),
    p(`${D}/pillar_decorated.gltf`, -6.2, -5.8, 0, 1.18, [1.3, 1.3]),
    p(`${D}/pillar_decorated.gltf`, 6.2, -5.8, 0, 1.18, [1.3, 1.3]),
    p(`${D}/wall_pillar.gltf`, -6.2, .2, 0, 1.12, [1.1, 1.1]),
    p(`${D}/wall_pillar.gltf`, 6.2, .2, 0, 1.12, [1.1, 1.1]),
    p(`${D}/pillar_decorated.gltf`, -6.2, 6.1, 0, 1.14, [1.3, 1.3]),
    p(`${D}/pillar_decorated.gltf`, 6.2, 6.1, 0, 1.14, [1.3, 1.3]),
    p(`${D}/barrier_half.gltf`, -7.15, -2.8, Math.PI / 2, 1.02, [.8, 2.5]),
    p(`${D}/barrier_half.gltf`, 7.15, -2.8, Math.PI / 2, 1.02, [.8, 2.5]),
    p(`${D}/barrier_half.gltf`, -7.15, 3.3, Math.PI / 2, 1.02, [.8, 2.5]),
    p(`${D}/barrier_half.gltf`, 7.15, 3.3, Math.PI / 2, 1.02, [.8, 2.5]),
    p(`${H}/candle_triple.gltf`, -5.0, -5.0, 0, 1.12),
    p(`${H}/candle_triple.gltf`, 5.0, -5.0, 0, 1.12),
    p(`${H}/candle_melted.gltf`, -5.0, 5.1, 0, 1.08),
    p(`${H}/candle_melted.gltf`, 5.0, 5.1, 0, 1.08),
  ],

  // 4 · Bergarbeiterlager: two enclosed work bays and a clear hauling lane through the middle.
  4: [
    p(`${D}/barrier_half.gltf`, -6.2, -3.35, 0, 1.02, [2.5, .8]),
    p(`${D}/wall_pillar.gltf`, -4.7, -3.35, 0, 1.04, [1, 1]),
    p(`${F}/table_low.gltf`, -6.1, -5.65, 0, 1.05, [2, 1.4]),
    p(`${T}/pickaxe.gltf`, -6.75, -5.7, .18, 1.26),
    p(`${T}/shovel.gltf`, -5.75, -5.4, -.18, 1.24),
    p(`${T}/bucket_metal.gltf`, -7.1, -4.45, 0, 1.05),
    p(`${T}/lantern.gltf`, -5.2, -4.45, 0, 1.18),
    p(`${D}/barrier_half.gltf`, 6.2, -3.35, 0, 1.02, [2.5, .8]),
    p(`${D}/wall_pillar.gltf`, 4.7, -3.35, 0, 1.04, [1, 1]),
    p(`${R}/Pallet_Wood.gltf`, 6.1, -5.85, 0, 1, [2.1, 1.5]),
    p(`${R}/Iron_Nuggets.gltf`, 5.5, -5.55, .2, 1.12),
    p(`${R}/Copper_Nuggets.gltf`, 6.65, -5.5, -.2, 1.12),
    p(`${T}/rope_bundle_A.gltf`, 7.05, -4.4, .2, 1.08),
    p(`${D}/rubble_large.gltf`, -7.4, 4.8, .1, .82, [1.8, 1.5]),
    p(`${D}/rubble_large.gltf`, 7.2, 5.4, -.2, .72, [1.7, 1.4]),
  ],

  // 5 · Werkstatt: a fenced main bench and a separate repair alcove.
  5: [
    p(`${D}/barrier_half.gltf`, -5.9, -3.4, 0, 1.04, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, -4.35, -3.4, 0, 1.06, [1, 1]),
    p(`${F}/table_medium_long.gltf`, -5.4, -5.7, 0, 1.08, [3, 1.5]),
    p(`${T}/blueprint_stacked.gltf`, -6.0, -5.7, .1, 1.14),
    p(`${T}/handdrill.gltf`, -5.1, -5.4, -.3, 1.2),
    p(`${T}/file.gltf`, -4.25, -5.75, .35, 1.14),
    p(`${F}/shelf_B_large_decorated.gltf`, -7.7, -6.2, Math.PI / 2, .98, [1.2, 2.8]),
    p(`${D}/wall_pillar.gltf`, 4.55, -3.5, 0, 1.04, [1, 1]),
    p(`${D}/barrier_half.gltf`, 6.0, -3.5, 0, 1.02, [2.5, .8]),
    p(`${F}/table_small.gltf`, 6.1, -5.35, 0, 1.04, [1.4, 1.4]),
    p(`${T}/saw.gltf`, 5.85, -5.45, .18, 1.22),
    p(`${T}/hammer.gltf`, 6.55, -5.05, -.25, 1.12),
    p(`${F}/chair_stool_wood.gltf`, 5.45, -4.15, .1, .92, [.8, .8]),
  ],

  // 6 · Schmiede: two stone-framed work stations with a wide hot-floor center.
  6: [
    p(`${D}/wall_pillar.gltf`, -7.15, -3.45, 0, 1.1, [1, 1]),
    p(`${D}/barrier_half.gltf`, -5.65, -3.45, 0, 1.06, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, -4.1, -3.45, 0, 1.08, [1, 1]),
    p(`${T}/anvil.gltf`, -5.65, -5.55, 0, 1.48, [1.5, 1.1]),
    p(`${T}/hammer.gltf`, -4.9, -5.25, .3, 1.26),
    p(`${T}/tongs.gltf`, -5.2, -6.0, -.25, 1.2),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.85, -4.25, .05, 1.05, [1.7, 1.1]),
    p(`${D}/wall_pillar.gltf`, 7.15, -3.45, 0, 1.1, [1, 1]),
    p(`${D}/barrier_half.gltf`, 5.65, -3.45, 0, 1.06, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, 4.1, -3.45, 0, 1.08, [1, 1]),
    p(`${T}/grindstone.gltf`, 5.5, -5.35, Math.PI / 2, 1.45, [1.7, 1.3]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.65, -4.15, -.1, 1.04, [1.3, 1]),
    p(`${T}/bucket_metal.gltf`, 4.45, -4.15, 0, 1.02),
    p(`${T}/torch.gltf`, -7.7, -7.6, 0, 1.28),
    p(`${T}/torch.gltf`, 7.7, -7.6, 0, 1.28),
  ],

  // 7 · Schlafquartier: two actual bed bays, divided from the common room.
  7: [
    p(`${D}/barrier_half.gltf`, -6.0, -2.9, 0, 1.02, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, -4.45, -2.9, 0, 1.04, [1, 1]),
    p(`${F}/bed_single_A.gltf`, -6.0, -6.2, Math.PI / 2, 1.02, [1.6, 3]),
    p(`${F}/cabinet_small_decorated.gltf`, -7.45, -4.35, Math.PI / 2, .98, [1.1, 1.2]),
    p(`${F}/chair_stool_wood.gltf`, -4.25, -4.4, .15, .92, [.8, .8]),
    p(`${T}/lantern.gltf`, -6.8, -3.75, 0, 1.04),
    p(`${D}/barrier_half.gltf`, 6.0, -2.9, 0, 1.02, [2.5, .8]),
    p(`${D}/barrier_column.gltf`, 4.45, -2.9, 0, 1.04, [1, 1]),
    p(`${F}/bed_single_B.gltf`, 6.0, -6.2, -Math.PI / 2, 1.02, [1.6, 3]),
    p(`${F}/cabinet_small.gltf`, 7.45, -4.35, -Math.PI / 2, .98, [1.1, 1.2]),
    p(`${F}/chair_stool_wood.gltf`, 4.25, -4.4, -.15, .92, [.8, .8]),
    p(`${T}/journal_closed.gltf`, 6.75, -3.75, .2, 1.02),
    p(`${F}/rug_rectangle_stripes_A.gltf`, 0, .3, 0, 1.45),
  ],

  // 8 · Materiallager: three storage aisles create a readable zig-zag route.
  8: [
    p(`${D}/barrier_half.gltf`, -6.3, -3.3, 0, 1.04, [2.5, .8]),
    p(`${F}/shelf_A_big.gltf`, -7.55, -6.8, Math.PI / 2, .98, [1.2, 2.7]),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, -5.75, -6.15, .06, .96, [2.1, 1.5]),
    p(`${T}/rope_bundle_B.gltf`, -5.05, -4.75, .2, 1.14),
    p(`${D}/barrier_half.gltf`, 6.3, -3.3, 0, 1.04, [2.5, .8]),
    p(`${F}/shelf_B_large.gltf`, 7.55, -6.8, -Math.PI / 2, .98, [1.2, 2.7]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, 5.8, -6.0, -.06, .94, [2, 1.4]),
    p(`${T}/bucket_metal.gltf`, 5.15, -4.7, 0, 1.08),
    p(`${D}/wall_pillar.gltf`, -7.0, 2.2, 0, 1.02, [1, 1]),
    p(`${D}/barrier_half.gltf`, -5.5, 2.2, 0, 1.02, [2.5, .8]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, -6.3, 4.0, .08, 1.02, [1.3, 1]),
    p(`${R}/Iron_Bars_Stack_Small.gltf`, -5.0, 4.0, -.08, 1.02, [1.3, 1]),
  ],

  // 9 · Ritualkammer: raised shrine, framed nave and a deliberate ritual arc.
  9: [
    p(`${D}/wall_arched.gltf`, 0, -8.0, 0, 1.3),
    p(`${D}/stairs_wide.gltf`, 0, -6.55, Math.PI, 1.14),
    p(`${D}/pillar_decorated.gltf`, -5.8, -5.7, 0, 1.18, [1.3, 1.3]),
    p(`${D}/pillar_decorated.gltf`, 5.8, -5.7, 0, 1.18, [1.3, 1.3]),
    p(`${H}/shrine_candles.gltf`, 0, -5.1, 0, 1.52, [2, 2]),
    p(`${H}/candle_triple.gltf`, -3.5, -3.8, 0, 1.24),
    p(`${H}/candle_triple.gltf`, 3.5, -3.8, 0, 1.24),
    p(`${H}/candle_melted.gltf`, -4.8, -1.8, 0, 1.1),
    p(`${H}/candle_melted.gltf`, 4.8, -1.8, 0, 1.1),
    p(`${H}/skull.gltf`, -2.4, -2.0, .2, 1.16),
    p(`${H}/bone_A.gltf`, 2.4, -2.0, -.25, 1.16),
    p(`${T}/journal_open.gltf`, 0, -1.75, .05, 1.14),
    p(`${F}/rug_oval_A.gltf`, 0, .25, 0, 1.35),
  ],

  // 10 · Grabwächterhalle: monumental boss avenue framed by crypt bays.
  10: [
    p(`${D}/wall_arched.gltf`, 0, -8.2, 0, 1.48),
    p(`${D}/stairs_wide.gltf`, 0, -6.55, Math.PI, 1.28),
    p(`${D}/pillar_decorated.gltf`, -5.3, -5.8, 0, 1.32, [1.4, 1.4]),
    p(`${D}/pillar_decorated.gltf`, 5.3, -5.8, 0, 1.32, [1.4, 1.4]),
    p(`${H}/crypt.gltf`, -7.3, -5.9, Math.PI / 2, 1.14, [2.3, 1.8]),
    p(`${H}/crypt.gltf`, 7.3, -5.9, -Math.PI / 2, 1.14, [2.3, 1.8]),
    p(`${D}/barrier_half.gltf`, -7.0, .8, Math.PI / 2, 1.06, [.8, 2.5]),
    p(`${D}/barrier_half.gltf`, 7.0, .8, Math.PI / 2, 1.06, [.8, 2.5]),
    p(`${H}/grave_A.gltf`, -7.0, 3.5, .08, 1.16, [1.3, 1.8]),
    p(`${H}/grave_B.gltf`, 7.0, 3.5, -.08, 1.16, [1.3, 1.8]),
    p(`${H}/candle_triple.gltf`, -3.2, -3.6, 0, 1.24),
    p(`${H}/candle_triple.gltf`, 3.2, -3.6, 0, 1.24),
    p(`${H}/candle_triple.gltf`, -3.2, .8, 0, 1.24),
    p(`${H}/candle_triple.gltf`, 3.2, .8, 0, 1.24),
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
