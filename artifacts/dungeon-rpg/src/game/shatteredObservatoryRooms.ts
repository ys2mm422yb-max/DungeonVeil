export type ObservatorySilhouette =
  | 'fallen-orrery'
  | 'meridian-split'
  | 'lens-graveyard'
  | 'astral-causeway'
  | 'clock-of-ash'
  | 'silent-ephemeris'
  | 'comet-archive'
  | 'parallax-vault'
  | 'last-calculation'
  | 'astronomer-crown';

export type ObservatoryHazard =
  | 'rotating-star-lane'
  | 'alternating-starfall-bands'
  | 'lens-burn-zones'
  | 'sequential-starfall'
  | 'opposed-rotating-lanes'
  | 'star-node-sequence'
  | 'crossing-comet-traces'
  | 'parallax-bay-pulses'
  | 'calculation-overlap'
  | 'astronomer-phases';

export type ObservatoryPoint = { x: number; z: number };

export type ObservatoryRoomSpec = {
  room: number;
  titleDe: string;
  titleEn: string;
  silhouette: ObservatorySilhouette;
  hazard: ObservatoryHazard;
  portal: ObservatoryPoint;
  enemySpawns: readonly ObservatoryPoint[];
  enemyRoles: readonly string[];
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
};

const P = (x: number, z: number): ObservatoryPoint => ({ x, z });
const R = (
  room: number,
  titleDe: string,
  titleEn: string,
  silhouette: ObservatorySilhouette,
  hazard: ObservatoryHazard,
  portal: ObservatoryPoint,
  enemySpawns: readonly ObservatoryPoint[],
  enemyRoles: readonly string[],
  telegraphMs: number,
  activeMs: number,
  recoveryMs: number,
): ObservatoryRoomSpec => ({ room, titleDe, titleEn, silhouette, hazard, portal, enemySpawns, enemyRoles, telegraphMs, activeMs, recoveryMs });

export const SHATTERED_OBSERVATORY_ROOMS: Readonly<Record<number, ObservatoryRoomSpec>> = {
  61: R(61, 'Gefallenes Orrery', 'Fallen Orrery', 'fallen-orrery', 'rotating-star-lane', P(0, -13.7), [P(-4.5, -5.6), P(4.5, -5.6), P(-2.4, -1.0), P(2.4, -1.0), P(-4.2, 4.2), P(4.2, 4.2)], ['controller', 'pursuer'], 1200, 650, 900),
  62: R(62, 'Geteilter Meridian', 'Meridian Split', 'meridian-split', 'alternating-starfall-bands', P(4.9, -11.8), [P(-4.7, -5.4), P(0, -5.9), P(4.7, -5.4), P(-4.2, 0.5), P(4.2, 0.5), P(-2.3, 4.7), P(2.3, 4.7)], ['guardian', 'flanker'], 1150, 700, 850),
  63: R(63, 'Linsengrab', 'Lens Graveyard', 'lens-graveyard', 'lens-burn-zones', P(-4.9, -11.8), [P(-4.8, -5.6), P(0, -6.1), P(4.8, -5.6), P(-5.0, 0), P(5.0, 0), P(-3.2, 4.8), P(3.2, 4.8)], ['ranged', 'interrupter'], 1100, 750, 900),
  64: R(64, 'Astraler Damm', 'Astral Causeway', 'astral-causeway', 'sequential-starfall', P(0, -13.7), [P(-2.8, -6.1), P(2.8, -6.1), P(-4.7, -1.6), P(4.7, -1.6), P(-2.8, 3.5), P(2.8, 3.5)], ['vanguard', 'ranged'], 1050, 800, 950),
  65: R(65, 'Uhr der Asche', 'Clock of Ash', 'clock-of-ash', 'opposed-rotating-lanes', P(0, -13.5), [P(0, -5.9), P(-4.7, -3.0), P(4.7, -3.0), P(-4.8, 2.2), P(4.8, 2.2), P(0, 5.2)], ['anchor', 'support'], 1200, 850, 1000),
  66: R(66, 'Stille Ephemeride', 'Silent Ephemeris', 'silent-ephemeris', 'star-node-sequence', P(4.8, -12.0), [P(-4.6, -5.7), P(0, -6.0), P(4.6, -5.7), P(-4.5, 0.4), P(4.5, 0.4), P(-2.6, 4.8), P(2.6, 4.8)], ['caster', 'ranger', 'assassin'], 1100, 700, 1000),
  67: R(67, 'Kometenarchiv', 'Comet Archive', 'comet-archive', 'crossing-comet-traces', P(-4.8, -12.0), [P(-4.8, -5.7), P(0, -5.8), P(4.8, -5.7), P(-4.7, -0.2), P(4.7, -0.2), P(-3.0, 4.6), P(3.0, 4.6)], ['pursuer', 'ranged'], 1250, 650, 1100),
  68: R(68, 'Parallaxen-Gewölbe', 'Parallax Vault', 'parallax-vault', 'parallax-bay-pulses', P(0, -13.7), [P(-4.8, -5.3), P(0, -6.1), P(4.8, -5.3), P(-5.0, 1.2), P(5.0, 1.2), P(-2.8, 4.9), P(2.8, 4.9)], ['bay-guard', 'skirmisher'], 1150, 800, 1050),
  69: R(69, 'Die letzte Berechnung', 'The Last Calculation', 'last-calculation', 'calculation-overlap', P(0, -13.7), [P(-4.8, -5.5), P(0, -6.2), P(4.8, -5.5), P(-5.0, 0.2), P(5.0, 0.2), P(-3.2, 4.8), P(0, 5.3), P(3.2, 4.8)], ['elite-pursuer', 'elite-controller', 'interrupter'], 1300, 850, 1150),
  70: R(70, 'Der entfesselte Astronom', 'The Astronomer Unbound', 'astronomer-crown', 'astronomer-phases', P(0, -13.7), [P(0, 2.0), P(-4.1, 1.4), P(4.1, 1.4), P(-2.4, 4.6), P(2.4, 4.6)], ['chapter-boss'], 1400, 900, 1200),
};

export function isShatteredObservatoryRoom(room: number): boolean {
  return Number.isInteger(room) && room >= 61 && room <= 70;
}

export function shatteredObservatoryRoomSpec(room: number): ObservatoryRoomSpec | null {
  return SHATTERED_OBSERVATORY_ROOMS[room] ?? null;
}

export function observatoryPortalTile(room: number, mapWidth = 24, mapHeight = 32) {
  const spec = shatteredObservatoryRoomSpec(room);
  if (!spec) return null;
  return {
    x: Math.max(2, Math.min(mapWidth - 3, Math.round(spec.portal.x + mapWidth / 2 - 0.5))),
    y: Math.max(2, Math.min(mapHeight - 3, Math.round(spec.portal.z + mapHeight / 2 - 0.5))),
  };
}
