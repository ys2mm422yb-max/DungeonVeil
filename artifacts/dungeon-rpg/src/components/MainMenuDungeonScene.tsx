import React, { useEffect, useRef } from 'react';
import { buildKayKitDungeonRoom } from './kaykitRoom3D';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

function buildMenuVeil(THREE: any) {
  const root = new THREE.Group();
  root.name = 'DungeonVeilMenuPortal';

  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.105, IS_ANDROID ? 7 : 10, IS_ANDROID ? 36 : 64),
    new THREE.MeshBasicMaterial({ color: 0xa78aff, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  outer.scale.y = 1.24;
  root.add(outer);

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(1.72, 0.048, IS_ANDROID ? 6 : 8, IS_ANDROID ? 32 : 60),
    new THREE.MeshBasicMaterial({ color: 0x6f48d7, transparent: true, opacity: 0.54, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  inner.scale.y = 1.28;
  root.add(inner);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(1.68, IS_ANDROID ? 32 : 64),
    new THREE.MeshBasicMaterial({ color: 0x160d2b, transparent: true, opacity: 0.84, depthWrite: false }),
  );
  core.scale.y = 1.28;
  core.position.z = -0.03;
  root.add(core);

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 4.15),
    new THREE.MeshBasicMaterial({ color: 0x5f36bc, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  veil.position.z = 0.015;
  root.add(veil);

  const moteCount = IS_ANDROID ? 6 : 12;
  const motes: any[] = [];
  for (let index = 0; index < moteCount; index++) {
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 + (index % 3) * 0.015, 6, 6),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xd9ccff : 0x8d6cff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    mote.userData.phase = index / moteCount * Math.PI * 2;
    root.add(mote);
    motes.push(mote);
  }

  const light = new THREE.PointLight(0x8565e5, IS_ANDROID ? 5.2 : 7.5, 13, 2);
  light.position.z = 1.2;
  root.add(light);

  root.userData.outer = outer;
  root.userData.inner = inner;
  root.userData.core = core;
  root.userData.veil = veil;
  root.userData.motes = motes;
  root.userData.light = light;
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
    let ranger: KayKitPlayerRig | null = null;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x060605);
      scene.fog = new THREE.Fog(0x060605, 13, 34);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_ANDROID ? 1 : 1.1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_ANDROID ? 1.08 : 1.02;
      renderer.shadowMap.enabled = false;
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 90);
      camera.position.set(-0.45, 5.8, 11.2);
      camera.lookAt(0.05, 1.5, -6.2);

      const room = buildKayKitDungeonRoom(THREE, 1, 24, 32);
      scene.add(room);

      scene.add(new THREE.HemisphereLight(0xc8b897, 0x060605, IS_ANDROID ? 0.82 : 0.72));
      const keyLight = new THREE.DirectionalLight(0xffc987, IS_ANDROID ? 1.18 : 1.05);
      keyLight.position.set(-5, 10, 7);
      scene.add(keyLight);

      const leftTorch = new THREE.PointLight(0xff8a36, IS_ANDROID ? 5.0 : 7.4, 11, 2);
      leftTorch.position.set(-4.5, 2.5, -7.2);
      scene.add(leftTorch);
      const rightTorch = new THREE.PointLight(0xff6f2d, IS_ANDROID ? 4.2 : 6.3, 10, 2);
      rightTorch.position.set(4.4, 2.35, -8.1);
      scene.add(rightTorch);

      const portal = buildMenuVeil(THREE);
      portal.position.set(0.65, 2.38, -14.55);
      portal.rotation.y = -0.05;
      portal.scale.setScalar(1.06);
      scene.add(portal);

      ranger = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      ranger.root.scale.setScalar(0.72);
      ranger.root.position.set(-1.2, 0, -3.1);
      ranger.root.rotation.y = Math.PI - 0.13;
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

      const loop = () => {
        if (disposed) return;
        const delta = Math.min(clock.getDelta(), 0.05);
        const now = performance.now();
        const pulse = 0.5 + Math.sin(now * 0.0022) * 0.5;

        ranger?.update(delta);
        if (ranger) ranger.root.rotation.y = Math.PI - 0.13 + Math.sin(now * 0.00035) * 0.055;

        portal.userData.outer.rotation.z = now * 0.00018;
        portal.userData.inner.rotation.z = -now * 0.00031;
        portal.userData.core.material.opacity = 0.78 + pulse * 0.1;
        portal.userData.veil.material.opacity = 0.13 + pulse * 0.12;
        portal.userData.veil.scale.x = 0.94 + pulse * 0.08;
        portal.userData.light.intensity = (IS_ANDROID ? 4.6 : 6.6) + pulse * (IS_ANDROID ? 1.3 : 2.2);
        (portal.userData.motes as any[]).forEach((mote, index) => {
          const phase = mote.userData.phase + now * (0.00075 + index * 0.000012);
          const radius = 1.45 + (index % 3) * 0.18;
          mote.position.x = Math.sin(phase) * radius;
          mote.position.y = -1.7 + ((now * 0.00018 + index / Math.max(1, portal.userData.motes.length)) % 1) * 3.6;
          mote.position.z = 0.05 + Math.cos(phase) * 0.12;
          mote.material.opacity = 0.38 + Math.sin(phase * 2.1) * 0.28;
        });

        leftTorch.intensity = (IS_ANDROID ? 4.7 : 6.8) + Math.sin(now * 0.009) * 0.5;
        rightTorch.intensity = (IS_ANDROID ? 4.0 : 5.8) + Math.sin(now * 0.011 + 1.4) * 0.45;
        camera.position.x = -0.45 + Math.sin(now * 0.00016) * 0.22;
        camera.position.y = 5.8 + Math.sin(now * 0.00012) * 0.08;
        camera.lookAt(0.05, 1.5, -6.2);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();

      host.dataset.cleanupReady = '1';
      (host as any).__menuCleanup = () => window.removeEventListener('resize', resize);
    };

    boot().catch(error => console.error('Dungeon Veil menu scene failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (host as any).__menuCleanup?.();
      ranger?.stop();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
