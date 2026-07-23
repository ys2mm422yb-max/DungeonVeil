import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';

const prototypePromises = new Map<string, Promise<any>>();

type Decoration = { model: string; x: number; y?: number; z: number; rotation?: number; scale?: number };
const d = (model: string, x: number, z: number, rotation = 0, scale = 1, y = 0): Decoration => ({ model, x, y, z, rotation, scale });

export const ANCIENT_VEIL_DECORATIONS: Record<number, Decoration[]> = {
  11: [
    d(`${D}/wall_arched.gltf`, 0, -8.7, 0, 1.28),
    d(`${D}/pillar.gltf`, -6.1, -7.1, 0, 1.06),
    d(`${D}/pillar.gltf`, 6.1, -7.1, 0, 1.06),
    d(`${H}/candle_triple.gltf`, -3.1, -6.1, 0, 1.12),
    d(`${H}/candle_triple.gltf`, 3.1, -6.1, 0, 1.12),
  ],
  12: [
    d(`${D}/wall_arched.gltf`, 0, -8.72, 0, 1.3),
    d(`${D}/pillar_decorated.gltf`, -6.1, -7.0, 0, 1.08),
    d(`${D}/pillar_decorated.gltf`, 6.1, -7.0, 0, 1.08),
    d(`${D}/banner_patternB_blue.gltf`, -3.4, -8.5, 0, 1.02, 2.48),
    d(`${D}/banner_patternA_green.gltf`, 3.4, -8.5, 0, 1.02, 2.48),
  ],
  13: [
    d(`${D}/wall_corner_gated.gltf`, 0, -8.55, 0, 1.12),
    d(`${D}/barrier_column.gltf`, -5.8, -7.0, 0, 1.05),
    d(`${D}/barrier_column.gltf`, 5.8, -7.0, 0, 1.05),
    d(`${D}/torch_lit.gltf`, -3.1, -6.0, 0, 1.16),
    d(`${D}/torch_lit.gltf`, 3.1, -6.0, 0, 1.16),
  ],
  14: [
    d(`${H}/arch_gate.gltf`, 0, -8.55, 0, 1.2),
    d(`${H}/gravemarker_A.gltf`, -7.6, -5.5, 0.12, 0.96),
    d(`${H}/gravemarker_A.gltf`, 7.6, -5.5, -0.12, 0.96),
    d(`${H}/skull_candle.gltf`, -3.2, -6.0, 0, 1.12),
    d(`${H}/skull_candle.gltf`, 3.2, -6.0, 0, 1.12),
  ],
  15: [
    d(`${D}/wall_arched.gltf`, 0, -8.68, 0, 1.28),
    d(`${D}/barrier_column.gltf`, -6.1, -7.0, 0, 1.08),
    d(`${D}/barrier_column.gltf`, 6.1, -7.0, 0, 1.08),
    d(`${H}/candle_triple.gltf`, -3.0, -6.1, 0, 1.16),
    d(`${H}/candle_triple.gltf`, 3.0, -6.1, 0, 1.16),
  ],
  16: [
    d(`${D}/wall_arched.gltf`, 0, -8.68, 0, 1.32),
    d(`${D}/pillar_decorated.gltf`, -6.0, -7.0, 0, 1.1),
    d(`${D}/pillar_decorated.gltf`, 6.0, -7.0, 0, 1.1),
    d(`${D}/banner_shield_red.gltf`, 0, -8.46, 0, 1.06, 2.5),
  ],
  17: [
    d(`${D}/wall_half.gltf`, -6.8, -8.72, 0, 0.92),
    d(`${D}/wall_half.gltf`, 6.8, -8.72, 0, 0.92),
    d(`${D}/rubble_half.gltf`, -7.4, -5.9, 0.2, 0.7),
    d(`${D}/rubble_half.gltf`, 7.4, -5.9, -0.2, 0.7),
    d(`${H}/post_lantern.gltf`, 0, -7.1, 0, 1.14),
  ],
  18: [
    d(`${D}/pillar.gltf`, -6.2, -6.8, 0, 1.06),
    d(`${D}/pillar.gltf`, 6.2, -6.8, 0, 1.06),
    d(`${R}/Stone_Chunks_Large.gltf`, -7.4, 3.8, 0.18, 0.94),
    d(`${R}/Stone_Chunks_Large.gltf`, 7.4, 3.8, -0.18, 0.94),
  ],
  19: [
    d(`${D}/wall_arched.gltf`, 0, -8.72, 0, 1.38),
    d(`${D}/pillar_decorated.gltf`, -6.2, -7.0, 0, 1.12),
    d(`${D}/pillar_decorated.gltf`, 6.2, -7.0, 0, 1.12),
    d(`${D}/banner_patternB_blue.gltf`, 0, -8.46, 0, 1.08, 2.54),
  ],
  20: [
    d(`${D}/wall_arched.gltf`, 0, -8.68, 0, 1.42),
    d(`${D}/barrier_column.gltf`, -6.3, -7.0, 0, 1.14),
    d(`${D}/barrier_column.gltf`, 6.3, -7.0, 0, 1.14),
    d(`${H}/shrine_candles.gltf`, 0, -7.2, 0, 1.3),
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

function buildGroundComposition(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `AncientVeilGround_${room}`;
  const ring = room === 13 || room === 15 || room === 18 || room === 20;
  const cross = room === 11;
  const diagonal = room === 14 || room === 17;
  const count = ring ? (room === 20 ? 18 : 14) : cross ? 12 : diagonal ? 11 : 10;
  const geometry = new THREE.BoxGeometry(ring ? 0.72 : 0.82, 0.035, ring ? 0.42 : 0.54);
  const material = new THREE.MeshStandardMaterial({
    color: room >= 17 ? 0x3b3145 : 0x42464a,
    emissive: room >= 17 ? 0x241431 : 0x000000,
    emissiveIntensity: room >= 17 ? 0.18 : 0,
    roughness: 1,
    metalness: 0,
  });
  const pieces = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  for (let index = 0; index < count; index += 1) {
    if (ring) {
      const angle = index / count * Math.PI * 2;
      const radiusX = room === 20 ? 3.8 : 3.2;
      const radiusZ = room === 20 ? 2.7 : 2.3;
      position.set(Math.sin(angle) * radiusX, 0.018, -0.35 + Math.cos(angle) * radiusZ);
      euler.set(0, -angle + Math.PI / 2, 0);
      scale.set(0.94 + (index % 3) * 0.07, 1, 0.9 + (index % 2) * 0.1);
    } else if (cross) {
      const arm = index < 6;
      const local = index % 6;
      position.set(arm ? 0 : -3.8 + local * 1.52, 0.018, arm ? 4.6 - local * 1.8 : -0.4);
      euler.set(0, arm ? 0 : Math.PI / 2, 0);
      scale.set(0.94 + (local % 3) * 0.06, 1, 0.92);
    } else if (diagonal) {
      const progress = index / Math.max(1, count - 1);
      position.set(-4.0 + progress * 8.0, 0.018, 4.8 - progress * 10.0);
      euler.set(0, -0.68 + Math.sin(index * 1.2) * 0.08, 0);
      scale.set(0.92 + (index % 3) * 0.07, 1, 0.9 + (index % 2) * 0.08);
    } else {
      const progress = index / Math.max(1, count - 1);
      position.set(Math.sin(index * 1.5) * 0.22, 0.018, 5.0 - progress * 10.2);
      euler.set(0, Math.sin(index * 1.1) * 0.08, 0);
      scale.set(0.94 + (index % 3) * 0.06, 1, 0.92 + (index % 2) * 0.06);
    }
    rotation.setFromEuler(euler);
    matrix.compose(position, rotation, scale);
    pieces.setMatrixAt(index, matrix);
  }
  pieces.instanceMatrix.needsUpdate = true;
  pieces.castShadow = false;
  pieces.receiveShadow = !IS_MOBILE;
  pieces.frustumCulled = true;
  root.add(pieces);
  root.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
  };
  return root;
}

export async function preloadAncientVeilRoomTheme(room: number) {
  const pieces = ANCIENT_VEIL_DECORATIONS[room] ?? [];
  await Promise.allSettled(pieces.map(piece => prototypeFor(piece.model)));
}

export function buildAncientVeilRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `AncientVeilRoomTheme_${room}`;
  const ground = buildGroundComposition(THREE, room);
  root.add(ground);
  const pieces = ANCIENT_VEIL_DECORATIONS[room] ?? [];
  let active = true;
  root.userData.ready = Promise.allSettled(pieces.map(async piece => {
    try {
      const prototype = await prototypeFor(piece.model);
      if (!active) return;
      const object = prototype.clone(true);
      object.position.set(piece.x, piece.y ?? 0, piece.z);
      object.rotation.y = piece.rotation ?? 0;
      object.scale.setScalar(piece.scale ?? 1);
      object.userData.ancientVeilDecoration = { room, model: piece.model };
      root.add(object);
    } catch (error) {
      console.warn(`Ancient Veil decoration unavailable in room ${room}: ${piece.model}`, error);
    }
  })).then(() => undefined);
  root.userData.dispose = () => {
    active = false;
    ground.userData?.dispose?.();
  };
  return root;
}
