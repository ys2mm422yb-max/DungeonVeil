import type { GameEngine } from './runEngine';

const ENEMY_SPEED_FACTOR: Record<string, number> = {
  slime: 1.16,
  goblin: 1.18,
  skeleton: 1.16,
  orc: 1.1,
  spider: 1.18,
  vampire: 1.17,
  demon: 1.15,
  golem: 1.08,
  boss: 1.34,
};

export type RunBalanceState = {
  balancedEnemyIds: Set<string>;
};

export function createRunBalanceState(): RunBalanceState {
  return { balancedEnemyIds: new Set<string>() };
}

function hpFactorForRoom(room: number): number {
  if (room <= 2) return 0.9 + room * 0.03;
  if (room <= 5) return 1.02 + (room - 3) * 0.04;
  if (room <= 9) return 1.14 + (room - 6) * 0.05;
  if (room === 10) return 0.82;
  if (room <= 14) return 1.18 + (room - 11) * 0.06;
  if (room <= 18) return 1.42 + (room - 15) * 0.065;
  if (room === 19) return 1.7;
  return 1;
}

function attackCapForRoom(room: number): number {
  if (room <= 2) return 7 + room;
  if (room <= 5) return 10 + (room - 3) * 2;
  if (room <= 9) return 15 + Math.floor((room - 6) * 1.5);
  if (room === 10) return 20;
  if (room <= 14) return 18 + (room - 11) * 2;
  if (room <= 18) return 26 + (room - 15) * 2;
  if (room === 19) return 34;
  return 38;
}

export function updateRunBalance(engine: GameEngine, state: RunBalanceState): void {
  const active = new Set(engine.state.enemies.map(enemy => enemy.id));
  for (const id of state.balancedEnemyIds) {
    if (!active.has(id)) state.balancedEnemyIds.delete(id);
  }

  const room = Math.max(1, Math.min(20, engine.state.floor));
  for (const enemy of engine.state.enemies) {
    if (state.balancedEnemyIds.has(enemy.id)) continue;
    state.balancedEnemyIds.add(enemy.id);

    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpFactorForRoom(room)));
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
    enemy.attack = Math.min(enemy.attack, attackCapForRoom(room));
    enemy.speed *= ENEMY_SPEED_FACTOR[enemy.enemyType] ?? 1.14;

    if (enemy.enemyType === 'boss') {
      if (room === 20) {
        enemy.maxHp = Math.max(1520, enemy.maxHp);
        enemy.attack = Math.min(36, Math.max(28, enemy.attack));
        enemy.speed *= 1.12;
        enemy.nextAttackTime = performance.now() + 560;
      } else {
        enemy.maxHp = Math.max(760, enemy.maxHp);
        enemy.attack = 21;
        enemy.speed *= 1.04;
        enemy.nextAttackTime = performance.now() + 660;
      }
      enemy.hp = enemy.maxHp;
    }
  }
}
