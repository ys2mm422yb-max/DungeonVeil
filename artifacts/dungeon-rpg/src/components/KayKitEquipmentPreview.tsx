import React, { useEffect, useRef } from 'react';
import type { EquipmentId } from '../game/metaProgression';
import { equipmentVisualProfile, type EquipmentVisualProfile } from '../game/equipmentVisuals';
import { appAssetUrl } from '../game/appAssetUrl';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IDLE_ANIMATION = 'animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

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

function clipKey(clip: any) {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function chooseIdleClip(clips: any[]) {
  return clips.find(clip => {
    const key = clipKey(clip);
    return key.includes('idle') && !['crouch', 'sit', 'sleep', 'aim', 'bow'].some(term => key.includes(term));
  }) ?? null;
}

function findBone(root: any, names: string[]) {
  let result: any = null;
  root.traverse((node: any) => {
    if (result) return;
    const key = String(node.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (names.some(name => key.includes(name))) result = node;
  });
  return result;
}

function applyFallbackReadyPose(root: any) {
  const upperArmL = findBone(root, ['upperarml', 'leftupperarm']);
  const lowerArmL = findBone(root, ['lowerarml', 'leftforearm']);
  const upperArmR = findBone(root, ['upperarmr', 'rightupperarm']);
  const lowerArmR = findBone(root, ['lowerarmr', 'rightforearm']);
  const chest = findBone(root, ['spine2', 'chest', 'spine1']);
  const head = findBone(root, ['head']);
  if (upperArmL) upperArmL.rotation.z -= 0.92;
  if (lowerArmL) lowerArmL.rotation.z -= 0.18;
  if (upperArmR) upperArmR.rotation.z += 0.92;
  if (lowerArmR) lowerArmR.rotation.z += 0.18;
  if (chest) chest.rotation.y += 0.08;
  if (head) head.rotation.y -= 0.05;
}

async function loadPrimary(loader: any, visual: EquipmentVisualProfile) {
  try {
    return await loader.loadAsync(assetUrl(visual.primaryPath));
  } catch (primaryError) {
    if (visual.primaryPath === visual.fallbackPath) throw primaryError;
    return loader.loadAsync(assetUrl(visual.fallbackPath));
  }
}

type BuiltDisplay = { display: any; mixer: any | null };

async function buildDisplay(THREE: any, loader: any, itemId: EquipmentId, accent: string): Promise<BuiltDisplay> {
  const visual = equipmentVisualProfile(itemId);
  const loaded = await loadPrimary(loader, visual);
  const display = new THREE.Group();
  const primary = loaded.scene;
  prepareObject(THREE, primary, accent, visual.tintStrength);
  display.add(primary);

  let mixer: any | null = null;
  if (visual.previewPose === 'idle-ready') {
    try {
      const animationGltf = await loader.loadAsync(assetUrl(IDLE_ANIMATION));
      const idleClip = chooseIdleClip([...(loaded.animations ?? []), ...(animationGltf.animations ?? [])]);
      if (idleClip) {
        mixer = new THREE.AnimationMixer(primary);
        mixer.clipAction(idleClip).reset().play();
        mixer.update(0.016);
      } else applyFallbackReadyPose(primary);
    } catch (error) {
      console.warn(`Armor idle animation failed for ${itemId}; using ready-pose fallback`, error);
      applyFallbackReadyPose(primary);
    }
  }

  if (visual.accessoryPath) {
    try {
      const accessoryLoaded = await loader.loadAsync(assetUrl(visual.accessoryPath));
      const accessory = accessoryLoaded.scene;
      prepareObject(THREE, accessory, accent, Math.min(0.65, visual.tintStrength + 0.18));
      accessory.position.set(...(visual.accessoryPosition ?? [0, 0, 0]));
      accessory.rotation.set(...(visual.accessoryRotation ?? [0, 0, 0]));
      accessory.scale.setScalar(visual.accessoryScale ?? 1);
      display.add(accessory);
    } catch (error) {
      console.warn(`Equipment accessory failed for ${itemId}`, error);
    }
  }

  return { display, mixer };
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
  mixer: any | null;
  width: number;
  height: number;
  loadToken: number;
  raf: number;
  lastFrame: number;
};

export function KayKitEquipmentPreview({ assetPath: _assetPath, accent, itemId }: { assetPath: string; accent: string; itemId: EquipmentId }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const propsRef = useRef({ accent, itemId });
  propsRef.current = { accent, itemId };
  const visual = equipmentVisualProfile(itemId);

  const renderCurrent = async (runtime: Runtime, nextItemId: EquipmentId, nextAccent: string) => {
    const token = ++runtime.loadToken;
    const built = await buildDisplay(runtime.THREE, runtime.loader, nextItemId, nextAccent);
    if (token !== runtime.loadToken) {
      built.mixer?.stopAllAction?.();
      disposeObject(built.display);
      return;
    }

    runtime.mixer?.stopAllAction?.();
    if (runtime.display) {
      runtime.root.remove(runtime.display);
      disposeObject(runtime.display);
    }
    runtime.display = built.display;
    runtime.mixer = built.mixer;
    runtime.root.add(built.display);
    fitDisplay(runtime.THREE, built.display, nextItemId, runtime.width, runtime.height);
    runtime.renderer.render(runtime.scene, runtime.camera);
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
        mixer: null,
        width: viewWidth,
        height: viewHeight,
        loadToken: 0,
        raf: 0,
        lastFrame: performance.now(),
      };
      runtimeRef.current = runtime;

      const animate = (time: number) => {
        if (disposed) return;
        runtime.raf = requestAnimationFrame(animate);
        if (time - runtime.lastFrame < 32) return;
        const delta = Math.min(0.05, Math.max(0, (time - runtime.lastFrame) / 1000));
        runtime.lastFrame = time;
        runtime.mixer?.update?.(delta);
        renderer.render(scene, camera);
      };
      runtime.raf = requestAnimationFrame(animate);

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

    boot().catch(error => console.error('KayKit equipment preview failed', error));

    return () => {
      disposed = true;
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      (host as any).__equipmentCleanup?.();
      if (runtime) {
        runtime.loadToken += 1;
        cancelAnimationFrame(runtime.raf);
        runtime.mixer?.stopAllAction?.();
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
    void renderCurrent(runtime, itemId, accent).catch(error => console.error('KayKit equipment preview update failed', error));
  }, [accent, itemId]);

  return <div
    ref={hostRef}
    className="h-full w-full overflow-hidden"
    data-equipment-preview-kind={visual.kind}
    data-equipment-preview-pose={visual.previewPose ?? 'static'}
    data-equipment-preview-model={visual.primaryPath}
  />;
}
