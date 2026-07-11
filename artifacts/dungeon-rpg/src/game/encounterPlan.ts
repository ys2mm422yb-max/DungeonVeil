import type { EnemyType } from './entities';

/**
 * Deliberate room compositions. Order matters because it is paired with the
 * authored room spawn points. Boss rooms are handled separately by runEngine.
 *
 * Creature visuals:
 * goblin -> rat, spider -> spider, vampire -> bat, demon -> angry snake.
 * Slimes are deliberately held back from the opening rooms so the first combat
 * impression is not dominated by one cheap-looking family.
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

  11: ['orc', 'slime', 'vampire', 'demon', 'skeleton', 'spider'],
  12: ['vampire', 'demon', 'spider', 'orc', 'vampire', 'golem', 'spider'],
  13: ['golem', 'spider', 'demon', 'vampire', 'orc', 'spider', 'vampire'],
  14: ['orc', 'demon', 'vampire', 'golem', 'spider', 'orc', 'demon'],
  15: ['demon', 'vampire', 'golem', 'spider', 'demon', 'vampire', 'orc'],

  16: ['golem', 'demon', 'spider', 'vampire', 'orc', 'golem', 'vampire'],
  17: ['demon', 'vampire', 'golem', 'spider', 'demon', 'orc', 'vampire'],
  18: ['golem', 'demon', 'vampire', 'spider', 'orc', 'vampire', 'golem', 'demon'],
  19: ['golem', 'demon', 'vampire', 'orc', 'demon', 'vampire', 'golem', 'spider'],
  20: [],
};

export function getEncounterPlan(room: number): EnemyType[] {
  return ENCOUNTERS[Math.max(1, Math.min(20, room))] ?? ENCOUNTERS[1];
}
