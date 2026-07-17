import type { Enemy } from '../game/entities';
import { bossAttackContract } from '../game/bossAttackTelegraphs';
import {
  createKayKitEnemyVisual as createBaseKayKitEnemyVisual,
  preloadKayKitEnemyVisuals,
  updateKayKitEnemyVisual as updateBaseKayKitEnemyVisual,
  type KayKitEnemyVisual as BaseKayKitEnemyVisual,
} from './kaykitEnemyBase3D';

export { preloadKayKitEnemyVisuals };
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

const flightVisuals = new WeakMap<object, FlightVisualState>();
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
  const visual = await createBaseKayKitEnemyVisual(THREE, enemy);
  if (visual) visualState(visual);
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
