import { loadKayKitRangerWeapons } from './kaykitWeapons3D';
import { attachBowToRanger, type BowRig } from './bowRig';
import { EQUIPMENT, loadMetaProgression } from '../game/metaProgression';
import { isQuiverEquipped } from '../game/optionalLoadout';

const KAYKIT_ROOT = '/assets/kaykit';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

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
  setMotionSpeed: (movementMultiplier: number, attackMultiplier: number) => void;
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
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = true;
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

function attachQuiver(parent: any, object: any) {
  if (!parent || !object) return;
  object.position.set(-0.17, 0.05, -0.16);
  object.rotation.set(0.15, 0.2, -0.08);
  object.scale.setScalar(1);
  parent.add(object);
}

function attachQuiverVariant(THREE: any, parent: any, object: any, variant: 'black-quiver' | 'rune-quiver') {
  if (!parent || !object) return;
  prepareModel(object);
  fitAttachment(THREE, object, variant === 'rune-quiver' ? 0.58 : 0.72);
  object.position.set(variant === 'rune-quiver' ? -0.05 : -0.12, 0.08, -0.24);
  object.rotation.set(0.12, variant === 'rune-quiver' ? -0.18 : 0.16, variant === 'rune-quiver' ? 0.2 : -0.08);
  parent.add(object);
}

function attachTalisman(THREE: any, parent: any, object: any, id: string) {
  if (!parent || !object) return;
  prepareModel(object);
  const targetSize = id === 'frost-grimoire' ? 0.34 : id === 'guardian-sigil' ? 0.28 : 0.22;
  fitAttachment(THREE, object, targetSize);
  object.position.set(id === 'frost-grimoire' ? 0.22 : 0.03, id === 'frost-grimoire' ? 0.02 : 0.13, id === 'frost-grimoire' ? -0.15 : 0.16);
  object.rotation.set(id === 'frost-grimoire' ? 0.15 : Math.PI / 2, 0, id === 'frost-grimoire' ? -0.28 : 0);
  parent.add(object);
}

function keepSharedResource(resource: any) {
  if (!resource) return resource;
  resource.userData = { ...(resource.userData ?? {}), dungeonVeilSharedProjectile: true };
  resource.dispose = () => undefined;
  return resource;
}

/**
 * The supplied arrow asset has different local axes across browser/GPU combinations.
 * This small procedural arrow always points along local -Y, which matches the run
 * renderer rotation exactly and avoids arrows flying sideways or backwards.
 */
function buildArrowPrototype(THREE: any) {
  const root = new THREE.Group();
  root.name = 'DungeonVeilAlignedArrow';

  const shaftGeometry = keepSharedResource(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 6));
  const headGeometry = keepSharedResource(new THREE.ConeGeometry(0.065, 0.16, 6));
  const featherGeometry = keepSharedResource(new THREE.BoxGeometry(0.105, 0.12, 0.012));
  const shaftMaterial = keepSharedResource(new THREE.MeshBasicMaterial({ color: 0x8d6334 }));
  const headMaterial = keepSharedResource(new THREE.MeshBasicMaterial({ color: 0xf1d69a }));
  const featherMaterial = keepSharedResource(new THREE.MeshBasicMaterial({ color: 0xe5f0ef, transparent: true, opacity: 0.9 }));

  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shaft.position.y = -0.02;
  root.add(shaft);

  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.rotation.z = Math.PI;
  head.position.y = -0.34;
  root.add(head);

  const featherA = new THREE.Mesh(featherGeometry, featherMaterial);
  featherA.position.y = 0.24;
  root.add(featherA);
  const featherB = new THREE.Mesh(featherGeometry, featherMaterial);
  featherB.position.y = 0.24;
  featherB.rotation.y = Math.PI / 2;
  root.add(featherB);

  const trailGeometry = keepSharedResource(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.28, 0),
    new THREE.Vector3(0, 0.72, 0),
  ]));
  const trailMaterial = keepSharedResource(new THREE.LineBasicMaterial({ color: 0xdaf4ff, transparent: true, opacity: IS_MOBILE ? 0.38 : 0.58, depthWrite: false }));
  root.add(new THREE.Line(trailGeometry, trailMaterial));
  root.scale.setScalar(1.18);
  return root;
}

export async function loadKayKitRanger(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const loader = new GLTFLoader();
  const meta = loadMetaProgression();
  const quiverEnabled = isQuiverEquipped();
  const quiverId = meta.equipped.quiver;
  const talismanId = meta.equipped.talisman;
  const quiverVariant = quiverEnabled && quiverId !== 'ranger-quiver' ? EQUIPMENT[quiverId] : null;
  const talismanDefinition = EQUIPMENT[talismanId];
  const [rangerGltf, quiverGltf, generalGltf, movementGltf, advancedGltf, weapons, quiverVariantGltf, talismanGltf] = await Promise.all([
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.ranger),
    quiverEnabled && quiverId === 'ranger-quiver' ? loader.loadAsync(KAYKIT_PLAYER_ASSETS.quiver) : Promise.resolve(null),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.movement),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.movementAdvanced),
    loadKayKitRangerWeapons(),
    quiverVariant ? loader.loadAsync(`${KAYKIT_ROOT}/${quiverVariant.assetPath}`) : Promise.resolve(null),
    talismanDefinition ? loader.loadAsync(`${KAYKIT_ROOT}/${talismanDefinition.assetPath}`) : Promise.resolve(null),
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
  const dashClip = chooseClip(clips, [['dodge', 'forward'], ['roll', 'forward'], ['dodge'], ['roll']], ['back', 'left', 'right']);
  const mixer = new THREE.AnimationMixer(visual);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const run = runClip ? mixer.clipAction(runClip) : null;
  const dash = dashClip ? mixer.clipAction(dashClip) : null;
  const base = idle ?? run;
  base?.reset().play();
  if (dash) {
    dash.setLoop(THREE.LoopOnce, 1);
    dash.clampWhenFinished = true;
  }

  prepareModel(weapons.bow);
  if (quiverGltf?.scene) prepareModel(quiverGltf.scene);
  const bowRig: BowRig = attachBowToRanger(THREE, visual, weapons.bow);
  const spine = findBone(visual, ['spine2', 'spine1', 'spine', 'chest']);
  const chest = findBone(visual, ['spine2', 'chest', 'spine1']);
  if (quiverGltf?.scene) attachQuiver(spine, quiverGltf.scene);
  if (quiverVariantGltf && (quiverId === 'black-quiver' || quiverId === 'rune-quiver')) {
    attachQuiverVariant(THREE, spine, quiverVariantGltf.scene, quiverId);
  }
  if (talismanGltf) attachTalisman(THREE, chest, talismanGltf.scene, talismanId);
  const arrowPrototype = buildArrowPrototype(THREE);
  const upperArmL = findBone(visual, ['upperarml']);
  const lowerArmL = findBone(visual, ['lowerarml']);
  const upperArmR = findBone(visual, ['upperarmr']);
  const lowerArmR = findBone(visual, ['lowerarmr']);

  let moving = false;
  let shotTime = 0;
  let shotDuration = 0.24;
  let dashRemaining = 0;
  let dashDuration = 0.24;
  let movementMultiplier = 1;
  let attackMultiplier = 1;
  let current = base;

  const applySpeeds = () => {
    if (run) run.timeScale = 1.04 * movementMultiplier;
    if (dash) dash.timeScale = Math.max(1.18, 1.32 * movementMultiplier);
  };
  applySpeeds();

  const playBase = () => {
    const next = moving ? run : idle;
    if (!next || next === current) return;
    next.reset().fadeIn(0.08).play();
    current?.fadeOut(0.08);
    current = next;
  };

  const applyShotPose = (pulse: number) => {
    bowRig.updateShotPose(pulse);
    if (upperArmL) {
      upperArmL.rotation.y += pulse * 0.28;
      upperArmL.rotation.z -= pulse * 0.72;
    }
    if (lowerArmL) lowerArmL.rotation.z -= pulse * 0.18;
    if (upperArmR) {
      upperArmR.rotation.y -= pulse * 0.34;
      upperArmR.rotation.z += pulse * 0.9;
    }
    if (lowerArmR) {
      lowerArmR.rotation.y -= pulse * 0.2;
      lowerArmR.rotation.z += pulse * 1.05;
    }
    if (chest) chest.rotation.y += pulse * 0.1;
    visual.rotation.z = -pulse * 0.045;
    visual.position.z = pulse * 0.035;
    visual.position.y = pulse * 0.02;
  };

  return {
    root,
    arrowPrototype,
    setMoving(value: boolean) {
      moving = value;
      if (dashRemaining <= 0) playBase();
    },
    setMotionSpeed(moveMultiplier: number, attackSpeedMultiplier: number) {
      movementMultiplier = Math.max(0.8, Math.min(1.8, moveMultiplier));
      attackMultiplier = Math.max(1, Math.min(1.9, attackSpeedMultiplier));
      shotDuration = 0.24 / attackMultiplier;
      applySpeeds();
    },
    triggerAttack() {
      if (dashRemaining <= 0) shotTime = shotDuration;
    },
    triggerDash() {
      shotTime = 0;
      bowRig.updateShotPose(0);
      dashDuration = dash ? Math.max(0.2, Math.min(0.34, dashClip!.duration / dash.timeScale)) : 0.24;
      dashRemaining = dashDuration;
      if (dash) {
        dash.stop();
        dash.reset().fadeIn(0.025).play();
        current?.fadeOut(0.035);
        current = dash;
      }
    },
    update(delta: number) {
      if (dashRemaining > 0) {
        dashRemaining = Math.max(0, dashRemaining - delta);
        const progress = 1 - dashRemaining / Math.max(0.001, dashDuration);
        const bodyPulse = Math.sin(progress * Math.PI);
        const launchPulse = Math.sin(Math.min(1, progress * 1.8) * Math.PI);
        visual.position.z = -bodyPulse * 0.14;
        visual.position.y = bodyPulse * 0.12;
        visual.rotation.x = -bodyPulse * 0.38;
        visual.rotation.z = Math.sin(progress * Math.PI * 2) * 0.04;
        visual.scale.z = 1 + launchPulse * 0.045;
        visual.scale.y = 1 - launchPulse * 0.035;
        bowRig.updateShotPose(0);
        mixer.update(delta);
        if (dashRemaining === 0) {
          visual.position.set(0, 0, 0);
          visual.rotation.x = 0;
          visual.rotation.z = 0;
          visual.scale.setScalar(1);
          current = null;
          playBase();
        }
        return;
      }

      mixer.update(delta);
      if (shotTime > 0) {
        shotTime = Math.max(0, shotTime - delta);
        const progress = 1 - shotTime / shotDuration;
        const draw = progress < 0.58 ? progress / 0.58 : Math.max(0, 1 - (progress - 0.58) / 0.42);
        applyShotPose(Math.sin(draw * Math.PI * 0.5));
      } else {
        bowRig.updateShotPose(0);
        visual.rotation.x *= 0.68;
        visual.rotation.z *= 0.68;
        visual.position.z *= 0.68;
        visual.position.y *= 0.68;
        visual.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 18));
      }
    },
    stop() {
      mixer.stopAllAction();
    },
  };
}
