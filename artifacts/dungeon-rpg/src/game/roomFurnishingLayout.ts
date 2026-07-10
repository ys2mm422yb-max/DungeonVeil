export type RoomFurnishingPiece = {
  model: string;
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
};

const F = 'furniture/Assets/gltf';
const T = 'tools/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';
const f = (model: string, x: number, z: number, rotation = 0, scale = 1): RoomFurnishingPiece => ({ model, x, z, rotation, scale });

/** Small, non-blocking scene dressing. Every group belongs to a room function; no scatter/random placement. */
export const ROOM_FURNISHING: Record<number, RoomFurnishingPiece[]> = {
  1: [
    f(`${T}/lantern.gltf`, -6.0, -4.4, 0, 1.1), f(`${R}/Iron_Nuggets.gltf`, 6.4, -5.2, .15, .9),
  ],
  2: [
    f(`${T}/compass_base.gltf`, -5.35, -5.55, .2, 1.05), f(`${T}/journal_closed.gltf`, 6.3, -5.5, -.15, 1.0),
  ],
  3: [
    f(`${H}/candle_thin.gltf`, -5.0, .2, 0, 1.05), f(`${H}/candle_thin.gltf`, 5.0, .2, 0, 1.05),
    f(`${H}/candle.gltf`, -5.0, 5.2, 0, 1.05), f(`${H}/candle.gltf`, 5.0, 5.2, 0, 1.05),
  ],
  4: [
    f(`${T}/pickaxe.gltf`, -6.6, -4.9, .25, 1.15), f(`${T}/shovel.gltf`, -5.7, -4.7, -.2, 1.12),
    f(`${R}/Iron_Nuggets.gltf`, 5.7, -4.9, .12, 1.0), f(`${R}/Copper_Nuggets.gltf`, 6.6, -4.8, -.12, 1.0),
  ],
  5: [
    f(`${T}/blueprint.gltf`, -5.8, -5.5, .12, 1.05), f(`${T}/chisel.gltf`, -4.7, -5.2, -.2, 1.05),
    f(`${T}/screwdriver_A.gltf`, 5.8, -5.25, .2, 1.0), f(`${T}/file.gltf`, 6.45, -5.1, -.2, 1.0),
  ],
  6: [
    f(`${R}/Iron_Nuggets.gltf`, -5.9, -4.7, .2, 1.0), f(`${T}/tongs.gltf`, -5.0, -5.45, -.2, 1.12),
    f(`${R}/Copper_Nuggets.gltf`, 5.9, -4.6, -.2, 1.0), f(`${T}/file.gltf`, 4.9, -5.2, .2, 1.05),
  ],
  7: [
    f(`${F}/pillow_A.gltf`, -5.9, -6.1, .1, .9), f(`${F}/pillow_B.gltf`, 5.9, -6.1, -.1, .9),
    f(`${T}/journal_closed.gltf`, 4.6, -4.0, .18, .95), f(`${T}/lantern.gltf`, -4.7, -4.0, 0, 1.0),
  ],
  8: [
    f(`${T}/rope_bundle_A.gltf`, -5.5, -4.7, .15, 1.05), f(`${T}/bucket_metal.gltf`, 5.5, -4.6, 0, 1.0),
    f(`${R}/Copper_Nuggets.gltf`, -5.7, 4.0, .15, .9), f(`${R}/Iron_Nuggets.gltf`, -4.8, 4.0, -.15, .9),
  ],
  9: [
    f(`${H}/skull_candle.gltf`, -2.2, -2.0, .15, 1.08), f(`${H}/bone_B.gltf`, 2.2, -2.0, -.2, 1.08),
    f(`${H}/candle_thin.gltf`, -3.4, 1.8, 0, 1.05), f(`${H}/candle_thin.gltf`, 3.4, 1.8, 0, 1.05),
  ],
  10: [
    f(`${D}/banner_shield_red.gltf`, -5.1, -6.6, 0, 1.05), f(`${D}/banner_shield_red.gltf`, 5.1, -6.6, 0, 1.05),
    f(`${H}/skull_candle.gltf`, -3.0, 1.0, .1, 1.08), f(`${H}/skull_candle.gltf`, 3.0, 1.0, -.1, 1.08),
  ],
  11: [
    // Overgrown vault: abandoned prayer corner and funerary remains beneath the broken structure.
    f(`${H}/shrine.gltf`, -5.8, -5.0, .05, 1.18), f(`${H}/candle_melted.gltf`, -4.7, -4.6, 0, 1.05),
    f(`${H}/skull.gltf`, 6.7, -5.0, -.2, 1.05), f(`${H}/bone_C.gltf`, 6.0, -4.6, .25, 1.08),
    f(`${H}/candle_thin.gltf`, -2.7, 5.5, 0, 1.0), f(`${H}/candle_thin.gltf`, -4.8, 5.5, 0, 1.0),
  ],
  12: [
    // Blood archive: reading table is a coherent evidence scene, shelf wings have book overflow.
    f(`${F}/book_set.gltf`, -7.1, -5.8, .1, 1.05), f(`${F}/book_single.gltf`, -6.3, -5.5, -.2, 1.0),
    f(`${F}/book_set.gltf`, 7.0, -5.8, -.1, 1.05), f(`${F}/book_single.gltf`, 6.25, -5.45, .2, 1.0),
    f(`${H}/candle_melted.gltf`, -1.0, -2.0, 0, 1.08), f(`${H}/skull_candle.gltf`, 1.0, -2.0, 0, 1.08),
    f(`${T}/journal_closed.gltf`, .55, -1.7, .22, 1.05),
  ],
  13: [
    // Rune sanctum: left drafting station, right inspection station, sealed notes at the rear.
    f(`${T}/blueprint_stacked.gltf`, -6.3, -5.25, .1, 1.08), f(`${T}/pencils.gltf`, -5.7, -5.0, -.2, 1.0),
    f(`${T}/magnifying_glass.gltf`, 6.15, -5.05, .2, 1.08), f(`${T}/compass_base.gltf`, 5.6, -4.8, -.1, 1.03),
    f(`${T}/journal_open.gltf`, -1.2, 4.8, .18, 1.06), f(`${F}/book_set.gltf`, 1.1, 4.8, -.18, 1.0),
  ],
  14: [
    // Root chamber: collapsed burial material collects around the broken grave route.
    f(`${H}/ribcage.gltf`, -4.0, -3.8, .2, 1.08), f(`${H}/bone_A.gltf`, -3.2, -3.5, -.25, 1.05),
    f(`${H}/skull.gltf`, 4.0, 4.1, -.2, 1.08), f(`${H}/bone_B.gltf`, 3.3, 4.0, .2, 1.05),
    f(`${H}/candle_melted.gltf`, -6.0, 5.2, 0, 1.0), f(`${H}/candle_melted.gltf`, 6.1, -4.8, 0, 1.0),
  ],
  15: [
    // Veil shrine: ceremonial candle ring and offerings lead toward the central shrine.
    f(`${H}/plaque_candles.gltf`, -5.0, -3.0, .05, 1.08), f(`${H}/plaque_candles.gltf`, 5.0, -3.0, -.05, 1.08),
    f(`${H}/skull_candle.gltf`, -2.8, .8, .12, 1.08), f(`${H}/skull_candle.gltf`, 2.8, .8, -.12, 1.08),
    f(`${H}/candle_triple.gltf`, -2.8, 4.4, 0, 1.15), f(`${H}/candle_triple.gltf`, 2.8, 4.4, 0, 1.15),
  ],
  16: [
    // Broken workshop: abandoned tools remain where two work lines collapsed.
    f(`${T}/wrench_A.gltf`, -6.2, -5.0, .2, 1.1), f(`${T}/handdrill.gltf`, -5.7, -5.35, -.2, 1.12),
    f(`${T}/blueprint_stacked.gltf`, 5.8, -5.0, -.15, 1.1), f(`${T}/hammer.gltf`, 6.4, -4.8, .2, 1.08),
    f(`${T}/rope_bundle_B.gltf`, -5.4, 1.2, .15, 1.02), f(`${T}/bucket_metal.gltf`, 5.4, -.6, 0, 1.02),
  ],
  17: [
    // Grave gallery: funeral light and remains reinforce the side tomb bays.
    f(`${H}/candle_triple.gltf`, -5.0, -4.4, 0, 1.12), f(`${H}/candle_triple.gltf`, 5.0, -4.4, 0, 1.12),
    f(`${H}/ribcage.gltf`, -5.8, 2.8, .2, 1.08), f(`${H}/skull.gltf`, 5.8, 2.8, -.2, 1.08),
    f(`${H}/candle_melted.gltf`, -4.5, 5.6, 0, 1.0), f(`${H}/candle_melted.gltf`, 4.5, 5.6, 0, 1.0),
  ],
  18: [
    // Crystal foundry: bar sorting and hand tools are attached to their respective forge cells.
    f(`${R}/Iron_Nuggets.gltf`, -5.7, -4.5, .15, 1.0), f(`${T}/tongs.gltf`, -5.1, -5.2, -.2, 1.12),
    f(`${R}/Copper_Nuggets.gltf`, 5.7, -4.5, -.15, 1.0), f(`${T}/hammer.gltf`, 5.1, -5.0, .2, 1.1),
    f(`${T}/bucket_metal.gltf`, -6.0, 1.8, 0, 1.0), f(`${T}/torch.gltf`, 6.0, 1.8, 0, 1.18),
  ],
  19: [
    // Broken ritual: offerings and remains form two interrupted arcs around the exposed core.
    f(`${H}/plaque_candles.gltf`, -4.6, -3.2, .08, 1.08), f(`${H}/plaque_candles.gltf`, 4.6, -3.2, -.08, 1.08),
    f(`${H}/skull_candle.gltf`, -2.7, .8, .15, 1.1), f(`${H}/bone_A.gltf`, 2.7, .8, -.2, 1.1),
    f(`${H}/ribcage.gltf`, -2.8, 4.8, .18, 1.08), f(`${H}/skull.gltf`, 2.8, 4.8, -.18, 1.08),
  ],
  20: [
    // First Warden: heraldic approach and mirrored funeral lights keep the boss court ceremonial.
    f(`${D}/banner_patternC_red.gltf`, -6.0, -6.5, 0, 1.14), f(`${D}/banner_patternC_red.gltf`, 6.0, -6.5, 0, 1.14),
    f(`${D}/banner_shield_red.gltf`, -7.1, -.4, Math.PI / 2, 1.08), f(`${D}/banner_shield_red.gltf`, 7.1, -.4, -Math.PI / 2, 1.08),
    f(`${H}/candle_triple.gltf`, -4.4, -2.2, 0, 1.2), f(`${H}/candle_triple.gltf`, 4.4, -2.2, 0, 1.2),
    f(`${H}/skull_candle.gltf`, -4.4, 3.0, 0, 1.12), f(`${H}/skull_candle.gltf`, 4.4, 3.0, 0, 1.12),
  ],
};

export function roomFurnishingPieces(room: number): RoomFurnishingPiece[] {
  return ROOM_FURNISHING[Math.max(1, Math.min(20, room))] ?? [];
}
