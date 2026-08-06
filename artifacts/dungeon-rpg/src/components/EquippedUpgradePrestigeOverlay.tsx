import React, { useEffect, useMemo, useState } from 'react';
import { loadMetaProgression, type CurrentEquipmentSlot, type MetaProgression } from '../game/metaProgression';
import { getUpgradeVisualProfile, normalizeUpgradeVisualTier, type UpgradeVisualTier } from '../lib/upgradeVisualTiers';

const ACTIVE_SLOTS = ['bow', 'quiver', 'armor'] as const satisfies readonly CurrentEquipmentSlot[];

type ActiveEquipmentSlot = (typeof ACTIVE_SLOTS)[number];

type SlotTierMap = Readonly<Record<ActiveEquipmentSlot, UpgradeVisualTier>>;

const SLOT_ANCHORS: Readonly<Record<ActiveEquipmentSlot, string>> = Object.freeze({
  bow: 'left-[7%] top-[28%] h-[34%] w-[24%] -rotate-6',
  quiver: 'right-[7%] top-[25%] h-[38%] w-[20%] rotate-6',
  armor: 'left-1/2 top-[18%] h-[50%] w-[34%] -translate-x-1/2',
});

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function lowGpuMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.dungeonVeilLowGpu === '1'
    || document.documentElement.dataset.dungeonVeilRendererRecovery === '1';
}

export function resolveEquippedUpgradeTiers(meta: MetaProgression): SlotTierMap {
  return Object.freeze(ACTIVE_SLOTS.reduce((tiers, slot) => {
    const equipmentId = meta.equipped[slot];
    tiers[slot] = normalizeUpgradeVisualTier(Number(meta.owned[equipmentId]?.level ?? 1));
    return tiers;
  }, {} as Record<ActiveEquipmentSlot, UpgradeVisualTier>));
}

function SlotPrestigeEffect({
  slot,
  tier,
  reducedMotion,
  lowGpu,
}: {
  slot: ActiveEquipmentSlot;
  tier: UpgradeVisualTier;
  reducedMotion: boolean;
  lowGpu: boolean;
}) {
  const profile = useMemo(
    () => getUpgradeVisualProfile(tier, { reducedMotion, lowGpu }),
    [tier, reducedMotion, lowGpu],
  );

  if (tier < 3) return null;

  const glowOpacity = Math.max(0.12, profile.edgeGlow);
  const sparkCount = profile.particleDensity === 0 ? 0 : tier === 3 ? 2 : tier === 4 ? 4 : 6;
  const animationDuration = profile.lightSweepSpeed > 0 ? `${Math.max(4.8, 10 - profile.lightSweepSpeed * 20)}s` : '0s';

  return (
    <div
      data-testid={`equipped-upgrade-slot-${slot}`}
      data-equipment-slot={slot}
      data-upgrade-tier={tier}
      data-upgrade-prestige={profile.prestige}
      data-model-anchor={`equipped-${slot}`}
      data-static-fallback={profile.particleDensity === 0 ? 'true' : 'false'}
      className={`absolute ${SLOT_ANCHORS[slot]} overflow-hidden rounded-[42%] mix-blend-screen`}
      style={{
        opacity: glowOpacity,
        boxShadow: tier === 5
          ? 'inset 0 0 38px rgba(214,179,255,.48), inset 0 0 70px rgba(232,184,79,.3), 0 0 38px rgba(124,76,181,.22)'
          : tier === 4
            ? 'inset 0 0 32px rgba(229,187,85,.38), inset 0 0 56px rgba(137,83,190,.2)'
            : 'inset 0 0 26px rgba(218,207,175,.26)',
      }}
    >
      {profile.lightSweepSpeed > 0 && (
        <div
          data-testid={`equipped-upgrade-light-sweep-${slot}`}
          className="absolute -left-[60%] top-0 h-full w-[48%] rotate-[18deg] bg-[linear-gradient(90deg,transparent,rgba(255,229,174,.2),rgba(197,155,255,.2),transparent)] blur-xl"
          style={{ animation: `equipped-upgrade-sweep ${animationDuration} linear infinite` }}
        />
      )}
      {Array.from({ length: sparkCount }, (_, index) => (
        <span
          key={`${slot}-${index}`}
          data-testid={`equipped-upgrade-spark-${slot}`}
          className="absolute block rounded-full bg-amber-100 shadow-[0_0_8px_rgba(240,210,151,.8)]"
          style={{
            left: `${14 + ((index * 29) % 72)}%`,
            top: `${16 + ((index * 37) % 68)}%`,
            width: tier === 5 ? 3 : 2,
            height: tier === 5 ? 3 : 2,
            opacity: 0.48 + (index % 3) * 0.16,
            animation: `equipped-upgrade-spark ${Math.max(1.8, profile.particleIntervalMs / 1000)}s ease-in-out ${index * 0.22}s infinite`,
          }}
        />
      ))}
    </div>
  );
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

  const slotTiers = useMemo(() => resolveEquippedUpgradeTiers(meta), [meta]);
  if (ACTIVE_SLOTS.every((slot) => slotTiers[slot] < 3)) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="equipped-upgrade-prestige-overlay"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-low-gpu={lowGpu ? 'true' : 'false'}
      className="pointer-events-none fixed inset-0 z-[7] overflow-hidden"
    >
      {ACTIVE_SLOTS.map((slot) => (
        <SlotPrestigeEffect
          key={slot}
          slot={slot}
          tier={slotTiers[slot]}
          reducedMotion={reducedMotion}
          lowGpu={lowGpu}
        />
      ))}
      <style>{`
        @keyframes equipped-upgrade-sweep {
          0% { transform: translate3d(-140%, 0, 0) rotate(18deg); opacity: 0; }
          18% { opacity: .7; }
          72% { opacity: .45; }
          100% { transform: translate3d(360%, 0, 0) rotate(18deg); opacity: 0; }
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
