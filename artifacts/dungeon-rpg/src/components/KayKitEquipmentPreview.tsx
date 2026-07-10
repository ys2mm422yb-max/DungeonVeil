import React, { useEffect, useRef } from 'react';
import { EQUIPMENT, type EquipmentId, type EquipmentSlot } from '../game/metaProgression';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const KAYKIT_ROOT = '/assets/kaykit/';
const OPEN_BOOK = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/spellbook_open.gltf';
const RANGER_QUIVER = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf';
const HIGH_TIER = new Set<EquipmentId>(['hunter-bow', 'rune-quiver', 'frost-grimoire']);
const ADVENTURER_BOWS = new Set<EquipmentId>(['ash-bow', 'bone-string']);
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

function fitObject(THREE: any, object: any, targetSize: number) {
  object.scale.setScalar(1);
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);

  const initialBounds = new THREE.Box3().setFromObject(object);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  const maxSize = Math.max(initialSize.x, initialSize.y, initialSize.z, 0.001);
  object.scale.setScalar(targetSize / maxSize);
  object.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(object);
  const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
  object.position.sub(scaledCenter);
  object.updateMatrixWorld(true);
}

function prepareObject(object: any) {
  object.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = true;
  });
}

function compactTarget(slot: EquipmentSlot, itemId: EquipmentId) {
  if (slot === 'bow') return itemId === 'hunter-bow' || itemId === 'warden-bow' ? 2.7 : 2.55;
  if (slot === 'quiver') return itemId === 'rune-quiver' ? 2.25 : 2.08;
  return itemId === 'frost-grimoire' ? 2.0 : 1.82;
}

function frameItem(relic: any, slot: EquipmentSlot, itemId: EquipmentId, compact: boolean) {
  relic.rotation.set(0, 0, 0);
  if (slot === 'bow') {
    if (ADVENTURER_BOWS.has(itemId)) {
      relic.rotation.x = Math.PI / 2;
      relic.rotation.z = -0.22;
    } else {
      relic.rotation.y = -0.08;
      relic.rotation.z = -0.28;
    }
  } else if (slot === 'quiver') {
    relic.rotation.x = -0.08;
    relic.rotation.y = 0.18;
    relic.rotation.z = -0.12;
  } else {
    relic.rotation.x = itemId === 'frost-grimoire' ? -0.28 : -0.12;
    relic.rotation.y = 0.12;
    relic.rotation.z = itemId === 'blood-stone' ? -0.16 : 0;
  }
  if (!compact) relic.rotation.y += 0.06;
}

type Props = {
  assetPath: string;
  accent: string;
  itemId: EquipmentId;
  compact?: boolean;
};

export function KayKitEquipmentPreview({ assetPath, accent, itemId, compact = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let camera: any = null;
    let renderScene: (() => void) | null = null;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      const scene = new THREE.Scene();
      const item = EQUIPMENT[itemId];
      const slot = item.slot;
      const relicTier = !compact && HIGH_TIER.has(itemId);
      const width = Math.max(1, host.clientWidth || 120);
      const height = Math.max(1, host.clientHeight || 120);
      camera = new THREE.PerspectiveCamera(compact ? 31 : relicTier ? 34 : 38, width / height, 0.1, 40);
      camera.position.set(0, compact ? 0 : 0.1, compact ? 3.45 : relicTier ? 5.4 : 5.0);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1 : IS_ANDROID ? 1 : 1.15));
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = compact ? 1.3 : relicTier ? 1.22 : 1.1;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf5e6c8, 0x09080b, compact ? 1.9 : relicTier ? 1.55 : 1.35));
      const keyLight = new THREE.PointLight(accent, compact ? 4.2 : relicTier ? (IS_ANDROID ? 4.2 : 5.4) : 4.6, 9, 2);
      keyLight.position.set(1.5, 1.25, 2.2);
      scene.add(keyLight);
      const rimLight = relicTier ? new THREE.PointLight(accent, IS_ANDROID ? 2.4 : 3.2, 7, 2) : null;
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

      const accentMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending });
      const softMaterial = accentMaterial.clone();
      softMaterial.opacity = 0.14;
      const animated: any[] = [];
      const sparks: any[] = [];

      if (itemId === 'rune-quiver') {
        const quiverGltf = await loader.loadAsync(`${KAYKIT_ROOT}${RANGER_QUIVER}`);
        if (disposed) return;
        const quiver = quiverGltf.scene;
        prepareObject(quiver);
        fitObject(THREE, quiver, 1.5);
        quiver.position.set(-0.18, -0.04, 0);
        quiver.rotation.z = -0.14;
        relic.add(quiver);

        fitObject(THREE, object, 0.92);
        object.position.set(0.26, 0.16, 0.08);
        object.rotation.z = 0.16;
        relic.add(object);
      } else if (itemId === 'frost-grimoire') {
        const open = await loader.loadAsync(`${KAYKIT_ROOT}${OPEN_BOOK}`);
        if (disposed) return;
        const openBook = open.scene;
        prepareObject(openBook);
        relic.add(openBook);
      } else {
        relic.add(object);
      }

      fitObject(THREE, relic, compact ? compactTarget(slot, itemId) : itemId === 'hunter-bow' ? 2.05 : itemId === 'frost-grimoire' ? 1.55 : 1.35);
      frameItem(relic, slot, itemId, compact);

      if (relicTier) {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.018, IS_ANDROID ? 6 : 8, IS_ANDROID ? 28 : 48), softMaterial.clone());
        halo.rotation.x = Math.PI / 2;
        halo.position.y = -0.58;
        relic.add(halo);
        animated.push(halo);

        const sparkCount = IS_ANDROID ? 3 : 5;
        for (let index = 0; index < sparkCount; index++) {
          const spark = new THREE.Mesh(new THREE.SphereGeometry(0.018 + (index % 2) * 0.006, 5, 5), accentMaterial.clone());
          spark.userData.phase = index * 1.1;
          spark.userData.radius = 0.5 + (index % 3) * 0.12;
          relic.add(spark);
          sparks.push(spark);
        }
      }

      renderScene = () => renderer?.render(scene, camera);
      const resize = () => {
        if (!renderer || !camera) return;
        const nextWidth = Math.max(1, host.clientWidth || 120);
        const nextHeight = Math.max(1, host.clientHeight || 120);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
        renderScene?.();
      };

      const loop = () => {
        if (disposed || compact) return;
        const now = performance.now();
        relic.rotation.y += relicTier ? 0.0024 : 0.004;
        relic.position.y = relicTier ? Math.sin(now * 0.0017) * 0.035 : Math.sin(now * 0.0012) * 0.015;
        animated.forEach((node, index) => {
          node.rotation.y += 0.004 + index * 0.0006;
          node.rotation.z += index % 2 ? -0.0018 : 0.0018;
          if (node.material?.opacity !== undefined && node.material.transparent) node.material.opacity = 0.26 + Math.sin(now * 0.0032 + index) * 0.08;
        });
        sparks.forEach((spark, index) => {
          const phase = spark.userData.phase + now * 0.001;
          const radius = spark.userData.radius;
          spark.position.set(Math.cos(phase) * radius, -0.55 + ((phase * 0.25 + index * 0.14) % 1.1), Math.sin(phase) * radius * 0.4);
          spark.material.opacity = 0.26 + Math.sin(phase * 2.2) * 0.14;
        });
        keyLight.intensity = (relicTier ? (IS_ANDROID ? 3.8 : 5) : 4.2) + Math.sin(now * 0.0037) * 0.6;
        if (rimLight) rimLight.intensity = (IS_ANDROID ? 2.1 : 2.8) + Math.cos(now * 0.003) * 0.45;
        renderScene?.();
        raf = requestAnimationFrame(loop);
      };

      window.addEventListener('resize', resize);
      (host as any).__equipmentCleanup = () => window.removeEventListener('resize', resize);
      resize();
      if (compact) renderScene();
      else loop();
    };

    boot().catch(error => console.error('KayKit equipment preview failed', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (host as any).__equipmentCleanup?.();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, [assetPath, accent, itemId, compact]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
