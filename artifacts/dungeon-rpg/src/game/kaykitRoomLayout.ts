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
 * Mobile-first room composition. Dominant prop clusters sit inside the visible
 * camera focus while the player start and central dodge lanes remain readable.
 */
export const KAYKIT_ROOM_PROPS: Record<number, KayKitRoomPlacement[]> = {
  // 1 · Wachlager — visible twin guard stores, not edge decoration.
  1: [
    { asset: 'swordShield', x: LEFT_WALL, z: -9.6, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: LEFT_WALL, z: -4.2, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -9.6, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -4.2, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: 3.7, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 3.7, rotation: -Math.PI / 2 },

    { asset: 'crates', x: -7.4, z: -10.4 },
    { asset: 'barrelStack', x: -5.8, z: -9.2, rotation: Math.PI / 2 },
    { asset: 'barrelDecorated', x: -7.5, z: -7.0 },
    { asset: 'tableMedium', x: -6.6, z: -4.6, rotation: Math.PI / 2 },
    { asset: 'chair', x: -5.2, z: -4.3, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -6.5, z: -4.4 },

    { asset: 'barrelDecorated', x: 7.3, z: -10.3 },
    { asset: 'boxLarge', x: 5.9, z: -9.3 },
    { asset: 'crates', x: 7.2, z: -6.8, rotation: Math.PI / 2 },
    { asset: 'barrel', x: 5.6, z: -5.7 },
    { asset: 'tableMedium', x: 6.6, z: -3.7, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 5.2, z: -3.5, rotation: Math.PI / 2 },
    { asset: 'chest', x: 6.9, z: 8.0, rotation: Math.PI },
    { asset: 'barrelStack', x: 5.5, z: 9.3, rotation: Math.PI / 2 },
  ],

  // 2 · Waffenkammer — two visible work bays and a central gate line.
  2: [
    { asset: 'wallShelves', x: LEFT_WALL, z: -10.2, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: LEFT_WALL, z: -4.8, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: -10.2, rotation: -Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: -4.8, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: LEFT_WALL, z: 0.6, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: 0.6, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: -5.4, z: TOP_WALL, rotation: Math.PI },
    { asset: 'swordShield', x: 5.4, z: TOP_WALL, rotation: Math.PI },

    { asset: 'column', x: -5.8, z: 1.6 },
    { asset: 'column', x: 5.8, z: 1.6 },
    { asset: 'tableLong', x: -6.7, z: 5.2, rotation: Math.PI / 2 },
    { asset: 'chair', x: -5.2, z: 5.2, rotation: -Math.PI / 2 },
    { asset: 'boxLarge', x: -7.3, z: 7.7 },
    { asset: 'crates', x: -5.8, z: 8.9 },

    { asset: 'tableLong', x: 6.7, z: 5.2, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 5.2, z: 5.2, rotation: Math.PI / 2 },
    { asset: 'barrelStack', x: 7.2, z: 7.8 },
    { asset: 'chest', x: 5.8, z: 9.0, rotation: Math.PI },
    { asset: 'torchMounted', x: LEFT_WALL, z: 7.9, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 7.9, rotation: -Math.PI / 2 },
  ],

  // 3 · Säulenhalle — strong inner rows create three readable lanes.
  3: [
    { asset: 'column', x: -5.6, z: -9.0 }, { asset: 'column', x: 5.6, z: -9.0 },
    { asset: 'column', x: -5.6, z: -4.0 }, { asset: 'column', x: 5.6, z: -4.0 },
    { asset: 'column', x: -5.6, z: 1.0 }, { asset: 'column', x: 5.6, z: 1.0 },
    { asset: 'column', x: -5.6, z: 6.0 }, { asset: 'column', x: 5.6, z: 6.0 },
    { asset: 'candle', x: -4.2, z: -6.5 }, { asset: 'candle', x: 4.2, z: -6.5 },
    { asset: 'candle', x: -4.2, z: -1.5 }, { asset: 'candle', x: 4.2, z: -1.5 },
    { asset: 'candle', x: -4.2, z: 3.5 }, { asset: 'candle', x: 4.2, z: 3.5 },
    { asset: 'bannerBlue', x: LEFT_WALL, z: -7.0, rotation: Math.PI / 2 },
    { asset: 'bannerBlue', x: RIGHT_WALL, z: -7.0, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: 4.2, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: 4.2, rotation: -Math.PI / 2 },
    { asset: 'chestGold', x: 7.0, z: 9.4, rotation: Math.PI },
  ],

  // 4 · Barrikadenraum — the barricade now pushes into the camera focus.
  4: [
    { asset: 'crates', x: -7.4, z: -9.5 },
    { asset: 'barrelStack', x: -5.7, z: -8.5, rotation: Math.PI / 2 },
    { asset: 'boxLarge', x: -7.5, z: -6.4 },
    { asset: 'crates', x: -5.9, z: -5.2, rotation: Math.PI / 2 },
    { asset: 'barrelDecorated', x: -7.2, z: -3.1 },
    { asset: 'barrel', x: -5.5, z: -2.5 },

    { asset: 'wallShelves', x: RIGHT_WALL, z: -9.0, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: -4.2, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: 6.7, z: -5.5, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 5.2, z: -5.5, rotation: Math.PI / 2 },
    { asset: 'chest', x: 7.0, z: -1.8, rotation: Math.PI / 2 },

    { asset: 'column', x: -5.5, z: 3.0 },
    { asset: 'column', x: 5.5, z: 3.0 },
    { asset: 'column', x: -5.5, z: 8.0 },
    { asset: 'column', x: 5.5, z: 8.0 },
    { asset: 'torchMounted', x: -5.2, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 5.2, z: TOP_WALL, rotation: Math.PI },
  ],

  // 5 · Schlafquartier — bed bays are fully visible from the mobile camera.
  5: [
    { asset: 'bed', x: -7.4, z: -10.0, rotation: Math.PI / 2 },
    { asset: 'bed', x: -7.4, z: -6.2, rotation: Math.PI / 2 },
    { asset: 'bed', x: -7.4, z: -2.4, rotation: Math.PI / 2 },
    { asset: 'bed', x: 7.4, z: -10.0, rotation: -Math.PI / 2 },
    { asset: 'bed', x: 7.4, z: -6.2, rotation: -Math.PI / 2 },
    { asset: 'bed', x: 7.4, z: -2.4, rotation: -Math.PI / 2 },
    { asset: 'tableMedium', x: -6.8, z: 2.0, rotation: Math.PI / 2 },
    { asset: 'chair', x: -5.4, z: 2.0, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -6.7, z: 1.8 },
    { asset: 'chest', x: -7.0, z: 5.8, rotation: Math.PI / 2 },
    { asset: 'tableMedium', x: 6.8, z: 2.0, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 5.4, z: 2.0, rotation: Math.PI / 2 },
    { asset: 'candle', x: 6.7, z: 1.8 },
    { asset: 'chestGold', x: 7.0, z: 5.8, rotation: -Math.PI / 2 },
    { asset: 'wallShelves', x: LEFT_WALL, z: 8.8, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: 8.8, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: LEFT_WALL, z: -0.4, rotation: Math.PI / 2 },
    { asset: 'torchMounted', x: RIGHT_WALL, z: -0.4, rotation: -Math.PI / 2 },
  ],

  // 6 · Bannerhalle — formal hall with visible side furniture and pillar axes.
  6: [
    { asset: 'bannerRed', x: LEFT_WALL, z: -10.0, rotation: Math.PI / 2, scale: 1.1 },
    { asset: 'bannerRed', x: RIGHT_WALL, z: -10.0, rotation: -Math.PI / 2, scale: 1.1 },
    { asset: 'bannerShieldRed', x: LEFT_WALL, z: -4.2, rotation: Math.PI / 2 },
    { asset: 'bannerShieldRed', x: RIGHT_WALL, z: -4.2, rotation: -Math.PI / 2 },
    { asset: 'swordShield', x: LEFT_WALL, z: 1.0, rotation: Math.PI / 2 },
    { asset: 'swordShield', x: RIGHT_WALL, z: 1.0, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: -6.7, z: 4.2, rotation: Math.PI / 2 },
    { asset: 'chair', x: -5.2, z: 3.9, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: 6.7, z: 4.2, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 5.2, z: 3.9, rotation: Math.PI / 2 },
    { asset: 'column', x: -5.8, z: -7.2 }, { asset: 'column', x: 5.8, z: -7.2 },
    { asset: 'column', x: -5.8, z: 8.0 }, { asset: 'column', x: 5.8, z: 8.0 },
    { asset: 'crates', x: -7.0, z: 9.4 },
    { asset: 'barrelStack', x: 7.0, z: 9.4 },
    { asset: 'torchMounted', x: -4.8, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 4.8, z: TOP_WALL, rotation: Math.PI },
  ],

  // 7 · Ritualhalle — the ring is strong enough to frame an intentionally open center.
  7: [
    { asset: 'column', x: -6.1, z: -8.0 }, { asset: 'column', x: 6.1, z: -8.0 },
    { asset: 'column', x: -6.8, z: -1.8 }, { asset: 'column', x: 6.8, z: -1.8 },
    { asset: 'column', x: -6.1, z: 4.8 }, { asset: 'column', x: 6.1, z: 4.8 },
    { asset: 'candle', x: -4.5, z: -5.8 }, { asset: 'candle', x: 0, z: -8.2 }, { asset: 'candle', x: 4.5, z: -5.8 },
    { asset: 'candle', x: -5.2, z: -0.5 }, { asset: 'candle', x: 5.2, z: -0.5 },
    { asset: 'candle', x: -4.5, z: 4.0 }, { asset: 'candle', x: 0, z: 6.4 }, { asset: 'candle', x: 4.5, z: 4.0 },
    { asset: 'bannerBlue', x: LEFT_WALL, z: -8.0, rotation: Math.PI / 2, scale: 1.1 },
    { asset: 'bannerBlue', x: RIGHT_WALL, z: -8.0, rotation: -Math.PI / 2, scale: 1.1 },
    { asset: 'bannerBlue', x: LEFT_WALL, z: 4.0, rotation: Math.PI / 2 },
    { asset: 'bannerBlue', x: RIGHT_WALL, z: 4.0, rotation: -Math.PI / 2 },
    { asset: 'torchMounted', x: -5.0, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 5.0, z: TOP_WALL, rotation: Math.PI },
  ],

  // 8 · Lagergewölbe — dense visible shelves with a central combat corridor.
  8: [
    { asset: 'crates', x: -7.6, z: -10.0 },
    { asset: 'boxLarge', x: -5.9, z: -8.8 },
    { asset: 'barrelStack', x: -7.4, z: -6.7 },
    { asset: 'barrelDecorated', x: -5.8, z: -5.4 },
    { asset: 'crates', x: -7.3, z: -3.1, rotation: Math.PI / 2 },
    { asset: 'wallShelves', x: LEFT_WALL, z: 0.0, rotation: Math.PI / 2 },
    { asset: 'tableLong', x: -6.8, z: 4.0, rotation: Math.PI / 2 },
    { asset: 'chair', x: -5.3, z: 4.0, rotation: -Math.PI / 2 },
    { asset: 'boxLarge', x: -7.4, z: 7.2 },
    { asset: 'barrel', x: -5.8, z: 8.0 },

    { asset: 'barrelDecorated', x: 7.6, z: -10.0 },
    { asset: 'crates', x: 5.9, z: -8.8 },
    { asset: 'boxLarge', x: 7.5, z: -6.5 },
    { asset: 'barrelStack', x: 5.9, z: -5.0, rotation: Math.PI / 2 },
    { asset: 'crates', x: 7.4, z: -2.6 },
    { asset: 'wallShelves', x: RIGHT_WALL, z: 0.0, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: 6.8, z: 4.0, rotation: -Math.PI / 2 },
    { asset: 'chair', x: 5.3, z: 4.0, rotation: Math.PI / 2 },
    { asset: 'chest', x: 7.2, z: 7.2, rotation: -Math.PI / 2 },
    { asset: 'barrel', x: 5.7, z: 8.0 },
    { asset: 'torchMounted', x: -4.8, z: TOP_WALL, rotation: Math.PI },
    { asset: 'torchMounted', x: 4.8, z: TOP_WALL, rotation: Math.PI },
  ],

  // 9 · Vorhalle des Wächters — visible procession lane and inner pillar rhythm.
  9: [
    { asset: 'bannerGreen', x: LEFT_WALL, z: -10.0, rotation: Math.PI / 2, scale: 1.15 },
    { asset: 'bannerGreen', x: RIGHT_WALL, z: -10.0, rotation: -Math.PI / 2, scale: 1.15 },
    { asset: 'bannerGreen', x: LEFT_WALL, z: 0.0, rotation: Math.PI / 2 },
    { asset: 'bannerGreen', x: RIGHT_WALL, z: 0.0, rotation: -Math.PI / 2 },
    { asset: 'column', x: -6.0, z: -8.0 }, { asset: 'column', x: 6.0, z: -8.0 },
    { asset: 'column', x: -6.0, z: -2.0 }, { asset: 'column', x: 6.0, z: -2.0 },
    { asset: 'column', x: -6.0, z: 4.0 }, { asset: 'column', x: 6.0, z: 4.0 },
    { asset: 'column', x: -6.0, z: 9.0 }, { asset: 'column', x: 6.0, z: 9.0 },
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

  // 10 · Bosskammer — monumental inner pillar axes around a clear kill zone.
  10: [
    { asset: 'bannerShieldRed', x: LEFT_WALL, z: -10.5, rotation: Math.PI / 2, scale: 1.3 },
    { asset: 'bannerShieldRed', x: RIGHT_WALL, z: -10.5, rotation: -Math.PI / 2, scale: 1.3 },
    { asset: 'bannerRed', x: LEFT_WALL, z: -4.0, rotation: Math.PI / 2, scale: 1.2 },
    { asset: 'bannerRed', x: RIGHT_WALL, z: -4.0, rotation: -Math.PI / 2, scale: 1.2 },
    { asset: 'bannerShieldRed', x: LEFT_WALL, z: 3.0, rotation: Math.PI / 2, scale: 1.15 },
    { asset: 'bannerShieldRed', x: RIGHT_WALL, z: 3.0, rotation: -Math.PI / 2, scale: 1.15 },

    { asset: 'column', x: -6.4, z: -8.5, scale: 1.25 }, { asset: 'column', x: 6.4, z: -8.5, scale: 1.25 },
    { asset: 'column', x: -6.4, z: -1.0, scale: 1.25 }, { asset: 'column', x: 6.4, z: -1.0, scale: 1.25 },
    { asset: 'column', x: -6.4, z: 6.5, scale: 1.25 }, { asset: 'column', x: 6.4, z: 6.5, scale: 1.25 },

    { asset: 'swordShield', x: -5.2, z: TOP_WALL, rotation: Math.PI, scale: 1.2 },
    { asset: 'swordShield', x: 5.2, z: TOP_WALL, rotation: Math.PI, scale: 1.2 },
    { asset: 'torchMounted', x: -2.4, z: TOP_WALL, rotation: Math.PI, scale: 1.25 },
    { asset: 'torchMounted', x: 2.4, z: TOP_WALL, rotation: Math.PI, scale: 1.25 },

    { asset: 'candle', x: -4.8, z: -6.0 }, { asset: 'candle', x: 4.8, z: -6.0 },
    { asset: 'candle', x: -4.8, z: -1.5 }, { asset: 'candle', x: 4.8, z: -1.5 },
    { asset: 'candle', x: -4.8, z: 3.0 }, { asset: 'candle', x: 4.8, z: 3.0 },
    { asset: 'chestGold', x: -7.0, z: 8.8, rotation: Math.PI },
    { asset: 'chestGold', x: 7.0, z: 8.8, rotation: Math.PI },
  ],
};

export const KAYKIT_COLLISION_SIZE: Partial<Record<KayKitRoomAsset, [number, number]>> = {
  column: [0.95, 0.95], barrel: [0.9, 0.9], barrelDecorated: [1.0, 1.0], barrelStack: [1.75, 1.25], crates: [1.9, 1.55],
  boxLarge: [1.3, 1.3], chest: [1.5, 1.05], chestGold: [1.5, 1.05], candle: [0.32, 0.32], chair: [0.88, 0.88], bed: [1.2, 2.1],
  tableLong: [2.6, 1.05], tableMedium: [1.75, 1.2],
};
