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
  11: ['skeleton', 'spider', 'vampire', 'orc', 'spider', 'skeleton'],
  12: ['vampire', 'demon', 'spider', 'skeleton', 'vampire', 'orc', 'spider'],
  13: ['golem', 'spider', 'vampire', 'demon', 'spider', 'skeleton', 'vampire'],
  14: ['orc', 'demon', 'vampire', 'spider', 'golem', 'skeleton', 'spider'],
  15: ['demon', 'vampire', 'spider', 'golem', 'vampire', 'skeleton', 'spider'],
  16: ['golem', 'demon', 'spider', 'vampire', 'orc', 'spider', 'vampire'],
  17: ['demon', 'vampire', 'golem', 'spider', 'vampire', 'demon', 'skeleton'],
  18: ['golem', 'demon', 'vampire', 'spider', 'orc', 'vampire', 'spider', 'demon'],
  19: ['golem', 'demon', 'vampire', 'spider', 'demon', 'vampire', 'golem', 'spider'],
  20: [],
};

export function getEncounterPlan(room: number): EnemyType[] {
  return ENCOUNTERS[Math.max(1, Math.min(20, room))] ?? ENCOUNTERS[1];
}
