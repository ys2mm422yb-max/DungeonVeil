import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { buildKayKitOuterWorld, preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { buildKayKitRoomAtmosphere } from './kaykitRoomAtmosphere3D';
import { roomSetpieces } from '../game/roomSetpieceLayout';
import { roomArchitecturePieces } from '../game/roomArchitectureLayout';
import { elevationForSetpiece, roomElevationPieces } from '../game/roomElevationLayout';
import { roomSurfacePieces } from '../game/roomSurfaceLayout';
import { roomIdentity } from '../game/roomIdentity';
import { roomComposition } from '../game/roomComposition';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const modelPromises = new Map<string, Promise<any>>();

type LoadedGltf = { scene: any };
type VisualPiece = { model: string; x: number; y?: number; z: number; rotation?: number; scale?: number };

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

function addCompositionLights(THREE: any, root: any, room: number) {
  const composition = roomComposition(room);
  const focus = composition.focus;
  const main = new THREE.PointLight(focus.color, IS_MOBILE ? focus.intensity * 0.78 : focus.intensity, focus.range, 2);
  main.position.set(focus.x, 2.15, focus.z);
  root.add(main);

  const lights = [main];
  if (composition.secondary) {
    const secondary = composition.secondary;
    const fill = new THREE.PointLight(secondary.color, IS_MOBILE ? secondary.intensity * 0.72 : secondary.intensity, secondary.range, 2);
    fill.position.set(secondary.x, 1.55, secondary.z);
    root.add(fill);
    lights.push(fill);
  }
  root.userData.architectureLights = lights;
}

// A room is composed only from authored surface flow, supporting architecture, low elevation zones and its functional scene.
function roomPieces(room: number): VisualPiece[] {
  const setpieces = roomSetpieces(room).map(piece => ({ ...piece, y: elevationForSetpiece(room, piece) }));
  return [...roomSurfacePieces(room), ...roomArchitecturePieces(room), ...roomElevationPieces(room), ...setpieces];
}

export async function preloadKayKitRoomTheme(room: number) {
  await preloadKayKitOuterWorld();
  await Promise.all([...new Set(roomPieces(room).map(piece => piece.model))].map(prototypeFor));
}

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  const identity = roomIdentity(room);
  root.name = `KayKitSetpieceRoom${room}_${identity.id}`;
  root.userData.roomIdentity = identity;
  let active = true;

  const outer = buildKayKitOuterWorld(THREE, 24, 32);
  const atmosphere = buildKayKitRoomAtmosphere(THREE, room);
  root.add(outer);
  root.add(atmosphere);
  addCompositionLights(THREE, root, room);

  const ready = Promise.all(roomPieces(room).map(async piece => {
    const prototype = await prototypeFor(piece.model);
    if (!active) return;
    const object = prototype.clone(true);
    object.position.set(piece.x, piece.y ?? 0, piece.z);
    object.rotation.y = piece.rotation ?? 0;
    object.scale.setScalar(piece.scale ?? 1);
    root.add(object);
  })).then(() => outer.userData?.ready ?? Promise.resolve()).then(() => undefined);

  root.userData.ready = ready;
  root.userData.dispose = () => {
    active = false;
    outer.userData?.dispose?.();
    atmosphere.userData?.dispose?.();
  };
  return root;
}
