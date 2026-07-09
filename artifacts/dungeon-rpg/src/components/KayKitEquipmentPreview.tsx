import React, { useEffect, useRef } from 'react';
import type { EquipmentId } from '../game/metaProgression';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const KAYKIT_ROOT = '/assets/kaykit/';
const OPEN_BOOK = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/spellbook_open.gltf';
const RANGER_QUIVER = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf';
const HIGH_TIER = new Set<EquipmentId>(['hunter-bow', 'rune-quiver', 'frost-grimoire']);
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

function fitObject(THREE: any, object: any, targetSize: number) {
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, 0.001));
}

function prepareObject(object: any) {
  object.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = true;
  });
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
      const camera = new THREE.PerspectiveCamera(relicTier ? 27 : 34, 1, 0.1, 40);
      camera.position.set(0, 0.15, relicTier ? 4.45 : 4.4);
      camera.lookAt(0, 0.06, 0);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_ANDROID ? 1 : 1.15));
      renderer.setSize(host.clientWidth || 120, host.clientHeight || 120, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = relicTier ? 1.3 : 1.15;
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf5e6c8, 0x09080b, relicTier ? 1.9 : 1.45));
      const keyLight = new THREE.PointLight(accent, relicTier ? (IS_ANDROID ? 5.2 : 7.2) : 5.5, 9, 2);
      keyLight.position.set(1.5, 1.25, 2.2);
      scene.add(keyLight);
      const rimLight = relicTier ? new THREE.PointLight(accent, IS_ANDROID ? 3.1 : 4.6, 7, 2) : null;
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
      prepareObject(object);

      const accentMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.56, depthWrite: false, blending: THREE.AdditiveBlending });
      const softMaterial = accentMaterial.clone();
      softMaterial.opacity = 0.18;
      const animated: any[] = [];
      const sparks: any[] = [];

      if (itemId === 'hunter-bow') {
        fitObject(THREE, object, 3.35);
        object.rotation.z = Math.PI / 2;
        object.rotation.y = -0.12;
        relic.add(object);
      } else if (itemId === 'rune-quiver') {
        const quiverGltf = await loader.loadAsync(`${KAYKIT_ROOT}${RANGER_QUIVER}`);
        if (disposed) return;
        const quiver = quiverGltf.scene;
        prepareObject(quiver);
        fitObject(THREE, quiver, 2.75);
        quiver.position.set(-0.12, -0.05, 0);
        quiver.rotation.z = -0.14;
        relic.add(quiver);

        fitObject(THREE, object, 2.15);
        object.position.set(0.22, 0.16, 0.1);
        object.rotation.z = 0.16;
        relic.add(object);
      } else if (itemId === 'frost-grimoire') {
        const open = await loader.loadAsync(`${KAYKIT_ROOT}${OPEN_BOOK}`);
        if (disposed) return;
        const openBook = open.scene;
        prepareObject(openBook);
        fitObject(THREE, openBook, 3.15);
        openBook.rotation.x = -0.5;
        openBook.rotation.y = 0.08;
        relic.add(openBook);
      } else {
        fitObject(THREE, object, 1.7);
        relic.add(object);
      }

      if (relicTier) {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.025, IS_ANDROID ? 6 : 8, IS_ANDROID ? 32 : 64), softMaterial.clone());
        halo.rotation.x = Math.PI / 2;
        halo.position.y = -0.72;
        relic.add(halo);
        animated.push(halo);

        const sparkCount = IS_ANDROID ? 4 : 7;
        for (let index = 0; index < sparkCount; index++) {
          const spark = new THREE.Mesh(new THREE.SphereGeometry(0.022 + (index % 2) * 0.008, 6, 6), accentMaterial.clone());
          spark.userData.phase = index * 0.9;
          spark.userData.radius = 0.7 + (index % 3) * 0.2;
          relic.add(spark);
          sparks.push(spark);
        }
      }

      const resize = () => renderer?.setSize(host.clientWidth || 120, host.clientHeight || 120, false);
      const loop = () => {
        if (disposed) return;
        const now = performance.now();
        relic.rotation.y += relicTier ? 0.0032 : 0.008;
        relic.rotation.x = Math.sin(now * 0.0007) * (relicTier ? 0.025 : 0.08);
        relic.position.y = relicTier ? Math.sin(now * 0.0017) * 0.055 : 0;
        animated.forEach((node, index) => {
          node.rotation.y += 0.006 + index * 0.0008;
          node.rotation.z += index % 2 ? -0.0025 : 0.0025;
          if (node.material?.opacity !== undefined && node.material.transparent) node.material.opacity = 0.34 + Math.sin(now * 0.0032 + index) * 0.12;
        });
        sparks.forEach((spark, index) => {
          const phase = spark.userData.phase + now * 0.0012;
          const radius = spark.userData.radius;
          spark.position.set(Math.cos(phase) * radius, -0.72 + ((phase * 0.3 + index * 0.16) % 1.5), Math.sin(phase) * radius * 0.45);
          spark.material.opacity = 0.3 + Math.sin(phase * 2.2) * 0.18;
        });
        keyLight.intensity = (relicTier ? (IS_ANDROID ? 4.7 : 6.6) : 5) + Math.sin(now * 0.0037) * (relicTier ? 1.0 : 0.8);
        if (rimLight) rimLight.intensity = (IS_ANDROID ? 2.8 : 4) + Math.cos(now * 0.003) * 0.7;
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
