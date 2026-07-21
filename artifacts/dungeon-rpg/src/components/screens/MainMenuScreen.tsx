import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { loadGame, SAVE_EVENT, type SaveData } from '../../game/saveManager';
import { loadMetaProgression } from '../../game/metaProgression';
import { recordReachedChapter } from '../../game/equipmentChapterGates';
import { clearWeeklyRiftRun } from '../../game/weeklyRiftRun';
import { loadRetentionProfile, type RetentionProfile } from '../../game/runRetention';
import { captureGuildInviteTokenFromUrl, mailboxUnreadCount, MAILBOX_EVENT } from '../../game/guildMailboxOnline';
import { captureCoopInviteCodeFromUrl, COOP_LOBBY_OPEN_EVENT, type CoopLobbySnapshot } from '../../game/coopLobbyOnline';
import { currentOnlineSession, onlineSessionEventName } from '../../game/supabaseOnline';
import { syncSocialProfileProgress } from '../../game/socialProgressOnline';
import { requestTutorialReplay } from '../../game/tutorialState';
import { loadPlayerProfile, PLAYER_PROFILE_EVENT, recordPlayerProfileProgress, type PlayerProfileProgress } from '../../game/playerProfile';
import { PLAYER_NAME_CHANGE_EVENT } from '../../game/playerNameChange';
import { MainMenuDungeonScene } from '../MainMenuDungeonScene';
import { MainMenuUpdateGate } from '../MainMenuUpdateGate';
import { DailyQuestPanel } from '../DailyQuestPanel';
import { OnlinePanel } from '../OnlinePanel';
import { GuildSocialPanel } from '../GuildSocialPanel';
import { MailboxPanel } from '../MailboxPanel';
import { FriendsPanel } from '../FriendsPanel';
import { VillageNpcHub } from '../VillageNpcHub';
import { WorldBossPanel } from '../WorldBossPanel';
import { ProfileBadge } from '../ProfileBadge';
import { PlayerProfilePanel } from '../PlayerProfilePanel';
import { CoopLobbyPanel } from '../CoopLobbyPanel';

interface Props {
  saveData: SaveData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onStartCoop: (lobby: CoopLobbySnapshot) => void;
  onVeilChamber: () => void;
  onCodex: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

type Overlay = 'profile' | 'daily' | 'mailbox' | 'friends' | 'more' | 'play' | 'online' | 'guild' | 'worldBoss' | 'coop' | null;
type IconName = 'scroll' | 'mail' | 'friends' | 'guild' | 'portal' | 'swords' | 'bag' | 'book' | 'gift' | 'boss' | 'coin' | 'dust' | 'settings';

function MenuIcon({ name, className = '' }: { name: IconName; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    {name === 'scroll' && <><path {...common} d="M7 4h11v13H8a3 3 0 0 0-3 3V7a3 3 0 0 1 3-3Z"/><path {...common} d="M8 8h7M8 11h6M8 14h4"/></>}
    {name === 'mail' && <><rect {...common} x="3" y="5" width="18" height="14" rx="2"/><path {...common} d="m4 7 8 6 8-6"/></>}
    {name === 'friends' && <><circle {...common} cx="9" cy="8" r="3"/><circle {...common} cx="17" cy="9" r="2.4"/><path {...common} d="M3.5 19c.7-3.2 2.7-5 5.5-5s4.8 1.8 5.5 5M14 15c2.8-.7 5.2.8 6 4"/></>}
    {name === 'guild' && <><path {...common} d="M6 4h12v11l-6 5-6-5Z"/><path {...common} d="m12 7 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4Z"/></>}
    {name === 'portal' && <><path {...common} d="M5 20V10a7 7 0 0 1 14 0v10"/><path {...common} d="M8 20V11a4 4 0 0 1 8 0v9"/><path {...common} d="M12 8c2 2 2 5 0 8-2-3-2-6 0-8Z"/></>}
    {name === 'swords' && <><path {...common} d="m5 4 12 12M19 4 7 16M4 19l4-4M20 19l-4-4"/><path {...common} d="m3 3 5 1-4 4ZM21 3l-5 1 4 4Z"/></>}
    {name === 'bag' && <><path {...common} d="M7 8h10l2 12H5Z"/><path {...common} d="M9 8V6a3 3 0 0 1 6 0v2M8 12h8"/></>}
    {name === 'book' && <><path {...common} d="M4 5c3-1 5-.4 8 2v13c-3-2.4-5-3-8-2ZM20 5c-3-1-5-.4-8 2v13c3-2.4 5-3 8-2Z"/></>}
    {name === 'gift' && <><rect {...common} x="4" y="10" width="16" height="10" rx="1"/><path {...common} d="M3 7h18v4H3ZM12 7v13M12 7c-4 0-5-1-5-3 3-1 5 0 5 3ZM12 7c4 0 5-1 5-3-3-1-5 0-5 3Z"/></>}
    {name === 'boss' && <><path {...common} d="m12 3 3 4 5 1-3 4 1 6-6-2-6 2 1-6-3-4 5-1Z"/><circle cx="12" cy="11" r="2" fill="currentColor"/></>}
    {name === 'coin' && <><circle {...common} cx="12" cy="12" r="8"/><path {...common} d="M10 8h4M10 16h4M12 8v8"/></>}
    {name === 'dust' && <><path {...common} d="m12 3 5 7-5 11-5-11Z"/><path {...common} d="m12 3 1 7-1 11-1-11Z"/></>}
    {name === 'settings' && <><circle {...common} cx="12" cy="12" r="3"/><path {...common} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></>}
  </svg>;
}

export function MainMenuScreen(props: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [retention, setRetention] = useState<RetentionProfile>(loadRetentionProfile);
  const [profile, setProfile] = useState<PlayerProfileProgress>(loadPlayerProfile);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [mailUnread, setMailUnread] = useState(0);
  const [, setSaveRevision] = useState(0);
  const currentSaveData = loadGame() ?? props.saveData;
  const profileName = currentSaveData?.playerName?.trim() || (language === 'de' ? 'Waldläufer' : 'Ranger');
  const chapter = currentSaveData?.chapter ?? 1;
  const room = currentSaveData?.floor ?? 1;
  const gold = Number(meta.gold ?? 0).toLocaleString(language === 'de' ? 'de-DE' : 'en-US');

  useEffect(() => {
    const refreshMeta = () => setMeta(loadMetaProgression());
    const refreshRetention = (event?: Event) => setRetention((event as CustomEvent<RetentionProfile> | undefined)?.detail ?? loadRetentionProfile());
    const refreshProfile = (event?: Event) => setProfile((event as CustomEvent<PlayerProfileProgress> | undefined)?.detail ?? loadPlayerProfile());
    const refreshSave = () => setSaveRevision(value => value + 1);
    window.addEventListener('dungeon-veil-meta-changed', refreshMeta);
    window.addEventListener('dungeon-veil-retention-update', refreshRetention as EventListener);
    window.addEventListener(PLAYER_PROFILE_EVENT, refreshProfile as EventListener);
    window.addEventListener(SAVE_EVENT, refreshSave);
    window.addEventListener(PLAYER_NAME_CHANGE_EVENT, refreshSave);
    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', refreshMeta);
      window.removeEventListener('dungeon-veil-retention-update', refreshRetention as EventListener);
      window.removeEventListener(PLAYER_PROFILE_EVENT, refreshProfile as EventListener);
      window.removeEventListener(SAVE_EVENT, refreshSave);
      window.removeEventListener(PLAYER_NAME_CHANGE_EVENT, refreshSave);
    };
  }, []);

  useEffect(() => {
    recordReachedChapter(chapter);
    setProfile(recordPlayerProfileProgress(chapter, room));
  }, [chapter, room]);

  useEffect(() => {
    const capturedGuild = captureGuildInviteTokenFromUrl();
    const capturedCoop = captureCoopInviteCodeFromUrl();
    if (capturedGuild) setOverlay('mailbox');
    else if (capturedCoop) setOverlay('coop');
    const refreshUnread = () => { void mailboxUnreadCount().then(setMailUnread).catch(() => setMailUnread(0)); };
    const openCoopLobby = () => setOverlay('coop');
    window.addEventListener(MAILBOX_EVENT, refreshUnread);
    window.addEventListener(onlineSessionEventName(), refreshUnread);
    window.addEventListener(COOP_LOBBY_OPEN_EVENT, openCoopLobby);
    const mailboxPoll = window.setInterval(refreshUnread, 5_000);
    refreshUnread();
    return () => {
      window.clearInterval(mailboxPoll);
      window.removeEventListener(MAILBOX_EVENT, refreshUnread);
      window.removeEventListener(onlineSessionEventName(), refreshUnread);
      window.removeEventListener(COOP_LOBBY_OPEN_EVENT, openCoopLobby);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      if (!currentOnlineSession()) return;
      void syncSocialProfileProgress(chapter, meta.rank, 'archer').catch(() => {});
    };
    window.addEventListener(onlineSessionEventName(), sync);
    sync();
    return () => window.removeEventListener(onlineSessionEventName(), sync);
  }, [meta.rank, chapter]);

  const startNormalRun = () => { clearWeeklyRiftRun(); props.onNewGame(); };
  const replayTutorial = () => {
    requestTutorialReplay();
    setOverlay(null);
    if (currentSaveData) props.onContinue();
    else props.onNewGame();
  };
  const continueText = currentSaveData
    ? language === 'de' ? `KAP. ${chapter} · RAUM ${room}` : `CH. ${chapter} · ROOM ${room}`
    : t.noSave;

  const action = (label: string, detail: string, icon: IconName, onClick: () => void, tone: 'gold' | 'violet' | 'dark' | 'blue', disabled = false) => {
    const toneClass = tone === 'gold'
      ? 'border-amber-100/28 bg-[linear-gradient(135deg,rgba(126,70,25,.96),rgba(52,25,15,.98))] shadow-[0_10px_22px_rgba(80,42,13,.28)]'
      : tone === 'violet'
        ? 'border-violet-300/18 bg-[linear-gradient(135deg,rgba(43,27,67,.96),rgba(15,12,24,.98))]'
        : tone === 'blue'
          ? 'border-cyan-200/10 bg-[linear-gradient(135deg,rgba(17,29,35,.96),rgba(8,13,17,.98))]'
          : 'border-white/[.09] bg-[linear-gradient(135deg,rgba(22,19,25,.96),rgba(8,8,11,.98))]';
    return <button type="button" disabled={disabled} onPointerDown={event => { event.preventDefault(); if (!disabled) onClick(); }} className={`group min-h-[54px] w-full rounded-[16px] border px-2.5 py-2 text-left shadow-[0_10px_22px_rgba(0,0,0,.3)] backdrop-blur-md transition active:scale-[.975] ${toneClass} ${disabled ? 'opacity-35' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-amber-100/10 bg-black/28 text-amber-100/72 shadow-inner"><MenuIcon name={icon} className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><div className="whitespace-nowrap text-[11px] font-black uppercase tracking-[.025em] text-[#f4ebdf]">{label}</div><div className="mt-0.5 whitespace-nowrap text-[6.2px] uppercase tracking-[.045em] text-white/44">{detail}</div></div>
        {!disabled && <span className="text-base text-white/28 group-active:translate-x-0.5">›</span>}
      </div>
    </button>;
  };

  const resourceMenu = <div className="rounded-3xl border border-amber-100/16 bg-[linear-gradient(145deg,rgba(31,25,19,.98),rgba(12,10,13,.99))] p-3 shadow-[0_24px_70px_rgba(0,0,0,.64)] backdrop-blur-2xl">
    <div className="flex items-start justify-between gap-3 px-1 pb-2">
      <div><div className="text-[7px] font-black uppercase tracking-[.25em] text-amber-100/42">{language === 'de' ? 'GOLD & KONTO' : 'GOLD & ACCOUNT'}</div><div className="mt-1 text-sm font-black text-amber-50">{language === 'de' ? 'Weitere Optionen' : 'More options'}</div></div>
      <button type="button" aria-label={language === 'de' ? 'Gold-Menü schließen' : 'Close gold menu'} onPointerDown={event => { event.preventDefault(); setOverlay(null); }} className="grid h-8 w-8 place-items-center rounded-xl border border-white/9 bg-black/24 text-sm text-white/46 active:scale-90">×</button>
    </div>
    <div className="space-y-1.5">{action('Online & Cloud', language === 'de' ? 'KONTO · PROFIL · SPIELSTAND' : 'ACCOUNT · PROFILE · SAVE', 'friends', () => setOverlay('online'), 'violet')}{action(language === 'de' ? 'Tutorial wiederholen' : 'Replay tutorial', language === 'de' ? 'BEWEGUNG · DASH · KAMPF' : 'MOVEMENT · DASH · COMBAT', 'scroll', replayTutorial, 'dark')}{action(t.settings, '', 'settings', () => { setOverlay(null); props.onSettings(); }, 'dark')}{action(t.credits, '', 'book', () => { setOverlay(null); props.onCredits(); }, 'dark')}</div>
  </div>;

  return <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#050308] text-white">
    {overlay !== 'worldBoss' && <MainMenuDungeonScene />}
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_49%,rgba(126,54,216,.15),transparent_38%),linear-gradient(to_bottom,rgba(2,1,5,.4),rgba(4,2,7,.02)_42%,rgba(5,3,8,.18)_74%,#050307_96%)]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/66 to-transparent" />
    <MainMenuUpdateGate language={language} />

    <ProfileBadge profile={profile} playerName={profileName} rank={meta.rank} language={language} onOpen={() => setOverlay('profile')} />
    <div className="absolute right-3 top-[max(10px,calc(env(safe-area-inset-top)+4px))] z-30 flex items-start gap-1.5">
      <div className="space-y-1">
        <button data-testid="main-menu-dust-button" type="button" onPointerDown={event => { event.preventDefault(); props.onVeilChamber(); }} className="flex h-7 min-w-[92px] items-center rounded-[11px] border border-violet-300/14 bg-black/58 px-2 text-[9px] font-black text-white/72 backdrop-blur-xl active:scale-95"><MenuIcon name="dust" className="mr-1.5 h-3.5 w-3.5 text-violet-400" /><span className="flex-1 text-left">{Number(meta.dust ?? 0).toLocaleString(language === 'de' ? 'de-DE' : 'en-US')}</span><span className="text-sm text-white/32">＋</span></button>
        <button data-testid="main-menu-gold-button" type="button" aria-label={language === 'de' ? 'Gold und weitere Optionen' : 'Gold and more options'} aria-expanded={overlay === 'more'} onPointerDown={event => { event.preventDefault(); setOverlay(current => current === 'more' ? null : 'more'); }} className={`flex h-7 min-w-[92px] items-center rounded-[11px] border px-2 text-[9px] font-black backdrop-blur-xl active:scale-95 ${overlay === 'more' ? 'border-amber-200/30 bg-amber-500/14 text-amber-50' : 'border-amber-200/12 bg-black/58 text-white/72'}`}><MenuIcon name="coin" className="mr-1.5 h-3.5 w-3.5 text-amber-400" /><span className="flex-1 text-left">{gold}</span><span className="text-sm text-white/32">＋</span></button>
      </div>
      <button type="button" aria-label={language === 'de' ? 'Optionen' : 'Options'} onPointerDown={event => { event.preventDefault(); props.onSettings(); }} className="grid h-[60px] w-10 place-items-center rounded-[15px] border border-white/[.09] bg-black/58 text-white/60 backdrop-blur-xl active:scale-95"><MenuIcon name="settings" className="h-5 w-5" /></button>
    </div>

    <div className="relative z-10 flex h-full min-h-0 flex-col pb-[max(8px,calc(env(safe-area-inset-bottom)+2px))] pt-[max(16px,calc(env(safe-area-inset-top)+5px))]">
      <header className="mt-[78px] shrink-0 px-5 text-center sm:mt-[70px]"><div className="mx-auto flex max-w-sm items-center gap-2.5"><span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200/28"/><span className="h-2.5 w-2.5 rotate-45 border border-violet-300/65 bg-violet-600 shadow-[0_0_14px_rgba(139,92,246,.8)]"/><span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200/28"/></div><h1 className="mt-1 bg-gradient-to-b from-[#fff0c9] via-[#d7a85e] to-[#875022] bg-clip-text font-serif text-[clamp(1.9rem,8.2vw,2.75rem)] font-black leading-[.92] tracking-[.02em] text-transparent drop-shadow-[0_5px_18px_rgba(0,0,0,.55)]">DUNGEON VEIL</h1><p className="mt-1 text-[6.5px] uppercase tracking-[.22em] text-amber-50/38">{t.subtitle}</p></header>
      <div data-testid="main-menu-scene-focus" className="relative min-h-[300px] flex-1" />
      <div data-testid="main-menu-control-stack" className="relative z-20 shrink-0"><VillageNpcHub language={language} dailyProgress={`${retention.daily.claimed.length}/3`} mailUnread={mailUnread} onQuests={() => setOverlay('daily')} onMailbox={() => setOverlay('mailbox')} onFriends={() => setOverlay('friends')} onGuild={() => setOverlay('guild')} /><div className="mx-auto mt-1.5 grid w-full max-w-md grid-cols-2 gap-1.5 px-4">{action(t.continueGame, continueText, 'portal', props.onContinue, currentSaveData ? 'gold' : 'dark', !currentSaveData)}{action(language === 'de' ? 'Spielen' : 'Play', 'SOLO · DUO · BOSS', 'swords', () => setOverlay('play'), currentSaveData ? 'dark' : 'gold')}<div data-testid="main-menu-equipment-navigation">{action(language === 'de' ? 'Ausrüstung' : 'Equipment', language === 'de' ? 'BOGEN · RÜSTUNG' : 'BOW · ARMOR', 'bag', props.onVeilChamber, 'violet')}</div>{action(language === 'de' ? 'Kodex' : 'Codex', language === 'de' ? 'BESTIEN · RELIKTE' : 'BEASTS · RELICS', 'book', props.onCodex, 'blue')}</div></div>
    </div>

    {overlay === 'profile' && <PlayerProfilePanel profile={profile} saveData={currentSaveData} meta={meta} retention={retention} language={language} onProfileChange={setProfile} onClose={() => setOverlay(null)} />}

    {overlay === 'more' && <div className="absolute inset-0 z-40 bg-black/20" onPointerDown={() => setOverlay(null)}><div data-testid="main-menu-resource-popover" className="absolute right-3 top-[max(76px,calc(env(safe-area-inset-top)+70px))] w-[min(330px,calc(100vw-24px))]" onPointerDown={event => event.stopPropagation()}>{resourceMenu}</div></div>}

    {overlay && overlay !== 'profile' && overlay !== 'more' && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06070b]/78 px-3 py-[max(12px,env(safe-area-inset-top))] backdrop-blur-md md:px-6" onPointerDown={() => setOverlay(null)}><div className="w-full max-w-sm" onPointerDown={event => event.stopPropagation()}>
      {overlay === 'daily' && <DailyQuestPanel defaultOpen />}
      {overlay === 'mailbox' && <MailboxPanel language={language} onUnreadChange={setMailUnread} />}
      {overlay === 'friends' && <FriendsPanel language={language} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'online' && <OnlinePanel language={language} />}
      {overlay === 'guild' && <GuildSocialPanel language={language} onClose={() => setOverlay(null)} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'play' && <div className="rounded-3xl border border-amber-50/14 bg-[#17130f]/96 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-amber-50/42">{language === 'de' ? 'SPIELMODUS WÄHLEN' : 'CHOOSE GAME MODE'}</div><div className="space-y-2">{action(language === 'de' ? 'Solo-Run' : 'Solo Run', language === 'de' ? 'NEUES ABENTEUER · ALLEINE' : 'NEW ADVENTURE · SOLO', 'swords', () => { setOverlay(null); startNormalRun(); }, 'violet')}{action(language === 'de' ? 'Duo-Run' : 'Duo Run', language === 'de' ? 'PRIVATE LOBBY · 2 SPIELER' : 'PRIVATE LOBBY · 2 PLAYERS', 'friends', () => setOverlay('coop'), 'violet')}{action(language === 'de' ? 'Weltboss' : 'World Boss', language === 'de' ? 'GEMEINSAMER BOSSKAMPF' : 'SHARED BOSS FIGHT', 'boss', () => setOverlay('worldBoss'), 'blue')}</div></div>}
      {overlay === 'worldBoss' && <WorldBossPanel language={language} saveData={currentSaveData} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'coop' && <CoopLobbyPanel language={language} onOpenOnline={() => setOverlay('online')} onStartRun={lobby => { setOverlay(null); props.onStartCoop(lobby); }} />}
      {overlay !== 'guild' && <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay(null); }} className="mt-3 w-full rounded-2xl border border-amber-50/14 bg-[#11100f]/88 py-3 text-[9px] font-black uppercase tracking-[.2em] text-amber-50/58">{language === 'de' ? 'SCHLIESSEN' : 'CLOSE'}</button>}
    </div></div>}
  </div>;
}
