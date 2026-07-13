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

type NpcPlaqueProps = {
  testId: string;
  side: 'left' | 'right' | 'center';
  top: string;
  icon: string;
  name: string;
  role: string;
  accent: 'gold' | 'sky' | 'green' | 'violet' | 'world';
  badge?: string;
  onClick: () => void;
};

const accentClasses: Record<NpcPlaqueProps['accent'], { edge: string; seal: string; glow: string }> = {
  gold: {
    edge: 'border-amber-200/30',
    seal: 'border-amber-100/35 bg-amber-200/12 text-amber-100',
    glow: 'shadow-[0_8px_24px_rgba(183,120,35,.16)]',
  },
  sky: {
    edge: 'border-sky-200/25',
    seal: 'border-sky-100/32 bg-sky-200/10 text-sky-100',
    glow: 'shadow-[0_8px_24px_rgba(54,137,164,.14)]',
  },
  green: {
    edge: 'border-emerald-200/22',
    seal: 'border-emerald-100/30 bg-emerald-200/10 text-emerald-100',
    glow: 'shadow-[0_8px_24px_rgba(55,127,77,.14)]',
  },
  violet: {
    edge: 'border-violet-200/24',
    seal: 'border-violet-100/32 bg-violet-200/10 text-violet-100',
    glow: 'shadow-[0_8px_24px_rgba(111,72,143,.15)]',
  },
  world: {
    edge: 'border-cyan-100/30',
    seal: 'border-cyan-100/35 bg-[linear-gradient(145deg,rgba(98,143,170,.2),rgba(103,83,154,.18))] text-cyan-50',
    glow: 'shadow-[0_8px_28px_rgba(94,117,190,.18)]',
  },
};

function NpcPlaque({ testId, side, top, icon, name, role, accent, badge, onClick }: NpcPlaqueProps) {
  const horizontal = side === 'left'
    ? 'left-3 items-start text-left'
    : side === 'right'
      ? 'right-3 items-end text-right'
      : 'left-1/2 -translate-x-1/2 items-center text-center';
  const tail = side === 'left'
    ? 'left-full ml-1'
    : side === 'right'
      ? 'right-full mr-1'
      : 'left-1/2 top-full mt-1 h-3 w-px -translate-x-1/2';
  const theme = accentClasses[accent];

  return <button
    data-testid={testId}
    data-menu-node="location-plaque"
    type="button"
    onPointerDown={event => { event.preventDefault(); onClick(); }}
    className={`pointer-events-auto absolute z-20 flex max-w-[45vw] flex-col ${horizontal} active:scale-[.97]`}
    style={{ top }}
  >
    <span className={`relative flex min-h-11 items-center gap-2 rounded-[0.8rem] border bg-[linear-gradient(145deg,rgba(31,28,29,.92),rgba(16,17,22,.9))] px-2.5 py-1.5 backdrop-blur-md ${theme.edge} ${theme.glow}`}>
      {side !== 'right' && <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[0.55rem] border text-[13px] ${theme.seal}`}>{icon}</span>}
      <span className="min-w-0">
        <span className="block text-[8px] font-black uppercase tracking-[.15em] text-[#f1e8dc]">{name}</span>
        <span className="mt-0.5 block text-[5.5px] font-black uppercase tracking-[.16em] text-white/42">{role}</span>
      </span>
      {side === 'right' && <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[0.55rem] border text-[13px] ${theme.seal}`}>{icon}</span>}
      {badge && <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full border border-[#fff3bf]/45 bg-[#e8bd45] px-1.5 py-0.5 text-[6.5px] font-black leading-none text-[#241500] shadow-lg">{badge}</span>}
      <span className={`pointer-events-none absolute top-1/2 block h-px w-4 -translate-y-1/2 bg-gradient-to-r from-amber-100/28 to-transparent ${tail}`} />
    </span>
  </button>;
}

export function VillageNpcHub({ language, dailyProgress, mailUnread, onQuests, onMailbox, onFriends, onGuild, onWorldBoss }: Props) {
  const de = language === 'de';
  return <div data-testid="veil-village-npc-hub" data-menu-hub="veil-court-locations" className="pointer-events-none absolute inset-0 z-10">
    <div className="absolute left-1/2 top-[25.7%] -translate-x-1/2 text-center">
      <div className="mx-auto mb-1 h-px w-24 bg-gradient-to-r from-transparent via-amber-100/35 to-transparent" />
      <div className="text-[5.5px] font-black uppercase tracking-[.32em] text-amber-50/52">
        {de ? 'SCHLEIERHOF' : 'VEIL COURT'}
      </div>
    </div>

    <NpcPlaque
      testId="npc-questmaster"
      side="left"
      top="31.2%"
      icon="✦"
      name="Mira"
      role={de ? 'Questmeisterin' : 'Quest Keeper'}
      accent="gold"
      badge={dailyProgress}
      onClick={onQuests}
    />
    <NpcPlaque
      testId="npc-postmaster"
      side="right"
      top="31.2%"
      icon="✉"
      name="Orin"
      role={de ? 'Postmeister' : 'Postmaster'}
      accent="sky"
      badge={mailUnread > 0 ? String(Math.min(99, mailUnread)) : undefined}
      onClick={onMailbox}
    />
    <NpcPlaque
      testId="npc-scout"
      side="left"
      top="40.3%"
      icon="♡"
      name="Tala"
      role={de ? 'Späherin' : 'Scout'}
      accent="green"
      onClick={onFriends}
    />
    <NpcPlaque
      testId="npc-guildmaster"
      side="right"
      top="40.3%"
      icon="♜"
      name="Brom"
      role={de ? 'Gildenmeister' : 'Guildmaster'}
      accent="violet"
      onClick={onGuild}
    />
    <NpcPlaque
      testId="npc-worldkeeper"
      side="center"
      top="49.1%"
      icon="◉"
      name="Aelric"
      role={de ? 'Weltenhüter' : 'World Keeper'}
      accent="world"
      onClick={onWorldBoss}
    />
  </div>;
}
