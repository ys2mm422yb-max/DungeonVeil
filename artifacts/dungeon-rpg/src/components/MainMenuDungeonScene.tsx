import React, { useEffect, useState } from 'react';
import { loadMetaProgression } from '../game/metaProgression';
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
  >
    <div
      className="absolute inset-0"
      style={{ transform: 'translate3d(0,1%,0) scale(1.3)', transformOrigin: '50% 84%', filter: 'brightness(1.18) contrast(1.04)' }}
    >
      <ModernVillageSquareScene key={loadoutKey} />
    </div>
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,2,7,.48)_0%,rgba(4,2,7,.14)_32%,transparent_55%,rgba(3,2,6,.18)_100%)]" />
    <div aria-hidden="true" className="absolute inset-x-[16%] top-[51%] h-[34%] rounded-full bg-violet-400/[.11] blur-[58px] mix-blend-screen" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_69%,transparent_0%,transparent_31%,rgba(2,1,4,.34)_78%,rgba(2,1,4,.66)_100%)]" />
  </div>;
}
