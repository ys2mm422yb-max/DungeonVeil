import type { EnemyType } from './entities';

/**
 * Deliberate room compositions. Order matters because it is paired with the
 * authored room spawn points. Boss rooms are handled separately by runEngine.
 */
const ENCOUNTERS: Record<number, EnemyType[]> = {
  1: ['slime', 'goblin'],
  2: ['goblin', 'skeleton', 'slime'],
  3: ['skeleton', 'goblin', 'spider', 'vampire'],
  4: ['goblin', 'spider', 'skeleton', 'slime', 'vampire'],
  5: ['vampire', 'goblin', 'spider', 'skeleton', 'slime', 'vampire'],
  6: ['orc', 'goblin', 'spider', 'skeleton', 'vampire', 'slime'],
  7: ['demon', 'vampire', 'goblin', 'spider', 'skeleton', 'orc', 'slime'],
  8: ['golem', 'spider', 'vampire', 'demon', 'goblin', 'orc', 'skeleton'],
  9: ['golem', 'demon', 'vampire', 'spider', 'orc', 'goblin', 'skeleton', 'demon'],
  10: [],

  // The overgrown/archive stretch mixes flankers, casters and bodies that hold firing lanes.
  11: ['orc', 'spider', 'vampire', 'goblin', 'demon', 'slime'],
  12: ['vampire', 'demon', 'goblin', 'orc', 'vampire', 'golem', 'spider'],
  13: ['golem', 'spider', 'demon', 'vampire', 'orc', 'goblin', 'vampire'],
  14: ['orc', 'demon', 'vampire', 'golem', 'spider', 'goblin', 'demon'],
  15: ['demon', 'vampire', 'golem', 'spider', 'orc', 'vampire', 'goblin'],

  // Late rooms keep eight-enemy readability cap for mobile while rotating all pressure roles.
  16: ['golem', 'demon', 'spider', 'vampire', 'orc', 'goblin', 'vampire'],
  17: ['demon', 'vampire', 'golem', 'spider', 'demon', 'orc', 'goblin'],
  18: ['golem', 'demon', 'vampire', 'spider', 'orc', 'goblin', 'golem', 'demon'],
  19: ['golem', 'demon', 'vampire', 'orc', 'demon', 'goblin', 'golem', 'spider'],
  20: [],
};

export function getEncounterPlan(room: number): EnemyType[] {
  return ENCOUNTERS[Math.max(1, Math.min(20, room))] ?? ENCOUNTERS[1];
}
