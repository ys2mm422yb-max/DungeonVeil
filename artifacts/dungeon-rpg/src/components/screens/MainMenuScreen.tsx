import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SaveData } from '../../game/saveManager';
import { loadMetaProgression } from '../../game/metaProgression';
import { recordReachedChapter } from '../../game/equipmentChapterGates';
import { clearWeeklyRiftRun } from '../../game/weeklyRiftRun';
import { loadRetentionProfile, type RetentionProfile } from '../../game/runRetention';
import { captureGuildInviteTokenFromUrl, mailboxUnreadCount, MAILBOX_EVENT } from '../../game/guildMailboxOnline';
import { currentOnlineSession, onlineSessionEventName } from '../../game/supabaseOnline';
import { syncSocialProfileProgress } from '../../game/socialProgressOnline';
import { requestTutorialReplay } from '../../game/tutorialState';
import { loadPlayerProfile, PLAYER_PROFILE_EVENT, recordPlayerProfileProgress, type PlayerProfileProgress } from '../../game/playerProfile';
import { MainMenuDungeonScene } from '../MainMenuDungeonScene';
import { DailyQuestPanel } from '../DailyQuestPanel';
import { OnlinePanel } from '../OnlinePanel';
import { GuildSocialPanel } from '../GuildSocialPanel';
import { MailboxPanel } from '../MailboxPanel';
import { FriendsPanel } from '../FriendsPanel';
import { VillageNpcHub } from '../VillageNpcHub';
import { WorldBossPanel } from '../WorldBossPanel';
import { ProfileBadge } from '../ProfileBadge';
import { PlayerProfilePanel } from '../PlayerProfilePanel';

interface Props {
  saveData: SaveData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onVeilChamber: () => void;
  onCodex: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

type Overlay = 'profile' | 'daily' | 'mailbox' | 'friends' | 'more' | 'online' | 'guild' | 'worldBoss' | null;

export function MainMenuScreen(props: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [retention, setRetention] = useState<RetentionProfile>(loadRetentionProfile);
  const [profile, setProfile] = useState<PlayerProfileProgress>(loadPlayerProfile);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [mailUnread, setMailUnread] = useState(0);
  const gifts = props.saveData ? Object.entries(props.saveData.runSkills ?? {}).reduce((sum, [key, value]) => key === 'heal' ? sum : sum + (value ?? 0), 0) : 0;
  const profileName = props.saveData?.playerName?.trim() || (language === 'de' ? 'Waldläufer' : 'Ranger');

  useEffect(() => {
    const refreshMeta = () => setMeta(loadMetaProgression());
    const refreshRetention = (event?: Event) => setRetention((event as CustomEvent<RetentionProfile> | undefined)?.detail ?? loadRetentionProfile());
    const refreshProfile = (event?: Event) => setProfile((event as CustomEvent<PlayerProfileProgress> | undefined)?.detail ?? loadPlayerProfile());
    window.addEventListener('dungeon-veil-meta-changed', refreshMeta);
    window.addEventListener('dungeon-veil-retention-update', refreshRetention as EventListener);
    window.addEventListener(PLAYER_PROFILE_EVENT, refreshProfile as EventListener);
    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', refreshMeta);
      window.removeEventListener('dungeon-veil-retention-update', refreshRetention as EventListener);
      window.removeEventListener(PLAYER_PROFILE_EVENT, refreshProfile as EventListener);
    };
  }, []);

  useEffect(() => {
    recordReachedChapter(props.saveData?.chapter ?? 1);
    setProfile(recordPlayerProfileProgress(props.saveData?.chapter ?? 1, props.saveData?.floor ?? 1));
  }, [props.saveData?.chapter, props.saveData?.floor]);

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

  const action = (label: string, detail: string, onClick: () => void, tone: 'gold' | 'dark' | 'violet' | 'blue', disabled = false) => {
    const toneClass = tone === 'gold'
      ? 'border-amber-100/38 bg-[linear-gradient(135deg,#9b5a22,#5d2d16)] text-amber-50'
      : tone === 'violet'
        ? 'border-violet-100/20 bg-[linear-gradient(135deg,#3d315e,#211d38)] text-violet-50'
        : tone === 'blue'
          ? 'border-sky-100/14 bg-[linear-gradient(135deg,#17252c,#10161a)] text-sky-50/82'
          : 'border-white/10 bg-[#151210]/92 text-[#f2e7da]';
    return <button type="button" disabled={disabled} onPointerDown={event => { event.preventDefault(); if (!disabled) onClick(); }} className={`min-h-[62px] rounded-2xl border px-4 py-3 text-left shadow-[0_12px_26px_rgba(0,0,0,.25)] active:scale-[.975] ${toneClass} ${disabled ? 'opacity-35' : ''}`}>
      <div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="text-[12px] font-black tracking-[.08em]">{label}</div><div className="mt-1 truncate text-[6px] uppercase tracking-[.11em] text-white/42">{detail}</div></div>{!disabled && <span className="text-base text-white/32">›</span>}</div>
    </button>;
  };

  return <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#0b0b0e] text-white">
    {overlay !== 'worldBoss' && <MainMenuDungeonScene />}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,8,11,.18),rgba(8,8,11,.04)_36%,rgba(7,7,9,.46)_58%,#08080a_72%)]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/48 to-transparent" />

    <ProfileBadge profile={profile} playerName={profileName} rank={meta.rank} language={language} onOpen={() => setOverlay('profile')} />
    <button type="button" aria-label="Mehr" onPointerDown={event => { event.preventDefault(); setOverlay('more'); }} className="absolute right-4 top-[max(14px,calc(env(safe-area-inset-top)+6px))] z-30 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/42 text-base text-white/72 backdrop-blur-lg active:scale-95">•••</button>

    <div className="relative z-10 flex h-full flex-col pb-[max(12px,calc(env(safe-area-inset-bottom)+4px))] pt-[max(22px,calc(env(safe-area-inset-top)+10px))]">
      <header className="mt-12 px-5 text-center sm:mt-0">
        <div className="text-[6px] font-black uppercase tracking-[.46em] text-amber-100/52">{language === 'de' ? 'BETRITT DEN SCHLEIER' : 'ENTER THE VEIL'}</div>
        <h1 className="mt-1 bg-gradient-to-b from-[#f5dfae] via-[#d8a252] to-[#9e622d] bg-clip-text font-serif text-[clamp(2rem,8.5vw,3rem)] font-black leading-[.88] tracking-[.06em] text-transparent drop-shadow-[0_5px_18px_rgba(104,61,16,.24)]">DUNGEON VEIL</h1>
        <p className="mt-2 text-[6px] uppercase tracking-[.24em] text-amber-50/34">{t.subtitle}</p>
      </header>

      <div className="min-h-[250px] flex-1" />

      <VillageNpcHub
        language={language}
        dailyProgress={`${retention.daily.claimed.length}/3`}
        mailUnread={mailUnread}
        onQuests={() => setOverlay('daily')}
        onMailbox={() => setOverlay('mailbox')}
        onFriends={() => setOverlay('friends')}
        onGuild={() => setOverlay('guild')}
        onWorldBoss={() => setOverlay('worldBoss')}
      />

      <div className="mx-auto mt-2 grid w-full max-w-md grid-cols-2 gap-2 px-4">
        {action(t.newGame, language === 'de' ? 'NEUES ABENTEUER' : 'NEW ADVENTURE', startNormalRun, 'gold')}
        {action(t.continueGame, continueText, props.onContinue, 'dark', !props.saveData)}
        {action(language === 'de' ? 'Inventar' : 'Inventory', language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Staub` : `Rank ${meta.rank} · ${meta.dust} dust`, props.onVeilChamber, 'violet')}
        {action(language === 'de' ? 'Kodex' : 'Codex', language === 'de' ? 'BESTIEN · JAGD · RELIKTE' : 'BEASTS · HUNTS · RELICS', props.onCodex, 'blue')}
      </div>
    </div>

    {overlay === 'profile' && <PlayerProfilePanel profile={profile} saveData={props.saveData} meta={meta} retention={retention} language={language} onProfileChange={setProfile} onClose={() => setOverlay(null)} />}

    {overlay && overlay !== 'profile' && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06070b]/78 px-5 backdrop-blur-md" onPointerDown={() => setOverlay(null)}><div className="w-full max-w-sm" onPointerDown={event => event.stopPropagation()}>
      {overlay === 'daily' && <DailyQuestPanel defaultOpen />}
      {overlay === 'mailbox' && <MailboxPanel language={language} onUnreadChange={setMailUnread} />}
      {overlay === 'friends' && <FriendsPanel language={language} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'online' && <OnlinePanel language={language} />}
      {overlay === 'guild' && <GuildSocialPanel language={language} onClose={() => setOverlay(null)} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'worldBoss' && <WorldBossPanel language={language} saveData={props.saveData} onOpenOnline={() => setOverlay('online')} />}
      {overlay === 'more' && <div className="rounded-3xl border border-amber-50/14 bg-[#17130f]/96 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-amber-50/42">{language === 'de' ? 'WEITERE OPTIONEN' : 'MORE OPTIONS'}</div><div className="space-y-2">{action('Online & Cloud', language === 'de' ? 'KONTO · PROFIL · SPIELSTAND' : 'ACCOUNT · PROFILE · SAVE', () => setOverlay('online'), 'violet')}{action(language === 'de' ? 'Tutorial wiederholen' : 'Replay tutorial', language === 'de' ? 'BEWEGUNG · DASH · KAMPF' : 'MOVEMENT · DASH · COMBAT', replayTutorial, 'dark')}{action(t.settings, '', () => { setOverlay(null); props.onSettings(); }, 'dark')}{action(t.credits, '', () => { setOverlay(null); props.onCredits(); }, 'dark')}</div></div>}
      {overlay !== 'guild' && <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay(null); }} className="mt-3 w-full rounded-2xl border border-amber-50/14 bg-[#11100f]/88 py-3 text-[9px] font-black uppercase tracking-[.2em] text-amber-50/58">{language === 'de' ? 'SCHLIESSEN' : 'CLOSE'}</button>}
    </div></div>}
  </div>;
}
