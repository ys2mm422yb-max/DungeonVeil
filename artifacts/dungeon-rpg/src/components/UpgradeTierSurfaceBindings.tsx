import { useEffect } from 'react';
import { COMPANION_COLLECTION_EVENT, loadCompanionCollectionV5 } from '../game/companionCollectionV5';
import { EQUIPMENT, loadMetaProgression, type EquipmentId } from '../game/metaProgression';
import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';

const BOUND_CLASS = 'dungeon-veil-upgrade-bound-surface';
const STYLE_ID = 'dungeon-veil-upgrade-surface-style';
const EQUIPMENT_CARD_SELECTORS = [
  '[data-testid="equipment-model-preview"]',
  '[data-testid="equipment-upgrade-preview"]',
  '[data-testid^="equipment-card-"]',
  '[data-testid^="equipment-item-"]',
  '[data-testid^="inventory-item-"]',
].join(',');

function equipmentForSurface(surface: HTMLElement, meta: ReturnType<typeof loadMetaProgression>) {
  const testId = surface.dataset.testid ?? '';
  const direct = Object.keys(EQUIPMENT).find(id => testId.includes(id)) as EquipmentId | undefined;
  if (direct && meta.owned[direct]) return { id: direct, level: meta.owned[direct]?.level ?? 1 };

  const readable = surface.closest('section')?.textContent ?? surface.parentElement?.textContent ?? surface.textContent ?? '';
  const match = Object.values(EQUIPMENT).find(item => readable.includes(item.nameDe) || readable.includes(item.nameEn));
  if (!match) return null;
  return { id: match.id, level: meta.owned[match.id]?.level ?? 1 };
}

function clearSurface(surface: HTMLElement) {
  surface.classList.remove(BOUND_CLASS);
  delete surface.dataset.upgradeTier;
  delete surface.dataset.upgradePrestige;
  delete surface.dataset.upgradeStaticFallback;
  delete surface.dataset.upgradeBinding;
}

function bindSurface(surface: HTMLElement, level: number, binding: string, reducedMotion: boolean, rendererRecovery: boolean) {
  const tier = normalizeUpgradeVisualTier(level);
  if (tier < 3) {
    clearSurface(surface);
    return;
  }
  const profile = getUpgradeVisualProfile(tier, { reducedMotion, lowGpu: rendererRecovery });
  surface.classList.add(BOUND_CLASS);
  surface.dataset.upgradeTier = String(tier);
  surface.dataset.upgradePrestige = profile.prestige;
  surface.dataset.upgradeStaticFallback = profile.particleDensity === 0 ? 'true' : 'false';
  surface.dataset.upgradeBinding = binding;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${BOUND_CLASS} {
      position: relative;
      isolation: isolate;
      transition: box-shadow 180ms ease, filter 180ms ease;
    }
    .${BOUND_CLASS}[data-upgrade-tier="3"] {
      box-shadow: inset 0 0 0 1px rgba(167,139,250,.24), 0 0 18px rgba(139,92,246,.18);
    }
    .${BOUND_CLASS}[data-upgrade-tier="4"] {
      box-shadow: inset 0 0 0 1px rgba(216,180,254,.42), 0 0 24px rgba(168,85,247,.34), 0 0 38px rgba(245,158,11,.12);
    }
    .${BOUND_CLASS}[data-upgrade-tier="5"] {
      box-shadow: inset 0 0 0 1px rgba(254,240,138,.62), 0 0 30px rgba(245,158,11,.46), 0 0 52px rgba(168,85,247,.28);
    }
    .${BOUND_CLASS}[data-upgrade-tier="4"]::after,
    .${BOUND_CLASS}[data-upgrade-tier="5"]::after {
      content: '';
      pointer-events: none;
      position: absolute;
      inset: 0;
      z-index: 4;
      border-radius: inherit;
      background: linear-gradient(112deg, transparent 24%, rgba(255,255,255,.2) 46%, transparent 67%);
      transform: translateX(-135%);
      animation: dungeon-veil-upgrade-surface-sweep 5.4s linear infinite;
      mix-blend-mode: screen;
    }
    .${BOUND_CLASS}[data-upgrade-tier="5"]::after {
      background: linear-gradient(112deg, transparent 18%, rgba(254,240,138,.28) 43%, rgba(216,180,254,.22) 52%, transparent 72%);
      animation-duration: 3.8s;
    }
    .${BOUND_CLASS}[data-upgrade-static-fallback="true"]::after { display: none; }
    @keyframes dungeon-veil-upgrade-surface-sweep {
      0%, 42% { transform: translateX(-135%); opacity: 0; }
      50% { opacity: .72; }
      68%, 100% { transform: translateX(135%); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .${BOUND_CLASS} { transition: none; }
      .${BOUND_CLASS}::after { display: none !important; animation: none !important; }
    }
  `;
  document.head.append(style);
}

export function UpgradeTierSurfaceBindings() {
  useEffect(() => {
    installStyle();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rendererRecovery = document.documentElement.dataset.dungeonVeilRendererRecovery === 'true';
    let frame = 0;
    const touched = new Set<HTMLElement>();

    const apply = () => {
      frame = 0;
      const meta = loadMetaProgression();
      const collection = loadCompanionCollectionV5();
      const current = new Set<HTMLElement>();

      document.querySelectorAll<HTMLElement>(EQUIPMENT_CARD_SELECTORS).forEach(surface => {
        const resolved = equipmentForSurface(surface, meta);
        if (!resolved) return;
        bindSurface(surface, resolved.level, `equipment:${resolved.id}`, media.matches, rendererRecovery);
        current.add(surface);
      });

      document.querySelectorAll<HTMLElement>('[data-testid^="companion-role-"]').forEach(surface => {
        const role = (surface.dataset.testid ?? '').replace('companion-role-', '') as keyof typeof collection.companions;
        const progress = collection.companions[role];
        if (!progress) {
          clearSurface(surface);
          return;
        }
        bindSurface(surface, progress.level, `companion:${String(role)}`, media.matches, rendererRecovery);
        current.add(surface);
      });

      const activeSurface = document.querySelector<HTMLElement>('[data-testid="companion-active-role"]');
      if (activeSurface && collection.activeId) {
        const progress = collection.companions[collection.activeId];
        if (progress) {
          bindSurface(activeSurface, progress.level, `companion-active:${collection.activeId}`, media.matches, rendererRecovery);
          current.add(activeSurface);
        }
      }

      touched.forEach(surface => { if (!current.has(surface)) clearSurface(surface); });
      touched.clear();
      current.forEach(surface => touched.add(surface));
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };
    const lost = () => { rendererRecovery = true; schedule(); };
    const ready = () => { rendererRecovery = false; schedule(); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    media.addEventListener?.('change', schedule);
    window.addEventListener('dungeon-veil-meta-changed', schedule);
    window.addEventListener(COMPANION_COLLECTION_EVENT, schedule);
    window.addEventListener('dungeon-veil-cloud-save-restored', schedule);
    window.addEventListener('dungeon-veil-renderer-lost', lost);
    window.addEventListener('dungeon-veil-renderer-ready', ready);
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener?.('change', schedule);
      window.removeEventListener('dungeon-veil-meta-changed', schedule);
      window.removeEventListener(COMPANION_COLLECTION_EVENT, schedule);
      window.removeEventListener('dungeon-veil-cloud-save-restored', schedule);
      window.removeEventListener('dungeon-veil-renderer-lost', lost);
      window.removeEventListener('dungeon-veil-renderer-ready', ready);
      touched.forEach(clearSurface);
    };
  }, []);

  return null;
}
