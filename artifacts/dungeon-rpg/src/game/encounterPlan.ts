import type { EnemyType } from './entities';

/**
 * Deliberate room compositions. Order matters because it is paired with the
 * authored room spawn points. Boss rooms are handled separately by runEngine.
 */
const ENCOUNTERS: Record<number, EnemyType[]> = {
  1: ['skeleton', 'spider'],
  2: ['skeleton', 'skeleton', 'spider'],
  3: ['skeleton', 'spider', 'vampire', 'skeleton'],
  4: ['spider', 'vampire', 'skeleton', 'spider', 'skeleton'],
  5: ['vampire', 'skeleton', 'spider', 'vampire', 'skeleton', 'spider'],
  6: ['orc', 'spider', 'skeleton', 'vampire', 'spider', 'skeleton'],
  7: ['demon', 'vampire', 'spider', 'skeleton', 'vampire', 'spider', 'skeleton'],
  8: ['golem', 'spider', 'vampire', 'demon', 'spider', 'skeleton', 'vampire'],
  9: ['golem', 'demon', 'vampire', 'spider', 'vampire', 'skeleton', 'spider', 'demon'],
  10: [],

  // Chapter two deliberately stops leaning on skeleton filler. Rooms 11-15
  // mix mobile flankers with one or two bodies that hold the firing lanes.
  11: ['orc', 'spider', 'vampire', 'demon', 'skeleton', 'spider'],
  12: ['vampire', 'demon', 'spider', 'orc', 'vampire', 'golem', 'spider'],
  13: ['golem', 'spider', 'demon', 'vampire', 'orc', 'spider', 'vampire'],
  14: ['orc', 'demon', 'vampire', 'golem', 'spider', 'orc', 'demon'],
  15: ['demon', 'vampire', 'golem', 'spider', 'demon', 'vampire', 'orc'],

  // Rooms 16-19 are the late-run pressure test. Eight enemies is the hard
  // visual cap here so Android does not pay for a crowd the player cannot read.
  16: ['golem', 'demon', 'spider', 'vampire', 'orc', 'golem', 'vampire'],
  17: ['demon', 'vampire', 'golem', 'spider', 'demon', 'orc', 'vampire'],
  18: ['golem', 'demon', 'vampire', 'spider', 'orc', 'vampire', 'golem', 'demon'],
  19: ['golem', 'demon', 'vampire', 'orc', 'demon', 'vampire', 'golem', 'spider'],
  20: [],
};

export function getEncounterPlan(room: number): EnemyType[] {
  return ENCOUNTERS[Math.max(1, Math.min(20, room))] ?? ENCOUNTERS[1];
}
