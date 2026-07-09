import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';
import { buildKayKitOuterWorld, preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { roomIdentity } from '../game/roomIdentity';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const LOW_GPU_KEY = 'dungeon-veil-low-gpu';

type LoadedGltf = { scene: any };
type ThemePosition = readonly [number, number, number, number?];
const packPromises = new Map<string, Promise<any[]>>();

function lowGpuSession() {
  try { return IS_ANDROID || sessionStorage.getItem(LOW_GPU_KEY) === '1'; } catch { return IS_ANDROID; }
}

function keepCachedResource(resource: any) {
  if (!resource || resource.userData?.kayKitPersistent) return;
  resource.userData = { ...(resource.userData ?? {}), kayKitPersistent: true };
  resource.dispose = () => undefined;
}

function keywordScore(path: string, keywords: string[]) {
  const name = path.toLowerCase();
  let score = 0;
  for (const keyword of keywords) if (name.includes(keyword.toLowerCase())) score += 70;
  if (/assets\/gltf\//i.test(path)) score += 20;
  if (/(large|huge)/.test(name)) score -= 8;
  if (/(texture|sample|preview|contents)/.test(name)) score -= 500;
  return score;
}

async function loadRoomPool(room: number) {
  const identity = roomIdentity(room);
  const cacheKey = `${identity.id}:${identity.packs.join(',')}:${identity.keywords.join(',')}`;
  const cached = packPromises.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const loader = new GLTFLoader();
    const candidates = identity.packs.flatMap(pack =>
      findKayKitModels(manifest, pack as KayKitPackName, /\.(?:gltf|glb)$/i)
        .map(path => ({ path, score: keywordScore(path, identity.keywords) }))
    )
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

    const uniquePaths = [...new Set(candidates.map(entry => entry.path))].slice(0, 30);
    return Promise.all(uniquePaths.map(path => loader.loadAsync(modelUrl(manifest, path)).then((gltf: LoadedGltf) => gltf.scene)));
  })();

  packPromises.set(cacheKey, promise);
  return promise;
}

function addArchitectureLights(THREE: any, root: any, room: number) {
  const late = room >= 11;
  const warm = late ? 0xc88b62 : room >= 9 ? 0xd98a58 : 0xffb86d;
  const gateColor = room === 7 || room === 17 ? 0x8a7de8 : room >= 16 ? 0x9b5368 : room >= 9 ? 0xb06c58 : 0xe6b27a;

  if (IS_MOBILE) {
    const light = new THREE.PointLight(gateColor, lowGpuSession() ? 1.9 : 3.4, late ? 14 : 15.5, 2);
    light.position.set(0, 4.2, -11.8);
    root.add(light);
    root.userData.architectureLights = [light];
    return;
  }

  const left = new THREE.PointLight(warm, late ? 2.9 : 3.15, 10.5, 2);
  left.position.set(-5.8, 3.8, -11.4);
  root.add(left);
  const right = new THREE.PointLight(warm, late ? 2.9 : 3.15, 10.5, 2);
  right.position.set(5.8, 3.8, -11.4);
  root.add(right);
  const gate = new THREE.PointLight(gateColor, 3.6, 9.5, 2);
  gate.position.set(0, 3.0, -14.1);
  root.add(gate);
  root.userData.architectureLights = [left, right, gate];
}

const ROOM_THEME_POSITIONS: Record<number, ThemePosition[]> = {
  1: [[-9.4,-1.8,.3,.78],[9.5,1.8,2.8,.78],[-8.8,8.4,1.2,.72],[8.7,8.8,2,.72],[0,-8.2,.1,.62]],
  2: [[-9.6,-7.7,.5,.82],[9.6,-7.4,2.6,.82],[-8.8,2,1.2,.74],[8.9,2.4,1.9,.74],[0,9.2,2.7,.68],[-3.2,-1.8,.2,.58]],
  3: [[-9.2,-8.5,.4,.76],[9.2,-8.5,2.7,.76],[-9,2.8,1.2,.7],[9,3.2,1.9,.7]],
  4: [[-9.6,-9.2,.3,.82],[9.4,-8,2.8,.78],[-8.8,1,1.1,.72],[8.9,6.8,2,.74],[-1.5,9,2.4,.66],[3.4,-2.4,.5,.62]],
  5: [[-9.1,-10.2,.5,.74],[9.2,-10,2.6,.74],[-8.9,7.8,1.3,.7],[8.8,7.6,1.9,.7],[-3.5,-1.2,.2,.64],[3.6,1.4,2.7,.6]],
  6: [[-9.5,-9.8,.4,.82],[9.5,-9.8,2.7,.82],[-9,-1.4,1.2,.74],[9,-1.4,1.9,.74],[0,8.4,2.5,.7],[3.2,-4,.2,.64]],
  7: [[-9.3,-9.5,.25,.9],[9.3,-9.5,2.8,.9],[-9.4,-2.8,1.2,.82],[9.4,-2.8,1.9,.82],[-9.2,5.6,2.2,.88],[9.2,5.6,.8,.88]],
  8: [[-10,-11,.4,.72],[10,-11,2.7,.72],[-10.1,1.8,1.3,.68],[10.1,1.8,1.9,.68],[-9.8,9,2.2,.7],[9.8,9,.8,.7]],
  9: [[-9.5,-10.2,.3,.86],[9.5,-10.2,2.8,.86],[-9.8,-3.8,1.2,.78],[9.8,-3.8,1.9,.78],[-9.5,4.5,2.25,.8],[9.5,4.5,.85,.8]],
  10: [[-9.4,-10.2,.35,1.02],[9.4,-10.2,2.75,1.02],[-9.6,-3,1.15,.9],[9.6,-3,1.95,.9],[-9.4,5,2.2,.88],[9.4,5,.85,.88]],
  11: [[-9.7,-10.2,.3,.92],[9.5,-9.5,2.7,.9],[-9.4,-1.5,1.4,.82],[9.7,2.8,1.9,.86],[-9,8.2,2.2,.92]],
  12: [[-9.8,-8.8,.6,.88],[9.8,-7.8,2.4,.84],[-9.5,.5,1.1,.8],[9.6,4.6,2,.86],[-8.8,8.5,2.7,.9],[2.8,-1.8,.3,.62]],
  13: [[-9.4,-10.5,.2,1],[9.4,-9.4,2.9,.96],[-9.7,-2,1,.86],[9.4,2.4,2.1,.9],[-9.2,8,2.5,.96]],
  14: [[-9.8,-10,.4,.88],[9.8,-9,2.5,.88],[-9.6,-.8,1.3,.82],[9.6,5.2,1.8,.86],[-8.9,8.7,2.6,.9]],
  15: [[-9.5,-10.4,.25,1.02],[9.5,-10.4,2.85,1.02],[-9.6,-2.6,1.2,.9],[9.6,-1.4,1.95,.9],[-9,7.8,2.4,.98]],
  16: [[-9.8,-10.5,.4,.9],[9.8,-9.4,2.7,.9],[-9.8,-1.6,1.1,.86],[9.8,2.6,2,.86],[-9.2,8.3,2.6,.92],[3.2,-2.4,.4,.65]],
  17: [[-9.5,-10,.3,1.02],[9.5,-10,2.8,1.02],[-9.8,-2,1.2,.92],[9.8,-.5,1.9,.92],[-9.1,7.8,2.5,.96]],
  18: [[-9.8,-10.4,.4,.92],[9.8,-9.6,2.7,.92],[-9.7,-1,1.2,.86],[9.7,3.5,1.9,.88],[-9,8.4,2.5,.94],[2.6,-2.2,.5,.68]],
  19: [[-9.5,-10.2,.3,1.05],[9.5,-10.2,2.8,1.05],[-9.8,-3,1.2,.94],[9.8,-3,1.95,.94],[-9.2,6.8,2.5,1]],
  20: [[-9.3,-10.4,.25,1.12],[9.3,-10.4,2.85,1.12],[-9.6,-2.8,1.15,1],[9.6,-2.8,1.95,1],[-9,6.5,2.5,1.02]],
};

export async function preloadKayKitRoomTheme(room: number) {
  await preloadKayKitOuterWorld();
  if (!ROOM_THEME_POSITIONS[room]?.length) return;
  await loadRoomPool(room);
}

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  const identity = roomIdentity(room);
  root.name = `KayKitThemeRoom${room}_${identity.id}`;
  root.userData.roomIdentity = identity;
  let active = true;

  const outer = buildKayKitOuterWorld(THREE, 24, 32);
  root.add(outer);
  addArchitectureLights(THREE, root, room);

  const positions = ROOM_THEME_POSITIONS[room] ?? [];
  const themeReady = !positions.length ? Promise.resolve() : loadRoomPool(room).then(pool => {
    if (!active || !pool.length) return;
    const mobileLimit = lowGpuSession() ? (IS_ANDROID ? 3 : 4) : Math.min(6, identity.density);
    const visiblePositions = IS_MOBILE ? positions.slice(0, mobileLimit) : positions.slice(0, identity.density);
    visiblePositions.forEach(([x, z, rotation, scale], index) => {
      const prototype = pool[(index * 5 + room * 7) % pool.length];
      const object = prototype.clone(true);
      object.position.set(x, 0, z);
      object.rotation.y = rotation;
      object.scale.setScalar(scale ?? 0.82);
      object.traverse((node: any) => {
        if (!node.isMesh) return;
        keepCachedResource(node.geometry);
        if (Array.isArray(node.material)) node.material.forEach(keepCachedResource);
        else keepCachedResource(node.material);
        node.castShadow = false;
        node.receiveShadow = !IS_MOBILE;
        node.frustumCulled = true;
      });
      root.add(object);
    });
  });

  const ready = Promise.all([outer.userData?.ready ?? Promise.resolve(), themeReady]).then(() => undefined).catch(error => {
    console.error('KayKit room theme failed', identity.id, error);
    throw error;
  });

  root.userData.ready = ready;
  root.userData.dispose = () => { active = false; outer.userData?.dispose?.(); };
  return root;
}
