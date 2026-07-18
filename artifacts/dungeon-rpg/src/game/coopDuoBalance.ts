import { isBossRoom } from './chapterRun';
import { isWalkable } from './dungeon';
import type { Enemy, EnemyType } from './entities';
import { collidesWithRoomProp } from './roomCollision3D';
import { getDuoRoomSpawnPoints, sceneSpawnToGame } from './roomSpawn3D';
import type { RunGameState } from './runEngine';

export const DUO_NORMAL_HP_MULTIPLIER = 1.65;
export const DUO_ELITE_HP_MULTIPLIER = 1.8;
export const DUO_BOSS_HP_MULTIPLIER = 2;
export const DUO_ENEMY_ATTACK_MULTIPLIER = 1.12;
export const DUO_ENEMY_COUNT_MULTIPLIER = 1.25;
export const DUO_MOBILE_ENEMY_CAP = 12;
export const DUO_BOSS_SUPPORT_COUNT = 2;
export const DUO_CURRENCY_MULTIPLIER = 1.25;

const NORMAL_DEATH_MS = 680;

type EnemyStats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  size: number;
  color: string;
};

type DuoBalanceMemory = {
  roomKey: string;
  spawnedSupport: boolean;
  scaledEnemyIds: Set<string>;
  originalEnemyCount: number;
};

const balanceMemory = new WeakMap<RunGameState, DuoBalanceMemory>();

const SUPPORT_STATS: Record<Exclude<EnemyType, 'boss'>, EnemyStats> = {
  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 32, color: '#43c968' },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 30, color: '#89a94b' },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 72, size: 26, color: '#d1ccb0' },
  orc: { hp: 92, attack: 12, defense: 4, speed: 56, size: 30, color: '#627c38' },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 38, color: '#342d42' },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 34, color: '#9e304b' },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 36, color: '#c53827' },
  golem: { hp: 190, attack: 20, defense: 9, speed: 40, size: 34, color: '#696985' },
};

export type DuoRoomBalanceResult = {
  roomKey: string;
  originalEnemyCount: number;
  finalEnemyCount: number;
  addedEnemyCount: number;
  bossRoom: boolean;
  newlyScaledEnemyCount: number;
};

function roomScale(chapter: number, floor: number): number {
  return (1 + Math.max(0, chapter - 1) * 0.36) * (1 + Math.max(0, floor - 1) * 0.055);
}

function hpMultiplier(enemy: Enemy): number {
  if (enemy.enemyType === 'boss') return DUO_BOSS_HP_MULTIPLIER;
  if (enemy.isElite) return DUO_ELITE_HP_MULTIPLIER;
  return DUO_NORMAL_HP_MULTIPLIER;
}

function scaleEnemy(enemy: Enemy): void {
  const ratio = enemy.maxHp > 0 ? Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)) : 1;
  enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpMultiplier(enemy)));
  enemy.hp = Math.max(1, Math.round(enemy.maxHp * ratio));
  enemy.attack = Math.max(1, Math.round(enemy.attack * DUO_ENEMY_ATTACK_MULTIPLIER));
}

function supportType(floor: number, index: number): Exclude<EnemyType, 'boss'> {
  if (floor <= 10) return index % 2 === 0 ? 'goblin' : 'skeleton';
  if (floor <= 20) return index % 2 === 0 ? 'orc' : 'spider';
  if (floor <= 30) return index % 2 === 0 ? 'vampire' : 'skeleton';
  if (floor <= 40) return index % 2 === 0 ? 'demon' : 'vampire';
  return index % 2 === 0 ? 'golem' : 'demon';
}

function createSupportEnemy(
  state: RunGameState,
  runSeed: number,
  index: number,
  spawnPointIndex: number,
): Enemy | null {
  const type = supportType(state.floor, index);
  const base = SUPPORT_STATS[type];
  const requestedPoints = isBossRoom(state.floor)
    ? 1 + DUO_BOSS_SUPPORT_COUNT
    : Math.min(DUO_MOBILE_ENEMY_CAP, Math.max(8, spawnPointIndex + 1));
  const point = getDuoRoomSpawnPoints(state.floor, requestedPoints)[spawnPointIndex];
  if (!point) return null;
  const spawn = sceneSpawnToGame(point, state.map.width, state.map.height, base.size);
  if (!isWalkable(state.map, spawn.x + base.size / 2, spawn.y + base.size / 2)) return null;
  if (collidesWithRoomProp(state.floor, state.map.width, state.map.height, spawn.x, spawn.y, base.size, base.size, 0.22)) return null;

  const scale = roomScale(state.chapter, state.floor);
  const attackScale = 1 + Math.max(0, scale - 1) * 0.62;
  const hp = Math.max(1, Math.round(base.hp * scale));
  const now = performance.now();
  return {
    id: `duo-${runSeed}-${state.chapter}-${state.floor}-${index}`,
    type: 'enemy',
    enemyType: type,
    x: spawn.x,
    y: spawn.y,
    width: base.size,
    height: base.size,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    attack: Math.max(1, Math.round(base.attack * attackScale)),
    defense: base.defense,
    speed: base.speed,
    color: base.color,
    state: 'chase',
    targetX: spawn.x,
    targetY: spawn.y,
    nextAttackTime: now + 700 + index * 120,
    flashUntil: 0,
    spawnTime: now + index * 80,
    lastAttackTime: 0,
    deathTime: 0,
    deathDuration: NORMAL_DEATH_MS,
    isDead: false,
    lastHitTime: 0,
    burnUntil: 0,
    nextBurnTick: 0,
    frostUntil: 0,
    frostSlow: 0,
    lastProgressX: spawn.x,
    lastProgressY: spawn.y,
    lastProgressTime: now,
  };
}

function desiredEnemyCount(state: RunGameState, originalCount: number): number {
  if (isBossRoom(state.floor)) return Math.min(1 + DUO_BOSS_SUPPORT_COUNT, DUO_MOBILE_ENEMY_CAP);
  return Math.min(DUO_MOBILE_ENEMY_CAP, Math.max(originalCount, Math.ceil(originalCount * DUO_ENEMY_COUNT_MULTIPLIER)));
}

function memoryFor(state: RunGameState, runSeed: number): DuoBalanceMemory {
  const roomKey = `${runSeed}:${state.chapter}:${state.floor}`;
  const existing = balanceMemory.get(state);
  if (existing?.roomKey === roomKey) return existing;
  const created: DuoBalanceMemory = {
    roomKey,
    spawnedSupport: false,
    scaledEnemyIds: new Set<string>(),
    originalEnemyCount: state.enemies.length,
  };
  balanceMemory.set(state, created);
  return created;
}

export function ensureDuoRoomBalance(state: RunGameState, runSeed = 0): DuoRoomBalanceResult {
  const memory = memoryFor(state, runSeed);
  const bossRoom = isBossRoom(state.floor);
  let newlyScaledEnemyCount = 0;

  for (const enemy of state.enemies) {
    if (memory.scaledEnemyIds.has(enemy.id)) continue;
    scaleEnemy(enemy);
    memory.scaledEnemyIds.add(enemy.id);
    newlyScaledEnemyCount++;
  }

  if (!memory.spawnedSupport) {
    memory.spawnedSupport = true;
    const targetCount = desiredEnemyCount(state, memory.originalEnemyCount);
    const addCount = Math.max(0, targetCount - memory.originalEnemyCount);
    for (let index = 0; index < addCount; index++) {
      const spawnPointIndex = bossRoom ? index + 1 : memory.originalEnemyCount + index;
      const enemy = createSupportEnemy(state, runSeed, index, spawnPointIndex);
      if (enemy) state.enemies.push(enemy);
    }
  }

  return {
    roomKey: memory.roomKey,
    originalEnemyCount: memory.originalEnemyCount,
    finalEnemyCount: state.enemies.length,
    addedEnemyCount: Math.max(0, state.enemies.length - memory.originalEnemyCount),
    bossRoom,
    newlyScaledEnemyCount,
  };
}

export function applyDuoRoomBalance(state: RunGameState, runSeed = 0): DuoRoomBalanceResult {
  return ensureDuoRoomBalance(state, runSeed);
}

export function duoCurrencyReward(amount: number): number {
  return Math.max(0, Math.round(Math.max(0, amount) * DUO_CURRENCY_MULTIPLIER));
}

export function createDuoRewardRunId(): string {
  return `duo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
