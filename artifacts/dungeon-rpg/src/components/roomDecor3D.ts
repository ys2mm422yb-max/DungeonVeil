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

const ARMORY: DecorPoint[] = [
  { kind: 'weaponStand', x: 5.6, z: -5.5, rotation: -Math.PI / 2 },
  { kind: 'dummy', x: 4.6, z: -2.2, rotation: -Math.PI / 2 },
  { kind: 'workbenchDrawers', x: 5.8, z: 1.0, rotation: -Math.PI / 2 },
  { kind: 'anvil', x: 4.2, z: 3.2 },
  { kind: 'crateWood', x: 5.4, z: 5.3, rotation: 0.2 },
  { kind: 'woodfire', x: -5.2, z: -5.0 },
  { kind: 'bench', x: -4.8, z: -2.0, rotation: Math.PI / 2 },
  { kind: 'tableSmall', x: -4.8, z: 1.1, rotation: Math.PI / 2 },
  { kind: 'candleTriple', x: -4.7, z: 1.0 },
  { kind: 'chest', x: -5.3, z: 5.0, rotation: 0.25 },
  { kind: 'bowGolden', x: 5.1, z: -4.3, scale: 1.15 },
];

const LIBRARY: DecorPoint[] = [
  { kind: 'bookcase', x: -5.4, z: -5.3, rotation: Math.PI / 2 },
  { kind: 'bookcase', x: -5.4, z: -1.9, rotation: Math.PI / 2 },
  { kind: 'shelfArch', x: 5.4, z: -5.1, rotation: -Math.PI / 2 },
  { kind: 'shelfBottles', x: 5.4, z: -1.8, rotation: -Math.PI / 2 },
  { kind: 'cauldron', x: -4.3, z: 3.5 },
  { kind: 'cage', x: 4.7, z: 3.8 },
  { kind: 'bookStand', x: 0, z: -4.3 },
  { kind: 'potion', x: 3.8, z: 0.3, scale: 1.4 },
  { kind: 'cobweb', x: -7.8, z: 8.6, rotation: Math.PI / 2 },
  { kind: 'cobweb2', x: 7.8, z: 8.4, rotation: -Math.PI / 2 },
];

const SHRINE: DecorPoint[] = [
  { kind: 'pedestal', x: 0, z: -5.4 },
  { kind: 'statueHorse', x: 0, z: -7.8, rotation: Math.PI },
  { kind: 'decorativeWall', x: -5.6, z: -9.2 },
  { kind: 'decorativeWall', x: 5.6, z: -9.2 },
  { kind: 'banner', x: -4.6, z: -6.6 },
  { kind: 'banner', x: 4.6, z: -6.6 },
  { kind: 'chestGold', x: 0, z: 6.4, rotation: Math.PI },
  { kind: 'candleTriple', x: -2.0, z: 4.9 },
  { kind: 'candleTriple', x: 2.0, z: 4.9 },
  { kind: 'skull', x: -3.6, z: 2.7 },
  { kind: 'skull', x: 3.6, z: 2.7, rotation: 1.4 },
];

const TRAPS: DecorPoint[] = [
  { kind: 'trapSpikes', x: -3.4, z: -2.1 },
  { kind: 'trapSpikes', x: 3.4, z: -2.1 },
  { kind: 'trapEmpty', x: 0, z: 2.2 },
  { kind: 'trapdoor', x: 0, z: 6.2 },
  { kind: 'crate', x: -5.1, z: 5.1 },
  { kind: 'barrel', x: 5.1, z: 5.1 },
  { kind: 'skull', x: -4.4, z: -5.0 },
  { kind: 'skull', x: 4.4, z: -5.0, rotation: 1.4 },
];

const PRISON: DecorPoint[] = [
  { kind: 'cage', x: -4.7, z: -4.5 },
  { kind: 'cage', x: 4.7, z: -4.5 },
  { kind: 'archBars', x: 0, z: -7.2 },
  { kind: 'bench', x: -4.5, z: 2.8, rotation: Math.PI / 2 },
  { kind: 'bench', x: 4.5, z: 2.8, rotation: -Math.PI / 2 },
  { kind: 'barrel2', x: -5.1, z: 5.3 },
  { kind: 'crate', x: 5.1, z: 5.1 },
  { kind: 'rope', x: 3.8, z: -1.0 },
  { kind: 'skull', x: -3.8, z: 0.8 },
];

const WAR_ROOM: DecorPoint[] = [
  { kind: 'tableBig', x: 0, z: -3.4 },
  { kind: 'weaponStand', x: -4.8, z: -5.0, rotation: Math.PI / 2 },
  { kind: 'weaponStand', x: 4.8, z: -5.0, rotation: -Math.PI / 2 },
  { kind: 'shieldWood', x: -4.8, z: -1.1, scale: 1.2 },
  { kind: 'swordWallMount', x: 4.8, z: -1.1, rotation: -Math.PI / 2 },
  { kind: 'bench', x: -4.2, z: 3.6, rotation: Math.PI / 2 },
  { kind: 'bench', x: 4.2, z: 3.6, rotation: -Math.PI / 2 },
  { kind: 'chest', x: 0, z: 6.0, rotation: Math.PI },
];

const RITUAL: DecorPoint[] = [
  { kind: 'pedestal', x: 0, z: -4.8 },
  { kind: 'cauldron', x: 0, z: -1.4, scale: 1.25 },
  { kind: 'candleTriple', x: -3.7, z: -2.6 },
  { kind: 'candleTriple', x: 3.7, z: -2.6 },
  { kind: 'skull', x: -3.9, z: 2.3 },
  { kind: 'skull', x: 3.9, z: 2.3, rotation: 0.8 },
  { kind: 'chestLegendary', x: 0, z: 6.2, rotation: Math.PI },
  { kind: 'cobweb', x: -6.6, z: 5.8, rotation: Math.PI / 2 },
  { kind: 'cobweb2', x: 6.6, z: 5.8, rotation: -Math.PI / 2 },
];

const STORE: DecorPoint[] = [
  { kind: 'barrelApples', x: -5.0, z: -4.6 },
  { kind: 'barrel', x: -4.1, z: -3.8 },
  { kind: 'barrel2', x: -5.0, z: -2.8 },
  { kind: 'crateWood', x: 5.0, z: -4.6 },
  { kind: 'crate', x: 4.1, z: -3.8 },
  { kind: 'chest', x: 5.0, z: -2.7 },
  { kind: 'workbench', x: -4.8, z: 3.2, rotation: Math.PI / 2 },
  { kind: 'shelfBottles', x: 4.8, z: 3.2, rotation: -Math.PI / 2 },
  { kind: 'lanternWall', x: -5.4, z: 0.2 },
  { kind: 'lanternWall', x: 5.4, z: 0.2 },
];

const CHAPEL: DecorPoint[] = [
  { kind: 'pedestal', x: 0, z: -5.3 },
  { kind: 'banner', x: -4.5, z: -5.7 },
  { kind: 'banner', x: 4.5, z: -5.7 },
  { kind: 'bench', x: -3.2, z: -1.0, rotation: 0 },
  { kind: 'bench', x: 3.2, z: -1.0, rotation: 0 },
  { kind: 'bench', x: -3.2, z: 2.3, rotation: 0 },
  { kind: 'bench', x: 3.2, z: 2.3, rotation: 0 },
  { kind: 'candleTriple', x: -2.0, z: 5.6 },
  { kind: 'candleTriple', x: 2.0, z: 5.6 },
];

const BOSS: DecorPoint[] = [
  { kind: 'column', x: -5.2, z: -5.8, scale: 1.15 },
  { kind: 'column', x: 5.2, z: -5.8, scale: 1.15 },
  { kind: 'column2', x: -5.2, z: 4.0, scale: 1.15 },
  { kind: 'column2', x: 5.2, z: 4.0, scale: 1.15 },
  { kind: 'statueHorse', x: -5.8, z: 7.2, rotation: 0.45 },
  { kind: 'statueHorse', x: 5.8, z: 7.2, rotation: -0.45 },
  { kind: 'chestLegendary', x: 0, z: 8.0, rotation: Math.PI },
  { kind: 'woodfire', x: -3.0, z: -7.2 },
  { kind: 'woodfire', x: 3.0, z: -7.2 },
  { kind: 'bannerWall', x: -4.7, z: -12.8 },
  { kind: 'bannerWall', x: 4.7, z: -12.8 },
];

const ROOM_LAYOUTS: Record<number, DecorPoint[]> = {
  1: [...architecture(), ...ARMORY],
  2: [...architecture(), ...LIBRARY],
  3: [...architecture(), ...SHRINE],
  4: [...architecture(), ...TRAPS],
  5: [...architecture(), ...PRISON],
  6: [...architecture(), ...WAR_ROOM],
  7: [...architecture(), ...RITUAL],
  8: [...architecture(), ...STORE],
  9: [...architecture(), ...CHAPEL],
  10: [...architecture(), ...BOSS],
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
  const roomNumber = Math.max(1, Math.min(10, room));
  root.name = `DungeonVeilClosedRoom-${roomNumber}`;
  const points = ROOM_LAYOUTS[roomNumber] ?? ROOM_LAYOUTS[1];
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
