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

export const KAYKIT_ROOM_PROPS: Record<number, KayKitRoomPlacement[]> = {
  1: [
    { asset: 'crates', x: -5.8, z: -5.6 }, { asset: 'barrelStack', x: -4.7, z: -4.5 },
    { asset: 'barrelDecorated', x: 5.7, z: -5.3 }, { asset: 'boxLarge', x: 4.8, z: -4.0 },
    { asset: 'swordShield', x: -6.7, z: -0.8, rotation: Math.PI / 2 }, { asset: 'swordShield', x: 6.7, z: -0.8, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: -6.65, z: 3.0, rotation: Math.PI / 2 }, { asset: 'torchMounted', x: 6.65, z: 3.0, rotation: -Math.PI / 2 },
    { asset: 'chest', x: 5.4, z: 5.0, rotation: Math.PI },
  ],
  2: [
    { asset: 'column', x: -4.8, z: -4.8 }, { asset: 'column', x: 4.8, z: -4.8 },
    { asset: 'column', x: -4.8, z: 3.8 }, { asset: 'column', x: 4.8, z: 3.8 },
    { asset: 'wallShelves', x: -6.55, z: -0.4, rotation: Math.PI / 2 }, { asset: 'wallShelves', x: 6.55, z: -0.4, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: -6.65, z: 4.1, rotation: Math.PI / 2 }, { asset: 'torchMounted', x: 6.65, z: 4.1, rotation: -Math.PI / 2 },
    { asset: 'chest', x: 0, z: 5.2, rotation: Math.PI },
  ],
  3: [
    { asset: 'barrel', x: -5.5, z: -5.6 }, { asset: 'barrel', x: -4.4, z: -5.0 },
    { asset: 'barrelDecorated', x: 5.4, z: -5.4 }, { asset: 'crates', x: 4.6, z: -3.8 },
    { asset: 'tableMedium', x: -4.5, z: 3.9, rotation: Math.PI / 2 }, { asset: 'tableMedium', x: 4.5, z: 3.9, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: -6.65, z: 1.8, rotation: Math.PI / 2 }, { asset: 'torchMounted', x: 6.65, z: 1.8, rotation: -Math.PI / 2 },
    { asset: 'chestGold', x: 0, z: 5.3, rotation: Math.PI },
  ],
  4: [
    { asset: 'bed', x: -5.3, z: -4.5, rotation: Math.PI / 2 }, { asset: 'bed', x: 5.3, z: -4.5, rotation: -Math.PI / 2 },
    { asset: 'chair', x: -5.2, z: 2.2, rotation: Math.PI / 2 }, { asset: 'chair', x: 5.2, z: 2.2, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: 0, z: -5.8 },
    { asset: 'torchMounted', x: -3.2, z: -7.55, rotation: Math.PI }, { asset: 'torchMounted', x: 3.2, z: -7.55, rotation: Math.PI },
    { asset: 'chest', x: 0, z: 5.4, rotation: Math.PI },
  ],
  5: [
    { asset: 'column', x: -5.0, z: -5.3 }, { asset: 'column', x: 5.0, z: -5.3 },
    { asset: 'column', x: -5.0, z: 2.8 }, { asset: 'column', x: 5.0, z: 2.8 },
    { asset: 'swordShield', x: -3.0, z: -7.6, rotation: Math.PI }, { asset: 'swordShield', x: 3.0, z: -7.6, rotation: Math.PI },
    { asset: 'torchMounted', x: 0, z: -7.55, rotation: Math.PI }, { asset: 'chestGold', x: 0, z: 5.2, rotation: Math.PI },
  ],
  6: [
    { asset: 'crates', x: -5.3, z: -5.5 }, { asset: 'boxLarge', x: -4.2, z: -4.1 },
    { asset: 'barrelStack', x: 5.3, z: -5.4 }, { asset: 'barrel', x: 4.4, z: -4.0 },
    { asset: 'tableLong', x: -4.7, z: 3.8, rotation: Math.PI / 2 }, { asset: 'barrelDecorated', x: 5.1, z: 3.8 },
    { asset: 'torchMounted', x: 0, z: -7.55, rotation: Math.PI }, { asset: 'chest', x: 0, z: 5.2, rotation: Math.PI },
  ],
  7: [
    { asset: 'column', x: -5.6, z: -5.4 }, { asset: 'column', x: 5.6, z: -5.4 },
    { asset: 'wallShelves', x: -6.55, z: -0.8, rotation: Math.PI / 2 }, { asset: 'wallShelves', x: 6.55, z: -0.8, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: -3.0, z: -7.55, rotation: Math.PI }, { asset: 'torchMounted', x: 3.0, z: -7.55, rotation: Math.PI },
    { asset: 'chestGold', x: 0, z: 5.4, rotation: Math.PI },
  ],
  8: [
    { asset: 'bed', x: -5.4, z: -5.0, rotation: Math.PI / 2 }, { asset: 'chair', x: -5.2, z: -2.5, rotation: Math.PI / 2 },
    { asset: 'crates', x: 5.2, z: -5.1 }, { asset: 'barrelStack', x: 5.0, z: -3.4 },
    { asset: 'tableMedium', x: 0, z: -5.8 },
    { asset: 'torchMounted', x: -6.65, z: 2.8, rotation: Math.PI / 2 }, { asset: 'torchMounted', x: 6.65, z: 2.8, rotation: -Math.PI / 2 },
    { asset: 'chest', x: 0, z: 5.3, rotation: Math.PI },
  ],
  9: [
    { asset: 'column', x: -5.2, z: -4.5 }, { asset: 'column', x: 5.2, z: -4.5 },
    { asset: 'column', x: -5.2, z: 3.4 }, { asset: 'column', x: 5.2, z: 3.4 },
    { asset: 'swordShield', x: -2.8, z: -7.6, rotation: Math.PI }, { asset: 'swordShield', x: 2.8, z: -7.6, rotation: Math.PI },
    { asset: 'torchMounted', x: 0, z: -7.55, rotation: Math.PI },
    { asset: 'candle', x: -2.2, z: 5.0 }, { asset: 'candle', x: 2.2, z: 5.0 },
  ],
  10: [
    { asset: 'column', x: -5.5, z: -5.5, scale: 1.15 }, { asset: 'column', x: 5.5, z: -5.5, scale: 1.15 },
    { asset: 'column', x: -5.5, z: 3.8, scale: 1.15 }, { asset: 'column', x: 5.5, z: 3.8, scale: 1.15 },
    { asset: 'swordShield', x: -3.0, z: -7.6, rotation: Math.PI }, { asset: 'swordShield', x: 3.0, z: -7.6, rotation: Math.PI },
    { asset: 'torchMounted', x: 0, z: -7.55, rotation: Math.PI },
    { asset: 'chestGold', x: 0, z: 5.4, rotation: Math.PI, scale: 1.2 },
  ],
};

export const KAYKIT_COLLISION_SIZE: Partial<Record<KayKitRoomAsset, [number, number]>> = {
  column: [0.95, 0.95], barrel: [0.9, 0.9], barrelDecorated: [1.0, 1.0], barrelStack: [1.75, 1.25],
  crates: [1.9, 1.55], boxLarge: [1.3, 1.3], chest: [1.5, 1.05], chestGold: [1.5, 1.05],
  candle: [0.32, 0.32], chair: [0.88, 0.88], bed: [1.2, 2.1], tableLong: [2.6, 1.05], tableMedium: [1.75, 1.2],
};
