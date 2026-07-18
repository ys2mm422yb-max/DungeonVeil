import type { Enemy, EnemyType, VisualEffect } from './entities';
import type { DuoRunContext } from './coopRunMode';
import type { RunGameState } from './runEngine';

const MAX_ENEMY_SNAPSHOT_COUNT = 32;
const MAX_GUEST_HIT_DAMAGE = 500;
const MAX_GUEST_ATTACK_RANGE = 760;
const MAX_GUEST_POSITION_DRIFT = 96;
const ENEMY_TYPES: EnemyType[] = ['slime', 'goblin', 'skeleton', 'orc', 'spider', 'vampire', 'demon', 'golem', 'boss'];
const ENEMY_STATES: Enemy['state'][] = ['patrol', 'chase', 'attack', 'dead'];
const ELEMENTS: NonNullable<VisualEffect['element']>[] = ['normal', 'fire', 'ice', 'arcane', 'piercing'];

export type CoopEnemySnapshotEntry = {
  id: string;
  enemyType: EnemyType;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense?: number;
  speed: number;
  color: string;
  state: Enemy['state'];
  isDead: boolean;
  isElite?: boolean;
  eliteAffix?: Enemy['eliteAffix'];
  targetX: number;
  targetY: number;
  nextAttackTime: number;
  flashUntil: number;
  spawnTime: number;
  lastAttackTime: number;
  deathTime: number;
  deathDuration?: number;
  lastHitTime?: number;
  hitFromX?: number;
  hitFromY?: number;
  burnUntil?: number;
  nextBurnTick?: number;
  burnDamage?: number;
  burnRanks?: number;
  frostUntil?: number;
  frostSlow?: number;
  isHuntTarget?: boolean;
  huntName?: string;
  huntReward?: number;
  huntVisualVariant?: number;
};

export type CoopEnemySnapshot = {
  version: 1;
  lobbyId: string;
  runSeed: number;
  userId: string;
  chapter: number;
  room: number;
  roomClearReady: boolean;
  enemies: CoopEnemySnapshotEntry[];
  sequence: number;
  sentAt: number;
};

export type CoopEnemyHitIntent = {
  version: 1;
  lobbyId: string;
  runSeed: number;
  userId: string;
  chapter: number;
  room: number;
  targetId: string;
  damage: number;
  element: NonNullable<VisualEffect['element']>;
  playerX: number;
  playerY: number;
  sequence: number;
  sentAt: number;
};

export type CoopPlayerDamageEvent = {
  version: 1;
  lobbyId: string;
  runSeed: number;
  userId: string;
  targetUserId: string;
  chapter: number;
  room: number;
  damage: number;
  sequence: number;
  sentAt: number;
};

export type CoopRemoteAnchor = {
  userId: string;
  chapter: number;
  room: number;
  x: number;
  y: number;
  receivedAt: number;
};

type ExpectedRun = Pick<DuoRunContext, 'lobbyId' | 'runSeed'>;

function finite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function envelope(value: unknown, expected: ExpectedRun, localUserId: string) {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const lobbyId = String(raw.lobbyId ?? '');
  const runSeed = Math.floor(finite(raw.runSeed, -1));
  const userId = String(raw.userId ?? '');
  if (!lobbyId || lobbyId !== expected.lobbyId || runSeed !== expected.runSeed || !userId || userId === localUserId) return null;
  return { raw, lobbyId, runSeed, userId };
}

function normalizeEnemy(value: unknown): CoopEnemySnapshotEntry | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = String(raw.id ?? '').slice(0, 96);
  const enemyType = String(raw.enemyType ?? '') as EnemyType;
  if (!id || !ENEMY_TYPES.includes(enemyType)) return null;
  const stateValue = String(raw.state ?? 'chase') as Enemy['state'];
  const state = ENEMY_STATES.includes(stateValue) ? stateValue : 'chase';
  const maxHp = clamp(finite(raw.maxHp, 1), 1, 10_000_000);
  const hp = clamp(finite(raw.hp, maxHp), -maxHp, maxHp);
  return {
    id,
    enemyType,
    x: finite(raw.x),
    y: finite(raw.y),
    width: clamp(finite(raw.width, 32), 8, 160),
    height: clamp(finite(raw.height, 32), 8, 160),
    vx: clamp(finite(raw.vx), -100, 100),
    vy: clamp(finite(raw.vy), -100, 100),
    hp,
    maxHp,
    attack: clamp(finite(raw.attack, 1), 0, 100_000),
    defense: clamp(finite(raw.defense), 0, 100_000),
    speed: clamp(finite(raw.speed, 1), 0, 1000),
    color: String(raw.color ?? '#ffffff').slice(0, 32),
    state,
    isDead: Boolean(raw.isDead) || state === 'dead' || hp <= 0,
    isElite: Boolean(raw.isElite),
    eliteAffix: raw.eliteAffix as Enemy['eliteAffix'],
    targetX: finite(raw.targetX),
    targetY: finite(raw.targetY),
    nextAttackTime: Math.max(0, finite(raw.nextAttackTime)),
    flashUntil: Math.max(0, finite(raw.flashUntil)),
    spawnTime: Math.max(0, finite(raw.spawnTime)),
    lastAttackTime: Math.max(0, finite(raw.lastAttackTime)),
    deathTime: Math.max(0, finite(raw.deathTime)),
    deathDuration: clamp(finite(raw.deathDuration, 680), 100, 5000),
    lastHitTime: Math.max(0, finite(raw.lastHitTime)),
    hitFromX: finite(raw.hitFromX),
    hitFromY: finite(raw.hitFromY),
    burnUntil: Math.max(0, finite(raw.burnUntil)),
    nextBurnTick: Math.max(0, finite(raw.nextBurnTick)),
    burnDamage: clamp(finite(raw.burnDamage), 0, 10_000),
    burnRanks: clamp(Math.floor(finite(raw.burnRanks)), 0, 3),
    frostUntil: Math.max(0, finite(raw.frostUntil)),
    frostSlow: clamp(finite(raw.frostSlow), 0, 0.9),
    isHuntTarget: Boolean(raw.isHuntTarget),
    huntName: String(raw.huntName ?? '').slice(0, 64) || undefined,
    huntReward: Math.max(0, finite(raw.huntReward)),
    huntVisualVariant: Math.max(0, Math.floor(finite(raw.huntVisualVariant))),
  };
}

function serializeEnemy(enemy: Enemy): CoopEnemySnapshotEntry {
  return {
    id: enemy.id,
    enemyType: enemy.enemyType,
    x: enemy.x,
    y: enemy.y,
    width: enemy.width,
    height: enemy.height,
    vx: enemy.vx,
    vy: enemy.vy,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    attack: enemy.attack,
    defense: enemy.defense,
    speed: enemy.speed,
    color: enemy.color,
    state: enemy.state,
    isDead: enemy.isDead,
    isElite: enemy.isElite,
    eliteAffix: enemy.eliteAffix,
    targetX: enemy.targetX,
    targetY: enemy.targetY,
    nextAttackTime: enemy.nextAttackTime,
    flashUntil: enemy.flashUntil,
    spawnTime: enemy.spawnTime,
    lastAttackTime: enemy.lastAttackTime,
    deathTime: enemy.deathTime,
    deathDuration: enemy.deathDuration,
    lastHitTime: enemy.lastHitTime,
    hitFromX: enemy.hitFromX,
    hitFromY: enemy.hitFromY,
    burnUntil: enemy.burnUntil,
    nextBurnTick: enemy.nextBurnTick,
    burnDamage: enemy.burnDamage,
    burnRanks: enemy.burnRanks,
    frostUntil: enemy.frostUntil,
    frostSlow: enemy.frostSlow,
    isHuntTarget: enemy.isHuntTarget,
    huntName: enemy.huntName,
    huntReward: enemy.huntReward,
    huntVisualVariant: enemy.huntVisualVariant,
  };
}

export function createCoopEnemySnapshot(context: DuoRunContext, userId: string, state: RunGameState, sequence: number): CoopEnemySnapshot {
  return {
    version: 1,
    lobbyId: context.lobbyId,
    runSeed: context.runSeed,
    userId,
    chapter: state.chapter,
    room: state.floor,
    roomClearReady: state.roomClearReady,
    enemies: state.enemies.slice(0, MAX_ENEMY_SNAPSHOT_COUNT).map(serializeEnemy),
    sequence,
    sentAt: Date.now(),
  };
}

export function normalizeCoopEnemySnapshot(value: unknown, expected: ExpectedRun, localUserId: string): CoopEnemySnapshot | null {
  const parsed = envelope(value, expected, localUserId);
  if (!parsed) return null;
  const enemies = Array.isArray(parsed.raw.enemies)
    ? parsed.raw.enemies.slice(0, MAX_ENEMY_SNAPSHOT_COUNT).map(normalizeEnemy).filter((enemy): enemy is CoopEnemySnapshotEntry => Boolean(enemy))
    : [];
  return {
    version: 1,
    lobbyId: parsed.lobbyId,
    runSeed: parsed.runSeed,
    userId: parsed.userId,
    chapter: Math.max(1, Math.floor(finite(parsed.raw.chapter, 1))),
    room: clamp(Math.floor(finite(parsed.raw.room, 1)), 1, 50),
    roomClearReady: Boolean(parsed.raw.roomClearReady),
    enemies,
    sequence: Math.max(0, Math.floor(finite(parsed.raw.sequence))),
    sentAt: Math.max(0, Math.floor(finite(parsed.raw.sentAt))),
  };
}

export function normalizeCoopEnemyHitIntent(value: unknown, expected: ExpectedRun, localUserId: string): CoopEnemyHitIntent | null {
  const parsed = envelope(value, expected, localUserId);
  if (!parsed) return null;
  const targetId = String(parsed.raw.targetId ?? '').slice(0, 96);
  const elementValue = String(parsed.raw.element ?? 'normal') as NonNullable<VisualEffect['element']>;
  if (!targetId || !ELEMENTS.includes(elementValue)) return null;
  return {
    version: 1,
    lobbyId: parsed.lobbyId,
    runSeed: parsed.runSeed,
    userId: parsed.userId,
    chapter: Math.max(1, Math.floor(finite(parsed.raw.chapter, 1))),
    room: clamp(Math.floor(finite(parsed.raw.room, 1)), 1, 50),
    targetId,
    damage: clamp(Math.round(finite(parsed.raw.damage, 1)), 1, MAX_GUEST_HIT_DAMAGE),
    element: elementValue,
    playerX: finite(parsed.raw.playerX),
    playerY: finite(parsed.raw.playerY),
    sequence: Math.max(0, Math.floor(finite(parsed.raw.sequence))),
    sentAt: Math.max(0, Math.floor(finite(parsed.raw.sentAt))),
  };
}

export function normalizeCoopPlayerDamageEvent(value: unknown, expected: ExpectedRun, localUserId: string): CoopPlayerDamageEvent | null {
  const parsed = envelope(value, expected, localUserId);
  if (!parsed) return null;
  if (String(parsed.raw.targetUserId ?? '') !== localUserId) return null;
  return {
    version: 1,
    lobbyId: parsed.lobbyId,
    runSeed: parsed.runSeed,
    userId: parsed.userId,
    targetUserId: localUserId,
    chapter: Math.max(1, Math.floor(finite(parsed.raw.chapter, 1))),
    room: clamp(Math.floor(finite(parsed.raw.room, 1)), 1, 50),
    damage: clamp(Math.round(finite(parsed.raw.damage, 1)), 1, 100_000),
    sequence: Math.max(0, Math.floor(finite(parsed.raw.sequence))),
    sentAt: Math.max(0, Math.floor(finite(parsed.raw.sentAt))),
  };
}

export function validateCoopEnemyHitIntent(intent: CoopEnemyHitIntent, state: RunGameState, remote: CoopRemoteAnchor | null, now = Date.now()) {
  if (!remote || now - remote.receivedAt > 5000 || remote.userId !== intent.userId) return null;
  if (intent.chapter !== state.chapter || intent.room !== state.floor || remote.chapter !== state.chapter || remote.room !== state.floor) return null;
  const remoteX = remote.x + 16;
  const remoteY = remote.y + 16;
  if (Math.hypot(intent.playerX - remoteX, intent.playerY - remoteY) > MAX_GUEST_POSITION_DRIFT) return null;
  const enemy = state.enemies.find(candidate => candidate.id === intent.targetId && candidate.hp > 0 && !candidate.isDead);
  if (!enemy) return null;
  const enemyX = enemy.x + enemy.width / 2;
  const enemyY = enemy.y + enemy.height / 2;
  if (Math.hypot(enemyX - remoteX, enemyY - remoteY) > MAX_GUEST_ATTACK_RANGE) return null;
  const damageCap = Math.max(1, Math.min(MAX_GUEST_HIT_DAMAGE, Math.ceil(enemy.maxHp * 0.45)));
  return { enemy, damage: clamp(intent.damage, 1, damageCap), element: intent.element };
}

export function applyCoopEnemySnapshot(state: RunGameState, snapshot: CoopEnemySnapshot): boolean {
  if (snapshot.chapter !== state.chapter || snapshot.room !== state.floor) return false;
  const existing = new Map(state.enemies.map(enemy => [enemy.id, enemy]));
  state.enemies = snapshot.enemies.map(entry => {
    const previous = existing.get(entry.id);
    return {
      ...entry,
      type: 'enemy' as const,
      flashUntil: Math.max(entry.flashUntil, previous?.flashUntil ?? 0),
    };
  });
  state.roomClearReady = snapshot.roomClearReady;
  return true;
}
