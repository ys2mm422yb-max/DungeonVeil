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
    { kind: 'arch', x: 0, z: -10.7, scale: 1.0 },
    { kind: 'wall', x: -5.7, z: -9.2, scale: 1.0, rotation: 0.05 },
    { kind: 'wall', x: 5.7, z: -9.2, scale: 1.0, rotation: -0.05 },
    { kind: 'torch', x: -3.2, z: -9.5, scale: 0.9 },
    { kind: 'torch', x: 3.2, z: -9.5, scale: 0.9 },
    { kind: 'woodfire', x: -6.4, z: -5.5, scale: 0.9 },
    { kind: 'weaponStand', x: 6.3, z: -5.3, scale: 0.95, rotation: -0.22 },
  ],
  2: [
    { kind: 'archDoor', x: 0, z: -10.5, scale: 1.0 },
    { kind: 'wall', x: -6.2, z: -8.0, scale: 1.0, rotation: Math.PI / 2 },
    { kind: 'wallCover', x: 6.1, z: -7.8, scale: 1.0, rotation: Math.PI / 2 },
    { kind: 'vase', x: -3.8, z: -5.5, scale: 0.9 },
    { kind: 'vase', x: 3.7, z: -5.2, scale: 0.75 },
    { kind: 'torch', x: -4.7, z: -8.8, scale: 0.9 },
    { kind: 'torch', x: 4.7, z: -8.8, scale: 0.9 },
  ],
  3: [
    { kind: 'woodfire', x: 0, z: -6.2, scale: 1.1 },
    { kind: 'weaponStand', x: -6.7, z: -5.8, scale: 1.0, rotation: Math.PI / 2 },
    { kind: 'weaponStand', x: 6.7, z: -5.8, scale: 1.0, rotation: -Math.PI / 2 },
    { kind: 'workbench', x: -4.3, z: -8.9, scale: 0.95, rotation: 0.12 },
    { kind: 'workbench', x: 4.3, z: -8.9, scale: 0.95, rotation: -0.12 },
    { kind: 'torch', x: -2.3, z: -9.6, scale: 0.9 },
    { kind: 'torch', x: 2.3, z: -9.6, scale: 0.9 },
  ],
  4: [
    { kind: 'arch', x: 0, z: -10.5, scale: 1.08 },
    { kind: 'wall', x: -6.3, z: -8.1, scale: 1.05, rotation: Math.PI / 2 },
    { kind: 'wall', x: 6.3, z: -8.1, scale: 1.05, rotation: Math.PI / 2 },
    { kind: 'trapdoor', x: 0, z: -4.1, scale: 1.25 },
    { kind: 'torch', x: -4.2, z: -7.5, scale: 1.0 },
    { kind: 'torch', x: 4.2, z: -7.5, scale: 1.0 },
    { kind: 'vase', x: -5.2, z: -4.5, scale: 0.85 },
    { kind: 'vase', x: 5.2, z: -4.5, scale: 0.85 },
  ],
};

function cloneAsset(source: any, point: DecorPoint) {
  const object = source.clone(true);
  object.position.set(point.x, 0, point.z);
  object.rotation.y = point.rotation ?? 0;
  object.scale.multiplyScalar(point.scale ?? 1);
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  return object;
}

export function buildChapterRoomDecor(_THREE: any, room: number, assets: RoomDecorAssetMap = {}) {
  const root = new _THREE.Group();
  root.name = `DungeonVeilRoomDecor-${room}`;
  const points = ROOM_LAYOUTS[Math.max(1, Math.min(4, room))] ?? ROOM_LAYOUTS[1];

  for (const point of points) {
    const source = assets[point.kind];
    if (!source) continue;
    root.add(cloneAsset(source, point));
  }

  root.userData.update = (now: number) => {
    root.traverse((node: any) => {
      if (node.userData?.dvFlame && node.material) {
        node.material.emissiveIntensity = 1.8 + Math.sin(now * 0.009 + node.id) * 0.35;
      }
    });
  };

  return root;
}
