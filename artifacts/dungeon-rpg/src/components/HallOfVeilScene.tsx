import React, { useEffect, useRef } from 'react';
import { loadCompanionRoleV4 } from '../game/companionSelectionV4';
import { type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';
import { loadKayKitMenuCompanion, type KayKitMenuCompanionRig } from './kaykitMenuCompanion3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const HALL_PARTICLE_COUNT = IS_MOBILE ? 14 : 26;

function createLiveAtmosphere(THREE: any, scene: any) {
  const atmosphereRoot = new THREE.Group();
  atmosphereRoot.name = 'HallLiveAtmosphere';
  scene.add(atmosphereRoot);

  const mistLayers: any[] = [];
  for (let index = 0; index < (IS_MOBILE ? 3 : 5); index++) {
    const mist = new THREE.Mesh(
      new THREE.CircleGeometry(2.7 + index * 0.55, IS_MOBILE ? 24 : 40),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0x7c3aed : 0xa78bfa,
        transparent: true,
        opacity: 0.028 + index * 0.004,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mist.rotation.x = -Math.PI / 2;
    mist.scale.set(1.9, 1.25, 1);
    mist.position.set((index % 2 ? 1 : -1) * (0.25 + index * 0.18), -0.08, -1.6 - index * 1.2);
    mist.userData.baseX = mist.position.x;
    mist.userData.phase = index * 0.9;
    atmosphereRoot.add(mist);
    mistLayers.push(mist);
  }

  const positions = new Float32Array(HALL_PARTICLE_COUNT * 3);
  for (let index = 0; index < HALL_PARTICLE_COUNT; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 5.8;
    positions[index * 3 + 1] = 0.25 + Math.random() * 4.8;
    positions[index * 3 + 2] = -5.8 + Math.random() * 7.2;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xd8b4fe,
      size: IS_MOBILE ? 0.035 : 0.05,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  particles.name = 'HallBoundedVeilParticles';
  atmosphereRoot.add(particles);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, IS_MOBILE ? 32 : 48),
    new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0, 0.02, -1.75);
  floorGlow.scale.set(1.45, 0.7, 1);
  atmosphereRoot.add(floorGlow);

  return { mistLayers, particleGeometry, positions, floorGlow };
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
    let companionRig: KayKitMenuCompanionRig | null = null;
    let lastFrame = 0;
    let lastRigFrame = 0;
    let removeResize = () => {};

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = null;
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, IS_MOBILE ? 1 : 1.3));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.56 : 1.48;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.setAttribute('data-menu-renderer', 'hall-of-the-veil');
      host.replaceChildren(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
      camera.position.set(0, 4.25, 10.8);
      camera.lookAt(0, 1.28, -1.7);

      const hallRoot = new THREE.Group();
      hallRoot.name = 'HallHybridCharacterLayerV5';
      hallRoot.userData.sceneContract = 'hall-of-the-veil-v5-hybrid';
      hallRoot.userData.marketStalls = 0;
      hallRoot.userData.decorativeNpcs = 0;
      hallRoot.userData.backgroundMode = 'premium-2d-artwork';
      hallRoot.userData.characterFocus = 'center';
      hallRoot.userData.activeCompanionVisible = true;
      scene.add(hallRoot);

      const atmosphere = createLiveAtmosphere(THREE, hallRoot);

      scene.add(new THREE.HemisphereLight(0xe9ddff, 0x09050f, 1.25));
      scene.add(new THREE.AmbientLight(0x76628c, 0.28));
      const playerKey = new THREE.PointLight(0xffb86b, IS_MOBILE ? 3.8 : 4.3, 7, 2);
      playerKey.position.set(-1.35, 2.65, 1.25);
      scene.add(playerKey);
      const playerRim = new THREE.PointLight(0xa855f7, IS_MOBILE ? 3.0 : 3.5, 8.5, 2);
      playerRim.position.set(1.9, 2.7, -3.3);
      scene.add(playerRim);
      const portalBounce = new THREE.PointLight(0x7c3aed, IS_MOBILE ? 2.1 : 2.5, 9, 2);
      portalBounce.position.set(0, 2.2, -5.2);
      scene.add(portalBounce);

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        const portrait = camera.aspect < 0.72;
        camera.fov = portrait ? 38 : 33;
        camera.position.set(0, portrait ? 4.18 : 4.0, portrait ? 10.15 : 10.8);
        camera.lookAt(0, portrait ? 1.25 : 1.2, -1.7);
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

        atmosphere.mistLayers.forEach((mist: any) => {
          mist.position.x = mist.userData.baseX + Math.sin(now * 0.00032 + mist.userData.phase) * 0.55;
          mist.rotation.z += delta * 0.008;
        });
        for (let index = 0; index < HALL_PARTICLE_COUNT; index++) {
          const y = index * 3 + 1;
          atmosphere.positions[y] += delta * (0.045 + (index % 4) * 0.01);
          if (atmosphere.positions[y] > 5.15) atmosphere.positions[y] = 0.25;
        }
        atmosphere.particleGeometry.attributes.position.needsUpdate = true;
        atmosphere.floorGlow.material.opacity = 0.13 + Math.sin(now * 0.0016) * 0.035;
        playerKey.intensity = (IS_MOBILE ? 3.7 : 4.2) + Math.sin(now * 0.0014) * 0.12;
        playerRim.intensity = (IS_MOBILE ? 2.9 : 3.4) + Math.sin(now * 0.0017) * 0.16;
        portalBounce.intensity = (IS_MOBILE ? 2.0 : 2.4) + Math.sin(now * 0.0013) * 0.18;
        villagePlayerRig?.update(delta);
        companionRig?.update(delta);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      (window as any).__DUNGEON_VEIL_MENU_HALL__ = {
        contract: 'hall-of-the-veil-v5-hybrid',
        rendererCount: 1,
        backgroundMode: 'premium-2d-artwork',
        marketStalls: 0,
        decorativeNpcs: 0,
        particleCount: HALL_PARTICLE_COUNT,
        characterCentered: true,
        activeCompanionVisible: true,
        spectatorHandoff: 'exclusive',
      };

      const playerPromise = loadKayKitVillageArcher(THREE, GLTFLoader).then(rig => {
        if (disposed) { rig.stop(); return; }
        villagePlayerRig = rig;
        rig.root.position.set(-0.34, 0.04, -1.74);
        rig.root.scale.multiplyScalar(1.2);
        hallRoot.add(rig.root);
      });
      const companionPromise = loadKayKitMenuCompanion(THREE, GLTFLoader, loadCompanionRoleV4()).then(rig => {
        if (disposed) { rig.stop(); return; }
        companionRig = rig;
        rig.root.position.set(1.08, 0.05, -1.58);
        rig.root.rotation.y = -0.18;
        rig.root.scale.multiplyScalar(0.92);
        hallRoot.add(rig.root);
      });
      void Promise.allSettled([playerPromise, companionPromise]).then(results => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') console.warn(index === 0
            ? 'Equipped Hall player failed to load'
            : 'Active Hall companion failed to load', result.reason);
        });
      });
    };

    boot().catch(error => console.error('Hall of the Veil hybrid scene failed to initialize', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeResize();
      villagePlayerRig?.stop();
      companionRig?.stop();
      scene?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
        else node.material?.dispose?.();
      });
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
      if ((window as any).__DUNGEON_VEIL_MENU_HALL__?.contract === 'hall-of-the-veil-v5-hybrid') delete (window as any).__DUNGEON_VEIL_MENU_HALL__;
    };
  }, []);

  return <div
    ref={hostRef}
    data-testid="modern-village-square-scene"
    data-hall-of-the-veil="true"
    data-scene-contract="hall-of-the-veil-v5-hybrid"
    data-renderer-count="1"
    data-background-mode="premium-2d-artwork"
    data-market-stalls="0"
    data-decorative-npcs="0"
    data-player-anchor="center"
    data-active-companion="true"
    className="pointer-events-none absolute inset-0"
  />;
}
