import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';

type EquipmentUpgradeSlot3D = 'armor' | 'quiver';

export type EquipmentUpgradeBinding3D = {
  tier: ReturnType<typeof normalizeUpgradeVisualTier>;
  update: (activityPulse?: number) => void;
};

type EquipmentUpgradeBindingOptions = {
  slot: EquipmentUpgradeSlot3D;
  level: number;
  binding: string;
  reducedMotion?: boolean;
  lowGpu?: boolean;
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function rendererRecoveryActive() {
  return typeof document !== 'undefined'
    && (document.documentElement.dataset.dungeonVeilLowGpu === '1'
      || document.documentElement.dataset.dungeonVeilRendererRecovery === '1');
}

function tierColor(slot: EquipmentUpgradeSlot3D, tier: number) {
  if (tier >= 5) return slot === 'armor' ? 0xfef08a : 0xe9d5ff;
  if (tier === 4) return slot === 'armor' ? 0xd8b4fe : 0xc4b5fd;
  return slot === 'armor' ? 0xa78bfa : 0x93c5fd;
}

/**
 * Attaches a bounded prestige effect directly to one already-loaded equipment
 * object. Levels one and two remain untouched: no material clone, light or
 * animation is created until the first visible prestige tier is reached.
 */
export function attachEquipmentUpgradePrestige3D(
  THREE: any,
  object: any,
  options: EquipmentUpgradeBindingOptions,
): EquipmentUpgradeBinding3D {
  const tier = normalizeUpgradeVisualTier(options.level);
  const profile = getUpgradeVisualProfile(tier);
  const staticFallbackActive = () => (options.reducedMotion ?? prefersReducedMotion())
    || (options.lowGpu ?? rendererRecoveryActive());

  object.userData = {
    ...(object.userData ?? {}),
    dungeonVeilUpgradeBinding: options.binding,
    dungeonVeilUpgradeSlot: options.slot,
    dungeonVeilUpgradeTier: tier,
    dungeonVeilUpgradePrestige: profile.prestige,
    dungeonVeilUpgradeStaticFallback: staticFallbackActive(),
  };

  if (tier < 3) {
    return { tier, update: (_activityPulse = 0) => undefined };
  }

  const color = tierColor(options.slot, tier);
  const materialStates: Array<{ material: any; baseIntensity: number }> = [];

  object.traverse?.((node: any) => {
    if ((!node.isMesh && !node.isSkinnedMesh) || !node.material) return;
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const clonedMaterials = sourceMaterials.map((material: any) => material?.clone?.() ?? material);
    node.material = Array.isArray(node.material) ? clonedMaterials : clonedMaterials[0];

    for (const material of clonedMaterials) {
      if (!material?.emissive?.setHex) continue;
      const baseIntensity = Number(material.emissiveIntensity ?? 0);
      material.emissive.setHex(color);
      material.emissiveIntensity = baseIntensity + profile.edgeGlow * 0.52;
      material.needsUpdate = true;
      materialStates.push({ material, baseIntensity });
    }
  });

  const isArmor = options.slot === 'armor';
  const light = new THREE.PointLight(
    color,
    0.1 + profile.edgeGlow * (isArmor ? 0.5 : 0.38),
    isArmor ? (tier === 5 ? 2.8 : 2.25) : (tier === 5 ? 1.75 : 1.35),
    2,
  );
  light.name = isArmor ? 'DungeonVeilArmorUpgradePrestige' : 'DungeonVeilQuiverUpgradePrestige';
  light.position.set(0, isArmor ? 0.92 : 0.12, isArmor ? 0.08 : -0.02);
  object.add(light);

  const update = (activityPulse = 0) => {
    const staticFallback = staticFallbackActive();
    object.userData.dungeonVeilUpgradeStaticFallback = staticFallback;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const edgeGlow = staticFallback ? profile.staticFallbackStrength : profile.edgeGlow;
    const ambientPulse = staticFallback || profile.pulseStrength === 0
      ? 0
      : Math.sin(now * (0.0013 + profile.lightSweepSpeed * 0.0024)) * profile.pulseStrength;
    const activityBoost = staticFallback
      ? 0
      : Math.max(0, Math.min(1, activityPulse)) * profile.pulseStrength * (isArmor ? 0.78 : 0.56);
    const strength = edgeGlow * Math.max(0.56, 0.76 + ambientPulse + activityBoost);

    for (const state of materialStates) {
      state.material.emissiveIntensity = state.baseIntensity + strength;
    }
    light.intensity = 0.08 + strength * (isArmor ? 0.82 : 0.64);
  };

  update(0);
  return { tier, update };
}
