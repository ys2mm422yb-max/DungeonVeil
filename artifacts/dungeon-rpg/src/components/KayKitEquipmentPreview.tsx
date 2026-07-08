import React, { useEffect, useRef } from 'react';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const KAYKIT_ROOT = '/assets/kaykit/';

export function KayKitEquipmentPreview({ assetPath, accent }: { assetPath: string; accent: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
      camera.position.set(0, 0.35, 4.4);
      camera.lookAt(0, 0.15, 0);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.15));
      renderer.setSize(host.clientWidth || 120, host.clientHeight || 120, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf1dfbd, 0x080706, 1.45));
      const glow = new THREE.PointLight(accent, 5.5, 8, 2);
      glow.position.set(1.5, 1.2, 2);
      scene.add(glow);

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(`${KAYKIT_ROOT}${assetPath}`);
      if (disposed) return;
      const object = gltf.scene;
      object.traverse((node: any) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = false;
      });
      scene.add(object);

      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      object.position.sub(center);
      const maxSize = Math.max(size.x, size.y, size.z, 0.001);
      object.scale.setScalar(1.7 / maxSize);

      const resize = () => renderer?.setSize(host.clientWidth || 120, host.clientHeight || 120, false);
      const loop = () => {
        if (disposed) return;
        object.rotation.y += 0.008;
        object.rotation.x = Math.sin(performance.now() * 0.0007) * 0.08;
        glow.intensity = 5 + Math.sin(performance.now() * 0.004) * 0.8;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      window.addEventListener('resize', resize);
      (host as any).__equipmentCleanup = () => window.removeEventListener('resize', resize);
      loop();
    };

    boot().catch(error => console.error('KayKit equipment preview failed', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (host as any).__equipmentCleanup?.();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, [assetPath, accent]);

  return <div ref={hostRef} className="h-full w-full" />;
}
