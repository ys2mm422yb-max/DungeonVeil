import type { WorldBossMobileRig } from './worldBossMobileVisual3D';

type Disposable = { dispose?: () => void };

function createWingShape(THREE: any, side: -1 | 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(side * 2.9, 0.45);
  shape.lineTo(side * 4.15, -0.25);
  shape.lineTo(side * 3.1, -0.95);
  shape.lineTo(side * 1.75, -0.62);
  shape.lineTo(side * 0.55, -1.15);
  shape.lineTo(0, 0);
  return shape;
}

/**
 * Guaranteed same-scene fallback used when the imported FBX dragon cannot be
 * fetched or parsed. It deliberately has a dragon silhouette (wings, long
 * neck, snout, horns and segmented tail) instead of a humanoid placeholder.
 */
export function createWorldBossFallbackDragonRig(THREE: any): WorldBossMobileRig {
  const geometries: Disposable[] = [];
  const materials: Disposable[] = [];
  const geometry = <T extends Disposable>(value: T): T => { geometries.push(value); return value; };
  const material = <T extends Disposable>(value: T): T => { materials.push(value); return value; };

  const ember = material(new THREE.MeshStandardMaterial({ color: 0x8f3324, roughness: 0.72, metalness: 0.06 }));
  const emberDark = material(new THREE.MeshStandardMaterial({ color: 0x4b1b1c, roughness: 0.82, metalness: 0.04 }));
  const scalePlate = material(new THREE.MeshStandardMaterial({ color: 0x2c2530, roughness: 0.62, metalness: 0.18 }));
  const wingMaterial = material(new THREE.MeshStandardMaterial({ color: 0x6b241f, roughness: 0.86, metalness: 0.02, side: THREE.DoubleSide }));
  const bone = material(new THREE.MeshStandardMaterial({ color: 0xd1b18a, roughness: 0.66, metalness: 0.04 }));
  const eye = material(new THREE.MeshStandardMaterial({ color: 0xff9d42, emissive: 0xff3a12, emissiveIntensity: 2.4, roughness: 0.3 }));

  const root = new THREE.Group();
  root.name = 'VeilDragonFallbackWorldBoss';
  const visual = new THREE.Group();
  visual.name = 'ProceduralAshDragon';
  root.add(visual);

  const addMesh = (parent: any, meshGeometry: any, meshMaterial: any, name: string) => {
    const mesh = new THREE.Mesh(geometry(meshGeometry), meshMaterial);
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    parent.add(mesh);
    return mesh;
  };

  const torso = addMesh(visual, new THREE.IcosahedronGeometry(1, 2), ember, 'FallbackDragonTorso');
  torso.scale.set(1.35, 0.82, 1.92);
  torso.position.set(0, 1.32, 0.15);

  const chest = addMesh(visual, new THREE.IcosahedronGeometry(0.78, 1), scalePlate, 'FallbackDragonChest');
  chest.scale.set(1.2, 1.05, 1.18);
  chest.position.set(0, 1.45, 1.22);

  for (const side of [-1, 1] as const) {
    const shoulder = addMesh(visual, new THREE.IcosahedronGeometry(0.42, 1), scalePlate, `FallbackDragonShoulder_${side}`);
    shoulder.scale.set(1.15, 0.86, 1.1);
    shoulder.position.set(side * 1.05, 1.47, 0.75);
  }

  const neck = new THREE.Group();
  neck.name = 'FallbackDragonNeck';
  neck.position.set(0, 1.72, 1.52);
  visual.add(neck);
  for (let index = 0; index < 4; index++) {
    const segment = addMesh(neck, new THREE.IcosahedronGeometry(0.48 - index * 0.045, 1), index % 2 ? scalePlate : ember, `FallbackDragonNeckSegment_${index}`);
    segment.scale.set(0.95, 0.88, 1.18);
    segment.position.set(0, index * 0.22, index * 0.5);
    segment.rotation.x = -0.18 + index * 0.025;
  }

  const headPivot = new THREE.Group();
  headPivot.name = 'FallbackDragonHeadPivot';
  headPivot.position.set(0, 0.68, 2.05);
  neck.add(headPivot);

  const head = addMesh(headPivot, new THREE.IcosahedronGeometry(0.56, 1), ember, 'FallbackDragonHead');
  head.scale.set(1.03, 0.82, 1.18);
  const snout = addMesh(headPivot, new THREE.BoxGeometry(0.76, 0.34, 0.92), emberDark, 'FallbackDragonSnout');
  snout.position.set(0, -0.08, 0.73);
  snout.rotation.x = -0.08;
  const jaw = addMesh(headPivot, new THREE.BoxGeometry(0.72, 0.18, 0.82), scalePlate, 'FallbackDragonJaw');
  jaw.position.set(0, -0.32, 0.68);
  jaw.rotation.x = 0.04;

  for (const side of [-1, 1] as const) {
    const horn = addMesh(headPivot, new THREE.ConeGeometry(0.11, 0.72, 7), bone, `FallbackDragonHorn_${side}`);
    horn.position.set(side * 0.34, 0.38, -0.15);
    horn.rotation.set(-0.82, 0, side * 0.28);
    const eyeMesh = addMesh(headPivot, new THREE.SphereGeometry(0.075, 8, 6), eye, `FallbackDragonEye_${side}`);
    eyeMesh.position.set(side * 0.37, 0.08, 0.47);
  }

  const leftWing = new THREE.Group();
  const rightWing = new THREE.Group();
  leftWing.name = 'FallbackDragonLeftWing';
  rightWing.name = 'FallbackDragonRightWing';
  leftWing.position.set(-0.78, 1.82, 0.35);
  rightWing.position.set(0.78, 1.82, 0.35);
  visual.add(leftWing, rightWing);

  const wingGeometryLeft = geometry(new THREE.ShapeGeometry(createWingShape(THREE, -1)));
  const wingGeometryRight = geometry(new THREE.ShapeGeometry(createWingShape(THREE, 1)));
  const leftMembrane = new THREE.Mesh(wingGeometryLeft, wingMaterial);
  const rightMembrane = new THREE.Mesh(wingGeometryRight, wingMaterial);
  leftMembrane.name = 'FallbackDragonLeftWingMembrane';
  rightMembrane.name = 'FallbackDragonRightWingMembrane';
  leftMembrane.rotation.x = -Math.PI / 2;
  rightMembrane.rotation.x = -Math.PI / 2;
  leftMembrane.position.z = 0.2;
  rightMembrane.position.z = 0.2;
  leftWing.add(leftMembrane);
  rightWing.add(rightMembrane);

  for (const [wing, side] of [[leftWing, -1], [rightWing, 1]] as const) {
    const upperBone = addMesh(wing, new THREE.CylinderGeometry(0.07, 0.11, 3.2, 7), bone, `FallbackDragonWingBone_${side}`);
    upperBone.position.set(side * 1.45, 0.04, 0.08);
    upperBone.rotation.z = side * Math.PI / 2.18;
    upperBone.rotation.x = 0.08;
  }

  const tail = new THREE.Group();
  tail.name = 'FallbackDragonTail';
  tail.position.set(0, 1.2, -1.55);
  visual.add(tail);
  const tailSegments: any[] = [];
  for (let index = 0; index < 7; index++) {
    const segment = addMesh(tail, new THREE.ConeGeometry(0.42 - index * 0.045, 0.95, 8), index % 2 ? emberDark : ember, `FallbackDragonTailSegment_${index}`);
    segment.rotation.x = Math.PI / 2;
    segment.position.set(0, -index * 0.045, -index * 0.72);
    segment.scale.set(1, 1, 1.08);
    tailSegments.push(segment);
  }
  const tailSpike = addMesh(tail, new THREE.ConeGeometry(0.22, 0.92, 7), bone, 'FallbackDragonTailSpike');
  tailSpike.rotation.x = -Math.PI / 2;
  tailSpike.position.set(0, -0.32, -5.05);

  for (const side of [-1, 1] as const) {
    const leg = new THREE.Group();
    leg.name = `FallbackDragonLeg_${side}`;
    leg.position.set(side * 0.8, 0.92, 0.75);
    visual.add(leg);
    const thigh = addMesh(leg, new THREE.IcosahedronGeometry(0.38, 1), scalePlate, `FallbackDragonThigh_${side}`);
    thigh.scale.set(0.9, 1.25, 0.9);
    const shin = addMesh(leg, new THREE.CylinderGeometry(0.13, 0.2, 0.9, 7), emberDark, `FallbackDragonShin_${side}`);
    shin.position.set(side * 0.08, -0.57, 0.18);
    shin.rotation.x = -0.3;
    for (let clawIndex = 0; clawIndex < 3; clawIndex++) {
      const claw = addMesh(leg, new THREE.ConeGeometry(0.06, 0.36, 6), bone, `FallbackDragonClaw_${side}_${clawIndex}`);
      claw.position.set(side * (0.1 + clawIndex * 0.09), -1.02, 0.48 + clawIndex * 0.04);
      claw.rotation.x = Math.PI / 2;
    }
  }

  visual.scale.setScalar(0.84);
  visual.position.y = 0.08;

  let moving = false;
  let attackRemaining = 0;
  let stopped = false;
  const mixer = new THREE.AnimationMixer(visual);

  return {
    root,
    mixer,
    setMoving(nextMoving: boolean) {
      moving = nextMoving;
    },
    triggerAttack() {
      attackRemaining = 0.72;
    },
    update(delta: number, now: number) {
      if (stopped) return;
      attackRemaining = Math.max(0, attackRemaining - delta);
      const seconds = now * 0.001;
      const gait = moving ? 1 : 0;
      const attackProgress = attackRemaining > 0 ? 1 - attackRemaining / 0.72 : 1;
      const attackWave = attackRemaining > 0 ? Math.sin(Math.min(1, attackProgress) * Math.PI) : 0;
      const flap = Math.sin(seconds * (moving ? 8.4 : 3.5)) * (moving ? 0.32 : 0.18);
      const hover = Math.sin(seconds * (moving ? 4.2 : 2.2)) * (moving ? 0.09 : 0.05);

      visual.position.y = 0.08 + hover + attackWave * 0.16;
      visual.rotation.x = -0.03 - gait * 0.05 - attackWave * 0.1;
      leftWing.rotation.z = -0.22 + flap + attackWave * 0.24;
      rightWing.rotation.z = 0.22 - flap - attackWave * 0.24;
      leftWing.rotation.x = -0.08 - Math.max(0, flap) * 0.12;
      rightWing.rotation.x = -0.08 - Math.max(0, -flap) * 0.12;
      headPivot.rotation.x = -0.05 + Math.sin(seconds * 2.1) * 0.045 - attackWave * 0.28;
      headPivot.rotation.y = Math.sin(seconds * 1.4) * 0.05;
      jaw.rotation.x = 0.04 + attackWave * 0.52;
      tail.rotation.y = Math.sin(seconds * (moving ? 2.9 : 1.55)) * (0.13 + gait * 0.05);
      tailSegments.forEach((segment, index) => {
        segment.rotation.z = Math.sin(seconds * 2.0 - index * 0.48) * (0.045 + index * 0.012);
      });
    },
    stop() {
      stopped = true;
      mixer.stopAllAction();
      geometries.forEach(value => value.dispose?.());
      materials.forEach(value => value.dispose?.());
    },
  };
}
