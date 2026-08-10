const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const PATCH_FLAG = 'dungeonVeilCompanionLiveBoundsV5';

function isCompanionV5Root(object: any): boolean {
  return Boolean(object?.userData?.dungeonVeilCompanionV5)
    || /^CompanionV5_/.test(String(object?.name ?? ''));
}

function disposeDetachedVisual(node: any): void {
  node?.geometry?.dispose?.();
  const materials = Array.isArray(node?.material) ? node.material : [node?.material];
  materials.filter(Boolean).forEach((material: any) => material.dispose?.());
}

function compactLiveCompanion(root: any): void {
  root.traverse?.((node: any) => {
    if (node?.name !== 'DuskDrakeWing') return;
    node.scale.setScalar(0.66);
    node.position.x *= 0.72;
    node.userData = { ...(node.userData ?? {}), dungeonVeilCompanionBoundedWingV5: true };
  });

  const attackTrail = root.getObjectByName?.('CompanionV5AttackTrail');
  if (attackTrail?.parent) {
    attackTrail.parent.remove(attackTrail);
    disposeDetachedVisual(attackTrail);
    root.userData.dungeonVeilCompanionOversizedAttackTrailRemovedV5 = true;
  }
}

function protectAuthoredCompanion(root: any): void {
  if (!isCompanionV5Root(root)) return;

  root.userData = {
    ...(root.userData ?? {}),
    companionReadabilityAppliedV5: true,
    dungeonVeilCompanionAuthoredBoundsV5: true,
  };

  compactLiveCompanion(root);
}

export function installCompanionLiveBoundsRuntime(): void {
  if (typeof window === 'undefined') return;
  const globalWindow = window as typeof window & { __dungeonVeilCompanionLiveBoundsV5?: boolean };
  if (globalWindow.__dungeonVeilCompanionLiveBoundsV5) return;
  globalWindow.__dungeonVeilCompanionLiveBoundsV5 = true;

  void import(/* @vite-ignore */ THREE_URL).then((THREE: any) => {
    const currentAdd = THREE.Object3D.prototype.add as ((this: any, ...objects: any[]) => any) & { [PATCH_FLAG]?: boolean };
    if (currentAdd?.[PATCH_FLAG]) return;

    const boundedAdd = function(this: any, ...objects: any[]) {
      objects.forEach(protectAuthoredCompanion);
      return currentAdd.apply(this, objects);
    } as typeof currentAdd;
    boundedAdd[PATCH_FLAG] = true;
    THREE.Object3D.prototype.add = boundedAdd;
  }).catch(error => console.error('Companion live bounds runtime could not start', error));
}
