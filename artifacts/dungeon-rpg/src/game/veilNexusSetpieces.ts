import type { RoomSetpiece } from './roomSetpieceLayout';

const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';

const p = (
  model: string,
  x: number,
  z: number,
  rotation = 0,
  scale = 1,
  collider?: readonly [number, number],
  y = 0,
): RoomSetpiece & { y?: number } => ({ model, x, y, z, rotation, scale, collider });

const column = (x: number, z: number, scale = 1) =>
  p(`${D}/barrier_column.gltf`, x, z, 0, scale, [0.9 * scale, 0.9 * scale]);
const portal = (x: number, z: number, rotation = 0, scale = 1) =>
  p(`${D}/wall_corner_gated.gltf`, x, z, rotation, scale, [1.4 * scale, 0.7 * scale]);
const crystal = (x: number, z: number, scale = 1) =>
  p(`${R}/Crystal_Large.gltf`, x, z, 0, scale, [0.8 * scale, 0.8 * scale]);
const rune = (x: number, z: number, scale = 1) =>
  p(`${D}/circle_magic.gltf`, x, z, 0, scale, undefined, 0.025);
const rubble = (x: number, z: number, rotation = 0, scale = 1) =>
  p(`${D}/rubble_large.gltf`, x, z, rotation, scale, [1.25 * scale, 0.85 * scale]);
const shrine = (x: number, z: number, scale = 1) =>
  p(`${H}/shrine_candles.gltf`, x, z, 0, scale, [0.9 * scale, 0.9 * scale]);
const core = (x: number, z: number, scale = 1) =>
  p(`${R}/Crystal_Large.gltf`, x, z, 0, scale, [1.0 * scale, 1.0 * scale], 0.35);

const SETPIECES: Readonly<Record<number, readonly RoomSetpiece[]>> = {
  91: [portal(-7.6, -4.8, 0.2, 1.1), portal(7.6, -4.8, -0.2, 1.1), crystal(-5.6, 4.6, 0.95), crystal(5.6, 4.6, 0.95), rune(0, 4.9, 1.35)],
  92: [column(-7.4, -5.0), column(7.4, -5.0), shrine(-6.1, 4.6), shrine(6.1, 4.6), rune(-2.6, 1.0, 0.75), rune(2.6, 1.0, 0.75)],
  93: [rubble(-7.2, -4.8, 0.5), rubble(7.2, -4.8, -0.5), rubble(-7.2, 4.5, -0.3), rubble(7.2, 4.5, 0.3), portal(0, 5.0, 0, 0.85)],
  94: [crystal(-6.8, -4.8, 1.0), crystal(6.8, -4.8, 1.0), crystal(-6.8, 4.6, 1.0), crystal(6.8, 4.6, 1.0), rune(0, 0.5, 1.55)],
  95: [column(-7.7, -5.0, 1.05), column(7.7, -5.0, 1.05), rubble(-6.4, 4.6, -0.25), rubble(6.4, 4.6, 0.25), rune(0, 4.9, 1.3)],
  96: [portal(-7.5, -5.0, 0.15, 1.0), portal(7.5, -5.0, -0.15, 1.0), column(-7.5, 4.7), column(7.5, 4.7), shrine(0, 5.0, 1.05)],
  97: [portal(-7.6, -4.8, 0.25, 0.95), portal(7.6, -4.8, -0.25, 0.95), portal(-7.6, 4.7, -0.25, 0.95), portal(7.6, 4.7, 0.25, 0.95), rune(0, 4.9, 1.5)],
  98: [crystal(-7.0, -4.8, 1.05), crystal(7.0, 4.5, 1.05), rubble(7.0, -4.8, -0.4), rubble(-7.0, 4.5, 0.4), shrine(0, 5.0, 1.05)],
  99: [column(-7.9, -5.0, 1.2), column(7.9, -5.0, 1.2), column(-7.9, 4.8, 1.2), column(7.9, 4.8, 1.2), crystal(-5.0, 0.5, 1.05), crystal(5.0, 0.5, 1.05), rune(0, 5.0, 1.7)],
  100: [core(0, 2.0, 1.8), column(-8.2, -4.8, 1.45), column(8.2, -4.8, 1.45), column(-8.2, 4.9, 1.45), column(8.2, 4.9, 1.45), portal(-6.0, 0.5, 0.2, 1.0), portal(6.0, 0.5, -0.2, 1.0), rune(0, 5.1, 2.0)],
};

export function veilNexusSetpieces(room: number): RoomSetpiece[] {
  return (SETPIECES[room] ?? []).map(piece => ({ ...piece }));
}
