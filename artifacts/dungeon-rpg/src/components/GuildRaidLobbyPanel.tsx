import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { currentOnlineSession, getMyGuildMembership, listGuildMembers, type OnlineGuildMember } from '../game/supabaseOnline';
import {
  createOrGetGuildRaidLobby,
  fetchGuildRaidLobbySnapshot,
  inviteGuildRaidMember,
  leaveGuildRaidLobby,
  setGuildRaidReady,
  startGuildRaidLobby,
  type GuildRaidLobbySnapshot,
} from '../game/guildRaidLobbyOnline';

type Props = { language: 'de' | 'en'; onClose: () => void };

export function GuildRaidLobbyPanel({ language, onClose }: Props) {
  const de = language === 'de';
  const session = currentOnlineSession();
  const [snapshot, setSnapshot] = useState<GuildRaidLobbySnapshot | null>(null);
  const [members, setMembers] = useState<OnlineGuildMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const membership = await getMyGuildMembership();
    if (!membership) {
      setSnapshot(null);
      setMembers([]);
      return;
    }
    const [next, nextMembers] = await Promise.all([fetchGuildRaidLobbySnapshot(), listGuildMembers(membership.guild.id)]);
    setSnapshot(next);
    setMembers(nextMembers);
  }, []);

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await task(); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    void run(refresh);
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [refresh, run]);

  const me = snapshot?.slots.find(slot => slot?.userId === session?.user.id) ?? null;
  const isLeader = snapshot?.leaderUserId === session?.user.id;
  const filled = snapshot?.slots.filter(Boolean).length ?? 0;
  const ready = snapshot?.slots.filter(slot => slot?.ready).length ?? 0;
  const canStart = Boolean(isLeader && filled === 4 && ready === 4 && snapshot?.status === 'open');
  const invitedIds = useMemo(() => new Set(snapshot?.slots.flatMap(slot => slot ? [slot.userId] : []) ?? []), [snapshot]);

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" data-testid="guild-raid-lobby-overlay">
    <section className="flex h-[min(86dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-violet-300/25 bg-[#100d18]/98 p-3 text-white shadow-2xl">
      <header className="relative shrink-0 border-b border-white/10 pb-3 pr-12">
        <button type="button" onClick={onClose} className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-black/40 text-xl">×</button>
        <div className="text-[7px] font-black uppercase tracking-[.28em] text-violet-200/55">{de ? 'GILDENRAID' : 'GUILD RAID'}</div>
        <h2 className="mt-1 text-lg font-black text-violet-100">{de ? 'Vierer-Lobby' : 'Four-player lobby'}</h2>
        <p className="mt-1 text-[9px] leading-relaxed text-white/42">{de ? 'Vier Gildenmitglieder, vier Bereitschaften, ein gemeinsamer Start.' : 'Four guild members, four ready states, one shared start.'}</p>
      </header>

      {error && <div className="mt-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[9px] text-red-200">{error}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        {!snapshot && <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-[10px] text-white/55">
          <p>{de ? 'Erstelle eine Gildenraid-Lobby. Spieler ohne Gilde können keinen Raid starten.' : 'Create a guild raid lobby. Players without a guild cannot start a raid.'}</p>
          <button type="button" disabled={busy} onClick={() => run(async () => setSnapshot(await createOrGetGuildRaidLobby()))} className="min-h-11 w-full rounded-xl border border-violet-300/30 bg-violet-500/15 px-4 text-[9px] font-black uppercase tracking-[.16em] text-violet-100 disabled:opacity-40">{de ? 'Lobby erstellen / beitreten' : 'Create / join lobby'}</button>
        </div>}

        {snapshot && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-xl border border-white/10 bg-white/[.03] p-2"><div className="text-sm font-black text-violet-100">{filled}/4</div><div className="text-[6px] uppercase tracking-[.16em] text-white/35">{de ? 'Mitglieder' : 'Members'}</div></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-2"><div className="text-sm font-black text-emerald-200">{ready}/4</div><div className="text-[6px] uppercase tracking-[.16em] text-white/35">Ready</div></div></div>
          <div className="grid grid-cols-2 gap-2" data-testid="guild-raid-slots">{snapshot.slots.map((slot, index) => <article key={index} className={`min-h-24 rounded-2xl border p-3 ${slot ? 'border-violet-300/20 bg-violet-400/[.05]' : 'border-white/8 bg-black/25'}`}>
            <div className="text-[7px] font-black uppercase tracking-[.16em] text-white/30">Slot {index + 1}</div>
            {slot ? <><div className="mt-2 truncate text-[11px] font-black text-white">{slot.displayName}</div><div className="mt-1 text-[7px] text-white/38">{slot.userId === snapshot.leaderUserId ? (de ? 'Anführer' : 'Leader') : (de ? 'Mitglied' : 'Member')}</div><div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[6px] font-black uppercase ${slot.ready ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/8 text-white/35'}`}>{slot.ready ? 'Ready' : (de ? 'Nicht bereit' : 'Not ready')}</div></> : <div className="mt-6 text-[9px] text-white/25">{de ? 'Frei' : 'Open'}</div>}
          </article>)}</div>

          {isLeader && filled < 4 && <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[.03] p-3"><div className="text-[7px] font-black uppercase tracking-[.16em] text-white/35">{de ? 'Gildenmitglieder einladen' : 'Invite guild members'}</div>{members.filter(member => !invitedIds.has(member.user_id) && member.user_id !== session?.user.id).map(member => <button key={member.user_id} type="button" disabled={busy} onClick={() => run(async () => { await inviteGuildRaidMember(member.user_id); await refresh(); })} className="flex min-h-10 w-full items-center justify-between rounded-xl border border-white/8 bg-black/25 px-3 text-left text-[9px] disabled:opacity-40"><span className="truncate">{member.profile?.display_name ?? (de ? 'Unbekannter Spieler' : 'Unknown player')}</span><span className="text-violet-200">+</span></button>)}</section>}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy || !me} onClick={() => run(async () => setSnapshot(await setGuildRaidReady(!me?.ready)))} className="min-h-11 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 text-[8px] font-black uppercase tracking-[.14em] text-emerald-100 disabled:opacity-35">{me?.ready ? (de ? 'Bereitschaft lösen' : 'Unready') : (de ? 'Bereit' : 'Ready')}</button>
            <button type="button" disabled={busy} onClick={() => run(async () => { await leaveGuildRaidLobby(); setSnapshot(null); })} className="min-h-11 rounded-xl border border-red-300/20 bg-red-500/10 px-3 text-[8px] font-black uppercase tracking-[.14em] text-red-100 disabled:opacity-35">{de ? 'Verlassen' : 'Leave'}</button>
          </div>
          <button type="button" disabled={busy || !canStart} onClick={() => run(async () => setSnapshot(await startGuildRaidLobby(crypto.randomUUID())))} className="min-h-12 w-full rounded-xl border border-amber-300/30 bg-amber-500/15 px-4 text-[9px] font-black uppercase tracking-[.18em] text-amber-100 disabled:opacity-30">{snapshot.runId ? (de ? 'Raid gestartet' : 'Raid started') : canStart ? (de ? 'Raid starten' : 'Start raid') : (de ? `Start gesperrt · ${filled}/4 Spieler · ${ready}/4 bereit` : `Start locked · ${filled}/4 players · ${ready}/4 ready`)}</button>
        </div>}
      </div>
    </section>
  </div>;
}
