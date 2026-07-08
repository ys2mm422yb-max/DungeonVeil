const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const DUNGEON_ROOT = '/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/';

const ROOM_ASSETS = {
  floor: 'floor_dirt_large.gltf',
  wall: 'barrier.gltf',
  wallHalf: 'barrier_half.gltf',
  corner: 'barrier_corner.gltf',
  wallColumn: 'barrier_column.gltf',
  column: 'column.gltf',
  bannerRed: 'banner_patternA_red.gltf',
  bannerBlue: 'banner_patternA_blue.gltf',
  bannerGreen: 'banner_patternA_green.gltf',
  barrel: 'barrel_large.gltf',
  barrelDecorated: 'barrel_large_decorated.gltf',
  barrelStack: 'barrel_small_stack.gltf',
  crates: 'crates_stacked.gltf',
  boxLarge: 'box_large.gltf',
  chest: 'chest.gltf',
  chestGold: 'chest_gold.gltf',
  candle: 'candle_lit.gltf',
  chair: 'chair.gltf',
  bed: 'bed_decorated.gltf',
} as const;

type AssetKey = keyof typeof ROOM_ASSETS;
type LoadedAsset = { scene: any };

type Placement = {
  asset: AssetKey;
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
};

const ROOM_PROPS: Record<number, Placement[]> = {
  1: [
    { asset: 'crates', x: -6.2, z: -5.8 },
    { asset: 'barrelStack', x: -5.2, z: -4.4 },
    { asset: 'barrelDecorated', x: 5.8, z: -5.4 },
    { asset: 'boxLarge', x: 5.0, z: -3.8 },
    { asset: 'bannerRed', x: -6.7, z: -1.3, rotation: Math.PI / 2 },
    { asset: 'bannerRed', x: 6.7, z: -1.3, rotation: -Math.PI / 2 },
    { asset: 'chest', x: 5.6, z: 4.7, rotation: Math.PI },
    { asset: 'candle', x: -5.7, z: 4.8 },
  ],
  2: [
    { asset: 'column', x: -4.8, z: -4.8 }, { asset: 'column', x: 4.8, z: -4.8 },
    { asset: 'column', x: -4.8, z: 3.8 }, { asset: 'column', x: 4.8, z: 3.8 },
    { asset: 'bannerBlue', x: -6.7, z: -0.5, rotation: Math.PI / 2 },
    { asset: 'bannerBlue', x: 6.7, z: -0.5, rotation: -Math.PI / 2 },
    { asset: 'chest', x: 0, z: 5.2, rotation: Math.PI },
  ],
  3: [
    { asset: 'barrel', x: -5.5, z: -5.6 }, { asset: 'barrel', x: -4.4, z: -5.0 },
    { asset: 'barrelDecorated', x: 5.4, z: -5.4 }, { asset: 'crates', x: 4.6, z: -3.8 },
    { asset: 'candle', x: -5.8, z: 2.8 }, { asset: 'candle', x: 5.8, z: 2.8 },
    { asset: 'chestGold', x: 0, z: 5.3, rotation: Math.PI },
  ],
  4: [
    { asset: 'bed', x: -5.3, z: -4.5, rotation: Math.PI / 2 },
    { asset: 'bed', x: 5.3, z: -4.5, rotation: -Math.PI / 2 },
    { asset: 'chair', x: -5.2, z: 2.2, rotation: Math.PI / 2 },
    { asset: 'chair', x: 5.2, z: 2.2, rotation: -Math.PI / 2 },
    { asset: 'bannerGreen', x: 0, z: -8.2, rotation: Math.PI },
    { asset: 'chest', x: 0, z: 5.4, rotation: Math.PI },
  ],
  5: [
    { asset: 'column', x: -5.0, z: -5.3 }, { asset: 'column', x: 5.0, z: -5.3 },
    { asset: 'column', x: -5.0, z: 2.8 }, { asset: 'column', x: 5.0, z: 2.8 },
    { asset: 'bannerRed', x: -2.0, z: -8.2, rotation: Math.PI },
    { asset: 'bannerRed', x: 2.0, z: -8.2, rotation: Math.PI },
    { asset: 'chestGold', x: 0, z: 5.2, rotation: Math.PI },
  ],
  6: [
    { asset: 'crates', x: -5.3, z: -5.5 }, { asset: 'boxLarge', x: -4.2, z: -4.1 },
    { asset: 'barrelStack', x: 5.3, z: -5.4 }, { asset: 'barrel', x: 4.4, z: -4.0 },
    { asset: 'crates', x: -5.2, z: 3.7 }, { asset: 'barrelDecorated', x: 5.1, z: 3.8 },
    { asset: 'chest', x: 0, z: 5.2, rotation: Math.PI },
  ],
  7: [
    { asset: 'column', x: -5.6, z: -5.4 }, { asset: 'column', x: 5.6, z: -5.4 },
    { asset: 'bannerBlue', x: -6.7, z: -0.8, rotation: Math.PI / 2 },
    { asset: 'bannerBlue', x: 6.7, z: -0.8, rotation: -Math.PI / 2 },
    { asset: 'candle', x: -3.0, z: 4.7 }, { asset: 'candle', x: 3.0, z: 4.7 },
    { asset: 'chestGold', x: 0, z: 5.4, rotation: Math.PI },
  ],
  8: [
    { asset: 'bed', x: -5.4, z: -5.0, rotation: Math.PI / 2 },
    { asset: 'chair', x: -5.2, z: -2.5, rotation: Math.PI / 2 },
    { asset: 'crates', x: 5.2, z: -5.1 }, { asset: 'barrelStack', x: 5.0, z: -3.4 },
    { asset: 'bannerGreen', x: 0, z: -8.2, rotation: Math.PI },
    { asset: 'chest', x: 0, z: 5.3, rotation: Math.PI },
  ],
  9: [
    { asset: 'column', x: -5.2, z: -4.5 }, { asset: 'column', x: 5.2, z: -4.5 },
    { asset: 'column', x: -5.2, z: 3.4 }, { asset: 'column', x: 5.2, z: 3.4 },
    { asset: 'bannerRed', x: -2.3, z: -8.2, rotation: Math.PI },
    { asset: 'bannerRed', x: 2.3, z: -8.2, rotation: Math.PI },
    { asset: 'candle', x: -2.2, z: 5.0 }, { asset: 'candle', x: 2.2, z: 5.0 },
  ],
  10: [
    { asset: 'column', x: -5.5, z: -5.5, scale: 1.15 }, { asset: 'column', x: 5.5, z: -5.5, scale: 1.15 },
    { asset: 'column', x: -5.5, z: 3.8, scale: 1.15 }, { asset: 'column', x: 5.5, z: 3.8, scale: 1.15 },
    { asset: 'bannerRed', x: -3.0, z: -8.2, rotation: Math.PI },
    { asset: 'bannerRed', x: 0, z: -8.2, rotation: Math.PI },
    { asset: 'bannerRed', x: 3.0, z: -8.2, rotation: Math.PI },
    { asset: 'chestGold', x: 0, z: 5.4, rotation: Math.PI, scale: 1.2 },
  ],
};

const cache = new Map<AssetKey, Promise<LoadedAsset>>();

async function loadAsset(asset: AssetKey) {
  if (!cache.has(asset)) {
    cache.set(asset, (async () => {
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      return loader.loadAsync(`${DUNGEON_ROOT}${ROOM_ASSETS[asset]}`);
    })());
  }
  return cache.get(asset)!;
}

function prepare(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
  });
}

function addClone(group: any, prototype: any, placement: Placement) {
  const object = prototype.clone(true);
  object.position.set(placement.x, 0, placement.z);
  object.rotation.y = placement.rotation ?? 0;
  object.scale.setScalar(placement.scale ?? 1);
  group.add(object);
}

export function buildKayKitDungeonRoom(THREE: any, room: number, mapWidth: number, mapHeight: number) {
  const root = new THREE.Group();
  root.name = `KayKitDungeonRoom${room}`;
  let active = true;

  const required = new Set<AssetKey>(['floor', 'wall', 'corner', 'wallColumn']);
  for (const placement of ROOM_PROPS[room] ?? ROOM_PROPS[1]) required.add(placement.asset);

  Promise.all([...required].map(async asset => [asset, await loadAsset(asset)] as const)).then(entries => {
    if (!active) return;
    const loaded = new Map(entries);
    for (const [, gltf] of entries) prepare(gltf.scene);

    const floor = loaded.get('floor')!.scene;
    const floorStep = 4;
    for (let z = -mapHeight / 2 + floorStep / 2; z < mapHeight / 2; z += floorStep) {
      for (let x = -mapWidth / 2 + floorStep / 2; x < mapWidth / 2; x += floorStep) {
        addClone(root, floor, { asset: 'floor', x, z });
      }
    }

    const wall = loaded.get('wall')!.scene;
    const wallStep = 2;
    const left = -mapWidth / 2 + 0.45;
    const right = mapWidth / 2 - 0.45;
    const top = -mapHeight / 2 + 0.45;
    const bottom = mapHeight / 2 - 0.45;

    for (let x = left + wallStep; x < right - wallStep; x += wallStep) {
      if (Math.abs(x) > 1.25) addClone(root, wall, { asset: 'wall', x, z: top });
      addClone(root, wall, { asset: 'wall', x, z: bottom, rotation: Math.PI });
    }
    for (let z = top + wallStep; z < bottom - wallStep; z += wallStep) {
      addClone(root, wall, { asset: 'wall', x: left, z, rotation: Math.PI / 2 });
      addClone(root, wall, { asset: 'wall', x: right, z, rotation: -Math.PI / 2 });
    }

    const corner = loaded.get('corner')!.scene;
    addClone(root, corner, { asset: 'corner', x: left, z: top, rotation: Math.PI / 2 });
    addClone(root, corner, { asset: 'corner', x: right, z: top, rotation: Math.PI });
    addClone(root, corner, { asset: 'corner', x: right, z: bottom, rotation: -Math.PI / 2 });
    addClone(root, corner, { asset: 'corner', x: left, z: bottom });

    const wallColumn = loaded.get('wallColumn')!.scene;
    for (const x of [-4, 4]) {
      addClone(root, wallColumn, { asset: 'wallColumn', x, z: top });
      addClone(root, wallColumn, { asset: 'wallColumn', x, z: bottom, rotation: Math.PI });
    }

    for (const placement of ROOM_PROPS[room] ?? ROOM_PROPS[1]) {
      const prototype = loaded.get(placement.asset)?.scene;
      if (prototype) addClone(root, prototype, placement);
    }
  }).catch(error => console.error('KayKit dungeon room failed', error));

  root.userData.dispose = () => { active = false; };
  return root;
}
