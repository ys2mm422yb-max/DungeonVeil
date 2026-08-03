import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';

type MaterialBinding = {
  material: any;
  baseEmissive: any;
  baseEmissiveIntensity: number;
};

type CompanionUpgradePrestigeBinding = {
  update: (now: number, actionPulse: number) => void;
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function rendererRecoveryActive() {
  return typeof document !== 'undefined'
    && document.documentElement.dataset.dungeonVeilRendererRecovery === 'true';
}

export function createCompanionUpgradePrestigeBinding(
  THREE: any,
  visual: any,
  level: number,
  accentHex: number,
): CompanionUpgradePrestigeBinding {
  const tier = normalizeUpgradeVisualTier(level);
  visual.userData.dungeonVeilUpgradeTier = tier;
  visual.userData.dungeonVeilUpgradeBinding = 'in-run-companion-combat-mesh';
  visual.userData.dungeonVeilUpgradeStaticFallback = false;

  if (tier < 3) return { update: () => undefined };

  const accentColor = new THREE.Color(accentHex);
  const materialBindings: MaterialBinding[] = [];

  visual.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    const cloneMaterial = (material: any) => {
      const clone = material?.clone?.();
      if (!clone) return material;
      clone.userData = {
        ...(clone.userData ?? {}),
        dungeonVeilUpgradeBinding: 'in-run-companion-combat-mesh',
        dungeonVeilUpgradeTier: tier,
      };
      materialBindings.push({
        material: clone,
        baseEmissive: clone.emissive?.clone?.() ?? null,
        baseEmissiveIntensity: Number(clone.emissiveIntensity ?? 0),
      });
      return clone;
    };
    node.material = Array.isArray(node.material)
      ? node.material.map(cloneMaterial)
      : cloneMaterial(node.material);
  });

  const light = new THREE.PointLight(
    accentHex,
    0,
    tier === 5 ? 3.6 : tier === 4 ? 3.0 : 2.4,
    2,
  );
  light.name = `CompanionUpgradePrestigeLight_Tier${tier}`;
  light.position.set(0, 1.05, 0.12);
  light.castShadow = false;
  visual.add(light);

  return {
    update(now: number, actionPulse: number) {
      const staticFallback = prefersReducedMotion() || rendererRecoveryActive();
      const profile = getUpgradeVisualProfile(tier, {
        reducedMotion: staticFallback,
        lowGpu: staticFallback,
      });
      const motionPulse = staticFallback
        ? 0
        : Math.sin(now * (0.0018 + profile.lightSweepSpeed * 0.006)) * profile.pulseStrength;
      const actionBoost = staticFallback ? 0 : actionPulse * profile.pulseStrength;
      const edgeGlow = Math.max(0, profile.edgeGlow + motionPulse + actionBoost);

      for (const binding of materialBindings) {
        const { material, baseEmissive, baseEmissiveIntensity } = binding;
        if (material.emissive?.copy && baseEmissive) {
          material.emissive.copy(baseEmissive);
          material.emissive.lerp(accentColor, Math.min(0.78, edgeGlow * 0.72));
          material.emissiveIntensity = baseEmissiveIntensity + edgeGlow;
        }
      }

      light.intensity = Math.min(1.45, 0.08 + edgeGlow * 0.86);
      visual.userData.dungeonVeilUpgradePrestige = profile.prestige;
      visual.userData.dungeonVeilUpgradeStaticFallback = staticFallback;
    },
  };
}
