import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type AssetRule = { key: string; pack: KayKitPackName; include: RegExp; exclude?: RegExp };
type Placement = { key: string; x: number; y: number; z: number; scale: number; rotation?: number; name: string };

const GUARD_ASSETS: AssetRule[] = [
  { key: 'arch', pack: 'dungeon', include: /(wall_arched|archway|gate)/i },
  { key: 'pillar', pack: 'dungeon', include: /pillar.*decorated|decorated.*pillar|pillar/i },
  { key: 'banner', pack: 'dungeon', include: /banner.*shield|shield.*banner|banner/i },
  { key: 'torch', pack: 'dungeon', include: /torch.*lit|lit.*torch|torch/i },
  { key: 'shield', pack: 'weapons', include: /shield_[ABC]\.gltf$/i },
  { key: 'spear', pack: 'weapons', include: /spear_A\.gltf$/i },
];

const PLACEMENTS: Placement[] = [
  { key: 'arch', x: 0, y: -0.28, z: -13.45, scale: 1.58, rotation: Math.PI, name: 'RoomTwoGuardGate' },
  { key: 'pillar', x: -6.4, y: -0.08, z: -5.4, scale: 1.28, name: 'RoomTwoGuardPillarNorthLeft' },
  { key: 'pillar', x: 6.4, y: -0.08, z: -5.4, scale: 1.28, name: 'RoomTwoGuardPillarNorthRight' },
  { key: 'pillar', x: -5.2, y: -0.08, z: 2.4, scale: 1.18, name: 'RoomTwoGuardPillarSouthLeft' },
  { key: 'pillar', x: 5.2, y: -0.08, z: 2.4, scale: 1.18, name: 'RoomTwoGuardPillarSouthRight' },
  { key: 'banner', x: -4.9, y: 2.2, z: -12.1, scale: 1.08, rotation: Math.PI, name: 'RoomTwoCommandBannerLeft' },
  { key: 'banner', x: 4.9, y: 2.2, z: -12.1, scale: 1.08, rotation: Math.PI, name: 'RoomTwoCommandBannerRight' },
  { key: 'torch', x: -2.8, y: 1.0, z: -8.4, scale: 1.2, rotation: Math.PI, name: 'RoomTwoCommandTorchLeft' },
  { key: 'torch', x: 2.8, y: 1.0, z: -8.4, scale: 1.2, rotation: Math.PI, name: 'RoomTwoCommandTorchRight' },
  { key: 'shield', x: -2.25, y: 1.05, z: -5.65, scale: 1.18, rotation: 0.08, name: 'RoomTwoShieldDisplayLeft' },
  { key: 'shield', x: 2.25, y: 1.05, z: -5.65, scale: 1.18, rotation: -0.08, name: 'RoomTwoShieldDisplayRight' },
  { key: 'spear', x: -3.05, y: 0.25, z: -5.8, scale: 1.35, rotation: 0.14, name: 'RoomTwoSpearDisplayLeft' },
  { key: 'spear', x: 3.05, y: 0.25, z: -5.8, scale: 1.35, rotation: -0.14, name: 'RoomTwoSpearDisplayRight' },
];

export function buildRoomTwoGuardCommandHall(THREE: any) {
  const root = new THREE.Group();
  root.name = 'RoomTwoGuardCommandHall';

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.65, 4.15, 0.24, IS_MOBILE ? 8 : 12),
    new THREE.MeshStandardMaterial({ color: 0x494039, roughness: 0.9, metalness: 0.04 }),
  );
  platform.position.set(0, 0.08, -1.35);
  platform.scale.z = 0.72;
  root.add(platform);

  const commandInlay = new THREE.Mesh(
    new THREE.RingGeometry(2.45, 2.62, IS_MOBILE ? 30 : 48),
    new THREE.MeshBasicMaterial({ color: 0xc9a866, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  commandInlay.rotation.x = -Math.PI / 2;
  commandInlay.position.set(0, 0.215, -1.35);
  commandInlay.scale.z = 0.72;
  root.add(commandInlay);

  const commandLight = new THREE.PointLight(0xffc678, IS_MOBILE ? 1.45 : 2.8, 13, 2);
  commandLight.position.set(0, 4.0, -1.8);
  root.add(commandLight);

  const rimLight = new THREE.DirectionalLight(0x7898c9, IS_MOBILE ? 0.48 : 0.82);
  rimLight.position.set(6.5, 8.5, 4.5);
  root.add(rimLight);

  const ready = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const loader = new GLTFLoader();

    await Promise.all(GUARD_ASSETS.map(async rule => {
      const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
      if (!relative) throw new Error(`Missing room-two guard asset: ${rule.key}`);
      const gltf = await loader.loadAsync(modelUrl(manifest, relative));
      for (const placement of PLACEMENTS.filter(entry => entry.key === rule.key)) {
        const object = gltf.scene.clone(true);
        object.position.set(placement.x, placement.y, placement.z);
        object.rotation.y = placement.rotation ?? 0;
        object.scale.setScalar(placement.scale);
        object.name = placement.name;
        object.traverse((node: any) => {
          if (!node.isMesh && !node.isSkinnedMesh) return;
          node.castShadow = false;
          node.receiveShadow = !IS_MOBILE;
          node.frustumCulled = false;
        });
        root.add(object);
      }
    }));
  })();

  root.userData.ready = ready;
  root.userData.dispose = () => {
    commandLight.dispose?.();
    rimLight.dispose?.();
  };
  return root;
}
