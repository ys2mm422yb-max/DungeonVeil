import React, { useEffect, useRef } from 'react';
import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitPackName } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type CourtAssetRule = {
  key: string;
  pack: KayKitPackName;
  include: RegExp;
  exclude?: RegExp;
};

const COURT_ASSETS: CourtAssetRule[] = [
  { key: 'arch', pack: 'dungeon', include: /(wall_arched|archway|gate)/i },
  { key: 'pillar', pack: 'dungeon', include: /pillar.*decorated|decorated.*pillar|pillar/i },
  { key: 'torch', pack: 'dungeon', include: /torch.*lit|lit.*torch|torch/i },
  { key: 'banner', pack: 'dungeon', include: /banner.*shield|shield.*banner|banner/i },
  { key: 'shrine', pack: 'halloween', include: /shrine.*candle|candle.*shrine|altar/i },
  { key: 'crate', pack: 'resources', include: /crate|barrel/i },
  { key: 'bench', pack: 'furniture', include: /bench|table/i },
  { key: 'stone', pack: 'forest', include: /rock|stone/i },
];

function buildVeilHeart(THREE: any) {
  const root = new THREE.Group();
  root.name = 'VeilWorldOrb';

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 36),
    new THREE.MeshBasicMaterial({ color: 0x030407, transparent: true, opacity: 0.52, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.08;
  shadow.scale.y = 0.42;
  root.add(shadow);

  const stone = new THREE.MeshStandardMaterial({ color: 0x453b38, roughness: 0.88, metalness: 0.05 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x8a6b3d, emissive: 0x2e1b06, emissiveIntensity: 0.25, roughness: 0.52, metalness: 0.32 });
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.42, 0.34, 10), stone);
  lower.position.y = -0.9;
  root.add(lower);
  const middle = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.1, 0.24, 10), trim);
  middle.position.y = -0.62;
  root.add(middle);
  const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.08, 8, 36, Math.PI * 1.62), trim);
  cradle.rotation.set(Math.PI / 2, 0, 0.7);
  cradle.position.y = -0.42;
  root.add(cradle);

  const orbitRoot = new THREE.Group();
  orbitRoot.position.y = 0.38;
  root.add(orbitRoot);

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, IS_MOBILE ? 34 : 50, IS_MOBILE ? 24 : 36),
    new THREE.MeshStandardMaterial({
      color: 0x315b70,
      emissive: 0x152948,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.04,
      transparent: true,
      opacity: 0.97,
    }),
  );
  globe.name = 'VeilWorldGlobe';
  orbitRoot.add(globe);

  const depthGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.91, IS_MOBILE ? 28 : 40, IS_MOBILE ? 20 : 30),
    new THREE.MeshBasicMaterial({ color: 0x8474d8, transparent: true, opacity: 0.19, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  orbitRoot.add(depthGlow);

  const mist = new THREE.Mesh(
    new THREE.SphereGeometry(1.09, IS_MOBILE ? 26 : 38, IS_MOBILE ? 18 : 28),
    new THREE.MeshStandardMaterial({ color: 0xb8c9d5, emissive: 0x474676, emissiveIntensity: 0.24, transparent: true, opacity: 0.09, roughness: 0.95, depthWrite: false }),
  );
  mist.scale.set(1.02, 0.96, 1.02);
  orbitRoot.add(mist);

  const landMaterial = new THREE.MeshStandardMaterial({
    color: 0xcda65a,
    emissive: 0x3b2607,
    emissiveIntensity: 0.34,
    roughness: 0.74,
    metalness: 0.08,
  });
  const landShards: any[] = [];
  const landDefinitions: Array<[number, number, number, number, number, number, number]> = [
    [-0.45, 0.28, 0.92, 0.58, 0.27, 0.08, -0.32],
    [-0.05, 0.5, 0.94, 0.31, 0.18, 0.07, 0.15],
    [0.55, 0.06, 0.9, 0.48, 0.24, 0.08, 0.28],
    [0.18, -0.5, 0.94, 0.38, 0.2, 0.07, -0.42],
    [-0.55, -0.42, 0.84, 0.25, 0.15, 0.06, 0.36],
  ];
  landDefinitions.forEach(([x, y, z, sx, sy, sz, rz], index) => {
    const land = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), landMaterial);
    land.position.set(x, y, z);
    land.scale.set(sx, sy, sz);
    land.rotation.z = rz;
    land.userData.baseZ = z;
    land.userData.phase = index * 0.9;
    orbitRoot.add(land);
    landShards.push(land);
  });

  const arcMaterial = new THREE.MeshBasicMaterial({ color: 0xb8a0ff, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending });
  const veilArcs: any[] = [];
  for (const [rotationX, rotationY, rotationZ, arc] of [
    [Math.PI / 2.55, 0.18, -0.44, Math.PI * 1.28],
    [Math.PI / 1.8, -0.25, 1.08, Math.PI * 0.82],
  ] as Array<[number, number, number, number]>) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.035, 7, IS_MOBILE ? 34 : 54, arc), arcMaterial.clone());
    band.rotation.set(rotationX, rotationY, rotationZ);
    orbitRoot.add(band);
    veilArcs.push(band);
  }

  const crackMaterial = new THREE.MeshBasicMaterial({ color: 0xf5d58d, transparent: true, opacity: 0.68, depthWrite: false, blending: THREE.AdditiveBlending });
  const cracks: any[] = [];
  for (const [x, y, rotation] of [[-0.34, 0.02, -0.52], [0.3, -0.28, 0.42]] as Array<[number, number, number]>) {
    const crack = new THREE.Mesh(new THREE.TorusGeometry(1.055, 0.012, 5, 26, Math.PI * 0.33), crackMaterial.clone());
    crack.position.set(x, y, 0.03);
    crack.rotation.set(0, rotation, rotation * 0.5);
    orbitRoot.add(crack);
    cracks.push(crack);
  }

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 1.82, IS_MOBILE ? 42 : 64),
    new THREE.MeshBasicMaterial({ color: 0x6f5bb5, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  halo.position.z = -0.54;
  orbitRoot.add(halo);

  const moteCount = IS_MOBILE ? 10 : 18;
  const motes: any[] = [];
  for (let index = 0; index < moteCount; index++) {
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(index % 4 === 0 ? 0.038 : 0.025, 6, 5),
      new THREE.MeshBasicMaterial({ color: index % 3 ? 0xd8c7ff : 0xffd48a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    mote.userData.phase = index / moteCount * Math.PI * 2;
    root.add(mote);
    motes.push(mote);
  }

  root.userData.orbitRoot = orbitRoot;
  root.userData.globe = globe;
  root.userData.depthGlow = depthGlow;
  root.userData.mist = mist;
  root.userData.landShards = landShards;
  root.userData.veilArcs = veilArcs;
  root.userData.cracks = cracks;
  root.userData.halo = halo;
  root.userData.motes = motes;
  return root;
}

function buildVillageNpc(THREE: any, clothColor: number, accentColor: number, phase: number, variant: number) {
  const root = new THREE.Group();
  root.userData.phase = phase;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const cloth = new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.86, metalness: 0.02 });
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.08, 10), cloth);
  cloak.position.y = 0.55;
  root.add(cloak);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), cloth);
  shoulders.scale.set(1.2, 0.62, 0.92);
  shoulders.position.y = 0.9;
  root.add(shoulders);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 9),
    new THREE.MeshStandardMaterial({ color: 0xc99d7b, roughness: 0.78, metalness: 0 }),
  );
  head.position.y = 1.24;
  root.add(head);

  const accent = new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.96 });
  const badge = new THREE.Mesh(variant === 4 ? new THREE.RingGeometry(0.075, 0.12, 12) : new THREE.OctahedronGeometry(0.09, 0), accent);
  badge.position.set(0, 0.95, 0.31);
  root.add(badge);

  if (variant === 0) {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.34, 8), cloth);
    hood.position.y = 1.42;
    root.add(hood);
  } else if (variant === 1) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.12, 10), cloth);
    cap.position.y = 1.4;
    root.add(cap);
  } else if (variant === 3) {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.18, 6), accent);
    crown.position.y = 1.43;
    root.add(crown);
  }

  root.userData.badge = badge;
  return root;
}

function buildVillageStall(THREE: any, roofColor: number) {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.94, metalness: 0 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.86, metalness: 0.01 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.38, 0.7), wood);
  counter.position.y = 0.38;
  root.add(counter);
  for (const x of [-0.74, 0.74]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.72, 0.11), wood);
    post.position.set(x, 1.08, 0);
    root.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.13, 1.02), roofMaterial);
  roof.position.y = 1.93;
  root.add(roof);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.065, 0.08), new THREE.MeshBasicMaterial({ color: 0xe1b76c, transparent: true, opacity: 0.68 }));
  trim.position.set(0, 1.84, 0.53);
  root.add(trim);
  return root;
}

async function loadCourtAssets(THREE: any, GLTFLoader: any, scene: any) {
  const manifest = await loadKayKitManifest();
  const loader = new GLTFLoader();
  const loaded = await Promise.all(COURT_ASSETS.map(async rule => {
    const relative = findKayKitModels(manifest, rule.pack, rule.include, rule.exclude)[0];
    if (!relative) return [rule.key, null] as const;
    try {
      const gltf = await loader.loadAsync(modelUrl(manifest, relative));
      return [rule.key, gltf.scene] as const;
    } catch (error) {
      console.warn(`Menu court asset unavailable: ${relative}`, error);
      return [rule.key, null] as const;
    }
  }));
  const models = Object.fromEntries(loaded) as Record<string, any>;
  const root = new THREE.Group();
  root.name = 'VeilCourtKayKitArchitecture';

  const add = (prototype: any, x: number, y: number, z: number, scale: number, rotation = 0, name = '') => {
    if (!prototype) return;
    const object = prototype.clone(true);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    object.scale.setScalar(scale);
    if (name) object.name = name;
    object.traverse((node: any) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      node.castShadow = false;
      node.receiveShadow = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.filter(Boolean).forEach((material: any) => {
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
          const texture = material[key];
          if (!texture) continue;
          texture.anisotropy = 4;
          texture.needsUpdate = true;
        }
      });
    });
    root.add(object);
  };

  add(models.arch, 0, 0, -8.4, 2.1, Math.PI, 'VeilCourtGate');
  add(models.shrine, 0, 0.12, -7.25, 1.25, 0, 'VeilHeartShrine');
  for (const side of [-1, 1]) {
    add(models.pillar, side * 3.45, 0, -6.75, 1.45, 0, `VeilCourtPillar${side}`);
    add(models.banner, side * 3.7, 2.65, -8.05, 1.2, Math.PI, `VeilCourtBanner${side}`);
    add(models.torch, side * 2.75, 0.95, -6.45, 1.25, Math.PI, `VeilCourtTorch${side}`);
    add(models.bench, side * 3.55, 0, -3.4, 1.0, side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3);
    add(models.crate, side * 4.0, 0, -1.4, 0.9, side * 0.2);
    add(models.stone, side * 4.25, 0, -5.1, 0.95, side * 0.4);
  }

  scene.add(root);
  return root;
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
    let assetRoot: any = null;
    let lastFrame = 0;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x12131a);
      scene.fog = new THREE.Fog(0x12131a, 14, 34);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1.12 : 1.4));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.16 : 1.08;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 70);
      camera.position.set(0, 5.1, 12.8);
      camera.lookAt(0, 1.45, -4.85);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 29),
        new THREE.MeshStandardMaterial({ color: 0x292628, roughness: 0.98, metalness: 0 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.025, -5.8);
      scene.add(floor);

      const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x54483e, roughness: 0.9, metalness: 0.02 });
      for (let index = 0; index < 9; index++) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(3.35 + (index % 2) * 0.2, 0.055, 1.55), pathMaterial);
        slab.position.set((index % 2 ? 0.1 : -0.08), 0.008, 4.1 - index * 1.45);
        slab.rotation.y = (index % 3 - 1) * 0.025;
        scene.add(slab);
      }

      const plaza = new THREE.Mesh(
        new THREE.CylinderGeometry(4.65, 4.9, 0.16, IS_MOBILE ? 36 : 56),
        new THREE.MeshStandardMaterial({ color: 0x3b3331, roughness: 0.92, metalness: 0.025 }),
      );
      plaza.position.set(0, 0.03, -4.3);
      plaza.scale.z = 0.79;
      scene.add(plaza);

      const plazaTrim = new THREE.Mesh(
        new THREE.TorusGeometry(3.25, 0.055, 7, IS_MOBILE ? 42 : 64),
        new THREE.MeshBasicMaterial({ color: 0xa37a45, transparent: true, opacity: 0.34, depthWrite: false }),
      );
      plazaTrim.rotation.x = Math.PI / 2;
      plazaTrim.position.set(0, 0.13, -4.3);
      plazaTrim.scale.z = 0.79;
      scene.add(plazaTrim);

      scene.add(new THREE.HemisphereLight(0xe9d7bd, 0x111421, 0.9));
      scene.add(new THREE.AmbientLight(0xd7ccbd, 0.36));
      const keyLight = new THREE.DirectionalLight(0xffc780, 1.85);
      keyLight.position.set(-4.5, 10, 7);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x7d87c9, 0.48);
      fillLight.position.set(5.5, 8, 0);
      scene.add(fillLight);
      const veilLight = new THREE.PointLight(0x7788ff, IS_MOBILE ? 2.1 : 3.0, 10, 2);
      veilLight.position.set(0, 3.25, -5.8);
      scene.add(veilLight);

      const orb = buildVeilHeart(THREE);
      orb.position.set(0, 2.18, -6.15);
      orb.scale.setScalar(1.02);
      scene.add(orb);

      const stalls = [
        { x: -3.65, z: -1.9, rotation: 0.17, color: 0x765130 },
        { x: 3.65, z: -1.9, rotation: -0.17, color: 0x315d69 },
        { x: -3.65, z: -4.55, rotation: 0.1, color: 0x3e6045 },
        { x: 3.65, z: -4.55, rotation: -0.1, color: 0x65405a },
      ];
      stalls.forEach(entry => {
        const stall = buildVillageStall(THREE, entry.color);
        stall.position.set(entry.x, 0, entry.z);
        stall.rotation.y = entry.rotation;
        scene.add(stall);
      });

      const npcDefinitions = [
        { x: -2.55, z: -1.95, color: 0x754225, accent: 0xf0c56e },
        { x: 2.55, z: -1.95, color: 0x315f69, accent: 0xa8e0ed },
        { x: -2.55, z: -4.15, color: 0x3f6047, accent: 0xa5d8a9 },
        { x: 2.55, z: -4.15, color: 0x624159, accent: 0xd6afea },
        { x: 0, z: -5.0, color: 0x4e486d, accent: 0xd8c8ff },
      ];
      const villageNpcs = npcDefinitions.map((entry, index) => {
        const npc = buildVillageNpc(THREE, entry.color, entry.accent, index * 1.2, index);
        npc.position.set(entry.x, 0, entry.z);
        npc.rotation.y = entry.x < 0 ? -0.15 : entry.x > 0 ? 0.15 : 0;
        scene.add(npc);
        return npc;
      });

      const lanternMaterial = new THREE.MeshBasicMaterial({ color: 0xffbd6e, transparent: true, opacity: 0.88 });
      for (const [x, z] of [[-1.72, -2.25], [1.72, -2.25], [-1.72, -4.95], [1.72, -4.95]] as Array<[number, number]>) {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), lanternMaterial.clone());
        lantern.position.set(x, 0.38, z);
        scene.add(lantern);
      }

      void loadCourtAssets(THREE, GLTFLoader, scene).then(root => { if (!disposed) assetRoot = root; }).catch(error => console.warn('Veil court package staging failed', error));

      const clock = new THREE.Clock();
      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 39 : 36;
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

        const delta = Math.min(clock.getDelta(), 0.05);
        const pulse = 0.5 + Math.sin(now * 0.0018) * 0.5;
        orb.userData.orbitRoot.rotation.y += delta * 0.08;
        orb.userData.globe.rotation.y += delta * 0.055;
        orb.userData.depthGlow.material.opacity = 0.14 + pulse * 0.1;
        orb.userData.mist.rotation.y -= delta * 0.04;
        orb.userData.mist.material.opacity = 0.065 + pulse * 0.055;
        orb.userData.halo.material.opacity = 0.09 + pulse * 0.08;
        orb.userData.veilArcs.forEach((arc: any, index: number) => {
          arc.rotation.z += delta * (index ? -0.08 : 0.1);
          arc.material.opacity = 0.34 + pulse * 0.18;
        });
        orb.userData.cracks.forEach((crack: any, index: number) => {
          crack.material.opacity = 0.48 + Math.sin(now * 0.0025 + index) * 0.22;
        });
        orb.userData.landShards.forEach((land: any) => {
          land.position.z = land.userData.baseZ + Math.sin(now * 0.0014 + land.userData.phase) * 0.025;
        });
        orb.userData.motes.forEach((mote: any, index: number) => {
          const phase = mote.userData.phase + now * (0.00045 + index * 0.00001);
          const radius = 1.45 + (index % 3) * 0.12;
          mote.position.x = Math.sin(phase) * radius;
          mote.position.y = 0.35 + Math.cos(phase * 0.72) * 1.12;
          mote.position.z = Math.cos(phase) * 0.28;
          mote.material.opacity = 0.38 + Math.sin(phase * 2) * 0.22;
        });

        villageNpcs.forEach((npc, index) => {
          const phase = now * 0.0015 + npc.userData.phase;
          npc.position.y = Math.sin(phase) * 0.025;
          npc.rotation.z = Math.sin(phase * 0.72) * 0.01;
          npc.userData.badge.rotation.y += delta * (0.42 + index * 0.035);
        });

        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      (host as any).__menuCleanup = () => window.removeEventListener('resize', resize);
    };

    boot().catch(error => console.error('Dungeon Veil menu scene failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (host as any).__menuCleanup?.();
      scene?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
        else node.material?.dispose?.();
      });
      if (assetRoot) assetRoot.clear?.();
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} data-testid="veil-world-orb-scene" data-menu-scene="kaykit-veil-court" className="pointer-events-none absolute inset-0" />;
}
