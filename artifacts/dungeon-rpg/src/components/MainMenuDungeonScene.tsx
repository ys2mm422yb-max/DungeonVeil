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
  { key: 'banner', pack: 'dungeon', include: /banner/i },
  { key: 'shrine', pack: 'halloween', include: /shrine.*candle|candle.*shrine|altar/i },
  { key: 'bench', pack: 'furniture', include: /bench/i },
  { key: 'table', pack: 'furniture', include: /table/i },
  { key: 'crate', pack: 'resources', include: /crate/i },
  { key: 'barrel', pack: 'resources', include: /barrel/i },
  { key: 'tree', pack: 'forest', include: /tree/i, exclude: /stump|log/i },
  { key: 'rock', pack: 'forest', include: /rock|stone/i },
  { key: 'knight', pack: 'adventurers', include: /Characters\/gltf\/Knight\.glb$/i },
  { key: 'mage', pack: 'adventurers', include: /Characters\/gltf\/Mage\.glb$/i },
  { key: 'ranger', pack: 'adventurers', include: /Characters\/gltf\/Ranger\.glb$/i },
  { key: 'rogue', pack: 'adventurers', include: /Characters\/gltf\/Rogue_Hooded\.glb$/i },
];

async function loadVillageAssets(GLTFLoader: any) {
  const manifest = await loadKayKitManifest();
  const loader = new GLTFLoader();
  const entries = await Promise.all(VILLAGE_ASSETS.map(async rule => {
    const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
    if (!relative) return [rule.key, null] as const;
    try {
      const gltf = await loader.loadAsync(modelUrl(manifest, relative));
      return [rule.key, gltf.scene] as const;
    } catch (error) {
      console.warn(`Village asset unavailable: ${relative}`, error);
      return [rule.key, null] as const;
    }
  }));
  return Object.fromEntries(entries) as Record<string, any>;
}

export function MainMenuDungeonScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let lastFrame = 0;
    const animated: any[] = [];

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const models = await loadVillageAssets(GLTFLoader);
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x101217);
      scene.fog = new THREE.Fog(0x101217, 14, 34);

      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 0.95 : 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.15 : 1.08;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(39, 1, 0.1, 70);
      camera.position.set(0, 5.3, 13.2);
      camera.lookAt(0, 1.2, -5.2);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(17, 30),
        new THREE.MeshStandardMaterial({ color: 0x29251f, roughness: 0.98, metalness: 0 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, -0.03, -5.5);
      ground.receiveShadow = false;
      scene.add(ground);

      const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.92, metalness: 0.015 });
      for (let row = 0; row < 8; row++) {
        const width = 3.2 + (row % 2) * 0.28;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, 1.48), stoneMaterial);
        slab.position.set(row % 2 ? 0.1 : -0.1, 0.005, 4.6 - row * 1.42);
        slab.rotation.y = (row % 3 - 1) * 0.025;
        scene.add(slab);
      }

      const plaza = new THREE.Mesh(
        new THREE.CylinderGeometry(4.6, 4.85, 0.14, IS_MOBILE ? 36 : 54),
        new THREE.MeshStandardMaterial({ color: 0x40362e, roughness: 0.94, metalness: 0.02 }),
      );
      plaza.position.set(0, 0.035, -4.4);
      plaza.scale.z = 0.78;
      scene.add(plaza);

      scene.add(new THREE.HemisphereLight(0xf1d8b7, 0x111520, 0.94));
      scene.add(new THREE.AmbientLight(0xd8cbbb, 0.32));
      const key = new THREE.DirectionalLight(0xffc47d, 1.8);
      key.position.set(-5, 10, 7);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x7790c4, 0.52);
      fill.position.set(6, 8, 0);
      scene.add(fill);
      const hearthLight = new THREE.PointLight(0xff9b50, IS_MOBILE ? 1.5 : 2.2, 8, 2);
      hearthLight.position.set(0, 2.1, -4.5);
      scene.add(hearthLight);

      const villageRoot = new THREE.Group();
      villageRoot.name = 'ModernVeilVillageSquare';
      scene.add(villageRoot);

      const add = (prototype: any, x: number, y: number, z: number, scale: number, rotation = 0, name = '') => {
        if (!prototype) return null;
        const object = prototype.clone(true);
        object.position.set(x, y, z);
        object.rotation.y = rotation;
        object.scale.setScalar(scale);
        if (name) object.name = name;
        object.traverse((node: any) => {
          if (!node.isMesh && !node.isSkinnedMesh) return;
          node.castShadow = false;
          node.receiveShadow = false;
          node.frustumCulled = true;
        });
        villageRoot.add(object);
        return object;
      };

      add(models.gate, 0, -0.28, -10.4, 1.75, Math.PI, 'VillageNorthGate');
      for (const side of [-1, 1]) {
        add(models.pillar, side * 3.8, -0.05, -8.5, 1.3, 0, `VillagePillar${side}`);
        add(models.banner, side * 4.15, 2.35, -9.4, 1.02, Math.PI, `VillageBanner${side}`);
        add(models.torch, side * 2.9, 0.9, -7.55, 1.25, Math.PI, `VillageTorch${side}`);
        add(models.bench, side * 3.4, 0, -3.2, 1.0, side > 0 ? -1.25 : 1.25, `VillageBench${side}`);
        add(models.tree, side * 5.2, 0, -5.8, 1.3, side * 0.35, `VillageTree${side}`);
        add(models.rock, side * 4.7, 0, -1.7, 0.9, side * 0.55);
      }

      add(models.shrine, 0, 0.08, -4.65, 1.2, 0, 'VillageHearthShrine');
      add(models.table, -3.9, 0, -1.4, 0.92, 0.18, 'QuestMarketTable');
      add(models.table, 3.9, 0, -1.4, 0.92, -0.18, 'PostMarketTable');
      add(models.crate, -4.45, 0, -2.2, 0.88, 0.2);
      add(models.barrel, 4.45, 0, -2.2, 0.9, -0.2);

      const characterPlacements = [
        { model: models.mage, x: -2.45, z: -2.1, rotation: 0.22, name: 'MiraQuestKeeper' },
        { model: models.knight, x: 2.45, z: -2.1, rotation: -0.22, name: 'OrinPostKeeper' },
        { model: models.ranger, x: -2.65, z: -5.55, rotation: 0.08, name: 'TalaScout' },
        { model: models.rogue, x: 2.65, z: -5.55, rotation: -0.08, name: 'BromGuildKeeper' },
        { model: models.mage, x: 0, z: -7.25, rotation: 0, name: 'AelricWorldKeeper' },
      ];
      characterPlacements.forEach((entry, index) => {
        const character = add(entry.model, entry.x, 0, entry.z, index === 4 ? 1.0 : 0.92, entry.rotation, entry.name);
        if (character) {
          character.userData.baseY = character.position.y;
          character.userData.phase = index * 1.18;
          animated.push(character);
        }
      });

      const resize = () => {
        const viewport = window.visualViewport;
        const width = Math.max(1, Math.round(viewport?.width ?? host.clientWidth ?? window.innerWidth));
        const height = Math.max(1, Math.round(viewport?.height ?? host.clientHeight ?? window.innerHeight));
        renderer.setSize(width, height, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = width / height;
        camera.fov = camera.aspect < 0.72 ? 41 : 37;
        camera.position.y = camera.aspect < 0.72 ? 5.5 : 5.0;
        camera.position.z = camera.aspect < 0.72 ? 13.8 : 12.8;
        camera.lookAt(0, 1.2, -5.1);
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);
      window.visualViewport?.addEventListener('resize', resize);

      const clock = new THREE.Clock();
      const loop = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        if (IS_MOBILE && now - lastFrame < 33) return;
        lastFrame = now;
        const delta = Math.min(clock.getDelta(), 0.05);
        animated.forEach((character, index) => {
          const phase = now * 0.00135 + character.userData.phase;
          character.position.y = character.userData.baseY + Math.sin(phase) * 0.018;
          character.rotation.z = Math.sin(phase * 0.72) * 0.006;
          character.rotation.y += Math.sin(phase * 0.42 + index) * delta * 0.006;
        });
        hearthLight.intensity = (IS_MOBILE ? 1.35 : 2.0) + Math.sin(now * 0.003) * 0.18;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      (host as any).__menuCleanup = () => {
        window.removeEventListener('resize', resize);
        window.visualViewport?.removeEventListener('resize', resize);
      };
    };

    boot().catch(error => console.error('Dungeon Veil village scene failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (host as any).__menuCleanup?.();
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

  return <div ref={hostRef} data-testid="modern-veil-village-scene" className="absolute inset-0 pointer-events-none" />;
}
