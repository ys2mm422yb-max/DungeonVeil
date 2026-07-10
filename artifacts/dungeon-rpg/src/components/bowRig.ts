import type { EquipmentId } from '../game/metaProgression';

export type BowRig = {
  bow: any;
  anchor: any;
  basePosition: any;
  baseRotation: any;
  updateShotPose: (pulse: number) => void;
};

type BowProfile = {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  recoilZ: number;
  recoilX: number;
  tiltX: number;
};

const ADVENTURER_PROFILE: BowProfile = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  recoilZ: -0.012,
  recoilX: 0,
  tiltX: -0.018,
};

const FANTASY_A_PROFILE: BowProfile = {
  position: [0.015, 0, 0.025],
  rotation: [0, -Math.PI / 2, 0],
  recoilZ: -0.007,
  recoilX: 0.008,
  tiltX: -0.012,
};

const FANTASY_B_PROFILE: BowProfile = {
  position: [0.025, 0, 0.055],
  rotation: [0, -Math.PI / 2, 0],
  recoilZ: -0.006,
  recoilX: 0.01,
  tiltX: -0.01,
};

function profileForBow(id: EquipmentId): BowProfile {
  if (id === 'ember-bow' || id === 'frost-string') return FANTASY_A_PROFILE;
  if (id === 'hunter-bow' || id === 'warden-bow') return FANTASY_B_PROFILE;
  return ADVENTURER_PROFILE;
}

const normalizeName = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function scoreLeftHand(name: string) {
  if (name === 'handslotl' || name.endsWith('handslotl')) return 140;
  if (name.includes('handslotl') || name.includes('lefthandslot')) return 130;
  if (name === 'lefthand' || name.endsWith('lefthand')) return 100;
  if (name.includes('lefthand')) return 90;
  if (name.includes('handl') || name.endsWith('lhand')) return 80;
  if (name.includes('leftwrist') || name.includes('wristl')) return 60;
  return 0;
}

function setDrawMorph(bow: any, pulse: number) {
  const value = Math.max(0, Math.min(1, pulse));
  bow.traverse?.((node: any) => {
    if (!node.morphTargetInfluences?.length) return;
    const dictionary = node.morphTargetDictionary as Record<string, number> | undefined;
    const drawIndex = dictionary?.Draw ?? dictionary?.draw ?? 0;
    if (drawIndex >= 0 && drawIndex < node.morphTargetInfluences.length) node.morphTargetInfluences[drawIndex] = value;
  });
}

export function attachBowToRanger(_THREE: any, heroRoot: any, bow: any, bowId: EquipmentId = 'ash-bow'): BowRig {
  let anchor = heroRoot;
  let bestScore = 0;
  let previousPulse = 0;

  heroRoot.traverse((node: any) => {
    const score = scoreLeftHand(normalizeName(node.name));
    if (score > bestScore) {
      bestScore = score;
      anchor = node;
    }
  });

  anchor.add(bow);
  bow.rotation.order = 'YXZ';
  const profile = profileForBow(bowId);

  if (bestScore >= 130) {
    bow.position.set(profile.position[0], profile.position[1], profile.position[2]);
    bow.rotation.set(profile.rotation[0], profile.rotation[1], profile.rotation[2]);
  } else if (bestScore > 0) {
    bow.position.set(0.02, -0.015, 0.04);
    bow.rotation.set(Math.PI / 2, 0, 0);
  } else {
    bow.position.set(-0.32, 1.02, 0.16);
    bow.rotation.set(Math.PI / 2, 0, 0);
  }

  const basePosition = bow.position.clone();
  const baseRotation = bow.rotation.clone();

  return {
    bow,
    anchor,
    basePosition,
    baseRotation,
    updateShotPose(pulse: number) {
      if (pulse > 0.82 && previousPulse <= 0.82) heroRoot.userData.rangerAttackSignal = (heroRoot.userData.rangerAttackSignal ?? 0) + 1;
      previousPulse = pulse;
      bow.position.copy(basePosition);
      bow.rotation.copy(baseRotation);
      bow.position.z += pulse * profile.recoilZ;
      bow.position.x += pulse * profile.recoilX;
      bow.rotation.x += pulse * profile.tiltX;
      setDrawMorph(bow, pulse);
    },
  };
}
