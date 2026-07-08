export type SlimeVisual = {
  root: any;
  body: any;
  face: any;
  shadow: any;
  materials: any[];
  seed: number;
  baseScale: number;
  lastFlashUntil: number;
  hitStart: number;
};

const COLORS = [0x43b86b, 0x4fa8ff, 0xb866ff, 0xff9b45, 0xff5d7a, 0xe8d84f];

function idHash(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index++) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  return hash;
}

export function getSlimeVariant(enemy: any) {
  const hash = idHash(enemy.id);
  const typeBoost = enemy.enemyType === 'boss' ? 1.65 : enemy.enemyType === 'orc' || enemy.enemyType === 'golem' ? 1.22 : enemy.enemyType === 'spider' ? 0.84 : 1;
  return {
    color: COLORS[hash % COLORS.length],
    baseScale: (0.78 + ((hash >>> 3) % 5) * 0.1) * typeBoost,
    jumpSpeed: 2.4 + ((hash >>> 8) % 5) * 0.18,
    jumpHeight: 0.28 + ((hash >>> 12) % 4) * 0.045,
    phase: (hash % 997) / 997 * Math.PI * 2,
    stretch: 0.78 + ((hash >>> 17) % 4) * 0.05,
  };
}

export function createSlimeVisual(THREE: any, enemy: any): SlimeVisual {
  const variant = getSlimeVariant(enemy);
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: variant.color,
    roughness: 0.34,
    metalness: 0.02,
    emissive: variant.color,
    emissiveIntensity: 0.08,
    transparent: true,
    opacity: 0.96,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x140d0a, roughness: 0.28, transparent: true });
  const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1520, roughness: 0.5, transparent: true });
  const materials = [bodyMaterial, eyeMaterial, mouthMaterial];

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 11), bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  visual.add(body);

  const face = new THREE.Group();
  for (const x of [-0.135, 0.135]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), eyeMaterial);
    eye.position.set(x, 0.085, 0.405);
    face.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 5, 10, Math.PI), mouthMaterial);
  mouth.position.set(0, -0.03, 0.425);
  mouth.rotation.z = Math.PI;
  face.add(mouth);
  visual.add(face);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 16),
    new THREE.MeshBasicMaterial({ color: 0x152017, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  root.userData.visual = visual;

  return {
    root,
    body,
    face,
    shadow,
    materials,
    seed: variant.phase,
    baseScale: variant.baseScale,
    lastFlashUntil: 0,
    hitStart: -Infinity,
  };
}

export function updateSlimeVisual(visual: SlimeVisual, enemy: any, now: number) {
  const variant = getSlimeVariant(enemy);
  const elapsed = now * 0.001;
  const cycle = ((elapsed * variant.jumpSpeed + variant.phase) % (Math.PI * 2));
  const hop = Math.max(0, Math.sin(cycle));
  const landing = Math.max(0, -Math.sin(cycle * 2));
  const isDead = enemy.isDead || enemy.hp <= 0;

  if (enemy.flashUntil > visual.lastFlashUntil) {
    visual.lastFlashUntil = enemy.flashUntil;
    visual.hitStart = now;
  }

  const hitAge = now - visual.hitStart;
  const hitPulse = hitAge >= 0 && hitAge < 180 ? 1 - hitAge / 180 : 0;
  const hitWave = Math.sin(hitAge * 0.09) * hitPulse;

  const deathAge = isDead ? Math.max(0, now - (enemy.deathTime || now)) : 0;
  const deathProgress = Math.min(1, deathAge / 320);

  const visualRoot = visual.root.userData.visual;
  visualRoot.position.y = isDead ? 0.04 : 0.2 + hop * variant.jumpHeight;
  visualRoot.position.x = hitWave * 0.09;
  visualRoot.rotation.z = hitWave * 0.18;

  if (isDead) {
    const squashOut = 1 - deathProgress;
    visualRoot.scale.set(
      visual.baseScale * (1 + deathProgress * 0.85),
      visual.baseScale * Math.max(0.05, squashOut * 0.55),
      visual.baseScale * (1 + deathProgress * 0.85),
    );
    visualRoot.rotation.y += 0.08;
    for (const material of visual.materials) material.opacity = Math.max(0, 1 - deathProgress);
    visual.shadow.material.opacity = 0.32 * (1 - deathProgress);
    visual.shadow.scale.setScalar(1 + deathProgress * 1.1);
    return;
  }

  const stretchY = 0.78 + hop * 0.5 - landing * 0.2;
  const squashXZ = 1.08 - hop * 0.16 + landing * 0.18;
  visualRoot.scale.set(
    visual.baseScale * squashXZ * (1 + hitPulse * 0.08),
    visual.baseScale * stretchY * variant.stretch,
    visual.baseScale * squashXZ * (1 - hitPulse * 0.05),
  );

  visual.shadow.scale.setScalar(1.05 - hop * 0.34);
  visual.shadow.material.opacity = 0.34 - hop * 0.16;

  const flashing = enemy.flashUntil > now;
  const bodyMaterial = visual.materials[0];
  bodyMaterial.emissiveIntensity = flashing ? 1.8 : 0.08;
  bodyMaterial.color.setHex(flashing ? 0xffffff : variant.color);
  bodyMaterial.emissive.setHex(flashing ? 0xffffff : variant.color);
}
