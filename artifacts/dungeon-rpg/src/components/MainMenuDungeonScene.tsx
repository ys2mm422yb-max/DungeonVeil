import React, { useEffect, useState } from 'react';
import { loadMetaProgression } from '../game/metaProgression';
import { ModernVillageSquareScene } from './ModernVillageSquareScene';

export const SPECTATOR_RENDERER_EVENT = 'dungeon-veil-spectator-renderer';

function equippedKey() {
  const equipped = loadMetaProgression().equipped;
  return `${equipped.bow}:${equipped.quiver}:${equipped.talisman}`;
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
  return <ModernVillageSquareScene key={loadoutKey} />;
}
