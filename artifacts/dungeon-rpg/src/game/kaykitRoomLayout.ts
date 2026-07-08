export type KayKitRoomAsset =
  | 'floor'
  | 'wall'
  | 'wallHalf'
  | 'corner'
  | 'wallColumn'
  | 'column'
  | 'bannerRed'
  | 'bannerBlue'
  | 'bannerGreen'
  | 'barrel'
  | 'barrelDecorated'
  | 'barrelStack'
  | 'crates'
  | 'boxLarge'
  | 'chest'
  | 'chestGold'
  | 'candle'
  | 'chair'
  | 'bed';

export type KayKitRoomPlacement = {
  asset: KayKitRoomAsset;
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
};

export const KAYKIT_ROOM_PROPS: Record<number, KayKitRoomPlacement[]> = {
  1: [
    { asset: 'crates', x: -6.2, z: -5.8 }, { asset: 'barrelStack', x: -5.2, z: -4.4 },
    { asset: 'barrelDecorated', x: 5.8, z: -5.4 }, { asset: 'boxLarge', x: 5.0, z: -3.8 },
    { asset: 'bannerRed', x: -6.7, z: -1.3, rotation: Math.PI / 2 },
    { asset: 'bannerRed', x: 6.7, z: -1.3, rotation: -Math.PI / 2 },
    { asset: 'chest', x: 5.6, z: 4.7, rotation: Math.PI }, { asset: 'candle', x: -5.7, z: 4.8 },
  ],
  2: [
    { asset: 'column', x: -4.8, z: -4.8 }, { asset: 'column', x: 4.8, z: -4.8 },
    { asset: 'column', x: -4.8, z: 3.8 }, { asset: 'column', x: 4.8, z: 3.8 },
    { asset: 'bannerBlue', x: -6.7, z: -0.5, rotation: Math.PI / 2 },
    { asset: 'bannerBlue', x: 6.7, z: -0.5, rotation: -Math.PI / 2 },
    { asset: 'chest', x: 0, z: 5.2, rotation: Math.PI },
  ],
  3: [
    { asset: 'barrel', x: -5.5, z: -5.6 }, { asset: 'barrel', x: -4.4, z: -5.0 },
    { asset: 'barrelDecorated', x: 5.4, z: -5.4 }, { asset: 'crates', x: 4.6, z: -3.8 },
    { asset: 'candle', x: -5.8, z: 2.8 }, { asset: 'candle', x: 5.8, z: 2.8 },
    { asset: 'chestGold', x: 0, z: 5.3, rotation: Math.PI },
  ],
  4: [
    { asset: 'bed', x: -5.3, z: -4.5, rotation: Math.PI / 2 },
    { asset: 'bed', x: 5.3, z: -4.5, rotation: -Math.PI / 2 },
    { asset: 'chair', x: -5.2, z: 2.2, rotation: Math.PI / 2 },
    { asset: 'chair', x: 5.2, z: 2.2, rotation: -Math.PI / 2 },
    { asset: 'bannerGreen', x: 0, z: -8.2, rotation: Math.PI },
    { asset: 'chest', x: 0, z: 5.4, rotation: Math.PI },
  ],
  5: [
    { asset: 'column', x: -5.0, z: -5.3 }, { asset: 'column', x: 5.0, z: -5.3 },
    { asset: 'column', x: -5.0, z: 2.8 }, { asset: 'column', x: 5.0, z: 2.8 },
    { asset: 'bannerRed', x: -2.0, z: -8.2, rotation: Math.PI },
    { asset: 'bannerRed', x: 2.0, z: -8.2, rotation: Math.PI },
    { asset: 'chestGold', x: 0, z: 5.2, rotation: Math.PI },
  ],
  6: [
    { asset: 'crates', x: -5.3, z: -5.5 }, { asset: 'boxLarge', x: -4.2, z: -4.1 },
    { asset: 'barrelStack', x: 5.3, z: -5.4 }, { asset: 'barrel', x: 4.4, z: -4.0 },
    { asset: 'crates', x: -5.2, z: 3.7 }, { asset: 'barrelDecorated', x: 5.1, z: 3.8 },
    { asset: 'chest', x: 0, z: 5.2, rotation: Math.PI },
  ],
  7: [
    { asset: 'column', x: -5.6, z: -5.4 }, { asset: 'column', x: 5.6, z: -5.4 },
    { asset: 'bannerBlue', x: -6.7, z: -0.8, rotation: Math.PI / 2 },
    { asset: 'bannerBlue', x: 6.7, z: -0.8, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -3.0, z: 4.7 }, { asset: 'candle', x: 3.0, z: 4.7 },
    { asset: 'chestGold', x: 0, z: 5.4, rotation: Math.PI },
  ],
  8: [
    { asset: 'bed', x: -5.4, z: -5.0, rotation: Math.PI / 2 },
    { asset: 'chair', x: -5.2, z: -2.5, rotation: Math.PI / 2 },
    { asset: 'crates', x: 5.2, z: -5.1 }, { asset: 'barrelStack', x: 5.0, z: -3.4 },
    { asset: 'bannerGreen', x: 0, z: -8.2, rotation: Math.PI },
    { asset: 'chest', x: 0, z: 5.3, rotation: Math.PI },
  ],
  9: [
    { asset: 'column', x: -5.2, z: -4.5 }, { asset: 'column', x: 5.2, z: -4.5 },
    { asset: 'column', x: -5.2, z: 3.4 }, { asset: 'column', x: 5.2, z: 3.4 },
    { asset: 'bannerRed', x: -2.3, z: -8.2, rotation: Math.PI },
    { asset: 'bannerRed', x: 2.3, z: -8.2, rotation: Math.PI },
    { asset: 'candle', x: -2.2, z: 5.0 }, { asset: 'candle', x: 2.2, z: 5.0 },
  ],
  10: [
    { asset: 'column', x: -5.5, z: -5.5, scale: 1.15 }, { asset: 'column', x: 5.5, z: -5.5, scale: 1.15 },
    { asset: 'column', x: -5.5, z: 3.8, scale: 1.15 }, { asset: 'column', x: 5.5, z: 3.8, scale: 1.15 },
    { asset: 'bannerRed', x: -3.0, z: -8.2, rotation: Math.PI },
    { asset: 'bannerRed', x: 0, z: -8.2, rotation: Math.PI },
    { asset: 'bannerRed', x: 3.0, z: -8.2, rotation: Math.PI },
    { asset: 'chestGold', x: 0, z: 5.4, rotation: Math.PI, scale: 1.2 },
  ],
};

export const KAYKIT_COLLISION_SIZE: Partial<Record<KayKitRoomAsset, [number, number]>> = {
  column: [0.58, 0.58],
  barrel: [0.48, 0.48],
  barrelDecorated: [0.52, 0.52],
  barrelStack: [0.9, 0.62],
  crates: [0.95, 0.75],
  boxLarge: [0.7, 0.7],
  chest: [0.82, 0.55],
  chestGold: [0.82, 0.55],
  candle: [0.2, 0.2],
  chair: [0.48, 0.48],
  bed: [0.72, 1.25],
};
