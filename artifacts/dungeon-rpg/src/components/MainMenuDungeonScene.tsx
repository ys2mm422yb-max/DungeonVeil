import React, { useEffect, useState } from 'react';
import { loadMetaProgression } from '../game/metaProgression';
import { MainMenuHeroFocusBridge } from './MainMenuHeroFocusBridge';
import { ModernVillageSquareScene } from './ModernVillageSquareScene';

export const SPECTATOR_RENDERER_EVENT = 'dungeon-veil-spectator-renderer';

function equippedKey() {
  const equipped = loadMetaProgression().equipped;
  return `${equipped.bow}:${equipped.quiver}:${equipped.armor}`;
}

export function MainMenuDungeonScene() {
  const [loadoutKey, setLoadoutKey] = useState(equippedKey);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    const refresh = () => setLoadoutKey(equippedKey());
    const handleSpectatorRenderer = (event: Event) => {
      setSuspended(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    };
    window.addEventListener('dungeon-veil-meta-changed', refresh);
    window.addEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', refresh);
      window.removeEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
    };
  }, []);

  if (suspended) return null;
  return <div
    data-testid="main-menu-scene-presentation"
    data-composition="raised-mobile-hero"
    data-hero-pair="ranger-and-veil-wolf"
    className="pointer-events-none absolute inset-0 overflow-hidden"
    style={{ transform: 'translate3d(0,0,0)' }}
  >
    <MainMenuHeroFocusBridge />
    <div
      className="absolute inset-0"
      style={{ transform: 'translate3d(0,10%,0) scale(1.3)', transformOrigin: '50% 84%', filter: 'brightness(1.18) contrast(1.04)' }}
    >
      <ModernVillageSquareScene key={loadoutKey} />
    </div>
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,2,7,.54)_0%,rgba(4,2,7,.2)_34%,transparent_58%,rgba(3,2,6,.12)_100%)]" />
    <div aria-hidden="true" className="absolute inset-x-[14%] top-[55%] h-[32%] rounded-full bg-violet-400/[.13] blur-[54px] mix-blend-screen" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_72%,transparent_0%,transparent_34%,rgba(2,1,4,.3)_78%,rgba(2,1,4,.62)_100%)]" />
  </div>;
}
