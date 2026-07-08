import React, { useEffect, useRef, useState } from 'react';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

export function RangerPreview() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let renderer: any;
    let scene: any;
    let camera: any;
    let clock: any;
    let rangerRig: KayKitPlayerRig | null = null;
    let showcaseTime = 0;

    const resize = () => {
      if (!renderer || !camera) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x090807);

      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
      camera.position.set(2.15, 1.75, 6.6);
      camera.lookAt(0, 0.88, 0);

      scene.add(new THREE.HemisphereLight(0xfff0d8, 0x17110d, 2.1));
      const key = new THREE.DirectionalLight(0xffd79a, 3.2);
      key.position.set(4, 6, 5);
      key.castShadow = true;
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x8875d8, 1.1);
      rim.position.set(-4, 3, -4);
      scene.add(rim);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(1.35, 40),
        new THREE.MeshStandardMaterial({ color: 0x21160f, roughness: 1 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      rangerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      rangerRig.root.scale.setScalar(0.98);
      rangerRig.root.rotation.y = -0.35;
      scene.add(rangerRig.root);

      clock = new THREE.Clock();
      resize();
      setState('ready');

      const render = () => {
        if (disposed || !renderer || !scene || !camera || !clock) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        showcaseTime += dt;
        rangerRig?.update(dt);
        if (rangerRig?.root) rangerRig.root.rotation.y = -0.35 + Math.sin(showcaseTime * 0.35) * 0.12;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => {
      console.error('KayKit ranger preview failed', error);
      if (!disposed) setState('fallback');
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      rangerRig?.stop();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return (
    <div ref={hostRef} className="relative h-full w-full">
      {state === 'loading' && <div className="flex h-full w-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d7a441]/30 border-t-[#d7a441]" /></div>}
      {state === 'fallback' && <div className="flex h-full w-full items-center justify-center text-xs font-bold tracking-[.25em] text-amber-100/40">KAYKIT RANGER</div>}
    </div>
  );
}
