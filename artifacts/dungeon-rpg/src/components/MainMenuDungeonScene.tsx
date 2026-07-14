import React, { useEffect, useState } from 'react';
import { loadMetaProgression } from '../game/metaProgression';
import { ModernVillageSquareScene } from './ModernVillageSquareScene';

function equippedKey() {
  const equipped = loadMetaProgression().equipped;
  return `${equipped.bow}:${equipped.quiver}:${equipped.talisman}`;
}

export function MainMenuDungeonScene() {
  const [loadoutKey, setLoadoutKey] = useState(equippedKey);

  useEffect(() => {
    const refresh = () => setLoadoutKey(equippedKey());
    window.addEventListener('dungeon-veil-meta-changed', refresh);
    return () => window.removeEventListener('dungeon-veil-meta-changed', refresh);
  }, []);

  return <ModernVillageSquareScene key={loadoutKey} />;
}
