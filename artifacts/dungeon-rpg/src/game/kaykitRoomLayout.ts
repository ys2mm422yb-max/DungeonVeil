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

const LEFT_WALL = -11.35;
const RIGHT_WALL = 11.35;
const TOP_WALL = -15.3;

/**
 * Room props are deliberately composed as readable clusters rather than
 * scattered decoration. The middle lanes, player start and Veil approach stay
 * open so the faster combat pass still has room to breathe.
 */
export const KAYKIT_ROOM_PROPS: Record<number, KayKitRoomPlacement[]> = {
  // 1 · Wachlager — two dense guard stores frame a clean first arena.
  1: [
    { asset: 'swordShield', x: LEFT_WALL, z: -9.6, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: LEFT_WALL, z: -4.2, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -9.6, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -4.2, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: 3.7, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 3.7, rotation: -Math.PI / 2 },

    { asset: 'crates', x: -9.1, z: -11.2 },
    { asset: 'barrelStack', x: -7.4, z: -10.1, rotation: Math.PI / 2 },
    { asset: 'barrelDecorated', x: -9.2, z: -7.7 },
    { asset: 'tableMedium', x: -8.3, z: -4.8, rotation: Math.PI / 2 },
    { asset: 'chair', x: -7.0, z: -4.5, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -8.2, z: -4.6 },

    { asset: 'barrelDecorated', x: 9.1, z: -11.1 },
    { asset: 'boxLarge', x: 7.7, z: -10.2 },
    { asset: 'crates', x: 9.0, z: -7.4, rotation: Math.PI / 2 },
    { asset: 'barrel', x: 7.6, z: -6.4 },
    { asset: 'chest', x: 8.8, z: 8.8, rotation: Math.PI },
    { asset: 'barrelStack', x: 8.1, z: 10.3, rotation: Math.PI / 2 },
  ],

  // 2 · Waffenkammer — wall racks and two armorer work stations.
  2: [
    { asset: 'wallShelves', x: LEFT_WALL, z: -10.2, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: LEFT_WALL, z: -4.8, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: -10.2, rotation: -Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: -4.8, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: LEFT_WALL, z: 0.6, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: 0.6, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: -5.4, z: TOP_WALL, rotation: Math.PI },
    { asset: 'swordShield', x: 5.4, z: TOP_WALL, rotation: Math.PI },

    { asset: 'column', x: -7.2, z: 2.1 },
    { asset: 'column', x: 7.2, z: 2.1 },
    { asset: 'tableLong', x: -8.5, z: 6.0, rotation: Math.PI / 2 },
    { asset: 'chair', x: -7.1, z: 6.0, rotation: -Math.PI / 2 },
    { asset: 'boxLarge', x: -9.2, z: 8.4 },
    { asset: 'crates', x: -7.8, z: 9.5 },

    { asset: 'tableLong', x: 8.5, z: 6.0, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 7.1, z: 6.0, rotation: Math.PI / 2 },
    { asset: 'barrelStack', x: 9.0, z: 8.6 },
    { asset: 'chest', x: 7.8, z: 9.8, rotation: Math.PI },
    { asset: 'torchMounted', x: LEFT_WALL, z: 7.9, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 7.9, rotation: -Math.PI / 2 },
  ],

  // 3 · Säulenhalle — two continuous rows create three combat lanes.
  3: [
    { asset: 'column', x: -6.8, z: -9.0 }, { asset: 'column', x: 6.8, z: -9.0 },
    { asset: 'column', x: -6.8, z: -4.0 }, { asset: 'column', x: 6.8, z: -4.0 },
    { asset: 'column', x: -6.8, z: 1.0 }, { asset: 'column', x: 6.8, z: 1.0 },
    { asset: 'column', x: -6.8, z: 6.0 }, { asset: 'column', x: 6.8, z: 6.0 },
    { asset: 'candle', x: -5.5, z: -6.5 }, { asset: 'candle', x: 5.5, z: -6.5 },
    { asset: 'candle', x: -5.5, z: -1.5 }, { asset: 'candle', x: 5.5, z: -1.5 },
    { asset: 'candle', x: -5.5, z: 3.5 }, { asset: 'candle', x: 5.5, z: 3.5 },
    { asset: 'bannerBlue', x: LEFT_WALL, z: -7.0, rotation: Math.PI / 2 },
    { asset: 'bannerBlue', x: RIGHT_WALL, z: -7.0, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: 4.2, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 4.2, rotation: -Math.PI / 2 },
    { asset: 'chestGold', x: 9.0, z: 10.0, rotation: Math.PI },
  ],

  // 4 · Barrikadenraum — asymmetrical storage wall versus a weapon station.
  4: [
    { asset: 'crates', x: -9.0, z: -10.0 },
    { asset: 'barrelStack', x: -7.2, z: -9.0, rotation: Math.PI / 2 },
    { asset: 'boxLarge', x: -9.2, z: -7.0 },
    { asset: 'crates', x: -7.7, z: -5.8, rotation: Math.PI / 2 },
    { asset: 'barrelDecorated', x: -9.1, z: -3.8 },
    { asset: 'barrel', x: -7.4, z: -3.2 },

    { asset: 'wallShelves', x: RIGHT_WALL, z: -9.0, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -4.2, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: 8.5, z: -6.0, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 7.1, z: -6.0, rotation: Math.PI / 2 },
    { asset: 'chest', x: 9.0, z: -2.2, rotation: Math.PI / 2 },

    { asset: 'column', x: -6.4, z: 3.0 },
    { asset: 'column', x: 6.4, z: 3.0 },
    { asset: 'column', x: -6.4, z: 8.0 },
    { asset: 'column', x: 6.4, z: 8.0 },
    { asset: 'torchMounted', x: -5.2, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 5.2, z: TOP_WALL, rotation: Math.PI },
  ],

  // 5 · Schlafquartier — beds, side tables and personal storage form two bays.
  5: [
    { asset: 'bed', x: -9.0, z: -10.4, rotation: Math.PI / 2 },
    { asset: 'bed', x: -9.0, z: -6.5, rotation: Math.PI / 2 },
    { asset: 'bed', x: -9.0, z: -2.6, rotation: Math.PI / 2 },
    { asset: 'bed', x: 9.0, z: -10.4, rotation: -Math.PI / 2 },
    { asset: 'bed', x: 9.0, z: -6.5, rotation: -Math.PI / 2 },
    { asset: 'bed', x: 9.0, z: -2.6, rotation: -Math.PI / 2 },
    { asset: 'tableMedium', x: -8.7, z: 2.0, rotation: Math.PI / 2 },
    { asset: 'chair', x: -7.3, z: 2.0, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -8.6, z: 1.8 },
    { asset: 'chest', x: -9.0, z: 6.0, rotation: Math.PI / 2 },
    { asset: 'tableMedium', x: 8.7, z: 2.0, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 7.3, z: 2.0, rotation: Math.PI / 2 },
    { asset: 'candle', x: 8.6, z: 1.8 },
    { asset: 'chestGold', x: 9.0, z: 6.0, rotation: -Math.PI / 2 },
    { asset: 'wallShelves', x: LEFT_WALL, z: 8.8, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: 8.8, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: -0.4, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: -0.4, rotation: -Math.PI / 2 },
  ],

  // 6 · Bannerhalle — formal red hall with long side tables and trophy walls.
  6: [
    { asset: 'bannerRed', x: LEFT_WALL, z: -10.0, rotation: Math.PI / 2, scale: 1.1 },
    { asset: 'bannerRed', x: RIGHT_WALL, z: -10.0, rotation: -Math.PI / 2, scale: 1.1 },
    { asset: 'bannerShieldRed', x: LEFT_WALL, z: -4.2, rotation: Math.PI / 2 },
    { asset: 'bannerShieldRed', x: RIGHT_WALL, z: -4.2, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: LEFT_WALL, z: 1.0, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: 1.0, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: -8.5, z: 4.5, rotation: Math.PI / 2 },
    { asset: 'chair', x: -7.1, z: 4.0, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: 8.5, z: 4.5, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 7.1, z: 4.0, rotation: Math.PI / 2 },
    { asset: 'column', x: -7.0, z: -7.2 }, { asset: 'column', x: 7.0, z: -7.2 },
    { asset: 'column', x: -7.0, z: 8.0 }, { asset: 'column', x: 7.0, z: 8.0 },
    { asset: 'crates', x: -9.0, z: 9.8 },
    { asset: 'barrelStack', x: 9.0, z: 9.8 },
    { asset: 'torchMounted', x: -4.8, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 4.8, z: TOP_WALL, rotation: Math.PI },
  ],

  // 7 · Ritualhalle — open center by design, framed by a complete ritual ring.
  7: [
    { asset: 'column', x: -7.0, z: -8.5 }, { asset: 'column', x: 7.0, z: -8.5 },
    { asset: 'column', x: -8.0, z: -2.0 }, { asset: 'column', x: 8.0, z: -2.0 },
    { asset: 'column', x: -7.0, z: 5.0 }, { asset: 'column', x: 7.0, z: 5.0 },
    { asset: 'candle', x: -4.8, z: -6.0 }, { asset: 'candle', x: 0, z: -8.6 }, { asset: 'candle', x: 4.8, z: -6.0 },
    { asset: 'candle', x: -5.8, z: -0.5 }, { asset: 'candle', x: 5.8, z: -0.5 },
    { asset: 'candle', x: -4.8, z: 4.2 }, { asset: 'candle', x: 0, z: 6.7 }, { asset: 'candle', x: 4.8, z: 4.2 },
    { asset: 'bannerBlue', x: LEFT_WALL, z: -8.0, rotation: Math.PI / 2, scale: 1.1 },
    { asset: 'bannerBlue', x: RIGHT_WALL, z: -8.0, rotation: -Math.PI / 2, scale: 1.1 },
    { asset: 'bannerBlue', x: LEFT_WALL, z: 4.0, rotation: Math.PI / 2 },
    { asset: 'bannerBlue', x: RIGHT_WALL, z: 4.0, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: -5.0, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 5.0, z: TOP_WALL, rotation: Math.PI },
  ],

  // 8 · Lagergewölbe — the densest room, with heavy side clusters and a central corridor.
  8: [
    { asset: 'crates', x: -9.2, z: -10.5 },
    { asset: 'boxLarge', x: -7.4, z: -9.2 },
    { asset: 'barrelStack', x: -9.0, z: -7.0 },
    { asset: 'barrelDecorated', x: -7.5, z: -5.9 },
    { asset: 'crates', x: -9.0, z: -3.6, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: LEFT_WALL, z: 0.0, rotation: Math.PI / 2 },
    { asset: 'tableLong', x: -8.5, z: 4.2, rotation: Math.PI / 2 },
    { asset: 'chair', x: -7.1, z: 4.2, rotation: -Math.PI / 2 },
    { asset: 'boxLarge', x: -9.2, z: 7.5 },
    { asset: 'barrel', x: -7.6, z: 8.2 },

    { asset: 'barrelDecorated', x: 9.2, z: -10.4 },
    { asset: 'crates', x: 7.7, z: -9.2 },
    { asset: 'boxLarge', x: 9.1, z: -6.8 },
    { asset: 'barrelStack', x: 7.6, z: -5.4, rotation: Math.PI / 2 },
    { asset: 'crates', x: 9.0, z: -2.8 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: 0.0, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: 8.5, z: 4.2, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 7.1, z: 4.2, rotation: Math.PI / 2 },
    { asset: 'chest', x: 9.0, z: 7.5, rotation: -Math.PI / 2 },
    { asset: 'barrel', x: 7.5, z: 8.4 },
    { asset: 'torchMounted', x: -4.8, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 4.8, z: TOP_WALL, rotation: Math.PI },
  ],

  // 9 · Vorhalle des Wächters — strict symmetry and a candle route to the gate.
  9: [
    { asset: 'bannerGreen', x: LEFT_WALL, z: -10.0, rotation: Math.PI / 2, scale: 1.15 },
    { asset: 'bannerGreen', x: RIGHT_WALL, z: -10.0, rotation: -Math.PI / 2, scale: 1.15 },
    { asset: 'bannerGreen', x: LEFT_WALL, z: 0.0, rotation: Math.PI / 2 },
    { asset: 'bannerGreen', x: RIGHT_WALL, z: 0.0, rotation: -Math.PI / 2 },
    { asset: 'column', x: -7.5, z: -8.0 }, { asset: 'column', x: 7.5, z: -8.0 },
    { asset: 'column', x: -7.5, z: -2.0 }, { asset: 'column', x: 7.5, z: -2.0 },
    { asset: 'column', x: -7.5, z: 4.0 }, { asset: 'column', x: 7.5, z: 4.0 },
    { asset: 'column', x: -7.5, z: 9.0 }, { asset: 'column', x: 7.5, z: 9.0 },
    { asset: 'candle', x: -1.5, z: -9.0 }, { asset: 'candle', x: 1.5, z: -9.0 },
    { asset: 'candle', x: -1.5, z: -5.5 }, { asset: 'candle', x: 1.5, z: -5.5 },
    { asset: 'candle', x: -1.5, z: -2.0 }, { asset: 'candle', x: 1.5, z: -2.0 },
    { asset: 'candle', x: -1.5, z: 1.5 }, { asset: 'candle', x: 1.5, z: 1.5 },
    { asset: 'candle', x: -1.5, z: 5.0 }, { asset: 'candle', x: 1.5, z: 5.0 },
    { asset: 'swordShield', x: LEFT_WALL, z: 7.5, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: 7.5, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: -4.8, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: -4.8, rotation: -Math.PI / 2 },
  ],

  // 10 · Bosskammer — monumental, symmetric and deliberately free in the middle.
  10: [
    { asset: 'bannerShieldRed', x: LEFT_WALL, z: -10.5, rotation: Math.PI / 2, scale: 1.3 },
    { asset: 'bannerShieldRed', x: RIGHT_WALL, z: -10.5, rotation: -Math.PI / 2, scale: 1.3 },
    { asset: 'bannerRed', x: LEFT_WALL, z: -4.0, rotation: Math.PI / 2, scale: 1.2 },
    { asset: 'bannerRed', x: RIGHT_WALL, z: -4.0, rotation: -Math.PI / 2, scale: 1.2 },
    { asset: 'bannerShieldRed', x: LEFT_WALL, z: 3.0, rotation: Math.PI / 2, scale: 1.15 },
    { asset: 'bannerShieldRed', x: RIGHT_WALL, z: 3.0, rotation: -Math.PI / 2, scale: 1.15 },

    { asset: 'column', x: -8.2, z: -8.5, scale: 1.25 }, { asset: 'column', x: 8.2, z: -8.5, scale: 1.25 },
    { asset: 'column', x: -8.2, z: -1.0, scale: 1.25 }, { asset: 'column', x: 8.2, z: -1.0, scale: 1.25 },
    { asset: 'column', x: -8.2, z: 6.5, scale: 1.25 }, { asset: 'column', x: 8.2, z: 6.5, scale: 1.25 },

    { asset: 'swordShield', x: -5.2, z: TOP_WALL, rotation: Math.PI, scale: 1.2 },
    { asset: 'swordShield', x: 5.2, z: TOP_WALL, rotation: Math.PI, scale: 1.2 },
    { asset: 'torchMounted', x: -2.4, z: TOP_WALL, rotation: Math.PI, scale: 1.25 },
    { asset: 'torchMounted', x: 2.4, z: TOP_WALL, rotation: Math.PI, scale: 1.25 },

    { asset: 'candle', x: -5.2, z: -6.0 }, { asset: 'candle', x: 5.2, z: -6.0 },
    { asset: 'candle', x: -5.2, z: -1.5 }, { asset: 'candle', x: 5.2, z: -1.5 },
    { asset: 'candle', x: -5.2, z: 3.0 }, { asset: 'candle', x: 5.2, z: 3.0 },
    { asset: 'chestGold', x: -9.0, z: 9.2, rotation: Math.PI },
    { asset: 'chestGold', x: 9.0, z: 9.2, rotation: Math.PI },
  ],
};

export const KAYKIT_COLLISION_SIZE: Partial<Record<KayKitRoomAsset, [number, number]>> = {
  column: [0.95, 0.95], barrel: [0.9, 0.9], barrelDecorated: [1.0, 1.0], barrelStack: [1.75, 1.25], crates: [1.9, 1.55],
  boxLarge: [1.3, 1.3], chest: [1.5, 1.05], chestGold: [1.5, 1.05], candle: [0.32, 0.32], chair: [0.88, 0.88], bed: [1.2, 2.1],
  tableLong: [2.6, 1.05], tableMedium: [1.75, 1.2],
};
