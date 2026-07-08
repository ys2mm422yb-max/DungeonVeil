import { loadKayKitRangerWeapons } from './kaykitWeapons3D';

const KAYKIT_ROOT = '/assets/kaykit';

export const KAYKIT_PLAYER_ASSETS = {
  ranger: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb`,
  quiver: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf`,
  general: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb`,
  movement: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb`,
  movementAdvanced: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementAdvanced.glb`,
  ranged: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatRanged.glb`,
} as const;

export type KayKitPlayerRig = {
  root: any;
  arrowPrototype: any;
  setMoving: (moving: boolean) => void;
  triggerAttack: () => void;
  triggerDash: () => void;
  update: (delta: number) => void;
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
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
  });
}

function attachToBone(parent: any, object: any, position: [number, number, number], rotation: [number, number, number], scale: number) {
  if (!parent || !object) return;
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.setScalar(scale);
  parent.add(object);
}

export async function loadKayKitRanger(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const loader = new GLTFLoader();
  const [rangerGltf, quiverGltf, generalGltf, movementGltf, advancedGltf, rangedGltf, weapons] = await Promise.all([
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.ranger),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.quiver),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.movement),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.movementAdvanced),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.ranged),
    loadKayKitRangerWeapons(),
  ]);
  if (!weapons) throw new Error('No KayKit bow and arrow found in the complete weapons/adventurers libraries');

  const root = new THREE.Group();
  root.name = 'KayKitRangerPlayer';
  const visual = rangerGltf.scene;
  visual.name = 'KayKitRanger';
  visual.scale.setScalar(1.18);
  prepareModel(visual);
  root.add(visual);

  const allClips = [
    ...(rangerGltf.animations ?? []),
    ...(generalGltf.animations ?? []),
    ...(movementGltf.animations ?? []),
    ...(advancedGltf.animations ?? []),
    ...(rangedGltf.animations ?? []),
  ];

  const idleClip = chooseClip(allClips, [['idle', 'a'], ['idle']], ['crouch', 'sit', 'sleep']);
  const runClip = chooseClip(allClips, [['run'], ['jog'], ['walk']], ['back', 'left', 'right', 'crouch']);
  const attackClip = chooseClip(allClips, [
    ['bow', 'attack'],
    ['bow', 'shoot'],
    ['ranged', 'attack'],
    ['bow'],
  ], ['crossbow']);
  const dashClip = chooseClip(allClips, [['dodge', 'forward'], ['dodge'], ['roll', 'forward'], ['roll']], ['back']);

  const mixer = new THREE.AnimationMixer(visual);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const run = runClip ? mixer.clipAction(runClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  const dash = dashClip ? mixer.clipAction(dashClip) : null;
  const base = idle ?? run;
  base?.reset().play();
  if (run) run.timeScale = 1.04;
  if (attack) {
    attack.setLoop(THREE.LoopOnce, 1);
    attack.clampWhenFinished = false;
    attack.timeScale = 1.22;
  }
  if (dash) {
    dash.setLoop(THREE.LoopOnce, 1);
    dash.clampWhenFinished = false;
    dash.timeScale = 1.16;
  }

  const rightHand = findBone(visual, ['righthand', 'handr', 'handright']);
  const spine = findBone(visual, ['spine2', 'spine1', 'spine', 'chest']);
  const bow = weapons.bow;
  const quiver = quiverGltf.scene;
  prepareModel(bow);
  prepareModel(quiver);
  attachToBone(rightHand, bow, [0.01, 0.02, 0], [Math.PI / 2, 0, Math.PI / 2], 1);
  attachToBone(spine, quiver, [-0.17, 0.05, -0.16], [0.15, 0.2, -0.08], 1);

  let moving = false;
  let attackRemaining = 0;
  let dashRemaining = 0;
  let current = base;

  const playBase = () => {
    const next = moving ? run : idle;
    if (!next || next === current) return;
    next.reset().fadeIn(0.12).play();
    current?.fadeOut(0.12);
    current = next;
  };

  const playOneShot = (action: any, duration: number) => {
    if (!action) return false;
    action.stop();
    action.reset().fadeIn(0.045).play();
    current?.fadeOut(0.06);
    current = action;
    if (action === attack) attackRemaining = duration;
    if (action === dash) dashRemaining = duration;
    return true;
  };

  return {
    root,
    arrowPrototype: weapons.arrow,
    setMoving(value: boolean) {
      moving = value;
      if (attackRemaining > 0 || dashRemaining > 0) return;
      playBase();
    },
    triggerAttack() {
      const duration = attackClip ? Math.max(0.22, attackClip.duration / 1.22) : 0.34;
      playOneShot(attack, duration);
    },
    triggerDash() {
      const duration = dashClip ? Math.max(0.18, dashClip.duration / 1.16) : 0.3;
      playOneShot(dash, duration);
    },
    update(delta: number) {
      if (attackRemaining > 0) {
        attackRemaining = Math.max(0, attackRemaining - delta);
        if (attackRemaining === 0) playBase();
      }
      if (dashRemaining > 0) {
        dashRemaining = Math.max(0, dashRemaining - delta);
        if (dashRemaining === 0) playBase();
      }
      mixer.update(delta);
    },
    stop() {
      mixer.stopAllAction();
    },
  };
}
