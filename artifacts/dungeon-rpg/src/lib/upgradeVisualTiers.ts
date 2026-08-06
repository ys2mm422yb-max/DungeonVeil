export type UpgradeVisualTier = 1 | 2 | 3 | 4 | 5;

export interface UpgradeVisualProfile {
  tier: UpgradeVisualTier;
  prestige: 'none' | 'refined' | 'strong' | 'maximum';
  edgeGlow: number;
  particleDensity: number;
  particleIntervalMs: number;
  pulseStrength: number;
  lightSweepSpeed: number;
  staticFallbackStrength: number;
}

const PROFILES: Readonly<Record<UpgradeVisualTier, UpgradeVisualProfile>> = Object.freeze({
  1: Object.freeze({
    tier: 1,
    prestige: 'none',
    edgeGlow: 0,
    particleDensity: 0,
    particleIntervalMs: 0,
    pulseStrength: 0,
    lightSweepSpeed: 0,
    staticFallbackStrength: 0,
  }),
  2: Object.freeze({
    tier: 2,
    prestige: 'none',
    edgeGlow: 0,
    particleDensity: 0,
    particleIntervalMs: 0,
    pulseStrength: 0,
    lightSweepSpeed: 0,
    staticFallbackStrength: 0,
  }),
  3: Object.freeze({
    tier: 3,
    prestige: 'refined',
    edgeGlow: 0.18,
    particleDensity: 0.18,
    particleIntervalMs: 2400,
    pulseStrength: 0,
    lightSweepSpeed: 0,
    staticFallbackStrength: 0.22,
  }),
  4: Object.freeze({
    tier: 4,
    prestige: 'strong',
    edgeGlow: 0.42,
    particleDensity: 0.38,
    particleIntervalMs: 1500,
    pulseStrength: 0.08,
    lightSweepSpeed: 0.12,
    staticFallbackStrength: 0.48,
  }),
  5: Object.freeze({
    tier: 5,
    prestige: 'maximum',
    edgeGlow: 0.72,
    particleDensity: 0.62,
    particleIntervalMs: 900,
    pulseStrength: 0.14,
    lightSweepSpeed: 0.2,
    staticFallbackStrength: 0.78,
  }),
});

export function normalizeUpgradeVisualTier(level: number): UpgradeVisualTier {
  if (!Number.isFinite(level)) return 1;
  return Math.min(5, Math.max(1, Math.trunc(level))) as UpgradeVisualTier;
}

export function getUpgradeVisualProfile(
  level: number,
  options: { reducedMotion?: boolean; lowGpu?: boolean } = {},
): UpgradeVisualProfile {
  const profile = PROFILES[normalizeUpgradeVisualTier(level)];

  if (!options.reducedMotion && !options.lowGpu) return profile;

  return Object.freeze({
    ...profile,
    particleDensity: 0,
    particleIntervalMs: 0,
    pulseStrength: 0,
    lightSweepSpeed: 0,
    edgeGlow: profile.staticFallbackStrength,
  });
}

export const UPGRADE_VISUAL_PROFILES = PROFILES;
