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
 * Hand-built room compositions derived from the Figma top-down plan.
 * Only visibly massive props receive colliders. Small decor stays walk-through.
 */
export const ROOM_SETPIECES: Record<number, RoomSetpiece[]> = {
  // 1 · Verlassener Versorgungsposten — open center lane, mirrored supply bays.
  1: [
    p(`${F}/shelf_B_large_decorated.gltf`, -7.5, -7.2, Math.PI / 2, .98, [1.0, 2.35]),
    p(`${F}/cabinet_medium_decorated.gltf`, -7.3, -3.8, Math.PI / 2, .95, [.95, 1.2]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.2, -6.3, .08, .94, [1.7, 1.15]),
    p(`${T}/rope_bundle_A.gltf`, -5.0, -4.6, .22, 1.05),
    p(`${T}/bucket_metal.gltf`, -6.0, -3.9, 0, 1),
    p(`${F}/shelf_A_big.gltf`, 7.5, -7.1, -Math.PI / 2, .94, [1.0, 2.25]),
    p(`${R}/Pallet_Wood.gltf`, 5.4, -6.2, -.08, .9, [1.7, 1.15]),
    p(`${T}/rope_bundle_B.gltf`, 5.0, -4.5, -.2, 1.05),
  ],

  // 2 · Wachstube — asymmetric command cluster and storage flank.
  2: [
    p(`${F}/table_medium_long.gltf`, -3.8, -5.3, 0, 1.04, [2.55, 1.15]),
    p(`${T}/map.gltf`, -4.1, -5.35, 0, 1.08),
    p(`${T}/journal_open.gltf`, -3.0, -5.1, .25, 1.05),
    p(`${F}/chair_A_wood.gltf`, -5.0, -3.6, .12, .96),
    p(`${F}/chair_A_wood.gltf`, -2.2, -3.6, -.12, .96),
    p(`${F}/cabinet_medium_decorated.gltf`, 7.2, -7.0, -Math.PI / 2, .98, [.95, 1.2]),
    p(`${T}/lantern.gltf`, 6.1, -5.4, 0, 1.2),
    p(`${F}/chair_stool_wood.gltf`, 6.8, -4.2, -.2, .92),
  ],

  // 3 · Alte Säulenhalle — ceremonial axis with six readable blockers.
  3: [
    p(`${D}/column.gltf`, -5.6, -7.0, 0, 1.18, [.95, .95]),
    p(`${D}/column.gltf`, 5.6, -7.0, 0, 1.18, [.95, .95]),
    p(`${D}/column.gltf`, -5.6, -.5, 0, 1.18, [.95, .95]),
    p(`${D}/column.gltf`, 5.6, -.5, 0, 1.18, [.95, .95]),
    p(`${D}/column.gltf`, -5.6, 6.0, 0, 1.18, [.95, .95]),
    p(`${D}/column.gltf`, 5.6, 6.0, 0, 1.18, [.95, .95]),
    p(`${H}/candle_triple.gltf`, -4.35, -6.4, 0, 1.05),
    p(`${H}/candle_triple.gltf`, 4.35, -6.4, 0, 1.05),
    p(`${H}/candle_melted.gltf`, -4.35, 5.4, 0, 1.05),
    p(`${H}/candle_melted.gltf`, 4.35, 5.4, 0, 1.05),
  ],

  // 4 · Bergarbeiterlager — two stations, broad safe center.
  4: [
    p(`${F}/table_low.gltf`, -6.0, -5.7, 0, 1, [1.65, 1.05]),
    p(`${T}/pickaxe.gltf`, -6.6, -5.7, .18, 1.25),
    p(`${T}/shovel.gltf`, -5.6, -5.4, -.18, 1.22),
    p(`${T}/bucket_metal.gltf`, -7.0, -4.2, 0, 1.05),
    p(`${T}/lantern.gltf`, -5.1, -4.3, 0, 1.15),
    p(`${R}/Pallet_Wood.gltf`, 6.0, -5.9, 0, .95, [1.7, 1.15]),
    p(`${R}/Iron_Nuggets.gltf`, 5.45, -5.55, .2, 1.08),
    p(`${R}/Copper_Nuggets.gltf`, 6.55, -5.5, -.2, 1.08),
    p(`${T}/rope_bundle_A.gltf`, 7.0, -4.2, .2, 1.05),
  ],

  // 5 · Verlassene Werkstatt — dense left workbench, small right repair bay.
  5: [
    p(`${F}/table_medium_long.gltf`, -4.5, -5.6, 0, 1.04, [2.55, 1.15]),
    p(`${T}/blueprint_stacked.gltf`, -5.0, -5.65, .1, 1.12),
    p(`${T}/handdrill.gltf`, -4.0, -5.35, -.3, 1.18),
    p(`${T}/file.gltf`, -3.2, -5.7, .35, 1.12),
    p(`${F}/shelf_B_large_decorated.gltf`, -7.5, -6.0, Math.PI / 2, .94, [1.0, 2.25]),
    p(`${F}/table_small.gltf`, 6.2, -5.2, 0, 1, [1.1, 1.1]),
    p(`${T}/saw.gltf`, 6.0, -5.3, .18, 1.2),
    p(`${T}/hammer.gltf`, 6.55, -4.95, -.25, 1.1),
    p(`${F}/chair_stool_wood.gltf`, 5.5, -3.6, .1, .9),
  ],

  // 6 · Schmiede — diagonal station rotation around a wide center crossing.
  6: [
    p(`${T}/anvil.gltf`, -5.6, -5.4, 0, 1.42, [1.15, .85]),
    p(`${T}/hammer.gltf`, -4.8, -5.1, .3, 1.24),
    p(`${T}/tongs.gltf`, -5.0, -5.85, -.25, 1.18),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.8, -3.9, .05, 1.02, [1.35, .85]),
    p(`${T}/bucket_metal.gltf`, -4.4, -3.9, 0, 1),
    p(`${T}/grindstone.gltf`, 5.5, -5.1, Math.PI / 2, 1.4, [1.05, 1.35]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.7, -3.9, -.1, 1),
    p(`${T}/torch.gltf`, 7.6, -7.5, 0, 1.25),
  ],

  // 7 · Schlafquartier — two bed bays, clear shared center.
  7: [
    p(`${F}/bed_single_A.gltf`, -6.0, -6.3, Math.PI / 2, 1, [1.25, 2.5]),
    p(`${F}/cabinet_small_decorated.gltf`, -7.3, -3.9, Math.PI / 2, .96, [.85, .95]),
    p(`${F}/chair_stool_wood.gltf`, -4.3, -4.0, .15, .9),
    p(`${F}/bed_single_B.gltf`, 6.0, -6.3, -Math.PI / 2, 1, [1.25, 2.5]),
    p(`${F}/cabinet_small.gltf`, 7.3, -3.9, -Math.PI / 2, .96, [.85, .95]),
    p(`${F}/chair_stool_wood.gltf`, 4.3, -4.0, -.15, .9),
    p(`${F}/rug_rectangle_stripes_A.gltf`, 0, -1.0, 0, 1.28),
    p(`${T}/lantern.gltf`, -6.7, -3.3, 0, 1.02),
    p(`${T}/journal_closed.gltf`, 6.7, -3.3, .2, 1),
  ],

  // 8 · Materiallager — compact bays creating a deliberate zig-zag route.
  8: [
    p(`${F}/shelf_A_big.gltf`, -7.5, -7.0, Math.PI / 2, .96, [1.0, 2.25]),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, -5.3, -6.2, .06, .94, [1.7, 1.15]),
    p(`${T}/rope_bundle_B.gltf`, -4.8, -4.6, .2, 1.12),
    p(`${F}/shelf_B_large.gltf`, 7.5, -7.0, -Math.PI / 2, .96, [1.0, 2.25]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, 5.3, -6.1, -.06, .92, [1.6, 1.1]),
    p(`${T}/bucket_metal.gltf`, 5.0, -4.6, 0, 1.06),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, -6.2, 2.1, .08, 1, [1.0, .75]),
    p(`${R}/Iron_Bars_Stack_Small.gltf`, -4.8, 2.1, -.08, 1, [1.0, .75]),
  ],

  // 9 · Ritualkammer — shrine focus and open orbit around it.
  9: [
    p(`${H}/shrine_candles.gltf`, 0, -5.4, 0, 1.48, [1.55, 1.55]),
    p(`${H}/candle_triple.gltf`, -3.3, -4.1, 0, 1.2),
    p(`${H}/candle_triple.gltf`, 3.3, -4.1, 0, 1.2),
    p(`${H}/candle_melted.gltf`, -4.6, -2.2, 0, 1.08),
    p(`${H}/candle_melted.gltf`, 4.6, -2.2, 0, 1.08),
    p(`${H}/skull.gltf`, -2.3, -2.4, .2, 1.15),
    p(`${H}/bone_A.gltf`, 2.3, -2.4, -.25, 1.15),
    p(`${T}/journal_open.gltf`, 0, -2.0, .05, 1.12),
    p(`${F}/rug_oval_A.gltf`, 0, -.5, 0, 1.25),
  ],

  // 10 · Grabwächterhalle — side crypts frame a clean central avenue.
  10: [
    p(`${H}/crypt.gltf`, -7.2, -6.0, Math.PI / 2, 1.1, [1.85, 1.4]),
    p(`${H}/crypt.gltf`, 7.2, -6.0, -Math.PI / 2, 1.1, [1.85, 1.4]),
    p(`${H}/grave_A.gltf`, -7.0, 1.8, .08, 1.15, [1.0, 1.45]),
    p(`${H}/grave_B.gltf`, 7.0, 1.8, -.08, 1.15, [1.0, 1.45]),
    p(`${H}/candle_triple.gltf`, -3.0, -3.8, 0, 1.2),
    p(`${H}/candle_triple.gltf`, 3.0, -3.8, 0, 1.2),
    p(`${H}/candle_triple.gltf`, -3.0, 1.0, 0, 1.2),
    p(`${H}/candle_triple.gltf`, 3.0, 1.0, 0, 1.2),
    p(`${H}/skull.gltf`, -4.0, 4.5, .2, 1.08),
    p(`${H}/bone_A.gltf`, 4.0, 4.5, -.2, 1.08),
  ],

  // 11 · Kreuzgang der Wachen — four quadrants, readable cross lanes.
  11: [
    p(`${D}/column.gltf`, -6.3, -5.8, 0, 1.2, [.95, .95]),
    p(`${D}/column.gltf`, 6.3, -5.8, 0, 1.2, [.95, .95]),
    p(`${D}/column.gltf`, -6.3, 4.8, 0, 1.2, [.95, .95]),
    p(`${D}/column.gltf`, 6.3, 4.8, 0, 1.2, [.95, .95]),
    p(`${H}/bench_decorated.gltf`, -7.7, -2.1, Math.PI / 2, 1.02, [1.0, 2.0]),
    p(`${H}/crypt.gltf`, 7.7, -2.1, -Math.PI / 2, 1.02, [1.75, 1.35]),
    p(`${H}/candle_triple.gltf`, 0, -1.2, 0, 1.25),
  ],

  // 12 · Gefallene Galerie — diagonal cover and projectile sight-line breaks.
  12: [
    p(`${F}/shelf_B_large_decorated.gltf`, -5.7, -6.7, .25, .98, [2.2, .95]),
    p(`${F}/table_medium_long.gltf`, 3.0, -2.3, -.22, 1.03, [2.45, 1.05]),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, -3.8, 3.6, .22, .95, [1.65, 1.05]),
    p(`${T}/journal_open.gltf`, 2.7, -2.3, .2, 1.2),
    p(`${H}/skull.gltf`, 3.6, -2.1, -.2, 1.15),
    p(`${T}/lantern.gltf`, -4.8, 2.8, 0, 1.12),
  ],

  // 13 · Gefangenenring — heavy side blocks preserve a long center route.
  13: [
    p(`${H}/coffin_decorated.gltf`, -7.0, -5.4, Math.PI / 2, 1.08, [1.35, 2.45]),
    p(`${H}/coffin.gltf`, -7.0, 1.7, Math.PI / 2, 1.08, [1.35, 2.45]),
    p(`${H}/coffin.gltf`, 7.0, -5.4, -Math.PI / 2, 1.08, [1.35, 2.45]),
    p(`${H}/coffin_decorated.gltf`, 7.0, 1.7, -Math.PI / 2, 1.08, [1.35, 2.45]),
    p(`${H}/bench_decorated.gltf`, -5.5, -1.7, Math.PI / 2, 1.0),
    p(`${H}/bench_decorated.gltf`, 5.5, -1.7, -Math.PI / 2, 1.0),
    p(`${H}/candle_melted.gltf`, 0, -4.5, 0, 1.1),
  ],

  // 14 · Knochenhof — four quadrants demand quick direction changes.
  14: [
    p(`${H}/grave_A_destroyed.gltf`, -5.8, -5.3, .2, 1.1, [1.0, 1.45]),
    p(`${H}/grave_B.gltf`, 5.8, -5.3, -.2, 1.1, [1.0, 1.45]),
    p(`${H}/fence_broken.gltf`, -5.8, 4.4, Math.PI / 2, 1.1, [.9, 2.0]),
    p(`${H}/fence_seperate_broken.gltf`, 5.8, 4.4, -Math.PI / 2, 1.1, [.9, 2.0]),
    p(`${H}/tree_dead_small.gltf`, 0, -1.0, 0, .85, [.9, .9]),
    p(`${H}/skull.gltf`, -2.2, -1.2, 0, 1.2),
    p(`${H}/bone_A.gltf`, 2.2, -1.0, .4, 1.2),
  ],

  // 15 · Ritualarena — four pylons and a dangerous center focus.
  15: [
    p(`${D}/column.gltf`, -6.4, -5.8, 0, 1.18, [.95, .95]),
    p(`${D}/column.gltf`, 6.4, -5.8, 0, 1.18, [.95, .95]),
    p(`${D}/column.gltf`, -6.4, 4.8, 0, 1.18, [.95, .95]),
    p(`${D}/column.gltf`, 6.4, 4.8, 0, 1.18, [.95, .95]),
    p(`${H}/shrine_candles.gltf`, 0, -1.5, 0, 1.5, [1.55, 1.55]),
    p(`${H}/candle_triple.gltf`, -3.6, -1.5, 0, 1.3),
    p(`${H}/candle_triple.gltf`, 3.6, -1.5, 0, 1.3),
    p(`${H}/skull.gltf`, -5.0, 3.0, 0, 1.3),
    p(`${H}/bone_A.gltf`, 5.0, 3.0, .4, 1.3),
  ],

  // 16 · Warden-Passage — staggered narrow blockers force early dodges.
  16: [
    p(`${D}/column.gltf`, -6.7, -6.2, 0, 1.16, [.82, .82]),
    p(`${D}/column.gltf`, -2.5, -2.0, 0, 1.16, [.82, .82]),
    p(`${D}/column.gltf`, 1.8, -6.2, 0, 1.16, [.82, .82]),
    p(`${D}/column.gltf`, 6.2, -2.0, 0, 1.16, [.82, .82]),
    p(`${D}/column.gltf`, -6.7, 4.8, 0, 1.16, [.82, .82]),
    p(`${D}/column.gltf`, 1.8, 4.8, 0, 1.16, [.82, .82]),
    p(`${T}/blueprint_stacked.gltf`, 0, -7.0, -.2, 1.2),
    p(`${T}/hammer.gltf`, 5.4, -4.6, .3, 1.2),
  ],

  // 17 · Eingestürztes Gewölbe — four heavy wedges leave a central rest route.
  17: [
    p(`${H}/crypt.gltf`, -6.8, -6.2, Math.PI / 2, 1.08, [1.8, 1.35]),
    p(`${H}/crypt.gltf`, 6.8, -6.2, -Math.PI / 2, 1.08, [1.8, 1.35]),
    p(`${H}/coffin_decorated.gltf`, -6.3, 4.0, Math.PI / 2, 1.08, [1.3, 2.35]),
    p(`${H}/coffin.gltf`, 6.3, 4.0, -Math.PI / 2, 1.08, [1.3, 2.35]),
    p(`${H}/candle_triple.gltf`, 0, -1.2, 0, 1.3),
    p(`${H}/grave_A_destroyed.gltf`, -3.8, .5, .2, 1.0),
    p(`${H}/grave_B.gltf`, 3.8, .5, -.2, 1.0),
  ],

  // 18 · Veil-Riss — central anomaly, almost completely open outer ring.
  18: [
    p(`${H}/shrine_candles.gltf`, 0, -1.0, 0, 1.58, [1.65, 1.65]),
    p(`${H}/candle_triple.gltf`, -6.2, -5.2, 0, 1.25),
    p(`${H}/candle_triple.gltf`, 6.2, -5.2, 0, 1.25),
    p(`${H}/candle_melted.gltf`, -6.2, 4.3, 0, 1.15),
    p(`${H}/candle_melted.gltf`, 6.2, 4.3, 0, 1.15),
    p(`${H}/skull.gltf`, -2.0, -1.0, .2, 1.2),
    p(`${H}/bone_A.gltf`, 2.0, -1.0, -.2, 1.2),
  ],

  // 19 · Vorhalle des Wächters — sparse blockers and a long boss sight-line.
  19: [
    p(`${D}/column.gltf`, -6.8, -4.8, 0, 1.2, [.9, 1.4]),
    p(`${D}/column.gltf`, 6.8, -4.8, 0, 1.2, [.9, 1.4]),
    p(`${D}/column.gltf`, -4.0, 4.2, 0, 1.14, [.85, .85]),
    p(`${D}/column.gltf`, 4.0, 4.2, 0, 1.14, [.85, .85]),
    p(`${H}/shrine_candles.gltf`, 0, -6.8, 0, 1.48, [1.55, 1.55]),
    p(`${H}/candle_triple.gltf`, -4.5, 1.6, 0, 1.3),
    p(`${H}/candle_triple.gltf`, 4.5, 1.6, 0, 1.3),
  ],

  // 20 · Kapitelboss — four phase anchors around a genuinely open boss core.
  20: [
    p(`${D}/column.gltf`, -6.8, -5.8, 0, 1.3, [1.0, 1.0]),
    p(`${D}/column.gltf`, 6.8, -5.8, 0, 1.3, [1.0, 1.0]),
    p(`${D}/column.gltf`, -6.8, 4.8, 0, 1.3, [1.0, 1.0]),
    p(`${D}/column.gltf`, 6.8, 4.8, 0, 1.3, [1.0, 1.0]),
    p(`${H}/crypt.gltf`, -8.6, -1.0, Math.PI / 2, 1.08, [1.7, 1.3]),
    p(`${H}/crypt.gltf`, 8.6, -1.0, -Math.PI / 2, 1.08, [1.7, 1.3]),
    p(`${H}/candle_triple.gltf`, -4.2, -1.0, 0, 1.35),
    p(`${H}/candle_triple.gltf`, 4.2, -1.0, 0, 1.35),
    p(`${H}/skull.gltf`, -2.2, 2.8, .2, 1.2),
    p(`${H}/bone_A.gltf`, 2.2, 2.8, -.2, 1.2),
  ],
};

export function roomSetpieces(room: number): RoomSetpiece[] {
  return ROOM_SETPIECES[Math.max(1, Math.min(20, room))] ?? [];
}
