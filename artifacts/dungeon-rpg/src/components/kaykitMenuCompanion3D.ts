import type { CompanionRoleV4 } from '../game/companionReserveV4';
import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitManifest } from './kaykitManifest3D';

const ROLE_MODEL: Readonly<Record<CompanionRoleV4, string>> = Object.freeze({
  'single-target': 'Ranger',
  'critical-support': 'Rogue_Hooded',
  shield: 'Knight',
  'loot-comfort': 'Barbarian',
  distraction: 'Mage',
});

export type KayKitMenuCompanionRig = {
  root: any;
  update: (delta: number) => void;
  stop: () => void;
};

let sharedClipsPromise: Promise<any[]> | null = null;

function clipKey(clip: any) {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function chooseIdle(clips: any[]) {
  return clips.find(clip => clipKey(clip).includes('idle_a'))
    ?? clips.find(clip => clipKey(clip).includes('idle') && !clipKey(clip).includes('crouch'))
    ?? null;
}

function characterPath(manifest: KayKitManifest, role: CompanionRoleV4) {
  const expected = ROLE_MODEL[role].toLowerCase();
  return findKayKitModels(manifest, 'adventurers', /\/characters\/gltf\/.*\.glb$/i)
    .find(path => path.toLowerCase().endsWith(`/${expected}.glb`)) ?? null;
}

function sharedClips(loader: any, manifest: KayKitManifest) {
  if (!sharedClipsPromise) {
    const paths = findKayKitModels(manifest, 'animations', /rig_medium_general\.glb$/i);
    sharedClipsPromise = Promise.all(paths.map(path => loader.loadAsync(modelUrl(manifest, path))))
      .then(entries => entries.flatMap(entry => entry.animations ?? []));
  }
  return sharedClipsPromise;
}

export async function loadKayKitMenuCompanion(
  THREE: any,
  GLTFLoaderCtor: any,
  role: CompanionRoleV4,
): Promise<KayKitMenuCompanionRig> {
  const manifest = await loadKayKitManifest();
  const path = characterPath(manifest, role);
  if (!path) throw new Error(`KayKit menu companion model missing for ${role}`);
  const loader = new GLTFLoaderCtor();
  const [character, clips] = await Promise.all([
    loader.loadAsync(modelUrl(manifest, path)),
    sharedClips(loader, manifest),
  ]);

  const visual = character.scene;
  visual.name = `HallActiveCompanionVisual_${role}`;
  visual.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => {
      material.depthTest = true;
      material.depthWrite = true;
      material.needsUpdate = true;
    });
  });

  const root = new THREE.Group();
  root.name = `HallActiveCompanion_${role}`;
  root.userData.activeCompanion = true;
  root.userData.companionRole = role;
  root.scale.setScalar(role === 'shield' ? 0.48 : 0.44);
  root.add(visual);

  const allClips = [...(character.animations ?? []), ...clips];
  const idleClip = chooseIdle(allClips);
  const mixer = new THREE.AnimationMixer(visual);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  idle?.reset().play();

  return {
    root,
    update(delta: number) { mixer.update(delta); },
    stop() { mixer.stopAllAction(); },
  };
}
