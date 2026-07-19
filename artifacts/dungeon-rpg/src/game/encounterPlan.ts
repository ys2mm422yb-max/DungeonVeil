import type { EnemyType } from './entities';
import { applyChapterMechanicsV4 } from './chapterMechanicsV4';

/**
 * Deliberate room compositions. Order matters because it is paired with the
 * authored room spawn points. Boss rooms are handled separately by runEngine.
 *
 * Internal type names still carry legacy labels for compatibility. The 3D
 * presentation resolves those types into region-specific creatures, skeleton
 * roles and Adventurer bodies through enemyRegionalIdentity.
 */
const ENCOUNTERS: Record<number, EnemyType[]> = {
  1: ['goblin', 'skeleton'],
  2: ['goblin', 'spider', 'skeleton'],
  3: ['skeleton', 'spider', 'goblin', 'vampire'],
  4: ['spider', 'goblin', 'skeleton', 'orc', 'spider'],
  5: ['vampire', 'spider', 'skeleton', 'goblin', 'orc', 'demon'],
  6: ['orc', 'spider', 'skeleton', 'vampire', 'demon', 'goblin'],
  7: ['demon', 'vampire', 'spider', 'skeleton', 'goblin', 'spider', 'orc'],
  8: ['golem', 'spider', 'vampire', 'demon', 'goblin', 'skeleton', 'vampire'],
  9: ['golem', 'demon', 'vampire', 'spider', 'vampire', 'skeleton', 'spider', 'demon'],
  10: [],

  11: ['skeleton', 'slime', 'vampire', 'demon', 'skeleton', 'spider'],
  12: ['vampire', 'demon', 'spider', 'skeleton', 'vampire', 'golem', 'spider'],
  13: ['golem', 'spider', 'demon', 'vampire', 'skeleton', 'spider', 'vampire'],
  14: ['skeleton', 'demon', 'vampire', 'golem', 'spider', 'skeleton', 'demon'],
  15: ['demon', 'vampire', 'golem', 'spider', 'demon', 'vampire', 'skeleton'],
  16: ['golem', 'demon', 'skeleton', 'vampire', 'skeleton', 'golem', 'vampire'],
  17: ['demon', 'vampire', 'golem', 'spider', 'demon', 'skeleton', 'vampire'],
  18: ['golem', 'demon', 'vampire', 'spider', 'skeleton', 'vampire', 'golem', 'demon'],
  19: ['golem', 'demon', 'vampire', 'skeleton', 'demon', 'vampire', 'golem', 'spider'],
  20: [],
};

const REGION_POOLS: Record<number, EnemyType[]> = {
  // Meadow / light forest: animals plus rangers, rogues and barbarians.
  3: ['goblin', 'spider', 'slime', 'skeleton', 'orc', 'vampire', 'demon'],
  // Darkwood / ruined village: bats, cultists, mages and grave guards.
  4: ['vampire', 'spider', 'skeleton', 'orc', 'demon', 'golem'],
  // Ember fortress: knights, barbarians, fire mages and heavy guards.
  5: ['orc', 'golem', 'vampire', 'skeleton', 'demon', 'spider', 'slime'],
};

export function getEncounterPlan(room: number): EnemyType[] {
  const safeRoom = Math.max(1, Math.min(50, room));
  if (ENCOUNTERS[safeRoom]) return [...ENCOUNTERS[safeRoom]];
  if (safeRoom % 10 === 0) return [];
  const region = Math.ceil(safeRoom / 10);
  const pool = REGION_POOLS[region] ?? REGION_POOLS[3];
  const local = (safeRoom - 1) % 10;
  const count = Math.min(8, 5 + Math.floor(local / 2));
  return Array.from({ length: count }, (_, index) => pool[(index + local * 2) % pool.length]);
}

export function getChapterEncounterPlan(room: number, chapter: number): EnemyType[] {
  return applyChapterMechanicsV4(getEncounterPlan(room), room, chapter);
}
