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
const brazier = (x: number, z: number, scale = 1) =>
  p(`${D}/brazier.gltf`, x, z, 0, scale, [0.7 * scale, 0.7 * scale]);
const anvil = (x: number, z: number, rotation = 0, scale = 1) =>
  p(`${R}/Anvil.gltf`, x, z, rotation, scale, [0.9 * scale, 0.65 * scale]);
const crystal = (x: number, z: number, scale = 1) =>
  p(`${R}/Crystal_Large.gltf`, x, z, 0, scale, [0.8 * scale, 0.8 * scale]);
const rubble = (x: number, z: number, rotation = 0, scale = 1) =>
  p(`${D}/rubble_large.gltf`, x, z, rotation, scale, [1.35 * scale, 0.9 * scale]);
const rune = (x: number, z: number, scale = 1) =>
  p(`${D}/circle_magic.gltf`, x, z, 0, scale, undefined, 0.025);
const skull = (x: number, z: number, rotation = 0, scale = 1) =>
  p(`${H}/skull_pile.gltf`, x, z, rotation, scale, [0.8 * scale, 0.7 * scale]);

const SETPIECES: Readonly<Record<number, readonly RoomSetpiece[]>> = {
  81: [column(-7.7, -4.8, 1.15), column(7.7, -4.8, 1.15), brazier(-5.8, 4.5, 1.1), brazier(5.8, 4.5, 1.1), rubble(0, 5.1, 0, 1.05)],
  82: [column(-7.5, -5.4), column(-7.5, 0), column(-7.5, 5.0), column(7.5, -5.4), column(7.5, 0), column(7.5, 5.0), anvil(0, 4.8, 0, 1.15)],
  83: [brazier(-6.8, -4.8, 1.05), brazier(6.8, -4.8, 1.05), brazier(-6.8, 4.6, 1.05), brazier(6.8, 4.6, 1.05), rubble(0, -0.3, 0.4, 1.1)],
  84: [rubble(-7.2, -4.4, 0.45), rubble(7.2, -4.4, -0.45), rubble(-7.2, 4.3, -0.25), rubble(7.2, 4.3, 0.25), rune(0, 4.9, 1.25)],
  85: [crystal(-7.0, -4.9, 1.0), crystal(7.0, 4.4, 1.0), brazier(7.0, -4.7, 1.0), brazier(-7.0, 4.4, 1.0), anvil(0, 5.0, 0, 1.0)],
  86: [column(-7.6, -5.0, 1.1), column(7.6, -5.0, 1.1), column(-7.6, 4.7, 1.1), column(7.6, 4.7, 1.1), skull(-5.2, 0.4, 0.3, 1.0), skull(5.2, 0.4, -0.3, 1.0)],
  87: [rune(0, -0.2, 1.6), brazier(-6.8, -4.8, 1.1), brazier(6.8, -4.8, 1.1), brazier(-6.8, 4.6, 1.1), brazier(6.8, 4.6, 1.1), crystal(0, 5.1, 1.05)],
  88: [rubble(-7.4, -5.1, 0.35), rubble(7.4, -1.8, -0.35), rubble(-7.4, 1.8, -0.35), rubble(7.4, 5.0, 0.35), anvil(-5.2, 4.8, 0.2, 1.0)],
  89: [column(-7.8, -5.0, 1.2), column(7.8, -5.0, 1.2), column(-7.8, 4.8, 1.2), column(7.8, 4.8, 1.2), brazier(-5.2, 0.2, 1.15), brazier(5.2, 0.2, 1.15), rune(0, 5.0, 1.55)],
  90: [rune(0, 1.8, 2.2), column(-8.1, -4.8, 1.4), column(8.1, -4.8, 1.4), column(-8.1, 4.9, 1.4), column(8.1, 4.9, 1.4), brazier(-6.0, 0.5, 1.3), brazier(6.0, 0.5, 1.3), anvil(-5.8, 5.2, 0, 1.25), anvil(5.8, 5.2, 0, 1.25)],
};

export function cinderCrownSetpieces(room: number): RoomSetpiece[] {
  return (SETPIECES[room] ?? []).map(piece => ({ ...piece }));
}
