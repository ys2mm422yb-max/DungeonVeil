import type { Enemy, EnemyType } from '../game/entities';
import { bossAttackContract } from '../game/bossAttackTelegraphs';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { loadKayKitBossWeapon, loadKayKitEnemyBow, loadKayKitFinalBossFocus } from './kaykitWeapons3D';
import { enemyVisualProfile } from '../game/enemyRegionalIdentity';
import { attachBowToRanger, type BowRig } from './bowRig';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

const IMPORTED_CREATURES: Partial<Record<EnemyType, { path: string; targetHeight: number; widthWeight: number; rotationY?: number }>> = {
  slime: { path: '/assets/imported/enemies/Slime.glb', targetHeight: 1.22, widthWeight: 0.55 },
  goblin: { path: '/assets/imported/enemies/Rat.glb', targetHeight: 1.08, widthWeight: 0.52 },
  spider: { path: '/assets/imported/enemies/Spider.glb', targetHeight: 1.16, widthWeight: 0.74 },
  vampire: { path: '/assets/imported/enemies/Bat.glb', targetHeight: 1.22, widthWeight: 0.48 },
  demon: { path: '/assets/imported/enemies/Snake_angry.glb', targetHeight: 1.12, widthWeight: 0.62 },
};

type EnemyRole = 'mage' | 'rogue' | 'warrior' | 'minion' | 'ranger' | 'barbarian' | 'knight';
type TimedEnemy = Enemy & { attackResolveAt?: number };
type EnemyPrototype = {
  scene: any;
  clips: any[];
  role: EnemyRole;
  family: 'creature' | 'skeleton' | 'adventurer';
  modelKey: string;
  imported?: boolean;
  targetHeight?: number;
  widthWeight?: number;
  rotationY?: number;
};
type EnemyLibrary = {
  prototypes: EnemyPrototype[];
  weapons: Partial<Record<'axe' | 'blade' | 'staff' | 'shieldSmall' | 'shieldLarge', any>>;
  rangerBow: any | null;
  bossWeapon: any | null;
  finalBossFocus: any | null;
};

export type KayKitEnemyVisual = {
  root: any;
  scene: any;
  mixer: any;
  idle: any;
  move: any;
  attack: any;
  death: any;
  lastState: string;
  lastAttackTime: number;
  lastHitTime: number;
  attackRemaining: number;
  deathPlayed: boolean;
  deathElapsed: number;
  baseScale: number;
  hitElapsed: number;
  statusRoot: any;
  burnGlows: any[];
  burnHalo: any;
  frostGlows: any[];
  frostHalo: any;
  bossAura: any;
  bossCore: any;
  imported: boolean;
  role: EnemyRole;
  movePlaybackBase: number;
  attackDuration: number;
  tintMode: 'normal' | 'hit';
  release?: any;
  releaseRemaining?: number;
  releaseDuration?: number;
  attackResolveAt?: number;
  awaitingRelease?: boolean;
  attackClipDuration?: number;
  bowRig?: BowRig | null;
};

let libraryPromise: Promise<EnemyLibrary> | null = null;
const importedPromises = new Map<EnemyType, Promise<EnemyPrototype | null>>();

function importedCreatureUrl(path: string) {
  const normalized = path.replace(/^\/+/, '');
  if (typeof document === 'undefined') return `/${normalized}`;
  return new URL(normalized, document.baseURI).toString();
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

function chooseIdleClip(prototype: EnemyPrototype, role: EnemyRole) {
  if (role === 'ranger') {
    return chooseClip(prototype.clips, [['ranged', 'bow', 'aiming', 'idle'], ['ranged', 'bow', 'idle'], ['idle', 'a'], ['idle']], ['up']);
  }
  if (prototype.family === 'skeleton') {
    return chooseClip(prototype.clips, [['skeletons', 'idle'], ['idle', 'a'], ['idle']], ['inactive', 'pose']);
  }
  return chooseClip(prototype.clips, [['idle', 'a'], ['idle'], ['stand']], ['crouch', 'sit']);
}

function chooseMoveClip(prototype: EnemyPrototype, role: EnemyRole, boss: boolean) {
  if (role === 'ranger') {
    return chooseClip(prototype.clips, [['running', 'holding', 'bow'], ['running', 'a'], ['running'], ['walking', 'a'], ['walking']], ['back', 'left', 'right']);
  }
  if (role === 'rogue') {
    return chooseClip(prototype.clips, [['running', 'a'], ['running'], ['sneaking'], ['walking', 'a']], ['back', 'left', 'right']);
  }
  if (role === 'warrior' || role === 'barbarian' || role === 'knight' || boss) {
    return chooseClip(prototype.clips, [['walking', 'a'], ['walking'], ['running', 'a'], ['running']], ['back', 'left', 'right']);
  }
  if (prototype.family === 'skeleton') {
    return chooseClip(prototype.clips, [['skeletons', 'walking'], ['running', 'a'], ['walking', 'a'], ['running'], ['walking']], ['back', 'left', 'right']);
  }
  return chooseClip(prototype.clips, [['running', 'a'], ['run'], ['walking', 'a'], ['walk'], ['fly'], ['crawl'], ['move']], ['back', 'left', 'right', 'crouch']);
}

function chooseAttackClip(prototype: EnemyPrototype, role: EnemyRole, room: number, enemyType: EnemyType) {
  if (role === 'mage') {
    return chooseClip(
      prototype.clips,
      enemyType === 'boss' && room === 20
        ? [['ranged', 'magic', 'spellcasting', 'long'], ['ranged', 'magic', 'spellcasting'], ['ranged', 'magic', 'raise'], ['magic']]
        : [['ranged', 'magic', 'spellcasting'], ['ranged', 'magic', 'raise'], ['magic']],
      ['bow', 'crossbow'],
    );
  }
  if (role === 'ranger') {
    return chooseClip(prototype.clips, [['ranged', 'bow', 'draw']], ['up', 'crossbow']);
  }
  if (role === 'rogue') {
    return chooseClip(prototype.clips, [['melee', 'dualwield', 'attack', 'slice'], ['melee', 'dualwield', 'attack', 'stab'], ['melee', '1h', 'attack', 'slice', 'diagonal'], ['melee', '1h', 'attack', 'stab']], ['bow', 'ranged']);
  }
  if (role === 'barbarian') {
    return chooseClip(prototype.clips, [['melee', '2h', 'attack', 'chop'], ['melee', '2h', 'attack', 'slice'], ['melee', '2h', 'attack']], ['bow', 'ranged']);
  }
  if (role === 'warrior' || role === 'knight') {
    return chooseClip(prototype.clips, [['melee', '1h', 'attack', 'chop'], ['melee', 'block', 'attack'], ['melee', '1h', 'attack', 'slice']], ['bow', 'ranged']);
  }
  return chooseClip(prototype.clips, [['melee', '1h', 'attack', 'stab'], ['melee', 'unarmed', 'attack', 'punch', 'a'], ['attack', 'a'], ['attack'], ['bite'], ['sting']], ['bow', 'crossbow', 'ranged']);
}

function chooseReleaseClip(prototype: EnemyPrototype, role: EnemyRole, room: number) {
  if (role === 'ranger') return chooseClip(prototype.clips, [['ranged', 'bow', 'release']], ['up', 'crossbow']);
  if (role === 'mage') {
    return chooseClip(
      prototype.clips,
      room === 20
        ? [['ranged', 'magic', 'summon'], ['ranged', 'magic', 'shoot'], ['ranged', 'magic', 'raise']]
        : [['ranged', 'magic', 'shoot'], ['ranged', 'magic', 'summon'], ['ranged', 'magic', 'raise']],
      ['bow', 'crossbow'],
    );
  }
  return null;
}

function hashId(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function roomFromEnemyId(enemy: Enemy) {
  const parts = enemy.id.split('-');
  const room = Number(parts.at(-2));
  return Number.isFinite(room) ? room : 1;
}

function roleFromPath(path: string): EnemyRole {
  const key = path.toLowerCase();
  if (key.includes('mage') || key.includes('necromancer')) return 'mage';
  if (key.includes('rogue')) return 'rogue';
  if (key.includes('ranger')) return 'ranger';
  if (key.includes('barbarian')) return 'barbarian';
  if (key.includes('knight')) return 'knight';
  if (key.includes('warrior') || key.includes('golem')) return 'warrior';
  return 'minion';
}

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
    if (node.material) node.material = Array.isArray(node.material) ? node.material.map((material: any) => material.clone()) : node.material.clone();
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = false;
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

async function loadImportedPrototype(type: EnemyType): Promise<EnemyPrototype | null> {
  const config = IMPORTED_CREATURES[type];
  if (!config) return null;
  const cached = importedPromises.get(type);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const gltf = await new GLTFLoader().loadAsync(importedCreatureUrl(config.path));
      return {
        scene: gltf.scene,
        clips: gltf.animations ?? [],
        role: 'minion' as const,
        family: 'creature' as const,
        modelKey: type,
        imported: true,
        targetHeight: config.targetHeight,
        widthWeight: config.widthWeight,
        rotationY: config.rotationY ?? 0,
      };
    } catch (error) {
      console.warn(`Imported creature unavailable: ${type}`, error);
      return null;
    }
  })();
  importedPromises.set(type, promise);
  return promise;
}

async function importedWithinBudget(type: EnemyType, budgetMs = 180) {
  const load = loadImportedPrototype(type);
  return Promise.race([
    load,
    new Promise<null>(resolve => window.setTimeout(() => resolve(null), budgetMs)),
  ]);
}

async function loadLibrary() {
  if (!libraryPromise) libraryPromise = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const loader = new GLTFLoader();
    const skeletonModels = findKayKitModels(manifest, 'skeletons', /\/characters\/gltf\/.*\.glb$/i);
    const adventurerModels = findKayKitModels(manifest, 'adventurers', /\/characters\/gltf\/.*\.glb$/i);
    const animationModels = [
      ...findKayKitModels(manifest, 'animations', /rig_medium_general\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_movementbasic\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_movementadvanced\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_combatmelee\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_combatranged\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_special\.glb$/i),
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

    const [animationGlb, skeletonCharacters, adventurerCharacters, weaponEntries, rangerBow, bossWeapon, finalBossFocus] = await Promise.all([
      Promise.all(animationModels.map(path => loader.loadAsync(modelUrl(manifest, path)))),
      Promise.all(skeletonModels.map(path => loader.loadAsync(modelUrl(manifest, path)))),
      Promise.all(adventurerModels.map(path => loader.loadAsync(modelUrl(manifest, path)))),
      Promise.all(Object.entries(weaponPaths).map(async ([key, path]) => {
        if (!path) return [key, null] as const;
        const gltf = await loader.loadAsync(modelUrl(manifest, path));
        return [key, gltf.scene] as const;
      })),
      loadKayKitEnemyBow(),
      loadKayKitBossWeapon(),
      loadKayKitFinalBossFocus(),
    ]);

    const sharedClips = animationGlb.flatMap(gltf => gltf.animations ?? []);
    return {
      prototypes: [
        ...skeletonCharacters.map((gltf, index) => ({
          scene: gltf.scene,
          clips: [...(gltf.animations ?? []), ...sharedClips],
          role: roleFromPath(skeletonModels[index]),
          family: 'skeleton' as const,
          modelKey: skeletonModels[index].toLowerCase(),
        })),
        ...adventurerCharacters.map((gltf, index) => ({
          scene: gltf.scene,
          clips: [...(gltf.animations ?? []), ...sharedClips],
          role: roleFromPath(adventurerModels[index]),
          family: 'adventurer' as const,
          modelKey: adventurerModels[index].toLowerCase(),
        })),
      ],
      weapons: Object.fromEntries(weaponEntries.filter(([, scene]) => Boolean(scene))) as EnemyLibrary['weapons'],
      rangerBow,
      bossWeapon,
      finalBossFocus,
    };
  })();
  return libraryPromise;
}

export function preloadKayKitEnemyVisuals() {
  return loadLibrary().then(() => undefined);
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

function fallbackResolveAt(enemy: Enemy, role: EnemyRole, room: number) {
  const explicit = (enemy as TimedEnemy).attackResolveAt;
  if (Number.isFinite(explicit) && Number(explicit) > enemy.lastAttackTime) return Number(explicit);
  const bossContract = enemy.enemyType === 'boss' ? bossAttackContract(room) : null;
  if (bossContract) return enemy.lastAttackTime + bossContract.windupMs;
  if (role === 'mage') return enemy.lastAttackTime + 420;
  if (enemy.enemyType === 'spider' || enemy.enemyType === 'vampire') return enemy.lastAttackTime + 165;
  if (enemy.enemyType === 'demon' || enemy.enemyType === 'golem' || enemy.enemyType === 'orc') return enemy.lastAttackTime + 270;
  return enemy.lastAttackTime + 185;
}

export async function createKayKitEnemyVisual(THREE: any, enemy: Enemy): Promise<KayKitEnemyVisual | null> {
  const [library, skeletonUtils] = await Promise.all([
    loadLibrary(),
    import(/* @vite-ignore */ SKELETON_UTILS_URL) as any,
  ]);
  if (!library.prototypes.length) return null;

  const roomNumber = roomFromEnemyId(enemy);
  const spawnIndex = Number(enemy.id.split('-').at(-1) ?? 0) || 0;
  const profile = enemyVisualProfile(roomNumber, enemy.enemyType, spawnIndex);
  const finalBoss = enemy.enemyType === 'boss' && roomNumber === 50;
  const importedPrototype = profile.useImported ? await importedWithinBudget(enemy.enemyType) : null;
  const role = profile.role;
  const token = profile.modelToken?.toLowerCase();
  const fallback = library.prototypes.find(entry =>
    entry.family === profile.family && (!token || entry.modelKey.includes(token))
  ) ?? library.prototypes.find(entry => entry.family === profile.family && entry.role === role)
    ?? library.prototypes.find(entry => entry.role === role)
    ?? library.prototypes[hashId(enemy.id) % library.prototypes.length];
  const prototype = importedPrototype ?? fallback;

  const scene = skeletonUtils.clone(prototype.scene);
  const root = new THREE.Group();
  root.name = `KayKitEnemy_${enemy.id}_${prototype.imported ? enemy.enemyType : prototype.role}`;
  scene.rotation.y = prototype.rotationY ?? 0;
  prepareModel(scene);
  centerSceneOnRoot(THREE, scene);
  root.add(scene);

  const shadowRadius = enemy.enemyType === 'boss' ? 0.92 : enemy.enemyType === 'spider' ? 0.68 : enemy.enemyType === 'vampire' ? 0.52 : 0.48;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(shadowRadius, IS_MOBILE ? 18 : 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: enemy.enemyType === 'boss' ? 0.32 : 0.24, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const rightHand = prototype.imported ? null : findBone(scene, ['righthand', 'handr', 'handright']);
  const leftHand = prototype.imported ? null : findBone(scene, ['lefthand', 'handl', 'handleft']);
  const cloneWeapon = (name: keyof EnemyLibrary['weapons']) => {
    const source = library.weapons[name];
    return source ? source.clone(true) : null;
  };
  let bowRig: BowRig | null = null;

  if (!prototype.imported) {
    if (role === 'mage') {
      const focus = finalBoss && library.finalBossFocus ? library.finalBossFocus.clone(true) : cloneWeapon('staff');
      attachEquipment(rightHand, focus, [0, 0.03, 0], [Math.PI / 2, 0, Math.PI / 2], finalBoss ? 1.28 : 0.92);
    } else if (role === 'ranger') {
      const bow = library.rangerBow?.clone?.(true) ?? null;
      if (bow) {
        prepareModel(bow);
        bowRig = attachBowToRanger(THREE, scene, bow);
        bowRig.updateShotPose(0);
      }
    } else if (role === 'rogue') {
      attachEquipment(rightHand, cloneWeapon('blade'), [0.01, 0.01, 0], [Math.PI / 2, 0, Math.PI / 2], 0.84);
      attachEquipment(leftHand, cloneWeapon('blade'), [-0.01, 0.01, 0], [Math.PI / 2, 0, -Math.PI / 2], 0.84);
    } else if (role === 'warrior' || role === 'knight') {
      const weapon = enemy.enemyType === 'boss' && library.bossWeapon ? library.bossWeapon.clone(true) : cloneWeapon('axe');
      attachEquipment(rightHand, weapon, [0.01, 0.02, 0], [Math.PI / 2, 0, Math.PI / 2], enemy.enemyType === 'boss' ? 1.18 : 0.92);
      attachEquipment(leftHand, cloneWeapon(enemy.enemyType === 'boss' ? 'shieldLarge' : 'shieldSmall'), [0, 0.02, 0], [Math.PI / 2, 0, -Math.PI / 2], enemy.enemyType === 'boss' ? 1.12 : 0.9);
    } else if (role === 'barbarian') {
      const weapon = enemy.enemyType === 'boss' && library.bossWeapon ? library.bossWeapon.clone(true) : cloneWeapon('axe');
      attachEquipment(rightHand, weapon, [0.01, 0.02, 0], [Math.PI / 2, 0, Math.PI / 2], enemy.enemyType === 'boss' ? 1.2 : 1.02);
    } else {
      attachEquipment(rightHand, cloneWeapon('blade'), [0.01, 0.01, 0], [Math.PI / 2, 0, Math.PI / 2], 0.82);
    }
  }

  const idleClip = chooseIdleClip(prototype, role);
  const moveClip = chooseMoveClip(prototype, role, enemy.enemyType === 'boss');
  const attackClip = chooseAttackClip(prototype, role, roomNumber, enemy.enemyType)
    ?? chooseClip(prototype.clips, [['attack', 'a'], ['attack'], ['bite'], ['sting']], ['bow', 'crossbow', 'ranged']);
  const releaseClip = chooseReleaseClip(prototype, role, roomNumber);
  const deathClip = prototype.family === 'skeleton'
    ? chooseClip(prototype.clips, [['skeletons', 'death'], ['death', 'a'], ['death', 'b'], ['death'], ['die']], ['pose', 'resurrect'])
    : chooseClip(prototype.clips, [['death', 'a'], ['death', 'b'], ['death'], ['die']], []);

  const mixer = new THREE.AnimationMixer(scene);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const move = moveClip ? mixer.clipAction(moveClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  const release = releaseClip ? mixer.clipAction(releaseClip) : null;
  const death = deathClip ? mixer.clipAction(deathClip) : null;
  const importedVisual = Boolean(prototype.imported);
  const roleMoveBase: Record<EnemyRole, number> = {
    minion: 1.36, rogue: 1.42, ranger: 1.38, mage: 1.34, warrior: 1.08, barbarian: 1.04, knight: 1.02,
  };
  const movePlaybackBase = finalBoss ? 0.96 : enemy.enemyType === 'boss' ? 0.94 : importedVisual ? 1.18 : roleMoveBase[role];
  const initialResolveAt = fallbackResolveAt(enemy, role, roomNumber);
  const attackDuration = Math.max(0.08, (initialResolveAt - enemy.lastAttackTime) / 1000);
  const releaseDuration = role === 'ranger' ? 0.16 : role === 'mage' ? 0.2 : 0;
  const attackClipDuration = Math.max(0.12, attackClip?.duration ?? 0.5);

  idle?.reset().play();
  if (move) move.timeScale = movePlaybackBase;
  if (attack) {
    attack.setLoop(THREE.LoopOnce, 1);
    attack.clampWhenFinished = Boolean(release);
    attack.timeScale = Math.min(5, Math.max(0.5, attackClipDuration / attackDuration));
  }
  if (release && releaseClip) {
    release.setLoop(THREE.LoopOnce, 1);
    release.clampWhenFinished = false;
    release.timeScale = Math.min(5, Math.max(0.65, releaseClip.duration / Math.max(0.08, releaseDuration)));
  }
  if (death && deathClip) {
    death.setLoop(THREE.LoopOnce, 1);
    death.clampWhenFinished = true;
    const phaseSeconds = enemy.enemyType === 'boss' ? 1.65 : 0.68;
    const clipWindow = enemy.enemyType === 'boss' ? 0.76 : 0.68;
    death.timeScale = Math.max(0.35, deathClip.duration / (phaseSeconds * clipWindow));
  }

  const roleScale = role === 'knight' ? 1.1 : role === 'barbarian' || role === 'warrior' ? 1.06 : role === 'mage' ? 1.02 : role === 'rogue' || role === 'ranger' ? 0.98 : 0.94;
  const importedBase = prototype.imported ? importedScale(THREE, scene, prototype.targetHeight ?? 0.7, prototype.widthWeight ?? 0.55) : 1;
  const baseScale = (prototype.imported
    ? importedBase
    : (enemy.enemyType === 'boss' ? (finalBoss ? 1.78 : 1.62) : prototype.role === 'warrior' ? 1.08 : 0.92) * roleScale)
    * (enemy.isElite ? 1.16 : 1);
  root.scale.setScalar(baseScale);

  const statusRoot = new THREE.Group();
  root.add(statusRoot);
  const burnGlows = buildStatusGlows(THREE, 0xff642c, IS_MOBILE ? 2 : 8, 0.22);
  const frostGlows = buildStatusGlows(THREE, 0x8deaff, IS_MOBILE ? 2 : 8, 0.14);
  [...burnGlows, ...frostGlows].forEach(mesh => { mesh.visible = false; statusRoot.add(mesh); });

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
  bossAura.visible = enemy.enemyType === 'boss' || Boolean(enemy.isElite);
  const bossColors: Record<number, [number, number]> = {
    10: [0xb49b76, 0xe8d8b4], 20: [0x8b5de0, 0xd5c2ff], 30: [0x6fa44e, 0xc9e78a], 40: [0x5f407f, 0xc578e8], 50: [0xff6a32, 0xffd071],
  };
  const [roomAuraOuter, roomAuraInner] = bossColors[roomNumber] ?? [0x8f4864, 0x765bd3];
  const auraOuter = enemy.isElite ? 0xe7b84f : roomAuraOuter;
  const auraInner = enemy.isElite ? 0xffdd7d : roomAuraInner;
  const bossRingOuter = new THREE.Mesh(
    new THREE.TorusGeometry(enemy.isElite ? 0.58 : 0.7, 0.055, 7, IS_MOBILE ? 24 : 36),
    new THREE.MeshBasicMaterial({ color: auraOuter, transparent: true, opacity: enemy.isElite ? 0.32 : 0.42, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
  );
  bossRingOuter.rotation.x = Math.PI / 2;
  bossRingOuter.position.y = 0.07;
  bossRingOuter.userData.bossRing = 'outer';
  bossAura.add(bossRingOuter);
  const bossRingInner = new THREE.Mesh(
    new THREE.TorusGeometry(enemy.isElite ? 0.4 : 0.48, 0.035, 7, IS_MOBILE ? 22 : 32),
    new THREE.MeshBasicMaterial({ color: auraInner, transparent: true, opacity: enemy.isElite ? 0.26 : 0.36, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
  );
  bossRingInner.rotation.x = Math.PI / 2;
  bossRingInner.position.y = 0.09;
  bossRingInner.userData.bossRing = 'inner';
  bossRingInner.visible = !IS_MOBILE;
  bossAura.add(bossRingInner);
  const bossCore = IS_MOBILE ? new THREE.Object3D() : new THREE.PointLight(auraOuter, enemy.isElite ? 1.8 : 3.2, 5.5, 2);
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
    release,
    death,
    lastState: 'idle',
    lastAttackTime: enemy.lastAttackTime,
    lastHitTime: enemy.lastHitTime ?? 0,
    attackRemaining: 0,
    releaseRemaining: 0,
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
    imported: importedVisual,
    role,
    movePlaybackBase,
    attackDuration,
    releaseDuration,
    attackResolveAt: 0,
    awaitingRelease: false,
    attackClipDuration,
    bowRig,
    tintMode: 'normal',
  };
}

function transition(visual: KayKitEnemyVisual, next: any, fade = 0.1) {
  if (!next) return;
  const actions = [visual.idle, visual.move, visual.attack, visual.release, visual.death].filter(Boolean);
  for (const action of actions) if (action !== next && action.isRunning?.()) action.fadeOut(fade);
  next.reset().fadeIn(fade).play();
}

function setMeshTint(root: any, color: number | null, intensity: number) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material: any) => {
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
        material.emissiveIntensity = intensity;
      }
    });
  });
}

function returnToLocomotion(visual: KayKitEnemyVisual, enemy: Enemy) {
  const next = enemy.state === 'chase' ? visual.move : visual.idle;
  transition(visual, next, 0.08);
  visual.lastState = enemy.state === 'chase' ? 'chase' : 'idle';
}

export function updateKayKitEnemyVisual(visual: KayKitEnemyVisual, enemy: Enemy, delta: number, now = Date.now()) {
  const burning = Boolean(enemy.burnUntil && now < enemy.burnUntil);
  const frozen = Boolean(enemy.frostUntil && now < enemy.frostUntil);

  visual.burnGlows.forEach((glow, index) => {
    glow.visible = burning;
    if (!burning) return;
    glow.material.opacity = 0.62 + Math.sin(now * 0.012 + index) * 0.22;
    glow.position.y += delta * (0.16 + index * 0.018);
    if (glow.position.y > 1.7) glow.position.y = 0.2;
  });
  visual.burnHalo.visible = burning;
  if (burning) {
    visual.burnHalo.material.opacity = 0.42 + Math.sin(now * 0.009) * 0.16;
    visual.burnHalo.scale.setScalar(0.94 + Math.sin(now * 0.006) * 0.1);
  }
  visual.frostGlows.forEach((glow, index) => {
    glow.visible = frozen;
    if (!frozen) return;
    glow.material.opacity = 0.58 + Math.sin(now * 0.01 + index * 1.6) * 0.24;
    glow.position.y = 0.12 + (index % 4) * 0.32 + Math.sin(now * 0.004 + index) * 0.05;
    glow.position.x = Math.sin(now * 0.002 + index * 2.2) * 0.36;
    glow.position.z = Math.cos(now * 0.0024 + index * 1.7) * 0.3;
  });
  visual.frostHalo.visible = frozen;
  if (frozen) {
    visual.frostHalo.material.opacity = 0.36 + Math.sin(now * 0.008) * 0.12;
    visual.frostHalo.scale.setScalar(0.96 + Math.sin(now * 0.005) * 0.07);
  }

  if (enemy.enemyType === 'boss' || enemy.isElite) {
    visual.bossAura.rotation.y += delta * (enemy.isElite ? 0.7 : 0.5);
    visual.bossAura.traverse((node: any) => {
      if (node.userData?.bossRing === 'outer') {
        node.rotation.z = now * 0.0007;
        node.material.opacity = (enemy.isElite ? 0.26 : 0.34) + Math.sin(now * 0.004) * 0.07;
      } else if (node.userData?.bossRing === 'inner') {
        node.rotation.z = -now * 0.00105;
        node.material.opacity = (enemy.isElite ? 0.21 : 0.28) + Math.sin(now * 0.006 + 1.2) * 0.06;
      }
    });
    if (!IS_MOBILE) visual.bossCore.intensity = (enemy.isElite ? 1.6 : 2.9) + Math.sin(now * 0.007) * 0.4;
  }

  const hitFlash = Boolean(enemy.flashUntil && now < enemy.flashUntil);
  const tintMode = hitFlash ? 'hit' : 'normal';
  if (tintMode !== visual.tintMode) {
    visual.tintMode = tintMode;
    if (hitFlash) setMeshTint(visual.scene, 0xffd6bd, enemy.enemyType === 'boss' ? 0.035 : 0.065);
    else setMeshTint(visual.scene, null, 0);
  }

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
      visual.releaseRemaining = 0;
      visual.awaitingRelease = false;
      visual.bowRig?.updateShotPose(0);
      visual.scene.position.set(0, 0, 0);
      visual.scene.rotation.z = 0;
      visual.root.position.y = 0;
      visual.root.rotation.z = 0;
      if (visual.death) transition(visual, visual.death, 0.04);
      else visual.mixer.stopAllAction();
    }
    visual.deathElapsed += delta;
    const duration = Math.max(0.5, (enemy.deathDuration ?? 920) / 1000);
    const progress = Math.min(1, visual.deathElapsed / duration);
    if (!visual.death) {
      const fall = Math.max(0, (progress - 0.14) / 0.58);
      visual.root.rotation.z = fall * (enemy.enemyType === 'boss' ? 0.8 : 1.42);
      visual.root.position.y = Math.sin(Math.min(1, progress / 0.18) * Math.PI) * 0.2 - fall * 0.18;
    } else {
      visual.root.position.y = -Math.max(0, progress - 0.72) * 0.18;
    }
    const fadeStart = enemy.enemyType === 'boss' ? 0.78 : 0.7;
    const opacity = progress <= fadeStart ? 1 : Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));
    visual.root.traverse((node: any) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material: any) => {
        if (!material) return;
        material.transparent = true;
        material.opacity = opacity;
      });
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
    const length = Math.max(1, Math.hypot(dx, dy));
    const strength = enemy.enemyType === 'boss' ? 0.012 : 0.13;
    visual.scene.position.x = dx / length * pulse * strength;
    visual.scene.position.z = dy / length * pulse * strength;
    visual.scene.rotation.z = -pulse * (enemy.enemyType === 'boss' ? 0.008 : 0.09);
  } else {
    visual.scene.position.x *= 0.6;
    visual.scene.position.z *= 0.6;
    visual.scene.rotation.z *= 0.6;
  }

  const roomNumber = roomFromEnemyId(enemy);
  if (enemy.lastAttackTime > visual.lastAttackTime) {
    visual.lastAttackTime = enemy.lastAttackTime;
    visual.attackResolveAt = fallbackResolveAt(enemy, visual.role, roomNumber);
    visual.attackDuration = Math.max(0.08, (visual.attackResolveAt - enemy.lastAttackTime) / 1000);
    visual.attackRemaining = Math.max(0, (visual.attackResolveAt - now) / 1000);
    visual.releaseRemaining = 0;
    visual.awaitingRelease = Boolean(visual.release);
    visual.bowRig?.updateShotPose(0);
    if (visual.attack) {
      visual.attack.timeScale = Math.min(5, Math.max(0.5, (visual.attackClipDuration ?? 0.5) / visual.attackDuration));
      transition(visual, visual.attack, 0.03);
      visual.lastState = 'attack';
    }
  }

  if (visual.awaitingRelease && now >= (visual.attackResolveAt ?? Number.POSITIVE_INFINITY)) {
    visual.awaitingRelease = false;
    visual.attackRemaining = 0;
    visual.bowRig?.updateShotPose(0);
    if (visual.release) {
      visual.releaseRemaining = visual.releaseDuration ?? 0.16;
      transition(visual, visual.release, 0.02);
      visual.lastState = 'release';
    }
  }

  if (visual.bowRig && visual.awaitingRelease && visual.attackResolveAt && visual.attackResolveAt > visual.lastAttackTime) {
    const drawProgress = Math.max(0, Math.min(1, (now - visual.lastAttackTime) / (visual.attackResolveAt - visual.lastAttackTime)));
    visual.bowRig.updateShotPose(drawProgress);
  }

  if ((visual.releaseRemaining ?? 0) > 0) {
    visual.releaseRemaining = Math.max(0, (visual.releaseRemaining ?? 0) - delta);
    if (visual.releaseRemaining === 0) returnToLocomotion(visual, enemy);
  } else if (visual.attackRemaining > 0) {
    visual.attackRemaining = Math.max(0, visual.attackRemaining - delta);
    if (visual.attackRemaining === 0 && !visual.awaitingRelease) returnToLocomotion(visual, enemy);
  } else if (!visual.awaitingRelease) {
    const desiredState = enemy.state === 'chase' ? 'chase' : 'idle';
    if (desiredState !== visual.lastState) {
      transition(visual, desiredState === 'chase' ? visual.move : visual.idle, 0.1);
      visual.lastState = desiredState;
    }
  }

  if (visual.move) {
    const referenceSpeed = visual.imported ? 72 : visual.role === 'warrior' || visual.role === 'barbarian' || visual.role === 'knight' ? 56 : 68;
    const speedFactor = enemy.enemyType === 'boss' ? 1 : Math.max(0.82, Math.min(1.22, enemy.speed / referenceSpeed));
    const baseMoveSpeed = visual.movePlaybackBase * speedFactor;
    visual.move.timeScale = frozen
      ? Math.max(enemy.enemyType === 'boss' ? 0.5 : 0.56, baseMoveSpeed * (1 - (enemy.frostSlow ?? 0)))
      : baseMoveSpeed;
  }
  visual.mixer.update(delta);
}
