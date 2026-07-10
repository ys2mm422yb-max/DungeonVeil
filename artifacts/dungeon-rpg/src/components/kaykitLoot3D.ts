import type { Item } from '../game/entities';
import { EQUIPMENT, type EquipmentId } from '../game/metaProgression';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LoadedGltf = { scene: any };
let potionPromise: Promise<any | null> | null = null;
let relicPromise: Promise<any | null> | null = null;
const equipmentPromises = new Map<EquipmentId, Promise<any | null>>();

function scorePotion(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/potion/.test(name)) score += 140;
  if (/(bottle|flask)/.test(name)) score += 70;
  if (/(red|health|life|heal)/.test(name)) score += 55;
  if (/(blue|green|purple|mana|poison)/.test(name)) score -= 35;
  if (/(bundle|pile|stack|texture|sample|preview)/.test(name)) score -= 250;
  return score;
}

function scoreRelic(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/(crystal|gem)/.test(name)) score += 180;
  if (/(purple|violet|blue)/.test(name)) score += 25;
  if (/(ore|rock|stone)/.test(name)) score += 20;
  if (/(bundle|pile|stack|texture|sample|preview)/.test(name)) score -= 250;
  return score;
}

async function loadBest(score: (path: string) => number) {
  const manifest = await loadKayKitManifest();
  const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
  const loader = new GLTFLoader();
  const path = [...findKayKitModels(manifest, 'resources', /\.(?:gltf|glb)$/i), ...findKayKitModels(manifest, 'dungeon', /\.(?:gltf|glb)$/i)]
    .map(candidate => ({ path: candidate, score: score(candidate) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))[0]?.path;
  if (!path) return null;
  const gltf: LoadedGltf = await loader.loadAsync(modelUrl(manifest, path));
  return gltf.scene;
}

function loadPotion() {
  if (!potionPromise) potionPromise = loadBest(scorePotion);
  return potionPromise;
}

function loadRelic() {
  if (!relicPromise) relicPromise = loadBest(scoreRelic);
  return relicPromise;
}

function loadEquipment(id: EquipmentId) {
  if (!equipmentPromises.has(id)) {
    equipmentPromises.set(id, (async () => {
      const manifest = await loadKayKitManifest();
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      const gltf: LoadedGltf = await loader.loadAsync(modelUrl(manifest, EQUIPMENT[id].assetPath));
      return gltf.scene;
    })().catch(() => null));
  }
  return equipmentPromises.get(id)!;
}

export function preloadKayKitHealingPotion() {
  return Promise.all([loadPotion(), loadRelic()]).then(() => undefined);
}

export async function createKayKitLootVisual(item: Item) {
  if (item.itemType !== 'potion' && item.itemType !== 'relic' && item.itemType !== 'equipment') return null;
  const equipment = item.itemType === 'equipment' && item.equipmentId ? EQUIPMENT[item.equipmentId] : null;
  const relic = item.itemType === 'relic';
  const [prototype, THREE] = await Promise.all([
    equipment ? loadEquipment(equipment.id) : relic ? loadRelic() : loadPotion(),
    import(/* @vite-ignore */ THREE_URL) as any,
  ]);
  if (!prototype) return null;

  const root = new THREE.Group();
  root.name = equipment ? `KayKitEquipmentDrop_${equipment.id}_${item.id}` : relic ? `KayKitVeilRelic_${item.id}` : `KayKitHealingPotion_${item.id}`;

  const object = prototype.clone(true);
  if (equipment) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
    object.scale.setScalar(1.05 / maxDimension);
    object.position.y = 0.08;
  } else {
    object.scale.setScalar(relic ? 1.15 : 0.9);
    object.position.y = relic ? 0.16 : 0.04;
  }
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = true;
  });
  root.add(object);

  const rarity = item.equipmentRarity ?? (relic ? 'epic' : 'common');
  const color = Number.parseInt((item.color || (relic ? '#a978ff' : '#ff6b4a')).replace('#', ''), 16) || 0xffffff;
  const auraScale = rarity === 'epic' ? 1.28 : rarity === 'rare' ? 1.1 : 0.88;
  const auraOpacity = rarity === 'epic' ? 0.78 : rarity === 'rare' ? 0.62 : 0.4;

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.34 * auraScale, 0.62 * auraScale, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: auraOpacity, depthWrite: false, side: THREE.DoubleSide }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.14;
  root.add(halo);

  const innerHalo = new THREE.Mesh(
    new THREE.CircleGeometry(0.34 * auraScale, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: auraOpacity * 0.34, depthWrite: false, side: THREE.DoubleSide }),
  );
  innerHalo.rotation.x = -Math.PI / 2;
  innerHalo.position.y = -0.145;
  root.add(innerHalo);

  const glow = new THREE.PointLight(
    color,
    IS_MOBILE ? (rarity === 'epic' ? 3.1 : rarity === 'rare' ? 2.2 : 1.2) : (rarity === 'epic' ? 4.2 : rarity === 'rare' ? 3 : 1.6),
    rarity === 'epic' ? 4.8 : rarity === 'rare' ? 3.8 : 2.6,
    2,
  );
  glow.position.y = equipment || relic ? 0.55 : 0.32;
  root.add(glow);

  root.userData.halo = halo;
  root.userData.innerHalo = innerHalo;
  root.userData.glow = glow;
  root.userData.relic = relic;
  root.userData.equipment = Boolean(equipment);
  root.userData.rarity = rarity;
  return root;
}
