import React, { useEffect, useRef } from 'react';
import { loadCompanionRoleV4 } from '../game/companionSelectionV4';
import { type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';
import { loadKayKitMenuCompanion, type KayKitMenuCompanionRig } from './kaykitMenuCompanion3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const HALL_PARTICLE_COUNT = IS_MOBILE ? 12 : 22;

function createLiveAtmosphere(THREE: any, scene: any) {
  const atmosphereRoot = new THREE.Group();
  atmosphereRoot.name = 'HallLiveAtmosphere';
  scene.add(atmosphereRoot);

  const mistLayers: any[] = [];
  for (let index = 0; index < (IS_MOBILE ? 3 : 5); index++) {
    const mist = new THREE.Mesh(
      new THREE.CircleGeometry(2.45 + index * 0.48, IS_MOBILE ? 24 : 40),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0x7c3aed : 0xa78bfa,
        transparent: true,
        opacity: 0.018 + index * 0.003,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mist.rotation.x = -Math.PI / 2;
    mist.scale.set(1.8, 1.15, 1);
    mist.position.set((index % 2 ? 1 : -1) * (0.22 + index * 0.16), -0.02, -2.05 - index * 1.08);
    mist.userData.baseX = mist.position.x;
    mist.userData.phase = index * 0.9;
    atmosphereRoot.add(mist);
    mistLayers.push(mist);
  }

  const positions = new Float32Array(HALL_PARTICLE_COUNT * 3);
  for (let index = 0; index < HALL_PARTICLE_COUNT; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 5.2;
    positions[index * 3 + 1] = 0.3 + Math.random() * 4.4;
    positions[index * 3 + 2] = -5.6 + Math.random() * 6.8;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xe9d5ff,
      size: IS_MOBILE ? 0.028 : 0.042,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  particles.name = 'HallBoundedVeilParticles';
  atmosphereRoot.add(particles);

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.3, IS_MOBILE ? 32 : 48),
    new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0, 0.06, -2.22);
  floorGlow.scale.set(1.55, 0.62, 1);
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
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, IS_MOBILE ? 1 : 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.3 : 1.24;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.setAttribute('data-menu-renderer', 'hall-of-the-veil');
      host.replaceChildren(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 70);
      camera.position.set(0, 4.45, 13.1);
      camera.lookAt(0, 1.12, -2.18);

      const hallRoot = new THREE.Group();
      hallRoot.name = 'HallHybridCharacterLayerV6';
      hallRoot.userData.sceneContract = 'hall-of-the-veil-v6-premium';
      hallRoot.userData.marketStalls = 0;
      hallRoot.userData.decorativeNpcs = 0;
      hallRoot.userData.backgroundMode = 'premium-2d-artwork';
      hallRoot.userData.characterFocus = 'center';
      hallRoot.userData.activeCompanionVisible = true;
      hallRoot.userData.composition = 'full-body-player-and-companion';
      scene.add(hallRoot);

      const atmosphere = createLiveAtmosphere(THREE, hallRoot);

      scene.add(new THREE.HemisphereLight(0xe9ddff, 0x09050f, 1.08));
      scene.add(new THREE.AmbientLight(0x665477, 0.2));
      const playerKey = new THREE.PointLight(0xffb86b, IS_MOBILE ? 2.75 : 3.2, 7.4, 2);
      playerKey.position.set(-1.55, 2.75, 1.55);
      scene.add(playerKey);
      const playerRim = new THREE.PointLight(0xa855f7, IS_MOBILE ? 2.45 : 2.9, 8.8, 2);
      playerRim.position.set(1.75, 2.9, -3.9);
      scene.add(playerRim);
      const portalBounce = new THREE.PointLight(0x7c3aed, IS_MOBILE ? 1.55 : 1.9, 10, 2);
      portalBounce.position.set(0, 2.45, -5.8);
      scene.add(portalBounce);

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        const portrait = camera.aspect < 0.72;
        camera.fov = portrait ? 35 : 31;
        camera.position.set(0, portrait ? 4.55 : 4.25, portrait ? 13.4 : 13.7);
        camera.lookAt(0, portrait ? 1.12 : 1.06, -2.2);
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
          mist.position.x = mist.userData.baseX + Math.sin(now * 0.00032 + mist.userData.phase) * 0.42;
          mist.rotation.z += delta * 0.006;
        });
        for (let index = 0; index < HALL_PARTICLE_COUNT; index++) {
          const y = index * 3 + 1;
          atmosphere.positions[y] += delta * (0.04 + (index % 4) * 0.009);
          if (atmosphere.positions[y] > 4.85) atmosphere.positions[y] = 0.3;
        }
        atmosphere.particleGeometry.attributes.position.needsUpdate = true;
        atmosphere.floorGlow.material.opacity = 0.08 + Math.sin(now * 0.0016) * 0.025;
        playerKey.intensity = (IS_MOBILE ? 2.65 : 3.1) + Math.sin(now * 0.0014) * 0.1;
        playerRim.intensity = (IS_MOBILE ? 2.35 : 2.8) + Math.sin(now * 0.0017) * 0.13;
        portalBounce.intensity = (IS_MOBILE ? 1.45 : 1.8) + Math.sin(now * 0.0013) * 0.14;
        villagePlayerRig?.update(delta);
        companionRig?.update(delta);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      (window as any).__DUNGEON_VEIL_MENU_HALL__ = {
        contract: 'hall-of-the-veil-v6-premium',
        rendererCount: 1,
        backgroundMode: 'premium-2d-artwork',
        artwork: 'premium-gothic-v3',
        marketStalls: 0,
        decorativeNpcs: 0,
        particleCount: HALL_PARTICLE_COUNT,
        characterCentered: true,
        playerFullBody: true,
        activeCompanionVisible: true,
        companionFullBody: true,
        spectatorHandoff: 'exclusive',
      };

      const playerPromise = loadKayKitVillageArcher(THREE, GLTFLoader).then(rig => {
        if (disposed) { rig.stop(); return; }
        villagePlayerRig = rig;
        rig.root.position.set(-0.34, 0.34, -2.2);
        rig.root.scale.multiplyScalar(0.82);
        hallRoot.add(rig.root);
      });
      const companionPromise = loadKayKitMenuCompanion(THREE, GLTFLoader, loadCompanionRoleV4()).then(rig => {
        if (disposed) { rig.stop(); return; }
        companionRig = rig;
        rig.root.position.set(1.03, 0.3, -2.08);
        rig.root.rotation.y = -0.12;
        rig.root.scale.multiplyScalar(0.68);
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
      if ((window as any).__DUNGEON_VEIL_MENU_HALL__?.contract === 'hall-of-the-veil-v6-premium') delete (window as any).__DUNGEON_VEIL_MENU_HALL__;
    };
  }, []);

  return <div
    ref={hostRef}
    data-testid="modern-village-square-scene"
    data-hall-of-the-veil="true"
    data-scene-contract="hall-of-the-veil-v6-premium"
    data-renderer-count="1"
    data-background-mode="premium-2d-artwork"
    data-background-artwork="premium-gothic-v3"
    data-market-stalls="0"
    data-decorative-npcs="0"
    data-player-anchor="center"
    data-player-full-body="true"
    data-active-companion="true"
    data-companion-full-body="true"
    className="pointer-events-none absolute inset-0"
  />;
}
