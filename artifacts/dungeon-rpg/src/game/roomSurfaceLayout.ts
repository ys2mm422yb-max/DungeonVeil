export type RoomSurfacePiece = {
  model: string;
  x: number;
  y?: number;
  z: number;
  rotation?: number;
  scale?: number;
};

const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
const F = 'furniture/Assets/gltf';
const s = (model: string, x: number, z: number, rotation = 0, scale = 1, y = 0.015): RoomSurfacePiece => ({ model, x, y, z, rotation, scale });

/** Floor pieces describe the route through each authored room and never add collision. */
export const ROOM_SURFACES: Record<number, RoomSurfacePiece[]> = {
  1: [
    // Receiving route: unloading left -> inspection center -> sorted storage right.
    s(`${D}/floor_wood_large_dark.gltf`, -5.8, -5.4, .08, 1.04),
    s(`${D}/floor_wood_large.gltf`, -2.7, -4.2, .08, 1.04),
    s(`${D}/floor_wood_large.gltf`, .5, -3.2, Math.PI / 2, 1.04),
    s(`${D}/floor_wood_large_dark.gltf`, 3.7, -4.2, -.08, 1.04),
    s(`${D}/floor_wood_large_dark.gltf`, 6.2, -5.5, -.08, 1.0),
  ],
  2: [
    // One command court; equipment alcove is deliberately secondary.
    s(`${D}/floor_wood_large_dark.gltf`, -2.0, -4.2, 0, 1.25),
    s(`${F}/rug_rectangle_stripes_B.gltf`, -2.0, -3.8, 0, 1.38, .018),
    s(`${D}/floor_tile_small_decorated.gltf`, 5.8, -5.0, Math.PI / 2, 1.05),
  ],
  3: [
    // Ceremonial nave.
    s(`${D}/floor_tile_small_decorated.gltf`, 0, 6.0, 0, 1.25),
    s(`${D}/floor_tile_large.gltf`, 0, 2.5, 0, 1.18),
    s(`${D}/floor_tile_small_decorated.gltf`, 0, -1.2, Math.PI, 1.25),
    s(`${D}/floor_tile_large.gltf`, 0, -4.9, Math.PI / 2, 1.16),
  ],
  4: [
    // Continuous diagonal hauling line.
    s(`${D}/floor_wood_large_dark.gltf`, -5.8, -5.2, .16, 1.0),
    s(`${D}/floor_wood_large.gltf`, -3.0, -3.0, .18, 1.0),
    s(`${D}/floor_wood_large_dark.gltf`, -.2, -.7, .18, 1.0),
    s(`${D}/floor_wood_large.gltf`, 2.7, 1.5, .18, 1.0),
    s(`${D}/floor_wood_large_dark.gltf`, 5.5, 3.8, .18, 1.0),
    s(`${D}/floor_dirt_large_rocky.gltf`, 6.1, -5.4, -.12, .9),
  ],
  5: [
    // L-shaped workshop floor connects master bench and repair station.
    s(`${D}/floor_wood_large_dark.gltf`, -5.4, -5.0, 0, 1.12),
    s(`${D}/floor_wood_large.gltf`, -2.2, -4.0, Math.PI / 2, 1.06),
    s(`${D}/floor_wood_large.gltf`, 1.0, -2.9, Math.PI / 2, 1.04),
    s(`${D}/floor_wood_large_dark.gltf`, 4.2, -1.8, Math.PI / 2, 1.02),
  ],
  6: [
    // Hot lane from anvil through central grates to finishing station.
    s(`${D}/floor_tile_big_grate.gltf`, -5.2, -5.0, 0, 1.05),
    s(`${D}/floor_tile_extralarge_grates.gltf`, -1.4, -3.0, 0, 1.08),
    s(`${D}/floor_tile_extralarge_grates.gltf`, 1.8, -1.4, 0, 1.08),
    s(`${D}/floor_tile_big_grate.gltf`, 5.1, -1.0, Math.PI / 2, 1.05),
  ],
  7: [
    // Common room binds the uneven sleeping bays together.
    s(`${F}/rug_rectangle_A.gltf`, 0, .8, 0, 1.62, .018),
    s(`${D}/floor_wood_large_dark.gltf`, -5.7, -5.4, 0, 1.0),
    s(`${D}/floor_wood_large.gltf`, 5.5, -5.1, Math.PI, 1.0),
    s(`${D}/floor_wood_large.gltf`, -5.2, 4.2, Math.PI / 2, .95),
    s(`${D}/floor_wood_large_dark.gltf`, 5.0, 4.1, Math.PI / 2, .95),
  ],
  8: [
    // Three warehouse lanes connected by a single cross-route.
    s(`${D}/floor_wood_large_dark.gltf`, -5.6, -5.2, 0, 1.02),
    s(`${D}/floor_wood_large.gltf`, -2.4, -5.2, 0, 1.02),
    s(`${D}/floor_wood_large_dark.gltf`, .8, -5.2, 0, 1.02),
    s(`${D}/floor_wood_large.gltf`, 4.0, -5.2, 0, 1.02),
    s(`${D}/floor_wood_large_dark.gltf`, -3.6, -.9, Math.PI / 2, 1.02),
    s(`${D}/floor_wood_large.gltf`, -.4, -.9, Math.PI / 2, 1.02),
    s(`${D}/floor_wood_large_dark.gltf`, 2.8, -.9, Math.PI / 2, 1.02),
    s(`${D}/floor_wood_large.gltf`, 5.6, 3.7, 0, 1.0),
  ],
  9: [
    s(`${H}/path_A.gltf`, 0, 6.0, 0, 1.4), s(`${H}/path_B.gltf`, 0, 2.3, 0, 1.4), s(`${H}/path_C.gltf`, 0, -1.4, 0, 1.4), s(`${H}/path_D.gltf`, 0, -5.0, 0, 1.4),
    s(`${D}/floor_tile_small_decorated.gltf`, 0, -7.0, 0, 1.25),
  ],
  10: [
    s(`${D}/floor_tile_small_decorated.gltf`, 0, 6.0, 0, 1.25), s(`${D}/floor_tile_large.gltf`, 0, 2.2, 0, 1.15), s(`${D}/floor_tile_small_decorated.gltf`, 0, -1.6, Math.PI, 1.25), s(`${D}/floor_tile_large.gltf`, 0, -5.3, 0, 1.1),
    s(`${H}/floor_dirt_grave.gltf`, -6.0, -1.0, 0, 1.0), s(`${H}/floor_dirt_grave.gltf`, 6.0, 2.8, Math.PI, 1.0),
  ],
  11: [
    s(`${D}/floor_tile_small_weeds_A.gltf`, -5.3, -4.6, 0, 1.15), s(`${D}/floor_tile_small_weeds_B.gltf`, -1.5, -1.6, .2, 1.1), s(`${D}/floor_dirt_large_rocky.gltf`, 2.0, .8, -.25, 1.0), s(`${D}/floor_tile_small_weeds_A.gltf`, 5.6, 4.4, Math.PI, 1.1),
  ],
  12: [
    s(`${D}/floor_wood_large_dark.gltf`, -5.2, -4.8, 0, 1.1), s(`${D}/floor_wood_large_dark.gltf`, -2.0, -4.8, 0, 1.1), s(`${F}/rug_rectangle_B.gltf`, 0, -1.0, 0, 1.45, .018), s(`${D}/floor_wood_large.gltf`, 2.4, 2.4, Math.PI / 2, 1.0), s(`${D}/floor_wood_large.gltf`, 5.4, 3.8, Math.PI / 2, 1.0),
  ],
  13: [
    s(`${D}/floor_tile_big_grate.gltf`, -5.4, -4.4, 0, 1.0), s(`${D}/floor_tile_big_grate.gltf`, 5.4, -4.4, Math.PI / 2, 1.0), s(`${D}/floor_tile_extralarge_grates_open.gltf`, 0, .4, 0, 1.05), s(`${D}/floor_tile_small_decorated.gltf`, 0, 5.2, 0, 1.2),
  ],
  14: [
    s(`${H}/floor_dirt_grave.gltf`, -4.8, -4.6, .15, 1.15), s(`${H}/path_C.gltf`, -1.0, -1.0, .18, 1.25), s(`${H}/floor_dirt_grave.gltf`, 3.2, 2.2, -.2, 1.15), s(`${H}/path_D.gltf`, 5.8, 5.2, -.25, 1.15),
  ],
  15: [
    s(`${H}/path_A.gltf`, 0, 6.0, 0, 1.45), s(`${H}/path_B.gltf`, 0, 2.3, 0, 1.45), s(`${D}/floor_tile_small_decorated.gltf`, 0, -1.7, 0, 1.3), s(`${D}/floor_tile_large.gltf`, 0, -5.5, 0, 1.12),
  ],
  16: [
    s(`${D}/floor_wood_large_dark.gltf`, -5.4, -4.6, 0, 1.0), s(`${D}/floor_wood_large.gltf`, -2.2, -3.4, 0, 1.0), s(`${D}/floor_tile_big_grate_open.gltf`, .8, -1.4, 0, 1.1), s(`${D}/floor_wood_large.gltf`, 4.6, -1.4, Math.PI / 2, 1.0),
  ],
  17: [
    s(`${H}/path_A.gltf`, 0, 6.0, 0, 1.25), s(`${H}/path_B.gltf`, 0, 2.5, 0, 1.25), s(`${H}/path_C.gltf`, 0, -1.0, 0, 1.25), s(`${H}/path_D.gltf`, 0, -4.5, 0, 1.25), s(`${H}/floor_dirt_grave.gltf`, -5.8, -3.8, .1, 1.0),
  ],
  18: [
    s(`${D}/floor_tile_big_grate.gltf`, -5.2, -4.6, 0, 1.05), s(`${D}/floor_tile_extralarge_grates.gltf`, -1.7, -2.4, 0, 1.15), s(`${D}/floor_tile_extralarge_grates.gltf`, 1.8, .1, 0, 1.15), s(`${D}/floor_tile_big_grate.gltf`, 5.2, -2.0, Math.PI / 2, 1.05),
  ],
  19: [
    s(`${H}/path_D.gltf`, 0, 6.0, 0, 1.45), s(`${H}/path_C.gltf`, 0, 2.5, 0, 1.45), s(`${H}/floor_dirt_grave.gltf`, -3.8, -1.0, .18, 1.15), s(`${D}/floor_tile_small_broken_A.gltf`, -.8, -4.6, 0, 1.25), s(`${D}/floor_tile_small_decorated.gltf`, .6, -6.7, 0, 1.25),
  ],
  20: [
    s(`${D}/floor_tile_small_decorated.gltf`, 0, 6.2, 0, 1.35), s(`${D}/floor_tile_large.gltf`, 0, 2.5, 0, 1.25), s(`${D}/floor_tile_small_decorated.gltf`, 0, -1.4, Math.PI, 1.35), s(`${D}/floor_tile_large.gltf`, 0, -5.4, 0, 1.18),
    s(`${D}/floor_foundation_front_and_sides.gltf`, 0, -7.5, 0, 1.35, .12),
  ],
};

export function roomSurfacePieces(room: number): RoomSurfacePiece[] {
  return ROOM_SURFACES[Math.max(1, Math.min(20, room))] ?? [];
}
