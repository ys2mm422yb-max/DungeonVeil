import type { EnemyType } from './enemyRegistry';
import { deterministicEnemyFamilyForRoom } from './enemyRegistry';
import { CHAPTER_ROOMS } from './chapterRun';
import { applyChapterMechanicsV4 } from './chapterMechanicsV4';

/**
 * Deliberate room compositions. Order matters because it is paired with the
 * authored room spawn points. Boss rooms are handled separately by runEngine.
 *
 * Authored encounters remain stable for compatibility. Rooms without an
 * explicit composition are generated deterministically from the canonical
 * enemy registry so room-band eligibility and anti-repetition rules have one
 * authoritative source.
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

  51: ['orc', 'demon', 'skeleton', 'vampire', 'golem', 'spider'],
  52: ['golem', 'vampire', 'skeleton', 'demon', 'golem', 'slime'],
  53: ['orc', 'skeleton', 'demon', 'spider', 'vampire', 'golem', 'spider'],
  54: ['orc', 'demon', 'spider', 'golem', 'vampire', 'slime', 'demon'],
  55: ['golem', 'vampire', 'demon', 'skeleton', 'golem', 'spider', 'vampire'],
  56: ['spider', 'demon', 'orc', 'slime', 'vampire', 'spider', 'golem', 'demon'],
  57: ['orc', 'golem', 'vampire', 'demon', 'skeleton', 'golem', 'spider', 'vampire'],
  58: ['vampire', 'spider', 'demon', 'skeleton', 'orc', 'spider', 'golem', 'demon'],
  59: ['orc', 'vampire', 'golem', 'demon', 'slime', 'skeleton', 'spider', 'vampire'],
  60: [],

  61: ['vampire', 'orc', 'orc', 'demon', 'spider', 'skeleton'],
  62: ['golem', 'spider', 'spider', 'orc', 'vampire', 'demon', 'skeleton'],
  63: ['vampire', 'vampire', 'demon', 'skeleton', 'spider', 'golem', 'orc'],
  64: ['orc', 'orc', 'golem', 'vampire', 'demon', 'spider', 'skeleton'],
  65: ['golem', 'demon', 'vampire', 'spider', 'skeleton', 'orc', 'slime'],
  66: ['demon', 'vampire', 'spider', 'skeleton', 'golem', 'orc', 'vampire'],
  67: ['orc', 'spider', 'vampire', 'demon', 'skeleton', 'golem', 'spider'],
  68: ['golem', 'orc', 'spider', 'vampire', 'demon', 'skeleton', 'slime'],
  69: ['golem', 'vampire', 'demon', 'orc', 'spider', 'skeleton', 'vampire', 'golem'],
  70: [],

  71: ['golem', 'vampire', 'spider', 'orc', 'demon', 'skeleton'],
  72: ['orc', 'golem', 'spider', 'demon', 'vampire', 'skeleton', 'orc'],
  73: ['vampire', 'demon', 'spider', 'golem', 'skeleton', 'orc', 'vampire'],
  74: ['golem', 'orc', 'demon', 'spider', 'vampire', 'skeleton', 'golem'],
  75: ['demon', 'vampire', 'golem', 'spider', 'orc', 'skeleton', 'slime'],
  76: ['golem', 'orc', 'vampire', 'demon', 'spider', 'skeleton', 'golem', 'vampire'],
  77: ['vampire', 'spider', 'demon', 'golem', 'orc', 'skeleton', 'vampire'],
  78: ['orc', 'demon', 'spider', 'vampire', 'golem', 'skeleton', 'orc', 'demon'],
  79: ['golem', 'vampire', 'demon', 'orc', 'spider', 'skeleton', 'vampire', 'golem'],
  80: [],

  81: ['orc', 'golem', 'demon', 'spider', 'vampire', 'skeleton'],
  82: ['golem', 'orc', 'vampire', 'demon', 'spider', 'skeleton', 'golem'],
  83: ['demon', 'vampire', 'golem', 'spider', 'orc', 'skeleton', 'demon'],
  84: ['golem', 'orc', 'demon', 'vampire', 'spider', 'skeleton', 'golem', 'orc'],
  85: ['vampire', 'demon', 'golem', 'orc', 'spider', 'skeleton', 'slime'],
  86: ['golem', 'demon', 'orc', 'vampire', 'spider', 'skeleton', 'golem', 'demon'],
  87: ['orc', 'vampire', 'demon', 'golem', 'spider', 'skeleton', 'vampire', 'orc'],
  88: ['golem', 'orc', 'demon', 'spider', 'vampire', 'skeleton', 'golem', 'demon'],
  89: ['golem', 'vampire', 'demon', 'orc', 'spider', 'skeleton', 'vampire', 'golem'],
  90: [],
};

function generatedEncounter(room: number): EnemyType[] {
  const local = (room - 1) % 10;
  const count = Math.min(8, 5 + Math.floor(local / 2));
  const result: EnemyType[] = [];
  for (let slot = 0; slot < count; slot++) {
    result.push(deterministicEnemyFamilyForRoom(room, slot, result));
  }
  return result;
}

export function getEncounterPlan(room: number): EnemyType[] {
  const safeRoom = Math.max(1, Math.min(CHAPTER_ROOMS, room));
  if (ENCOUNTERS[safeRoom]) return [...ENCOUNTERS[safeRoom]];
  if (safeRoom % 10 === 0) return [];
  return generatedEncounter(safeRoom);
}

export function getChapterEncounterPlan(room: number, chapter: number): EnemyType[] {
  return applyChapterMechanicsV4(getEncounterPlan(room), room, chapter);
}
