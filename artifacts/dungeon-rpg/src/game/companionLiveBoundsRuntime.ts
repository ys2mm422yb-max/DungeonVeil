const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const PATCH_FLAG = 'dungeonVeilCompanionLiveBoundsV5';

function isCompanionV5Root(object: any): boolean {
  return Boolean(object?.userData?.dungeonVeilCompanionV5)
    || /^CompanionV5_/.test(String(object?.name ?? ''));
}

function compactDuskDrake(root: any): void {
  root.traverse?.((node: any) => {
    if (node?.name === 'DuskDrakeWing') {
      node.scale.setScalar(0.66);
      node.position.x *= 0.72;
      node.userData = { ...(node.userData ?? {}), dungeonVeilCompanionBoundedWingV5: true };
    }
  });
}

function protectAuthoredCompanion(root: any): void {
  if (!isCompanionV5Root(root)) return;

  // The legacy readability hook runs through Object3D.add and used to multiply the
  // whole live companion root, recolor every material toward the role accent and
  // add an extra light/core. Mark the real rig as already handled before that hook
  // sees it so authored model scale/materials stay authoritative.
  root.userData = {
    ...(root.userData ?? {}),
    companionReadabilityAppliedV5: true,
    dungeonVeilCompanionAuthoredBoundsV5: true,
  };

  compactDuskDrake(root);
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
