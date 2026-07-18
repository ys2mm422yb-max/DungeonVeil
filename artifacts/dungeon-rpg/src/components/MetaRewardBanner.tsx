import React, { useEffect, useState } from 'react';
import { EQUIPMENT, type EquipmentId, type MetaReward } from '../game/metaProgression';
import { useLanguage } from '../i18n/LanguageContext';
import { CoopSharedLootOverlay } from './CoopSharedLootOverlay';

type BannerState =
 | { kind: 'reward'; reward: MetaReward }
 | { kind: 'pickup'; item: EquipmentId; duplicate: boolean; copies: number; level: number };

const TOAST_POSITION = 'pointer-events-none fixed right-[max(12px,env(safe-area-inset-right))] bottom-[max(10.5rem,calc(env(safe-area-inset-bottom)+9.5rem))] z-[65] w-[min(42vw,185px)] transition-all duration-300';

export function MetaRewardBanner() {
 const { language } = useLanguage();
 const [banner, setBanner] = useState<BannerState | null>(null);
 const [visible, setVisible] = useState(false);

 useEffect(() => {
  let hideTimer = 0;
  const show = (next: BannerState) => {
   window.clearTimeout(hideTimer);
   setBanner(next);
   setVisible(true);
   hideTimer = window.setTimeout(() => setVisible(false), 2300);
  };
  const onReward = (event: Event) => {
   const reward = (event as CustomEvent<MetaReward>).detail;
   if (reward) show({ kind: 'reward', reward });
  };
  const onPickup = (event: Event) => {
   const detail = (event as CustomEvent<{ item: EquipmentId; duplicate: boolean; copies: number; level: number }>).detail;
   if (detail?.item) show({ kind: 'pickup', ...detail });
  };
  window.addEventListener('dungeon-veil-meta-reward', onReward as EventListener);
  window.addEventListener('dungeon-veil-equipment-picked', onPickup as EventListener);
  return () => {
   window.clearTimeout(hideTimer);
   window.removeEventListener('dungeon-veil-meta-reward', onReward as EventListener);
   window.removeEventListener('dungeon-veil-equipment-picked', onPickup as EventListener);
  };
 }, []);

 const de = language === 'de';
 const motion = visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0';
 let toast: React.ReactNode = null;

 if (banner?.kind === 'pickup') {
  const item = EQUIPMENT[banner.item];
  toast = <div className={`${TOAST_POSITION} ${motion}`}>
   <div className="overflow-hidden rounded-xl border border-violet-300/24 bg-[linear-gradient(120deg,rgba(47,28,75,.96),rgba(10,8,13,.97))] px-3 py-2.5 shadow-[0_14px_44px_rgba(0,0,0,.5)] backdrop-blur-xl">
    <div className="text-[6px] font-black uppercase tracking-[.14em]" style={{ color: item.accent }}>{banner.duplicate ? (de ? 'KOPIE · +1' : 'COPY · +1') : (de ? 'NEUE AUSRÜSTUNG' : 'NEW EQUIPMENT')}</div>
    <div className="mt-1 break-words text-[10px] font-black text-white">{de ? item.nameDe : item.nameEn}</div>
    <div className="mt-1 text-[6px] font-bold uppercase tracking-[.08em] text-white/40">{de ? 'STUFE' : 'LEVEL'} {banner.level} · {banner.copies} {de ? 'KOPIEN' : 'COPIES'}</div>
   </div>
  </div>;
 } else if (banner?.kind === 'reward') {
  const reward = banner.reward;
  const item = reward.item ? EQUIPMENT[reward.item] : null;
  const rankUp = reward.rankAfter > reward.rankBefore;
  toast = <div className={`${TOAST_POSITION} ${motion}`}>
   <div className="overflow-hidden rounded-xl border border-violet-300/24 bg-[linear-gradient(120deg,rgba(47,28,75,.94),rgba(10,8,13,.96))] px-3 py-2.5 shadow-[0_14px_44px_rgba(0,0,0,.5)] backdrop-blur-xl">
    <div className="text-[6px] font-black uppercase tracking-[.16em] text-violet-200/55">{de ? 'SCHLEIER-FORTSCHRITT' : 'VEIL PROGRESS'}</div>
    <div className="mt-1 text-[10px] font-black leading-snug text-white">+{reward.xp} XP · <span className="text-yellow-200">G {reward.gold}</span> · <span className="text-amber-200">✦ {reward.dust}</span></div>
    {rankUp && <div className="mt-1.5 inline-flex rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[6px] font-black tracking-[.1em] text-amber-100">{de ? 'RANG' : 'RANK'} {reward.rankAfter}</div>}
    {item && <div className="mt-2 border-t border-white/8 pt-2">
     <div className="text-[6px] font-black uppercase tracking-[.1em]" style={{ color: item.accent }}>{de ? 'GEMEINSAME BEUTE' : 'SHARED LOOT'}</div>
     <div className="mt-1 break-words text-[9px] font-black text-white/85">{de ? item.nameDe : item.nameEn}</div>
    </div>}
   </div>
  </div>;
 }

 return <><CoopSharedLootOverlay />{toast}</>;
}
