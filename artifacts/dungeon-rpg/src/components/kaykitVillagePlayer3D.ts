import { loadMetaProgression } from '../game/metaProgression';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';

/**
 * The village must display the exact same player body and equipped items as a run.
 * Keeping a second character/animation/attachment implementation caused the menu
 * avatar to drift away from the real in-game Ranger and left it in an invalid pose.
 */
export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const rig = await loadKayKitRanger(THREE, GLTFLoader);
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
