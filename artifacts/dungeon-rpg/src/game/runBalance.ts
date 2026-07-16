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

type BossTuning = {
  hpFloor: number;
  hpScale: number;
  attackFloor: number;
  attackCap: number;
  speedScale: number;
  firstAttackDelay: number;
};

export type ChapterBalanceProfile = {
  attackScale: number;
  bossHpScale: number;
  earlyElitePressure: boolean;
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
  return 2.08 + (room - 19) * 0.035;
}

export function chapterBalanceProfile(chapter: number): ChapterBalanceProfile {
  const value = Math.max(1, Math.floor(chapter));
  const fixed = [
    { attackScale: 1, bossHpScale: 1, earlyElitePressure: false },
    { attackScale: 1.24, bossHpScale: 1.25, earlyElitePressure: false },
    { attackScale: 1.5, bossHpScale: 1.55, earlyElitePressure: false },
    { attackScale: 1.78, bossHpScale: 1.9, earlyElitePressure: true },
    { attackScale: 2.08, bossHpScale: 2.25, earlyElitePressure: true },
  ] as const;
  if (value <= fixed.length) return fixed[value - 1];
  const overflow = value - fixed.length;
  return {
    attackScale: fixed.at(-1)!.attackScale + overflow * 0.12,
    bossHpScale: fixed.at(-1)!.bossHpScale + overflow * 0.15,
    earlyElitePressure: true,
  };
}

function chapterDanger(chapter: number) {
  return chapterBalanceProfile(chapter).attackScale;
}

function lateRoomAttackFactor(room: number): number {
  return 1 + Math.max(0, room - 20) * 0.018;
}

function attackCapForRoom(room: number, chapter: number): number {
  const base = room <= 2 ? 9 + room
    : room <= 5 ? 13 + (room - 3) * 2
      : room <= 9 ? 19 + Math.floor((room - 6) * 1.9)
        : room === 10 ? 24
          : room <= 14 ? 23 + (room - 11) * 2
            : room <= 18 ? 32 + (room - 15) * 2
              : room === 19 ? 42
                : room <= 29 ? 46 + Math.floor((room - 20) * 1.25)
                  : room === 30 ? 60
                    : room <= 39 ? 60 + Math.floor((room - 30) * 1.45)
                      : room === 40 ? 75
                        : room <= 49 ? 75 + Math.floor((room - 40) * 1.65)
                          : 96;
  return Math.round(base * chapterDanger(chapter));
}

function bossTuningForRoom(room: number): BossTuning {
  if (room >= 50) return { hpFloor: 6000, hpScale: 1.18, attackFloor: 64, attackCap: 88, speedScale: 1.18, firstAttackDelay: 410 };
  if (room >= 40) return { hpFloor: 4200, hpScale: 1.15, attackFloor: 52, attackCap: 72, speedScale: 1.16, firstAttackDelay: 440 };
  if (room >= 30) return { hpFloor: 2850, hpScale: 1.12, attackFloor: 42, attackCap: 58, speedScale: 1.14, firstAttackDelay: 470 };
  if (room >= 20) return { hpFloor: 1850, hpScale: 1.1, attackFloor: 33, attackCap: 46, speedScale: 1.12, firstAttackDelay: 500 };
  return { hpFloor: 920, hpScale: 1.05, attackFloor: 24, attackCap: 30, speedScale: 1.05, firstAttackDelay: 590 };
}

function shouldBeElite(room: number, enemy: Enemy, chapter: number) {
  if (enemy.enemyType === 'boss' || room < 6) return false;
  const index = enemyIndex(enemy);
  if (room >= 35) return index === 0 || index === 2 || index === 4;
  if (chapterBalanceProfile(chapter).earlyElitePressure && room >= 25) return index === 0 || index === 2 || index === 4;
  if (room >= 15) return index === 0 || index === 3;
  if (room >= 11) return index === 0 || (room % 3 === 0 && index === 4);
  return index === 0;
}

export function updateRunBalance(engine: GameEngine, state: RunBalanceState): void {
  const active = new Set(engine.state.enemies.map(enemy => balanceKey(enemy.id)));
  for (const id of state.balancedEnemyIds) {
    if (!active.has(id)) state.balancedEnemyIds.delete(id);
  }

  const room = Math.max(1, Math.min(50, engine.state.floor));
  const chapter = Math.max(1, Math.round(engine.state.chapter));
  const profile = chapterBalanceProfile(chapter);
  const danger = profile.attackScale;
  for (const enemy of engine.state.enemies) {
    const key = balanceKey(enemy.id);
    if (state.balancedEnemyIds.has(key)) continue;
    state.balancedEnemyIds.add(key);

    enemy.isElite = shouldBeElite(room, enemy, chapter);
    const eliteHp = enemy.isElite ? 1.42 : 1;
    const eliteAttack = enemy.isElite ? 1.18 : 1;
    const eliteSpeed = enemy.isElite ? 1.06 : 1;
    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpFactorForRoom(room) * eliteHp));
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
    enemy.attack = Math.min(
      Math.round(enemy.attack * eliteAttack * danger * lateRoomAttackFactor(room)),
      attackCapForRoom(room, chapter),
    );
    enemy.speed *= (ENEMY_SPEED_FACTOR[enemy.enemyType] ?? 1.15) * eliteSpeed;
    if (enemy.isElite) enemy.nextAttackTime = Math.min(enemy.nextAttackTime, performance.now() + 430);

    if (enemy.enemyType === 'boss') {
      const tuning = bossTuningForRoom(room);
      enemy.maxHp = Math.max(
        Math.round(tuning.hpFloor * profile.bossHpScale),
        Math.round(enemy.maxHp * tuning.hpScale),
      );
      enemy.attack = Math.min(
        Math.round(tuning.attackCap * danger),
        Math.max(Math.round(tuning.attackFloor * danger), enemy.attack),
      );
      enemy.speed *= tuning.speedScale;
      enemy.nextAttackTime = performance.now() + tuning.firstAttackDelay;
      enemy.hp = enemy.maxHp;
    }
  }
}
