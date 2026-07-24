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
const crystal = (x: number, z: number, scale = 1) =>
  p(`${R}/Crystal_Large.gltf`, x, z, 0, scale, [0.8 * scale, 0.8 * scale]);
const rune = (x: number, z: number, scale = 1) =>
  p(`${D}/circle_magic.gltf`, x, z, 0, scale, undefined, 0.025);
const grave = (x: number, z: number, rotation = 0, scale = 1) =>
  p(`${H}/gravestone_A.gltf`, x, z, rotation, scale, [0.7 * scale, 0.45 * scale]);
const rubble = (x: number, z: number, rotation = 0, scale = 1) =>
  p(`${D}/rubble_large.gltf`, x, z, rotation, scale, [1.35 * scale, 0.9 * scale]);
const candles = (x: number, z: number, scale = 1) =>
  p(`${H}/shrine_candles.gltf`, x, z, 0, scale, [1.0 * scale, 1.0 * scale]);

const SETPIECES: Readonly<Record<number, readonly RoomSetpiece[]>> = {
  71: [column(-7.6, -4.8, 1.1), column(7.6, -4.8, 1.1), rubble(-7.2, 3.8, 0.3), rubble(7.2, 3.8, -0.3), rune(0, 4.8, 1.25)],
  72: [column(-7.5, -5.5), column(-7.5, 0), column(-7.5, 5.1), column(7.5, -5.5), column(7.5, 0), column(7.5, 5.1), p(`${D}/table_long_decorated_A.gltf`, 0, -0.4, 0, 0.85, [1.7, 0.8])],
  73: [rubble(-7.3, -4.6, 0.5), rubble(7.3, -3.6, -0.5), rubble(-6.8, 4.2, -0.2), rubble(6.8, 4.6, 0.2), crystal(0, 5.1, 0.9)],
  74: [grave(-6.8, -3.8, 0.2, 1.1), grave(6.8, -3.8, -0.2, 1.1), grave(-6.8, 3.8, -0.2, 1.1), grave(6.8, 3.8, 0.2, 1.1), rune(0, -0.2, 1.55)],
  75: [crystal(-7.2, -4.7, 1.0), crystal(7.2, 4.4, 1.0), rubble(7.2, -4.6, 0.6), rubble(-7.2, 4.4, 0.6), rune(0, -0.4, 1.2)],
  76: [grave(-7.4, -4.8, 0, 1.2), grave(7.4, -4.8, 0, 1.2), grave(-7.4, 4.5, 0, 1.2), grave(7.4, 4.5, 0, 1.2), column(0, 5.2, 1.1)],
  77: [rune(0, -0.3, 1.7), column(-7.5, -4.7), column(7.5, -4.7), column(-7.5, 4.6), column(7.5, 4.6), candles(0, 4.8, 1.25)],
  78: [rubble(-7.5, -5.2, 0.4), rubble(7.5, -1.8, -0.4), rubble(-7.5, 1.7, -0.4), rubble(7.5, 5.0, 0.4), grave(-6.4, 4.7, 0.2)],
  79: [column(-7.6, -5.0, 1.15), column(7.6, -5.0, 1.15), column(-7.6, 4.7, 1.15), column(7.6, 4.7, 1.15), crystal(-5.4, 0.2, 1.0), crystal(5.4, 0.2, 1.0), rune(0, 4.9, 1.5)],
  80: [rune(0, 1.8, 2.1), column(-8.0, -4.7, 1.35), column(8.0, -4.7, 1.35), column(-8.0, 4.8, 1.35), column(8.0, 4.8, 1.35), crystal(-5.9, 0.5, 1.2), crystal(5.9, 0.5, 1.2), grave(-6.8, 5.2, 0, 1.25), grave(6.8, 5.2, 0, 1.25)],
};

export function drownedReliquarySetpieces(room: number): RoomSetpiece[] {
  return (SETPIECES[room] ?? []).map(piece => ({ ...piece }));
}
