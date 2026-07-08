import { DUNGEON_ASSETS, OBJ_LIBRARY_ROOT } from './assetCatalog3D';

const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';

let floorPrototype: Promise<any | null> | null = null;

async function loadFloorPrototype(THREE: any) {
  if (!floorPrototype) {
    floorPrototype = (async () => {
      try {
        const spec = DUNGEON_ASSETS.floor;
        const [{ OBJLoader }, { MTLLoader }] = await Promise.all([
          import(/* @vite-ignore */ OBJ_URL),
          import(/* @vite-ignore */ MTL_URL),
        ]) as any;
        const base = `${OBJ_LIBRARY_ROOT}${spec.folder}/${spec.file}`;
        const materials = await new MTLLoader().loadAsync(`${base}.mtl`);
        materials.preload();
        const loader = new OBJLoader();
        loader.setMaterials(materials);
        const object = await loader.loadAsync(`${base}.obj`);

        object.position.set(0, 0, 0);
        object.scale.setScalar(1);
        object.updateMatrixWorld(true);
        let box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);
        const dominant = Math.max(size.x, size.z, 0.0001);
        object.scale.setScalar(4 / dominant);
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
          node.receiveShadow = true;
          node.castShadow = false;
          node.frustumCulled = false;
        });
        return object;
      } catch (error) {
        console.warn('Quaternius Floor_Modular unavailable', error);
        return null;
      }
    })();
  }
  return floorPrototype;
}

export function buildQuaterniusDungeonFloor(THREE: any, mapWidth: number, mapHeight: number) {
  const root = new THREE.Group();
  root.name = 'QuaterniusFloorModular';
  let active = true;

  loadFloorPrototype(THREE).then(prototype => {
    if (!active || !prototype) return;
    const step = 3.95;
    const halfW = mapWidth / 2;
    const halfH = mapHeight / 2;
    for (let z = -halfH + step / 2; z < halfH; z += step) {
      for (let x = -halfW + step / 2; x < halfW; x += step) {
        const tile = prototype.clone(true);
        tile.position.set(x, -0.03, z);
        root.add(tile);
      }
    }
  });

  root.userData.dispose = () => { active = false; };
  return root;
}
