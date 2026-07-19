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
import { CompanionManagementPanel } from '../CompanionManagementPanel';

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

type Overlay = 'profile' | 'daily' | 'mailbox' | 'friends' | 'more' | 'play' | 'online' | 'guild' | 'worldBoss' | 'coop' | 'companions' | null;

export function MainMenuScreen(props: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [retention, setRetention] = useState<RetentionProfile>(loadRetentionProfile);
  const [profile, setProfile] = useState<PlayerProfileProgress>(loadPlayerProfile);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [mailUnread, setMailUnread] = useState(0);
  const [, setSaveRevision] = useState(0);
  const currentSaveData = loadGame() ?? props.saveData;
  const gifts = currentSaveData ? Object.entries(currentSaveData.runSkills ?? {}).reduce((sum, [key, value]) => key === 'heal' ? sum : sum + (value ?? 0), 0) : 0;
  const profileName = currentSaveData?.playerName?.trim() || (language === 'de' ? 'Waldläufer' : 'Ranger');

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
    recordReachedChapter(currentSaveData?.chapter ?? 1);
    setProfile(recordPlayerProfileProgress(currentSaveData?.chapter ?? 1, currentSaveData?.floor ?? 1));
  }, [currentSaveData?.chapter, currentSaveData?.floor]);

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
      void syncSocialProfileProgress(currentSaveData?.chapter ?? 1, meta.rank, 'archer').catch(() => {});
    };
    window.addEventListener(onlineSessionEventName(), sync);
    sync();
    return () => window.removeEventListener(onlineSessionEventName(), sync);
  }, [meta.rank, currentSaveData?.chapter]);

  const startNormalRun = () => { clearWeeklyRiftRun(); props.onNewGame(); };
  const replayTutorial = () => {
    requestTutorialReplay();
    setOverlay(null);
    if (currentSaveData) props.onContinue();
    else props.onNewGame();
  };
  const continueText = currentSaveData
    ? language === 'de' ? `Kapitel ${currentSaveData.chapter ?? 1} · Raum ${currentSaveData.floor} · ${gifts} Gaben` : `Chapter ${currentSaveData.chapter ?? 1} · Room ${currentSaveData.floor} · ${gifts} gifts`
    : t.noSave;

  const action = (label: string, detail: string, onClick: () => void, tone: 'gold' | 'dark' | 'violet' | 'blue', disabled = false) => {
    const toneClass = tone === 'gold'
      ? 'border-amber-100/38 bg-[linear-gradient(135deg,#9b5a22,#5d2d16)] text-amber-50'
      : tone === 'violet'
        ? 'border-violet-100/20 bg-[linear-gradient(135deg,#3d315e,#211d38)] text-violet-50'
        : tone === 'blue'
          ? 'border-sky-100/14 bg-[linear-gradient(135deg,#17252c,#10161a)] text-sky-50/82'
          : 'border-white/10 bg-[#151210]/92 text-[#f2e7da]';
    return <button type="button" disabled={disabled} onPointerDown={event => { event.preventDefault(); if (!disabled) onClick(); }} className={`min-h-[62px] w-full rounded-2xl border px-4 py-3 text-left shadow-[0_12px_26px_rgba(0,0,0,.25)] active:scale-[.975] ${toneClass} ${disabled ? 'opacity-35' : ''}`}>
      <div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="text-[12px] font-black tracking-[.08em]">{label}</div><div className="mt-1 truncate text-[6px] uppercase tracking-[.11em] text-white/42">{detail}</div></div>{!disabled && <span className="text-base text-white/32">›</span>}</div>
    </button>;
  };

  return <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#0b0b0e] text-white">
    {overlay !== 'worldBoss' && <MainMenuDungeonScene />}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,8,11,.18),rgba(8,8,11,.04)_36%,rgba(7,7,9,.46)_58%,#08080a_72%)]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/48 to-transparent" />
    <MainMenuUpdateGate language={language} />

    <ProfileBadge profile={profile} playerName={profileName} rank={meta.rank} language={language} onOpen={() => setOverlay('profile')} />
    <button type="button" aria-label="Mehr" onPointerDown={event => { event.preventDefault(); setOverlay('more'); }} className="absolute right-4 top-[max(14px,calc(env(safe-area-inset-top)+6px))] z-30 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/42 text-base text-white/72 backdrop-blur-lg active:scale-95">•••</button>

    <div className="relative z-10 flex h-full flex-col pb-[max(12px,calc(env(safe-area-inset-bottom)+4px))] pt-[max(22px,calc(env(safe-area-inset-top)+10px))]">
      <header className="mt-12 px-5 text-center sm:mt-0"><div className="text-[6px] font-black uppercase tracking-[.46em] text-amber-100/52">{language === 'de' ? 'BETRITT DEN SCHLEIER' : 'ENTER THE VEIL'}</div><h1 className="mt-1 bg-gradient-to-b from-[#f5dfae] via-[#d8a252] to-[#9e622d] bg-clip-text font-serif text-[clamp(2rem,8.5vw,3rem)] font-black leading-[.88] tracking-[.06em] text-transparent drop-shadow-[0_5px_18px_rgba(104,61,16,.24)]">DUNGEON VEIL</h1><p className="mt-2 text-[6px] uppercase tracking-[.24em] text-amber-50/34">{t.subtitle}</p></header>
      <div className="min-h-[220px] flex-1" />
      <VillageNpcHub language={language} dailyProgress={`${retention.daily.claimed.length}/3`} mailUnread={mailUnread} onQuests={() => setOverlay('daily')} onMailbox={() => setOverlay('mailbox')} onFriends={() => setOverlay('friends')} onGuild={() => setOverlay('guild')} />
      <div className="mx-auto mt-2 grid w-full max-w-md grid-cols-2 gap-2 px-4">
        {action(t.continueGame, continueText, props.onContinue, currentSaveData ? 'gold' : 'dark', !currentSaveData)}
        {action(language === 'de' ? 'Spielen' : 'Play', language === 'de' ? 'SOLO · DUO · WELTBOSS' : 'SOLO · DUO · WORLD BOSS', () => setOverlay('play'), currentSaveData ? 'dark' : 'gold')}
        {action(language === 'de' ? 'Inventar' : 'Inventory', language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Staub` : `Rank ${meta.rank} · ${meta.dust} dust`, props.onVeilChamber, 'violet')}
        {action(language === 'de' ? 'Kodex' : 'Codex', language === 'de' ? 'BESTIEN · JAGD · RELIKTE' : 'BEASTS · HUNTS · RELICS', props.onCodex, 'blue')}
        <div className="col-span-2" data-testid="main-menu-companion-navigation">{action(language === 'de' ? 'Begleiter' : 'Companions', language === 'de' ? '1 AKTIV · 4 RESERVE · ROLLEN & BONI' : '1 ACTIVE · 4 RESERVE · ROLES & BONUSES', () => setOverlay('companions'), 'violet')}</div>
      </div>
    </div>

    {overlay === 'profile' && <PlayerProfilePanel profile={profile} saveData={currentSaveData} meta={meta} retention={retention} language={language} onProfileChange={setProfile} onClose={() => setOverlay(null)} />}

    {overlay && overlay !== 'profile' && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06070b]/78 px-3 py-[max(12px,env(safe-area-inset-top))] backdrop-blur-md md:px-6" onPointerDown={() => setOverlay(null)}><div className={overlay === 'companions' ? 'w-full max-w-4xl' : 'w-full max-w-sm'} onPointerDown={event => event.stopPropagation()}>
      {overlay === 'daily' && <DailyQuestPanel defaultOpen />}
      {overlay === 'mailbox' && <MailboxPanel language={language} onUnreadChange={setMailUnread} />}
      {overlay === 'friends' && <FriendsPanel language={language} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'online' && <OnlinePanel language={language} />}
      {overlay === 'guild' && <GuildSocialPanel language={language} onClose={() => setOverlay(null)} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'companions' && <CompanionManagementPanel language={language} />}
      {overlay === 'play' && <div className="rounded-3xl border border-amber-50/14 bg-[#17130f]/96 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-amber-50/42">{language === 'de' ? 'SPIELMODUS WÄHLEN' : 'CHOOSE GAME MODE'}</div><div className="space-y-2">{action(language === 'de' ? 'Solo-Run' : 'Solo Run', language === 'de' ? 'NEUES ABENTEUER · ALLEINE' : 'NEW ADVENTURE · SOLO', () => { setOverlay(null); startNormalRun(); }, 'gold')}{action(language === 'de' ? 'Duo-Run' : 'Duo Run', language === 'de' ? 'PRIVATE LOBBY · 2 SPIELER · VORSCHAU' : 'PRIVATE LOBBY · 2 PLAYERS · PREVIEW', () => setOverlay('coop'), 'violet')}{action(language === 'de' ? 'Weltboss' : 'World Boss', language === 'de' ? 'GEMEINSAMER BOSSKAMPF' : 'SHARED BOSS FIGHT', () => setOverlay('worldBoss'), 'blue')}</div></div>}
      {overlay === 'worldBoss' && <WorldBossPanel language={language} saveData={currentSaveData} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'coop' && <CoopLobbyPanel language={language} onOpenOnline={() => setOverlay('online')} onStartRun={lobby => { setOverlay(null); props.onStartCoop(lobby); }} />}
      {overlay === 'more' && <div className="rounded-3xl border border-amber-50/14 bg-[#17130f]/96 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-amber-50/42">{language === 'de' ? 'WEITERE OPTIONEN' : 'MORE OPTIONS'}</div><div className="space-y-2">{action('Online & Cloud', language === 'de' ? 'KONTO · PROFIL · SPIELSTAND' : 'ACCOUNT · PROFILE · SAVE', () => setOverlay('online'), 'violet')}{action(language === 'de' ? 'Tutorial wiederholen' : 'Replay tutorial', language === 'de' ? 'BEWEGUNG · DASH · KAMPF' : 'MOVEMENT · DASH · COMBAT', replayTutorial, 'dark')}{action(t.settings, '', () => { setOverlay(null); props.onSettings(); }, 'dark')}{action(t.credits, '', () => { setOverlay(null); props.onCredits(); }, 'dark')}</div></div>}
      {overlay !== 'guild' && <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay(null); }} className="mt-3 w-full rounded-2xl border border-amber-50/14 bg-[#11100f]/88 py-3 text-[9px] font-black uppercase tracking-[.2em] text-amber-50/58">{language === 'de' ? 'SCHLIESSEN' : 'CLOSE'}</button>}
    </div></div>}
  </div>;
}
