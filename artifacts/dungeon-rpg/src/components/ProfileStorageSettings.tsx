import React, { useEffect, useState } from 'react';
import { loadPlayerProfile, PLAYER_PROFILE_EVENT, type PlayerProfileProgress } from '../game/playerProfile';
import { loadProfileStorageHealth, restoreProfileStorageBackup, type ProfileStorageHealth } from '../game/profileStorageIntegrity';

function statusLabel(status: ProfileStorageHealth['status'], de: boolean): string {
  if (status === 'repaired') return de ? 'Daten wurden bereinigt' : 'Data was repaired';
  if (status === 'restored') return de ? 'Backup wurde wiederhergestellt' : 'Backup was restored';
  if (status === 'reset') return de ? 'Beschädigte Daten wurden zurückgesetzt' : 'Corrupt data was reset';
  return de ? 'Speicher geprüft' : 'Storage checked';
}

export function ProfileStorageSettings({ language }: { language: 'de' | 'en' }) {
  const de = language === 'de';
  const [profile, setProfile] = useState<PlayerProfileProgress>(loadPlayerProfile);
  const [health, setHealth] = useState<ProfileStorageHealth>(loadProfileStorageHealth);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => {
      setProfile(loadPlayerProfile());
      setHealth(loadProfileStorageHealth());
    };
    window.addEventListener(PLAYER_PROFILE_EVENT, refresh);
    return () => window.removeEventListener(PLAYER_PROFILE_EVENT, refresh);
  }, []);

  const restore = () => {
    if (!health.backupAvailable) return;
    if (!window.confirm(de ? 'Vorherigen Profilstand wirklich wiederherstellen?' : 'Restore the previous profile snapshot?')) return;
    const restored = restoreProfileStorageBackup();
    if (!restored) {
      setMessage(de ? 'Kein brauchbares Backup vorhanden.' : 'No usable backup is available.');
      return;
    }
    setProfile(restored);
    setHealth(loadProfileStorageHealth());
    setMessage(de ? 'Vorheriger Profilstand wiederhergestellt.' : 'Previous profile snapshot restored.');
  };

  const stats = [
    [de ? 'Runs' : 'Runs', profile.stats.runsStarted],
    [de ? 'Räume' : 'Rooms', profile.stats.roomsCleared],
    [de ? 'Gegner' : 'Enemies', profile.stats.enemiesDefeated],
    [de ? 'Schaden' : 'Damage', profile.stats.totalDamage],
  ];

  return <div data-testid="profile-storage-settings" className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[11px] font-black text-white/86">{de ? 'Profilstatistik & Sicherung' : 'Profile statistics & backup'}</div><div className="mt-1 text-[8px] leading-relaxed text-white/45">{statusLabel(health.status, de)}</div></div>
      <span className={`rounded-full border px-2 py-1 text-[6px] font-black uppercase tracking-[.12em] ${health.status === 'ok' ? 'border-emerald-300/18 bg-emerald-400/[.06] text-emerald-200' : 'border-amber-300/18 bg-amber-400/[.06] text-amber-100'}`}>{health.status}</span>
    </div>
    <div className="mt-3 grid grid-cols-4 gap-1.5">{stats.map(([label, value]) => <div key={String(label)} className="min-w-0 rounded-xl border border-white/7 bg-black/24 px-1.5 py-2 text-center"><div className="truncate text-[11px] font-black text-white/82">{Number(value).toLocaleString(language === 'de' ? 'de-DE' : 'en-US')}</div><div className="mt-1 truncate text-[5.5px] font-black uppercase tracking-[.1em] text-white/30">{label}</div></div>)}</div>
    <div className="mt-3 flex items-center justify-between gap-3 text-[7px] text-white/34"><span>{de ? 'Höchster Stand' : 'Highest progress'}</span><span className="font-black text-white/60">{de ? 'Kapitel' : 'Chapter'} {profile.stats.highestChapter} · {de ? 'Raum' : 'Room'} {profile.stats.highestRoom}</span></div>
    {message && <div className="mt-2 rounded-lg border border-emerald-300/12 bg-emerald-400/[.04] px-2.5 py-2 text-[8px] text-emerald-100/72">{message}</div>}
    <button data-testid="profile-backup-restore" type="button" disabled={!health.backupAvailable} onPointerDown={event => { event.preventDefault(); restore(); }} className="mt-3 min-h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-[8px] font-black uppercase tracking-[.13em] text-white/56 active:scale-[.98] disabled:opacity-30">{de ? 'Vorherigen Profilstand wiederherstellen' : 'Restore previous profile snapshot'}</button>
  </div>;
}
