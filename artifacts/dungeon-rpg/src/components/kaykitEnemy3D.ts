import type { Enemy } from '../game/entities';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';

type EnemyPrototype = {
  scene: any;
  clips: any[];
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

let libraryPromise: Promise<EnemyPrototype[]> | null = null;

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

      const animationGlb = await Promise.all(animationModels.map(path => loader.loadAsync(modelUrl(manifest, path))));
      const sharedClips = animationGlb.flatMap(gltf => gltf.animations ?? []);
      const characters = await Promise.all(skeletonModels.map(path => loader.loadAsync(modelUrl(manifest, path))));

      return characters.map(gltf => ({
        scene: gltf.scene,
        clips: [...(gltf.animations ?? []), ...sharedClips],
      }));
    })();
  }
  return libraryPromise;
}

export async function createKayKitEnemyVisual(THREE: any, enemy: Enemy): Promise<KayKitEnemyVisual | null> {
  const [library, skeletonUtils] = await Promise.all([
    loadLibrary(),
    import(/* @vite-ignore */ SKELETON_UTILS_URL) as any,
  ]);
  if (!library.length) return null;

  const prototype = library[hashId(enemy.id) % library.length];
  const scene = skeletonUtils.clone(prototype.scene);
  const root = new THREE.Group();
  root.name = `KayKitEnemy_${enemy.id}`;
  root.add(scene);

  scene.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
  });

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
  if (move) move.timeScale = 0.96;
  for (const action of [attack, death]) {
    if (!action) continue;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
  }

  root.scale.setScalar(enemy.enemyType === 'boss' ? 1.55 : 1.12);

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
