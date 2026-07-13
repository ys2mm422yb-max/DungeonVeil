import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SaveData } from '../../game/saveManager';
import { loadMetaProgression } from '../../game/metaProgression';
import { clearWeeklyRiftRun } from '../../game/weeklyRiftRun';
import { loadRetentionProfile, type RetentionProfile } from '../../game/runRetention';
import { captureGuildInviteTokenFromUrl, mailboxUnreadCount, MAILBOX_EVENT } from '../../game/guildMailboxOnline';
import { currentOnlineSession, onlineSessionEventName } from '../../game/supabaseOnline';
import { syncSocialProfileProgress } from '../../game/socialProgressOnline';
import { requestTutorialReplay } from '../../game/tutorialState';
import { MainMenuDungeonScene } from '../MainMenuDungeonScene';
import { DailyQuestPanel } from '../DailyQuestPanel';
import { OnlinePanel } from '../OnlinePanel';
import { GuildSocialPanel } from '../GuildSocialPanel';
import { GuildInviteLinkCard } from '../GuildInviteLinkCard';
import { MailboxPanel } from '../MailboxPanel';
import { FriendsPanel } from '../FriendsPanel';
import { VillageNpcHub } from '../VillageNpcHub';
import { WorldBossPanel } from '../WorldBossPanel';

interface Props {
  saveData: SaveData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onVeilChamber: () => void;
  onCodex: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

type Overlay = 'daily' | 'mailbox' | 'friends' | 'more' | 'online' | 'guild' | 'worldBoss' | null;

export function MainMenuScreen(props: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [retention, setRetention] = useState<RetentionProfile>(loadRetentionProfile);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [mailUnread, setMailUnread] = useState(0);
  const gifts = props.saveData ? Object.entries(props.saveData.runSkills ?? {}).reduce((sum, [key, value]) => key === 'heal' ? sum : sum + (value ?? 0), 0) : 0;

  useEffect(() => {
    const refreshMeta = () => setMeta(loadMetaProgression());
    const refreshRetention = (event?: Event) => setRetention((event as CustomEvent<RetentionProfile> | undefined)?.detail ?? loadRetentionProfile());
    window.addEventListener('dungeon-veil-meta-changed', refreshMeta);
    window.addEventListener('dungeon-veil-retention-update', refreshRetention as EventListener);
    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', refreshMeta);
      window.removeEventListener('dungeon-veil-retention-update', refreshRetention as EventListener);
    };
  }, []);

  useEffect(() => {
    const captured = captureGuildInviteTokenFromUrl();
    if (captured) setOverlay('mailbox');
    const refreshUnread = () => { void mailboxUnreadCount().then(setMailUnread).catch(() => setMailUnread(0)); };
    window.addEventListener(MAILBOX_EVENT, refreshUnread);
    window.addEventListener(onlineSessionEventName(), refreshUnread);
    refreshUnread();
    return () => {
      window.removeEventListener(MAILBOX_EVENT, refreshUnread);
      window.removeEventListener(onlineSessionEventName(), refreshUnread);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      if (!currentOnlineSession()) return;
      void syncSocialProfileProgress(props.saveData?.chapter ?? 1, meta.rank, 'archer').catch(() => {});
    };
    window.addEventListener(onlineSessionEventName(), sync);
    sync();
    return () => window.removeEventListener(onlineSessionEventName(), sync);
  }, [meta.rank, props.saveData?.chapter]);

  const overlayButton = (label: string, action: () => void, subtitle?: string, kind: 'normal' | 'chamber' = 'normal') => {
    const kindClass = kind === 'chamber'
      ? 'border-violet-100/22 bg-[linear-gradient(120deg,rgba(59,45,89,.9),rgba(28,29,48,.94))] text-violet-50'
      : 'border-amber-50/12 bg-[#171512]/90 text-[#f4eadc]';
    return <button type="button" onPointerDown={event => { event.preventDefault(); action(); }} className={`w-full rounded-[1rem] border px-4 py-3 text-left shadow-[0_10px_26px_rgba(0,0,0,.24)] backdrop-blur-xl active:scale-[.98] ${kindClass}`}>
      <div className="flex items-center gap-4"><div className="min-w-0 flex-1"><div className="text-[11px] font-black tracking-[.12em]">{label}</div>{subtitle && <div className="mt-1 truncate text-[6px] uppercase tracking-[.15em] text-white/45">{subtitle}</div>}</div><span className="text-lg text-amber-100/38">›</span></div>
    </button>;
  };

  const startNormalRun = () => { clearWeeklyRiftRun(); props.onNewGame(); };
  const replayTutorial = () => {
    requestTutorialReplay();
    setOverlay(null);
    if (props.saveData) props.onContinue();
    else props.onNewGame();
  };
  const continueText = props.saveData
    ? language === 'de' ? `Kapitel ${props.saveData.chapter ?? 1} · Raum ${props.saveData.floor} · ${gifts} Gaben` : `Chapter ${props.saveData.chapter ?? 1} · Room ${props.saveData.floor} · ${gifts} gifts`
    : t.noSave;

  return <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#111219] text-white">
    {overlay !== 'worldBoss' && <MainMenuDungeonScene />}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(12,13,18,.12),rgba(20,19,25,.02)_31%,rgba(10,10,14,.06)_54%,rgba(7,7,10,.64)_79%,#050609_98%)]" />
    <div className="pointer-events-none absolute inset-x-0 top-[18%] h-[45%] bg-[radial-gradient(ellipse_at_center,rgba(101,110,184,.11),rgba(198,145,71,.045)_44%,transparent_74%)]" />
    <div className="pointer-events-none absolute left-1/2 top-[51%] h-[25%] w-[2px] -translate-x-1/2 bg-gradient-to-b from-amber-100/20 via-amber-100/8 to-transparent" />

    {overlay !== 'worldBoss' && <VillageNpcHub
      language={language}
      dailyProgress={`${retention.daily.claimed.length}/3`}
      mailUnread={mailUnread}
      onQuests={() => setOverlay('daily')}
      onMailbox={() => setOverlay('mailbox')}
      onFriends={() => setOverlay('friends')}
      onGuild={() => setOverlay('guild')}
      onWorldBoss={() => setOverlay('worldBoss')}
    />}

    <button type="button" aria-label={language === 'de' ? 'Weitere Optionen' : 'More options'} onPointerDown={event => { event.preventDefault(); setOverlay('more'); }} className="absolute right-4 top-[max(18px,calc(env(safe-area-inset-top)+8px))] z-30 grid h-10 w-10 place-items-center rounded-[0.8rem] border border-amber-50/15 bg-[linear-gradient(145deg,rgba(39,34,30,.82),rgba(17,18,23,.86))] text-base text-amber-50/68 shadow-[0_8px_24px_rgba(0,0,0,.3)] backdrop-blur-lg active:scale-95">•••</button>

    <div className="relative z-[5] flex h-full flex-col px-4 pb-[max(16px,calc(env(safe-area-inset-bottom)+4px))] pt-[max(30px,calc(env(safe-area-inset-top)+10px))]">
      <header className="text-center">
        <div className="text-[6px] font-black uppercase tracking-[.52em] text-amber-100/52">{language === 'de' ? 'BETRITT DEN SCHLEIER' : 'ENTER THE VEIL'}</div>
        <h1 className="mt-1.5 bg-gradient-to-b from-[#f5e3b6] via-[#dca954] to-[#9d632b] bg-clip-text font-serif text-[clamp(2.15rem,9.4vw,3.3rem)] font-black leading-[.84] tracking-[.075em] text-transparent drop-shadow-[0_5px_18px_rgba(104,61,16,.22)]">DUNGEON<br />VEIL</h1>
        <div className="mx-auto mt-2.5 flex max-w-[250px] items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-100/20" />
          <p className="shrink-0 text-[6px] uppercase tracking-[.25em] text-amber-50/36">{t.subtitle}</p>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-100/20" />
        </div>
      </header>

      <div data-menu-scene-space="veil-court" className="h-[44vh] min-h-[286px] max-h-[386px] shrink-0" />

      <div data-testid="main-menu-action-ledger" data-menu-panel="adventure-ledger" className="relative mx-auto mt-auto w-full max-w-sm overflow-hidden rounded-[1.65rem] border border-amber-100/18 bg-[linear-gradient(155deg,rgba(28,25,24,.9),rgba(10,12,17,.94)_72%)] p-2.5 shadow-[0_22px_50px_rgba(0,0,0,.44)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-[5px] rounded-[1.35rem] border border-white/[.035]" />
        <div className="mb-2 flex items-center gap-2 px-2 pt-1">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-100/18" />
          <span className="text-[5.5px] font-black uppercase tracking-[.3em] text-amber-50/42">{language === 'de' ? 'DEIN WEG DURCH DEN SCHLEIER' : 'YOUR PATH THROUGH THE VEIL'}</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-100/18" />
        </div>

        <button type="button" onPointerDown={event => { event.preventDefault(); startNormalRun(); }} className="relative w-full overflow-hidden rounded-[1.15rem] border border-amber-100/42 bg-[linear-gradient(112deg,rgba(142,78,24,.98),rgba(96,48,19,.96)_58%,rgba(52,29,24,.98))] px-4 py-3 text-left text-amber-50 shadow-[0_12px_28px_rgba(69,34,9,.32)] active:scale-[.98]">
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#f4d48a] via-[#c88835] to-transparent" />
          <span className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-[0.65rem] border border-amber-100/24 bg-black/14 text-[15px]">✦</span><span className="min-w-0 flex-1"><span className="block text-[13px] font-black tracking-[.14em]">{t.newGame}</span><span className="mt-0.5 block text-[5.5px] uppercase tracking-[.17em] text-amber-50/52">{language === 'de' ? 'Öffne ein neues Tor' : 'Open a new gate'}</span></span><span className="text-lg text-amber-100/52">›</span></span>
        </button>

        <button type="button" disabled={!props.saveData} onPointerDown={event => { event.preventDefault(); if (props.saveData) props.onContinue(); }} className={`mt-2 w-full rounded-[1rem] border border-amber-50/10 bg-[#121316]/86 px-4 py-2.5 text-left shadow-[0_8px_20px_rgba(0,0,0,.22)] active:scale-[.985] ${props.saveData ? 'text-[#eee5d8]' : 'text-white/26'}`}>
          <span className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-[0.55rem] border border-white/8 bg-white/[.025] text-[13px]">↟</span><span className="min-w-0 flex-1"><span className="block text-[10.5px] font-black tracking-[.13em]">{t.continueGame}</span><span className="mt-0.5 block truncate text-[5.5px] uppercase tracking-[.14em] text-white/38">{continueText}</span></span>{props.saveData && <span className="text-base text-amber-100/34">›</span>}</span>
        </button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onPointerDown={event => { event.preventDefault(); props.onVeilChamber(); }} className="rounded-[1rem] border border-violet-100/19 bg-[linear-gradient(145deg,rgba(55,43,82,.84),rgba(25,27,42,.9))] px-3 py-2.5 text-left text-violet-50 shadow-[0_8px_20px_rgba(31,20,55,.2)] active:scale-[.975]">
            <span className="block text-[7.5px] font-black uppercase tracking-[.14em]">{language === 'de' ? 'Schleierkammer' : 'Veil Chamber'}</span>
            <span className="mt-1 block text-[5px] uppercase tracking-[.13em] text-violet-100/45">{language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Staub` : `Rank ${meta.rank} · ${meta.dust} Dust`}</span>
          </button>
          <button type="button" onPointerDown={event => { event.preventDefault(); props.onCodex(); }} className="rounded-[1rem] border border-sky-100/12 bg-[linear-gradient(145deg,rgba(22,37,44,.84),rgba(14,17,23,.92))] px-3 py-2.5 text-left text-sky-50/84 shadow-[0_8px_20px_rgba(0,0,0,.2)] active:scale-[.975]">
            <span className="block text-[7.5px] font-black uppercase tracking-[.14em]">{language === 'de' ? 'Kodex' : 'Codex'}</span>
            <span className="mt-1 block text-[5px] uppercase tracking-[.13em] text-sky-100/36">{language === 'de' ? 'Bestien · Relikte' : 'Beasts · Relics'}</span>
          </button>
        </div>
      </div>
    </div>

    {overlay && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06070b]/76 px-5 backdrop-blur-md" onPointerDown={() => setOverlay(null)}><div className="w-full max-w-sm" onPointerDown={event => event.stopPropagation()}>
      {overlay === 'daily' && <DailyQuestPanel defaultOpen />}
      {overlay === 'mailbox' && <MailboxPanel language={language} onUnreadChange={setMailUnread} />}
      {overlay === 'friends' && <FriendsPanel language={language} />}
      {overlay === 'online' && <OnlinePanel language={language} />}
      {overlay === 'guild' && <div className="space-y-3"><GuildInviteLinkCard language={language} /><GuildSocialPanel language={language} /></div>}
      {overlay === 'worldBoss' && <WorldBossPanel language={language} saveData={props.saveData} />}
      {overlay === 'more' && <div className="rounded-3xl border border-amber-50/14 bg-[#17130f]/96 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-amber-50/42">{language === 'de' ? 'WEITERE OPTIONEN' : 'MORE OPTIONS'}</div><div className="space-y-2">{overlayButton(language === 'de' ? 'Online & Cloud' : 'Online & Cloud', () => setOverlay('online'), language === 'de' ? 'Konto · Profil · Cloud-Spielstand' : 'Account · Profile · Cloud save', 'chamber')}{overlayButton(language === 'de' ? 'Tutorial wiederholen' : 'Replay tutorial', replayTutorial, language === 'de' ? 'Bewegung · Dash · Kampf · Hauptmenü' : 'Movement · Dash · Combat · Main menu')}{overlayButton(t.settings, () => { setOverlay(null); props.onSettings(); })}{overlayButton(t.credits, () => { setOverlay(null); props.onCredits(); })}</div></div>}
      <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay(null); }} className="mt-3 w-full rounded-2xl border border-amber-50/14 bg-[#11100f]/88 py-3 text-[9px] font-black uppercase tracking-[.2em] text-amber-50/58">{language === 'de' ? 'SCHLIESSEN' : 'CLOSE'}</button>
    </div></div>}
  </div>;
}
