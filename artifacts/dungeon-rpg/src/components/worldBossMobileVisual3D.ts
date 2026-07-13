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
      attackRemaining = 0.68;
      attackSerial += 1;
    },
    update(delta: number, now: number) {
      if (stopped) return;
      attackRemaining = Math.max(0, attackRemaining - delta);

      const seconds = now * 0.001;
      const attackProgress = attackRemaining > 0 ? 1 - attackRemaining / 0.68 : 1;
      const attackWave = attackRemaining > 0 ? Math.sin(Math.min(1, attackProgress) * Math.PI) : 0;
      const gait = moving ? 1 : 0;
      const wingSpeed = moving ? 11.2 : 4.8;
      const wingAmplitude = moving ? 0.52 : 0.24;
      const flap = Math.sin(seconds * wingSpeed + attackSerial * 0.45) * wingAmplitude;
      const flapLift = Math.cos(seconds * wingSpeed + attackSerial * 0.45) * (moving ? 0.12 : 0.05);
      const hover = Math.sin(seconds * (moving ? 4.6 : 2.5)) * (moving ? 0.09 : 0.05);
      const targetY = visualBasePosition.y + 0.15 + hover + flapLift * 0.18 + attackWave * 0.18;
      const targetZ = visualBasePosition.z - attackWave * 0.58;

      visual.position.x = visualBasePosition.x + Math.sin(seconds * 2.25) * 0.03 * gait;
      visual.position.y += (targetY - visual.position.y) * Math.min(1, delta * 11);
      visual.position.z += (targetZ - visual.position.z) * Math.min(1, delta * 14);
      visual.rotation.x = -0.08 - gait * 0.07 + Math.sin(seconds * 3.1) * 0.028 - attackWave * 0.18;
      visual.rotation.y = visualBaseRotationY;
      visual.rotation.z = Math.sin(seconds * (moving ? 3.15 : 1.3)) * (moving ? 0.065 : 0.026);

      if (leftWing && leftWingBase) {
        leftWing.rotation.z = leftWingBase.z + flap + attackWave * 0.26;
        leftWing.rotation.x = leftWingBase.x - gait * 0.13 - Math.max(0, flapLift) * 0.08;
        leftWing.rotation.y = leftWingBase.y + flap * 0.12;
      }
      if (rightWing && rightWingBase) {
        rightWing.rotation.z = rightWingBase.z - flap - attackWave * 0.26;
        rightWing.rotation.x = rightWingBase.x - gait * 0.13 - Math.max(0, flapLift) * 0.08;
        rightWing.rotation.y = rightWingBase.y - flap * 0.12;
      }
      if (head && headBase) {
        head.rotation.x = headBase.x - 0.06 + Math.sin(seconds * 2.3) * 0.05 - attackWave * 0.34;
        head.rotation.y = headBase.y + Math.sin(seconds * 1.45) * 0.06;
      }
      if (jaw && jawBase) jaw.rotation.x = jawBase.x + attackWave * 0.56;
      tailNodes.forEach((node, index) => {
        const initial = tailBases[index];
        if (!node || !initial) return;
        const phase = seconds * (moving ? 3.8 : 1.9) - index * 0.5;
        node.rotation.y = initial.y + Math.sin(phase) * (0.08 + index * 0.016 + gait * 0.03);
        node.rotation.x = initial.x + Math.cos(phase * 0.75) * (0.022 + index * 0.0045);
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
