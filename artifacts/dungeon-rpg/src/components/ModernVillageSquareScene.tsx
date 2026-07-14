import React, { useEffect, useRef } from 'react';
import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';
import { type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';

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
  scene.add(villageRoot);

  const addLoaded = (prototype: any, x: number, y: number, z: number, scale: number, rotation = 0, name = '') => {
    const object = prototype.clone(true);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    object.scale.setScalar(scale);
    object.name = name;
    prepareModel(object);
    villageRoot.add(object);
    return object;
  };

  const placements: Record<string, Array<[number, number, number, number, number, string]>> = {
    gate: [[0, -0.35, -9.2, 1.85, Math.PI, 'VillageGate']],
    shrine: [[0, 0.02, -6.1, 1.15, 0, 'VillageSquareShrine']],
    pillar: [[-3.55, -0.08, -7.0, 1.35, 0, 'VillagePillarLeft'], [3.55, -0.08, -7.0, 1.35, 0, 'VillagePillarRight']],
    banner: [[-3.75, 2.25, -8.0, 1.05, Math.PI, 'VillageBannerLeft'], [3.75, 2.25, -8.0, 1.05, Math.PI, 'VillageBannerRight']],
    torch: [[-2.5, 0.84, -5.8, 1.2, Math.PI, 'VillageTorchLeft'], [2.5, 0.84, -5.8, 1.2, Math.PI, 'VillageTorchRight']],
    bench: [[-3.25, 0, -2.8, 1.0, 1.2, 'VillageBenchLeft'], [3.25, 0, -2.8, 1.0, -1.2, 'VillageBenchRight']],
    crate: [[-4.0, 0, -1.2, 0.9, -0.16, 'VillageCrateLeft'], [4.0, 0, -1.2, 0.9, 0.16, 'VillageCrateRight']],
    barrel: [[-4.25, 0, -1.85, 0.88, 0.12, 'VillageBarrelLeft'], [4.25, 0, -1.85, 0.88, -0.12, 'VillageBarrelRight']],
    rock: [[-4.15, 0, -4.4, 0.95, -0.32, 'VillageRockLeft'], [4.15, 0, -4.4, 0.95, 0.32, 'VillageRockRight']],
    table: [[-3.0, 0, -0.7, 0.95, 0.14, 'QuestTable'], [3.0, 0, -0.7, 0.95, -0.14, 'PostTable']],
    mira: [[-3.1, 0, -1.5, 0.56, 0.18, 'MiraQuestKeeper']],
    orin: [[3.1, 0, -1.5, 0.56, -0.18, 'OrinPostKeeper']],
    tala: [[-3.2, 0, -4.0, 0.54, 0.1, 'TalaScoutKeeper']],
    brom: [[3.2, 0, -4.0, 0.54, -0.1, 'BromGuildKeeper']],
  };

  const results = await Promise.allSettled(VILLAGE_ASSETS.map(async (rule, index) => {
    const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
    if (!relative) throw new Error(`Missing required village asset: ${rule.key}`);
    const gltf = await loader.loadAsync(modelUrl(manifest, relative));
    if (isDisposed()) return;
    const created = (placements[rule.key] ?? []).map(args => addLoaded(gltf.scene, ...args));
    if (['mira', 'orin', 'tala', 'brom'].includes(rule.key)) {
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
      scene.background = new THREE.Color(0x242127);
      scene.fog = new THREE.Fog(0x242127, 14, 31);
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.36 : 1.22;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
      camera.position.set(0, 6.25, 14.6);
      camera.lookAt(0, 0.85, -3.65);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 27), new THREE.MeshStandardMaterial({ color: 0x40362e, roughness: 0.96 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.03, -4.8);
      scene.add(floor);
      const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x76604a, roughness: 0.9 });
      for (let index = 0; index < 9; index++) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(3.8 + (index % 2) * 0.22, 0.07, 1.38), pathMaterial);
        slab.position.set(index % 2 ? 0.1 : -0.08, 0.008, 4.4 - index * 1.38);
        slab.rotation.y = (index % 3 - 1) * 0.026;
        scene.add(slab);
      }
      const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 5.1, 0.18, IS_MOBILE ? 36 : 56), new THREE.MeshStandardMaterial({ color: 0x5a493c, roughness: 0.92 }));
      plaza.position.set(0, 0.035, -3.7);
      plaza.scale.z = 0.78;
      scene.add(plaza);
      const centralMark = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.5, IS_MOBILE ? 40 : 64), new THREE.MeshBasicMaterial({ color: 0xdab56f, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
      centralMark.rotation.x = -Math.PI / 2;
      centralMark.position.set(0, 0.14, -3.7);
      centralMark.scale.z = 0.78;
      scene.add(centralMark);

      [
        { x: -3.7, z: -1.5, rot: 0.18, color: 0x8a5632 },
        { x: 3.7, z: -1.5, rot: -0.18, color: 0x3e7180 },
        { x: -3.7, z: -4.2, rot: 0.1, color: 0x4f7755 },
        { x: 3.7, z: -4.2, rot: -0.1, color: 0x754b68 },
      ].forEach(entry => {
        const stall = buildMarketStall(THREE, entry.color);
        stall.position.set(entry.x, 0, entry.z);
        stall.rotation.y = entry.rot;
        scene.add(stall);
      });

      scene.add(new THREE.HemisphereLight(0xffe2bd, 0x252936, 1.35));
      scene.add(new THREE.AmbientLight(0xffead0, 0.52));
      const key = new THREE.DirectionalLight(0xffc77e, 2.15);
      key.position.set(-4.5, 10, 7);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x92a6e5, 0.72);
      fill.position.set(5.5, 8, 0);
      scene.add(fill);
      const shrineLight = new THREE.PointLight(0xffb45f, IS_MOBILE ? 1.85 : 2.45, 11, 2);
      shrineLight.position.set(0, 2.0, -4.8);
      scene.add(shrineLight);

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 44 : 38;
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
        shrineLight.intensity = (IS_MOBILE ? 1.7 : 2.25) + Math.sin(now * 0.0022) * 0.18;
        centralMark.material.opacity = 0.34 + Math.sin(now * 0.0018) * 0.08;
        keepers.forEach(keeper => { keeper.position.y = Math.sin(now * 0.0014 + keeper.userData.villagePhase) * 0.022; });
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
        rig.root.position.set(0, -0.02, -2.85);
        rig.root.rotation.y = 0.08;
        rig.root.scale.setScalar(0.52);
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
