import { KAYKIT_ROOM_PROPS, type KayKitRoomAsset, type KayKitRoomPlacement } from '../game/kaykitRoomLayout';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const DUNGEON_ROOT = '/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

const ROOM_ASSETS: Record<KayKitRoomAsset, string> = {
  floor: 'floor_tile_large.gltf',
  wall: 'barrier.gltf',
  wallHalf: 'barrier_half.gltf',
  corner: 'barrier_corner.gltf',
  wallColumn: 'barrier_column.gltf',
  column: 'column.gltf',
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
  torchMounted: 'torch_mounted.gltf',
  wallShelves: 'wall_shelves.gltf',
  swordShield: 'sword_shield.gltf',
  tableLong: 'table_long_decorated_A.gltf',
  tableMedium: 'table_medium_decorated_A.gltf',
  bannerRed: 'banner_patternC_red.gltf',
  bannerShieldRed: 'banner_shield_red.gltf',
  bannerBlue: 'banner_patternB_blue.gltf',
  bannerGreen: 'banner_patternA_green.gltf',
};

type LoadedAsset = { scene: any };
const cache = new Map<KayKitRoomAsset, Promise<LoadedAsset>>();

async function loadAsset(asset: KayKitRoomAsset) {
  if (!cache.has(asset)) {
    cache.set(asset, (async () => {
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      return loader.loadAsync(`${DUNGEON_ROOT}${ROOM_ASSETS[asset]}`);
    })());
  }
  return cache.get(asset)!;
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

function addClone(group: any, prototype: any, placement: KayKitRoomPlacement) {
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
  const { placements, required } = requiredAssets(room);

  Promise.all([...required].map(async asset => [asset, await loadAsset(asset)] as const)).then(entries => {
    if (!active) return;
    const loaded = new Map(entries);
    for (const [, gltf] of entries) prepare(gltf.scene);

    const floor = loaded.get('floor')!.scene;
    const floorStep = 4;
    for (let z = -mapHeight / 2 + floorStep / 2; z < mapHeight / 2; z += floorStep) {
      for (let x = -mapWidth / 2 + floorStep / 2; x < mapWidth / 2; x += floorStep) {
        const variantRotation = ((Math.floor(x / floorStep) + Math.floor(z / floorStep) + room) & 1) ? Math.PI / 2 : 0;
        addClone(root, floor, { asset: 'floor', x, z, rotation: variantRotation });
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

    // Der Ausgang hat jetzt immer einen festen architektonischen Rahmen.
    // Das aktive violette Portal sitzt später exakt zwischen diesen beiden Säulen.
    addClone(root, wallColumn, { asset: 'wallColumn', x: -1.65, z: top, scale: room === 10 ? 1.2 : 1.05 });
    addClone(root, wallColumn, { asset: 'wallColumn', x: 1.65, z: top, scale: room === 10 ? 1.2 : 1.05 });
    const torch = loaded.get('torchMounted')?.scene;
    if (torch) {
      addClone(root, torch, { asset: 'torchMounted', x: -1.7, z: top + 0.18, rotation: Math.PI, scale: room === 10 ? 1.15 : 1 });
      addClone(root, torch, { asset: 'torchMounted', x: 1.7, z: top + 0.18, rotation: Math.PI, scale: room === 10 ? 1.15 : 1 });
    }

    for (const placement of placements) {
      const prototype = loaded.get(placement.asset)?.scene;
      if (prototype) addClone(root, prototype, placement);
    }
  }).catch(error => console.error('KayKit dungeon room failed', error));

  root.userData.dispose = () => { active = false; };
  return root;
}
