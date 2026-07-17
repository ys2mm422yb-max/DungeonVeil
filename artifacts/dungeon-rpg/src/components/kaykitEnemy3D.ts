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
const IMPORTED_VISUAL_RETRY_MS = 180;
const IMPORTED_VISUAL_MAX_WAIT_MS = 20_000;
const ENEMY_PRELOAD_MAX_BLOCK_MS = 3_500;
const flightVisuals = new WeakMap<object, FlightVisualState>();
let enemyPreloadPromise: Promise<void> | null = null;
let enemyPreloadStartedAt = 0;
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

function disposeTemporaryVisual(visual: KayKitEnemyVisual | null) {
  if (!visual) return;
  visual.mixer?.stopAllAction?.();
  visual.root?.traverse?.((node: any) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

function requestedVisualRole(enemy: Enemy) {
  return enemyVisualProfile(roomFromEnemyId(enemy), enemy.enemyType, spawnIndexFromEnemyId(enemy)).role;
}

function importedEnemyType(type: Enemy['enemyType']): type is (typeof IMPORTED_ENEMY_TYPES)[number] {
  return IMPORTED_ENEMY_TYPES.includes(type as (typeof IMPORTED_ENEMY_TYPES)[number]);
}

async function createReliableEnemyVisual(THREE: any, enemy: Enemy): Promise<KayKitEnemyVisual | null> {
  let visual = await createBaseKayKitEnemyVisual(THREE, enemy);
  if (!visual || !importedEnemyType(enemy.enemyType) || visual.imported) return visual;

  // The first request starts the cached GLB load. Do not return the temporary
  // humanoid fallback while that real creature model is still loading.
  const deadline = Date.now() + IMPORTED_VISUAL_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await wait(IMPORTED_VISUAL_RETRY_MS);
    const retry = await createBaseKayKitEnemyVisual(THREE, enemy);
    if (retry) {
      if (visual && visual !== retry && !visual.imported) disposeTemporaryVisual(visual);
      visual = retry;
    }
    if (visual?.imported) return visual;
  }

  disposeTemporaryVisual(visual);
  console.warn(`Exact creature model still unavailable: ${enemy.enemyType}; retrying before room reveal`);
  return null;
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

async function preloadRealCreatureModels() {
  try {
    const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
    const results = await Promise.all(IMPORTED_ENEMY_TYPES.map((type, index) =>
      createReliableEnemyVisual(THREE, preloadEnemy(type, index))
    ));
    results.forEach((visual, index) => {
      if (!visual?.imported) console.warn(`Real creature preload unavailable: ${IMPORTED_ENEMY_TYPES[index]}`);
    });
  } catch (error) {
    console.warn('Real creature preload failed', error);
  }
}

function startEnemyPreload() {
  if (!enemyPreloadPromise) {
    enemyPreloadStartedAt = Date.now();
    enemyPreloadPromise = (async () => {
      await preloadBaseKayKitEnemyVisuals();
      await preloadRealCreatureModels();
    })().catch(error => {
      console.warn('Enemy preload failed; runtime loading remains available', error);
    });
  }
  return enemyPreloadPromise;
}

export async function preloadKayKitEnemyVisuals() {
  const preload = startEnemyPreload();
  const remaining = Math.max(0, ENEMY_PRELOAD_MAX_BLOCK_MS - (Date.now() - enemyPreloadStartedAt));
  if (remaining <= 0) return;
  await Promise.race([preload, wait(remaining)]);
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
