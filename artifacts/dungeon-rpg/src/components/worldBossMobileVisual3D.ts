import { firstKayKitModel, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const APP_BASE = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_BASE = APP_BASE.endsWith('/') ? APP_BASE : `${APP_BASE}/`;
const KAYKIT_ROOT = `${NORMALIZED_BASE}assets/kaykit`;

const ANIMATION_ASSETS = {
  general: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb`,
  movement: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb`,
  combat: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatMelee.glb`,
} as const;

export type WorldBossMobileRig = {
  root: any;
  mixer: any;
  setMoving: (moving: boolean) => void;
  triggerAttack: () => void;
  update: (delta: number, now: number) => void;
  stop: () => void;
};

function clipKey(clip: any) {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function chooseClip(clips: any[], groups: string[][], rejects: string[] = []) {
  for (const terms of groups) {
    const match = clips.find(clip => {
      const key = clipKey(clip);
      return terms.every(term => key.includes(term)) && rejects.every(term => !key.includes(term));
    });
    if (match) return match;
  }
  return null;
}

function findBone(root: any, names: string[]) {
  let result: any = null;
  root.traverse((node: any) => {
    if (result) return;
    const key = String(node.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (names.some(name => key.includes(name))) result = node;
  });
  return result;
}

function cloneAndAshenModel(THREE: any, root: any) {
  const ash = new THREE.Color(0x5b5452);
  const bone = new THREE.Color(0xa79b86);
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = true;
    if (!node.material) return;
    const source = Array.isArray(node.material) ? node.material : [node.material];
    const next = source.map((material: any, index: number) => {
      const clone = material.clone();
      if (clone.color) {
        const target = index % 3 === 0 ? bone : ash;
        clone.color.lerp(target, 0.56);
      }
      if ('roughness' in clone) clone.roughness = 0.8;
      if ('metalness' in clone) clone.metalness = Math.max(0.08, Math.min(0.28, clone.metalness ?? 0.1));
      if ('emissive' in clone) clone.emissive.set(0x080302);
      if ('emissiveIntensity' in clone) clone.emissiveIntensity = 0.06;
      return clone;
    });
    node.material = Array.isArray(node.material) ? next : next[0];
  });
}

function normalizeCharacter(THREE: any, object: any, targetHeight = 2.02) {
  object.scale.setScalar(1);
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.001);
  object.scale.setScalar(scale);
  object.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
}

function fitAttachment(THREE: any, object: any, targetSize: number) {
  object.scale.setScalar(1);
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, 0.001));
  object.position.sub(center.multiplyScalar(object.scale.x));
}

function attachAxe(THREE: any, bone: any, object: any) {
  if (!bone || !object) return;
  cloneAndAshenModel(THREE, object);
  fitAttachment(THREE, object, 1.24);
  object.position.add(new THREE.Vector3(0.02, 0.02, 0));
  object.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  bone.add(object);
}

function addAshKingRegalia(THREE: any, root: any) {
  const mantleMaterial = new THREE.MeshStandardMaterial({
    color: 0x24191f,
    emissive: 0x130407,
    emissiveIntensity: 0.22,
    roughness: 0.94,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const armorMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b3c3e,
    roughness: 0.72,
    metalness: 0.28,
  });
  const emberMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8a47,
    emissive: 0x8d210b,
    emissiveIntensity: 1.0,
    roughness: 0.38,
    metalness: 0.04,
  });
  const crownMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b775a,
    emissive: 0x2c1306,
    emissiveIntensity: 0.2,
    roughness: 0.62,
    metalness: 0.4,
  });

  const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.42, 9, 1, true), mantleMaterial);
  mantle.name = 'AshVeilMantle';
  mantle.position.set(0, 0.82, -0.24);
  mantle.rotation.x = -0.09;
  root.add(mantle);

  const shoulderBar = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.26, 0.48), armorMaterial);
  shoulderBar.name = 'AshShoulderBar';
  shoulderBar.position.set(0, 1.36, -0.03);
  root.add(shoulderBar);

  const crown = new THREE.Group();
  crown.name = 'SimplifiedAshCrown';
  const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.13, 8, 1, true), crownMaterial);
  crownBand.position.y = 0.05;
  crown.add(crownBand);
  const crownCrest = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 5), crownMaterial);
  crownCrest.position.y = 0.34;
  crownCrest.rotation.y = Math.PI / 5;
  crown.add(crownCrest);
  crown.position.set(0, 1.91, 0);
  root.add(crown);

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), emberMaterial);
  core.name = 'AshHeart';
  core.position.set(0, 1.07, 0.39);
  root.add(core);

  const eyeBar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.035), emberMaterial);
  eyeBar.name = 'AshEyes';
  eyeBar.position.set(0, 1.68, 0.34);
  root.add(eyeBar);

  return { mantle, crown, core, eyeBar, emberMaterial };
}

export async function loadWorldBossMobileRig(THREE: any, GLTFLoader: any): Promise<WorldBossMobileRig> {
  const manifest = await loadKayKitManifest();
  const skeletonPath = firstKayKitModel(manifest, 'skeletons', /\/characters\/gltf\/.*(?:warrior|knight|barbarian).*\.glb$/i)
    ?? firstKayKitModel(manifest, 'skeletons', /\/characters\/gltf\/.*\.glb$/i);
  if (!skeletonPath) throw new Error('No KayKit skeleton character is available for the Ash King');

  const axePath = firstKayKitModel(manifest, 'skeletons', /skeleton_axe\.(?:gltf|glb)$/i)
    ?? firstKayKitModel(manifest, 'skeletons', /\/assets\/gltf\/.*axe.*\.(?:gltf|glb)$/i);

  const loader = new GLTFLoader();
  const [skeletonGltf, generalGltf, movementGltf, combatGltf, axeGltf] = await Promise.all([
    loader.loadAsync(modelUrl(manifest, skeletonPath)),
    loader.loadAsync(ANIMATION_ASSETS.general),
    loader.loadAsync(ANIMATION_ASSETS.movement),
    loader.loadAsync(ANIMATION_ASSETS.combat),
    axePath ? loader.loadAsync(modelUrl(manifest, axePath)).catch(() => null) : Promise.resolve(null),
  ]);

  const root = new THREE.Group();
  root.name = 'AshKingVeilWarden';

  const visual = skeletonGltf.scene;
  visual.name = 'AshWardenSkeleton';
  cloneAndAshenModel(THREE, visual);
  normalizeCharacter(THREE, visual, 2.02);
  root.add(visual);

  const rightHand = findBone(visual, ['righthand', 'handr', 'handright']);
  attachAxe(THREE, rightHand, axeGltf?.scene ?? null);

  const regalia = addAshKingRegalia(THREE, root);
  const clips = [
    ...(skeletonGltf.animations ?? []),
    ...(generalGltf.animations ?? []),
    ...(movementGltf.animations ?? []),
    ...(combatGltf.animations ?? []),
  ];
  const idleClip = chooseClip(clips, [['idle', 'a'], ['idle']], ['crouch', 'sit', 'sleep']);
  const moveClip = chooseClip(clips, [['walk', 'forward'], ['walk'], ['run']], ['back', 'left', 'right', 'crouch']);
  const attackClip = chooseClip(clips, [['attack', 'a'], ['attack']], ['bow', 'crossbow', 'ranged']);
  const mixer = new THREE.AnimationMixer(visual);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const move = moveClip ? mixer.clipAction(moveClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  let moving = false;
  let current = idle ?? move;
  let attackRemaining = 0;

  current?.reset().play();
  if (move) move.timeScale = 0.82;
  if (attack) {
    attack.setLoop(THREE.LoopOnce, 1);
    attack.clampWhenFinished = false;
    const duration = Math.max(0.2, attackClip?.duration ?? 0.6);
    attack.timeScale = Math.max(0.9, duration / 0.62);
  }

  const playBase = () => {
    const next = moving ? move ?? idle : idle ?? move;
    if (!next || next === current) return;
    next.reset().fadeIn(0.1).play();
    current?.fadeOut(0.1);
    current = next;
  };

  return {
    root,
    mixer,
    setMoving(nextMoving: boolean) {
      moving = nextMoving;
      if (attackRemaining <= 0) playBase();
    },
    triggerAttack() {
      if (!attack) return;
      attackRemaining = 0.62;
      attack.reset().fadeIn(0.06).play();
      current?.fadeOut(0.06);
    },
    update(delta: number, now: number) {
      attackRemaining = Math.max(0, attackRemaining - delta);
      if (attackRemaining === 0) playBase();
      mixer.update(delta);
      const pulse = 0.78 + Math.sin(now * 0.0042) * 0.22;
      regalia.emberMaterial.emissiveIntensity = 0.88 + pulse * 0.36;
      regalia.core.scale.setScalar(0.94 + pulse * 0.14);
      regalia.eyeBar.scale.x = 0.92 + pulse * 0.12;
      regalia.crown.rotation.y += delta * 0.09;
      regalia.mantle.rotation.z = Math.sin(now * 0.0018) * 0.02;
    },
    stop() {
      mixer.stopAllAction();
    },
  };
}
