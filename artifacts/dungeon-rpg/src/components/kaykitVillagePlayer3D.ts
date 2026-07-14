import { EQUIPMENT, loadMetaProgression } from '../game/metaProgression';
import { KAYKIT_PLAYER_ASSETS, type KayKitPlayerRig } from './kaykitPlayer3D';
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
 * A clean menu presentation of the same KayKit Ranger body used in a run.
 * The combat rig is intentionally not reused here because its hand- and
 * bone-mounted attachments created duplicate equipment and face clipping.
 */
export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const meta = loadMetaProgression();
  const Loader = pagesSafeLoader(GLTFLoader);
  const loader = new Loader();
  const quiverDefinition = EQUIPMENT[meta.equipped.quiver];
  const talismanDefinition = EQUIPMENT[meta.equipped.talisman];

  const [rangerGltf, idleGltf, weapons, quiverGltf, talismanGltf] = await Promise.all([
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.ranger),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
    loadKayKitRangerWeapons(),
    quiverDefinition ? loader.loadAsync(`${KAYKIT_ROOT}/${quiverDefinition.assetPath}`) : Promise.resolve(null),
    talismanDefinition ? loader.loadAsync(`${KAYKIT_ROOT}/${talismanDefinition.assetPath}`) : Promise.resolve(null),
  ]);

  if (!weapons?.bow) throw new Error('Equipped village bow could not be loaded');

  const root = new THREE.Group();
  root.name = 'VillageEquippedPlayer';
  root.userData.presentation = 'village-showcase-v12-clean-ranger';
  root.userData.showcasePose = 'v12-idle-b-clean-side-loadout';
  root.userData.equippedLoadout = {
    bow: meta.equipped.bow,
    quiver: meta.equipped.quiver,
    talisman: meta.equipped.talisman,
  };

  const visual = rangerGltf.scene;
  visual.name = 'VillageRunRangerBody';
  visual.scale.setScalar(1.18);
  prepareModel(visual);
  root.add(visual);

  const clips = [...(rangerGltf.animations ?? []), ...(idleGltf.animations ?? [])];
  const idleClip = clips.find((clip: any) => clipKey(clip).includes('idle_b'))
    ?? clips.find((clip: any) => clipKey(clip).includes('idle_a'))
    ?? clips.find((clip: any) => clipKey(clip).includes('idle'));
  if (!idleClip) throw new Error('KayKit idle animation is missing for the village Ranger');

  const mixer = new THREE.AnimationMixer(visual);
  const idleAction = mixer.clipAction(idleClip);
  idleAction.reset().play();
  mixer.update(0.01);

  const equipmentRoot = new THREE.Group();
  equipmentRoot.name = 'VillageCleanLoadout';
  root.add(equipmentRoot);

  const bowHolder = addPresentationModel(
    THREE,
    equipmentRoot,
    weapons.bow,
    'VillageVisibleEquippedBow',
    1.3,
    [-0.82, 0.84, 0.06],
    [Math.PI / 2, 0.04, 0.06],
  );
  const quiverHolder = addPresentationModel(
    THREE,
    equipmentRoot,
    quiverGltf?.scene ?? null,
    'VillageVisibleEquippedQuiver',
    0.9,
    [0.68, 0.98, -0.18],
    [0.08, -0.2, -0.16],
  );
  const talismanHolder = addPresentationModel(
    THREE,
    equipmentRoot,
    talismanGltf?.scene ?? null,
    'VillageVisibleEquippedTalisman',
    meta.equipped.talisman === 'frost-grimoire' ? 0.24 : 0.17,
    [0.02, 1.02, 0.23],
    [Math.PI / 2, 0, 0],
  );

  root.userData.visibleEquipment = {
    bow: Boolean(bowHolder),
    quiver: Boolean(quiverHolder),
    talisman: Boolean(talismanHolder),
  };

  if (typeof window !== 'undefined') {
    (window as any).__DUNGEON_VEIL_MENU_RANGER__ = {
      presentation: root.userData.presentation,
      pose: root.userData.showcasePose,
      animationDriver: idleClip.name,
      loadout: root.userData.equippedLoadout,
      visibleEquipment: root.userData.visibleEquipment,
      cleanSingleBody: true,
      depthTestedEquipment: true,
    };
  }

  let elapsed = 0;
  return {
    root,
    arrowPrototype: weapons.arrow ?? new THREE.Group(),
    setMoving: () => undefined,
    setMotionSpeed: () => undefined,
    triggerAttack: () => undefined,
    triggerDash: () => undefined,
    update(delta: number) {
      elapsed += delta;
      mixer.update(delta);
      root.position.x = 0;
      root.position.y = -0.06 + Math.sin(elapsed * 1.25) * 0.01;
      root.position.z = -2.42;
      root.rotation.y = 0.04;
      root.scale.setScalar(0.58);
    },
    stop() {
      mixer.stopAllAction();
    },
  };
}
