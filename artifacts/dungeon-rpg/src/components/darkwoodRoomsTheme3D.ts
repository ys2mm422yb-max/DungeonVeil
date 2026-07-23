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
    d(`${D}/wall_half.gltf`, -7.4, -8.8, 0, 0.92),
    d(`${D}/wall_half.gltf`, 7.4, -8.8, 0, 0.92),
  ],
  32: [
    d(`${D}/wall_half.gltf`, -6.8, -8.7, 0, 0.94),
    d(`${D}/wall_half.gltf`, 6.8, -8.7, 0, 0.94),
    d(`${H}/post_lantern.gltf`, -4.8, -6.6, 0, 1.14),
    d(`${H}/post_lantern.gltf`, 4.8, -6.6, 0, 1.14),
    d(`${H}/bench_decorated.gltf`, -8.4, 2.7, Math.PI / 2, 1.02),
    d(`${H}/grave_A_destroyed.gltf`, 8.0, 3.7, -0.12, 0.98),
  ],
  33: [
    d(`${D}/barrier_column.gltf`, -5.8, -7.2, 0, 1.08),
    d(`${D}/barrier_column.gltf`, 5.8, -7.2, 0, 1.08),
    d(`${H}/skull_candle.gltf`, -3.2, -5.9, 0, 1.16),
    d(`${H}/skull_candle.gltf`, 3.2, -5.9, 0, 1.16),
    d(`${H}/gravemarker_A.gltf`, -7.8, 3.8, 0.1, 0.96),
    d(`${H}/gravemarker_A.gltf`, 7.8, 3.8, -0.1, 0.96),
  ],
  34: [
    d(`${H}/arch_gate.gltf`, 0, -8.55, 0, 1.22),
    d(`${H}/post_lantern.gltf`, -4.6, -6.6, 0, 1.12),
    d(`${H}/post_lantern.gltf`, 4.6, -6.6, 0, 1.12),
    d(`${H}/gravemarker_A.gltf`, -8.0, 2.9, 0.1, 0.98),
    d(`${H}/gravemarker_A.gltf`, 8.0, 2.9, -0.1, 0.98),
  ],
  35: [
    d(`${D}/wall_arched.gltf`, 0, -8.7, 0, 1.34),
    d(`${D}/pillar.gltf`, -5.8, -7.0, 0, 1.08),
    d(`${D}/pillar.gltf`, 5.8, -7.0, 0, 1.08),
    d(`${H}/candle_triple.gltf`, -3.1, -6.1, 0, 1.14),
    d(`${H}/candle_triple.gltf`, 3.1, -6.1, 0, 1.14),
  ],
  36: [
    d(`${H}/post_lantern.gltf`, -5.6, -6.7, 0, 1.16),
    d(`${H}/post_lantern.gltf`, 5.6, -6.7, 0, 1.16),
    d(`${D}/barrier_column.gltf`, -6.7, 4.5, 0, 1.02),
    d(`${D}/barrier_column.gltf`, 6.7, 4.5, 0, 1.02),
    d(`${H}/bench.gltf`, 8.2, 2.8, -Math.PI / 2, 1.0),
  ],
  37: [
    d(`${H}/arch_gate.gltf`, 0, -8.55, 0, 1.18),
    d(`${H}/lantern_standing.gltf`, -5.2, -5.8, 0, 1.2),
    d(`${H}/lantern_standing.gltf`, 5.2, -5.8, 0, 1.2),
    d(`${D}/box_stacked.gltf`, -7.5, 3.7, 0.08, 0.98),
    d(`${D}/box_stacked.gltf`, 7.5, 3.7, -0.08, 0.98),
  ],
  38: [
    d(`${H}/shrine_candles.gltf`, 0, -7.2, 0, 1.34),
    d(`${H}/post_lantern.gltf`, -5.7, -6.2, 0, 1.12),
    d(`${H}/post_lantern.gltf`, 5.7, -6.2, 0, 1.12),
    d(`${D}/pillar.gltf`, -6.8, 3.8, 0, 1.02),
    d(`${D}/pillar.gltf`, 6.8, 3.8, 0, 1.02),
  ],
  39: [
    d(`${D}/wall_arched.gltf`, 0, -8.65, 0, 1.28),
    d(`${D}/pillar.gltf`, -5.9, -7.0, 0, 1.06),
    d(`${D}/pillar.gltf`, 5.9, -7.0, 0, 1.06),
    d(`${H}/bench_decorated.gltf`, -8.2, 2.6, Math.PI / 2, 1.0),
    d(`${H}/bench_decorated.gltf`, 8.2, 2.6, -Math.PI / 2, 1.0),
    d(`${H}/post_lantern.gltf`, 0, 4.7, Math.PI, 1.14),
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
  if (room < 31 || room > 40) return null;
  const group = new THREE.Group();
  group.name = `DarkwoodGroundComposition_${room}`;

  const bridge = room === 36;
  const ring = room === 38 || room === 40;
  const plaza = room === 37 || room === 39;
  const graveRoad = room === 34;
  const chapelNave = room === 35;
  const count = bridge ? 13 : ring ? (room === 40 ? 16 : 14) : plaza ? 12 : graveRoad ? 12 : chapelNave ? 10 : room === 31 ? 8 : 6;
  const geometry = new THREE.BoxGeometry(
    bridge ? 3.9 : plaza ? 1.18 : room === 40 ? 0.78 : 0.68,
    bridge ? 0.055 : 0.034,
    bridge ? 0.48 : plaza ? 0.82 : ring ? 0.44 : 0.58,
  );
  const material = new THREE.MeshStandardMaterial({
    color: bridge ? 0x35271f : room === 40 ? 0x303941 : room === 38 ? 0x3a3445 : 0x39454a,
    roughness: 1,
    metalness: 0,
  });
  const pieces = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  for (let index = 0; index < count; index++) {
    if (bridge) {
      const progress = index / Math.max(1, count - 1);
      position.set(Math.sin(index * 1.77) * 0.14, 0.028 + (index % 3) * 0.006, 5.2 - progress * 11.3);
      euler.set(0, Math.sin(index * 1.31) * 0.035, 0);
      scale.set(0.94 + (index % 4) * 0.025, 1, 0.92 + (index % 3) * 0.04);
    } else if (ring) {
      const angle = index / count * Math.PI * 2;
      const radiusX = room === 40 ? 4.0 : 3.25;
      const radiusZ = room === 40 ? 2.7 : 2.35;
      position.set(Math.sin(angle) * radiusX, 0.018, (room === 40 ? -2.55 : -0.25) + Math.cos(angle) * radiusZ);
      euler.set(0, -angle + Math.PI / 2, 0);
      scale.set(0.96 + (index % 3) * 0.08, 1, 0.9 + (index % 2) * 0.12);
    } else if (plaza) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      position.set((column - 1) * 1.28, 0.018, -1.8 + row * 1.02);
      euler.set(0, ((index % 2) - 0.5) * 0.08, 0);
      scale.set(0.94 + (index % 3) * 0.04, 1, 0.94 + (index % 2) * 0.05);
    } else if (graveRoad) {
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      position.set(side * (2.55 + (row % 2) * 0.28), 0.018, 4.8 - row * 1.9);
      euler.set(0, side * 0.08, 0);
      scale.set(0.92 + (row % 3) * 0.06, 1, 0.92);
    } else {
      const progress = index / Math.max(1, count - 1);
      position.set(Math.sin(index * 1.55) * (chapelNave ? 0.22 : 0.52), 0.018, 5.0 - progress * 10.2);
      euler.set(0, Math.sin(index * 1.07) * (chapelNave ? 0.08 : 0.3), 0);
      scale.set(0.92 + (index % 3) * 0.08, 1, 0.9 + (index % 2) * 0.12);
    }
    rotation.setFromEuler(euler);
    matrix.compose(position, rotation, scale);
    pieces.setMatrixAt(index, matrix);
  }
  pieces.instanceMatrix.needsUpdate = true;
  pieces.castShadow = false;
  pieces.receiveShadow = !IS_MOBILE;
  pieces.frustumCulled = true;
  pieces.userData.darkwoodGroundComposition = room;
  group.add(pieces);
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
