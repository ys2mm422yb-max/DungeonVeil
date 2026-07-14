import { loadMetaProgression } from '../game/metaProgression';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';

const APP_BASE_URL = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_APP_BASE_URL = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;

function pagesSafeLoader(GLTFLoader: any) {
  return class VillagePagesSafeGLTFLoader extends GLTFLoader {
    loadAsync(url: string, onProgress?: (event: ProgressEvent<EventTarget>) => void) {
      const resolved = url.startsWith('/assets/')
        ? `${NORMALIZED_APP_BASE_URL}${url.replace(/^\/+/, '')}`
        : url;
      return super.loadAsync(resolved, onProgress);
    }
  };
}

/**
 * The village displays the exact same Ranger body, animation and equipment
 * attachments as a real dungeon run. The loader wrapper only rewrites root-relative
 * asset URLs so the shared run rig also works below the GitHub Pages /DungeonVeil/ path.
 */
export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const rig = await loadKayKitRanger(THREE, pagesSafeLoader(GLTFLoader));
  const meta = loadMetaProgression();

  rig.root.name = 'VillageEquippedPlayer';
  rig.root.userData.presentation = 'village-showcase-v4-run-ranger';
  rig.root.userData.equippedLoadout = {
    bow: meta.equipped.bow,
    quiver: meta.equipped.quiver,
    talisman: meta.equipped.talisman,
  };
  rig.root.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
  });

  rig.setMoving(false);
  return rig;
}
