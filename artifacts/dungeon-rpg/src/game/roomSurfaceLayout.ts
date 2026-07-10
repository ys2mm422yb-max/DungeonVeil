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

/**
 * Floor composition is the visual route/story of the room. These pieces never add gameplay collision.
 * They connect functional zones so the room reads as one place instead of detached prop islands.
 */
export const ROOM_SURFACES: Record<number, RoomSurfacePiece[]> = {
  1: [
    s(`${D}/floor_wood_large_dark.gltf`, -4.2, -4.2, 0, 1.05), s(`${D}/floor_wood_large.gltf`, 0, -1.1, Math.PI / 2, 1.04), s(`${D}/floor_wood_large_dark.gltf`, 4.2, -4.2, Math.PI, 1.05),
    s(`${D}/floor_dirt_small_A.gltf`, -6.4, 2.6, .2, 1.15), s(`${D}/floor_dirt_small_C.gltf`, 5.8, 3.5, -.25, 1.05),
  ],
  2: [
    s(`${F}/rug_rectangle_stripes_B.gltf`, -2.2, -3.4, 0, 1.45, .018), s(`${D}/floor_wood_large_dark.gltf`, -2.2, -5.3, 0, 1.1),
    s(`${D}/floor_tile_large_rocks.gltf`, 5.6, -4.8, Math.PI / 2, 1.0), s(`${D}/floor_dirt_small_B.gltf`, 4.8, 2.8, -.2, 1.0),
  ],
  3: [
    s(`${D}/floor_tile_small_decorated.gltf`, 0, 5.8, 0, 1.2), s(`${D}/floor_tile_large.gltf`, 0, 2.2, 0, 1.12), s(`${D}/floor_tile_small_decorated.gltf`, 0, -1.4, Math.PI, 1.2), s(`${D}/floor_tile_large_rocks.gltf`, 0, -5.2, Math.PI / 2, 1.08),
    s(`${D}/floor_dirt_small_corner.gltf`, -5.7, 1.3, .2, 1.0),
  ],
  4: [
    s(`${D}/floor_wood_large_dark.gltf`, -5.8, -4.8, .08, 1.0), s(`${D}/floor_wood_large.gltf`, -2.0, -1.6, .22, 1.0), s(`${D}/floor_wood_large_dark.gltf`, 1.8, 1.4, .22, 1.0), s(`${D}/floor_wood_large.gltf`, 5.6, 4.2, .2, 1.0),
    s(`${D}/floor_dirt_large_rocky.gltf`, 5.8, -4.7, -.1, 1.0), s(`${D}/floor_dirt_small_D.gltf`, -5.2, 4.8, .15, 1.15),
  ],
  5: [
    s(`${D}/floor_wood_large_dark.gltf`, -5.4, -5.0, 0, 1.16), s(`${D}/floor_wood_large.gltf`, -2.4, -3.1, Math.PI / 2, 1.02), s(`${D}/floor_wood_large_dark.gltf`, 4.7, -3.8, Math.PI / 2, .95),
    s(`${D}/floor_dirt_small_A.gltf`, 6.2, 3.8, -.2, 1.0),
  ],
  6: [
    s(`${D}/floor_tile_extralarge_grates.gltf`, 0, -1.6, 0, 1.1), s(`${D}/floor_tile_big_grate.gltf`, -5.4, -5.0, 0, 1.0), s(`${D}/floor_tile_big_grate.gltf`, 5.3, -4.6, Math.PI / 2, 1.0),
    s(`${D}/floor_dirt_large_rocky.gltf`, -6.2, 2.5, .15, .9), s(`${D}/floor_dirt_large_rocky.gltf`, 5.8, 3.8, -.2, .9),
  ],
  7: [
    s(`${F}/rug_rectangle_A.gltf`, 0, 1.0, 0, 1.55, .018), s(`${D}/floor_wood_large_dark.gltf`, -5.6, -5.2, 0, 1.0), s(`${D}/floor_wood_large.gltf`, 5.5, -5.1, Math.PI, 1.0),
    s(`${D}/floor_wood_large.gltf`, -5.0, 4.0, Math.PI / 2, .9), s(`${D}/floor_wood_large_dark.gltf`, 5.0, 4.1, Math.PI / 2, .9),
  ],
  8: [
    s(`${D}/floor_wood_large_dark.gltf`, -5.2, -5.0, 0, 1.0), s(`${D}/floor_wood_large.gltf`, 1.2, -1.8, Math.PI / 2, 1.0), s(`${D}/floor_wood_large_dark.gltf`, -2.0, 2.0, 0, 1.0), s(`${D}/floor_wood_large.gltf`, 5.0, 5.0, Math.PI / 2, 1.0),
  ],
  9: [
    s(`${H}/path_A.gltf`, 0, 6.0, 0, 1.4), s(`${H}/path_B.gltf`, 0, 2.3, 0, 1.4), s(`${H}/path_C.gltf`, 0, -1.4, 0, 1.4), s(`${H}/path_D.gltf`, 0, -5.0, 0, 1.4),
    s(`${D}/floor_tile_small_decorated.gltf`, 0, -7.0, 0, 1.25),
  ],
  10: [
    s(`${D}/floor_tile_small_decorated.gltf`, 0, 6.0, 0, 1.25), s(`${D}/floor_tile_large.gltf`, 0, 2.2, 0, 1.15), s(`${D}/floor_tile_small_decorated.gltf`, 0, -1.6, Math.PI, 1.25), s(`${D}/floor_tile_large_rocks.gltf`, 0, -5.3, 0, 1.1),
    s(`${H}/floor_dirt_grave.gltf`, -6.0, -1.0, 0, 1.0), s(`${H}/floor_dirt_grave.gltf`, 6.0, 2.8, Math.PI, 1.0),
  ],
  11: [
    s(`${D}/floor_tile_small_weeds_A.gltf`, -5.3, -4.6, 0, 1.15), s(`${D}/floor_tile_small_weeds_B.gltf`, -1.5, -1.6, .2, 1.1), s(`${D}/floor_dirt_large_rocky.gltf`, 3.0, 1.5, -.25, 1.0), s(`${D}/floor_tile_small_weeds_A.gltf`, 6.0, 4.8, Math.PI, 1.1),
  ],
  12: [
    s(`${D}/floor_wood_large_dark.gltf`, -5.0, -4.6, 0, 1.1), s(`${D}/floor_wood_large_dark.gltf`, 5.0, -4.6, Math.PI, 1.1), s(`${F}/rug_rectangle_B.gltf`, 0, -1.0, 0, 1.45, .018), s(`${D}/floor_wood_large.gltf`, 0, 3.4, Math.PI / 2, 1.0),
  ],
  13: [
    s(`${D}/floor_tile_big_grate.gltf`, -5.4, -4.4, 0, 1.0), s(`${D}/floor_tile_big_grate.gltf`, 5.4, -4.4, Math.PI / 2, 1.0), s(`${D}/floor_tile_extralarge_grates_open.gltf`, 0, .4, 0, 1.05), s(`${D}/floor_tile_small_decorated.gltf`, 0, 5.2, 0, 1.2),
  ],
  14: [
    s(`${H}/floor_dirt_grave.gltf`, -4.8, -4.6, .15, 1.15), s(`${H}/path_C.gltf`, -1.0, -1.0, .18, 1.25), s(`${H}/floor_dirt_grave.gltf`, 3.2, 2.2, -.2, 1.15), s(`${H}/path_D.gltf`, 5.8, 5.2, -.25, 1.15),
  ],
  15: [
    s(`${H}/path_A.gltf`, 0, 6.0, 0, 1.45), s(`${H}/path_B.gltf`, 0, 2.3, 0, 1.45), s(`${D}/floor_tile_small_decorated.gltf`, 0, -1.7, 0, 1.3), s(`${D}/floor_tile_large_rocks.gltf`, 0, -5.5, 0, 1.12),
  ],
  16: [
    s(`${D}/floor_wood_large_dark.gltf`, -5.4, -4.6, 0, 1.0), s(`${D}/floor_tile_big_grate_open.gltf`, 0, -1.0, 0, 1.1), s(`${D}/floor_wood_large.gltf`, 5.1, -3.8, Math.PI / 2, 1.0), s(`${D}/floor_dirt_large_rocky.gltf`, -2.2, 4.2, .2, 1.0),
  ],
  17: [
    s(`${H}/path_A.gltf`, 0, 6.0, 0, 1.25), s(`${H}/path_B.gltf`, 0, 2.5, 0, 1.25), s(`${H}/path_C.gltf`, 0, -1.0, 0, 1.25), s(`${H}/floor_dirt_grave.gltf`, -5.8, -3.8, .1, 1.0), s(`${H}/floor_dirt_grave.gltf`, 5.8, 3.8, -.1, 1.0),
  ],
  18: [
    s(`${D}/floor_tile_extralarge_grates.gltf`, 0, .5, 0, 1.15), s(`${D}/floor_tile_big_grate.gltf`, -5.2, -4.6, 0, 1.05), s(`${D}/floor_tile_big_grate.gltf`, 5.2, -4.6, Math.PI / 2, 1.05), s(`${D}/floor_dirt_large_rocky.gltf`, 0, 5.3, 0, .9),
  ],
  19: [
    s(`${H}/path_D.gltf`, 0, 6.0, 0, 1.45), s(`${H}/path_C.gltf`, 0, 2.5, 0, 1.45), s(`${H}/floor_dirt_grave.gltf`, -3.8, -1.0, .18, 1.15), s(`${H}/floor_dirt_grave.gltf`, 3.8, -1.0, -.18, 1.15), s(`${D}/floor_tile_small_broken_A.gltf`, 0, -5.5, 0, 1.25),
  ],
  20: [
    s(`${D}/floor_tile_small_decorated.gltf`, 0, 6.2, 0, 1.35), s(`${D}/floor_tile_large.gltf`, 0, 2.5, 0, 1.25), s(`${D}/floor_tile_small_decorated.gltf`, 0, -1.4, Math.PI, 1.35), s(`${D}/floor_tile_large_rocks.gltf`, 0, -5.4, 0, 1.18),
    s(`${D}/floor_foundation_front_and_sides.gltf`, 0, -7.5, 0, 1.35, .12),
  ],
};

export function roomSurfacePieces(room: number): RoomSurfacePiece[] {
  return ROOM_SURFACES[Math.max(1, Math.min(20, room))] ?? [];
}
