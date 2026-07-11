import { isBossRoom } from '../game/chapterRun';
import { roomBibleSpec, type RoomBibleSpec } from '../game/roomBible';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const DUNGEON_ROOT = '/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

const ASSETS = {
  floor: 'floor_tile_large.gltf',
  floorBroken: 'floor_tile_large_rocks.gltf',
  wall: 'wall.gltf',
  wallBroken: 'wall_broken.gltf',
  wallCracked: 'wall_cracked.gltf',
  corner: 'wall_corner.gltf',
  wallColumn: 'wall_pillar.gltf',
  torch: 'torch_mounted.gltf',
  pillar: 'pillar_decorated.gltf',
  column: 'column.gltf',
  rubble: 'rubble_large.gltf',
  rubbleHalf: 'rubble_half.gltf',
} as const;

type AssetName = keyof typeof ASSETS;
type LoadedAsset = { scene: any };
type RoomOccluderRole = 'front-wall' | 'side-wall' | 'back-wall';
const cache = new Map<AssetName, Promise<LoadedAsset>>();

async function gltfLoader() {
  const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
  return new GLTFLoader();
}

async function loadAsset(name: AssetName) {
  if (!cache.has(name)) cache.set(name, (async () => (await gltfLoader()).loadAsync(`${DUNGEON_ROOT}${ASSETS[name]}`))());
  return cache.get(name)!;
}

function requiredAssets(spec: RoomBibleSpec): AssetName[] {
  const required = new Set<AssetName>(['floor', 'wall', 'corner', 'wallColumn', 'torch']);
  if (spec.shell !== 'intact') required.add('floorBroken');
  if (spec.shell === 'abandoned' || spec.shell === 'veil') required.add('wallBroken');
  if (spec.shell !== 'intact') required.add('wallCracked');
  if (spec.shell === 'monumental' || spec.shell === 'veil' || spec.silhouette === 'three-lane' || spec.silhouette === 'arena') required.add('pillar');
  if (spec.silhouette === 'three-lane') required.add('column');
  if (spec.silhouette === 'diagonal' || spec.shell === 'abandoned' || spec.shell === 'veil') {
    required.add('rubble');
    required.add('rubbleHalf');
  }
  return [...required];
}

export async function preloadKayKitDungeonRoom(room: number) {
  const spec = roomBibleSpec(room);
  await Promise.all(requiredAssets(spec).map(loadAsset));
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

function tagOccluder(object: any, role?: RoomOccluderRole) {
  if (!role) return;
  object.userData = { ...(object.userData ?? {}), roomOccluder: role };
  object.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.userData = { ...(node.userData ?? {}), roomOccluder: role };
  });
}

function addObject(
  group: any,
  prototype: any,
  x: number,
  y: number,
  z: number,
  rotation = 0,
  scale = 1,
  occluderRole?: RoomOccluderRole,
) {
  if (!prototype) return null;
  const object = prototype.clone(true);
  object.position.set(x, y, z);
  object.rotation.y = rotation;
  object.scale.setScalar(scale);
  tagOccluder(object, occluderRole);
  group.add(object);
  return object;
}

function wallFor(spec: RoomBibleSpec, index: number, loaded: Record<AssetName, any>) {
  if (spec.shell === 'intact') return index % 9 === 0 ? loaded.wallCracked ?? loaded.wall : loaded.wall;
  if (spec.shell === 'abandoned') return index % 3 === 0 ? loaded.wallBroken : loaded.wallCracked;
  if (spec.shell === 'monumental') return index % 7 === 0 ? loaded.wallCracked : loaded.wall;
  return index % 2 === 0 ? loaded.wallBroken : loaded.wallCracked;
}

function portalStagePoint(spec: RoomBibleSpec) {
  return {
    x: spec.portal.x,
    // The gameplay tile and portal light already use -8.5. Keeping the architecture
    // at -10.5 left the supports visibly detached behind the active portal.
    z: spec.portal.z < -8 ? -8.5 : spec.portal.z,
  };
}

function addPortalStage(root: any, spec: RoomBibleSpec, loaded: Record<AssetName, any>) {
  const { x, z } = portalStagePoint(spec);
  root.userData.portalStage = { x, z };

  if (spec.portal.z < -8) {
    const spread = spec.shell === 'veil' ? 2.65 : 2.35;
    const supportScale = spec.shell === 'veil' ? 1.16 : 1.02;
    addObject(root, loaded.wallColumn, x - spread, 0, z - 1.75, 0, supportScale);
    addObject(root, loaded.wallColumn, x + spread, 0, z - 1.75, 0, supportScale);
    addObject(root, loaded.torch, x - spread, 0.05, z - 1.45, Math.PI, spec.shell === 'veil' ? 0.84 : 0.94);
    addObject(root, loaded.torch, x + spread, 0.05, z - 1.45, Math.PI, spec.shell === 'veil' ? 0.84 : 0.94);
    return;
  }

  if (Math.abs(x) > 4 && loaded.pillar) {
    addObject(root, loaded.pillar, x, 0, z - 1.6, 0, 1.02);
    addObject(root, loaded.pillar, x, 0, z + 1.6, Math.PI, 1.02);
  }
}

function addSilhouetteArchitecture(root: any, spec: RoomBibleSpec, loaded: Record<AssetName, any>) {
  const pillar = loaded.pillar ?? loaded.wallColumn;
  const column = loaded.column ?? pillar;

  switch (spec.silhouette) {
    case 'three-lane':
      for (const z of [-5.5, -0.8, 4.1]) {
        addObject(root, column, -6.6, 0, z, 0, 1.16);
        addObject(root, column, 6.6, 0, z, 0, 1.16);
      }
      break;
    case 'axial':
      addObject(root, pillar, -6.4, 0, -5.4, 0, spec.shell === 'veil' ? 1.25 : 1.08);
      addObject(root, pillar, 6.4, 0, -5.4, 0, spec.shell === 'veil' ? 1.25 : 1.08);
      break;
    case 'ring':
    case 'orbit':
      for (const [x, z] of [[-5.6, -4.3], [5.6, -4.3], [-5.6, 4.3], [5.6, 4.3]] as const) addObject(root, pillar, x, 0, z, 0, spec.shell === 'veil' ? 1.2 : 1.02);
      break;
    case 'cross':
      for (const [x, z] of [[-5.4, -4.4], [5.4, -4.4], [-5.4, 4.4], [5.4, 4.4]] as const) addObject(root, pillar, x, 0, z, 0, 1.12);
      break;
    case 'arena':
      for (const [x, z] of [[-7, -6], [7, -6], [-7, 5.6], [7, 5.6]] as const) addObject(root, pillar, x, 0, z, 0, isBossRoom(spec.room) ? 1.34 : 1.18);
      break;
    case 'diagonal':
      addObject(root, loaded.rubble, -7.2, 0, -4.9, 0.28, 0.82);
      addObject(root, loaded.rubbleHalf, 6.9, 0, 4.7, -0.32, 0.78);
      break;
    case 'zigzag':
    case 's-curve':
    case 's-lane':
      if (loaded.rubbleHalf) {
        addObject(root, loaded.rubbleHalf, -7.2, 0, 5.4, 0.18, 0.68);
        addObject(root, loaded.rubbleHalf, 7.1, 0, -5.2, -0.18, 0.68);
      }
      break;
    case 'tri-island':
      break;
  }
}

export function buildKayKitDungeonRoom(THREE: any, room: number, mapWidth: number, mapHeight: number) {
  const root = new THREE.Group();
  const spec = roomBibleSpec(room);
  root.name = `KayKitDungeonRoom${room}_${spec.phase}_${spec.silhouette}`;
  root.userData.roomBible = spec;
  let active = true;
  const names = requiredAssets(spec);

  const ready = Promise.all(names.map(async name => [name, await loadAsset(name)] as const)).then(entries => {
    if (!active) return;
    const loaded = Object.fromEntries(entries.map(([name, gltf]) => {
      prepare(gltf.scene);
      return [name, gltf.scene];
    })) as Record<AssetName, any>;

    const floorStep = 4;
    let tileIndex = 0;
    for (let z = -mapHeight / 2 + floorStep / 2; z < mapHeight / 2; z += floorStep) {
      for (let x = -mapWidth / 2 + floorStep / 2; x < mapWidth / 2; x += floorStep) {
        const broken = spec.shell !== 'intact' && loaded.floorBroken && (tileIndex + room * 3) % (spec.shell === 'veil' ? 3 : 6) === 0;
        addObject(root, broken ? loaded.floorBroken : loaded.floor, x, 0, z, (tileIndex + room) % 2 ? Math.PI / 2 : 0);
        tileIndex += 1;
      }
    }

    const left = -mapWidth / 2 + 0.45;
    const right = mapWidth / 2 - 0.45;
    const top = -mapHeight / 2 + 0.45;
    const bottom = mapHeight / 2 - 0.45;
    const wallStep = 2;
    let wallIndex = 0;

    for (let x = left + wallStep; x < right - wallStep; x += wallStep) {
      addObject(root, wallFor(spec, wallIndex++, loaded), x, 0, top, 0, 1, 'back-wall');
      addObject(root, wallFor(spec, wallIndex++, loaded), x, 0, bottom, Math.PI, 1, 'front-wall');
    }
    for (let z = top + wallStep; z < bottom - wallStep; z += wallStep) {
      addObject(root, wallFor(spec, wallIndex++, loaded), left, 0, z, Math.PI / 2, 1, 'side-wall');
      addObject(root, wallFor(spec, wallIndex++, loaded), right, 0, z, -Math.PI / 2, 1, 'side-wall');
    }

    addObject(root, loaded.corner, left, 0, top, Math.PI / 2, 1, 'back-wall');
    addObject(root, loaded.corner, right, 0, top, Math.PI, 1, 'back-wall');
    addObject(root, loaded.corner, right, 0, bottom, -Math.PI / 2, 1, 'front-wall');
    addObject(root, loaded.corner, left, 0, bottom, 0, 1, 'front-wall');

    const columnXs = spec.shell === 'monumental' || spec.shell === 'veil' ? [-8, -4, 4, 8] : [-6, 6];
    for (const x of columnXs) {
      addObject(root, loaded.wallColumn, x, 0, top, 0, spec.shell === 'veil' ? 1.18 : 1, 'back-wall');
      addObject(root, loaded.wallColumn, x, 0, bottom, Math.PI, spec.shell === 'veil' ? 1.18 : 1, 'front-wall');
    }

    const torchCount = spec.phase === 'inhabited-mine' ? 4 : spec.phase === 'abandoned-quarters' ? 2 : spec.phase === 'ancient-ruins' ? 3 : 1;
    const torchXs = [-7.5, -2.5, 2.5, 7.5];
    for (let index = 0; index < torchCount; index++) addObject(root, loaded.torch, torchXs[index], 0, top + 0.18, Math.PI, spec.phase === 'warden-veil' ? 0.86 : 1);

    addPortalStage(root, spec, loaded);
    addSilhouetteArchitecture(root, spec, loaded);
  }).catch(error => {
    console.error('KayKit dungeon room failed', error);
    throw error;
  });

  root.userData.ready = ready;
  root.userData.dispose = () => { active = false; };
  return root;
}
