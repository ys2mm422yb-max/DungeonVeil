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

function chooseVerticalBowRotation(THREE: any, heroRoot: any, bow: any) {
  const candidates: Array<[number, number, number]> = [
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
    [-Math.PI / 2, 0, 0],
    [0, 0, Math.PI / 2],
    [0, 0, -Math.PI / 2],
  ];
  const bounds = new THREE.Box3();
  const size = new THREE.Vector3();
  let best = candidates[0];
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    bow.rotation.set(candidate[0], candidate[1], candidate[2]);
    heroRoot.updateMatrixWorld(true);
    bounds.setFromObject(bow);
    bounds.getSize(size);
    const horizontal = Math.max(size.x, size.z, 0.001);
    const score = size.y / horizontal;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  bow.rotation.set(best[0], best[1], best[2]);
}

function centerGripOnAnchor(THREE: any, heroRoot: any, anchor: any, bow: any) {
  heroRoot.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(bow);
  const centerWorld = bounds.getCenter(new THREE.Vector3());
  const centerLocal = anchor.worldToLocal(centerWorld.clone());
  bow.position.sub(centerLocal);

  // Der geometrische Mittelpunkt entspricht beim KayKit-Bogen sehr gut dem Griffbereich.
  // Ein kleiner seitlicher Offset verhindert, dass der Griff im Handschuh verschwindet.
  bow.position.x += 0.018;
  bow.position.z += 0.012;
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
  bow.rotation.order = 'YXZ';

  if (bestScore >= 130) {
    bow.position.set(0, 0, 0);
    chooseVerticalBowRotation(THREE, heroRoot, bow);
    centerGripOnAnchor(THREE, heroRoot, anchor, bow);
    bow.rotation.y -= 0.08;
    bow.rotation.x += 0.04;
  } else if (bestScore > 0) {
    bow.position.set(0.015, -0.015, 0.035);
    bow.rotation.set(-0.08, Math.PI / 2, -Math.PI / 2);
  } else {
    bow.position.set(-0.4, 1.02, 0.12);
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
      if (pulse > 0.82 && previousPulse <= 0.82) heroRoot.userData.rangerAttackSignal = (heroRoot.userData.rangerAttackSignal ?? 0) + 1;
      previousPulse = pulse;
      bow.position.copy(basePosition);
      bow.rotation.copy(baseRotation);
      bow.position.z -= pulse * 0.035;
      bow.position.y += pulse * 0.012;
      bow.rotation.x -= pulse * 0.05;
      bow.rotation.y += pulse * 0.035;
    },
  };
}
