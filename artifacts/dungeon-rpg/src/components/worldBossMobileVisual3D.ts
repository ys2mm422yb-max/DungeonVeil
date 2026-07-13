const APP_BASE = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_BASE = APP_BASE.endsWith('/') ? APP_BASE : `${APP_BASE}/`;
const DRAGON_URL = `${NORMALIZED_BASE}assets/3d/Dragon.fbx`;
const FBX_LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/FBXLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

export type WorldBossMobileRig = {
  root: any;
  mixer: any;
  setMoving: (moving: boolean) => void;
  triggerAttack: () => void;
  update: (delta: number, now: number) => void;
  stop: () => void;
};

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

function nodeKey(node: any) {
  return String(node?.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findNode(root: any, patterns: RegExp[]) {
  let result: any = null;
  root.traverse((node: any) => {
    if (result) return;
    const key = nodeKey(node);
    if (patterns.some(pattern => pattern.test(key))) result = node;
  });
  return result;
}

function findNodes(root: any, patterns: RegExp[]) {
  const result: any[] = [];
  root.traverse((node: any) => {
    const key = nodeKey(node);
    if (patterns.some(pattern => pattern.test(key))) result.push(node);
  });
  return result;
}

function prepareDragonMaterials(THREE: any, root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = true;
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const prepared = materials.map((material: any) => {
      const clone = material.clone();
      if (clone.color) clone.color.lerp(new THREE.Color(0x6f3b2c), 0.16);
      if ('roughness' in clone) clone.roughness = Math.max(0.56, clone.roughness ?? 0.72);
      if ('metalness' in clone) clone.metalness = Math.min(0.18, clone.metalness ?? 0.04);
      if ('emissive' in clone) clone.emissive.set(0x120302);
      if ('emissiveIntensity' in clone) clone.emissiveIntensity = 0.08;
      return clone;
    });
    node.material = Array.isArray(node.material) ? prepared : prepared[0];
  });
}

function normalizeDragon(THREE: any, visual: any) {
  visual.scale.setScalar(1);
  visual.position.set(0, 0, 0);
  visual.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(visual);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z, 0.001);
  const scale = 3.25 / largest;
  visual.scale.setScalar(scale);
  visual.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  visual.rotation.y = Math.PI;
}

async function loadDragon(FBXLoader: any, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await new FBXLoader().loadAsync(DRAGON_URL);
    } catch (error) {
      lastError = error;
      console.warn(`Dragon model load attempt ${attempt}/${attempts} failed`, error);
      if (attempt < attempts) await wait(220 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Dragon model could not be loaded');
}

function clipKey(clip: any) {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function chooseClip(clips: any[], terms: string[]) {
  return clips.find(clip => terms.some(term => clipKey(clip).includes(term))) ?? null;
}

export async function loadWorldBossMobileRig(THREE: any, _GLTFLoader: any): Promise<WorldBossMobileRig> {
  const { FBXLoader } = await import(/* @vite-ignore */ FBX_LOADER_URL) as any;
  const visual = await loadDragon(FBXLoader);
  visual.name = 'DungeonVeilDragon';
  prepareDragonMaterials(THREE, visual);
  normalizeDragon(THREE, visual);

  const root = new THREE.Group();
  root.name = 'VeilDragonWorldBoss';
  root.add(visual);

  const clips = visual.animations ?? [];
  const mixer = new THREE.AnimationMixer(visual);
  const idleClip = chooseClip(clips, ['idle', 'fly', 'hover', 'walk']);
  const attackClip = chooseClip(clips, ['attack', 'bite', 'fire', 'roar']);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  idle?.reset().play();
  if (attack) {
    attack.setLoop(THREE.LoopOnce, 1);
    attack.clampWhenFinished = false;
  }

  const head = findNode(visual, [/head/, /neck/]);
  const jaw = findNode(visual, [/jaw/, /mouth/]);
  const leftWing = findNode(visual, [/wingleft/, /leftwing/, /wingl$/]);
  const rightWing = findNode(visual, [/wingright/, /rightwing/, /wingr$/]);
  const tailNodes = findNodes(visual, [/tail/]).slice(0, 8);
  const base = (node: any) => node ? { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z } : null;
  const headBase = base(head);
  const jawBase = base(jaw);
  const leftWingBase = base(leftWing);
  const rightWingBase = base(rightWing);
  const tailBases = tailNodes.map(base);

  let moving = false;
  let attackRemaining = 0;
  let stopped = false;

  return {
    root,
    mixer,
    setMoving(nextMoving: boolean) {
      moving = nextMoving;
    },
    triggerAttack() {
      attackRemaining = 0.72;
      if (attack) {
        attack.reset().fadeIn(0.05).play();
        idle?.fadeOut(0.05);
      }
    },
    update(delta: number, now: number) {
      if (stopped) return;
      mixer.update(delta);
      attackRemaining = Math.max(0, attackRemaining - delta);
      if (attackRemaining === 0 && attack && !idle?.isRunning?.()) idle?.reset().fadeIn(0.12).play();

      const seconds = now * 0.001;
      const attackPulse = Math.max(0, attackRemaining / 0.72);
      visual.position.y += (0.08 + Math.sin(seconds * 1.9) * 0.045 - visual.position.y) * Math.min(1, delta * 5.5);
      visual.rotation.x = Math.sin(seconds * 1.15) * 0.025 - attackPulse * 0.1;
      visual.rotation.z = Math.sin(seconds * 0.72) * 0.018;

      const flap = Math.sin(seconds * (moving ? 4.8 : 2.25)) * (moving ? 0.22 : 0.11) + attackPulse * 0.18;
      if (leftWing && leftWingBase) leftWing.rotation.z = leftWingBase.z + flap;
      if (rightWing && rightWingBase) rightWing.rotation.z = rightWingBase.z - flap;
      if (head && headBase) {
        head.rotation.x = headBase.x + Math.sin(seconds * 1.35) * 0.055 - attackPulse * 0.18;
        head.rotation.y = headBase.y + Math.sin(seconds * 0.8) * 0.045;
      }
      if (jaw && jawBase) jaw.rotation.x = jawBase.x + attackPulse * 0.28;
      tailNodes.forEach((node, index) => {
        const initial = tailBases[index];
        if (!node || !initial) return;
        node.rotation.y = initial.y + Math.sin(seconds * 1.45 - index * 0.42) * (0.06 + index * 0.012);
      });
    },
    stop() {
      stopped = true;
      mixer.stopAllAction();
      visual.traverse((node: any) => {
        if (!node.material) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material: any) => material?.dispose?.());
      });
    },
  };
}
