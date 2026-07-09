export type KayKitRoomAsset =
  | 'floor' | 'wall' | 'wallHalf' | 'corner' | 'wallColumn' | 'column'
  | 'barrel' | 'barrelDecorated' | 'barrelStack' | 'crates' | 'boxLarge'
  | 'chest' | 'chestGold' | 'candle' | 'chair' | 'bed' | 'torchMounted'
  | 'wallShelves' | 'swordShield' | 'tableLong' | 'tableMedium'
  | 'bannerRed' | 'bannerShieldRed' | 'bannerBlue' | 'bannerGreen';

export type KayKitRoomPlacement = {
  asset: KayKitRoomAsset;
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
};

/**
 * First-region setpieces now live in roomSetpieceLayout.ts.
 * Keeping this map empty prevents the old dungeon-prop compositions from being
 * layered underneath the hand-built Furniture/Tools/Halloween layouts.
 */
export const KAYKIT_ROOM_PROPS: Record<number, KayKitRoomPlacement[]> = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => [index + 1, []]),
) as Record<number, KayKitRoomPlacement[]>;

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
