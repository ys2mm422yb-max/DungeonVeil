import type { EliteAffix, Enemy } from './entities';
import type { GameEngine } from './runEngine';

const ENEMY_SPEED_FACTOR: Record<string, number> = {
  slime: 1.05,
  goblin: 1.1,
  skeleton: 1.08,
  orc: 1.04,
  spider: 1.12,
  vampire: 1.1,
  demon: 1.08,
  golem: 1.02,
  boss: 1.12,
};

const ELITE_AFFIXES: readonly EliteAffix[] = ['bulwark', 'frenzy', 'mender', 'volatile'];

export type RunBalanceState = {
  roomKey: string;
  balancedEnemyIds: Set<string>;
  processedVolatileDeaths: Set<string>;
  pendingVolatile: Map<string, { x: number; y: number; triggerAt: number; damage: number }>;
};

type BossTuning = {
  hpFloor: number;
  attackFloor: number;
  attackCap: number;
  speedScale: number;
  firstAttackDelay: number;
};

export type ChapterBalanceProfile = {
  hpScale: number;
  attackScale: number;
  bossHpScale: number;
  earlyElitePressure: boolean;
};

export function createRunBalanceState(): RunBalanceState {
  return { roomKey: '', balancedEnemyIds: new Set<string>(), processedVolatileDeaths: new Set<string>(), pendingVolatile: new Map() };
}

function balanceKey(id: string): string {
  return id.replace(/-hunt-\d+$/, '');
}

function enemyIndex(enemy: Enemy) {
  const value = Number(balanceKey(enemy.id).split('-').at(-1));
  return Number.isFinite(value) ? value : 0;
}

function legacySpawnScale(room: number, chapter: number, boss: boolean): number {
  const chapterScale = 1 + Math.max(0, chapter - 1) * 0.36;
  const roomScale = 1 + Math.max(0, room - 1) * 0.055;
  return chapterScale * roomScale * (boss && room === 50 ? 1.18 : 1);
}

function legacyAttackScale(scale: number): number {
  return 1 + Math.max(0, scale - 1) * 0.62;
}

function roomHpScale(room: number): number {
  return 1 + Math.max(0, room - 1) * 0.022;
}

function roomAttackScale(room: number): number {
  return 1 + Math.max(0, room - 1) * 0.0105;
}

export function chapterBalanceProfile(chapter: number): ChapterBalanceProfile {
  const value = Math.max(1, Math.floor(chapter));
  const fixed = [
    { hpScale: 1, attackScale: 1, bossHpScale: 1, earlyElitePressure: false },
    { hpScale: 1.12, attackScale: 1.08, bossHpScale: 1.14, earlyElitePressure: false },
    { hpScale: 1.24, attackScale: 1.16, bossHpScale: 1.3, earlyElitePressure: false },
    { hpScale: 1.36, attackScale: 1.24, bossHpScale: 1.46, earlyElitePressure: true },
    { hpScale: 1.48, attackScale: 1.32, bossHpScale: 1.62, earlyElitePressure: true },
    { hpScale: 1.6, attackScale: 1.4, bossHpScale: 1.78, earlyElitePressure: true },
  ] as const;
  if (value <= fixed.length) return fixed[value - 1];
  const overflow = value - fixed.length;
  return {
    hpScale: fixed.at(-1)!.hpScale + overflow * 0.08,
    attackScale: fixed.at(-1)!.attackScale + overflow * 0.06,
    bossHpScale: fixed.at(-1)!.bossHpScale + overflow * 0.1,
    earlyElitePressure: true,
  };
}

function attackCapForRoom(room: number, chapter: number): number {
  const base = 9 + room * 0.9;
  return Math.round(base * chapterBalanceProfile(chapter).attackScale);
}

function bossTuningForRoom(room: number): BossTuning {
  if (room >= 50) return { hpFloor: 4500, attackFloor: 52, attackCap: 72, speedScale: 1.12, firstAttackDelay: 520 };
  if (room >= 40) return { hpFloor: 3200, attackFloor: 42, attackCap: 60, speedScale: 1.1, firstAttackDelay: 550 };
  if (room >= 30) return { hpFloor: 2200, attackFloor: 34, attackCap: 48, speedScale: 1.08, firstAttackDelay: 580 };
  if (room >= 20) return { hpFloor: 1400, attackFloor: 26, attackCap: 38, speedScale: 1.06, firstAttackDelay: 620 };
  return { hpFloor: 800, attackFloor: 20, attackCap: 28, speedScale: 1.03, firstAttackDelay: 680 };
}

function shouldBeElite(room: number, enemy: Enemy, chapter: number) {
  if (enemy.enemyType === 'boss' || room < 8) return false;
  const index = enemyIndex(enemy);
  if (room >= 35) return index === 0 || index === 3 || (chapter >= 6 && index === 2);
  if (room >= 20) return index === 0 || (room % 4 === 0 && index === 3) || (chapter >= 5 && index === 2);
  if (room >= 12) return index === 0 || (room % 5 === 0 && index === 3);
  return index === 0;
}

function affixFor(room: number, chapter: number, enemy: Enemy): EliteAffix {
  return ELITE_AFFIXES[(room + chapter + enemyIndex(enemy)) % ELITE_AFFIXES.length];
}

function applyEliteAffix(enemy: Enemy, room: number, chapter: number, time: number): { hp: number; attack: number; speed: number } {
  if (!enemy.isElite) return { hp: 1, attack: 1, speed: 1 };
  enemy.eliteAffix = affixFor(room, chapter, enemy);
  if (enemy.eliteAffix === 'bulwark') {
    enemy.defense = (enemy.defense ?? 0) + 3;
    enemy.color = '#79c8a2';
    return { hp: 1.16, attack: 1, speed: 0.97 };
  }
  if (enemy.eliteAffix === 'frenzy') {
    enemy.color = '#ed7656';
    return { hp: 1, attack: 1.08, speed: 1.1 };
  }
  if (enemy.eliteAffix === 'mender') {
    enemy.eliteNextPulseAt = time + 3600;
    enemy.color = '#a98aff';
    return { hp: 1.06, attack: 0.96, speed: 1 };
  }
  enemy.color = '#e7a54b';
  return { hp: 1.04, attack: 1.04, speed: 1.02 };
}

function announceEliteAffix(engine: GameEngine, enemy: Enemy, time: number) {
  if (!enemy.isElite || !enemy.eliteAffix) return;
  const labels: Record<EliteAffix, string> = { bulwark: 'BOLLWERK', frenzy: 'RASEREI', mender: 'HEILER', volatile: 'EXPLOSIV' };
  engine.state.damageNumbers.push({
    id: `elite-affix-${time}-${enemy.id}`,
    x: enemy.x + enemy.width / 2,
    y: enemy.y - 12,
    value: labels[enemy.eliteAffix],
    color: enemy.color,
    lifeTime: 0,
    maxLifeTime: 1500,
    scale: 0.9,
  });
}

function updateMenders(engine: GameEngine, time: number) {
  for (const enemy of engine.state.enemies) {
    if (enemy.isDead || enemy.hp <= 0 || enemy.eliteAffix !== 'mender' || time < (enemy.eliteNextPulseAt ?? 0)) continue;
    enemy.eliteNextPulseAt = time + 5200;
    const x = enemy.x + enemy.width / 2;
    const y = enemy.y + enemy.height / 2;
    for (const ally of engine.state.enemies) {
      if (ally.isDead || ally.hp <= 0) continue;
      const ax = ally.x + ally.width / 2;
      const ay = ally.y + ally.height / 2;
      if (Math.hypot(ax - x, ay - y) > 150) continue;
      ally.hp = Math.min(ally.maxHp, ally.hp + Math.max(2, Math.round(ally.maxHp * 0.06)));
    }
    engine.state.effects.push({ id: `elite-mender-${time}-${enemy.id}`, x, y, radius: 0, maxRadius: 150, color: '#a98aff', lifeTime: 0, maxLifeTime: 720, type: 'circle', element: 'arcane' });
  }
}

function queueVolatileDeaths(engine: GameEngine, state: RunBalanceState, time: number) {
  for (const enemy of engine.state.enemies) {
    if (!enemy.isDead || enemy.eliteAffix !== 'volatile' || state.processedVolatileDeaths.has(enemy.id)) continue;
    state.processedVolatileDeaths.add(enemy.id);
    const x = enemy.x + enemy.width / 2;
    const y = enemy.y + enemy.height / 2;
    state.pendingVolatile.set(enemy.id, { x, y, triggerAt: time + 700, damage: Math.min(24, Math.max(8, Math.round(engine.state.player.maxHp * 0.12))) });
    engine.state.effects.push({ id: `elite-volatile-warning-${time}-${enemy.id}`, x, y, radius: 8, maxRadius: 88, color: '#f0a447', lifeTime: 0, maxLifeTime: 700, type: 'circle', element: 'fire' });
  }
}

function resolveVolatileDeaths(engine: GameEngine, state: RunBalanceState, time: number) {
  const player = engine.state.player;
  for (const [id, burst] of state.pendingVolatile) {
    if (time < burst.triggerAt) continue;
    state.pendingVolatile.delete(id);
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    if (Math.hypot(px - burst.x, py - burst.y) <= 88 && time > player.invincibleUntil) {
      player.hp -= burst.damage;
      player.lastHitTime = time;
      engine.state.damageNumbers.push({ id: `volatile-hit-${time}`, x: px, y: player.y - 8, value: `-${burst.damage}`, color: '#f0a447', lifeTime: 0, maxLifeTime: 780, scale: 1.35 });
    }
    engine.state.effects.push({ id: `elite-volatile-burst-${time}-${id}`, x: burst.x, y: burst.y, radius: 0, maxRadius: 96, color: '#ff7d38', lifeTime: 0, maxLifeTime: 520, type: 'circle', element: 'fire' });
  }
}

function updateEliteMechanics(engine: GameEngine, state: RunBalanceState, time: number) {
  updateMenders(engine, time);
  queueVolatileDeaths(engine, state, time);
  resolveVolatileDeaths(engine, state, time);
}

export function updateRunBalance(engine: GameEngine, state: RunBalanceState): void {
  const room = Math.max(1, Math.min(50, engine.state.floor));
  const chapter = Math.max(1, Math.round(engine.state.chapter));
  const roomKey = `${chapter}:${room}`;
  if (state.roomKey !== roomKey) {
    state.roomKey = roomKey;
    state.balancedEnemyIds.clear();
    state.processedVolatileDeaths.clear();
    state.pendingVolatile.clear();
  }

  const active = new Set(engine.state.enemies.map(enemy => balanceKey(enemy.id)));
  for (const id of state.balancedEnemyIds) if (!active.has(id)) state.balancedEnemyIds.delete(id);

  const profile = chapterBalanceProfile(chapter);
  const time = performance.now();
  for (const enemy of engine.state.enemies) {
    const key = balanceKey(enemy.id);
    if (state.balancedEnemyIds.has(key)) continue;
    state.balancedEnemyIds.add(key);

    const boss = enemy.enemyType === 'boss';
    const spawnScale = legacySpawnScale(room, chapter, boss);
    const baseHp = Math.max(1, enemy.maxHp / spawnScale);
    const baseAttack = Math.max(1, enemy.attack / legacyAttackScale(spawnScale));
    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;

    enemy.isElite = shouldBeElite(room, enemy, chapter);
    const elite = applyEliteAffix(enemy, room, chapter, time);
    const eliteHp = enemy.isElite ? 1.3 * elite.hp : 1;
    const eliteAttack = enemy.isElite ? 1.1 * elite.attack : 1;
    const eliteSpeed = enemy.isElite ? 1.04 * elite.speed : 1;

    enemy.maxHp = Math.max(1, Math.round(baseHp * roomHpScale(room) * profile.hpScale * eliteHp));
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpRatio));
    enemy.attack = Math.min(
      Math.max(1, Math.round(baseAttack * roomAttackScale(room) * profile.attackScale * eliteAttack)),
      attackCapForRoom(room, chapter),
    );
    enemy.speed *= (ENEMY_SPEED_FACTOR[enemy.enemyType] ?? 1.06) * eliteSpeed;
    if (enemy.isElite) {
      enemy.nextAttackTime = Math.min(enemy.nextAttackTime, time + 520);
      announceEliteAffix(engine, enemy, time);
    }

    if (boss) {
      enemy.isElite = false;
      delete enemy.eliteAffix;
      const tuning = bossTuningForRoom(room);
      enemy.maxHp = Math.max(Math.round(tuning.hpFloor * profile.bossHpScale), enemy.maxHp);
      enemy.attack = Math.min(
        Math.round(tuning.attackCap * profile.attackScale),
        Math.max(Math.round(tuning.attackFloor * profile.attackScale), enemy.attack),
      );
      enemy.speed *= tuning.speedScale;
      enemy.nextAttackTime = time + tuning.firstAttackDelay;
      enemy.hp = enemy.maxHp;
    }
  }

  updateEliteMechanics(engine, state, time);
}
