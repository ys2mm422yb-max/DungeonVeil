import React, { useEffect, useRef } from 'react';
import { buildKayKitDungeonRoom } from './kaykitRoom3D';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

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
      scene.background = new THREE.Color(0x070706);
      scene.fog = new THREE.Fog(0x070706, 11, 30);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;
      renderer.shadowMap.enabled = false;
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
      camera.position.set(0, 5.8, 10.8);
      camera.lookAt(0, 1.1, -3.8);

      const room = buildKayKitDungeonRoom(THREE, 1, 24, 32);
      room.position.z = -4.5;
      scene.add(room);

      scene.add(new THREE.HemisphereLight(0xc3b49b, 0x080706, 0.62));
      const leftTorch = new THREE.PointLight(0xff8a36, 6.8, 10, 2);
      leftTorch.position.set(-4.4, 2.4, -3.8);
      scene.add(leftTorch);
      const rightTorch = new THREE.PointLight(0xff6f2d, 5.4, 9, 2);
      rightTorch.position.set(4.2, 2.1, -5.2);
      scene.add(rightTorch);
      const veilLight = new THREE.PointLight(0x7562d8, 4.2, 12, 2);
      veilLight.position.set(0, 2.8, -10.5);
      scene.add(veilLight);

      const gate = new THREE.Group();
      const outer = new THREE.Mesh(
        new THREE.TorusGeometry(2.25, 0.12, 10, 48),
        new THREE.MeshBasicMaterial({ color: 0x7b61cb, transparent: true, opacity: 0.26 }),
      );
      outer.position.set(0, 2.2, -11.4);
      gate.add(outer);
      const inner = new THREE.Mesh(
        new THREE.CircleGeometry(2.08, 48),
        new THREE.MeshBasicMaterial({ color: 0x33234f, transparent: true, opacity: 0.18, depthWrite: false }),
      );
      inner.position.set(0, 2.2, -11.42);
      gate.add(inner);
      scene.add(gate);

      ranger = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      ranger.root.scale.setScalar(1.18);
      ranger.root.position.set(0, 0, -1.2);
      ranger.root.rotation.y = Math.PI;
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
        ranger?.update(delta);
        if (ranger) ranger.root.rotation.y = Math.PI + Math.sin(now * 0.00025) * 0.08;
        outer.rotation.z = now * 0.00008;
        inner.material.opacity = 0.13 + Math.sin(now * 0.0016) * 0.05;
        leftTorch.intensity = 6.2 + Math.sin(now * 0.009) * 0.6;
        rightTorch.intensity = 5 + Math.sin(now * 0.011 + 1.4) * 0.5;
        camera.position.x = Math.sin(now * 0.00018) * 0.2;
        camera.lookAt(0, 1.1, -3.8);
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
