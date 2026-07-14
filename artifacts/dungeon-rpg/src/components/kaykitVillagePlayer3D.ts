import { EQUIPMENT, loadMetaProgression, type EquipmentId } from '../game/metaProgression';
import { loadKayKitRangerWeapons } from './kaykitWeapons3D';
import { KAYKIT_PLAYER_ASSETS, type KayKitPlayerRig } from './kaykitPlayer3D';

const KAYKIT_ROOT = '/assets/kaykit';
const VILLAGE_ARCHER_ASSET = `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue_Hooded.glb`;
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

function clipKey(clip: any) {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function chooseVillageIdle(clips: any[]) {
  return clips.find(clip => clipKey(clip) === 'idle_b')
    ?? clips.find(clip => clipKey(clip) === 'idle_a')
    ?? clips.find(clip => clipKey(clip).includes('idle'))
    ?? null;
}

function prepareModel(root: any) {
  root?.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = false;
  });
}

function fitObject(THREE: any, object: any, targetSize: number) {
  object.scale.setScalar(1);
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z, 0.001);
  object.scale.setScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
}

function addBow(THREE: any, parent: any, bow: any, bowId: EquipmentId) {
  const crossbow = bowId === 'frost-bow' || bowId === 'splinter-bow';
  prepareModel(bow);
  fitObject(THREE, bow, crossbow ? 0.82 : 1.18);

  const holder = new THREE.Group();
  holder.name = `VillageVisibleBow_${bowId}`;
  holder.userData.equipmentId = bowId;
  holder.position.set(crossbow ? 0.62 : 0.68, crossbow ? 0.82 : 0.9, 0.38);
  holder.rotation.set(crossbow ? 0.06 : 0.02, crossbow ? -0.1 : 0.12, crossbow ? -0.28 : -0.52);
  holder.add(bow);
  parent.add(holder);
}

function buildProceduralQuiver(THREE: any, accent: string) {
  const root = new THREE.Group();
  const shellMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.72, metalness: 0.1 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x30251e, roughness: 0.9 });
  const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6334, roughness: 0.88 });
  const featherMaterial = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.8 });

  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.72, 10), shellMaterial);
  shell.position.y = -0.04;
  root.add(shell);

  for (const y of [-0.4, 0.32]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(y < 0 ? 0.145 : 0.105, 0.022, 6, 20), trimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    root.add(rim);
  }

  for (const x of [-0.055, 0, 0.055]) {
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.63, 6), shaftMaterial);
    shaft.position.y = 0.45;
    arrow.add(shaft);
    const feather = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.018), featherMaterial);
    feather.position.y = 0.78;
    feather.rotation.z = x * 2.2;
    arrow.add(feather);
    arrow.position.x = x;
    root.add(arrow);
  }
  return root;
}

function addQuiver(THREE: any, parent: any, payload: any | null, quiverId: EquipmentId) {
  const definition = EQUIPMENT[quiverId];
  const holder = new THREE.Group();
  holder.name = `VillageVisibleQuiver_${quiverId}`;
  holder.userData.equipmentId = quiverId;

  if (quiverId === 'ranger-quiver' && payload) {
    prepareModel(payload);
    fitObject(THREE, payload, 0.82);
    holder.add(payload);
  } else {
    holder.add(buildProceduralQuiver(THREE, definition?.accent ?? '#63c8d8'));
    if (payload) {
      prepareModel(payload);
      fitObject(THREE, payload, quiverId === 'black-quiver' ? 0.36 : 0.25);
      payload.position.set(0, 0.18, 0.12);
      holder.add(payload);
    }
  }

  holder.position.set(-0.62, 1.02, 0.28);
  holder.rotation.set(-0.08, 0.28, 0.32);
  parent.add(holder);
}

function addTalisman(THREE: any, parent: any, talisman: any | null, talismanId: EquipmentId) {
  if (!talisman) return;
  prepareModel(talisman);
  fitObject(THREE, talisman, talismanId === 'frost-grimoire' || talismanId === 'ritual-shard' ? 0.22 : 0.15);
  const holder = new THREE.Group();
  holder.name = `VillageVisibleTalisman_${talismanId}`;
  holder.userData.equipmentId = talismanId;
  holder.position.set(-0.3, 0.62, 0.4);
  holder.rotation.set(talismanId === 'frost-grimoire' ? 0.12 : Math.PI / 2, 0, talismanId === 'frost-grimoire' ? -0.2 : 0.08);
  holder.add(talisman);
  parent.add(holder);
}

export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const loader = new GLTFLoader();
  const meta = loadMetaProgression();
  const bowId = meta.equipped.bow;
  const quiverId = meta.equipped.quiver;
  const talismanId = meta.equipped.talisman;
  const quiverDefinition = EQUIPMENT[quiverId];
  const talismanDefinition = EQUIPMENT[talismanId];

  const [characterGltf, generalGltf, weapons, quiverGltf, talismanGltf] = await Promise.all([
    loader.loadAsync(VILLAGE_ARCHER_ASSET),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
    loadKayKitRangerWeapons(),
    loader.loadAsync(`${KAYKIT_ROOT}/${quiverDefinition.assetPath}`).catch(() => null),
    loader.loadAsync(`${KAYKIT_ROOT}/${talismanDefinition.assetPath}`).catch(() => null),
  ]);
  if (!weapons) throw new Error('No equipped KayKit bow available for the village archer');

  const root = new THREE.Group();
  root.name = 'VillageEquippedPlayer';
  root.userData.presentation = 'village-showcase-v2';
  root.userData.equippedLoadout = { bow: bowId, quiver: quiverId, talisman: talismanId };

  const visual = characterGltf.scene;
  visual.name = 'VillageHoodedArcherOutfit';
  visual.scale.setScalar(1.18);
  prepareModel(visual);
  root.add(visual);

  const mixer = new THREE.AnimationMixer(visual);
  const idleClip = chooseVillageIdle([...(characterGltf.animations ?? []), ...(generalGltf.animations ?? [])]);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  idle?.reset().play();
  root.userData.idleClip = idleClip?.name ?? 'none';

  const gear = new THREE.Group();
  gear.name = 'VillageEquippedGear';
  addBow(THREE, gear, weapons.bow, bowId);
  addQuiver(THREE, gear, quiverGltf?.scene ?? null, quiverId);
  addTalisman(THREE, gear, talismanGltf?.scene ?? null, talismanId);
  root.add(gear);

  const arrowPrototype = new THREE.Group();
  let elapsed = 0;
  return {
    root,
    arrowPrototype,
    setMoving: () => undefined,
    setMotionSpeed: () => undefined,
    triggerAttack: () => undefined,
    triggerDash: () => undefined,
    update(delta: number) {
      elapsed += delta;
      mixer.update(delta);
      gear.position.y = Math.sin(elapsed * 1.25) * 0.008;
    },
    stop() {
      mixer.stopAllAction();
    },
  };
}
