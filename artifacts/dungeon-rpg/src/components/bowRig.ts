export type BowRig = {
  bow: any;
  anchor: any;
  basePosition: any;
  baseRotation: any;
  updateShotPose: (pulse: number) => void;
};

const normalizeName = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function scoreLeftHand(name: string) {
  if (name === 'lefthand' || name.endsWith('lefthand')) return 100;
  if (name.includes('lefthand')) return 90;
  if (name.includes('handl') || name.endsWith('lhand')) return 80;
  if (name.includes('leftwrist') || name.includes('wristl')) return 60;
  return 0;
}

export function attachBowToRanger(THREE: any, heroRoot: any, bow: any): BowRig {
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

  if (bestScore > 0) {
    bow.position.set(0.015, -0.015, 0.035);
    bow.rotation.order = 'YXZ';
    bow.rotation.set(-0.08, Math.PI / 2, -Math.PI / 2);
  } else {
    bow.position.set(-0.4, 1.02, 0.12);
    bow.rotation.order = 'YXZ';
    bow.rotation.set(-0.08, Math.PI / 2, -Math.PI / 2);
  }

  const basePosition = bow.position.clone();
  const baseRotation = bow.rotation.clone();

  return {
    bow,
    anchor,
    basePosition,
    baseRotation,
    updateShotPose(pulse: number) {
      if (pulse > 0.82 && previousPulse <= 0.82) {
        heroRoot.userData.rangerAttackSignal = (heroRoot.userData.rangerAttackSignal ?? 0) + 1;
      }
      previousPulse = pulse;

      bow.position.copy(basePosition);
      bow.rotation.copy(baseRotation);
      bow.position.z -= pulse * 0.035;
      bow.rotation.y += pulse * 0.08;
    },
  };
}
