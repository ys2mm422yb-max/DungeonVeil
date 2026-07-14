import { EQUIPMENT, loadMetaProgression, type EquipmentId } from '../game/metaProgression';
import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { loadKayKitRangerWeapons } from './kaykitWeapons3D';
import { type KayKitPlayerRig } from './kaykitPlayer3D';

const VILLAGE_ARCHER_MODEL = 'adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue_Hooded.glb';
const GENERAL_ANIMATION_MODEL = 'animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb';
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

function buildFallbackArcherBody(THREE: any) {
  const root = new THREE.Group();
  root.name = 'VillageFallbackHoodedArcher';
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2f7652, roughness: 0.88 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x593b27, roughness: 0.92 });
  const hood = new THREE.MeshStandardMaterial({ color: 0x303a35, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd0a176, roughness: 0.82 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.82, 8), cloth);
  torso.position.y = 0.88;
  root.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.12, 8), leather);
  belt.position.y = 0.55;
  root.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
  head.position.y = 1.43;
  root.add(head);
  const hoodShell = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.62, 8), hood);
  hoodShell.position.y = 1.63;
  root.add(hoodShell);
  const faceOpening = new THREE.Mesh(new THREE.SphereGeometry(0.205, 12, 10, 0, Math.PI * 2, 0.38, Math.PI * 0.48), skin);
  faceOpening.position.set(0, 1.41, 0.12);
  root.add(faceOpening);

  for (const x of [-0.17, 0.17]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.12, 0.62, 8), leather);
    leg.position.set(x, 0.17, 0);
    root.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.34), leather);
    boot.position.set(x, -0.12, 0.07);
    root.add(boot);
  }
  for (const x of [-0.43, 0.43]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.66, 8), cloth);
    arm.position.set(x, 0.92, 0);
    arm.rotation.z = x < 0 ? -0.16 : 0.16;
    root.add(arm);
  }
  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.92, 0.08), hood);
  cape.position.set(0, 0.87, -0.28);
  cape.rotation.x = -0.08;
  root.add(cape);
  prepareModel(root);
  return root;
}

function buildProceduralBow(THREE: any, accent: string) {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.74, metalness: 0.08 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x3a281d, roughness: 0.9 });
  const limb = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.025, 6, 32, Math.PI * 1.42), wood);
  limb.rotation.z = Math.PI * 0.79;
  root.add(limb);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 8), grip);
  handle.rotation.z = Math.PI / 2;
  root.add(handle);
  const stringGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.31, 0.34, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.31, -0.34, 0),
  ]);
  root.add(new THREE.Line(stringGeometry, new THREE.LineBasicMaterial({ color: 0xe8dcc4 })));
  return root;
}

function addBow(THREE: any, parent: any, bow: any, bowId: EquipmentId) {
  const crossbow = bowId === 'frost-bow' || bowId === 'splinter-bow';
  prepareModel(bow);
  fitObject(THREE, bow, crossbow ? 0.9 : 1.32);

  const holder = new THREE.Group();
  holder.name = `VillageVisibleBow_${bowId}`;
  holder.userData.equipmentId = bowId;
  holder.position.set(crossbow ? 0.66 : 0.72, crossbow ? 0.84 : 0.91, 0.48);
  holder.rotation.set(crossbow ? 0.08 : 0.03, crossbow ? -0.08 : 0.14, crossbow ? -0.25 : -0.5);
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

  for (const x of [-0.065, 0, 0.065]) {
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), shaftMaterial);
    shaft.position.y = 0.49;
    arrow.add(shaft);
    const feather = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.018), featherMaterial);
    feather.position.y = 0.85;
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

  holder.add(buildProceduralQuiver(THREE, definition?.accent ?? '#63c8d8'));
  if (payload && quiverId !== 'ranger-quiver') {
    prepareModel(payload);
    fitObject(THREE, payload, quiverId === 'black-quiver' ? 0.38 : 0.28);
    payload.position.set(0, 0.18, 0.12);
    holder.add(payload);
  }

  holder.position.set(-0.67, 1.05, 0.42);
  holder.rotation.set(-0.08, 0.22, 0.3);
  parent.add(holder);
}

function addTalisman(THREE: any, parent: any, talisman: any | null, talismanId: EquipmentId) {
  if (!talisman) return;
  prepareModel(talisman);
  fitObject(THREE, talisman, talismanId === 'frost-grimoire' || talismanId === 'ritual-shard' ? 0.22 : 0.15);
  const holder = new THREE.Group();
  holder.name = `VillageVisibleTalisman_${talismanId}`;
  holder.userData.equipmentId = talismanId;
  holder.position.set(-0.32, 0.62, 0.46);
  holder.rotation.set(talismanId === 'frost-grimoire' ? 0.12 : Math.PI / 2, 0, talismanId === 'frost-grimoire' ? -0.2 : 0.08);
  holder.add(talisman);
  parent.add(holder);
}

export async function loadKayKitVillageArcher(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const loader = new GLTFLoader();
  const manifest = await loadKayKitManifest();
  const meta = loadMetaProgression();
  const bowId = meta.equipped.bow;
  const quiverId = meta.equipped.quiver;
  const talismanId = meta.equipped.talisman;
  const bowDefinition = EQUIPMENT[bowId];
  const quiverDefinition = EQUIPMENT[quiverId];
  const talismanDefinition = EQUIPMENT[talismanId];

  const [characterGltf, generalGltf, weapons, quiverGltf, talismanGltf] = await Promise.all([
    loader.loadAsync(modelUrl(manifest, VILLAGE_ARCHER_MODEL)).catch(() => null),
    loader.loadAsync(modelUrl(manifest, GENERAL_ANIMATION_MODEL)).catch(() => null),
    loadKayKitRangerWeapons().catch(() => null),
    quiverDefinition?.assetPath ? loader.loadAsync(modelUrl(manifest, quiverDefinition.assetPath)).catch(() => null) : Promise.resolve(null),
    talismanDefinition?.assetPath ? loader.loadAsync(modelUrl(manifest, talismanDefinition.assetPath)).catch(() => null) : Promise.resolve(null),
  ]);

  const root = new THREE.Group();
  root.name = 'VillageEquippedPlayer';
  root.userData.presentation = 'village-showcase-v3-pages-safe';
  root.userData.assetRoot = manifest.root;
  root.userData.equippedLoadout = { bow: bowId, quiver: quiverId, talisman: talismanId };
  root.userData.characterFallback = !characterGltf;

  const visual = characterGltf?.scene ?? buildFallbackArcherBody(THREE);
  visual.name = characterGltf ? 'VillageHoodedArcherOutfit' : 'VillageFallbackHoodedArcher';
  visual.scale.setScalar(characterGltf ? 1.18 : 1);
  prepareModel(visual);
  root.add(visual);

  const mixer = new THREE.AnimationMixer(visual);
  const idleClip = chooseVillageIdle([...(characterGltf?.animations ?? []), ...(generalGltf?.animations ?? [])]);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  idle?.reset().play();
  root.userData.idleClip = idleClip?.name ?? 'procedural-idle';

  const gear = new THREE.Group();
  gear.name = 'VillageEquippedGear';
  const bow = weapons?.bow ?? buildProceduralBow(THREE, bowDefinition?.accent ?? '#d4a65f');
  addBow(THREE, gear, bow, bowId);
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
      if (!characterGltf) visual.rotation.y = Math.sin(elapsed * 0.7) * 0.018;
    },
    stop() {
      mixer.stopAllAction();
    },
  };
}
