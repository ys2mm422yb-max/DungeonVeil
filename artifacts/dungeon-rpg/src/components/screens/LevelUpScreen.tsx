import React from 'react';
import { UpgradeKey } from '../../i18n/translations';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  choices: UpgradeKey[];
  onSelect: (choice: UpgradeKey) => void;
}

function getIconForKey(key: UpgradeKey): string {
  if (key === 'maxHp' || key === 'heal') return '♥';
  if (key === 'attack') return '⚔';
  if (key === 'speed') return '⚡';
  if (key === 'defense') return '⛨';
  return '✦';
}

export function LevelUpScreen({ choices, onSelect }: Props) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-foreground touch-none select-none animate-in zoom-in-95 duration-300">
      <h1 className="font-serif text-5xl md:text-6xl text-primary font-black tracking-widest drop-shadow-[0_0_20px_rgba(232,160,32,0.4)] text-center mb-2">
        {t.levelUp}
      </h1>
      <p className="text-muted-foreground mb-12 tracking-widest uppercase text-sm">{t.chooseUpgrade}</p>

      <div className="flex flex-col gap-4 w-full max-w-sm px-6">
        {choices.map((key) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            onTouchStart={(e) => { e.preventDefault(); onSelect(key); }}
            className="bg-card border-2 border-primary/30 hover:border-primary text-card-foreground p-6 rounded-lg text-lg font-bold tracking-wide active:scale-95 transition-all shadow-lg hover:shadow-primary/20 text-center flex flex-col items-center gap-2"
            data-testid={`button-upgrade-${key}`}
          >
            <span className="text-primary text-2xl">{getIconForKey(key)}</span>
            {t.upgrades[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
