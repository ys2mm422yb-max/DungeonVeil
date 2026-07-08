export type RoomDecorAssetMap = Record<string, any>;

type DecorPoint = {
  kind: string;
  x: number;
  z: number;
  scale?: number;
  rotation?: number;
};

const ROOM_LAYOUTS: Record<number, DecorPoint[]> = {
  1: [
    { kind: 'arch', x: 0, z: -11.2, scale: 1.25 },
    { kind: 'brokenWall', x: -5.8, z: -8.6, scale: 1.2, rotation: 0.08 },
    { kind: 'brokenWall', x: 5.8, z: -8.6, scale: 1.2, rotation: -0.08 },
    { kind: 'crateStack', x: -7.1, z: -5.6, scale: 0.95, rotation: 0.25 },
    { kind: 'weaponStand', x: 7.0, z: -5.3, scale: 1.0, rotation: -0.28 },
    { kind: 'brazier', x: -3.8, z: -9.4, scale: 0.85 },
    { kind: 'brazier', x: 3.8, z: -9.4, scale: 0.85 },
  ],
  2: [
    { kind: 'pillar', x: -6.7, z: -7.5, scale: 1.15 },
    { kind: 'pillarBroken', x: 6.2, z: -7.0, scale: 1.0, rotation: 0.35 },
    { kind: 'brokenWall', x: -7.2, z: -2.1, scale: 1.15, rotation: Math.PI / 2 },
    { kind: 'brokenWall', x: 7.1, z: -1.6, scale: 1.15, rotation: Math.PI / 2 },
    { kind: 'altar', x: 0, z: -8.8, scale: 1.05 },
    { kind: 'vase', x: -3.6, z: -5.5, scale: 0.8 },
    { kind: 'vase', x: 3.5, z: -5.2, scale: 0.7 },
  ],
  3: [
    { kind: 'campfire', x: 0, z: -6.3, scale: 1.0 },
    { kind: 'crateStack', x: -5.6, z: -6.8, scale: 1.05, rotation: 0.22 },
    { kind: 'crateStack', x: 5.9, z: -6.6, scale: 0.92, rotation: -0.38 },
    { kind: 'weaponStand', x: -7.0, z: -2.2, scale: 1.0, rotation: Math.PI / 2 },
    { kind: 'weaponStand', x: 7.0, z: -2.0, scale: 1.0, rotation: -Math.PI / 2 },
    { kind: 'banner', x: -3.2, z: -9.8, scale: 1.05 },
    { kind: 'banner', x: 3.2, z: -9.8, scale: 1.05 },
  ],
  4: [
    { kind: 'arch', x: 0, z: -10.6, scale: 1.4 },
    { kind: 'pillar', x: -6.5, z: -7.6, scale: 1.15 },
    { kind: 'pillar', x: 6.5, z: -7.6, scale: 1.15 },
    { kind: 'stoneRing', x: 0, z: -4.1, scale: 1.3 },
    { kind: 'brazier', x: -4.1, z: -7.4, scale: 0.9 },
    { kind: 'brazier', x: 4.1, z: -7.4, scale: 0.9 },
    { kind: 'altar', x: 0, z: -8.8, scale: 1.0 },
  ],
};

function cloneAsset(source: any, point: DecorPoint) {
  const object = source.clone(true);
  object.position.set(point.x, 0, point.z);
  object.rotation.y = point.rotation ?? 0;
  object.scale.setScalar(point.scale ?? 1);
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  return object;
}

function material(THREE: any, color: number, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
}

function addBox(THREE: any, root: any, size: [number, number, number], position: [number, number, number], color: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(THREE, color));
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function buildFallback(THREE: any, point: DecorPoint) {
  const root = new THREE.Group();
  const stone = 0x6d6657;
  const wood = 0x5a3925;
  const darkWood = 0x38251a;
  const bronze = 0x9b6c31;

  if (point.kind === 'arch') {
    addBox(THREE, root, [0.72, 3.2, 0.72], [-1.65, 1.6, 0], stone);
    addBox(THREE, root, [0.72, 3.2, 0.72], [1.65, 1.6, 0], stone);
    addBox(THREE, root, [4, 0.72, 0.72], [0, 3.02, 0], stone);
  } else if (point.kind === 'brokenWall') {
    for (let index = 0; index < 5; index++) {
      const h = index === 2 ? 1.35 : index % 2 ? 0.95 : 1.15;
      addBox(THREE, root, [1.05, h, 0.72], [(index - 2) * 0.94, h / 2, 0], stone);
    }
  } else if (point.kind === 'pillar' || point.kind === 'pillarBroken') {
    const height = point.kind === 'pillar' ? 3.0 : 1.65;
    addBox(THREE, root, [0.85, height, 0.85], [0, height / 2, 0], stone);
    addBox(THREE, root, [1.15, 0.28, 1.15], [0, 0.14, 0], stone);
    addBox(THREE, root, [1.05, 0.3, 1.05], [0, height - 0.15, 0], stone);
  } else if (point.kind === 'crateStack') {
    const a = addBox(THREE, root, [1.1, 1.0, 1.1], [-0.45, 0.5, 0], wood);
    const b = addBox(THREE, root, [0.9, 0.82, 0.9], [0.52, 0.41, 0.15], darkWood);
    const c = addBox(THREE, root, [0.82, 0.75, 0.82], [-0.1, 1.37, 0.05], wood);
    a.rotation.y = 0.05; b.rotation.y = -0.18; c.rotation.y = 0.14;
  } else if (point.kind === 'weaponStand') {
    addBox(THREE, root, [2.5, 0.16, 0.18], [0, 1.45, 0], darkWood);
    addBox(THREE, root, [0.18, 2.1, 0.18], [-1, 1.05, 0], wood);
    addBox(THREE, root, [0.18, 2.1, 0.18], [1, 1.05, 0], wood);
    for (const x of [-0.62, 0, 0.62]) {
      const blade = addBox(THREE, root, [0.08, 1.45, 0.08], [x, 1.2, 0.05], 0xb6b8af);
      blade.rotation.z = x * 0.12;
    }
  } else if (point.kind === 'brazier' || point.kind === 'campfire') {
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(point.kind === 'campfire' ? 0.48 : 0.34, 0), new THREE.MeshStandardMaterial({ color: 0xff8a31, emissive: 0xff4f10, emissiveIntensity: 2.4 }));
    flame.position.y = point.kind === 'campfire' ? 0.4 : 1.05;
    flame.userData.dvFlame = true;
    root.add(flame);
    if (point.kind === 'brazier') {
      addBox(THREE, root, [0.12, 1.0, 0.12], [0, 0.5, 0], bronze);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.2, 10), material(THREE, bronze));
      bowl.position.y = 0.88;
      root.add(bowl);
    } else {
      for (let index = 0; index < 3; index++) {
        const log = addBox(THREE, root, [1.15, 0.18, 0.18], [0, 0.1, 0], wood);
        log.rotation.y = index * Math.PI / 3;
      }
    }
  } else if (point.kind === 'altar') {
    addBox(THREE, root, [2.4, 0.5, 1.25], [0, 0.25, 0], stone);
    addBox(THREE, root, [1.8, 0.68, 0.9], [0, 0.82, 0], stone);
  } else if (point.kind === 'vase') {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 0.8, 10), material(THREE, 0x8d6044));
    vase.position.y = 0.4;
    root.add(vase);
  } else if (point.kind === 'banner') {
    addBox(THREE, root, [0.12, 2.6, 0.12], [0, 1.3, 0], darkWood);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.45), new THREE.MeshStandardMaterial({ color: 0x5b1f2b, side: THREE.DoubleSide, roughness: 1 }));
    cloth.position.set(0.55, 1.75, 0);
    cloth.userData.dvBanner = true;
    root.add(cloth);
  } else if (point.kind === 'stoneRing') {
    for (let index = 0; index < 8; index++) {
      const angle = index / 8 * Math.PI * 2;
      const stoneMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), material(THREE, stone));
      stoneMesh.position.set(Math.cos(angle) * 1.85, 0.34, Math.sin(angle) * 1.85);
      stoneMesh.rotation.y = angle;
      stoneMesh.castShadow = true;
      root.add(stoneMesh);
    }
  }

  root.position.set(point.x, 0, point.z);
  root.rotation.y = point.rotation ?? 0;
  root.scale.setScalar(point.scale ?? 1);
  return root;
}

export function buildChapterRoomDecor(THREE: any, room: number, assets: RoomDecorAssetMap = {}) {
  const root = new THREE.Group();
  root.name = `DungeonVeilRoomDecor-${room}`;
  const points = ROOM_LAYOUTS[Math.max(1, Math.min(4, room))] ?? ROOM_LAYOUTS[1];

  for (const point of points) {
    const source = assets[point.kind];
    root.add(source ? cloneAsset(source, point) : buildFallback(THREE, point));
  }

  root.userData.update = (now: number) => {
    root.traverse((node: any) => {
      if (node.userData?.dvFlame) {
        const pulse = 1 + Math.sin(now * 0.012 + node.id) * 0.12;
        node.scale.setScalar(pulse);
        if (node.material) node.material.emissiveIntensity = 2.1 + Math.sin(now * 0.009 + node.id) * 0.45;
      }
      if (node.userData?.dvBanner) node.rotation.y = Math.sin(now * 0.0018 + node.id) * 0.06;
    });
  };

  return root;
}
