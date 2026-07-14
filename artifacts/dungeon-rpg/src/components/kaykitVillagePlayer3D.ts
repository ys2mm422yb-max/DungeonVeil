import { loadMetaProgression } from '../game/metaProgression';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';

const APP_BASE_URL = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_APP_BASE_URL = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;

function resolveVillageAssetUrl(url: string): string {
  if (/^(?:https?:)?\/\//i.test(url) || /^(?:data|blob):/i.test(url)) return url;

  const appBase = new URL(NORMALIZED_APP_BASE_URL, window.location.origin);
  const appBaseSegment = appBase.pathname.replace(/^\/+|\/+$/g, '');
  let relative = url.replace(/^\/+/, '');

  // Production builds already rewrite the shared run rig to the app base. Strip
  // that segment before resolving so /DungeonVeil/ is never applied twice.
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

function findNode(root: any, names: string[]): any | null {
  let match: any | null = null;
  root.traverse?.((node: any) => {
    if (match) return;
    const key = normalizedName(node.name);
    if (names.some(name => key.includes(name))) match = node;
  });
  return match;
}

function moveToShowcaseRoot(root: any, object: any): boolean {
  if (!object) return false;
  root.updateMatrixWorld?.(true);
  object.updateMatrixWorld?.(true);
  root.attach(object);
  object.visible = true;
  object.traverse?.((node: any) => {
    node.visible = true;
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
  });
  return true;
}

/**
 * The village displays the exact same Ranger body and equipped items as a real
 * run. The adapter freezes a real idle pose, then places the already-loaded bow,
 * quiver and talisman where they remain readable in the compact mobile menu.
 */
export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const rig = await loadKayKitRanger(THREE, pagesSafeLoader(GLTFLoader));
  const meta = loadMetaProgression();

  rig.root.name = 'VillageEquippedPlayer';
  rig.root.userData.presentation = 'village-showcase-v7-visible-loadout';
  rig.root.userData.equippedLoadout = {
    bow: meta.equipped.bow,
    quiver: meta.equipped.quiver,
    talisman: meta.equipped.talisman,
  };
  rig.root.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
  });

  // Advance the shared run rig once so the menu never freezes on the GLB bind/T pose.
  rig.setMoving(false);
  rig.update(0.12);
  rig.stop();

  const bow = findNode(rig.root, ['bowwithstring', 'bowawithstring', 'bowbwithstring', 'crossbow1handed', 'crossbow2handed', 'bowa', 'bowb']);
  if (moveToShowcaseRoot(rig.root, bow)) {
    bow.position.set(-0.54, 1.05, 0.34);
    bow.rotation.set(Math.PI / 2, 0.05, -0.08);
    bow.scale.setScalar(meta.equipped.bow.includes('crossbow') ? 0.78 : 0.9);
    bow.userData.menuEquipment = 'equipped-bow';
  }

  const quiver = findNode(rig.root, ['quiver']);
  if (moveToShowcaseRoot(rig.root, quiver)) {
    quiver.position.set(0.5, 1.12, 0.14);
    quiver.rotation.set(0.06, -0.12, -0.2);
    quiver.scale.setScalar(1.18);
    quiver.userData.menuEquipment = 'equipped-quiver';
  }

  const talisman = findNode(rig.root, ['key', 'shieldspikescolor', 'spellbook', 'smokebomb', 'shieldbadge', 'wand']);
  if (moveToShowcaseRoot(rig.root, talisman)) {
    talisman.position.set(0.02, 1.18, 0.43);
    talisman.rotation.set(Math.PI / 2, 0, 0);
    talisman.scale.setScalar(0.24);
    talisman.userData.menuEquipment = 'equipped-talisman';
  }

  rig.root.userData.visibleEquipment = {
    bow: Boolean(bow),
    quiver: Boolean(quiver),
    talisman: Boolean(talisman),
  };

  let elapsed = 0;
  return {
    root: rig.root,
    arrowPrototype: rig.arrowPrototype,
    setMoving: () => undefined,
    setMotionSpeed: () => undefined,
    triggerAttack: () => undefined,
    triggerDash: () => undefined,
    update(delta: number) {
      elapsed += delta;
      rig.root.position.x = 0.06;
      rig.root.position.y = -0.045 + Math.sin(elapsed * 1.35) * 0.012;
      rig.root.position.z = -2.58;
      rig.root.rotation.y = -0.16;
      rig.root.scale.setScalar(0.58);
    },
    stop() {
      rig.stop();
    },
  };
}
