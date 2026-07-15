import React, { useEffect, useRef } from 'react';
import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';
import { type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const KEEPER_KEYS = new Set(['mira', 'orin', 'tala', 'brom']);

type AssetRule = { key: string; pack: KayKitPackName; include: RegExp; exclude?: RegExp };

const VILLAGE_ASSETS: AssetRule[] = [
  { key: 'gate', pack: 'dungeon', include: /(wall_arched|archway|gate)/i },
  { key: 'pillar', pack: 'dungeon', include: /pillar.*decorated|decorated.*pillar|pillar/i },
  { key: 'torch', pack: 'dungeon', include: /torch.*lit|lit.*torch|torch/i },
  { key: 'banner', pack: 'dungeon', include: /banner.*shield|shield.*banner|banner/i },
  { key: 'bench', pack: 'furniture', include: /bench/i },
  { key: 'crate', pack: 'resources', include: /crate/i },
  { key: 'barrel', pack: 'resources', include: /barrel/i },
  { key: 'rock', pack: 'forest', include: /rock|stone/i },
  { key: 'mira', pack: 'adventurers', include: /Characters\/gltf\/Ranger\.glb$/i },
  { key: 'orin', pack: 'adventurers', include: /Characters\/gltf\/Mage\.glb$/i },
  { key: 'tala', pack: 'adventurers', include: /Characters\/gltf\/Rogue_Hooded\.glb$/i },
  { key: 'brom', pack: 'adventurers', include: /Characters\/gltf\/Knight\.glb$/i },
];

function buildMarketStall(THREE: any, roofColor: number) {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3c24, roughness: 0.92 });
  const cloth = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.82 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.34, 0.74), wood);
  counter.position.y = 0.38;
  root.add(counter);
  for (const x of [-0.76, 0.76]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.65, 0.1), wood);
    post.position.set(x, 1.08, 0);
    root.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 1.08), cloth);
  roof.position.y = 1.9;
  roof.rotation.z = 0.035;
  root.add(roof);
  return root;
}

function prepareModel(object: any) {
  object.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => {
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
      material.needsUpdate = true;
    });
  });
}

async function loadVillageAssets(THREE: any, GLTFLoader: any, scene: any, keepers: any[], isDisposed: () => boolean) {
  const manifest = await loadKayKitManifest();
  const loader = new GLTFLoader();
  const villageRoot = new THREE.Group();
  villageRoot.name = 'ModernKayKitVillageSquare';
  villageRoot.userData.skinnedKeepersUseOriginalScenes = true;
  villageRoot.userData.clearPlayerSilhouette = true;
  scene.add(villageRoot);

  const addLoaded = (
    prototype: any,
    x: number,
    y: number,
    z: number,
    scale: number,
    rotation = 0,
    name = '',
    clonePrototype = true,
  ) => {
    // Object3D.clone(true) does not safely rebind a SkinnedMesh skeleton. Every
    // keeper is loaded from its own GLB and therefore uses that original scene.
    const object = clonePrototype ? prototype.clone(true) : prototype;
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    object.scale.setScalar(scale);
    object.name = name;
    prepareModel(object);
    villageRoot.add(object);
    return object;
  };

  const placements: Record<string, Array<[number, number, number, number, number, string]>> = {
    gate: [[0, -0.35, -10.15, 1.62, Math.PI, 'VillageGate']],
    pillar: [[-4.05, -0.08, -7.45, 1.24, 0, 'VillagePillarLeft'], [4.05, -0.08, -7.45, 1.24, 0, 'VillagePillarRight']],
    banner: [[-4.18, 2.15, -8.15, 0.96, Math.PI, 'VillageBannerLeft'], [4.18, 2.15, -8.15, 0.96, Math.PI, 'VillageBannerRight']],
    torch: [[-3.05, 0.82, -6.2, 1.08, Math.PI, 'VillageTorchLeft'], [3.05, 0.82, -6.2, 1.08, Math.PI, 'VillageTorchRight']],
    bench: [[-4.0, 0, -3.1, 0.88, 1.2, 'VillageBenchLeft'], [4.0, 0, -3.1, 0.88, -1.2, 'VillageBenchRight']],
    crate: [[-4.45, 0, -1.55, 0.76, -0.16, 'VillageCrateLeft'], [4.45, 0, -1.55, 0.76, 0.16, 'VillageCrateRight']],
    barrel: [[-4.62, 0, -2.05, 0.76, 0.12, 'VillageBarrelLeft'], [4.62, 0, -2.05, 0.76, -0.12, 'VillageBarrelRight']],
    rock: [[-4.45, 0, -4.7, 0.82, -0.32, 'VillageRockLeft'], [4.45, 0, -4.7, 0.82, 0.32, 'VillageRockRight']],
    mira: [[-4.05, 0, -2.05, 0.48, 0.28, 'MiraQuestKeeper']],
    orin: [[4.05, 0, -2.05, 0.48, -0.28, 'OrinPostKeeper']],
    tala: [[-4.28, 0, -4.65, 0.46, 0.18, 'TalaScoutKeeper']],
    brom: [[4.28, 0, -4.65, 0.46, -0.18, 'BromGuildKeeper']],
  };

  const results = await Promise.allSettled(VILLAGE_ASSETS.map(async (rule, index) => {
    const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
    if (!relative) throw new Error(`Missing required village asset: ${rule.key}`);
    const gltf = await loader.loadAsync(modelUrl(manifest, relative));
    if (isDisposed()) return;
    const isKeeper = KEEPER_KEYS.has(rule.key);
    const created = (placements[rule.key] ?? []).map((args, placementIndex) => addLoaded(
      gltf.scene,
      ...args,
      !(isKeeper && placementIndex === 0),
    ));
    if (isKeeper) {
      created.forEach(object => {
        object.userData.villagePhase = index * 0.91;
        keepers.push(object);
      });
    }
  }));
  results.forEach(result => {
    if (result.status === 'rejected') console.error('Village asset failed to load', result.reason);
  });
}

export function ModernVillageSquareScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let villagePlayerRig: KayKitPlayerRig | null = null;
    const keepers: any[] = [];
    let lastFrame = 0;
    let lastRigFrame = 0;
    let removeResize = () => {};

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x29252b);
      scene.fog = new THREE.Fog(0x29252b, 16, 34);
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.46 : 1.32;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
      camera.position.set(0, 5.35, 13.2);
      camera.lookAt(0, 1.02, -2.85);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 27), new THREE.MeshStandardMaterial({ color: 0x4a3c32, roughness: 0.96 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.03, -4.8);
      scene.add(floor);
      const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x806a50, roughness: 0.9 });
      for (let index = 0; index < 9; index++) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(3.8 + (index % 2) * 0.22, 0.07, 1.38), pathMaterial);
        slab.position.set(index % 2 ? 0.1 : -0.08, 0.008, 4.4 - index * 1.38);
        slab.rotation.y = (index % 3 - 1) * 0.026;
        scene.add(slab);
      }
      const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 5.1, 0.18, IS_MOBILE ? 36 : 56), new THREE.MeshStandardMaterial({ color: 0x685447, roughness: 0.92 }));
      plaza.position.set(0, 0.035, -3.2);
      plaza.scale.z = 0.78;
      scene.add(plaza);
      const centralMark = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.5, IS_MOBILE ? 40 : 64), new THREE.MeshBasicMaterial({ color: 0xe6bf76, transparent: true, opacity: 0.46, side: THREE.DoubleSide, depthWrite: false }));
      centralMark.rotation.x = -Math.PI / 2;
      centralMark.position.set(0, 0.14, -3.2);
      centralMark.scale.z = 0.78;
      scene.add(centralMark);

      [
        { x: -4.15, z: -1.7, rot: 0.2, color: 0x8a5632 },
        { x: 4.15, z: -1.7, rot: -0.2, color: 0x3e7180 },
        { x: -4.2, z: -4.45, rot: 0.14, color: 0x4f7755 },
        { x: 4.2, z: -4.45, rot: -0.14, color: 0x754b68 },
      ].forEach(entry => {
        const stall = buildMarketStall(THREE, entry.color);
        stall.position.set(entry.x, 0, entry.z);
        stall.rotation.y = entry.rot;
        scene.add(stall);
      });

      scene.add(new THREE.HemisphereLight(0xffe5c6, 0x2a3040, 1.48));
      scene.add(new THREE.AmbientLight(0xffead4, 0.58));
      const key = new THREE.DirectionalLight(0xffc77e, 2.45);
      key.position.set(-4.5, 10, 7);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x9ab2ef, 0.92);
      fill.position.set(5.5, 8, 0);
      scene.add(fill);
      const plazaLight = new THREE.PointLight(0xffb45f, IS_MOBILE ? 1.35 : 1.8, 10, 2);
      plazaLight.position.set(0, 1.8, -4.25);
      scene.add(plazaLight);
      const playerKey = new THREE.PointLight(0xffd39a, IS_MOBILE ? 3.0 : 3.6, 7.5, 2);
      playerKey.position.set(-0.85, 2.75, -0.45);
      scene.add(playerKey);
      const playerRim = new THREE.PointLight(0x8fa9ff, IS_MOBILE ? 1.05 : 1.35, 6.5, 2);
      playerRim.position.set(2.5, 2.1, -2.6);
      scene.add(playerRim);

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 41 : 36;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      window.addEventListener('resize', resize);
      window.visualViewport?.addEventListener('resize', resize);
      removeResize = () => {
        observer.disconnect();
        window.removeEventListener('resize', resize);
        window.visualViewport?.removeEventListener('resize', resize);
      };

      const loop = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        if (IS_MOBILE && now - lastFrame < 33) return;
        const delta = lastRigFrame ? Math.min(0.05, (now - lastRigFrame) / 1000) : (IS_MOBILE ? 1 / 30 : 1 / 60);
        lastFrame = now;
        lastRigFrame = now;
        plazaLight.intensity = (IS_MOBILE ? 1.25 : 1.65) + Math.sin(now * 0.0022) * 0.12;
        playerKey.intensity = (IS_MOBILE ? 2.85 : 3.45) + Math.sin(now * 0.0017) * 0.12;
        centralMark.material.opacity = 0.4 + Math.sin(now * 0.0018) * 0.06;
        keepers.forEach(keeper => { keeper.position.y = Math.sin(now * 0.0014 + keeper.userData.villagePhase) * 0.016; });
        villagePlayerRig?.update(delta);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      void loadVillageAssets(THREE, GLTFLoader, scene, keepers, () => disposed).catch(error => {
        console.error('Modern village KayKit assets failed to load', error);
      });
      void loadKayKitVillageArcher(THREE, GLTFLoader).then(rig => {
        if (disposed) {
          rig.stop();
          return;
        }
        villagePlayerRig = rig;
        scene.add(rig.root);
      }).catch(error => {
        console.error('Equipped village player failed to load', error);
      });
    };

    boot().catch(error => console.error('Modern village square failed to initialize', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeResize();
      villagePlayerRig?.stop();
      scene?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
        else node.material?.dispose?.();
      });
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} data-testid="modern-village-square-scene" className="pointer-events-none absolute inset-0" />;
}
