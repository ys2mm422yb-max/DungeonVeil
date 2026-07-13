import React from 'react';

type Props = {
  language: 'de' | 'en';
  dailyProgress: string;
  mailUnread: number;
  onQuests: () => void;
  onMailbox: () => void;
  onFriends: () => void;
  onGuild: () => void;
  onWorldBoss: () => void;
};

type Place = {
  testId: string;
  icon: string;
  labelDe: string;
  labelEn: string;
  detailDe: string;
  detailEn: string;
  badge?: string;
  action: () => void;
};

export function VillageNpcHub({ language, dailyProgress, mailUnread, onQuests, onMailbox, onFriends, onGuild, onWorldBoss }: Props) {
  const de = language === 'de';
  const places: Place[] = [
    { testId: 'npc-questmaster', icon: '✦', labelDe: 'Aufträge', labelEn: 'Quests', detailDe: 'Mira', detailEn: 'Mira', badge: dailyProgress, action: onQuests },
    { testId: 'npc-postmaster', icon: '✉', labelDe: 'Post', labelEn: 'Mail', detailDe: 'Orin', detailEn: 'Orin', badge: mailUnread > 0 ? String(Math.min(99, mailUnread)) : undefined, action: onMailbox },
    { testId: 'npc-scout', icon: '♡', labelDe: 'Freunde', labelEn: 'Friends', detailDe: 'Tala', detailEn: 'Tala', action: onFriends },
    { testId: 'npc-guildmaster', icon: '♜', labelDe: 'Gilde', labelEn: 'Guild', detailDe: 'Brom', detailEn: 'Brom', action: onGuild },
    { testId: 'npc-worldkeeper', icon: '◉', labelDe: 'Weltboss', labelEn: 'World Boss', detailDe: 'Aelric', detailEn: 'Aelric', action: onWorldBoss },
  ];

  return <section data-testid="veil-village-npc-hub" className="relative z-20 mx-auto w-full max-w-md px-4">
    <div className="mb-2 flex items-center justify-between px-1">
      <div>
        <div className="text-[7px] font-black uppercase tracking-[.26em] text-amber-100/45">{de ? 'DORFPLATZ' : 'VILLAGE SQUARE'}</div>
        <div className="mt-0.5 text-[10px] font-bold text-amber-50/78">{de ? 'Wähle einen Ort' : 'Choose a place'}</div>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-amber-100/18 to-transparent ml-3" />
    </div>
    <div className="grid grid-cols-5 gap-1.5 rounded-2xl border border-amber-50/10 bg-[#100e0c]/88 p-2 shadow-[0_14px_34px_rgba(0,0,0,.34)] backdrop-blur-xl">
      {places.map(place => <button
        key={place.testId}
        data-testid={place.testId}
        type="button"
        onPointerDown={event => { event.preventDefault(); place.action(); }}
        className="relative min-w-0 rounded-xl border border-white/[.065] bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015))] px-1 py-2 text-center active:scale-[.96] active:bg-white/[.07]"
      >
        <span className="mx-auto grid h-8 w-8 place-items-center rounded-lg border border-amber-100/12 bg-[#1d1813] text-[15px] text-amber-100/84 shadow-inner">{place.icon}</span>
        {place.badge && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-amber-300 px-1 py-0.5 text-[6px] font-black leading-none text-[#251600]">{place.badge}</span>}
        <span className="mt-1 block truncate text-[6px] font-black uppercase tracking-[.06em] text-white/78">{de ? place.labelDe : place.labelEn}</span>
        <span className="mt-0.5 block truncate text-[5px] uppercase tracking-[.08em] text-white/30">{de ? place.detailDe : place.detailEn}</span>
      </button>)}
    </div>
  </section>;
}
