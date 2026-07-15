import React, { useEffect, useRef } from 'react';
import type { EquipmentId } from '../game/metaProgression';
import { equipmentVisualProfile, type EquipmentVisualProfile } from '../game/equipmentVisuals';
import { appAssetUrl } from '../game/appAssetUrl';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

class PreviewLoadCancelled extends Error {
  constructor() {
    super('Equipment preview load cancelled');
    this.name = 'PreviewLoadCancelled';
  }
}

function isPreviewLoadCancelled(error: unknown): error is PreviewLoadCancelled {
  return error instanceof PreviewLoadCancelled;
}

function assetUrl(path: string) {
  return appAssetUrl(path.startsWith('/') ? path : `assets/kaykit/${path}`);
}

function disposeObject(object: any) {
  object?.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

function prepareObject(THREE: any, object: any, accent: string, strength: number) {
  const tint = new THREE.Color(accent);
  object.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    node.frustumCulled = true;
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const materials = sourceMaterials.map((material: any) => {
      const clone = material?.clone?.() ?? material;
      if (clone?.color?.lerp) clone.color.lerp(tint, strength);
      if (clone?.emissive?.set) {
        clone.emissive.set(accent);
        clone.emissiveIntensity = Math.min(0.18, strength * 0.35);
      }
      if (clone && 'roughness' in clone) clone.roughness = Math.max(0.5, clone.roughness ?? 0.7);
      return clone;
    });
    node.material = Array.isArray(node.material) ? materials : materials[0];
  });
}

async function loadPrimary(loader: any, visual: EquipmentVisualProfile, isActive: () => boolean) {
  try {
    const loaded = await loader.loadAsync(assetUrl(visual.primaryPath));
    if (!isActive()) {
      disposeObject(loaded.scene);
      throw new PreviewLoadCancelled();
    }
    return loaded;
  } catch (primaryError) {
    if (!isActive()) throw new PreviewLoadCancelled();
    if (visual.primaryPath === visual.fallbackPath) throw primaryError;
    const fallback = await loader.loadAsync(assetUrl(visual.fallbackPath));
    if (!isActive()) {
      disposeObject(fallback.scene);
      throw new PreviewLoadCancelled();
    }
    return fallback;
  }
}

async function buildDisplay(THREE: any, loader: any, itemId: EquipmentId, accent: string, isActive: () => boolean) {
  const visual = equipmentVisualProfile(itemId);
  const loaded = await loadPrimary(loader, visual, isActive);
  if (!isActive()) {
    disposeObject(loaded.scene);
    throw new PreviewLoadCancelled();
  }

  const display = new THREE.Group();
  const primary = loaded.scene;
  prepareObject(THREE, primary, accent, visual.tintStrength);
  display.add(primary);

  if (visual.accessoryPath) {
    try {
      const accessoryLoaded = await loader.loadAsync(assetUrl(visual.accessoryPath));
      if (!isActive()) {
        disposeObject(accessoryLoaded.scene);
        disposeObject(display);
        throw new PreviewLoadCancelled();
      }
      const accessory = accessoryLoaded.scene;
      prepareObject(THREE, accessory, accent, Math.min(0.65, visual.tintStrength + 0.18));
      accessory.position.set(...(visual.accessoryPosition ?? [0, 0, 0]));
      accessory.rotation.set(...(visual.accessoryRotation ?? [0, 0, 0]));
      accessory.scale.setScalar(visual.accessoryScale ?? 1);
      display.add(accessory);
    } catch (error) {
      if (!isActive() || isPreviewLoadCancelled(error)) {
        disposeObject(display);
        throw new PreviewLoadCancelled();
      }
      console.warn(`Equipment accessory failed for ${itemId}`, error);
    }
  }

  return display;
}

function fitDisplay(THREE: any, display: any, itemId: EquipmentId, frameWidth: number, frameHeight: number) {
  const visual = equipmentVisualProfile(itemId);
  display.scale.setScalar(1);
  display.position.set(0, 0, 0);
  display.rotation.set(...visual.rotation);
  display.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(display);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = Math.min(
    frameWidth * visual.fillWidth / Math.max(size.x, 0.001),
    frameHeight * visual.fillHeight / Math.max(size.y, 0.001),
  );
  display.scale.setScalar(scale);
  display.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(display);
  const center = fitted.getCenter(new THREE.Vector3());
  display.position.sub(center);
  display.position.y += visual.yOffset;
  display.updateMatrixWorld(true);
}

type Runtime = {
  THREE: any;
  loader: any;
  renderer: any;
  scene: any;
  camera: any;
  root: any;
  display: any | null;
  width: number;
  height: number;
  loadToken: number;
};

export function KayKitEquipmentPreview({ assetPath: _assetPath, accent, itemId }: { assetPath: string; accent: string; itemId: EquipmentId }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const propsRef = useRef({ accent, itemId });
  propsRef.current = { accent, itemId };

  const renderCurrent = async (runtime: Runtime, nextItemId: EquipmentId, nextAccent: string) => {
    const token = ++runtime.loadToken;
    const isActive = () => token === runtime.loadToken;
    try {
      const nextDisplay = await buildDisplay(runtime.THREE, runtime.loader, nextItemId, nextAccent, isActive);
      if (!isActive()) {
        disposeObject(nextDisplay);
        return;
      }

      if (runtime.display) {
        runtime.root.remove(runtime.display);
        disposeObject(runtime.display);
      }
      runtime.display = nextDisplay;
      runtime.root.add(nextDisplay);
      fitDisplay(runtime.THREE, nextDisplay, nextItemId, runtime.width, runtime.height);
      runtime.renderer.render(runtime.scene, runtime.camera);
    } catch (error) {
      if (isPreviewLoadCancelled(error) || !isActive()) return;
      throw error;
    }
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      const scene = new THREE.Scene();
      const root = new THREE.Group();
      scene.add(root);

      const width = Math.max(1, host.clientWidth || 120);
      const height = Math.max(1, host.clientHeight || 120);
      const viewHeight = 3.05;
      const viewWidth = viewHeight * width / height;
      const camera = new THREE.OrthographicCamera(-viewWidth / 2, viewWidth / 2, viewHeight / 2, -viewHeight / 2, 0.1, 30);
      camera.position.set(0, 0.08, 6);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.08));
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xfff1d4, 0x17131d, 1.8));
      const key = new THREE.DirectionalLight(0xffffff, 2.35);
      key.position.set(2.4, 3.2, 4.5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xb69aff, 1.2);
      fill.position.set(-2.6, -0.4, 3.2);
      scene.add(fill);

      const runtime: Runtime = {
        THREE,
        loader: new GLTFLoader(),
        renderer,
        scene,
        camera,
        root,
        display: null,
        width: viewWidth,
        height: viewHeight,
        loadToken: 0,
      };
      runtimeRef.current = runtime;

      const resize = () => {
        const nextWidth = Math.max(1, host.clientWidth || 120);
        const nextHeight = Math.max(1, host.clientHeight || 120);
        runtime.width = viewHeight * nextWidth / nextHeight;
        runtime.height = viewHeight;
        camera.left = -runtime.width / 2;
        camera.right = runtime.width / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
        if (runtime.display) fitDisplay(THREE, runtime.display, propsRef.current.itemId, runtime.width, runtime.height);
        renderer.render(scene, camera);
      };

      window.addEventListener('resize', resize);
      (host as any).__equipmentCleanup = () => window.removeEventListener('resize', resize);
      const current = propsRef.current;
      await renderCurrent(runtime, current.itemId, current.accent);
    };

    boot().catch(error => {
      if (!disposed && !isPreviewLoadCancelled(error)) console.error('KayKit equipment preview failed', error);
    });

    return () => {
      disposed = true;
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      (host as any).__equipmentCleanup?.();
      if (runtime) {
        runtime.loadToken += 1;
        if (runtime.display) disposeObject(runtime.display);
        runtime.scene?.traverse?.((node: any) => {
          if (node === runtime.display) return;
          node.geometry?.dispose?.();
          if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
          else node.material?.dispose?.();
        });
        runtime.renderer?.dispose?.();
        runtime.renderer?.domElement?.remove?.();
      }
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    void renderCurrent(runtime, itemId, accent).catch(error => {
      if (runtimeRef.current === runtime && !isPreviewLoadCancelled(error)) console.error('KayKit equipment preview update failed', error);
    });
  }, [accent, itemId]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
