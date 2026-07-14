import { EQUIPMENT, loadMetaProgression } from '../game/metaProgression';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
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

function prepareShowcaseModel(object: any): void {
  object.traverse?.((node: any) => {
    node.visible = true;
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
    node.castShadow = false;
    node.receiveShadow = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => {
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
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

/**
 * The village uses the exact dungeon-run Ranger rig and the same saved bow,
 * quiver and talisman definitions. Separate showcase clones keep those real
 * models readable on a narrow phone screen without changing combat attachments.
 */
export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const meta = loadMetaProgression();
  const Loader = pagesSafeLoader(GLTFLoader);
  const loader = new Loader();
  const quiverDefinition = EQUIPMENT[meta.equipped.quiver];
  const talismanDefinition = EQUIPMENT[meta.equipped.talisman];

  const [rig, weapons, quiverGltf, talismanGltf] = await Promise.all([
    loadKayKitRanger(THREE, pagesSafeLoader(GLTFLoader)),
    loadKayKitRangerWeapons(),
    quiverDefinition ? loader.loadAsync(`${KAYKIT_ROOT}/${quiverDefinition.assetPath}`) : Promise.resolve(null),
    talismanDefinition ? loader.loadAsync(`${KAYKIT_ROOT}/${talismanDefinition.assetPath}`) : Promise.resolve(null),
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
    1.8,
    [-0.78, 1.08, 0.62],
    [Math.PI / 2, 0.05, -0.08],
  );
  const quiverHolder = addShowcaseModel(
    THREE,
    rig.root,
    quiverGltf?.scene ?? null,
    'VillageVisibleEquippedQuiver',
    1.05,
    [0.76, 1.1, 0.5],
    [0.04, -0.14, -0.2],
  );
  const talismanHolder = addShowcaseModel(
    THREE,
    rig.root,
    talismanGltf?.scene ?? null,
    'VillageVisibleEquippedTalisman',
    0.34,
    [0.02, 1.22, 0.76],
    [Math.PI / 2, 0, 0],
  );

  rig.root.userData.visibleEquipment = {
    bow: Boolean(bowHolder),
    quiver: Boolean(quiverHolder),
    talisman: Boolean(talismanHolder),
  };
  if (typeof window !== 'undefined') {
    (window as any).__DUNGEON_VEIL_MENU_RANGER__ = {
      presentation: rig.root.userData.presentation,
      pose: rig.root.userData.showcasePose,
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
      rig.update(delta);
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
      rig.stop();
    },
  };
}
