import React, { useEffect, useState } from 'react';
import { EQUIPMENT, type MetaReward } from '../game/metaProgression';
import { useLanguage } from '../i18n/LanguageContext';

export function MetaRewardBanner() {
  const { language } = useLanguage();
  const [reward, setReward] = useState<MetaReward | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer = 0;
    const onReward = (event: Event) => {
      const detail = (event as CustomEvent<MetaReward>).detail;
      if (!detail) return;
      window.clearTimeout(hideTimer);
      setReward(detail);
      setVisible(true);
      hideTimer = window.setTimeout(() => setVisible(false), 2600);
    };
    window.addEventListener('dungeon-veil-meta-reward', onReward as EventListener);
    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener('dungeon-veil-meta-reward', onReward as EventListener);
    };
  }, []);

  if (!reward) return null;
  const de = language === 'de';
  const item = reward.item ? EQUIPMENT[reward.item] : null;
  const rankUp = reward.rankAfter > reward.rankBefore;

  return (
    <div className={`pointer-events-none fixed left-1/2 top-[max(8.4rem,calc(env(safe-area-inset-top)+7.4rem))] z-[65] w-[min(88vw,360px)] -translate-x-1/2 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}>
      <div className="overflow-hidden rounded-2xl border border-violet-300/24 bg-[linear-gradient(120deg,rgba(47,28,75,.94),rgba(10,8,13,.96))] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,.5),0_0_34px_rgba(126,88,211,.12)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[.26em] text-violet-200/55">{de ? 'SCHLEIER-FORTSCHRITT' : 'VEIL PROGRESS'}</div>
            <div className="mt-1 text-[13px] font-black text-white">+{reward.xp} XP <span className="text-white/35">·</span> <span className="text-amber-200">✦ {reward.dust}</span></div>
          </div>
          {rankUp && <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-[8px] font-black tracking-[.14em] text-amber-100">{de ? 'RANG' : 'RANK'} {reward.rankAfter}</div>}
        </div>
        {item && (
          <div className="mt-3 border-t border-white/8 pt-3">
            <div className="text-[8px] font-black uppercase tracking-[.18em]" style={{ color: item.accent }}>{reward.duplicate ? (de ? 'DUPLIKAT ZERLEGT' : 'DUPLICATE SALVAGED') : (de ? 'AUSRÜSTUNG GEFUNDEN' : 'EQUIPMENT FOUND')}</div>
            <div className="mt-1 text-[12px] font-black text-white/85">{de ? item.nameDe : item.nameEn}</div>
          </div>
        )}
      </div>
    </div>
  );
}
