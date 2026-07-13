const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const PATCH_FLAG = Symbol.for('dungeon-veil-worldboss-visual-runtime-patch');

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

function improveTextureClarity(renderer: any, scene: any) {
  const maxAnisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() ?? 1, 4);
  scene?.traverse?.((node: any) => {
    if (node.name === 'AshKingPerspectiveSeal') node.visible = false;
    if (node.parent?.name === 'AshKingDominanceAura' && node.geometry?.type === 'RingGeometry') node.visible = false;

    for (const material of materialList(node)) {
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
        const texture = material[key];
        if (!texture) continue;
        texture.anisotropy = maxAnisotropy;
        texture.needsUpdate = true;
      }
    }
  });
}

export function installWorldBossVisualRuntimePatch(): Promise<void> {
  if (installPromise) return installPromise;

  installPromise = (async () => {
    const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
    const rendererPrototype = THREE.WebGLRenderer?.prototype as any;
    if (!rendererPrototype || rendererPrototype[PATCH_FLAG]) return;

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
        improveTextureClarity(this, scene);
        scene.userData = { ...(scene.userData ?? {}), worldBossVisualRuntimePatched: true };
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
