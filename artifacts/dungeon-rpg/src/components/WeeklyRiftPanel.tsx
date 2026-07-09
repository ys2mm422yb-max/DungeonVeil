import React, { useMemo, useState } from 'react';
import { currentWeeklyRift, nextWeeklyRiftReset } from '../game/weeklyRift';
import { loadWeeklyRiftRecords, queueWeeklyRiftRun } from '../game/weeklyRiftRun';

export function WeeklyRiftPanel({ language, onEnter }: { language: 'de' | 'en'; onEnter: () => void }) {
  const [open, setOpen] = useState(false);
  const rift = useMemo(() => currentWeeklyRift(), []);
  const records = useMemo(() => loadWeeklyRiftRecords(), []);
  const daysLeft = useMemo(() => Math.max(1, Math.ceil((nextWeeklyRiftReset().getTime() - Date.now()) / 86_400_000)), []);
  const de = language === 'de';
  const best = records[rift.id] ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-300/18 bg-[linear-gradient(120deg,rgba(48,29,79,.72),rgba(9,8,12,.9))] shadow-[0_12px_34px_rgba(0,0,0,.3)] backdrop-blur-xl">
      <button type="button" onPointerDown={event => { event.preventDefault(); setOpen(value => !value); }} className="flex w-full items-center gap-3 px-4 py-3 text-left active:scale-[.985]">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-300/25 bg-violet-300/10 text-violet-100">◈</div>
        <div className="min-w-0 flex-1"><div className="text-[7px] font-black uppercase tracking-[.22em] text-violet-100/48">{de ? 'WOCHEN-RISS' : 'WEEKLY RIFT'}</div><div className="mt-1 truncate text-[11px] font-black text-white/82">{de ? rift.nameDe : rift.nameEn}</div></div>
        <span className={`text-lg text-violet-100/50 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="border-t border-white/8 px-4 pb-4 pt-3">
        <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-3"><div className="text-[10px] font-black" style={{ color: rift.accent }}>{de ? rift.nameDe : rift.nameEn}</div><div className="mt-1.5 text-[8px] font-bold leading-relaxed text-white/48">{de ? rift.ruleDe : rift.ruleEn}</div><div className="mt-2 text-[7px] font-black tracking-[.16em] text-violet-100/45">{de ? `BESTE RISS-TIEFE ${best}` : `BEST RIFT DEPTH ${best}`}</div></div>
        <button type="button" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); queueWeeklyRiftRun(); onEnter(); }} className="mt-3 w-full rounded-xl border border-violet-200/35 bg-violet-500/18 py-3 text-[10px] font-black tracking-[.2em] text-violet-100 active:scale-[.98]">{de ? 'RISS BETRETEN' : 'ENTER RIFT'}</button>
        <div className="mt-2 text-[7px] font-black uppercase tracking-[.16em] text-white/30">{de ? `WECHSEL IN ${daysLeft} TAG${daysLeft === 1 ? '' : 'EN'}` : `ROTATES IN ${daysLeft} DAY${daysLeft === 1 ? '' : 'S'}`}</div>
      </div>}
    </div>
  );
}
