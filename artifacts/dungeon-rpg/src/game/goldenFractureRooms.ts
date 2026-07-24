export type GoldenFractureSilhouette =
  | 'fractured-causeway'
  | 'split-sanctum'
  | 'crescent-forge'
  | 'shattered-crossing'
  | 'twin-vaults'
  | 'spiral-descent'
  | 'broken-crown'
  | 'veil-bridges'
  | 'sunken-throne'
  | 'boss-oculus';

export type GoldenFractureHazard =
  | 'fracture-line'
  | 'delayed-burst'
  | 'rotating-sectors'
  | 'collapsing-lane'
  | 'paired-seals'
  | 'spiral-pulse'
  | 'crown-shards'
  | 'bridge-sweep'
  | 'throne-waves'
  | 'aurel-phases';

export type GoldenFracturePoint = { x: number; z: number };

export type GoldenFractureRoomSpec = {
  room: number;
  titleDe: string;
  titleEn: string;
  silhouette: GoldenFractureSilhouette;
  hazard: GoldenFractureHazard;
  portal: GoldenFracturePoint;
  enemySpawns: readonly GoldenFracturePoint[];
  enemyRoles: readonly string[];
  telegraphMs: number;
  recoveryMs: number;
};

const P = (x: number, z: number): GoldenFracturePoint => ({ x, z });

const room = (
  roomNumber: number,
  titleDe: string,
  titleEn: string,
  silhouette: GoldenFractureSilhouette,
  hazard: GoldenFractureHazard,
  portal: GoldenFracturePoint,
  enemySpawns: readonly GoldenFracturePoint[],
  enemyRoles: readonly string[],
  telegraphMs: number,
  recoveryMs: number,
): GoldenFractureRoomSpec => ({
  room: roomNumber,
  titleDe,
  titleEn,
  silhouette,
  hazard,
  portal,
  enemySpawns,
  enemyRoles,
  telegraphMs,
  recoveryMs,
});

export const GOLDEN_FRACTURE_ROOMS: Readonly<Record<number, GoldenFractureRoomSpec>> = {
  51: room(51, 'Geborstener Übergang', 'Fractured Causeway', 'fractured-causeway', 'fracture-line', P(0, -13.7), [P(-4.4, -5.7), P(4.4, -5.7), P(-2.2, -1.8), P(2.2, -1.8), P(-4.2, 3.5), P(4.2, 3.5)], ['vanguard', 'ranged'], 900, 650),
  52: room(52, 'Geteiltes Heiligtum', 'Split Sanctum', 'split-sanctum', 'delayed-burst', P(-5.0, -11.8), [P(-4.8, -5.4), P(-1.8, -4.6), P(3.8, -5.3), P(4.6, -1.2), P(-3.8, 1.8), P(0.2, 4.8)], ['guardian', 'mender'], 950, 700),
  53: room(53, 'Mondsichel-Schmiede', 'Crescent Forge', 'crescent-forge', 'rotating-sectors', P(5.0, -11.8), [P(-4.6, -5.6), P(0, -5.9), P(4.6, -5.6), P(-4.9, 0.2), P(4.9, 0.2), P(-2.7, 4.4), P(2.7, 4.4)], ['bruiser', 'ranged'], 1000, 700),
  54: room(54, 'Zerbrochene Kreuzung', 'Shattered Crossing', 'shattered-crossing', 'collapsing-lane', P(0, -13.7), [P(0, -6.2), P(-4.6, -2.7), P(4.6, -2.7), P(-2.2, 0.4), P(2.2, 0.4), P(-4.4, 4.8), P(4.4, 4.8)], ['vanguard', 'volatile'], 1000, 750),
  55: room(55, 'Zwillingsgewölbe', 'Twin Vaults', 'twin-vaults', 'paired-seals', P(-4.8, -12.0), [P(-4.8, -5.7), P(-1.6, -4.2), P(4.7, -5.4), P(1.6, -1.0), P(-4.4, 1.7), P(4.4, 1.7), P(-1.8, 5.0)], ['guardian', 'ranged', 'mender'], 1050, 800),
  56: room(56, 'Spiralabstieg', 'Spiral Descent', 'spiral-descent', 'spiral-pulse', P(4.8, -12.0), [P(-4.5, -5.8), P(-1.2, -4.5), P(3.7, -4.0), P(4.7, -0.4), P(2.0, 2.5), P(-1.6, 4.6), P(-4.7, 2.0), P(0.2, -0.2)], ['skirmisher', 'volatile'], 1050, 800),
  57: room(57, 'Gebrochene Krone', 'Broken Crown', 'broken-crown', 'crown-shards', P(0, -13.5), [P(-4.8, -5.1), P(0, -6.0), P(4.8, -5.1), P(-5.0, 0.2), P(5.0, 0.2), P(-3.0, 4.5), P(0, 5.2), P(3.0, 4.5)], ['bruiser', 'guardian'], 1100, 850),
  58: room(58, 'Schleierbrücken', 'Veil Bridges', 'veil-bridges', 'bridge-sweep', P(-5.2, -11.6), [P(-4.8, -5.8), P(0, -5.8), P(4.8, -5.8), P(-4.8, -0.4), P(0, -0.4), P(4.8, -0.4), P(-2.7, 4.7), P(2.7, 4.7)], ['ranged', 'skirmisher'], 1100, 850),
  59: room(59, 'Versunkener Thron', 'Sunken Throne', 'sunken-throne', 'throne-waves', P(5.2, -11.6), [P(-4.6, -5.4), P(0, -6.1), P(4.6, -5.4), P(-5.0, 0.1), P(5.0, 0.1), P(-3.5, 4.8), P(0, 5.3), P(3.5, 4.8)], ['vanguard', 'mender', 'volatile'], 1150, 900),
  60: room(60, 'Aurels Oculus', "Aurel's Oculus", 'boss-oculus', 'aurel-phases', P(0, -13.7), [P(0, 2.1), P(-3.8, 1.6), P(3.8, 1.6), P(0, 4.6)], ['chapter-boss'], 1200, 950),
};

export function isGoldenFractureRoom(roomNumber: number): boolean {
  return Number.isInteger(roomNumber) && roomNumber >= 51 && roomNumber <= 60;
}

export function goldenFractureRoomSpec(roomNumber: number): GoldenFractureRoomSpec | null {
  return GOLDEN_FRACTURE_ROOMS[roomNumber] ?? null;
}

export function goldenFracturePortalTile(roomNumber: number, mapWidth = 24, mapHeight = 32) {
  const spec = goldenFractureRoomSpec(roomNumber);
  if (!spec) return null;
  return {
    x: Math.max(2, Math.min(mapWidth - 3, Math.round(spec.portal.x + mapWidth / 2 - 0.5))),
    y: Math.max(2, Math.min(mapHeight - 3, Math.round(spec.portal.z + mapHeight / 2 - 0.5))),
  };
}
