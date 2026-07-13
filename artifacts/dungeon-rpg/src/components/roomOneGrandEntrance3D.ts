import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type AssetRule = { key: string; pack: KayKitPackName; include: RegExp; exclude?: RegExp };

const ENTRANCE_ASSETS: AssetRule[] = [
  { key: 'arch', pack: 'dungeon', include: /(wall_arched|archway|gate)/i },
  { key: 'pillar', pack: 'dungeon', include: /pillar.*decorated|decorated.*pillar|pillar/i },
  { key: 'banner', pack: 'dungeon', include: /banner.*shield|shield.*banner|banner/i },
  { key: 'torch', pack: 'dungeon', include: /torch.*lit|lit.*torch|torch/i },
  { key: 'shrine', pack: 'halloween', include: /shrine.*candle|candle.*shrine|altar/i },
];

export function buildRoomOneGrandEntrance(THREE: any) {
  const root = new THREE.Group();
  root.name = 'RoomOneGrandEntrance';

  const dais = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 4.25, 0.34, IS_MOBILE ? 28 : 44),
    new THREE.MeshStandardMaterial({ color: 0x3b332e, roughness: 0.92, metalness: 0.03 }),
  );
  dais.position.set(0, 0.12, -5.7);
  dais.scale.z = 0.72;
  root.add(dais);

  const inlay = new THREE.Mesh(
    new THREE.RingGeometry(2.25, 2.42, IS_MOBILE ? 34 : 54),
    new THREE.MeshBasicMaterial({ color: 0xd9a257, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }),
  );
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.set(0, 0.31, -5.7);
  inlay.scale.z = 0.72;
  root.add(inlay);

  const warm = new THREE.PointLight(0xffb867, IS_MOBILE ? 1.7 : 3.2, 14, 2);
  warm.position.set(0, 4.1, -5.7);
  root.add(warm);

  const rim = new THREE.DirectionalLight(0x8ca6d8, IS_MOBILE ? 0.42 : 0.7);
  rim.position.set(5.5, 8.5, 4.5);
  root.add(rim);

  const ready = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const loader = new GLTFLoader();
    const loaded = await Promise.all(ENTRANCE_ASSETS.map(async rule => {
      const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
      if (!relative) throw new Error(`Missing room-one entrance asset: ${rule.key}`);
      const gltf = await loader.loadAsync(modelUrl(manifest, relative));
      return [rule.key, gltf.scene] as const;
    }));
    const models = Object.fromEntries(loaded) as Record<string, any>;

    const add = (prototype: any, x: number, y: number, z: number, scale: number, rotation = 0, name = '') => {
      const object = prototype.clone(true);
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

    add(models.arch, 0, -0.3, -13.65, 1.62, Math.PI, 'RoomOneNorthGate');
    add(models.shrine, 0, 0.08, -5.65, 1.18, 0, 'RoomOneOathShrine');
    for (const side of [-1, 1]) {
      add(models.pillar, side * 4.25, -0.08, -8.2, 1.34, 0, `RoomOneGrandPillar${side}`);
      add(models.banner, side * 5.15, 2.35, -12.25, 1.06, Math.PI, `RoomOneBanner${side}`);
      add(models.torch, side * 2.8, 1.0, -7.0, 1.22, Math.PI, `RoomOneTorch${side}`);
    }
  })();

  root.userData.ready = ready;
  root.userData.dispose = () => {
    warm.dispose?.();
    rim.dispose?.();
  };
  return root;
}
