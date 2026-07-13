import React, { useEffect, useRef } from 'react';
import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type AssetRule = { key: string; pack: KayKitPackName; include: RegExp; exclude?: RegExp };

const VILLAGE_ASSETS: AssetRule[] = [
  { key: 'gate', pack: 'dungeon', include: /(wall_arched|archway|gate)/i },
  { key: 'pillar', pack: 'dungeon', include: /pillar.*decorated|decorated.*pillar|pillar/i },
  { key: 'torch', pack: 'dungeon', include: /torch.*lit|lit.*torch|torch/i },
  { key: 'banner', pack: 'dungeon', include: /banner.*shield|shield.*banner|banner/i },
  { key: 'shrine', pack: 'halloween', include: /shrine.*candle|candle.*shrine|altar/i },
  { key: 'bench', pack: 'furniture', include: /bench/i },
  { key: 'table', pack: 'furniture', include: /table/i },
  { key: 'crate', pack: 'resources', include: /crate/i },
  { key: 'barrel', pack: 'resources', include: /barrel/i },
  { key: 'rock', pack: 'forest', include: /rock|stone/i },
  { key: 'mira', pack: 'adventurers', include: /Characters\/gltf\/Ranger\.glb$/i },
  { key: 'orin', pack: 'adventurers', include: /Characters\/gltf\/Mage\.glb$/i },
  { key: 'tala', pack: 'adventurers', include: /Characters\/gltf\/Rogue_Hooded\.glb$/i },
  { key: 'brom', pack: 'adventurers', include: /Characters\/gltf\/Knight\.glb$/i },
  { key: 'aelric', pack: 'adventurers', include: /Characters\/gltf\/Barbarian\.glb$/i },
];

function buildMarketStall(THREE: any, roofColor: number) {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.94 });
  const cloth = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.86 });
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

async function loadVillageAssetsProgressively(THREE: any, GLTFLoader: any, scene: any, keepers: any[]) {
  const manifest = await loadKayKitManifest();
  const loader = new GLTFLoader();
  const villageRoot = new THREE.Group();
  villageRoot.name = 'ModernKayKitVillageSquare';
  scene.add(villageRoot);

  const add = (prototype: any, x: number, y: number, z: number, scale: number, rotation = 0, name = '') => {
    const object = prototype.clone(true);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    object.scale.setScalar(scale);
    object.name = name;
    object.traverse((node: any) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      node.castShadow = false;
      node.receiveShadow = false;
      node.frustumCulled = false;
    });
    villageRoot.add(object);
    return object;
  };

  const placements: Record<string, Array<[number, number, number, number, number, string]>> = {
    gate: [[0, -0.35, -9.2, 1.75, Math.PI, 'VillageGate']],
    shrine: [[0, 0.02, -4.9, 1.05, 0, 'VillageSquareShrine']],
    pillar: [[-3.45, -0.08, -7.0, 1.25, 0, 'VillagePillarLeft'], [3.45, -0.08, -7.0, 1.25, 0, 'VillagePillarRight']],
    banner: [[-3.65, 2.25, -8.1, 1.0, Math.PI, 'VillageBannerLeft'], [3.65, 2.25, -8.1, 1.0, Math.PI, 'VillageBannerRight']],
    torch: [[-2.55, 0.84, -5.9, 1.15, Math.PI, 'VillageTorchLeft'], [2.55, 0.84, -5.9, 1.15, Math.PI, 'VillageTorchRight']],
    bench: [[-3.2, 0, -2.8, 0.95, 1.2, 'VillageBenchLeft'], [3.2, 0, -2.8, 0.95, -1.2, 'VillageBenchRight']],
    crate: [[-4.0, 0, -1.2, 0.84, -0.16, 'VillageCrateLeft'], [4.0, 0, -1.2, 0.84, 0.16, 'VillageCrateRight']],
    barrel: [[-4.3, 0, -1.8, 0.82, 0.12, 'VillageBarrelLeft'], [4.3, 0, -1.8, 0.82, -0.12, 'VillageBarrelRight']],
    rock: [[-4.15, 0, -4.6, 0.9, -0.32, 'VillageRockLeft'], [4.15, 0, -4.6, 0.9, 0.32, 'VillageRockRight']],
    table: [[-3.0, 0, -0.95, 0.9, 0.14, 'QuestTable'], [3.0, 0, -0.95, 0.9, -0.14, 'PostTable']],
    mira: [[-2.55, 0, -1.35, 0.98, 0.18, 'MiraQuestKeeper']],
    orin: [[2.55, 0, -1.35, 0.98, -0.18, 'OrinPostKeeper']],
    tala: [[-2.65, 0, -3.65, 0.98, 0.1, 'TalaScoutKeeper']],
    brom: [[2.65, 0, -3.65, 0.98, -0.1, 'BromGuildKeeper']],
    aelric: [[0, 0.08, -4.35, 1.05, 0, 'AelricWorldKeeper']],
  };

  for (const rule of VILLAGE_ASSETS) {
    try {
      const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
      if (!relative) throw new Error(`No manifest match for ${rule.key}`);
      const gltf = await loader.loadAsync(modelUrl(manifest, relative));
      for (const [x, y, z, scale, rotation, name] of placements[rule.key] ?? []) {
        const object = add(gltf.scene, x, y, z, scale, rotation, name);
        if (rule.key === 'mira' || rule.key === 'orin' || rule.key === 'tala' || rule.key === 'brom' || rule.key === 'aelric') {
          object.userData.villagePhase = keepers.length * 1.17;
          keepers.push(object);
        }
      }
    } catch (error) {
      console.error(`Village asset ${rule.key} failed to load`, error);
    }
  }
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
    const keepers: any[] = [];
    let lastFrame = 0;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1b1a1d);
      scene.fog = new THREE.Fog(0x1b1a1d, 14, 31);
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.32 : 1.18;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
      camera.position.set(0, 4.45, 10.2);
      camera.lookAt(0, 1.15, -4.2);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 28), new THREE.MeshStandardMaterial({ color: 0x342f2a, roughness: 0.98 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.03, -5.1);
      scene.add(floor);
      const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x725c46, roughness: 0.92 });
      for (let index = 0; index < 9; index++) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(3.7 + (index % 2) * 0.24, 0.055, 1.36), pathMaterial);
        slab.position.set(index % 2 ? 0.1 : -0.08, 0.008, 4.4 - index * 1.35);
        slab.rotation.y = (index % 3 - 1) * 0.026;
        scene.add(slab);
      }
      const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4.75, 5.0, 0.16, IS_MOBILE ? 36 : 56), new THREE.MeshStandardMaterial({ color: 0x55483d, roughness: 0.94 }));
      plaza.position.set(0, 0.035, -3.85);
      plaza.scale.z = 0.78;
      scene.add(plaza);
      const centralMark = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.68, IS_MOBILE ? 40 : 64), new THREE.MeshBasicMaterial({ color: 0xd3ad66, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }));
      centralMark.rotation.x = -Math.PI / 2;
      centralMark.position.set(0, 0.13, -3.85);
      centralMark.scale.z = 0.78;
      scene.add(centralMark);

      [
        { x: -3.7, z: -1.6, rot: 0.18, color: 0x7b4d2e },
        { x: 3.7, z: -1.6, rot: -0.18, color: 0x315e6b },
        { x: -3.7, z: -4.3, rot: 0.1, color: 0x3f6547 },
        { x: 3.7, z: -4.3, rot: -0.1, color: 0x694158 },
      ].forEach(entry => {
        const stall = buildMarketStall(THREE, entry.color);
        stall.position.set(entry.x, 0, entry.z);
        stall.rotation.y = entry.rot;
        scene.add(stall);
      });

      scene.add(new THREE.HemisphereLight(0xffe8c5, 0x171923, 1.32));
      scene.add(new THREE.AmbientLight(0xe1d3bf, 0.52));
      const key = new THREE.DirectionalLight(0xffc77e, 2.05);
      key.position.set(-4.5, 10, 7);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x8ea1e3, 0.68);
      fill.position.set(5.5, 8, 0);
      scene.add(fill);
      const shrineLight = new THREE.PointLight(0xffb45f, IS_MOBILE ? 1.7 : 2.35, 10, 2);
      shrineLight.position.set(0, 2.0, -4.9);
      scene.add(shrineLight);

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 42 : 37;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      const loop = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        if (IS_MOBILE && now - lastFrame < 33) return;
        lastFrame = now;
        shrineLight.intensity = (IS_MOBILE ? 1.55 : 2.1) + Math.sin(now * 0.0022) * 0.18;
        centralMark.material.opacity = 0.31 + Math.sin(now * 0.0018) * 0.07;
        keepers.forEach(keeper => { keeper.position.y = Math.sin(now * 0.0014 + keeper.userData.villagePhase) * 0.022; });
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      (host as any).__villageCleanup = () => window.removeEventListener('resize', resize);

      void loadVillageAssetsProgressively(THREE, GLTFLoader, scene, keepers);
    };

    boot().catch(error => console.error('Modern village square failed to initialize', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (host as any).__villageCleanup?.();
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
