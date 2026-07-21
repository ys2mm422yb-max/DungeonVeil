import { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { remotePresenceIsFresh, type CoopPlayerPresence } from '../game/coopRealtimePresence';
import {
  createCompanionReservationV4,
  normalizeCompanionRosterV4,
  type CompanionReservationV4,
  type CompanionRoleV4,
} from '../game/companionReserveV4';
import {
  COMPANION_DEFINITIONS_V5,
  companionEffectivePowerV5,
  companionForOwnerV5,
} from '../game/companionCollectionV5';
import { COMPANION_ACTION_EVENT_V4 } from './CompanionRuntimeBridge';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const TILE = 40;
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LocalCompanion = { role: CompanionRoleV4; level: number };

type Props = {
  gameState: GameState;
  localCompanion: LocalCompanion | null;
  remotePlayer?: CoopPlayerPresence | null;
};

type CompanionActionKind = 'attack' | 'guard' | 'collect' | 'distract';

type CompanionRig = {
  root: any;
  triggerAction: (kind?: CompanionActionKind) => void;
  update: (now: number, moving: boolean, speed: number) => void;
  dispose: () => void;
};

type CompanionCandidate = {
  reservation: CompanionReservationV4;
  level: number;
};

type CompanionBinding = {
  reservation: CompanionReservationV4;
  level: number;
  scene: any;
  rig: CompanionRig;
  x: number;
  z: number;
  initialized: boolean;
  lastFrame: number;
  lastRemoteAttack: number;
};

function standardMaterial(THREE: any, color: number, emissive: number, intensity: number, roughness = 0.62) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness,
    metalness: 0.08,
  });
}

function glowMaterial(THREE: any, color: number, opacity = 0.78) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function namedMesh(THREE: any, geometry: any, material: any, name: string) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = !IS_MOBILE;
  return mesh;
}

function addEyes(THREE: any, parent: any, color: number, y: number, z: number, spread = 0.18) {
  const eyeMaterial = new THREE.MeshBasicMaterial({ color });
  for (const side of [-1, 1]) {
    const eye = namedMesh(THREE, new THREE.SphereGeometry(0.045, 8, 6), eyeMaterial, 'CompanionEye');
    eye.position.set(side * spread, y, z);
    parent.add(eye);
  }
}

function createLynxController(THREE: any, visual: any, accent: number) {
  const dark = standardMaterial(THREE, 0x111827, 0x061725, 0.34, 0.82);
  const fur = standardMaterial(THREE, 0x24384a, accent, 0.24, 0.7);
  const rune = standardMaterial(THREE, accent, accent, 1.4, 0.28);
  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.56, 1), fur, 'VeilLynxBody');
  body.scale.set(0.78, 0.62, 1.22);
  body.position.y = 0.86;
  visual.add(body);

  const chest = namedMesh(THREE, new THREE.DodecahedronGeometry(0.42, 1), dark, 'VeilLynxChest');
  chest.scale.set(0.78, 0.92, 0.7);
  chest.position.set(0, 0.96, 0.48);
  visual.add(chest);

  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.38, 1), fur, 'VeilLynxHead');
  head.scale.set(0.9, 0.86, 0.92);
  head.position.set(0, 1.32, 0.87);
  visual.add(head);
  const muzzle = namedMesh(THREE, new THREE.DodecahedronGeometry(0.18, 0), dark, 'VeilLynxMuzzle');
  muzzle.scale.set(1.1, 0.62, 1.35);
  muzzle.position.set(0, 1.24, 1.17);
  visual.add(muzzle);
  addEyes(THREE, visual, 0xeaffff, 1.4, 1.14, 0.15);

  for (const side of [-1, 1]) {
    const ear = namedMesh(THREE, new THREE.ConeGeometry(0.15, 0.42, 5), fur, 'VeilLynxEar');
    ear.position.set(side * 0.22, 1.69, 0.86);
    ear.rotation.z = side * -0.12;
    visual.add(ear);
  }

  const legPivots: any[] = [];
  for (const [x, z, phase] of [[-0.32, 0.42, 0], [0.32, 0.42, Math.PI], [-0.32, -0.45, Math.PI], [0.32, -0.45, 0]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.7, z);
    visual.add(pivot);
    const leg = namedMesh(THREE, new THREE.CylinderGeometry(0.09, 0.12, 0.62, 7), dark, 'VeilLynxLeg');
    leg.position.y = -0.29;
    pivot.add(leg);
    const paw = namedMesh(THREE, new THREE.SphereGeometry(0.13, 8, 6), fur, 'VeilLynxPaw');
    paw.scale.set(1.05, 0.48, 1.45);
    paw.position.set(0, -0.61, 0.07);
    pivot.add(paw);
    pivot.userData.phase = phase;
    legPivots.push(pivot);
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.0, -0.66);
  visual.add(tailPivot);
  const tail = namedMesh(THREE, new THREE.CylinderGeometry(0.08, 0.14, 1.25, 8), fur, 'VeilLynxTail');
  tail.rotation.x = Math.PI / 2.8;
  tail.position.set(0, 0.24, -0.42);
  tailPivot.add(tail);

  const crest = namedMesh(THREE, new THREE.OctahedronGeometry(0.13, 0), rune, 'VeilLynxRune');
  crest.position.set(0, 1.53, 0.65);
  visual.add(crest);

  return (now: number, moving: boolean, speed: number, actionPulse: number) => {
    const stride = moving ? Math.sin(now * (0.011 + Math.min(0.007, speed * 0.001))) : 0;
    legPivots.forEach(pivot => { pivot.rotation.x = stride * 0.62 * Math.cos(pivot.userData.phase); });
    visual.position.y = 0.06 + Math.abs(stride) * 0.065;
    visual.position.z = actionPulse * 0.82;
    body.rotation.x = actionPulse * -0.18;
    tailPivot.rotation.x = 0.55 + Math.sin(now * 0.004) * 0.28;
    crest.rotation.y = now * 0.0024;
  };
}

function createRavenController(THREE: any, visual: any, accent: number) {
  const feather = standardMaterial(THREE, 0x201924, 0x301609, 0.42, 0.76);
  const ember = standardMaterial(THREE, accent, accent, 1.55, 0.24);
  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.48, 1), feather, 'EmberRavenBody');
  body.scale.set(0.72, 0.92, 1.0);
  visual.add(body);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.31, 1), feather, 'EmberRavenHead');
  head.position.set(0, 0.42, 0.48);
  visual.add(head);
  const beak = namedMesh(THREE, new THREE.ConeGeometry(0.14, 0.5, 5), ember, 'EmberRavenBeak');
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.37, 0.83);
  visual.add(beak);
  addEyes(THREE, visual, 0xfff3d9, 0.52, 0.72, 0.13);

  const wingPivots: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.36, 0.08, 0.02);
    visual.add(pivot);
    const wing = namedMesh(THREE, new THREE.ConeGeometry(0.56, 1.35, 5), feather, 'EmberRavenWing');
    wing.rotation.z = side * Math.PI / 2;
    wing.rotation.y = side * 0.16;
    wing.position.x = side * 0.52;
    pivot.add(wing);
    wingPivots.push(pivot);
  }
  const tail = namedMesh(THREE, new THREE.ConeGeometry(0.42, 0.96, 5), feather, 'EmberRavenTail');
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, -0.08, -0.78);
  visual.add(tail);
  for (const side of [-1, 1]) {
    const emberFeather = namedMesh(THREE, new THREE.ConeGeometry(0.07, 0.42, 5), ember, 'EmberRavenEmberFeather');
    emberFeather.rotation.x = -Math.PI / 2;
    emberFeather.position.set(side * 0.18, -0.02, -0.92);
    visual.add(emberFeather);
  }

  return (now: number, moving: boolean, _speed: number, actionPulse: number) => {
    const flap = Math.sin(now * (moving ? 0.016 : 0.008));
    wingPivots[0].rotation.z = 0.22 + flap * 0.72 - actionPulse * 0.55;
    wingPivots[1].rotation.z = -0.22 - flap * 0.72 + actionPulse * 0.55;
    visual.position.y = 1.12 + Math.sin(now * 0.0032) * 0.12 + actionPulse * 0.18;
    visual.position.z = actionPulse * 0.45;
    body.rotation.x = moving ? -0.12 : 0;
  };
}

function createSentinelController(THREE: any, visual: any, accent: number) {
  const stone = standardMaterial(THREE, 0x26312f, 0x0a2419, 0.34, 0.9);
  const rune = standardMaterial(THREE, accent, accent, 1.5, 0.22);
  const torso = namedMesh(THREE, new THREE.BoxGeometry(0.86, 0.95, 0.62), stone, 'RuneSentinelTorso');
  torso.position.y = 1.05;
  visual.add(torso);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.34, 0), stone, 'RuneSentinelHead');
  head.position.set(0, 1.76, 0.16);
  visual.add(head);
  const faceRune = namedMesh(THREE, new THREE.OctahedronGeometry(0.11, 0), rune, 'RuneSentinelFaceRune');
  faceRune.scale.set(0.8, 1.15, 0.45);
  faceRune.position.set(0, 1.76, 0.48);
  visual.add(faceRune);

  const armPivots: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.58, 1.38, 0);
    visual.add(pivot);
    const arm = namedMesh(THREE, new THREE.BoxGeometry(0.28, 0.82, 0.3), stone, 'RuneSentinelArm');
    arm.position.y = -0.35;
    pivot.add(arm);
    const fist = namedMesh(THREE, new THREE.DodecahedronGeometry(0.25, 0), rune, 'RuneSentinelFist');
    fist.position.y = -0.8;
    pivot.add(fist);
    armPivots.push(pivot);
  }
  const legPivots: any[] = [];
  for (const [side, phase] of [[-1, 0], [1, Math.PI]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.27, 0.64, 0);
    visual.add(pivot);
    const leg = namedMesh(THREE, new THREE.BoxGeometry(0.34, 0.72, 0.38), stone, 'RuneSentinelLeg');
    leg.position.y = -0.32;
    pivot.add(leg);
    pivot.userData.phase = phase;
    legPivots.push(pivot);
  }
  const chestRune = namedMesh(THREE, new THREE.RingGeometry(0.18, 0.27, 8), glowMaterial(THREE, accent, 0.8), 'RuneSentinelChestRune');
  chestRune.position.set(0, 1.08, 0.321);
  visual.add(chestRune);

  return (now: number, moving: boolean, _speed: number, actionPulse: number, actionKind: CompanionActionKind) => {
    const stride = moving ? Math.sin(now * 0.009) : 0;
    legPivots[0].rotation.x = stride * 0.42;
    legPivots[1].rotation.x = -stride * 0.42;
    const slam = actionKind === 'guard' || actionKind === 'attack' ? actionPulse : 0;
    armPivots[0].rotation.x = -0.18 - slam * 1.45;
    armPivots[1].rotation.x = -0.18 - slam * 1.45;
    visual.position.y = 0.02 + Math.abs(stride) * 0.045 - slam * 0.12;
    torso.scale.y = 1 - slam * 0.08;
    chestRune.rotation.z = now * 0.0018;
  };
}

function createWispController(THREE: any, visual: any, accent: number) {
  const core = namedMesh(THREE, new THREE.IcosahedronGeometry(0.43, 1), standardMaterial(THREE, 0x3e3821, accent, 1.1, 0.3), 'LanternWispCore');
  visual.add(core);
  const inner = namedMesh(THREE, new THREE.SphereGeometry(0.25, 12, 8), glowMaterial(THREE, 0xfff1a3, 0.9), 'LanternWispInnerLight');
  visual.add(inner);
  const orbit = new THREE.Group();
  visual.add(orbit);
  const shards: any[] = [];
  for (let index = 0; index < 5; index += 1) {
    const shard = namedMesh(THREE, new THREE.OctahedronGeometry(0.12, 0), standardMaterial(THREE, accent, accent, 1.35, 0.25), 'LanternWispShard');
    const angle = index / 5 * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 0.72, Math.sin(angle * 2) * 0.16, Math.sin(angle) * 0.72);
    orbit.add(shard);
    shards.push(shard);
  }
  const veil = namedMesh(THREE, new THREE.ConeGeometry(0.38, 1.1, 8, 1, true), glowMaterial(THREE, accent, 0.22), 'LanternWispVeil');
  veil.position.y = -0.58;
  veil.rotation.x = Math.PI;
  visual.add(veil);

  return (now: number, moving: boolean, _speed: number, actionPulse: number, actionKind: CompanionActionKind) => {
    visual.position.y = 1.05 + Math.sin(now * 0.0038) * 0.18 + actionPulse * 0.14;
    visual.position.z = actionPulse * 0.38;
    orbit.rotation.y = now * (moving ? 0.0034 : 0.0022);
    orbit.rotation.z = Math.sin(now * 0.0018) * 0.25;
    shards.forEach((shard, index) => { shard.rotation.y = now * 0.003 + index; });
    core.scale.setScalar(1 + actionPulse * (actionKind === 'collect' ? 0.34 : 0.18));
    inner.scale.setScalar(1 + Math.sin(now * 0.006) * 0.08 + actionPulse * 0.3);
  };
}

function createDrakeController(THREE: any, visual: any, accent: number) {
  const scale = standardMaterial(THREE, 0x2c2040, 0x2b0f4d, 0.48, 0.68);
  const dark = standardMaterial(THREE, 0x15121d, 0x140824, 0.26, 0.82);
  const flame = standardMaterial(THREE, accent, accent, 1.55, 0.24);
  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.54, 1), scale, 'DuskDrakeBody');
  body.scale.set(0.78, 0.66, 1.2);
  body.position.y = 0.86;
  visual.add(body);
  const neck = namedMesh(THREE, new THREE.CylinderGeometry(0.2, 0.28, 0.7, 8), scale, 'DuskDrakeNeck');
  neck.rotation.x = -0.48;
  neck.position.set(0, 1.14, 0.58);
  visual.add(neck);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.36, 1), scale, 'DuskDrakeHead');
  head.scale.set(0.88, 0.72, 1.12);
  head.position.set(0, 1.42, 0.96);
  visual.add(head);
  const snout = namedMesh(THREE, new THREE.BoxGeometry(0.38, 0.22, 0.46), dark, 'DuskDrakeSnout');
  snout.position.set(0, 1.34, 1.3);
  visual.add(snout);
  addEyes(THREE, visual, 0xf8efff, 1.5, 1.21, 0.14);
  for (const side of [-1, 1]) {
    const horn = namedMesh(THREE, new THREE.ConeGeometry(0.09, 0.38, 6), flame, 'DuskDrakeHorn');
    horn.rotation.x = -0.55;
    horn.position.set(side * 0.18, 1.72, 0.83);
    visual.add(horn);
  }

  const wingPivots: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.34, 1.08, -0.08);
    visual.add(pivot);
    const wing = namedMesh(THREE, new THREE.ConeGeometry(0.52, 1.25, 4), scale, 'DuskDrakeWing');
    wing.rotation.z = side * Math.PI / 2;
    wing.position.x = side * 0.54;
    pivot.add(wing);
    wingPivots.push(pivot);
  }
  const legPivots: any[] = [];
  for (const [x, z, phase] of [[-0.3, 0.35, 0], [0.3, 0.35, Math.PI], [-0.3, -0.38, Math.PI], [0.3, -0.38, 0]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.64, z);
    visual.add(pivot);
    const leg = namedMesh(THREE, new THREE.CylinderGeometry(0.08, 0.12, 0.54, 7), dark, 'DuskDrakeLeg');
    leg.position.y = -0.25;
    pivot.add(leg);
    pivot.userData.phase = phase;
    legPivots.push(pivot);
  }
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.94, -0.65);
  visual.add(tailPivot);
  const tail = namedMesh(THREE, new THREE.ConeGeometry(0.16, 1.45, 8), scale, 'DuskDrakeTail');
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -0.65;
  tailPivot.add(tail);
  const flameTip = namedMesh(THREE, new THREE.ConeGeometry(0.12, 0.42, 6), flame, 'DuskDrakeVeilfire');
  flameTip.rotation.x = -Math.PI / 2;
  flameTip.position.set(0, 1.34, 1.62);
  visual.add(flameTip);

  return (now: number, moving: boolean, speed: number, actionPulse: number) => {
    const stride = moving ? Math.sin(now * (0.01 + Math.min(0.006, speed * 0.001))) : 0;
    legPivots.forEach(pivot => { pivot.rotation.x = stride * 0.5 * Math.cos(pivot.userData.phase); });
    const flap = Math.sin(now * (moving ? 0.012 : 0.006));
    wingPivots[0].rotation.z = 0.2 + flap * 0.38 - actionPulse * 0.5;
    wingPivots[1].rotation.z = -0.2 - flap * 0.38 + actionPulse * 0.5;
    visual.position.y = 0.08 + Math.abs(stride) * 0.05;
    visual.position.z = actionPulse * 0.62;
    head.rotation.x = actionPulse * -0.28;
    tailPivot.rotation.y = Math.sin(now * 0.0032) * 0.34;
    flameTip.scale.setScalar(1 + actionPulse * 1.1);
  };
}

function createCompanionRig(THREE: any, role: CompanionRoleV4, level: number): CompanionRig {
  const definition = COMPANION_DEFINITIONS_V5[role];
  const root = new THREE.Group();
  root.name = `CompanionV5_${definition.species}_${role}`;
  root.userData.dungeonVeilCompanionV5 = true;
  root.userData.companionSpecies = definition.species;
  root.userData.companionRole = role;
  root.userData.companionLevel = level;
  root.scale.setScalar((IS_MOBILE ? 0.68 : 0.72) + Math.min(4, level - 1) * 0.025);

  const visual = new THREE.Group();
  visual.name = `CompanionVisual_${definition.species}`;
  root.add(visual);

  const controller = definition.species === 'veil-lynx'
    ? createLynxController(THREE, visual, definition.accentHex)
    : definition.species === 'ember-raven'
      ? createRavenController(THREE, visual, definition.accentHex)
      : definition.species === 'rune-sentinel'
        ? createSentinelController(THREE, visual, definition.accentHex)
        : definition.species === 'lantern-wisp'
          ? createWispController(THREE, visual, definition.accentHex)
          : createDrakeController(THREE, visual, definition.accentHex);

  const auraMaterial = glowMaterial(THREE, definition.accentHex, 0.28);
  const aura = namedMesh(THREE, new THREE.RingGeometry(0.72, 1.04, IS_MOBILE ? 24 : 36), auraMaterial, 'CompanionV5Aura');
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.025;
  root.add(aura);

  const attackMaterial = glowMaterial(THREE, definition.accentHex, 0);
  const attackTrail = namedMesh(THREE, new THREE.PlaneGeometry(0.38, 2.2), attackMaterial, 'CompanionV5AttackTrail');
  attackTrail.rotation.x = -Math.PI / 2;
  attackTrail.position.set(0, 0.18, 1.15);
  attackTrail.visible = false;
  root.add(attackTrail);

  const attackRingMaterial = glowMaterial(THREE, definition.accentHex, 0);
  const attackRing = namedMesh(THREE, new THREE.RingGeometry(0.42, 0.7, 24), attackRingMaterial, 'CompanionV5AttackRing');
  attackRing.rotation.x = -Math.PI / 2;
  attackRing.position.set(0, 0.08, 1.1);
  attackRing.visible = false;
  root.add(attackRing);

  let actionStartedAt = 0;
  let actionEndsAt = 0;
  let actionKind: CompanionActionKind = 'attack';

  return {
    root,
    triggerAction(kind = 'attack') {
      actionKind = kind;
      actionStartedAt = performance.now();
      actionEndsAt = actionStartedAt + (kind === 'guard' ? 620 : kind === 'collect' ? 540 : 480);
    },
    update(now: number, moving: boolean, speed: number) {
      const active = actionEndsAt > now;
      const duration = Math.max(1, actionEndsAt - actionStartedAt);
      const progress = active ? Math.min(1, Math.max(0, (now - actionStartedAt) / duration)) : 1;
      const actionPulse = active ? Math.sin(progress * Math.PI) : 0;
      controller(now, moving, speed, actionPulse, actionKind);
      auraMaterial.opacity = 0.22 + Math.sin(now * 0.0024) * 0.06 + actionPulse * 0.18;
      aura.scale.setScalar(0.96 + Math.sin(now * 0.0045) * 0.055 + actionPulse * 0.24);
      aura.rotation.z = now * 0.00038;
      attackTrail.visible = active && (actionKind === 'attack' || actionKind === 'distract');
      attackRing.visible = active;
      attackMaterial.opacity = actionPulse * 0.82;
      attackRingMaterial.opacity = actionPulse * (actionKind === 'guard' ? 0.9 : 0.62);
      attackTrail.scale.set(1 + actionPulse * 1.1, 0.7 + actionPulse * 1.45, 1);
      attackRing.scale.setScalar(0.7 + actionPulse * (actionKind === 'guard' ? 1.65 : 0.9));
      attackRing.rotation.z = now * 0.004;
    },
    dispose() {
      const geometries = new Set<any>();
      const materials = new Set<any>();
      root.traverse((node: any) => {
        if (node.geometry && !geometries.has(node.geometry)) {
          geometries.add(node.geometry);
          node.geometry.dispose?.();
        }
        const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
        nodeMaterials.filter(Boolean).forEach((material: any) => {
          if (materials.has(material)) return;
          materials.add(material);
          material.dispose?.();
        });
      });
    },
  };
}

export function CompanionScene3D({ gameState, localCompanion, remotePlayer = null }: Props) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef(gameState);
  const remoteRef = useRef(remotePlayer);
  const localCompanionRef = useRef(localCompanion);
  stateRef.current = gameState;
  remoteRef.current = remotePlayer;
  localCompanionRef.current = localCompanion;

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let THREE: any = null;
    let desiredScene: any = null;
    let originalAdd: ((...objects: any[]) => any) | null = null;
    let patchedAdd: ((this: any, ...objects: any[]) => any) | null = null;
    const bindings = new Map<string, CompanionBinding>();
    let lastVisibleCount = -1;
    let lastLoadedCount = -1;

    const updateMarker = (visibleCount = 0) => {
      const marker = markerRef.current;
      if (!marker) return;
      const local = localCompanionRef.current;
      if (visibleCount !== lastVisibleCount) {
        marker.dataset.visibleCount = String(visibleCount);
        lastVisibleCount = visibleCount;
      }
      if (bindings.size !== lastLoadedCount) {
        marker.dataset.loadedCount = String(bindings.size);
        lastLoadedCount = bindings.size;
      }
      marker.dataset.localRole = local?.role ?? 'none';
      marker.dataset.localLevel = String(local?.level ?? 0);
      marker.dataset.localSpecies = local ? COMPANION_DEFINITIONS_V5[local.role].species : 'none';
      marker.dataset.sceneCaptured = desiredScene ? 'true' : 'false';
      marker.dataset.followPlacement = 'inward-side';
    };

    const removeBinding = (ownerPlayerId: string) => {
      const binding = bindings.get(ownerPlayerId);
      if (!binding) return;
      binding.scene.remove(binding.rig.root);
      binding.rig.dispose();
      bindings.delete(ownerPlayerId);
      updateMarker();
    };

    const clearBindings = () => {
      for (const ownerId of [...bindings.keys()]) removeBinding(ownerId);
    };

    const captureScene = (candidate: any) => {
      if (!candidate?.isScene || !candidate.getObjectByName?.('KayKitRangerPlayer')) return;
      if (desiredScene === candidate) return;
      desiredScene = candidate;
      clearBindings();
      updateMarker();
    };

    const desiredRoster = (): CompanionCandidate[] => {
      const remote = remoteRef.current;
      const local = localCompanionRef.current;
      const candidates: CompanionCandidate[] = [];
      if (local) {
        candidates.push({
          level: local.level,
          reservation: createCompanionReservationV4({
            id: `companion-v5-local-${local.role}`,
            ownerPlayerId: 'player',
            role: local.role,
            requestedEffectivePower: companionEffectivePowerV5(local.role, local.level),
          }),
        });
      }
      if (remote && remotePresenceIsFresh(remote)) {
        const remoteCompanion = companionForOwnerV5(remote.userId);
        candidates.push({
          level: remoteCompanion.level,
          reservation: createCompanionReservationV4({
            id: `companion-v5-remote-${remote.userId}-${remoteCompanion.id}`,
            ownerPlayerId: `remote:${remote.userId}`,
            ownerUserId: remote.userId,
            role: remoteCompanion.id,
            requestedEffectivePower: companionEffectivePowerV5(remoteCompanion.id, remoteCompanion.level),
          }),
        });
      }
      const normalized = normalizeCompanionRosterV4(candidates.map(candidate => candidate.reservation), remote ? 'duo' : 'solo');
      return normalized.map(reservation => candidates.find(candidate => candidate.reservation.ownerPlayerId === reservation.ownerPlayerId)!).filter(Boolean);
    };

    const ensureBinding = (scene: any, candidate: CompanionCandidate) => {
      const ownerId = candidate.reservation.ownerPlayerId;
      if (disposed || bindings.has(ownerId) || !THREE) return;
      const rig = createCompanionRig(THREE, candidate.reservation.role, candidate.level);
      rig.root.visible = false;
      scene.add(rig.root);
      bindings.set(ownerId, {
        reservation: candidate.reservation,
        level: candidate.level,
        scene,
        rig,
        x: 0,
        z: 0,
        initialized: false,
        lastFrame: performance.now(),
        lastRemoteAttack: 0,
      });
      updateMarker();
    };

    const syncRoster = () => {
      if (!desiredScene) return;
      const roster = desiredRoster();
      const desiredOwners = new Set(roster.map(entry => entry.reservation.ownerPlayerId));
      for (const ownerId of [...bindings.keys()]) {
        const binding = bindings.get(ownerId)!;
        const desired = roster.find(entry => entry.reservation.ownerPlayerId === ownerId);
        if (!desiredOwners.has(ownerId)
          || desired?.reservation.role !== binding.reservation.role
          || desired?.level !== binding.level
          || binding.scene !== desiredScene) removeBinding(ownerId);
      }
      for (const candidate of roster) ensureBinding(desiredScene, candidate);
    };

    const updateBinding = (binding: CompanionBinding, now: number) => {
      const state = stateRef.current;
      const remote = remoteRef.current;
      const isRemote = binding.reservation.ownerPlayerId.startsWith('remote:');
      const ownerVisible = isRemote
        ? Boolean(remote && remotePresenceIsFresh(remote) && remote.chapter === state.chapter && remote.room === state.floor && remote.lifeState === 'alive')
        : state.player.hp > 0;
      binding.rig.root.visible = ownerVisible;
      if (!ownerVisible) {
        binding.lastFrame = now;
        return false;
      }

      const delta = Math.min(0.05, Math.max(0, now - binding.lastFrame) / 1000);
      binding.lastFrame = now;
      const ownerX = isRemote && remote ? remote.x : state.player.x + state.player.width / 2;
      const ownerY = isRemote && remote ? remote.y : state.player.y + state.player.height / 2;
      const facingX = isRemote && remote ? remote.facingX : state.player.facing.x;
      const facingY = isRemote && remote ? remote.facingY : state.player.facing.y;
      const side = isRemote ? -1 : 1;
      const mapCenterX = state.map.width * TILE / 2;
      const mapCenterY = state.map.height * TILE / 2;
      const centerDeltaX = mapCenterX - ownerX;
      const centerDeltaY = mapCenterY - ownerY;
      const centerDistance = Math.hypot(centerDeltaX, centerDeltaY);
      const inwardX = centerDistance > 80 ? centerDeltaX / centerDistance : facingX;
      const inwardY = centerDistance > 80 ? centerDeltaY / centerDistance : facingY;
      const followX = ownerX + inwardX * 64 - inwardY * 40 * side;
      const followY = ownerY + inwardY * 64 + inwardX * 40 * side;
      const targetX = followX / TILE - state.map.width / 2 + 0.5;
      const targetZ = followY / TILE - state.map.height / 2 + 0.5;
      if (!binding.initialized || Math.hypot(targetX - binding.x, targetZ - binding.z) > 7.5) {
        binding.x = targetX;
        binding.z = targetZ;
        binding.initialized = true;
      }
      const previousX = binding.x;
      const previousZ = binding.z;
      const dx = targetX - binding.x;
      const dz = targetZ - binding.z;
      const distance = Math.hypot(dx, dz);
      const maxStep = (5.8 + binding.level * 0.42) * delta;
      if (distance > 0.001) {
        const step = Math.min(distance, maxStep);
        binding.x += dx / distance * step;
        binding.z += dz / distance * step;
      }
      const movementX = binding.x - previousX;
      const movementZ = binding.z - previousZ;
      const speed = delta > 0 ? Math.hypot(movementX, movementZ) / delta : 0;
      const moving = speed > 0.025;
      binding.rig.root.position.set(binding.x, 0.02, binding.z);
      binding.rig.root.rotation.y = moving ? Math.atan2(movementX, movementZ) : Math.atan2(facingX, facingY);
      if (isRemote && remote && remote.lastAttackTime > binding.lastRemoteAttack) {
        binding.lastRemoteAttack = remote.lastAttackTime;
        binding.rig.triggerAction('attack');
      }
      binding.rig.update(now, moving, speed);
      return true;
    };

    const actionHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerPlayerId?: string; kind?: CompanionActionKind }>).detail;
      const ownerId = detail?.ownerPlayerId ?? '';
      bindings.get(ownerId)?.rig.triggerAction(detail?.kind ?? 'attack');
    };

    const tick = (now: number) => {
      if (disposed) return;
      syncRoster();
      let visible = 0;
      for (const binding of bindings.values()) if (updateBinding(binding, now)) visible += 1;
      updateMarker(visible);
      raf = requestAnimationFrame(tick);
    };

    const install = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      if (disposed) return;
      originalAdd = THREE.Object3D.prototype.add;
      patchedAdd = function patchedCompanionObjectAdd(this: any, ...objects: any[]) {
        const result = originalAdd!.apply(this, objects);
        captureScene(this);
        return result;
      };
      THREE.Object3D.prototype.add = patchedAdd;
      window.addEventListener(COMPANION_ACTION_EVENT_V4, actionHandler);
      updateMarker(0);
      raf = requestAnimationFrame(tick);
    };

    void install().catch(error => console.error('Companion V5 scene bridge could not start', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener(COMPANION_ACTION_EVENT_V4, actionHandler);
      clearBindings();
      if (THREE && originalAdd && patchedAdd && THREE.Object3D.prototype.add === patchedAdd) {
        THREE.Object3D.prototype.add = originalAdd;
      }
    };
  }, []);

  const localDefinition = localCompanion ? COMPANION_DEFINITIONS_V5[localCompanion.role] : null;
  return <span
    ref={markerRef}
    className="hidden"
    aria-hidden="true"
    data-testid="run-companion-scene"
    data-visible-count="0"
    data-loaded-count="0"
    data-local-role={localCompanion?.role ?? 'none'}
    data-local-level={localCompanion?.level ?? 0}
    data-local-species={localDefinition?.species ?? 'none'}
    data-scene-captured="false"
    data-scene-hook="object3d-add"
    data-model-source="procedural-distinct-companion-v5"
    data-animation-source="articulated-locomotion-and-attacks"
    data-selection-surface="pre-run-only"
    data-follow-placement="inward-side"
    data-shared-renderer="true"
    data-extra-canvas="false"
  />;
}
