import type { Enemy } from '../game/entities';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';

type EnemyRole = 'mage' | 'rogue' | 'warrior' | 'minion';

type EnemyPrototype = {
  scene: any;
  clips: any[];
  role: EnemyRole;
};

type EnemyLibrary = {
  prototypes: EnemyPrototype[];
  weapons: Partial<Record<'axe' | 'blade' | 'staff' | 'shieldSmall' | 'shieldLarge', any>>;
};

export type KayKitEnemyVisual = {
  root: any;
  mixer: any;
  idle: any;
  move: any;
  attack: any;
  death: any;
  lastState: string;
  deathPlayed: boolean;
};

let libraryPromise: Promise<EnemyLibrary> | null = null;

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

function hashId(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function roleFromPath(path: string): EnemyRole {
  const key = path.toLowerCase();
  if (key.includes('mage')) return 'mage';
  if (key.includes('rogue')) return 'rogue';
  if (key.includes('warrior')) return 'warrior';
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

function prepareModel(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
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

async function loadLibrary() {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      const manifest = await loadKayKitManifest();
      const [{ GLTFLoader }] = await Promise.all([
        import(/* @vite-ignore */ GLTF_URL),
      ]) as any;
      const loader = new GLTFLoader();

      const skeletonModels = findKayKitModels(
        manifest,
        'skeletons',
        /\/characters\/gltf\/.*\.glb$/i,
      );

      const animationModels = [
        ...findKayKitModels(manifest, 'animations', /rig_medium_general\.glb$/i),
        ...findKayKitModels(manifest, 'animations', /rig_medium_movementbasic\.glb$/i),
        ...findKayKitModels(manifest, 'animations', /rig_medium_combatmelee\.glb$/i),
        ...findKayKitModels(manifest, 'animations', /rig_medium_combatranged\.glb$/i),
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

      const prototypes = characters.map((gltf, index) => ({
        scene: gltf.scene,
        clips: [...(gltf.animations ?? []), ...sharedClips],
        role: roleFromPath(skeletonModels[index]),
      }));
      const weapons = Object.fromEntries(weaponEntries.filter(([, scene]) => Boolean(scene))) as EnemyLibrary['weapons'];
      return { prototypes, weapons };
    })();
  }
  return libraryPromise;
}

export function preloadKayKitEnemyVisuals() {
  return loadLibrary().then(() => undefined);
}

export async function createKayKitEnemyVisual(THREE: any, enemy: Enemy): Promise<KayKitEnemyVisual | null> {
  const [library, skeletonUtils] = await Promise.all([
    loadLibrary(),
    import(/* @vite-ignore */ SKELETON_UTILS_URL) as any,
  ]);
  if (!library.prototypes.length) return null;

  const prototype = library.prototypes[hashId(enemy.id) % library.prototypes.length];
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
    attachEquipment(rightHand, cloneWeapon('axe'), [0.01, 0.02, 0], [Math.PI / 2, 0, Math.PI / 2], 0.92);
    attachEquipment(leftHand, cloneWeapon(enemy.enemyType === 'boss' ? 'shieldLarge' : 'shieldSmall'), [0, 0.02, 0], [Math.PI / 2, 0, -Math.PI / 2], 0.9);
  } else {
    attachEquipment(rightHand, cloneWeapon('blade'), [0.01, 0.01, 0], [Math.PI / 2, 0, Math.PI / 2], 0.82);
  }

  const idleClip = chooseClip(prototype.clips, [['idle', 'a'], ['idle']], ['crouch', 'sit']);
  const moveClip = chooseClip(prototype.clips, [['run'], ['walk']], ['back', 'left', 'right', 'crouch']);
  const attackClip = chooseClip(prototype.clips, [['attack', 'a'], ['attack'], ['melee']], ['bow', 'crossbow']);
  const deathClip = chooseClip(prototype.clips, [['death', 'a'], ['death']], []);

  const mixer = new THREE.AnimationMixer(scene);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const move = moveClip ? mixer.clipAction(moveClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  const death = deathClip ? mixer.clipAction(deathClip) : null;

  idle?.reset().play();
  if (move) move.timeScale = 1.06;
  for (const action of [attack, death]) {
    if (!action) continue;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
  }

  const roleScale = prototype.role === 'warrior' ? 1.06 : prototype.role === 'mage' ? 1.02 : prototype.role === 'rogue' ? 0.98 : 0.94;
  root.scale.setScalar((enemy.enemyType === 'boss' ? 1.36 : 0.96) * roleScale);

  return {
    root,
    mixer,
    idle,
    move,
    attack,
    death,
    lastState: 'idle',
    deathPlayed: false,
  };
}

function transition(visual: KayKitEnemyVisual, next: any, fade = 0.1) {
  if (!next) return;
  const actions = [visual.idle, visual.move, visual.attack, visual.death].filter(Boolean);
  for (const action of actions) {
    if (action !== next && action.isRunning?.()) action.fadeOut(fade);
  }
  if (!next.isRunning?.()) next.reset().fadeIn(fade).play();
}

export function updateKayKitEnemyVisual(visual: KayKitEnemyVisual, enemy: Enemy, delta: number) {
  if (enemy.isDead || enemy.state === 'dead') {
    if (!visual.deathPlayed) {
      visual.deathPlayed = true;
      transition(visual, visual.death, 0.06);
    }
    visual.mixer.update(delta);
    return;
  }

  if (enemy.state !== visual.lastState) {
    visual.lastState = enemy.state;
    if (enemy.state === 'attack') transition(visual, visual.attack, 0.06);
    else if (enemy.state === 'chase') transition(visual, visual.move, 0.1);
    else transition(visual, visual.idle, 0.12);
  }

  visual.mixer.update(delta);
}
