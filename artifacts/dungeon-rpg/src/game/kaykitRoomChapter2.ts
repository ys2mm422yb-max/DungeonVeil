import type { KayKitRoomPlacement } from './kaykitRoomLayout';

/** Chapter-two room compositions. Only assets already exposed by the KayKit dungeon pack are used. */
export const KAYKIT_CHAPTER_TWO_PROPS: Record<number, KayKitRoomPlacement[]> = {
  // 11 · Verwurzelter Durchgang — broken expedition camp with two offset lanes.
  11: [
    { asset: 'column', x: -6.2, z: -8.5 }, { asset: 'column', x: 6.2, z: -8.5 },
    { asset: 'crates', x: -6.5, z: -4.6 }, { asset: 'barrelStack', x: -4.8, z: -3.4, rotation: Math.PI / 2 },
    { asset: 'boxLarge', x: 5.0, z: -1.8 }, { asset: 'crates', x: 6.7, z: -0.5, rotation: Math.PI / 2 },
    { asset: 'tableMedium', x: -6.5, z: 4.3, rotation: Math.PI / 2 }, { asset: 'chair', x: -5.1, z: 4.3, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -6.4, z: 4.1 }, { asset: 'chest', x: 6.6, z: 6.0, rotation: -Math.PI / 2 },
    { asset: 'bannerGreen', x: -11.35, z: -6.0, rotation: Math.PI / 2 }, { asset: 'bannerGreen', x: 11.35, z: -6.0, rotation: -Math.PI / 2 },
  ],

  // 12 · Gruftlager — tomb-supply room, narrow side pockets and open center.
  12: [
    { asset: 'wallShelves', x: -11.35, z: -9.2, rotation: Math.PI / 2 }, { asset: 'wallShelves', x: 11.35, z: -9.2, rotation: -Math.PI / 2 },
    { asset: 'chest', x: -7.2, z: -6.4, rotation: Math.PI / 2 }, { asset: 'chestGold', x: 7.2, z: -6.4, rotation: -Math.PI / 2 },
    { asset: 'column', x: -4.4, z: -2.0 }, { asset: 'column', x: 4.4, z: -2.0 },
    { asset: 'candle', x: -3.2, z: -2.0 }, { asset: 'candle', x: 3.2, z: -2.0 },
    { asset: 'crates', x: -6.8, z: 4.5 }, { asset: 'barrelDecorated', x: -5.1, z: 5.4 },
    { asset: 'barrelStack', x: 6.6, z: 4.8 }, { asset: 'boxLarge', x: 5.0, z: 5.8 },
    { asset: 'torchMounted', x: -11.35, z: 1.5, rotation: Math.PI / 2 }, { asset: 'torchMounted', x: 11.35, z: 1.5, rotation: -Math.PI / 2 },
  ],

  // 13 · Zerbrochener Hain — three staggered stone islands.
  13: [
    { asset: 'column', x: -5.7, z: -7.8, scale: 1.1 }, { asset: 'column', x: 5.7, z: -7.8, scale: 1.1 },
    { asset: 'boxLarge', x: -2.8, z: -3.2 }, { asset: 'candle', x: -1.7, z: -3.2 },
    { asset: 'boxLarge', x: 2.9, z: 0.8 }, { asset: 'candle', x: 1.8, z: 0.8 },
    { asset: 'column', x: -3.4, z: 5.0 }, { asset: 'column', x: 3.4, z: 5.0 },
    { asset: 'chest', x: -7.5, z: 8.0, rotation: Math.PI / 2 }, { asset: 'chestGold', x: 7.5, z: 8.0, rotation: -Math.PI / 2 },
    { asset: 'bannerGreen', x: -11.35, z: -2.0, rotation: Math.PI / 2 }, { asset: 'bannerGreen', x: 11.35, z: 3.5, rotation: -Math.PI / 2 },
  ],

  // 14 · Dornkaserne — weapon walls and offset defense stations.
  14: [
    { asset: 'swordShield', x: -11.35, z: -10.0, rotation: Math.PI / 2 }, { asset: 'swordShield', x: 11.35, z: -10.0, rotation: -Math.PI / 2 },
    { asset: 'wallShelves', x: -11.35, z: -4.5, rotation: Math.PI / 2 }, { asset: 'wallShelves', x: 11.35, z: -4.5, rotation: -Math.PI / 2 },
    { asset: 'crates', x: -5.8, z: -5.7 }, { asset: 'barrelStack', x: -4.1, z: -4.5, rotation: Math.PI / 2 },
    { asset: 'boxLarge', x: 4.3, z: -1.0 }, { asset: 'crates', x: 6.0, z: 0.4, rotation: Math.PI / 2 },
    { asset: 'tableLong', x: -6.8, z: 5.4, rotation: Math.PI / 2 }, { asset: 'chair', x: -5.2, z: 5.4, rotation: -Math.PI / 2 },
    { asset: 'tableLong', x: 6.8, z: 5.4, rotation: -Math.PI / 2 }, { asset: 'chair', x: 5.2, z: 5.4, rotation: Math.PI / 2 },
  ],

  // 15 · Kapelle der Asche — candle processional with a broken center.
  15: [
    { asset: 'bannerBlue', x: -11.35, z: -8.0, rotation: Math.PI / 2, scale: 1.15 }, { asset: 'bannerBlue', x: 11.35, z: -8.0, rotation: -Math.PI / 2, scale: 1.15 },
    { asset: 'column', x: -5.8, z: -7.0 }, { asset: 'column', x: 5.8, z: -7.0 },
    { asset: 'candle', x: -1.7, z: -6.2 }, { asset: 'candle', x: 1.7, z: -6.2 },
    { asset: 'candle', x: -1.7, z: -2.5 }, { asset: 'candle', x: 1.7, z: -2.5 },
    { asset: 'boxLarge', x: -2.6, z: 0.8 }, { asset: 'boxLarge', x: 2.6, z: 3.0 },
    { asset: 'candle', x: -1.5, z: 0.8 }, { asset: 'candle', x: 1.5, z: 3.0 },
    { asset: 'column', x: -5.8, z: 7.0 }, { asset: 'column', x: 5.8, z: 7.0 },
  ],

  // 16 · Beinhaus — dense side storage, deliberate diagonal route.
  16: [
    { asset: 'crates', x: -7.4, z: -10.0 }, { asset: 'barrelStack', x: -5.6, z: -8.8 },
    { asset: 'boxLarge', x: -6.8, z: -5.7 }, { asset: 'barrelDecorated', x: -5.0, z: -4.5 },
    { asset: 'crates', x: 7.4, z: -7.0 }, { asset: 'barrelStack', x: 5.6, z: -5.8 },
    { asset: 'boxLarge', x: 6.8, z: -2.4 }, { asset: 'barrelDecorated', x: 5.0, z: -1.2 },
    { asset: 'crates', x: -6.2, z: 2.2 }, { asset: 'barrel', x: -4.7, z: 3.2 },
    { asset: 'crates', x: 6.4, z: 6.4 }, { asset: 'chest', x: 4.8, z: 7.4 },
    { asset: 'torchMounted', x: -11.35, z: 0.0, rotation: Math.PI / 2 }, { asset: 'torchMounted', x: 11.35, z: 0.0, rotation: -Math.PI / 2 },
  ],

  // 17 · Hexengewölbe — ritual ring with asymmetric exits.
  17: [
    { asset: 'column', x: -6.4, z: -8.2 }, { asset: 'column', x: 6.4, z: -8.2 },
    { asset: 'candle', x: -4.8, z: -5.6 }, { asset: 'candle', x: 0, z: -7.6 }, { asset: 'candle', x: 4.8, z: -5.6 },
    { asset: 'column', x: -6.8, z: -0.8 }, { asset: 'column', x: 6.0, z: 1.1 },
    { asset: 'candle', x: -4.8, z: 1.8 }, { asset: 'candle', x: 0, z: 3.4 }, { asset: 'candle', x: 4.8, z: 2.0 },
    { asset: 'chestGold', x: -7.8, z: 7.8, rotation: Math.PI / 2 }, { asset: 'chest', x: 7.8, z: 7.8, rotation: -Math.PI / 2 },
    { asset: 'bannerBlue', x: -11.35, z: -3.5, rotation: Math.PI / 2 }, { asset: 'bannerBlue', x: 11.35, z: 4.0, rotation: -Math.PI / 2 },
  ],

  // 18 · Knochenprozession — long candle lane with alternating cover.
  18: [
    { asset: 'column', x: -6.0, z: -9.0 }, { asset: 'column', x: 6.0, z: -9.0 },
    { asset: 'candle', x: -1.6, z: -8.0 }, { asset: 'candle', x: 1.6, z: -8.0 },
    { asset: 'boxLarge', x: -3.0, z: -4.0 }, { asset: 'candle', x: -1.9, z: -4.0 },
    { asset: 'boxLarge', x: 3.0, z: 0.0 }, { asset: 'candle', x: 1.9, z: 0.0 },
    { asset: 'boxLarge', x: -3.0, z: 4.0 }, { asset: 'candle', x: -1.9, z: 4.0 },
    { asset: 'column', x: -6.0, z: 8.0 }, { asset: 'column', x: 6.0, z: 8.0 },
    { asset: 'bannerShieldRed', x: -11.35, z: -4.0, rotation: Math.PI / 2 }, { asset: 'bannerShieldRed', x: 11.35, z: -4.0, rotation: -Math.PI / 2 },
  ],

  // 19 · Schleier-Vorhof — monumental test before the final boss.
  19: [
    { asset: 'bannerShieldRed', x: -11.35, z: -10.0, rotation: Math.PI / 2, scale: 1.2 }, { asset: 'bannerShieldRed', x: 11.35, z: -10.0, rotation: -Math.PI / 2, scale: 1.2 },
    { asset: 'column', x: -6.2, z: -8.5, scale: 1.16 }, { asset: 'column', x: 6.2, z: -8.5, scale: 1.16 },
    { asset: 'column', x: -4.6, z: -2.6, scale: 1.08 }, { asset: 'column', x: 4.6, z: -2.6, scale: 1.08 },
    { asset: 'candle', x: -1.5, z: -6.0 }, { asset: 'candle', x: 1.5, z: -6.0 },
    { asset: 'candle', x: -1.5, z: -2.0 }, { asset: 'candle', x: 1.5, z: -2.0 },
    { asset: 'column', x: -6.2, z: 4.8, scale: 1.16 }, { asset: 'column', x: 6.2, z: 4.8, scale: 1.16 },
    { asset: 'chestGold', x: -7.8, z: 8.6, rotation: Math.PI }, { asset: 'chestGold', x: 7.8, z: 8.6, rotation: Math.PI },
  ],

  // 20 · Herz des Schleiers — open final-boss floor with a heavy outer frame.
  20: [
    { asset: 'bannerRed', x: -11.35, z: -10.5, rotation: Math.PI / 2, scale: 1.4 }, { asset: 'bannerRed', x: 11.35, z: -10.5, rotation: -Math.PI / 2, scale: 1.4 },
    { asset: 'bannerShieldRed', x: -11.35, z: -4.5, rotation: Math.PI / 2, scale: 1.3 }, { asset: 'bannerShieldRed', x: 11.35, z: -4.5, rotation: -Math.PI / 2, scale: 1.3 },
    { asset: 'column', x: -7.0, z: -8.2, scale: 1.38 }, { asset: 'column', x: 7.0, z: -8.2, scale: 1.38 },
    { asset: 'column', x: -7.0, z: -0.5, scale: 1.38 }, { asset: 'column', x: 7.0, z: -0.5, scale: 1.38 },
    { asset: 'column', x: -7.0, z: 7.0, scale: 1.38 }, { asset: 'column', x: 7.0, z: 7.0, scale: 1.38 },
    { asset: 'torchMounted', x: -3.2, z: -15.3, rotation: Math.PI, scale: 1.35 }, { asset: 'torchMounted', x: 3.2, z: -15.3, rotation: Math.PI, scale: 1.35 },
    { asset: 'candle', x: -5.1, z: -5.0 }, { asset: 'candle', x: 5.1, z: -5.0 },
    { asset: 'candle', x: -5.1, z: 1.0 }, { asset: 'candle', x: 5.1, z: 1.0 },
    { asset: 'chestGold', x: -8.0, z: 9.2, rotation: Math.PI }, { asset: 'chestGold', x: 8.0, z: 9.2, rotation: Math.PI },
  ],
};

export function getChapterTwoRoomProps(room: number): KayKitRoomPlacement[] | undefined {
  return KAYKIT_CHAPTER_TWO_PROPS[room];
}
