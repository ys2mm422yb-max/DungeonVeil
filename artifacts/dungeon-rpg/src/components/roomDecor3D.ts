export type RoomDecorAssetMap = Record<string, any>;

type DecorPoint = {
  kind: string;
  x: number;
  z: number;
  scale?: number;
  rotation?: number;
};

type AssetSpec = {
  kind: string;
  format: 'obj' | 'gltf';
  file: string;
  targetSize: number;
};

const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const ROOM_ROOT = '/assets/3d/rooms/';

const ASSET_SPECS: AssetSpec[] = [
  { kind: 'arch', format: 'obj', file: 'Arch', targetSize: 4.4 },
  { kind: 'archDoor', format: 'obj', file: 'Arch_Door', targetSize: 4.4 },
  { kind: 'wall', format: 'obj', file: 'Wall_Modular', targetSize: 4.2 },
  { kind: 'wallCover', format: 'obj', file: 'Wallcover_Modular', targetSize: 4.2 },
  { kind: 'torch', format: 'obj', file: 'Torch', targetSize: 1.8 },
  { kind: 'woodfire', format: 'obj', file: 'Woodfire', targetSize: 1.4 },
  { kind: 'vase', format: 'obj', file: 'Vase', targetSize: 0.9 },
  { kind: 'trapdoor', format: 'obj', file: 'Trapdoor', targetSize: 2.2 },
  { kind: 'weaponStand', format: 'gltf', file: 'WeaponStand.gltf', targetSize: 2.3 },
  { kind: 'workbench', format: 'gltf', file: 'Workbench.gltf', targetSize: 2.4 },
];

const ROOM_LAYOUTS: Record<number, DecorPoint[]> = {
  1: [
    { kind: 'arch', x: 0, z: -10.7, scale: 1.0 },
    { kind: 'wall', x: -5.7, z: -9.2, scale: 1.0, rotation: 0.05 },
    { kind: 'wall', x: 5.7, z: -9.2, scale: 1.0, rotation: -0.05 },
    { kind: 'torch', x: -3.2, z: -9.5, scale: 0.9 },
    { kind: 'torch', x: 3.2, z: -9.5, scale: 0.9 },
    { kind: 'woodfire', x: -6.4, z: -5.5, scale: 0.9 },
    { kind: 'weaponStand', x: 6.3, z: -5.3, scale: 0.95, rotation: -0.22 },
  ],
  2: [
    { kind: 'archDoor', x: 0, z: -10.5, scale: 1.0 },
    { kind: 'wall', x: -6.2, z: -8.0, scale: 1.0, rotation: Math.PI / 2 },
    { kind: 'wallCover', x: 6.1, z: -7.8, scale: 1.0, rotation: Math.PI / 2 },
    { kind: 'vase', x: -3.8, z: -5.5, scale: 0.9 },
    { kind: 'vase', x: 3.7, z: -5.2, scale: 0.75 },
    { kind: 'torch', x: -4.7, z: -8.8, scale: 0.9 },
    { kind: 'torch', x: 4.7, z: -8.8, scale: 0.9 },
  ],
  3: [
    { kind: 'woodfire', x: 0, z: -6.2, scale: 1.1 },
    { kind: 'weaponStand', x: -6.7, z: -5.8, scale: 1.0, rotation: Math.PI / 2 },
    { kind: 'weaponStand', x: 6.7, z: -5.8, scale: 1.0, rotation: -Math.PI / 2 },
    { kind: 'workbench', x: -4.3, z: -8.9, scale: 0.95, rotation: 0.12 },
    { kind: 'workbench', x: 4.3, z: -8.9, scale: 0.95, rotation: -0.12 },
    { kind: 'torch', x: -2.3, z: -9.6, scale: 0.9 },
    { kind: 'torch', x: 2.3, z: -9.6, scale: 0.9 },
  ],
  4: [
    { kind: 'arch', x: 0, z: -10.5, scale: 1.08 },
    { kind: 'wall', x: -6.3, z: -8.1, scale: 1.05, rotation: Math.PI / 2 },
    { kind: 'wall', x: 6.3, z: -8.1, scale: 1.05, rotation: Math.PI / 2 },
    { kind: 'trapdoor', x: 0, z: -4.1, scale: 1.25 },
    { kind: 'torch', x: -4.2, z: -7.5, scale: 1.0 },
    { kind: 'torch', x: 4.2, z: -7.5, scale: 1.0 },
    { kind: 'vase', x: -5.2, z: -4.5, scale: 0.85 },
    { kind: 'vase', x: 5.2, z: -4.5, scale: 0.85 },
  ],
};

const assetCache = new Map<string, Promise<any | null>>();

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

async function loadAsset(THREE: any, spec: AssetSpec) {
  const key = `${spec.format}:${spec.file}`;
  let pending = assetCache.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        if (spec.format === 'obj') {
          const [{ OBJLoader }, { MTLLoader }] = await Promise.all([
            import(/* @vite-ignore */ OBJ_URL),
            import(/* @vite-ignore */ MTL_URL),
          ]) as any;
          const materials = await new MTLLoader().loadAsync(`${ROOM_ROOT}${spec.file}.mtl`);
          materials.preload();
          const loader = new OBJLoader();
          loader.setMaterials(materials);
          const object = await loader.loadAsync(`${ROOM_ROOT}${spec.file}.obj`);
          return normalizeAsset(THREE, object, spec.targetSize);
        }

        const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
        const gltf = await new GLTFLoader().loadAsync(`${ROOM_ROOT}${spec.file}`);
        return normalizeAsset(THREE, gltf.scene, spec.targetSize);
      } catch (error) {
        console.warn(`Room asset unavailable: ${spec.file}`, error);
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
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  return object;
}

export function buildChapterRoomDecor(THREE: any, room: number, assets: RoomDecorAssetMap = {}) {
  const root = new THREE.Group();
  root.name = `DungeonVeilRoomDecor-${room}`;
  const points = ROOM_LAYOUTS[Math.max(1, Math.min(4, room))] ?? ROOM_LAYOUTS[1];
  let active = true;

  const renderAvailable = (available: RoomDecorAssetMap) => {
    if (!active) return;
    for (const point of points) {
      const source = available[point.kind];
      if (!source) continue;
      root.add(cloneAsset(source, point));
    }
  };

  renderAvailable(assets);

  const missingKinds = [...new Set(points.map(point => point.kind).filter(kind => !assets[kind]))];
  Promise.all(
    missingKinds.map(async kind => {
      const spec = ASSET_SPECS.find(candidate => candidate.kind === kind);
      if (!spec) return [kind, null] as const;
      return [kind, await loadAsset(THREE, spec)] as const;
    }),
  ).then(entries => {
    if (!active) return;
    renderAvailable(Object.fromEntries(entries.filter(([, object]) => object)));
  });

  root.userData.update = (_now: number) => {};
  root.userData.dispose = () => { active = false; };
  return root;
}
