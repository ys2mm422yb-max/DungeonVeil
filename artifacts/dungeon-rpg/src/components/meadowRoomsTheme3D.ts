import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const F = 'forest/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';
const U = 'furniture/Assets/gltf';

const prototypePromises = new Map<string, Promise<any>>();

type MeadowDecoration = { model: string; x: number; z: number; rotation?: number; scale?: number };
const d = (model: string, x: number, z: number, rotation = 0, scale = 1): MeadowDecoration => ({ model, x, z, rotation, scale });

export const MEADOW_ROOM_DECORATIONS: Record<number, MeadowDecoration[]> = {
  21: [d(`${F}/Bush_3_A_Color1.gltf`, -7.1, 1.8, .1, 1.08), d(`${F}/Grass_1_C_Color1.gltf`, 6.6, 4.4, 0, 1.32), d(`${F}/Rock_1_H_Color1.gltf`, 7.1, -4.8, -.2, .92)],
  22: [d(`${F}/Bush_4_D_Color1.gltf`, -5.7, -4.7, 0, 1.12), d(`${F}/Grass_2_B_Color1.gltf`, 5.8, -1.8, 0, 1.35), d(`${F}/Rock_1_C_Color1.gltf`, -6.2, 4.5, .16, .9)],
  23: [d(`${F}/Rock_1_A_Color1.gltf`, -7.2, -.4, .24, .94), d(`${F}/Rock_2_G_Color1.gltf`, 7.0, 2.7, -.22, .92), d(`${F}/Grass_1_B_Color1.gltf`, 1.2, 4.8, 0, 1.28)],
  24: [d(`${R}/Pallet_Wood.gltf`, -6.8, 4.2, .1, 1.02), d(`${D}/box_small.gltf`, 6.8, -4.5, -.1, .96), d(`${F}/Grass_1_A_Color1.gltf`, 5.2, 4.7, 0, 1.24)],
  25: [d(`${F}/Rock_2_B_Color1.gltf`, -6.5, 4.5, .18, .95), d(`${F}/Rock_1_F_Color1.gltf`, 6.4, 4.4, -.18, .94), d(`${F}/Grass_2_C_Color1.gltf`, 0, 5.0, 0, 1.3)],
  26: [d(`${F}/Bush_4_E_Color1.gltf`, -6.0, 4.4, 0, 1.14), d(`${F}/Bush_3_B_Color1.gltf`, 6.1, 4.2, 0, 1.1), d(`${F}/Grass_1_D_Color1.gltf`, 0, -5.0, 0, 1.3)],
  27: [d(`${U}/table_medium.gltf`, 5.9, -4.3, -.08, .94), d(`${D}/barrel_small.gltf`, -6.2, 4.0, .16, .95), d(`${F}/Bush_2_C_Color1.gltf`, 6.6, 3.8, 0, 1.08)],
  28: [d(`${F}/Tree_1_B_Color1.gltf`, -8.5, -1.8, .1, 1.08), d(`${F}/Rock_1_K_Color1.gltf`, 7.0, -4.6, -.18, .9), d(`${F}/Grass_2_A_Color1.gltf`, 6.0, 4.7, 0, 1.28)],
  29: [d(`${D}/rubble_half.gltf`, -7.0, -4.6, .18, .68), d(`${F}/Rock_2_H_Color1.gltf`, 7.0, 4.5, -.18, .9), d(`${F}/Grass_1_C_Color1.gltf`, -5.2, 4.6, 0, 1.3)],
  30: [d(`${F}/Rock_3_A_Color1.gltf`, 0, -4.8, 0, 1.62), d(`${F}/Grass_2_B_Color1.gltf`, -6.8, 4.8, 0, 1.22), d(`${F}/Grass_2_C_Color1.gltf`, 6.8, 4.8, 0, 1.22)],
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

export async function preloadMeadowRoomTheme(room: number) {
  const pieces = MEADOW_ROOM_DECORATIONS[room] ?? [];
  await Promise.allSettled(pieces.map(piece => prototypeFor(piece.model)));
}

export function buildMeadowRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `MeadowRoomTheme_${room}`;
  const pieces = MEADOW_ROOM_DECORATIONS[room] ?? [];
  let active = true;
  root.userData.ready = Promise.allSettled(pieces.map(async piece => {
    try {
      const prototype = await prototypeFor(piece.model);
      if (!active) return;
      const object = prototype.clone(true);
      object.position.set(piece.x, 0, piece.z);
      object.rotation.y = piece.rotation ?? 0;
      object.scale.setScalar(piece.scale ?? 1);
      root.add(object);
    } catch (error) {
      console.warn(`Meadow decoration unavailable in room ${room}: ${piece.model}`, error);
    }
  })).then(() => undefined);
  root.userData.dispose = () => { active = false; };
  return root;
}
