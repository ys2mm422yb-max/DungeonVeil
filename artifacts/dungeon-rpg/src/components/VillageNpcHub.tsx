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

type NpcButtonProps = {
  testId: string;
  side: 'left' | 'right' | 'center';
  top: string;
  icon: string;
  name: string;
  role: string;
  badge?: string;
  onClick: () => void;
};

function NpcButton({ testId, side, top, icon, name, role, badge, onClick }: NpcButtonProps) {
  const horizontal = side === 'left'
    ? 'left-3 items-start text-left'
    : side === 'right'
      ? 'right-3 items-end text-right'
      : 'left-1/2 -translate-x-1/2 items-center text-center';

  return <button
    data-testid={testId}
    type="button"
    onPointerDown={event => { event.preventDefault(); onClick(); }}
    className={`pointer-events-auto absolute z-20 flex max-w-[42vw] flex-col ${horizontal} active:scale-[.97]`}
    style={{ top }}
  >
    <span className="relative grid h-11 w-11 place-items-center rounded-full border border-amber-200/26 bg-[radial-gradient(circle_at_35%_30%,rgba(255,221,151,.22),rgba(34,19,8,.93)_70%)] text-lg text-amber-100 shadow-[0_8px_24px_rgba(0,0,0,.48)] backdrop-blur-lg">
      {icon}
      {badge && <span className="absolute -right-1 -top-1 min-w-4 rounded-full border border-amber-100/24 bg-amber-400 px-1 py-0.5 text-[7px] font-black leading-none text-black">{badge}</span>}
    </span>
    <span className="mt-1 rounded-lg border border-white/8 bg-black/66 px-2 py-1 shadow-lg backdrop-blur-md">
      <span className="block text-[8px] font-black uppercase tracking-[.12em] text-amber-50/90">{name}</span>
      <span className="mt-0.5 block text-[6px] font-black uppercase tracking-[.16em] text-white/34">{role}</span>
    </span>
  </button>;
}

export function VillageNpcHub({ language, dailyProgress, mailUnread, onQuests, onMailbox, onFriends, onGuild, onWorldBoss }: Props) {
  const de = language === 'de';
  return <div data-testid="veil-village-npc-hub" className="pointer-events-none absolute inset-0 z-10">
    <div className="absolute left-1/2 top-[29%] -translate-x-1/2 rounded-full border border-amber-200/10 bg-black/28 px-3 py-1 text-[6px] font-black uppercase tracking-[.28em] text-amber-100/28 backdrop-blur-sm">
      {de ? 'DORFPLATZ DES SCHLEIERS' : 'VEIL VILLAGE SQUARE'}
    </div>

    <NpcButton
      testId="npc-questmaster"
      side="left"
      top="34%"
      icon="✦"
      name={de ? 'Mira' : 'Mira'}
      role={de ? 'Questmeisterin' : 'Quest Keeper'}
      badge={dailyProgress}
      onClick={onQuests}
    />
    <NpcButton
      testId="npc-postmaster"
      side="right"
      top="34%"
      icon="✉"
      name={de ? 'Orin' : 'Orin'}
      role={de ? 'Postmeister' : 'Postmaster'}
      badge={mailUnread > 0 ? String(Math.min(99, mailUnread)) : undefined}
      onClick={onMailbox}
    />
    <NpcButton
      testId="npc-scout"
      side="left"
      top="48%"
      icon="♡"
      name={de ? 'Tala' : 'Tala'}
      role={de ? 'Späherin' : 'Scout'}
      onClick={onFriends}
    />
    <NpcButton
      testId="npc-guildmaster"
      side="right"
      top="48%"
      icon="♜"
      name={de ? 'Brom' : 'Brom'}
      role={de ? 'Gildenmeister' : 'Guildmaster'}
      onClick={onGuild}
    />
    <NpcButton
      testId="npc-worldkeeper"
      side="center"
      top="57%"
      icon="♛"
      name={de ? 'Aelric' : 'Aelric'}
      role={de ? 'Weltenhüter' : 'World Keeper'}
      onClick={onWorldBoss}
    />
  </div>;
}
