export type RoomDecorDetail = {
  model: string;
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
};

const F = 'furniture/Assets/gltf';
const T = 'tools/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';

const d = (model: string, x: number, z: number, rotation = 0, scale = 1): RoomDecorDetail => ({ model, x, z, rotation, scale });

const DETAILS: Record<number, RoomDecorDetail[]> = {
  1: [
    d(`${F}/rug_rectangle_stripes_A.gltf`, 0, 1.6, 0, 1.15),
    d(`${T}/bucket_metal.gltf`, -4.8, -1.5, .2, .95),
    d(`${T}/rope_bundle_B.gltf`, 4.8, .4, -.2, 1.05),
    d(`${R}/Iron_Nuggets.gltf`, -3.8, 4.4, .2, .85),
    d(`${F}/chair_stool_wood.gltf`, 4.4, 4.8, .25, .9),
  ],
  2: [
    d(`${F}/rug_rectangle_pattern_A.gltf`, 0, 2.1, 0, 1.05),
    d(`${T}/compass_base.gltf`, -2.8, -1.2, .2, 1.05),
    d(`${T}/journal_closed.gltf`, 3.2, -.6, -.25, 1.05),
    d(`${T}/lantern.gltf`, -4.5, 4.5, 0, 1.05),
    d(`${F}/chair_stool_wood.gltf`, 4.7, 4.2, .4, .9),
  ],
  3: [
    d(`${F}/rug_round_pattern_A.gltf`, 0, 0, 0, 1.25),
    d(`${H}/candle_triple.gltf`, -3.2, -3.7, 0, 1.05),
    d(`${H}/candle_triple.gltf`, 3.2, -3.7, 0, 1.05),
    d(`${H}/candle_melted.gltf`, -3.6, 4.1, 0, 1.05),
    d(`${H}/candle_melted.gltf`, 3.6, 4.1, 0, 1.05),
  ],
  4: [
    d(`${R}/Iron_Nuggets.gltf`, -4.5, 1.8, .2, 1),
    d(`${R}/Copper_Nuggets.gltf`, 4.4, 1.4, -.2, 1),
    d(`${T}/rope_bundle_A.gltf`, -3.4, 4.8, .3, 1.05),
    d(`${T}/bucket_metal.gltf`, 3.7, 4.5, -.2, .95),
    d(`${T}/lantern.gltf`, 0, -1.5, 0, 1.05),
  ],
  5: [
    d(`${F}/rug_rectangle_pattern_B.gltf`, 0, 2.4, 0, 1.05),
    d(`${T}/blueprint.gltf`, -3.6, .8, .3, 1.1),
    d(`${T}/wrench_A.gltf`, 3.5, .6, -.4, 1.05),
    d(`${T}/hammer.gltf`, -4.4, 4.4, .2, 1),
    d(`${T}/file.gltf`, 4.4, 4.1, -.25, 1),
  ],
  6: [
    d(`${R}/Iron_Bars_Stack_Small.gltf`, -3.8, 1.1, .15, .95),
    d(`${R}/Copper_Bars_Stack_Small.gltf`, 3.8, 1.1, -.15, .95),
    d(`${T}/bucket_metal.gltf`, -4.6, 4.6, 0, 1),
    d(`${T}/hammer.gltf`, 4.4, 4.2, .35, 1.05),
    d(`${T}/tongs.gltf`, 0, 5.1, -.2, 1.05),
  ],
  7: [
    d(`${F}/rug_rectangle_stripes_A.gltf`, 0, 1.4, 0, 1.2),
    d(`${F}/chair_stool_wood.gltf`, -3.8, 4.2, .2, .9),
    d(`${F}/chair_stool_wood.gltf`, 3.8, 4.2, -.2, .9),
    d(`${T}/journal_closed.gltf`, -4.3, .3, .25, 1),
    d(`${T}/lantern.gltf`, 4.4, .5, 0, 1),
  ],
  8: [
    d(`${R}/Iron_Bars_Stack_Small.gltf`, -3.8, 1.5, .1, .95),
    d(`${R}/Copper_Bars_Stack_Small.gltf`, 3.8, 1.5, -.1, .95),
    d(`${T}/rope_bundle_A.gltf`, -4.4, 4.7, .2, 1.05),
    d(`${T}/bucket_metal.gltf`, 4.4, 4.7, 0, 1),
    d(`${F}/rug_rectangle_pattern_A.gltf`, 0, 4.3, 0, 1.05),
  ],
  9: [
    d(`${H}/candle_triple.gltf`, -4.2, .3, 0, 1.1),
    d(`${H}/candle_triple.gltf`, 4.2, .3, 0, 1.1),
    d(`${H}/skull.gltf`, -3.6, 4.2, .2, 1.05),
    d(`${H}/bone_A.gltf`, 3.8, 4.1, -.3, 1.05),
    d(`${F}/rug_round_pattern_A.gltf`, 0, 1.9, 0, 1.15),
  ],
  10: [
    d(`${H}/candle_triple.gltf`, -3.7, -1.2, 0, 1.1),
    d(`${H}/candle_triple.gltf`, 3.7, -1.2, 0, 1.1),
    d(`${H}/skull.gltf`, -3.8, 4.3, .2, 1.05),
    d(`${H}/bone_A.gltf`, 3.8, 4.3, -.2, 1.05),
    d(`${F}/rug_round_pattern_B.gltf`, 0, 2.1, 0, 1.1),
  ],
};

export function roomDecorDetails(room: number): RoomDecorDetail[] {
  return DETAILS[Math.max(1, Math.min(10, room))] ?? [];
}
