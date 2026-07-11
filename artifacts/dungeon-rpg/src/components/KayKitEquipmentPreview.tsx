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

function applyFinalPose(display: any, itemId: EquipmentId) {
  display.rotation.set(0, 0, 0);
  if (BOWS.has(itemId)) {
    display.rotation.set(-0.08, -0.28, Math.PI / 2);
    return;
  }
  if (CROSSBOWS.has(itemId)) {
    // The stock runs along local Z. Turn it into the screen plane first so the
    // complete stock and both limbs are readable before any fitting happens.
    display.rotation.set(-0.26, -Math.PI / 2 + 0.16, -0.05);
    return;
  }
  if (QUIVERS.has(itemId)) {
    display.rotation.set(-0.08, -0.48, -0.14);
    return;
  }
  if (BOOKS.has(itemId)) {
    display.rotation.set(-0.68, -0.38, 0.06);
    return;
  }
  display.rotation.set(-0.08, -0.42, 0.12);
}

/**
 * Pose first, then compute the final screen-facing bounds. The previous preview
 * fitted the raw model and rotated afterwards, which shifted long crossbows out
 * of frame. This keeps a real 12-15% safety margin on every side.
 */
function fitPosedDisplay(THREE: any, display: any, itemId: EquipmentId, frameWidth: number, frameHeight: number) {
  display.scale.setScalar(1);
  display.position.set(0, 0, 0);
  applyFinalPose(display, itemId);
  display.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(display);
  const size = bounds.getSize(new THREE.Vector3());
  const targetWidth = frameWidth * (CROSSBOWS.has(itemId) ? 0.74 : 0.68);
  const targetHeight = frameHeight * (CROSSBOWS.has(itemId) ? 0.45 : BOOKS.has(itemId) ? 0.52 : 0.6);
  const scale = Math.min(
    targetWidth / Math.max(size.x, 0.001),
    targetHeight / Math.max(size.y, 0.001),
  );
  display.scale.setScalar(scale);
  display.updateMatrixWorld(true);

  const fittedBounds = new THREE.Box3().setFromObject(display);
  const center = fittedBounds.getCenter(new THREE.Vector3());
  display.position.sub(center);
  display.position.y += CROSSBOWS.has(itemId) ? 0.03 : -0.02;
  display.updateMatrixWorld(true);
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
    let display: any = null;
    let viewWidth = 1;
    let viewHeight = 1;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      const epic = EQUIPMENT[itemId]?.rarity === 'epic';
      const width = Math.max(1, host.clientWidth || 120);
      const height = Math.max(1, host.clientHeight || 120);
      viewHeight = epic ? 3.25 : 3.05;
      viewWidth = viewHeight * width / height;
      camera = new THREE.OrthographicCamera(-viewWidth / 2, viewWidth / 2, viewHeight / 2, -viewHeight / 2, 0.1, 30);
      camera.position.set(0, 0.05, 6);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_ANDROID ? 1 : 1.1));
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = epic ? 1.22 : 1.1;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xf5e6c8, 0x09080b, epic ? 1.55 : 1.35));
      const keyLight = new THREE.PointLight(accent, epic ? (IS_ANDROID ? 4.2 : 5.4) : 4.6, 9, 2);
      keyLight.position.set(1.5, 1.25, 2.2);
      scene.add(keyLight);
      const rimLight = epic ? new THREE.PointLight(accent, IS_ANDROID ? 2.4 : 3.2, 7, 2) : null;
      if (rimLight) {
        rimLight.position.set(-1.5, -0.4, -0.6);
        scene.add(rimLight);
      }

      const loader = new GLTFLoader();
      const primary = await loader.loadAsync(`${KAYKIT_ROOT}${assetPath}`);
      if (disposed) {
        disposeObject(primary.scene);
        return;
      }

      const relic = new THREE.Group();
      display = new THREE.Group();
      relic.add(display);
      scene.add(relic);

      let object = primary.scene;
      prepareObject(object);
      if (itemId === 'frost-grimoire') {
        const open = await loader.loadAsync(`${KAYKIT_ROOT}${OPEN_BOOK}`);
        if (disposed) {
          disposeObject(primary.scene);
          disposeObject(open.scene);
          return;
        }
        disposeObject(primary.scene);
        object = open.scene;
        prepareObject(object);
      }

      if (itemId === 'rune-quiver') {
        const quiverGltf = await loader.loadAsync(`${KAYKIT_ROOT}${RANGER_QUIVER}`);
        if (disposed) {
          disposeObject(object);
          disposeObject(quiverGltf.scene);
          return;
        }
        const quiver = quiverGltf.scene;
        prepareObject(quiver);
        quiver.position.set(-0.12, -0.06, 0);
        object.position.set(0.24, 0.16, 0.12);
        object.scale.setScalar(0.58);
        display.add(quiver);
        display.add(object);
      } else display.add(object);

      fitPosedDisplay(THREE, display, itemId, viewWidth, viewHeight);

      const generated: any[] = [];
      const accentMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending });
      if (epic) {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.018, IS_ANDROID ? 6 : 8, IS_ANDROID ? 28 : 48), accentMaterial.clone());
        halo.rotation.x = Math.PI / 2;
        halo.position.y = -0.7;
        relic.add(halo);
        generated.push(halo);
      }

      const resize = () => {
        if (!renderer || !camera || !display) return;
        const nextWidth = Math.max(1, host.clientWidth || 120);
        const nextHeight = Math.max(1, host.clientHeight || 120);
        viewHeight = epic ? 3.25 : 3.05;
        viewWidth = viewHeight * nextWidth / nextHeight;
        camera.left = -viewWidth / 2;
        camera.right = viewWidth / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
        fitPosedDisplay(THREE, display, itemId, viewWidth, viewHeight);
      };

      const loop = () => {
        if (disposed) return;
        const now = performance.now();
        // Crossbows never yaw: the readable final silhouette stays visible in every
        // frame. Other items get only a restrained display sway.
        relic.rotation.y = CROSSBOWS.has(itemId) ? 0 : Math.sin(now * 0.00075) * (epic ? 0.09 : 0.12);
        relic.rotation.x = CROSSBOWS.has(itemId) ? 0 : Math.sin(now * 0.0007) * 0.016;
        relic.position.y = Math.sin(now * 0.0015) * (CROSSBOWS.has(itemId) ? 0.012 : 0.022);
        generated.forEach((node, index) => {
          node.rotation.z += index % 2 ? -0.0018 : 0.0018;
          if (node.material?.opacity !== undefined) node.material.opacity = 0.22 + Math.sin(now * 0.0032 + index) * 0.07;
        });
        keyLight.intensity = (epic ? (IS_ANDROID ? 3.8 : 5) : 4.2) + Math.sin(now * 0.0037) * 0.45;
        if (rimLight) rimLight.intensity = (IS_ANDROID ? 2.1 : 2.8) + Math.cos(now * 0.003) * 0.35;
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
      scene?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
        else node.material?.dispose?.();
      });
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, [assetPath, accent, itemId]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
