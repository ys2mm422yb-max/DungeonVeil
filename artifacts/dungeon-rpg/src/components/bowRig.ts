export type BowRig = {
  bow: any;
  anchor: any;
  basePosition: any;
  baseRotation: any;
  updateShotPose: (pulse: number) => void;
};

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

function bowAssetKey(bow: any) {
  let key = normalizeName(bow?.name);
  bow?.traverse?.((node: any) => {
    if (key.includes('withstring')) return;
    const candidate = normalizeName(node?.name);
    if (candidate.includes('bow') && candidate.includes('withstring')) key = candidate;
  });
  return key;
}

export function attachBowToRanger(_THREE: any, heroRoot: any, bow: any): BowRig {
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

  if (bestScore >= 130) {
    bow.position.set(0, 0, 0);
    const assetKey = bowAssetKey(bow);
    const fantasyWeaponsBow = assetKey.includes('bowawithstring') || assetKey.includes('bowbwithstring');
    // Fantasy Weapons bows are authored long on X; +90° around Y maps them to the
    // same long-Z equipment space as the Adventurer bow used by HandSlotL.
    bow.rotation.set(0, fantasyWeaponsBow ? Math.PI / 2 : 0, 0);
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
      bow.position.z -= pulse * 0.012;
      bow.rotation.x -= pulse * 0.018;

      bow.traverse?.((node: any) => {
        if (!node.morphTargetInfluences?.length) return;
        node.morphTargetInfluences[0] = Math.max(0, Math.min(1, pulse));
      });
    },
  };
}
