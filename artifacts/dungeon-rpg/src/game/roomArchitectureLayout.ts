export type RoomArchitecturePiece = {
  model: string;
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
  collider?: readonly [number, number];
};

const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';

const a = (model: string, x: number, z: number, rotation = 0, scale = 1, collider?: readonly [number, number]): RoomArchitecturePiece => ({ model, x, z, rotation, scale, collider });
const half = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/barrier_half.gltf`, x, z, rotation, scale, [2.5, .8]);
const wallP = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/wall_pillar.gltf`, x, z, rotation, scale, [1.05, 1.05]);
const pillar = (x: number, z: number, scale = 1) => a(`${D}/pillar_decorated.gltf`, x, z, 0, scale, [1.35, 1.35]);
const arch = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/wall_arched.gltf`, x, z, rotation, scale, [3.3, .8]);
const stairs = (x: number, z: number, rotation = Math.PI, scale = 1) => a(`${D}/stairs_wide.gltf`, x, z, rotation, scale, [3.4, 1.7]);
const rubble = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/rubble_large.gltf`, x, z, rotation, scale, [1.8, 1.5]);

/**
 * Hand-authored supporting architecture for chapter one.
 * Architecture frames the room function; furniture and themed setpieces remain the visual focus.
 */
export const ROOM_ARCHITECTURE: Record<number, RoomArchitecturePiece[]> = {
  1: [
    // Supply depot: low loading lips, no stone bunkers.
    half(-6.5, -3.0, 0, .82), half(6.5, -3.0, 0, .82),
    wallP(-8.0, -7.2, Math.PI / 2, .95), wallP(8.0, -7.2, -Math.PI / 2, .95),
  ],
  2: [
    // Guard room: one low command divider and a small equipment nook.
    half(-6.0, -3.0, 0, .8), wallP(-7.7, -3.0, Math.PI / 2, .92),
    half(6.4, -3.8, Math.PI / 2, .78), wallP(7.5, -6.5, -Math.PI / 2, .92),
  ],
  3: [
    // Processional hall: four dominant columns, rear arch and a broken side remnant.
    arch(0, -8.0, 0, 1.28), stairs(0, -6.55, Math.PI, 1.05),
    pillar(-5.7, -4.8, 1.08), pillar(5.7, -4.8, 1.08),
    pillar(-5.4, 3.7, 1.02), pillar(5.8, 4.4, .94),
    rubble(-6.4, 5.5, .18, .62),
  ],
  4: [
    // Miners' staging room: architecture only marks two work edges; tools and ore dominate.
    wallP(-7.8, -3.2, Math.PI / 2, .94), wallP(7.8, -3.2, -Math.PI / 2, .94),
    half(-6.4, -2.8, 0, .76), half(6.4, -2.8, 0, .76),
    rubble(-7.1, 5.8, .2, .72),
  ],
  5: [
    // Workshop: light L-frame around the master bench and one repair marker.
    half(-6.1, -3.0, 0, .8), half(-7.25, -.8, Math.PI / 2, .78),
    wallP(-7.7, -3.0, Math.PI / 2, .92), wallP(7.5, -3.4, -Math.PI / 2, .9),
  ],
  6: [
    // Forge: paired low hearth boundaries with an open hot floor.
    half(-6.1, -3.0, 0, .82), half(6.1, -3.0, 0, .82),
    wallP(-7.7, -3.2, Math.PI / 2, .96), wallP(7.7, -3.2, -Math.PI / 2, .96),
    rubble(0, 6.6, .1, .55),
  ],
  7: [
    // Quarters: low dividers suggest bed bays without hiding the beds.
    half(-6.0, -2.8, 0, .72), half(6.0, -2.8, 0, .72),
    half(-6.0, 3.2, 0, .7), half(6.0, 3.2, 0, .7),
  ],
  8: [
    // Material vault: four low aisle markers create a loose zig-zag.
    half(-6.2, -3.0, 0, .78), half(6.2, -3.0, 0, .78),
    half(-5.8, 2.0, 0, .76), half(5.8, 5.0, 0, .76),
  ],
  9: [
    // Ritual chamber: shrine architecture only; the ritual objects own the foreground.
    arch(0, -8.0, 0, 1.3), stairs(0, -6.5, Math.PI, 1.06),
    pillar(-5.3, -4.9, 1.04), pillar(5.3, -4.9, 1.04),
  ],
  10: [
    // Guardian hall: formal rear dais and four avenue columns.
    arch(0, -8.15, 0, 1.46), stairs(0, -6.45, Math.PI, 1.2),
    pillar(-5.3, -4.8, 1.18), pillar(5.3, -4.8, 1.18),
    pillar(-6.2, 3.8, 1.04), pillar(6.2, 3.8, 1.04),
  ],
  11: [
    // Overgrown vault: broken chapel edge, asymmetric collapse.
    arch(0, -8.0, 0, 1.24), rubble(-6.0, 2.8, .2, .82), rubble(5.7, -1.8, -.2, .72),
    a(`${H}/fence_broken.gltf`, -4.0, 6.0, 0, 1.0, [2.4, 1]),
  ],
  12: [
    // Blood archive: shelf wings framed lightly around a reading court.
    wallP(-7.7, -3.0, Math.PI / 2, .92), half(-6.1, -3.0, 0, .75),
    wallP(7.7, -3.0, -Math.PI / 2, .92), half(6.1, -3.0, 0, .75),
  ],
  13: [
    // Rune sanctum: four research markers around an exposed center.
    pillar(-6.0, -5.2, .96), pillar(6.0, -5.2, .96),
    wallP(-7.2, 2.8, Math.PI / 2, .9), wallP(7.2, 2.8, -Math.PI / 2, .9),
  ],
  14: [
    // Root chamber: collapsed grave route and broken fencing, deliberately asymmetric.
    arch(0, -8.0, 0, 1.18),
    a(`${H}/fence_broken.gltf`, -6.7, -1.4, Math.PI / 2, 1.04, [1.1, 2.5]),
    rubble(-4.8, -4.1, .2, .78), rubble(4.8, 4.6, -.2, .8),
  ],
  15: [
    // Veil shrine: formal ritual focus with four framing pillars.
    arch(0, -8.0, 0, 1.34), stairs(0, -6.5, Math.PI, 1.08),
    pillar(-5.3, -4.6, 1.06), pillar(5.3, -4.6, 1.06),
    pillar(-5.8, 2.6, .96), pillar(5.8, 2.6, .96),
  ],
  16: [
    // Broken workshop: fractured work lines leave a broad beam corridor.
    half(-6.1, -3.0, 0, .76), half(6.1, -3.0, 0, .76),
    rubble(-6.2, 1.8, .3, .76), rubble(6.0, .3, -.25, .7),
  ],
  17: [
    // Grave gallery: narrow ceremonial lane with four tomb markers.
    arch(0, -8.05, 0, 1.28),
    pillar(-5.5, -4.8, 1.02), pillar(5.5, -4.8, 1.02),
    pillar(-5.8, 4.5, .94), pillar(5.8, 4.5, .94),
  ],
  18: [
    // Crystal foundry: low industrial bay boundaries, open casting floor.
    half(-6.1, -3.0, 0, .8), half(6.1, -3.0, 0, .8),
    wallP(-7.7, -3.1, Math.PI / 2, .94), wallP(7.7, -3.1, -Math.PI / 2, .94),
  ],
  19: [
    // Broken ritual: rear sanctuary and two collapsed edges around the open core.
    arch(0, -8.05, 0, 1.34), stairs(0, -6.5, Math.PI, 1.1),
    rubble(-6.0, .3, .25, .8), rubble(6.0, -.4, -.2, .8),
    a(`${H}/fence_broken.gltf`, -3.8, 6.3, 0, 1.0, [2.4, 1]),
    a(`${H}/fence_seperate_broken.gltf`, 3.8, 6.3, 0, 1.0, [2.4, 1]),
  ],
  20: [
    // First Warden: monumental rear court; central boss floor remains broad and readable.
    arch(0, -8.25, 0, 1.56), stairs(0, -6.4, Math.PI, 1.28),
    pillar(-5.8, -5.0, 1.28), pillar(5.8, -5.0, 1.28),
    pillar(-7.0, 1.0, 1.16), pillar(7.0, 1.0, 1.16),
    pillar(-6.0, 6.0, 1.08), pillar(6.0, 6.0, 1.08),
  ],
};

export function roomArchitecturePieces(room: number): RoomArchitecturePiece[] {
  return ROOM_ARCHITECTURE[Math.max(1, Math.min(20, room))] ?? [];
}
