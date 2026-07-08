import React, { useEffect, useRef, useState } from 'react';
import { composeFullRanger } from './rangerCharacterRig';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
const ASSET_ROOT = '/assets/3d/';

function StaticArcher() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-24 w-24 text-[#d7a441]" fill="currentColor">
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
    let bow: any;
    let clock: any;
    let showcaseTime = 0;

    const resize = () => {
      if (!renderer || !camera) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const normalize = (object: any, targetSize: number) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      object.position.sub(center);
      object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, 0.0001));
      object.traverse((node: any) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      return object;
    };

    const attachBow = () => {
      const root = rangerRig?.root;
      if (!root || !bow) return;
      let hand: any = null;
      root.traverse((node: any) => {
        const name = String(node.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!hand && (name.includes('lefthand') || name.includes('handl') || name.endsWith('lhand'))) hand = node;
      });
      (hand ?? root).add(bow);
      if (hand) {
        bow.position.set(0.01, 0.015, 0.01);
        bow.rotation.set(0, Math.PI / 2, Math.PI / 2);
      } else {
        bow.position.set(-0.34, 1.02, 0.04);
        bow.rotation.set(0, 0, Math.PI / 2);
      }
    };

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const [{ GLTFLoader }, { OBJLoader }, { MTLLoader }] = await Promise.all([
        import(/* @vite-ignore */ GLTF_URL),
        import(/* @vite-ignore */ OBJ_URL),
        import(/* @vite-ignore */ MTL_URL),
      ]) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0908);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: 'default' });
      } catch {
        if (!disposed) setState('fallback');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(1.3, 1.45, 3.15);
      camera.lookAt(0, 0.92, 0);

      scene.add(new THREE.HemisphereLight(0xfff3df, 0x25180e, 2.2));
      const key = new THREE.DirectionalLight(0xffe0a8, 3.1);
      key.position.set(3.5, 5.5, 4.5);
      key.castShadow = true;
      key.shadow.mapSize.set(512, 512);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x8db7ff, 1.15);
      fill.position.set(-3, 2.5, 1.5);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xd39bff, 0.8);
      rim.position.set(-2, 3, -4);
      scene.add(rim);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(1.18, 40),
        new THREE.MeshStandardMaterial({ color: 0x1b130d, roughness: 1 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0;
      floor.receiveShadow = true;
      scene.add(floor);

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.74, 0.92, 0.09, 28),
        new THREE.MeshStandardMaterial({ color: 0x2a1c11, roughness: 0.9, metalness: 0.05 }),
      );
      pedestal.position.y = 0.045;
      pedestal.receiveShadow = true;
      scene.add(pedestal);

      const loader = new GLTFLoader();
      const load = (name: string) => new Promise<any>((resolve, reject) => loader.load(`${ASSET_ROOT}${name}`, resolve, undefined, reject));
      const [baseGltf, outfitGltf, animationsGltf] = await Promise.all([
        load('base-male.glb'),
        load('ranger.glb'),
        load('animations.glb'),
      ]);
      if (disposed) return;

      rangerRig = composeFullRanger(THREE, baseGltf.scene, outfitGltf.scene, animationsGltf.animations ?? []);
      rangerRig.root.scale.setScalar(1.22);
      rangerRig.root.rotation.y = -0.35;
      scene.add(rangerRig.root);

      const materials = await new MTLLoader().loadAsync(`${ASSET_ROOT}Bow_Wooden2.mtl`);
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      bow = normalize(await objLoader.loadAsync(`${ASSET_ROOT}Bow_Wooden2.obj`), 1.18);
      attachBow();

      if (!disposed) setState('ready');
      clock = new THREE.Clock();
      resize();

      const render = () => {
        if (disposed || !renderer || !scene || !camera) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        showcaseTime += dt;
        rangerRig?.update(dt);
        if (rangerRig?.root) {
          rangerRig.root.rotation.y = -0.34 + Math.sin(showcaseTime * 0.42) * 0.22;
        }
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => {
      console.error('Ranger preview failed', error);
      if (!disposed) setState('fallback');
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
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
