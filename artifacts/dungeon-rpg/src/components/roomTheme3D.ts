import type { GameState } from '../game/runEngine';

export type RoomPropKey = 'arch' | 'wall' | 'weaponStand' | 'workbench' | 'table' | 'torch' | 'vase' | 'campfire' | 'barrel' | 'crate';

export type RoomPropAssets = Partial<Record<RoomPropKey, any>>;

type Placement = {
  key: RoomPropKey;
  x: number;
  z: number;
  scale?: number;
  rotation?: number;
};

function roomPlacements(room: number): Placement[] {
  switch (room) {
    case 1:
      return [
        { key: 'arch', x: 0, z: -11.6, scale: 1.25 },
        { key: 'wall', x: -4.3, z: -10.9, scale: 1.05, rotation: 0.08 },
        { key: 'wall', x: 4.3, z: -10.9, scale: 1.05, rotation: -0.08 },
        { key: 'crate', x: -6.7, z: -7.6, scale: 0.86, rotation: 0.28 },
        { key: 'barrel', x: -5.6, z: -7.3, scale: 0.78, rotation: -0.2 },
        { key: 'weaponStand', x: 6.5, z: -7.4, scale: 0.92, rotation: Math.PI },
        { key: 'torch', x: -2.2, z: -10.8, scale: 0.82 },
        { key: 'torch', x: 2.2, z: -10.8, scale: 0.82 },
      ];
    case 2:
      return [
        { key: 'arch', x: -5.8, z: -8.4, scale: 1.1, rotation: Math.PI / 2 },
        { key: 'wall', x: -6.6, z: -3.1, scale: 1.05, rotation: Math.PI / 2 },
        { key: 'wall', x: 5.9, z: -5.6, scale: 1.15, rotation: Math.PI / 2 },
        { key: 'wall', x: 6.1, z: 1.2, scale: 0.95, rotation: Math.PI / 2 + 0.08 },
        { key: 'vase', x: -4.7, z: -6.9, scale: 0.7 },
        { key: 'vase', x: 5.2, z: -3.5, scale: 0.56 },
        { key: 'table', x: 0.5, z: -7.1, scale: 0.76, rotation: -0.08 },
        { key: 'torch', x: -6.1, z: -5.7, scale: 0.78 },
      ];
    case 3:
      return [
        { key: 'campfire', x: 0, z: -2.2, scale: 0.92 },
        { key: 'workbench', x: -6.1, z: -6.2, scale: 0.88, rotation: Math.PI / 2 },
        { key: 'table', x: 5.5, z: -6.5, scale: 0.74, rotation: -0.22 },
        { key: 'barrel', x: 6.6, z: -5.3, scale: 0.8 },
        { key: 'barrel', x: 5.6, z: -4.9, scale: 0.66, rotation: 0.3 },
        { key: 'crate', x: -5.4, z: -4.7, scale: 0.8, rotation: 0.25 },
        { key: 'crate', x: -6.5, z: -4.9, scale: 0.65, rotation: -0.18 },
        { key: 'weaponStand', x: 0, z: -8.8, scale: 0.9, rotation: Math.PI },
      ];
    case 4:
      return [
        { key: 'arch', x: 0, z: -11.4, scale: 1.45 },
        { key: 'wall', x: -5.4, z: -9.9, scale: 1.1, rotation: 0.05 },
        { key: 'wall', x: 5.4, z: -9.9, scale: 1.1, rotation: -0.05 },
        { key: 'torch', x: -2.8, z: -10.5, scale: 0.92 },
        { key: 'torch', x: 2.8, z: -10.5, scale: 0.92 },
        { key: 'vase', x: -6.5, z: -6.3, scale: 0.65 },
        { key: 'vase', x: 6.5, z: -6.3, scale: 0.65 },
        { key: 'campfire', x: 0, z: -5.8, scale: 0.76 },
      ];
    default:
      return [];
  }
}

function fallbackProp(THREE: any, key: RoomPropKey) {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x606454, roughness: 0.94 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x654228, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6f736c, roughness: 0.55, metalness: 0.28 });
  const ember = new THREE.MeshStandardMaterial({ color: 0xff8a38, emissive: 0xff4e18, emissiveIntensity: 1.4 });

  const mesh = (geometry: any, material: any, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    return object;
  };

  if (key === 'arch') {
    mesh(new THREE.BoxGeometry(0.55, 2.6, 0.65), stone, -1.15, 1.3, 0);
    mesh(new THREE.BoxGeometry(0.55, 2.6, 0.65), stone, 1.15, 1.3, 0);
    mesh(new THREE.BoxGeometry(2.85, 0.55, 0.65), stone, 0, 2.55, 0);
  } else if (key === 'wall') {
    mesh(new THREE.BoxGeometry(3.6, 1.4, 0.62), stone, 0, 0.7, 0);
  } else if (key === 'weaponStand') {
    mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), wood, -0.65, 0.8, 0);
    mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), wood, 0.65, 0.8, 0);
    mesh(new THREE.BoxGeometry(1.5, 0.14, 0.18), wood, 0, 1.2, 0);
    mesh(new THREE.BoxGeometry(1.2, 0.07, 0.07), metal, 0, 1.34, 0.08).rotation.z = -0.5;
  } else if (key === 'workbench' || key === 'table') {
    mesh(new THREE.BoxGeometry(2.2, 0.18, 1), wood, 0, 0.9, 0);
    for (const x of [-0.85, 0.85]) for (const z of [-0.3, 0.3]) mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), wood, x, 0.45, z);
  } else if (key === 'torch') {
    mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.25, 7), wood, 0, 0.65, 0);
    mesh(new THREE.SphereGeometry(0.16, 8, 7), ember, 0, 1.35, 0);
  } else if (key === 'vase' || key === 'barrel') {
    const material = key === 'barrel' ? wood : stone;
    mesh(new THREE.CylinderGeometry(key === 'barrel' ? 0.42 : 0.28, key === 'barrel' ? 0.45 : 0.36, key === 'barrel' ? 0.85 : 0.72, 9), material, 0, key === 'barrel' ? 0.425 : 0.36, 0);
  } else if (key === 'crate') {
    mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), wood, 0, 0.425, 0);
  } else if (key === 'campfire') {
    const logA = mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 7), wood, 0, 0.13, 0);
    logA.rotation.z = Math.PI / 2;
    logA.rotation.y = 0.6;
    const logB = mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 7), wood, 0, 0.14, 0);
    logB.rotation.z = Math.PI / 2;
    logB.rotation.y = -0.6;
    mesh(new THREE.ConeGeometry(0.32, 0.75, 9), ember, 0, 0.55, 0);
  }

  group.userData.isFallbackRoomProp = true;
  return group;
}

export function buildRoomTheme3D(THREE: any, state: GameState, assets: RoomPropAssets) {
  const root = new THREE.Group();
  root.name = `DungeonVeilRoomTheme-${state.floor}`;

  for (const placement of roomPlacements(state.floor)) {
    const source = assets[placement.key];
    const object = source ? source.clone(true) : fallbackProp(THREE, placement.key);
    object.position.set(placement.x, 0, placement.z);
    object.rotation.y = placement.rotation ?? 0;
    object.scale.multiplyScalar(placement.scale ?? 1);
    object.traverse((node: any) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
    });
    root.add(object);
  }

  return root;
}
