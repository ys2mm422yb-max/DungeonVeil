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

type ImportedPrototype = {
  scene: any;
  clips: any[];
  targetHeight: number;
  widthWeight: number;
  rotationY: number;
};

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';
const IMPORTED_ENEMY_TYPES = ['slime', 'goblin', 'spider', 'vampire', 'demon'] as const satisfies readonly Enemy['enemyType'][];
const IMPORTED_ENEMY_CONFIG: Record<(typeof IMPORTED_ENEMY_TYPES)[number], {
  path: string;
  targetHeight: number;
  widthWeight: number;
  rotationY?: number;
}> = {
  slime: { path: 'assets/imported/enemies/Slime.glb', targetHeight: 1.22, widthWeight: 0.55 },
  goblin: { path: 'assets/imported/enemies/Rat.glb', targetHeight: 1.08, widthWeight: 0.52 },
  spider: { path: 'assets/imported/enemies/Spider.glb', targetHeight: 1.16, widthWeight: 0.74 },
  vampire: { path: 'assets/imported/enemies/Bat.glb', targetHeight: 1.22, widthWeight: 0.48 },
  demon: { path: 'assets/imported/enemies/Snake_angry.glb', targetHeight: 1.12, widthWeight: 0.62 },
};
const ENEMY_ASSET_FETCH_ATTEMPTS = 4;
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const flightVisuals = new WeakMap<object, FlightVisualState>();
const enemyPreloadPromises = new Map<string, Promise<void>>();
const importedPrototypePromises = new Map<(typeof IMPORTED_ENEMY_TYPES)[number], Promise<ImportedPrototype>>();
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
  const path = IMPORTED_ENEMY_CONFIG[type].path;
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

function clipName(clip: any) {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function chooseClip(clips: any[], groups: string[][], rejects: string[] = []) {
  for (const terms of groups) {
    const match = clips.find(clip => {
      const name = clipName(clip);
      return terms.every(term => name.includes(term)) && rejects.every(term => !name.includes(term));
    });
    if (match) return match;
  }
  return null;
}

function keepGeometry(geometry: any) {
  if (!geometry || geometry.userData?.kayKitPersistent) return;
  geometry.userData = { ...(geometry.userData ?? {}), kayKitPersistent: true };
  geometry.dispose = () => undefined;
}

function prepareImportedModel(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    keepGeometry(node.geometry);
    if (node.material) {
      node.material = Array.isArray(node.material)
        ? node.material.map((material: any) => material.clone())
        : node.material.clone();
    }
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = false;
  });
}

function centerSceneOnRoot(THREE: any, scene: any) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) return;
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y -= box.min.y;
  scene.updateMatrixWorld(true);
}

function importedScale(THREE: any, scene: any, targetHeight: number, widthWeight: number) {
  scene.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  const visualReference = Math.max(size.y, size.x * widthWeight, size.z * widthWeight, 0.001);
  return targetHeight / visualReference;
}

function buildStatusGlows(THREE: any, color: number, count: number, yBase: number) {
  const glows: any[] = [];
  for (let index = 0; index < count; index++) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), material);
    mesh.position.set(Math.sin(index * 2.3) * 0.32, yBase + (index % 3) * 0.26, Math.cos(index * 1.7) * 0.25);
    glows.push(mesh);
  }
  return glows;
}

async function loadImportedPrototype(type: (typeof IMPORTED_ENEMY_TYPES)[number]) {
  const cached = importedPrototypePromises.get(type);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const config = IMPORTED_ENEMY_CONFIG[type];
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const gltf = await new GLTFLoader().loadAsync(enemyAssetUrl(type));
      if (!gltf?.scene) throw new Error(`GLB has no scene: ${type}`);
      return {
        scene: gltf.scene,
        clips: gltf.animations ?? [],
        targetHeight: config.targetHeight,
        widthWeight: config.widthWeight,
        rotationY: config.rotationY ?? 0,
      };
    } catch (error) {
      importedPrototypePromises.delete(type);
      throw error;
    }
  })();
  importedPrototypePromises.set(type, promise);
  return promise;
}

async function createDedicatedImportedVisual(
  THREE: any,
  enemy: Enemy & { enemyType: (typeof IMPORTED_ENEMY_TYPES)[number] },
): Promise<KayKitEnemyVisual> {
  const [prototype, skeletonUtils] = await Promise.all([
    loadImportedPrototype(enemy.enemyType),
    import(/* @vite-ignore */ SKELETON_UTILS_URL) as any,
  ]);
  const scene = skeletonUtils.clone(prototype.scene);
  const root = new THREE.Group();
  root.name = `KayKitEnemy_${enemy.id}_${enemy.enemyType}`;
  scene.rotation.y = prototype.rotationY;
  prepareImportedModel(scene);
  centerSceneOnRoot(THREE, scene);
  root.add(scene);

  const shadowRadius = enemy.enemyType === 'spider' ? 0.68 : enemy.enemyType === 'vampire' ? 0.52 : 0.48;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(shadowRadius, IS_MOBILE ? 18 : 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const idleClip = chooseClip(prototype.clips, [['idle', 'a'], ['idle'], ['stand']], ['crouch', 'sit']);
  const moveClip = chooseClip(prototype.clips, [['run'], ['walk'], ['fly'], ['crawl'], ['move']], ['back', 'left', 'right', 'crouch']);
  const attackClip = chooseClip(prototype.clips, [['attack', 'a'], ['attack'], ['bite'], ['sting']], ['bow', 'crossbow', 'ranged']);
  const deathClip = chooseClip(prototype.clips, [['death', 'a'], ['death', 'b'], ['death'], ['die']], []);
  const mixer = new THREE.AnimationMixer(scene);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const move = moveClip ? mixer.clipAction(moveClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  const death = deathClip ? mixer.clipAction(deathClip) : null;
  const movePlaybackBase = 1.18;
  const attackDuration = 0.34;

  idle?.reset().play();
  if (move) move.timeScale = movePlaybackBase;
  if (attack) {
    attack.setLoop(THREE.LoopOnce, 1);
    attack.clampWhenFinished = false;
    const clipDuration = Math.max(0.12, attackClip?.duration ?? 0.5);
    attack.timeScale = Math.min(3.1, Math.max(0.85, clipDuration / attackDuration));
  }
  if (death && deathClip) {
    death.setLoop(THREE.LoopOnce, 1);
    death.clampWhenFinished = true;
    death.timeScale = Math.max(0.35, deathClip.duration / (0.68 * 0.68));
  }

  const baseScale = importedScale(THREE, scene, prototype.targetHeight, prototype.widthWeight)
    * (enemy.isElite ? 1.16 : 1);
  root.scale.setScalar(baseScale);

  const statusRoot = new THREE.Group();
  root.add(statusRoot);
  const burnGlows = buildStatusGlows(THREE, 0xff642c, IS_MOBILE ? 2 : 8, 0.22);
  const frostGlows = buildStatusGlows(THREE, 0x8deaff, IS_MOBILE ? 2 : 8, 0.14);
  [...burnGlows, ...frostGlows].forEach(mesh => {
    mesh.visible = false;
    statusRoot.add(mesh);
  });

  const burnHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.045, 6, IS_MOBILE ? 20 : 30),
    new THREE.MeshBasicMaterial({ color: 0xff642c, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
  );
  burnHalo.rotation.x = Math.PI / 2;
  burnHalo.position.y = 0.1;
  burnHalo.visible = false;
  statusRoot.add(burnHalo);

  const frostHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 6, IS_MOBILE ? 20 : 28),
    new THREE.MeshBasicMaterial({ color: 0x8deaff, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
  );
  frostHalo.rotation.x = Math.PI / 2;
  frostHalo.position.y = 0.08;
  frostHalo.visible = false;
  statusRoot.add(frostHalo);

  const bossAura = new THREE.Group();
  bossAura.visible = Boolean(enemy.isElite);
  const auraOuter = 0xe7b84f;
  const auraInner = 0xffdd7d;
  const bossRingOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.055, 7, IS_MOBILE ? 24 : 36),
    new THREE.MeshBasicMaterial({ color: auraOuter, transparent: true, opacity: 0.32, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
  );
  bossRingOuter.rotation.x = Math.PI / 2;
  bossRingOuter.position.y = 0.07;
  bossRingOuter.userData.bossRing = 'outer';
  bossAura.add(bossRingOuter);
  const bossRingInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.035, 7, IS_MOBILE ? 22 : 32),
    new THREE.MeshBasicMaterial({ color: auraInner, transparent: true, opacity: 0.26, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
  );
  bossRingInner.rotation.x = Math.PI / 2;
  bossRingInner.position.y = 0.09;
  bossRingInner.userData.bossRing = 'inner';
  bossRingInner.visible = !IS_MOBILE;
  bossAura.add(bossRingInner);
  const bossCore = IS_MOBILE ? new THREE.Object3D() : new THREE.PointLight(auraOuter, 1.8, 5.5, 2);
  bossCore.intensity = IS_MOBILE ? 0 : bossCore.intensity;
  bossCore.position.y = 0.75;
  bossAura.add(bossCore);
  statusRoot.add(bossAura);

  return {
    root,
    scene,
    mixer,
    idle,
    move,
    attack,
    death,
    lastState: 'idle',
    lastAttackTime: enemy.lastAttackTime,
    lastHitTime: enemy.lastHitTime ?? 0,
    attackRemaining: 0,
    deathPlayed: false,
    deathElapsed: 0,
    baseScale,
    hitElapsed: 0,
    statusRoot,
    burnGlows,
    burnHalo,
    frostGlows,
    frostHalo,
    bossAura,
    bossCore,
    imported: true,
    role: 'minion',
    movePlaybackBase,
    attackDuration,
    tintMode: 'normal',
  };
}

async function createReliableEnemyVisual(THREE: any, enemy: Enemy): Promise<KayKitEnemyVisual | null> {
  if (importedEnemyType(enemy.enemyType)) {
    const visual = await createDedicatedImportedVisual(
      THREE,
      enemy as Enemy & { enemyType: (typeof IMPORTED_ENEMY_TYPES)[number] },
    );
    if (!visual.imported) throw new Error(`Dedicated enemy model did not become ready: ${enemy.enemyType}`);
    return visual;
  }
  return createBaseKayKitEnemyVisual(THREE, enemy);
}

async function preloadRealCreatureModels(types: readonly (typeof IMPORTED_ENEMY_TYPES)[number][]) {
  if (!types.length) return;
  await Promise.all(types.map(preloadLocalEnemyAsset));
  await Promise.all(types.map(loadImportedPrototype));
}

async function loadEnemyAssetsWithRetries(
  enemyTypes: readonly Enemy['enemyType'][],
  importedTypes: readonly (typeof IMPORTED_ENEMY_TYPES)[number][],
) {
  const needsBaseLibrary = enemyTypes.length === 0 || enemyTypes.some(type => !importedEnemyType(type));
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await Promise.all([
        needsBaseLibrary ? preloadBaseKayKitEnemyVisuals() : Promise.resolve(),
        preloadRealCreatureModels(importedTypes),
      ]);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Enemy preload attempt ${attempt} failed for ${enemyTypes.join(', ') || 'base library'}`, error);
      if (attempt < 3) await wait(attempt * 500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Enemy preload failed');
}

function startEnemyPreload(enemyTypes: readonly Enemy['enemyType'][]) {
  const requestedTypes = [...new Set(enemyTypes)].sort();
  const importedTypes = requestedImportedTypes(requestedTypes);
  const key = requestedTypes.join('|') || 'base';
  const cached = enemyPreloadPromises.get(key);
  if (cached) return cached;

  const preload = loadEnemyAssetsWithRetries(requestedTypes, importedTypes).catch(error => {
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
