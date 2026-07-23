function seeded(room: number, index: number, salt: number) {
  const value = Math.sin(room * 91.17 + index * 37.31 + salt * 17.73) * 43758.5453;
  return value - Math.floor(value);
}

function buildFirstArcGateway(THREE: any) {
  const gateway = new THREE.Group();
  gateway.name = 'FirstArcGateway';
  gateway.userData.firstArcGateway = true;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x241a22,
    emissive: 0x4b1f2e,
    emissiveIntensity: 0.42,
    roughness: 0.86,
    metalness: 0.12,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a4438,
    emissive: 0xa43c24,
    emissiveIntensity: 0.72,
    roughness: 0.62,
    metalness: 0.16,
  });
  const veilMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d1738,
    emissive: 0x8030a8,
    emissiveIntensity: 1.85,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.5,
    metalness: 0,
  });
  const innerVeilMaterial = new THREE.MeshBasicMaterial({
    color: 0xc36dff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const pillarGeometry = new THREE.BoxGeometry(0.42, 2.55, 0.5);
  for (const x of [-1.58, 1.58]) {
    const pillar = new THREE.Mesh(pillarGeometry, frameMaterial);
    pillar.position.set(x, 1.3, -7.72);
    pillar.castShadow = false;
    pillar.receiveShadow = false;
    gateway.add(pillar);
  }

  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.22, 8, 36, Math.PI), frameMaterial);
  arch.position.set(0, 2.55, -7.72);
  arch.castShadow = false;
  arch.receiveShadow = false;
  gateway.add(arch);

  const edgeArch = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.065, 6, 36, Math.PI), edgeMaterial);
  edgeArch.position.set(0, 2.55, -7.48);
  edgeArch.castShadow = false;
  edgeArch.receiveShadow = false;
  gateway.add(edgeArch);

  const threshold = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.24, 0.82), frameMaterial);
  threshold.position.set(0, 0.12, -7.72);
  threshold.castShadow = false;
  threshold.receiveShadow = false;
  gateway.add(threshold);

  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 2.55), veilMaterial);
  veil.position.set(0, 1.32, -7.86);
  veil.renderOrder = 2;
  gateway.add(veil);

  const innerVeil = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), innerVeilMaterial);
  innerVeil.position.set(0, 1.35, -7.62);
  innerVeil.renderOrder = 3;
  gateway.add(innerVeil);

  const runeGeometry = new THREE.BoxGeometry(0.18, 0.42, 0.06);
  for (let index = 0; index < 6; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const level = Math.floor(index / 2);
    const rune = new THREE.Mesh(runeGeometry, edgeMaterial);
    rune.position.set(side * 1.57, 0.72 + level * 0.72, -7.43);
    rune.rotation.z = side * (0.1 + level * 0.07);
    rune.castShadow = false;
    rune.receiveShadow = false;
    gateway.add(rune);
  }

  return gateway;
}

export function buildFirelandsTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `FirelandsTheme_${room}`;
  if (room < 41) return root;

  const progress = Math.max(0.1, Math.min(1, (room - 40) / 10));
  const lavaMaterial = new THREE.MeshStandardMaterial({
    color: 0xff5a18,
    emissive: 0xff2400,
    emissiveIntensity: 2.6 + progress * 2.4,
    roughness: 0.42,
    metalness: 0.08,
  });
  const hotMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb029,
    emissive: 0xff5a00,
    emissiveIntensity: 3.4 + progress * 2.2,
    roughness: 0.34,
  });
  const obsidianMaterial = new THREE.MeshStandardMaterial({ color: 0x211619, roughness: 0.94, metalness: 0.08 });
  const ashMaterial = new THREE.MeshStandardMaterial({ color: 0x49302a, roughness: 1 });

  const crackCount = 9 + Math.round(progress * 10);
  for (let index = 0; index < crackCount; index++) {
    let x = seeded(room, index, 1) * 9.4 - 4.7;
    let z = seeded(room, index, 2) * 11.4 - 5.7;
    if (Math.abs(x) < 1.05 && Math.abs(z) < 1.6) x += x < 0 ? -1.35 : 1.35;
    const length = 0.65 + seeded(room, index, 3) * 1.5;
    const width = 0.055 + seeded(room, index, 4) * 0.08;
    const crack = new THREE.Mesh(new THREE.BoxGeometry(length, 0.025, width), index % 3 === 0 ? hotMaterial : lavaMaterial);
    crack.position.set(x, 0.045, z);
    crack.rotation.y = seeded(room, index, 5) * Math.PI;
    crack.receiveShadow = false;
    root.add(crack);
  }

  const blockCount = 12 + Math.round(progress * 8);
  for (let index = 0; index < blockCount; index++) {
    const side = index % 4;
    const along = seeded(room, index, 6) * 9.5 - 4.75;
    const x = side < 2 ? along : (side === 2 ? -5.35 : 5.35);
    const z = side < 2 ? (side === 0 ? -6.15 : 6.15) : along * 1.15;
    const size = 0.32 + seeded(room, index, 7) * 0.38;
    const block = new THREE.Mesh(new THREE.BoxGeometry(size, 0.28 + size * 0.5, size), index % 5 === 0 ? ashMaterial : obsidianMaterial);
    block.position.set(x, block.geometry.parameters.height / 2, z);
    block.rotation.y = seeded(room, index, 8) * Math.PI;
    block.castShadow = true;
    block.receiveShadow = true;
    root.add(block);
  }

  if (room >= 47) {
    const outer = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.08 + progress * 0.04, 8, 72), lavaMaterial);
    outer.rotation.x = Math.PI / 2;
    outer.position.y = 0.045;
    outer.scale.z = 1.18;
    root.add(outer);
  }
  if (room === 50) {
    const bossRing = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.13, 10, 72), hotMaterial);
    bossRing.rotation.x = Math.PI / 2;
    bossRing.position.y = 0.055;
    root.add(bossRing);
    root.add(buildFirstArcGateway(THREE));
  }

  const emberCount = 28 + Math.round(progress * 26);
  const positions = new Float32Array(emberCount * 3);
  for (let index = 0; index < emberCount; index++) {
    positions[index * 3] = seeded(room, index, 10) * 10.5 - 5.25;
    positions[index * 3 + 1] = 0.3 + seeded(room, index, 11) * 2.6;
    positions[index * 3 + 2] = seeded(room, index, 12) * 12.2 - 6.1;
  }
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const embers = new THREE.Points(emberGeometry, new THREE.PointsMaterial({ color: 0xff8a32, size: 0.055 + progress * 0.025, transparent: true, opacity: 0.78, depthWrite: false }));
  root.add(embers);

  const lightA = new THREE.PointLight(0xff4b16, 4.5 + progress * 3, 13, 2);
  lightA.position.set(-3.2, 1.4, -2.2);
  root.add(lightA);
  const lightB = new THREE.PointLight(0xff7a22, 3.5 + progress * 2.5, 12, 2);
  lightB.position.set(3.4, 1.1, 3.2);
  root.add(lightB);

  root.userData.ready = Promise.resolve();
  root.userData.dispose = () => root.traverse((node: any) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
    else node.material?.dispose?.();
  });
  return root;
}
