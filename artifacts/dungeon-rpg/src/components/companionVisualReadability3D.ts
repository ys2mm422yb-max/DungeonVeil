import type { CompanionRoleV4 } from '../game/companionReserveV4';
import { COMPANION_DEFINITIONS_V5 } from '../game/companionCollectionV5';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const INSTALL_KEY = '__dungeonVeilCompanionReadabilityV5';

function roleAccent(role: unknown) {
  return COMPANION_DEFINITIONS_V5[role as CompanionRoleV4]?.accentHex ?? 0xb58cff;
}

function brightenMaterial(THREE: any, material: any, accent: number, nodeName: string) {
  if (!material || material.userData?.companionReadabilityV5) return;
  material.userData = { ...(material.userData ?? {}), companionReadabilityV5: true };
  const accentColor = new THREE.Color(accent);
  if (material.color?.isColor) {
    const base = material.color.clone();
    const mix = /Rune|Eye|Ember|Flame|Inner|Shard|Horn|Fist/i.test(nodeName) ? 0.5 : 0.24;
    material.color.copy(base.lerp(accentColor, mix));
    material.color.offsetHSL(0, 0.08, /RuneSentinel|DuskDrake|VeilLynx/i.test(nodeName) ? 0.12 : 0.08);
  }
  if (material.emissive?.isColor) {
    material.emissive.lerp(accentColor, 0.55);
    material.emissiveIntensity = Math.max(Number(material.emissiveIntensity) || 0, /Rune|Eye|Ember|Flame|Inner|Shard|Horn|Fist/i.test(nodeName) ? 1.45 : 0.62);
  }
  if ('roughness' in material) material.roughness = Math.min(Number(material.roughness) || 1, 0.68);
  material.needsUpdate = true;
}

function tuneCompanionRoot(THREE: any, root: any) {
  if (!root || root.userData?.companionReadabilityAppliedV5) return;
  const isCompanion = Boolean(root.userData?.dungeonVeilCompanionV5) || /^CompanionV5_/.test(String(root.name ?? ''));
  if (!isCompanion) return;
  root.userData = { ...(root.userData ?? {}), companionReadabilityAppliedV5: true };
  const role = root.userData.companionRole as CompanionRoleV4 | undefined;
  const accent = roleAccent(role);
  root.scale.multiplyScalar(IS_MOBILE ? 1.34 : 1.2);

  root.traverse?.((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.frustumCulled = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => brightenMaterial(THREE, material, accent, String(node.name ?? '')));
  });

  if (!root.getObjectByName?.('CompanionReadabilityLightV5')) {
    const light = new THREE.PointLight(accent, IS_MOBILE ? 1.45 : 2.1, IS_MOBILE ? 4.6 : 5.4, 2);
    light.name = 'CompanionReadabilityLightV5';
    light.position.set(0, 1.2, 0.28);
    light.userData.companionOnlyLight = true;
    root.add(light);
  }

  if (!root.getObjectByName?.('CompanionReadabilityCoreV5')) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.58, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    core.name = 'CompanionReadabilityCoreV5';
    core.position.set(0, 1.02, 0.12);
    core.onBeforeRender = () => {
      const pulse = 0.88 + Math.sin(performance.now() * 0.005) * 0.12;
      core.scale.setScalar(pulse);
      core.material.opacity = 0.48 + pulse * 0.12;
    };
    root.add(core);
  }
}

export function installCompanionVisualReadabilityV5() {
  if (typeof window === 'undefined') return;
  const state = window as typeof window & { [INSTALL_KEY]?: boolean };
  if (state[INSTALL_KEY]) return;
  state[INSTALL_KEY] = true;
  void import(/* @vite-ignore */ THREE_URL).then((THREE: any) => {
    const previousAdd = THREE.Object3D.prototype.add;
    if ((previousAdd as any).companionReadabilityV5) return;
    const patchedAdd = function companionReadabilityAdd(this: any, ...objects: any[]) {
      const result = previousAdd.apply(this, objects);
      for (const object of objects) tuneCompanionRoot(THREE, object);
      return result;
    };
    (patchedAdd as any).companionReadabilityV5 = true;
    THREE.Object3D.prototype.add = patchedAdd;
  }).catch(error => console.error('Companion readability runtime could not start', error));
}

installCompanionVisualReadabilityV5();
