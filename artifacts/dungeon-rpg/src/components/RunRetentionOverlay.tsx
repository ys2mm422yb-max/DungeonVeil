import React, { useEffect, useMemo, useState } from 'react';
import { DAILY_TASKS, loadRetentionProfile, type RetentionProfile } from '../game/runRetention';

type ToastDetail = {
  title: string;
  text: string;
  tone: 'hunt' | 'daily' | 'relic';
};

function progress(profile: RetentionProfile, id: 'rooms' | 'kills' | 'hunt'): number {
  if (id === 'rooms') return profile.daily.rooms;
  if (id === 'kills') return profile.daily.kills;
  return profile.daily.hunts;
}

export function RunRetentionOverlay() {
  const [profile, setProfile] = useState<RetentionProfile>(() => loadRetentionProfile());
  const [toast, setToast] = useState<ToastDetail | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer = 0;
    const update = (event: Event) => {
      const detail = (event as CustomEvent<RetentionProfile>).detail;
      setProfile(detail ?? loadRetentionProfile());
    };
    const showToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail) return;
      window.clearTimeout(hideTimer);
      setToast(detail);
      setVisible(true);
      hideTimer = window.setTimeout(() => setVisible(false), 3200);
    };
    window.addEventListener('dungeon-veil-retention-update', update as EventListener);
    window.addEventListener('dungeon-veil-retention-toast', showToast as EventListener);
    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener('dungeon-veil-retention-update', update as EventListener);
      window.removeEventListener('dungeon-veil-retention-toast', showToast as EventListener);
    };
  }, []);

  const activeTask = useMemo(() => DAILY_TASKS.find(task => !profile.daily.claimed.includes(task.id)) ?? DAILY_TASKS[0], [profile]);
  const activeProgress = Math.min(activeTask.target, progress(profile, activeTask.id));
  const completed = profile.daily.claimed.length;
  const discoveries = profile.codex.enemies.length + profile.codex.bosses.length + profile.codex.hunts.length + profile.codex.relics.length;

  const toastClass = toast?.tone === 'hunt'
    ? 'border-amber-300/35 bg-[linear-gradient(120deg,rgba(79,49,15,.96),rgba(14,10,7,.97))] text-amber-100'
    : toast?.tone === 'relic'
      ? 'border-violet-300/35 bg-[linear-gradient(120deg,rgba(54,28,86,.96),rgba(10,7,15,.97))] text-violet-100'
      : 'border-cyan-300/25 bg-[linear-gradient(120deg,rgba(18,53,65,.96),rgba(8,10,13,.97))] text-cyan-100';

  return (
    <>
      <div className="pointer-events-none fixed right-3 top-[max(5.8rem,calc(env(safe-area-inset-top)+4.8rem))] z-[46] w-[150px] rounded-2xl border border-white/10 bg-black/52 p-3 text-white shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-[.2em] text-white/45">
          <span>Tagesriss</span>
          <span>{completed}/3</span>
        </div>
        <div className="mt-2 text-[10px] font-black text-white/85">{activeTask.title}</div>
        <div className="mt-1 text-[7px] font-bold leading-tight text-white/45">{activeTask.description}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-amber-300/75 transition-all duration-300" style={{ width: `${activeTask.target ? activeProgress / activeTask.target * 100 : 0}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[7px] font-black text-white/45">
          <span>{activeProgress}/{activeTask.target}</span>
          <span className="text-amber-200">✦ {profile.sigils}</span>
        </div>
        <div className="mt-2 border-t border-white/8 pt-2 text-[7px] font-bold tracking-[.12em] text-violet-200/45">KODEX {discoveries} ENTDECKUNGEN</div>
      </div>

      {toast && (
        <div className={`pointer-events-none fixed left-1/2 top-[max(10.5rem,calc(env(safe-area-inset-top)+9.4rem))] z-[72] w-[min(88vw,370px)] -translate-x-1/2 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
          <div className={`overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,.58)] backdrop-blur-xl ${toastClass}`}>
            <div className="text-[8px] font-black uppercase tracking-[.26em] opacity-55">{toast.title}</div>
            <div className="mt-1.5 text-[13px] font-black leading-snug text-white/90">{toast.text}</div>
          </div>
        </div>
      )}
    </>
  );
}
