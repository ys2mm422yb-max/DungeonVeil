import React, { useEffect, useRef } from 'react';
import { EQUIPMENT, type EquipmentId } from '../game/metaProgression';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const KAYKIT_ROOT = '/assets/kaykit/';
const OPEN_BOOK = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/spellbook_open.gltf';
const RANGER_QUIVER = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf';
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

const BOWS = new Set<EquipmentId>(['ash-bow', 'ember-bow', 'hunter-bow', 'veil-bow', 'warden-bow']);
const CROSSBOWS = new Set<EquipmentId>(['frost-bow', 'splinter-bow']);
const QUIVERS = new Set<EquipmentId>(['ranger-quiver', 'black-quiver', 'rune-quiver', 'frost-quiver', 'splinter-quiver', 'warden-quiver']);
const BOOKS = new Set<EquipmentId>(['frost-grimoire', 'ritual-shard']);

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

function disposeObject(object: any) {
  object?.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

function poseObject(THREE: any, object: any, itemId: EquipmentId) {
  if (BOWS.has(itemId)) {
    fitObject(THREE, object, itemId === 'hunter-bow' ? 2.05 : 1.9);
    object.rotation.set(-0.06, -0.24, Math.PI / 2);
    object.position.y = 0.03;
    return;
  }
  if (CROSSBOWS.has(itemId)) {
    // The crossbow's long stock runs along local Z. A front-facing camera collapses
    // that length and makes the weapon look like a curved blade, so keep a stable
    // three-quarter pose that shows both stock and limbs.
    fitObject(THREE, object, itemId === 'splinter-bow' ? 1.9 : 1.8);
    object.rotation.set(-0.34, -0.96, -0.14);
    object.position.set(0, 0.01, 0.06);
    return;
  }
  if (QUIVERS.has(itemId)) {
    fitObject(THREE, object, 1.55);
    object.rotation.set(-0.08, -0.48, -0.14);
    object.position.y = -0.03;
    return;
  }
  if (BOOKS.has(itemId)) {
    fitObject(THREE, object, 1.48);
    object.rotation.set(-0.68, -0.38, 0.06);
    object.position.set(0, -0.02, 0.08);
    return;
  }
  fitObject(THREE, object, itemId === 'veil-key' ? 1.62 : 1.48);
  object.rotation.set(-0.08, -0.42, 0.12);
}

export function KayKitEquipmentPreview({ assetPath, accent, itemId }: { assetPath: string; accent: string; itemId: EquipmentId }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let camera: any = null;
    let scene: any = null;
    const loadedObjects: any[] = [];

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      const relicTier = EQUIPMENT[itemId]?.rarity === 'epic';
      const width = Math.max(1, host.clientWidth || 120);
      const height = Math.max(1, host.clientHeight || 120);
      camera = new THREE.PerspectiveCamera(relicTier ? 35 : 37, width / height, 0.1, 40);
      camera.position.set(0, 0.08, relicTier ? 5.25 : 4.85);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_ANDROID ? 1 : 1.1));
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = relicTier ? 1.22 : 1.1;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf5e6c8, 0x09080b, relicTier ? 1.55 : 1.35));
      const keyLight = new THREE.PointLight(accent, relicTier ? (IS_ANDROID ? 4.2 : 5.4) : 4.6, 9, 2);
      keyLight.position.set(1.5, 1.25, 2.2);
      scene.add(keyLight);
      const rimLight = relicTier ? new THREE.PointLight(accent, IS_ANDROID ? 2.4 : 3.2, 7, 2) : null;
      if (rimLight) {
        rimLight.position.set(-1.5, -0.4, -0.6);
        scene.add(rimLight);
      }

      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(`${KAYKIT_ROOT}${assetPath}`);
      if (disposed) {
        disposeObject(gltf.scene);
        return;
      }

      const relic = new THREE.Group();
      scene.add(relic);
      let object = gltf.scene;
      loadedObjects.push(object);
      prepareObject(object);

      const accentMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending });
      const softMaterial = accentMaterial.clone();
      softMaterial.opacity = 0.14;
      const animated: any[] = [];
      const sparks: any[] = [];

      if (itemId === 'rune-quiver') {
        const quiverGltf = await loader.loadAsync(`${KAYKIT_ROOT}${RANGER_QUIVER}`);
        if (disposed) {
          disposeObject(quiverGltf.scene);
          return;
        }
        const quiver = quiverGltf.scene;
        loadedObjects.push(quiver);
        prepareObject(quiver);
        fitObject(THREE, quiver, 1.55);
        quiver.position.set(-0.14, -0.05, 0);
        quiver.rotation.set(-0.08, -0.48, -0.14);
        relic.add(quiver);

        fitObject(THREE, object, 0.88);
        object.position.set(0.22, 0.16, 0.14);
        object.rotation.set(-0.08, -0.42, 0.18);
        relic.add(object);
      } else if (itemId === 'frost-grimoire') {
        const open = await loader.loadAsync(`${KAYKIT_ROOT}${OPEN_BOOK}`);
        if (disposed) {
          disposeObject(open.scene);
          return;
        }
        disposeObject(object);
        loadedObjects.splice(loadedObjects.indexOf(object), 1);
        object = open.scene;
        loadedObjects.push(object);
        prepareObject(object);
        poseObject(THREE, object, itemId);
        relic.add(object);
      } else {
        poseObject(THREE, object, itemId);
        relic.add(object);
      }

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

      const resize = () => {
        if (!renderer || !camera) return;
        const nextWidth = Math.max(1, host.clientWidth || 120);
        const nextHeight = Math.max(1, host.clientHeight || 120);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
      };

      const loop = () => {
        if (disposed) return;
        const now = performance.now();
        const sway = CROSSBOWS.has(itemId) ? 0.07 : relicTier ? 0.1 : 0.14;
        relic.rotation.y = Math.sin(now * 0.00075) * sway;
        relic.rotation.x = Math.sin(now * 0.0007) * (relicTier ? 0.014 : 0.022);
        relic.position.y = Math.sin(now * 0.0017) * 0.025;
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
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };

      window.addEventListener('resize', resize);
      (host as any).__equipmentCleanup = () => window.removeEventListener('resize', resize);
      resize();
      loop();
    };

    boot().catch(error => console.error('KayKit equipment preview failed', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (host as any).__equipmentCleanup?.();
      loadedObjects.forEach(disposeObject);
      scene?.traverse?.((node: any) => {
        if (node.geometry && !loadedObjects.includes(node)) node.geometry.dispose?.();
        if (node.material && !loadedObjects.includes(node)) {
          if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
          else node.material?.dispose?.();
        }
      });
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, [assetPath, accent, itemId]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
