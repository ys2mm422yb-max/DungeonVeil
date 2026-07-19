import type { Enemy } from './entities';
import type { GameEngine } from './runEngine';
import {
  BOSS_TARGETS_V4,
  chapterCombatProfileV4,
  oldChapterCombatProfile,
  oldRoomCombatScale,
  roomCombatScaleV4,
} from './combatCurveV4';

export type CombatBalanceOverlayState = {
  roomKey: string;
  balancedEnemyIds: Set<string>;
};

export function createCombatBalanceOverlayState(): CombatBalanceOverlayState {
  return { roomKey: '', balancedEnemyIds: new Set<string>() };
}

function isBoss(enemy: Enemy): boolean {
  return enemy.enemyType === 'boss';
}

function bossTarget(room: number) {
  if (room >= 50) return BOSS_TARGETS_V4[50];
  if (room >= 40) return BOSS_TARGETS_V4[40];
  if (room >= 30) return BOSS_TARGETS_V4[30];
  if (room >= 20) return BOSS_TARGETS_V4[20];
  return BOSS_TARGETS_V4[10];
}

export function applyCombatBalanceV4Overlay(engine: GameEngine, state: CombatBalanceOverlayState): void {
  const chapter = Math.max(1, Math.floor(Number(engine.state.chapter) || 1));
  const room = Math.max(1, Math.min(50, Math.floor(Number(engine.state.floor) || 1)));
  const roomKey = `${chapter}:${room}`;
  if (state.roomKey !== roomKey) {
    state.roomKey = roomKey;
    state.balancedEnemyIds.clear();
  }

  const chapterV4 = chapterCombatProfileV4(chapter);
  const chapterOld = oldChapterCombatProfile(chapter);
  const roomV4 = roomCombatScaleV4(room);
  const roomOld = oldRoomCombatScale(room);

  for (const enemy of engine.state.enemies) {
    if (state.balancedEnemyIds.has(enemy.id)) continue;
    state.balancedEnemyIds.add(enemy.id);

    const boss = isBoss(enemy);
    const healthRatio = boss
      ? chapterV4.bossHpScale / chapterOld.bossHpScale
      : chapterV4.hpScale / chapterOld.hpScale * roomV4.hp / roomOld.hp;
    const attackRatio = chapterV4.attackScale / chapterOld.attackScale * roomV4.attack / roomOld.attack;
    const currentHpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;

    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * healthRatio));
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * currentHpRatio));
    enemy.attack = Math.max(1, Math.round(enemy.attack * attackRatio));

    if (boss) {
      const target = bossTarget(room);
      enemy.maxHp = Math.max(enemy.maxHp, Math.round(target.hp * chapterV4.bossHpScale));
      enemy.hp = enemy.maxHp;
      enemy.attack = Math.max(enemy.attack, Math.round(target.attack * chapterV4.attackScale));
    }
  }
}
