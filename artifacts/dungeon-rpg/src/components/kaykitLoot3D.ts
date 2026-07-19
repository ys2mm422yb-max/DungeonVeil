import type { Item } from '../game/entities';
import { EQUIPMENT, type EquipmentId } from '../game/metaProgression';
import { equipmentVisualProfile } from '../game/equipmentVisuals';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const KAYKIT_ROOT = '/assets/kaykit/';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LoadedGltf = { scene: any };
let potionPromise: Promise<any | null> | null = null;
let relicPromise: Promise<any | null> | null = null;
const equipmentPromises = new Map<EquipmentId, Promise<any | null>>();

function assetUrl(path: string) {
  return path.startsWith('/') ? path : `${KAYKIT_ROOT}${path}`;
}

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

function tintObject(THREE: any, object: any, accent: string, strength: number) {
  const tint = new THREE.Color(accent);
  object.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    const source = Array.isArray(node.material) ? node.material : [node.material];
    const materials = source.map((material: any) => {
      const clone = material?.clone?.() ?? material;
      if (clone?.color?.lerp) clone.color.lerp(tint, strength);
      if (clone?.emissive?.set) {
        clone.emissive.set(accent);
        clone.emissiveIntensity = Math.min(0.12, strength * 0.25);
      }
      return clone;
    });
    node.material = Array.isArray(node.material) ? materials : materials[0];
  });
}

function createRelicReliquary(THREE: any, prototype: any, accent: string) {
  const root = new THREE.Group();
  const color = new THREE.Color(accent);
  const dark = color.clone().multiplyScalar(0.24);
  const metal = new THREE.MeshStandardMaterial({ color: dark, metalness: 0.72, roughness: 0.3, emissive: color, emissiveIntensity: 0.08 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.56, 0.18, IS_MOBILE ? 12 : 18), metal);
  base.position.y = 0.09;
  root.add(base);
  const crystal = prototype.clone(true);
  crystal.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(crystal);
  const size = box.getSize(new THREE.Vector3());
  crystal.scale.setScalar(0.72 / Math.max(size.x, size.y, size.z, 0.001));
  crystal.position.y = 0.58;
  crystal.rotation.z = -0.16;
  root.add(crystal);
  const arcMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, depthWrite: false });
  for (const rotation of [0, Math.PI / 2]) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 7, IS_MOBILE ? 22 : 34), arcMaterial.clone());
    arc.position.y = 0.63;
    arc.rotation.set(Math.PI / 2, rotation, 0.18);
    root.add(arc);
  }
  root.userData.presentationKind = 'relic-reliquary';
  return root;
}

function createArmorToken(THREE: any, accent: string) {
  const root = new THREE.Group();
  const color = new THREE.Color(accent);
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.58, roughness: 0.38, emissive: color, emissiveIntensity: 0.06 });
  const darkMaterial = material.clone();
  darkMaterial.color.multiplyScalar(0.42);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.22), material);
  torso.position.y = 0.52;
  torso.scale.x = 0.82;
  root.add(torso);
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.3), material.clone());
    shoulder.position.set(side * 0.42, 0.76, 0);
    shoulder.rotation.z = side * -0.22;
    root.add(shoulder);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 7, 18, Math.PI), darkMaterial);
  collar.position.set(0, 0.86, 0.12);
  collar.rotation.z = Math.PI;
  root.add(collar);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.27), darkMaterial.clone());
  belt.position.y = 0.2;
  root.add(belt);
  root.userData.presentationKind = 'armor-token';
  return root;
}

function loadEquipment(id: EquipmentId) {
  if (!equipmentPromises.has(id)) {
    equipmentPromises.set(id, (async () => {
      const [{ GLTFLoader }, THREE] = await Promise.all([
        import(/* @vite-ignore */ GLTF_URL) as any,
        import(/* @vite-ignore */ THREE_URL) as any,
      ]);
      const loader = new GLTFLoader();
      const visual = equipmentVisualProfile(id);
      let primary: LoadedGltf;
      try {
        primary = await loader.loadAsync(assetUrl(visual.primaryPath));
      } catch (primaryError) {
        if (visual.primaryPath === visual.fallbackPath) throw primaryError;
        primary = await loader.loadAsync(assetUrl(visual.fallbackPath));
      }

      const group = new THREE.Group();
      tintObject(THREE, primary.scene, EQUIPMENT[id].accent, visual.tintStrength);
      group.add(primary.scene);

      if (visual.accessoryPath) {
        try {
          const accessory: LoadedGltf = await loader.loadAsync(assetUrl(visual.accessoryPath));
          tintObject(THREE, accessory.scene, EQUIPMENT[id].accent, Math.min(0.65, visual.tintStrength + 0.18));
          accessory.scene.position.set(...(visual.accessoryPosition ?? [0, 0, 0]));
          accessory.scene.rotation.set(...(visual.accessoryRotation ?? [0, 0, 0]));
          accessory.scene.scale.setScalar(visual.accessoryScale ?? 1);
          group.add(accessory.scene);
        } catch (error) {
          console.warn(`Equipment drop accessory failed for ${id}`, error);
        }
      }
      return group;
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

  const object = equipment?.slot === 'armor'
    ? createArmorToken(THREE, equipment.accent)
    : relic
      ? createRelicReliquary(THREE, prototype, item.color || '#a978ff')
      : prototype.clone(true);
  if (equipment?.slot === 'armor') {
    object.scale.setScalar(0.96);
    object.position.y = 0.04;
  } else if (equipment) {
    const visual = equipmentVisualProfile(equipment.id);
    object.rotation.set(...visual.rotation);
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
    object.scale.setScalar(1.05 / maxDimension);
    object.position.y = 0.08;
  } else {
    object.scale.setScalar(relic ? 0.94 : 0.9);
    object.position.y = relic ? 0.02 : 0.04;
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
  const auraOpacity = rarity === 'epic' ? 0.68 : rarity === 'rare' ? 0.52 : 0.34;
  const segments = IS_MOBILE ? 22 : 32;

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.34 * auraScale, 0.62 * auraScale, segments),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: auraOpacity, depthWrite: false, side: THREE.DoubleSide }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.14;
  root.add(halo);

  const innerHalo = new THREE.Mesh(
    new THREE.CircleGeometry(0.34 * auraScale, segments),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: auraOpacity * 0.28, depthWrite: false, side: THREE.DoubleSide }),
  );
  innerHalo.rotation.x = -Math.PI / 2;
  innerHalo.position.y = -0.145;
  root.add(innerHalo);

  const glow = IS_MOBILE ? null : new THREE.PointLight(
    color,
    rarity === 'epic' ? 3.6 : rarity === 'rare' ? 2.5 : 1.3,
    rarity === 'epic' ? 4.8 : rarity === 'rare' ? 3.8 : 2.6,
    2,
  );
  if (glow) {
    glow.position.y = equipment || relic ? 0.55 : 0.32;
    root.add(glow);
  }

  root.userData.halo = halo;
  root.userData.innerHalo = innerHalo;
  root.userData.glow = glow;
  root.userData.relic = relic;
  root.userData.equipment = Boolean(equipment);
  root.userData.rarity = rarity;
  root.userData.presentationKind = object.userData.presentationKind ?? (equipment ? 'equipment-model' : relic ? 'relic-reliquary' : 'potion');
  return root;
}
