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
    className="pointer-events-none absolute inset-0"
    style={{ transform: 'translate3d(0,-8%,0) scale(1.08)', transformOrigin: '50% 66%', filter: 'brightness(1.12)' }}
  >
    <ModernVillageSquareScene key={loadoutKey} />
  </div>;
}
