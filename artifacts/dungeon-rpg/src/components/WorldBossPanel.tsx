import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { SaveData } from '../game/saveManager';
import {
  currentOnlineSession,
  getCurrentWorldBoss,
  onlineSessionEventName,
  type OnlineSession,
  type WorldBossEvent,
} from '../game/supabaseOnline';
import {
  getWorldBossSocialDashboard,
  prepareWorldBossNotice,
  prepareWorldBossReward,
  type WorldBossGuildRow,
  type WorldBossPlayerRow,
  type WorldBossRewardPayload,
  type WorldBossSocialDashboard,
} from '../game/socialProgressOnline';
import { WorldBossBattleScreen } from './WorldBossBattleScreen';

type Props = { language: 'de' | 'en'; saveData: SaveData | null };
type RankingTab = 'friends' | 'guild' | 'global';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
  if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${formatRewardLabel(key)}: ${formatRewardValue(item, de)}`).join(' · ');
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
  if (/jwt.+future|issued at future|not before|nbf/i.test(message)) return de ? 'Die Online-Sitzung wird gerade synchronisiert. Bitte erneut aktualisieren.' : 'The online session is synchronizing. Refresh once more.';
  if (/sitzung abgelaufen|not authenticated|nicht angemeldet/i.test(message)) return de ? 'Die Online-Sitzung ist abgelaufen. Melde dich unter Online & Cloud erneut an.' : 'The online session expired. Sign in again through Online & Cloud.';
  return message;
}

function ActionButton({ label, onClick, disabled = false, primary = false }: { label: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`min-h-11 w-full rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] active:scale-[.98] ${primary ? 'border-amber-200/42 bg-[linear-gradient(110deg,rgba(151,56,12,.9),rgba(92,30,7,.9))] text-amber-50 shadow-lg' : 'border-orange-300/22 bg-orange-500/10 text-orange-100'} ${disabled ? 'pointer-events-none opacity-35' : ''}`}>{label}</button>;
}

function PlayerRanking({ rows, de }: { rows: WorldBossPlayerRow[]; de: boolean }) {
  if (!rows.length) return <div className="rounded-xl border border-white/7 bg-white/[.02] p-3 text-center text-[9px] text-white/30">{de ? 'Noch keine Beiträge.' : 'No contributions yet.'}</div>;
  return <div className="space-y-1.5">{rows.slice(0, 12).map((row, index) => <div key={row.user_id} className="flex items-center gap-2 rounded-xl border border-white/7 bg-black/20 px-2.5 py-2">
    <div className="w-6 text-center text-[9px] font-black text-amber-200/68">#{row.rank ?? index + 1}</div>
    <div className="min-w-0 flex-1"><div className="truncate text-[10px] font-black text-white/72">{row.display_name}</div><div className="mt-0.5 text-[7px] uppercase tracking-[.1em] text-white/24">{de ? 'Rang' : 'Rank'} {row.current_rank ?? '—'} · {row.hits} {de ? 'Treffer' : 'hits'}</div></div>
    <div className="text-right text-[10px] font-black text-orange-100">{formatNumber(row.damage)}</div>
  </div>)}</div>;
}

function GuildRanking({ rows, de }: { rows: WorldBossGuildRow[]; de: boolean }) {
  if (!rows.length) return <div className="rounded-xl border border-white/7 bg-white/[.02] p-3 text-center text-[9px] text-white/30">{de ? 'Noch keine Gildenbeiträge.' : 'No guild contributions yet.'}</div>;
  return <div className="space-y-1.5">{rows.slice(0, 10).map(row => <div key={row.guild_id} className="flex items-center gap-2 rounded-xl border border-white/7 bg-black/20 px-2.5 py-2"><div className="w-6 text-center text-[9px] font-black text-amber-200/68">#{row.rank}</div><div className="min-w-0 flex-1 truncate text-[10px] font-black text-white/72">[{row.tag}] {row.name}</div><div className="text-[10px] font-black text-orange-100">{formatNumber(row.damage)}</div></div>)}</div>;
}

export function WorldBossPanel({ language, saveData }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [boss, setBoss] = useState<WorldBossEvent | null>(null);
  const [battleBoss, setBattleBoss] = useState<WorldBossEvent | null>(null);
  const [dashboard, setDashboard] = useState<WorldBossSocialDashboard | null>(null);
  const [reward, setReward] = useState<WorldBossRewardPayload | null>(null);
  const [rankingTab, setRankingTab] = useState<RankingTab>('friends');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const refreshWorldBoss = useCallback(async () => {
    const active = currentOnlineSession();
    setSession(active);
    setError('');
    if (!active) {
      setBoss(null);
      setDashboard(null);
      setReward(null);
      setLoaded(true);
      return;
    }

    const nextBoss = await getCurrentWorldBoss();
    setBoss(nextBoss);
    if (!nextBoss) {
      setDashboard(null);
      setReward(null);
      setLoaded(true);
      return;
    }

    const [nextDashboard] = await Promise.all([
      getWorldBossSocialDashboard(nextBoss.id),
      nextBoss.status === 'active' ? prepareWorldBossNotice(nextBoss.id).catch(() => false) : Promise.resolve(false),
    ]);
    setDashboard(nextDashboard);

    const ended = nextBoss.status === 'defeated' || nextBoss.status === 'expired' || new Date(nextBoss.ends_at).getTime() <= Date.now();
    setReward(ended ? await prepareWorldBossReward(nextBoss.id).catch(() => null) : null);
    setLoaded(true);
  }, []);

  const runRefresh = useCallback(async () => {
    setBusy(true);
    try { await refreshWorldBoss(); }
    catch (reason) { setError(friendlyError(reason, de)); setLoaded(true); }
    finally { setBusy(false); }
  }, [de, refreshWorldBoss]);

  useEffect(() => {
    const refresh = () => { void runRefresh(); };
    window.addEventListener(onlineSessionEventName(), refresh);
    void runRefresh();
    return () => window.removeEventListener(onlineSessionEventName(), refresh);
  }, [runRefresh]);

  const handleBossUpdated = useCallback((remainingHp: number, defeated: boolean) => {
    setBoss(current => current ? { ...current, current_hp: remainingHp, status: defeated ? 'defeated' : current.status } : current);
    if (defeated && boss) void prepareWorldBossReward(boss.id).then(setReward).catch(() => {});
  }, [boss]);

  const hpPercent = boss && boss.max_hp > 0 ? Math.max(0, Math.min(100, boss.current_hp / boss.max_hp * 100)) : 0;
  const rewards = boss ? Object.entries(boss.reward_config ?? {}) : [];
  const now = Date.now();
  const canFight = Boolean(session && boss && boss.status === 'active' && boss.current_hp > 0 && new Date(boss.starts_at).getTime() <= now && new Date(boss.ends_at).getTime() > now);
  const rankingRows = useMemo(() => rankingTab === 'friends' ? dashboard?.friends ?? [] : rankingTab === 'global' ? dashboard?.global ?? [] : [], [dashboard, rankingTab]);

  return <>
    <div data-testid="worldboss-social-panel" className="max-h-[74vh] overflow-y-auto rounded-3xl border border-orange-300/18 bg-[#0e0a08]/96 p-4 text-white shadow-2xl">
      <div className="mb-4"><div className="text-[8px] font-black uppercase tracking-[.3em] text-orange-200/48">{de ? 'WELTBOSS' : 'WORLD BOSS'}</div><div className="mt-1 text-lg font-black text-orange-100">{boss?.name ?? (de ? 'Das nächste Weltereignis' : 'The next world event')}</div><div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Gemeinsamer Schaden, Freunde, Gildenrang und echte Wochenbelohnungen.' : 'Shared damage, friend and guild rankings, and real weekly rewards.'}</div></div>

      {error && <div className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">{error}</div>}

      {!session ? <div className="rounded-2xl border border-violet-300/12 bg-violet-400/[.04] p-3 text-[10px] leading-relaxed text-white/42">{de ? 'Melde dich zuerst unter Online & Cloud an, um Weltbossdaten und Ranglisten zu laden.' : 'Sign in through Online & Cloud to load the world boss and rankings.'}</div> : boss ? <div className="space-y-3">
        <section className="rounded-2xl border border-orange-300/16 bg-orange-400/[.05] p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-orange-50">{boss.name}</div><div className="mt-1 text-[8px] uppercase tracking-[.14em] text-white/32">{boss.slug}</div></div><div className="rounded-full border border-orange-300/18 bg-orange-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.14em] text-orange-100">{statusLabel(boss.status, de)}</div></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/60"><div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-300" style={{ width: `${hpPercent}%` }} /></div><div className="mt-2 flex items-center justify-between gap-3 text-[9px] text-white/42"><span>{formatNumber(boss.current_hp)} HP</span><span>{formatNumber(boss.max_hp)} HP</span></div></section>

        {dashboard && <section className="rounded-2xl border border-amber-300/12 bg-amber-400/[.03] p-3">
          <div className="text-[8px] font-black uppercase tracking-[.18em] text-amber-100/48">{de ? 'DEIN BEITRAG' : 'YOUR CONTRIBUTION'}</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl border border-white/7 bg-black/20 p-2"><div className="text-[7px] text-white/28">{de ? 'Platz' : 'Rank'}</div><div className="mt-1 font-black text-amber-100">{dashboard.personal.rank ? `#${dashboard.personal.rank}` : '—'}</div></div><div className="rounded-xl border border-white/7 bg-black/20 p-2"><div className="text-[7px] text-white/28">{de ? 'Schaden' : 'Damage'}</div><div className="mt-1 font-black text-orange-100">{formatNumber(dashboard.personal.damage)}</div></div><div className="rounded-xl border border-white/7 bg-black/20 p-2"><div className="text-[7px] text-white/28">{de ? 'Treffer' : 'Hits'}</div><div className="mt-1 font-black text-cyan-100">{dashboard.personal.hits}</div></div></div>
        </section>}

        {reward && <section className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[.055] p-3"><div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-100">{de ? 'Belohnung liegt im Postfach' : 'Reward is in your mailbox'}</div><div className="mt-1 text-[9px] leading-relaxed text-white/42">{de ? `Stufe ${reward.tier}: ${reward.xp} Rang-XP · ${reward.dust} Schleierstaub · ${reward.gold} Gold${reward.guild_bonus ? ' · Gildenbonus' : ''}` : `Tier ${reward.tier}: ${reward.xp} rank XP · ${reward.dust} Veil Dust · ${reward.gold} gold${reward.guild_bonus ? ' · guild bonus' : ''}`}</div></section>}

        {dashboard && <section className="rounded-2xl border border-white/8 bg-white/[.02] p-3">
          <div className="grid grid-cols-3 gap-1.5">{(['friends', 'guild', 'global'] as RankingTab[]).map(tab => <button key={tab} type="button" onClick={() => setRankingTab(tab)} className={`min-h-9 rounded-xl border text-[7px] font-black uppercase tracking-[.1em] ${rankingTab === tab ? 'border-orange-300/24 bg-orange-400/10 text-orange-100' : 'border-white/7 bg-black/20 text-white/30'}`}>{tab === 'friends' ? (de ? 'Freunde' : 'Friends') : tab === 'guild' ? (de ? 'Gilden' : 'Guilds') : 'Global'}</button>)}</div>
          <div className="mt-2">{rankingTab === 'guild' ? <GuildRanking rows={dashboard.guilds} de={de} /> : <PlayerRanking rows={rankingRows} de={de} />}</div>
          {rankingTab === 'guild' && dashboard.myGuild && <div className="mt-3"><div className="mb-1.5 text-[7px] font-black uppercase tracking-[.16em] text-white/28">{de ? `DEINE GILDE [${dashboard.myGuild.tag}] · PLATZ ${dashboard.myGuild.rank}` : `YOUR GUILD [${dashboard.myGuild.tag}] · RANK ${dashboard.myGuild.rank}`}</div><PlayerRanking rows={dashboard.myGuild.members} de={de} /></div>}
        </section>}

        <section className="grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[9px]"><div><div className="text-[7px] font-black uppercase tracking-[.16em] text-white/28">START</div><div className="mt-1 text-white/55">{formatDate(boss.starts_at, language)}</div></div><div><div className="text-[7px] font-black uppercase tracking-[.16em] text-white/28">ENDE</div><div className="mt-1 text-white/55">{formatDate(boss.ends_at, language)}</div></div></section>

        {rewards.length > 0 && <section className="rounded-2xl border border-amber-300/12 bg-amber-400/[.025] p-3"><div className="text-[8px] font-black uppercase tracking-[.2em] text-amber-100/45">{de ? 'EVENTDATEN' : 'EVENT DATA'}</div><div className="mt-2 space-y-1.5">{rewards.map(([key, value]) => <div key={key} className="flex items-start justify-between gap-3 text-[9px]"><span className="text-white/28">{formatRewardLabel(key)}</span><span className="max-w-[62%] text-right text-amber-50/58">{formatRewardValue(value, de)}</span></div>)}</div></section>}

        {canFight && <section className="rounded-2xl border border-red-300/16 bg-red-500/[.045] p-3"><div className="text-[8px] font-black uppercase tracking-[.18em] text-red-100/58">{de ? '30-SEKUNDEN-ANGRIFF' : '30-SECOND ATTACK'}</div><div className="mt-1 text-[9px] leading-relaxed text-white/42">{de ? 'Kämpfe, weiche aus und steigere deinen persönlichen sowie den Gildenrang.' : 'Fight, dodge, and improve your personal and guild ranking.'}</div><div className="mt-3"><ActionButton label={de ? 'KAMPF STARTEN' : 'START FIGHT'} onClick={() => setBattleBoss(boss)} primary /></div></section>}
      </div> : loaded && !error && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[10px] text-white/42">{de ? 'Aktuell ist kein Weltboss geplant.' : 'No world boss is currently scheduled.'}</div>}

      <div className="mt-3"><ActionButton label={busy ? (de ? 'Lädt …' : 'Loading …') : (de ? 'Aktualisieren' : 'Refresh')} onClick={() => { void runRefresh(); }} disabled={busy || !session} /></div>
    </div>

    {battleBoss && <WorldBossBattleScreen event={battleBoss} saveData={saveData} language={language} onBossUpdated={handleBossUpdated} onClose={() => { setBattleBoss(null); void runRefresh(); }} />}
  </>;
}
