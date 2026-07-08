import { ROOM_ASSETS, type ObjAssetSpec, OBJ_LIBRARY_ROOT } from './assetCatalog3D';

export type RoomDecorAssetMap = Record<string, any>;

type DecorPoint = {
  kind: string;
  x: number;
  z: number;
  scale?: number;
  rotation?: number;
};

const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
const assetCache = new Map<string, Promise<any | null>>();

const ROOM_HALF_W = 9.6;
const ROOM_HALF_H = 13.4;
const WALL_STEP = 3.35;

function range(start: number, end: number, step: number) {
  const values: number[] = [];
  for (let value = start; value <= end + 0.001; value += step) values.push(value);
  return values;
}

function architecture(): DecorPoint[] {
  const points: DecorPoint[] = [];

  for (const x of range(-8.4, 8.4, WALL_STEP)) {
    if (Math.abs(x) > 2) points.push({ kind: 'wall', x, z: -ROOM_HALF_H });
    points.push({ kind: 'wall', x, z: ROOM_HALF_H, rotation: Math.PI });
  }

  for (const z of range(-10.2, 10.2, WALL_STEP)) {
    points.push({ kind: 'wall', x: -ROOM_HALF_W, z, rotation: Math.PI / 2 });
    points.push({ kind: 'wall', x: ROOM_HALF_W, z, rotation: -Math.PI / 2 });
  }

  points.push({ kind: 'archDoor', x: 0, z: -ROOM_HALF_H + 0.1 });
  points.push({ kind: 'column', x: -7.8, z: -11.8, scale: 0.9 });
  points.push({ kind: 'column', x: 7.8, z: -11.8, scale: 0.9 });
  points.push({ kind: 'column2', x: -7.8, z: 11.8, scale: 0.9 });
  points.push({ kind: 'column2', x: 7.8, z: 11.8, scale: 0.9 });
  points.push({ kind: 'bannerWall', x: -5.4, z: -13.05, scale: 0.9 });
  points.push({ kind: 'bannerWall', x: 5.4, z: -13.05, scale: 0.9 });
  points.push({ kind: 'torch', x: -2.8, z: -12.9, scale: 0.85 });
  points.push({ kind: 'torch', x: 2.8, z: -12.9, scale: 0.85 });

  return points;
}

const ROOM_LAYOUTS: Record<number, DecorPoint[]> = {
  1: [
    ...architecture(),
    { kind: 'weaponStand', x: 7.1, z: -7.3, rotation: -Math.PI / 2 },
    { kind: 'dummy', x: 6.7, z: -3.8, rotation: -Math.PI / 2 },
    { kind: 'workbenchDrawers', x: 7.1, z: 0.2, rotation: -Math.PI / 2 },
    { kind: 'anvil', x: 5.8, z: 2.2 },
    { kind: 'barrel', x: 7.2, z: 5.5 },
    { kind: 'crateWood', x: 6.1, z: 6.4, rotation: 0.2 },
    { kind: 'woodfire', x: -6.9, z: -6.5 },
    { kind: 'bench', x: -6.9, z: -3.3, rotation: Math.PI / 2 },
    { kind: 'tableSmall', x: -6.5, z: 0.1, rotation: Math.PI / 2 },
    { kind: 'candleTriple', x: -6.5, z: 0.1 },
    { kind: 'barrel2', x: -7.1, z: 5.2 },
    { kind: 'chest', x: -6.1, z: 6.4, rotation: 0.25 },
    { kind: 'swordWallMount', x: 8.9, z: -0.6, rotation: -Math.PI / 2 },
  ],
  2: [
    ...architecture(),
    { kind: 'bookcase', x: -7.2, z: -6.4, rotation: Math.PI / 2 },
    { kind: 'bookcase', x: -7.2, z: -2.8, rotation: Math.PI / 2 },
    { kind: 'shelfArch', x: 7.1, z: -5.8, rotation: -Math.PI / 2 },
    { kind: 'shelfBottles', x: 7.1, z: -2.8, rotation: -Math.PI / 2 },
    { kind: 'cauldron', x: -5.4, z: 3.4 },
    { kind: 'cage', x: 5.8, z: 4.1 },
    { kind: 'cobweb', x: -8.5, z: 8.8, rotation: Math.PI / 2 },
    { kind: 'cobweb2', x: 8.5, z: 8.6, rotation: -Math.PI / 2 },
    { kind: 'potion', x: 6.5, z: -1.8, scale: 1.3 },
  ],
  3: [
    ...architecture(),
    { kind: 'pedestal', x: 0, z: -5.8 },
    { kind: 'statueHorse', x: 0, z: -8.5, rotation: Math.PI },
    { kind: 'decorativeWall', x: -6.5, z: -9.8 },
    { kind: 'decorativeWall', x: 6.5, z: -9.8 },
    { kind: 'banner', x: -5.7, z: -7.1 },
    { kind: 'banner', x: 5.7, z: -7.1 },
    { kind: 'chestGold', x: 0, z: 7.1, rotation: Math.PI },
    { kind: 'candleTriple', x: -2.2, z: 5.9 },
    { kind: 'candleTriple', x: 2.2, z: 5.9 },
  ],
  4: [
    ...architecture(),
    { kind: 'trapSpikes', x: -4.3, z: -2.5 },
    { kind: 'trapSpikes', x: 4.3, z: -2.5 },
    { kind: 'trapEmpty', x: 0, z: 2.3 },
    { kind: 'trapdoor', x: 0, z: 7.0 },
    { kind: 'crate', x: -7.0, z: 5.6 },
    { kind: 'barrel', x: 7.0, z: 5.6 },
    { kind: 'skull', x: -5.6, z: -6.0 },
    { kind: 'skull', x: 5.6, z: -6.0, rotation: 1.4 },
  ],
};

function normalizeAsset(THREE: any, object: any, targetSize: number) {
  object.position.set(0, 0, 0);
  object.scale.setScalar(1);
  object.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, 0.0001));
  object.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
  object.updateMatrixWorld(true);
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
  });
  return object;
}

async function loadAsset(THREE: any, spec: ObjAssetSpec) {
  const key = `${spec.folder}:${spec.file}`;
  let pending = assetCache.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const [{ OBJLoader }, { MTLLoader }] = await Promise.all([
          import(/* @vite-ignore */ OBJ_URL),
          import(/* @vite-ignore */ MTL_URL),
        ]) as any;
        const base = `${OBJ_LIBRARY_ROOT}${spec.folder}/${spec.file}`;
        const materials = await new MTLLoader().loadAsync(`${base}.mtl`);
        materials.preload();
        const loader = new OBJLoader();
        loader.setMaterials(materials);
        const object = await loader.loadAsync(`${base}.obj`);
        return normalizeAsset(THREE, object, spec.targetSize);
      } catch (error) {
        console.warn(`Room asset unavailable: ${spec.folder}/${spec.file}`, error);
        return null;
      }
    })();
    assetCache.set(key, pending);
  }
  return pending;
}

function cloneAsset(source: any, point: DecorPoint) {
  const object = source.clone(true);
  object.position.set(point.x, 0, point.z);
  object.rotation.y = point.rotation ?? 0;
  object.scale.multiplyScalar(point.scale ?? 1);
  return object;
}

export function buildChapterRoomDecor(THREE: any, room: number, assets: RoomDecorAssetMap = {}) {
  const root = new THREE.Group();
  root.name = `DungeonVeilClosedRoom-${room}`;
  const points = ROOM_LAYOUTS[Math.max(1, Math.min(4, room))] ?? ROOM_LAYOUTS[1];
  let active = true;

  const renderAvailable = (available: RoomDecorAssetMap) => {
    if (!active) return;
    for (const point of points) {
      const source = available[point.kind];
      if (source) root.add(cloneAsset(source, point));
    }
  };

  renderAvailable(assets);
  const missingKinds = [...new Set(points.map(point => point.kind).filter(kind => !assets[kind]))];
  Promise.all(missingKinds.map(async kind => [kind, ROOM_ASSETS[kind] ? await loadAsset(THREE, ROOM_ASSETS[kind]) : null] as const))
    .then(entries => {
      if (active) renderAvailable(Object.fromEntries(entries.filter(([, object]) => object)));
    });

  root.userData.update = (_now: number) => {};
  root.userData.dispose = () => { active = false; };
  return root;
}
