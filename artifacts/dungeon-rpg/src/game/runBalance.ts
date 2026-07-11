import type { Enemy } from './entities';
import type { GameEngine } from './runEngine';

const ENEMY_SPEED_FACTOR: Record<string, number> = {
  slime: 1.14,
  goblin: 1.2,
  skeleton: 1.17,
  orc: 1.12,
  spider: 1.22,
  vampire: 1.2,
  demon: 1.17,
  golem: 1.08,
  boss: 1.32,
};

export type RunBalanceState = {
  balancedEnemyIds: Set<string>;
};

export function createRunBalanceState(): RunBalanceState {
  return { balancedEnemyIds: new Set<string>() };
}

function balanceKey(id: string): string {
  return id.replace(/-hunt-\d+$/, '');
}

function enemyIndex(enemy: Enemy) {
  const value = Number(enemy.id.split('-').at(-1));
  return Number.isFinite(value) ? value : 0;
}

function hpFactorForRoom(room: number): number {
  if (room <= 2) return 0.98 + room * 0.04;
  if (room <= 5) return 1.14 + (room - 3) * 0.07;
  if (room <= 9) return 1.36 + (room - 6) * 0.075;
  if (room === 10) return 0.94;
  if (room <= 14) return 1.4 + (room - 11) * 0.08;
  if (room <= 18) return 1.74 + (room - 15) * 0.085;
  if (room === 19) return 2.08;
  return 1;
}

function chapterDanger(chapter: number) {
  return 1 + Math.min(1.05, Math.max(0, chapter - 1) * 0.27);
}

function attackCapForRoom(room: number, chapter: number): number {
  const base = room <= 2 ? 9 + room
    : room <= 5 ? 13 + (room - 3) * 2
      : room <= 9 ? 19 + Math.floor((room - 6) * 1.9)
        : room === 10 ? 24
          : room <= 14 ? 23 + (room - 11) * 2
            : room <= 18 ? 32 + (room - 15) * 2
              : room === 19 ? 42
                : 46;
  return Math.round(base * chapterDanger(chapter));
}

function shouldBeElite(room: number, enemy: Enemy) {
  if (enemy.enemyType === 'boss' || room < 6) return false;
  const index = enemyIndex(enemy);
  if (room >= 15) return index === 0 || index === 3;
  if (room >= 11) return index === 0 || (room % 3 === 0 && index === 4);
  return index === 0;
}

export function updateRunBalance(engine: GameEngine, state: RunBalanceState): void {
  const active = new Set(engine.state.enemies.map(enemy => balanceKey(enemy.id)));
  for (const id of state.balancedEnemyIds) {
    if (!active.has(id)) state.balancedEnemyIds.delete(id);
  }

  const room = Math.max(1, Math.min(20, engine.state.floor));
  const chapter = Math.max(1, Math.round(engine.state.chapter));
  for (const enemy of engine.state.enemies) {
    const key = balanceKey(enemy.id);
    if (state.balancedEnemyIds.has(key)) continue;
    state.balancedEnemyIds.add(key);

    enemy.isElite = shouldBeElite(room, enemy);
    const eliteHp = enemy.isElite ? 1.42 : 1;
    const eliteAttack = enemy.isElite ? 1.18 : 1;
    const eliteSpeed = enemy.isElite ? 1.06 : 1;
    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpFactorForRoom(room) * eliteHp));
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
    enemy.attack = Math.min(
      Math.round(enemy.attack * eliteAttack * chapterDanger(chapter)),
      attackCapForRoom(room, chapter),
    );
    enemy.speed *= (ENEMY_SPEED_FACTOR[enemy.enemyType] ?? 1.15) * eliteSpeed;
    if (enemy.isElite) enemy.nextAttackTime = Math.min(enemy.nextAttackTime, performance.now() + 430);

    if (enemy.enemyType === 'boss') {
      if (room === 20) {
        enemy.maxHp = Math.max(1850, Math.round(enemy.maxHp * chapterDanger(chapter)));
        enemy.attack = Math.min(44 * chapterDanger(chapter), Math.max(33, enemy.attack));
        enemy.speed *= 1.12;
        enemy.nextAttackTime = performance.now() + 500;
      } else {
        enemy.maxHp = Math.max(920, Math.round(enemy.maxHp * chapterDanger(chapter)));
        enemy.attack = Math.min(28 * chapterDanger(chapter), Math.max(24, enemy.attack));
        enemy.speed *= 1.05;
        enemy.nextAttackTime = performance.now() + 590;
      }
      enemy.hp = enemy.maxHp;
    }
  }
}
