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

async function loadVillageAssets(THREE: any, GLTFLoader: any, scene: any) {
  const manifest = await loadKayKitManifest();
  const loader = new GLTFLoader();
  const loaded = await Promise.all(VILLAGE_ASSETS.map(async rule => {
    const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
    if (!relative) throw new Error(`Missing required village asset: ${rule.key}`);
    const gltf = await loader.loadAsync(modelUrl(manifest, relative));
    return [rule.key, gltf.scene] as const;
  }));
  const models = Object.fromEntries(loaded) as Record<string, any>;
  const root = new THREE.Group();
  root.name = 'ModernKayKitVillageSquare';

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
    root.add(object);
  };

  add(models.gate, 0, -0.35, -10.4, 1.75, Math.PI, 'VillageGate');
  add(models.shrine, 0, 0.02, -5.9, 1.05, 0, 'VillageSquareShrine');
  for (const side of [-1, 1]) {
    add(models.pillar, side * 3.7, -0.08, -8.0, 1.25, 0, `VillagePillar${side}`);
    add(models.banner, side * 3.9, 2.25, -9.1, 1.0, Math.PI, `VillageBanner${side}`);
    add(models.torch, side * 2.65, 0.84, -6.7, 1.15, Math.PI, `VillageTorch${side}`);
    add(models.bench, side * 3.35, 0, -3.4, 0.95, side > 0 ? -1.2 : 1.2, `VillageBench${side}`);
    add(models.crate, side * 4.15, 0, -1.55, 0.84, side * 0.16, `VillageCrate${side}`);
    add(models.barrel, side * 4.45, 0, -2.1, 0.82, side * -0.12, `VillageBarrel${side}`);
    add(models.rock, side * 4.35, 0, -5.2, 0.9, side * 0.32, `VillageRock${side}`);
  }
  add(models.table, -3.15, 0, -1.25, 0.9, 0.14, 'QuestTable');
  add(models.table, 3.15, 0, -1.25, 0.9, -0.14, 'PostTable');
  scene.add(root);
  return root;
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
    let lastFrame = 0;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111318);
      scene.fog = new THREE.Fog(0x111318, 15, 35);

      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.16 : 1.08;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
      camera.position.set(0, 5.3, 13.2);
      camera.lookAt(0, 1.3, -5.2);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(17, 31),
        new THREE.MeshStandardMaterial({ color: 0x282622, roughness: 0.98 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.03, -6.0);
      scene.add(floor);

      const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4b3d, roughness: 0.92 });
      for (let index = 0; index < 10; index++) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(3.5 + (index % 2) * 0.22, 0.055, 1.42), pathMaterial);
        slab.position.set(index % 2 ? 0.1 : -0.08, 0.008, 5.0 - index * 1.42);
        slab.rotation.y = (index % 3 - 1) * 0.026;
        scene.add(slab);
      }

      const plaza = new THREE.Mesh(
        new THREE.CylinderGeometry(4.75, 5.0, 0.16, IS_MOBILE ? 36 : 56),
        new THREE.MeshStandardMaterial({ color: 0x413831, roughness: 0.94 }),
      );
      plaza.position.set(0, 0.035, -4.4);
      plaza.scale.z = 0.78;
      scene.add(plaza);

      const centralMark = new THREE.Mesh(
        new THREE.RingGeometry(2.55, 2.68, IS_MOBILE ? 40 : 64),
        new THREE.MeshBasicMaterial({ color: 0xc59b54, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
      );
      centralMark.rotation.x = -Math.PI / 2;
      centralMark.position.set(0, 0.13, -4.4);
      centralMark.scale.z = 0.78;
      scene.add(centralMark);

      const stalls = [
        { x: -3.85, z: -2.0, rot: 0.18, color: 0x7b4d2e },
        { x: 3.85, z: -2.0, rot: -0.18, color: 0x315e6b },
        { x: -3.85, z: -4.8, rot: 0.1, color: 0x3f6547 },
        { x: 3.85, z: -4.8, rot: -0.1, color: 0x694158 },
      ];
      stalls.forEach(entry => {
        const stall = buildMarketStall(THREE, entry.color);
        stall.position.set(entry.x, 0, entry.z);
        stall.rotation.y = entry.rot;
        scene.add(stall);
      });

      scene.add(new THREE.HemisphereLight(0xf2ddbd, 0x10131a, 1.0));
      scene.add(new THREE.AmbientLight(0xd8cbb8, 0.38));
      const key = new THREE.DirectionalLight(0xffc77e, 1.8);
      key.position.set(-4.5, 10, 7);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x8092d4, 0.5);
      fill.position.set(5.5, 8, 0);
      scene.add(fill);
      const shrineLight = new THREE.PointLight(0xffb45f, IS_MOBILE ? 1.5 : 2.2, 10, 2);
      shrineLight.position.set(0, 2.0, -5.7);
      scene.add(shrineLight);

      await loadVillageAssets(THREE, GLTFLoader, scene);
      if (disposed) return;

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 40 : 36;
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
        shrineLight.intensity = (IS_MOBILE ? 1.35 : 1.95) + Math.sin(now * 0.0022) * 0.18;
        centralMark.material.opacity = 0.25 + Math.sin(now * 0.0018) * 0.07;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      (host as any).__villageCleanup = () => window.removeEventListener('resize', resize);
    };

    boot().catch(error => console.error('Modern village square failed to load', error));
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
