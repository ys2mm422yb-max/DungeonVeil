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
  const chapterProgress = Math.max(4, Math.min(100, ((room - 1) % 10 + 1) * 10));
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
    ? language === 'de' ? `Kapitel ${chapter} · Raum ${room}` : `Chapter ${chapter} · Room ${room}`
    : t.noSave;

  const action = (label: string, detail: string, icon: IconName, onClick: () => void, tone: 'gold' | 'violet' | 'dark' | 'blue', disabled = false) => {
    const toneClass = tone === 'gold'
      ? 'border-amber-100/30 bg-[linear-gradient(135deg,rgba(141,80,28,.98),rgba(63,31,18,.98))] shadow-[0_14px_30px_rgba(80,42,13,.3)]'
      : tone === 'violet'
        ? 'border-violet-300/20 bg-[linear-gradient(135deg,rgba(48,30,75,.96),rgba(16,13,27,.98))]'
        : tone === 'blue'
          ? 'border-cyan-200/12 bg-[linear-gradient(135deg,rgba(18,31,38,.96),rgba(9,14,18,.98))]'
          : 'border-white/10 bg-[linear-gradient(135deg,rgba(24,21,27,.96),rgba(9,9,12,.98))]';
    return <button type="button" disabled={disabled} onPointerDown={event => { event.preventDefault(); if (!disabled) onClick(); }} className={`group min-h-[64px] w-full rounded-[20px] border px-3 py-2.5 text-left shadow-[0_14px_28px_rgba(0,0,0,.32)] backdrop-blur-md transition active:scale-[.975] ${toneClass} ${disabled ? 'opacity-35' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-100/12 bg-black/28 text-amber-100/75 shadow-inner"><MenuIcon name={icon} className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1"><div className="text-[14px] font-black uppercase tracking-[.055em] text-[#f4ebdf]">{label}</div><div className="mt-1 truncate text-[7px] uppercase tracking-[.08em] text-white/44">{detail}</div></div>
        {!disabled && <span className="text-lg text-white/30 group-active:translate-x-0.5">›</span>}
      </div>
    </button>;
  };

  const statusCard = (title: string, detail: string, icon: IconName, tone: string, onClick: () => void) => <button type="button" onPointerDown={event => { event.preventDefault(); onClick(); }} className="flex min-h-[46px] w-full items-center gap-2 rounded-xl border border-white/10 bg-black/58 px-2.5 py-1.5 text-left shadow-[0_9px_20px_rgba(0,0,0,.3)] backdrop-blur-md active:scale-[.98]">
    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 ${tone}`}><MenuIcon name={icon} className="h-5 w-5" /></div>
    <div className="min-w-0"><div className="truncate text-[7px] font-black uppercase tracking-[.08em] text-white/78">{title}</div><div className="mt-0.5 truncate text-[7px] font-bold text-violet-300/90">{detail}</div></div>
  </button>;

  return <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#050308] text-white">
    {overlay !== 'worldBoss' && <MainMenuDungeonScene />}
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(109,40,217,.08),transparent_32%),linear-gradient(to_bottom,rgba(2,1,5,.32),rgba(4,2,7,.04)_42%,rgba(5,3,8,.32)_62%,#050307_79%)]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 to-transparent" />
    <MainMenuUpdateGate language={language} />

    <ProfileBadge profile={profile} playerName={profileName} rank={meta.rank} language={language} onOpen={() => setOverlay('profile')} />
    <div className="absolute right-3 top-[max(12px,calc(env(safe-area-inset-top)+5px))] z-30 flex items-start gap-1.5">
      <div className="space-y-1">
        <button type="button" onPointerDown={event => { event.preventDefault(); props.onVeilChamber(); }} className="flex h-8 min-w-[104px] items-center rounded-xl border border-violet-300/16 bg-black/58 px-2 text-[10px] font-black text-white/74 backdrop-blur-xl active:scale-95"><MenuIcon name="dust" className="mr-1.5 h-4 w-4 text-violet-400" /><span className="flex-1 text-left">{Number(meta.dust ?? 0).toLocaleString(language === 'de' ? 'de-DE' : 'en-US')}</span><span className="text-base text-white/35">＋</span></button>
        <button type="button" aria-label={language === 'de' ? 'Mehr' : 'More'} onPointerDown={event => { event.preventDefault(); setOverlay('more'); }} className="flex h-8 min-w-[104px] items-center rounded-xl border border-amber-200/14 bg-black/58 px-2 text-[10px] font-black text-white/74 backdrop-blur-xl active:scale-95"><MenuIcon name="coin" className="mr-1.5 h-4 w-4 text-amber-400" /><span className="flex-1 text-left">{gold}</span><span className="text-base text-white/35">＋</span></button>
      </div>
      <button type="button" aria-label={language === 'de' ? 'Optionen' : 'Options'} onPointerDown={event => { event.preventDefault(); props.onSettings(); }} className="grid h-[68px] w-11 place-items-center rounded-2xl border border-white/10 bg-black/58 text-white/62 backdrop-blur-xl active:scale-95"><MenuIcon name="settings" className="h-6 w-6" /></button>
    </div>

    <div className="relative z-10 flex h-full flex-col pb-[max(10px,calc(env(safe-area-inset-bottom)+3px))] pt-[max(18px,calc(env(safe-area-inset-top)+6px))]">
      <header className="mt-[100px] px-5 text-center sm:mt-20">
        <div className="mx-auto flex max-w-md items-center gap-3"><span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200/35"/><span className="h-3 w-3 rotate-45 border border-violet-300/70 bg-violet-600 shadow-[0_0_16px_rgba(139,92,246,.9)]"/><span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200/35"/></div>
        <h1 className="mt-1 bg-gradient-to-b from-[#fff0c9] via-[#d7a85e] to-[#875022] bg-clip-text font-serif text-[clamp(2.05rem,9vw,3.05rem)] font-black leading-[.9] tracking-[.025em] text-transparent drop-shadow-[0_5px_18px_rgba(0,0,0,.55)]">DUNGEON VEIL</h1>
        <p className="mt-1.5 text-[7px] uppercase tracking-[.25em] text-amber-50/40">{t.subtitle}</p>
      </header>

      <div className="relative min-h-[250px] flex-1 px-4">
        <div className="absolute bottom-2 left-4 w-[124px] space-y-1.5">
          {statusCard(language === 'de' ? 'Weltboss' : 'World Boss', language === 'de' ? 'AKTIV · 12:57' : 'ACTIVE · 12:57', 'boss', 'bg-violet-950/80 text-violet-300', () => setOverlay('worldBoss'))}
          {statusCard(language === 'de' ? 'Tagesbelohnung' : 'Daily Reward', retention.daily.claimed.length >= 3 ? (language === 'de' ? 'Abgeholt' : 'Claimed') : (language === 'de' ? 'Bereit' : 'Ready'), 'gift', 'bg-amber-950/70 text-amber-300', () => setOverlay('daily'))}
        </div>
        <button type="button" onPointerDown={event => { event.preventDefault(); if (currentSaveData) props.onContinue(); }} className="absolute bottom-2 right-4 w-[124px] rounded-2xl border border-white/10 bg-black/62 p-2.5 text-left shadow-[0_11px_24px_rgba(0,0,0,.36)] backdrop-blur-md active:scale-[.98]">
          <div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-full border border-violet-300/20 bg-violet-950/75 text-[11px] font-black text-white/80">{chapter}</div><div className="min-w-0"><div className="truncate text-[7px] font-black uppercase tracking-[.08em] text-white/78">{language === 'de' ? `Kapitel ${chapter}` : `Chapter ${chapter}`}</div><div className="mt-0.5 truncate text-[6px] uppercase tracking-[.06em] text-white/42">{language === 'de' ? 'Schleierwacht' : 'Veil Watch'}</div></div></div>
          <div className="mt-2.5 text-[6px] font-black uppercase tracking-[.08em] text-white/44">{language === 'de' ? `Fortschritt ${chapterProgress}%` : `Progress ${chapterProgress}%`}</div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-violet-700 to-fuchsia-500" style={{ width: `${chapterProgress}%` }} /></div>
          <div className="mt-2 flex items-center gap-1.5 text-[7px] font-bold text-white/52"><MenuIcon name="gift" className="h-3.5 w-3.5" />{language === 'de' ? 'Belohnungen' : 'Rewards'}</div>
        </button>
      </div>

      <VillageNpcHub
        language={language}
        dailyProgress={`${retention.daily.claimed.length}/3`}
        mailUnread={mailUnread}
        onQuests={() => setOverlay('daily')}
        onMailbox={() => setOverlay('mailbox')}
        onFriends={() => setOverlay('friends')}
        onGuild={() => setOverlay('guild')}
      />

      <div className="mx-auto mt-2 grid w-full max-w-md grid-cols-2 gap-2 px-4">
        {action(t.continueGame, continueText, 'portal', props.onContinue, currentSaveData ? 'gold' : 'dark', !currentSaveData)}
        {action(language === 'de' ? 'Spielen' : 'Play', language === 'de' ? 'SOLO · DUO · BOSS' : 'SOLO · DUO · BOSS', 'swords', () => setOverlay('play'), currentSaveData ? 'dark' : 'gold')}
        <div data-testid="main-menu-equipment-navigation">{action(language === 'de' ? 'Ausrüstung' : 'Equipment', language === 'de' ? 'BOGEN · RÜSTUNG · BEGLEITER' : 'BOW · ARMOR · COMPANION', 'bag', props.onVeilChamber, 'violet')}</div>
        {action(language === 'de' ? 'Kodex' : 'Codex', language === 'de' ? 'BESTIEN · RELIKTE' : 'BEASTS · RELICS', 'book', props.onCodex, 'blue')}
      </div>
    </div>

    {overlay === 'profile' && <PlayerProfilePanel profile={profile} saveData={currentSaveData} meta={meta} retention={retention} language={language} onProfileChange={setProfile} onClose={() => setOverlay(null)} />}

    {overlay && overlay !== 'profile' && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06070b]/78 px-3 py-[max(12px,env(safe-area-inset-top))] backdrop-blur-md md:px-6" onPointerDown={() => setOverlay(null)}><div className="w-full max-w-sm" onPointerDown={event => event.stopPropagation()}>
      {overlay === 'daily' && <DailyQuestPanel defaultOpen />}
      {overlay === 'mailbox' && <MailboxPanel language={language} onUnreadChange={setMailUnread} />}
      {overlay === 'friends' && <FriendsPanel language={language} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'online' && <OnlinePanel language={language} />}
      {overlay === 'guild' && <GuildSocialPanel language={language} onClose={() => setOverlay(null)} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'play' && <div className="rounded-3xl border border-amber-50/14 bg-[#17130f]/96 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-amber-50/42">{language === 'de' ? 'SPIELMODUS WÄHLEN' : 'CHOOSE GAME MODE'}</div><div className="space-y-2">{action(language === 'de' ? 'Solo-Run' : 'Solo Run', language === 'de' ? 'NEUES ABENTEUER · ALLEINE' : 'NEW ADVENTURE · SOLO', 'swords', () => { setOverlay(null); startNormalRun(); }, 'violet')}{action(language === 'de' ? 'Duo-Run' : 'Duo Run', language === 'de' ? 'PRIVATE LOBBY · 2 SPIELER' : 'PRIVATE LOBBY · 2 PLAYERS', 'friends', () => setOverlay('coop'), 'violet')}{action(language === 'de' ? 'Weltboss' : 'World Boss', language === 'de' ? 'GEMEINSAMER BOSSKAMPF' : 'SHARED BOSS FIGHT', 'boss', () => setOverlay('worldBoss'), 'blue')}</div></div>}
      {overlay === 'worldBoss' && <WorldBossPanel language={language} saveData={currentSaveData} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'coop' && <CoopLobbyPanel language={language} onOpenOnline={() => setOverlay('online')} onStartRun={lobby => { setOverlay(null); props.onStartCoop(lobby); }} />}
      {overlay === 'more' && <div className="rounded-3xl border border-amber-50/14 bg-[#17130f]/96 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-amber-50/42">{language === 'de' ? 'WEITERE OPTIONEN' : 'MORE OPTIONS'}</div><div className="space-y-2">{action('Online & Cloud', language === 'de' ? 'KONTO · PROFIL · SPIELSTAND' : 'ACCOUNT · PROFILE · SAVE', 'friends', () => setOverlay('online'), 'violet')}{action(language === 'de' ? 'Tutorial wiederholen' : 'Replay tutorial', language === 'de' ? 'BEWEGUNG · DASH · KAMPF' : 'MOVEMENT · DASH · COMBAT', 'scroll', replayTutorial, 'dark')}{action(t.settings, '', 'settings', () => { setOverlay(null); props.onSettings(); }, 'dark')}{action(t.credits, '', 'book', () => { setOverlay(null); props.onCredits(); }, 'dark')}</div></div>}
      {overlay !== 'guild' && <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay(null); }} className="mt-3 w-full rounded-2xl border border-amber-50/14 bg-[#11100f]/88 py-3 text-[9px] font-black uppercase tracking-[.2em] text-amber-50/58">{language === 'de' ? 'SCHLIESSEN' : 'CLOSE'}</button>}
    </div></div>}
  </div>;
}
