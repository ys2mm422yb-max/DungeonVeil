function seeded(room: number, index: number, salt: number) {
  const value = Math.sin(room * 91.17 + index * 37.31 + salt * 17.73) * 43758.5453;
  return value - Math.floor(value);
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
