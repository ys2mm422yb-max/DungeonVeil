import React, { useMemo } from 'react';
import { nextWeeklyRiftReset } from '../game/weeklyRift';

const BOSSES = [
  { de: 'Vorakh, der Schleierfresser', en: 'Vorakh, Veil Devourer', accent: '#a978ff' },
  { de: 'Morgra, die Aschenkönigin', en: 'Morgra, Ash Queen', accent: '#e47755' },
  { de: 'Kharos, der gefrorene Eid', en: 'Kharos, Frozen Oath', accent: '#72dfff' },
] as const;

function weekIndex() {
  return Math.floor(Date.now() / (7 * 86_400_000));
}

export function WeeklyRiftPanel({ language }: { language: 'de' | 'en' }) {
  const boss = useMemo(() => BOSSES[weekIndex() % BOSSES.length], []);
  const daysLeft = useMemo(() => Math.max(1, Math.ceil((nextWeeklyRiftReset().getTime() - Date.now()) / 86_400_000)), []);
  const de = language === 'de';

  return (
    <div className="rounded-3xl border border-violet-300/20 bg-[linear-gradient(145deg,rgba(54,31,89,.92),rgba(7,6,10,.97))] p-5 shadow-2xl">
      <div className="text-[8px] font-black uppercase tracking-[.32em] text-violet-200/50">{de ? 'WOCHEN-RISS · GEMEINSAMER BOSS' : 'WEEKLY RIFT · SHARED BOSS'}</div>
      <div className="mt-3 font-serif text-[1.6rem] font-black leading-tight" style={{ color: boss.accent }}>{de ? boss.de : boss.en}</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/8 bg-black/30 p-3"><div className="text-[7px] font-black uppercase tracking-[.16em] text-white/30">{de ? 'KAMPF' : 'FIGHT'}</div><div className="mt-1 text-[11px] font-black text-white/78">90 SEK.</div></div>
        <div className="rounded-2xl border border-white/8 bg-black/30 p-3"><div className="text-[7px] font-black uppercase tracking-[.16em] text-white/30">{de ? 'WECHSEL' : 'RESET'}</div><div className="mt-1 text-[11px] font-black text-white/78">{daysLeft} {de ? 'TAGE' : 'DAYS'}</div></div>
      </div>
      <p className="mt-4 text-[9px] font-bold leading-relaxed text-white/48">{de
        ? 'Alle Teilnehmer schlagen auf denselben Wochenboss. Persönlicher Schaden, Clan-Schaden und der gemeinsame Boss-Kill bestimmen die Belohnungen.'
        : 'All participants attack the same weekly boss. Personal damage, clan damage and the shared kill determine rewards.'}</p>
      <div className="mt-4 rounded-2xl border border-violet-200/15 bg-violet-400/[.07] px-4 py-3 text-[8px] font-black uppercase tracking-[.15em] text-violet-100/55">{de ? 'ONLINE-KAMPF WIRD MIT DEM BACKEND VERBUNDEN' : 'ONLINE FIGHT AWAITS BACKEND CONNECTION'}</div>
    </div>
  );
}
