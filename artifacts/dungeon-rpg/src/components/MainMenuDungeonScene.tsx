import React, { useEffect, useRef } from 'react';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const DUNGEON_ROOT = '/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

function buildMenuVeil(THREE: any) {
  const root = new THREE.Group();
  root.name = 'DungeonVeilMenuPortal';

  const segments = IS_MOBILE ? 36 : 56;
  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.11, 8, segments),
    new THREE.MeshBasicMaterial({ color: 0xb89cff, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  outer.scale.y = 1.24;
  root.add(outer);

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(1.73, 0.05, 6, IS_MOBILE ? 32 : 48),
    new THREE.MeshBasicMaterial({ color: 0x714be0, transparent: true, opacity: 0.68, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  inner.scale.y = 1.29;
  root.add(inner);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(1.69, IS_MOBILE ? 36 : 56),
    new THREE.MeshBasicMaterial({ color: 0x120923, transparent: true, opacity: 0.92, depthWrite: false }),
  );
  core.scale.y = 1.29;
  core.position.z = -0.04;
  root.add(core);

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(3.05, 4.2),
    new THREE.MeshBasicMaterial({ color: 0x6a3fc7, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  veil.position.z = 0.01;
  root.add(veil);

  const moteCount = IS_MOBILE ? 5 : 9;
  const motes: any[] = [];
  for (let index = 0; index < moteCount; index++) {
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + (index % 2) * 0.012, 5, 5),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xd9ccff : 0x8d6cff, transparent: true, opacity: 0.74, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    mote.userData.phase = index / moteCount * Math.PI * 2;
    root.add(mote);
    motes.push(mote);
  }

  root.userData.outer = outer;
  root.userData.inner = inner;
  root.userData.core = core;
  root.userData.veil = veil;
  root.userData.motes = motes;
  return root;
}

function prepareStaticModel(object: any) {
  object.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = true;
  });
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
    let ranger: KayKitPlayerRig | null = null;
    let lastFrame = 0;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);
      scene.fog = new THREE.Fog(0x050505, 12, 28);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.08 : 1.03;
      renderer.shadowMap.enabled = false;
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 70);
      camera.position.set(0, 4.65, 10.8);
      camera.lookAt(0, 2.25, -7.8);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 28),
        new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.95, metalness: 0 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.02, -6.5);
      scene.add(floor);

      const path = new THREE.Mesh(
        new THREE.PlaneGeometry(3.7, 24),
        new THREE.MeshStandardMaterial({ color: 0x2b211b, roughness: 0.9, metalness: 0 }),
      );
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0, -5.5);
      scene.add(path);

      const loader = new GLTFLoader();
      const [pillarAsset, torchAsset] = await Promise.all([
        loader.loadAsync(`${DUNGEON_ROOT}/wall_pillar.gltf`).catch(() => null),
        loader.loadAsync(`${DUNGEON_ROOT}/torch_mounted.gltf`).catch(() => null),
      ]);
      if (disposed) return;

      if (pillarAsset?.scene) {
        for (const side of [-1, 1]) {
          const pillar = pillarAsset.scene.clone(true);
          prepareStaticModel(pillar);
          pillar.scale.setScalar(2.25);
          pillar.position.set(side * 3.35, 0, -8.2);
          pillar.rotation.y = side < 0 ? 0.08 : -0.08;
          scene.add(pillar);
        }
      }

      if (torchAsset?.scene) {
        for (const side of [-1, 1]) {
          const torch = torchAsset.scene.clone(true);
          prepareStaticModel(torch);
          torch.scale.setScalar(1.25);
          torch.position.set(side * 3.0, 2.65, -7.55);
          torch.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
          scene.add(torch);
        }
      }

      scene.add(new THREE.HemisphereLight(0xc8b897, 0x050505, 0.82));
      const keyLight = new THREE.DirectionalLight(0xffc987, 1.08);
      keyLight.position.set(-4, 9, 6);
      scene.add(keyLight);
      const portalLight = new THREE.PointLight(0x8868ef, IS_MOBILE ? 4.2 : 6.2, 10, 2);
      portalLight.position.set(0, 2.3, -7.1);
      scene.add(portalLight);

      const portal = buildMenuVeil(THREE);
      portal.position.set(0, 2.55, -8.25);
      portal.scale.setScalar(1.18);
      scene.add(portal);

      ranger = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      ranger.root.scale.setScalar(0.78);
      ranger.root.position.set(-0.9, 0, -1.6);
      ranger.root.rotation.y = Math.PI - 0.08;
      scene.add(ranger.root);

      const clock = new THREE.Clock();
      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
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
        const pulse = 0.5 + Math.sin(now * 0.0021) * 0.5;
        ranger?.update(delta);

        portal.userData.outer.rotation.z = now * 0.00016;
        portal.userData.inner.rotation.z = -now * 0.00028;
        portal.userData.core.material.opacity = 0.86 + pulse * 0.06;
        portal.userData.veil.material.opacity = 0.15 + pulse * 0.08;
        portal.userData.veil.scale.x = 0.97 + pulse * 0.04;
        portalLight.intensity = (IS_MOBILE ? 3.8 : 5.6) + pulse * 0.9;

        (portal.userData.motes as any[]).forEach((mote, index) => {
          const phase = mote.userData.phase + now * (0.00062 + index * 0.00001);
          const radius = 1.48 + (index % 2) * 0.2;
          mote.position.x = Math.sin(phase) * radius;
          mote.position.y = -1.72 + ((now * 0.00015 + index / Math.max(1, portal.userData.motes.length)) % 1) * 3.7;
          mote.position.z = 0.05 + Math.cos(phase) * 0.1;
          mote.material.opacity = 0.38 + Math.sin(phase * 2) * 0.22;
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
      ranger?.stop();
      scene?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
        else node.material?.dispose?.();
      });
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
