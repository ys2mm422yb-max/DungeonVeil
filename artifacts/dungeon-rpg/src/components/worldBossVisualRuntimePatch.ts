const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const PATCH_FLAG = Symbol.for('dungeon-veil-worldboss-visual-runtime-patch');
const ADD_PATCH_FLAG = Symbol.for('dungeon-veil-worldboss-ring-add-patch');

let installPromise: Promise<void> | null = null;

function materialList(node: any): any[] {
  if (!node?.material) return [];
  return Array.isArray(node.material) ? node.material.filter(Boolean) : [node.material];
}

function isWorldBossRenderer(renderer: any) {
  const parent = renderer?.domElement?.parentElement as HTMLElement | null | undefined;
  return parent?.dataset?.testid === 'ash-king-perspective-stage';
}

function isWorldBossScene(scene: any) {
  return Boolean(
    scene?.getObjectByName?.('KayKitWorldBossPerspectiveRoom')
    || scene?.getObjectByName?.('AshKingPerspectiveSanctum'),
  );
}

function softenTelegraph(THREE: any, node: any) {
  if (!node || node.geometry?.type !== 'RingGeometry') return false;
  const oldGeometry = node.geometry;
  node.geometry = new THREE.CircleGeometry(1, 48);
  node.name = 'WorldBossSoftTelegraphRuntime';
  oldGeometry?.dispose?.();
  for (const material of materialList(node)) {
    material.color?.setHex?.(0xb55d32);
    material.opacity = Math.min(Number(material.opacity ?? 0), 0.14);
    material.blending = THREE.NormalBlending;
    material.depthWrite = false;
    material.transparent = true;
    material.needsUpdate = true;
  }
  return true;
}

function improveTextureClarity(THREE: any, renderer: any, scene: any) {
  const maxAnisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() ?? 1, 4);
  let softTelegraph = scene.userData?.worldBossSoftTelegraph ?? null;

  scene?.traverse?.((node: any) => {
    const ringGeometry = node.geometry?.type === 'RingGeometry';
    if (node.name === 'AshKingPerspectiveSeal') node.visible = false;
    if (node.parent?.name === 'AshKingDominanceAura' && ringGeometry) node.visible = false;

    if (ringGeometry && node.parent === scene && node.name !== 'AshKingPerspectiveSeal') {
      if (softenTelegraph(THREE, node)) softTelegraph = node;
    }

    for (const material of materialList(node)) {
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
        const texture = material[key];
        if (!texture) continue;
        texture.anisotropy = maxAnisotropy;
        texture.needsUpdate = true;
      }
    }
  });

  scene.userData = {
    ...(scene.userData ?? {}),
    worldBossSoftTelegraph: softTelegraph,
  };
}

export function installWorldBossVisualRuntimePatch(): Promise<void> {
  if (installPromise) return installPromise;

  installPromise = (async () => {
    const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
    const rendererPrototype = THREE.WebGLRenderer?.prototype as any;
    const objectPrototype = THREE.Object3D?.prototype as any;
    if (!rendererPrototype || !objectPrototype) return;

    if (!objectPrototype[ADD_PATCH_FLAG]) {
      objectPrototype[ADD_PATCH_FLAG] = true;
      const originalAdd = objectPrototype.add;
      objectPrototype.add = function patchedWorldBossAdd(...objects: any[]) {
        for (const object of objects) {
          const ringGeometry = object?.geometry?.type === 'RingGeometry';
          if (!ringGeometry) continue;

          if (this?.name === 'AshKingPerspectiveSanctum' || this?.name === 'AshKingDominanceAura') {
            object.visible = false;
            continue;
          }

          if (this?.isScene && isWorldBossScene(this) && softenTelegraph(THREE, object)) {
            this.userData = { ...(this.userData ?? {}), worldBossSoftTelegraph: object };
          }
        }
        return originalAdd.apply(this, objects);
      };
    }

    if (rendererPrototype[PATCH_FLAG]) return;
    rendererPrototype[PATCH_FLAG] = true;
    const originalRender = rendererPrototype.render;
    const originalSetPixelRatio = rendererPrototype.setPixelRatio;

    rendererPrototype.setPixelRatio = function patchedSetPixelRatio(value: number) {
      if (!isWorldBossRenderer(this)) return originalSetPixelRatio.call(this, value);
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      const deviceRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const improvedValue = isIOS && value >= 0.99 ? Math.min(deviceRatio, 1.3) : value;
      return originalSetPixelRatio.call(this, improvedValue);
    };

    rendererPrototype.render = function patchedWorldBossRender(scene: any, camera: any) {
      const worldBossScene = isWorldBossRenderer(this) && isWorldBossScene(scene);
      if (worldBossScene && !scene.userData?.worldBossVisualRuntimePatched) {
        improveTextureClarity(THREE, this, scene);
        scene.userData = { ...(scene.userData ?? {}), worldBossVisualRuntimePatched: true };
      }

      const telegraph = worldBossScene ? scene.userData?.worldBossSoftTelegraph : null;
      if (telegraph?.visible) {
        for (const material of materialList(telegraph)) {
          material.color?.setHex?.(0xb55d32);
          material.opacity = Math.min(Number(material.opacity ?? 0), 0.14);
          material.blending = THREE.NormalBlending;
          material.needsUpdate = true;
        }
      }

      if (worldBossScene && this?.domElement?.style) {
        this.domElement.style.filter = 'contrast(1.055) saturate(1.035)';
        this.domElement.style.imageRendering = 'auto';
      }
      return originalRender.call(this, scene, camera);
    };
  })();

  return installPromise;
}
