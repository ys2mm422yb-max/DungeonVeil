export type KayKitRoomAsset =
  | 'floor'
  | 'wall'
  | 'wallHalf'
  | 'corner'
  | 'wallColumn'
  | 'column'
  | 'barrel'
  | 'barrelDecorated'
  | 'barrelStack'
  | 'crates'
  | 'boxLarge'
  | 'chest'
  | 'chestGold'
  | 'candle'
  | 'chair'
  | 'bed'
  | 'torchMounted'
  | 'wallShelves'
  | 'swordShield'
  | 'tableLong'
  | 'tableMedium';

export type KayKitRoomPlacement = {
  asset: KayKitRoomAsset;
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
};

const LEFT_WALL = -11.35;
const RIGHT_WALL = 11.35;
const TOP_WALL = -15.3;

export const KAYKIT_ROOM_PROPS: Record<number, KayKitRoomPlacement[]> = {
  1: [
    { asset: 'swordShield', x: LEFT_WALL, z: -9.5, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: LEFT_WALL, z: -3.5, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -9.5, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -3.5, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: 4.5, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 4.5, rotation: -Math.PI / 2 },
    { asset: 'crates', x: -8.8, z: -11.6 },
    { asset: 'barrelStack', x: -7.3, z: -10.0 },
    { asset: 'barrelDecorated', x: 8.9, z: -11.2 },
    { asset: 'boxLarge', x: 7.5, z: -9.8 },
    { asset: 'chest', x: 8.5, z: 10.2, rotation: Math.PI },
  ],
  2: [
    { asset: 'wallShelves', x: LEFT_WALL, z: -10.0, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: LEFT_WALL, z: -3.2, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: -10.0, rotation: -Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: -3.2, rotation: -Math.PI / 2 },
    { asset: 'column', x: -7.2, z: 2.2 },
    { asset: 'column', x: 7.2, z: 2.2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: 7.0, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 7.0, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -4.0, z: -6.2 },
    { asset: 'candle', x: 4.0, z: -6.2 },
    { asset: 'chest', x: 8.5, z: 10.2, rotation: Math.PI },
  ],
  3: [
    { asset: 'column', x: -5.6, z: -8.2 },
    { asset: 'column', x: 5.6, z: -8.2 },
    { asset: 'column', x: -5.6, z: 2.8 },
    { asset: 'column', x: 5.6, z: 2.8 },
    { asset: 'candle', x: -2.2, z: -4.0 },
    { asset: 'candle', x: 2.2, z: -4.0 },
    { asset: 'candle', x: -2.2, z: 1.0 },
    { asset: 'candle', x: 2.2, z: 1.0 },
    { asset: 'torchMounted', x: LEFT_WALL, z: -1.0, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: -1.0, rotation: -Math.PI / 2 },
    { asset: 'chestGold', x: 8.4, z: 10.2, rotation: Math.PI },
  ],
  4: [
    { asset: 'column', x: -6.5, z: -8.5 },
    { asset: 'column', x: 0, z: -6.0 },
    { asset: 'column', x: 6.5, z: -8.5 },
    { asset: 'column', x: -6.5, z: 2.5 },
    { asset: 'column', x: 6.5, z: 2.5 },
    { asset: 'crates', x: -8.8, z: 8.5, rotation: Math.PI / 2 },
    { asset: 'barrelStack', x: 8.7, z: 8.5, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: -5.2, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 5.2, z: TOP_WALL, rotation: Math.PI },
    { asset: 'swordShield', x: LEFT_WALL, z: -1.0, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -1.0, rotation: -Math.PI / 2 },
  ],
  5: [
    { asset: 'bed', x: -9.0, z: -10.0, rotation: Math.PI / 2 },
    { asset: 'bed', x: -9.0, z: -3.5, rotation: Math.PI / 2 },
    { asset: 'bed', x: 9.0, z: -10.0, rotation: -Math.PI / 2 },
    { asset: 'bed', x: 9.0, z: -3.5, rotation: -Math.PI / 2 },
    { asset: 'chair', x: -8.8, z: 5.5, rotation: Math.PI / 2 },
    { asset: 'chair', x: 8.8, z: 5.5, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: 1.0, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 1.0, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: -5.0, z: TOP_WALL, rotation: Math.PI },
    { asset: 'swordShield', x: 5.0, z: TOP_WALL, rotation: Math.PI },
    { asset: 'chestGold', x: 8.4, z: 10.2, rotation: Math.PI },
  ],
  6: [
    { asset: 'crates', x: -8.7, z: -9.2 },
    { asset: 'boxLarge', x: -7.2, z: -7.8 },
    { asset: 'barrelStack', x: 8.6, z: -9.2 },
    { asset: 'barrel', x: 7.2, z: -7.8 },
    { asset: 'tableLong', x: -8.0, z: 4.5, rotation: Math.PI / 2 },
    { asset: 'barrelDecorated', x: 8.2, z: 4.5 },
    { asset: 'torchMounted', x: -5.2, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 5.2, z: TOP_WALL, rotation: Math.PI },
    { asset: 'chest', x: 8.0, z: 10.0, rotation: Math.PI },
  ],
  7: [
    { asset: 'column', x: -8.0, z: -8.0 },
    { asset: 'column', x: 8.0, z: -8.0 },
    { asset: 'wallShelves', x: LEFT_WALL, z: -4.0, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: -4.0, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: -5.2, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 5.2, z: TOP_WALL, rotation: Math.PI },
    { asset: 'chestGold', x: 8.0, z: 10.0, rotation: Math.PI },
  ],
  8: [
    { asset: 'bed', x: -8.8, z: -8.5, rotation: Math.PI / 2 },
    { asset: 'chair', x: -8.6, z: -3.2, rotation: Math.PI / 2 },
    { asset: 'crates', x: 8.6, z: -8.7 },
    { asset: 'barrelStack', x: 7.3, z: -7.2 },
    { asset: 'tableMedium', x: 8.0, z: 3.8, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: 4.5, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 4.5, rotation: -Math.PI / 2 },
    { asset: 'chest', x: 8.0, z: 10.0, rotation: Math.PI },
  ],
  9: [
    { asset: 'column', x: -7.0, z: -7.5 },
    { asset: 'column', x: 7.0, z: -7.5 },
    { asset: 'column', x: -7.0, z: 5.0 },
    { asset: 'column', x: 7.0, z: 5.0 },
    { asset: 'swordShield', x: -5.0, z: TOP_WALL, rotation: Math.PI },
    { asset: 'swordShield', x: 5.0, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: LEFT_WALL, z: 0, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 0, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -5.0, z: 9.0 },
    { asset: 'candle', x: 5.0, z: 9.0 },
  ],
  10: [
    { asset: 'column', x: -8.0, z: -8.5, scale: 1.15 },
    { asset: 'column', x: 8.0, z: -8.5, scale: 1.15 },
    { asset: 'column', x: -8.0, z: 6.0, scale: 1.15 },
    { asset: 'column', x: 8.0, z: 6.0, scale: 1.15 },
    { asset: 'swordShield', x: -5.0, z: TOP_WALL, rotation: Math.PI },
    { asset: 'swordShield', x: 5.0, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: LEFT_WALL, z: 0, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 0, rotation: -Math.PI / 2 },
    { asset: 'chestGold', x: 8.0, z: 10.0, rotation: Math.PI, scale: 1.2 },
  ],
};

export const KAYKIT_COLLISION_SIZE: Partial<Record<KayKitRoomAsset, [number, number]>> = {
  column: [0.95, 0.95],
  barrel: [0.9, 0.9],
  barrelDecorated: [1.0, 1.0],
  barrelStack: [1.75, 1.25],
  crates: [1.9, 1.55],
  boxLarge: [1.3, 1.3],
  chest: [1.5, 1.05],
  chestGold: [1.5, 1.05],
  candle: [0.32, 0.32],
  chair: [0.88, 0.88],
  bed: [1.2, 2.1],
  tableLong: [2.6, 1.05],
  tableMedium: [1.75, 1.2],
};
