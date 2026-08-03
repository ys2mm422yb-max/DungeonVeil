import React, { useEffect, useMemo, useState } from 'react';
import { loadMetaProgression, type CurrentEquipmentSlot, type MetaProgression } from '../game/metaProgression';
import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';

const ACTIVE_SLOTS: readonly CurrentEquipmentSlot[] = ['bow', 'quiver', 'armor'];

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function lowGpuMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.dungeonVeilLowGpu === '1'
    || document.documentElement.dataset.dungeonVeilRendererRecovery === '1';
}

function equippedTier(meta: MetaProgression): number {
  return ACTIVE_SLOTS.reduce((highest, slot) => {
    const equipmentId = meta.equipped[slot];
    const level = Number(meta.owned[equipmentId]?.level ?? 1);
    return Math.max(highest, level);
  }, 1);
}

export function EquippedUpgradePrestigeOverlay() {
  const [meta, setMeta] = useState(loadMetaProgression);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [lowGpu, setLowGpu] = useState(lowGpuMode);

  useEffect(() => {
    const refreshMeta = () => setMeta(loadMetaProgression());
    const refreshGpuMode = () => setLowGpu(lowGpuMode());
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refreshMotion = () => setReducedMotion(motion.matches);

    window.addEventListener('dungeon-veil-meta-changed', refreshMeta);
    window.addEventListener('dungeon-veil-renderer-lost', refreshGpuMode);
    window.addEventListener('dungeon-veil-renderer-ready', refreshGpuMode);
    motion.addEventListener?.('change', refreshMotion);
    refreshGpuMode();

    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', refreshMeta);
      window.removeEventListener('dungeon-veil-renderer-lost', refreshGpuMode);
      window.removeEventListener('dungeon-veil-renderer-ready', refreshGpuMode);
      motion.removeEventListener?.('change', refreshMotion);
    };
  }, []);

  const tier = normalizeUpgradeVisualTier(equippedTier(meta));
  const profile = useMemo(
    () => getUpgradeVisualProfile(tier, { reducedMotion, lowGpu }),
    [tier, reducedMotion, lowGpu],
  );

  if (tier < 3) return null;

  const glowOpacity = Math.max(0.12, profile.edgeGlow);
  const sparkCount = profile.particleDensity === 0 ? 0 : tier === 3 ? 3 : tier === 4 ? 5 : 7;
  const animationDuration = profile.lightSweepSpeed > 0 ? `${Math.max(4.8, 10 - profile.lightSweepSpeed * 20)}s` : '0s';

  return (
    <div
      aria-hidden="true"
      data-testid="equipped-upgrade-prestige-overlay"
      data-upgrade-tier={tier}
      data-upgrade-prestige={profile.prestige}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-low-gpu={lowGpu ? 'true' : 'false'}
      data-static-fallback={profile.particleDensity === 0 ? 'true' : 'false'}
      className="pointer-events-none fixed inset-0 z-[7] overflow-hidden"
    >
      <div
        data-testid="equipped-upgrade-edge-glow"
        className="absolute inset-[9%_8%_18%] rounded-[46%] mix-blend-screen"
        style={{
          opacity: glowOpacity,
          boxShadow: tier === 5
            ? 'inset 0 0 48px rgba(214,179,255,.42), inset 0 0 92px rgba(232,184,79,.24), 0 0 54px rgba(124,76,181,.18)'
            : tier === 4
              ? 'inset 0 0 42px rgba(229,187,85,.34), inset 0 0 76px rgba(137,83,190,.16)'
              : 'inset 0 0 34px rgba(218,207,175,.22)',
        }}
      />
      {profile.lightSweepSpeed > 0 && (
        <div
          data-testid="equipped-upgrade-light-sweep"
          className="absolute -left-[42%] top-[8%] h-[72%] w-[34%] rotate-[18deg] bg-[linear-gradient(90deg,transparent,rgba(255,229,174,.16),rgba(197,155,255,.18),transparent)] blur-2xl"
          style={{ animation: `equipped-upgrade-sweep ${animationDuration} linear infinite` }}
        />
      )}
      {Array.from({ length: sparkCount }, (_, index) => (
        <span
          key={index}
          data-testid="equipped-upgrade-spark"
          className="absolute block rounded-full bg-amber-100 shadow-[0_0_10px_rgba(240,210,151,.8)]"
          style={{
            left: `${18 + ((index * 23) % 67)}%`,
            top: `${20 + ((index * 31) % 58)}%`,
            width: tier === 5 ? 3 : 2,
            height: tier === 5 ? 3 : 2,
            opacity: 0.48 + (index % 3) * 0.16,
            animation: `equipped-upgrade-spark ${Math.max(1.8, profile.particleIntervalMs / 1000)}s ease-in-out ${index * 0.22}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes equipped-upgrade-sweep {
          0% { transform: translate3d(-35vw, 0, 0) rotate(18deg); opacity: 0; }
          18% { opacity: .7; }
          72% { opacity: .45; }
          100% { transform: translate3d(150vw, 0, 0) rotate(18deg); opacity: 0; }
        }
        @keyframes equipped-upgrade-spark {
          0%, 100% { transform: translate3d(0, 4px, 0) scale(.65); opacity: .12; }
          42% { transform: translate3d(0, -7px, 0) scale(1); opacity: .92; }
          62% { transform: translate3d(2px, -10px, 0) scale(.8); opacity: .38; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="equipped-upgrade-prestige-overlay"] * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
