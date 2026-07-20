import React from 'react';

type Props = {
  language: 'de' | 'en';
  dailyProgress: string;
  mailUnread: number;
  onQuests: () => void;
  onMailbox: () => void;
  onFriends: () => void;
  onGuild: () => void;
};

type PlaceIcon = 'scroll' | 'mail' | 'friends' | 'guild';

type Place = {
  testId: string;
  icon: PlaceIcon;
  labelDe: string;
  labelEn: string;
  badge?: string;
  action: () => void;
};

function DockIcon({ name }: { name: PlaceIcon }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
    {name === 'scroll' && <><path {...common} d="M7 4h11v13H8a3 3 0 0 0-3 3V7a3 3 0 0 1 3-3Z"/><path {...common} d="M8 8h7M8 11h6M8 14h4"/></>}
    {name === 'mail' && <><rect {...common} x="3" y="5" width="18" height="14" rx="2"/><path {...common} d="m4 7 8 6 8-6"/></>}
    {name === 'friends' && <><circle {...common} cx="9" cy="8" r="3"/><circle {...common} cx="17" cy="9" r="2.4"/><path {...common} d="M3.5 19c.7-3.2 2.7-5 5.5-5s4.8 1.8 5.5 5M14 15c2.8-.7 5.2.8 6 4"/></>}
    {name === 'guild' && <><path {...common} d="M6 4h12v11l-6 5-6-5Z"/><path {...common} d="m12 7 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4Z"/></>}
  </svg>;
}

export function VillageNpcHub({ language, dailyProgress, mailUnread, onQuests, onMailbox, onFriends, onGuild }: Props) {
  const de = language === 'de';
  const places: Place[] = [
    { testId: 'npc-questmaster', icon: 'scroll', labelDe: 'Aufträge', labelEn: 'Quests', badge: dailyProgress, action: onQuests },
    { testId: 'npc-postmaster', icon: 'mail', labelDe: 'Post', labelEn: 'Mail', badge: mailUnread > 0 ? String(Math.min(99, mailUnread)) : undefined, action: onMailbox },
    { testId: 'npc-scout', icon: 'friends', labelDe: 'Freunde', labelEn: 'Friends', action: onFriends },
    { testId: 'npc-guildmaster', icon: 'guild', labelDe: 'Gilde', labelEn: 'Guild', action: onGuild },
  ];

  return <section data-testid="veil-village-npc-hub" className="relative z-20 mx-auto w-full max-w-md px-4">
    <div className="grid grid-cols-4 gap-1.5 rounded-[20px] border border-violet-200/10 bg-[#09070d]/84 p-1.5 shadow-[0_16px_34px_rgba(0,0,0,.4)] backdrop-blur-xl">
      {places.map(place => <button
        key={place.testId}
        data-testid={place.testId}
        type="button"
        onPointerDown={event => { event.preventDefault(); place.action(); }}
        className="group relative grid min-h-[68px] min-w-0 place-items-center rounded-xl border border-white/[.07] bg-[linear-gradient(180deg,rgba(49,35,64,.58),rgba(14,11,19,.8))] px-1 py-1.5 text-center shadow-inner transition active:scale-[.96] active:bg-violet-900/30"
      >
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-lg border border-amber-100/12 bg-black/30 text-amber-100/78 shadow-[inset_0_1px_8px_rgba(255,255,255,.035),0_5px_13px_rgba(0,0,0,.24)] group-active:text-violet-200"><DockIcon name={place.icon} /></span>
        {place.badge && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-amber-300 px-1 py-0.5 text-[7px] font-black leading-none text-[#251600] shadow-[0_2px_8px_rgba(0,0,0,.4)]">{place.badge}</span>}
        <span className="mt-0.5 block truncate text-[7px] font-black uppercase tracking-[.06em] text-white/72">{de ? place.labelDe : place.labelEn}</span>
      </button>)}
    </div>
  </section>;
}
