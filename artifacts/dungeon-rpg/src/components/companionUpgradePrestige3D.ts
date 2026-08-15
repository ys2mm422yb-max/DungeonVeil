import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';

type CompanionUpgradePrestigeBinding = {
  update: (now: number, actionPulse: number) => void;
  dispose: () => void;
};

type LiveCompanionPrestige = {
  particleCount: number;
  update: (actionPulse: number, staticFallback: boolean) => void;
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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function setTelemetryValue(data: DOMStringMap, key: string, value: string) {
  if (data[key] !== value) data[key] = value;
}

function publishSharedVisibleCompanionBinding(tier: number) {
  if (typeof document === 'undefined') return;
  const data = document.documentElement.dataset;
  const slots = new Set(String(data.dungeonVeilVisibleUpgradeSlots || '').split(',').filter(Boolean));
  if (tier >= 3) slots.add('companion');
  else slots.delete('companion');

  if (tier >= 3) data.dungeonVeilVisibleUpgradeCompanionTier = String(tier);
  else delete data.dungeonVeilVisibleUpgradeCompanionTier;

  const normalizedSlots = [...slots].sort();
  data.dungeonVeilVisibleUpgradeSlots = normalizedSlots.join(',');
  const currentCount = Math.max(0, Number(data.dungeonVeilVisibleUpgradeBindingCount || 0));
  data.dungeonVeilVisibleUpgradeBindingCount = String(
    tier >= 3 ? Math.max(currentCount, normalizedSlots.length) : Math.min(currentCount, normalizedSlots.length),
  );
}

function clearSharedVisibleCompanionBinding() {
  if (typeof document === 'undefined') return;
  const data = document.documentElement.dataset;
  const slots = String(data.dungeonVeilVisibleUpgradeSlots || '')
    .split(',')
    .filter(Boolean)
    .filter(slot => slot !== 'companion');
  delete data.dungeonVeilVisibleUpgradeCompanionTier;
  data.dungeonVeilVisibleUpgradeSlots = [...new Set(slots)].sort().join(',');
  const currentCount = Math.max(0, Number(data.dungeonVeilVisibleUpgradeBindingCount || 0));
  data.dungeonVeilVisibleUpgradeBindingCount = String(Math.min(currentCount, slots.length));
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
  publishSharedVisibleCompanionBinding(Number(normalizedTierLabel) || 0);
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
  clearSharedVisibleCompanionBinding();
}

function localBounds(THREE: any, object: any) {
  object.updateMatrixWorld?.(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const worldSize = bounds.getSize(new THREE.Vector3());
  const worldCenter = bounds.getCenter(new THREE.Vector3());
  const worldScale = object.getWorldScale?.(new THREE.Vector3()) ?? new THREE.Vector3(1, 1, 1);
  const center = object.worldToLocal?.(worldCenter.clone()) ?? new THREE.Vector3(0, 0.5, 0);
  return {
    center,
    width: clamp(worldSize.x / Math.max(0.001, Math.abs(Number(worldScale.x) || 1)) || 0.5, 0.18, 2.4),
    height: clamp(worldSize.y / Math.max(0.001, Math.abs(Number(worldScale.y) || 1)) || 0.8, 0.25, 3),
    depth: clamp(worldSize.z / Math.max(0.001, Math.abs(Number(worldScale.z) || 1)) || 0.4, 0.12, 2.4),
  };
}

function createLiveCompanionPrestige(
  THREE: any,
  visual: any,
  tier: number,
  accentHex: number,
): LiveCompanionPrestige {
  const bounds = localBounds(THREE, visual);
  const group = new THREE.Group();
  group.name = `DungeonVeilCompanionCombatPrestige_Tier${tier}`;
  group.position.copy(bounds.center);
  group.position.y += bounds.height * 0.02;

  const particleCount = tier >= 5 ? 7 : tier === 4 ? 5 : 3;
  const particleRadius = clamp(
    Math.min(bounds.width, bounds.height) * (tier >= 5 ? 0.034 : tier === 4 ? 0.029 : 0.024),
    0.012,
    0.038,
  );
  const sparkGeometry = new THREE.SphereGeometry(particleRadius, 8, 6);
  const primaryMaterial = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const premiumMaterial = tier >= 5
    ? new THREE.MeshBasicMaterial({
        color: 0xf4d58d,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      })
    : null;

  const sparks: any[] = [];
  for (let index = 0; index < particleCount; index += 1) {
    const material = premiumMaterial && index % 3 === 1 ? premiumMaterial : primaryMaterial;
    const spark = new THREE.Mesh(sparkGeometry, material);
    spark.name = `DungeonVeilCompanionCombatSpark_${tier}_${index}`;
    spark.frustumCulled = false;
    spark.userData.dungeonVeilCompanionSparkPhase = index / particleCount * Math.PI * 2;
    group.add(spark);
    sparks.push(spark);
  }

  const lightRange = clamp(Math.max(bounds.width, bounds.height) * 0.72, 0.34, 1.25);
  const light = new THREE.PointLight(accentHex, 0, lightRange, 2);
  light.name = `DungeonVeilCompanionCombatGlow_Tier${tier}`;
  light.position.set(0, bounds.height * 0.16, 0.01);
  light.castShadow = false;
  group.add(light);

  visual.add(group);
  visual.userData.dungeonVeilUpgradeCombatStyle = 'compact-body-sparks';
  visual.userData.dungeonVeilUpgradeCombatParticleCount = particleCount;
  visual.userData.dungeonVeilUpgradeCombatMaxRadius = Number((bounds.width * 0.18).toFixed(3));

  const update = (actionPulse: number, staticFallback: boolean) => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const normalizedActivity = clamp(actionPulse, 0, 1);
    const horizontalRadius = bounds.width * (tier >= 5 ? 0.18 : tier === 4 ? 0.155 : 0.13);
    const depthRadius = Math.max(bounds.depth * 0.13, particleRadius * 1.3);
    const baseOpacity = tier >= 5 ? 0.86 : tier === 4 ? 0.7 : 0.56;
    const activityOpacity = staticFallback
      ? 0
      : normalizedActivity * (tier >= 5 ? 0.2 : tier === 4 ? 0.15 : 0.1);

    sparks.forEach((spark, index) => {
      const phase = Number(spark.userData.dungeonVeilCompanionSparkPhase ?? 0);
      const motion = staticFallback ? phase : phase + now * (tier >= 5 ? 0.00115 : 0.00082);
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      const yRatio = 0.02 + row * (tier >= 5 ? 0.12 : 0.14);
      const drift = staticFallback ? 0 : Math.sin(motion * 1.7) * bounds.height * 0.018;
      spark.position.set(
        side * horizontalRadius * (0.48 + (index % 3) * 0.18),
        bounds.height * yRatio + drift,
        Math.sin(motion) * depthRadius,
      );
      const pulse = staticFallback ? 1 : 0.92 + Math.sin(motion * 1.35) * 0.08 + normalizedActivity * 0.08;
      spark.scale.setScalar(pulse);
      spark.material.opacity = clamp(baseOpacity + activityOpacity, 0.42, tier >= 5 ? 0.96 : tier === 4 ? 0.84 : 0.7);
    });

    light.intensity = clamp(
      (tier >= 5 ? 0.3 : tier === 4 ? 0.2 : 0.12) + normalizedActivity * 0.08,
      0.08,
      tier >= 5 ? 0.4 : tier === 4 ? 0.3 : 0.2,
    );
    group.visible = true;
  };

  update(0, prefersReducedMotion() || rendererRecoveryActive());

  return {
    particleCount,
    update,
    dispose() {
      visual.remove?.(group);
      sparkGeometry.dispose?.();
      primaryMaterial.dispose?.();
      premiumMaterial?.dispose?.();
      delete visual.userData.dungeonVeilUpgradeCombatStyle;
      delete visual.userData.dungeonVeilUpgradeCombatParticleCount;
      delete visual.userData.dungeonVeilUpgradeCombatMaxRadius;
    },
  };
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
  const livePrestige = createLiveCompanionPrestige(THREE, visual, tier, accentHex);
  const particleCount = livePrestige.particleCount;
  const particleCountLabel = String(particleCount);

  const update = (_now: number, actionPulse: number) => {
    const staticFallback = prefersReducedMotion() || rendererRecoveryActive();
    const profile = staticFallback ? staticProfile : movingProfile;
    livePrestige.update(staticFallback ? 0 : actionPulse, staticFallback);

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
      livePrestige.dispose();
      clearRuntimeTelemetry(role);
      delete visual.userData.dungeonVeilUpgradeTier;
      delete visual.userData.dungeonVeilUpgradeBinding;
      delete visual.userData.dungeonVeilUpgradePrestige;
      delete visual.userData.dungeonVeilUpgradeParticleCount;
      delete visual.userData.dungeonVeilUpgradeStaticFallback;
    },
  };
}
