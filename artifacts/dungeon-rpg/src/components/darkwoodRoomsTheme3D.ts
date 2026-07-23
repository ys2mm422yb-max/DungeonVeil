import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';

const prototypePromises = new Map<string, Promise<any>>();

type DarkwoodDecoration = { model: string; x: number; y?: number; z: number; rotation?: number; scale?: number };
const d = (model: string, x: number, z: number, rotation = 0, scale = 1, y = 0): DarkwoodDecoration => ({ model, x, y, z, rotation, scale });

export const DARKWOOD_ROOM_DECORATIONS: Record<number, DarkwoodDecoration[]> = {
  31: [
    d(`${H}/arch_gate.gltf`, 0, -8.55, 0, 1.28),
    d(`${H}/post_lantern.gltf`, -4.8, -6.9, 0, 1.16),
    d(`${H}/post_lantern.gltf`, 4.8, -6.9, 0, 1.16),
  ],
  40: [
    d(`${D}/wall_arched.gltf`, 0, -8.65, 0, 1.32),
    d(`${D}/pillar.gltf`, -5.8, -7.0, 0, 1.08),
    d(`${D}/pillar.gltf`, 5.8, -7.0, 0, 1.08),
    d(`${D}/banner_patternB_blue.gltf`, 0, -8.48, 0, 1.08, 2.52),
  ],
};

async function prototypeFor(model: string) {
  const cached = prototypePromises.get(model);
  if (cached) return cached;
  const promise = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const gltf = await new GLTFLoader().loadAsync(modelUrl(manifest, model));
    gltf.scene.traverse((node: any) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      if (node.geometry && !node.geometry.userData?.kayKitPersistent) {
        node.geometry.userData = { ...(node.geometry.userData ?? {}), kayKitPersistent: true };
        node.geometry.dispose = () => undefined;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.filter(Boolean).forEach((material: any) => {
        if (!material.userData?.kayKitPersistent) {
          material.userData = { ...(material.userData ?? {}), kayKitPersistent: true };
          material.dispose = () => undefined;
        }
      });
      node.castShadow = false;
      node.receiveShadow = !IS_MOBILE;
      node.frustumCulled = true;
    });
    return gltf.scene;
  })();
  prototypePromises.set(model, promise);
  return promise;
}

function buildDarkwoodGroundComposition(THREE: any, room: number) {
  if (room !== 31 && room !== 40) return null;
  const group = new THREE.Group();
  group.name = room === 40 ? 'ShadowWardenStoneArena' : 'DarkwoodGateStoneTrail';
  const geometry = new THREE.BoxGeometry(room === 40 ? .78 : .68, .034, room === 40 ? .44 : .58);
  const material = new THREE.MeshStandardMaterial({
    color: room === 40 ? 0x303941 : 0x39454a,
    roughness: 1,
    metalness: 0,
  });
  const count = room === 40 ? 16 : 8;
  const stones = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  for (let index = 0; index < count; index++) {
    if (room === 40) {
      const angle = index / count * Math.PI * 2;
      position.set(Math.sin(angle) * 4.0, .018, -2.55 + Math.cos(angle) * 2.7);
      euler.set(0, -angle + Math.PI / 2, 0);
      scale.set(.96 + (index % 3) * .08, 1, .9 + (index % 2) * .12);
    } else {
      const progress = index / Math.max(1, count - 1);
      position.set(Math.sin(index * 1.55) * .52, .018, 5.0 - progress * 10.2);
      euler.set(0, Math.sin(index * 1.07) * .3, 0);
      scale.set(.92 + (index % 3) * .08, 1, .9 + (index % 2) * .12);
    }
    rotation.setFromEuler(euler);
    matrix.compose(position, rotation, scale);
    stones.setMatrixAt(index, matrix);
  }
  stones.instanceMatrix.needsUpdate = true;
  stones.castShadow = false;
  stones.receiveShadow = !IS_MOBILE;
  stones.frustumCulled = true;
  stones.userData.darkwoodGroundComposition = room;
  group.add(stones);
  group.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
  };
  return group;
}

export async function preloadDarkwoodRoomTheme(room: number) {
  const pieces = DARKWOOD_ROOM_DECORATIONS[room] ?? [];
  await Promise.allSettled(pieces.map(piece => prototypeFor(piece.model)));
}

export function buildDarkwoodRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `DarkwoodRoomTheme_${room}`;
  const pieces = DARKWOOD_ROOM_DECORATIONS[room] ?? [];
  const groundComposition = buildDarkwoodGroundComposition(THREE, room);
  if (groundComposition) root.add(groundComposition);
  let active = true;
  root.userData.ready = Promise.allSettled(pieces.map(async piece => {
    try {
      const prototype = await prototypeFor(piece.model);
      if (!active) return;
      const object = prototype.clone(true);
      object.position.set(piece.x, piece.y ?? 0, piece.z);
      object.rotation.y = piece.rotation ?? 0;
      object.scale.setScalar(piece.scale ?? 1);
      object.userData.darkwoodDecoration = { room, model: piece.model };
      root.add(object);
    } catch (error) {
      console.warn(`Darkwood decoration unavailable in room ${room}: ${piece.model}`, error);
    }
  })).then(() => undefined);
  root.userData.dispose = () => {
    active = false;
    groundComposition?.userData?.dispose?.();
  };
  return root;
}
