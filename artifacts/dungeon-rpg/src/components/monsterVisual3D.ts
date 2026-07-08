import type { Enemy } from '../game/entities';
import { MONSTER_ASSETS, MONSTER_LIBRARY_ROOT } from './assetCatalog3D';

const FBX_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/FBXLoader.js';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';

type MonsterPrototype = {
  root: any;
  animations: any[];
  targetSize: number;
};

export type MonsterVisual = {
  root: any;
  mixer: any | null;
  actions: Record<string, any>;
  activeAction: string;
  lastAttackTime: number;
  deathStarted: boolean;
  marker: any;
};

export type MonsterLibrary = Record<string, MonsterPrototype>;

function archetypeFor(enemy: Enemy) {
  if (enemy.enemyType === 'boss' || enemy.enemyType === 'demon' || enemy.enemyType === 'golem') return 'dragon';
  if (enemy.enemyType === 'spider' || enemy.enemyType === 'vampire') return 'bat';
  if (enemy.enemyType === 'slime') return 'slime';
  return 'skeleton';
}

function pickClip(animations: any[], terms: string[]) {
  const lowered = terms.map(term => term.toLowerCase());
  return animations.find(clip => lowered.some(term => String(clip.name || '').toLowerCase().includes(term)));
}

export async function loadMonsterLibrary(THREE: any): Promise<MonsterLibrary> {
  const { FBXLoader } = await import(/* @vite-ignore */ FBX_URL) as any;
  const loader = new FBXLoader();
  const entries = await Promise.all(Object.entries(MONSTER_ASSETS).map(async ([key, spec]) => {
    try {
      const root = await loader.loadAsync(`${MONSTER_LIBRARY_ROOT}${spec.file}`);
      root.traverse((node: any) => {
        if (!node.isMesh && !node.isSkinnedMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
        if (node.material?.clone) {
          node.material = node.material.clone();
          if (node.material.emissive && node.material.color) {
            node.material.emissive.copy(node.material.color).multiplyScalar(0.28);
            node.material.emissiveIntensity = 0.55;
          }
        }
      });
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      root.scale.setScalar(spec.targetSize / Math.max(size.x, size.y, size.z, 0.0001));
      root.updateMatrixWorld(true);
      const grounded = new THREE.Box3().setFromObject(root);
      const center = new THREE.Vector3();
      grounded.getCenter(center);
      root.position.x -= center.x;
      root.position.z -= center.z;
      root.position.y -= grounded.min.y;
      return [key, { root, animations: root.animations ?? [], targetSize: spec.targetSize }] as const;
    } catch (error) {
      console.warn(`Monster asset unavailable: ${spec.file}`, error);
      return [key, null] as const;
    }
  }));
  return Object.fromEntries(entries.filter(([, prototype]) => prototype)) as MonsterLibrary;
}

export async function createMonsterVisual(THREE: any, library: MonsterLibrary, enemy: Enemy): Promise<MonsterVisual | null> {
  const key = archetypeFor(enemy);
  const prototype = library[key];
  if (!prototype) return null;
  const SkeletonUtils = await import(/* @vite-ignore */ SKELETON_UTILS_URL) as any;
  const model = SkeletonUtils.clone(prototype.root);
  model.traverse((node: any) => {
    if (!node.material?.clone) return;
    node.material = node.material.clone();
  });

  const root = new THREE.Group();
  root.add(model);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.56, 0.64, 32),
    new THREE.MeshBasicMaterial({
      color: enemy.enemyType === 'boss' ? 0xffb43a : 0xd74552,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.022;
  root.add(marker);

  const baseScale = key === 'bat' ? 1.45 : key === 'slime' ? 1.35 : 1.58;
  const scale = enemy.enemyType === 'boss' ? 2.25 : enemy.enemyType === 'golem' ? 1.8 : baseScale;
  root.scale.setScalar(scale);

  const mixer = prototype.animations.length ? new THREE.AnimationMixer(model) : null;
  const actions: Record<string, any> = {};
  if (mixer) {
    const idle = pickClip(prototype.animations, ['idle']);
    const move = pickClip(prototype.animations, ['walk', 'run', 'fly']);
    const attack = pickClip(prototype.animations, ['attack', 'bite']);
    const death = pickClip(prototype.animations, ['death', 'die']);
    if (idle) actions.idle = mixer.clipAction(idle);
    if (move) actions.move = mixer.clipAction(move);
    if (attack) actions.attack = mixer.clipAction(attack);
    if (death) actions.death = mixer.clipAction(death);
    (actions.idle ?? actions.move)?.play();
  }

  return {
    root,
    mixer,
    actions,
    activeAction: actions.idle ? 'idle' : 'move',
    lastAttackTime: enemy.lastAttackTime,
    deathStarted: false,
    marker,
  };
}

function play(visual: MonsterVisual, name: string, once = false) {
  const next = visual.actions[name];
  if (!next || visual.activeAction === name) return;
  const current = visual.actions[visual.activeAction];
  current?.fadeOut?.(0.12);
  next.reset();
  if (once) next.setLoop(2200, 1);
  next.fadeIn?.(0.08).play();
  visual.activeAction = name;
}

export function updateMonsterVisual(visual: MonsterVisual, enemy: Enemy, delta: number, now: number) {
  visual.mixer?.update(delta);
  visual.marker.material.opacity = 0.22 + Math.sin(now * 0.006) * 0.08;

  if (enemy.isDead || enemy.hp <= 0) {
    if (!visual.deathStarted) {
      visual.deathStarted = true;
      play(visual, 'death', true);
    }
    visual.marker.visible = false;
    const elapsed = Math.max(0, now - (enemy.deathTime || now));
    visual.root.rotation.z = Math.min(Math.PI / 2, elapsed / 340 * Math.PI / 2);
    visual.root.scale.multiplyScalar(Math.max(0.96, 1 - delta * 0.6));
    return;
  }

  if (enemy.lastAttackTime > visual.lastAttackTime) {
    visual.lastAttackTime = enemy.lastAttackTime;
    play(visual, 'attack', true);
  } else {
    const moving = Math.hypot(enemy.vx, enemy.vy) > 4 || enemy.state === 'chase';
    play(visual, moving ? 'move' : 'idle');
  }

  visual.root.traverse((node: any) => {
    if (!node.material?.emissive || node === visual.marker) return;
    if (enemy.flashUntil > now) {
      node.material.emissive.setHex(0xffffff);
      node.material.emissiveIntensity = 1.15;
    } else if (node.material.color) {
      node.material.emissive.copy(node.material.color).multiplyScalar(0.3);
      node.material.emissiveIntensity = 0.6;
    }
  });
}
