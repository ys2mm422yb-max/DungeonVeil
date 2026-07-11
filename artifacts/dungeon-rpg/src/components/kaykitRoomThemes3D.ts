import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { buildKayKitOuterWorld, preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { calibratedRoomSetpieces } from '../game/roomSetpieceCalibrated';
import { roomIdentity } from '../game/roomIdentity';
import { roomBibleSpec } from '../game/roomBible';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const modelPromises = new Map<string, Promise<any>>();

const ROOM_ACCENTS: Record<number, number> = {
  1: 0xd99a55, 2: 0xd5b06d, 3: 0x8da7bd, 4: 0xb98245, 5: 0x72a9a0, 6: 0xff7a32,
  7: 0x718da0, 8: 0x6b91a1, 9: 0xa260d6, 10: 0x74889c,
  11: 0x78966b, 12: 0xb79a76, 13: 0x7e6bb5, 14: 0x8b8174, 15: 0xa76adc,
  16: 0xb45f60, 17: 0x8f6475, 18: 0x8b5de0, 19: 0xbd6b68, 20: 0xc04f70,
};

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
  const spec = roomBibleSpec(room);
  const accent = ROOM_ACCENTS[room] ?? spec.light.fill;

  // Phase lights live inside the room root and disappear atomically during room
  // transitions. This changes the whole mood instead of tinting one prop cluster.
  const ambient = new THREE.AmbientLight(spec.light.ambient, IS_MOBILE ? 0.42 : 0.34);
  const hemisphere = new THREE.HemisphereLight(
    spec.light.hemisphereSky,
    spec.light.hemisphereGround,
    IS_MOBILE ? 0.72 : 0.62,
  );
  root.add(ambient);
  root.add(hemisphere);

  const heroLight = new THREE.PointLight(accent, IS_MOBILE ? 2.45 : 3.4, spec.silhouette === 'arena' ? 18 : 15, 2);
  const heroZ = spec.silhouette === 'ring' || spec.silhouette === 'orbit' || spec.silhouette === 'arena' ? 0 : -4.6;
  heroLight.position.set(0, 4.2, heroZ);
  root.add(heroLight);

  const portalLight = new THREE.PointLight(spec.light.fill, IS_MOBILE ? 1.25 : 1.8, 9.5, 2);
  portalLight.position.set(spec.portal.x, 3.2, spec.portal.z);
  root.add(portalLight);
  root.userData.architectureLights = [ambient, hemisphere, heroLight, portalLight];
}

export async function preloadKayKitRoomTheme(room: number) {
  await preloadKayKitOuterWorld();
  await Promise.all([...new Set(calibratedRoomSetpieces(room).map(piece => piece.model))].map(prototypeFor));
}

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  const identity = roomIdentity(room);
  const spec = roomBibleSpec(room);
  root.name = `KayKitSetpieceRoom${room}_${identity.id}_${spec.silhouette}`;
  root.userData.roomIdentity = identity;
  root.userData.environment = {
    background: spec.light.background,
    fog: spec.light.fog,
    exposure: spec.light.exposure,
  };
  let active = true;

  const outer = buildKayKitOuterWorld(THREE, 24, 32, room);
  root.add(outer);
  addLights(THREE, root, room);

  const ready = Promise.all(calibratedRoomSetpieces(room).map(async piece => {
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
