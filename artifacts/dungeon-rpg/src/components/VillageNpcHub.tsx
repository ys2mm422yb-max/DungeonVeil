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
  accent: 'gold' | 'sky' | 'green' | 'violet' | 'world';
  badge?: string;
  onClick: () => void;
};

const accentClasses: Record<NpcButtonProps['accent'], { orb: string; label: string }> = {
  gold: {
    orb: 'border-amber-100/45 bg-[radial-gradient(circle_at_32%_26%,rgba(255,239,186,.55),rgba(119,69,20,.9)_68%,rgba(41,21,6,.96))] text-amber-50 shadow-[0_8px_28px_rgba(209,147,48,.28)]',
    label: 'border-amber-100/18 bg-[#21180f]/82 text-amber-50',
  },
  sky: {
    orb: 'border-sky-100/40 bg-[radial-gradient(circle_at_32%_26%,rgba(208,246,255,.5),rgba(40,103,125,.88)_68%,rgba(10,31,40,.96))] text-sky-50 shadow-[0_8px_28px_rgba(75,171,207,.24)]',
    label: 'border-sky-100/16 bg-[#102027]/84 text-sky-50',
  },
  green: {
    orb: 'border-emerald-100/38 bg-[radial-gradient(circle_at_32%_26%,rgba(215,255,222,.46),rgba(48,108,62,.88)_68%,rgba(13,38,20,.96))] text-emerald-50 shadow-[0_8px_28px_rgba(62,164,93,.22)]',
    label: 'border-emerald-100/15 bg-[#12241a]/84 text-emerald-50',
  },
  violet: {
    orb: 'border-violet-100/40 bg-[radial-gradient(circle_at_32%_26%,rgba(242,222,255,.46),rgba(105,67,132,.88)_68%,rgba(34,18,46,.96))] text-violet-50 shadow-[0_8px_28px_rgba(152,94,190,.24)]',
    label: 'border-violet-100/16 bg-[#22162b]/84 text-violet-50',
  },
  world: {
    orb: 'border-cyan-100/50 bg-[radial-gradient(circle_at_30%_24%,rgba(245,232,176,.62),rgba(57,103,142,.92)_48%,rgba(66,48,111,.96)_82%)] text-white shadow-[0_0_34px_rgba(116,149,225,.35)]',
    label: 'border-cyan-100/22 bg-[#14212d]/88 text-cyan-50',
  },
};

function NpcButton({ testId, side, top, icon, name, role, accent, badge, onClick }: NpcButtonProps) {
  const horizontal = side === 'left'
    ? 'left-4 items-start text-left'
    : side === 'right'
      ? 'right-4 items-end text-right'
      : 'left-1/2 -translate-x-1/2 items-center text-center';
  const theme = accentClasses[accent];

  return <button
    data-testid={testId}
    type="button"
    onPointerDown={event => { event.preventDefault(); onClick(); }}
    className={`pointer-events-auto absolute z-20 flex max-w-[43vw] flex-col ${horizontal} active:scale-[.965]`}
    style={{ top }}
  >
    <span className={`relative grid h-12 w-12 place-items-center rounded-full border text-xl backdrop-blur-lg ${theme.orb}`}>
      {icon}
      {badge && <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-white/35 bg-amber-300 px-1.5 py-0.5 text-[7px] font-black leading-none text-[#241500] shadow-lg">{badge}</span>}
    </span>
    <span className={`mt-1.5 rounded-xl border px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,.3)] backdrop-blur-xl ${theme.label}`}>
      <span className="block text-[8px] font-black uppercase tracking-[.14em]">{name}</span>
      <span className="mt-0.5 block text-[6px] font-black uppercase tracking-[.16em] text-white/48">{role}</span>
    </span>
  </button>;
}

export function VillageNpcHub({ language, dailyProgress, mailUnread, onQuests, onMailbox, onFriends, onGuild, onWorldBoss }: Props) {
  const de = language === 'de';
  return <div data-testid="veil-village-npc-hub" className="pointer-events-none absolute inset-0 z-10">
    <div className="absolute left-1/2 top-[25.5%] -translate-x-1/2 rounded-full border border-amber-100/18 bg-[#241a12]/64 px-4 py-1.5 text-[6px] font-black uppercase tracking-[.28em] text-amber-50/62 shadow-[0_8px_28px_rgba(0,0,0,.24)] backdrop-blur-md">
      {de ? 'DORFPLATZ DES SCHLEIERS' : 'VEIL VILLAGE SQUARE'}
    </div>

    <NpcButton
      testId="npc-questmaster"
      side="left"
      top="29.5%"
      icon="✦"
      name="Mira"
      role={de ? 'Questmeisterin' : 'Quest Keeper'}
      accent="gold"
      badge={dailyProgress}
      onClick={onQuests}
    />
    <NpcButton
      testId="npc-postmaster"
      side="right"
      top="29.5%"
      icon="✉"
      name="Orin"
      role={de ? 'Postmeister' : 'Postmaster'}
      accent="sky"
      badge={mailUnread > 0 ? String(Math.min(99, mailUnread)) : undefined}
      onClick={onMailbox}
    />
    <NpcButton
      testId="npc-scout"
      side="left"
      top="40.5%"
      icon="♡"
      name="Tala"
      role={de ? 'Späherin' : 'Scout'}
      accent="green"
      onClick={onFriends}
    />
    <NpcButton
      testId="npc-guildmaster"
      side="right"
      top="40.5%"
      icon="♜"
      name="Brom"
      role={de ? 'Gildenmeister' : 'Guildmaster'}
      accent="violet"
      onClick={onGuild}
    />
    <NpcButton
      testId="npc-worldkeeper"
      side="center"
      top="47.5%"
      icon="◉"
      name="Aelric"
      role={de ? 'Weltenhüter' : 'World Keeper'}
      accent="world"
      onClick={onWorldBoss}
    />
  </div>;
}
