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

function addLocalRotation(node: any, x: number, y: number, z: number): void {
  if (!node?.rotation) return;
  node.rotation.x += x;
  node.rotation.y += y;
  node.rotation.z += z;
}

/**
 * The village displays the exact same Ranger body and equipped items as a real
 * run. The menu adapter only gives that rig a readable showcase pose and keeps
 * the background shrine away from the character silhouette.
 */
export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const rig = await loadKayKitRanger(THREE, pagesSafeLoader(GLTFLoader));
  const meta = loadMetaProgression();

  rig.root.name = 'VillageEquippedPlayer';
  rig.root.userData.presentation = 'village-showcase-v5-single-base-run-ranger';
  rig.root.userData.showcasePose = 'v6-bow-ready-no-shrine-overlap';
  rig.root.userData.equippedLoadout = {
    bow: meta.equipped.bow,
    quiver: meta.equipped.quiver,
    talisman: meta.equipped.talisman,
  };
  rig.root.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
  });

  // The free Ranger file opens in its authored equipment pose. The generic idle
  // clips do not produce a reliable silhouette in every mobile browser, so the
  // menu freezes the exact run rig and applies one stable bow-ready pose.
  rig.stop();
  addLocalRotation(findNode(rig.root, ['upperarml']), 0, 0.18, -0.96);
  addLocalRotation(findNode(rig.root, ['lowerarml']), 0, 0.08, -0.2);
  addLocalRotation(findNode(rig.root, ['upperarmr']), 0, -0.38, 0.92);
  addLocalRotation(findNode(rig.root, ['lowerarmr']), 0, -0.24, 0.96);
  addLocalRotation(findNode(rig.root, ['chest', 'spine2']), 0, 0.12, 0);
  addLocalRotation(findNode(rig.root, ['head']), 0, -0.08, 0);

  const bow = findNode(rig.root, ['bowwithstring', 'bowa', 'bowb']);
  if (bow?.scale) bow.scale.multiplyScalar(1.08);
  const quiver = findNode(rig.root, ['quiver']);
  if (quiver?.scale) quiver.scale.multiplyScalar(1.12);

  let elapsed = 0;
  let shrineSeparated = false;
  return {
    root: rig.root,
    arrowPrototype: rig.arrowPrototype,
    setMoving: () => undefined,
    setMotionSpeed: () => undefined,
    triggerAttack: () => undefined,
    triggerDash: () => undefined,
    update(delta: number) {
      elapsed += delta;
      rig.root.position.x = 0.1;
      rig.root.position.y = -0.045 + Math.sin(elapsed * 1.35) * 0.012;
      rig.root.position.z = -2.62;
      rig.root.rotation.y = -0.42;
      rig.root.scale.setScalar(0.58);

      if (!shrineSeparated) {
        const shrine = rig.root.parent?.getObjectByName?.('VillageSquareShrine');
        if (shrine) {
          shrine.position.set(-2.25, 0.02, -6.15);
          shrine.rotation.y = -0.24;
          shrine.scale.setScalar(0.82);
          shrineSeparated = true;
        }
      }
    },
    stop() {
      rig.stop();
    },
  };
}
