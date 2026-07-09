import { KAYKIT_ROOM_PROPS, type KayKitRoomAsset, type KayKitRoomPlacement } from '../game/kaykitRoomLayout';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const DUNGEON_ROOT = '/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

const ROOM_ASSETS: Record<KayKitRoomAsset, string> = {
  floor: 'floor_tile_large.gltf', wall: 'barrier.gltf', wallHalf: 'barrier_half.gltf', corner: 'barrier_corner.gltf', wallColumn: 'barrier_column.gltf', column: 'column.gltf',
  barrel: 'barrel_large.gltf', barrelDecorated: 'barrel_large_decorated.gltf', barrelStack: 'barrel_small_stack.gltf', crates: 'crates_stacked.gltf', boxLarge: 'box_large.gltf',
  chest: 'chest.gltf', chestGold: 'chest_gold.gltf', candle: 'candle_lit.gltf', chair: 'chair.gltf', bed: 'bed_decorated.gltf', torchMounted: 'torch_mounted.gltf',
  wallShelves: 'wall_shelves.gltf', swordShield: 'sword_shield.gltf', tableLong: 'table_long_decorated_A.gltf', tableMedium: 'table_medium_decorated_A.gltf',
  bannerRed: 'banner_patternC_red.gltf', bannerShieldRed: 'banner_shield_red.gltf', bannerBlue: 'banner_patternB_blue.gltf', bannerGreen: 'banner_patternA_green.gltf',
};

const DEPTH_ASSETS = {
  platformFloor: 'floor_tile_large.gltf', stairs: 'stairs_wide.gltf', wallPillar: 'wall_pillar.gltf', pillarDecorated: 'pillar_decorated.gltf', arch: 'wall_arched.gltf', rubble: 'rubble_large.gltf',
} as const;

type LoadedAsset = { scene: any };
const cache = new Map<KayKitRoomAsset, Promise<LoadedAsset>>();
const depthCache = new Map<string, Promise<LoadedAsset>>();

async function gltfLoader() {
  const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
  return new GLTFLoader();
}

async function loadAsset(asset: KayKitRoomAsset) {
  if (!cache.has(asset)) cache.set(asset, (async () => (await gltfLoader()).loadAsync(`${DUNGEON_ROOT}${ROOM_ASSETS[asset]}`))());
  return cache.get(asset)!;
}

async function loadDepthAsset(name: keyof typeof DEPTH_ASSETS) {
  if (!depthCache.has(name)) depthCache.set(name, (async () => (await gltfLoader()).loadAsync(`${DUNGEON_ROOT}${DEPTH_ASSETS[name]}`))());
  return depthCache.get(name)!;
}

function requiredAssets(room: number) {
  const roomKey = Math.max(1, Math.min(10, room));
  const placements = KAYKIT_ROOM_PROPS[roomKey] ?? KAYKIT_ROOM_PROPS[1];
  const required = new Set<KayKitRoomAsset>(['floor', 'wall', 'corner', 'wallColumn', 'torchMounted']);
  for (const placement of placements) required.add(placement.asset);
  return { placements, required };
}

export async function preloadKayKitDungeonRoom(room: number) {
  const { required } = requiredAssets(room);
  await Promise.all([
    ...[...required].map(asset => loadAsset(asset)),
    ...Object.keys(DEPTH_ASSETS).map(name => loadDepthAsset(name as keyof typeof DEPTH_ASSETS)),
  ]);
}

function keepCachedResource(resource: any) {
  if (!resource || resource.userData?.kayKitPersistent) return;
  resource.userData = { ...(resource.userData ?? {}), kayKitPersistent: true };
  resource.dispose = () => undefined;
}

function prepare(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    keepCachedResource(node.geometry);
    if (Array.isArray(node.material)) node.material.forEach(keepCachedResource);
    else keepCachedResource(node.material);
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = true;
    node.frustumCulled = true;
  });
}

function addObject(group: any, prototype: any, x: number, y: number, z: number, rotation = 0, scale = 1) {
  const object = prototype.clone(true);
  object.position.set(x, y, z);
  object.rotation.y = rotation;
  object.scale.setScalar(scale);
  group.add(object);
  return object;
}

function addClone(group: any, prototype: any, placement: KayKitRoomPlacement) {
  return addObject(group, prototype, placement.x, 0, placement.z, placement.rotation ?? 0, placement.scale ?? 1);
}

function buildDepthZones(root: any, room: number, mapWidth: number, mapHeight: number, depth: Record<keyof typeof DEPTH_ASSETS, any>) {
  const left = -mapWidth / 2 + 0.45;
  const right = mapWidth / 2 - 0.45;
  const top = -mapHeight / 2 + 0.45;
  const bottom = mapHeight / 2 - 0.45;
  const platformY = room === 10 ? 1.05 : 0.78;
  const platformZ = top - 3.4;
  const platformScale = room >= 7 ? 1.08 : 1;

  for (let x = left + 2; x <= right - 2; x += 4) addObject(root, depth.platformFloor, x, platformY, platformZ, ((Math.round(x) + room) & 1) ? Math.PI / 2 : 0, platformScale);
  for (let x = left + 1.2; x < right - 1.2; x += 2.35) {
    if (Math.abs(x) < 2.15) continue;
    addObject(root, depth.wallPillar, x, platformY * 0.46, top - 1.25, 0, room === 10 ? 1.12 : 1);
  }
  addObject(root, depth.stairs, 0, 0, top - 1.2, Math.PI, room === 10 ? 1.2 : 1.05);
  addObject(root, depth.arch, 0, platformY, platformZ - 0.55, 0, room === 10 ? 1.28 : 1.08);

  const pillarXs = room === 10 ? [-8.2, -5.1, 5.1, 8.2] : [-7.2, 7.2];
  for (const x of pillarXs) {
    if (x <= left || x >= right) continue;
    addObject(root, depth.pillarDecorated, x, platformY, platformZ + 0.15, 0, room === 10 ? 1.28 : 1.08);
  }

  if (room >= 6) {
    addObject(root, depth.rubble, left - 0.45, 0, top + 4.2, Math.PI / 2, 1.1);
    addObject(root, depth.rubble, right + 0.45, 0, top + 4.2, -Math.PI / 2, 1.1);
  }

  if (room === 3 || room === 7 || room === 9 || room === 10) {
    addObject(root, depth.pillarDecorated, left + 1.15, -0.05, bottom + 1.15, Math.PI, 1.2);
    addObject(root, depth.pillarDecorated, right - 1.15, -0.05, bottom + 1.15, Math.PI, 1.2);
  }
}

export function buildKayKitDungeonRoom(THREE: any, room: number, mapWidth: number, mapHeight: number) {
  const root = new THREE.Group();
  root.name = `KayKitDungeonRoom${room}`;
  let active = true;
  const { placements, required } = requiredAssets(room);

  const ready = Promise.all([
    ...[...required].map(async asset => [`room:${asset}`, await loadAsset(asset)] as const),
    ...Object.keys(DEPTH_ASSETS).map(async name => [`depth:${name}`, await loadDepthAsset(name as keyof typeof DEPTH_ASSETS)] as const),
  ]).then(entries => {
    if (!active) return;
    const loaded = new Map(entries);
    for (const [, gltf] of entries) prepare(gltf.scene);

    const roomAsset = (asset: KayKitRoomAsset) => loaded.get(`room:${asset}`)!.scene;
    const depthAsset = (asset: keyof typeof DEPTH_ASSETS) => loaded.get(`depth:${asset}`)!.scene;
    const depth = Object.fromEntries(Object.keys(DEPTH_ASSETS).map(name => [name, depthAsset(name as keyof typeof DEPTH_ASSETS)])) as Record<keyof typeof DEPTH_ASSETS, any>;

    const floor = roomAsset('floor');
    const floorStep = 4;
    for (let z = -mapHeight / 2 + floorStep / 2; z < mapHeight / 2; z += floorStep) {
      for (let x = -mapWidth / 2 + floorStep / 2; x < mapWidth / 2; x += floorStep) {
        const variantRotation = ((Math.floor(x / floorStep) + Math.floor(z / floorStep) + room) & 1) ? Math.PI / 2 : 0;
        addObject(root, floor, x, 0, z, variantRotation);
      }
    }

    const wall = roomAsset('wall');
    const wallStep = 2;
    const left = -mapWidth / 2 + 0.45;
    const right = mapWidth / 2 - 0.45;
    const top = -mapHeight / 2 + 0.45;
    const bottom = mapHeight / 2 - 0.45;

    for (let x = left + wallStep; x < right - wallStep; x += wallStep) {
      if (Math.abs(x) > 1.25) addObject(root, wall, x, 0, top);
      addObject(root, wall, x, 0, bottom, Math.PI);
    }
    for (let z = top + wallStep; z < bottom - wallStep; z += wallStep) {
      addObject(root, wall, left, 0, z, Math.PI / 2);
      addObject(root, wall, right, 0, z, -Math.PI / 2);
    }

    const corner = roomAsset('corner');
    addObject(root, corner, left, 0, top, Math.PI / 2);
    addObject(root, corner, right, 0, top, Math.PI);
    addObject(root, corner, right, 0, bottom, -Math.PI / 2);
    addObject(root, corner, left, 0, bottom);

    const wallColumn = roomAsset('wallColumn');
    for (const x of [-4, 4]) {
      addObject(root, wallColumn, x, 0, top);
      addObject(root, wallColumn, x, 0, bottom, Math.PI);
    }

    buildDepthZones(root, room, mapWidth, mapHeight, depth);
    addObject(root, wallColumn, -1.65, 0, top, 0, room === 10 ? 1.2 : 1.05);
    addObject(root, wallColumn, 1.65, 0, top, 0, room === 10 ? 1.2 : 1.05);
    const torch = roomAsset('torchMounted');
    addObject(root, torch, -1.7, 0, top + 0.18, Math.PI, room === 10 ? 1.15 : 1);
    addObject(root, torch, 1.7, 0, top + 0.18, Math.PI, room === 10 ? 1.15 : 1);

    for (const placement of placements) {
      const prototype = loaded.get(`room:${placement.asset}`)?.scene;
      if (prototype) addClone(root, prototype, placement);
    }
  }).catch(error => {
    console.error('KayKit dungeon room failed', error);
    throw error;
  });

  root.userData.ready = ready;
  root.userData.dispose = () => { active = false; };
  return root;
}
