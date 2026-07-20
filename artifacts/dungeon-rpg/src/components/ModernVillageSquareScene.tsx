import React, { useEffect, useRef } from 'react';
import { type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

function disposeScene(scene: any) {
  scene?.traverse?.((node: any) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

export function ModernVillageSquareScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let playerRig: KayKitPlayerRig | null = null;
    let removeResize = () => {};
    let lastFrame = 0;
    let lastRigFrame = 0;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050309);
      scene.fog = new THREE.FogExp2(0x09050f, 0.045);

      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.32 : 1.2;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 70);
      camera.position.set(0, 4.8, 12.7);
      camera.lookAt(0, 1.35, -3.6);

      const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x120d18, roughness: 0.8, metalness: 0.08 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 28, 1, 1), floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.03, -5.1);
      scene.add(floor);

      const aisleMaterial = new THREE.MeshStandardMaterial({ color: 0x21142d, roughness: 0.68, metalness: 0.15 });
      const aisle = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 22), aisleMaterial);
      aisle.rotation.x = -Math.PI / 2;
      aisle.position.set(0, 0.005, -4.2);
      scene.add(aisle);

      const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x17111f, roughness: 0.9 });
      const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x463255, roughness: 0.72, metalness: 0.15 });
      for (const x of [-4.2, 4.2]) {
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 7.8, IS_MOBILE ? 10 : 14), stoneMaterial);
        column.position.set(x, 3.8, -5.4);
        scene.add(column);
        const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.62, 0.42, IS_MOBILE ? 10 : 14), trimMaterial);
        capital.position.set(x, 7.55, -5.4);
        scene.add(capital);
      }

      const portalRoot = new THREE.Group();
      portalRoot.position.set(0, 0.15, -8.7);
      scene.add(portalRoot);

      const portalGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(4.7, 7.2),
        new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.45, depthWrite: false }),
      );
      portalGlow.position.y = 3.55;
      portalRoot.add(portalGlow);

      const portalCore = new THREE.Mesh(
        new THREE.PlaneGeometry(3.45, 6.15),
        new THREE.MeshBasicMaterial({ color: 0x2e0b52, transparent: true, opacity: 0.92 }),
      );
      portalCore.position.set(0, 3.35, 0.04);
      portalRoot.add(portalCore);

      const archMaterial = new THREE.MeshStandardMaterial({ color: 0x21172b, roughness: 0.78, metalness: 0.12 });
      const archTrim = new THREE.MeshStandardMaterial({ color: 0x7447a0, emissive: 0x2b0d49, emissiveIntensity: 0.65, roughness: 0.5 });
      for (const [radius, tube, material] of [[2.2, 0.42, archMaterial], [1.86, 0.12, archTrim]] as const) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, IS_MOBILE ? 8 : 12, IS_MOBILE ? 28 : 40, Math.PI), material);
        arch.rotation.z = Math.PI;
        arch.position.set(0, 4.45, 0.12);
        portalRoot.add(arch);
      }
      for (const x of [-2.2, 2.2]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.84, 4.35, 0.78), archMaterial);
        side.position.set(x, 2.15, 0.12);
        portalRoot.add(side);
      }

      const bannerMaterial = new THREE.MeshStandardMaterial({ color: 0x240b3b, emissive: 0x170326, emissiveIntensity: 0.35, roughness: 0.82 });
      for (const x of [-3.15, 3.15]) {
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 3.1), bannerMaterial);
        banner.position.set(x, 4.65, -7.95);
        scene.add(banner);
      }

      scene.add(new THREE.HemisphereLight(0x7f5fa5, 0x08050b, 1.15));
      scene.add(new THREE.AmbientLight(0x5b3b72, 0.42));
      const portalLight = new THREE.PointLight(0x8b5cf6, IS_MOBILE ? 5.5 : 6.5, 15, 2);
      portalLight.position.set(0, 4.2, -6.8);
      scene.add(portalLight);
      const playerLight = new THREE.PointLight(0xffc786, IS_MOBILE ? 2.6 : 3.1, 7, 2);
      playerLight.position.set(-1.3, 3.2, -1.2);
      scene.add(playerLight);
      const rimLight = new THREE.PointLight(0x9d6bff, IS_MOBILE ? 2.2 : 2.7, 8, 2);
      rimLight.position.set(1.8, 2.8, -4.4);
      scene.add(rimLight);

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 39 : 34;
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
        portalGlow.material.opacity = 0.4 + Math.sin(now * 0.0017) * 0.08;
        portalLight.intensity = (IS_MOBILE ? 5.2 : 6.2) + Math.sin(now * 0.0014) * 0.35;
        playerRig?.update(delta);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      void loadKayKitVillageArcher(THREE, GLTFLoader).then(rig => {
        if (disposed) {
          rig.stop();
          return;
        }
        playerRig = rig;
        rig.root.position.set(0, 0.02, -1.15);
        rig.root.scale.multiplyScalar(0.84);
        scene.add(rig.root);
      }).catch(error => console.error('Equipped hall player failed to load', error));
    };

    boot().catch(error => console.error('Hall of the Veil failed to initialize', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeResize();
      playerRig?.stop();
      disposeScene(scene);
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} data-testid="modern-village-square-scene" data-scene="hall-of-the-veil-reference" className="pointer-events-none absolute inset-0" />;
}
