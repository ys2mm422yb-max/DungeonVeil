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
const col = (x: number, z: number, scale = 1) => a(`${D}/barrier_column.gltf`, x, z, 0, scale, [1, 1]);
const wallP = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/wall_pillar.gltf`, x, z, rotation, scale, [1.05, 1.05]);
const pillar = (x: number, z: number, scale = 1) => a(`${D}/pillar_decorated.gltf`, x, z, 0, scale, [1.35, 1.35]);
const arch = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/wall_arched.gltf`, x, z, rotation, scale, [3.3, .8]);
const stairs = (x: number, z: number, rotation = Math.PI, scale = 1) => a(`${D}/stairs_wide.gltf`, x, z, rotation, scale, [3.4, 1.7]);
const rubble = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/rubble_large.gltf`, x, z, rotation, scale, [1.8, 1.5]);

/**
 * Hand-authored room architecture for chapter one.
 * These pieces define the room silhouette and combat lanes; furniture remains in roomSetpieceLayout.
 */
export const ROOM_ARCHITECTURE: Record<number, RoomArchitecturePiece[]> = {
  1: [
    // Supply depot: two deep storage bays and a broad unloading lane.
    half(-6.6, -2.8), col(-5.0, -2.8), half(-7.5, .2, Math.PI / 2),
    half(6.6, -2.8), col(5.0, -2.8), half(7.5, .2, Math.PI / 2),
    wallP(-8.0, -7.5, Math.PI / 2, 1.08), wallP(8.0, -7.5, -Math.PI / 2, 1.08),
    rubble(-8.0, 5.9, .2, .72), rubble(8.0, 6.4, -.2, .62),
  ],
  2: [
    // Guard room: command office left, equipment cage right, center kept as drill floor.
    wallP(-7.8, -2.6, Math.PI / 2, 1.06), half(-6.15, -2.6), col(-4.55, -2.6),
    wallP(7.8, -2.6, -Math.PI / 2, 1.06), half(6.15, -2.6), col(4.55, -2.6),
    half(-7.35, 2.4, Math.PI / 2), half(7.35, 2.4, Math.PI / 2),
    pillar(-8.0, 6.4, 1.04), pillar(8.0, 6.4, 1.04),
  ],
  3: [
    // Processional hall: true nave with side aisles and a raised destination.
    arch(0, -8.0, 0, 1.34), stairs(0, -6.5, Math.PI, 1.15),
    pillar(-5.8, -5.2, 1.2), pillar(5.8, -5.2, 1.2),
    pillar(-5.8, .4, 1.16), pillar(5.8, .4, 1.16),
    pillar(-5.8, 5.9, 1.12), pillar(5.8, 5.9, 1.12),
    half(-7.25, -2.2, Math.PI / 2), half(7.25, -2.2, Math.PI / 2),
    half(-7.25, 3.5, Math.PI / 2), half(7.25, 3.5, Math.PI / 2),
  ],
  4: [
    // Miners' staging room: two work bays, hauling corridor, damaged rear wall.
    wallP(-7.8, -2.9, Math.PI / 2), half(-6.2, -2.9), col(-4.6, -2.9),
    wallP(7.8, -2.9, -Math.PI / 2), half(6.2, -2.9), col(4.6, -2.9),
    half(-7.3, 2.5, Math.PI / 2), half(7.3, 2.5, Math.PI / 2),
    rubble(-7.6, 5.6, .2, .9), rubble(7.3, 5.9, -.22, .82),
    wallP(-4.2, 7.0, 0, 1.04), wallP(4.2, 7.0, 0, 1.04),
  ],
  5: [
    // Workshop: L-shaped master bench enclosure and isolated repair booth.
    wallP(-7.8, -2.8, Math.PI / 2), half(-6.2, -2.8), col(-4.6, -2.8),
    half(-7.3, .1, Math.PI / 2), half(-7.3, 2.7, Math.PI / 2),
    wallP(4.4, -2.8), half(6.0, -2.8), wallP(7.6, -2.8),
    half(7.3, .2, Math.PI / 2),
    rubble(7.5, 6.1, -.2, .62), wallP(-5.0, 6.8, 0, 1.03),
  ],
  6: [
    // Forge: paired stone work cells with a broad central heat lane.
    wallP(-7.8, -2.9, Math.PI / 2, 1.1), half(-6.2, -2.9, 0, 1.08), col(-4.55, -2.9, 1.08),
    wallP(7.8, -2.9, -Math.PI / 2, 1.1), half(6.2, -2.9, 0, 1.08), col(4.55, -2.9, 1.08),
    half(-7.35, 2.2, Math.PI / 2, 1.05), half(7.35, 2.2, Math.PI / 2, 1.05),
    pillar(-7.6, 6.2, 1.12), pillar(7.6, 6.2, 1.12),
    rubble(-4.8, 7.0, .18, .7), rubble(4.8, 7.0, -.18, .7),
  ],
  7: [
    // Quarters: four sleeping bays around a common room.
    half(-6.2, -2.6), col(-4.6, -2.6), half(6.2, -2.6), col(4.6, -2.6),
    half(-7.3, .6, Math.PI / 2), half(7.3, .6, Math.PI / 2),
    half(-6.2, 3.4), col(-4.6, 3.4), half(6.2, 3.4), col(4.6, 3.4),
    wallP(-8.0, 6.6, Math.PI / 2), wallP(8.0, 6.6, -Math.PI / 2),
  ],
  8: [
    // Material vault: three staggered storage aisles create a deliberate zig-zag route.
    wallP(-8.0, -2.9, Math.PI / 2), half(-6.35, -2.9), col(-4.75, -2.9),
    col(4.75, -2.9), half(6.35, -2.9), wallP(8.0, -2.9, -Math.PI / 2),
    wallP(-7.8, 2.2, Math.PI / 2), half(-6.15, 2.2), col(-4.55, 2.2),
    col(4.55, 5.4), half(6.15, 5.4), wallP(7.8, 5.4, -Math.PI / 2),
  ],
  9: [
    // Ritual chamber: narrow nave, raised shrine, candle court and a clean sacrifice axis.
    arch(0, -8.0, 0, 1.38), stairs(0, -6.45, Math.PI, 1.18),
    pillar(-5.5, -5.1, 1.22), pillar(5.5, -5.1, 1.22),
    half(-6.8, -1.7, Math.PI / 2), half(6.8, -1.7, Math.PI / 2),
    pillar(-5.7, 3.2, 1.08), pillar(5.7, 3.2, 1.08),
    half(-4.2, 6.5), half(4.2, 6.5),
  ],
  10: [
    // Guardian hall: long crypt avenue and a formal boss dais.
    arch(0, -8.15, 0, 1.52), stairs(0, -6.35, Math.PI, 1.3),
    pillar(-5.1, -5.4, 1.34), pillar(5.1, -5.4, 1.34),
    half(-7.2, -1.6, Math.PI / 2, 1.08), half(7.2, -1.6, Math.PI / 2, 1.08),
    half(-7.2, 3.5, Math.PI / 2, 1.08), half(7.2, 3.5, Math.PI / 2, 1.08),
    pillar(-5.1, 5.8, 1.22), pillar(5.1, 5.8, 1.22),
  ],
  11: [
    // Overgrown vault: broken chapel geometry invaded from both flanks.
    arch(0, -8.0, 0, 1.35), pillar(-5.8, -5.2, 1.18), pillar(5.8, -5.2, 1.18),
    half(-7.2, -1.5, Math.PI / 2), half(7.2, 1.8, Math.PI / 2),
    rubble(-6.3, 3.8, .2, 1.0), rubble(6.0, -1.8, -.2, .95),
    a(`${H}/fence_broken.gltf`, -3.8, 6.0, 0, 1.05, [2.4, 1]),
  ],
  12: [
    // Blood archive: central reading court with sealed shelf wings.
    arch(0, -8.0, 0, 1.28),
    wallP(-7.8, -2.8, Math.PI / 2), half(-6.2, -2.8), col(-4.6, -2.8),
    wallP(7.8, -2.8, -Math.PI / 2), half(6.2, -2.8), col(4.6, -2.8),
    half(-7.2, 3.0, Math.PI / 2), half(7.2, 3.0, Math.PI / 2),
    pillar(-4.2, 6.4, 1.08), pillar(4.2, 6.4, 1.08),
  ],
  13: [
    // Rune sanctum: three framed research islands around a dangerous center.
    pillar(-6.0, -5.4, 1.1), pillar(6.0, -5.4, 1.1),
    half(-6.0, -2.8), half(6.0, -2.8),
    wallP(-7.4, 2.4, Math.PI / 2), wallP(7.4, 2.4, -Math.PI / 2),
    half(-4.8, 5.5), half(4.8, 5.5),
    rubble(0, 6.8, 0, .72),
  ],
  14: [
    // Root chamber: collapsed grave hall with asymmetric choke points.
    arch(0, -8.0, 0, 1.24),
    a(`${H}/fence_broken.gltf`, -6.8, -1.4, Math.PI / 2, 1.1, [1.1, 2.5]),
    a(`${H}/fence_seperate_broken.gltf`, 6.8, 2.0, -Math.PI / 2, 1.1, [1.1, 2.5]),
    rubble(-4.8, -4.4, .2, .92), rubble(4.9, 4.8, -.2, .94),
    pillar(-7.3, 6.0, 1.06), pillar(7.3, -5.4, 1.06),
  ],
  15: [
    // Veil shrine: formal ring around a raised central ritual focus.
    arch(0, -8.0, 0, 1.42), stairs(0, -6.45, Math.PI, 1.18),
    pillar(-5.6, -4.7, 1.2), pillar(5.6, -4.7, 1.2),
    pillar(-6.2, 1.0, 1.12), pillar(6.2, 1.0, 1.12),
    half(-4.6, 5.2), half(4.6, 5.2),
    wallP(-7.6, 6.7, Math.PI / 2), wallP(7.6, 6.7, -Math.PI / 2),
  ],
  16: [
    // Broken workshop: fractured production lanes and a central beam corridor.
    wallP(-7.8, -2.8, Math.PI / 2), half(-6.2, -2.8), col(-4.6, -2.8),
    wallP(7.8, -2.8, -Math.PI / 2), half(6.2, -2.8), col(4.6, -2.8),
    rubble(-6.5, 1.8, .3, .9), rubble(6.3, .2, -.25, .82),
    half(-5.0, 5.4), half(5.0, 5.4),
    pillar(0, 7.0, 1.08),
  ],
  17: [
    // Grave gallery: narrow funerary lane with side tomb bays.
    arch(0, -8.1, 0, 1.36),
    pillar(-5.4, -5.2, 1.18), pillar(5.4, -5.2, 1.18),
    half(-7.1, -1.5, Math.PI / 2), half(7.1, -1.5, Math.PI / 2),
    half(-7.1, 3.7, Math.PI / 2), half(7.1, 3.7, Math.PI / 2),
    pillar(-5.2, 6.2, 1.12), pillar(5.2, 6.2, 1.12),
  ],
  18: [
    // Crystal foundry: paired industrial bays around an exposed central casting floor.
    wallP(-7.8, -2.9, Math.PI / 2, 1.08), half(-6.2, -2.9, 0, 1.06), col(-4.6, -2.9, 1.06),
    wallP(7.8, -2.9, -Math.PI / 2, 1.08), half(6.2, -2.9, 0, 1.06), col(4.6, -2.9, 1.06),
    half(-7.3, 2.6, Math.PI / 2), half(7.3, 2.6, Math.PI / 2),
    pillar(-5.2, 6.3, 1.1), pillar(5.2, 6.3, 1.1),
  ],
  19: [
    // Broken ritual: shattered sanctuary with an open, dangerous core.
    arch(0, -8.1, 0, 1.44), stairs(0, -6.5, Math.PI, 1.2),
    pillar(-5.7, -4.8, 1.22), pillar(5.7, -4.8, 1.22),
    rubble(-6.2, .2, .25, 1.0), rubble(6.2, -.4, -.2, 1.0),
    half(-7.0, 3.4, Math.PI / 2), half(7.0, 3.4, Math.PI / 2),
    a(`${H}/fence_broken.gltf`, -3.8, 6.4, 0, 1.05, [2.4, 1]),
    a(`${H}/fence_seperate_broken.gltf`, 3.8, 6.4, 0, 1.05, [2.4, 1]),
  ],
  20: [
    // First Warden arena: ceremonial approach, broad boss court, monumental rear dais.
    arch(0, -8.3, 0, 1.62), stairs(0, -6.35, Math.PI, 1.34),
    pillar(-6.0, -5.3, 1.4), pillar(6.0, -5.3, 1.4),
    pillar(-7.2, .4, 1.3), pillar(7.2, .4, 1.3),
    half(-8.0, 3.4, Math.PI / 2, 1.12), half(8.0, 3.4, Math.PI / 2, 1.12),
    pillar(-6.0, 6.4, 1.28), pillar(6.0, 6.4, 1.28),
    rubble(-8.1, 7.0, .15, .78), rubble(8.1, 7.0, -.15, .78),
  ],
};

export function roomArchitecturePieces(room: number): RoomArchitecturePiece[] {
  return ROOM_ARCHITECTURE[Math.max(1, Math.min(20, room))] ?? [];
}
