import React, { useEffect, useRef } from 'react';
import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';
import { type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const HALL_PARTICLE_COUNT = IS_MOBILE ? 14 : 26;

type AssetRule = { key: string; pack: KayKitPackName; include: RegExp; exclude?: RegExp };
const HALL_ASSETS: AssetRule[] = [
  { key: 'pillar', pack: 'dungeon', include: /pillar/i },
  { key: 'banner', pack: 'dungeon', include: /banner/i },
  { key: 'torch', pack: 'dungeon', include: /torch/i },
];

function prepareModel(object: any) {
  object.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => {
      material.depthTest = true;
      material.depthWrite = true;
      material.needsUpdate = true;
    });
  });
}

function createArchitecture(THREE: any, hallRoot: any) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x100d18, roughness: 0.96, metalness: 0.04 });
  const stoneEdge = new THREE.MeshStandardMaterial({ color: 0x2c2538, roughness: 0.82, metalness: 0.12, emissive: 0x140726, emissiveIntensity: 0.18 });
  const gold = new THREE.MeshStandardMaterial({ color: 0x6e4a21, roughness: 0.55, metalness: 0.62, emissive: 0x1b0d03, emissiveIntensity: 0.22 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 27), stone);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.04, -3.5);
  hallRoot.add(floor);

  for (let i = 0; i < 13; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(4.2 + (i % 2) * 0.18, 0.07, 1.16), stoneEdge.clone());
    slab.position.set(i % 2 ? 0.055 : -0.055, 0.015, 4.5 - i * 1.18);
    slab.rotation.y = (i % 3 - 1) * 0.015;
    hallRoot.add(slab);
  }

  const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.75, 0.22, IS_MOBILE ? 32 : 48), stoneEdge.clone());
  dais.position.set(0, 0.03, -1.82);
  dais.scale.z = 0.7;
  hallRoot.add(dais);

  const rear = new THREE.Mesh(new THREE.BoxGeometry(13.5, 7.7, 0.55), stone.clone());
  rear.position.set(0, 3.4, -10.7);
  hallRoot.add(rear);

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, 19), stone.clone());
    wall.position.set(side * 6.25, 3.0, -3.8);
    hallRoot.add(wall);

    for (let i = 0; i < 4; i++) {
      const column = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 5.7, 10), stoneEdge.clone());
      shaft.position.y = 2.65;
      column.add(shaft);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.3, 10), gold.clone());
      base.position.y = 0.12;
      column.add(base);
      const cap = base.clone();
      cap.position.y = 5.55;
      column.add(cap);
      column.position.set(side * 4.55, 0, -8.1 + i * 3.35);
      hallRoot.add(column);
    }

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x26113f, roughness: 0.78, metalness: 0.08, emissive: 0x2f0b55, emissiveIntensity: 0.45, side: THREE.DoubleSide }),
    );
    banner.position.set(side * 3.25, 3.35, -10.32);
    banner.rotation.y = side * -0.08;
    hallRoot.add(banner);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.08), gold.clone());
    trim.position.set(side * 3.25, 5.07, -10.18);
    hallRoot.add(trim);
  }

  for (let i = 0; i < 6; i++) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.7 - i * 0.1, 0.16, 8, 30, Math.PI), stoneEdge.clone());
    arch.position.set(0, 4.0 + i * 0.02, -10.25 + i * 0.16);
    arch.rotation.z = Math.PI;
    hallRoot.add(arch);
  }
}

function createVeilGate(THREE: any, hallRoot: any) {
  const root = new THREE.Group();
  root.name = 'MonumentalVeilGate';
  root.position.set(0, 2.25, -10.0);

  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(2.55, 0.34, IS_MOBILE ? 10 : 14, IS_MOBILE ? 42 : 72),
    new THREE.MeshStandardMaterial({ color: 0x21172c, roughness: 0.62, metalness: 0.28, emissive: 0x2b0c50, emissiveIntensity: 0.6 }),
  );
  frame.scale.y = 1.42;
  root.add(frame);

  const voidDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, IS_MOBILE ? 36 : 64),
    new THREE.MeshBasicMaterial({ color: 0x07020d, transparent: true, opacity: 0.98, side: THREE.DoubleSide, depthWrite: false }),
  );
  voidDisc.scale.y = 1.42;
  voidDisc.position.z = 0.06;
  root.add(voidDisc);

  const gateRings: any[] = [];
  [
    { radius: 2.35, tube: 0.085, color: 0x7c3aed, opacity: 0.9 },
    { radius: 2.08, tube: 0.05, color: 0xc4b5fd, opacity: 0.72 },
    { radius: 1.72, tube: 0.038, color: 0x9333ea, opacity: 0.62 },
  ].forEach((spec, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius, spec.tube, 8, IS_MOBILE ? 38 : 64),
      new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: spec.opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    ring.scale.y = 1.42;
    ring.position.z = 0.12 + index * 0.012;
    ring.userData.baseOpacity = spec.opacity;
    ring.userData.spinDirection = index % 2 ? -1 : 1;
    root.add(ring);
    gateRings.push(ring);
  });

  const vortexLayers: any[] = [];
  [0x26004d, 0x5b21b6, 0xa855f7].forEach((color, index) => {
    const layer = new THREE.Mesh(
      new THREE.CircleGeometry(1.95 - index * 0.25, IS_MOBILE ? 30 : 52),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 + index * 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    layer.scale.y = 1.42;
    layer.position.z = 0.09 + index * 0.02;
    root.add(layer);
    vortexLayers.push(layer);
  });

  const runeDiamonds: any[] = [];
  [[0, 3.85], [0, -3.85], [-3.05, 0], [3.05, 0]].forEach(([x, y], index) => {
    const rune = new THREE.Mesh(
      new THREE.OctahedronGeometry(index === 0 ? 0.28 : 0.16),
      new THREE.MeshBasicMaterial({ color: 0xd8b4fe, transparent: true, opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    rune.position.set(x, y, 0.2);
    rune.userData.phase = index * 1.15;
    root.add(rune);
    runeDiamonds.push(rune);
  });

  hallRoot.add(root);
  return { gateRings, vortexLayers, runeDiamonds };
}

function createAtmosphere(THREE: any, hallRoot: any) {
  const mistLayers: any[] = [];
  for (let index = 0; index < (IS_MOBILE ? 4 : 7); index++) {
    const mist = new THREE.Mesh(
      new THREE.CircleGeometry(2.8 + index * 0.45, IS_MOBILE ? 24 : 40),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0x7c3aed : 0xa78bfa, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false }),
    );
    mist.rotation.x = -Math.PI / 2;
    mist.scale.x = 1.85;
    mist.position.set((index % 2 ? 1 : -1) * (0.3 + index * 0.16), 0.1, 2.2 - index * 1.85);
    mist.userData.baseX = mist.position.x;
    mist.userData.phase = index * 0.83;
    hallRoot.add(mist);
    mistLayers.push(mist);
  }

  const positions = new Float32Array(HALL_PARTICLE_COUNT * 3);
  for (let index = 0; index < HALL_PARTICLE_COUNT; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 6.2;
    positions[index * 3 + 1] = 0.35 + Math.random() * 5.2;
    positions[index * 3 + 2] = -9.8 + Math.random() * 9.4;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: 0xd8b4fe, size: IS_MOBILE ? 0.04 : 0.052, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  particles.name = 'HallBoundedVeilParticles';
  hallRoot.add(particles);
  return { mistLayers, particleGeometry, positions };
}

async function loadDecor(THREE: any, GLTFLoader: any, hallRoot: any, isDisposed: () => boolean) {
  const manifest = await loadKayKitManifest();
  const loader = new GLTFLoader();
  await Promise.allSettled(HALL_ASSETS.map(async rule => {
    const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
    if (!relative) return;
    const gltf = await loader.loadAsync(modelUrl(manifest, relative));
    if (isDisposed()) return;
    const placements = rule.key === 'torch'
      ? [[-3.6, 1.4, -6.4], [3.6, 1.4, -6.4], [-4.1, 1.4, -2.0], [4.1, 1.4, -2.0]]
      : [];
    for (const [x, y, z] of placements) {
      const object = gltf.scene.clone(true);
      object.position.set(x, y, z);
      object.scale.setScalar(1.15);
      prepareModel(object);
      hallRoot.add(object);
    }
  }));
}

export function HallOfVeilScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let villagePlayerRig: KayKitPlayerRig | null = null;
    let lastFrame = 0;
    let lastRigFrame = 0;
    let removeResize = () => {};

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05030a);
      scene.fog = new THREE.Fog(0x05030a, 11.5, 28);
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, IS_MOBILE ? 1 : 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.52 : 1.42;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.setAttribute('data-menu-renderer', 'hall-of-the-veil');
      host.replaceChildren(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
      camera.position.set(0, 5.28, 13.35);
      camera.lookAt(0, 1.38, -3.9);

      const hallRoot = new THREE.Group();
      hallRoot.name = 'HallOfTheVeilV4';
      hallRoot.userData.sceneContract = 'hall-of-the-veil-v4';
      hallRoot.userData.marketStalls = 0;
      hallRoot.userData.decorativeNpcs = 0;
      hallRoot.userData.characterFocus = 'center';
      scene.add(hallRoot);

      createArchitecture(THREE, hallRoot);
      const veilGate = createVeilGate(THREE, hallRoot);
      const atmosphere = createAtmosphere(THREE, hallRoot);

      const floorSigil = new THREE.Mesh(
        new THREE.RingGeometry(1.95, 2.18, IS_MOBILE ? 36 : 64),
        new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      floorSigil.rotation.x = -Math.PI / 2;
      floorSigil.position.set(0, 0.16, -1.82);
      floorSigil.scale.z = 0.72;
      hallRoot.add(floorSigil);

      scene.add(new THREE.HemisphereLight(0xe9ddff, 0x07030c, 1.12));
      scene.add(new THREE.AmbientLight(0x6f5a82, 0.22));
      const playerKey = new THREE.PointLight(0xffb86b, IS_MOBILE ? 4.0 : 4.5, 7.5, 2);
      playerKey.position.set(-1.3, 2.8, 0.2);
      scene.add(playerKey);
      const playerRim = new THREE.PointLight(0xb277ff, IS_MOBILE ? 2.4 : 2.9, 8.2, 2);
      playerRim.position.set(2.25, 2.7, -3.1);
      scene.add(playerRim);
      const gateLight = new THREE.PointLight(0x8b3dff, IS_MOBILE ? 3.5 : 4.2, 14, 2);
      gateLight.position.set(0, 2.8, -8.3);
      scene.add(gateLight);
      const torchLights = [[-3.6, 2.0, -6.3], [3.6, 2.0, -6.3], [-4.1, 1.9, -2.0], [4.1, 1.9, -2.0]].map(([x, y, z], index) => {
        const light = new THREE.PointLight(0xff8a35, IS_MOBILE ? 0.9 : 1.2, 5.4, 2);
        light.position.set(x, y, z);
        light.userData.phase = index * 0.8;
        scene.add(light);
        return light;
      });

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 42 : 36;
        camera.position.z = camera.aspect < 0.72 ? 12.6 : 13.35;
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
        veilGate.gateRings.forEach((ring: any, index: number) => {
          ring.rotation.z += delta * (0.07 + index * 0.035) * ring.userData.spinDirection;
          ring.material.opacity = ring.userData.baseOpacity + Math.sin(now * 0.0015 + index) * 0.07;
        });
        veilGate.vortexLayers.forEach((layer: any, index: number) => {
          const pulse = 1 + Math.sin(now * 0.0013 + index * 1.4) * 0.045;
          layer.scale.set(pulse, 1.42 * pulse, 1);
          layer.rotation.z += delta * (index % 2 ? -0.13 : 0.1);
        });
        veilGate.runeDiamonds.forEach((rune: any) => {
          rune.material.opacity = 0.68 + Math.sin(now * 0.002 + rune.userData.phase) * 0.2;
          rune.rotation.y += delta * 0.6;
        });
        atmosphere.mistLayers.forEach((mist: any) => {
          mist.position.x = mist.userData.baseX + Math.sin(now * 0.0003 + mist.userData.phase) * 0.7;
          mist.rotation.z += delta * 0.01;
        });
        for (let index = 0; index < HALL_PARTICLE_COUNT; index++) {
          const offset = index * 3 + 1;
          atmosphere.positions[offset] += delta * (0.05 + (index % 4) * 0.012);
          if (atmosphere.positions[offset] > 5.5) atmosphere.positions[offset] = 0.3;
        }
        atmosphere.particleGeometry.attributes.position.needsUpdate = true;
        gateLight.intensity = (IS_MOBILE ? 3.4 : 4.1) + Math.sin(now * 0.0016) * 0.28;
        torchLights.forEach(light => { light.intensity = (IS_MOBILE ? 0.88 : 1.18) + Math.sin(now * 0.004 + light.userData.phase) * 0.14; });
        floorSigil.material.opacity = 0.36 + Math.sin(now * 0.0018) * 0.08;
        playerKey.intensity = (IS_MOBILE ? 3.9 : 4.4) + Math.sin(now * 0.0015) * 0.14;
        villagePlayerRig?.update(delta);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      (window as any).__DUNGEON_VEIL_MENU_HALL__ = {
        contract: 'hall-of-the-veil-v4',
        rendererCount: 1,
        marketStalls: 0,
        decorativeNpcs: 0,
        particleCount: HALL_PARTICLE_COUNT,
        characterCentered: true,
        spectatorHandoff: 'exclusive',
      };

      void loadDecor(THREE, GLTFLoader, hallRoot, () => disposed).catch(error => console.warn('Optional Hall decor failed to load', error));
      void loadKayKitVillageArcher(THREE, GLTFLoader).then(rig => {
        if (disposed) {
          rig.stop();
          return;
        }
        villagePlayerRig = rig;
        rig.root.position.set(0, 0.08, -1.82);
        rig.root.scale.multiplyScalar(1.16);
        scene.add(rig.root);
      }).catch(error => console.error('Equipped Hall of the Veil player failed to load', error));
    };

    boot().catch(error => console.error('Hall of the Veil failed to initialize', error));
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
      if ((window as any).__DUNGEON_VEIL_MENU_HALL__?.contract === 'hall-of-the-veil-v4') delete (window as any).__DUNGEON_VEIL_MENU_HALL__;
    };
  }, []);

  return <div
    ref={hostRef}
    data-testid="modern-village-square-scene"
    data-hall-of-the-veil="true"
    data-scene-contract="hall-of-the-veil-v4"
    data-renderer-count="1"
    data-market-stalls="0"
    data-decorative-npcs="0"
    data-player-anchor="center"
    className="pointer-events-none absolute inset-0"
  />;
}
