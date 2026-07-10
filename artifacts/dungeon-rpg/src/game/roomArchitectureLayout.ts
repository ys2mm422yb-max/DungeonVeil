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
const half = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/barrier_half.gltf`, x, z, rotation, scale, [3.2, 1.2]);
const wallP = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/wall_pillar.gltf`, x, z, rotation, scale, [1.65, 1.65]);
const pillar = (x: number, z: number, scale = 1) => a(`${D}/pillar_decorated.gltf`, x, z, 0, scale, [1.85, 1.85]);
// Arches and stairs frame route architecture but stay traversable so the exit lane remains open.
const arch = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/wall_arched.gltf`, x, z, rotation, scale);
const stairs = (x: number, z: number, rotation = Math.PI, scale = 1) => a(`${D}/stairs_wide.gltf`, x, z, rotation, scale);
const rubble = (x: number, z: number, rotation = 0, scale = 1) => a(`${D}/rubble_large.gltf`, x, z, rotation, scale, [4.9, 3.7]);
const stage = (x: number, z: number, rotation = 0, scale = 1, y = .11) => a(`${D}/floor_foundation_front_and_sides.gltf`, x, z, rotation, scale, undefined, y);

/**
 * Supporting architecture for chapter one. Each room has one readable spatial idea.
 * Large barriers and rubble are reserved for places where the room story actually needs them.
 */
export const ROOM_ARCHITECTURE: Record<number, RoomArchitecturePiece[]> = {
  1: [
    // Versorgungsposten: open receiving floor with rear loading markers, no stone pens.
    wallP(-7.7, -6.7, Math.PI / 2, .88),
    wallP(7.7, -6.7, -Math.PI / 2, .88),
  ],
  2: [
    // Wachstube: command area stays open; only the rear corners mark the guard post.
    wallP(-7.4, -6.2, Math.PI / 2, .9),
    wallP(7.4, -6.2, -Math.PI / 2, .9),
  ],
  3: [
    // Alte Säulenhalle: one processional axis and three surviving supports.
    arch(.4, -8.1, 0, 1.24), stairs(.4, -6.45, Math.PI, 1.02), stage(.4, -7.7, 0, 1.28),
    pillar(-5.4, -4.4, 1.02), pillar(5.5, -4.6, 1.02), pillar(5.1, 3.8, .92),
  ],
  4: [
    // Bergarbeiterlager: damaged mine edge only; hauling route remains readable and open.
    wallP(-7.6, -5.2, Math.PI / 2, .9),
    wallP(7.3, -5.8, -Math.PI / 2, .84),
  ],
  5: [
    // Werkstatt: workshop corners frame two stations without creating fake walls.
    wallP(-7.6, -5.7, Math.PI / 2, .86),
    wallP(7.1, -4.6, -Math.PI / 2, .82),
  ],
  6: [
    // Schmiede: hot and cold work zones are marked at the rear edges; the grate lane stays open.
    wallP(-7.5, -5.3, Math.PI / 2, .92),
    wallP(7.2, -5.7, -Math.PI / 2, .88),
  ],
  7: [
    // Schlafquartier: uneven sleeping bays suggested by corner posts, not four boxed cells.
    wallP(-7.6, -5.7, Math.PI / 2, .82),
    wallP(7.5, -5.2, -Math.PI / 2, .82),
    wallP(-7.6, 5.8, Math.PI / 2, .78),
  ],
  8: [
    // Materiallager: two short aisle markers create a zig-zag but never dominate the room.
    half(-6.4, -3.7, 0, .52),
    half(5.7, 2.0, Math.PI / 2, .5),
    wallP(-7.6, -6.4, Math.PI / 2, .84), wallP(7.4, 6.0, -Math.PI / 2, .8),
  ],
  9: [
    // Ritualkammer: the raised shrine is the single architectural focus.
    arch(.2, -8.1, 0, 1.28), stairs(.2, -6.35, Math.PI, 1.04), stage(.2, -7.65, 0, 1.3),
    pillar(-5.0, -4.6, 1.0), pillar(5.3, -4.7, .96),
  ],
  10: [
    // Grabwächterhalle: formal avenue and rear court; no collapse filler in the central route.
    arch(0, -8.2, 0, 1.42), stairs(0, -6.3, Math.PI, 1.16), stage(0, -7.6, 0, 1.42),
    pillar(-5.0, -4.4, 1.12), pillar(5.2, -4.7, 1.1), pillar(-5.8, 3.5, .96),
  ],
  11: [
    // Überwuchertes Gewölbe: this is a real collapse room, so one breach and one rubble mass are justified.
    arch(-1.2, -8.0, 0, 1.18), pillar(-5.7, -4.7, .96),
    rubble(5.4, -1.0, -.22, .7),
    a(`${H}/fence_broken.gltf`, -5.0, 5.5, .18, 1.0, [3, 1.15]),
  ],
  12: [
    // Blutarchiv: shelf wing left, reading court right; architecture remains wall-adjacent.
    wallP(-7.6, -6.3, Math.PI / 2, .88),
    wallP(6.9, -5.8, -Math.PI / 2, .82),
  ],
  13: [
    // Runensanktum: three research anchors around an exposed core.
    pillar(-5.8, -4.8, .92),
    pillar(5.8, -3.8, .9),
    pillar(-4.4, 5.0, .82),
  ],
  14: [
    // Wurzelkammer: broken grave route framed by fences and vegetation instead of generic dungeon rubble.
    arch(-.8, -8.0, 0, 1.14),
    a(`${H}/fence_broken.gltf`, -6.3, -1.6, Math.PI / 2, 1.02, [3, 1.15]),
    a(`${H}/fence_seperate_broken.gltf`, 5.8, 2.6, -Math.PI / 2, .94, [3, 1.15]),
  ],
  15: [
    // Schleierschrein: intact ceremonial court with one irregular side colonnade.
    arch(0, -8.1, 0, 1.32), stairs(0, -6.3, Math.PI, 1.08), stage(0, -7.65, 0, 1.34),
    pillar(-5.2, -4.5, 1.05), pillar(5.4, -4.8, 1.02), pillar(-5.8, 2.6, .92),
  ],
  16: [
    // Gebrochene Werkstatt: one surviving production divider, otherwise open damaged work floor.
    half(-6.2, -3.8, 0, .54),
    wallP(-7.5, -5.5, Math.PI / 2, .84), wallP(7.1, -4.5, -Math.PI / 2, .82),
  ],
  17: [
    // Grabgalerie: narrow ceremonial depth created by arch and supports, not rubble piles.
    arch(.5, -8.1, 0, 1.24), stairs(.5, -6.55, Math.PI, .96), stage(.5, -7.7, 0, 1.18),
    pillar(-5.4, -4.5, .98), pillar(5.6, -4.8, .96),
  ],
  18: [
    // Kristallgießerei: industrial cells are indicated by rear posts; central casting floor remains readable.
    wallP(-7.6, -5.8, Math.PI / 2, .9),
    wallP(7.2, -5.0, -Math.PI / 2, .86),
  ],
  19: [
    // Gebrochenes Ritual: one genuine rupture on the left opposes the surviving raised sanctuary.
    arch(.6, -8.15, 0, 1.34), stairs(.6, -6.4, Math.PI, 1.08), stage(.6, -7.7, 0, 1.35),
    pillar(5.3, -4.8, 1.02), rubble(-5.7, -.6, .24, .68),
    a(`${H}/fence_seperate_broken.gltf`, 4.6, 5.8, -.08, .94, [3, 1.15]),
  ],
  20: [
    // Halle des ersten Wächters: monumental rear court and asymmetric heraldic supports.
    arch(0, -8.3, 0, 1.5), stairs(0, -6.2, Math.PI, 1.24), stage(0, -7.55, 0, 1.52, .14),
    pillar(-5.6, -4.8, 1.24), pillar(5.8, -5.0, 1.2),
    pillar(-6.8, 1.1, 1.06), pillar(-5.8, 6.0, 1.0), pillar(6.3, 5.5, .94),
  ],
};

export function roomArchitecturePieces(room: number): RoomArchitecturePiece[] {
  return ROOM_ARCHITECTURE[Math.max(1, Math.min(20, room))] ?? [];
}
