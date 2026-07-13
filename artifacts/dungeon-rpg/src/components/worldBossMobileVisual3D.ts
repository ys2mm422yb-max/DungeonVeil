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
      if ('roughness' in clone) clone.roughness = 0.78;
      if ('metalness' in clone) clone.metalness = Math.max(0.1, Math.min(0.34, clone.metalness ?? 0.12));
      if ('emissive' in clone) clone.emissive.set(0x080302);
      if ('emissiveIntensity' in clone) clone.emissiveIntensity = 0.08;
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
  fitAttachment(THREE, object, 1.28);
  object.position.add(new THREE.Vector3(0.02, 0.02, 0));
  object.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  bone.add(object);
}

function addAshKingRegalia(THREE: any, root: any) {
  const mantleMaterial = new THREE.MeshStandardMaterial({
    color: 0x24191f,
    emissive: 0x130407,
    emissiveIntensity: 0.26,
    roughness: 0.92,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const armorMaterial = new THREE.MeshStandardMaterial({
    color: 0x46383b,
    roughness: 0.68,
    metalness: 0.34,
  });
  const emberMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8a47,
    emissive: 0x8d210b,
    emissiveIntensity: 1.08,
    roughness: 0.36,
    metalness: 0.06,
  });
  const crownMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b775a,
    emissive: 0x2c1306,
    emissiveIntensity: 0.24,
    roughness: 0.58,
    metalness: 0.48,
  });

  const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.45, 12, 1, true), mantleMaterial);
  mantle.name = 'AshVeilMantle';
  mantle.position.set(0, 0.82, -0.24);
  mantle.rotation.x = -0.09;
  root.add(mantle);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.075, 8, 24), armorMaterial);
  collar.position.set(0, 1.48, -0.01);
  collar.rotation.x = Math.PI / 2;
  root.add(collar);

  for (const side of [-1, 1]) {
    const pauldron = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), armorMaterial);
    pauldron.position.set(side * 0.56, 1.35, -0.02);
    pauldron.scale.set(1.35, 0.72, 1);
    pauldron.rotation.z = side * 0.18;
    root.add(pauldron);
  }

  const crown = new THREE.Group();
  crown.name = 'BrokenAshCrown';
  const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 7, 22), crownMaterial);
  crownBand.rotation.x = Math.PI / 2;
  crown.add(crownBand);
  const spikeHeights = [0.28, 0.42, 0.34, 0.46, 0.3];
  spikeHeights.forEach((height, index) => {
    const angle = index / spikeHeights.length * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.075, height, 6), crownMaterial);
    spike.position.set(Math.cos(angle) * 0.28, height * 0.55, Math.sin(angle) * 0.28);
    spike.rotation.z = Math.cos(angle) * 0.12;
    crown.add(spike);
  });
  crown.position.set(0, 1.91, 0);
  root.add(crown);

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 1), emberMaterial);
  core.name = 'AshHeart';
  core.position.set(0, 1.07, 0.39);
  root.add(core);

  const eyeBar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.035), emberMaterial);
  eyeBar.name = 'AshEyes';
  eyeBar.position.set(0, 1.68, 0.34);
  root.add(eyeBar);

  const auraMaterial = new THREE.MeshBasicMaterial({
    color: 0xe45e31,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const auraArcs: any[] = [];
  for (const [start, length, radius] of [[0.15, 1.35, 0.9], [2.45, 1.15, 1.02], [4.55, 1.1, 0.82]] as Array<[number, number, number]>) {
    const arc = new THREE.Mesh(new THREE.RingGeometry(radius - 0.055, radius, 26, 1, start, length), auraMaterial);
    arc.rotation.x = -Math.PI / 2;
    arc.position.y = 0.022;
    root.add(arc);
    auraArcs.push(arc);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  return { mantle, crown, core, eyeBar, auraArcs, emberMaterial };
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
      regalia.emberMaterial.emissiveIntensity = 0.92 + pulse * 0.42;
      regalia.core.scale.setScalar(0.92 + pulse * 0.18);
      regalia.eyeBar.scale.x = 0.9 + pulse * 0.16;
      regalia.crown.rotation.y += delta * 0.12;
      regalia.mantle.rotation.z = Math.sin(now * 0.0018) * 0.025;
      regalia.auraArcs.forEach((arc: any, index: number) => {
        arc.rotation.z += delta * (index % 2 === 0 ? 0.18 : -0.14);
        arc.material.opacity = 0.2 + pulse * 0.12;
      });
    },
    stop() {
      mixer.stopAllAction();
    },
  };
}
