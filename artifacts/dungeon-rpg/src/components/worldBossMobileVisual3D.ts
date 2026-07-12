const APP_BASE = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_BASE = APP_BASE.endsWith('/') ? APP_BASE : `${APP_BASE}/`;
const KAYKIT_ROOT = `${NORMALIZED_BASE}assets/kaykit`;

const ASSETS = {
  knight: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb`,
  general: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb`,
  movement: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb`,
  combat: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatMelee.glb`,
  sword: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/sword_2handed_color.gltf`,
  shield: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_badge_color.gltf`,
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

function prepareModel(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = true;
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if ('roughness' in material) material.roughness = 0.72;
        if ('metalness' in material) material.metalness = Math.max(0.08, material.metalness ?? 0);
      }
    }
  });
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

function attachEquipment(THREE: any, bone: any, object: any, kind: 'sword' | 'shield') {
  if (!bone || !object) return;
  prepareModel(object);
  fitAttachment(THREE, object, kind === 'sword' ? 1.15 : 0.72);
  if (kind === 'sword') {
    object.position.add(new THREE.Vector3(0.02, 0.01, 0));
    object.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  } else {
    object.position.add(new THREE.Vector3(0, 0.02, 0));
    object.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  }
  bone.add(object);
}

export async function loadWorldBossMobileRig(THREE: any, GLTFLoader: any): Promise<WorldBossMobileRig> {
  const loader = new GLTFLoader();
  const [knightGltf, generalGltf, movementGltf, combatGltf, swordGltf, shieldGltf] = await Promise.all([
    loader.loadAsync(ASSETS.knight),
    loader.loadAsync(ASSETS.general),
    loader.loadAsync(ASSETS.movement),
    loader.loadAsync(ASSETS.combat),
    loader.loadAsync(ASSETS.sword),
    loader.loadAsync(ASSETS.shield),
  ]);

  const root = new THREE.Group();
  root.name = 'AshKingMobileKayKit';

  const visual = knightGltf.scene;
  visual.name = 'AshKingKnight';
  visual.scale.setScalar(1.22);
  prepareModel(visual);
  root.add(visual);

  const rightHand = findBone(visual, ['righthand', 'handr', 'handright']);
  const leftHand = findBone(visual, ['lefthand', 'handl', 'handleft']);
  attachEquipment(THREE, rightHand, swordGltf.scene, 'sword');
  attachEquipment(THREE, leftHand, shieldGltf.scene, 'shield');

  const emberMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6a2f,
    emissive: 0x7a1c08,
    emissiveIntensity: 0.9,
    roughness: 0.45,
    metalness: 0.08,
  });
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9ad55,
    emissive: 0x2b1303,
    emissiveIntensity: 0.2,
    roughness: 0.48,
    metalness: 0.5,
  });

  const crown = new THREE.Group();
  crown.name = 'AshKingCrown';
  const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 8, 24), goldMaterial);
  crownBand.rotation.x = Math.PI / 2;
  crown.add(crownBand);
  for (let index = 0; index < 5; index++) {
    const angle = index / 5 * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 7), goldMaterial);
    spike.position.set(Math.cos(angle) * 0.28, 0.18, Math.sin(angle) * 0.28);
    crown.add(spike);
  }
  crown.position.set(0, 1.92, 0);
  root.add(crown);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), emberMaterial);
  core.position.set(0, 1.03, 0.36);
  root.add(core);

  const aura = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 0.84, 36),
    new THREE.MeshBasicMaterial({ color: 0xff5b2d, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide }),
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.018;
  root.add(aura);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.68, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const clips = [
    ...(knightGltf.animations ?? []),
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
  if (move) move.timeScale = 0.86;
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
      const pulse = 0.82 + Math.sin(now * 0.004) * 0.18;
      emberMaterial.emissiveIntensity = pulse;
      aura.material.opacity = 0.24 + pulse * 0.12;
      aura.rotation.z += delta * 0.38;
      crown.rotation.y += delta * 0.16;
    },
    stop() {
      mixer.stopAllAction();
    },
  };
}
