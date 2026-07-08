const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const ROOT = '/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/';
const MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type Library = { floor: any; wall: any; corner: any; column: any };
let libraryPromise: Promise<Library> | null = null;

async function loadLibrary(): Promise<Library> {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      const [floor, wall, corner, column] = await Promise.all([
        loader.loadAsync(`${ROOT}floor_dirt_large.gltf`),
        loader.loadAsync(`${ROOT}barrier.gltf`),
        loader.loadAsync(`${ROOT}barrier_corner.gltf`),
        loader.loadAsync(`${ROOT}barrier_column.gltf`),
      ]);
      return { floor: floor.scene, wall: wall.scene, corner: corner.scene, column: column.scene };
    })();
  }
  return libraryPromise;
}

export function preloadKayKitOuterWorld() {
  return loadLibrary().then(() => undefined);
}

function prepare(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = !MOBILE;
    node.frustumCulled = true;
  });
}

function cloneAt(group: any, source: any, x: number, z: number, rotation = 0, y = -0.14) {
  const object = source.clone(true);
  object.position.set(x, y, z);
  object.rotation.y = rotation;
  group.add(object);
}

export function buildKayKitOuterWorld(THREE: any, mapWidth: number, mapHeight: number) {
  const root = new THREE.Group();
  root.name = 'KayKitOuterDungeon';
  let active = true;

  loadLibrary().then(library => {
    if (!active) return;
    Object.values(library).forEach(prepare);

    const margin = MOBILE ? 8 : 12;
    const step = 4;
    const left = -mapWidth / 2 - margin;
    const right = mapWidth / 2 + margin;
    const top = -mapHeight / 2 - margin;
    const bottom = mapHeight / 2 + margin;

    for (let z = top + step / 2; z < bottom; z += step) {
      for (let x = left + step / 2; x < right; x += step) {
        const inside = x > -mapWidth / 2 - 1 && x < mapWidth / 2 + 1 && z > -mapHeight / 2 - 1 && z < mapHeight / 2 + 1;
        if (!inside) cloneAt(root, library.floor, x, z);
      }
    }

    const wallStep = MOBILE ? 4 : 2;
    for (let x = left + wallStep; x < right - wallStep; x += wallStep) {
      cloneAt(root, library.wall, x, top, 0, -0.1);
      cloneAt(root, library.wall, x, bottom, Math.PI, -0.1);
    }
    for (let z = top + wallStep; z < bottom - wallStep; z += wallStep) {
      cloneAt(root, library.wall, left, z, Math.PI / 2, -0.1);
      cloneAt(root, library.wall, right, z, -Math.PI / 2, -0.1);
    }

    cloneAt(root, library.corner, left, top, Math.PI / 2, -0.1);
    cloneAt(root, library.corner, right, top, Math.PI, -0.1);
    cloneAt(root, library.corner, right, bottom, -Math.PI / 2, -0.1);
    cloneAt(root, library.corner, left, bottom, 0, -0.1);

    for (const x of [-8, 0, 8]) {
      cloneAt(root, library.column, x, top + 0.1, 0, -0.1);
      cloneAt(root, library.column, x, bottom - 0.1, Math.PI, -0.1);
    }
  }).catch(error => console.error('KayKit outer dungeon failed', error));

  root.userData.dispose = () => { active = false; };
  return root;
}
