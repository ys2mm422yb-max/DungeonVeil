import React, { useState } from 'react';
import { UpgradeKey } from '../../i18n/translations';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  choices: UpgradeKey[];
  onSelect: (choice: UpgradeKey) => void;
}

const ICONS: Partial<Record<UpgradeKey, string>> = {
  maxHp: 'HP', heal: '+', attack: 'ATK', speed: 'SPD', defense: 'DEF',
  multishot: 'x2', ricochet: 'R', fireArrow: 'F', attackSpeed: 'AS', piercing: 'P',
};

export function LevelUpScreen({ choices, onSelect }: Props) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<UpgradeKey | null>(null);

  const choose = (key: UpgradeKey) => {
    if (selected) return;
    setSelected(key);
    window.setTimeout(() => onSelect(key), 320);
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-black/85 px-5 text-white backdrop-blur-md touch-none select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,.24),transparent_44%)] animate-pulse" />
      <div className="relative mb-8 text-center animate-in fade-in zoom-in-75 duration-500">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-violet-300/45 bg-violet-500/15 text-2xl font-black shadow-[0_0_50px_rgba(139,92,246,.45)] animate-bounce">UP</div>
        <h1 className="font-serif text-4xl font-black tracking-[.12em] text-violet-100">{t.levelUp}</h1>
        <p className="mt-2 text-[11px] uppercase tracking-[.28em] text-white/50">{t.chooseUpgrade}</p>
      </div>

      <div className="relative flex w-full max-w-sm flex-col gap-3">
        {choices.map((key, index) => {
          const picked = selected === key;
          const faded = selected !== null && !picked;
          return (
            <button
              key={key}
              onPointerDown={(event) => { event.preventDefault(); choose(key); }}
              className={`rounded-2xl border px-5 py-5 text-left shadow-2xl transition-all duration-300 ${picked ? 'scale-110 border-violet-200 bg-violet-500/35 shadow-[0_0_55px_rgba(167,139,250,.55)]' : faded ? 'scale-90 border-white/5 bg-black/35 opacity-0' : 'border-violet-300/25 bg-black/65 active:scale-95'}`}
              style={{ animation: `abilityCardIn .42s ${index * 90}ms both` }}
            >
              <div className="flex items-center gap-4">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl border text-lg font-black transition-all duration-300 ${picked ? 'rotate-[360deg] scale-125 border-white/60 bg-violet-300/25' : 'border-violet-300/20 bg-violet-500/10'}`}>{ICONS[key] ?? 'UP'}</div>
                <div>
                  <div className="text-base font-black tracking-wide text-violet-50">{t.upgrades[key]}</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-white/35">RUN ABILITY</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <style>{`@keyframes abilityCardIn{from{opacity:0;transform:translateY(36px) scale(.82)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}
