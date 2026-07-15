import React, { useEffect, useMemo, useState } from 'react';
import {
  loadPlayerProfile,
  PLAYER_PROFILE_EVENT,
  recordPlayerProfileQuestCompleted,
  type PlayerProfileProgress,
} from '../game/playerProfile';
import { currentDailyTasks, dailyProgressForTask, loadRetentionProfile, type RetentionProfile } from '../game/runRetention';
import {
  claimWeeklyEliteQuest,
  loadWeeklyEliteState,
  WEEKLY_ELITE_EVENT,
  weeklyEliteProgress,
  weeklyEliteQuests,
  weeklyEliteTimeLabel,
  type WeeklyEliteQuest,
} from '../game/weeklyElite';
import { useLanguage } from '../i18n/LanguageContext';

export function DailyQuestPanel({ compact = false, defaultOpen = false }: { compact?: boolean; defaultOpen?: boolean }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [profile, setProfile] = useState<RetentionProfile>(() => loadRetentionProfile());
  const [playerProfile, setPlayerProfile] = useState<PlayerProfileProgress>(() => loadPlayerProfile());
  const [weeklyState, setWeeklyState] = useState(() => loadWeeklyEliteState(loadPlayerProfile().stats));
  const [open, setOpen] = useState(defaultOpen);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => {
    const refreshDaily = (event?: Event) => {
      const detail = event ? (event as CustomEvent<RetentionProfile>).detail : null;
      setProfile(detail ?? loadRetentionProfile());
    };
    const refreshPlayer = (event?: Event) => {
      const next = (event as CustomEvent<PlayerProfileProgress> | undefined)?.detail ?? loadPlayerProfile();
      setPlayerProfile(next);
      setWeeklyState(loadWeeklyEliteState(next.stats));
    };
    const refreshWeekly = () => setWeeklyState(loadWeeklyEliteState(loadPlayerProfile().stats));
    window.addEventListener('dungeon-veil-retention-update', refreshDaily as EventListener);
    window.addEventListener(PLAYER_PROFILE_EVENT, refreshPlayer as EventListener);
    window.addEventListener(WEEKLY_ELITE_EVENT, refreshWeekly);
    refreshDaily();
    refreshPlayer();
    return () => {
      window.removeEventListener('dungeon-veil-retention-update', refreshDaily as EventListener);
      window.removeEventListener(PLAYER_PROFILE_EVENT, refreshPlayer as EventListener);
      window.removeEventListener(WEEKLY_ELITE_EVENT, refreshWeekly);
    };
  }, []);

  const tasks = useMemo(() => currentDailyTasks(profile), [profile]);
  const completedTasks = useMemo(() => tasks.filter(task => profile.daily.claimed.includes(task.id)), [profile.daily.claimed, tasks]);
  const activeTasks = useMemo(() => tasks.filter(task => !profile.daily.claimed.includes(task.id)), [profile.daily.claimed, tasks]);
  const standardTasks = useMemo(() => tasks.filter(task => !task.gold), [tasks]);
  const goldTasks = useMemo(() => tasks.filter(task => task.gold), [tasks]);
  const activeStandardTasks = useMemo(() => standardTasks.filter(task => !profile.daily.claimed.includes(task.id)), [profile.daily.claimed, standardTasks]);
  const completedStandardTasks = useMemo(() => standardTasks.filter(task => profile.daily.claimed.includes(task.id)), [profile.daily.claimed, standardTasks]);
  const weeklyTasks = useMemo(() => weeklyEliteQuests(weeklyState.weekKey), [weeklyState.weekKey]);
  const activeTask = activeTasks[0] ?? completedTasks[0];
  const activeProgress = activeTask ? dailyProgressForTask(profile, activeTask.id) : 0;

  const dailyTaskCard = (task: (typeof tasks)[number], claimed: boolean) => {
    const value = dailyProgressForTask(profile, task.id);
    const progress = Math.max(0, Math.min(100, task.target ? value / task.target * 100 : 0));
    const status = claimed ? (de ? 'Erledigt' : 'Done') : `✦ ${task.reward}`;
    return <article data-testid={claimed ? 'quest-completed-card' : 'quest-active-card'} data-quest-kind={task.gold ? 'gold' : 'standard'} key={task.id} className={`rounded-xl border px-3 py-2.5 ${claimed ? 'border-emerald-300/15 bg-emerald-400/[.06]' : task.gold ? 'border-amber-200/40 bg-[linear-gradient(135deg,rgba(178,119,28,.18),rgba(70,43,12,.26))]' : 'border-white/8 bg-black/25'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><div className={`text-[10px] font-black ${task.gold ? 'text-amber-100' : 'text-white/82'}`}>{task.gold ? '✹ ' : ''}{task.title}</div><div className="mt-0.5 text-[7px] font-bold leading-relaxed text-white/40">{task.description}</div></div>
        <div className={`shrink-0 rounded-full border px-2 py-1 text-[6px] font-black uppercase tracking-[.11em] ${claimed ? 'border-emerald-300/15 text-emerald-200' : task.gold ? 'border-amber-200/35 bg-amber-200/10 text-amber-100' : 'border-amber-300/15 text-amber-200'}`}>{task.gold ? `${de ? 'GOLD' : 'GOLD'} · ${status}` : status}</div>
      </div>
      <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full ${claimed ? 'bg-emerald-300/75' : 'bg-amber-300/75'}`} style={{ width: `${progress}%` }} /></div><span className="text-[7px] font-black text-white/35">{Math.min(value, task.target)}/{task.target}</span></div>
    </article>;
  };

  const claimWeekly = (quest: WeeklyEliteQuest) => {
    const wasClaimed = weeklyState.claimedQuestIds.includes(quest.id);
    const next = claimWeeklyEliteQuest(quest.id, playerProfile.stats);
    setWeeklyState(next);
    if (!wasClaimed && next.claimedQuestIds.includes(quest.id)) recordPlayerProfileQuestCompleted();
  };

  return <div data-testid="daily-quest-panel" className={`overflow-hidden rounded-2xl border border-amber-300/20 bg-[linear-gradient(120deg,rgba(73,48,16,.72),rgba(9,8,8,.9))] shadow-[0_12px_34px_rgba(0,0,0,.32)] ${compact ? '' : 'backdrop-blur-xl'}`}>
    <button data-testid="quest-board-toggle" type="button" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(value => !value); }} className="flex w-full items-center gap-3 px-4 py-3 text-left active:scale-[.985]">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-300/25 bg-amber-300/10 text-base text-amber-200">✦</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-[.22em] text-amber-100/55"><span>{de ? 'Auftragsbrett' : 'Quest Board'}</span><span>{completedTasks.length}/{tasks.length}</span></div>
        {activeTask && <><div className="mt-1 truncate text-[11px] font-black text-white/82">{activeTasks.length ? activeTask.title : (de ? 'Alle heutigen Aufträge erledigt' : 'All daily quests completed')}</div><div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-amber-300/80" style={{ width: `${activeTask.target ? Math.min(100, activeProgress / activeTask.target * 100) : 0}%` }} /></div></>}
      </div>
      <span className={`text-lg text-amber-100/55 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
    </button>

    {open && <div data-testid="quest-board-content" className="max-h-[68vh] overflow-y-auto border-t border-white/8 px-4 pb-4 pt-3">
      <section data-testid="quest-board-summary" className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/8 bg-black/24 px-2 py-2"><div className="text-[13px] font-black text-amber-100">{activeTasks.length}</div><div className="text-[6px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Heute offen' : 'Open today'}</div></div>
        <div className="rounded-xl border border-white/8 bg-black/24 px-2 py-2"><div className="text-[13px] font-black text-emerald-100">{completedTasks.length}</div><div className="text-[6px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Erledigt' : 'Done'}</div></div>
        <div className="rounded-xl border border-white/8 bg-black/24 px-2 py-2"><div className="text-[13px] font-black text-violet-100">{profile.sigils}</div><div className="text-[6px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Siegel' : 'Sigils'}</div></div>
      </section>

      <section data-testid="quest-active-section" className="mt-3">
        <div className="mb-2 flex items-center justify-between text-[7px] font-black uppercase tracking-[.18em] text-white/38"><span>{de ? 'Tägliche Aufträge' : 'Daily Quests'}</span><span>{activeStandardTasks.length}</span></div>
        <div className="space-y-2">{activeStandardTasks.map(task => dailyTaskCard(task, false))}{!activeStandardTasks.length && <div className="rounded-xl border border-emerald-300/12 bg-emerald-400/[.04] p-3 text-center text-[9px] text-emerald-100/65">{de ? 'Alle normalen Tagesaufträge sind erledigt.' : 'All standard daily quests are complete.'}</div>}</div>
      </section>

      <section data-testid="quest-gold-section" className="mt-3 overflow-hidden rounded-xl border border-amber-200/20 bg-amber-300/[.035] p-2.5">
        <div className="mb-2 flex items-center justify-between text-[7px] font-black uppercase tracking-[.18em] text-amber-100/62"><span>✹ {de ? 'Gold-Aufträge' : 'Gold Quests'}</span><span>{goldTasks.length}</span></div>
        <div className="space-y-2">{goldTasks.map(task => dailyTaskCard(task, profile.daily.claimed.includes(task.id)))}{!goldTasks.length && <div className="rounded-xl border border-amber-200/10 bg-black/16 p-3 text-center text-[8px] leading-relaxed text-amber-50/42">{de ? 'Heute ist kein seltener Gold-Auftrag aktiv.' : 'No rare gold quest is active today.'}</div>}</div>
      </section>

      <section data-testid="quest-elite-section" className="mt-3 overflow-hidden rounded-xl border border-fuchsia-300/22 bg-[linear-gradient(135deg,rgba(91,28,116,.25),rgba(13,9,20,.5))] p-3">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[7px] font-black uppercase tracking-[.2em] text-fuchsia-100">✦ {de ? 'Wöchentliche Elite-Aufträge' : 'Weekly Elite Contracts'}</div><div className="mt-1 text-[6px] leading-relaxed text-fuchsia-50/40">{de ? 'Drei schwere Verträge mit dauerhaften Avatar-, Titel- und Visitenkarten-Belohnungen.' : 'Three hard contracts with permanent avatar, title and calling-card rewards.'}</div></div>
          <div className="shrink-0 text-right"><div className="rounded-lg border border-fuchsia-300/16 bg-fuchsia-400/[.06] px-2 py-1 text-[6px] font-black text-fuchsia-100">{weeklyEliteTimeLabel(language)}</div><div className="mt-1 text-[6px] font-black text-white/35">{de ? 'Elite-Marken' : 'Elite Marks'} · {weeklyState.eliteMarks}</div></div>
        </div>
        <div className="mt-3 space-y-2">{weeklyTasks.map(quest => {
          const value = weeklyEliteProgress(quest, playerProfile.stats, weeklyState);
          const complete = value >= quest.target;
          const claimed = weeklyState.claimedQuestIds.includes(quest.id);
          const percent = Math.max(0, Math.min(100, quest.target ? value / quest.target * 100 : 0));
          return <article key={quest.id} data-testid="weekly-elite-card" className="rounded-xl border border-fuchsia-300/12 bg-black/24 p-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="text-[10px] font-black text-white/86">{de ? quest.titleDe : quest.titleEn}</div><div className="mt-0.5 text-[7px] leading-relaxed text-white/40">{de ? quest.descriptionDe : quest.descriptionEn}</div></div><span className="shrink-0 rounded-full border border-fuchsia-300/16 bg-fuchsia-400/[.06] px-2 py-1 text-[6px] font-black text-fuchsia-100">{de ? quest.reward.nameDe : quest.reward.nameEn}</span></div>
            <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full ${claimed ? 'bg-emerald-300/75' : 'bg-fuchsia-300/75'}`} style={{ width: `${percent}%` }} /></div><span className="text-[7px] font-black text-white/35">{Math.min(value, quest.target)}/{quest.target}</span></div>
            <button type="button" disabled={!complete || claimed} onClick={() => claimWeekly(quest)} className={`mt-2 w-full rounded-lg border py-2 text-[6px] font-black uppercase tracking-[.14em] ${claimed ? 'border-emerald-300/16 bg-emerald-400/[.06] text-emerald-100' : complete ? 'border-fuchsia-300/24 bg-fuchsia-500/12 text-fuchsia-100 active:scale-[.98]' : 'border-white/8 bg-black/20 text-white/24'}`}>{claimed ? (de ? 'Belohnung erhalten' : 'Reward claimed') : complete ? (de ? 'Belohnung abholen' : 'Claim reward') : (de ? 'Noch offen' : 'In progress')}</button>
          </article>;
        })}</div>
      </section>

      <section data-testid="quest-completed-section" className="mt-3 overflow-hidden rounded-xl border border-white/8 bg-black/16">
        <button type="button" onClick={() => setCompletedOpen(value => !value)} className="flex w-full items-center justify-between px-3 py-2.5 text-[7px] font-black uppercase tracking-[.18em] text-white/38"><span>{de ? 'Erledigte Tagesaufträge' : 'Completed Daily Quests'} · {completedStandardTasks.length}</span><span className={`text-base transition-transform ${completedOpen ? 'rotate-90' : ''}`}>›</span></button>
        {completedOpen && <div className="space-y-2 border-t border-white/7 p-2.5">{completedStandardTasks.map(task => dailyTaskCard(task, true))}{!completedStandardTasks.length && <div className="p-2 text-center text-[8px] text-white/28">{de ? 'Noch kein normaler Tagesauftrag erledigt.' : 'No standard daily quest completed yet.'}</div>}</div>}
      </section>
    </div>}
  </div>;
}
