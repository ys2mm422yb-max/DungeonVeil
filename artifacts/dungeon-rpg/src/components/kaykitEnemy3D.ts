import type { Enemy } from '../game/entities';
import { bossAttackContract } from '../game/bossAttackTelegraphs';
import { enemyVisualProfile } from '../game/enemyRegionalIdentity';
import {
  createKayKitEnemyVisual as createBaseKayKitEnemyVisual,
  preloadKayKitEnemyVisuals as preloadBaseKayKitEnemyVisuals,
  updateKayKitEnemyVisual as updateBaseKayKitEnemyVisual,
  type KayKitEnemyVisual as BaseKayKitEnemyVisual,
} from './kaykitEnemyBase3D';

export type KayKitEnemyVisual = BaseKayKitEnemyVisual;

export type Room20BossFlightPose = {
  active: boolean;
  progress: number;
  height: number;
  tilt: number;
  shadowScale: number;
  shadowOpacity: number;
};

type FlightVisualState = {
  baseSceneY: number;
  baseSceneRotationX: number;
  shadow: any | null;
  shadowBaseOpacity: number;
};

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const IMPORTED_ENEMY_TYPES = ['slime', 'goblin', 'spider', 'vampire', 'demon'] as const satisfies readonly Enemy['enemyType'][];
const IMPORTED_ENEMY_ASSETS: Record<(typeof IMPORTED_ENEMY_TYPES)[number], string> = {
  slime: 'assets/imported/enemies/Slime.glb',
  goblin: 'assets/imported/enemies/Rat.glb',
  spider: 'assets/imported/enemies/Spider.glb',
  vampire: 'assets/imported/enemies/Bat.glb',
  demon: 'assets/imported/enemies/Snake_angry.glb',
};
const IMPORTED_VISUAL_RETRY_MS = 180;
const IMPORTED_VISUAL_MAX_WAIT_MS = 20_000;
const ENEMY_ASSET_FETCH_ATTEMPTS = 4;
const flightVisuals = new WeakMap<object, FlightVisualState>();
const enemyPreloadPromises = new Map<string, Promise<void>>();
const GROUNDED_ROOM_20_BOSS_POSE: Room20BossFlightPose = {
  active: false,
  progress: 0,
  height: 0,
  tilt: 0,
  shadowScale: 1,
  shadowOpacity: 0.32,
};

function roomFromEnemyId(enemy: Enemy) {
  const parts = enemy.id.split('-');
  const room = Number(parts.at(-2));
  return Number.isFinite(room) ? room : 1;
}

function spawnIndexFromEnemyId(enemy: Enemy) {
  const index = Number(enemy.id.split('-').at(-1));
  return Number.isFinite(index) ? index : 0;
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => globalThis.setTimeout(resolve, milliseconds));
}

function requestedVisualRole(enemy: Enemy) {
  return enemyVisualProfile(roomFromEnemyId(enemy), enemy.enemyType, spawnIndexFromEnemyId(enemy)).role;
}

function importedEnemyType(type: Enemy['enemyType']): type is (typeof IMPORTED_ENEMY_TYPES)[number] {
  return IMPORTED_ENEMY_TYPES.includes(type as (typeof IMPORTED_ENEMY_TYPES)[number]);
}

function requestedImportedTypes(enemyTypes: readonly Enemy['enemyType'][]) {
  return [...new Set(enemyTypes.filter(importedEnemyType))].sort();
}

function enemyAssetUrl(type: (typeof IMPORTED_ENEMY_TYPES)[number]) {
  const path = IMPORTED_ENEMY_ASSETS[type];
  if (typeof document === 'undefined') return `/${path}`;
  return new URL(path, document.baseURI).toString();
}

async function preloadLocalEnemyAsset(type: (typeof IMPORTED_ENEMY_TYPES)[number]) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= ENEMY_ASSET_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(enemyAssetUrl(type), {
        cache: attempt === 1 ? 'default' : 'reload',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength < 512) throw new Error(`enemy asset is truncated (${bytes.byteLength} bytes)`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < ENEMY_ASSET_FETCH_ATTEMPTS) await wait(attempt * 320);
    }
  }
  throw new Error(`Local enemy asset failed to load: ${type}`, { cause: lastError });
}

async function createReliableEnemyVisual(THREE: any, enemy: Enemy): Promise<KayKitEnemyVisual | null> {
  let visual = await createBaseKayKitEnemyVisual(THREE, enemy);
  if (!visual || !importedEnemyType(enemy.enemyType) || visual.imported) return visual;

  // Never accept the humanoid fallback while the dedicated creature GLB is
  // still resolving. The room gate waits for this promise before gameplay.
  const deadline = Date.now() + IMPORTED_VISUAL_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await wait(IMPORTED_VISUAL_RETRY_MS);
    const retry = await createBaseKayKitEnemyVisual(THREE, enemy);
    if (retry) visual = retry;
    if (visual?.imported) return visual;
  }

  throw new Error(`Dedicated enemy model did not become ready: ${enemy.enemyType}`);
}

function preloadEnemy(type: (typeof IMPORTED_ENEMY_TYPES)[number], index: number): Enemy {
  return {
    id: `preload-1-${index}`,
    type: 'enemy',
    enemyType: type,
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    vx: 0,
    vy: 0,
    hp: 1,
    maxHp: 1,
    attack: 1,
    defense: 0,
    speed: 1,
    color: '#ffffff',
    state: 'patrol',
    isDead: false,
    targetX: 0,
    targetY: 0,
    nextAttackTime: 0,
    flashUntil: 0,
    spawnTime: 0,
    lastAttackTime: 0,
    deathTime: 0,
  };
}

async function preloadRealCreatureModels(types: readonly (typeof IMPORTED_ENEMY_TYPES)[number][]) {
  if (!types.length) return;
  await Promise.all(types.map(preloadLocalEnemyAsset));
  const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
  const results = await Promise.all(types.map((type, index) =>
    createReliableEnemyVisual(THREE, preloadEnemy(type, index))
  ));
  const unavailable = types.filter((_, index) => !results[index]?.imported);
  if (unavailable.length) throw new Error(`Real creature preload incomplete: ${unavailable.join(', ')}`);
}

async function loadEnemyAssetsWithRetries(types: readonly (typeof IMPORTED_ENEMY_TYPES)[number][]) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await preloadBaseKayKitEnemyVisuals();
      await preloadRealCreatureModels(types);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Enemy preload attempt ${attempt} failed for ${types.join(', ') || 'base library'}`, error);
      if (attempt < 3) await wait(attempt * 500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Enemy preload failed');
}

function startEnemyPreload(enemyTypes: readonly Enemy['enemyType'][]) {
  const importedTypes = requestedImportedTypes(enemyTypes);
  const key = importedTypes.join('|') || 'base';
  const cached = enemyPreloadPromises.get(key);
  if (cached) return cached;

  const preload = loadEnemyAssetsWithRetries(importedTypes).catch(error => {
    enemyPreloadPromises.delete(key);
    throw error;
  });
  enemyPreloadPromises.set(key, preload);
  return preload;
}

export async function preloadKayKitEnemyVisuals(enemyTypes: readonly Enemy['enemyType'][] = []) {
  await startEnemyPreload(enemyTypes);
}

function findGroundShadow(visual: BaseKayKitEnemyVisual) {
  return visual.root.children?.find((child: any) =>
    child.geometry?.type === 'CircleGeometry'
    && child.material?.color?.getHex?.() === 0x000000
  ) ?? null;
}

function visualState(visual: BaseKayKitEnemyVisual): FlightVisualState {
  const existing = flightVisuals.get(visual);
  if (existing) return existing;
  const shadow = findGroundShadow(visual);
  const created = {
    baseSceneY: visual.scene.position.y,
    baseSceneRotationX: visual.scene.rotation.x,
    shadow,
    shadowBaseOpacity: Number(shadow?.material?.opacity ?? 0.32),
  };
  flightVisuals.set(visual, created);
  return created;
}

export function room20BossFlightPose(
  enemy: Enemy,
  now = typeof performance !== 'undefined' ? performance.now() : Date.now(),
): Room20BossFlightPose {
  if (enemy.enemyType !== 'boss' || roomFromEnemyId(enemy) !== 20 || enemy.lastAttackTime <= 0 || enemy.isDead) {
    return GROUNDED_ROOM_20_BOSS_POSE;
  }

  const durationMs = bossAttackContract(20)?.windupMs ?? 720;
  const age = now - enemy.lastAttackTime;
  if (age < 0 || age > durationMs) return GROUNDED_ROOM_20_BOSS_POSE;

  const progress = Math.max(0, Math.min(1, age / Math.max(1, durationMs)));
  const launchEnd = 0.28;
  const diveStart = 0.68;
  const maxHeight = 1.9;
  let height = 0;
  let tilt = 0;

  if (progress < launchEnd) {
    const phase = progress / launchEnd;
    const eased = 1 - Math.pow(1 - phase, 3);
    height = maxHeight * eased;
    tilt = -0.14 * eased;
  } else if (progress < diveStart) {
    const phase = (progress - launchEnd) / (diveStart - launchEnd);
    height = maxHeight + Math.sin(phase * Math.PI * 2) * 0.08;
    tilt = -0.14 + Math.sin(phase * Math.PI) * 0.06;
  } else {
    const phase = (progress - diveStart) / (1 - diveStart);
    height = maxHeight * (1 - phase * phase);
    tilt = -0.08 + phase * 0.36;
  }

  const normalizedHeight = Math.max(0, Math.min(1, height / maxHeight));
  return {
    active: true,
    progress,
    height,
    tilt,
    shadowScale: 1 - normalizedHeight * 0.48,
    shadowOpacity: 0.34 * (1 - normalizedHeight * 0.68),
  };
}

export async function createKayKitEnemyVisual(
  THREE: any,
  enemy: Enemy,
): Promise<KayKitEnemyVisual | null> {
  const visual = await createReliableEnemyVisual(THREE, enemy);
  if (visual) {
    visual.root.userData.enemyVisualIdentity = {
      enemyType: enemy.enemyType,
      requestedRole: requestedVisualRole(enemy),
      imported: visual.imported,
      modelRole: visual.role,
    };
    visualState(visual);
  }
  return visual;
}

export function updateKayKitEnemyVisual(
  visual: KayKitEnemyVisual,
  enemy: Enemy,
  delta: number,
  now = Date.now(),
) {
  updateBaseKayKitEnemyVisual(visual, enemy, delta, now);

  if (enemy.enemyType !== 'boss' || roomFromEnemyId(enemy) !== 20 || enemy.isDead || enemy.state === 'dead') return;

  const state = visualState(visual);
  const flight = room20BossFlightPose(enemy, now);
  visual.scene.position.y = state.baseSceneY + flight.height;
  visual.scene.rotation.x = state.baseSceneRotationX + flight.tilt;

  if (state.shadow) {
    state.shadow.scale.setScalar(flight.shadowScale);
    state.shadow.material.opacity = flight.active ? flight.shadowOpacity : state.shadowBaseOpacity;
  }

  const safetyShell = visual.root.parent?.getObjectByName?.(`EnemyVisibilitySafety_${enemy.id}`);
  if (safetyShell) safetyShell.visible = !flight.active;
}
