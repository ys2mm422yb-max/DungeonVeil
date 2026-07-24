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

export type GoldenFractureRoomSpec = {
  room: number;
  titleDe: string;
  titleEn: string;
  silhouette: GoldenFractureSilhouette;
  hazard: GoldenFractureHazard;
  portal: { x: number; z: number };
  enemyRoles: readonly string[];
  telegraphMs: number;
  recoveryMs: number;
};

const room = (
  roomNumber: number,
  titleDe: string,
  titleEn: string,
  silhouette: GoldenFractureSilhouette,
  hazard: GoldenFractureHazard,
  portal: { x: number; z: number },
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
  enemyRoles,
  telegraphMs,
  recoveryMs,
});

export const GOLDEN_FRACTURE_ROOMS: Readonly<Record<number, GoldenFractureRoomSpec>> = {
  51: room(51, 'Geborstener Übergang', 'Fractured Causeway', 'fractured-causeway', 'fracture-line', { x: 0, z: -13.7 }, ['vanguard', 'ranged'], 900, 650),
  52: room(52, 'Geteiltes Heiligtum', 'Split Sanctum', 'split-sanctum', 'delayed-burst', { x: -5.0, z: -11.8 }, ['guardian', 'mender'], 950, 700),
  53: room(53, 'Mondsichel-Schmiede', 'Crescent Forge', 'crescent-forge', 'rotating-sectors', { x: 5.0, z: -11.8 }, ['bruiser', 'ranged'], 1000, 700),
  54: room(54, 'Zerbrochene Kreuzung', 'Shattered Crossing', 'shattered-crossing', 'collapsing-lane', { x: 0, z: -13.7 }, ['vanguard', 'volatile'], 1000, 750),
  55: room(55, 'Zwillingsgewölbe', 'Twin Vaults', 'twin-vaults', 'paired-seals', { x: -4.8, z: -12.0 }, ['guardian', 'ranged', 'mender'], 1050, 800),
  56: room(56, 'Spiralabstieg', 'Spiral Descent', 'spiral-descent', 'spiral-pulse', { x: 4.8, z: -12.0 }, ['skirmisher', 'volatile'], 1050, 800),
  57: room(57, 'Gebrochene Krone', 'Broken Crown', 'broken-crown', 'crown-shards', { x: 0, z: -13.5 }, ['bruiser', 'guardian'], 1100, 850),
  58: room(58, 'Schleierbrücken', 'Veil Bridges', 'veil-bridges', 'bridge-sweep', { x: -5.2, z: -11.6 }, ['ranged', 'skirmisher'], 1100, 850),
  59: room(59, 'Versunkener Thron', 'Sunken Throne', 'sunken-throne', 'throne-waves', { x: 5.2, z: -11.6 }, ['vanguard', 'mender', 'volatile'], 1150, 900),
  60: room(60, 'Aurels Oculus', "Aurel's Oculus", 'boss-oculus', 'aurel-phases', { x: 0, z: -13.7 }, ['chapter-boss'], 1200, 950),
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
