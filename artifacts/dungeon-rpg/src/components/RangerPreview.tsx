import React, { useEffect, useRef, useState } from 'react';
import { composeFullRanger } from './rangerCharacterRig';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const ASSET_ROOT = '/assets/3d/';

function StaticArcher() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-20 w-20 text-[#d7a441]" fill="currentColor">
        <circle cx="50" cy="50" r="38" opacity="0.15" />
        <path d="M50 18 C38 18 30 28 30 38 C30 48 36 54 42 58 L42 80 L46 80 L46 62 L54 62 L54 80 L58 80 L58 58 C64 54 70 48 70 38 C70 28 62 18 50 18 Z" />
        <path d="M26 44 Q50 70 74 44" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.85" />
      </svg>
    </div>
  );
}

export function RangerPreview() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let THREE: any;
    let renderer: any;
    let scene: any;
    let camera: any;
    let rangerRig: ReturnType<typeof composeFullRanger> | null = null;
    let clock: any;

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const loaderModule: any = await import(/* @vite-ignore */ GLTF_URL);
      if (disposed) return;

      const GLTFLoader = loaderModule.GLTFLoader;
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x090807);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: 'default' });
      } catch {
        if (!disposed) setState('fallback');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(36, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100);
      camera.position.set(0.85, 1.28, 3.2);
      camera.lookAt(0, 0.9, 0);

      scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x332211, 2.1));
      const key = new THREE.DirectionalLight(0xfff1d0, 2.2);
      key.position.set(2.4, 4.5, 3.5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x9bbfff, 0.9);
      rim.position.set(-2, 2.5, -3);
      scene.add(rim);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(0.82, 32),
        new THREE.MeshStandardMaterial({ color: 0x17110b, roughness: 1 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.005;
      scene.add(floor);

      const loader = new GLTFLoader();
      const load = (name: string) => new Promise<any>((resolve, reject) => loader.load(`${ASSET_ROOT}${name}`, resolve, undefined, reject));
      const [baseGltf, outfitGltf, animationsGltf] = await Promise.all([
        load('base-male.glb'),
        load('ranger.glb'),
        load('animations.glb'),
      ]);
      if (disposed) return;

      rangerRig = composeFullRanger(THREE, baseGltf.scene, outfitGltf.scene, animationsGltf.animations ?? []);
      rangerRig.root.scale.setScalar(1.12);
      rangerRig.root.rotation.y = -0.28;
      scene.add(rangerRig.root);

      if (!disposed) setState('ready');
      clock = new THREE.Clock();
      const render = () => {
        if (disposed || !renderer || !scene || !camera) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        rangerRig?.update(dt);
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();
    };

    boot().catch(error => {
      console.error('Ranger preview failed', error);
      if (!disposed) setState('fallback');
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      rangerRig?.stop();
      if (rangerRig?.root) {
        scene?.remove(rangerRig.root);
        rangerRig.root.traverse((node: any) => {
          node.geometry?.dispose?.();
          if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
          else node.material?.dispose?.();
        });
      }
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return (
    <div ref={hostRef} className="relative h-full w-full">
      {state === 'loading' && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d7a441]/30 border-t-[#d7a441]" />
        </div>
      )}
      {state === 'fallback' && <StaticArcher />}
    </div>
  );
}
