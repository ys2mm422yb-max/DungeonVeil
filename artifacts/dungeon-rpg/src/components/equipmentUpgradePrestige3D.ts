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

type MaterialState = {
  material: any;
  baseEmissive: any;
  baseIntensity: number;
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
  if (tier >= 5) return slot === 'armor' ? 0xf6d778 : 0xd8b4fe;
  if (tier === 4) return slot === 'armor' ? 0xc4a7ff : 0xb8a8ff;
  return slot === 'armor' ? 0x9f8be8 : 0x82b8e9;
}

function boundedStrength(profile: ReturnType<typeof getUpgradeVisualProfile>, staticFallback: boolean, activityPulse: number) {
  const edgeGlow = staticFallback ? profile.staticFallbackStrength : profile.edgeGlow;
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const ambientPulse = staticFallback || profile.pulseStrength === 0
    ? 0
    : Math.sin(now * (0.001 + profile.lightSweepSpeed * 0.0018)) * profile.pulseStrength * 0.42;
  const activityBoost = staticFallback
    ? 0
    : Math.max(0, Math.min(1, activityPulse)) * profile.pulseStrength * 0.45;
  return Math.max(0, edgeGlow * (0.42 + ambientPulse + activityBoost));
}

/**
 * Attaches a restrained prestige effect directly to one already-loaded equipment
 * object. Armor deliberately preserves the player's original materials and uses
 * only tiny model-local motes. Quiver effects remain bound to the actual quiver.
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
  const isArmor = options.slot === 'armor';

  if (isArmor) {
    const moteCount = tier === 5 ? 4 : tier === 4 ? 3 : 2;
    const moteGeometry = new THREE.OctahedronGeometry(tier === 5 ? 0.025 : 0.02, 0);
    const moteMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const moteGroup = new THREE.Group();
    moteGroup.name = `DungeonVeilArmorUpgradeMotes_Tier${tier}`;
    moteGroup.position.set(0, 0, 0);
    const motes: any[] = [];

    for (let index = 0; index < moteCount; index += 1) {
      const mote = new THREE.Mesh(moteGeometry, moteMaterial);
      mote.name = `DungeonVeilArmorUpgradeMote_${index}`;
      mote.frustumCulled = false;
      mote.userData.dungeonVeilUpgradePhase = index / moteCount * Math.PI * 2;
      moteGroup.add(mote);
      motes.push(mote);
    }
    object.add(moteGroup);

    const update = (activityPulse = 0) => {
      const staticFallback = staticFallbackActive();
      object.userData.dungeonVeilUpgradeStaticFallback = staticFallback;
      const strength = boundedStrength(profile, staticFallback, activityPulse);
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      moteGroup.visible = !staticFallback && profile.particleDensity > 0;
      moteMaterial.opacity = moteGroup.visible ? Math.min(0.34, 0.08 + strength * 0.32) : 0;

      for (const mote of motes) {
        const phase = Number(mote.userData.dungeonVeilUpgradePhase ?? 0);
        const orbit = now * 0.00028 + phase;
        const radius = 0.26 + (tier - 3) * 0.025;
        mote.position.set(
          Math.cos(orbit) * radius,
          0.78 + (Math.sin(now * 0.001 + phase) + 1) * 0.22,
          Math.sin(orbit) * radius * 0.58,
        );
        mote.scale.setScalar(0.72 + Math.sin(now * 0.0014 + phase) * 0.12);
      }
    };

    update(0);
    return { tier, update };
  }

  const accentColor = new THREE.Color(color);
  const materialStates: MaterialState[] = [];

  object.traverse?.((node: any) => {
    if ((!node.isMesh && !node.isSkinnedMesh) || !node.material) return;
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const clonedMaterials = sourceMaterials.map((material: any) => material?.clone?.() ?? material);
    node.material = Array.isArray(node.material) ? clonedMaterials : clonedMaterials[0];

    for (const material of clonedMaterials) {
      if (!material?.emissive?.copy) continue;
      materialStates.push({
        material,
        baseEmissive: material.emissive.clone?.() ?? null,
        baseIntensity: Number(material.emissiveIntensity ?? 0),
      });
      material.needsUpdate = true;
    }
  });

  const light = new THREE.PointLight(color, 0, 0.95, 2);
  light.name = 'DungeonVeilQuiverUpgradePrestige';
  light.position.set(0, 0.18, -0.02);
  light.castShadow = false;
  object.add(light);

  const update = (activityPulse = 0) => {
    const staticFallback = staticFallbackActive();
    object.userData.dungeonVeilUpgradeStaticFallback = staticFallback;
    const strength = boundedStrength(profile, staticFallback, activityPulse);
    const blend = Math.min(0.18, strength * 0.22);

    for (const state of materialStates) {
      if (state.baseEmissive && state.material.emissive?.copy) {
        state.material.emissive.copy(state.baseEmissive);
        state.material.emissive.lerp(accentColor, blend);
      }
      state.material.emissiveIntensity = state.baseIntensity + strength * 0.2;
    }
    light.intensity = Math.min(0.16, strength * 0.18);
  };

  update(0);
  return { tier, update };
}
