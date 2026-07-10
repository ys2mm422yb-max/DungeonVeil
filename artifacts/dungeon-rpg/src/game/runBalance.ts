import type { GameEngine } from './runEngine';

const ENEMY_SPEED_FACTOR: Record<string, number> = {
  slime: 1.18,
  goblin: 1.21,
  skeleton: 1.19,
  orc: 1.13,
  spider: 1.22,
  vampire: 1.21,
  demon: 1.18,
  golem: 1.1,
  boss: 1.36,
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

function hpFactorForRoom(room: number): number {
  if (room <= 2) return 0.94 + room * 0.03;
  if (room <= 5) return 1.08 + (room - 3) * 0.055;
  if (room <= 9) return 1.28 + (room - 6) * 0.07;
  if (room === 10) return 0.9;
  if (room <= 14) return 1.32 + (room - 11) * 0.075;
  if (room <= 18) return 1.62 + (room - 15) * 0.08;
  if (room === 19) return 1.94;
  return 1;
}

function baseAttackCapForRoom(room: number): number {
  if (room <= 2) return 8 + room;
  if (room <= 5) return 11 + (room - 3) * 2;
  if (room <= 9) return 17 + Math.floor((room - 6) * 1.75);
  if (room === 10) return 22;
  if (room <= 14) return 21 + (room - 11) * 2;
  if (room <= 18) return 29 + (room - 15) * 2;
  if (room === 19) return 38;
  return 42;
}

export function chapterDangerFactor(chapter: number): number {
  const normalized = Math.max(1, Math.round(chapter));
  const early = [1, 1.18, 1.42, 1.72, 2.08];
  if (normalized <= early.length) return early[normalized - 1];
  return Math.min(3.8, early[early.length - 1] + (normalized - early.length) * 0.28);
}

export function chapterMovePressure(chapter: number): number {
  const normalized = Math.max(1, Math.round(chapter));
  if (normalized <= 5) return [1, 1.04, 1.08, 1.13, 1.18][normalized - 1];
  return Math.min(1.36, 1.18 + (normalized - 5) * 0.03);
}

export function chapterAttackDelayFactor(chapter: number): number {
  const normalized = Math.max(1, Math.round(chapter));
  if (normalized <= 5) return [1, 0.92, 0.84, 0.76, 0.69][normalized - 1];
  return Math.max(0.5, 0.69 - (normalized - 5) * 0.04);
}

function attackCapForChapter(room: number, chapter: number): number {
  return Math.max(1, Math.round(baseAttackCapForRoom(room) * chapterDangerFactor(chapter)));
}

export function updateRunBalance(engine: GameEngine, state: RunBalanceState): void {
  const active = new Set(engine.state.enemies.map(enemy => balanceKey(enemy.id)));
  for (const id of state.balancedEnemyIds) {
    if (!active.has(id)) state.balancedEnemyIds.delete(id);
  }

  const room = Math.max(1, Math.min(20, engine.state.floor));
  const chapter = Math.max(1, Math.round(engine.state.chapter));
  const danger = chapterDangerFactor(chapter);
  const movePressure = chapterMovePressure(chapter);

  for (const enemy of engine.state.enemies) {
    (enemy as typeof enemy & { runChapter?: number }).runChapter = chapter;

    const key = balanceKey(enemy.id);
    if (state.balancedEnemyIds.has(key)) continue;
    state.balancedEnemyIds.add(key);

    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpFactorForRoom(room)));
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
    enemy.attack = Math.min(enemy.attack, attackCapForChapter(room, chapter));
    enemy.speed *= (ENEMY_SPEED_FACTOR[enemy.enemyType] ?? 1.17) * movePressure;

    if (enemy.enemyType === 'boss') {
      if (room === 20) {
        enemy.maxHp = Math.max(Math.round(1760 * (1 + (chapter - 1) * 0.3)), enemy.maxHp);
        const bossMinAttack = Math.round(31 * danger);
        const bossMaxAttack = Math.round(40 * danger);
        enemy.attack = Math.min(bossMaxAttack, Math.max(bossMinAttack, enemy.attack));
        enemy.speed *= 1.14;
        enemy.nextAttackTime = performance.now() + Math.max(300, Math.round(520 * chapterAttackDelayFactor(chapter)));
      } else {
        enemy.maxHp = Math.max(Math.round(860 * (1 + (chapter - 1) * 0.26)), enemy.maxHp);
        enemy.attack = Math.max(1, Math.round(23 * danger));
        enemy.speed *= 1.06;
        enemy.nextAttackTime = performance.now() + Math.max(340, Math.round(620 * chapterAttackDelayFactor(chapter)));
      }
      enemy.hp = enemy.maxHp;
    }
  }
}
