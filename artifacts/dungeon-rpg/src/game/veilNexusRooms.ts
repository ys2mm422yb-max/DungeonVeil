export type VeilNexusSilhouette =
  | 'nexus-gate'
  | 'mirror-vault'
  | 'broken-axis'
  | 'echo-cloister'
  | 'convergence-bridge'
  | 'memory-engine'
  | 'fourfold-sanctum'
  | 'last-threshold'
  | 'heart-approach'
  | 'veil-core-arena';

export type VeilNexusHazard =
  | 'phased-veil-gates'
  | 'marked-echo-impacts'
  | 'rotating-bridge-segments'
  | 'linked-anchor-zones'
  | 'gravity-pulses'
  | 'converging-pressure-lanes'
  | 'sequenced-portal-routes'
  | 'fracture-echo-pattern'
  | 'layered-nexus-sequence'
  | 'veil-core-phases';

export type VeilNexusPoint = { x: number; z: number };

export type VeilNexusRoomSpec = {
  room: number;
  titleDe: string;
  titleEn: string;
  silhouette: VeilNexusSilhouette;
  hazard: VeilNexusHazard;
  portal: VeilNexusPoint;
  enemySpawns: readonly VeilNexusPoint[];
  enemyRoles: readonly string[];
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
};

const P = (x: number, z: number): VeilNexusPoint => ({ x, z });
const R = (
  room: number,
  titleDe: string,
  titleEn: string,
  silhouette: VeilNexusSilhouette,
  hazard: VeilNexusHazard,
  portal: VeilNexusPoint,
  enemySpawns: readonly VeilNexusPoint[],
  enemyRoles: readonly string[],
  telegraphMs: number,
  activeMs: number,
  recoveryMs: number,
): VeilNexusRoomSpec => ({ room, titleDe, titleEn, silhouette, hazard, portal, enemySpawns, enemyRoles, telegraphMs, activeMs, recoveryMs });

export const VEIL_NEXUS_ROOMS: Readonly<Record<number, VeilNexusRoomSpec>> = {
  91: R(91, 'Schwelle des Schleiers', 'Threshold of the Veil', 'nexus-gate', 'phased-veil-gates', P(0, -13.7), [P(-4.8, -5.8), P(4.8, -5.8), P(-2.6, -0.8), P(2.6, -0.8), P(-4.0, 4.6), P(4.0, 4.6)], ['vanguard', 'interrupter'], 1450, 820, 1150),
  92: R(92, 'Halle der Echos', 'Hall of Echoes', 'mirror-vault', 'marked-echo-impacts', P(4.8, -12.0), [P(-4.8, -5.7), P(0, -6.2), P(4.8, -5.7), P(-4.6, 0.4), P(4.6, 0.4), P(-2.8, 4.9), P(2.8, 4.9)], ['echo-ranger', 'controller'], 1500, 850, 1200),
  93: R(93, 'Zerbrochene Brücken', 'Broken Bridges', 'broken-axis', 'rotating-bridge-segments', P(-4.8, -12.0), [P(-4.9, -5.5), P(0, -6.1), P(4.9, -5.5), P(-4.8, 0.8), P(4.8, 0.8), P(-3.0, 4.8), P(3.0, 4.8)], ['skirmisher', 'ranged'], 1550, 900, 1200),
  94: R(94, 'Kammer der Anker', 'Anchor Chamber', 'echo-cloister', 'linked-anchor-zones', P(0, -13.7), [P(-4.5, -5.7), P(4.5, -5.7), P(-5.0, 0), P(5.0, 0), P(-2.9, 4.8), P(2.9, 4.8)], ['anchor-guard', 'support'], 1500, 900, 1250),
  95: R(95, 'Der fallende Hof', 'The Falling Court', 'convergence-bridge', 'gravity-pulses', P(0, -13.5), [P(-4.9, -5.8), P(0, -6.2), P(4.9, -5.8), P(-4.5, 0.5), P(4.5, 0.5), P(0, 5.0)], ['pursuer', 'controller'], 1600, 850, 1300),
  96: R(96, 'Pfad der Konvergenz', 'Path of Convergence', 'memory-engine', 'converging-pressure-lanes', P(4.8, -12.0), [P(-4.9, -5.4), P(0, -6.2), P(4.9, -5.4), P(-4.9, 1.0), P(4.9, 1.0), P(-2.9, 4.8), P(2.9, 4.8)], ['lane-guard', 'interrupter'], 1550, 900, 1300),
  97: R(97, 'Archiv der letzten Wege', 'Archive of Final Paths', 'fourfold-sanctum', 'sequenced-portal-routes', P(-4.8, -12.0), [P(-4.8, -5.8), P(0, -6.1), P(4.8, -5.8), P(-4.8, 0.2), P(4.8, 0.2), P(-3.1, 4.8), P(3.1, 4.8)], ['portal-warden', 'assassin'], 1650, 900, 1350),
  98: R(98, 'Herz der Spaltung', 'Heart of the Fracture', 'last-threshold', 'fracture-echo-pattern', P(0, -13.7), [P(-4.9, -5.5), P(0, -6.3), P(4.9, -5.5), P(-5.0, 1.2), P(5.0, 1.2), P(-2.8, 5.0), P(2.8, 5.0)], ['elite-controller', 'echo-ranger'], 1650, 950, 1400),
  99: R(99, 'Vorhof des Nexus', 'Nexus Antechamber', 'heart-approach', 'layered-nexus-sequence', P(0, -13.7), [P(-5.0, -5.7), P(0, -6.3), P(5.0, -5.7), P(-5.0, 0.3), P(5.0, 0.3), P(-3.2, 4.9), P(0, 5.4), P(3.2, 4.9)], ['elite-pursuer', 'elite-controller', 'interrupter'], 1750, 950, 1450),
  100: R(100, 'Der Schleierkern', 'The Veil Core', 'veil-core-arena', 'veil-core-phases', P(0, -13.7), [P(0, 2.0), P(-4.2, 1.4), P(4.2, 1.4), P(-2.7, 4.8), P(2.7, 4.8)], ['final-boss'], 1850, 1000, 1550),
};

export function isVeilNexusRoom(room: number): boolean {
  return Number.isInteger(room) && room >= 91 && room <= 100;
}

export function veilNexusRoomSpec(room: number): VeilNexusRoomSpec | null {
  return VEIL_NEXUS_ROOMS[room] ?? null;
}

export function veilNexusPortalTile(room: number, mapWidth = 24, mapHeight = 32) {
  const spec = veilNexusRoomSpec(room);
  if (!spec) return null;
  return {
    x: Math.max(2, Math.min(mapWidth - 3, Math.round(spec.portal.x + mapWidth / 2 - 0.5))),
    y: Math.max(2, Math.min(mapHeight - 3, Math.round(spec.portal.z + mapHeight / 2 - 0.5))),
  };
}
