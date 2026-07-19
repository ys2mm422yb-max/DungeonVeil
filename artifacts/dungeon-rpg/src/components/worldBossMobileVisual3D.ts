const APP_BASE = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_BASE = APP_BASE.endsWith('/') ? APP_BASE : `${APP_BASE}/`;
const DRAGON_ASSET_PATH = 'assets/3d/Dragon.fbx';
const DRAGON_ASSET_REVISION = '4696a576';
const DRAGON_URL = `${NORMALIZED_BASE}${DRAGON_ASSET_PATH}?asset=${DRAGON_ASSET_REVISION}`;
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

export type WorldBossLoadFailure = {
  code: 'dragon-load-failed';
  message: string;
  technicalMessage: string;
  at: number;
};

export type WorldBossLoadedVisual = {
  identity: 'original-black-fbx-dragon';
  assetRevision: string;
  width: number;
  height: number;
  depth: number;
  minY: number;
  maxY: number;
  at: number;
};

let activeLoadFailure: WorldBossLoadFailure | null = null;
let activeLoadedVisual: WorldBossLoadedVisual | null = null;

export function getWorldBossLoadFailure(): WorldBossLoadFailure | null {
  return activeLoadFailure;
}

export function getWorldBossLoadedVisual(): WorldBossLoadedVisual | null {
  return activeLoadedVisual;
}

export function clearWorldBossLoadFailure(): void {
  activeLoadFailure = null;
  activeLoadedVisual = null;
}

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
    const prepared = materials.map((sourceMaterial: any) => {
      const clone = sourceMaterial.clone();
      if ('roughness' in clone && !Number.isFinite(clone.roughness)) clone.roughness = 0.72;
      if ('metalness' in clone && !Number.isFinite(clone.metalness)) clone.metalness = 0.04;
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

function assertFiniteBounds(THREE: any, visual: any, stage: string) {
  visual.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(visual);
  if (bounds.isEmpty()) throw new Error(`Dragon model has empty bounds during ${stage}`);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every(Number.isFinite)) throw new Error(`Dragon model has invalid bounds during ${stage}`);
  if (Math.max(size.x, size.y, size.z) < 0.01) throw new Error(`Dragon model is too small during ${stage}`);
  return { bounds, size };
}

function normalizeDragon(THREE: any, visual: any) {
  visual.scale.setScalar(1);
  visual.position.set(0, 0, 0);
  visual.rotation.set(0, 0, 0);

  const initial = assertFiniteBounds(THREE, visual, 'normalization');
  const largest = Math.max(initial.size.x, initial.size.y, initial.size.z);
  visual.scale.setScalar(3.25 / largest);
  visual.updateMatrixWorld(true);

  const scaled = assertFiniteBounds(THREE, visual, 'ground alignment');
  const center = scaled.bounds.getCenter(new THREE.Vector3());
  visual.position.x -= center.x;
  visual.position.z -= center.z;
  visual.position.y -= scaled.bounds.min.y;
  const final = assertFiniteBounds(THREE, visual, 'final placement');
  if (final.bounds.min.y < -0.02 || final.bounds.min.y > 0.08) throw new Error('Dragon model is not aligned to the arena floor');
  return {
    width: final.size.x,
    height: final.size.y,
    depth: final.size.z,
    minY: final.bounds.min.y,
    maxY: final.bounds.max.y,
  };
}

function dragonUrlCandidates(): string[] {
  const candidates: string[] = [];
  const add = (value: string) => {
    if (value && !candidates.includes(value)) candidates.push(value);
  };

  if (typeof document !== 'undefined') {
    try { add(new URL(`${DRAGON_ASSET_PATH}?asset=${DRAGON_ASSET_REVISION}`, document.baseURI).href); } catch {}
  }
  if (typeof window !== 'undefined') {
    try { add(new URL(`${NORMALIZED_BASE}${DRAGON_ASSET_PATH}?asset=${DRAGON_ASSET_REVISION}`, window.location.origin).href); } catch {}
    try {
      const pathBase = window.location.pathname.endsWith('/')
        ? window.location.pathname
        : window.location.pathname.replace(/[^/]*$/, '');
      add(new URL(`${DRAGON_ASSET_PATH}?asset=${DRAGON_ASSET_REVISION}`, `${window.location.origin}${pathBase}`).href);
    } catch {}
  }
  add(DRAGON_URL);
  return candidates;
}

function validatedFbxBuffer(buffer: ArrayBuffer, contentType: string, url: string): ArrayBuffer {
  if (contentType.toLowerCase().includes('text/html')) throw new Error(`Dragon asset resolved to HTML instead of FBX: ${url}`);
  if (buffer.byteLength < 2048) throw new Error(`Dragon asset is unexpectedly small (${buffer.byteLength} bytes): ${url}`);
  const prefix = new TextDecoder().decode(buffer.slice(0, 64));
  if (!prefix.includes('Kaydara FBX Binary') && !prefix.includes('FBX')) {
    throw new Error(`Dragon asset does not contain an FBX header: ${url}`);
  }
  return buffer;
}

async function fetchDragonBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/octet-stream, model/fbx, */*' },
  });
  if (!response.ok) throw new Error(`Dragon asset request failed with ${response.status}: ${url}`);
  return validatedFbxBuffer(await response.arrayBuffer(), response.headers.get('content-type') ?? '', url);
}

async function loadDragon(FBXLoader: any, attempts = 3) {
  const urls = dragonUrlCandidates();
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    for (const url of urls) {
      try {
        const absoluteUrl = typeof document !== 'undefined' ? new URL(url, document.baseURI).href : url;
        const buffer = await fetchDragonBuffer(absoluteUrl);
        const basePath = absoluteUrl.slice(0, absoluteUrl.lastIndexOf('/') + 1);
        return new FBXLoader().parse(buffer, basePath);
      } catch (error) {
        lastError = error;
        console.warn(`Original dragon load attempt ${attempt}/${attempts} failed for ${url}`, error);
      }
    }
    if (attempt < attempts) await wait(320 * attempt);
  }
  throw lastError instanceof Error ? lastError : new Error('Original dragon model could not be loaded');
}

async function loadImportedWorldBossMobileRig(THREE: any): Promise<WorldBossMobileRig> {
  const { FBXLoader } = await import(/* @vite-ignore */ FBX_LOADER_URL) as any;
  if (typeof FBXLoader !== 'function') throw new Error('Pinned local FBXLoader is unavailable');
  const visual = await loadDragon(FBXLoader);
  visual.name = 'DungeonVeilBlackDragon';
  prepareDragonMaterials(THREE, visual);
  const normalized = normalizeDragon(THREE, visual);
  const visualBasePosition = visual.position.clone();
  const visualBaseRotationY = visual.rotation.y;

  const root = new THREE.Group();
  root.name = 'VeilDragonWorldBoss';
  root.userData.dungeonVeilBossVisual = 'original-black-fbx-dragon';
  root.userData.dungeonVeilDragonAssetRevision = DRAGON_ASSET_REVISION;
  root.userData.dungeonVeilDragonBounds = normalized;
  root.add(visual);
  activeLoadedVisual = {
    identity: 'original-black-fbx-dragon',
    assetRevision: DRAGON_ASSET_REVISION,
    ...normalized,
    at: Date.now(),
  };

  const mixer = new THREE.AnimationMixer(visual);
  const importedClips = Array.isArray(visual.animations) ? visual.animations : [];
  const importedAction = importedClips.length ? mixer.clipAction(importedClips[0]) : null;
  importedAction?.play?.();
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
      mixer.update(delta);
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
      importedAction?.stop?.();
      mixer.stopAllAction();
      visual.traverse((node: any) => {
        if (!node.material) return;
        const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
        nodeMaterials.forEach((nodeMaterial: any) => nodeMaterial?.dispose?.());
      });
    },
  };
}

function createNeutralLoadFailureRig(THREE: any, error: unknown): WorldBossMobileRig {
  const technicalMessage = error instanceof Error ? error.message : String(error);
  activeLoadedVisual = null;
  activeLoadFailure = {
    code: 'dragon-load-failed',
    message: 'Der schwarze Drache konnte nicht sicher geladen werden.',
    technicalMessage,
    at: Date.now(),
  };
  const root = new THREE.Group();
  root.name = 'VeilDragonLoadFailure';
  root.visible = false;
  root.userData.dungeonVeilBossVisual = 'load-error-no-fallback';
  root.userData.dungeonVeilBossLoadError = technicalMessage;
  const mixer = new THREE.AnimationMixer(root);
  return {
    root,
    mixer,
    setMoving() {},
    triggerAttack() {},
    update() {},
    stop() { mixer.stopAllAction(); },
  };
}

export async function loadWorldBossMobileRig(THREE: any, _GLTFLoader: any): Promise<WorldBossMobileRig> {
  clearWorldBossLoadFailure();
  try {
    return await loadImportedWorldBossMobileRig(THREE);
  } catch (error) {
    console.error('Original black world-boss dragon failed after bounded retries; no alternate boss model will be shown', error);
    return createNeutralLoadFailureRig(THREE, error);
  }
}
