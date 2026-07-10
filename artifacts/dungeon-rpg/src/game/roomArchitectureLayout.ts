export type RoomArchitecturePiece = {
  model: string;
  x: number;
  y?: number;
  z: number;
  rotation?: number;
  scale?: number;
  collider?: readonly [number, number];
};

const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';

const a = (model: string, x: number, z: number, rotation = 0, scale = 1, collider?: readonly [number, number], y = 0): RoomArchitecturePiece => ({ model, x, y, z, rotation, scale, collider });
const half = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/barrier_half.gltf`, x, z, rotation, scale, [2.5, .8]);
const wallP = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/wall_pillar.gltf`, x, z, rotation, scale, [1.05, 1.05]);
const pillar = (x: number, z: number, scale = 1) => a(`${D}/pillar_decorated.gltf`, x, z, 0, scale, [1.35, 1.35]);
const arch = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/wall_arched.gltf`, x, z, rotation, scale, [3.3, .8]);
const stairs = (x: number, z: number, rotation = Math.PI, scale = 1) => a(`${D}/stairs_wide.gltf`, x, z, rotation, scale, [3.4, 1.7]);
const rubble = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/rubble_large.gltf`, x, z, rotation, scale, [1.8, 1.5]);
const stage = (x: number, z: number, rotation = 0, scale = 1, y = .11) => a(`${D}/floor_foundation_front_and_sides.gltf`, x, z, rotation, scale, undefined, y);

/**
 * Hand-authored supporting architecture for chapter one.
 * Every room follows a functional story. Architecture frames routes and focal areas instead of mirroring prop islands.
 */
export const ROOM_ARCHITECTURE: Record<number, RoomArchitecturePiece[]> = {
  1: [
    // Goods entered from the rear-left, were checked at center, then stacked against the right wall.
    half(-7.0, -2.8, Math.PI / 2, .72), wallP(-7.8, -6.8, Math.PI / 2, .9),
    half(5.9, -5.0, 0, .72), wallP(7.7, -6.8, -Math.PI / 2, .9),
    rubble(-7.4, 5.6, .18, .62),
  ],
  2: [
    // Command post dominates the left-center. The right wall is only a narrow equipment cage.
    half(-4.8, -5.6, Math.PI / 2, .7), wallP(-7.2, -6.2, Math.PI / 2, .9),
    half(6.8, -3.5, Math.PI / 2, .72), wallP(7.6, -6.4, -Math.PI / 2, .9),
    half(4.9, 4.8, 0, .62),
  ],
  3: [
    // Processional nave: two intact front columns, one surviving rear column, one collapsed bay.
    arch(.4, -8.1, 0, 1.24), stairs(.4, -6.45, Math.PI, 1.02), stage(.4, -7.7, 0, 1.28),
    pillar(-5.5, -4.5, 1.06), pillar(5.7, -4.7, 1.06),
    pillar(5.4, 3.8, .96), rubble(-5.8, 3.9, .24, .82),
    wallP(-6.9, 6.3, Math.PI / 2, .86),
  ],
  4: [
    // Hauling line bends from the tool bay to the ore dump. Architecture only marks the damaged mine edge.
    wallP(-7.7, -4.8, Math.PI / 2, .9), half(-6.3, -2.8, .08, .66),
    half(4.8, 1.4, .28, .62), wallP(7.3, -5.7, -Math.PI / 2, .86),
    rubble(-6.5, 4.6, .18, .76), rubble(7.0, 5.7, -.28, .58),
  ],
  5: [
    // Master's bench is an L-shaped workshop; a cramped repair booth sits diagonally across the room.
    half(-6.1, -3.2, 0, .72), half(-7.15, -.9, Math.PI / 2, .68), wallP(-7.6, -5.8, Math.PI / 2, .88),
    half(5.6, -2.0, Math.PI / 2, .64), wallP(7.1, -4.6, -Math.PI / 2, .84),
    rubble(6.5, 5.6, -.2, .55),
  ],
  6: [
    // Forge and grinding station are intentionally unequal; the central grate remains the heat lane.
    half(-6.3, -3.0, 0, .76), wallP(-7.6, -5.2, Math.PI / 2, .94),
    half(5.4, -1.9, Math.PI / 2, .66), wallP(7.3, -5.7, -Math.PI / 2, .9),
    rubble(3.8, 6.1, -.18, .56),
  ],
  7: [
    // Sleeping bays grew around an irregular common room, not four identical cells.
    half(-6.1, -3.0, 0, .64), half(5.7, -3.8, 0, .64),
    half(-6.7, 3.0, Math.PI / 2, .62), half(5.4, 4.2, .08, .6),
    wallP(-7.8, 6.3, Math.PI / 2, .82),
  ],
  8: [
    // Staggered storage aisles create a real zig-zag route through the vault.
    half(-5.8, -4.8, 0, .7), half(5.4, -2.0, Math.PI / 2, .7),
    half(-4.6, 1.8, Math.PI / 2, .68), half(4.9, 4.8, 0, .68),
    wallP(-7.7, -6.5, Math.PI / 2, .86), wallP(7.5, 6.2, -Math.PI / 2, .82),
  ],
  9: [
    // Raised shrine is the only architectural focus. The sacrifice route remains open and visible.
    arch(.2, -8.1, 0, 1.28), stairs(.2, -6.35, Math.PI, 1.04), stage(.2, -7.65, 0, 1.3),
    pillar(-5.0, -4.6, 1.0), pillar(5.4, -4.8, .96),
    half(-4.5, 4.8, .1, .58),
  ],
  10: [
    // Guardian hall: broad avenue, one damaged crypt side and a formal elevated rear court.
    arch(0, -8.2, 0, 1.42), stairs(0, -6.3, Math.PI, 1.16), stage(0, -7.6, 0, 1.42),
    pillar(-5.0, -4.4, 1.14), pillar(5.3, -4.7, 1.12),
    pillar(-6.0, 3.5, 1.0), rubble(6.0, 3.9, -.2, .72),
  ],
  11: [
    // The old chapel collapsed from the right and roots entered through the breach.
    arch(-1.2, -8.0, 0, 1.18), pillar(-5.7, -4.7, .96),
    rubble(4.8, -2.2, -.24, .9), rubble(6.2, 2.2, -.18, .72),
    a(`${H}/fence_broken.gltf`, -5.0, 5.5, .18, 1.0, [2.4, 1]),
  ],
  12: [
    // Archive shelves form one deep wing; the other side was converted into a reading court.
    half(-6.2, -4.8, 0, .68), wallP(-7.7, -6.4, Math.PI / 2, .9),
    half(-6.7, .2, Math.PI / 2, .64),
    wallP(6.9, -5.8, -Math.PI / 2, .84), half(4.8, 4.6, .12, .58),
  ],
  13: [
    // Three research islands orbit the open rune core; one station is visibly abandoned.
    pillar(-5.7, -4.8, .94), half(-4.6, -2.8, .08, .62),
    wallP(6.4, -3.8, -Math.PI / 2, .86), half(5.3, 2.8, Math.PI / 2, .62),
    rubble(-4.8, 5.0, .2, .58),
  ],
  14: [
    // Root chamber is a broken grave route with uneven choke points.
    arch(-.8, -8.0, 0, 1.14),
    a(`${H}/fence_broken.gltf`, -6.3, -1.6, Math.PI / 2, 1.02, [1.1, 2.5]),
    a(`${H}/fence_seperate_broken.gltf`, 5.8, 2.6, -Math.PI / 2, .94, [1.1, 2.5]),
    rubble(-4.5, -4.0, .2, .76), rubble(4.4, 5.0, -.22, .82),
  ],
  15: [
    // Veil shrine: elevated ritual court, one intact side colonnade and one broken side.
    arch(0, -8.1, 0, 1.32), stairs(0, -6.3, Math.PI, 1.08), stage(0, -7.65, 0, 1.34),
    pillar(-5.2, -4.5, 1.05), pillar(5.4, -4.8, 1.02),
    pillar(-5.8, 2.6, .94), rubble(5.8, 2.8, -.2, .7),
  ],
  16: [
    // Production line snapped around the beam corridor, leaving two offset work fragments.
    half(-6.0, -4.0, .1, .68), wallP(-7.5, -5.5, Math.PI / 2, .86),
    half(5.2, -1.4, Math.PI / 2, .66), rubble(6.0, 2.1, -.26, .72),
    half(-4.2, 5.2, -.1, .58),
  ],
  17: [
    // Grave gallery narrows toward a raised funerary end; one tomb bay has collapsed inward.
    arch(.5, -8.1, 0, 1.24), stairs(.5, -6.55, Math.PI, .96), stage(.5, -7.7, 0, 1.18),
    pillar(-5.4, -4.5, .98), pillar(5.6, -4.8, .96),
    half(-6.4, 2.8, Math.PI / 2, .62), rubble(5.7, 3.8, -.2, .72),
  ],
  18: [
    // Foundry is two offset industrial cells around the casting floor; no mirrored stone pens.
    half(-6.2, -4.2, 0, .7), wallP(-7.6, -5.8, Math.PI / 2, .9),
    half(5.2, -1.8, Math.PI / 2, .66), wallP(7.2, -5.0, -Math.PI / 2, .86),
    rubble(-4.2, 5.8, .18, .55),
  ],
  19: [
    // Broken ritual court has a raised rear sanctuary and a core ripped open from the left.
    arch(.6, -8.15, 0, 1.34), stairs(.6, -6.4, Math.PI, 1.08), stage(.6, -7.7, 0, 1.35),
    pillar(5.3, -4.8, 1.02), rubble(-5.6, -2.0, .26, .9), rubble(-6.2, 2.8, .2, .68),
    a(`${H}/fence_seperate_broken.gltf`, 4.6, 5.8, -.08, .94, [2.4, 1]),
  ],
  20: [
    // First Warden court rises toward a monumental rear dais. Side architecture is intentionally uneven from old damage.
    arch(0, -8.3, 0, 1.5), stairs(0, -6.2, Math.PI, 1.24), stage(0, -7.55, 0, 1.52, .14),
    pillar(-5.6, -4.8, 1.24), pillar(5.8, -5.0, 1.2),
    pillar(-6.8, 1.1, 1.08), rubble(6.6, 1.8, -.18, .72),
    pillar(-5.8, 6.0, 1.02), pillar(6.3, 5.5, .96),
  ],
};

export function roomArchitecturePieces(room: number): RoomArchitecturePiece[] {
  return ROOM_ARCHITECTURE[Math.max(1, Math.min(20, room))] ?? [];
}
