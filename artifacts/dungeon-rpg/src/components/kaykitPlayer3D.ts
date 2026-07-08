import { loadKayKitRangerWeapons } from './kaykitWeapons3D';
import { attachBowToRanger, type BowRig } from './bowRig';

const KAYKIT_ROOT = '/assets/kaykit';

export const KAYKIT_PLAYER_ASSETS = {
  ranger: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb`,
  quiver: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf`,
  general: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb`,
  movement: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb`,
  movementAdvanced: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementAdvanced.glb`,
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
    node.frustumCulled = true;
  });
}

function attachQuiver(parent: any, object: any) {
  if (!parent || !object) return;
  object.position.set(-0.17, 0.05, -0.16);
  object.rotation.set(0.15, 0.2, -0.08);
  object.scale.setScalar(1);
  parent.add(object);
}

function buildArrowPrototype(THREE: any, arrow: any) {
  const root = new THREE.Group();
  root.name = 'KayKitArrowWithWindTrail';
  const model = arrow.clone(true);
  prepareModel(model);
  root.add(model);

  const trailMaterial = new THREE.LineBasicMaterial({ color: 0xdaf4ff, transparent: true, opacity: 0.5, depthWrite: false });
  const makeTrail = (x: number, z: number, length: number, opacity: number) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -0.08, z),
      new THREE.Vector3(x, -length, z),
    ]);
    const material = trailMaterial.clone();
    material.opacity = opacity;
    const line = new THREE.Line(geometry, material);
    root.add(line);
  };
  makeTrail(0, 0, 1.15, 0.58);
  makeTrail(0.045, 0.02, 0.82, 0.3);
  makeTrail(-0.04, -0.015, 0.68, 0.22);
  return root;
}

export async function loadKayKitRanger(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const loader = new GLTFLoader();
  const [rangerGltf, quiverGltf, generalGltf, movementGltf, advancedGltf, weapons] = await Promise.all([
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.ranger),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.quiver),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.movement),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.movementAdvanced),
    loadKayKitRangerWeapons(),
  ]);
  if (!weapons) throw new Error('No KayKit bow and arrow found in the supplied KayKit libraries');

  const root = new THREE.Group();
  root.name = 'KayKitRangerPlayer';
  const visual = rangerGltf.scene;
  visual.name = 'KayKitRanger';
  visual.scale.setScalar(1.18);
  prepareModel(visual);
  root.add(visual);

  const clips = [
    ...(rangerGltf.animations ?? []),
    ...(generalGltf.animations ?? []),
    ...(movementGltf.animations ?? []),
    ...(advancedGltf.animations ?? []),
  ];

  const idleClip = chooseClip(clips, [['idle', 'a'], ['idle']], ['crouch', 'sit', 'sleep', 'aim', 'bow']);
  const runClip = chooseClip(clips, [['run'], ['jog'], ['walk']], ['back', 'left', 'right', 'crouch', 'aim']);
  const dashClip = chooseClip(clips, [['dodge', 'forward'], ['dodge'], ['roll', 'forward'], ['roll']], ['back']);

  const mixer = new THREE.AnimationMixer(visual);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const run = runClip ? mixer.clipAction(runClip) : null;
  const dash = dashClip ? mixer.clipAction(dashClip) : null;
  const base = idle ?? run;
  base?.reset().play();
  if (run) run.timeScale = 1.04;
  if (dash) {
    dash.setLoop(THREE.LoopOnce, 1);
    dash.clampWhenFinished = false;
    dash.timeScale = 1.16;
  }

  prepareModel(weapons.bow);
  prepareModel(quiverGltf.scene);
  const bowRig: BowRig = attachBowToRanger(THREE, visual, weapons.bow);
  const spine = findBone(visual, ['spine2', 'spine1', 'spine', 'chest']);
  attachQuiver(spine, quiverGltf.scene);
  const arrowPrototype = buildArrowPrototype(THREE, weapons.arrow);

  let moving = false;
  let shotTime = 0;
  let dashRemaining = 0;
  let current = base;

  const playBase = () => {
    const next = moving ? run : idle;
    if (!next || next === current) return;
    next.reset().fadeIn(0.1).play();
    current?.fadeOut(0.1);
    current = next;
  };

  return {
    root,
    arrowPrototype,
    setMoving(value: boolean) {
      moving = value;
      if (dashRemaining <= 0) playBase();
    },
    triggerAttack() {
      shotTime = 0.22;
    },
    triggerDash() {
      if (!dash) return;
      const duration = Math.max(0.18, dashClip!.duration / 1.16);
      dashRemaining = duration;
      dash.stop();
      dash.reset().fadeIn(0.04).play();
      current?.fadeOut(0.05);
      current = dash;
    },
    update(delta: number) {
      if (shotTime > 0) {
        shotTime = Math.max(0, shotTime - delta);
        const progress = 1 - shotTime / 0.22;
        const pulse = Math.sin(progress * Math.PI);
        bowRig.updateShotPose(pulse);
        visual.rotation.z = -pulse * 0.055;
        visual.position.z = pulse * 0.035;
        visual.position.y = pulse * 0.025;
      } else {
        bowRig.updateShotPose(0);
        visual.rotation.z *= 0.72;
        visual.position.z *= 0.72;
        visual.position.y *= 0.72;
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
