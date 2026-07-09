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
  if (room <= 2) return 0.88 + room * 0.02;
  if (room <= 5) return 0.92 + (room - 3) * 0.025;
  if (room <= 9) return 1 + (room - 6) * 0.04;
  if (room === 10) return 0.78;
  if (room <= 14) return 1.12 + (room - 11) * 0.055;
  if (room <= 18) return 1.34 + (room - 15) * 0.06;
  if (room === 19) return 1.62;
  return 1;
}

function attackCapForRoom(room: number): number {
  if (room <= 3) return 6 + room;
  if (room <= 9) return 9 + Math.floor((room - 3) * 1.15);
  if (room === 10) return 18;
  if (room <= 14) return 16 + (room - 11) * 2;
  if (room <= 18) return 24 + (room - 15) * 2;
  if (room === 19) return 32;
  return 36;
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
        enemy.maxHp = Math.max(1450, enemy.maxHp);
        enemy.attack = Math.min(34, Math.max(26, enemy.attack));
        enemy.speed *= 1.08;
        enemy.nextAttackTime = performance.now() + 620;
      } else {
        enemy.maxHp = Math.max(720, enemy.maxHp);
        enemy.attack = 20;
        enemy.nextAttackTime = performance.now() + 720;
      }
      enemy.hp = enemy.maxHp;
    }
  }
}
