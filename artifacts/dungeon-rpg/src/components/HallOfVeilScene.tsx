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
type AnimatedHall = {
  gateRings: any[];
  runeDiamonds: any[];
  mistLayers: any[];
  particleGeometry: any | null;
  particlePositions: Float32Array | null;
  gateLight: any;
  torchLights: any[];
  floorSigil: any;
};

const HALL_ASSETS: AssetRule[] = [
  { key: 'gate', pack: 'dungeon', include: /(wall_arched|archway|gate)/i },
  { key: 'pillar', pack: 'dungeon', include: /pillar.*decorated|decorated.*pillar|pillar/i },
  { key: 'torch', pack: 'dungeon', include: /torch.*lit|lit.*torch|torch/i },
  { key: 'banner', pack: 'dungeon', include: /banner.*shield|shield.*banner|banner/i },
  { key: 'wall', pack: 'dungeon', include: /wall.*stone|stone.*wall|wall/i, exclude: /arched|gate/i },
];

function prepareModel(object: any) {
  object.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => {
      material.transparent = false;
      material.opacity = 1;
      material.depthTest = true;
      material.depthWrite = true;
      material.needsUpdate = true;
    });
  });
}

function addStoneArchitecture(THREE: any, hallRoot: any) {
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x17131d, roughness: 0.94, metalness: 0.08 });
  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2638, roughness: 0.86, metalness: 0.16 });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x554661, roughness: 0.72, metalness: 0.25, emissive: 0x24103f, emissiveIntensity: 0.12 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 31), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.045, -4.8);
  floor.name = 'HallDarkStoneFloor';
  hallRoot.add(floor);

  for (let index = 0; index < 11; index++) {
    const width = 3.6 + (index % 2) * 0.18;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.075, 1.36), pathMaterial.clone());
    slab.position.set(index % 2 ? 0.06 : -0.06, 0.006, 5.25 - index * 1.38);
    slab.rotation.y = (index % 3 - 1) * 0.018;
    slab.name = `HallPathSlab${index + 1}`;
    hallRoot.add(slab);
  }

  const dais = new THREE.Mesh(
    new THREE.CylinderGeometry(4.55, 4.82, 0.18, IS_MOBILE ? 34 : 52),
    new THREE.MeshStandardMaterial({ color: 0x211a2a, roughness: 0.9, metalness: 0.1 }),
  );
  dais.position.set(0, 0.035, -3.05);
  dais.scale.z = 0.76;
  dais.name = 'HallCentralDais';
  hallRoot.add(dais);

  for (const side of [-1, 1]) {
    const sideFloor = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 18), floorMaterial.clone());
    sideFloor.position.set(side * 5.15, 0.02, -4.8);
    sideFloor.name = side < 0 ? 'HallSideFloorLeft' : 'HallSideFloorRight';
    hallRoot.add(sideFloor);

    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.3, 19), floorMaterial.clone());
    wall.position.set(side * 6.0, 2.05, -5.1);
    wall.name = side < 0 ? 'HallWallLeft' : 'HallWallRight';
    hallRoot.add(wall);

    for (let index = 0; index < 4; index++) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 0.82), edgeMaterial.clone());
      base.position.set(side * 4.55, 0.11, -8.3 + index * 3.5);
      hallRoot.add(base);
      const capital = base.clone();
      capital.position.y = 3.28;
      hallRoot.add(capital);
    }
  }

  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(12.4, 5.2, 0.42), floorMaterial.clone());
  rearWall.position.set(0, 2.4, -11.35);
  rearWall.name = 'HallRearWall';
  hallRoot.add(rearWall);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.46, 0.56), edgeMaterial.clone());
  lintel.position.set(0, 4.48, -10.85);
  lintel.name = 'HallMonumentLintel';
  hallRoot.add(lintel);
}

function createVeilGate(THREE: any, hallRoot: any) {
  const root = new THREE.Group();
  root.name = 'MonumentalVeilGate';
  root.position.set(0, 1.55, -10.72);

  const voidDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.22, IS_MOBILE ? 36 : 64),
    new THREE.MeshBasicMaterial({ color: 0x05020b, transparent: true, opacity: 0.98, side: THREE.DoubleSide, depthWrite: false }),
  );
  voidDisc.scale.y = 1.25;
  voidDisc.position.z = 0.05;
  root.add(voidDisc);

  const gateRings: any[] = [];
  const ringSpecs = [
    { radius: 2.48, tube: 0.09, color: 0x6d28d9, opacity: 0.68 },
    { radius: 2.18, tube: 0.045, color: 0xc4b5fd, opacity: 0.62 },
    { radius: 1.72, tube: 0.035, color: 0x8b5cf6, opacity: 0.48 },
  ];
  ringSpecs.forEach((spec, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius, spec.tube, IS_MOBILE ? 7 : 10, IS_MOBILE ? 36 : 64),
      new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: spec.opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    ring.scale.y = 1.25;
    ring.position.z = 0.1 + index * 0.012;
    ring.userData.baseOpacity = spec.opacity;
    ring.userData.spinDirection = index % 2 ? -1 : 1;
    root.add(ring);
    gateRings.push(ring);
  });

  const vortexLayers: any[] = [];
  [0x2e1065, 0x5b21b6, 0xa78bfa].forEach((color, index) => {
    const layer = new THREE.Mesh(
      new THREE.CircleGeometry(1.92 - index * 0.28, IS_MOBILE ? 30 : 52),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12 + index * 0.055, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    layer.scale.y = 1.25;
    layer.position.z = 0.08 + index * 0.018;
    layer.userData.vortexIndex = index;
    root.add(layer);
    vortexLayers.push(layer);
  });

  const runeDiamonds: any[] = [];
  const runeMaterial = new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
  [[0, 3.25], [0, -3.25], [-3.05, 0], [3.05, 0]].forEach(([x, y], index) => {
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.08), runeMaterial.clone());
    rune.position.set(x, y, 0.18);
    rune.rotation.z = Math.PI / 4;
    rune.userData.phase = index * 1.2;
    root.add(rune);
    runeDiamonds.push(rune);
  });

  root.userData.vortexLayers = vortexLayers;
  hallRoot.add(root);
  return { root, gateRings, runeDiamonds, vortexLayers };
}

function createAtmosphere(THREE: any, hallRoot: any) {
  const mistLayers: any[] = [];
  for (let index = 0; index < (IS_MOBILE ? 4 : 7); index++) {
    const mist = new THREE.Mesh(
      new THREE.CircleGeometry(2.8 + index * 0.42, IS_MOBILE ? 24 : 40),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0x7c5aa8 : 0x9b8aba, transparent: true, opacity: 0.025 + (index % 3) * 0.01, side: THREE.DoubleSide, depthWrite: false }),
    );
    mist.rotation.x = -Math.PI / 2;
    mist.scale.x = 1.8;
    mist.position.set((index % 2 ? 1 : -1) * (0.3 + index * 0.18), 0.1 + (index % 2) * 0.025, 2.8 - index * 2.05);
    mist.userData.baseX = mist.position.x;
    mist.userData.phase = index * 0.83;
    hallRoot.add(mist);
    mistLayers.push(mist);
  }

  const positions = new Float32Array(HALL_PARTICLE_COUNT * 3);
  for (let index = 0; index < HALL_PARTICLE_COUNT; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 6.2;
    positions[index * 3 + 1] = 0.35 + Math.random() * 4.5;
    positions[index * 3 + 2] = -10.2 + Math.random() * 8.5;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: 0xb9a1ff, size: IS_MOBILE ? 0.035 : 0.045, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  particles.name = 'HallBoundedVeilParticles';
  hallRoot.add(particles);

  return { mistLayers, particleGeometry, particlePositions: positions };
}

async function loadHallAssets(THREE: any, GLTFLoader: any, hallRoot: any, isDisposed: () => boolean) {
  const manifest = await loadKayKitManifest();
  const loader = new GLTFLoader();
  const placements: Record<string, Array<[number, number, number, number, number, string]>> = {
    gate: [[0, -0.32, -11.02, 2.05, Math.PI, 'HallStoneGate']],
    pillar: [
      [-4.52, -0.05, -8.35, 1.3, 0, 'HallPillarL1'], [4.52, -0.05, -8.35, 1.3, 0, 'HallPillarR1'],
      [-4.52, -0.05, -4.85, 1.3, 0, 'HallPillarL2'], [4.52, -0.05, -4.85, 1.3, 0, 'HallPillarR2'],
      [-4.52, -0.05, -1.35, 1.3, 0, 'HallPillarL3'], [4.52, -0.05, -1.35, 1.3, 0, 'HallPillarR3'],
      [-4.52, -0.05, 2.15, 1.3, 0, 'HallPillarL4'], [4.52, -0.05, 2.15, 1.3, 0, 'HallPillarR4'],
    ],
    banner: [[-3.35, 2.0, -9.92, 1.08, Math.PI, 'HallBannerLeft'], [3.35, 2.0, -9.92, 1.08, Math.PI, 'HallBannerRight']],
    torch: [
      [-3.1, 0.86, -7.35, 1.12, Math.PI, 'HallTorchL1'], [3.1, 0.86, -7.35, 1.12, Math.PI, 'HallTorchR1'],
      [-3.9, 0.86, -2.7, 1.06, Math.PI, 'HallTorchL2'], [3.9, 0.86, -2.7, 1.06, Math.PI, 'HallTorchR2'],
    ],
    wall: [[-5.72, 0, -5.0, 1.2, Math.PI / 2, 'HallLoadedWallLeft'], [5.72, 0, -5.0, 1.2, -Math.PI / 2, 'HallLoadedWallRight']],
  };

  const results = await Promise.allSettled(HALL_ASSETS.map(async rule => {
    const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
    if (!relative) throw new Error(`Missing optional hall asset: ${rule.key}`);
    const gltf = await loader.loadAsync(modelUrl(manifest, relative));
    if (isDisposed()) return;
    for (const [x, y, z, scale, rotation, name] of placements[rule.key] ?? []) {
      const object = gltf.scene.clone(true);
      object.position.set(x, y, z);
      object.rotation.y = rotation;
      object.scale.setScalar(scale);
      object.name = name;
      prepareModel(object);
      hallRoot.add(object);
    }
  }));
  results.forEach(result => {
    if (result.status === 'rejected') console.warn('Optional Hall of the Veil asset failed to load', result.reason);
  });
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
      scene.background = new THREE.Color(0x08060d);
      scene.fog = new THREE.Fog(0x08060d, 12.5, 31);
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, IS_MOBILE ? 1 : 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.38 : 1.28;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.setAttribute('data-menu-renderer', 'hall-of-the-veil');
      host.replaceChildren(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
      camera.position.set(0, 5.28, 13.35);
      camera.lookAt(0, 1.02, -2.95);

      const hallRoot = new THREE.Group();
      hallRoot.name = 'HallOfTheVeilV4';
      hallRoot.userData.sceneContract = 'hall-of-the-veil-v4';
      hallRoot.userData.marketStalls = 0;
      hallRoot.userData.decorativeNpcs = 0;
      hallRoot.userData.characterFocus = 'center';
      scene.add(hallRoot);

      addStoneArchitecture(THREE, hallRoot);
      const veilGate = createVeilGate(THREE, hallRoot);
      const atmosphere = createAtmosphere(THREE, hallRoot);

      const floorSigil = new THREE.Mesh(
        new THREE.RingGeometry(2.25, 2.48, IS_MOBILE ? 36 : 64),
        new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      floorSigil.rotation.x = -Math.PI / 2;
      floorSigil.position.set(0, 0.145, -3.05);
      floorSigil.scale.z = 0.76;
      hallRoot.add(floorSigil);

      scene.add(new THREE.HemisphereLight(0xd8c9ff, 0x090610, 1.28));
      scene.add(new THREE.AmbientLight(0x8e789c, 0.28));
      const playerKey = new THREE.PointLight(0xffc77c, IS_MOBILE ? 3.0 : 3.55, 7.8, 2);
      playerKey.position.set(-1.05, 2.9, -0.35);
      scene.add(playerKey);
      const playerRim = new THREE.PointLight(0x9b7cff, IS_MOBILE ? 1.35 : 1.7, 7.2, 2);
      playerRim.position.set(2.65, 2.3, -2.9);
      scene.add(playerRim);
      const gateLight = new THREE.PointLight(0x7c3aed, IS_MOBILE ? 2.0 : 2.65, 12, 2);
      gateLight.position.set(0, 2.2, -8.9);
      scene.add(gateLight);
      const torchLights = [
        [-3.15, 1.85, -6.9], [3.15, 1.85, -6.9], [-3.9, 1.8, -2.35], [3.9, 1.8, -2.35],
      ].map(([x, y, z], index) => {
        const light = new THREE.PointLight(0xff9a43, IS_MOBILE ? 0.72 : 1.05, 5.2, 2);
        light.position.set(x, y, z);
        light.userData.phase = index * 0.77;
        scene.add(light);
        return light;
      });

      const animated: AnimatedHall = {
        gateRings: veilGate.gateRings,
        runeDiamonds: veilGate.runeDiamonds,
        mistLayers: atmosphere.mistLayers,
        particleGeometry: atmosphere.particleGeometry,
        particlePositions: atmosphere.particlePositions,
        gateLight,
        torchLights,
        floorSigil,
      };

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 42 : 36;
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
        animated.gateRings.forEach((ring, index) => {
          ring.rotation.z += delta * (0.08 + index * 0.035) * ring.userData.spinDirection;
          ring.material.opacity = ring.userData.baseOpacity + Math.sin(now * 0.0014 + index) * 0.06;
        });
        (veilGate.vortexLayers as any[]).forEach((layer, index) => {
          const pulse = 1 + Math.sin(now * 0.0012 + index * 1.5) * 0.035;
          layer.scale.set(pulse, 1.25 * pulse, 1);
          layer.rotation.z += delta * (index % 2 ? -0.11 : 0.08);
        });
        animated.runeDiamonds.forEach(rune => {
          rune.material.opacity = 0.54 + Math.sin(now * 0.002 + rune.userData.phase) * 0.2;
          rune.scale.setScalar(0.9 + Math.sin(now * 0.0018 + rune.userData.phase) * 0.08);
        });
        animated.mistLayers.forEach(mist => {
          mist.position.x = mist.userData.baseX + Math.sin(now * 0.00028 + mist.userData.phase) * 0.72;
          mist.rotation.z += delta * 0.012;
        });
        if (animated.particlePositions && animated.particleGeometry) {
          for (let index = 0; index < HALL_PARTICLE_COUNT; index++) {
            const offset = index * 3 + 1;
            animated.particlePositions[offset] += delta * (0.045 + (index % 4) * 0.01);
            if (animated.particlePositions[offset] > 4.9) animated.particlePositions[offset] = 0.32;
          }
          animated.particleGeometry.attributes.position.needsUpdate = true;
        }
        animated.gateLight.intensity = (IS_MOBILE ? 1.9 : 2.55) + Math.sin(now * 0.0016) * 0.18;
        animated.torchLights.forEach(light => { light.intensity = (IS_MOBILE ? 0.68 : 0.98) + Math.sin(now * 0.004 + light.userData.phase) * 0.12; });
        animated.floorSigil.material.opacity = 0.22 + Math.sin(now * 0.0017) * 0.055;
        playerKey.intensity = (IS_MOBILE ? 2.9 : 3.42) + Math.sin(now * 0.0015) * 0.12;
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

      void loadHallAssets(THREE, GLTFLoader, hallRoot, () => disposed).catch(error => {
        console.warn('Hall of the Veil optional KayKit assets failed to load', error);
      });
      void loadKayKitVillageArcher(THREE, GLTFLoader).then(rig => {
        if (disposed) {
          rig.stop();
          return;
        }
        villagePlayerRig = rig;
        scene.add(rig.root);
      }).catch(error => {
        console.error('Equipped Hall of the Veil player failed to load', error);
      });
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
