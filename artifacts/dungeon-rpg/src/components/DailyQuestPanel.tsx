import React, { useEffect, useMemo, useState } from 'react';
import { currentDailyTasks, dailyProgressForTask, loadRetentionProfile, type RetentionProfile } from '../game/runRetention';
import { useLanguage } from '../i18n/LanguageContext';

export function DailyQuestPanel({ compact = false, defaultOpen = false }: { compact?: boolean; defaultOpen?: boolean }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [profile, setProfile] = useState<RetentionProfile>(() => loadRetentionProfile());
  const [open, setOpen] = useState(defaultOpen);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => {
    const refresh = (event?: Event) => {
      const detail = event ? (event as CustomEvent<RetentionProfile>).detail : null;
      setProfile(detail ?? loadRetentionProfile());
    };
    window.addEventListener('dungeon-veil-retention-update', refresh as EventListener);
    refresh();
    return () => window.removeEventListener('dungeon-veil-retention-update', refresh as EventListener);
  }, []);

  const tasks = useMemo(() => currentDailyTasks(profile), [profile]);
  const completedTasks = useMemo(() => tasks.filter(task => profile.daily.claimed.includes(task.id)), [profile.daily.claimed, tasks]);
  const activeTasks = useMemo(() => tasks.filter(task => !profile.daily.claimed.includes(task.id)), [profile.daily.claimed, tasks]);
  const activeTask = activeTasks[0] ?? completedTasks[0];
  const activeProgress = activeTask ? dailyProgressForTask(profile, activeTask.id) : 0;
  const hasGold = tasks.some(task => task.gold);

  const taskCard = (task: (typeof tasks)[number], claimed: boolean) => {
    const value = dailyProgressForTask(profile, task.id);
    const progress = Math.max(0, Math.min(100, task.target ? value / task.target * 100 : 0));
    return <article data-testid={claimed ? 'quest-completed-card' : 'quest-active-card'} key={task.id} className={`rounded-xl border px-3 py-2.5 ${claimed ? 'border-emerald-300/15 bg-emerald-400/[.06]' : task.gold ? 'border-amber-200/30 bg-amber-300/[.08]' : 'border-white/8 bg-black/25'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><div className={`text-[10px] font-black ${task.gold ? 'text-amber-100' : 'text-white/82'}`}>{task.gold ? '✹ ' : ''}{task.title}</div><div className="mt-0.5 text-[7px] font-bold leading-relaxed text-white/40">{task.description}</div></div>
        <div className={`shrink-0 rounded-full border px-2 py-1 text-[6px] font-black uppercase tracking-[.11em] ${claimed ? 'border-emerald-300/15 text-emerald-200' : 'border-amber-300/15 text-amber-200'}`}>{claimed ? (de ? 'Erledigt' : 'Done') : `✦ ${task.reward}`}</div>
      </div>
      <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full ${claimed ? 'bg-emerald-300/75' : 'bg-amber-300/75'}`} style={{ width: `${progress}%` }} /></div><span className="text-[7px] font-black text-white/35">{Math.min(value, task.target)}/{task.target}</span></div>
    </article>;
  };

  return <div data-testid="daily-quest-panel" className={`overflow-hidden rounded-2xl border ${hasGold ? 'border-amber-200/35 bg-[linear-gradient(120deg,rgba(104,69,17,.78),rgba(9,8,8,.92))]' : 'border-amber-300/20 bg-[linear-gradient(120deg,rgba(73,48,16,.72),rgba(9,8,8,.9))]'} shadow-[0_12px_34px_rgba(0,0,0,.32)] ${compact ? '' : 'backdrop-blur-xl'}`}>
    <button data-testid="quest-board-toggle" type="button" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(value => !value); }} className="flex w-full items-center gap-3 px-4 py-3 text-left active:scale-[.985]">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-300/25 bg-amber-300/10 text-base text-amber-200">{hasGold ? '✹' : '✦'}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-[.22em] text-amber-100/55"><span>{de ? 'Auftragsbrett' : 'Quest Board'}</span><span>{completedTasks.length}/{tasks.length}</span></div>
        {activeTask && <><div className="mt-1 truncate text-[11px] font-black text-white/82">{activeTasks.length ? activeTask.title : (de ? 'Alle heutigen Aufträge erledigt' : 'All daily quests completed')}</div><div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-amber-300/80" style={{ width: `${activeTask.target ? Math.min(100, activeProgress / activeTask.target * 100) : 0}%` }} /></div></>}
      </div>
      <span className={`text-lg text-amber-100/55 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
    </button>

    {open && <div data-testid="quest-board-content" className="border-t border-white/8 px-4 pb-4 pt-3">
      <section data-testid="quest-board-summary" className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/8 bg-black/24 px-2 py-2"><div className="text-[13px] font-black text-amber-100">{activeTasks.length}</div><div className="text-[6px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Offen' : 'Open'}</div></div>
        <div className="rounded-xl border border-white/8 bg-black/24 px-2 py-2"><div className="text-[13px] font-black text-emerald-100">{completedTasks.length}</div><div className="text-[6px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Erledigt' : 'Done'}</div></div>
        <div className="rounded-xl border border-white/8 bg-black/24 px-2 py-2"><div className="text-[13px] font-black text-violet-100">{profile.sigils}</div><div className="text-[6px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Siegel' : 'Sigils'}</div></div>
      </section>

      <section data-testid="quest-active-section" className="mt-3">
        <div className="mb-2 flex items-center justify-between text-[7px] font-black uppercase tracking-[.18em] text-white/38"><span>{de ? 'Aktive Aufträge' : 'Active Quests'}</span><span>{activeTasks.length}</span></div>
        <div className="space-y-2">{activeTasks.map(task => taskCard(task, false))}{!activeTasks.length && <div className="rounded-xl border border-emerald-300/12 bg-emerald-400/[.04] p-3 text-center text-[9px] text-emerald-100/65">{de ? 'Alle heutigen Aufträge sind erledigt.' : 'All daily quests are complete.'}</div>}</div>
      </section>

      <section data-testid="quest-completed-section" className="mt-3 overflow-hidden rounded-xl border border-white/8 bg-black/16">
        <button type="button" onClick={() => setCompletedOpen(value => !value)} className="flex w-full items-center justify-between px-3 py-2.5 text-[7px] font-black uppercase tracking-[.18em] text-white/38"><span>{de ? 'Erledigte Aufträge' : 'Completed Quests'} · {completedTasks.length}</span><span className={`text-base transition-transform ${completedOpen ? 'rotate-90' : ''}`}>›</span></button>
        {completedOpen && <div className="space-y-2 border-t border-white/7 p-2.5">{completedTasks.map(task => taskCard(task, true))}{!completedTasks.length && <div className="p-2 text-center text-[8px] text-white/28">{de ? 'Noch nichts erledigt.' : 'Nothing completed yet.'}</div>}</div>}
      </section>
    </div>}
  </div>;
}
