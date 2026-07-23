import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const F = 'forest/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';
const U = 'furniture/Assets/gltf';
const T = 'tools/Assets/gltf';

const prototypePromises = new Map<string, Promise<any>>();

type MeadowDecoration = { model: string; x: number; y?: number; z: number; rotation?: number; scale?: number };
const d = (model: string, x: number, z: number, rotation = 0, scale = 1, y = 0): MeadowDecoration => ({ model, x, y, z, rotation, scale });

export const MEADOW_ROOM_DECORATIONS: Record<number, MeadowDecoration[]> = {
  21: [
    d(`${D}/wall_arched.gltf`, 0, -8.6, 0, 1.15),
    d(`${D}/pillar.gltf`, -5.8, -7.0, 0, .9),
    d(`${D}/pillar.gltf`, 5.8, -7.0, 0, .9),
    d(`${D}/banner_patternA_green.gltf`, 0, -8.45, 0, 1.05, 2.45),
    d(`${F}/Bush_3_A_Color1.gltf`, -7.1, 1.8, .1, 1.08),
    d(`${F}/Grass_1_C_Color1.gltf`, 6.6, 4.4, 0, 1.32),
    d(`${F}/Rock_1_H_Color1.gltf`, 7.1, -4.8, -.2, .92),
  ],
  22: [
    d(`${F}/Bush_4_D_Color1.gltf`, -5.7, -4.7, 0, 1.12),
    d(`${F}/Grass_2_B_Color1.gltf`, 5.8, -1.8, 0, 1.35),
    d(`${F}/Rock_1_C_Color1.gltf`, -6.2, 4.5, .16, .9),
    d(`${F}/Rock_1_F_Color1.gltf`, 6.2, 4.3, -.16, .9),
    d(`${F}/Grass_1_B_Color1.gltf`, 0, -5.6, 0, 1.22),
  ],
  23: [
    d(`${F}/Rock_1_A_Color1.gltf`, -7.2, -.4, .24, .94),
    d(`${F}/Rock_2_G_Color1.gltf`, 7.0, 2.7, -.22, .92),
    d(`${F}/Grass_1_B_Color1.gltf`, 1.2, 4.8, 0, 1.28),
    d(`${D}/rubble_half.gltf`, -7.4, -5.2, .18, .62),
    d(`${D}/rubble_half.gltf`, 7.4, 4.8, -.18, .62),
  ],
  24: [
    d(`${R}/Pallet_Wood.gltf`, -7.2, 4.1, .1, 1.02),
    d(`${D}/box_small.gltf`, 7.2, -4.5, -.1, .96),
    d(`${F}/Grass_1_A_Color1.gltf`, 5.2, 4.7, 0, 1.24),
    d(`${U}/table_low.gltf`, -7.3, -4.0, Math.PI / 2, .94),
    d(`${T}/saw.gltf`, -7.0, -3.8, .2, 1.16, .72),
    d(`${D}/barrel_small.gltf`, 7.3, 3.9, -.12, .95),
  ],
  25: [
    d(`${F}/Rock_2_B_Color1.gltf`, -6.5, 4.5, .18, .95),
    d(`${F}/Rock_1_F_Color1.gltf`, 6.4, 4.4, -.18, .94),
    d(`${F}/Grass_2_C_Color1.gltf`, 0, 5.0, 0, 1.3),
    d(`${F}/Rock_1_C_Color1.gltf`, -7.0, -4.6, .15, .9),
    d(`${F}/Rock_1_H_Color1.gltf`, 7.0, -4.6, -.15, .9),
  ],
  26: [
    d(`${F}/Bush_4_E_Color1.gltf`, -6.0, 4.4, 0, 1.14),
    d(`${F}/Bush_3_B_Color1.gltf`, 6.1, 4.2, 0, 1.1),
    d(`${F}/Grass_1_D_Color1.gltf`, 0, -5.0, 0, 1.3),
    d(`${F}/Bush_3_A_Color1.gltf`, -5.8, -4.4, .08, 1.08),
    d(`${F}/Bush_3_C_Color1.gltf`, 5.8, -4.4, -.08, 1.08),
    d(`${F}/Rock_1_K_Color1.gltf`, 0, 4.8, 0, .9),
  ],
  27: [
    d(`${U}/table_medium.gltf`, 6.6, -4.3, -.08, .94),
    d(`${D}/barrel_small.gltf`, -6.6, 4.0, .16, .95),
    d(`${F}/Bush_2_C_Color1.gltf`, 6.8, 3.8, 0, 1.08),
    d(`${T}/lantern.gltf`, 6.0, -4.0, 0, 1.12, .78),
    d(`${D}/box_small.gltf`, -6.4, -4.0, .1, .92),
    d(`${R}/Pallet_Wood.gltf`, -7.1, 3.9, -.08, .98),
  ],
  28: [
    d(`${F}/Tree_1_B_Color1.gltf`, -8.5, -1.8, .1, 1.08),
    d(`${F}/Rock_1_K_Color1.gltf`, 7.0, -4.6, -.18, .9),
    d(`${F}/Grass_2_A_Color1.gltf`, 6.0, 4.7, 0, 1.28),
    d(`${F}/Rock_1_C_Color1.gltf`, -6.8, 4.6, .16, .9),
  ],
  29: [
    d(`${D}/wall_arched.gltf`, 0, -8.55, 0, 1.18),
    d(`${D}/pillar.gltf`, -5.7, -7.0, 0, .96),
    d(`${D}/pillar.gltf`, 5.7, -7.0, 0, .96),
    d(`${D}/rubble_half.gltf`, -7.0, -4.6, .18, .68),
    d(`${F}/Rock_2_H_Color1.gltf`, 7.0, 4.5, -.18, .9),
    d(`${F}/Grass_1_C_Color1.gltf`, -5.2, 4.6, 0, 1.3),
  ],
  30: [
    d(`${D}/wall_arched.gltf`, 0, -8.4, 0, 1.35),
    d(`${D}/pillar.gltf`, -5.8, -7.0, 0, 1.12),
    d(`${D}/pillar.gltf`, 5.8, -7.0, 0, 1.12),
    d(`${D}/banner_patternA_green.gltf`, 0, -8.25, 0, 1.15, 2.55),
    d(`${D}/rubble_half.gltf`, -7.2, 3.9, .24, .72),
    d(`${D}/rubble_half.gltf`, 7.2, 3.9, -.24, .72),
    d(`${F}/Grass_2_B_Color1.gltf`, -6.8, 4.8, 0, 1.22),
    d(`${F}/Grass_2_C_Color1.gltf`, 6.8, 4.8, 0, 1.22),
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

function buildMeadowGroundComposition(THREE: any, room: number) {
  if (room < 21 || room > 30) return null;
  const group = new THREE.Group();
  group.name = `MeadowGroundComposition_${room}`;
  const ring = room === 26 || room === 28 || room === 30;
  const diagonal = room === 23 || room === 25 || room === 29;
  const camp = room === 24 || room === 27;
  const count = ring ? (room === 30 ? 14 : 12) : camp ? 10 : diagonal ? 9 : room === 21 ? 7 : 8;
  const wood = camp;
  const geometry = new THREE.BoxGeometry(
    wood ? 1.18 : room === 30 ? .82 : .72,
    wood ? .045 : .035,
    wood ? .42 : room === 30 ? .48 : .62,
  );
  const material = new THREE.MeshStandardMaterial({
    color: wood ? 0x5b4630 : room === 30 ? 0x4d5f54 : 0x566a55,
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
    if (ring) {
      const angle = index / count * Math.PI * 2;
      const radiusX = room === 30 ? 3.65 : room === 28 ? 3.15 : 2.8;
      const radiusZ = room === 30 ? 2.45 : room === 28 ? 2.15 : 1.95;
      position.set(Math.sin(angle) * radiusX, .018, (room === 30 ? -2.55 : -.3) + Math.cos(angle) * radiusZ);
      euler.set(0, -angle + Math.PI / 2, 0);
      scale.set(1 + (index % 3) * .08, 1, .92 + (index % 2) * .12);
    } else if (camp) {
      const column = index % 2;
      const row = Math.floor(index / 2);
      position.set((column ? 1 : -1) * 1.05, .023, -2.1 + row * 1.05);
      euler.set(0, (column ? -.04 : .04), 0);
      scale.set(.96 + (row % 3) * .04, 1, .94);
    } else if (diagonal) {
      const progress = index / Math.max(1, count - 1);
      const reverse = room === 25;
      position.set((reverse ? 3.7 : -3.7) + progress * (reverse ? -7.4 : 7.4), .018, 4.8 - progress * 10.0);
      euler.set(0, (reverse ? .62 : -.62) + Math.sin(index * 1.2) * .08, 0);
      scale.set(.92 + (index % 3) * .08, 1, .9 + (index % 2) * .1);
    } else {
      const progress = index / Math.max(1, count - 1);
      position.set(Math.sin(index * 1.7) * .48, .018, 5.0 - progress * 10.2);
      euler.set(0, Math.sin(index * 1.13) * .28, 0);
      scale.set(.92 + (index % 3) * .08, 1, .9 + (index % 2) * .12);
    }
    rotation.setFromEuler(euler);
    matrix.compose(position, rotation, scale);
    pieces.setMatrixAt(index, matrix);
  }
  pieces.instanceMatrix.needsUpdate = true;
  pieces.castShadow = false;
  pieces.receiveShadow = !IS_MOBILE;
  pieces.frustumCulled = true;
  pieces.userData.meadowGroundComposition = room;
  group.add(pieces);
  group.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
  };
  return group;
}

export async function preloadMeadowRoomTheme(room: number) {
  const pieces = MEADOW_ROOM_DECORATIONS[room] ?? [];
  await Promise.allSettled(pieces.map(piece => prototypeFor(piece.model)));
}

export function buildMeadowRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `MeadowRoomTheme_${room}`;
  const pieces = MEADOW_ROOM_DECORATIONS[room] ?? [];
  const groundComposition = buildMeadowGroundComposition(THREE, room);
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
      object.userData.meadowDecoration = { room, model: piece.model };
      root.add(object);
    } catch (error) {
      console.warn(`Meadow decoration unavailable in room ${room}: ${piece.model}`, error);
    }
  })).then(() => undefined);
  root.userData.dispose = () => {
    active = false;
    groundComposition?.userData?.dispose?.();
  };
  return root;
}
