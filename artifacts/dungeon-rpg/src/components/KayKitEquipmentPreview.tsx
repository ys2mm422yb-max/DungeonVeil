import React, { useEffect, useRef } from 'react';
import { EQUIPMENT, type EquipmentId } from '../game/metaProgression';
import { equipmentVisualProfile } from '../game/equipmentVisuals';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const KAYKIT_ROOT = '/assets/kaykit/';
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

function assetUrl(path: string) {
  return path.startsWith('/') ? path : `${KAYKIT_ROOT}${path}`;
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

async function loadVisual(loader: any, itemId: EquipmentId) {
  const visual = equipmentVisualProfile(itemId);
  try {
    return await loader.loadAsync(assetUrl(visual.primaryPath));
  } catch (primaryError) {
    if (visual.primaryPath === visual.fallbackPath) throw primaryError;
    return loader.loadAsync(assetUrl(visual.fallbackPath));
  }
}

function applyFinalPose(display: any, itemId: EquipmentId) {
  const visual = equipmentVisualProfile(itemId);
  display.rotation.set(...visual.rotation);
}

function fitPosedDisplay(THREE: any, display: any, itemId: EquipmentId, frameWidth: number, frameHeight: number) {
  const visual = equipmentVisualProfile(itemId);
  display.scale.setScalar(1);
  display.position.set(0, 0, 0);
  applyFinalPose(display, itemId);
  display.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(display);
  const size = bounds.getSize(new THREE.Vector3());
  const targetWidth = frameWidth * visual.fillWidth;
  const targetHeight = frameHeight * visual.fillHeight;
  const scale = Math.min(
    targetWidth / Math.max(size.x, 0.001),
    targetHeight / Math.max(size.y, 0.001),
  );
  display.scale.setScalar(scale);
  display.updateMatrixWorld(true);

  const fittedBounds = new THREE.Box3().setFromObject(display);
  const center = fittedBounds.getCenter(new THREE.Vector3());
  display.position.sub(center);
  display.position.y += visual.yOffset;
  display.updateMatrixWorld(true);
}

function addQuiverIdentity(THREE: any, display: any, itemId: EquipmentId, accent: string) {
  const material = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.55, metalness: itemId === 'warden-quiver' ? 0.65 : 0.18 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: itemId === 'black-quiver' ? 0x17131e : 0x4a3424, roughness: 0.8 });
  const arrowCount = itemId === 'splinter-quiver' ? 4 : itemId === 'rune-quiver' ? 3 : 5;

  for (let index = 0; index < arrowCount; index++) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 6), darkMaterial.clone());
    shaft.position.set((index - (arrowCount - 1) / 2) * 0.075, 0.32 + (index % 2) * 0.04, 0.07 + index * 0.006);
    shaft.rotation.z = (index - (arrowCount - 1) / 2) * 0.025;
    display.add(shaft);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), material.clone());
    tip.position.set(shaft.position.x, 0.86 + (index % 2) * 0.04, shaft.position.z);
    display.add(tip);
  }

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 6, 24), material.clone());
  band.rotation.x = Math.PI / 2;
  band.position.set(0, -0.08, 0.04);
  band.scale.x = 0.72;
  display.add(band);

  if (itemId === 'rune-quiver' || itemId === 'frost-quiver') {
    const rune = new THREE.Mesh(
      new THREE.RingGeometry(0.13, 0.19, 18),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    rune.position.set(0, -0.02, 0.28);
    display.add(rune);
  }
}

export function KayKitEquipmentPreview({ assetPath: _assetPath, accent, itemId }: { assetPath: string; accent: string; itemId: EquipmentId }) {
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
      const visual = equipmentVisualProfile(itemId);
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
      const loaded = await loadVisual(loader, itemId);
      if (disposed) {
        disposeObject(loaded.scene);
        return;
      }

      const relic = new THREE.Group();
      display = new THREE.Group();
      relic.add(display);
      scene.add(relic);

      const object = loaded.scene;
      prepareObject(object);
      display.add(object);
      if (visual.kind === 'quiver') addQuiverIdentity(THREE, display, itemId, accent);
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
        relic.rotation.y = visual.lockYaw ? 0 : Math.sin(now * 0.00075) * (epic ? 0.07 : 0.09);
        relic.rotation.x = visual.lockYaw ? 0 : Math.sin(now * 0.0007) * 0.012;
        relic.position.y = Math.sin(now * 0.0015) * (visual.kind === 'crossbow' ? 0.01 : 0.018);
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
  }, [accent, itemId]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
