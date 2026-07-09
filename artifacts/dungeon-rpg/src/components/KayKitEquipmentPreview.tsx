import React, { useEffect, useRef } from 'react';
import type { EquipmentId } from '../game/metaProgression';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const KAYKIT_ROOT = '/assets/kaykit/';
const OPEN_BOOK = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/spellbook_open.gltf';

const HIGH_TIER = new Set<EquipmentId>(['hunter-bow', 'rune-quiver', 'frost-grimoire']);

export function KayKitEquipmentPreview({ assetPath, accent, itemId }: { assetPath: string; accent: string; itemId: EquipmentId }) {
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
      const camera = new THREE.PerspectiveCamera(HIGH_TIER.has(itemId) ? 30 : 34, 1, 0.1, 40);
      camera.position.set(0, 0.3, HIGH_TIER.has(itemId) ? 4.05 : 4.4);
      camera.lookAt(0, 0.12, 0);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.15));
      renderer.setSize(host.clientWidth || 120, host.clientHeight || 120, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = HIGH_TIER.has(itemId) ? 1.32 : 1.15;
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf1dfbd, 0x080706, HIGH_TIER.has(itemId) ? 1.72 : 1.45));
      const glow = new THREE.PointLight(accent, HIGH_TIER.has(itemId) ? 8.4 : 5.5, 9, 2);
      glow.position.set(1.5, 1.2, 2);
      scene.add(glow);
      const rim = HIGH_TIER.has(itemId) ? new THREE.PointLight(accent, 5.2, 7, 2) : null;
      if (rim) {
        rim.position.set(-1.8, -0.2, -0.8);
        scene.add(rim);
      }

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(`${KAYKIT_ROOT}${assetPath}`);
      if (disposed) return;
      const relic = new THREE.Group();
      const object = gltf.scene;
      object.traverse((node: any) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = false;
      });
      relic.add(object);
      scene.add(relic);

      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      object.position.sub(center);
      const maxSize = Math.max(size.x, size.y, size.z, 0.001);
      const targetSize = itemId === 'hunter-bow' ? 2.35 : itemId === 'rune-quiver' ? 2.2 : itemId === 'frost-grimoire' ? 2.05 : 1.7;
      object.scale.setScalar(targetSize / maxSize);

      const energyMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
      const rings: any[] = [];
      const sparks: any[] = [];

      if (itemId === 'hunter-bow') {
        const echo = object.clone(true);
        echo.position.x -= 0.12;
        echo.rotation.z = -0.08;
        echo.scale.multiplyScalar(1.08);
        echo.traverse((node: any) => {
          if (!node.isMesh) return;
          node.material = energyMaterial.clone();
          node.material.opacity = 0.18;
        });
        relic.add(echo);
        for (const radius of [0.72, 0.96]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 64), energyMaterial.clone());
          ring.rotation.x = Math.PI / 2;
          ring.scale.y = 0.58;
          relic.add(ring);
          rings.push(ring);
        }
      } else if (itemId === 'rune-quiver') {
        relic.rotation.z = -0.06;
        for (const [radius, y] of [[0.56, -0.38], [0.72, 0.14], [0.9, 0.56]] as const) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.026, 8, 56), energyMaterial.clone());
          ring.rotation.x = Math.PI / 2;
          ring.position.y = y;
          relic.add(ring);
          rings.push(ring);
        }
      } else if (itemId === 'frost-grimoire') {
        const open = await loader.loadAsync(`${KAYKIT_ROOT}${OPEN_BOOK}`);
        if (disposed) return;
        const openBook = open.scene;
        openBook.traverse((node: any) => { if (node.isMesh) { node.castShadow = false; node.receiveShadow = false; } });
        const openBounds = new THREE.Box3().setFromObject(openBook);
        const openSize = openBounds.getSize(new THREE.Vector3());
        const openCenter = openBounds.getCenter(new THREE.Vector3());
        openBook.position.sub(openCenter);
        openBook.scale.setScalar(1.75 / Math.max(openSize.x, openSize.y, openSize.z, 0.001));
        openBook.position.y = 0.1;
        openBook.rotation.x = -0.35;
        object.position.set(0, -0.08, -0.22);
        object.rotation.y = Math.PI;
        object.scale.multiplyScalar(0.82);
        relic.add(openBook);
        for (const radius of [0.66, 0.94]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 8, 64), energyMaterial.clone());
          ring.rotation.x = Math.PI / 2;
          ring.position.y = -0.3;
          relic.add(ring);
          rings.push(ring);
        }
      }

      if (HIGH_TIER.has(itemId)) {
        for (let index = 0; index < 8; index++) {
          const spark = new THREE.Mesh(new THREE.SphereGeometry(0.026 + index % 2 * 0.01, 6, 6), energyMaterial.clone());
          spark.userData.phase = index * 0.78;
          spark.userData.radius = 0.62 + (index % 3) * 0.18;
          relic.add(spark);
          sparks.push(spark);
        }
      }

      const resize = () => renderer?.setSize(host.clientWidth || 120, host.clientHeight || 120, false);
      const loop = () => {
        if (disposed) return;
        const now = performance.now();
        relic.rotation.y += HIGH_TIER.has(itemId) ? 0.006 : 0.008;
        relic.rotation.x = Math.sin(now * 0.0007) * (HIGH_TIER.has(itemId) ? 0.045 : 0.08);
        relic.position.y = HIGH_TIER.has(itemId) ? Math.sin(now * 0.0018) * 0.07 : 0;
        rings.forEach((ring, index) => {
          ring.rotation.z += (index % 2 ? -1 : 1) * (0.006 + index * 0.002);
          ring.material.opacity = 0.24 + Math.sin(now * 0.0035 + index) * 0.1;
        });
        sparks.forEach((spark, index) => {
          const phase = spark.userData.phase + now * 0.0015;
          const radius = spark.userData.radius;
          spark.position.set(Math.cos(phase) * radius, -0.55 + ((phase * 0.33 + index * 0.14) % 1.4), Math.sin(phase) * radius * 0.5);
          spark.material.opacity = 0.35 + Math.sin(phase * 2.4) * 0.22;
        });
        glow.intensity = (HIGH_TIER.has(itemId) ? 7.8 : 5) + Math.sin(now * 0.004) * (HIGH_TIER.has(itemId) ? 1.6 : 0.8);
        if (rim) rim.intensity = 4.4 + Math.cos(now * 0.003) * 1.1;
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
  }, [assetPath, accent, itemId]);

  return <div ref={hostRef} className="h-full w-full" />;
}
