import type { EliteAffix, Enemy } from './entities';
import type { GameEngine } from './runEngine';

const ENEMY_BASE: Record<string, { hp: number; attack: number; defense: number; speed: number }> = {
  slime: { hp: 24, attack: 4, defense: 0, speed: 42 },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68 },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 72 },
  orc: { hp: 92, attack: 12, defense: 4, speed: 56 },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88 },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82 },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76 },
  golem: { hp: 190, attack: 20, defense: 9, speed: 40 },
  boss: { hp: 520, attack: 24, defense: 7, speed: 54 },
};

const ENEMY_SPEED_FACTOR: Record<string, number> = {
  slime: 1.05,
  goblin: 1.08,
  skeleton: 1.06,
  orc: 1.02,
  spider: 1.1,
  vampire: 1.08,
  demon: 1.05,
  golem: 0.98,
  boss: 1,
};

export type RunBalanceState = {
  balancedEnemyIds: Set<string>;
};

type BossTuning = {
  hp: number;
  attack: number;
  speedScale: number;
  firstAttackDelay: number;
};

export type ChapterBalanceProfile = {
  enemyHpScale: number;
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
  const value = Number(balanceKey(enemy.id).split('-').at(-1));
  return Number.isFinite(value) ? value : 0;
}

export function roomEnemyHpScale(room: number): number {
  const value = Math.max(1, Math.min(50, Math.floor(room)));
  if (value <= 2) return 1 + (value - 1) * 0.05;
  if (value <= 5) return 1.15 + (value - 3) * 0.08;
  if (value <= 9) return 1.38 + (value - 6) * 0.08;
  if (value === 10) return 1;
  if (value <= 19) return 1.65 + (value - 11) * 0.07;
  if (value === 20) return 1;
  if (value <= 29) return 2.2 + (value - 21) * 0.055;
  if (value === 30) return 1;
  if (value <= 39) return 2.65 + (value - 31) * 0.05;
  if (value === 40) return 1;
  if (value <= 49) return 3.05 + (value - 41) * 0.045;
  return 1;
}

export function roomEnemyAttackScale(room: number): number {
  const value = Math.max(1, Math.min(50, Math.floor(room)));
  return 1 + Math.max(0, value - 1) * 0.012;
}

export function chapterBalanceProfile(chapter: number): ChapterBalanceProfile {
  const value = Math.max(1, Math.floor(chapter));
  const boundedSteps = Math.min(5, value - 1);
  const overflow = Math.max(0, value - 6);
  return {
    enemyHpScale: 1 + boundedSteps * 0.12 + overflow * 0.08,
    attackScale: 1 + boundedSteps * 0.08 + overflow * 0.06,
    bossHpScale: 1 + boundedSteps * 0.12 + overflow * 0.08,
    earlyElitePressure: value >= 4,
  };
}

function bossTuningForRoom(room: number): BossTuning {
  if (room >= 50) return { hp: 6500, attack: 50, speedScale: 1.1, firstAttackDelay: 700 };
  if (room >= 40) return { hp: 4200, attack: 42, speedScale: 1.08, firstAttackDelay: 620 };
  if (room >= 30) return { hp: 2600, attack: 34, speedScale: 1.06, firstAttackDelay: 650 };
  if (room >= 20) return { hp: 1600, attack: 27, speedScale: 1.03, firstAttackDelay: 680 };
  return { hp: 900, attack: 20, speedScale: 1, firstAttackDelay: 760 };
}

function shouldBeElite(room: number, enemy: Enemy, chapter: number) {
  if (enemy.enemyType === 'boss' || room < 6) return false;
  const index = enemyIndex(enemy);
  if (room >= 40) return index === 0 || index === 2 || index === 4;
  if (room >= 30) return chapterBalanceProfile(chapter).earlyElitePressure ? index === 0 || index === 2 : index === 0;
  if (room >= 15) return index === 0 || index === 3;
  if (room >= 11) return index === 0 || (room % 3 === 0 && index === 4);
  return index === 0;
}

export function eliteAffixFor(room: number, enemy: Enemy): EliteAffix {
  const affixes: EliteAffix[] = ['bulwark', 'berserker', 'swift'];
  return affixes[(Math.max(1, room) + enemyIndex(enemy)) % affixes.length];
}

function baseStats(enemy: Enemy) {
  return ENEMY_BASE[enemy.enemyType] ?? {
    hp: Math.max(1, enemy.maxHp),
    attack: Math.max(1, enemy.attack),
    defense: Math.max(0, enemy.defense ?? 0),
    speed: Math.max(1, enemy.speed),
  };
}

export function updateRunBalance(engine: GameEngine, state: RunBalanceState): void {
  const active = new Set(engine.state.enemies.map(enemy => balanceKey(enemy.id)));
  for (const id of state.balancedEnemyIds) {
    if (!active.has(id)) state.balancedEnemyIds.delete(id);
  }

  const room = Math.max(1, Math.min(50, engine.state.floor));
  const chapter = Math.max(1, Math.round(engine.state.chapter));
  const profile = chapterBalanceProfile(chapter);
  const now = performance.now();

  for (const enemy of engine.state.enemies) {
    const key = balanceKey(enemy.id);
    if (state.balancedEnemyIds.has(key)) continue;
    state.balancedEnemyIds.add(key);

    const base = baseStats(enemy);
    if (enemy.enemyType === 'boss') {
      const tuning = bossTuningForRoom(room);
      enemy.isElite = false;
      enemy.eliteAffix = undefined;
      enemy.maxHp = Math.max(1, Math.round(tuning.hp * profile.bossHpScale));
      enemy.hp = enemy.maxHp;
      enemy.attack = Math.max(1, Math.round(tuning.attack * profile.attackScale));
      enemy.defense = base.defense;
      enemy.speed = Math.round(base.speed * tuning.speedScale);
      enemy.nextAttackTime = now + tuning.firstAttackDelay;
      continue;
    }

    enemy.isElite = shouldBeElite(room, enemy, chapter);
    enemy.eliteAffix = enemy.isElite ? eliteAffixFor(room, enemy) : undefined;
    const eliteHp = enemy.isElite ? 1.3 : 1;
    const eliteAttack = enemy.isElite ? 1.1 : 1;
    const eliteSpeed = enemy.isElite ? 1.04 : 1;
    const affixAttack = enemy.eliteAffix === 'berserker' ? 1.08 : 1;
    const affixSpeed = enemy.eliteAffix === 'swift' ? 1.08 : 1;
    const affixDefense = enemy.eliteAffix === 'bulwark' ? 3 : 0;

    enemy.maxHp = Math.max(1, Math.round(base.hp * roomEnemyHpScale(room) * profile.enemyHpScale * eliteHp));
    enemy.hp = enemy.maxHp;
    enemy.attack = Math.max(1, Math.round(base.attack * roomEnemyAttackScale(room) * profile.attackScale * eliteAttack * affixAttack));
    enemy.defense = base.defense + affixDefense;
    enemy.speed = Math.max(1, Math.round(base.speed * (ENEMY_SPEED_FACTOR[enemy.enemyType] ?? 1) * eliteSpeed * affixSpeed));
    enemy.nextAttackTime = now + (enemy.eliteAffix === 'swift' ? 520 : enemy.isElite ? 620 : 720);
  }
}
