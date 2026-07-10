import React, { useEffect, useRef, useState } from 'react';
import { loadKayKitRangerWeapons } from './kaykitWeapons3D';
import { KAYKIT_PLAYER_ASSETS } from './kaykitPlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

function prepareModel(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = true;
  });
}

function fitObject(THREE: any, object: any, targetSize: number) {
  object.scale.setScalar(1);
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z, 0.001);
  object.scale.setScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
}

function chooseIdle(clips: any[]) {
  return clips.find(clip => /idle/i.test(String(clip?.name ?? '')) && !/aim|bow|crouch|sit|sleep/i.test(String(clip?.name ?? '')))
    ?? clips.find(clip => /idle/i.test(String(clip?.name ?? '')))
    ?? clips[0]
    ?? null;
}

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
    let mixer: any;
    let showcaseRoot: any;
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

      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
      camera.position.set(2.05, 1.72, 6.45);
      camera.lookAt(0, 0.9, 0);

      scene.add(new THREE.HemisphereLight(0xfff0d8, 0x17110d, 2.1));
      const key = new THREE.DirectionalLight(0xffd79a, 3.2);
      key.position.set(4, 6, 5);
      key.castShadow = true;
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x8875d8, 1.05);
      rim.position.set(-4, 3, -4);
      scene.add(rim);

      const floor = new THREE.Mesh(new THREE.CircleGeometry(1.35, 40), new THREE.MeshStandardMaterial({ color: 0x21160f, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const loader = new GLTFLoader();
      const [rangerGltf, generalGltf, movementGltf, weapons] = await Promise.all([
        loader.loadAsync(KAYKIT_PLAYER_ASSETS.ranger),
        loader.loadAsync(KAYKIT_PLAYER_ASSETS.general),
        loader.loadAsync(KAYKIT_PLAYER_ASSETS.movement),
        loadKayKitRangerWeapons(),
      ]);
      if (disposed || !weapons) return;

      showcaseRoot = new THREE.Group();
      showcaseRoot.rotation.y = -0.28;
      scene.add(showcaseRoot);

      const ranger = rangerGltf.scene;
      ranger.scale.setScalar(1.18);
      prepareModel(ranger);
      showcaseRoot.add(ranger);

      // Character selection is a calm hero showcase, not an attack pose.
      // Keep the live combat hand rig out of this preview and carry the bow across the back.
      const bow = weapons.bow.clone(true);
      prepareModel(bow);
      fitObject(THREE, bow, 1.14);
      bow.position.set(0.12, 1.12, -0.24);
      bow.rotation.set(0.08, -0.18, -0.82);
      showcaseRoot.add(bow);

      mixer = new THREE.AnimationMixer(ranger);
      const clips = [...(rangerGltf.animations ?? []), ...(generalGltf.animations ?? []), ...(movementGltf.animations ?? [])];
      const idle = chooseIdle(clips);
      if (idle) mixer.clipAction(idle).reset().fadeIn(0.05).play();

      clock = new THREE.Clock();
      resize();
      setState('ready');

      const render = () => {
        if (disposed || !renderer || !scene || !camera || !clock) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        showcaseTime += dt;
        mixer?.update(dt);
        if (showcaseRoot) showcaseRoot.rotation.y = -0.28 + Math.sin(showcaseTime * 0.25) * 0.045;
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
      mixer?.stopAllAction?.();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="relative h-full w-full">
    {state === 'loading' && <div className="flex h-full w-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d7a441]/30 border-t-[#d7a441]" /></div>}
    {state === 'fallback' && <div className="flex h-full w-full items-center justify-center text-xs font-bold tracking-[.25em] text-amber-100/40">KAYKIT RANGER</div>}
  </div>;
}
