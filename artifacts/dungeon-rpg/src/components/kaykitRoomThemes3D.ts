import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { buildKayKitOuterWorld, preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { roomSetpieces } from '../game/roomSetpieceLayout';
import { roomDecorDetails } from '../game/roomDecorDetails';
import { roomIdentity } from '../game/roomIdentity';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const modelPromises = new Map<string, Promise<any>>();

type LoadedGltf = { scene: any };

function keep(resource: any) {
  if (!resource || resource.userData?.kayKitPersistent) return;
  resource.userData = { ...(resource.userData ?? {}), kayKitPersistent: true };
  resource.dispose = () => undefined;
}

async function prototypeFor(path: string) {
  const cached = modelPromises.get(path);
  if (cached) return cached;
  const promise = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const gltf: LoadedGltf = await new GLTFLoader().loadAsync(modelUrl(manifest, path));
    gltf.scene.traverse((node: any) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      keep(node.geometry);
      if (Array.isArray(node.material)) node.material.forEach(keep);
      else keep(node.material);
      node.castShadow = false;
      node.receiveShadow = !IS_MOBILE;
      node.frustumCulled = true;
    });
    return gltf.scene;
  })();
  modelPromises.set(path, promise);
  return promise;
}

function addLights(THREE: any, root: any, room: number) {
  const color = room >= 16 ? 0x9b5368 : room >= 11 ? 0x8a6ec9 : 0xe6b27a;
  const light = new THREE.PointLight(color, IS_MOBILE ? 2.2 : 3.2, room >= 11 ? 14 : 15.5, 2);
  light.position.set(0, 4.2, -11.8);
  root.add(light);
  root.userData.architectureLights = [light];
}

function roomVisuals(room: number) {
  return [...roomSetpieces(room), ...roomDecorDetails(room)];
}

export async function preloadKayKitRoomTheme(room: number) {
  await preloadKayKitOuterWorld();
  await Promise.all([...new Set(roomVisuals(room).map(piece => piece.model))].map(prototypeFor));
}

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  const identity = roomIdentity(room);
  root.name = `KayKitSetpieceRoom${room}_${identity.id}`;
  root.userData.roomIdentity = identity;
  let active = true;

  const outer = buildKayKitOuterWorld(THREE, 24, 32);
  root.add(outer);
  addLights(THREE, root, room);

  const ready = Promise.all(roomVisuals(room).map(async piece => {
    const prototype = await prototypeFor(piece.model);
    if (!active) return;
    const object = prototype.clone(true);
    object.position.set(piece.x, 0, piece.z);
    object.rotation.y = piece.rotation ?? 0;
    object.scale.setScalar(piece.scale ?? 1);
    root.add(object);
  })).then(() => outer.userData?.ready ?? Promise.resolve()).then(() => undefined);

  root.userData.ready = ready;
  root.userData.dispose = () => { active = false; outer.userData?.dispose?.(); };
  return root;
}
