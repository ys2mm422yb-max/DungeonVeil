import { loadKayKitRangerWeapons } from './kaykitWeapons3D';
import { attachBowToRanger, type BowRig } from './bowRig';
import { EQUIPMENT, loadMetaProgression, type EquipmentId } from '../game/metaProgression';

const KAYKIT_ROOT = '/assets/kaykit';

export const KAYKIT_PLAYER_ASSETS = {
  ranger: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb`,
  quiver: `${KAYKIT_ROOT}/adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf`,
  general: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb`,
  movement: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb`,
  movementAdvanced: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementAdvanced.glb`,
  combatRanged: `${KAYKIT_ROOT}/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatRanged.glb`,
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

function clipKey(clip: any) { return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_'); }
function chooseClip(clips: any[], groups: string[][], rejects: string[] = []) {
  for (const terms of groups) {
    const match = clips.find(clip => { const key = clipKey(clip); return terms.every(term => key.includes(term)) && rejects.every(term => !key.includes(term)); });
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
function attachQuiverVariant(THREE: any, parent: any, object: any, variant: EquipmentId) {
  if (!parent || !object) return;
  prepareModel(object);
  const config: Partial<Record<EquipmentId, { size: number; x: number; y: number; z: number; rx: number; ry: number; rz: number }>> = {
    'black-quiver': { size: .72, x: -.12, y: .08, z: -.24, rx: .12, ry: .16, rz: -.08 },
    'rune-quiver': { size: .58, x: -.05, y: .08, z: -.24, rx: .12, ry: -.18, rz: .2 },
    'ember-quiver': { size: .64, x: -.1, y: .08, z: -.24, rx: .14, ry: .12, rz: -.12 },
    'splinter-quiver': { size: .7, x: -.12, y: .07, z: -.25, rx: .12, ry: .22, rz: -.1 },
    'hunt-quiver': { size: .76, x: -.14, y: .08, z: -.24, rx: .1, ry: .16, rz: -.14 },
  };
  const placement = config[variant] ?? config['black-quiver']!;
  fitAttachment(THREE, object, placement.size);
  object.position.set(placement.x, placement.y, placement.z);
  object.rotation.set(placement.rx, placement.ry, placement.rz);
  parent.add(object);
}
function attachTalisman(THREE: any, parent: any, object: any, id: string) {
  if (!parent || !object) return;
  prepareModel(object);
  const targetSize = id === 'frost-grimoire' ? 0.34 : id === 'guardian-sigil' || id === 'broken-oath' ? 0.28 : 0.22;
  fitAttachment(THREE, object, targetSize);
  object.position.set(id === 'frost-grimoire' ? 0.22 : 0.03, id === 'frost-grimoire' ? 0.02 : 0.13, id === 'frost-grimoire' ? -0.15 : 0.16);
  object.rotation.set(id === 'frost-grimoire' ? 0.15 : Math.PI / 2, 0, id === 'frost-grimoire' ? -0.28 : 0);
  parent.add(object);
}
function buildArrowPrototype(THREE: any, arrow: any) {
  const root = new THREE.Group();
  root.name = 'KayKitArrowWithWindTrail';
  const model = arrow.clone(true);
  model.scale.setScalar(1.18);
  prepareModel(model);
  root.add(model);
  const makeTrail = (x: number, z: number, length: number, opacity: number) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -0.08, z), new THREE.Vector3(x, -length, z)]);
    const material = new THREE.LineBasicMaterial({ color: 0xdaf4ff, transparent: true, opacity, depthWrite: false });
    root.add(new THREE.Line(geometry, material));
  };
  makeTrail(0, 0, 0.82, 0.72);
  makeTrail(0.045, 0.02, 0.56, 0.38);
  return root;
}

export async function loadKayKitRanger(THREE: any, GLTFLoader: any): Promise<KayKitPlayerRig> {
  const loader = new GLTFLoader();
  const meta = loadMetaProgression();
  const quiverId = meta.equipped.quiver;
  const talismanId = meta.equipped.talisman;
  const quiverVariant = quiverId === 'ranger-quiver' ? null : EQUIPMENT[quiverId];
  const talismanDefinition = EQUIPMENT[talismanId];
  const [rangerGltf, quiverGltf, generalGltf, movementGltf, advancedGltf, rangedGltf, weapons, quiverVariantGltf, talismanGltf] = await Promise.all([
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.ranger), loader.loadAsync(KAYKIT_PLAYER_ASSETS.quiver), loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
    loader.loadAsync(KAYKIT_PLAYER_ASSETS.movement), loader.loadAsync(KAYKIT_PLAYER_ASSETS.movementAdvanced), loader.loadAsync(KAYKIT_PLAYER_ASSETS.combatRanged), loadKayKitRangerWeapons(),
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

  const clips = [...(rangerGltf.animations ?? []), ...(generalGltf.animations ?? []), ...(movementGltf.animations ?? []), ...(advancedGltf.animations ?? []), ...(rangedGltf.animations ?? [])];
  const idleClip = chooseClip(clips, [['idle', 'a'], ['idle']], ['crouch', 'sit', 'sleep', 'aim', 'bow']);
  const runClip = chooseClip(clips, [['run'], ['jog'], ['walk']], ['back', 'left', 'right', 'crouch', 'aim']);
  const dashClip = chooseClip(clips, [['dodge', 'forward'], ['roll', 'forward'], ['dodge'], ['roll']], ['back', 'left', 'right']);
  const attackClip = chooseClip(clips, [['bow', 'attack'], ['bow', 'shoot'], ['ranged', 'attack'], ['shoot']], ['crossbow']);
  const mixer = new THREE.AnimationMixer(visual);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const run = runClip ? mixer.clipAction(runClip) : null;
  const dash = dashClip ? mixer.clipAction(dashClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  const base = idle ?? run;
  base?.reset().play();
  if (dash) { dash.setLoop(THREE.LoopOnce, 1); dash.clampWhenFinished = true; }
  if (attack) { attack.setLoop(THREE.LoopOnce, 1); attack.clampWhenFinished = false; }

  prepareModel(weapons.bow);
  prepareModel(quiverGltf.scene);
  const bowRig: BowRig = attachBowToRanger(THREE, visual, weapons.bow, weapons.bowId);
  const spine = findBone(visual, ['spine2', 'spine1', 'spine', 'chest']);
  const chest = findBone(visual, ['spine2', 'chest', 'spine1']);
  if (quiverId === 'ranger-quiver') attachQuiver(spine, quiverGltf.scene);
  else if (quiverVariantGltf) attachQuiverVariant(THREE, spine, quiverVariantGltf.scene, quiverId);
  if (talismanGltf) attachTalisman(THREE, chest, talismanGltf.scene, talismanId);
  const arrowPrototype = buildArrowPrototype(THREE, weapons.arrow);
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
    if (attack && attackClip) attack.timeScale = Math.max(0.8, attackClip.duration / Math.max(0.12, shotDuration));
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
    if (!attack) {
      if (upperArmL) { upperArmL.rotation.y += pulse * 0.28; upperArmL.rotation.z -= pulse * 0.72; }
      if (lowerArmL) lowerArmL.rotation.z -= pulse * 0.18;
      if (upperArmR) { upperArmR.rotation.y -= pulse * 0.34; upperArmR.rotation.z += pulse * 0.9; }
      if (lowerArmR) { lowerArmR.rotation.y -= pulse * 0.2; lowerArmR.rotation.z += pulse * 1.05; }
      if (chest) chest.rotation.y += pulse * 0.1;
    }
    visual.rotation.z = -pulse * 0.025;
    visual.position.z = pulse * 0.02;
    visual.position.y = pulse * 0.01;
  };

  return {
    root,
    arrowPrototype,
    setMoving(value: boolean) { moving = value; if (dashRemaining <= 0 && shotTime <= 0) playBase(); },
    setMotionSpeed(moveMultiplier: number, attackSpeedMultiplier: number) {
      movementMultiplier = Math.max(0.8, Math.min(1.8, moveMultiplier));
      attackMultiplier = Math.max(1, Math.min(1.9, attackSpeedMultiplier));
      shotDuration = 0.24 / attackMultiplier;
      applySpeeds();
    },
    triggerAttack() {
      if (dashRemaining > 0) return;
      shotTime = shotDuration;
      if (attack) {
        attack.stop();
        attack.reset().fadeIn(0.025).play();
        current?.fadeOut(0.035);
        current = attack;
      }
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
        const pulse = progress < 0.52
          ? Math.sin((progress / 0.52) * Math.PI * 0.5)
          : progress < 0.68
            ? 1
            : Math.max(0, 1 - (progress - 0.68) / 0.32);
        applyShotPose(pulse);
        if (shotTime === 0) {
          current = null;
          playBase();
        }
      } else {
        bowRig.updateShotPose(0);
        visual.rotation.x *= 0.68;
        visual.rotation.z *= 0.68;
        visual.position.z *= 0.68;
        visual.position.y *= 0.68;
        visual.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 18));
      }
    },
    stop() { mixer.stopAllAction(); },
  };
}
