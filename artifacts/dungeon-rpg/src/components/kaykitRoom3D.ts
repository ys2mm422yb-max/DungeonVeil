import { isBossRoom } from '../game/chapterRun';
import { getChapterTwoRoomProps } from '../game/kaykitRoomChapter2';
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
  platformFloor: 'floor_tile_large.gltf', stairs: 'stairs_wide.gltf', wallPillar: 'wall_pillar.gltf', pillarDecorated: 'pillar_decorated.gltf', arch: 'wall_arched.gltf', rubble: 'rubble_large.gltf', halfBarrier: 'barrier_half.gltf',
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
  const roomKey = Math.max(1, Math.min(20, room));
  const placements = getChapterTwoRoomProps(roomKey) ?? KAYKIT_ROOM_PROPS[roomKey] ?? KAYKIT_ROOM_PROPS[1];
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

function buildSideGalleries(root: any, room: number, left: number, right: number, top: number, depth: Record<keyof typeof DEPTH_ASSETS, any>) {
  const chapterTwo = room >= 11;
  const galleryY = chapterTwo ? 0.82 : room >= 7 ? 0.72 : 0.56;
  const sideScale = isBossRoom(room) ? 1.18 : chapterTwo ? 1.08 : room >= 7 ? 1.05 : 0.94;
  const zSets = room <= 2 ? [-8.5, 5.5] : room <= 5 ? [-10.2, -1.2, 7.4] : room <= 8 ? [-9.2, 1.0, 8.0] : room <= 10 ? [-10.0, -3.0, 4.5] : [-10.6, -4.2, 2.2, 8.4];

  for (const side of [-1, 1]) {
    const edge = side < 0 ? left - 2.6 : right + 2.6;
    const railX = side < 0 ? left - 0.62 : right + 0.62;
    const rotation = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    for (let index = 0; index < zSets.length; index++) {
      const z = zSets[index];
      addObject(root, depth.platformFloor, edge, galleryY, z, index % 2 ? Math.PI / 2 : 0, sideScale);
      addObject(root, depth.halfBarrier, railX, galleryY + 0.04, z, rotation, sideScale);
      addObject(root, depth.wallPillar, edge + side * 0.4, galleryY * 0.5, z - 1.05, rotation, sideScale * 0.92);
      if ((room + index) % 2 === 0) addObject(root, depth.rubble, edge - side * 0.45, galleryY + 0.02, z + 0.85, rotation, 0.72 * sideScale);
    }
  }

  if (room >= 6) {
    addObject(root, depth.pillarDecorated, left - 2.45, galleryY, top + 5.2, Math.PI / 2, chapterTwo ? 1.22 : 1.12);
    addObject(root, depth.pillarDecorated, right + 2.45, galleryY, top + 5.2, -Math.PI / 2, chapterTwo ? 1.22 : 1.12);
  }
}

function buildDepthZones(root: any, room: number, mapWidth: number, mapHeight: number, depth: Record<keyof typeof DEPTH_ASSETS, any>) {
  const left = -mapWidth / 2 + 0.45;
  const right = mapWidth / 2 - 0.45;
  const top = -mapHeight / 2 + 0.45;
  const bottom = mapHeight / 2 - 0.45;
  const bossRoom = isBossRoom(room);
  const chapterTwo = room >= 11;
  const platformY = bossRoom ? 1.1 : chapterTwo ? 0.9 : 0.78;
  const platformZ = top - 3.4;
  const platformScale = bossRoom ? 1.18 : chapterTwo ? 1.12 : room >= 7 ? 1.08 : 1;

  for (let x = left + 2; x <= right - 2; x += 4) addObject(root, depth.platformFloor, x, platformY, platformZ, ((Math.round(x) + room) & 1) ? Math.PI / 2 : 0, platformScale);
  for (let x = left + 1.2; x < right - 1.2; x += 2.35) {
    if (Math.abs(x) < 2.15) continue;
    addObject(root, depth.wallPillar, x, platformY * 0.46, top - 1.25, 0, bossRoom ? 1.18 : chapterTwo ? 1.08 : 1);
  }
  addObject(root, depth.stairs, 0, 0, top - 1.2, Math.PI, bossRoom ? 1.24 : chapterTwo ? 1.12 : 1.05);
  addObject(root, depth.arch, 0, platformY, platformZ - 0.55, 0, bossRoom ? 1.35 : chapterTwo ? 1.2 : 1.08);

  const pillarXs = bossRoom ? [-8.2, -5.1, 5.1, 8.2] : chapterTwo ? [-7.8, -5.5, 5.5, 7.8] : [-7.2, 7.2];
  for (const x of pillarXs) {
    if (x <= left || x >= right) continue;
    addObject(root, depth.pillarDecorated, x, platformY, platformZ + 0.15, 0, bossRoom ? 1.32 : chapterTwo ? 1.18 : 1.08);
  }

  buildSideGalleries(root, room, left, right, top, depth);

  if (room >= 6) {
    addObject(root, depth.rubble, left - 0.45, 0, top + 4.2, Math.PI / 2, chapterTwo ? 1.22 : 1.1);
    addObject(root, depth.rubble, right + 0.45, 0, top + 4.2, -Math.PI / 2, chapterTwo ? 1.22 : 1.1);
  }

  if ([3, 7, 9, 10, 13, 15, 17, 19, 20].includes(room)) {
    addObject(root, depth.pillarDecorated, left + 1.15, -0.05, bottom + 1.15, Math.PI, bossRoom ? 1.35 : chapterTwo ? 1.28 : 1.2);
    addObject(root, depth.pillarDecorated, right - 1.15, -0.05, bottom + 1.15, Math.PI, bossRoom ? 1.35 : chapterTwo ? 1.28 : 1.2);
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
    const bossRoom = isBossRoom(room);
    addObject(root, wallColumn, -1.65, 0, top, 0, bossRoom ? 1.24 : 1.05);
    addObject(root, wallColumn, 1.65, 0, top, 0, bossRoom ? 1.24 : 1.05);
    const torch = roomAsset('torchMounted');
    addObject(root, torch, -1.7, 0, top + 0.18, Math.PI, bossRoom ? 1.2 : 1);
    addObject(root, torch, 1.7, 0, top + 0.18, Math.PI, bossRoom ? 1.2 : 1);

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
