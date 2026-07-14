import { EQUIPMENT, loadMetaProgression } from '../game/metaProgression';
import { KAYKIT_PLAYER_ASSETS, loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitRangerWeapons } from './kaykitWeapons3D';

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

function normalizedName(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function prepareShowcaseModel(object: any): void {
  object.traverse?.((node: any) => {
    node.visible = true;
    node.renderOrder = 30;
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
    node.castShadow = false;
    node.receiveShadow = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => {
      material.transparent = false;
      material.opacity = 1;
      material.depthTest = false;
      material.depthWrite = false;
      material.needsUpdate = true;
    });
  });
}

function addShowcaseModel(
  THREE: any,
  parent: any,
  object: any,
  name: string,
  targetSize: number,
  position: [number, number, number],
  rotation: [number, number, number],
): any | null {
  if (!object) return null;
  prepareShowcaseModel(object);
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

function collectBones(root: any): Map<string, any> {
  const bones = new Map<string, any>();
  root.traverse?.((node: any) => {
    if (!node.isBone) return;
    bones.set(normalizedName(node.name), node);
  });
  return bones;
}

/**
 * The village uses the exact dungeon-run Ranger rig and the same saved bow,
 * quiver and talisman definitions. The KayKit Idle_A skeleton drives the body,
 * while its authored arm quaternions are enforced so mobile renderers cannot
 * leave the character in the GLB bind pose.
 */
export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const meta = loadMetaProgression();
  const Loader = pagesSafeLoader(GLTFLoader);
  const loader = new Loader();
  const quiverDefinition = EQUIPMENT[meta.equipped.quiver];
  const talismanDefinition = EQUIPMENT[meta.equipped.talisman];

  const [rig, weapons, quiverGltf, talismanGltf, idleGltf] = await Promise.all([
    loadKayKitRanger(THREE, pagesSafeLoader(GLTFLoader)),
    loadKayKitRangerWeapons(),
    quiverDefinition ? loader.loadAsync(`${KAYKIT_ROOT}/${quiverDefinition.assetPath}`) : Promise.resolve(null),
    talismanDefinition ? loader.loadAsync(`${KAYKIT_ROOT}/${talismanDefinition.assetPath}`) : Promise.resolve(null),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
  ]);

  rig.root.name = 'VillageEquippedPlayer';
  rig.root.userData.presentation = 'village-showcase-v5-single-base-run-ranger';
  rig.root.userData.showcasePose = 'v8-animated-visible-loadout';
  rig.root.userData.equippedLoadout = {
    bow: meta.equipped.bow,
    quiver: meta.equipped.quiver,
    talisman: meta.equipped.talisman,
  };
  rig.root.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
  });

  const bowHolder = addShowcaseModel(
    THREE,
    rig.root,
    weapons?.bow ?? null,
    'VillageVisibleEquippedBow',
    1.95,
    [-0.68, 1.02, 0.82],
    [Math.PI / 2, 0.05, -0.08],
  );
  const quiverHolder = addShowcaseModel(
    THREE,
    rig.root,
    quiverGltf?.scene ?? null,
    'VillageVisibleEquippedQuiver',
    1.15,
    [0.68, 1.08, 0.76],
    [0.04, -0.14, -0.2],
  );
  const talismanHolder = addShowcaseModel(
    THREE,
    rig.root,
    talismanGltf?.scene ?? null,
    'VillageVisibleEquippedTalisman',
    0.38,
    [0.02, 1.2, 0.9],
    [Math.PI / 2, 0, 0],
  );

  const idleClip = idleGltf.animations?.find((clip: any) => clip.name === 'Idle_A')
    ?? idleGltf.animations?.find((clip: any) => String(clip.name).toLowerCase().includes('idle'));
  if (!idleClip) throw new Error('KayKit Idle_A animation is missing for the village Ranger');
  const idleMixer = new THREE.AnimationMixer(idleGltf.scene);
  const idleAction = idleMixer.clipAction(idleClip);
  idleAction.reset().play();
  const sourceBones = collectBones(idleGltf.scene);
  const targetBones = collectBones(rig.root);
  const bonePairs = Array.from(sourceBones.entries())
    .map(([key, source]) => ({ source, target: targetBones.get(key) }))
    .filter(pair => Boolean(pair.target));
  if (bonePairs.length < 20) throw new Error(`Village Ranger idle retarget found only ${bonePairs.length} matching bones`);

  const setArmQuaternion = (key: string, values: [number, number, number, number]) => {
    const bone = targetBones.get(key);
    if (bone) bone.quaternion.set(...values);
  };
  const enforceReadableArmPose = () => {
    setArmQuaternion('upperarml', [-0.53361487, -0.11677447, -0.77174187, 0.3256276]);
    setArmQuaternion('lowerarml', [0, 0, -0.35859543, 0.93349308]);
    setArmQuaternion('upperarmr', [-0.56062764, 0.04683267, 0.73693085, 0.37474841]);
    setArmQuaternion('lowerarmr', [0, 0, 0.37637338, 0.92646819]);
  };
  const refreshSkeletons = () => {
    rig.root.updateMatrixWorld(true);
    rig.root.traverse?.((node: any) => {
      if (node.isSkinnedMesh) node.skeleton?.update?.();
    });
  };
  const applyIdlePose = () => {
    bonePairs.forEach(({ source, target }) => {
      target.position.copy(source.position);
      target.quaternion.copy(source.quaternion);
      target.scale.copy(source.scale);
    });
    enforceReadableArmPose();
    refreshSkeletons();
  };
  idleMixer.update(0.01);
  idleGltf.scene.updateMatrixWorld(true);
  applyIdlePose();

  rig.root.userData.visibleEquipment = {
    bow: Boolean(bowHolder),
    quiver: Boolean(quiverHolder),
    talisman: Boolean(talismanHolder),
  };
  if (typeof window !== 'undefined') {
    (window as any).__DUNGEON_VEIL_MENU_RANGER__ = {
      presentation: rig.root.userData.presentation,
      pose: rig.root.userData.showcasePose,
      animationDriver: 'copied-kaykit-idle-a-locked-arms',
      matchedBones: bonePairs.length,
      loadout: rig.root.userData.equippedLoadout,
      visibleEquipment: rig.root.userData.visibleEquipment,
    };
  }

  rig.setMoving(false);
  let elapsed = 0;
  let shrineHandled = false;

  return {
    root: rig.root,
    arrowPrototype: rig.arrowPrototype,
    setMoving: () => undefined,
    setMotionSpeed: () => undefined,
    triggerAttack: () => undefined,
    triggerDash: () => undefined,
    update(delta: number) {
      elapsed += delta;
      idleMixer.update(delta);
      idleGltf.scene.updateMatrixWorld(true);
      applyIdlePose();
      rig.root.position.x = 0.04;
      rig.root.position.y = -0.05 + Math.sin(elapsed * 1.35) * 0.012;
      rig.root.position.z = -2.5;
      rig.root.rotation.y = -0.08;
      rig.root.scale.setScalar(0.58);

      if (!shrineHandled) {
        const shrine = rig.root.parent?.getObjectByName?.('VillageSquareShrine');
        if (shrine) {
          shrine.visible = false;
          shrineHandled = true;
        }
      }
    },
    stop() {
      idleMixer.stopAllAction();
      rig.stop();
    },
  };
}
