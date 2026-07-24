export type ReliquarySilhouette =
  | 'sunken-threshold'
  | 'hall-of-chains'
  | 'broken-archives'
  | 'breathless-chapel'
  | 'green-vault'
  | 'reliquary-graves'
  | 'bell-beneath-water'
  | 'drowned-procession'
  | 'last-dry-ground'
  | 'leviathan-basin';

export type ReliquaryHazard =
  | 'alternating-flood-bands'
  | 'lateral-chain-sweeps'
  | 'delayed-tide-circles'
  | 'inward-tide-ring'
  | 'crossing-current-traces'
  | 'paired-bay-floods'
  | 'expanding-bell-waves'
  | 'moving-safe-corridor'
  | 'shrinking-island-overlap'
  | 'leviathan-phases';

export type ReliquaryPoint = { x: number; z: number };

export type ReliquaryRoomSpec = {
  room: number;
  titleDe: string;
  titleEn: string;
  silhouette: ReliquarySilhouette;
  hazard: ReliquaryHazard;
  portal: ReliquaryPoint;
  enemySpawns: readonly ReliquaryPoint[];
  enemyRoles: readonly string[];
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
};

const P = (x: number, z: number): ReliquaryPoint => ({ x, z });
const R = (
  room: number,
  titleDe: string,
  titleEn: string,
  silhouette: ReliquarySilhouette,
  hazard: ReliquaryHazard,
  portal: ReliquaryPoint,
  enemySpawns: readonly ReliquaryPoint[],
  enemyRoles: readonly string[],
  telegraphMs: number,
  activeMs: number,
  recoveryMs: number,
): ReliquaryRoomSpec => ({ room, titleDe, titleEn, silhouette, hazard, portal, enemySpawns, enemyRoles, telegraphMs, activeMs, recoveryMs });

export const DROWNED_RELIQUARY_ROOMS: Readonly<Record<number, ReliquaryRoomSpec>> = {
  71: R(71, 'Versunkene Schwelle', 'Sunken Threshold', 'sunken-threshold', 'alternating-flood-bands', P(0, -13.7), [P(-4.6, -5.8), P(4.6, -5.8), P(-2.6, -0.8), P(2.6, -0.8), P(-4.0, 4.3), P(4.0, 4.3)], ['vanguard', 'ranged'], 1350, 800, 1000),
  72: R(72, 'Halle der Ketten', 'Hall of Chains', 'hall-of-chains', 'lateral-chain-sweeps', P(4.8, -12.0), [P(-4.8, -5.4), P(0, -6.0), P(4.8, -5.4), P(-4.4, 0.6), P(4.4, 0.6), P(-2.8, 4.8), P(2.8, 4.8)], ['guardian', 'flanker'], 1250, 850, 950),
  73: R(73, 'Gebrochene Archive', 'Broken Archives', 'broken-archives', 'delayed-tide-circles', P(-4.8, -12.0), [P(-4.9, -5.7), P(0, -6.1), P(4.9, -5.7), P(-4.7, 0.2), P(4.7, 0.2), P(-3.2, 4.7), P(3.2, 4.7)], ['ranged', 'interrupter'], 1200, 900, 1000),
  74: R(74, 'Kapelle ohne Atem', 'Breathless Chapel', 'breathless-chapel', 'inward-tide-ring', P(0, -13.7), [P(-4.3, -5.6), P(4.3, -5.6), P(-5.0, -0.3), P(5.0, -0.3), P(-2.6, 4.7), P(2.6, 4.7)], ['anchor', 'support'], 1300, 850, 1100),
  75: R(75, 'Das grüne Gewölbe', 'The Green Vault', 'green-vault', 'crossing-current-traces', P(0, -13.5), [P(-4.7, -5.7), P(0, -6.0), P(4.7, -5.7), P(-4.5, 0.4), P(4.5, 0.4), P(0, 5.0)], ['pursuer', 'ranged'], 1200, 900, 1050),
  76: R(76, 'Reliquiengräber', 'Reliquary Graves', 'reliquary-graves', 'paired-bay-floods', P(4.8, -12.0), [P(-4.8, -5.5), P(0, -6.1), P(4.8, -5.5), P(-4.9, 1.0), P(4.9, 1.0), P(-2.8, 4.9), P(2.8, 4.9)], ['bay-guard', 'interrupter'], 1250, 900, 1100),
  77: R(77, 'Glocke unter Wasser', 'Bell Beneath Water', 'bell-beneath-water', 'expanding-bell-waves', P(-4.8, -12.0), [P(-4.7, -5.8), P(0, -6.0), P(4.7, -5.8), P(-4.7, 0), P(4.7, 0), P(-3.0, 4.7), P(3.0, 4.7)], ['controller', 'skirmisher'], 1400, 750, 1200),
  78: R(78, 'Ertrunkene Prozession', 'Drowned Procession', 'drowned-procession', 'moving-safe-corridor', P(0, -13.7), [P(-4.8, -5.3), P(0, -6.2), P(4.8, -5.3), P(-5.0, 1.2), P(5.0, 1.2), P(-2.8, 4.9), P(2.8, 4.9)], ['pursuer', 'assassin', 'ranger'], 1300, 900, 1150),
  79: R(79, 'Letzte Trockenheit', 'The Last Dry Ground', 'last-dry-ground', 'shrinking-island-overlap', P(0, -13.7), [P(-4.9, -5.6), P(0, -6.2), P(4.9, -5.6), P(-5.0, 0.2), P(5.0, 0.2), P(-3.2, 4.8), P(0, 5.3), P(3.2, 4.8)], ['elite-pursuer', 'elite-controller', 'interrupter'], 1450, 950, 1250),
  80: R(80, 'Der Reliquiar-Leviathan', 'The Reliquary Leviathan', 'leviathan-basin', 'leviathan-phases', P(0, -13.7), [P(0, 2.0), P(-4.2, 1.4), P(4.2, 1.4), P(-2.5, 4.7), P(2.5, 4.7)], ['chapter-boss'], 1500, 1000, 1300),
};

export function isDrownedReliquaryRoom(room: number): boolean {
  return Number.isInteger(room) && room >= 71 && room <= 80;
}

export function drownedReliquaryRoomSpec(room: number): ReliquaryRoomSpec | null {
  return DROWNED_RELIQUARY_ROOMS[room] ?? null;
}

export function reliquaryPortalTile(room: number, mapWidth = 24, mapHeight = 32) {
  const spec = drownedReliquaryRoomSpec(room);
  if (!spec) return null;
  return {
    x: Math.max(2, Math.min(mapWidth - 3, Math.round(spec.portal.x + mapWidth / 2 - 0.5))),
    y: Math.max(2, Math.min(mapHeight - 3, Math.round(spec.portal.z + mapHeight / 2 - 0.5))),
  };
}
