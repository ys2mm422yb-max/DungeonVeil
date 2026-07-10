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
const N = 'forest/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf';

const p = (model: string, x: number, z: number, rotation = 0, scale = 1, collider?: readonly [number, number]): RoomSetpiece => ({ model, x, z, rotation, scale, collider });

/** One hand-authored functional scene per room. No independent scatter/decor pass. */
export const ROOM_SETPIECES: Record<number, RoomSetpiece[]> = {
  1: [
    // Versorgungsposten: unload left, inspect in the middle, sort and store on the right.
    p(`${F}/shelf_B_large_decorated.gltf`, -7.3, -6.6, Math.PI / 2, 1.02),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.8, -5.7, .08, 1.05),
    p(`${T}/rope_bundle_A.gltf`, -5.9, -4.2, .18, 1.05), p(`${T}/bucket_metal.gltf`, -4.8, -4.0, 0, 1.02),
    p(`${F}/table_low.gltf`, -.5, -3.1, .04, 1.08),
    p(`${T}/journal_closed.gltf`, -.9, -3.15, .2, 1.08), p(`${T}/lantern.gltf`, .35, -2.9, 0, 1.18),
    p(`${R}/Pallet_Wood.gltf`, 3.4, -4.0, -.06, .96),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, 5.0, -5.0, .04, 1.04), p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.0, -4.0, -.1, 1.02),
    p(`${F}/shelf_A_big.gltf`, 7.3, -6.5, -Math.PI / 2, 1.02),
  ],
  2: [
    // Wachstube: one command table owns the room, equipment remains a wall-side secondary function.
    p(`${F}/table_medium_long.gltf`, -1.9, -4.0, .06, 1.2),
    p(`${T}/map.gltf`, -2.5, -4.05, .08, 1.16), p(`${T}/journal_open.gltf`, -1.35, -3.8, .28, 1.08), p(`${T}/compass_base.gltf`, -.45, -4.15, -.15, 1.06),
    p(`${F}/chair_A_wood.gltf`, -3.2, -2.6, .12, 1.0), p(`${F}/chair_A_wood.gltf`, -.7, -2.55, -.14, 1.0), p(`${F}/chair_B_wood.gltf`, -2.0, -5.55, Math.PI, .96),
    p(`${D}/banner_shield_red.gltf`, -1.8, -7.0, 0, 1.1),
    p(`${F}/cabinet_medium_decorated.gltf`, 7.0, -6.2, -Math.PI / 2, 1.02),
    p(`${F}/shelf_B_small_decorated.gltf`, 5.7, -5.7, 0, 1.03), p(`${T}/lantern.gltf`, 5.2, -4.5, 0, 1.2),
  ],
  3: [
    // Alte Säulenhalle: sparse ceremonial remains make the central nave readable.
    p(`${D}/banner_patternC_red.gltf`, .4, -7.35, 0, 1.12),
    p(`${H}/candle_triple.gltf`, -4.4, -3.8, 0, 1.18), p(`${H}/candle_triple.gltf`, 4.7, -4.0, 0, 1.18),
    p(`${H}/candle_thin.gltf`, -2.0, -.8, 0, 1.05), p(`${H}/candle_thin.gltf`, 2.0, -.8, 0, 1.05),
    p(`${H}/candle_melted.gltf`, .1, 3.0, 0, 1.08),
    p(`${H}/bone_B.gltf`, -5.4, 4.3, .2, 1.04), p(`${H}/skull.gltf`, -4.7, 4.6, -.2, 1.04),
  ],
  4: [
    // Bergarbeiterlager: checkout bench -> hauling pallet -> raw ore -> sorted bars.
    p(`${F}/table_low.gltf`, -5.8, -5.5, .05, 1.12),
    p(`${T}/pickaxe.gltf`, -6.5, -5.55, .18, 1.3), p(`${T}/shovel.gltf`, -5.5, -5.2, -.18, 1.26), p(`${T}/bucket_metal.gltf`, -6.4, -4.1, 0, 1.06), p(`${T}/lantern.gltf`, -4.8, -4.2, 0, 1.18),
    p(`${R}/Pallet_Wood.gltf`, -1.0, -1.3, .18, 1.03),
    p(`${R}/Iron_Nuggets.gltf`, .1, -.2, .2, 1.2), p(`${R}/Copper_Nuggets.gltf`, 1.3, .7, -.2, 1.18),
    p(`${R}/Iron_Bars_Stack_Small.gltf`, 4.0, 2.2, .08, 1.03), p(`${T}/rope_bundle_B.gltf`, 5.0, 2.8, -.2, 1.06),
    p(`${R}/Pallet_Wood_Covered_B.gltf`, 6.2, -5.4, -.08, .96),
  ],
  5: [
    // Werkstatt: master bench feeds a smaller precision-repair station.
    p(`${F}/table_medium_long.gltf`, -4.3, -4.7, .04, 1.16),
    p(`${T}/blueprint_stacked.gltf`, -5.0, -4.75, .1, 1.16), p(`${T}/handdrill.gltf`, -4.0, -4.35, -.3, 1.22), p(`${T}/file.gltf`, -3.0, -4.55, .35, 1.14), p(`${T}/chisel.gltf`, -3.5, -4.9, -.15, 1.1),
    p(`${F}/shelf_B_large_decorated.gltf`, -7.1, -6.1, Math.PI / 2, 1.0),
    p(`${F}/table_small.gltf`, 3.9, -1.6, .1, 1.1), p(`${T}/saw.gltf`, 3.55, -1.7, .22, 1.24), p(`${T}/hammer.gltf`, 4.35, -1.3, -.25, 1.14),
    p(`${T}/screwdriver_A_short_color.gltf`, 4.2, -1.9, .15, 1.06), p(`${T}/pencil_A_long.gltf`, 3.7, -1.25, -.15, 1.0),
    p(`${F}/chair_stool_wood.gltf`, 3.0, -.5, .1, .94), p(`${T}/rope_bundle_A.gltf`, 5.4, -.2, .18, 1.02),
  ],
  6: [
    // Schmiede: iron prep and forging left -> hot grate lane -> grinding and copper finish right.
    p(`${T}/anvil.gltf`, -5.3, -5.1, 0, 1.58), p(`${T}/hammer.gltf`, -4.6, -4.8, .3, 1.28), p(`${T}/tongs.gltf`, -4.9, -5.6, -.25, 1.22),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.6, -3.9, .05, 1.08), p(`${R}/Iron_Nuggets.gltf`, -3.8, -3.6, .16, 1.06),
    p(`${T}/grindstone.gltf`, 5.0, -1.0, Math.PI / 2, 1.5), p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.0, -.1, -.1, 1.06), p(`${T}/bucket_metal.gltf`, 3.6, -.1, 0, 1.02),
    p(`${T}/torch.gltf`, -7.3, -7.2, 0, 1.28), p(`${T}/torch.gltf`, 7.1, -5.8, 0, 1.28),
  ],
  7: [
    // Schlafquartier: four uneven beds share one lived-in common table.
    p(`${F}/bed_single_A.gltf`, -6.1, -6.1, Math.PI / 2, 1.03), p(`${F}/cabinet_small_decorated.gltf`, -7.2, -4.0, Math.PI / 2, .98), p(`${F}/pillow_A.gltf`, -5.8, -6.1, .1, .9),
    p(`${F}/bed_single_B.gltf`, 5.8, -5.6, -Math.PI / 2, 1.0), p(`${F}/cabinet_small.gltf`, 7.0, -3.8, -Math.PI / 2, .98),
    p(`${F}/bed_single_B.gltf`, -5.9, 5.2, Math.PI / 2, .96), p(`${F}/bed_single_A.gltf`, 5.3, 4.8, -Math.PI / 2, .96),
    p(`${F}/table_low.gltf`, 0, .8, -.08, 1.02), p(`${F}/chair_stool_wood.gltf`, -1.4, .3, .2, .94), p(`${F}/chair_stool.gltf`, 1.25, 1.45, -.2, .94), p(`${T}/journal_closed.gltf`, .2, .7, .15, 1.0), p(`${T}/lantern.gltf`, -.45, 1.0, 0, 1.12),
  ],
  8: [
    // Materiallager: wood receiving row, iron row and dispatch desk create three readable inventory lanes.
    p(`${F}/shelf_A_big.gltf`, -7.2, -6.5, Math.PI / 2, 1.0), p(`${R}/Pallet_Wood_Covered_B.gltf`, -5.5, -5.7, .06, 1.02), p(`${T}/rope_bundle_A.gltf`, -4.3, -4.8, .16, 1.03),
    p(`${F}/shelf_B_large.gltf`, 4.8, -4.9, 0, 1.0), p(`${R}/Iron_Bars_Stack_Large.gltf`, 3.8, -3.5, -.06, .98), p(`${T}/bucket_metal.gltf`, 5.6, -3.3, 0, .98),
    p(`${R}/Copper_Bars_Stack_Medium.gltf`, -4.6, -.7, .08, 1.02), p(`${R}/Iron_Bars_Stack_Medium.gltf`, -2.8, -.7, -.08, 1.02),
    p(`${R}/Pallet_Wood.gltf`, 5.2, 3.8, .1, .96), p(`${F}/table_small.gltf`, 2.7, 3.5, -.1, .96), p(`${T}/compass_base.gltf`, 2.5, 3.5, .15, 1.0), p(`${T}/journal_closed.gltf`, 3.0, 3.7, -.1, .96),
  ],
  9: [
    // Ritualkammer: offerings lead from the journal to the raised shrine.
    p(`${H}/shrine_candles.gltf`, .2, -5.6, 0, 1.68),
    p(`${T}/journal_open.gltf`, 0, 3.8, .05, 1.18), p(`${H}/skull_candle.gltf`, -1.2, 2.6, .2, 1.18), p(`${H}/ribcage.gltf`, 1.4, 1.8, -.2, 1.12),
    p(`${H}/plaque_candles.gltf`, -3.7, -.2, .06, 1.14), p(`${H}/plaque_candles.gltf`, 3.4, -1.0, -.08, 1.14),
    p(`${H}/candle_triple.gltf`, -2.8, -3.4, 0, 1.28), p(`${H}/candle_triple.gltf`, 2.7, -3.8, 0, 1.28),
  ],
  10: [
    // Grabwächterhalle: crypt avenue and candles keep the boss approach open.
    p(`${H}/crypt.gltf`, -7.0, -5.6, Math.PI / 2, 1.2), p(`${H}/crypt.gltf`, 6.8, -5.8, -Math.PI / 2, 1.14),
    p(`${H}/grave_A.gltf`, -6.8, 2.5, .08, 1.18), p(`${H}/grave_A_destroyed.gltf`, 6.0, 3.6, -.18, 1.16),
    p(`${H}/candle_triple.gltf`, -2.8, 3.2, 0, 1.24), p(`${H}/candle_triple.gltf`, 2.8, 2.4, 0, 1.24), p(`${H}/candle_triple.gltf`, -2.5, -1.8, 0, 1.28), p(`${H}/candle_triple.gltf`, 2.7, -2.6, 0, 1.28),
    p(`${D}/banner_shield_red.gltf`, 0, -7.2, 0, 1.14),
  ],
  11: [
    // Overgrown vault: surviving prayer corner left, collapse and vegetation right.
    p(`${H}/bench_decorated.gltf`, -6.3, -5.7, Math.PI / 2, 1.08), p(`${H}/shrine.gltf`, -4.7, -5.2, .05, 1.22), p(`${H}/candle_melted.gltf`, -4.2, -4.1, 0, 1.04),
    p(`${H}/crypt.gltf`, 6.8, -5.8, -Math.PI / 2, 1.08), p(`${N}/Bush_3_A_Color1.gltf`, 4.4, -2.0, .1, 1.25), p(`${N}/Bush_1_A_Color1.gltf`, 5.8, 1.8, -.2, 1.15), p(`${N}/Grass_1_A_Color1.gltf`, 4.8, 3.8, 0, 1.2),
    p(`${H}/tree_dead_medium.gltf`, -6.8, 3.6, .1, .92),
  ],
  12: [
    // Blutarchiv: deep shelf wing, evidence table and a smaller candle-watch desk.
    p(`${F}/shelf_B_large_decorated.gltf`, -7.4, -6.6, Math.PI / 2, 1.05), p(`${F}/shelf_A_big.gltf`, -7.2, -3.5, Math.PI / 2, 1.0), p(`${F}/book_set.gltf`, -5.8, -5.0, .1, 1.05),
    p(`${F}/table_medium_long.gltf`, -.8, -2.0, .08, 1.16), p(`${T}/journal_open.gltf`, -1.5, -2.0, .2, 1.2), p(`${H}/skull_candle.gltf`, .2, -1.9, -.2, 1.16), p(`${F}/book_set.gltf`, 1.0, -2.2, .15, 1.05),
    p(`${F}/shelf_B_small_decorated.gltf`, 6.2, -5.0, -.08, 1.04), p(`${F}/book_single.gltf`, 5.0, -4.0, .2, 1.0), p(`${H}/candle_melted.gltf`, 5.8, -3.8, 0, 1.04),
  ],
  13: [
    // Runensanktum: three different research stations surround an exposed core.
    p(`${F}/table_medium.gltf`, -5.3, -4.8, .08, 1.12), p(`${T}/blueprint.gltf`, -5.7, -4.9, .2, 1.2), p(`${T}/drafting_compass.gltf`, -4.9, -4.5, -.2, 1.24),
    p(`${F}/table_small.gltf`, 5.0, -2.8, -.12, 1.1), p(`${T}/magnifying_glass.gltf`, 5.1, -2.9, .3, 1.2), p(`${T}/compass_base.gltf`, 4.6, -2.4, -.1, 1.08),
    p(`${F}/table_low.gltf`, -1.0, 4.4, .15, 1.02), p(`${T}/journal_open.gltf`, -1.4, 4.3, .2, 1.1), p(`${F}/book_set.gltf`, -.2, 4.5, -.18, 1.0),
  ],
  14: [
    // Wurzelkammer: old graves define the route while brush and dead growth reclaim it.
    p(`${H}/grave_A_destroyed.gltf`, -5.8, -5.5, .2, 1.16), p(`${H}/grave_B.gltf`, 5.6, -4.6, -.2, 1.12),
    p(`${H}/tree_dead_medium.gltf`, -6.2, 2.6, .1, .96), p(`${N}/Bush_4_A_Color1.gltf`, -4.7, 1.8, .2, 1.25), p(`${N}/Bush_1_A_Color1.gltf`, 3.6, 3.8, -.2, 1.18), p(`${N}/Grass_2_A_Color1.gltf`, 5.0, 5.0, 0, 1.22),
    p(`${H}/ribcage.gltf`, -2.4, -.2, .2, 1.08), p(`${H}/skull.gltf`, 2.2, 1.6, -.2, 1.08),
  ],
  15: [
    // Schleierschrein: procession rises to the shrine; offerings form a deliberately broken ring.
    p(`${H}/shrine_candles.gltf`, 0, -5.5, 0, 1.7),
    p(`${H}/plaque_candles.gltf`, -4.5, -2.4, .05, 1.16), p(`${H}/plaque_candles.gltf`, 4.1, -1.6, -.05, 1.14),
    p(`${H}/candle_triple.gltf`, -2.8, .4, 0, 1.3), p(`${H}/candle_triple.gltf`, 3.1, 1.4, 0, 1.24),
    p(`${H}/skull_candle.gltf`, -1.8, 4.0, .12, 1.14), p(`${H}/skull_candle.gltf`, 2.5, 4.6, -.12, 1.14), p(`${T}/journal_closed.gltf`, .4, 2.8, .2, 1.04),
  ],
  16: [
    // Gebrochene Werkstatt: one surviving production line feeds a late repair table.
    p(`${F}/table_medium_long.gltf`, -5.5, -5.0, Math.PI / 2, 1.08), p(`${T}/handdrill.gltf`, -5.4, -5.3, .2, 1.3), p(`${T}/wrench_A.gltf`, -5.0, -4.7, -.2, 1.22), p(`${F}/shelf_B_large.gltf`, -7.3, -1.8, Math.PI / 2, .98),
    p(`${F}/table_medium.gltf`, 4.5, -1.3, -.08, 1.1), p(`${T}/blueprint_stacked.gltf`, 4.2, -1.4, -.2, 1.24), p(`${T}/hammer.gltf`, 5.0, -1.0, .3, 1.24), p(`${T}/rope_bundle_B.gltf`, 5.8, .2, .15, 1.04),
    p(`${F}/shelf_A_big.gltf`, 6.8, 4.6, -Math.PI / 2, .94),
  ],
  17: [
    // Grabgalerie: older decorated coffins left, newer damaged burial line right.
    p(`${H}/coffin_decorated.gltf`, -6.5, -6.0, Math.PI / 2, 1.16), p(`${H}/coffin.gltf`, -6.4, -2.5, Math.PI / 2, 1.1),
    p(`${H}/grave_A.gltf`, 6.4, -5.2, -.12, 1.16), p(`${H}/grave_A_destroyed.gltf`, 5.8, 1.8, -.2, 1.14),
    p(`${H}/candle_triple.gltf`, -2.7, 3.6, 0, 1.22), p(`${H}/candle_triple.gltf`, 2.9, 2.8, 0, 1.22),
    p(`${H}/gravestone.gltf`, -4.8, 5.7, .1, 1.08), p(`${H}/skull_candle.gltf`, 4.4, 5.1, -.1, 1.1),
  ],
  18: [
    // Kristallgießerei: iron prep -> casting lane -> copper finishing.
    p(`${T}/anvil.gltf`, -5.5, -5.1, 0, 1.55), p(`${R}/Iron_Bars_Stack_Large.gltf`, -6.2, -2.8, 0, 1.06), p(`${R}/Iron_Nuggets.gltf`, -4.7, -4.2, .15, 1.14), p(`${T}/tongs.gltf`, -4.8, -5.2, -.2, 1.18),
    p(`${R}/Gold_Bars_Stack_Small.gltf`, 0, 1.4, .08, 1.0), p(`${T}/bucket_metal.gltf`, -1.4, 2.0, 0, 1.0),
    p(`${T}/grindstone.gltf`, 5.2, -2.0, Math.PI / 2, 1.5), p(`${R}/Copper_Bars_Stack_Medium.gltf`, 6.0, .6, 0, 1.06), p(`${R}/Copper_Nuggets.gltf`, 4.5, -1.2, -.15, 1.14), p(`${T}/hammer.gltf`, 5.8, -2.7, .2, 1.16),
    p(`${T}/torch.gltf`, -7.3, -7.2, 0, 1.3), p(`${T}/torch.gltf`, 7.1, -5.8, 0, 1.3),
  ],
  19: [
    // Gebrochenes Ritual: shrine survived off-center while the left ritual arc was ripped apart.
    p(`${H}/shrine_candles.gltf`, .7, -5.4, 0, 1.72),
    p(`${H}/crypt.gltf`, 6.6, -5.8, -Math.PI / 2, 1.1),
    p(`${H}/plaque_candles.gltf`, 4.2, -2.0, -.08, 1.14), p(`${H}/candle_triple.gltf`, 2.9, .4, 0, 1.24),
    p(`${H}/ribcage.gltf`, -3.8, -1.2, .18, 1.12), p(`${H}/bone_A.gltf`, -2.6, .2, -.2, 1.1), p(`${H}/skull.gltf`, -4.5, 2.2, -.18, 1.12),
    p(`${H}/skull_candle.gltf`, 2.0, 4.3, -.12, 1.12), p(`${T}/journal_open.gltf`, -.8, 3.7, .18, 1.08),
  ],
  20: [
    // Halle des ersten Wächters: heraldic rear court and funeral approach leave the boss arena readable.
    p(`${H}/crypt.gltf`, -7.5, -6.2, Math.PI / 2, 1.22), p(`${H}/crypt.gltf`, 7.3, -6.4, -Math.PI / 2, 1.18),
    p(`${D}/banner_patternC_red.gltf`, -2.6, -7.2, 0, 1.18), p(`${D}/banner_shield_red.gltf`, 2.8, -7.15, 0, 1.18),
    p(`${H}/candle_triple.gltf`, -3.0, 3.8, 0, 1.3), p(`${H}/candle_triple.gltf`, 3.2, 3.0, 0, 1.3), p(`${H}/candle_triple.gltf`, -2.7, -.8, 0, 1.34), p(`${H}/candle_triple.gltf`, 2.9, -1.7, 0, 1.34),
    p(`${H}/grave_A.gltf`, -6.8, 4.7, .1, 1.2), p(`${H}/grave_A_destroyed.gltf`, 6.2, 4.2, -.22, 1.18), p(`${H}/skull_candle.gltf`, 5.2, 5.4, -.1, 1.16),
  ],
};

export function roomSetpieces(room: number): RoomSetpiece[] {
  return ROOM_SETPIECES[Math.max(1, Math.min(20, room))] ?? [];
}
