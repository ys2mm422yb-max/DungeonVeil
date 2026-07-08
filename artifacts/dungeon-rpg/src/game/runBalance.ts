import type { GameEngine } from './runEngine';

const ROOM_HP_FACTOR = [0, 0.88, 0.9, 0.92, 0.94, 0.96, 0.98, 1, 1.02, 1.04, 0.72] as const;
const ROOM_ATTACK_CAP = [0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18] as const;

const ENEMY_SPEED_FACTOR: Record<string, number> = {
  slime: 1.18,
  goblin: 1.2,
  skeleton: 1.19,
  orc: 1.12,
  spider: 1.2,
  vampire: 1.19,
  demon: 1.18,
  golem: 1.1,
  boss: 1.44,
};

export type RunBalanceState = {
  balancedEnemyIds: Set<string>;
};

export function createRunBalanceState(): RunBalanceState {
  return { balancedEnemyIds: new Set<string>() };
}

export function updateRunBalance(engine: GameEngine, state: RunBalanceState): void {
  const active = new Set(engine.state.enemies.map(enemy => enemy.id));
  for (const id of state.balancedEnemyIds) {
    if (!active.has(id)) state.balancedEnemyIds.delete(id);
  }

  const room = Math.max(1, Math.min(10, engine.state.floor));
  for (const enemy of engine.state.enemies) {
    if (state.balancedEnemyIds.has(enemy.id)) continue;
    state.balancedEnemyIds.add(enemy.id);

    const hpFactor = ROOM_HP_FACTOR[room];
    const attackCap = ROOM_ATTACK_CAP[room];
    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpFactor));
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
    enemy.attack = Math.min(enemy.attack, attackCap);
    enemy.speed *= ENEMY_SPEED_FACTOR[enemy.enemyType] ?? 1.16;

    if (enemy.enemyType === 'boss') {
      enemy.maxHp = Math.max(620, enemy.maxHp);
      enemy.hp = enemy.maxHp;
      enemy.attack = 18;
      enemy.nextAttackTime = performance.now() + 720;
    }
  }
}
