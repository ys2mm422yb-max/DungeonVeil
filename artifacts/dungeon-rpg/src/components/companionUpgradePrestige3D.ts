import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';

type MaterialBinding = {
  material: any;
  baseEmissive: any;
  baseEmissiveIntensity: number;
};

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
      dispose: () => clearRuntimeTelemetry(role),
    };
  }

  const movingProfile = getUpgradeVisualProfile(tier);
  const staticProfile = (() => {
    const staticFallback = true;
    return getUpgradeVisualProfile(tier, {
      reducedMotion: staticFallback,
      lowGpu: staticFallback,
    });
  })();
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

  const particleCount = tier === 5 ? 6 : tier === 4 ? 4 : 2;
  const particleCountLabel = String(particleCount);
  const particleGeometry = new THREE.OctahedronGeometry(tier === 5 ? 0.045 : 0.035, 0);
  const particleMaterial = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particleGroup = new THREE.Group();
  particleGroup.name = `CompanionUpgradePrestigeParticles_Tier${tier}`;
  particleGroup.visible = false;
  const particles: any[] = [];
  for (let index = 0; index < particleCount; index += 1) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.name = `CompanionUpgradePrestigeParticle_${index}`;
    particle.frustumCulled = false;
    particle.userData.dungeonVeilUpgradePhase = index / particleCount * Math.PI * 2;
    particleGroup.add(particle);
    particles.push(particle);
  }
  visual.add(particleGroup);

  const auraMaterial = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const aura = new THREE.Mesh(
    new THREE.RingGeometry(tier === 5 ? 0.62 : 0.54, tier === 5 ? 0.82 : 0.7, 28),
    auraMaterial,
  );
  aura.name = `CompanionUpgradePrestigeAura_Tier${tier}`;
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.075;
  aura.visible = tier >= 4;
  visual.add(aura);

  visual.userData.dungeonVeilUpgradeParticleCount = particleCount;
  publishRuntimeTelemetry(role, tierLabel, movingProfile.prestige, particleCountLabel, false, false);

  return {
    update(now: number, actionPulse: number) {
      const staticFallback = prefersReducedMotion() || rendererRecoveryActive();
      const profile = staticFallback ? staticProfile : movingProfile;
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
      particleGroup.visible = !staticFallback && profile.particleDensity > 0;
      particleMaterial.opacity = particleGroup.visible
        ? Math.min(0.78, 0.2 + profile.particleDensity * 0.68)
        : 0;
      if (particleGroup.visible) {
        for (const particle of particles) {
          const phase = Number(particle.userData.dungeonVeilUpgradePhase ?? 0);
          const orbit = now * (0.00022 + profile.lightSweepSpeed * 0.0008) + phase;
          const radius = 0.48 + Math.sin(phase * 1.7) * 0.12;
          particle.position.set(
            Math.cos(orbit) * radius,
            0.48 + (Math.sin(now * 0.00072 + phase) + 1) * 0.42,
            Math.sin(orbit) * radius,
          );
          particle.rotation.y = orbit;
          particle.scale.setScalar(0.72 + Math.sin(now * 0.0011 + phase) * 0.18);
        }
      }

      aura.visible = tier >= 4;
      auraMaterial.opacity = tier >= 4
        ? Math.min(tier === 5 ? 0.42 : 0.28, 0.12 + edgeGlow * 0.32)
        : 0;
      if (!staticFallback) aura.rotation.z = now * (tier === 5 ? 0.00022 : 0.00013);

      visual.userData.dungeonVeilUpgradePrestige = profile.prestige;
      visual.userData.dungeonVeilUpgradeStaticFallback = staticFallback;
      publishRuntimeTelemetry(
        role,
        tierLabel,
        profile.prestige,
        particleCountLabel,
        particleGroup.visible,
        staticFallback,
      );
    },
    dispose() {
      clearRuntimeTelemetry(role);
    },
  };
}
