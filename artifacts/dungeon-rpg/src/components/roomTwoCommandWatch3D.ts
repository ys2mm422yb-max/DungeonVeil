import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type AssetRule = { key: string; pack: KayKitPackName; include: RegExp; exclude?: RegExp };

const WATCH_ASSETS: AssetRule[] = [
  { key: 'arch', pack: 'dungeon', include: /(wall_arched|archway|gate)/i },
  { key: 'pillar', pack: 'dungeon', include: /pillar.*decorated|decorated.*pillar|pillar/i },
  { key: 'banner', pack: 'dungeon', include: /banner.*shield|shield.*banner|banner/i },
  { key: 'torch', pack: 'dungeon', include: /torch.*lit|lit.*torch|torch/i },
  { key: 'crest', pack: 'dungeon', include: /sword.*shield|shield.*sword|weapon.*shield/i },
];

export function buildRoomTwoCommandWatch(THREE: any) {
  const root = new THREE.Group();
  root.name = 'RoomTwoCommandWatch';

  const commandDais = new THREE.Mesh(
    new THREE.BoxGeometry(8.8, 0.28, 3.8),
    new THREE.MeshStandardMaterial({ color: 0x37342f, roughness: 0.93, metalness: 0.03 }),
  );
  commandDais.position.set(0, 0.1, -7.4);
  root.add(commandDais);

  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 8.4),
    new THREE.MeshStandardMaterial({ color: 0x6d2830, roughness: 0.86, side: THREE.DoubleSide }),
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.255, -5.7);
  root.add(runner);

  const commandMark = new THREE.Mesh(
    new THREE.RingGeometry(1.55, 1.72, IS_MOBILE ? 30 : 48),
    new THREE.MeshBasicMaterial({ color: 0xd8b163, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }),
  );
  commandMark.rotation.x = -Math.PI / 2;
  commandMark.position.set(0, 0.27, -7.35);
  root.add(commandMark);

  const warm = new THREE.PointLight(0xffb561, IS_MOBILE ? 1.55 : 3.0, 13, 2);
  warm.position.set(0, 4.0, -7.0);
  root.add(warm);

  const cold = new THREE.DirectionalLight(0x7897c7, IS_MOBILE ? 0.5 : 0.82);
  cold.position.set(-6, 9, 4);
  root.add(cold);

  let active = true;
  const ready = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const loader = new GLTFLoader();

    for (const rule of WATCH_ASSETS) {
      if (!active) return;
      try {
        const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
        if (!relative) throw new Error(`Missing room-two asset: ${rule.key}`);
        const gltf = await loader.loadAsync(modelUrl(manifest, relative));
        if (!active) return;
        const add = (x: number, y: number, z: number, scale: number, rotation = 0, name = '') => {
          const object = gltf.scene.clone(true);
          object.position.set(x, y, z);
          object.rotation.y = rotation;
          object.scale.setScalar(scale);
          object.name = name;
          object.traverse((node: any) => {
            if (!node.isMesh && !node.isSkinnedMesh) return;
            node.castShadow = false;
            node.receiveShadow = !IS_MOBILE;
            node.frustumCulled = false;
          });
          root.add(object);
        };

        if (rule.key === 'arch') add(0, -0.28, -13.6, 1.58, Math.PI, 'RoomTwoCommandArch');
        if (rule.key === 'pillar') {
          add(-4.65, -0.08, -8.35, 1.3, 0, 'RoomTwoWatchPillarLeft');
          add(4.65, -0.08, -8.35, 1.3, 0, 'RoomTwoWatchPillarRight');
        }
        if (rule.key === 'banner') {
          add(-5.25, 2.35, -12.25, 1.04, Math.PI, 'RoomTwoBannerLeft');
          add(5.25, 2.35, -12.25, 1.04, Math.PI, 'RoomTwoBannerRight');
        }
        if (rule.key === 'torch') {
          add(-2.8, 1.0, -7.1, 1.2, Math.PI, 'RoomTwoTorchLeft');
          add(2.8, 1.0, -7.1, 1.2, Math.PI, 'RoomTwoTorchRight');
        }
        if (rule.key === 'crest') add(0, 2.45, -12.7, 1.28, Math.PI, 'RoomTwoCommandCrest');
      } catch (error) {
        console.error(`Room two asset ${rule.key} failed to load`, error);
      }
    }
  })();

  root.userData.ready = ready;
  root.userData.dispose = () => {
    active = false;
    warm.dispose?.();
    cold.dispose?.();
  };
  return root;
}
