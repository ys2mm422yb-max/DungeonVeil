import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';

export type VisibleUpgradePrestigeSlot = 'bow' | 'quiver' | 'armor' | 'companion';

export type VisibleUpgradePrestigeBinding3D = {
  tier: ReturnType<typeof normalizeUpgradeVisualTier>;
  update: (activityPulse?: number) => void;
  dispose: () => void;
};

type VisibleUpgradePrestigeOptions = {
  slot: VisibleUpgradePrestigeSlot;
  level: number;
  binding: string;
  accentHex?: number;
  reducedMotion?: boolean;
  lowGpu?: boolean;
};

type ActiveVisibleBinding = {
  slot: VisibleUpgradePrestigeSlot;
  tier: ReturnType<typeof normalizeUpgradeVisualTier>;
};

const ACTIVE_VISIBLE_BINDINGS = new Map<string, ActiveVisibleBinding>();
let visibleBindingSequence = 0;

function publishActiveBindings() {
  if (typeof document === 'undefined') return;
  const data = document.documentElement.dataset;
  const active = [...ACTIVE_VISIBLE_BINDINGS.values()];
  const slots = [...new Set(active.map(entry => entry.slot))].sort();
  data.dungeonVeilVisibleUpgradeBindingCount = String(active.length);
  data.dungeonVeilVisibleUpgradeSlots = slots.join(',');

  for (const slot of ['bow', 'quiver', 'armor', 'companion'] as const) {
    const tier = active
      .filter(entry => entry.slot === slot)
      .reduce((highest, entry) => Math.max(highest, entry.tier), 0);
    const key = `dungeonVeilVisibleUpgrade${slot[0].toUpperCase()}${slot.slice(1)}Tier`;
    if (tier > 0) data[key] = String(tier);
    else delete data[key];
  }
}

function registerVisibleBinding(key: string, slot: VisibleUpgradePrestigeSlot, tier: ReturnType<typeof normalizeUpgradeVisualTier>) {
  ACTIVE_VISIBLE_BINDINGS.set(key, { slot, tier });
  publishActiveBindings();
}

function unregisterVisibleBinding(key: string) {
  ACTIVE_VISIBLE_BINDINGS.delete(key);
  publishActiveBindings();
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function rendererRecoveryActive() {
  if (typeof document === 'undefined') return false;
  const data = document.documentElement.dataset;
  return data.dungeonVeilRendererRecovery === 'true'
    || data.dungeonVeilRendererRecovery === '1'
    || data.dungeonVeilLowGpu === 'true'
    || data.dungeonVeilLowGpu === '1';
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function defaultAccent(slot: VisibleUpgradePrestigeSlot, tier: number) {
  if (tier >= 5) {
    if (slot === 'bow') return 0xf6d778;
    if (slot === 'quiver') return 0xd8b4fe;
    if (slot === 'armor') return 0xffd6a3;
    return 0xc4b5fd;
  }
  if (tier === 4) {
    if (slot === 'bow') return 0xe9c8ff;
    if (slot === 'quiver') return 0xa5b4fc;
    if (slot === 'armor') return 0xc4a7ff;
    return 0xa78bfa;
  }
  if (slot === 'armor') return 0x9f8be8;
  if (slot === 'companion') return 0x8b5cf6;
  return 0x82b8e9;
}

function localBounds(THREE: any, object: any) {
  object.updateMatrixWorld?.(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const worldSize = bounds.getSize(new THREE.Vector3());
  const worldCenter = bounds.getCenter(new THREE.Vector3());
  const worldScale = object.getWorldScale?.(new THREE.Vector3()) ?? new THREE.Vector3(1, 1, 1);
  const center = object.worldToLocal?.(worldCenter.clone()) ?? new THREE.Vector3(0, 0.8, 0);
  const width = worldSize.x / Math.max(0.001, Math.abs(Number(worldScale.x) || 1));
  const height = worldSize.y / Math.max(0.001, Math.abs(Number(worldScale.y) || 1));
  const depth = worldSize.z / Math.max(0.001, Math.abs(Number(worldScale.z) || 1));
  return {
    center,
    width: clamp(width || 0.6, 0.18, 4),
    height: clamp(height || 1.2, 0.25, 6),
    depth: clamp(depth || 0.5, 0.12, 4),
  };
}

/**
 * Adds clearly visible but tightly model-bound prestige accents. The helper never
 * creates DOM overlays, screen-space shapes or whole-model material replacement.
 */
export function createVisibleUpgradePrestige3D(
  THREE: any,
  object: any,
  options: VisibleUpgradePrestigeOptions,
): VisibleUpgradePrestigeBinding3D {
  const tier = normalizeUpgradeVisualTier(options.level);
  const profile = getUpgradeVisualProfile(tier);
  const staticFallbackActive = () => (options.reducedMotion ?? prefersReducedMotion())
    || (options.lowGpu ?? rendererRecoveryActive());
  const registryKey = `${options.binding}:${String(object?.uuid ?? ++visibleBindingSequence)}`;

  object.userData = {
    ...(object.userData ?? {}),
    dungeonVeilVisibleUpgradeBinding: options.binding,
    dungeonVeilVisibleUpgradeSlot: options.slot,
    dungeonVeilVisibleUpgradeTier: tier,
    dungeonVeilVisibleUpgradePrestige: profile.prestige,
  };

  if (tier < 3) {
    return {
      tier,
      update: (_activityPulse = 0) => undefined,
      dispose: () => undefined,
    };
  }

  const color = options.accentHex ?? defaultAccent(options.slot, tier);
  const bounds = localBounds(THREE, object);
  const group = new THREE.Group();
  group.name = `DungeonVeilVisibleUpgrade_${options.slot}_Tier${tier}`;
  group.position.copy(bounds.center);

  if (options.slot === 'armor') group.position.y += bounds.height * 0.08;
  if (options.slot === 'companion') group.position.y += bounds.height * 0.12;

  const particleCount = tier === 5 ? 7 : tier === 4 ? 5 : 3;
  const particleSize = clamp(Math.min(bounds.width, bounds.height) * (tier === 5 ? 0.055 : 0.045), 0.018, 0.075);
  const particleGeometry = new THREE.OctahedronGeometry(particleSize, 0);
  const particleMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const particles: any[] = [];

  for (let index = 0; index < particleCount; index += 1) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.name = `DungeonVeilVisibleUpgradeParticle_${index}`;
    particle.frustumCulled = false;
    particle.userData.dungeonVeilUpgradePhase = index / particleCount * Math.PI * 2;
    group.add(particle);
    particles.push(particle);
  }

  const crestMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const crestGeometry = new THREE.OctahedronGeometry(particleSize * (tier === 5 ? 1.7 : 1.35), 0);
  const crest = new THREE.Mesh(crestGeometry, crestMaterial);
  crest.name = `DungeonVeilVisibleUpgradeCrest_${options.slot}_Tier${tier}`;
  crest.frustumCulled = false;
  group.add(crest);

  const lightAllowed = options.slot === 'bow' || options.slot === 'quiver' || options.slot === 'companion';
  const lightRange = clamp(Math.max(bounds.width, bounds.height, bounds.depth) * 1.15, 0.45, 2.2);
  const light = lightAllowed ? new THREE.PointLight(color, 0, lightRange, 2) : null;
  if (light) {
    light.name = `DungeonVeilVisibleUpgradeLight_${options.slot}_Tier${tier}`;
    light.position.set(0, options.slot === 'companion' ? bounds.height * 0.18 : 0, 0.02);
    light.castShadow = false;
    group.add(light);
  }

  object.add(group);
  object.userData.dungeonVeilVisibleUpgradeParticleCount = particleCount + 1;
  registerVisibleBinding(registryKey, options.slot, tier);

  const placeParticle = (particle: any, index: number, now: number, staticFallback: boolean) => {
    const phase = Number(particle.userData.dungeonVeilUpgradePhase ?? 0);
    const wave = staticFallback ? 0 : now * (0.0003 + profile.lightSweepSpeed * 0.0007);
    const orbit = wave + phase;

    if (options.slot === 'armor') {
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      particle.position.set(
        side * bounds.width * (0.22 + row * 0.035),
        bounds.height * (0.05 + row * 0.12) + (staticFallback ? 0 : Math.sin(orbit) * bounds.height * 0.018),
        bounds.depth * 0.24,
      );
      return;
    }

    if (options.slot === 'companion') {
      const radius = bounds.width * 0.36;
      particle.position.set(
        Math.cos(orbit) * radius,
        bounds.height * (0.34 + (index % 3) * 0.13) + (staticFallback ? 0 : Math.sin(orbit * 1.4) * bounds.height * 0.025),
        Math.sin(orbit) * bounds.depth * 0.35,
      );
      return;
    }

    const vertical = particleCount <= 1 ? 0 : index / (particleCount - 1) - 0.5;
    const radius = options.slot === 'bow' ? bounds.width * 0.18 : bounds.width * 0.28;
    particle.position.set(
      Math.cos(orbit) * radius,
      vertical * bounds.height * 0.86 + (staticFallback ? 0 : Math.sin(orbit * 1.35) * bounds.height * 0.035),
      Math.sin(orbit) * Math.max(bounds.depth * 0.35, particleSize * 1.5),
    );
  };

  const update = (activityPulse = 0) => {
    const staticFallback = staticFallbackActive();
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const normalizedActivity = clamp(activityPulse, 0, 1);
    const ambient = staticFallback
      ? 0
      : (Math.sin(now * (0.0012 + profile.lightSweepSpeed * 0.003)) + 1) * 0.5;
    const strength = clamp(
      (staticFallback ? profile.staticFallbackStrength : profile.edgeGlow)
        + ambient * profile.pulseStrength * 0.8
        + normalizedActivity * (tier === 5 ? 0.28 : 0.18),
      0,
      1.2,
    );

    group.visible = true;
    particleMaterial.opacity = clamp(
      0.24 + strength * 0.46,
      tier === 3 ? 0.28 : 0.34,
      tier === 5 ? 0.78 : tier === 4 ? 0.68 : 0.54,
    );
    crestMaterial.opacity = clamp(
      0.18 + strength * 0.42,
      tier === 3 ? 0.22 : 0.3,
      tier === 5 ? 0.72 : tier === 4 ? 0.6 : 0.44,
    );

    particles.forEach((particle, index) => {
      placeParticle(particle, index, now, staticFallback);
      const phase = Number(particle.userData.dungeonVeilUpgradePhase ?? 0);
      const pulse = staticFallback ? 0 : Math.sin(now * 0.0018 + phase) * 0.14;
      particle.scale.setScalar(0.92 + pulse + normalizedActivity * 0.1);
      particle.rotation.y = staticFallback ? phase : now * 0.0008 + phase;
    });

    if (options.slot === 'armor') {
      crest.position.set(0, bounds.height * 0.32, bounds.depth * 0.28);
    } else if (options.slot === 'companion') {
      crest.position.set(0, bounds.height * 0.62, 0);
    } else {
      crest.position.set(0, bounds.height * 0.48, 0);
    }
    const crestPulse = staticFallback ? 1 : 1 + Math.sin(now * 0.0015) * 0.08 + normalizedActivity * 0.12;
    crest.scale.setScalar(crestPulse);
    crest.rotation.y = staticFallback ? 0 : now * (tier === 5 ? 0.0009 : 0.00055);

    if (light) {
      const ceiling = options.slot === 'companion'
        ? (tier === 5 ? 0.48 : tier === 4 ? 0.36 : 0.26)
        : (tier === 5 ? 0.42 : tier === 4 ? 0.32 : 0.22);
      light.intensity = clamp(0.08 + strength * 0.36 + normalizedActivity * 0.08, 0.1, ceiling);
    }

    object.userData.dungeonVeilVisibleUpgradeStaticFallback = staticFallback;
    object.userData.dungeonVeilVisibleUpgradeStrength = Number(strength.toFixed(3));
  };

  update(0);

  return {
    tier,
    update,
    dispose() {
      unregisterVisibleBinding(registryKey);
      object.remove?.(group);
      particleGeometry.dispose?.();
      particleMaterial.dispose?.();
      crestGeometry.dispose?.();
      crestMaterial.dispose?.();
      delete object.userData.dungeonVeilVisibleUpgradeBinding;
      delete object.userData.dungeonVeilVisibleUpgradeSlot;
      delete object.userData.dungeonVeilVisibleUpgradeTier;
      delete object.userData.dungeonVeilVisibleUpgradePrestige;
      delete object.userData.dungeonVeilVisibleUpgradeParticleCount;
      delete object.userData.dungeonVeilVisibleUpgradeStaticFallback;
      delete object.userData.dungeonVeilVisibleUpgradeStrength;
    },
  };
}
