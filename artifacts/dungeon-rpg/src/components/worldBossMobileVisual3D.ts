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
  root.visible = true;
  root.traverse((node: any) => {
    node.visible = true;
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = false;
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const prepared = materials.map((material: any) => {
      const clone = material.clone();
      if (clone.color) clone.color.lerp(new THREE.Color(0x6f3b2c), 0.16);
      if ('roughness' in clone) clone.roughness = Math.max(0.56, clone.roughness ?? 0.72);
      if ('metalness' in clone) clone.metalness = Math.min(0.18, clone.metalness ?? 0.04);
      if ('emissive' in clone) clone.emissive.set(0x120302);
      if ('emissiveIntensity' in clone) clone.emissiveIntensity = 0.08;
      clone.transparent = false;
      clone.opacity = 1;
      clone.depthWrite = true;
      clone.depthTest = true;
      clone.side = THREE.DoubleSide;
      clone.needsUpdate = true;
      return clone;
    });
    node.material = Array.isArray(node.material) ? prepared : prepared[0];
  });
}

function normalizeDragon(THREE: any, visual: any) {
  visual.scale.setScalar(1);
  visual.position.set(0, 0, 0);
  visual.rotation.set(0, 0, 0);
  visual.updateMatrixWorld(true);

  const initialBounds = new THREE.Box3().setFromObject(visual);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  const largest = Math.max(initialSize.x, initialSize.y, initialSize.z, 0.001);
  visual.scale.setScalar(3.25 / largest);
  visual.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(visual);
  const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
  visual.position.x -= scaledCenter.x;
  visual.position.z -= scaledCenter.z;
  visual.position.y -= scaledBounds.min.y;
  visual.updateMatrixWorld(true);
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

export async function loadWorldBossMobileRig(THREE: any, _GLTFLoader: any): Promise<WorldBossMobileRig> {
  const { FBXLoader } = await import(/* @vite-ignore */ FBX_LOADER_URL) as any;
  const visual = await loadDragon(FBXLoader);
  visual.name = 'DungeonVeilDragon';
  visual.animations = [];
  prepareDragonMaterials(THREE, visual);
  normalizeDragon(THREE, visual);
  const visualBasePosition = visual.position.clone();
  const visualBaseRotationY = visual.rotation.y;

  const root = new THREE.Group();
  root.name = 'VeilDragonWorldBoss';
  root.add(visual);

  const mixer = new THREE.AnimationMixer(visual);
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
  let attackSerial = 0;
  let stopped = false;

  return {
    root,
    mixer,
    setMoving(nextMoving: boolean) {
      moving = nextMoving;
    },
    triggerAttack() {
      attackRemaining = 0.58;
      attackSerial += 1;
    },
    update(delta: number, now: number) {
      if (stopped) return;
      attackRemaining = Math.max(0, attackRemaining - delta);

      const seconds = now * 0.001;
      const attackProgress = attackRemaining > 0 ? 1 - attackRemaining / 0.58 : 1;
      const attackWave = attackRemaining > 0 ? Math.sin(Math.min(1, attackProgress) * Math.PI) : 0;
      const gait = moving ? 1 : 0;
      const wingSpeed = moving ? 8.4 : 3.6;
      const wingAmplitude = moving ? 0.34 : 0.16;
      const flap = Math.sin(seconds * wingSpeed + attackSerial * 0.4) * wingAmplitude;
      const hover = Math.sin(seconds * (moving ? 4.1 : 2.35)) * (moving ? 0.075 : 0.045);
      const targetY = visualBasePosition.y + 0.12 + hover + attackWave * 0.16;
      const targetZ = visualBasePosition.z - attackWave * 0.52;

      visual.position.x = visualBasePosition.x + Math.sin(seconds * 2.1) * 0.025 * gait;
      visual.position.y += (targetY - visual.position.y) * Math.min(1, delta * 10);
      visual.position.z += (targetZ - visual.position.z) * Math.min(1, delta * 13);
      visual.rotation.x = -0.07 - gait * 0.05 + Math.sin(seconds * 2.8) * 0.025 - attackWave * 0.16;
      visual.rotation.y = visualBaseRotationY;
      visual.rotation.z = Math.sin(seconds * (moving ? 2.8 : 1.15)) * (moving ? 0.055 : 0.022);

      if (leftWing && leftWingBase) {
        leftWing.rotation.z = leftWingBase.z + flap + attackWave * 0.2;
        leftWing.rotation.x = leftWingBase.x - gait * 0.08;
      }
      if (rightWing && rightWingBase) {
        rightWing.rotation.z = rightWingBase.z - flap - attackWave * 0.2;
        rightWing.rotation.x = rightWingBase.x - gait * 0.08;
      }
      if (head && headBase) {
        head.rotation.x = headBase.x - 0.05 + Math.sin(seconds * 2.15) * 0.045 - attackWave * 0.28;
        head.rotation.y = headBase.y + Math.sin(seconds * 1.35) * 0.055;
      }
      if (jaw && jawBase) jaw.rotation.x = jawBase.x + attackWave * 0.42;
      tailNodes.forEach((node, index) => {
        const initial = tailBases[index];
        if (!node || !initial) return;
        const phase = seconds * (moving ? 3.3 : 1.75) - index * 0.5;
        node.rotation.y = initial.y + Math.sin(phase) * (0.075 + index * 0.015 + gait * 0.025);
        node.rotation.x = initial.x + Math.cos(phase * 0.75) * (0.02 + index * 0.004);
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
