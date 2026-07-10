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

type LoadedAsset = { scene: any };
const cache = new Map<KayKitRoomAsset, Promise<LoadedAsset>>();

async function gltfLoader() {
  const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
  return new GLTFLoader();
}

async function loadAsset(asset: KayKitRoomAsset) {
  if (!cache.has(asset)) cache.set(asset, (async () => (await gltfLoader()).loadAsync(`${DUNGEON_ROOT}${ROOM_ASSETS[asset]}`))());
  return cache.get(asset)!;
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
  await Promise.all([...required].map(asset => loadAsset(asset)));
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

/** Neutral shell only. Room identity and internal architecture are authored in roomArchitectureLayout. */
export function buildKayKitDungeonRoom(THREE: any, room: number, mapWidth: number, mapHeight: number) {
  const root = new THREE.Group();
  root.name = `KayKitDungeonRoom${room}`;
  let active = true;
  const { placements, required } = requiredAssets(room);

  const ready = Promise.all([...required].map(async asset => [`room:${asset}`, await loadAsset(asset)] as const)).then(entries => {
    if (!active) return;
    const loaded = new Map(entries);
    for (const [, gltf] of entries) prepare(gltf.scene);
    const roomAsset = (asset: KayKitRoomAsset) => loaded.get(`room:${asset}`)!.scene;

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
