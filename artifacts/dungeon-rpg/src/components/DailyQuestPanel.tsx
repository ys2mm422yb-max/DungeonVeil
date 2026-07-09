import React, { useEffect, useMemo, useState } from 'react';
import { DAILY_TASKS, loadRetentionProfile, type RetentionProfile } from '../game/runRetention';

function progress(profile: RetentionProfile, id: 'rooms' | 'kills' | 'hunt'): number {
  if (id === 'rooms') return profile.daily.rooms;
  if (id === 'kills') return profile.daily.kills;
  return profile.daily.hunts;
}

export function DailyQuestPanel({ compact = false }: { compact?: boolean }) {
  const [profile, setProfile] = useState<RetentionProfile>(() => loadRetentionProfile());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = (event?: Event) => {
      const detail = event ? (event as CustomEvent<RetentionProfile>).detail : null;
      setProfile(detail ?? loadRetentionProfile());
    };
    window.addEventListener('dungeon-veil-retention-update', refresh as EventListener);
    refresh();
    return () => window.removeEventListener('dungeon-veil-retention-update', refresh as EventListener);
  }, []);

  const completed = profile.daily.claimed.length;
  const activeTask = useMemo(() => DAILY_TASKS.find(task => !profile.daily.claimed.includes(task.id)) ?? DAILY_TASKS[0], [profile]);
  const activeProgress = Math.min(activeTask.target, progress(profile, activeTask.id));

  return (
    <div className={`overflow-hidden rounded-2xl border border-amber-300/20 bg-[linear-gradient(120deg,rgba(73,48,16,.72),rgba(9,8,8,.9))] shadow-[0_12px_34px_rgba(0,0,0,.32)] ${compact ? '' : 'backdrop-blur-xl'}`}>
      <button
        type="button"
        onPointerDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(value => !value); }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:scale-[.985]"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-300/25 bg-amber-300/10 text-base text-amber-200">✦</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-[.22em] text-amber-100/55">
            <span>Tagesriss</span>
            <span>{completed}/3</span>
          </div>
          <div className="mt-1 truncate text-[11px] font-black text-white/82">{activeTask.title}</div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-amber-300/80" style={{ width: `${activeTask.target ? activeProgress / activeTask.target * 100 : 0}%` }} />
          </div>
        </div>
        <span className={`text-lg text-amber-100/55 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>

      {open && (
        <div className="border-t border-white/8 px-4 pb-4 pt-2.5">
          <div className="mb-2 flex items-center justify-between text-[7px] font-black uppercase tracking-[.18em] text-white/35">
            <span>Tägliche Aufträge</span>
            <span className="text-amber-200">✦ {profile.sigils}</span>
          </div>
          <div className="space-y-2">
            {DAILY_TASKS.map(task => {
              const value = Math.min(task.target, progress(profile, task.id));
              const claimed = profile.daily.claimed.includes(task.id);
              return (
                <div key={task.id} className={`rounded-xl border px-3 py-2.5 ${claimed ? 'border-emerald-300/15 bg-emerald-400/[.06]' : 'border-white/8 bg-black/25'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black text-white/82">{task.title}</div>
                      <div className="mt-0.5 text-[7px] font-bold text-white/40">{task.description}</div>
                    </div>
                    <div className={`text-[7px] font-black ${claimed ? 'text-emerald-200' : 'text-amber-200'}`}>{claimed ? 'ERLEDIGT' : `✦ ${task.reward}`}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full ${claimed ? 'bg-emerald-300/75' : 'bg-amber-300/75'}`} style={{ width: `${task.target ? value / task.target * 100 : 0}%` }} /></div>
                    <span className="text-[7px] font-black text-white/35">{value}/{task.target}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
