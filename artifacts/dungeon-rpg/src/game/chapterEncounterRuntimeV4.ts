import type { Enemy, EnemyType } from './entities';
import type { GameEngine } from './runEngine';
import { getChapterEncounterPlan } from './encounterPlan';

const BASE: Record<Exclude<EnemyType, 'boss'>, { hp: number; attack: number; defense: number; speed: number; size: number; color: string }> = {
  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 32, color: '#43c968' },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 30, color: '#89a94b' },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 72, size: 26, color: '#d1ccb0' },
  orc: { hp: 92, attack: 12, defense: 4, speed: 56, size: 30, color: '#627c38' },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 38, color: '#342d42' },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 34, color: '#9e304b' },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 36, color: '#c53827' },
  golem: { hp: 190, attack: 20, defense: 9, speed: 40, size: 34, color: '#696985' },
};

export type ChapterEncounterRuntimeStateV4 = {
  roomKey: string;
  transformedEnemyIds: Set<string>;
};

export function createChapterEncounterRuntimeStateV4(): ChapterEncounterRuntimeStateV4 {
  return { roomKey: '', transformedEnemyIds: new Set<string>() };
}

function transformEnemy(enemy: Enemy, targetType: Exclude<EnemyType, 'boss'>): void {
  if (enemy.enemyType === 'boss' || enemy.enemyType === targetType) return;
  const current = BASE[enemy.enemyType];
  const target = BASE[targetType];
  if (!current || !target) return;

  const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
  enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * target.hp / current.hp));
  enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
  enemy.attack = Math.max(1, Math.round(enemy.attack * target.attack / Math.max(1, current.attack)));
  enemy.defense = Math.max(0, Math.round(enemy.defense + target.defense - current.defense));
  enemy.speed = Math.max(28, Math.min(96, target.speed));
  enemy.width = target.size;
  enemy.height = target.size;
  enemy.color = target.color;
  enemy.enemyType = targetType;
}

export function applyChapterEncounterRuntimeV4(engine: GameEngine, state: ChapterEncounterRuntimeStateV4): void {
  const chapter = Math.max(1, Math.floor(Number(engine.state.chapter) || 1));
  const room = Math.max(1, Math.min(50, Math.floor(Number(engine.state.floor) || 1)));
  const roomKey = `${chapter}:${room}`;
  if (state.roomKey !== roomKey) {
    state.roomKey = roomKey;
    state.transformedEnemyIds.clear();
  }
  if (room % 10 === 0 || engine.state.enemies.length === 0) return;

  const plan = getChapterEncounterPlan(room, chapter);
  for (let index = 0; index < engine.state.enemies.length; index++) {
    const enemy = engine.state.enemies[index];
    if (enemy.enemyType === 'boss' || state.transformedEnemyIds.has(enemy.id)) continue;
    const target = plan[index];
    if (target && target !== 'boss') transformEnemy(enemy, target);
    state.transformedEnemyIds.add(enemy.id);
  }
}
