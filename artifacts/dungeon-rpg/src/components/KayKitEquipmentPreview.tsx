import React, { useEffect, useRef } from 'react';
import type { EquipmentId } from '../game/metaProgression';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const KAYKIT_ROOT = '/assets/kaykit/';
const OPEN_BOOK = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/spellbook_open.gltf';
const HIGH_TIER = new Set<EquipmentId>(['hunter-bow', 'rune-quiver', 'frost-grimoire']);

function fitObject(THREE: any, object: any, targetSize: number) {
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, 0.001));
}

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
      const relicTier = HIGH_TIER.has(itemId);
      const camera = new THREE.PerspectiveCamera(relicTier ? 29 : 34, 1, 0.1, 40);
      camera.position.set(0, 0.18, relicTier ? 4.7 : 4.4);
      camera.lookAt(0, 0.08, 0);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.15));
      renderer.setSize(host.clientWidth || 120, host.clientHeight || 120, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = relicTier ? 1.28 : 1.15;
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf5e6c8, 0x09080b, relicTier ? 1.8 : 1.45));
      const keyLight = new THREE.PointLight(accent, relicTier ? 7.2 : 5.5, 9, 2);
      keyLight.position.set(1.5, 1.25, 2.2);
      scene.add(keyLight);
      const rimLight = relicTier ? new THREE.PointLight(accent, 4.6, 7, 2) : null;
      if (rimLight) {
        rimLight.position.set(-1.5, -0.4, -0.6);
        scene.add(rimLight);
      }

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(`${KAYKIT_ROOT}${assetPath}`);
      if (disposed) return;

      const relic = new THREE.Group();
      scene.add(relic);
      const object = gltf.scene;
      object.traverse((node: any) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = false;
      });

      const accentMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending });
      const softMaterial = accentMaterial.clone();
      softMaterial.opacity = 0.22;
      const crystalMaterial = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.5, roughness: 0.28, metalness: 0.12, transparent: true, opacity: 0.9 });
      const animated: any[] = [];
      const sparks: any[] = [];

      if (itemId === 'hunter-bow') {
        fitObject(THREE, object, 2.9);
        object.rotation.z = Math.PI / 2;
        object.rotation.y = -0.12;
        relic.add(object);

        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.58, 8), new THREE.MeshStandardMaterial({ color: 0x6b4023, roughness: 0.72 }));
        grip.rotation.z = Math.PI / 2;
        relic.add(grip);

        for (const side of [-1, 1]) {
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.62, 5), crystalMaterial.clone());
          blade.position.x = side * 1.24;
          blade.rotation.z = side < 0 ? Math.PI / 2 : -Math.PI / 2;
          relic.add(blade);
          const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), crystalMaterial.clone());
          rune.position.set(side * 0.72, 0.13, 0.08);
          relic.add(rune);
          animated.push(rune);
        }

        const string = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.35, 0, 0.03), new THREE.Vector3(0, -0.28, 0.03), new THREE.Vector3(1.35, 0, 0.03)]),
          new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.9 }),
        );
        relic.add(string);
      } else if (itemId === 'rune-quiver') {
        fitObject(THREE, object, 2.55);
        object.position.y = 0.15;
        relic.add(object);

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.33, 1.72, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x38283f, roughness: 0.58, metalness: 0.16 }));
        body.position.y = -0.18;
        relic.add(body);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.065, 8, 20), crystalMaterial.clone());
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.68;
        relic.add(rim);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), crystalMaterial.clone());
        core.position.set(0, -0.05, 0.5);
        relic.add(core);
        animated.push(core);

        for (let index = 0; index < 4; index++) {
          const rune = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.04), accentMaterial.clone());
          rune.position.set(Math.cos(index * Math.PI / 2) * 0.45, -0.18 + index * 0.17, Math.sin(index * Math.PI / 2) * 0.45);
          rune.rotation.z = index * 0.62;
          relic.add(rune);
          animated.push(rune);
        }
      } else if (itemId === 'frost-grimoire') {
        const open = await loader.loadAsync(`${KAYKIT_ROOT}${OPEN_BOOK}`);
        if (disposed) return;
        const openBook = open.scene;
        openBook.traverse((node: any) => {
          if (!node.isMesh) return;
          node.castShadow = false;
          node.receiveShadow = false;
        });
        fitObject(THREE, openBook, 2.75);
        openBook.rotation.x = -0.5;
        openBook.rotation.y = 0.08;
        relic.add(openBook);

        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.025, 8, 64), softMaterial.clone());
        halo.rotation.x = Math.PI / 2;
        halo.position.y = -0.58;
        relic.add(halo);
        animated.push(halo);

        for (const [x, y, scale] of [[-0.92, 0.22, 1], [0.94, 0.12, 0.88], [-0.55, 0.92, 0.72], [0.52, 0.86, 0.62]] as const) {
          const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 * scale, 0), crystalMaterial.clone());
          crystal.scale.y = 1.8;
          crystal.position.set(x, y, 0.12);
          relic.add(crystal);
          animated.push(crystal);
        }
      } else {
        fitObject(THREE, object, 1.7);
        relic.add(object);
      }

      if (relicTier) {
        for (let index = 0; index < 7; index++) {
          const spark = new THREE.Mesh(new THREE.SphereGeometry(0.022 + (index % 2) * 0.008, 6, 6), accentMaterial.clone());
          spark.userData.phase = index * 0.9;
          spark.userData.radius = 0.66 + (index % 3) * 0.18;
          relic.add(spark);
          sparks.push(spark);
        }
      }

      const resize = () => renderer?.setSize(host.clientWidth || 120, host.clientHeight || 120, false);
      const loop = () => {
        if (disposed) return;
        const now = performance.now();
        relic.rotation.y += relicTier ? 0.0032 : 0.008;
        relic.rotation.x = Math.sin(now * 0.0007) * (relicTier ? 0.028 : 0.08);
        relic.position.y = relicTier ? Math.sin(now * 0.0017) * 0.055 : 0;
        animated.forEach((node, index) => {
          node.rotation.y += 0.006 + index * 0.0008;
          node.rotation.z += index % 2 ? -0.0025 : 0.0025;
          if (node.material?.emissiveIntensity !== undefined) node.material.emissiveIntensity = 1.2 + Math.sin(now * 0.003 + index) * 0.55;
          if (node.material?.opacity !== undefined && node.material.transparent) node.material.opacity = 0.45 + Math.sin(now * 0.0032 + index) * 0.18;
        });
        sparks.forEach((spark, index) => {
          const phase = spark.userData.phase + now * 0.0012;
          const radius = spark.userData.radius;
          spark.position.set(Math.cos(phase) * radius, -0.72 + ((phase * 0.3 + index * 0.16) % 1.5), Math.sin(phase) * radius * 0.45);
          spark.material.opacity = 0.3 + Math.sin(phase * 2.2) * 0.18;
        });
        keyLight.intensity = (relicTier ? 6.6 : 5) + Math.sin(now * 0.0037) * (relicTier ? 1.2 : 0.8);
        if (rimLight) rimLight.intensity = 4 + Math.cos(now * 0.003) * 0.8;
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
