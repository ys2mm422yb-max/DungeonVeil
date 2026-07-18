import type { EnemyType } from './entities';

export const COOP_NORMAL_HP_MULTIPLIER = 1.65;
export const COOP_ELITE_HP_MULTIPLIER = 1.8;
export const COOP_BOSS_HP_MULTIPLIER = 2;
export const COOP_ENEMY_ATTACK_MULTIPLIER = 1.12;
export const COOP_ENEMY_COUNT_MULTIPLIER = 1.25;
export const COOP_ATTACK_DELAY_MULTIPLIER = 0.94;
export const COOP_REWARD_MULTIPLIER = 1.25;
export const COOP_MAX_LIVING_ENEMIES = 14;

export type CoopEnemyBalanceInput = {
  enemyType: EnemyType;
  isElite?: boolean;
  hp: number;
  maxHp: number;
  attack: number;
};

export function coopHpMultiplier(enemyType: EnemyType, isElite = false): number {
  if (enemyType === 'boss') return COOP_BOSS_HP_MULTIPLIER;
  if (isElite) return COOP_ELITE_HP_MULTIPLIER;
  return COOP_NORMAL_HP_MULTIPLIER;
}

export function applyCoopEnemyBalance<T extends CoopEnemyBalanceInput>(enemy: T): T {
  const hpMultiplier = coopHpMultiplier(enemy.enemyType, Boolean(enemy.isElite));
  const maxHp = Math.max(1, Math.round(enemy.maxHp * hpMultiplier));
  const currentRatio = enemy.maxHp > 0 ? Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)) : 1;
  return {
    ...enemy,
    maxHp,
    hp: Math.max(1, Math.round(maxHp * currentRatio)),
    attack: Math.max(1, Math.round(enemy.attack * COOP_ENEMY_ATTACK_MULTIPLIER)),
  };
}

export function coopEnemyCount(baseCount: number, availableSpawnPoints: number): number {
  return Math.max(0, Math.min(
    COOP_MAX_LIVING_ENEMIES,
    availableSpawnPoints,
    Math.ceil(Math.max(0, baseCount) * COOP_ENEMY_COUNT_MULTIPLIER),
  ));
}

export function coopAttackDelay(baseDelayMs: number): number {
  return Math.max(120, Math.round(Math.max(0, baseDelayMs) * COOP_ATTACK_DELAY_MULTIPLIER));
}

export function coopReward(baseValue: number): number {
  return Math.max(0, Math.round(Math.max(0, baseValue) * COOP_REWARD_MULTIPLIER));
}
