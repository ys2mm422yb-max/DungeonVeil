import type { Enemy } from '../game/entities';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { loadKayKitBossWeapon } from './kaykitWeapons3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type EnemyRole = 'mage' | 'rogue' | 'warrior' | 'minion';
type EnemyPrototype = { scene: any; clips: any[]; role: EnemyRole };
type EnemyLibrary = {
  prototypes: EnemyPrototype[];
  weapons: Partial<Record<'axe' | 'blade' | 'staff' | 'shieldSmall' | 'shieldLarge', any>>;
  bossWeapon: any | null;
};

export type KayKitEnemyVisual = {
  root: any; scene: any; mixer: any; idle: any; move: any; attack: any; death: any;
  lastState: string; lastAttackTime: number; lastHitTime: number; attackRemaining: number; deathPlayed: boolean; deathElapsed: number;
  baseScale: number; hitElapsed: number; statusRoot: any; burnGlows: any[]; frostGlows: any[]; frostHalo: any; bossAura: any; bossCore: any;
};

let libraryPromise: Promise<EnemyLibrary> | null = null;

function clipName(clip: any) { return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_'); }
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
function hashId(id: string) { let hash = 2166136261; for (let i = 0; i < id.length; i++) { hash ^= id.charCodeAt(i); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function roleFromPath(path: string): EnemyRole { const key = path.toLowerCase(); if (key.includes('mage')) return 'mage'; if (key.includes('rogue')) return 'rogue'; if (key.includes('warrior')) return 'warrior'; return 'minion'; }
function findBone(root: any, names: string[]) {
  let result: any = null;
  root.traverse((node: any) => {
    if (result) return;
    const key = String(node.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (names.some(name => key.includes(name))) result = node;
  });
  return result;
}
function keepGeometry(geometry: any) {
  if (!geometry || geometry.userData?.kayKitPersistent) return;
  geometry.userData = { ...(geometry.userData ?? {}), kayKitPersistent: true };
  geometry.dispose = () => undefined;
}
function prepareModel(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    keepGeometry(node.geometry);
    if (node.material) node.material = Array.isArray(node.material) ? node.material.map((m: any) => m.clone()) : node.material.clone();
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = true;
  });
}
function attachEquipment(parent: any, object: any, position: [number, number, number], rotation: [number, number, number], scale = 1) {
  if (!parent || !object) return;
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.setScalar(scale);
  prepareModel(object);
  parent.add(object);
}

async function loadLibrary() {
  if (!libraryPromise) libraryPromise = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const loader = new GLTFLoader();
    const skeletonModels = findKayKitModels(manifest, 'skeletons', /\/characters\/gltf\/.*\.glb$/i);
    const animationModels = [
      ...findKayKitModels(manifest, 'animations', /rig_medium_general\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_movementbasic\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_combatmelee\.glb$/i),
    ];
    const skeletonAssets = findKayKitModels(manifest, 'skeletons', /\/assets\/gltf\/.*\.(?:gltf|glb)$/i);
    const findAsset = (pattern: RegExp) => skeletonAssets.find(path => pattern.test(path)) ?? null;
    const weaponPaths = {
      axe: findAsset(/skeleton_axe\.(?:gltf|glb)$/i),
      blade: findAsset(/skeleton_blade\.(?:gltf|glb)$/i),
      staff: findAsset(/skeleton_staff\.(?:gltf|glb)$/i),
      shieldSmall: findAsset(/skeleton_shield_small_a\.(?:gltf|glb)$/i),
      shieldLarge: findAsset(/skeleton_shield_large_a\.(?:gltf|glb)$/i),
    } as const;
    const animationGlb = await Promise.all(animationModels.map(path => loader.loadAsync(modelUrl(manifest, path))));
    const sharedClips = animationGlb.flatMap(gltf => gltf.animations ?? []);
    const characters = await Promise.all(skeletonModels.map(path => loader.loadAsync(modelUrl(manifest, path))));
    const weaponEntries = await Promise.all(Object.entries(weaponPaths).map(async ([key, path]) => {
      if (!path) return [key, null] as const;
      const gltf = await loader.loadAsync(modelUrl(manifest, path));
      return [key, gltf.scene] as const;
    }));
    const bossWeapon = await loadKayKitBossWeapon();
    return {
      prototypes: characters.map((gltf, index) => ({ scene: gltf.scene, clips: [...(gltf.animations ?? []), ...sharedClips], role: roleFromPath(skeletonModels[index]) })),
      weapons: Object.fromEntries(weaponEntries.filter(([, scene]) => Boolean(scene))) as EnemyLibrary['weapons'],
      bossWeapon,
    };
  })();
  return libraryPromise;
}

export function preloadKayKitEnemyVisuals() { return loadLibrary().then(() => undefined); }

function buildStatusGlows(THREE: any, color: number, count: number, yBase: number) {
  const glows: any[] = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), material);
    mesh.position.set(Math.sin(i * 2.3) * 0.32, yBase + (i % 3) * 0.26, Math.cos(i * 1.7) * 0.25);
    glows.push(mesh);
  }
  return glows;
}

export async function createKayKitEnemyVisual(THREE: any, enemy: Enemy): Promise<KayKitEnemyVisual | null> {
  const [library, skeletonUtils] = await Promise.all([loadLibrary(), import(/* @vite-ignore */ SKELETON_UTILS_URL) as any]);
  if (!library.prototypes.length) return null;
  const prototype = enemy.enemyType === 'boss'
    ? library.prototypes.find(entry => entry.role === 'warrior') ?? library.prototypes[0]
    : library.prototypes[hashId(enemy.id) % library.prototypes.length];
  const scene = skeletonUtils.clone(prototype.scene);
  const root = new THREE.Group();
  root.name = `KayKitEnemy_${enemy.id}`;
  root.add(scene);
  prepareModel(scene);

  const rightHand = findBone(scene, ['righthand', 'handr', 'handright']);
  const leftHand = findBone(scene, ['lefthand', 'handl', 'handleft']);
  const cloneWeapon = (name: keyof EnemyLibrary['weapons']) => {
    const source = library.weapons[name];
    return source ? source.clone(true) : null;
  };

  if (prototype.role === 'mage') {
    attachEquipment(rightHand, cloneWeapon('staff'), [0, 0.03, 0], [Math.PI / 2, 0, Math.PI / 2], 0.92);
  } else if (prototype.role === 'rogue') {
    attachEquipment(rightHand, cloneWeapon('blade'), [0.01, 0.01, 0], [Math.PI / 2, 0, Math.PI / 2], 0.86);
  } else if (prototype.role === 'warrior') {
    const weapon = enemy.enemyType === 'boss' && library.bossWeapon ? library.bossWeapon.clone(true) : cloneWeapon('axe');
    attachEquipment(rightHand, weapon, [0.01, 0.02, 0], [Math.PI / 2, 0, Math.PI / 2], enemy.enemyType === 'boss' ? 1.18 : 0.92);
    attachEquipment(leftHand, cloneWeapon(enemy.enemyType === 'boss' ? 'shieldLarge' : 'shieldSmall'), [0, 0.02, 0], [Math.PI / 2, 0, -Math.PI / 2], enemy.enemyType === 'boss' ? 1.12 : 0.9);
  } else {
    attachEquipment(rightHand, cloneWeapon('blade'), [0.01, 0.01, 0], [Math.PI / 2, 0, Math.PI / 2], 0.82);
  }

  const idleClip = chooseClip(prototype.clips, [['idle', 'a'], ['idle']], ['crouch', 'sit']);
  const normalMoveClip = chooseClip(prototype.clips, [['run'], ['walk']], ['back', 'left', 'right', 'crouch']);
  const bossMoveClip = chooseClip(prototype.clips, [['walk', 'forward'], ['walk']], ['back', 'left', 'right', 'crouch']) ?? normalMoveClip;
  const moveClip = enemy.enemyType === 'boss' ? bossMoveClip : normalMoveClip;
  const attackClip = chooseClip(prototype.clips, [['attack', 'a'], ['melee', 'attack'], ['attack']], ['bow', 'crossbow', 'ranged']);
  const deathClip = chooseClip(prototype.clips, [['death', 'a'], ['death', 'b'], ['death']], []);
  const mixer = new THREE.AnimationMixer(scene);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const move = moveClip ? mixer.clipAction(moveClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  const death = deathClip ? mixer.clipAction(deathClip) : null;
  idle?.reset().play();
  if (move) move.timeScale = enemy.enemyType === 'boss' ? 0.92 : 1.06;
  if (attack) {
    attack.setLoop(THREE.LoopOnce, 1);
    attack.clampWhenFinished = false;
    attack.timeScale = enemy.enemyType === 'boss' ? 0.98 : 1.12;
  }
  if (death && deathClip) {
    death.setLoop(THREE.LoopOnce, 1);
    death.clampWhenFinished = true;
    const phaseSeconds = enemy.enemyType === 'boss' ? 1.65 : 0.92;
    const clipWindow = enemy.enemyType === 'boss' ? 0.76 : 0.68;
    death.timeScale = Math.max(0.35, deathClip.duration / (phaseSeconds * clipWindow));
  }

  const roleScale = prototype.role === 'warrior' ? 1.06 : prototype.role === 'mage' ? 1.02 : prototype.role === 'rogue' ? 0.98 : 0.94;
  const baseScale = (enemy.enemyType === 'boss' ? 1.56 : 0.96) * roleScale;
  root.scale.setScalar(baseScale);

  const statusRoot = new THREE.Group();
  statusRoot.name = `EnemyStatus_${enemy.id}`;
  root.add(statusRoot);
  const burnGlows = buildStatusGlows(THREE, 0xff642c, IS_MOBILE ? 4 : 7, 0.22);
  const frostGlows = buildStatusGlows(THREE, 0x8deaff, IS_MOBILE ? 5 : 8, 0.14);
  [...burnGlows, ...frostGlows].forEach(mesh => statusRoot.add(mesh));

  const frostHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0x8deaff, transparent: true, opacity: 0, depthWrite: false }),
  );
  frostHalo.rotation.x = Math.PI / 2;
  frostHalo.position.y = 0.035;
  statusRoot.add(frostHalo);

  const bossAura = new THREE.Group();
  bossAura.visible = enemy.enemyType === 'boss';
  const bossRingOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.055, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0x8f4864, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  bossRingOuter.rotation.x = Math.PI / 2;
  bossRingOuter.userData.bossRing = 'outer';
  bossAura.add(bossRingOuter);
  const bossRingInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.035, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x765bd3, transparent: true, opacity: 0.36, depthWrite: false }),
  );
  bossRingInner.rotation.x = Math.PI / 2;
  bossRingInner.userData.bossRing = 'inner';
  bossAura.add(bossRingInner);
  const bossCore = new THREE.PointLight(0x8d3e65, IS_MOBILE ? 2.1 : 3.2, 5.5, 2);
  bossCore.position.y = 0.75;
  bossAura.add(bossCore);
  statusRoot.add(bossAura);

  return {
    root, scene, mixer, idle, move, attack, death,
    lastState: 'idle', lastAttackTime: enemy.lastAttackTime, lastHitTime: enemy.lastHitTime ?? 0,
    attackRemaining: 0, deathPlayed: false, deathElapsed: 0, baseScale, hitElapsed: 0,
    statusRoot, burnGlows, frostGlows, frostHalo, bossAura, bossCore,
  };
}

function transition(visual: KayKitEnemyVisual, next: any, fade = 0.1) {
  if (!next) return;
  const actions = [visual.idle, visual.move, visual.attack, visual.death].filter(Boolean);
  for (const action of actions) if (action !== next && action.isRunning?.()) action.fadeOut(fade);
  next.reset().fadeIn(fade).play();
}

function setMeshTint(root: any, color: number | null, intensity: number) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach((material: any) => {
      if (!material?.emissive) return;
      if (!material.userData?.kayKitBaseEmissive) {
        material.userData = {
          ...(material.userData ?? {}),
          kayKitBaseEmissive: { color: material.emissive.getHex(), intensity: material.emissiveIntensity ?? 1 },
        };
      }
      const base = material.userData.kayKitBaseEmissive;
      if (color === null) {
        material.emissive.setHex(base.color);
        material.emissiveIntensity = base.intensity;
      } else {
        material.emissive.setHex(color);
        material.emissiveIntensity = Math.max(base.intensity, intensity);
      }
    });
  });
}

export function updateKayKitEnemyVisual(visual: KayKitEnemyVisual, enemy: Enemy, delta: number, now = Date.now()) {
  const burning = !!enemy.burnUntil && now < enemy.burnUntil;
  const frozen = !!enemy.frostUntil && now < enemy.frostUntil;

  visual.burnGlows.forEach((glow, index) => {
    glow.material.opacity = burning ? 0.45 + Math.sin(now * 0.012 + index) * 0.28 : 0;
    glow.position.y += burning ? delta * (0.16 + index * 0.018) : 0;
    if (glow.position.y > 1.7) glow.position.y = 0.2;
  });
  visual.frostGlows.forEach((glow, index) => {
    glow.material.opacity = frozen ? 0.58 + Math.sin(now * 0.01 + index * 1.6) * 0.24 : 0;
    glow.position.y = 0.12 + (index % 4) * 0.32 + Math.sin(now * 0.004 + index) * 0.05;
    glow.position.x = Math.sin(now * 0.002 + index * 2.2) * 0.36;
    glow.position.z = Math.cos(now * 0.0024 + index * 1.7) * 0.3;
  });
  visual.frostHalo.material.opacity = frozen ? 0.36 + Math.sin(now * 0.008) * 0.12 : 0;
  visual.frostHalo.scale.setScalar(frozen ? 0.96 + Math.sin(now * 0.005) * 0.07 : 1);

  if (enemy.enemyType === 'boss') {
    visual.bossAura.rotation.y += delta * 0.5;
    visual.bossAura.traverse((node: any) => {
      if (node.userData?.bossRing === 'outer') {
        node.rotation.z = now * 0.0007;
        node.material.opacity = 0.34 + Math.sin(now * 0.004) * 0.09;
      } else if (node.userData?.bossRing === 'inner') {
        node.rotation.z = -now * 0.00105;
        node.material.opacity = 0.28 + Math.sin(now * 0.006 + 1.2) * 0.08;
      }
    });
    visual.bossCore.intensity = (IS_MOBILE ? 1.9 : 2.9) + Math.sin(now * 0.007) * 0.55;
  }

  // Boss-Materialien bleiben lesbar. Feuer/Frost werden über Partikel und Halos gezeigt,
  // nicht mehr über eine permanente Ganzkörper-Tönung.
  if (enemy.enemyType === 'boss') setMeshTint(visual.scene, null, 0);
  else if (burning) setMeshTint(visual.scene, 0xff2d00, 0.2);
  else if (frozen) setMeshTint(visual.scene, 0x46bfff, 0.07);
  else setMeshTint(visual.scene, null, 0);

  if ((enemy.lastHitTime ?? 0) > visual.lastHitTime) {
    visual.lastHitTime = enemy.lastHitTime ?? 0;
    visual.hitElapsed = enemy.enemyType === 'boss' ? 0.08 : 0.16;
  }

  if (enemy.isDead || enemy.state === 'dead') {
    if (!visual.deathPlayed) {
      visual.deathPlayed = true;
      visual.deathElapsed = 0;
      visual.hitElapsed = 0;
      visual.attackRemaining = 0;
      visual.scene.position.set(0, 0, 0);
      visual.scene.rotation.z = 0;
      visual.root.position.y = 0;
      visual.root.rotation.z = 0;
      if (visual.death) transition(visual, visual.death, 0.04);
      else visual.mixer.stopAllAction();
    }
    visual.deathElapsed += delta;
    const duration = Math.max(0.5, (enemy.deathDuration ?? 920) / 1000);
    const p = Math.min(1, visual.deathElapsed / duration);
    const hasClip = Boolean(visual.death);
    if (!hasClip) {
      const recoil = Math.min(1, p / 0.18);
      const fall = Math.max(0, (p - 0.14) / 0.58);
      visual.root.rotation.z = fall * (enemy.enemyType === 'boss' ? 0.8 : 1.42);
      visual.root.position.y = Math.sin(recoil * Math.PI) * 0.2 - fall * 0.18;
    } else {
      visual.root.position.y = -Math.max(0, p - 0.72) * 0.18;
    }
    const fadeStart = enemy.enemyType === 'boss' ? 0.78 : 0.7;
    const opacity = p <= fadeStart ? 1 : Math.max(0, 1 - (p - fadeStart) / (1 - fadeStart));
    visual.root.traverse((node: any) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m: any) => { if (!m) return; m.transparent = true; m.opacity = opacity; });
    });
    visual.mixer.update(delta);
    return;
  }

  if (visual.hitElapsed > 0) {
    const hitDuration = enemy.enemyType === 'boss' ? 0.08 : 0.16;
    visual.hitElapsed = Math.max(0, visual.hitElapsed - delta);
    const pulse = Math.sin((visual.hitElapsed / hitDuration) * Math.PI);
    const fromX = enemy.hitFromX ?? enemy.x;
    const fromY = enemy.hitFromY ?? enemy.y;
    const dx = enemy.x - fromX;
    const dy = enemy.y - fromY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const strength = enemy.enemyType === 'boss' ? 0.012 : 0.13;
    visual.scene.position.x = dx / len * pulse * strength;
    visual.scene.position.z = dy / len * pulse * strength;
    visual.scene.rotation.z = -pulse * (enemy.enemyType === 'boss' ? 0.008 : 0.09);
  } else {
    visual.scene.position.x *= 0.6;
    visual.scene.position.z *= 0.6;
    visual.scene.rotation.z *= 0.6;
  }

  if (enemy.lastAttackTime > visual.lastAttackTime) {
    visual.lastAttackTime = enemy.lastAttackTime;
    const duration = visual.attack?.getClip?.()?.duration ?? 0.5;
    visual.attackRemaining = Math.max(0.22, duration / (enemy.enemyType === 'boss' ? 0.98 : 1.12));
    transition(visual, visual.attack, 0.045);
    visual.lastState = 'attack';
  }
  if (visual.attackRemaining > 0) {
    visual.attackRemaining = Math.max(0, visual.attackRemaining - delta);
    if (visual.attackRemaining === 0) {
      const next = enemy.state === 'chase' ? visual.move : visual.idle;
      transition(visual, next, 0.08);
      visual.lastState = enemy.state === 'chase' ? 'chase' : 'idle';
    }
  } else {
    const desiredState = enemy.state === 'chase' ? 'chase' : 'idle';
    if (desiredState !== visual.lastState) {
      transition(visual, desiredState === 'chase' ? visual.move : visual.idle, 0.1);
      visual.lastState = desiredState;
    }
  }

  if (visual.move) {
    const baseMoveSpeed = enemy.enemyType === 'boss' ? 0.92 : 1.06;
    visual.move.timeScale = frozen
      ? Math.max(enemy.enemyType === 'boss' ? 0.48 : 0.5, baseMoveSpeed * (1 - (enemy.frostSlow ?? 0)))
      : baseMoveSpeed;
  }
  visual.mixer.update(delta);
}
