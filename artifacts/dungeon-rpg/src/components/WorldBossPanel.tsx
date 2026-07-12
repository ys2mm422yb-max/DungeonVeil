import React, { useCallback, useEffect, useState } from 'react';
import type { SaveData } from '../game/saveManager';
import {
  currentOnlineSession,
  getCurrentWorldBoss,
  onlineSessionEventName,
  type OnlineSession,
  type WorldBossEvent,
} from '../game/supabaseOnline';
import { WorldBossBattleScreen } from './WorldBossBattleScreen';

type Props = {
  language: 'de' | 'en';
  saveData: SaveData | null;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRewardLabel(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatRewardValue(value: unknown, de: boolean): string {
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? (de ? 'Ja' : 'Yes') : (de ? 'Nein' : 'No');
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(item => formatRewardValue(item, de)).join(' · ');
  if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${formatRewardLabel(key)}: ${formatRewardValue(item, de)}`)
    .join(' · ');
  return String(value ?? '—');
}

function statusLabel(status: WorldBossEvent['status'], de: boolean): string {
  const labels = de
    ? { scheduled: 'Geplant', active: 'Aktiv', defeated: 'Besiegt', expired: 'Beendet' }
    : { scheduled: 'Scheduled', active: 'Active', defeated: 'Defeated', expired: 'Ended' };
  return labels[status];
}

function friendlyError(reason: unknown, de: boolean): string {
  const message = reason instanceof Error ? reason.message : String(reason);
  if (/jwt.+future|issued at future|not before|nbf/i.test(message)) {
    return de
      ? 'Die Online-Sitzung war kurz nicht synchron. Sie wird automatisch erneuert – bitte erneut aktualisieren.'
      : 'The online session was briefly out of sync. It is being renewed automatically — refresh once more.';
  }
  if (/sitzung abgelaufen|not authenticated|nicht angemeldet/i.test(message)) {
    return de
      ? 'Die Online-Sitzung ist abgelaufen. Melde dich unter Online & Cloud erneut an.'
      : 'The online session expired. Sign in again through Online & Cloud.';
  }
  return message;
}

function ActionButton({ label, onClick, disabled = false, primary = false }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`min-h-11 w-full rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] active:scale-[.98] ${primary ? 'border-amber-200/42 bg-[linear-gradient(110deg,rgba(151,56,12,.9),rgba(92,30,7,.9))] text-amber-50 shadow-lg' : 'border-orange-300/22 bg-orange-500/10 text-orange-100'} ${disabled ? 'pointer-events-none opacity-35' : ''}`}
  >{label}</button>;
}

export function WorldBossPanel({ language, saveData }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [boss, setBoss] = useState<WorldBossEvent | null>(null);
  const [battleBoss, setBattleBoss] = useState<WorldBossEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const refreshWorldBoss = useCallback(async () => {
    const active = currentOnlineSession();
    setSession(active);
    setError('');
    if (!active) {
      setBoss(null);
      setLoaded(true);
      return;
    }
    setBoss(await getCurrentWorldBoss());
    setLoaded(true);
  }, []);

  const runRefresh = useCallback(async () => {
    setBusy(true);
    try { await refreshWorldBoss(); }
    catch (reason) {
      setError(friendlyError(reason, de));
      setLoaded(true);
    } finally {
      setBusy(false);
    }
  }, [de, refreshWorldBoss]);

  useEffect(() => {
    const refresh = () => { void runRefresh(); };
    window.addEventListener(onlineSessionEventName(), refresh);
    void runRefresh();
    return () => window.removeEventListener(onlineSessionEventName(), refresh);
  }, [runRefresh]);

  const handleBossUpdated = useCallback((remainingHp: number, defeated: boolean) => {
    setBoss(current => current ? {
      ...current,
      current_hp: remainingHp,
      status: defeated ? 'defeated' : current.status,
    } : current);
  }, []);

  const hpPercent = boss && boss.max_hp > 0 ? Math.max(0, Math.min(100, boss.current_hp / boss.max_hp * 100)) : 0;
  const rewards = boss ? Object.entries(boss.reward_config ?? {}) : [];
  const now = Date.now();
  const canFight = Boolean(
    session
    && boss
    && boss.status === 'active'
    && boss.current_hp > 0
    && new Date(boss.starts_at).getTime() <= now
    && new Date(boss.ends_at).getTime() > now,
  );

  return <>
    <div className="max-h-[72vh] overflow-y-auto rounded-3xl border border-orange-300/18 bg-[#0e0a08]/96 p-4 text-white shadow-2xl">
      <div className="mb-4">
        <div className="text-[8px] font-black uppercase tracking-[.3em] text-orange-200/48">{de ? 'WELTBOSS' : 'WORLD BOSS'}</div>
        <div className="mt-1 text-lg font-black text-orange-100">{boss?.name ?? (de ? 'Das nächste Weltereignis' : 'The next world event')}</div>
        <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Gemeinsame Weltboss-Ereignisse, echte Kampfversuche und Belohnungen.' : 'Shared world boss events, playable attempts and rewards.'}</div>
      </div>

      {error && <div className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">{error}</div>}

      {!session ? <div className="rounded-2xl border border-violet-300/12 bg-violet-400/[.04] p-3 text-[10px] leading-relaxed text-white/42">{de ? 'Melde dich zuerst unter Online & Cloud an, um aktuelle Weltbossdaten zu laden und zu kämpfen.' : 'Sign in through Online & Cloud first to load the current world boss and fight.'}</div> : boss ? <div className="space-y-3">
        <section className="rounded-2xl border border-orange-300/16 bg-orange-400/[.05] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-orange-50">{boss.name}</div>
              <div className="mt-1 text-[8px] uppercase tracking-[.14em] text-white/32">{boss.slug}</div>
            </div>
            <div className="rounded-full border border-orange-300/18 bg-orange-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.14em] text-orange-100">{statusLabel(boss.status, de)}</div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/60"><div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-300" style={{ width: `${hpPercent}%` }} /></div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[9px] text-white/42"><span>{de ? 'Aktuelle HP' : 'Current HP'}: {formatNumber(boss.current_hp)}</span><span>{de ? 'Maximale HP' : 'Maximum HP'}: {formatNumber(boss.max_hp)}</span></div>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[9px]">
          <div><div className="text-[7px] font-black uppercase tracking-[.16em] text-white/28">{de ? 'START' : 'START'}</div><div className="mt-1 text-white/55">{formatDate(boss.starts_at, language)}</div></div>
          <div><div className="text-[7px] font-black uppercase tracking-[.16em] text-white/28">{de ? 'ENDE' : 'END'}</div><div className="mt-1 text-white/55">{formatDate(boss.ends_at, language)}</div></div>
        </section>

        {rewards.length > 0 && <section className="rounded-2xl border border-amber-300/12 bg-amber-400/[.035] p-3">
          <div className="text-[8px] font-black uppercase tracking-[.2em] text-amber-100/55">{de ? 'BELOHNUNGEN & EVENTDATEN' : 'REWARDS & EVENT DATA'}</div>
          <div className="mt-2 space-y-1.5">{rewards.map(([key, value]) => <div key={key} className="flex items-start justify-between gap-3 text-[9px]"><span className="text-white/32">{formatRewardLabel(key)}</span><span className="max-w-[62%] text-right text-amber-50/68">{formatRewardValue(value, de)}</span></div>)}</div>
        </section>}

        {canFight && <section className="rounded-2xl border border-red-300/16 bg-red-500/[.045] p-3">
          <div className="text-[8px] font-black uppercase tracking-[.18em] text-red-100/58">{de ? '30-SEKUNDEN-ANGRIFF' : '30-SECOND ATTACK'}</div>
          <div className="mt-1 text-[9px] leading-relaxed text-white/42">{de ? 'Kämpfe mit deinem Waldläufer, weiche den Angriffen aus und verursache möglichst viel gemeinsamen Weltschaden.' : 'Fight with your ranger, dodge attacks and deal as much shared world damage as possible.'}</div>
          <div className="mt-3"><ActionButton label={de ? 'KAMPF STARTEN' : 'START FIGHT'} onClick={() => setBattleBoss(boss)} primary /></div>
        </section>}
      </div> : loaded && !error && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[10px] text-white/42">{de ? 'Aktuell ist kein Weltboss geplant.' : 'No world boss is currently scheduled.'}</div>}

      <div className="mt-3"><ActionButton label={busy ? (de ? 'Lädt …' : 'Loading …') : (de ? 'Aktualisieren' : 'Refresh')} onClick={() => { void runRefresh(); }} disabled={busy || !session} /></div>
    </div>

    {battleBoss && <WorldBossBattleScreen
      event={battleBoss}
      saveData={saveData}
      language={language}
      onBossUpdated={handleBossUpdated}
      onClose={() => {
        setBattleBoss(null);
        void runRefresh();
      }}
    />}
  </>;
}
