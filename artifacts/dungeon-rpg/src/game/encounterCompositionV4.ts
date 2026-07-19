import type { Enemy, EnemyType } from './entities';
import { chapterCombatProfileV4 } from './combatCurveV4';

export type EncounterRoleV4 = 'pressure' | 'skirmisher' | 'guardian';

type EnemyReference = Readonly<{ hp: number; attack: number; defense: number; speed: number }>;

const ENEMY_REFERENCE: Readonly<Record<Exclude<EnemyType, 'boss'>, EnemyReference>> = Object.freeze({
  slime: { hp: 24, attack: 4, defense: 0, speed: 42 },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68 },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 72 },
  orc: { hp: 92, attack: 12, defense: 4, speed: 56 },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88 },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82 },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76 },
  golem: { hp: 190, attack: 20, defense: 9, speed: 40 },
});

const REGION_ROLE_TYPES: Readonly<Record<number, Readonly<Record<EncounterRoleV4, Exclude<EnemyType, 'boss'>>>>> = Object.freeze({
  1: { pressure: 'vampire', skirmisher: 'spider', guardian: 'orc' },
  2: { pressure: 'skeleton', skirmisher: 'vampire', guardian: 'golem' },
  3: { pressure: 'skeleton', skirmisher: 'vampire', guardian: 'orc' },
  4: { pressure: 'vampire', skirmisher: 'spider', guardian: 'golem' },
  5: { pressure: 'vampire', skirmisher: 'spider', guardian: 'golem' },
});

const ROLE_SEQUENCE: readonly EncounterRoleV4[] = ['guardian', 'skirmisher', 'pressure', 'guardian'];

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const safeRoom = (room: number) => Math.max(1, Math.min(50, Math.floor(Number(room) || 1)));
const safeChapter = (chapter: number) => Math.max(1, Math.floor(Number(chapter) || 1));
const regionForRoom = (room: number) => Math.max(1, Math.min(5, Math.ceil(safeRoom(room) / 10)));

function replacementIndices(length: number, room: number, chapter: number): number[] {
  if (length < 1 || chapter <= 1) return [];
  const pressure = chapterCombatProfileV4(chapter).elitePressure;
  const replacementCount = Math.min(4, length, Math.ceil(pressure * 7));
  const selected: number[] = [];
  for (let offset = 0; selected.length < replacementCount && offset < length * 2; offset++) {
    const index = (room + chapter * 2 + offset * 3) % length;
    if (!selected.includes(index)) selected.push(index);
  }
  return selected;
}

export function chapterCompositionTypeV4(
  original: EnemyType,
  room: number,
  chapter: number,
  index: number,
  encounterLength = 8,
): EnemyType {
  if (original === 'boss') return original;
  const safeLength = Math.max(1, Math.min(8, Math.floor(Number(encounterLength) || 1)));
  const normalizedIndex = Math.max(0, Math.min(safeLength - 1, Math.floor(Number(index) || 0)));
  const selected = replacementIndices(safeLength, safeRoom(room), safeChapter(chapter));
  const selectedOrder = selected.indexOf(normalizedIndex);
  if (selectedOrder < 0) return original;
  const role = ROLE_SEQUENCE[(safeRoom(room) + safeChapter(chapter) + selectedOrder) % ROLE_SEQUENCE.length];
  return REGION_ROLE_TYPES[regionForRoom(room)][role];
}

export function applyChapterEncounterCompositionV4(
  enemy: Enemy,
  room: number,
  chapter: number,
  index: number,
  encounterLength: number,
): void {
  if (enemy.enemyType === 'boss') return;
  const previousType = enemy.enemyType;
  const nextType = chapterCompositionTypeV4(previousType, room, chapter, index, encounterLength);
  if (nextType === previousType || nextType === 'boss') return;

  const previous = ENEMY_REFERENCE[previousType];
  const next = ENEMY_REFERENCE[nextType];
  const pressure = chapterCombatProfileV4(chapter).elitePressure;
  const currentHpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
  const hpRatio = next.hp / previous.hp * (1 + pressure * 0.08);
  const attackRatio = next.attack / previous.attack * (1 + pressure * 0.05);

  enemy.enemyType = nextType;
  enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
  enemy.hp = Math.max(1, Math.round(enemy.maxHp * currentHpRatio));
  enemy.attack = Math.max(1, Math.round(enemy.attack * attackRatio));
  enemy.defense = clamp(enemy.defense + next.defense - previous.defense, 0, 12);
  enemy.speed = clamp(Math.round(enemy.speed * (next.speed / previous.speed)), 38, 96);
}

export function applyChapterBossPressureV4(enemy: Enemy, chapter: number): void {
  if (enemy.enemyType !== 'boss') return;
  const safe = safeChapter(chapter);
  const pressure = chapterCombatProfileV4(safe).elitePressure;
  enemy.speed = clamp(Math.round(enemy.speed * (1 + Math.min(0.12, pressure * 0.22))), 40, 72);
  enemy.defense = clamp(enemy.defense + Math.floor((safe - 1) / 3), 0, 12);
}

export function encounterReplacementCountV4(room: number, chapter: number, encounterLength: number): number {
  return replacementIndices(Math.max(0, Math.min(8, encounterLength)), safeRoom(room), safeChapter(chapter)).length;
}
