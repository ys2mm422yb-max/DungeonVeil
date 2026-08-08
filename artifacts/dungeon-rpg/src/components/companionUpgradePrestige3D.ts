import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';
import { createVisibleUpgradePrestige3D } from './visibleUpgradePrestige3D';

type CompanionUpgradePrestigeBinding = {
  update: (now: number, actionPulse: number) => void;
  dispose: () => void;
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function rendererRecoveryActive() {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement.dataset;
  return root.dungeonVeilRendererRecovery === 'true'
    || root.dungeonVeilRendererRecovery === '1'
    || root.dungeonVeilLowGpu === 'true'
    || root.dungeonVeilLowGpu === '1';
}

function setTelemetryValue(data: DOMStringMap, key: string, value: string) {
  if (data[key] !== value) data[key] = value;
}

function publishRuntimeTelemetry(
  role: string,
  tierLabel: string | number,
  prestige: string,
  particleCountLabel: string | number,
  particlesActive: boolean,
  staticFallback: boolean,
) {
  if (typeof document === 'undefined') return;
  const data = document.documentElement.dataset;
  const normalizedTierLabel = typeof tierLabel === 'string' ? tierLabel : String(tierLabel);
  const normalizedParticleCount = typeof particleCountLabel === 'string'
    ? particleCountLabel
    : String(particleCountLabel);
  setTelemetryValue(data, 'dungeonVeilCompanionUpgradeBinding', 'in-run-companion-combat-mesh');
  setTelemetryValue(data, 'dungeonVeilCompanionUpgradeRole', role);
  setTelemetryValue(data, 'dungeonVeilCompanionUpgradeTier', normalizedTierLabel);
  setTelemetryValue(data, 'dungeonVeilCompanionUpgradePrestige', prestige);
  setTelemetryValue(data, 'dungeonVeilCompanionUpgradeParticleCount', normalizedParticleCount);
  setTelemetryValue(data, 'dungeonVeilCompanionUpgradeParticlesActive', particlesActive ? 'true' : 'false');
  setTelemetryValue(data, 'dungeonVeilCompanionUpgradeStaticFallback', staticFallback ? 'true' : 'false');
}

function clearRuntimeTelemetry(role: string) {
  if (typeof document === 'undefined') return;
  const data = document.documentElement.dataset;
  if (data.dungeonVeilCompanionUpgradeRole !== role) return;
  delete data.dungeonVeilCompanionUpgradeBinding;
  delete data.dungeonVeilCompanionUpgradeRole;
  delete data.dungeonVeilCompanionUpgradeTier;
  delete data.dungeonVeilCompanionUpgradePrestige;
  delete data.dungeonVeilCompanionUpgradeParticleCount;
  delete data.dungeonVeilCompanionUpgradeParticlesActive;
  delete data.dungeonVeilCompanionUpgradeStaticFallback;
}

function compactLiveCompanionPrestige(visual: any, tier: number) {
  const prestigeGroup = visual.children?.find((child: any) =>
    child?.name === `DungeonVeilVisibleUpgrade_companion_Tier${tier}`
  );
  if (!prestigeGroup) return;

  const groupScale = tier >= 5 ? 0.54 : tier === 4 ? 0.58 : 0.64;
  prestigeGroup.scale.setScalar(groupScale);
  if (!prestigeGroup.userData.dungeonVeilCombatBoundsApplied) {
    prestigeGroup.position.y *= 0.94;
    prestigeGroup.userData.dungeonVeilCombatBoundsApplied = true;
  }

  const crest = prestigeGroup.children?.find((child: any) =>
    String(child?.name ?? '').startsWith('DungeonVeilVisibleUpgradeCrest_companion_')
  );
  if (crest) crest.scale.setScalar(tier >= 5 ? 0.52 : tier === 4 ? 0.56 : 0.6);

  visual.userData.dungeonVeilUpgradeCombatScale = groupScale;
  visual.userData.dungeonVeilUpgradeCombatCrestScale = tier >= 5 ? 0.52 : tier === 4 ? 0.56 : 0.6;
}

export function createCompanionUpgradePrestigeBinding(
  THREE: any,
  visual: any,
  role: string,
  level: number,
  accentHex: number,
): CompanionUpgradePrestigeBinding {
  const tier = normalizeUpgradeVisualTier(level);
  const tierLabel = String(tier);
  visual.userData.dungeonVeilUpgradeTier = tier;
  visual.userData.dungeonVeilUpgradeBinding = 'in-run-companion-combat-mesh';
  visual.userData.dungeonVeilUpgradeStaticFallback = false;

  if (tier < 3) {
    publishRuntimeTelemetry(role, tier, 'none', 0, false, false);
    return {
      update: () => undefined,
      dispose() {
        clearRuntimeTelemetry(role);
        delete visual.userData.dungeonVeilUpgradeTier;
        delete visual.userData.dungeonVeilUpgradeBinding;
        delete visual.userData.dungeonVeilUpgradeStaticFallback;
      },
    };
  }

  const movingProfile = getUpgradeVisualProfile(tier);
  const staticProfile = getUpgradeVisualProfile(tier, {
    reducedMotion: true,
    lowGpu: true,
  });
  const visibleBinding = createVisibleUpgradePrestige3D(THREE, visual, {
    slot: 'companion',
    level: tier,
    binding: `visible:companion:${role}`,
    accentHex,
  });
  const particleCount = Number(visual.userData.dungeonVeilVisibleUpgradeParticleCount ?? 0);
  const particleCountLabel = String(particleCount);

  const update = (_now: number, actionPulse: number) => {
    const staticFallback = prefersReducedMotion() || rendererRecoveryActive();
    const profile = staticFallback ? staticProfile : movingProfile;
    visibleBinding.update(staticFallback ? 0 : actionPulse);
    compactLiveCompanionPrestige(visual, tier);

    visual.userData.dungeonVeilUpgradePrestige = profile.prestige;
    visual.userData.dungeonVeilUpgradeStaticFallback = staticFallback;
    visual.userData.dungeonVeilUpgradeParticleCount = particleCount;
    publishRuntimeTelemetry(
      role,
      tierLabel,
      profile.prestige,
      particleCountLabel,
      !staticFallback && particleCount > 0,
      staticFallback,
    );
  };

  update(0, 0);

  return {
    update,
    dispose() {
      visibleBinding.dispose();
      clearRuntimeTelemetry(role);
      delete visual.userData.dungeonVeilUpgradeTier;
      delete visual.userData.dungeonVeilUpgradeBinding;
      delete visual.userData.dungeonVeilUpgradePrestige;
      delete visual.userData.dungeonVeilUpgradeParticleCount;
      delete visual.userData.dungeonVeilUpgradeStaticFallback;
      delete visual.userData.dungeonVeilUpgradeCombatScale;
      delete visual.userData.dungeonVeilUpgradeCombatCrestScale;
    },
  };
}
