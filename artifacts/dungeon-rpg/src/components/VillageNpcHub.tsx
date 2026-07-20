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
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
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

  return <section data-testid="veil-village-npc-hub" className="relative z-20 mx-auto mt-1.5 w-full max-w-md shrink-0 px-4">
    <div className="grid grid-cols-4 gap-1 rounded-[17px] border border-violet-200/[.09] bg-[#09070d]/82 p-1 shadow-[0_12px_26px_rgba(0,0,0,.36)] backdrop-blur-xl">
      {places.map(place => <button
        key={place.testId}
        data-testid={place.testId}
        type="button"
        onPointerDown={event => { event.preventDefault(); place.action(); }}
        className="group relative grid min-h-[52px] min-w-0 place-items-center rounded-[12px] border border-white/[.06] bg-[linear-gradient(180deg,rgba(46,33,60,.54),rgba(13,10,18,.78))] px-0.5 py-1 text-center shadow-inner transition active:scale-[.96] active:bg-violet-900/30"
      >
        <span className="mx-auto grid h-7 w-7 place-items-center rounded-[9px] border border-amber-100/10 bg-black/30 text-amber-100/74 shadow-[inset_0_1px_7px_rgba(255,255,255,.03),0_4px_10px_rgba(0,0,0,.22)] group-active:text-violet-200"><DockIcon name={place.icon} /></span>
        {place.badge && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-amber-300 px-1 py-0.5 text-[6.5px] font-black leading-none text-[#251600] shadow-[0_2px_7px_rgba(0,0,0,.38)]">{place.badge}</span>}
        <span className="mt-0.5 block truncate text-[6.5px] font-black uppercase tracking-[.05em] text-white/70">{de ? place.labelDe : place.labelEn}</span>
      </button>)}
    </div>
  </section>;
}
