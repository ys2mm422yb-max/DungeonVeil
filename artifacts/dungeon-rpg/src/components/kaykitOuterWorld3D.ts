const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const ROOT = '/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/';
const MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type Library = { floor: any; floorBroken: any; wall: any; wallBroken: any; corner: any; pillar: any; torch: any };
let libraryPromise: Promise<Library> | null = null;

async function loadLibrary(): Promise<Library> {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      const [floor, floorBroken, wall, wallBroken, corner, pillar, torch] = await Promise.all([
        loader.loadAsync(`${ROOT}floor_tile_large.gltf`),
        loader.loadAsync(`${ROOT}floor_tile_large_rocks.gltf`),
        loader.loadAsync(`${ROOT}wall.gltf`),
        loader.loadAsync(`${ROOT}wall_broken.gltf`),
        loader.loadAsync(`${ROOT}wall_corner.gltf`),
        loader.loadAsync(`${ROOT}wall_pillar.gltf`),
        loader.loadAsync(`${ROOT}torch_mounted.gltf`),
      ]);
      return { floor: floor.scene, floorBroken: floorBroken.scene, wall: wall.scene, wallBroken: wallBroken.scene, corner: corner.scene, pillar: pillar.scene, torch: torch.scene };
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

function cloneAt(group: any, source: any, x: number, z: number, rotation = 0, y = -0.18, scale = 1) {
  const object = source.clone(true);
  object.position.set(x, y, z);
  object.rotation.y = rotation;
  object.scale.setScalar(scale);
  group.add(object);
}

export function buildKayKitOuterWorld(THREE: any, mapWidth: number, mapHeight: number) {
  const root = new THREE.Group();
  root.name = 'KayKitOuterDungeon';
  let active = true;

  const ready = loadLibrary().then(library => {
    if (!active) return;
    Object.values(library).forEach(prepare);

    const margin = MOBILE ? 16 : 20;
    const step = 4;
    const roomLeft = -mapWidth / 2;
    const roomRight = mapWidth / 2;
    const roomTop = -mapHeight / 2;
    const roomBottom = mapHeight / 2;
    const left = Math.floor((roomLeft - margin) / step) * step;
    const right = Math.ceil((roomRight + margin) / step) * step;
    const top = Math.floor((roomTop - margin) / step) * step;
    const bottom = Math.ceil((roomBottom + margin) / step) * step;

    // The authored room sits above this continuous KayKit floor bed. There is intentionally no empty moat or skipped inner ring.
    for (let z = top; z <= bottom; z += step) {
      for (let x = left; x <= right; x += step) {
        const index = Math.abs(Math.round(x / step) * 17 + Math.round(z / step) * 31);
        const insideRoom = x >= roomLeft - 2 && x <= roomRight + 2 && z >= roomTop - 2 && z <= roomBottom + 2;
        const source = !insideRoom && index % 7 === 0 ? library.floorBroken : library.floor;
        cloneAt(root, source, x, z, index % 2 ? Math.PI / 2 : 0);
      }
    }

    // Distant walls frame the outer dungeon only after the uninterrupted floor field.
    const wallStep = 2;
    for (let x = left + wallStep; x < right - wallStep; x += wallStep) {
      cloneAt(root, Math.abs(Math.round(x)) % 8 === 0 ? library.wallBroken : library.wall, x, top, 0, -0.08);
      cloneAt(root, Math.abs(Math.round(x + 3)) % 9 === 0 ? library.wallBroken : library.wall, x, bottom, Math.PI, -0.08);
    }
    for (let z = top + wallStep; z < bottom - wallStep; z += wallStep) {
      cloneAt(root, Math.abs(Math.round(z)) % 8 === 0 ? library.wallBroken : library.wall, left, z, Math.PI / 2, -0.08);
      cloneAt(root, Math.abs(Math.round(z + 3)) % 9 === 0 ? library.wallBroken : library.wall, right, z, -Math.PI / 2, -0.08);
    }

    cloneAt(root, library.corner, left, top, Math.PI / 2, -0.08);
    cloneAt(root, library.corner, right, top, Math.PI, -0.08);
    cloneAt(root, library.corner, right, bottom, -Math.PI / 2, -0.08);
    cloneAt(root, library.corner, left, bottom, 0, -0.08);

    for (const x of [-8, 0, 8]) {
      cloneAt(root, library.pillar, x, top + 0.15, 0, -0.08);
      cloneAt(root, library.pillar, x, bottom - 0.15, Math.PI, -0.08);
    }

    const torchPositions: Array<[number, number, number]> = [
      [-8, top + 0.25, 0], [8, top + 0.25, 0], [-8, bottom - 0.25, Math.PI], [8, bottom - 0.25, Math.PI],
      [left + 0.25, -5, Math.PI / 2], [left + 0.25, 5, Math.PI / 2], [right - 0.25, -5, -Math.PI / 2], [right - 0.25, 5, -Math.PI / 2],
    ];
    torchPositions.forEach(([x, z, rotation]) => cloneAt(root, library.torch, x, z, rotation, -0.02, 0.95));
  }).catch(error => {
    console.error('KayKit outer dungeon failed', error);
    throw error;
  });

  root.userData.ready = ready;
  root.userData.dispose = () => { active = false; };
  return root;
}
