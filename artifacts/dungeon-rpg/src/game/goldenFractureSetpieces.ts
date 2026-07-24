import type { RoomSetpiece } from './roomSetpieceLayout';

export type GoldenFractureSetpiece = RoomSetpiece & { y?: number; fallbackModel?: string };

const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';

const p = (
  model: string,
  x: number,
  z: number,
  rotation = 0,
  scale = 1,
  collider?: readonly [number, number],
  y = 0,
): GoldenFractureSetpiece => ({ model, x, y, z, rotation, scale, collider });

const pillar = (x: number, z: number, scale = 1.15) =>
  p(`${D}/barrier_column.gltf`, x, z, 0, scale, [0.9, 0.9]);
const crystal = (x: number, z: number, scale = 1.1) =>
  p(`${R}/Crystal_Large.gltf`, x, z, 0, scale, [0.8, 0.8]);
const candle = (x: number, z: number, scale = 1.05) =>
  p(`${H}/candle_triple.gltf`, x, z, 0, scale);

const GOLDEN_FRACTURE_SETPIECES: Readonly<Record<number, readonly GoldenFractureSetpiece[]>> = {
  51: [pillar(-6.8, -4.8), pillar(6.8, -4.8), pillar(-5.8, 4.4), pillar(5.8, 4.4), crystal(-7.5, 0), crystal(7.5, 0), candle(-3.2, -3), candle(3.2, -3)],
  52: [pillar(-7, -5), pillar(-2.5, 3.8), pillar(7, -1.5), crystal(-5.5, -1), crystal(4.8, 4.2), p(`${D}/shrine.gltf`, 0, -2.2, 0, 1.2, [1.2, 1.2]), candle(-3.2, 1), candle(3.2, -4)],
  53: [p(`${D}/anvil.gltf`, 0, -1.2, 0, 1.35, [1.1, 0.9]), pillar(-7, -4.7), pillar(7, -4.7), crystal(-6.2, 3.7), crystal(6.2, 3.7), p(`${R}/Iron_Bars_Stack_Large.gltf`, -4.8, -1, 0, 1.05, [1.2, 0.8]), p(`${R}/Copper_Bars_Stack_Medium.gltf`, 4.8, -1, 0, 1.05, [1.2, 0.8])],
  54: [p(`${D}/rubble_large.gltf`, -7.2, -4.8, 0.18, 0.86, [1.7, 1.2]), p(`${D}/rubble_large.gltf`, 7.2, 4.6, -0.18, 0.86, [1.7, 1.2]), pillar(-5.8, 4.5), pillar(5.8, -4.5), crystal(-7, 0.5), crystal(7, -0.5), candle(-2.8, -2.8), candle(2.8, 2.8)],
  55: [p(`${D}/chest_gold.gltf`, -5.8, -1.2, Math.PI / 2, 1.08, [1.3, 0.85]), p(`${D}/chest_gold.gltf`, 5.8, -1.2, -Math.PI / 2, 1.08, [1.3, 0.85]), pillar(-7, -5), pillar(7, -5), pillar(-7, 4.5), pillar(7, 4.5), crystal(-3.2, 2.8), crystal(3.2, 2.8)],
  56: [pillar(-6.8, -4.8), pillar(-3.5, 4.4), pillar(3.5, -4.4), pillar(6.8, 4.8), crystal(-6.4, 0), crystal(0, 3.9), crystal(6.4, 0), p(`${H}/shrine_candles.gltf`, 0, -1.5, 0, 1.2, [1.2, 1.2])],
  57: [pillar(-6.8, -4.8, 1.3), pillar(0, 4.8, 1.3), pillar(6.8, -4.8, 1.3), pillar(-5.8, 4.5, 1.2), pillar(5.8, 4.5, 1.2), p(`${D}/chest_gold.gltf`, 0, -1.4, Math.PI, 1.1, [1.3, 0.85]), crystal(-7.2, 0.5), crystal(7.2, 0.5)],
  58: [pillar(-7.2, -5), pillar(-7.2, 4.5), pillar(0, -5), pillar(0, 4.5), pillar(7.2, -5), pillar(7.2, 4.5), crystal(-3.6, 0), crystal(3.6, 0)],
  59: [p(`${D}/throne.gltf`, 0, -5.0, Math.PI, 1.35, [1.5, 1.4]), pillar(-6.5, -4.6, 1.3), pillar(6.5, -4.6, 1.3), pillar(-6.5, 4.6, 1.2), pillar(6.5, 4.6, 1.2), crystal(-4.5, 0), crystal(4.5, 0), candle(0, -3.2, 1.2)],
  60: [pillar(-7.1, -5.2, 1.4), pillar(7.1, -5.2, 1.4), pillar(-7.1, 5.2, 1.4), pillar(7.1, 5.2, 1.4), p(`${H}/shrine_candles.gltf`, 0, -5.2, 0, 1.65, [1.5, 1.5]), crystal(-4.2, 0, 1.3), crystal(4.2, 0, 1.3), p(`${D}/circle_magic.gltf`, 0, 1.8, 0, 1.5, undefined, 0.03)],
};

export function goldenFractureSetpieces(room: number): GoldenFractureSetpiece[] {
  return (GOLDEN_FRACTURE_SETPIECES[room] ?? []).map(piece => ({ ...piece }));
}
