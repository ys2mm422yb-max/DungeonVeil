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

// The hub layout deliberately keeps the world orb as the visual anchor across mobile sizes.
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

  const button = (label: string, action: () => void, subtitle?: string, kind: 'normal' | 'primary' | 'chamber' | 'compact' = 'normal', disabled = false) => {
    const kindClass = kind === 'primary'
      ? 'border-amber-100/55 bg-[linear-gradient(112deg,rgba(154,84,24,.94),rgba(105,52,17,.93)_55%,rgba(62,33,23,.95))] text-amber-50 shadow-[0_16px_36px_rgba(68,35,10,.34)]'
      : kind === 'chamber'
        ? 'border-violet-100/28 bg-[linear-gradient(112deg,rgba(72,52,111,.92),rgba(40,35,77,.92))] text-violet-50 shadow-[0_12px_28px_rgba(31,20,55,.26)]'
        : kind === 'compact'
          ? 'border-sky-100/14 bg-[#111a20]/86 text-sky-50/82'
          : 'border-amber-50/12 bg-[#171412]/84 text-[#f4eadc] shadow-[0_10px_26px_rgba(0,0,0,.24)]';
    const spacing = kind === 'compact' ? 'px-5 py-2.5' : 'px-5 py-3';
    return <button type="button" disabled={disabled} onPointerDown={event => { event.preventDefault(); if (!disabled) action(); }} className={`w-full rounded-[1.25rem] border text-left backdrop-blur-xl active:scale-[.975] ${spacing} ${kindClass} ${disabled ? 'opacity-35' : ''}`}>
      <div className="flex items-center gap-4"><div className="min-w-0 flex-1"><div className="text-[14px] font-black tracking-[.12em]">{label}</div>{subtitle && <div className="mt-1 truncate text-[7px] uppercase tracking-[.15em] text-white/48">{subtitle}</div>}</div>{!disabled && <span className="text-lg text-amber-100/42">›</span>}</div>
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

  return <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#17151c] text-white">
    {overlay !== 'worldBoss' && <MainMenuDungeonScene />}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(20,15,13,.05),rgba(30,23,30,.03)_28%,rgba(11,11,15,.2)_54%,rgba(7,7,9,.72)_77%,#060608_96%)]" />
    <div className="pointer-events-none absolute inset-x-0 top-[19%] h-[40%] bg-[radial-gradient(ellipse_at_center,rgba(111,119,210,.13),rgba(218,166,83,.07)_42%,transparent_72%)]" />
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
    <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay('more'); }} className="absolute right-4 top-[max(18px,calc(env(safe-area-inset-top)+8px))] z-30 grid h-11 w-11 place-items-center rounded-full border border-amber-50/16 bg-[#181311]/72 text-lg text-amber-50/72 shadow-[0_8px_24px_rgba(0,0,0,.28)] backdrop-blur-xl active:scale-95">•••</button>

    <div className="relative z-[5] flex h-full flex-col px-5 pb-[max(20px,calc(env(safe-area-inset-bottom)+6px))] pt-[max(32px,calc(env(safe-area-inset-top)+12px))]">
      <header className="text-center">
        <div className="text-[7px] font-black uppercase tracking-[.5em] text-amber-100/58">{language === 'de' ? 'BETRITT DEN SCHLEIER' : 'ENTER THE VEIL'}</div>
        <h1 className="mt-1.5 bg-gradient-to-b from-[#f3ddaa] via-[#dda94f] to-[#a96b2e] bg-clip-text font-serif text-[clamp(2.35rem,10vw,3.55rem)] font-black leading-[.86] tracking-[.07em] text-transparent drop-shadow-[0_5px_18px_rgba(104,61,16,.24)]">DUNGEON<br />VEIL</h1>
        <p className="mt-2.5 text-[7px] uppercase tracking-[.28em] text-amber-50/38">{t.subtitle}</p>
      </header>

      <div className="h-[41vh] min-h-[260px] max-h-[360px] shrink-0" />

      <div className="mx-auto mt-auto w-full max-w-sm space-y-2">
        {button(t.newGame, startNormalRun, undefined, 'primary')}
        {button(t.continueGame, props.onContinue, continueText, 'normal', !props.saveData)}
        {button(language === 'de' ? 'Schleierkammer' : 'Veil Chamber', props.onVeilChamber, language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Schleierstaub` : `Rank ${meta.rank} · ${meta.dust} Veil Dust`, 'chamber')}
        {button(language === 'de' ? 'Kodex' : 'Codex', props.onCodex, language === 'de' ? 'Bestien · Jagd · Wächter · Relikte' : 'Beasts · Hunts · Wardens · Relics', 'compact')}
      </div>
    </div>

    {overlay && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06070b]/74 px-5 backdrop-blur-md" onPointerDown={() => setOverlay(null)}><div className="w-full max-w-sm" onPointerDown={event => event.stopPropagation()}>
      {overlay === 'daily' && <DailyQuestPanel defaultOpen />}
      {overlay === 'mailbox' && <MailboxPanel language={language} onUnreadChange={setMailUnread} />}
      {overlay === 'friends' && <FriendsPanel language={language} />}
      {overlay === 'online' && <OnlinePanel language={language} />}
      {overlay === 'guild' && <div className="space-y-3"><GuildInviteLinkCard language={language} /><GuildSocialPanel language={language} /></div>}
      {overlay === 'worldBoss' && <WorldBossPanel language={language} saveData={props.saveData} />}
      {overlay === 'more' && <div className="rounded-3xl border border-amber-50/14 bg-[#17130f]/96 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-amber-50/42">{language === 'de' ? 'WEITERE OPTIONEN' : 'MORE OPTIONS'}</div><div className="space-y-2">{button(language === 'de' ? 'Online & Cloud' : 'Online & Cloud', () => setOverlay('online'), language === 'de' ? 'Konto · Profil · Cloud-Spielstand' : 'Account · Profile · Cloud save', 'chamber')}{button(language === 'de' ? 'Tutorial wiederholen' : 'Replay tutorial', replayTutorial, language === 'de' ? 'Bewegung · Dash · Kampf · Hauptmenü' : 'Movement · Dash · Combat · Main menu')}{button(t.settings, () => { setOverlay(null); props.onSettings(); })}{button(t.credits, () => { setOverlay(null); props.onCredits(); })}</div></div>}
      <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay(null); }} className="mt-3 w-full rounded-2xl border border-amber-50/14 bg-[#11100f]/88 py-3 text-[9px] font-black uppercase tracking-[.2em] text-amber-50/58">{language === 'de' ? 'SCHLIESSEN' : 'CLOSE'}</button>
    </div></div>}
  </div>;
}
