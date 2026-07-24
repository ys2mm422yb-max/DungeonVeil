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

const lens = (x: number, z: number, rotation = 0, scale = 1) =>
  p(`${R}/Crystal_Large.gltf`, x, z, rotation, scale, [0.8 * scale, 0.8 * scale]);
const pillar = (x: number, z: number, scale = 1) =>
  p(`${D}/barrier_column.gltf`, x, z, 0, scale, [0.9 * scale, 0.9 * scale]);
const rune = (x: number, z: number, scale = 1) =>
  p(`${D}/circle_magic.gltf`, x, z, 0, scale, undefined, 0.03);
const candles = (x: number, z: number, scale = 1) =>
  p(`${H}/shrine_candles.gltf`, x, z, 0, scale, [1.0 * scale, 1.0 * scale]);

const SETPIECES: Readonly<Record<number, readonly RoomSetpiece[]>> = {
  61: [rune(0, -0.6, 1.5), lens(0, -5.4, 0, 1.25), pillar(-7.4, -3.4, 1.15), pillar(7.4, -3.4, 1.15), candles(0, 5.2, 1.1)],
  62: [rune(-3.4, -0.8, 1.15), rune(3.4, -0.8, 1.15), pillar(-7.5, -4.8), pillar(-7.5, 3.4), pillar(7.5, -4.8), pillar(7.5, 3.4), lens(0, 4.8, 0, 1.05)],
  63: [lens(-7.2, -4.5, 0.4, 1.2), lens(7.1, -3.6, -0.5, 1.0), lens(-6.6, 3.8, -0.7, 0.95), lens(6.8, 4.5, 0.6, 1.15), p(`${D}/rubble_large.gltf`, -8.0, 0.1, 0.2, 1.0, [1.2, 0.8])],
  64: [pillar(-7.7, -5.8), pillar(7.7, -5.8), pillar(-7.7, 0), pillar(7.7, 0), pillar(-7.7, 5.3), pillar(7.7, 5.3), lens(0, -5.5, 0, 1.1)],
  65: [rune(0, -0.4, 1.6), pillar(-7.3, -0.4, 1.1), pillar(7.3, -0.4, 1.1), pillar(0, -6.0, 1.1), pillar(0, 5.1, 1.1), lens(-5.3, -4.5, 0, 0.9), lens(5.3, 4.1, 0, 0.9)],
  66: [p(`${D}/table_long_decorated_A.gltf`, 0, -0.4, 0, 0.9, [1.8, 0.9]), lens(-7.6, -4.7, 0, 0.8), lens(7.6, -4.7, 0, 0.8), lens(-7.6, 4.5, 0, 0.8), lens(7.6, 4.5, 0, 0.8)],
  67: [p(`${D}/rubble_large.gltf`, -7.4, -4.5, 0.7, 0.9, [1.5, 1.0]), p(`${D}/rubble_large.gltf`, 7.4, 4.3, 0.7, 0.9, [1.5, 1.0]), lens(-6.8, 4.5, 0, 0.95), lens(6.8, -4.8, 0, 0.95), rune(0, -0.5, 1.2)],
  68: [rune(0, -0.5, 1.5), lens(-7.5, -4.8, 0, 1.1), lens(7.5, -4.8, 0, 1.1), lens(0, 5.2, 0, 1.1), pillar(-5.8, 3.8), pillar(5.8, 3.8)],
  69: [rune(0, -0.4, 1.75), pillar(-7.4, -4.6, 1.15), pillar(7.4, -4.6, 1.15), pillar(0, 5.2, 1.15), lens(-5.7, 3.7, 0, 1.0), lens(5.7, 3.7, 0, 1.0), candles(0, -6.0, 1.2)],
  70: [rune(0, 1.6, 2.0), pillar(-8.0, -4.5, 1.3), pillar(8.0, -4.5, 1.3), pillar(-8.0, 4.6, 1.3), pillar(8.0, 4.6, 1.3), lens(-5.8, 0.5, 0, 1.15), lens(5.8, 0.5, 0, 1.15), lens(0, 5.6, 0, 1.15), candles(0, -5.4, 1.4)],
};

export function shatteredObservatorySetpieces(room: number): RoomSetpiece[] {
  return (SETPIECES[room] ?? []).map(piece => ({ ...piece }));
}
