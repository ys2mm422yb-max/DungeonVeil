export type CinderCrownSilhouette =
  | 'cinder-gate'
  | 'chain-court'
  | 'bellows-hall'
  | 'black-anvil'
  | 'shattered-battlements'
  | 'ember-procession'
  | 'crown-crucible'
  | 'slag-throne'
  | 'last-coronation'
  | 'ashen-king-arena';

export type CinderCrownHazard =
  | 'alternating-ember-lanes'
  | 'chain-drag-sweeps'
  | 'delayed-furnace-vents'
  | 'rotating-safe-wedges'
  | 'collapsing-basalt-plates'
  | 'advancing-ember-wall'
  | 'twin-crucible-bursts'
  | 'cross-lane-slag-waves'
  | 'layered-crown-pattern'
  | 'ashen-king-phases';

export type CinderCrownPoint = { x: number; z: number };

export type CinderCrownRoomSpec = {
  room: number;
  titleDe: string;
  titleEn: string;
  silhouette: CinderCrownSilhouette;
  hazard: CinderCrownHazard;
  portal: CinderCrownPoint;
  enemySpawns: readonly CinderCrownPoint[];
  enemyRoles: readonly string[];
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
};

const P = (x: number, z: number): CinderCrownPoint => ({ x, z });
const R = (
  room: number,
  titleDe: string,
  titleEn: string,
  silhouette: CinderCrownSilhouette,
  hazard: CinderCrownHazard,
  portal: CinderCrownPoint,
  enemySpawns: readonly CinderCrownPoint[],
  enemyRoles: readonly string[],
  telegraphMs: number,
  activeMs: number,
  recoveryMs: number,
): CinderCrownRoomSpec => ({ room, titleDe, titleEn, silhouette, hazard, portal, enemySpawns, enemyRoles, telegraphMs, activeMs, recoveryMs });

export const CINDER_CROWN_ROOMS: Readonly<Record<number, CinderCrownRoomSpec>> = {
  81: R(81, 'Tor der Aschenkrone', 'Gate of the Cinder Crown', 'cinder-gate', 'alternating-ember-lanes', P(0, -13.7), [P(-4.8, -5.8), P(4.8, -5.8), P(-2.8, -0.8), P(2.8, -0.8), P(-4.0, 4.5), P(4.0, 4.5)], ['vanguard', 'ranged'], 1350, 800, 1050),
  82: R(82, 'Kettenhof', 'Chain Court', 'chain-court', 'chain-drag-sweeps', P(4.8, -12.0), [P(-4.9, -5.5), P(0, -6.1), P(4.9, -5.5), P(-4.8, 0.5), P(4.8, 0.5), P(-2.8, 4.9), P(2.8, 4.9)], ['guardian', 'flanker'], 1300, 850, 1000),
  83: R(83, 'Halle der Blasebälge', 'Bellows Hall', 'bellows-hall', 'delayed-furnace-vents', P(-4.8, -12.0), [P(-4.9, -5.7), P(0, -6.2), P(4.9, -5.7), P(-4.7, 0.4), P(4.7, 0.4), P(-3.0, 4.8), P(3.0, 4.8)], ['ranged', 'interrupter'], 1250, 900, 1050),
  84: R(84, 'Der schwarze Amboss', 'The Black Anvil', 'black-anvil', 'rotating-safe-wedges', P(0, -13.7), [P(-4.4, -5.6), P(4.4, -5.6), P(-5.0, 0), P(5.0, 0), P(-2.7, 4.8), P(2.7, 4.8)], ['anchor', 'support'], 1400, 850, 1150),
  85: R(85, 'Geborstene Zinnen', 'Shattered Battlements', 'shattered-battlements', 'collapsing-basalt-plates', P(0, -13.5), [P(-4.8, -5.8), P(0, -6.2), P(4.8, -5.8), P(-4.6, 0.5), P(4.6, 0.5), P(0, 5.1)], ['pursuer', 'ranged'], 1300, 900, 1100),
  86: R(86, 'Glutprozession', 'Ember Procession', 'ember-procession', 'advancing-ember-wall', P(4.8, -12.0), [P(-4.9, -5.5), P(0, -6.2), P(4.9, -5.5), P(-4.9, 1.0), P(4.9, 1.0), P(-2.9, 4.9), P(2.9, 4.9)], ['bay-guard', 'interrupter'], 1350, 900, 1150),
  87: R(87, 'Kronenschmelze', 'Crown Crucible', 'crown-crucible', 'twin-crucible-bursts', P(-4.8, -12.0), [P(-4.8, -5.8), P(0, -6.1), P(4.8, -5.8), P(-4.8, 0.1), P(4.8, 0.1), P(-3.1, 4.8), P(3.1, 4.8)], ['controller', 'skirmisher'], 1450, 800, 1200),
  88: R(88, 'Thron der Schlacke', 'Slag Throne', 'slag-throne', 'cross-lane-slag-waves', P(0, -13.7), [P(-4.9, -5.4), P(0, -6.3), P(4.9, -5.4), P(-5.0, 1.2), P(5.0, 1.2), P(-2.9, 5.0), P(2.9, 5.0)], ['pursuer', 'assassin', 'ranger'], 1350, 950, 1200),
  89: R(89, 'Letzte Krönung', 'The Last Coronation', 'last-coronation', 'layered-crown-pattern', P(0, -13.7), [P(-5.0, -5.7), P(0, -6.3), P(5.0, -5.7), P(-5.0, 0.3), P(5.0, 0.3), P(-3.2, 4.9), P(0, 5.4), P(3.2, 4.9)], ['elite-pursuer', 'elite-controller', 'interrupter'], 1500, 950, 1300),
  90: R(90, 'Der Aschenkönig', 'The Ashen King', 'ashen-king-arena', 'ashen-king-phases', P(0, -13.7), [P(0, 2.0), P(-4.3, 1.4), P(4.3, 1.4), P(-2.6, 4.8), P(2.6, 4.8)], ['chapter-boss'], 1600, 1000, 1400),
};

export function isCinderCrownRoom(room: number): boolean {
  return Number.isInteger(room) && room >= 81 && room <= 90;
}

export function cinderCrownRoomSpec(room: number): CinderCrownRoomSpec | null {
  return CINDER_CROWN_ROOMS[room] ?? null;
}

export function cinderCrownPortalTile(room: number, mapWidth = 24, mapHeight = 32) {
  const spec = cinderCrownRoomSpec(room);
  if (!spec) return null;
  return {
    x: Math.max(2, Math.min(mapWidth - 3, Math.round(spec.portal.x + mapWidth / 2 - 0.5))),
    y: Math.max(2, Math.min(mapHeight - 3, Math.round(spec.portal.z + mapHeight / 2 - 0.5))),
  };
}
