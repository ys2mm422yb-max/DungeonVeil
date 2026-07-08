export type SlimeVisual = {
  root: any;
  body: any;
  face: any;
  shadow: any;
  materials: any[];
  seed: number;
  baseScale: number;
  lastFlashUntil: number;
  hitStart: number;
  mixer?: any;
  actions?: Record<string, any>;
  activeAction?: any;
  model?: any;
  kind?: 'skeleton' | 'bat' | 'dragon';
  ready?: boolean;
  failed?: boolean;
  lastDead?: boolean;
  THREE?: any;
};

const FBX_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/FBXLoader.js';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';
const ROOT = '/assets/3d/';
const prototypeCache = new Map<string, Promise<any>>();

function idHash(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index++) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  return hash;
}

function monsterKind(enemy: any): 'skeleton' | 'bat' | 'dragon' {
  if (enemy.enemyType === 'boss') return 'dragon';
  if (enemy.enemyType === 'spider' || enemy.enemyType === 'vampire') return 'bat';
  return 'skeleton';
}

function assetName(kind: 'skeleton' | 'bat' | 'dragon') {
  if (kind === 'bat') return 'Bat.fbx';
  if (kind === 'dragon') return 'Dragon.fbx';
  return 'Skeleton.fbx';
}

function clipName(clip: any) {
  return String(clip?.name || '').toLowerCase();
}

function scoreClip(name: string, wanted: 'idle' | 'move' | 'attack' | 'death') {
  let score = 0;
  const words = {
    idle: ['idle', 'stand'],
    move: ['walk', 'run', 'fly', 'flying'],
    attack: ['attack', 'bite', 'hit', 'strike'],
    death: ['death', 'die', 'dead'],
  }[wanted];
  for (const word of words) if (name.includes(word)) score += 50;
  if (wanted === 'move' && name.includes('loop')) score += 8;
  if (wanted !== 'move' && name.includes('loop')) score -= 6;
  return score;
}

function pickClip(clips: any[], wanted: 'idle' | 'move' | 'attack' | 'death') {
  return [...clips]
    .map(clip => ({ clip, score: scoreClip(clipName(clip), wanted) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.clip ?? null;
}

function normalizeModel(THREE: any, model: any, targetHeight: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  model.scale.setScalar(targetHeight / Math.max(size.y, 0.0001));
  model.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      material.transparent = true;
      material.userData.baseEmissiveIntensity = material.emissiveIntensity ?? 0;
      if (material.emissive) material.userData.baseEmissive = material.emissive.getHex();
    }
  });
  return model;
}

async function loadPrototype(THREE: any, kind: 'skeleton' | 'bat' | 'dragon') {
  const name = assetName(kind);
  let cached = prototypeCache.get(name);
  if (!cached) {
    cached = (async () => {
      const { FBXLoader } = await import(/* @vite-ignore */ FBX_URL) as any;
      const loader = new FBXLoader();
      return loader.loadAsync(`${ROOT}${name}`);
    })();
    prototypeCache.set(name, cached);
  }
  const source = await cached;
  const { clone } = await import(/* @vite-ignore */ SKELETON_UTILS_URL) as any;
  const model = clone(source);
  model.animations = source.animations ?? [];
  return model;
}

function playAction(THREE: any, visual: SlimeVisual, name: 'idle' | 'move' | 'attack' | 'death', fade = 0.14) {
  const next = visual.actions?.[name];
  if (!next || next === visual.activeAction) return;
  if (name === 'death' || name === 'attack') {
    next.setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = true;
  } else {
    next.setLoop(THREE.LoopRepeat, Infinity);
  }
  next.reset().fadeIn(fade).play();
  visual.activeAction?.fadeOut(fade);
  visual.activeAction = next;
}

export function getSlimeVariant(enemy: any) {
  const hash = idHash(enemy.id);
  return {
    baseScale: 0.92 + ((hash >>> 3) % 4) * 0.06,
    phase: (hash % 997) / 997 * Math.PI * 2,
  };
}

export function createSlimeVisual(THREE: any, enemy: any): SlimeVisual {
  const variant = getSlimeVariant(enemy);
  const kind = monsterKind(enemy);
  const root = new THREE.Group();
  root.name = `DungeonVeilMonster-${kind}`;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(kind === 'dragon' ? 0.9 : kind === 'bat' ? 0.42 : 0.48, 18),
    new THREE.MeshBasicMaterial({ color: 0x101810, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const visual: SlimeVisual = {
    root,
    body: null,
    face: null,
    shadow,
    materials: [],
    seed: variant.phase,
    baseScale: variant.baseScale,
    lastFlashUntil: 0,
    hitStart: -Infinity,
    kind,
    ready: false,
    failed: false,
    lastDead: false,
    THREE,
  };

  loadPrototype(THREE, kind)
    .then(model => {
      if (!root.parent && root.userData.disposed) return;
      const targetHeight = kind === 'dragon' ? 3.2 : kind === 'bat' ? 1.05 : 1.65;
      normalizeModel(THREE, model, targetHeight);
      if (kind === 'bat') model.position.y = 0.72;
      if (kind === 'dragon') model.rotation.y = Math.PI;
      root.add(model);
      visual.model = model;

      const materials: any[] = [];
      model.traverse((node: any) => {
        if (!node.isMesh) return;
        const list = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of list) if (material && !materials.includes(material)) materials.push(material);
      });
      visual.materials = materials;

      const clips = model.animations ?? [];
      const mixer = new THREE.AnimationMixer(model);
      visual.mixer = mixer;
      const idleClip = pickClip(clips, 'idle');
      const moveClip = pickClip(clips, 'move');
      const attackClip = pickClip(clips, 'attack');
      const deathClip = pickClip(clips, 'death');
      visual.actions = {
        idle: idleClip ? mixer.clipAction(idleClip) : null,
        move: moveClip ? mixer.clipAction(moveClip) : null,
        attack: attackClip ? mixer.clipAction(attackClip) : null,
        death: deathClip ? mixer.clipAction(deathClip) : null,
      };
      playAction(THREE, visual, kind === 'bat' ? 'move' : 'idle', 0);
      visual.ready = true;
    })
    .catch(error => {
      console.error(`Monster model failed: ${kind}`, error);
      visual.failed = true;
    });

  return visual;
}

export function updateSlimeVisual(visual: SlimeVisual, enemy: any, now: number) {
  const THREE = visual.THREE;
  const isDead = enemy.isDead || enemy.hp <= 0;
  visual.mixer?.update(1 / 60);

  if (enemy.flashUntil > visual.lastFlashUntil) {
    visual.lastFlashUntil = enemy.flashUntil;
    visual.hitStart = now;
  }

  if (isDead && !visual.lastDead) {
    visual.lastDead = true;
    if (THREE) playAction(THREE, visual, 'death', 0.08);
  }

  const hitAge = now - visual.hitStart;
  const hitPulse = hitAge >= 0 && hitAge < 170 ? 1 - hitAge / 170 : 0;
  const hitWave = Math.sin(hitAge * 0.095) * hitPulse;

  if (visual.model) {
    visual.model.position.x = hitWave * 0.08;
    visual.model.rotation.z = hitWave * 0.06;
    if (visual.kind === 'bat' && !isDead) {
      visual.model.position.y = 0.72 + Math.sin(now * 0.006 + visual.seed) * 0.12;
      visual.shadow.scale.setScalar(0.82 + Math.sin(now * 0.006 + visual.seed) * 0.08);
    }
  }

  const flashing = enemy.flashUntil > now;
  for (const material of visual.materials) {
    if (!material) continue;
    material.opacity = isDead ? Math.max(0, 1 - Math.min(1, (now - (enemy.deathTime || now)) / 320)) : 1;
    if (material.emissive) {
      material.emissive.setHex(flashing ? 0xffffff : (material.userData.baseEmissive ?? 0x000000));
      material.emissiveIntensity = flashing ? 1.65 : (material.userData.baseEmissiveIntensity ?? 0);
    }
  }

  if (!isDead && THREE && visual.ready && visual.activeAction === visual.actions?.attack) {
    const action = visual.actions?.attack;
    const clip = action?.getClip?.();
    if (clip && action.time >= clip.duration * 0.92) playAction(THREE, visual, visual.kind === 'bat' ? 'move' : 'idle', 0.1);
  }

  visual.shadow.material.opacity = isDead ? 0.3 * Math.max(0, 1 - Math.min(1, (now - (enemy.deathTime || now)) / 320)) : 0.3;
}
