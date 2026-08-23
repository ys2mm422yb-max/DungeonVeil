import { EQUIPMENT, loadMetaProgression } from '../game/metaProgression';
import { resolveEquippedPlayerBody } from '../game/equippedPlayerBody';
import { isOptionalEquipmentSlotEquipped } from '../game/optionalEquipmentState';
import { KAYKIT_PLAYER_ASSETS, type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitRangerWeapons } from './kaykitWeapons3D';
import { createVisibleUpgradePrestige3D, type VisibleUpgradePrestigeBinding3D } from './visibleUpgradePrestige3D';

const APP_BASE_URL = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_APP_BASE_URL = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;
const KAYKIT_ROOT = '/assets/kaykit';

function resolveVillageAssetUrl(url: string): string {
  if (/^(?:https?:)?\/\//i.test(url) || /^(?:data|blob):/i.test(url)) return url;

  const appBase = new URL(NORMALIZED_APP_BASE_URL, window.location.origin);
  const appBaseSegment = appBase.pathname.replace(/^\/+|\/+$/g, '');
  let relative = url.replace(/^\/+/, '');
  if (appBaseSegment && (relative === appBaseSegment || relative.startsWith(`${appBaseSegment}/`))) {
    relative = relative.slice(appBaseSegment.length).replace(/^\/+/, '');
  }
  return new URL(relative, appBase).href;
}

function pagesSafeLoader(GLTFLoader: any) {
  return class VillagePagesSafeGLTFLoader extends GLTFLoader {
    loadAsync(url: string, onProgress?: (event: ProgressEvent<EventTarget>) => void) {
      return super.loadAsync(resolveVillageAssetUrl(url), onProgress);
    }
  };
}

function clipKey(clip: any): string {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function prepareModel(object: any): void {
  object.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
    node.castShadow = false;
    node.receiveShadow = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => {
      material.transparent = false;
      material.opacity = 1;
      material.depthTest = true;
      material.depthWrite = true;
      material.needsUpdate = true;
    });
  });
}

function addPresentationModel(
  THREE: any,
  parent: any,
  object: any,
  name: string,
  targetSize: number,
  position: [number, number, number],
  rotation: [number, number, number],
): any | null {
  if (!object) return null;

  prepareModel(object);
  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.setScalar(1);
  object.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z, 0.001);
  object.scale.setScalar(scale);
  object.position.copy(center.multiplyScalar(-scale));

  const holder = new THREE.Group();
  holder.name = name;
  holder.position.set(...position);
  holder.rotation.set(...rotation);
  holder.add(object);
  parent.add(holder);
  return holder;
}

/**
 * A clean menu presentation of the equipped KayKit player body used in a run.
 * The combat rig is intentionally not reused here because its hand- and
 * bone-mounted attachments created duplicate equipment and face clipping.
 */
export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const meta = loadMetaProgression();
  const equippedBody = resolveEquippedPlayerBody(meta.equipped.armor);
  const Loader = pagesSafeLoader(GLTFLoader);
  const loader = new Loader();
  const quiverEquipped = isOptionalEquipmentSlotEquipped('quiver');
  const quiverDefinition = quiverEquipped ? EQUIPMENT[meta.equipped.quiver] : null;

  const [rangerGltf, idleGltf, weapons, quiverGltf] = await Promise.all([
    loader.loadAsync(`${KAYKIT_ROOT}/${equippedBody.assetPath}`),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
    loadKayKitRangerWeapons(),
    quiverDefinition ? loader.loadAsync(`${KAYKIT_ROOT}/${quiverDefinition.assetPath}`) : Promise.resolve(null),
  ]);

  if (!weapons?.bow) throw new Error('Equipped village bow could not be loaded');

  const root = new THREE.Group();
  root.name = 'VillageEquippedPlayer';
  root.userData.canonicalFallbackAsset = KAYKIT_PLAYER_ASSETS.ranger;
  root.userData.presentation = 'village-showcase-v14-player-focus';
  root.userData.showcasePose = 'v16-sampled-idle-a-root-motion-loadout';
  root.userData.equipmentPose = quiverEquipped ? 'left-hand-bow-right-shoulder-quiver' : 'left-hand-bow-no-quiver';
  root.userData.equippedLoadout = {
    bow: meta.equipped.bow,
    quiver: quiverEquipped ? meta.equipped.quiver : null,
    armor: meta.equipped.armor,
  };
  root.userData.resolvedArmor = equippedBody.armorId;
  root.userData.armorFallback = equippedBody.usedFallback;

  const visual = rangerGltf.scene;
  visual.name = `VillageEquippedBody_${equippedBody.armorId}`;
  visual.scale.setScalar(1.18);
  prepareModel(visual);
  root.add(visual);

  const clips = [...(rangerGltf.animations ?? []), ...(idleGltf.animations ?? [])];
  const idleClip = clips.find((clip: any) => clipKey(clip).includes('idle_a'))
    ?? clips.find((clip: any) => {
      const key = clipKey(clip);
      return key.includes('idle') && !key.includes('idle_b');
    });
  if (!idleClip) throw new Error('KayKit idle animation is missing for the equipped village player');

  const mixer = new THREE.AnimationMixer(visual);
  const idleAction = mixer.clipAction(idleClip);
  idleAction.reset().play();
  mixer.update(0.01);
  idleAction.paused = true;

  const equipmentRoot = new THREE.Group();
  equipmentRoot.name = 'VillageReadableLoadout';
  root.add(equipmentRoot);

  const bowHolder = addPresentationModel(
    THREE,
    equipmentRoot,
    weapons.bow,
    'VillageVisibleEquippedBow',
    1.42,
    [-0.54, 0.78, 0.2],
    [Math.PI / 2, -0.05, -0.38],
  );
  const quiverHolder = addPresentationModel(
    THREE,
    equipmentRoot,
    quiverGltf?.scene ?? null,
    'VillageVisibleEquippedQuiver',
    0.84,
    [0.46, 1.3, -0.1],
    [0.06, 0.48, 0.14],
  );

  let arrowCount = 0;
  if (quiverHolder && weapons.arrow) {
    for (let index = 0; index < 3; index++) {
      const arrow = weapons.arrow.clone(true);
      const arrowHolder = addPresentationModel(
        THREE,
        quiverHolder,
        arrow,
        `VillageVisibleQuiverArrow${index + 1}`,
        0.58,
        [(index - 1) * 0.055, 0.28 + (index % 2) * 0.035, 0.015],
        [0.02, 0, (index - 1) * 0.04],
      );
      if (arrowHolder) arrowCount++;
    }
  }

  root.userData.visibleEquipment = {
    bow: Boolean(bowHolder),
    quiver: Boolean(quiverHolder),
    armor: true,
    arrows: arrowCount,
  };

  const visibleBindings: VisibleUpgradePrestigeBinding3D[] = [];
  const armorLevel = Number(meta.owned[meta.equipped.armor]?.level ?? 1);
  const bowLevel = Number(meta.owned[meta.equipped.bow]?.level ?? 1);
  const quiverLevel = Number(meta.owned[meta.equipped.quiver]?.level ?? 1);
  visibleBindings.push(createVisibleUpgradePrestige3D(THREE, visual, {
    slot: 'armor',
    level: armorLevel,
    binding: 'visible:menu-player-armor',
  }));
  if (bowHolder) visibleBindings.push(createVisibleUpgradePrestige3D(THREE, bowHolder, {
    slot: 'bow',
    level: bowLevel,
    binding: 'visible:menu-player-bow',
  }));
  if (quiverHolder) visibleBindings.push(createVisibleUpgradePrestige3D(THREE, quiverHolder, {
    slot: 'quiver',
    level: quiverLevel,
    binding: 'visible:menu-player-quiver',
  }));

  let menuCompanionRoot: any = null;
  let menuCompanionBinding: VisibleUpgradePrestigeBinding3D | null = null;
  const syncMenuCompanionPrestige = () => {
    const scene = root.parent?.parent;
    if (!scene?.children) return;
    const nextRoot = scene.children.find((child: any) => String(child?.name ?? '').startsWith('MainMenuCompanion_')) ?? null;
    if (nextRoot === menuCompanionRoot) return;
    menuCompanionBinding?.dispose();
    menuCompanionBinding = null;
    menuCompanionRoot = nextRoot;
    if (!nextRoot) return;
    const companionVisual = nextRoot.children?.find((child: any) => String(child?.name ?? '').startsWith('MenuCompanionVisual_'));
    if (!companionVisual) return;
    menuCompanionBinding = createVisibleUpgradePrestige3D(THREE, companionVisual, {
      slot: 'companion',
      level: Number(nextRoot.userData?.companionLevel ?? 1),
      binding: 'visible:menu-companion',
    });
  };

  if (typeof window !== 'undefined') {
    (window as any).__DUNGEON_VEIL_MENU_RANGER__ = {
      presentation: root.userData.presentation,
      pose: root.userData.showcasePose,
      equipmentPose: root.userData.equipmentPose,
      animationDriver: 'stable-root-idle-v1',
      stablePoseSource: idleClip.name,
      skeletalPlayback: 'frozen-after-pose-sample',
      loadout: root.userData.equippedLoadout,
      resolvedArmor: root.userData.resolvedArmor,
      armorFallback: root.userData.armorFallback,
      visibleEquipment: root.userData.visibleEquipment,
      cleanSingleBody: true,
      depthTestedEquipment: true,
      playerFocusedScale: 0.72,
    };
  }

  let elapsed = 0;
  let stopped = false;
  return {
    root,
    arrowPrototype: weapons.arrow ?? new THREE.Group(),
    setMoving: () => undefined,
    setMotionSpeed: () => undefined,
    triggerAttack: () => undefined,
    triggerDash: () => undefined,
    update(delta: number) {
      if (stopped) return;
      elapsed += delta;
      root.position.x = 0;
      root.position.y = -0.08 + Math.sin(elapsed * 1.18) * 0.008;
      root.position.z = -1.82;
      root.rotation.y = -0.025 + Math.sin(elapsed * 0.72) * 0.008;
      root.scale.setScalar(0.72);
      syncMenuCompanionPrestige();
      visibleBindings.forEach(binding => binding.update(0));
      menuCompanionBinding?.update(0);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      visibleBindings.forEach(binding => binding.dispose());
      visibleBindings.length = 0;
      menuCompanionBinding?.dispose();
      menuCompanionBinding = null;
      menuCompanionRoot = null;
      mixer.stopAllAction();
    },
  };
}
