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
    // KayKit Adventurer bow + HandSlotL share the same authored equipment space.
    // Preserve the package's native transform instead of guessing from bounds.
    bow.position.set(0, 0, 0);
    bow.rotation.set(0, 0, 0);
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

      // Keep the grip fixed. The character animation sells the shot; only add a tiny recoil.
      bow.position.z -= pulse * 0.012;
      bow.rotation.x -= pulse * 0.018;

      bow.traverse?.((node: any) => {
        if (!node.morphTargetInfluences?.length) return;
        node.morphTargetInfluences[0] = Math.max(0, Math.min(1, pulse));
      });
    },
  };
}
