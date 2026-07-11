import { roomBibleSpec } from '../game/roomBible';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const ROOT = '/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/';
const MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type Library = {
  floor: any;
  floorBroken: any;
  wall: any;
  wallBroken: any;
  wallCracked: any;
  corner: any;
  pillar: any;
  decoratedPillar: any;
  torch: any;
};
let libraryPromise: Promise<Library> | null = null;

async function loadLibrary(): Promise<Library> {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      const [floor, floorBroken, wall, wallBroken, wallCracked, corner, pillar, decoratedPillar, torch] = await Promise.all([
        loader.loadAsync(`${ROOT}floor_tile_large.gltf`),
        loader.loadAsync(`${ROOT}floor_tile_large_rocks.gltf`),
        loader.loadAsync(`${ROOT}wall.gltf`),
        loader.loadAsync(`${ROOT}wall_broken.gltf`),
        loader.loadAsync(`${ROOT}wall_cracked.gltf`),
        loader.loadAsync(`${ROOT}wall_corner.gltf`),
        loader.loadAsync(`${ROOT}wall_pillar.gltf`),
        loader.loadAsync(`${ROOT}pillar_decorated.gltf`),
        loader.loadAsync(`${ROOT}torch_mounted.gltf`),
      ]);
      return {
        floor: floor.scene,
        floorBroken: floorBroken.scene,
        wall: wall.scene,
        wallBroken: wallBroken.scene,
        wallCracked: wallCracked.scene,
        corner: corner.scene,
        pillar: pillar.scene,
        decoratedPillar: decoratedPillar.scene,
        torch: torch.scene,
      };
    })();
  }
  return libraryPromise;
}

export function preloadKayKitOuterWorld() {
  return loadLibrary().then(() => undefined);
}

function keepCachedResource(resource: any) {
  if (!resource || resource.userData?.kayKitPersistent) return;
  resource.userData = { ...(resource.userData ?? {}), kayKitPersistent: true };
  resource.dispose = () => undefined;
}

function prepare(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh) return;
    keepCachedResource(node.geometry);
    if (Array.isArray(node.material)) node.material.forEach(keepCachedResource);
    else keepCachedResource(node.material);
    node.castShadow = false;
    node.receiveShadow = !MOBILE;
    node.frustumCulled = true;
  });
}

function cloneAt(group: any, source: any, x: number, z: number, rotation = 0, y = -0.12, scale = 1) {
  const object = source.clone(true);
  object.position.set(x, y, z);
  object.rotation.y = rotation;
  object.scale.setScalar(scale);
  group.add(object);
}

export function buildKayKitOuterWorld(THREE: any, mapWidth: number, mapHeight: number, room = 1) {
  const root = new THREE.Group();
  const spec = roomBibleSpec(room);
  root.name = `KayKitOuterDungeon_${spec.shell}`;
  let active = true;

  const ready = loadLibrary().then(library => {
    if (!active) return;
    Object.values(library).forEach(prepare);

    // Keep the safety shell close to the playable room. The camera clamp should
    // normally hide it, but if it becomes visible it still matches the room phase.
    const margin = MOBILE ? 6 : 9;
    const step = 4;
    const left = -mapWidth / 2 - margin;
    const right = mapWidth / 2 + margin;
    const top = -mapHeight / 2 - margin;
    const bottom = mapHeight / 2 + margin;

    let tileIndex = 0;
    for (let z = top + step / 2; z < bottom; z += step) {
      for (let x = left + step / 2; x < right; x += step) {
        const inside = x > -mapWidth / 2 - 1 && x < mapWidth / 2 + 1 && z > -mapHeight / 2 - 1 && z < mapHeight / 2 + 1;
        if (inside) continue;
        const brokenEvery = spec.shell === 'veil' ? 2 : spec.shell === 'abandoned' ? 4 : spec.shell === 'monumental' ? 6 : 9;
        cloneAt(root, tileIndex++ % brokenEvery === 0 ? library.floorBroken : library.floor, x, z, tileIndex % 2 ? Math.PI / 2 : 0);
      }
    }

    const wallFor = (index: number) => {
      if (spec.shell === 'intact') return index % 10 === 0 ? library.wallCracked : library.wall;
      if (spec.shell === 'abandoned') return index % 3 === 0 ? library.wallBroken : library.wallCracked;
      if (spec.shell === 'monumental') return index % 8 === 0 ? library.wallCracked : library.wall;
      return index % 2 === 0 ? library.wallBroken : library.wallCracked;
    };

    let wallIndex = 0;
    const wallStep = 2;
    for (let x = left + wallStep; x < right - wallStep; x += wallStep) {
      cloneAt(root, wallFor(wallIndex++), x, top, 0, -0.08);
      cloneAt(root, wallFor(wallIndex++), x, bottom, Math.PI, -0.08);
    }
    for (let z = top + wallStep; z < bottom - wallStep; z += wallStep) {
      cloneAt(root, wallFor(wallIndex++), left, z, Math.PI / 2, -0.08);
      cloneAt(root, wallFor(wallIndex++), right, z, -Math.PI / 2, -0.08);
    }

    cloneAt(root, library.corner, left, top, Math.PI / 2, -0.08);
    cloneAt(root, library.corner, right, top, Math.PI, -0.08);
    cloneAt(root, library.corner, right, bottom, -Math.PI / 2, -0.08);
    cloneAt(root, library.corner, left, bottom, 0, -0.08);

    const pillarXs = spec.shell === 'monumental' ? [-8, -4, 4, 8] : spec.shell === 'veil' ? [-6, 6] : spec.shell === 'abandoned' ? [-7, 7] : [-8, 0, 8];
    const pillar = spec.shell === 'monumental' || spec.shell === 'veil' ? library.decoratedPillar : library.pillar;
    for (const x of pillarXs) {
      cloneAt(root, pillar, x, top + 0.15, 0, -0.08, spec.shell === 'veil' ? 1.18 : 1);
      cloneAt(root, pillar, x, bottom - 0.15, Math.PI, -0.08, spec.shell === 'veil' ? 1.18 : 1);
    }

    const torchCount = spec.phase === 'inhabited-mine' ? 4 : spec.phase === 'abandoned-quarters' ? 2 : spec.phase === 'ancient-ruins' ? 3 : 1;
    const positions: Array<[number, number, number]> = [
      [-8, top + 0.25, 0], [8, top + 0.25, 0], [-8, bottom - 0.25, Math.PI], [8, bottom - 0.25, Math.PI],
    ];
    positions.slice(0, torchCount).forEach(([x, z, rotation]) => cloneAt(root, library.torch, x, z, rotation, -0.02, spec.phase === 'warden-veil' ? 0.82 : 0.95));
  }).catch(error => {
    console.error('KayKit outer dungeon failed', error);
    throw error;
  });

  root.userData.ready = ready;
  root.userData.dispose = () => { active = false; };
  return root;
}
